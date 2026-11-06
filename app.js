'use strict';

/* ============================================================
   ZINKI · 跑团记录 — 应用逻辑
   ============================================================ */

const $ = (id) => document.getElementById(id);
const lineBtnEl = $('lineBtn');
const lineBtnTitleEl = $('lineBtnTitle');
const lineBtnSubEl = $('lineBtnSub');
const linePopEl = $('linePop');
const catBtnEl = $('catBtn');
const catBtnTitleEl = $('catBtnTitle');
const catPopEl = $('catPop');
const filterPopEl = $('filterPop');
const filterBtnEl = $('filterBtn');
const filterBadgeEl = $('filterBadge');
const searchInput = $('searchInput');
const searchClearEl = $('searchClear');
const stageHeadEl = $('stageHead');
const transcriptEl = $('transcript');
const pagerEl = $('pager');
const toastsEl = $('toasts');
const playerEl = $('player');
const playerTitleEl = $('playerTitle');
const playerSubEl = $('playerSub');
const playerPlayBtnEl = $('playerPlayBtn');
const playerPlayIconEl = $('playerPlayIcon');
const playerPrevBtnEl = $('playerPrevBtn');
const playerNextBtnEl = $('playerNextBtn');
const playerSeekEl = $('playerSeek');
const playerCurEl = $('playerCur');
const playerDurEl = $('playerDur');
const playerVolumeEl = $('playerVolume');
const volumeIconEl = $('volumeIcon');
const playerListBtnEl = $('playerListBtn');
const playlistPopEl = $('playlistPop');

/* ---------- 工具 ---------- */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function initials(name) {
  const t = (name || '').trim();
  const chars = Array.from(t);
  if (!chars.length) return '?';
  if (/^[A-Za-z]/.test(t)) {
    const lat = t.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
    return lat || chars[0];
  }
  return chars[0];
}
function fmtDate(d) {
  const p = String(d).split(/[/-]/).map(Number);
  const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(p[0], p[1] - 1, p[2]).getDay()];
  return p[0] + '年' + p[1] + '月' + p[2] + '日 · 周' + wd;
}
function fmtDateShort(d) {
  const p = String(d).split(/[/-]/).map(Number);
  return p[0] + '年' + p[1] + '月' + p[2] + '日';
}
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}
function readableText(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  if (isNaN(n)) return '#161616';
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#161616' : '#ffffff';
}
function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const lower = text.toLowerCase();
  const ql = query.toLowerCase();
  let out = '', i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) { out += escapeHtml(text.slice(i)); break; }
    out += escapeHtml(text.slice(i, idx));
    out += '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>';
    i = idx + query.length;
  }
  return out;
}
function decorateText(text) {
  let html = highlight(text, state.query.trim());
  html = html.replace(/\b\d+[dD]%|\b\d+[dD]\d+/g, '<span class="dice-token">$&</span>');
  return html;
}

/* ---------- 数据 ---------- */
const ZINKI_COLORS = {
  'KP': '#ffffff',
  '这里有一只牛奶猫': '#aaaaaa',
  '墨菲·马洛里': '#d97736',
  'Riptide-37': '#00cccc',
  'ob一言不发': '#aaaaaa',
  '洛佩兹·斯宾塞': '#4a90e2',
  '索菲亚·伊万诺夫': '#ff2a2a'
};
const LETTER_COLORS = {
  'KP': '#efe8d8',
  '这里有一只牛奶猫': '#efe8d8',
  '系统消息': '#e8e2d5',
  '伊冯·菲洛帕特': '#e2cf9a',
  '克劳德·艾尔伍德': '#7a9b6a',
  '瑞安·格雷夫斯': '#8a4a42',
  '菲利克斯·海德': '#4a7a9a',
  '神崎勘汰': '#9a8a7a'
};
const MOUNTAIN_COLORS = {
  'KP': '#6f6269',
  '骰子': '#6f6269',
  '神崎勘汰': '#b0895c',
  '陈勇刚': '#e6d7b5',
  '林楚味': '#8a8a6a',
  '雪野梢': '#6a84a0',
  '黑部川': '#7a7a58',
  '宋柊': '#8a6d86'
};
const HOTEL_COLORS = {
  'KP': '#4a4a4a',
  '骰子': '#4a4a4a',
  '东云晴弥': '#1a2a3a',
  '古木杏': '#1a3a2c',
  '墓井贵理子': '#5e1414',
  '东条飞鸟': '#5c4a2a'
};
// ZINKI 各个人线对应的「地点颜色」（共同线/全部为红色，由 CSS 回退到 accent）
const LINE_LOCATION_COLOR = {
  ho1: ZINKI_COLORS['墨菲·马洛里'],
  ho2: ZINKI_COLORS['Riptide-37'],
  ho3: ZINKI_COLORS['洛佩兹·斯宾塞'],
  ho4: ZINKI_COLORS['索菲亚·伊万诺夫']
};
function locationColor(src) {
  return LINE_LOCATION_COLOR[src] || null;
}
const SRC_ORDER = { ho1: 0, ho2: 1, ho3: 2, ho4: 3, ho34: 4, zong: 5 };

const LS = {
  category: 'zinki.category', view: 'zinki.view', query: 'zinki.query', hidden: 'zinki.hidden', ooc: 'zinki.showOoc'
};

const state = {
  category: 'zinki',
  view: 'all',
  query: '',
  hidden: {},   // { name: 1 }
  showOoc: true,
  page: 1
};

const CATEGORIES = [
  { id: 'zinki', title: 'ZINKI', theme: 'cyber', colors: ZINKI_COLORS, data: window.__ZINKI_DATA__ || { title: 'ZINKI', lines: [], speakers: [] } },
  { id: 'letter', title: '请勿点击', theme: 'letter', colors: LETTER_COLORS, data: window.__LETTER_DATA__ || { title: '请勿点击', lines: [], speakers: [] } },
  { id: 'mountain', title: '狂气山脉', theme: 'mountain', colors: MOUNTAIN_COLORS, bg: '#E5DDD5', top: '#8a6a48', data: window.__MOUNTAIN_DATA__ || { title: '狂气山脉', lines: [], speakers: [] } },
  { id: 'hotel', title: '旅馆的捕食者', theme: 'hotel', colors: HOTEL_COLORS, data: window.__HOTEL_DATA__ || { title: '旅馆的捕食者', lines: [], speakers: [], bgm: [] } }
];
function activeCat() { return CATEGORIES.find((c) => c.id === state.category) || CATEGORIES[0]; }
let DATA = activeCat().data;

let speakerMap = {};   // name -> { name, role, color }
let mergedMessages = [];
let currentVisible = [];
let renderedCount = 0;
let renderCtx = null;  // { lastDate, group: {name, el, body} }

const audioEl = new Audio();
audioEl.preload = 'metadata';
let playlist = [];        // [{ file, title, desc }]
let currentTrack = null;  // { file, title, desc }
let currentCardEl = null;
let currentIndex = -1;

function buildSpeakerMap() {
  speakerMap = {};
  const colors = activeCat().colors;
  DATA.speakers.forEach((s) => {
    speakerMap[s.name] = { name: s.name, role: s.role, color: colors[s.name] || '#8a9199' };
  });
}

/* ---------- 分类 ---------- */
function classify(m, role) {
  if (m.bgm) return 'bgm';
  const t = (m.c || '').trim();
  if (/^《/.test(t) || /准备——action！/.test(t)) return 'system'; // 《...》章节 / action 标记
  if (role === 'KP' && /^【[\s\S]*】$/.test(t)) return 'important'; // KP 重要信息
  if (/^[【（(]/.test(t)) return 'ooc';                     // 场外发言
  return 'action';                                          // 场内
}

function preprocess() {
  for (const L of DATA.lines) {
    L.messages.forEach((m, idx) => {
      m.src = L.id;
      m.idx = idx;
      m._key = m.d + ' ' + m.t;
      m._kind = classify(m, (speakerMap[m.n] || {}).role || 'PC');
    });
  }
  mergedMessages = [];
  for (const L of DATA.lines) mergedMessages.push(...L.messages);
  mergedMessages.sort(cmpMessages);
}

function cmpMessages(a, b) {
  if (a._key !== b._key) return a._key < b._key ? -1 : 1;
  const ka = a._kind === 'ooc' ? 1 : 0;
  const kb = b._kind === 'ooc' ? 1 : 0;
  if (ka !== kb) return ka - kb;
  const sa = SRC_ORDER[a.src] != null ? SRC_ORDER[a.src] : 9;
  const sb = SRC_ORDER[b.src] != null ? SRC_ORDER[b.src] : 9;
  if (sa !== sb) return sa - sb;
  return a.idx - b.idx;
}

function baseMessages() {
  if (state.view === 'all') return mergedMessages;
  const L = DATA.lines.find((l) => l.id === state.view);
  return L ? L.messages : mergedMessages;
}

function computeVisible() {
  const q = state.query.trim().toLowerCase();
  return baseMessages().filter((m) => {
    if (state.hidden[m.n]) return false;
    if (!state.showOoc && m._kind === 'ooc') return false;
    if (!q) return true;
    return (m.c || '').toLowerCase().includes(q) || m.n.toLowerCase().includes(q);
  });
}

/* ---------- 持久化 ---------- */
function saveState() {
  try {
    localStorage.setItem(LS.view, state.view);
    localStorage.setItem(LS.category, state.category);
    localStorage.setItem(LS.query, state.query || '');
    localStorage.setItem(LS.hidden, JSON.stringify(state.hidden || {}));
    localStorage.setItem(LS.ooc, state.showOoc ? '1' : '0');
  } catch (e) { /* ignore */ }
}
function loadState() {
  try {
    state.category = localStorage.getItem(LS.category) || 'zinki';
    state.view = localStorage.getItem(LS.view) || 'all';
    state.query = localStorage.getItem(LS.query) || '';
    state.hidden = JSON.parse(localStorage.getItem(LS.hidden) || '{}') || {};
    state.showOoc = localStorage.getItem(LS.ooc) !== '0';
  } catch (e) { /* ignore */ }
  if (!CATEGORIES.some((c) => c.id === state.category)) state.category = 'zinki';
  DATA = activeCat().data;
  if (!DATA.lines.some((l) => l.id === state.view)) state.view = 'all';
}

/* ---------- 渲染：大类 / 线路 ---------- */
function updateCatBtn() {
  catBtnTitleEl.textContent = activeCat().title;
}
function renderCatPop() {
  catPopEl.innerHTML = '';
  for (const c of CATEGORIES) {
    const row = document.createElement('div');
    row.className = 'line-row' + (state.category === c.id ? ' active' : '');
    const total = c.data.lines.reduce((a, l) => a + l.messages.length, 0);
    row.innerHTML =
      '<span class="check"><svg class="icon"><use href="#i-check"/></svg></span>' +
      '<span class="line-info"><div class="t1">' + escapeHtml(c.title) + '</div></span>' +
      '<span class="line-count">' + total + '</span>';
    row.addEventListener('click', () => { setCategory(c.id); closePop(); });
    catPopEl.appendChild(row);
  }
}
function setCategory(id) {
  if (state.category === id) return;
  state.category = id;
  state.view = 'all';
  DATA = activeCat().data;
  document.title = activeCat().title + '-ulogs';
  applyTheme();
  buildSpeakerMap();
  preprocess();
  buildPlaylist();
  saveState();
  renderAll();
  window.scrollTo({ top: 0 });
}
function applyTheme() {
  const theme = activeCat().theme;
  document.body.classList.toggle('theme-letter', theme === 'letter');
  document.body.classList.toggle('theme-mountain', theme === 'mountain');
  document.body.classList.toggle('theme-hotel', theme === 'hotel');
  applyLineBg();
}
function applyLineBg() {
  const cat = activeCat();
  if (cat.theme === 'mountain') {
    const L = DATA.lines.find((l) => l.id === state.view);
    document.body.style.setProperty('--bg', L ? L.bg : (cat.bg || '#E5DDD5'));
    document.body.style.setProperty('--mountain-top', L ? (L.top || '#8a6a48') : (cat.top || '#8a6a48'));
  } else {
    document.body.style.removeProperty('--bg');
    document.body.style.removeProperty('--mountain-top');
  }
}

function updateLineBtn() {
  const L = DATA.lines.find((l) => l.id === state.view);
  if (state.view === 'all' && DATA.lines.length > 1) {
    lineBtnTitleEl.textContent = '全部';
    lineBtnSubEl.textContent = DATA.title;
  } else if (L) {
    lineBtnTitleEl.textContent = L.title;
    lineBtnSubEl.textContent = L.sub;
  } else {
    lineBtnTitleEl.textContent = '全部';
    lineBtnSubEl.textContent = '';
  }
}

function renderLinePop() {
  linePopEl.innerHTML = '';
  if (DATA.lines.length > 1) {
    linePopEl.appendChild(buildLineRow({ id: 'all', title: '全部', sub: '合并时间线', count: mergedMessages.length }, state.view === 'all'));
  }
  for (const L of DATA.lines) {
    linePopEl.appendChild(buildLineRow({ id: L.id, title: L.title, sub: L.sub, count: L.messages.length }, state.view === L.id));
  }
}

function buildLineRow(line, active) {
  const row = document.createElement('div');
  row.className = 'line-row' + (active ? ' active' : '');
  row.innerHTML =
    '<span class="check"><svg class="icon"><use href="#i-check"/></svg></span>' +
    '<span class="line-info"><div class="t1">' + escapeHtml(line.title) + '</div><div class="t2">' + escapeHtml(line.sub) + '</div></span>' +
    '<span class="line-count">' + line.count + '</span>';
  row.addEventListener('click', () => { setView(line.id); closePop(); });
  return row;
}

function setView(v) {
  if (state.view === v) return;
  state.view = v;
  applyLineBg();
  saveState();
  renderAll();
  window.scrollTo({ top: 0 });
}

/* ---------- 渲染：头部 ---------- */
function renderStageHead(visible) {
  stageHeadEl.innerHTML = '';
  let title, sub;
  if (state.view === 'all') { title = DATA.title; sub = '全部 · 合并时间线'; }
  else { const L = DATA.lines.find((l) => l.id === state.view); title = DATA.title + ' · ' + L.title; sub = L.sub; }
  const h1 = document.createElement('h1');
  h1.className = 'stage-title';
  h1.textContent = title;
  stageHeadEl.appendChild(h1);

  const meta = document.createElement('div');
  meta.className = 'stage-meta';
  const dates = baseMessages().map((m) => m.d);
  const dMin = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  const dMax = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
  const parts = ['<b>' + visible.length + '</b> 条', '<b>' + DATA.speakers.length + '</b> 位角色'];
  if (dMin) parts.push(dMin === dMax ? fmtDateShort(dMin) : fmtDateShort(dMin) + ' — ' + fmtDateShort(dMax));
  meta.innerHTML = parts.join('<span class="dot"></span>');
  stageHeadEl.appendChild(meta);
}

/* ---------- 渲染：消息 ---------- */
function dayDivider(d) {
  const el = document.createElement('div');
  el.className = 'day-divider';
  el.textContent = fmtDate(d);
  return el;
}
function systemLine(m) {
  const el = document.createElement('div');
  el.className = 'system-line';
  const lab = document.createElement('span');
  lab.className = 'sys-label';
  lab.textContent = m.c;
  el.appendChild(lab);
  return el;
}
function importantBlock(m) {
  const el = document.createElement('div');
  el.className = 'important';
  const loc = locationColor(m.src);
  if (loc) el.style.setProperty('--loc', loc);
  el.textContent = m.c;
  return el;
}

function buildMusicCard(md) {
  const card = document.createElement('div');
  card.className = 'music-card' + (md.file ? ' playable' : '');
  if (md.file) {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('click', () => playTrack(md, card));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playTrack(md, card); } });
  }
  const badge = document.createElement('span');
  badge.className = 'music-badge';
  badge.innerHTML = '<svg class="icon"><use href="#i-music"/></svg>';
  card.appendChild(badge);
  const info = document.createElement('span');
  info.className = 'music-info';
  const t1 = document.createElement('div');
  t1.className = 'music-title';
  t1.textContent = md.title || '音乐';
  const t2 = document.createElement('div');
  t2.className = 'music-desc';
  t2.textContent = (md.desc || '') + (md.tag ? ' · ' + md.tag : '');
  info.appendChild(t1);
  info.appendChild(t2);
  card.appendChild(info);
  if (md.file) {
    const play = document.createElement('span');
    play.className = 'music-play';
    play.innerHTML = '<svg class="icon icon-fill"><use href="#i-play"/></svg>';
    card.appendChild(play);
  } else {
    const slot = document.createElement('span');
    slot.className = 'music-slot';
    slot.textContent = '待上传音乐';
    card.appendChild(slot);
  }
  return card;
}

/* ---------- 播放列表 ---------- */
function buildPlaylist() {
  const seen = {};
  playlist = [];
  for (const L of DATA.lines) {
    for (const m of L.messages) {
      if (m.bgm && m.file) {
        if (!seen[m.file]) {
          seen[m.file] = 1;
          playlist.push({ file: m.file, title: m.bgm, desc: 'BGM' });
        }
      }
      if (!m.media) continue;
      for (const md of m.media) {
        if (!md.file || seen[md.file]) continue;
        seen[md.file] = 1;
        playlist.push({ file: md.file, title: md.title || '音乐', desc: (md.desc || '') + (md.tag ? ' · ' + md.tag : '') });
      }
    }
  }
}

/* ---------- 音乐播放 ---------- */
function playIndex(i) {
  if (!playlist.length) return;
  currentIndex = ((i % playlist.length) + playlist.length) % playlist.length;
  currentTrack = playlist[currentIndex];
  currentCardEl = null;
  audioEl.src = encodeURI(currentTrack.file); // 编码中文/特殊字符，避免移动端 URL 解析失败
  audioEl.loop = true;               // 单曲循环默认
  audioEl.volume = playerVolumeEl.value / 100;
  audioEl.play().catch(() => { /* 加载失败由 error 事件统一提示 */ });
  playerEl.hidden = false;
  document.body.classList.add('has-player');
  updatePlayerUI();
  renderPlaylistPop();
}
function playTrack(md, cardEl) {
  const idx = playlist.findIndex((p) => p.file === md.file);
  if (idx < 0) return;
  if (currentTrack && currentTrack.file === md.file) {
    currentCardEl = cardEl;
    if (audioEl.paused) audioEl.play().catch(() => {}); else audioEl.pause();
    updatePlayerUI();
    return;
  }
  playIndex(idx);
  currentCardEl = cardEl;
  updatePlayerUI();
}
function updatePlayerUI() {
  if (!currentTrack) return;
  const playing = !audioEl.paused;
  playerTitleEl.textContent = currentTrack.title || '音乐';
  playerSubEl.textContent = currentTrack.desc || '';
  playerPlayIconEl.setAttribute('href', playing ? '#i-pause' : '#i-play');
  updateVolumeIcon();
  if (currentCardEl && currentCardEl.isConnected) {
    const use = currentCardEl.querySelector('.music-play use');
    if (use) use.setAttribute('href', playing ? '#i-pause' : '#i-play');
  }
}
function updateVolumeIcon() {
  const v = audioEl.volume;
  const use = volumeIconEl.querySelector('use');
  if (use) use.setAttribute('href', v === 0 ? '#i-volume-mute' : '#i-volume');
}
function updateProgress() {
  const d = audioEl.duration;
  if (d && isFinite(d)) {
    playerSeekEl.max = String(d);
    playerSeekEl.value = String(audioEl.currentTime);
    playerCurEl.textContent = fmtTime(audioEl.currentTime);
    playerDurEl.textContent = fmtTime(d);
    const pct = (audioEl.currentTime / d) * 100;
    playerSeekEl.style.background = 'linear-gradient(90deg, var(--accent) ' + pct + '%, var(--line-strong) ' + pct + '%)';
  } else {
    playerCurEl.textContent = '0:00';
    playerDurEl.textContent = '0:00';
  }
}
function renderPlaylistPop() {
  if (playlistPopEl.hidden) return;
  playlistPopEl.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'pop-head';
  const ht = document.createElement('span');
  ht.className = 'pop-title';
  ht.textContent = '播放列表';
  head.appendChild(ht);
  playlistPopEl.appendChild(head);
  playlist.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'track-row' + (i === currentIndex ? ' active' : '');
    row.innerHTML =
      '<span class="track-num">' + (i + 1) + '</span>' +
      '<span class="track-info"><div class="t1">' + escapeHtml(t.title) + '</div><div class="t2">' + escapeHtml(t.desc) + '</div></span>';
    row.addEventListener('click', () => { playIndex(i); closePop(); });
    playlistPopEl.appendChild(row);
  });
  positionPop(playlistPopEl, playlistPopEl._anchor);
}
audioEl.addEventListener('play', updatePlayerUI);
audioEl.addEventListener('pause', updatePlayerUI);
audioEl.addEventListener('timeupdate', updateProgress);
audioEl.addEventListener('loadedmetadata', updateProgress);
audioEl.addEventListener('error', () => {
  if (currentTrack) toast('无法播放「' + (currentTrack.title || '该音频') + '」，可能是网络或文件问题，请重试');
});

function buildGroup(m) {
  const sp = speakerMap[m.n] || { name: m.n, role: 'PC', color: '#8a9199' };
  const color = m.color || sp.color;
  const isRight = sp.role === 'KP' || sp.name === '骰子';
  const ink = readableText(color);
  const WHITE_INK = { 'KP': 1, '骰子': 1, '雪野梢': 1, '宋柊': 1, '黑部川': 1 };
  const bubbleInk = (activeCat().id === 'mountain' && WHITE_INK[sp.name]) ? '#ffffff' : ink;
  const wrap = document.createElement('div');
  wrap.className = 'group' + (isRight ? ' group-right' : ' group-left');
  wrap.style.setProperty('--sp', color);
  wrap.style.setProperty('--sp-ink', ink);
  wrap.style.setProperty('--sp-bubble-ink', bubbleInk);

  const head = document.createElement('div');
  head.className = 'group-head';
  const av = document.createElement('div');
  av.className = 'avatar';
  av.textContent = initials(sp.name);
  head.appendChild(av);
  const who = document.createElement('div');
  who.className = 'group-who';
  const nm = document.createElement('span');
  nm.className = 'group-name';
  nm.textContent = sp.name;
  who.appendChild(nm);
  if (sp.role && sp.role !== 'PC') {
    const tag = document.createElement('span');
    tag.className = 'role-tag ' + (sp.role === 'KP' ? 'kp' : 'sys');
    tag.textContent = sp.role;
    who.appendChild(tag);
  }
  head.appendChild(who);
  const stamp = document.createElement('span');
  stamp.className = 'group-stamp';
  stamp.textContent = m.t.slice(0, 5);
  head.appendChild(stamp);
  wrap.appendChild(head);

  const body = document.createElement('div');
  body.className = 'group-body';
  wrap.appendChild(body);
  wrap.dataset.q = m.q;

  return { name: m.n, color: color, el: wrap, body };
}

function buildBubble(m) {
  const b = document.createElement('div');
  b.className = 'bubble' + (m._kind === 'ooc' ? ' ooc' : '');
  if (m.c) {
    const s = document.createElement('span');
    s.innerHTML = decorateText(m.c);
    b.appendChild(s);
  }
  if (m.media) for (const md of m.media) if (!md.pos) b.appendChild(buildMusicCard(md));
  return b;
}

function bgmBlock(m) {
  const el = document.createElement('div');
  el.className = 'bgm-marker' + (m.file ? ' playable' : '');
  const icon = document.createElement('span');
  icon.className = 'bgm-marker-icon';
  icon.innerHTML = '<svg class="icon"><use href="#i-music"/></svg>';
  el.appendChild(icon);
  const label = document.createElement('span');
  label.className = 'bgm-marker-text';
  label.textContent = m.bgm;
  el.appendChild(label);
  if (m.file) {
    const play = document.createElement('span');
    play.className = 'music-play';
    play.innerHTML = '<svg class="icon icon-fill"><use href="#i-play"/></svg>';
    el.appendChild(play);
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const md = { file: m.file, title: m.bgm, desc: 'BGM' };
    el.addEventListener('click', () => playTrack(md, el));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playTrack(md, el); } });
  }
  return el;
}

function buildMediaCard(md) {
  const wrap = document.createElement('div');
  wrap.className = 'media-item';
  if (md.kind === 'image') {
    const img = document.createElement('img');
    img.className = 'media-img';
    img.src = md.file;
    img.alt = '';
    img.loading = 'lazy';
    wrap.appendChild(img);
  } else if (md.kind === 'video') {
    const v = document.createElement('video');
    v.className = 'media-video';
    v.src = md.file;
    v.controls = true;
    v.preload = 'metadata';
    v.playsInline = true;
    wrap.appendChild(v);
  }
  return wrap;
}

function renderMessageInto(target, m) {
  if (m.d !== renderCtx.lastDate) {
    target.appendChild(dayDivider(m.d));
    renderCtx.lastDate = m.d;
    renderCtx.group = null;
  }
  if (m._kind === 'system') { target.appendChild(systemLine(m)); renderCtx.group = null; return; }
  if (m._kind === 'important') { target.appendChild(importantBlock(m)); renderCtx.group = null; return; }
  if (m._kind === 'bgm') { target.appendChild(bgmBlock(m)); renderCtx.group = null; return; }
  // 前置图片/视频
  if (m.media) for (const md of m.media) if (md.pos === 'before') { target.appendChild(buildMediaCard(md)); renderCtx.group = null; }
  const color = m.color || (speakerMap[m.n] || {}).color || '#8a9199';
  if (!renderCtx.group || renderCtx.group.name !== m.n || renderCtx.group.color !== color) {
    renderCtx.group = buildGroup(m);
    target.appendChild(renderCtx.group.el);
  }
  renderCtx.group.body.appendChild(buildBubble(m));
  // 后置图片/视频
  if (m.media) for (const md of m.media) if (md.pos === 'after') { target.appendChild(buildMediaCard(md)); renderCtx.group = null; }
}

const PAGE_SIZE = 300;

function pageCount() {
  return Math.max(1, Math.ceil(currentVisible.length / PAGE_SIZE));
}

function renderTranscript(visible) {
  currentVisible = visible;
  const total = pageCount();
  if (state.page > total) state.page = total;
  if (state.page < 1) state.page = 1;
  transcriptEl.innerHTML = '';
  renderCtx = { lastDate: null, group: null };
  if (!currentVisible.length) { renderEmpty(); renderPagination(); return; }
  const start = (state.page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, currentVisible.length);
  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i++) renderMessageInto(frag, currentVisible[i]);
  transcriptEl.appendChild(frag);
  renderPagination();
}

function renderPagination() {
  pagerEl.innerHTML = '';
  const total = pageCount();
  if (total <= 1) return;
  const bar = document.createElement('div');
  bar.className = 'pager-bar';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'pager-btn' + (state.page <= 1 ? ' disabled' : '');
  prev.textContent = '‹ 上一页';
  prev.addEventListener('click', () => goToPage(state.page - 1));
  bar.appendChild(prev);
  const info = document.createElement('span');
  info.className = 'pager-info';
  info.textContent = state.page + ' / ' + total + ' 页';
  bar.appendChild(info);
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'pager-btn' + (state.page >= total ? ' disabled' : '');
  next.textContent = '下一页 ›';
  next.addEventListener('click', () => goToPage(state.page + 1));
  bar.appendChild(next);
  const jump = document.createElement('span');
  jump.className = 'pager-jump';
  const jinput = document.createElement('input');
  jinput.type = 'number';
  jinput.min = '1';
  jinput.max = String(total);
  jinput.placeholder = '页';
  jinput.setAttribute('aria-label', '跳转到页');
  const jbtn = document.createElement('button');
  jbtn.type = 'button';
  jbtn.className = 'pager-btn';
  jbtn.textContent = '跳转';
  jbtn.addEventListener('click', () => {
    const n = parseInt(jinput.value, 10);
    if (n >= 1 && n <= total) goToPage(n);
  });
  jinput.addEventListener('keydown', (e) => { if (e.key === 'Enter') jbtn.click(); });
  jump.appendChild(jinput);
  jump.appendChild(jbtn);
  bar.appendChild(jump);
  pagerEl.appendChild(bar);
}

function goToPage(n) {
  const total = pageCount();
  n = Math.max(1, Math.min(total, n));
  if (n === state.page) return;
  state.page = n;
  renderTranscript(currentVisible);
  window.scrollTo({ top: 0 });
}

function renderEmpty() {
  const div = document.createElement('div');
  div.className = 'empty';
  div.innerHTML = '<svg class="icon"><use href="#i-search"/></svg><h3>没有匹配的发言</h3><p>试试更换关键词，或在筛选面板中显示更多角色。</p>';
  transcriptEl.appendChild(div);
}

/* ---------- 渲染：筛选面板 ---------- */
function renderFilterPop() {
  filterPopEl.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'pop-head';
  const ht = document.createElement('span');
  ht.className = 'pop-title';
  ht.textContent = '角色与外观';
  head.appendChild(ht);
  const reset = document.createElement('button');
  reset.className = 'pop-reset';
  reset.type = 'button';
  reset.textContent = '重置';
  reset.addEventListener('click', () => {
    state.hidden = {};
    state.showOoc = true;
    saveState();
    refreshAfterFilter();
  });
  head.appendChild(reset);
  filterPopEl.appendChild(head);

  // 每角色计数（当前视图）
  const counts = {};
  for (const m of baseMessages()) counts[m.n] = (counts[m.n] || 0) + 1;

  for (const s of DATA.speakers) {
    if (!counts[s.name]) continue; // 只显示当前视图实际出现的角色
    const sp = speakerMap[s.name];
    const off = !!state.hidden[s.name];
    const row = document.createElement('div');
    row.className = 'speaker-row' + (off ? ' off' : '');
    row.style.setProperty('--sp', sp.color);
    row.style.setProperty('--sp-ink', readableText(sp.color));
    row.innerHTML =
      '<div class="avatar">' + escapeHtml(initials(sp.name)) + '</div>' +
      '<span class="speaker-name">' + escapeHtml(sp.name) + '</span>' +
      '<span class="role-tag ' + (sp.role === 'KP' ? 'kp' : sp.role === '系统' ? 'sys' : '') + '">' + escapeHtml(sp.role) + '</span>' +
      '<span class="speaker-count">' + (counts[s.name] || 0) + '</span>' +
      '<span class="speaker-eye"><svg class="icon"><use href="#i-' + (off ? 'eye-off' : 'eye') + '"/></svg></span>';

    row.addEventListener('click', () => {
      if (state.hidden[s.name]) delete state.hidden[s.name]; else state.hidden[s.name] = 1;
      saveState();
      refreshAfterFilter();
    });
    filterPopEl.appendChild(row);
  }

  // 场外发言开关
  const toggle = document.createElement('div');
  toggle.className = 'toggle-row';
  const tl = document.createElement('span');
  tl.className = 'tlabel';
  tl.textContent = '显示场外发言（OOC）';
  toggle.appendChild(tl);
  const sw = document.createElement('button');
  sw.className = 'switch' + (state.showOoc ? ' on' : '');
  sw.type = 'button';
  sw.setAttribute('aria-label', '场外发言开关');
  sw.addEventListener('click', () => {
    state.showOoc = !state.showOoc;
    saveState();
    refreshAfterFilter();
  });
  toggle.appendChild(sw);
  filterPopEl.appendChild(toggle);

  if (!filterPopEl.hidden) positionPop(filterPopEl, filterPopEl._anchor);
}

function refreshAfterFilter() {
  renderFilterPop();
  renderAll();
  window.scrollTo({ top: 0 });
}

function updateFilterBadge() {
  const n = Object.keys(state.hidden).filter((k) => state.hidden[k]).length;
  filterBadgeEl.hidden = n === 0;
  filterBadgeEl.textContent = String(n);
  filterBtnEl.classList.toggle('active', n > 0);
}

function renderAll() {
  updateCatBtn();
  updateLineBtn();
  currentVisible = computeVisible();
  state.page = 1;
  renderStageHead(currentVisible);
  renderTranscript(currentVisible);
  updateFilterBadge();
  updateSearchUI();
}

function updateSearchUI() {
  searchClearEl.hidden = !state.query;
}

/* ---------- 播放器控制 ---------- */
playerPlayBtnEl.addEventListener('click', () => {
  if (!currentTrack) return;
  if (audioEl.paused) audioEl.play().catch(() => {}); else audioEl.pause();
});
playerPrevBtnEl.addEventListener('click', () => { if (playlist.length) playIndex(currentIndex - 1); });
playerNextBtnEl.addEventListener('click', () => { if (playlist.length) playIndex(currentIndex + 1); });
playerSeekEl.addEventListener('input', () => {
  if (audioEl.duration && isFinite(audioEl.duration)) audioEl.currentTime = +playerSeekEl.value;
});
playerVolumeEl.addEventListener('input', () => {
  audioEl.volume = playerVolumeEl.value / 100;
  updateVolumeIcon();
});
playerListBtnEl.addEventListener('click', () => togglePop(playlistPopEl, playerListBtnEl, renderPlaylistPop));

/* ---------- 浮层 ---------- */
let currentPop = null;

function positionPop(pop, anchor) {
  const r = anchor.getBoundingClientRect();
  const rect = pop.getBoundingClientRect();
  let left = r.left;
  let top = r.bottom + 8;
  if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
  if (left < 8) left = 8;
  if (pop === filterPopEl) {
    // 筛选面板强制向下显示，超出视口底部则限高滚动（不再向上翻转）
    pop.style.maxHeight = '';
    pop.style.overflowY = '';
    const maxH = Math.max(120, window.innerHeight - top - 16);
    const h = pop.getBoundingClientRect().height;
    if (h > maxH) {
      pop.style.maxHeight = maxH + 'px';
      pop.style.overflowY = 'auto';
    }
  } else if (top + rect.height > window.innerHeight - 24) {
    top = r.top - rect.height - 8;
  }
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}
function openPop(pop, anchor, renderFn) {
  closePop();
  pop._anchor = anchor;
  pop.hidden = false;
  if (renderFn) renderFn();
  positionPop(pop, anchor);
  currentPop = pop;
}
function togglePop(pop, anchor, renderFn) {
  if (currentPop === pop) { closePop(); return; }
  openPop(pop, anchor, renderFn);
}
function closePop() {
  if (currentPop) { currentPop.hidden = true; currentPop = null; }
  lineBtnEl.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', (e) => {
  if (!currentPop) return;
  const inside = currentPop.contains(e.target) || (currentPop._anchor && currentPop._anchor.contains(e.target));
  if (!inside) closePop();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePop(); return; }
  if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault(); searchInput.focus();
  }
});

/* ---------- Toast ---------- */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toastsEl.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2200);
}

/* ---------- 事件 ---------- */
catBtnEl.addEventListener('click', () => {
  const open = currentPop === catPopEl;
  if (open) { closePop(); return; }
  openPop(catPopEl, catBtnEl, renderCatPop);
  catBtnEl.setAttribute('aria-expanded', 'true');
});
lineBtnEl.addEventListener('click', () => {
  const open = currentPop === linePopEl;
  if (open) { closePop(); return; }
  openPop(linePopEl, lineBtnEl, renderLinePop);
  lineBtnEl.setAttribute('aria-expanded', 'true');
});
filterBtnEl.addEventListener('click', () => togglePop(filterPopEl, filterBtnEl, renderFilterPop));
searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  saveState();
  renderAll();
  window.scrollTo({ top: 0 });
});
searchClearEl.addEventListener('click', () => {
  state.query = '';
  searchInput.value = '';
  saveState();
  renderAll();
  window.scrollTo({ top: 0 });
  searchInput.focus();
});
window.addEventListener('resize', () => { if (currentPop) positionPop(currentPop, currentPop._anchor); });

/* ---------- 初始化 ---------- */
function init() {
  loadState();
  document.title = activeCat().title + '-ulogs';
  applyTheme();
  buildSpeakerMap();
  preprocess();
  buildPlaylist();
  searchInput.value = state.query || '';
  updateSearchUI();
  renderAll();
}

init();
