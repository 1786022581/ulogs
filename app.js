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
const sentinelEl = $('loadSentinel');
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
  'KP': '#e6e8ec',
  '这里有一只牛奶猫': '#c9ced4',
  '墨菲·马洛里': '#b0593c',
  'Riptide-37': '#38a3ff',
  'ob一言不发': '#8a9199',
  '洛佩兹·斯宾塞': '#9fd0f8',
  '索菲亚·伊万诺夫': '#ff3b30'
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
  showOoc: true
};

const CATEGORIES = [
  { id: 'zinki', title: 'ZINKI', theme: 'cyber', colors: ZINKI_COLORS, data: window.__ZINKI_DATA__ || { title: 'ZINKI', lines: [], speakers: [] } },
  { id: 'letter', title: '请勿点击', theme: 'letter', colors: LETTER_COLORS, data: window.__LETTER_DATA__ || { title: '请勿点击', lines: [], speakers: [] } }
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
  applyTheme();
  buildSpeakerMap();
  preprocess();
  buildPlaylist();
  saveState();
  renderAll();
  window.scrollTo({ top: 0 });
}
function applyTheme() {
  document.body.classList.toggle('theme-letter', activeCat().theme === 'letter');
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
  const wrap = document.createElement('div');
  wrap.className = 'group';
  wrap.style.setProperty('--sp', sp.color);
  wrap.style.setProperty('--sp-ink', readableText(sp.color));

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

  return { name: m.n, el: wrap, body };
}

function buildBubble(m) {
  const b = document.createElement('div');
  b.className = 'bubble' + (m._kind === 'ooc' ? ' ooc' : '');
  if (m.c) {
    const s = document.createElement('span');
    s.innerHTML = decorateText(m.c);
    b.appendChild(s);
  }
  if (m.media) for (const md of m.media) b.appendChild(buildMusicCard(md));
  return b;
}

function renderMessageInto(target, m) {
  if (m.d !== renderCtx.lastDate) {
    target.appendChild(dayDivider(m.d));
    renderCtx.lastDate = m.d;
    renderCtx.group = null;
  }
  if (m._kind === 'system') { target.appendChild(systemLine(m)); renderCtx.group = null; return; }
  if (m._kind === 'important') { target.appendChild(importantBlock(m)); renderCtx.group = null; return; }
  if (!renderCtx.group || renderCtx.group.name !== m.n) {
    renderCtx.group = buildGroup(m);
    target.appendChild(renderCtx.group.el);
  }
  renderCtx.group.body.appendChild(buildBubble(m));
}

const CHUNK = 300;
let io = null;

function renderTranscript(visible) {
  currentVisible = visible;
  transcriptEl.innerHTML = '';
  renderedCount = 0;
  renderCtx = { lastDate: null, group: null };
  if (!currentVisible.length) { renderEmpty(); return; }
  appendChunk();
}

function appendChunk() {
  const start = renderedCount;
  const end = Math.min(start + CHUNK, currentVisible.length);
  if (start >= end) { updateSentinel(); return; }
  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i++) renderMessageInto(frag, currentVisible[i]);
  transcriptEl.appendChild(frag);
  renderedCount = end;
  updateSentinel();
}

function updateSentinel() {
  if (io) { io.disconnect(); io = null; }
  if (renderedCount < currentVisible.length) {
    const left = currentVisible.length - renderedCount;
    sentinelEl.innerHTML = '<button class="load-more" type="button">加载更多（剩余 ' + left + ' 条）</button>';
    const btn = sentinelEl.firstChild;
    btn.addEventListener('click', appendChunk);
    io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) appendChunk(); }, { rootMargin: '800px' });
    io.observe(btn);
  } else {
    sentinelEl.innerHTML = '';
  }
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

  const foot = document.createElement('div');
  foot.className = 'pop-foot';
  foot.textContent = '点击条目显示 / 隐藏 · KP 的【】重要信息始终显示';
  filterPopEl.appendChild(foot);

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
  if (top + rect.height > window.innerHeight - 24) top = r.top - rect.height - 8;
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
  applyTheme();
  buildSpeakerMap();
  preprocess();
  buildPlaylist();
  searchInput.value = state.query || '';
  updateSearchUI();
  renderAll();
}

init();
