/* ============================================================
   TOWER OF ARITHMOS — game layer (산술의 탑)  v3
   엔진(문제 생성)은 건드리지 않고 그 위에 얹는다.
   ============================================================ */
const ME = window.MathEngine;
const HS = window.HSFloors;
const MON = window.Monsters;
const { foxSVG, foxChip, STORY_INTRO, STORY_ENDING, FLOOR_LINES } = window.FoxStory;
const $ = (s, r = document) => r.querySelector(s);
const stageEl = $('#stage');

/* ---------- 30 floors ---------- */
const BASE_NAMES = [
  '수의 새싹', '구구의 정령', '넓이의 파수꾼', '분수의 환영', '원환의 수호자',
  '음수의 그림자', '균형의 저울', '각의 건축가', '경계의 문지기', '직선의 항해사',
  '닮은 자의 거울', '운명의 주사위', '근원의 뿌리', '이중근의 마녀', '포물선의 용',
  '삼각의 현자', '분포의 점성술사', '원환의 대공', '상관의 예언자', '중등의 정점',
];
const FLOORS = {};
BASE_NAMES.forEach((n, i) => { FLOORS[i + 1] = { n, c: MON.cfg(i + 1).color }; });
for (let s = 21; s <= 30; s++) FLOORS[s] = { n: HS.HS_FLOORS[s].n, c: MON.cfg(s).color };

const TOP = 30;
const isHS = s => HS.isHS(s);
const gradeOf = s => isHS(s) ? HS.HS_FLOORS[s].grade : ME.PROBLEMS[ME.STAGE_MAP[s][0]].grade;
const typeCount = s => isHS(s) ? HS.hsProblemCount(s) : ME.STAGE_MAP[s].length;
const tierOf = s => s <= 5 ? '초등' : s <= 20 ? '중등' : '고등';
const timeLen = s => isHS(s) ? (s >= 28 ? 80 : s >= 26 ? 65 : 52) : (s >= 14 ? 30 : 24);

/* monster HP (난이도·데미지 시스템의 토대) */
function monsterMaxHP(s) { let hp = 78 + s * 4; if (s >= 28) hp += 36; return hp; }
/* 난이도 → 데미지 (맞히면 몬스터에 큰 데미지) */
function correctDamage(d, speedMult, comboMult) { return Math.round(15 * (0.7 + d * 0.2) * speedMult * comboMult); }
/* 난이도 → 내 피해 (틀리면 크게 다침), shield면 30% 감소 */
function playerDamage(stage, d, shield) {
  let base = 9 + stage * 0.7;
  let dmg = Math.round(base * (0.8 + d * 0.12));
  dmg = Math.min(46, dmg);
  if (shield) dmg = Math.round(dmg * 0.7);
  return dmg;
}
/* 엔진 문제의 난이도 추정 (층 기반) */
function estDifficulty(stage) {
  let d = Math.ceil(stage / 4);            // 1..5
  if (Math.random() < 0.3 && d < 5) d += 1;
  return Math.max(1, Math.min(5, d));
}

/* ---------- persistence ---------- */
const KEY = 'arithmos_save_v3';
const mem = {};
function loadSave() {
  let d = null;
  try { const r = localStorage.getItem(KEY); if (r) d = JSON.parse(r); } catch (e) {}
  if (!d && mem[KEY]) d = JSON.parse(mem[KEY]);
  if (!d) {
    // migrate v2 money(chips)
    let old = null; try { old = JSON.parse(localStorage.getItem('arithmos_save_v2') || 'null'); } catch (e) {}
    d = { stars: {}, totalScore: 0, money: old?.chips || 0, name: '', seenIntro: false, beat: false, inv: {}, dev: false };
  }
  d.stars = d.stars || {}; d.inv = d.inv || {}; d.money = d.money || 0;
  return d;
}
function writeSave() { const s = JSON.stringify(SAVE); try { localStorage.setItem(KEY, s); } catch (e) {} mem[KEY] = s; }
let SAVE = loadSave();
const isUnlocked = s => s === 1 || (SAVE.stars[s - 1] >= 1);
const maxUnlocked = () => { let m = 1; for (let s = 1; s <= TOP; s++) if (isUnlocked(s)) m = s; return m; };
const heroName = () => SAVE.name || '단우';

/* ---------- tweaks (themes) ---------- */
const TW_KEY = 'arithmos_tweaks_v1';
const THEMES = {
  ice: { label: '얼음탑', accent: '#7fd9e8', top: 'rgba(20,28,48,0.9)', bot: 'rgba(8,11,22,1)' },
  ember: { label: '잿불탑', accent: '#ff9a6b', top: 'rgba(40,22,22,0.9)', bot: 'rgba(16,8,8,1)' },
  arcane: { label: '비전탑', accent: '#b89bff', top: 'rgba(30,22,52,0.9)', bot: 'rgba(12,8,22,1)' },
  bloom: { label: '벚꽃탑', accent: '#ff9ec2', top: 'rgba(46,24,38,0.9)', bot: 'rgba(16,8,14,1)' },
};
let TWEAKS = { theme: 'ice', motion: true };
try { Object.assign(TWEAKS, JSON.parse(localStorage.getItem(TW_KEY) || '{}')); } catch (e) {}
function applyTheme() {
  const th = THEMES[TWEAKS.theme] || THEMES.ice;
  FX.setBgTone(th.top, th.bot);
  document.body.classList.toggle('no-motion', !TWEAKS.motion);
}
function themeAccent() { return (THEMES[TWEAKS.theme] || THEMES.ice).accent; }
function saveTweaks() { try { localStorage.setItem(TW_KEY, JSON.stringify(TWEAKS)); } catch (e) {} }

/* ---------- helpers ---------- */
const sfx = FX.sfx;
const setAccent = c => FX.setAccent(c);
const show = html => { stageEl.innerHTML = html; };
const esc = t => String(t).replace(/[<&>]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const fmt = n => n.toLocaleString('ko-KR');
const money$ = () => `ℚ ${fmt(SAVE.money)}`;
function applyName(t) { return t.replace(/단우/g, heroName()); }
function diffStars(d) { let s = ''; for (let i = 0; i < 5; i++) s += `<span class="${i < d ? 'f' : 'e'}">◆</span>`; return s; }
function star(k) { return '<span class="' + (k ? 's' : 'e') + '">' + (k ? '★' : '☆') + '</span>'; }
function starStr(n) { let s = ''; for (let i = 0; i < 3; i++) s += star(i < n); return s; }
let toastT = null;
function toast(msg) { const e = $('#toast'); e.textContent = msg; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1900); }

/* ============================================================
   NAME ENTRY (first launch)
   ============================================================ */
function renderNameEntry() {
  setAccent(themeAccent());
  show(`
  <section class="screen on" id="title">
    <div class="crest tilt3d">${foxSVG('happy', 'var(--accent)')}</div>
    <div class="t-sub">Tower of Arithmos</div>
    <p class="t-tag" style="margin:18px 0 14px">탑에 오를 도전자여, 이름이 뭐지?<br><span style="color:var(--dim);font-size:12px">오일러가 너를 그렇게 부를게.</span></p>
    <div class="name-box">
      <input id="nameInput" class="name-input" maxlength="8" placeholder="이름 입력 (최대 8자)" autocomplete="off">
      <button class="btn primary" id="nameGo">시작 ▸</button>
    </div>
    <p class="hint">비워두면 ‘단우’ 로 시작해.</p>
  </section>`);
  const inp = $('#nameInput');
  setTimeout(() => inp.focus(), 100);
  const go = () => { SAVE.name = (inp.value || '').trim().slice(0, 8) || '단우'; writeSave(); sfx.tap(); renderTitle(); };
  $('#nameGo').onclick = go;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

/* ============================================================
   TITLE
   ============================================================ */
let titleTaps = 0, titleTapT = null;
function renderTitle() {
  setAccent(themeAccent());
  const totalStars = Object.values(SAVE.stars).reduce((a, b) => a + b, 0);
  show(`
  <section class="screen on" id="title">
    <div class="crest tilt3d" id="crest">${foxSVG('sparkle', 'var(--accent)')}</div>
    <div class="t-sub">Tower of Arithmos</div>
    <h1 class="t-main" id="titleMain">산술의 탑</h1>
    <p class="t-tag">${esc(heroName())}, 수능 전날 밤 수학 세계로 떨어지다.<br>30층 수호자를 풀어 쓰러뜨리고 집으로 돌아가라.</p>
    <div class="menu">
      <button class="btn primary" id="b-climb">⚔️ 등반 시작 <span class="k">${totalStars}★</span></button>
      <button class="btn ghost" id="b-practice">🎯 자유 연습</button>
      <button class="btn ghost" id="b-shop">🛒 상점 <span class="k">${money$()}</span></button>
      ${totalStars > 0 || SAVE.money > 0 ? '<button class="btn ghost mini" id="b-reset">↺ 기록 초기화</button>' : ''}
    </div>
    <p class="hint">초1 ~ 1997 수능 · 30층 · 객관식 &amp; 단답형<br>난이도(◆)가 높을수록 데미지가 크다 ${SAVE.dev ? '· <span style="color:var(--gold)">개발자 모드 ON</span>' : ''}</p>
  </section>`);
  $('#b-climb').onclick = () => {
    sfx.tap();
    if (!SAVE.seenIntro) playStory(STORY_INTRO, () => { SAVE.seenIntro = true; writeSave(); renderTower(false); });
    else renderTower(false);
  };
  $('#b-practice').onclick = () => { sfx.tap(); renderTower(true); };
  $('#b-shop').onclick = () => { sfx.tap(); openShop(() => renderTitle()); };
  const rb = $('#b-reset'); if (rb) rb.onclick = () => { if (confirm('모든 기록·유리수·아이템을 지울까? (이름은 유지)')) { const nm = SAVE.name; SAVE = loadSaveFresh(nm); writeSave(); renderTitle(); } };
  // secret dev toggle: tap title 5x
  const tapZone = $('#titleMain');
  tapZone.onclick = () => {
    titleTaps++; clearTimeout(titleTapT); titleTapT = setTimeout(() => titleTaps = 0, 1200);
    if (titleTaps >= 5) { titleTaps = 0; SAVE.dev = !SAVE.dev; writeSave(); sfx.coin(); toast(SAVE.dev ? '🔓 개발자 모드 ON — 정답이 표시됩니다' : '개발자 모드 OFF'); renderTitle(); }
  };
}
function loadSaveFresh(name) { return { stars: {}, totalScore: 0, money: 0, name: name || '', seenIntro: true, beat: false, inv: {}, dev: false }; }

/* ============================================================
   SHOP bridge
   ============================================================ */
function openShop(back) {
  setAccent(themeAccent());
  window.Shop.open({
    host: stageEl, ME, sfx, toast,
    getMoney: () => SAVE.money,
    spend: n => { SAVE.money -= n; writeSave(); },
    addInv: k => { SAVE.inv[k] = (SAVE.inv[k] || 0) + 1; writeSave(); },
    getInv: () => SAVE.inv,
    onBack: back,
  });
}

/* ============================================================
   TOWER MAP
   ============================================================ */
function renderTower(practice) {
  setAccent(themeAccent());
  let rows = '', lastTier = null;
  for (let s = TOP; s >= 1; s--) {
    const tier = tierOf(s);
    if (tier !== lastTier) {
      const range = tier === '고등' ? '21–30 · 고1~1997 수능' : tier === '중등' ? '06–20 · 중1~중3' : '01–05 · 초등';
      rows += `<div class="tier-label">${tier} <span style="color:var(--dim)">${range}</span></div>`;
      lastTier = tier;
    }
    const f = FLOORS[s], unlocked = practice || isUnlocked(s), stars = SAVE.stars[s] || 0;
    rows += `<div class="floor ${unlocked ? '' : 'locked'} ${stars > 0 ? 'cleared' : ''}" data-s="${s}" style="--fc:${f.c}">
      <div class="fglyph">${MON.monsterSVG(s, 46)}</div>
      <div class="finfo">
        <div class="fnum">FLOOR ${String(s).padStart(2, '0')} · ${gradeOf(s)}</div>
        <div class="fname">${f.n}</div>
        <div class="fgrade">${isHS(s) ? HS.HS_DATA[s].exam : typeCount(s) + '가지 유형'}</div>
      </div>
      ${unlocked ? `<div class="fstars">${starStr(stars)}</div>` : `<div class="flock">🔒</div>`}
    </div>`;
  }
  const invCount = Object.values(SAVE.inv).reduce((a, b) => a + b, 0);
  show(`
  <section class="screen on">
    <div class="topbar">
      <button class="iconbtn" id="back">←</button>
      <h2>${practice ? '연습할 층 선택' : '산술의 탑'}</h2>
      <button class="statpill money" id="t-shop">🛒 ${money$()}</button>
    </div>
    <div class="tower-scroll" id="tscroll">${rows}
      <p class="hint" style="text-align:center">${practice ? '연습 모드: HP·게임오버 없이 무한 풀이' : `한 층을 깨면 다음 층이 열린다${invCount ? ` · 보유 아이템 ${invCount}개` : ''}`}</p>
    </div>
  </section>`);
  $('#back').onclick = () => { sfx.tap(); renderTitle(); };
  $('#t-shop').onclick = () => { sfx.tap(); openShop(() => renderTower(practice)); };
  stageEl.querySelectorAll('.floor').forEach(el => {
    const s = +el.dataset.s;
    el.onclick = () => {
      if (!practice && !isUnlocked(s)) { sfx.wrong(); toast('아직 잠긴 층이다. 아래 층부터 깨라.'); return; }
      sfx.tap(); preBattle(s, practice);
    };
  });
  if (!practice) { const t = stageEl.querySelector(`.floor[data-s="${maxUnlocked()}"]`); if (t) t.scrollIntoView({ block: 'center' }); }
}

/* ============================================================
   PRE-BATTLE: 아이템 1개 장착
   ============================================================ */
function preBattle(stage, practice) {
  const inv = SAVE.inv, owned = window.Shop.ORDER.filter(k => (inv[k] || 0) > 0);
  if (practice || owned.length === 0) { startBattle(stage, practice, null); return; }
  const f = FLOORS[stage];
  const cards = owned.map(k => {
    const it = window.Shop.ITEMS[k];
    return `<button class="equip-card" data-k="${k}" style="--ic:${it.color}">
      <span class="equip-ic">${it.glyph}</span>
      <span class="equip-info"><b>${it.name}</b><small>${it.desc}</small></span>
      <span class="equip-own">×${inv[k]}</span></button>`;
  }).join('');
  show(`
  <section class="screen on" id="equip">
    <div class="topbar"><button class="iconbtn" id="eq-back">←</button><h2 style="color:${f.c}">${f.n} · 출정 준비</h2><div></div></div>
    <div class="equip-wrap">
      <p class="equip-lead">아이템은 <b>1개만</b> 장착할 수 있어. 장착하면 이번 전투에서 쓰이고 사라져.</p>
      ${cards}
      <button class="btn ghost" id="eq-none">아이템 없이 시작</button>
    </div>
  </section>`);
  $('#eq-back').onclick = () => { sfx.tap(); renderTower(practice); };
  $('#eq-none').onclick = () => { sfx.tap(); startBattle(stage, practice, null); };
  stageEl.querySelectorAll('.equip-card').forEach(b => b.onclick = () => {
    const k = b.dataset.k; SAVE.inv[k] = Math.max(0, (SAVE.inv[k] || 0) - 1); writeSave();
    sfx.coin(); startBattle(stage, practice, k);
  });
}

/* ============================================================
   BATTLE
   ============================================================ */
let B = null, timerId = null, m3d = null;
function startBattle(stage, practice, item) {
  const f = FLOORS[stage];
  setAccent(f.c);
  const startHP = 100 + (item === 'hp' ? 40 : 0);
  B = {
    stage, practice, f, item,
    shield: item === 'shield', hintLeft: item === 'hint' ? 1 : 0,
    maxHP: startHP, heroHP: startHP,
    monMax: monsterMaxHP(stage), monHP: monsterMaxHP(stage),
    combo: 0, maxCombo: 0, score: 0, money: 0, wrong: 0, qStart: 0,
    locked: true, cur: null, qIndex: 0, hintUsed: false,
  };
  show(`
  <section class="screen on" id="battle">
    <div class="topbar">
      <button class="iconbtn" id="flee">←</button>
      <h2 style="color:${f.c}">${f.n}</h2>
      <div class="statpill" id="scorepill">◈ 0</div>
    </div>

    <div class="bar-row">
      <div class="bar-head"><span class="nm" style="color:${f.c}">${f.n}</span><span class="hp" id="foehp"></span></div>
      <div class="bar-track"><div class="bar-fill foe" id="foefill" style="width:100%"></div></div>
    </div>

    <div class="battle-scene" id="scene">
      <div class="combo hidden" id="combo"><div class="n" id="combon">0</div><div class="l">COMBO</div></div>
      <div class="guardian">
        <div class="monster-stage" id="monMount"></div>
        <div class="g-name" style="color:${f.c}">${gradeOf(stage)} 수호자</div>
      </div>
    </div>

    <div class="bar-row" id="herorow">
      <div class="bar-head"><span class="nm">♠ ${esc(heroName())} ${item ? itemBadge(item) : ''}</span><span class="hp" id="herohp"></span></div>
      <div class="bar-track"><div class="bar-fill hero" id="herofill" style="width:100%"></div></div>
    </div>

    <div class="qcard tilt3d-soft">
      <div class="qtimer"><div class="fill" id="tfill"></div></div>
      <div class="qpad">
        <div class="qmeta" id="qmeta"></div>
        <div class="qbody">
          <div class="qsvg" id="qsvg" style="display:none"></div>
          <div class="qtext" id="qtext"></div>
          <div class="dev-ans" id="devAns" style="display:none"></div>
        </div>
        <div id="answerzone"></div>
        <div class="qfoot">
          <div class="fbline" id="fbline"></div>
          ${B.hintLeft ? `<button class="hint-btn" id="hintBtn">🔮 힌트 (${B.hintLeft})</button>` : ''}
        </div>
      </div>
    </div>
  </section>`);

  if (B.practice) $('#herorow').style.display = 'none';
  $('#flee').onclick = () => { sfx.tap(); endBattle(); renderTower(B.practice); };
  mountMonster(stage);
  updateBars();
  nextQuestion();
}
function itemBadge(k) { const it = window.Shop.ITEMS[k]; return `<span class="item-badge" style="--ic:${it.color}" title="${it.name}">${it.glyph}</span>`; }

function mountMonster(stage) {
  const mount = $('#monMount');
  if (m3d) { m3d.dispose(); m3d = null; }
  m3d = new MON.Monster3D(mount, stage);
  if (!m3d.ok) { // fallback to 2D
    m3d = null;
    mount.innerHTML = `<div class="monster-2d" id="monster2d">${MON.monsterSVG(stage, 110)}</div>`;
  }
}
function monsterCtrl() {
  return {
    hit() { if (m3d) m3d.hit(); else { const el = $('#monster2d'); if (el) { el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt'); } } },
    defeat() { if (m3d) m3d.defeat(); else { const el = $('#monster2d'); if (el) el.classList.add('defeated'); } },
  };
}
function endBattle() { stopTimer(); if (m3d) { m3d.dispose(); m3d = null; } }

function updateBars() {
  $('#foefill').style.width = Math.max(0, B.monHP / B.monMax * 100) + '%';
  $('#foehp').textContent = `HP ${Math.max(0, Math.round(B.monHP))} / ${B.monMax}`;
  $('#herofill').style.width = Math.max(0, B.heroHP / B.maxHP * 100) + '%';
  $('#herohp').textContent = `HP ${Math.max(0, Math.round(B.heroHP))}`;
  $('#scorepill').textContent = '◈ ' + B.score;
}

/* ---- problem fetch + difficulty + θ patch ---- */
function getProblem() {
  if (isHS(B.stage)) return HS.getHSProblem(B.stage, B.qIndex - 1);
  const p = ME.generateProblem(B.stage);
  const m = p.questionText.match(/밑변\s*=\s*(\d+).*?높이\s*=\s*(\d+).*?빗변\s*=\s*(\d+)/);
  if (m && /[θ]|sin|cos|tan/.test(p.questionText)) {
    p.svgContent = FX.triangleTheta(+m[1], +m[2], { labels: { a: m[1] + '', b: m[2] + '', cText: m[3] + '' } });
    p.renderType = 'svg';
  }
  p.inputMode = decideInput(p);
  p.difficulty = estDifficulty(B.stage);
  return p;
}
function decideInput(p) {
  const a = p.answer;
  if (/^-?\d+$/.test(a)) return Math.random() < 0.45 ? 'numeric' : 'choice';
  if (/^-?\d+\.\d+$/.test(a)) return Math.random() < 0.22 ? 'numeric' : 'choice';
  return 'choice';
}
function sanitizeChoices(p) {
  let cs = [...new Set(p.choices || [])].filter(c => c !== 'NaN' && c !== 'undefined' && c !== 'null' && c !== '');
  if (!cs.includes(p.answer)) cs.push(p.answer);
  return shuffle(cs);
}
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function nextQuestion() {
  B.qIndex++;
  const p = getProblem(); B.cur = p; B.hintUsed = false;
  const srcTag = p.source ? `<span class="tag src">${esc(p.source)}</span>` : '';
  const modeTag = `<span class="tag mode">${p.inputMode === 'numeric' ? '단답형' : '객관식'}</span>`;
  const diffTag = `<span class="tag diff" title="난이도 ${p.difficulty}">${diffStars(p.difficulty)}</span>`;
  $('#qmeta').innerHTML =
    `<span class="tag">${esc(p.topic)}</span><span class="tag grade">${esc(p.grade)}</span>${diffTag}${srcTag}${modeTag}` +
    `<span class="qprog"><span class="qtnum" id="tnum">–</span></span>`;

  const svgBox = $('#qsvg');
  if (p.renderType === 'svg' && p.svgContent) { svgBox.style.display = 'flex'; svgBox.innerHTML = p.svgContent; }
  else { svgBox.style.display = 'none'; svgBox.innerHTML = ''; }
  $('#qtext').innerHTML = esc(p.questionText);

  // dev mode answer reveal
  const dev = $('#devAns');
  if (SAVE.dev) { dev.style.display = 'block'; dev.innerHTML = `🛠 정답: <b>${esc(p.answer)}</b>`; }
  else dev.style.display = 'none';

  buildAnswerZone(p);
  if (B.hintLeft && $('#hintBtn')) { $('#hintBtn').disabled = false; $('#hintBtn').onclick = useHint; }
  $('#fbline').className = 'fbline';
  B.locked = false;
  startTimer();
}

/* ---- answer zone ---- */
let KP = '';
function buildAnswerZone(p) {
  const zone = $('#answerzone');
  if (p.inputMode === 'numeric') {
    KP = '';
    const allowDot = /\./.test(p.answer);
    const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', allowDot ? '.' : '±', '0', '⌫'];
    zone.innerHTML = `<div class="keypad">
      <div class="kp-display empty" id="kpd">답을 입력</div>
      <div class="kp-grid">
        ${keys.map(k => `<button class="kp-key" data-k="${k}">${k}</button>`).join('')}
        <button class="kp-key sub" id="kpsub">입력 ↵</button>
      </div></div>`;
    zone.querySelectorAll('.kp-key[data-k]').forEach(b => b.onclick = () => kpPress(b.dataset.k));
    $('#kpsub').onclick = kpSubmit;
  } else {
    const choices = sanitizeChoices(p);
    const cls = 'choices' + (choices.length <= 3 ? ' single' : '');
    zone.innerHTML = `<div class="${cls}" id="choices">` +
      choices.map(c => `<button class="choice" data-v="${esc(c).replace(/"/g, '&quot;')}">${esc(c)}</button>`).join('') + `</div>`;
    zone.querySelectorAll('.choice').forEach(b => b.onclick = () => answerChoice(b, b.dataset.v));
  }
}
function kpPress(k) {
  if (B.locked) return; sfx.key();
  if (k === '⌫') KP = KP.slice(0, -1);
  else if (k === '±') KP = KP.startsWith('-') ? KP.slice(1) : '-' + KP;
  else if (k === '.') { if (!KP.includes('.')) KP += '.'; }
  else { if (KP.replace('-', '').replace('.', '').length < 7) KP += k; }
  const d = $('#kpd'); d.textContent = (KP === '' || KP === '-') ? '답을 입력' : KP;
  d.classList.toggle('empty', KP === '' || KP === '-');
}
function kpSubmit() {
  if (B.locked) return;
  if (KP === '' || KP === '-' || KP === '.') { toast('답을 입력하세요'); return; }
  resolveAnswer(numEqual(KP, B.cur.answer), null, KP);
}
function numEqual(a, b) { const na = parseFloat(a), nb = parseFloat(b); if (!isNaN(na) && !isNaN(nb)) return Math.abs(na - nb) < 1e-6; return String(a).trim() === String(b).trim(); }
function answerChoice(btn, val) { if (B.locked) return; resolveAnswer(val === B.cur.answer, btn, val); }

/* ---- hint ---- */
function useHint() {
  if (!B.hintLeft || B.hintUsed || B.locked) return;
  B.hintLeft--; B.hintUsed = true; sfx.tap();
  const btn = $('#hintBtn'); if (btn) { btn.disabled = true; btn.textContent = '🔮 힌트 사용됨'; }
  if (B.cur.inputMode === 'choice') {
    const wrong = [...document.querySelectorAll('.choice')].filter(b => b.dataset.v !== B.cur.answer);
    shuffle(wrong).slice(0, 2).forEach(b => { b.classList.add('dim'); b.disabled = true; });
    fb('good', '🔮 오답 2개를 지웠어');
  } else {
    const a = B.cur.answer; const sign = a.startsWith('-') ? '음수' : '양수';
    const digits = a.replace('-', '').replace('.', '').length;
    fb('good', `🔮 정답은 ${sign}, ${digits}자리 수`);
  }
}

/* ---- resolve ---- */
function resolveAnswer(correct, btn, typed) {
  B.locked = true; stopTimer();
  if (B.cur.inputMode === 'numeric') {
    const d = $('#kpd'); d.classList.remove('empty');
    d.classList.add(correct ? 'correct' : 'wrong');
    d.textContent = correct ? typed : `${typed}  →  정답 ${B.cur.answer}`;
  } else {
    document.querySelectorAll('.choice').forEach(b => { b.classList.add('locked'); if (b.dataset.v !== B.cur.answer) b.classList.add('dim'); });
    if (!correct && btn) { btn.classList.remove('dim'); btn.classList.add('wrong'); }
    document.querySelectorAll('.choice').forEach(b => { if (b.dataset.v === B.cur.answer) { b.classList.remove('dim'); b.classList.add('correct'); } });
  }
  if (correct) onCorrect(btn); else onWrong();
}

/* timer */
function startTimer() {
  stopTimer(); B.qStart = performance.now();
  const dur = timeLen(B.stage) * 1000, fill = $('#tfill'), num = $('#tnum');
  num.textContent = timeLen(B.stage);
  timerId = setInterval(() => {
    const left = Math.max(0, dur - (performance.now() - B.qStart)), frac = left / dur;
    if (fill) { fill.style.width = (frac * 100) + '%'; fill.classList.toggle('low', frac < 0.25); }
    if (num) { num.textContent = Math.ceil(left / 1000); num.classList.toggle('low', frac < 0.25); }
    if (left <= 0) { stopTimer(); timeout(); }
  }, 100);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
function elapsedSec() { return (performance.now() - B.qStart) / 1000; }

function onCorrect(btn) {
  const t = elapsedSec(), lim = timeLen(B.stage), d = B.cur.difficulty || 2;
  const speed = t <= lim * 0.3 ? 1.5 : t <= lim * 0.7 ? 1.2 : 1.0;
  B.combo++; B.maxCombo = Math.max(B.maxCombo, B.combo);
  const comboMult = Math.min(1 + Math.floor(B.combo / 3) * 0.4, 2.6);
  const dmg = correctDamage(d, speed, comboMult);
  B.monHP = Math.max(0, B.monHP - dmg);
  B.score += Math.round(100 * speed * comboMult * (0.8 + d * 0.1));
  const moneyGain = B.practice ? 6 : Math.round((26 + B.combo * 5 + d * 14) * (isHS(B.stage) ? 1.4 : 1));
  B.money += moneyGain; SAVE.money += moneyGain; writeSave();
  sfx.correct(); if (B.combo >= 2) sfx.combo(B.combo); sfx.coin();
  showCombo();
  monsterCtrl().hit();
  FX.burstAt($('#monMount'), B.f.c, 30, 7);
  if (btn) FX.burstAt(btn, '#52e08a', 14, 5);
  floatText($('#monMount'), '-' + dmg, B.f.c);
  floatText(btn || $('#kpd'), '+ℚ' + moneyGain, '#ffd76b');
  hitShake();
  fb('good', `정답! 데미지 ${dmg} ${d >= 4 ? '(고난도!)' : ''} · +ℚ${moneyGain}`);
  updateBars();
  if (B.monHP <= 0) setTimeout(() => victory(), 650);
  else setTimeout(nextQuestion, 820);
}

function onWrong() {
  B.combo = 0; B.wrong++; hideCombo(); sfx.wrong();
  const d = B.cur.difficulty || 2;
  fb('bad', `정답은 ${B.cur.answer}`);
  if (!B.practice) {
    const dmg = playerDamage(B.stage, d, B.shield); B.heroHP = Math.max(0, B.heroHP - dmg); sfx.hit();
    floatText($('#herofill'), '-' + dmg, '#ff5d6c'); FX.burstAt($('#herofill'), '#ff5d6c', 16, 5);
    bigShake(); updateBars();
    if (B.heroHP <= 0) { setTimeout(() => defeat(), 720); return; }
  }
  setTimeout(nextQuestion, 1300);
}

function timeout() {
  if (B.locked) return; B.locked = true;
  if (B.cur.inputMode === 'numeric') { const dd = $('#kpd'); dd.classList.remove('empty'); dd.classList.add('wrong'); dd.textContent = `시간 초과 → ${B.cur.answer}`; }
  else document.querySelectorAll('.choice').forEach(b => { b.classList.add('locked'); if (b.dataset.v === B.cur.answer) b.classList.add('correct'); else b.classList.add('dim'); });
  fb('bad', '시간 초과!'); onWrong();
}

/* fx */
function fb(kind, msg) { const e = $('#fbline'); if (!e) return; e.textContent = msg; e.className = 'fbline show ' + kind; }
function showCombo() { const c = $('#combo'); if (B.combo < 2) { hideCombo(); return; } c.classList.remove('hidden'); c.classList.add('show'); $('#combon').textContent = '×' + B.combo; setTimeout(() => c.classList.remove('show'), 360); }
function hideCombo() { const c = $('#combo'); if (c) c.classList.add('hidden'); }
function floatText(el, txt, col) {
  if (!el) return; const r = el.getBoundingClientRect(); const d = document.createElement('div');
  d.className = 'dmgfloat'; d.textContent = txt; d.style.color = col;
  d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = (r.top + r.height / 2 - 10) + 'px';
  d.style.animation = 'dmgUp 1s forwards';
  document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
}
function hitShake() { if (!TWEAKS.motion) return; const s = $('#scene'); if (s) { s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); } }
function bigShake() { if (!TWEAKS.motion) return; const s = $('#battle'); if (s) { s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); } }

/* outcomes */
function victory() {
  stopTimer(); monsterCtrl().defeat(); sfx.clear();
  FX.burstAt($('#monMount'), B.f.c, 60, 10);
  if (B.practice) {
    toast('수호자 처치! 다음 수호자 등장');
    B.monHP = B.monMax; B.combo = 0; updateBars();
    setTimeout(() => { mountMonster(B.stage); nextQuestion(); }, 950);
    return;
  }
  const stars = B.wrong === 0 ? 3 : B.wrong <= 2 ? 2 : 1;
  const prev = SAVE.stars[B.stage] || 0;
  if (stars > prev) SAVE.stars[B.stage] = stars;
  const bonus = stars * 300 + B.stage * 80; B.money += bonus; SAVE.money += bonus; B.clearBonus = bonus;
  SAVE.totalScore = (SAVE.totalScore || 0) + B.score; writeSave();
  const firstClear = prev === 0;
  const afterNarr = () => {
    endBattle();
    if (B.stage === TOP) { SAVE.beat = true; writeSave(); playStory(STORY_ENDING, () => renderEnding()); }
    else renderResult(true, stars, prev);
  };
  if (firstClear && FLOOR_LINES[B.stage]) setTimeout(() => showNarration(applyName(FLOOR_LINES[B.stage]), afterNarr), 950);
  else setTimeout(afterNarr, 950);
}
function defeat() { endBattle(); sfx.lose(); renderResult(false, 0, SAVE.stars[B.stage] || 0); }

function showNarration(text, done) {
  const el = $('#narr');
  el.innerHTML = `<div class="narr-card"><div class="narr-fox">${foxSVG('happy', 'var(--accent)')}</div>
    <div class="narr-who">오일러</div><div class="narr-text">${esc(text)}</div>
    <div class="narr-tap">탭하여 계속 ▸</div></div>`;
  el.classList.add('on');
  el.onclick = () => { sfx.tap(); el.classList.remove('on'); el.onclick = null; done(); };
}

function renderResult(win, stars, prevStars) {
  const f = B.f, acc = (B.qIndex) > 0 ? Math.round((B.qIndex - B.wrong) / B.qIndex * 100) : 0;
  const newUnlock = win && B.stage < TOP && prevStars === 0;
  show(`
  <section class="screen on" id="result">
    <div class="r-banner ${win ? 'win' : 'lose'}">${win ? '층 정복!' : '쓰러졌다…'}</div>
    <div style="color:var(--muted);font-size:13px">FLOOR ${String(B.stage).padStart(2, '0')} · ${f.n}</div>
    <div class="r-stars">${win ? [0, 1, 2].map(i => `<span class="${i < stars ? 's' : 'e'}" style="animation-delay:${i * .18}s">${i < stars ? '★' : '☆'}</span>`).join('') : '💀'}</div>
    <div class="r-grid">
      <div class="r-stat"><div class="v">${B.score}</div><div class="l">획득 점수</div></div>
      <div class="r-stat"><div class="v">${B.maxCombo}</div><div class="l">최대 콤보</div></div>
      <div class="r-stat"><div class="v">${acc}%</div><div class="l">정확도</div></div>
      <div class="r-stat"><div class="v">${Math.max(0, Math.round(B.heroHP))}</div><div class="l">남은 HP</div></div>
    </div>
    <div class="r-reward">💰 ℚ${fmt(B.money)} 획득${win ? ` <span style="color:var(--muted)">(클리어 +${fmt(B.clearBonus)})</span>` : ''}</div>
    ${newUnlock ? `<p class="hint" style="color:var(--gold);font-size:13px;margin:0 0 14px">🔓 FLOOR ${B.stage + 1} · ${FLOORS[B.stage + 1].n} 개방!</p>` : ''}
    <div class="r-actions">
      ${win && B.stage < TOP ? `<button class="btn primary" id="r-next">▲ 다음 층으로</button>` : ''}
      <button class="btn ghost" id="r-retry">↻ 이 층 다시</button>
      <button class="btn ghost" id="r-shop">🛒 상점</button>
      <button class="btn ghost" id="r-tower">🗺 탑 지도</button>
    </div>
  </section>`);
  const next = $('#r-next'); if (next) next.onclick = () => { sfx.tap(); preBattle(B.stage + 1, false); };
  $('#r-retry').onclick = () => { sfx.tap(); preBattle(B.stage, B.practice); };
  $('#r-shop').onclick = () => { sfx.tap(); openShop(() => renderResult(win, stars, prevStars)); };
  $('#r-tower').onclick = () => { sfx.tap(); renderTower(B.practice); };
}

/* ============================================================
   STORY + ENDING
   ============================================================ */
function speakerPortrait(step) {
  if (step.who === 'fox') return `<div class="story-fox">${foxSVG(step.expr || 'neutral', 'var(--accent)')}</div>`;
  if (step.who === 'danwoo') return `<div class="story-emblem" style="color:var(--gold)">♠</div>`;
  return `<div class="story-emblem" style="color:var(--dim);font-size:54px">♜</div>`;
}
const WHO_NAME = { fox: '오일러', danwoo: () => heroName(), narr: '' };
function playStory(seq, done) {
  setAccent(themeAccent());
  let i = 0;
  const render = () => {
    const step = seq[i];
    const dots = seq.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    const who = step.who === 'danwoo' ? heroName() : WHO_NAME[step.who];
    show(`
    <section class="screen on" id="story">
      <div class="story-stage">${speakerPortrait(step)}</div>
      <div class="story-box">
        ${step.who !== 'narr' ? `<div class="story-who ${step.who}">${esc(who)}</div>` : ''}
        <div class="story-text ${step.who}">${esc(applyName(step.text))}</div>
        <div class="story-foot">
          <button class="story-skip" id="s-skip">건너뛰기 »</button>
          <div class="story-dots">${dots}</div>
          <button class="story-next" id="s-next">${i === seq.length - 1 ? '시작 ▸' : '다음 ▸'}</button>
        </div>
      </div>
    </section>`);
    const adv = () => { sfx.tap(); i++; if (i >= seq.length) done(); else render(); };
    $('#s-next').onclick = adv;
    $('#story').onclick = e => { if (e.target.closest('.story-foot')) return; adv(); };
    $('#s-skip').onclick = e => { e.stopPropagation(); sfx.tap(); done(); };
  };
  render();
}

function renderEnding() {
  setAccent('#ffd76b');
  const totalStars = Object.values(SAVE.stars).reduce((a, b) => a + b, 0);
  show(`
  <section class="screen on" id="result">
    <div class="crest tilt3d" style="width:96px;height:96px">${foxSVG('sparkle', 'var(--accent)')}</div>
    <div class="r-banner win" style="font-size:clamp(26px,8vw,38px);margin-top:8px">탑 정복 · 합격</div>
    <p class="t-tag" style="margin:10px 0 18px">${esc(heroName())}는 재수 끝에 <b>서울대학교 컴퓨터공학과</b>에 합격했다.<br>운이 아니라, 실력으로.</p>
    <div class="r-grid">
      <div class="r-stat"><div class="v">${totalStars}★</div><div class="l">모은 별</div></div>
      <div class="r-stat"><div class="v">ℚ${fmt(SAVE.money)}</div><div class="l">모은 유리수</div></div>
    </div>
    <div class="r-actions">
      <button class="btn primary" id="e-home">👑 처음으로</button>
      <button class="btn ghost" id="e-practice">🎯 자유 연습 계속</button>
    </div>
  </section>`);
  $('#e-home').onclick = () => { sfx.tap(); renderTitle(); };
  $('#e-practice').onclick = () => { sfx.tap(); renderTower(true); };
}

/* ============================================================
   TWEAKS PANEL
   ============================================================ */
function buildTweaks() {
  const el = $('#tweaks');
  const themeBtns = Object.entries(THEMES).map(([k, v]) =>
    `<div class="tw-theme ${TWEAKS.theme === k ? 'sel' : ''}" data-theme="${k}"><span class="tw-sw" style="background:${v.accent}"></span>${v.label}</div>`).join('');
  el.innerHTML = `
    <div class="tw-head"><div class="tw-title">${foxChip('var(--accent)')} 설정</div><button class="tw-x" id="tw-x">✕</button></div>
    <div class="tw-sec">분위기 테마</div>
    <div class="tw-themes" id="tw-themes">${themeBtns}</div>
    <div class="tw-sec">플레이어</div>
    <div class="tw-row"><label>이름</label><button class="tw-mini" id="tw-name">${esc(heroName())} ✎</button></div>
    <div class="tw-sec">기타</div>
    <div class="tw-row"><label>화면 흔들림·애니메이션</label><div class="tw-toggle ${TWEAKS.motion ? 'on' : ''}" id="tw-motion"></div></div>
    <div class="tw-row"><label>소리</label><div class="tw-toggle ${!FX.isMuted() ? 'on' : ''}" id="tw-sound"></div></div>
    ${SAVE.dev ? `<div class="tw-row"><label style="color:var(--gold)">개발자 모드(정답 표시)</label><div class="tw-toggle on" id="tw-dev"></div></div>` : ''}`;
  el.querySelectorAll('.tw-theme').forEach(b => b.onclick = () => {
    TWEAKS.theme = b.dataset.theme; applyTheme(); setAccent(themeAccent());
    el.querySelectorAll('.tw-theme').forEach(x => x.classList.toggle('sel', x === b));
    saveTweaks(); sfx.tap(); softRefresh();
  });
  $('#tw-motion').onclick = e => { TWEAKS.motion = !TWEAKS.motion; e.currentTarget.classList.toggle('on', TWEAKS.motion); applyTheme(); saveTweaks(); };
  $('#tw-sound').onclick = e => { const m = FX.toggleMute(); e.currentTarget.classList.toggle('on', !m); $('#muteBtn').textContent = m ? '🔇' : '🔊'; };
  $('#tw-name').onclick = () => { const n = prompt('이름을 입력해 (최대 8자)', heroName()); if (n != null) { SAVE.name = n.trim().slice(0, 8) || '단우'; writeSave(); buildTweaks(); softRefresh(); } };
  const dev = $('#tw-dev'); if (dev) dev.onclick = e => { SAVE.dev = false; writeSave(); buildTweaks(); toast('개발자 모드 OFF'); softRefresh(); };
  $('#tw-x').onclick = () => { closeTweaks(); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); };
}
function openTweaks() { buildTweaks(); $('#tweaks').classList.add('on'); }
function closeTweaks() { $('#tweaks').classList.remove('on'); }
function softRefresh() { const cur = stageEl.querySelector('.screen'); if (cur && cur.id === 'title') renderTitle(); }

window.addEventListener('message', e => {
  const t = e?.data?.type;
  if (t === '__activate_edit_mode') openTweaks();
  else if (t === '__deactivate_edit_mode') closeTweaks();
});

/* ---------- boot ---------- */
function boot() {
  FX.boot(); applyTheme(); setAccent(themeAccent());
  $('#muteBtn').onclick = () => { const m = FX.toggleMute(); $('#muteBtn').textContent = m ? '🔇' : '🔊'; };
  $('#gearBtn').onclick = () => { const open = $('#tweaks').classList.contains('on'); if (open) { closeTweaks(); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } else openTweaks(); };
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
  if (!SAVE.name) renderNameEntry(); else renderTitle();
}
boot();
