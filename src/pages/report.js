import { h } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { pageHead, dayStepper } from '../components/common.js';
import { showToast } from '../components/toast.js';
import { getState, getSettings, getNote, setNote, dataForStats } from '../services/store.js';
import { ui } from '../services/ui.js';
import { buildReport } from '../utils/report.js';
import { copyText, shareText } from '../services/clipboard.js';

export function renderReport(requestRender) {
  const date = ui.date;
  const settings = getSettings();
  const noteField = h('textarea', {
    class: 'input',
    rows: 3,
    placeholder: 'مثلاً امروز تمرکزم کم بود، فردا فیزیک را جبران می‌کنم',
    'aria-label': 'توضیحات گزارش',
  }, getNote(date));

  const preview = h('div', { class: 'report-box', dir: 'rtl' });
  const current = () => buildReport(date, { ...dataForStats(), note: noteField.value }, settings);
  const refresh = () => { preview.textContent = current(); };
  refresh();

  let saveTimer;
  noteField.addEventListener('input', () => {
    refresh();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => setNote(date, noteField.value, true), 400);
  });
  noteField.addEventListener('blur', () => setNote(date, noteField.value, true));

  const copyBtn = h(
    'button',
    {
      class: 'btn primary big block',
      type: 'button',
      onclick: async () => {
        setNote(date, noteField.value, true);
        const ok = await copyText(current());
        showToast(ok ? 'گزارش کپی شد؛ حالا در پیام‌رسان Paste کن ✅' : 'کپی انجام نشد؛ متن را دستی انتخاب و کپی کن.');
      },
    },
    icon('copy'),
    'کپی گزارش',
  );

  const shareBtn = navigator.share
    ? h('button', { class: 'btn block', type: 'button', onclick: () => shareText(current()) }, icon('share'), 'اشتراک‌گذاری')
    : null;

  const counselor = settings.counselor ? `برای ${settings.counselor}` : 'برای مشاور';

  return h(
    'div',
    { class: 'page' },
    pageHead('گزارش', `متن آماده ${counselor}؛ خودکار از اطلاعات ثبت‌شده ساخته می‌شود`),
    dayStepper(date, (d) => { ui.date = d; requestRender(); }),
    h('div', { class: 'field' }, h('label', null, 'توضیحات (اختیاری)'), noteField),
    preview,
    copyBtn,
    shareBtn,
    h('a', { class: 'btn soft block', href: '#/settings' }, 'تنظیم فرمت گزارش'),
  );
}
