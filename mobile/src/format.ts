const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const day = DAYS[d.getDay()];
  const date = d.getDate();
  const month = MONTHS[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${date} ${month} · ${hh}:${mm}`;
}

export function formatFixtureDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()][0]}${DAYS[d.getDay()].slice(1).toLowerCase()} ${d.getDate()} ${MONTHS[d.getMonth()][0]}${MONTHS[d.getMonth()].slice(1).toLowerCase()}`;
}

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
