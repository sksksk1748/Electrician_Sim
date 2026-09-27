'use strict';
/* 共用小工具：建立 DOM/SVG、存檔、提示、音效 */

const SVGNS = 'http://www.w3.org/2000/svg';

function setAttrs(el, attrs) {
  if (!attrs) return;
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
}
function appendKids(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  appendKids(el, kids);
  return el;
}
function sv(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  setAttrs(el, attrs);
  appendKids(el, kids);
  return el;
}
function svgFrom(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

const Store = {
  key: 'peixian-dojo-v1',
  data: {
    seen: {},        // 課程卡片已讀 { basics: [0,1,..] }
    quizBest: {},    // 章節小考最佳成績 0..1
    stars: {},       // 配線關卡星數
    wires: {},       // 配線關卡存檔
    meterStep: 0,    // 三用電表任務進度
    faultSolved: 0,
    faultStars: 0,
    examBest: null,  // 模擬考最佳分數
  },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* 無法存取時照常執行 */ }
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* 忽略 */ }
  },
};
Store.load();

/* 背景顏色：system 跟隨系統，light / dark 強制指定。和學習進度分開存 */
const Theme = {
  key: 'peixian-dojo-theme',
  get() {
    try {
      const v = localStorage.getItem(this.key);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch (e) { return 'system'; }
  },
  set(v) {
    try {
      if (v === 'system') localStorage.removeItem(this.key); else localStorage.setItem(this.key, v);
    } catch (e) { /* 無法記住也照樣切換 */ }
    this.apply(v);
  },
  apply(v) {
    const root = document.documentElement;
    if (v === 'light' || v === 'dark') root.setAttribute('data-app-theme', v);
    else root.removeAttribute('data-app-theme');
    document.querySelectorAll('[data-theme-opt]').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.themeOpt === v ? 'true' : 'false');
    });
  },
};
document.querySelectorAll('[data-theme-opt]').forEach(b => {
  b.addEventListener('click', () => {
    const v = b.dataset.themeOpt;
    Theme.set(v);
    if (v === 'system') toast('背景顏色會跟著系統設定自動切換。');
  });
});
Theme.apply(Theme.get());

let toastTimer = null;
function toast(msg, kind = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = kind; }, kind === 'bad' ? 3600 : 2600);
}

let audioCtx = null;
function beep(freq = 880, dur = 0.12, type = 'square', vol = 0.05) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur + 0.02);
  } catch (e) { /* 無音效也沒關係 */ }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function starsHTML(n, max = 3) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < n ? '★' : '<span class="off">★</span>';
  return `<span class="stars" aria-label="${n} 顆星">${s}</span>`;
}
function fmtOhm(r) {
  if (!isFinite(r)) return '∞';
  if (r >= 1e6) return (r / 1e6).toFixed(r >= 1e7 ? 1 : 2) + ' MΩ';
  if (r >= 1e3) return (r / 1e3).toFixed(r >= 1e4 ? 1 : 2) + ' kΩ';
  return r.toFixed(r < 10 ? 1 : 0) + ' Ω';
}
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* 離開頁面時需要清掉的監聽器 */
const Page = {
  cleanups: [],
  onLeave(fn) { this.cleanups.push(fn); },
  leave() { this.cleanups.forEach(f => { try { f(); } catch (e) {} }); this.cleanups = []; },
};

function chapterHeader(ch, subtitle) {
  return h('div', { class: 'ch-head' },
    h('div', {},
      h('a', { class: 'back', href: '#home' }, '← 回配電盤'),
      h('h1', {}, h('span', { class: 'circuit-tag' }, '迴路 ' + String(ch.no).padStart(2, '0')), ch.name),
      subtitle ? h('p', { class: 'muted', style: { marginTop: '4px' } }, subtitle) : null,
    ),
  );
}
