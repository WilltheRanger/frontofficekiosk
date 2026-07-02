// ============================================================
// sync-photos — Drive → R2 → Postgres reconciling sync
// PLANNING.md §5. Stateless and idempotent: every run recomputes the
// desired state (newest RETENTION_CAP images in the Drive folder) and
// converges R2 + the photos table toward it. Retention and takedowns
// both fall out of the same diff. Per-file failures never kill a run.
//
// Secrets (supabase secrets set): GDRIVE_SA_KEY, GDRIVE_FOLDER_ID,
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
// R2_PUBLIC_BASE, SYNC_SECRET, RETENTION_CAP?, MAX_FILES_PER_RUN?
// ============================================================
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1";
import { Image } from "npm:imagescript@1";

const DISPLAY_EDGE = 1920; // D4
const THUMB_EDGE = 480;
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024; // fallback-path safety valve
const STALE_RUN_MINUTES = 10;

const env = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env: ${name}`);
  return value;
};

interface DriveFile {
  id: string;
  name: string;
  description?: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  thumbnailLink?: string;
  imageMediaMetadata?: { width?: number; height?: number };
}

interface PhotoRow {
  id: string;
  drive_file_id: string;
  r2_key_display: string;
  r2_key_thumb: string;
  drive_modified_at: string | null;
}

// ---------- Google auth (service account JWT → access token) ----------

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function googleAccessToken(): Promise<string> {
  const sa = JSON.parse(env("GDRIVE_SA_KEY")) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const header = base64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(
    enc.encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const pem = sa.private_key.replace(/-----[A-Z ]+-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${header}.${claims}`)),
  );
  const assertion = `${header}.${claims}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`google token: ${res.status} ${await res.text()}`);
  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}

// ---------- Drive listing (step 4) ----------

async function listFolderImages(token: string): Promise<DriveFile[]> {
  const folderId = env("GDRIVE_FOLDER_ID");
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
      fields:
        "nextPageToken,files(id,name,description,mimeType,createdTime,modifiedTime,thumbnailLink,imageMediaMetadata(width,height))",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`drive list: ${res.status} ${await res.text()}`);
    const page = (await res.json()) as { nextPageToken?: string; files: DriveFile[] };
    files.push(...page.files);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return files;
}

// ---------- Renditions (step 8 / §5.4) ----------

/** Strategy A: Drive's thumbnail endpoint resizes server-side (also converts
 * HEIC and applies EXIF rotation). Strategy B fallback: download original and
 * resize with imagescript (WASM) — CPU-bounded, guarded by a size cap. */
async function rendition(
  file: DriveFile,
  edge: number,
  token: string,
): Promise<{ bytes: Uint8Array; width: number | null; height: number | null }> {
  const scaled = scaledDims(file, edge);
  if (file.thumbnailLink) {
    const url = file.thumbnailLink.replace(/=s\d+(-c)?$/, `=s${edge}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      return { bytes: new Uint8Array(await res.arrayBuffer()), ...scaled };
    }
  }
  // Strategy B
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`drive download: ${res.status}`);
  const original = new Uint8Array(await res.arrayBuffer());
  if (original.byteLength > MAX_ORIGINAL_BYTES) {
    throw new Error(`original too large for fallback resize (${original.byteLength} bytes)`);
  }
  const img = await Image.decode(original);
  if (Math.max(img.width, img.height) > edge) {
    if (img.width >= img.height) img.resize(edge, Image.RESIZE_AUTO);
    else img.resize(Image.RESIZE_AUTO, edge);
  }
  const bytes = await img.encodeJPEG(80);
  return { bytes, width: img.width, height: img.height };
}

function scaledDims(
  file: DriveFile,
  edge: number,
): { width: number | null; height: number | null } {
  const w = file.imageMediaMetadata?.width;
  const h = file.imageMediaMetadata?.height;
  if (!w || !h) return { width: null, height: null };
  const factor = Math.min(1, edge / Math.max(w, h));
  return { width: Math.round(w * factor), height: Math.round(h * factor) };
}

// ---------- R2 (S3-compatible) ----------

function r2Client(): { aws: AwsClient; base: string } {
  const aws = new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    region: "auto",
    service: "s3",
  });
  const base = `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}`;
  return { aws, base };
}

async function putR2(r2: { aws: AwsClient; base: string }, key: string, bytes: Uint8Array) {
  for (let attempt = 0, delay = 1000; ; attempt++, delay *= 2) {
    const res = await r2.aws.fetch(`${r2.base}/${key}`, {
      method: "PUT",
      body: bytes,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    if (res.ok) return;
    if (attempt >= 2) throw new Error(`r2 put ${key}: ${res.status} ${await res.text()}`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

async function deleteR2(r2: { aws: AwsClient; base: string }, keys: string[]) {
  for (const key of keys) {
    const res = await r2.aws.fetch(`${r2.base}/${key}`, { method: "DELETE" });
    // 404 is fine (already gone / never uploaded); anything else is a failure.
    if (!res.ok && res.status !== 404) {
      throw new Error(`r2 delete ${key}: ${res.status}`);
    }
  }
}

// ---------- sync_runs bookkeeping (steps 2 & 10) ----------

async function startRun(db: SupabaseClient): Promise<number | null> {
  // Clear stale locks from crashed runs, then take the lock if free.
  await db
    .from("sync_runs")
    .update({ status: "failed", error_detail: "stale: superseded by a later run", finished_at: new Date().toISOString() })
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - STALE_RUN_MINUTES * 60_000).toISOString());

  const { data: running } = await db
    .from("sync_runs")
    .select("id")
    .eq("status", "running")
    .limit(1);
  if (running && running.length > 0) return null;

  const { data, error } = await db.from("sync_runs").insert({}).select("id").single();
  if (error) throw new Error(`sync_runs insert: ${error.message}`);
  return data.id as number;
}

// ---------- main ----------

Deno.serve(async (req) => {
  if (req.headers.get("x-sync-secret") !== Deno.env.get("SYNC_SECRET")) {
    return Response.json({ error: "forbidden" }, { status: 401 });
  }

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const runId = await startRun(db);
  if (runId === null) return Response.json({ skipped: "run already in progress" });

  const cap = Number(Deno.env.get("RETENTION_CAP") ?? 200);
  const maxPerRun = Number(Deno.env.get("MAX_FILES_PER_RUN") ?? 10);
  const publicBase = env("R2_PUBLIC_BASE").replace(/\/$/, "");
  const errors: string[] = [];
  let added = 0, updated = 0, deleted = 0, skipped = 0;

  try {
    const token = await googleAccessToken();                    // step 3
    const driveFiles = await listFolderImages(token);           // step 4

    // Step 5 — desired set: newest `cap` by upload time. Retention IS this
    // window; older files simply fall out of it (they stay in Drive forever).
    const desired = [...driveFiles]
      .sort((a, b) => b.createdTime.localeCompare(a.createdTime))
      .slice(0, cap);
    const desiredById = new Map(desired.map((f) => [f.id, f]));

    // Step 6 — current set
    const { data: currentRows, error: currentErr } = await db
      .from("photos")
      .select("id, drive_file_id, r2_key_display, r2_key_thumb, drive_modified_at");
    if (currentErr) throw new Error(`photos select: ${currentErr.message}`);
    const current = (currentRows ?? []) as PhotoRow[];
    const currentById = new Map(current.map((r) => [r.drive_file_id, r]));

    // Step 7 — diff
    const toAdd = desired.filter((f) => !currentById.has(f.id));
    const toUpdate = desired.filter((f) => {
      const row = currentById.get(f.id);
      return row && row.drive_modified_at !== f.modifiedTime;
    });
    const toRemove = current.filter((r) => !desiredById.has(r.drive_file_id));

    const r2 = r2Client();

    // Step 8 — ingest (oldest first so a backlog drains in display order)
    const ingest = [...toAdd, ...toUpdate]
      .sort((a, b) => a.createdTime.localeCompare(b.createdTime))
      .slice(0, maxPerRun);
    for (const file of ingest) {
      try {
        const display = await rendition(file, DISPLAY_EDGE, token);
        const thumb = await rendition(file, THUMB_EDGE, token);
        const keyDisplay = `photos/${file.id}/display.jpg`;
        const keyThumb = `photos/${file.id}/thumb.jpg`;
        await putR2(r2, keyDisplay, display.bytes);
        await putR2(r2, keyThumb, thumb.bytes);
        // Row is written only after both PUTs succeed (§5.3 rule 8d).
        const { error } = await db.from("photos").upsert(
          {
            drive_file_id: file.id,
            r2_key_display: keyDisplay,
            r2_key_thumb: keyThumb,
            display_url: `${publicBase}/${keyDisplay}`,
            thumb_url: `${publicBase}/${keyThumb}`,
            caption: file.description ?? null,
            width: display.width,
            height: display.height,
            drive_created_at: file.createdTime,
            drive_modified_at: file.modifiedTime,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "drive_file_id" },
        );
        if (error) throw new Error(`upsert: ${error.message}`);
        if (currentById.has(file.id)) updated++;
        else added++;
      } catch (e) {
        skipped++;
        errors.push(`${file.name}: ${String(e)}`);
        // Per-file isolation (§5.5): continue with the rest of the batch.
      }
    }

    // Step 9 — removals (Drive deletions AND retention overflow).
    // R2 objects first; the row only goes once objects are gone, so a failed
    // object delete leaves the row for retry next run.
    for (const row of toRemove) {
      try {
        await deleteR2(r2, [row.r2_key_display, row.r2_key_thumb]);
        const { error } = await db.from("photos").delete().eq("id", row.id);
        if (error) throw new Error(`row delete: ${error.message}`);
        deleted++;
      } catch (e) {
        skipped++;
        errors.push(`remove ${row.drive_file_id}: ${String(e)}`);
      }
    }

    // Step 10 — finalize
    const status = errors.length === 0 ? "success" : "partial";
    await db
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        photos_added: added,
        photos_updated: updated,
        photos_deleted: deleted,
        skipped,
        error_detail: errors.length ? errors.join(" | ").slice(0, 500) : null,
      })
      .eq("id", runId);

    return Response.json({ status, added, updated, deleted, skipped, backlog: toAdd.length + toUpdate.length - ingest.length });
  } catch (e) {
    await db
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "failed",
        skipped,
        error_detail: String(e).slice(0, 500),
      })
      .eq("id", runId);
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
