const pad = n => String(n).padStart(2, '0');

const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const today = () => localDate(new Date());

const addDays = n => localDate(new Date(Date.now() + n * 864e5));

const nowMin = () => new Date().getHours() * 60 + new Date().getMinutes();

const weekday = () => new Date().getDay();

const fmtMin = m => `${(Math.floor(m / 60) + 11) % 12 + 1}:${pad(m % 60)} ${m < 720 ? 'AM' : 'PM'}`;

const DAYS = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sat: 6 };

const parseDays = text => {
  const found = String(text || '')
    .replace(/\b(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase())
    .match(/Sat|Su|Th|M|T|W|F/g);
  return found ? { days: found.map(d => DAYS[d]), dayText: found.join(' ') } : null;
};

module.exports = { today, addDays, nowMin, weekday, fmtMin, parseDays };
