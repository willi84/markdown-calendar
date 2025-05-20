import fs from 'fs';
import crypto from 'crypto';

const input = fs.readFileSync('events.md', 'utf8');
const eventBlocks = input.split(/\n## /).slice(1);

function formatDateTime(dateStr, timeStr) {
  const [h, m] = timeStr.split(':');
  const date = new Date(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00Z`);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

function hash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseEventBlock(block) {
  const [line1, ...rest] = block.trim().split('\n');
  const [dateStr, timeRange] = line1.split(' ');
  const [startTime, endTime] = timeRange.split('–');

  const summary = rest[0].trim();
  const locationLine = rest.find(l => l.toLowerCase().startsWith('ort:'));
  const location = locationLine ? locationLine.split(':')[1].trim() : '';

  const dtStart = formatDateTime(dateStr, startTime);
  const dtEnd = formatDateTime(dateStr, endTime);

  const uidBase = `${dateStr}-${timeRange}-${summary}-${location}`;
  const uid = hash(uidBase);

  return { summary, dtStart, dtEnd, location, uid };
}

const events = eventBlocks.map(parseEventBlock);
const buildTimestamp = new Date().toISOString();
const dtstamp = buildTimestamp.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

let ics = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:-//example.com//Markdown ICS Generator//EN
X-PUBLISHED-TTL:PT1H
REFRESH-INTERVAL;VALUE=DURATION:PT1H
`;

for (const e of events) {
  ics += `BEGIN:VEVENT
UID:${e.uid}@example.com
DTSTAMP:${dtstamp}
DTSTART:${e.dtStart}
DTEND:${e.dtEnd}
SUMMARY:${e.summary}
LOCATION:${e.location}
END:VEVENT
`;
}

ics += `COMMENT:Generated at ${buildTimestamp}
END:VCALENDAR`;

fs.mkdirSync('docs', { recursive: true });
// Setze alle Zeilenenden auf \r\n laut RFC 5545
const icsWithCRLF = ics.replace(/\r?\n/g, '\r\n');
fs.writeFileSync('docs/calendar.ics', icsWithCRLF, 'utf8');


console.log('✅ ICS-Datei unter docs/calendar.ics generiert.');
