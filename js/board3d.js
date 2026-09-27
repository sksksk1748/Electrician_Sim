'use strict';
/* 迴路 03 的 3D 配線板（three.js）
   平面配線板的座標（1000×600）直接對應到板面：每 10 單位 = 1 公分，板面在 z = 0，器具往 +z 凸出。
   配線、開關、送電等狀態都在 wiring.js；這裡只負責畫出來，並把點擊、拖曳轉成同一組操作。
   three.js 的載入與 WebGL 檢查沿用 bench3d.js（Bench3D.loadLib／supported）。 */
const Board3D = (() => {
  const S = 0.1;
  const BX = x => (x - 500) * S;
  const BY = y => (300 - y) * S;
  const WIRE_Z = 1.35;                    // 導線接在螺絲頭上方的高度
  const WIRE_HEX = { black: 0x1f1f1f, red: 0xd0312d, white: 0xf2f2ec, green: 0x2a9d4b };
  let current = null;

  function create(container, api) {
    let view = null, dead = false;
    const loading = h('div', { class: 'b3d-loading' }, '正在載入 3D 配線板…');
    container.replaceChildren(loading);
    const obj = {
      sync() { if (view) view.sync(); },
      flashTrip() { if (view) view.flashTrip(); },
      inspect() { return view ? view.inspect() : null; },
      dispose() { dead = true; if (view) view.dispose(); view = null; },
    };
    obj.ready = Bench3D.loadLib().then(lib => {
      if (dead) return;
      view = buildView(lib, container, api);
      loading.remove();
      view.sync();
    });
    current = obj;
    return obj;
  }

  function buildView({ T, OrbitControls, RoomEnvironment }, container, api) {
    const reduce = prefersReducedMotion();
    const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    const P2 = (x, y, z = 0) => V3(BX(x), BY(y), z);
    let disposed = false;

    /* ---------- 渲染器、場景、相機 ---------- */
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.NeutralToneMapping;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D 配線板：點端子或從端子拖曳到另一個端子來拉線。無法使用滑鼠或觸控時，請切換到平面配線板。');
    const labelsEl = h('div', { class: 'b3d-labels', 'aria-hidden': 'true' });
    const flashEl = h('div', { class: 'b3d-flash', hidden: true }, '⚡ 短路跳脫！');
    const resetBtn = h('button', { type: 'button', class: 'btn btn-sm b3d-reset' }, '重設視角');
    container.append(canvas, labelsEl, flashEl, resetBtn);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTex = pmrem.fromScene(room, 0.04).texture;
    if (room.dispose) room.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.5;

    const camera = new T.PerspectiveCamera(34, 1.6, 1, 1000);
    const controls = new OrbitControls(camera, canvas);
    Object.assign(controls, {
      enableDamping: !reduce, dampingFactor: 0.12, minDistance: 28, maxDistance: 240,
      minAzimuthAngle: -0.9, maxAzimuthAngle: 0.9, minPolarAngle: 0.75, maxPolarAngle: 2.05, screenSpacePanning: true,
    });

    scene.add(new T.HemisphereLight(0xffffff, 0x8a7a66, 0.5));
    const sun = new T.DirectionalLight(0xffffff, 1.7);
    sun.position.set(-40, 55, 95);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -64, right: 64, top: 44, bottom: -44, near: 20, far: 280 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    scene.add(sun);

    /* ---------- 材質與小工具 ---------- */
    const std = (color, roughness, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const M = {
      plate: std(0xf4f3ee, 0.5), ivory: std(0xe9e4d4, 0.55), dark: std(0x1c1c1c, 0.7), slot: std(0x0b0b0b, 0.95),
      brass: std(0xd4ad55, 0.35, 1), copper: std(0xc87533, 0.32, 1), metal: std(0xcfd3d6, 0.3, 1), lead: std(0x8d8a80, 0.5, 0.6),
      enclosure: std(0xb9c1bb, 0.5, 0.4), enclosureIn: std(0x9aa39c, 0.7, 0.2), breaker: std(0xf6f6f2, 0.5),
      handleOn: std(0xf2b705, 0.45), handleOff: std(0x5a645e, 0.6), termBlock: std(0x2b2b2b, 0.6), porcelain: std(0xf7f5ee, 0.25),
      frame: std(0x8a6a45, 0.75),
    };
    const shared = new Set(Object.values(M));
    const hitMat = new T.MeshBasicMaterial();
    shared.add(hitMat);
    const wireMats = new Map();
    const colorMat = hex => { if (!wireMats.has(hex)) { const m = std(hex, 0.45); wireMats.set(hex, m); shared.add(m); } return wireMats.get(hex); };
    const cyl = (rt, rb, hh, seg = 24) => new T.CylinderGeometry(rt, rb, hh, seg);
    const box = (w, hh, d) => new T.BoxGeometry(w, hh, d);
    function mk(geo, mat, x = 0, y = 0, z = 0, o = {}) {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (o.rx) m.rotation.x = o.rx;
      if (o.ry) m.rotation.y = o.ry;
      if (o.rz) m.rotation.z = o.rz;
      m.castShadow = o.cast !== false;
      m.receiveShadow = !!o.recv;
      return m;
    }
    /* 沿著一串點畫管子（盤內匯流排、器具內部引線） */
    function polyTube(pts, r, mat, parent) {
      const path = new T.CurvePath();
      for (let i = 1; i < pts.length; i++) path.add(new T.LineCurve3(pts[i - 1], pts[i]));
      const m = new T.Mesh(new T.TubeGeometry(path, Math.max(8, pts.length * 12), r, 8, false), mat);
      m.castShadow = true;
      parent.add(m);
      return m;
    }
    function bezierPoints(p0, c1, c2, p3, z, n = 24) {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0];
        const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1];
        out.push(typeof z === 'function' ? P2(x, y, z(t)) : P2(x, y, z));
      }
      return out;
    }

    /* ---------- 配線板 ---------- */
    function woodTexture() {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 640;
      const g = c.getContext('2d');
      g.fillStyle = '#d9c29b'; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 80; i++) {
        const y = Math.random() * c.height, amp = 3 + Math.random() * 6, len = 200 + Math.random() * 700, x0 = Math.random() * c.width;
        g.strokeStyle = `rgba(150,110,60,${0.07 + Math.random() * 0.12})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        for (let x = 0; x <= len; x += 16) { const yy = y + Math.sin((x0 + x) / 90) * amp; if (x) g.lineTo(x0 + x, yy); else g.moveTo(x0 + x, yy); }
        g.stroke();
      }
      g.strokeStyle = 'rgba(70,60,50,.10)'; g.lineWidth = 1;            // 鉛筆定位線
      for (let x = 0; x <= c.width; x += c.width / 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
      for (let y = 0; y <= c.height; y += c.height / 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = maxAniso;
      return tex;
    }
    const boardMat = new T.MeshStandardMaterial({ map: woodTexture(), roughness: 0.8 });
    scene.add(mk(box(106, 66, 2.4), boardMat, 0, 0, -1.2, { cast: false, recv: true }));
    scene.add(mk(box(112, 3, 3.4), M.frame, 0, 34.5, -0.8), mk(box(112, 3, 3.4), M.frame, 0, -34.5, -0.8));
    scene.add(mk(box(3, 72, 3.4), M.frame, -54.5, 0, -0.8), mk(box(3, 72, 3.4), M.frame, 54.5, 0, -0.8));

    /* ---------- 標籤（HTML 疊在畫布上） ---------- */
    let labels = [];
    function addLabel(html, p, cls = '', align = 'above') {
      const el = h('div', { class: 'b3d-label ' + cls, html });
      labelsEl.append(el);
      const L = { el, p, align };
      labels.push(L);
      return L;
    }

    /* ---------- 器具與端子（每一關重建） ---------- */
    let levelG = null, builtLv = null, curSupply = '1p2w';
    const terms = new Map(), sws = new Map(), lamps = new Map(), pilots = new Map(), outlets = new Map();
    let breaker = null, clickables = [];
    const ringGeo = new T.TorusGeometry(1.0, 0.13, 8, 32);
    shared.add(ringGeo);

    function disposeTree(o) {
      o.traverse(n => {
        if (n.geometry && !shared.has(n.geometry)) n.geometry.dispose();
        const mats = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
        mats.forEach(m => { if (!shared.has(m)) m.dispose(); });
      });
    }
    function clearLevel() {
      if (levelG) { scene.remove(levelG); disposeTree(levelG); }
      labels.forEach(l => l.el.remove());
      labels = [];
      [terms, sws, lamps, pilots, outlets].forEach(m => m.clear());
      breaker = null; clickables = [];
      clearWires();
    }

    function buildPanel(p) {
      const x0 = p.x, y0 = p.y, w = 180, hh = 470;      // 外殼比平面圖窄一點，右側端子台在外殼外面
      const cx = x0 + w / 2, cy = y0 + hh / 2, wallD = 2.4;
      levelG.add(mk(box(w * S, hh * S, 0.4), M.enclosureIn, BX(cx), BY(cy), 0.2, { cast: false, recv: true }));
      levelG.add(mk(box(0.5, hh * S, wallD), M.enclosure, BX(x0) + 0.25, BY(cy), wallD / 2));
      levelG.add(mk(box(0.5, hh * S, wallD), M.enclosure, BX(x0 + w) - 0.25, BY(cy), wallD / 2));
      levelG.add(mk(box(w * S, 0.5, wallD), M.enclosure, BX(cx), BY(y0) - 0.25, wallD / 2));
      levelG.add(mk(box(w * S, 0.5, wallD), M.enclosure, BX(cx), BY(y0 + hh) + 0.25, wallD / 2));
      addLabel(`分電盤 · ${p.supply === '1p3w' ? '1φ3W 110/220V' : '1φ2W 110V'}`, P2(cx, y0 - 30, 2.4), 'b3d-title');
      // 主開關（2P 無熔絲開關）：點本體或把手就送電／斷電
      const bx = x0 + 90, top = y0 + 44;
      const body = mk(box(10, 11, 3.2), M.breaker, BX(bx), BY(top + 55), 1.6);
      const slot = mk(box(2.6, 5.4, 0.3), M.dark, BX(bx), BY(top + 47), 3.3, { cast: false });
      const handle = mk(box(2.0, 2.2, 1.4), M.handleOff, BX(bx), BY(top + 60), 3.9);
      body.userData.act = handle.userData.act = 'power';
      levelG.add(body, slot, handle);
      clickables.push(body, handle);
      breaker = { handle, onY: BY(top + 34), offY: BY(top + 60), y: BY(top + 60), lab: addLabel('主開關 OFF', P2(bx, top - 2, 3.2), 'b3d-state', 'above') };
      // 盤內匯流排
      const xs = p.supply === '1p3w' ? { L1: 58, N: 90, L2: 122 } : { L: 70, N: 110 };
      api.PANEL_TERMS[p.supply].forEach(t => {
        const mat = colorMat(WIRE_HEX[t.wire]);
        if (t.k === 'E') {
          polyTube([P2(x0 + 20, y0 + t.dy, 0.9), P2(x0 + 190, y0 + t.dy, 0.9)], 0.45, mat, levelG);
          levelG.add(mk(box(0.35, 1.4, 0.35), mat, BX(x0 + 20), BY(y0 + t.dy + 7), 0.9), mk(box(2.4, 0.3, 0.35), mat, BX(x0 + 20), BY(y0 + t.dy + 14), 0.9), mk(box(1.2, 0.3, 0.35), mat, BX(x0 + 20), BY(y0 + t.dy + 20), 0.9));
        } else {
          polyTube([P2(x0 + xs[t.k], y0 + 154, 0.9), P2(x0 + xs[t.k], y0 + t.dy, 0.9), P2(x0 + 190, y0 + t.dy, 0.9)], 0.4, mat, levelG);
        }
      });
    }

    function buildPart(p) {
      const d = api.DEFS[p.type];
      const pl = (dx, dy, z = 0) => P2(p.x + dx, p.y + dy, z);
      const plateH = d.h - 22;
      const lead = pts => polyTube(pts.map(([x, y, z]) => pl(x, y, z)), 0.12, M.lead, levelG);
      const plate = (mat = M.plate) => {
        const m = mk(box(d.w * S, plateH * S, 1.0), mat, BX(p.x + d.w / 2), BY(p.y + plateH / 2), 0.5, { recv: true });
        levelG.add(m);
        return m;
      };
      const post = (x, y) => levelG.add(mk(cyl(0.45, 0.45, 0.5, 16), M.brass, BX(p.x + x), BY(p.y + y), 1.25, { rx: Math.PI / 2 }));
      const title = addLabel(`${p.id} ${d.kind}`, pl(d.w / 2, -6, 1.5), 'b3d-title');
      const isSw = p.type.startsWith('sw');

      if (isSw) {
        const pm = plate();
        pm.userData.sw = p.id;
        clickables.push(pm);
        const sw = { p, title, kind: d.kind, plate: pm, st: 0, a: 0, l: 0, ta: 0, tl: 0, pivot: null, inner: null, arcs: null };
        const makeBlade = (px, py, len) => {
          const pivot = new T.Group();
          pivot.position.copy(pl(px, py, 1.6));
          const inner = new T.Group();
          pivot.add(inner);
          const b = mk(box(len, 0.55, 0.24), M.copper, len / 2, 0, 0);
          b.userData.sw = p.id;
          clickables.push(b);
          inner.add(b);
          levelG.add(pivot);
          sw.pivot = pivot; sw.inner = inner;
        };
        const ang = (fx, fy, tx, ty) => Math.atan2(-(ty - fy), tx - fx);
        if (p.type === 'sw1') {
          post(30, 70); post(70, 70);
          lead([[30, 70, 1.05], [30, plateH, 1.05], [30, d.h, 0.95]]);
          lead([[70, 70, 1.05], [70, plateH, 1.05], [70, d.h, 0.95]]);
          makeBlade(30, 70, 4.0);
          sw.target = st => [st ? ang(30, 70, 70, 70) : ang(30, 70, 64, 42), st ? 0 : 0.45];
          sw.text = st => st ? 'ON' : 'OFF';
        } else if (p.type === 'sw3') {
          post(25, 40); post(95, 40); post(60, 76);
          lead([[25, 40, 1.05], [25, plateH, 1.05], [25, d.h, 0.95]]);
          lead([[60, 76, 1.05], [60, plateH, 1.05], [60, d.h, 0.95]]);
          lead([[95, 40, 1.05], [95, plateH, 1.05], [95, d.h, 0.95]]);
          makeBlade(60, 76, Math.hypot(35, 36) * S);
          sw.target = st => [st ? ang(60, 76, 95, 40) : ang(60, 76, 25, 40), 0];
          sw.text = st => `C→${st ? '2' : '1'}`;
        } else {
          [25, 58, 92, 125].forEach(x => { post(x, 80); lead([[x, 80, 1.05], [x, plateH, 1.05], [x, d.h, 0.95]]); });
          const arc = (a, b, cy, z) => {
            const X = v => p.x + v, Yp = v => p.y + v;
            const m = polyTube(bezierPoints([X(a), Yp(80)], [X(a), Yp(cy)], [X(b), Yp(cy)], [X(b), Yp(80)], t => 1.5 + z * Math.sin(Math.PI * t)), 0.22, M.copper, levelG);
            m.userData.sw = p.id;
            clickables.push(m);
            return m;
          };
          sw.arcs = [[arc(25, 92, 30, 1.2), arc(58, 125, 44, 0.5)], [arc(25, 125, 38, 1.2), arc(58, 92, 52, 0.5)]];
          sw.text = st => st ? '交叉 1-4 2-3' : '平行 1-3 2-4';
        }
        sw.setState = st => {
          sw.st = st;
          if (sw.arcs) sw.arcs.forEach((pair, i) => pair.forEach(m => { m.visible = i === st; }));
          else [sw.ta, sw.tl] = sw.target(st);
          title.el.textContent = `${p.id} ${d.kind} ${sw.text(st)}`;
        };
        sw.snap = () => { sw.a = sw.ta; sw.l = sw.tl; sw.apply(); };
        sw.apply = () => { if (sw.pivot) { sw.pivot.rotation.z = sw.a; sw.inner.rotation.y = -sw.l; } };
        sw.setState(0);
        sw.snap();
        sws.set(p.id, sw);
      } else if (p.type === 'pilot') {
        plate();
        const mat = new T.MeshStandardMaterial({ color: 0x8d6a55, roughness: 0.35, emissive: 0xff6a10, emissiveIntensity: 0 });
        levelG.add(mk(new T.SphereGeometry(1.15, 20, 14), mat, BX(p.x + 40), BY(p.y + 40), 1.6));
        levelG.add(mk(cyl(1.5, 1.5, 0.3, 24), M.dark, BX(p.x + 40), BY(p.y + 40), 1.05, { rx: Math.PI / 2 }));
        lead([[22, 70, 1.05], [22, plateH, 1.05], [22, d.h, 0.95]]);
        lead([[58, 70, 1.05], [58, plateH, 1.05], [58, d.h, 0.95]]);
        lead([[22, 70, 1.05], [33, 50, 1.3]]);
        lead([[58, 70, 1.05], [47, 50, 1.3]]);
        pilots.set(p.id, { set: on => { mat.emissiveIntensity = on ? 2.6 : 0; mat.color.setHex(on ? 0xffa060 : 0x8d6a55); } });
      } else if (p.type === 'lamp') {
        // 瓷燈座（背板＋燈頭）與燈泡，燈泡朝上
        levelG.add(mk(box(6.4, 4.2, 0.8), M.porcelain, BX(p.x + 60), BY(p.y + 100), 0.4));
        levelG.add(mk(cyl(2.0, 2.2, 3.0, 28), M.porcelain, BX(p.x + 60), BY(p.y + 101), 2.4));
        const g = new T.Group();
        g.position.copy(pl(60, 86, 2.4));
        levelG.add(g);
        const thread = [];
        for (let i = 0; i <= 12; i++) thread.push(new T.Vector2(i % 2 ? 1.42 : 1.3, i * (1.4 / 12)));
        g.add(mk(new T.LatheGeometry(thread, 28), M.metal, 0, 0, 0));
        const glassPts = [new T.Vector2(1.15, 1.4), new T.Vector2(1.25, 2.0)];
        for (let a = -1.1; a <= Math.PI / 2 + 1e-6; a += (Math.PI / 2 + 1.1) / 22) glassPts.push(new T.Vector2(Math.max(0, 3 * Math.cos(a)), 4.9 + 3 * Math.sin(a)));
        const glassMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, emissive: 0xffc24a, emissiveIntensity: 0 });
        const glass = mk(new T.LatheGeometry(glassPts, 40), glassMat, 0, 0, 0, { cast: false });
        glass.renderOrder = 2;
        g.add(glass);
        const filMat = new T.MeshStandardMaterial({ color: 0x6b6b66, roughness: 0.5, emissive: 0xffa12e, emissiveIntensity: 0 });
        g.add(mk(cyl(0.16, 0.3, 2.6, 10), M.ivory, 0, 2.7, 0, { cast: false }));
        g.add(mk(new T.TorusGeometry(0.7, 0.06, 6, 24), filMat, 0, 4.6, 0, { cast: false }));
        const light = new T.PointLight(0xffc870, 0, 0, 1.4);
        light.position.set(0, 4.9, 0.5);
        g.add(light);
        lead([[60, 114, 1.0], [60, 122, 1.0], [35, 134, 0.95], [35, 150, 0.95]]);
        lead([[82, 100, 1.0], [92, 100, 1.0], [85, 134, 0.95], [85, 150, 0.95]]);
        const dim = addLabel('很暗', pl(104, 30, 3), 'b3d-state');
        dim.el.hidden = true;
        lamps.set(p.id, {
          dim,
          light,
          set(r) {
            const on = r > 0.02;
            glassMat.emissiveIntensity = on ? 0.3 + 1.7 * r : 0;
            glassMat.opacity = on ? 0.5 + 0.4 * r : 0.28;
            filMat.emissiveIntensity = on ? 0.5 + 2.5 * r : 0;
            light.intensity = on ? 260 * r : 0;
          },
        });
      } else if (p.type === 'out110' || p.type === 'out220') {
        plate();
        levelG.add(mk(box(8.4, 7.2, 0.3), M.ivory, BX(p.x + 65), BY(p.y + 54), 1.1));
        const slot = (x, y, w, hh) => levelG.add(mk(box(w * S, hh * S, 0.1), M.slot, BX(p.x + x), BY(p.y + y), 1.28, { cast: false }));
        if (p.type === 'out110') { slot(46.5, 36, 9, 28); slot(83.5, 36, 9, 28); }
        else { slot(44, 34.5, 28, 9); slot(86, 34.5, 28, 9); }
        levelG.add(mk(cyl(0.9, 0.9, 0.1, 20), M.slot, BX(p.x + 65), BY(p.y + 76), 1.28, { rx: Math.PI / 2, cast: false }));
        d.terms.forEach(([, x]) => lead([[x, plateH, 1.0], [x, d.h, 0.95]]));
        const badge = addLabel('', pl(65, plateH - 4, 1.6), 'b3d-badge', 'above');
        badge.el.hidden = true;
        outlets.set(p.id, { badge });
      }
    }

    function buildTerminal(t) {
      const pos = P2(t.x, t.y);
      const g = new T.Group();
      g.position.copy(pos);
      levelG.add(g);
      g.add(mk(box(2.2, 2.0, 0.9), M.termBlock, 0, 0, 0.45));
      g.add(mk(cyl(0.62, 0.62, 0.35, 20), M.brass, 0, 0, 1.08, { rx: Math.PI / 2 }));
      g.add(mk(box(0.95, 0.14, 0.06), M.dark, 0, 0, 1.27, { rz: Math.PI / 4, cast: false }));
      const ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0.95, depthTest: false }));
      ring.position.set(0, 0, 1.5);
      ring.renderOrder = 10;
      ring.visible = false;
      g.add(ring);
      let lab;
      if (t.panel) {
        const k = t.id.split('.')[1];
        const pt = api.PANEL_TERMS[curSupply].find(x => x.k === k) || {};
        const dot = `<i class="dot" style="background:#${(WIRE_HEX[pt.wire] || 0).toString(16).padStart(6, '0')}"></i>`;
        lab = addLabel(dot + t.label, P2(t.x - 16, t.y, 1.2), 'b3d-term', 'left');
      } else {
        lab = addLabel(t.label, P2(t.x, t.y + 15, 1.0), 'b3d-term', 'below');
      }
      lab.term = t.id;
      terms.set(t.id, { id: t.id, x: t.x, y: t.y, dir: t.dir, pos: P2(t.x, t.y, WIRE_Z), ring, lab });
    }

    function buildLevel(m) {
      clearLevel();
      builtLv = m.lv;
      curSupply = m.lv.supply;
      levelG = new T.Group();
      scene.add(levelG);
      m.parts.forEach(p => (p.type === 'panel' ? buildPanel(p) : buildPart(p)));
      m.parts.forEach(p => api.partTerms(p).forEach(buildTerminal));
      wireSig = null;
    }

    /* ---------- 導線 ---------- */
    const wiresG = new T.Group();
    scene.add(wiresG);
    const wireMeshes = new Map();
    let wireSig = null;
    function clearWires() {
      wireMeshes.forEach(wm => { wiresG.remove(wm.mesh, wm.hit); wm.mesh.geometry.dispose(); wm.hit.geometry.dispose(); wm.mat.dispose(); });
      wireMeshes.clear();
    }
    /* 和平面圖同一條貝茲曲線，中段再往外拱，看起來像真的電線 */
    function wireCurve(a, b, off) {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const sag = Math.min(105, 34 + dist * 0.16) + off;
      const v = d => (d === 'right' ? [1, 0] : [0, 1]);
      const [ax, ay] = v(a.dir), [bx, by] = v(b.dir);
      const bulge = 1.8 + Math.min(5, dist * 0.006) + off * 0.03;
      const pts = bezierPoints([a.x, a.y], [a.x + ax * sag, a.y + ay * sag], [b.x + bx * sag, b.y + by * sag], [b.x, b.y], t => WIRE_Z + bulge * Math.sin(Math.PI * t), 40);
      return new T.CatmullRomCurve3(pts);
    }
    function rebuildWires(m) {
      clearWires();
      const pairCount = new Map();
      m.wires.forEach(w => {
        const a = terms.get(w.a), b = terms.get(w.b);
        if (!a || !b) return;
        const key = [w.a, w.b].sort().join('|');
        const k = pairCount.get(key) || 0;
        pairCount.set(key, k + 1);
        const curve = wireCurve(a, b, k * 16);
        const mat = std(WIRE_HEX[w.c] || WIRE_HEX.black, 0.45);
        const mesh = new T.Mesh(new T.TubeGeometry(curve, 72, 0.3, 8), mat);
        mesh.castShadow = true;
        mesh.userData.wire = w.id;
        const hit = new T.Mesh(new T.TubeGeometry(curve, 24, 1.1, 6), hitMat);
        hit.visible = false;
        hit.userData.wire = w.id;
        wiresG.add(mesh, hit);
        wireMeshes.set(w.id, { mesh, hit, mat, curve });
      });
    }

    /* 拉線時跟著游標的虛線 */
    const rubberMat = new T.MeshBasicMaterial({ color: 0x1f1f1f, transparent: true, opacity: 0.55, depthTest: false });
    let rubber = null;
    function setRubber(from, to, hex) {
      const mid = from.clone().lerp(to, 0.5);
      mid.z += 2 + from.distanceTo(to) * 0.08;
      const geo = new T.TubeGeometry(new T.QuadraticBezierCurve3(from, mid, to), 24, 0.24, 6);
      if (rubber) { rubber.geometry.dispose(); rubber.geometry = geo; }
      else { rubber = new T.Mesh(geo, rubberMat); rubber.renderOrder = 9; scene.add(rubber); }
      rubber.visible = true;
      rubberMat.color.setHex(hex);
      requestRender();
    }
    function hideRubber() { if (rubber && rubber.visible) { rubber.visible = false; requestRender(); } }

    /* ---------- 迴圈 ---------- */
    let raf = 0, last = 0, userMoved = false;
    function requestRender() { if (!raf && !disposed) raf = requestAnimationFrame(frame); }
    function frame(t) {
      raf = 0;
      if (disposed) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t;
      let active = controls.update();
      const k = reduce ? 1 : 1 - Math.exp(-dt * 14);
      sws.forEach(sw => {
        if (!sw.pivot) return;
        const da = sw.ta - sw.a, dl = sw.tl - sw.l;
        if (Math.abs(da) > 0.001 || Math.abs(dl) > 0.001) { sw.a += da * k; sw.l += dl * k; active = true; } else { sw.a = sw.ta; sw.l = sw.tl; }
        sw.apply();
      });
      if (breaker) {
        const tgt = breaker.target != null ? breaker.target : breaker.offY;
        const dy = tgt - breaker.y;
        if (Math.abs(dy) > 0.01) { breaker.y += dy * k; active = true; } else breaker.y = tgt;
        breaker.handle.position.y = breaker.y;
      }
      renderer.render(scene, camera);
      updateLabels();
      if (active && !raf) raf = requestAnimationFrame(frame);
      if (!active) last = 0;
    }

    const tmpV = V3();
    function toScreen(v, w, hh) {
      tmpV.copy(v).project(camera);
      if (tmpV.z > 1) return null;
      return { x: (tmpV.x + 1) / 2 * w, y: (1 - tmpV.y) / 2 * hh };
    }
    function updateLabels() {
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      // 窄螢幕端子太密：只顯示正在操作的端子名稱
      const narrow = w < 520;
      const focus = new Set();
      if (narrow) {
        const m = api.getModel();
        if (m.pending) focus.add(m.pending);
        if (hoverTerm) focus.add(hoverTerm.id);
        if (gesture && gesture.start) focus.add(gesture.start.id);
        if (gesture && gesture.target) focus.add(gesture.target.id);
      }
      labels.forEach(({ el, p, align, term }) => {
        if (el.hidden) return;
        const s = toScreen(p, w, hh);
        const show = s && s.x > -60 && s.x < w + 60 && s.y > -20 && s.y < hh + 20 && !(narrow && term && !focus.has(term));
        el.style.visibility = show ? 'visible' : 'hidden';
        if (!show) return;
        let x = s.x;
        if (align !== 'left') {                            // 標籤不要超出畫布左右邊緣
          const half = (el.offsetWidth || 0) / 2 + 4;
          if (half * 2 < w) x = clamp(x, half, w - half);
        }
        const tr = align === 'below' ? 'translate(-50%, 2px)' : align === 'left' ? 'translate(-100%, -50%)' : 'translate(-50%, -100%)';
        el.style.transform = `translate(${x.toFixed(1)}px, ${s.y.toFixed(1)}px) ${tr}`;
      });
    }

    /* ---------- 相機 ---------- */
    function resetView() {
      const vf = camera.fov * Math.PI / 180;
      const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      const dist = Math.max(57 / Math.tan(hf / 2), 37 / Math.tan(vf / 2));
      controls.target.set(0, 0, 0);                    // 正對板面
      camera.position.set(0, 0, dist);
      camera.lookAt(controls.target);
      controls.update();
      userMoved = false;
      requestRender();
    }
    function fit() {
      const w = container.clientWidth, hh = container.clientHeight;
      if (!w || !hh) return;
      const dpr = renderer.getPixelRatio();
      if (canvas.width === Math.floor(w * dpr) && canvas.height === Math.floor(hh * dpr)) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh;
      camera.updateProjectionMatrix();
      if (!userMoved) resetView();
      requestRender();
    }
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    controls.addEventListener('start', () => { userMoved = true; });
    controls.addEventListener('change', () => {
      const tg = controls.target;
      tg.x = clamp(tg.x, -50, 50); tg.y = clamp(tg.y, -32, 32); tg.z = clamp(tg.z, -2, 12);
      requestRender();
    });
    resetBtn.addEventListener('click', resetView);

    function applyTheme() {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim();
      try { scene.background = new T.Color(v || '#dce2db'); } catch (e) { scene.background = new T.Color('#dce2db'); }
      requestRender();
    }
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-app-theme', 'data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    applyTheme();

    /* ---------- 點擊與拖曳 ---------- */
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    const front = new T.Plane(V3(0, 0, 1), -3);
    let gesture = null, hoverTerm = null, hoverCur = '';
    function aim(e, lift) {
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top - lift;
      ndc.set(x / r.width * 2 - 1, -(y / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return { x, y, w: r.width, h: r.height };
    }
    function nearestTerm(a, type, except) {
      const R = type === 'touch' ? 34 : 22;
      let best = null, bd = R;
      terms.forEach(t => {
        if (t.id === except) return;
        const s = toScreen(t.pos, a.w, a.h);
        if (!s) return;
        const d = Math.hypot(s.x - a.x, s.y - a.y);
        if (d < bd) { bd = d; best = t; }
      });
      if (best) best.dist = bd;
      return best;
    }
    function pointOnFront() { const v = V3(); return ray.ray.intersectPlane(front, v) ? v : null; }
    function showRing(t, on, strong) {
      if (!t) return;
      t.ring.visible = on;
      t.ring.material.opacity = strong ? 0.95 : 0.5;
      t.ring.scale.setScalar(strong ? 1.25 : 1);
    }
    function refreshRings() {
      const m = api.getModel();
      terms.forEach(t => showRing(t, t.id === m.pending || t === hoverTerm || (gesture && gesture.target === t), t.id === m.pending || (gesture && gesture.target === t)));
      requestRender();
    }
    /* 點到什麼：真的點在電線上（且在前面）→ 電線；點在器具上 → 器具；都不是才用較寬的電線點擊範圍 */
    function hitClickable() {
      const ws = [...wireMeshes.values()];
      const exact = ray.intersectObjects(ws.map(w => w.mesh), false)[0];
      const dev = ray.intersectObjects(clickables, false)[0];
      if (exact && (!dev || exact.distance < dev.distance)) return { wire: exact.object.userData.wire };
      if (dev) return dev.object.userData;
      const fat = ray.intersectObjects(ws.map(w => w.hit), false)[0];
      return fat ? { wire: fat.object.userData.wire } : null;
    }

    function onDown(e) {
      if (e.target !== canvas) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (gesture) return;
      const a = aim(e, 0);
      const t = nearestTerm(a, e.pointerType);
      // 手指點在開關或主開關上時，以器具為準；除非真的點在螺絲上（10px 內）
      const devHit = t && t.dist > 10 ? ray.intersectObjects(clickables, false)[0] : null;
      const dev = devHit ? devHit.object.userData : null;
      if (t && !(dev && (dev.sw || dev.act === 'power'))) {
        e.stopPropagation();
        e.preventDefault();
        gesture = { kind: 'term', start: t, id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, moved: false, target: null };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
        controls.enabled = false;
        return;
      }
      gesture = { kind: 'click', id: e.pointerId, x0: e.clientX, y0: e.clientY };
    }
    function onMove(e) {
      const m = api.getModel();
      if (gesture && gesture.kind === 'term' && e.pointerId === gesture.id) {
        if (!gesture.moved && Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 7) gesture.moved = true;
        if (!gesture.moved || m.live) return;
        const a = aim(e, gesture.type === 'touch' ? 40 : 0);
        gesture.target = nearestTerm(a, gesture.type, gesture.start.id);
        const end = gesture.target ? gesture.target.pos : pointOnFront();
        if (end) setRubber(gesture.start.pos, end, WIRE_HEX[m.color]);
        canvas.style.cursor = 'grabbing';
        refreshRings();
        return;
      }
      if (gesture || e.pointerType !== 'mouse' || e.buttons) return;
      const a = aim(e, 0);
      const t = nearestTerm(a, 'mouse');
      if (t !== hoverTerm) { hoverTerm = t; refreshRings(); }
      if (m.pending && terms.has(m.pending)) {
        const end = t && t.id !== m.pending ? t.pos : pointOnFront();
        if (end) setRubber(terms.get(m.pending).pos, end, WIRE_HEX[m.color]);
      }
      const cur = t ? 'crosshair' : (hitClickable() ? 'pointer' : '');
      if (cur !== hoverCur) { canvas.style.cursor = cur; hoverCur = cur; }
    }
    function onUp(e) {
      if (!gesture || e.pointerId !== gesture.id) return;
      const g = gesture;
      gesture = null;
      if (g.kind === 'term') {
        try { canvas.releasePointerCapture(g.id); } catch (err) { /* 忽略 */ }
        controls.enabled = true;
        canvas.style.cursor = '';
        hoverCur = '';
        hideRubber();
        if (!g.moved) api.onTerminal(g.start.id);
        else if (g.target) api.onConnect(g.start.id, g.target.id);
        refreshRings();
        return;
      }
      if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > 6) return;       // 那是在轉視角
      aim(e, 0);
      const hit = hitClickable();
      if (hit && hit.wire) api.onWire(hit.wire);
      else if (hit && hit.sw) api.onSwitch(hit.sw);
      else if (hit && hit.act === 'power') api.onPower();
      else api.onBackground();
    }
    function onLeaveCanvas() { if (hoverTerm) { hoverTerm = null; refreshRings(); } }
    container.addEventListener('pointerdown', onDown, { capture: true });
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', e => { if (gesture && e.pointerId === gesture.id) { gesture = null; controls.enabled = true; hideRubber(); refreshRings(); } });
    canvas.addEventListener('pointerleave', onLeaveCanvas);

    /* ---------- 與配線工坊的狀態同步 ---------- */
    function sync() {
      const m = api.getModel();
      if (m.lv !== builtLv) buildLevel(m);
      const sig = m.wires.map(w => `${w.id}:${w.a}:${w.b}:${w.c}`).join('|');
      if (sig !== wireSig) { rebuildWires(m); wireSig = sig; }
      wireMeshes.forEach((wm, id) => {
        const sel = id === m.selWire, bad = m.badWires && m.badWires.has(id);
        wm.mat.emissive.setHex(sel ? 0x2f7bf6 : bad ? 0xff2a1a : 0x000000);
        wm.mat.emissiveIntensity = sel ? 0.9 : bad ? 0.75 : 0;
      });
      if (!m.pending) hideRubber();
      sws.forEach((sw, id) => { if (sw.st !== (m.states[id] || 0)) sw.setState(m.states[id] || 0); });
      const la = m.live && m.liveA && !m.liveA.short ? m.liveA : null;
      if (breaker) {
        breaker.target = m.live ? breaker.onY : breaker.offY;
        breaker.handle.material = m.live ? M.handleOn : M.handleOff;
        breaker.lab.el.textContent = m.live ? '主開關 ON（送電中）' : '主開關 OFF';
      }
      lamps.forEach((L, id) => {
        const r = la ? clamp(la[id + '_ratio'] || 0, 0, 1) : 0;
        L.set(r);
        L.dim.el.hidden = !(la && r > 0.04 && r <= 0.8);
      });
      pilots.forEach((P, id) => P.set(!!(la && la.targets[id] === 'on')));
      outlets.forEach((O, id) => {
        const o = la ? la.outlets[id] : null;
        O.badge.el.hidden = !o;
        if (o) { O.badge.el.textContent = `${o.v.toFixed(0)} V`; O.badge.el.classList.toggle('bad', o.v <= 100); }
      });
      refreshRings();
      requestRender();
    }

    function flashTrip() {
      flashEl.hidden = false;
      flashEl.classList.remove('go');
      void flashEl.offsetWidth;
      flashEl.classList.add('go');
      setTimeout(() => { flashEl.hidden = true; }, 1500);
    }

    /* 查詢端子、開關、主開關、導線在畫面上的位置（相對於畫布，給測試與除錯用） */
    function inspect() {
      fit();
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      const center = o => toScreen(new T.Box3().setFromObject(o).getCenter(V3()), w, hh);
      return {
        terms: Object.fromEntries([...terms.values()].map(t => [t.id, toScreen(t.pos, w, hh)])),
        switches: Object.fromEntries([...sws.entries()].map(([id, sw]) => [id, center(sw.plate)])),
        power: breaker ? center(breaker.handle) : null,
        wires: Object.fromEntries([...wireMeshes.entries()].map(([id, wm]) => [id, toScreen(wm.curve.getPoint(0.5), w, hh)])),
        lamps: Object.fromEntries([...lamps.entries()].map(([id, L]) => [id, +L.light.intensity.toFixed(1)])),
        camera: { pos: camera.position.toArray().map(v => +v.toFixed(2)), target: controls.target.toArray().map(v => +v.toFixed(2)) },
      };
    }

    function dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); mq.removeEventListener('change', applyTheme);
      container.removeEventListener('pointerdown', onDown, { capture: true });
      controls.dispose();
      clearLevel();
      if (rubber) rubber.geometry.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      shared.forEach(x => x.dispose && x.dispose());
      rubberMat.dispose(); boardMat.map.dispose();
      envTex.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.forceContextLoss();
      canvas.remove(); labelsEl.remove(); flashEl.remove(); resetBtn.remove();
    }

    resetView();
    fit();
    return { sync, flashTrip, inspect, dispose };
  }

  return { create, current: () => current };
})();
