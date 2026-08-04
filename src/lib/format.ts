const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const eventFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatPostedDate(iso: string): string {
  return `Posted ${dateFmt.format(new Date(iso))}`;
}

export function formatEventDate(iso: string): string {
  return eventFmt.format(new Date(iso));
}
