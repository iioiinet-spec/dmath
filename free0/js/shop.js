/* ============================================================
   SHOP — 상점 (재화 단위: 유리수 ℚ)
   · 아이템 3종 (소모성, 스테이지당 1개 장착)
   · 각 아이템엔 수학 문제가 걸려 있어, 정답을 맞히면 표시가로 구매
   · 문제 없이 그냥 사려면 즉시구매가(10000 유리수)
   ============================================================ */
(function () {
  const ITEMS = {
    shield: { key: 'shield', name: '수호 방패', glyph: '🛡', color: '#a8d8ff',
      desc: '이번 스테이지에 받는 피해 30% 감소', price: 1000 },
    hp: { key: 'hp', name: '생명의 물약', glyph: '✚', color: '#a8e6cf',
      desc: '이번 스테이지 시작 체력 +40', price: 2000 },
    hint: { key: 'hint', name: '예언의 부적', glyph: '🔮', color: '#c9b6f7',
      desc: '이번 스테이지에서 힌트 1회 사용', price: 3000 },
  };
  const INSTANT = 10000;
  const ORDER = ['shield', 'hp', 'hint'];

  const esc = t => String(t).replace(/[<&>]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  function fmt(n) { return n.toLocaleString('ko-KR'); }

  /* gate problem: simple multiple-choice from engine */
  function makeGate(ME) {
    const stage = 4 + (Math.random() * 8 | 0); // 중1 수준 정도
    let p;
    for (let i = 0; i < 8; i++) { p = ME.generateProblem(stage); if (p.choices && p.renderType !== 'svg') break; }
    let cs = [...new Set(p.choices || [])].filter(c => c && c !== 'NaN' && c !== 'undefined');
    if (!cs.includes(p.answer)) cs.push(p.answer);
    cs = cs.slice(0, 4);
    if (!cs.includes(p.answer)) cs[0] = p.answer;
    // shuffle
    for (let i = cs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cs[i], cs[j]] = [cs[j], cs[i]]; }
    return { q: p.questionText, ans: p.answer, choices: cs, topic: p.topic };
  }

  /* ctx: { host, getMoney, spend(n), addInv(key), getInv(), sfx, onBack } */
  function open(ctx) {
    let gate = null; // {item, prob}
    function render() {
      const money = ctx.getMoney(), inv = ctx.getInv();
      const cards = ORDER.map(k => {
        const it = ITEMS[k], own = inv[k] || 0;
        return `<div class="shop-card" style="--ic:${it.color}">
          <div class="shop-ic">${it.glyph}</div>
          <div class="shop-info">
            <div class="shop-name">${it.name} ${own > 0 ? `<span class="shop-own">보유 ${own}</span>` : ''}</div>
            <div class="shop-desc">${it.desc}</div>
          </div>
          <div class="shop-buys">
            <button class="shop-buy solve" data-item="${k}">문제 풀고 <b>ℚ${fmt(it.price)}</b></button>
            <button class="shop-buy instant" data-item="${k}">바로 <b>ℚ${fmt(INSTANT)}</b></button>
          </div>
        </div>`;
      }).join('');
      ctx.host.innerHTML = `
      <section class="screen on" id="shop">
        <div class="topbar">
          <button class="iconbtn" id="shop-back">←</button>
          <h2>상점 · 보급소</h2>
          <div class="statpill money">ℚ ${fmt(money)}</div>
        </div>
        <div class="shop-scroll">
          <p class="shop-lead">아이템은 <b>스테이지당 1개</b>만 장착할 수 있고, 한 번 쓰면 사라져 다시 사야 해.<br>
          싸게 사려면 문제를 풀고, 귀찮으면 <b>ℚ${fmt(INSTANT)}</b>에 그냥 살 수도 있어.</p>
          ${cards}
          <p class="hint" style="text-align:center">재화 ‘유리수(ℚ)’ 는 전투에서 정답·콤보로 모은다</p>
        </div>
      </section>`;
      ctx.host.querySelector('#shop-back').onclick = () => { ctx.sfx.tap(); ctx.onBack(); };
      ctx.host.querySelectorAll('.shop-buy.solve').forEach(b => b.onclick = () => openGate(b.dataset.item));
      ctx.host.querySelectorAll('.shop-buy.instant').forEach(b => b.onclick = () => instantBuy(b.dataset.item));
    }

    function instantBuy(key) {
      const it = ITEMS[key];
      if (ctx.getMoney() < INSTANT) { ctx.sfx.wrong(); ctx.toast('유리수가 부족해'); return; }
      ctx.spend(INSTANT); ctx.addInv(key); ctx.sfx.coin();
      ctx.toast(`${it.name} 구매! (ℚ${fmt(INSTANT)})`); render();
    }

    function openGate(key) {
      const it = ITEMS[key];
      if (ctx.getMoney() < it.price) { ctx.sfx.wrong(); ctx.toast('유리수가 부족해'); return; }
      const prob = makeGate(ctx.ME);
      gate = { key, prob };
      const ov = document.getElementById('shop-gate');
      ov.innerHTML = `<div class="gate-card" style="--ic:${it.color}">
        <div class="gate-top"><span class="gate-ic">${it.glyph}</span><div>
          <div class="gate-title">${it.name} · ℚ${fmt(it.price)}</div>
          <div class="gate-sub">정답을 맞히면 구매돼. 틀리면 다른 문제로 다시.</div></div>
          <button class="gate-x" id="gate-x">✕</button></div>
        <div class="gate-q">${esc(prob.q)}</div>
        <div class="gate-choices">${prob.choices.map(c => `<button class="gate-ch" data-v="${esc(c).replace(/"/g, '&quot;')}">${esc(c)}</button>`).join('')}</div>
        <div class="gate-fb" id="gate-fb"></div>`;
      ov.classList.add('on');
      document.getElementById('gate-x').onclick = () => { ctx.sfx.tap(); closeGate(); };
      ov.querySelectorAll('.gate-ch').forEach(b => b.onclick = () => {
        if (b.dataset.v === prob.ans) {
          ctx.spend(it.price); ctx.addInv(key); ctx.sfx.correct(); ctx.sfx.coin();
          b.classList.add('ok');
          document.getElementById('gate-fb').innerHTML = `<span class="ok">정답! ${it.name} 구매 완료</span>`;
          setTimeout(() => { closeGate(); render(); }, 850);
        } else {
          b.classList.add('no'); ctx.sfx.wrong();
          const fb = document.getElementById('gate-fb');
          fb.innerHTML = `<span class="no">틀렸어. 새 문제로 다시…</span>`;
          setTimeout(() => openGate(key), 950);
        }
      });
    }
    function closeGate() { const ov = document.getElementById('shop-gate'); ov.classList.remove('on'); ov.innerHTML = ''; gate = null; }

    render();
  }

  window.Shop = { ITEMS, INSTANT, ORDER, open, fmt };
})();
