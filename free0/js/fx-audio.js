/* ============================================================
   FX · AUDIO · GEOMETRY(θ) 지원 모듈
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- audio (procedural SFX) ---------- */
  let AC = null, muted = false;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function tone(freq, t0, dur, type = 'sine', vol = .18) {
    const c = ac(); if (!c || muted) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(c.destination);
    const t = c.currentTime + t0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    tap() { tone(420, 0, .07, 'triangle', .10); },
    correct() { tone(660, 0, .12, 'triangle', .16); tone(880, .08, .16, 'triangle', .16); tone(1180, .17, .2, 'sine', .12); },
    wrong() { tone(180, 0, .18, 'sawtooth', .14); tone(120, .07, .22, 'sawtooth', .12); },
    combo(n) { tone(700 + n * 40, 0, .1, 'square', .10); },
    clear() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * .09, .3, 'triangle', .16)); },
    lose() { [440, 392, 330, 247].forEach((f, i) => tone(f, i * .13, .34, 'sawtooth', .14)); },
    hit() { tone(90, 0, .16, 'square', .16); },
    coin() { tone(988, 0, .08, 'triangle', .12); tone(1319, .07, .12, 'triangle', .12); },
    key() { tone(520, 0, .04, 'square', .06); },
  };
  function toggleMute() { muted = !muted; if (!muted) sfx.tap(); return muted; }
  function isMuted() { return muted; }

  /* ---------- background canvas (drifting glyphs) ---------- */
  const GLYPHS = '+−×÷=√∑π∞∫≠≈△◯□◇xy²³½⅓∠%012345789'.split('');
  let bg, bx, bgGlyphs = [], accent = '#3fe0cf', bgDpr = 1;
  let bgTop = 'rgba(20,28,48,0.9)', bgBot = 'rgba(8,11,22,1)';
  function sizeCanvas(c) { const d = Math.min(devicePixelRatio || 1, 2); c.width = innerWidth * d; c.height = innerHeight * d; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; return d; }
  function initBg() {
    bgDpr = sizeCanvas(bg); bgGlyphs = [];
    const N = Math.round(innerWidth * innerHeight / 30000) + 14;
    for (let i = 0; i < N; i++) bgGlyphs.push({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      s: 8 + Math.random() * 20, vy: -(.10 + Math.random() * .34), vx: (Math.random() - .5) * .16,
      a: .035 + Math.random() * .10, g: GLYPHS[(Math.random() * GLYPHS.length) | 0], rot: Math.random() * 6,
    });
  }
  function drawBg() {
    bx.setTransform(bgDpr, 0, 0, bgDpr, 0, 0);
    bx.clearRect(0, 0, innerWidth, innerHeight);
    const grd = bx.createRadialGradient(innerWidth / 2, innerHeight * 0.2, 40, innerWidth / 2, innerHeight * 0.5, innerHeight * 0.95);
    grd.addColorStop(0, bgTop); grd.addColorStop(1, bgBot);
    bx.fillStyle = grd; bx.fillRect(0, 0, innerWidth, innerHeight);
    for (const p of bgGlyphs) {
      p.y += p.vy; p.x += p.vx; p.rot += 0.002;
      if (p.y < -30) { p.y = innerHeight + 20; p.x = Math.random() * innerWidth; }
      if (p.x < -30) p.x = innerWidth + 20; if (p.x > innerWidth + 30) p.x = -20;
      bx.save(); bx.translate(p.x, p.y); bx.rotate(Math.sin(p.rot) * 0.25);
      bx.globalAlpha = p.a; bx.fillStyle = accent;
      bx.font = `600 ${p.s}px "JetBrains Mono", monospace`;
      bx.fillText(p.g, 0, 0); bx.restore();
    }
    requestAnimationFrame(drawBg);
  }

  /* ---------- fx canvas (particle bursts) ---------- */
  let fx, fxx, parts = [], fxDpr = 1;
  function initFx() { fxDpr = sizeCanvas(fx); }
  function burst(x, y, color, count, power) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = power * (.4 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, life: 1, col: color, sz: 2 + Math.random() * 3.5 });
    }
  }
  function drawFx() {
    fxx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
    fxx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.vx *= .98; p.life -= 0.022;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      fxx.globalAlpha = Math.max(0, p.life); fxx.fillStyle = p.col;
      fxx.beginPath(); fxx.arc(p.x, p.y, p.sz * p.life, 0, 7); fxx.fill();
    }
    fxx.globalAlpha = 1; requestAnimationFrame(drawFx);
  }
  function burstAt(el, color, count = 26, power = 6) {
    if (!el) return; const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, color, count, power);
  }

  function setAccent(col) {
    accent = col;
    document.documentElement.style.setProperty('--accent', col);
    document.documentElement.style.setProperty('--accent-soft', hexA(col, .16));
  }
  function setBgTone(top, bot) { bgTop = top; bgBot = bot; }
  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return `rgba(63,224,207,${a})`;
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function boot() {
    bg = $('#bg-canvas'); bx = bg.getContext('2d');
    fx = $('#fx-canvas'); fxx = fx.getContext('2d');
    addEventListener('resize', () => { initBg(); initFx(); });
    initBg(); initFx(); drawBg(); drawFx();
  }

  /* ============================================================
     GEOMETRY θ PATCH
     원본 도형엔 각(θ)이 안 그려져 삼각비 문제가 모호했음.
     삼각비 문제용으로 θ 호 + 라벨이 들어간 직각삼각형을 새로 그린다.
     vertex 배치:  직각 = 좌하(B), θ = 우하(C), 빗변 위 꼭짓점 = 상(A)
     밑변 a(인접) = BC, 높이 b(대변) = AB, 빗변 c = AC
     ============================================================ */
  function triangleTheta(a, b, opt = {}) {
    const { showThetaLabel = true, missing = null, labels = {} } = opt;
    const SCALE = Math.min(20, 150 / Math.max(a, b));
    const sa = a * SCALE, sb = b * SCALE;
    const pad = 46, vw = sa + pad + 60, vh = sb + pad + 40;
    const Bx = pad, By = sb + 24;            // 직각 꼭짓점 (좌하)
    const Cx = pad + sa, Cy = sb + 24;       // θ 꼭짓점 (우하)
    const Ax = pad, Ay = 24;                 // 상단 꼭짓점
    const col = k => (k === missing ? '#dc2626' : '#1e3a5f');
    const labA = missing === 'a' ? '?' : (labels.a != null ? labels.a : a + ' cm');
    const labB = missing === 'b' ? '?' : (labels.b != null ? labels.b : b + ' cm');
    const labC = missing === 'c' ? '?' : (labels.c != null ? labels.c : (labels.cText || ''));
    // θ arc radius
    const ar = Math.min(24, sa * 0.4);
    const ang = Math.atan2(sb, sa); // angle at C between CB(left) and CA(hypot)
    const a1x = Cx - ar, a1y = Cy;                        // along base toward B
    const a2x = Cx - ar * Math.cos(ang), a2y = Cy - ar * Math.sin(ang); // toward A
    return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="${Bx},${By} ${Cx},${Cy} ${Ax},${Ay}" fill="#eaf2ff" stroke="#2563eb" stroke-width="2" stroke-linejoin="round"/>
  <rect x="${Bx}" y="${By - 9}" width="9" height="9" fill="none" stroke="#2563eb" stroke-width="1.4"/>
  <path d="M ${a1x} ${a1y} A ${ar} ${ar} 0 0 0 ${a2x.toFixed(1)} ${a2y.toFixed(1)}" fill="none" stroke="#dc2626" stroke-width="2"/>
  ${showThetaLabel ? `<text x="${(Cx - ar * 1.05).toFixed(1)}" y="${(Cy - ar * 0.42).toFixed(1)}" text-anchor="end" font-size="15" fill="#dc2626" font-weight="bold" font-family="serif" font-style="italic">θ</text>` : ''}
  <text x="${Bx + sa / 2}" y="${By + 22}" text-anchor="middle" font-size="13" fill="${col('a')}" font-family="sans-serif">${labA}</text>
  <text x="${Bx - 10}" y="${Ay + sb / 2 + 4}" text-anchor="end" font-size="13" fill="${col('b')}" font-family="sans-serif">${labB}</text>
  <text x="${(Bx + sa / 2 + 14)}" y="${(Ay + sb / 2 - 6)}" text-anchor="middle" font-size="13" fill="${col('c')}" font-family="sans-serif" transform="rotate(${(-ang * 180 / Math.PI).toFixed(1)} ${Bx + sa / 2 + 14} ${Ay + sb / 2 - 6})">${labC}</text>
</svg>`;
  }

  window.FX = {
    boot, sfx, toggleMute, isMuted,
    burst, burstAt, setAccent, setBgTone, hexA,
    triangleTheta,
  };
})();
