// Drives the built kiosk end-to-end in headless Chromium and captures
// screenshots of every screen, including the idle-timeout return to Attract.
// Usage: npm run build && npm run verify   (screenshots → ./verify-shots/)
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 4273;
const BASE = `http://127.0.0.1:${PORT}`;
const IDLE_MS = 4000; // shortened via ?idle= for the test
const OUT = new URL("../verify-shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// vite preview serves ./dist — reuse an already-running server, else spawn
// one in its own process group so we can kill vite (not just the npx shim).
async function portResponds() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

let server = null;
if (!(await portResponds())) {
  server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    stdio: "pipe",
    detached: true,
  });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => d.toString().includes("Local:") && resolve());
    server.on("exit", (code) => reject(new Error(`preview exited early (${code})`)));
    setTimeout(() => reject(new Error("preview server timeout")), 15_000);
  });
}

let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"} ${name}`);
  if (!ok) failures++;
};

try {
  const browser = await chromium.launch({
    executablePath: process.env.KIOSK_CHROMIUM ?? undefined,
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
  const visible = (testId) =>
    page
      .getByTestId(testId)
      .waitFor({ state: "visible", timeout: 8000 })
      .then(() => true)
      .catch(() => false);

  await page.goto(`${BASE}/?idle=${IDLE_MS}&dwell=3000`);

  // S0 Attract
  check("attract screen renders", await visible("attract-screen"));
  await page.waitForTimeout(1200); // let the first carousel layer settle
  await shot("1-attract");

  // wake → Home
  await page.mouse.click(960, 540);
  check("touch wakes to home", await visible("home-screen"));
  await page.waitForTimeout(400); // let the 200ms screen-enter fade finish
  await shot("2-home");

  // Human-paced taps: navigation is debounced 300ms after each transition
  // (palm-slap guard, PLANNING §6.4), so leave a beat between screen changes.
  const settle = () => page.waitForTimeout(450);

  // Gallery + viewer
  await settle();
  await page.getByTestId("tile-gallery").click();
  check("gallery opens", await visible("gallery-screen"));
  await page.waitForTimeout(600);
  await shot("3-gallery");
  await page.getByTestId("photo-thumb-0").click();
  check("viewer opens", await visible("photo-viewer"));
  await page.waitForTimeout(400);
  await shot("4-viewer");
  await page.getByTestId("viewer-close").click();
  check("viewer closes back to gallery", await visible("gallery-screen"));

  // Map: pick a room, expect route + info card
  await settle();
  await page.getByTestId("home-button").click();
  await settle();
  await page.getByTestId("tile-map").click();
  check("map opens", await visible("map-screen"));
  const firstRoom = page.locator('[data-testid^="room-row-"]').first();
  await firstRoom.click();
  check("room info card appears", await visible("room-info-card"));
  await page.waitForTimeout(1100); // route draw animation
  await shot("5-map-route");
  await page.getByTestId("tab-teachers").click();
  await page.waitForTimeout(400);
  await shot("6-map-teachers");

  // Announcements
  await page.getByTestId("home-button").click();
  await settle();
  await page.getByTestId("tile-announcements").click();
  check("announcements open", await visible("announcements-screen"));
  await page.waitForTimeout(500);
  await shot("7-announcements");

  // Idle timeout: no touches for IDLE_MS + margin → back to Attract, reset.
  await page.waitForTimeout(IDLE_MS + 1500);
  check("idle timeout returns to attract", await visible("attract-screen"));
  await shot("8-attract-after-idle");

  // And the reset really cleared per-screen state: re-enter map, no card.
  await page.mouse.click(960, 540);
  await settle();
  await page.getByTestId("tile-map").click();
  await visible("map-screen");
  const cardCount = await page.getByTestId("room-info-card").count();
  check("map selection was reset by idle", cardCount === 0);

  await browser.close();
} finally {
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM"); // whole group: npx + vite
    } catch {
      server.kill("SIGTERM");
    }
  }
}

console.log(failures === 0 ? "\nAll kiosk verify checks passed." : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
