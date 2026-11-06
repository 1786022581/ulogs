/* 解析狂气山脉系列 6 份日志，输出 data/mountain-data.js */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const headerRe = /^(.+?)\((\d+)\)\s+(\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2}:\d{2})\s*$/;
// 名字归一化：磕破/🌻 都是 KP，猫咪是骰子，此ID已隐藏 绑定为宋柊
const NAME_MAP = { '磕破': 'KP', '🌻': 'KP', '猫咪': '骰子', '此ID已隐藏': '宋柊' };
// 两组配色（1=狂气山脉/梦寻未知之峰；2=其余四份）
const GROUP1 = { '神崎勘汰': '#b0895c', '陈勇刚': '#e6d7b5', '林楚味': '#8a8a6a', 'KP': '#6f6269', '骰子': '#6f6269' };
const GROUP2 = { '雪野梢': '#6a84a0', '黑部川': '#7a7a58', '宋柊': '#8a6d86', 'KP': '#66666e', '骰子': '#66666e' };
const GROUP1_BG = '#E5DDD5';
const GROUP2_BG = '#E5DDD5';
const GROUP1_TOP = '#8a6a48';
const GROUP2_TOP = '#8fb5d4';
const ROLE = { 'KP': 'KP', '骰子': '系统' };

const LINES = [
  { id: 'kuangqi', title: '狂气山脉', file: 'm1.txt', group: 1 },
  { id: 'mengxun', title: '梦寻未知之峰', file: 'm2.txt', group: 1 },
  { id: 'bugui', title: '不归之险峰', file: 'm3.txt', group: 2 },
  { id: 'xiangzhe', title: '向着生命的意志', file: 'm4.txt', group: 2 },
  { id: 'beiyiliu', title: '被遗留下的人', file: 'm5.txt', group: 2 },
  { id: 'zhenshi', title: '真实的追随者', file: 'm6.txt', group: 2 }
];

function processContent(c) {
  let t = c.replace(/\[CQ:[^\]]*\]/g, '');
  t = t.replace(/\r\n?/g, '\n');
  t = t.replace(/^\n+/, '').replace(/\n+$/, '').trim();
  return t;
}

function parse(raw, colorMap) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const msgs = [];
  let cur = null;
  let lastDate = null, lastTime = null;
  const flush = () => {
    if (!cur) return;
    const c = processContent(cur.buf.join('\n'));
    if (c) {
      // 1970-00-00 为导出缺失时间戳，继承上一条有效时间
      if (cur.date === '1970-00-00') {
        cur.date = lastDate || cur.date;
        cur.time = lastTime || cur.time;
      } else {
        lastDate = cur.date;
        lastTime = cur.time;
      }
      msgs.push({ n: cur.name, d: cur.date, t: cur.time, c, color: colorMap[cur.name] || '#8a9199' });
    }
    cur = null;
  };
  for (const line of lines) {
    const m = headerRe.exec(line);
    if (m) {
      flush();
      const rawName = m[1].trim();
      cur = { name: NAME_MAP[rawName] || rawName, date: m[3], time: m[4], buf: [] };
    } else if (cur) {
      cur.buf.push(line);
    }
  }
  flush();
  return msgs;
}

const speakerOrder = [];
const seen = {};
const outLines = [];
for (const L of LINES) {
  const raw = fs.readFileSync(path.join(dir, L.file), 'utf8');
  const colorMap = L.group === 1 ? GROUP1 : GROUP2;
  const msgs = parse(raw, colorMap);
  for (const m of msgs) {
    if (!seen[m.n]) { seen[m.n] = 1; speakerOrder.push(m.n); }
  }
  const dates = msgs.map((m) => m.d);
  const dMin = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : '';
  const dMax = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : '';
  outLines.push({
    id: L.id,
    title: L.title,
    sub: dMin === dMax ? dMin : dMin + ' ~ ' + dMax,
    bg: L.group === 1 ? GROUP1_BG : GROUP2_BG,
    top: L.group === 1 ? GROUP1_TOP : GROUP2_TOP,
    messages: msgs
  });
}

const speakers = speakerOrder.map((name) => ({ name, role: ROLE[name] || 'PC' }));
const data = { title: '狂气山脉', lines: outLines, speakers };

let out = 'window.__MOUNTAIN_DATA__ = ' + JSON.stringify(data) + ';\n';
out = out.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
fs.writeFileSync(path.join(dir, 'mountain-data.js'), out, 'utf8');
console.log('written mountain-data.js, bytes=' + out.length);
console.log('speakers: ' + speakers.map((s) => s.name + '(' + s.role + ')').join(' | '));
outLines.forEach((L) => console.log(L.id + ' [' + L.title + '] ' + L.sub + ' msgs=' + L.messages.length + ' bg=' + L.bg));
