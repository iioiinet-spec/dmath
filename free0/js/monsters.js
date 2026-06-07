/* ============================================================
   MONSTERS — 30층 수호자
   · 파스텔 기하도형으로 통일
   · 전투: Three.js 3D 오브젝트(회전·조명) / 실패 시 2D SVG 폴백
   · 타워 지도: 가벼운 2D SVG 아이콘
   ============================================================ */
(function () {

  /* 층별 파스텔 + 기하 형태 (tier별로 색이 흐르도록) */
  const GEO = ['tetra', 'box', 'octa', 'dodeca', 'icosa', 'cone', 'torus', 'capsule', 'torusknot'];
  const CFG = {};
  // 초등 1~5 : 민트~옐로 (새싹/성장)
  const elem = ['#9fe2bf', '#a8e6cf', '#bde8b0', '#d6ec8a', '#ffe29a'];
  // 중등 6~20 : 블루~라벤더~핑크 (탐구)
  const mid  = ['#a8d8ff', '#9ec5ff', '#a9b8ff', '#b6acf2', '#c9b6f7',
                '#d6b3f0', '#e0b0e8', '#f0aede', '#ffaed0', '#ffb3c6',
                '#9ad7e8', '#8fd3d9', '#a5d6c8', '#bfd9a8', '#d9d18f'];
  // 고등 21~30 : 핑크~피치~골드 (시험의 열기)
  const high = ['#ffb0b8', '#ffb9a8', '#ffc4a0', '#ffce9a', '#ffd98f',
                '#ffc6c0', '#ff9ec0', '#ffae9e', '#ffbf8a', '#ffd76b'];
  function setRange(start, arr, boss) {
    arr.forEach((c, i) => {
      const f = start + i;
      CFG[f] = { color: c, geo: GEO[(f * 3 + 7) % GEO.length], boss: boss.includes(f) };
    });
  }
  setRange(1, elem, [5]);
  setRange(6, mid, [10, 15, 20]);
  setRange(21, high, [25, 30]);
  // 보스 전용 형태
  CFG[5].geo = 'dodeca'; CFG[10].geo = 'icosa'; CFG[15].geo = 'torusknot';
  CFG[20].geo = 'dodeca'; CFG[25].geo = 'icosa'; CFG[30].geo = 'torusknot';

  function cfg(f) { return CFG[f] || { color: '#a8d8ff', geo: 'icosa', boss: false }; }

  /* darken/lighten helper */
  function shade(hex, amt) {
    const h = hex.replace('#', ''); const n = parseInt(h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- 수식으로 그려지는 라인아트 시질(sigil) ----------
     얼굴/광택 없음. 각 층마다 다른 매개변수 곡선을 발광 라인으로.
     families: rose · lissajous · epicycloid · hypotrochoid · star · maurer */
  let uid = 0;
  function _samples(floor) {
    const fam = ['rose', 'lissajous', 'epicycloid', 'hypotrochoid', 'star', 'maurer'][(floor * 5 + 2) % 6];
    const k = 2 + (floor % 6);
    const pts = [];
    const push = (x, y) => pts.push([x, y]);
    if (fam === 'rose') {
      const petals = (floor % 2 ? k : k + 1);
      for (let i = 0; i <= 360; i++) { const t = i / 360 * Math.PI * 2; const r = Math.cos(petals * t); push(r * Math.cos(t), r * Math.sin(t)); }
    } else if (fam === 'lissajous') {
      const a = k, b = k + 1 + (floor % 2);
      for (let i = 0; i <= 400; i++) { const t = i / 400 * Math.PI * 2; push(Math.sin(a * t + Math.PI / 2), Math.sin(b * t)); }
    } else if (fam === 'epicycloid') {
      const n = k + 1;
      for (let i = 0; i <= 400; i++) { const t = i / 400 * Math.PI * 2; push((n + 1) * Math.cos(t) - Math.cos((n + 1) * t), (n + 1) * Math.sin(t) - Math.sin((n + 1) * t)); }
    } else if (fam === 'hypotrochoid') {
      const R0 = 5, r0 = 2 + (floor % 3), d = 4 + (floor % 3);
      const turns = r0; const N = 600;
      for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2 * turns; push((R0 - r0) * Math.cos(t) + d * Math.cos((R0 - r0) / r0 * t), (R0 - r0) * Math.sin(t) - d * Math.sin((R0 - r0) / r0 * t)); }
    } else if (fam === 'star') {
      const n = k + 4, m = (floor % 2) ? 2 : 3;
      for (let i = 0; i <= n; i++) { const t = (i * m) / n * Math.PI * 2 - Math.PI / 2; push(Math.cos(t), Math.sin(t)); }
    } else { // maurer rose
      const nn = k + 2, dd = 29 + floor;
      for (let i = 0; i <= 360; i++) { const t = (i * dd) * Math.PI / 180; const r = Math.cos(nn * t); push(r * Math.cos(t), r * Math.sin(t)); }
    }
    return pts;
  }
  function _sigilPath(floor, box) {
    const pts = _samples(floor);
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const [x, y] of pts) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    const w = maxX - minX || 1, h = maxY - minY || 1, s = box / Math.max(w, h);
    const ox = (100 - w * s) / 2 - minX * s, oy = (100 - h * s) / 2 - minY * s;
    let d = '';
    pts.forEach(([x, y], i) => { d += (i ? 'L' : 'M') + (x * s + ox).toFixed(2) + ' ' + (y * s + oy).toFixed(2); });
    return d + 'Z';
  }

  function monsterSVG(floor, size) {
    size = size || 64;
    const c = cfg(floor), col = c.color, dk = shade(col, -36), lt = shade(col, 46);
    const id = 'm' + (uid++);
    const d = _sigilPath(floor, c.boss ? 70 : 66);
    const sw = c.boss ? 2.4 : 2;
    const bossRing = c.boss
      ? `<circle cx="50" cy="50" r="45" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"/>`
      : '';
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="msvg" style="overflow:visible">
      <defs>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${lt}"/><stop offset="100%" stop-color="${dk}"/>
        </linearGradient>
        <filter id="${id}f" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="${col}" flood-opacity="0.7"/>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="46" fill="${col}" fill-opacity="0.05"/>
      ${bossRing}
      <path d="${d}" fill="${col}" fill-opacity="0.07" stroke="url(#${id}g)" stroke-width="${sw}"
            stroke-linejoin="round" stroke-linecap="round" filter="url(#${id}f)"/>
    </svg>`;
  }

  /* ============================================================
     Monster3D — Three.js 3D guardian (battle)
     mount(container, floor) → start; .hit() / .defeat() / .dispose()
     ============================================================ */
  function Monster3D(container, floor) {
    this.ok = false;
    if (!window.THREE) return; // fallback handled by caller
    const c = cfg(floor);
    try {
      const W = container.clientWidth || 220, H = container.clientHeight || 150;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
      camera.position.set(0, 0, 6.2);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
      container.appendChild(renderer.domElement);

      // geometry
      const G = THREE;
      let geom;
      switch (c.geo) {
        case 'tetra': geom = new G.TetrahedronGeometry(1.7, 0); break;
        case 'box': geom = new G.BoxGeometry(2.1, 2.1, 2.1); break;
        case 'octa': geom = new G.OctahedronGeometry(1.9, 0); break;
        case 'dodeca': geom = new G.DodecahedronGeometry(1.8, 0); break;
        case 'icosa': geom = new G.IcosahedronGeometry(1.85, 0); break;
        case 'cone': geom = new G.ConeGeometry(1.6, 2.6, 6); break;
        case 'torus': geom = new G.TorusGeometry(1.4, 0.55, 16, 32); break;
        case 'capsule': geom = G.CapsuleGeometry ? new G.CapsuleGeometry(1.1, 1.4, 8, 16) : new G.SphereGeometry(1.7, 24, 24); break;
        case 'torusknot': geom = new G.TorusKnotGeometry(1.2, 0.42, 80, 12); break;
        default: geom = new G.IcosahedronGeometry(1.85, 0);
      }
      const col = new G.Color(c.color);

      // --- 3D 라인아트: 글로우 와이어프레임 + 아주 옆은 면 ---
      const group = new G.Group();
      const useEdges = !['torus', 'torusknot', 'capsule'].includes(c.geo);
      const lineGeo = useEdges ? new G.EdgesGeometry(geom, 14) : new G.WireframeGeometry(geom);
      const lineMat = new G.LineBasicMaterial({ color: col, transparent: true, opacity: 0.95 });
      const lines = new G.LineSegments(lineGeo, lineMat);
      // 아주 옆은 면 — 입체감만 살리고 라인아트 유지
      const fillMat = new G.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.06, depthWrite: false });
      const fillMesh = new G.Mesh(geom, fillMat);
      // 글로우 헤일로: 약간 큰 복제 라인(가산 블렌딩)
      const haloMat = new G.LineBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: G.AdditiveBlending, depthWrite: false });
      const halo = new G.LineSegments(lineGeo, haloMat); halo.scale.setScalar(1.05);
      group.add(fillMesh, lines, halo);
      scene.add(group);

      // boss 관—글로우 라인 링
      if (c.boss) {
        const cg = new G.TorusGeometry(1.2, 0.1, 6, 24);
        const crown = new G.LineSegments(new G.WireframeGeometry(cg), new G.LineBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.95 }));
        crown.position.y = 2.0; crown.rotation.x = Math.PI / 2.3;
        group.add(crown); this.crown = crown;
      }

      this.scene = scene; this.camera = camera; this.renderer = renderer;
      this.group = group; this.lineMat = lineMat; this.haloMat = haloMat; this.fillMat = fillMat;
      this.container = container; this.dead = false; this.t = 0;
      this.shakeT = 0; this.flash = 0; this.dying = 0; this.scaleBase = 1;
      this.ok = true;

      const self = this;
      this._resize = () => {
        const w = container.clientWidth || W, h = container.clientHeight || H;
        camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
      };
      addEventListener('resize', this._resize);

      const loop = () => {
        if (self.dead) return;
        self.raf = requestAnimationFrame(loop);
        self.t += 0.016;
        if (self.dying > 0) {
          self.dying += 0.04;
          const s = Math.max(0, self.scaleBase - self.dying);
          group.scale.setScalar(s);
          group.rotation.y += 0.28; group.rotation.x += 0.14;
          const op = Math.max(0, 1 - self.dying);
          lineMat.opacity = 0.95 * op; haloMat.opacity = 0.25 * op; fillMat.opacity = 0.06 * op;
          if (s <= 0.02) { self.dead = true; renderer.render(scene, camera); return; }
        } else {
          group.rotation.y += 0.011; group.rotation.x = Math.sin(self.t * 0.5) * 0.18;
          group.position.y = Math.sin(self.t * 1.4) * 0.12;
          if (self.crown) { self.crown.rotation.z += 0.02; }
          // hurt shake + flash
          if (self.shakeT > 0) { self.shakeT -= 0.06; group.position.x = (Math.random() - 0.5) * self.shakeT * 1.4; }
          else group.position.x = 0;
          if (self.flash > 0) {
            self.flash -= 0.06; const f = self.flash;
            lineMat.opacity = Math.min(1, 0.95 + f); haloMat.opacity = 0.25 + f * 0.7;
            group.scale.setScalar(1 + f * 0.06);
          } else { lineMat.opacity = 0.95; haloMat.opacity = 0.25; group.scale.setScalar(1); }
        }
        renderer.render(scene, camera);
      };
      loop();
    } catch (e) { this.ok = false; console.warn('Monster3D init failed', e); }
  }
  Monster3D.prototype.hit = function () { if (!this.ok) return; this.shakeT = 1; this.flash = 1.1; };
  Monster3D.prototype.defeat = function () { if (!this.ok) return; this.dying = 0.001; };
  Monster3D.prototype.dispose = function () {
    if (!this.ok) return; this.dead = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    removeEventListener('resize', this._resize);
    try { this.renderer.dispose(); if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement); } catch (e) {}
  };

  window.Monsters = { cfg, monsterSVG, Monster3D, shade };
})();
