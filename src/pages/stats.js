import { h } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { pageHead, marker } from '../components/common.js';
import { barChart, hBarChart, lineChart } from '../components/charts.js';
import { getSettings, dataForStats } from '../services/store.js';
import { ui } from '../services/ui.js';
import { summarizeDay, summarizeRange } from '../utils/stats.js';
import {
  todayISO, addDays, startOfWeek, endOfWeek, jalaliMonthStart, jalaliMonthEnd, shiftJalaliMonth, isoToJalali, weekdayIndex, compareISO,
} from '../utils/dates.js';
import {
  formatDuration, formatClock, formatDateLong, formatDateShort, formatMonthTitle, formatPercent, toFa,
} from '../utils/format.js';

const MODES = [
  { id: 'day', label: 'روزانه' },
  { id: 'week', label: 'هفتگی' },
  { id: 'month', label: 'ماهانه' },
];
const DAY_LETTERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function tile(label, value, extra = '') {
  return h('div', { class: `card stat ${extra}` }, h('span', { class: 'l' }, label), h('span', { class: 'v num', style: { fontSize: '22px' } }, value));
}

function periodNav(title, subtitle, onPrev, onNext) {
  return h(
    'div',
    { class: 'stepper' },
    h('button', { class: 'nav', type: 'button', 'aria-label': 'بعدی', onclick: onNext }, icon('prev')),
    h('div', { class: 'mid' }, h('b', null, title), h('span', null, subtitle)),
    h('button', { class: 'nav', type: 'button', 'aria-label': 'قبلی', onclick: onPrev }, icon('next')),
  );
}

function subjectsCard(range, settings) {
  if (!settings.stats.subjects || !range.bySubject.length) return null;
  return h(
    'section',
    { class: 'card stack' },
    h('h2', { style: { fontSize: '17px' } }, 'سهم هر درس'),
    hBarChart(range.bySubject.slice(0, 8).map((s) => ({ label: s.subject, value: s.minutes, text: formatDuration(s.minutes) }))),
  );
}

function trendCard(range, settings) {
  if (!settings.stats.testTrend || range.testSeries.length < 2) return null;
  return h(
    'section',
    { class: 'card stack' },
    h('div', { class: 'section-head' }, h('h2', { style: { fontSize: '17px' } }, 'روند درصد تست‌ها'), h('span', { class: 'muted small' }, `میانگین ${formatPercent(range.avgPercent)}`)),
    lineChart(range.testSeries.slice(-14).map((p) => ({ label: formatDateShort(p.date), value: p.percent }))),
  );
}

export function renderStats(requestRender) {
  const settings = getSettings();
  const data = dataForStats();
  const today = todayISO();
  const mode = ui.statsMode;
  const parts = [pageHead('آمار', 'ببین چقدر پیش رفته‌ای')];

  parts.push(
    h(
      'div',
      { class: 'segmented', role: 'group', 'aria-label': 'بازه‌ی آمار' },
      MODES.map((m) =>
        h('button', { type: 'button', 'aria-pressed': String(mode === m.id), onclick: () => { ui.statsMode = m.id; ui.statsDate = today; requestRender(); } }, m.label),
      ),
    ),
  );

  const go = (d) => { ui.statsDate = d; requestRender(); };

  if (mode === 'day') {
    const d = ui.statsDate;
    const s = summarizeDay(d, data);
    const range = summarizeRange(d, d, data, today);
    parts.push(periodNav(formatDateLong(d), d === today ? 'امروز' : '', () => go(addDays(d, -1)), () => go(addDays(d, 1))));
    parts.push(
      h(
        'div',
        { class: 'stat-grid' },
        tile('مجموع مطالعه', formatDuration(s.minutes)),
        tile('تعداد جلسات', toFa(s.sessionCount)),
        tile('تعداد تست', toFa(s.testCount)),
        tile('انجام برنامه', s.plansTotal ? `${toFa(s.planPercent)}٪` : '—'),
      ),
    );
    if (s.plansTotal) parts.push(h('section', { class: 'card stack' }, h('div', { class: 'section-head' }, h('h2', { style: { fontSize: '17px' } }, 'پیشرفت برنامه'), h('span', { class: 'muted small num' }, `${toFa(s.plansDone)} از ${toFa(s.plansTotal)}`)), marker(s.planPercent)));
    if (settings.dailyGoalMinutes) {
      parts.push(h('section', { class: 'card stack' }, h('div', { class: 'section-head' }, h('h2', { style: { fontSize: '17px' } }, 'هدف مطالعه'), h('span', { class: 'muted small num' }, `${formatClock(s.minutes)} از ${formatClock(settings.dailyGoalMinutes)}`)), marker((s.minutes / settings.dailyGoalMinutes) * 100)));
    }
    parts.push(subjectsCard(range, settings), trendCard(range, settings));
  }

  if (mode === 'week') {
    const ws = startOfWeek(ui.statsDate);
    const we = endOfWeek(ui.statsDate);
    const r = summarizeRange(ws, we, data, today);
    parts.push(periodNav(`${formatDateShort(ws)} تا ${formatDateShort(we)}`, ws === startOfWeek(today) ? 'این هفته' : formatMonthTitle(ws), () => go(addDays(ws, -7)), () => go(addDays(ws, 7))));
    parts.push(
      h(
        'div',
        { class: 'stat-grid' },
        tile('مجموع مطالعه‌ی هفته', formatDuration(r.minutes)),
        tile('میانگین روزانه', formatDuration(r.avgDaily)),
        tile('تعداد تست‌ها', toFa(r.testCount)),
        tile('برنامه‌ی انجام‌شده', toFa(r.plansDone), 'ok'),
        tile('برنامه‌ی انجام‌نشده', toFa(r.plansPending), 'no'),
        tile('میانگین درصد تست', r.testSeries.length ? formatPercent(r.avgPercent) : '—'),
      ),
    );
    if (settings.weeklyGoalMinutes) parts.push(h('section', { class: 'card stack' }, h('div', { class: 'section-head' }, h('h2', { style: { fontSize: '17px' } }, 'هدف هفتگی'), h('span', { class: 'muted small num' }, `${formatClock(r.minutes)} از ${formatClock(settings.weeklyGoalMinutes)}`)), marker((r.minutes / settings.weeklyGoalMinutes) * 100)));
    const best = Math.max(0, ...r.perDay.map((d) => d.minutes));
    parts.push(
      h('section', { class: 'card stack' }, h('h2', { style: { fontSize: '17px' } }, 'مطالعه‌ی هر روز'),
        barChart(r.perDay.map((d) => ({ label: DAY_LETTERS[weekdayIndex(d.date)], value: d.minutes, today: d.date === today, best: best > 0 && d.minutes === best, title: `${formatDateShort(d.date)}: ${formatDuration(d.minutes)}` })))),
    );
    parts.push(subjectsCard(r, settings), trendCard(r, settings));
  }

  if (mode === 'month') {
    const ms = jalaliMonthStart(ui.statsDate);
    const me = jalaliMonthEnd(ui.statsDate);
    const r = summarizeRange(ms, me, data, today);
    parts.push(periodNav(formatMonthTitle(ms), compareISO(ms, jalaliMonthStart(today)) === 0 ? 'این ماه' : '', () => go(shiftJalaliMonth(ms, -1)), () => go(shiftJalaliMonth(ms, 1))));
    parts.push(
      h(
        'div',
        { class: 'stat-grid' },
        tile('مجموع مطالعه‌ی ماه', formatDuration(r.minutes)),
        tile('میانگین روزانه', formatDuration(r.avgDaily)),
        tile('مجموع تست', toFa(r.testCount)),
        tile('روزهای مطالعه', toFa(r.studyDays)),
        tile('بهترین روز مطالعه', r.bestDay ? `${formatDateShort(r.bestDay.date)} · ${formatClock(r.bestDay.minutes)}` : '—'),
        tile('میانگین درصد تست', r.testSeries.length ? formatPercent(r.avgPercent) : '—'),
      ),
    );
    const best = Math.max(0, ...r.perDay.map((d) => d.minutes));
    parts.push(
      h('section', { class: 'card stack' }, h('h2', { style: { fontSize: '17px' } }, 'مطالعه‌ی هر روز ماه'),
        barChart(r.perDay.map((d) => ({ label: toFa(isoToJalali(d.date).jd), value: d.minutes, today: d.date === today, best: best > 0 && d.minutes === best, title: `${formatDateShort(d.date)}: ${formatDuration(d.minutes)}` })), { dense: true, labelEvery: 5 })),
    );
    parts.push(subjectsCard(r, settings), trendCard(r, settings));
  }

  return h('div', { class: 'page' }, parts.filter(Boolean));
}
