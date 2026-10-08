// Small pure helpers referenced by the acceptance criteria. All times are Europe/Vienna.
const TZ = 'Europe/Vienna';

export const fmtEUR = (cents: number) => '€ ' + (cents / 100).toFixed(2).replace('.', ',');           // € 32,00
export const fmtMin = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h === 0 ? `${r} min` : r === 0 ? `${h} h` : `${h} h ${r} min`; }; // 1 h 20 min

/** "Open now · closes 19:00" / "Closed · opens Tue 09:00". hours: [{day:0-6, ranges:[["09:00","13:00"],…]}] */
export function openStatus(now: Date, hours: { day: number; ranges: [string, string][] }[]) {
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const hm = local.getHours() * 60 + local.getMinutes();
  const toM = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3);
  const today = hours.find((h) => h.day === local.getDay());
  const r = today?.ranges.find(([a, b]) => hm >= toM(a) && hm < toM(b));
  if (r) return { open: true, label: `Open now`, sub: `closes ${r[1]}` };
  return { open: false, label: 'Closed', sub: '' }; // implement "opens <day> <time>" by scanning forward 7 days
}

/** Online cancellation deadline = start − leadHours. */
export function cancelDeadline(start: Date, leadHours: number) {
  const d = new Date(start.getTime() - leadHours * 3600e3);
  const s = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return { date: d, label: `Free online cancellation until ${s.replace(',', '')} (${leadHours} h before).` };
}

/** .ics for "Add to calendar". */
export function icsFile(o: { start: Date; minutes: number; title: string; location: string; uid: string }) {
  const f = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .format(d).replace(/[-: ]/g, '').replace(/(\d{8})(\d{6})/, '$1T$2');
  const end = new Date(o.start.getTime() + o.minutes * 60e3);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Appointments//EN', 'BEGIN:VEVENT', `UID:${o.uid}`,
    `DTSTART;TZID=${TZ}:${f(o.start)}`, `DTEND;TZID=${TZ}:${f(end)}`, `SUMMARY:${o.title}`, `LOCATION:${o.location}`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

/** Links */
export const telHref = (p: string) => 'tel:' + p.replace(/[^+\d]/g, '');
export const waHref = (p: string) => 'https://wa.me/' + p.replace(/[^\d]/g, '');
export const directionsHref = (address: string) => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address);
export const osmEmbed = (lat: number, lon: number) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${[lon - .006, lat - .0035, lon + .006, lat + .0035].join(',')}&layer=mapnik&marker=${lat},${lon}`;
