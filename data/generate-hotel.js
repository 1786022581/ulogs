/* 解析 旅馆的捕食者.txt，输出 data/hotel-data.js（古卷符咒风格） */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const headerRe = /^(.+?)\((\d+)\)\s+(\d{4}\/\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2}:\d{2})\s*$/;
// 名字归一化（仅合并同一人的别名，保留原始显示名）
const NAME_MAP = {
  'hp': '东云晴弥',
  '吉他': '东条飞鸟',
  '吉利蛋': '东条飞鸟',
  'Yotsuzids': 'KP',
  '神崎勘汰': '骰子'
};
// 配色（古卷低饱和）
const COLORS = {
  '东云晴弥': '#1a2a3a', // 深蓝
  '古木杏': '#1a3a2c',   // 绿
  '墓井贵理子': '#5e1414', // 红
  '东条飞鸟': '#5c4a2a',   // 橘棕
  'KP': '#4a4a4a',       // 灰
  '骰子': '#4a4a4a'      // 灰
};
const ROLE = { 'KP': 'KP', '骰子': '系统' };

// 对话内预留的 BGM 位置（锚点为 KP 消息的子串）
const BGM_MARKERS = [
  { title: 'ラクション・ラヴ -ONIISAN MOTTO GANBATTE-', anchor: '（op来了）', before: true },
  { title: 'Run,rabbit,run', anchor: '糟糕了！果然是熊吧', after: true },
  { title: '夜になったら耿十八は', anchor: '（我要开始搓最后的了）', after: true }
];
// BGM 对应的 mp3 文件（jsDelivr 直链）
const BGM_FILES = {
  'ラクション・ラヴ -ONIISAN MOTTO GANBATTE-': 'https://cdn.jsdelivr.net/gh/1786022581/logsmusic@main/lakushon-rav.mp3',
  'Run,rabbit,run': 'https://cdn.jsdelivr.net/gh/1786022581/logsmusic@main/run-rabbit-run.mp3',
  '夜になったら耿十八は': 'https://cdn.jsdelivr.net/gh/1786022581/logsmusic@main/yoru-ni-nattara.mp3'
};

// 在特定消息前/后插入的图片与视频（anchor 为消息内容子串）
const MEDIA = [
  { anchor: '奥山善吉', kind: 'image', pos: 'before', files: ['https://bu.dusays.com/2026/11/06/6aeddc9669767.png'] },
  { anchor: 'i人吧', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8ba6dd6.png'] },
  { anchor: '急促的脚步声', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8c6e59e.png'] },
  { anchor: '类似走廊的空间', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8ce8d8f.png'] },
  { anchor: '屁股', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8cad410.png'] },
  { anchor: '外表轻浮的年轻男性', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8d031db.png'] },
  { anchor: '坐在沙发上读着书', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8dd0c1d.png'] },
  { anchor: '两位年幼的女孩', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc904f885.png', 'https://bu.dusays.com/2026/11/06/6aeddc8fc6b43.png', 'https://bu.dusays.com/2026/11/06/6aeddc8e6d6e1.png'] },
  { anchor: '三楼都是客人的房间', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8cad410.png'] },
  { anchor: '水墨画卷', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8d5ac97.png'] },
  { anchor: '穿过门帘进入内部', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8dbdfc0.png'] },
  { anchor: '趁着帘子掀起来', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc8c5f934.png'] },
  { anchor: '那要凑过去看', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc92c88c5.png'] },
  { anchor: '白色拘束服', kind: 'image', pos: 'before', files: ['https://bu.dusays.com/2026/11/06/6aeddc91dbbc1.png'] },
  { anchor: '给我看吗', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc91bb74d.png', 'https://bu.dusays.com/2026/11/06/6aeddc909531a.png', 'https://bu.dusays.com/2026/11/06/6aeddc922835d.png', 'https://bu.dusays.com/2026/11/06/6aeddc9210758.png', 'https://bu.dusays.com/2026/11/06/6aeddc962bad1.png', 'https://bu.dusays.com/2026/11/06/6aeddc934c823.png'] },
  { anchor: '三扇门', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc942ef49.png'] },
  { anchor: '如地图上所标注', kind: 'image', pos: 'before', files: ['https://bu.dusays.com/2026/11/06/6aeddc93392ec.png'] },
  { anchor: '拿罪犯做实验', kind: 'video', pos: 'before', files: ['https://cdn.jsdelivr.net/gh/1786022581/logsmusic@main/video-1.mp4'] },
  { anchor: '浑身是伤', kind: 'image', pos: 'after', files: ['https://bu.dusays.com/2026/11/06/6aeddc9591028.png'] }
];

function parse(raw) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const msgs = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const c = cur.buf.join('\n').replace(/^\n+/, '').replace(/\n+$/, '').trim();
    if (c) msgs.push({ n: cur.name, d: cur.date, t: cur.time, c, color: COLORS[cur.name] || '#8a9199' });
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

function insertBgm(msgs) {
  for (const spec of BGM_MARKERS) {
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (m.n === 'KP' && m.c && m.c.indexOf(spec.anchor) >= 0) {
        const marker = { n: 'KP', d: m.d, t: m.t, c: '', bgm: spec.title, file: BGM_FILES[spec.title], color: COLORS['KP'] };
        if (spec.before) msgs.splice(i, 0, marker);
        else msgs.splice(i + 1, 0, marker);
        break;
      }
    }
  }
  return msgs;
}

function insertMedia(msgs) {
  for (const spec of MEDIA) {
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (m.c && m.c.indexOf(spec.anchor) >= 0) {
        m.media = m.media || [];
        for (const f of spec.files) {
          m.media.push({ kind: spec.kind, file: f, pos: spec.pos });
        }
        break;
      }
    }
  }
  return msgs;
}

const raw = fs.readFileSync(path.join(dir, 'hotel.txt'), 'utf8');
const msgs = insertMedia(insertBgm(parse(raw)));

const speakerOrder = [];
const seen = {};
const outMsgs = [];
for (const m of msgs) {
  if (!seen[m.n]) { seen[m.n] = 1; speakerOrder.push(m.n); }
  outMsgs.push(m);
}

const speakers = speakerOrder.map((name) => ({ name, role: ROLE[name] || 'PC' }));

const dates = outMsgs.map((m) => m.d);
const dMin = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : '';
const dMax = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : '';

const data = {
  title: '旅馆的捕食者',
  lines: [{ id: 'hotel', title: '全部', sub: dMin === dMax ? dMin : dMin + ' ~ ' + dMax, messages: outMsgs }],
  speakers
};

let out = 'window.__HOTEL_DATA__ = ' + JSON.stringify(data) + ';\n';
out = out.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
fs.writeFileSync(path.join(dir, 'hotel-data.js'), out, 'utf8');
console.log('written hotel-data.js, bytes=' + out.length);
console.log('msgs=' + outMsgs.length);
console.log('speakers: ' + speakers.map((s) => s.name + '(' + s.role + ')').join(' | '));
console.log('bgm markers: ' + outMsgs.filter((m) => m.bgm).length);
