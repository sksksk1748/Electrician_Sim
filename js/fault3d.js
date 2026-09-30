'use strict';
/* 迴路 06 的 3D 場景（three.js）：一面住家的牆，有分電盤、客廳燈開關、燈、廚房插座與電熱水壺。
   電路位置和線路圖一一對應：線路圖座標（1000×520）每 10 單位 = 1 公分，牆面在 z = 0。
   案件、量測、跳脫都在 fault.js；這裡只負責畫出來，並把點擊轉成同一組操作。
   three.js 的載入與 WebGL 檢查沿用 bench3d.js（Bench3D.loadLib／supported）。 */
const Fault3D = (() => {
  const S = 0.1;
  const BX = x => (x - 500) * S;
  const BY = y => (260 - y) * S;
  const HEX = { red: 0xd0312d, black: 0x1f1f1f, white: 0xf2f2ec, green: 0x2a9d4b };
  const FLOOR_Y = -32, COUNTER_Y = BY(485);
  /* 牆上與盤內的導線（和線路圖同一套路徑）；clamp：用鉤表點這條線時量什麼 */
  const WIRES = [
    { pts: [[80, 18], [80, 70]], c: 'red' }, { pts: [[140, 18], [140, 70]], c: 'white' },
    { pts: [[80, 150], [80, 350]], c: 'red', z: 1.3 }, { pts: [[140, 150], [140, 390]], c: 'white', z: 0.9 },
    { pts: [[80, 210], [190, 210]], c: 'red', z: 1.7 }, { pts: [[140, 250], [190, 250]], c: 'white', z: 0.9 },
    { pts: [[80, 350], [190, 350]], c: 'red', z: 1.7 }, { pts: [[140, 390], [190, 390]], c: 'white', z: 0.9 },
    { pts: [[260, 210], [290, 210]], c: 'red' }, { pts: [[260, 250], [290, 250]], c: 'white' },
    { pts: [[260, 350], [290, 350]], c: 'red' }, { pts: [[260, 390], [290, 390]], c: 'white' },
    { pts: [[36, 470], [290, 470]], c: 'green', r: 0.5 },
    { id: 'w1', pts: [[290, 210], [330, 210], [330, 120], [450, 120]], c: 'red', clamp: ['b1l', '分路1 火線'] },
    { id: 'w2', pts: [[530, 120], [780, 120]], c: 'black', clamp: ['w2', '開關到燈座的線'] },
    { id: 'w3', pts: [[780, 250], [290, 250]], c: 'white', clamp: ['w3', '燈座回中性線'] },
    { id: 'w4', pts: [[290, 350], [640, 350]], c: 'red', clamp: ['b2l', '分路2 火線'] },
    { id: 'w5', pts: [[290, 390], [640, 390]], c: 'white', clamp: ['w5', '分路2 中性線'] },
    { id: 'w6', pts: [[290, 470], [600, 470], [600, 430], [640, 430]], c: 'green', clamp: ['w6', '插座接地線'] },
  ];
  /* 鉤表夾在哪裡（L+N 一起夾時夾住兩條線） */
  const CLAMP_AT = {
    b1l: { x: 390, y: 120, r: 1.5 }, b1ln: { x: 312, y: 230, r: 3.0 }, w2: { x: 655, y: 120, r: 1.5 }, w3: { x: 535, y: 250, r: 1.5 },
    b2l: { x: 465, y: 350, r: 1.5 }, b2ln: { x: 465, y: 370, r: 3.0 }, w5: { x: 465, y: 390, r: 1.5 }, w6: { x: 445, y: 470, r: 1.5 },
  };
  let current = null;

  function create(container, api) {
    let view = null, dead = false;
    const loading = h('div', { class: 'b3d-loading' }, '正在載入 3D 場景…');
    container.replaceChildren(loading);
    const obj = {
      sync() { if (view) view.sync(); },
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
    canvas.setAttribute('aria-label', '3D 住家線路：點數字量測點量測，點開關、斷路器、插頭、熱水壺操作。無法使用滑鼠或觸控時，請切換到線路圖。');
    const labelsEl = h('div', { class: 'b3d-labels', 'aria-hidden': 'true' });
    const resetBtn = h('button', { type: 'button', class: 'btn btn-sm b3d-reset' }, '重設視角');
    container.append(canvas, labelsEl, resetBtn);
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
      enableDamping: !reduce, dampingFactor: 0.12, minDistance: 30, maxDistance: 260,
      minAzimuthAngle: -0.9, maxAzimuthAngle: 0.9, minPolarAngle: 0.75, maxPolarAngle: 1.95, screenSpacePanning: true,
    });

    scene.add(new T.HemisphereLight(0xffffff, 0x8a7a66, 0.55));
    const sun = new T.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-45, 60, 95);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 48, bottom: -48, near: 20, far: 300 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    scene.add(sun);

    /* ---------- 材質與小工具 ---------- */
    const std = (color, roughness, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const M = {
      plate: std(0xf4f3ee, 0.5), dark: std(0x1c1c1c, 0.7), slot: std(0x0b0b0b, 0.95), brass: std(0xd4ad55, 0.35, 1),
      metal: std(0xcfd3d6, 0.3, 1), steel: std(0xd9dde0, 0.22, 1), lead: std(0x8d8a80, 0.5, 0.6),
      enclosure: std(0xb9c1bb, 0.5, 0.4), enclosureIn: std(0x9aa39c, 0.7, 0.2), breaker: std(0xf6f6f2, 0.5),
      on: std(0xf2b705, 0.45), off: std(0x5a645e, 0.6), trip: std(0xe5484d, 0.5), test: std(0xf2b705, 0.4),
      porcelain: std(0xf7f5ee, 0.25), counter: std(0x7d6a55, 0.6), counterTop: std(0xe8e4dc, 0.35), floor: std(0x9c7b56, 0.7),
      base: std(0xefeae1, 0.6), cable: std(0x2a2a2a, 0.55), plug: std(0x2f2f2f, 0.5), knob: std(0x333333, 0.5),
    };
    const colorMat = {};
    Object.entries(HEX).forEach(([k, v]) => { colorMat[k] = std(v, 0.45); });
    const hitMat = new T.MeshBasicMaterial();
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
    function polyTube(pts, r, mat, z = 1.0) {
      const path = new T.CurvePath();
      const v = pts.map(([x, y]) => P2(x, y, z));
      for (let i = 1; i < v.length; i++) path.add(new T.LineCurve3(v[i - 1], v[i]));
      const m = new T.Mesh(new T.TubeGeometry(path, Math.max(8, v.length * 14), r, 8, false), mat);
      m.castShadow = true;
      scene.add(m);
      return { mesh: m, path };
    }
    const clickables = [];
    const clickable = (m, act) => { m.userData.act = act; clickables.push(m); return m; };

    /* ---------- 牆、地板、流理台 ---------- */
    function plasterTexture() {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 320;
      const g = c.getContext('2d');
      g.fillStyle = '#e7e2d8'; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '120,110,95'},${Math.random() * 0.06})`;
        g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
      }
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = maxAniso;
      return tex;
    }
    const wallMat = new T.MeshStandardMaterial({ map: plasterTexture(), roughness: 0.95 });
    scene.add(mk(box(120, 74, 4), wallMat, 0, 3, -2, { cast: false, recv: true }));
    scene.add(mk(box(120, 1.2, 70), M.floor, 0, FLOOR_Y - 0.6, 33, { cast: false, recv: true }));
    scene.add(mk(box(120, 2.4, 1.0), M.base, 0, FLOOR_Y + 1.2, 0.5, { recv: true }));
    // 廚房流理台（熱水壺放在上面）
    const cx0 = BX(740), cx1 = 60;
    scene.add(mk(box(cx1 - cx0, COUNTER_Y - FLOOR_Y - 0.8, 20), M.counter, (cx0 + cx1) / 2, (COUNTER_Y - 0.8 + FLOOR_Y) / 2, 10, { recv: true }));
    scene.add(mk(box(cx1 - cx0 + 1, 0.8, 21), M.counterTop, (cx0 + cx1) / 2, COUNTER_Y - 0.4, 10.5, { recv: true }));

    /* ---------- 標籤 ---------- */
    /* o.short：窄螢幕用的短字；o.wide：只在寬螢幕顯示；o.off：以畫面像素偏移（量測點編號用） */
    const labels = [];
    function addLabel(html, p, cls = '', align = 'above', o = {}) {
      const el = h('div', { class: 'b3d-label ' + cls, html });
      labelsEl.append(el);
      const L = { el, p, align, full: html, short: o.short || null, wide: !!o.wide, off: o.off || null, cur: html };
      labels.push(L);
      return L;
    }
    function setText(L, full, short) { L.full = full; L.short = short || null; L.cur = null; }

    /* ---------- 分電盤 ---------- */
    const brk = {};
    {
      const x0 = 16, y0 = 36, w = 290, hh = 478, cx = x0 + w / 2, cy = y0 + hh / 2, D = 7;
      scene.add(mk(box(w * S, hh * S, 0.5), M.enclosureIn, BX(cx), BY(cy), 0.25, { cast: false, recv: true }));
      scene.add(mk(box(0.6, hh * S, D), M.enclosure, BX(x0) + 0.3, BY(cy), D / 2));
      scene.add(mk(box(0.6, hh * S, D), M.enclosure, BX(x0 + w) - 0.3, BY(cy), D / 2));
      scene.add(mk(box(w * S, 0.6, D), M.enclosure, BX(cx), BY(y0) - 0.3, D / 2));
      scene.add(mk(box(w * S, 0.6, D), M.enclosure, BX(cx), BY(y0 + hh) + 0.3, D / 2));
      // 打開的門
      const hinge = new T.Group();
      hinge.position.set(BX(x0), BY(cy), D);
      hinge.rotation.y = -1.75;
      scene.add(hinge);
      hinge.add(mk(box(w * S, hh * S, 0.6), M.enclosure, w * S / 2, 0, 0.3));
      addLabel('分電盤', P2(245, y0 - 6, D), 'b3d-title', 'above', { wide: true });
      addLabel('台電進線', P2(110, 10, 1.5), 'b3d-state', 'above', { wide: true });
      const breaker = (key, x, y, bw, bh, name, testBtn, labelAbove) => {
        const body = clickable(mk(box(bw * S, bh * S, 4.2), M.breaker, BX(x + bw / 2), BY(y + bh / 2), 2.6), key);
        const slot = mk(box(2.4, bh * S * 0.55, 0.3), M.dark, BX(x + bw / 2), BY(y + bh * 0.45), 4.85, { cast: false });
        const handle = clickable(mk(box(1.8, 1.8, 1.4), M.off, BX(x + bw / 2), BY(y + bh * 0.45), 5.4), key);
        scene.add(body, slot, handle);
        const span = bh * S * 0.18;
        const yOff = BY(y + bh * 0.45) - span;
        const lab = labelAbove ? addLabel(name, P2(x + bw / 2, y - 4, 4.8), 'b3d-state', 'above') : addLabel(name, P2(x + bw / 2, y + bh + 4, 4.8), 'b3d-state', 'below');
        brk[key] = { handle, y0: BY(y + bh * 0.45), span, y: yOff, target: yOff, lab };
        if (testBtn) scene.add(clickable(mk(cyl(1.0, 1.0, 0.6, 20), M.test, BX(testBtn[0]), BY(testBtn[1]), 5.0, { rx: Math.PI / 2 }), 'test'));
      };
      breaker('main', 50, 70, 120, 80, '總開關', [145, 100], true);
      breaker('b1', 190, 186, 70, 90, '分路1 照明');
      breaker('b2', 190, 326, 70, 90, '分路2 插座');
      // 接地符號
      const gm = colorMat.green;
      scene.add(mk(box(0.4, 1.6, 0.4), gm, BX(36), BY(478), 1.2), mk(box(2.4, 0.3, 0.4), gm, BX(36), BY(486), 1.2), mk(box(1.2, 0.3, 0.4), gm, BX(36), BY(493), 1.2));
    }

    /* ---------- 導線 ---------- */
    const clampWires = [];
    WIRES.forEach(wd => {
      const { mesh, path } = polyTube(wd.pts, wd.r || 0.32, colorMat[wd.c], wd.z || 1.1);
      if (wd.clamp) {
        const hit = new T.Mesh(new T.TubeGeometry(path, 40, 1.2, 6, false), hitMat);
        hit.visible = false;
        hit.userData.clamp = wd.clamp;
        scene.add(hit);
        clampWires.push(hit);
        mesh.userData.clamp = wd.clamp;
        clampWires.push(mesh);
      }
    });

    /* ---------- 客廳燈開關 S1 ---------- */
    const sw = {};
    {
      const plate = clickable(mk(box(5.8, 9, 0.9), M.plate, BX(490), BY(120), 0.45, { recv: true }), 's1');
      const pivot = new T.Group();
      pivot.position.set(BX(490), BY(120), 0.9);
      scene.add(plate, pivot);
      pivot.add(clickable(mk(box(3.2, 5.4, 1.0), M.plate, 0, 0, 0.5), 's1'));
      pivot.add(mk(box(0.9, 0.9, 0.06), std(0xd0312d, 0.5), 0, 1.6, 1.03, { cast: false }));
      sw.pivot = pivot; sw.rot = 0.18; sw.target = 0.18;
      sw.lab = addLabel('S1 客廳燈開關', P2(490, 64, 1), 'b3d-title');
    }

    /* ---------- 客廳燈 H1（燈泡朝外） ---------- */
    const lamp = {};
    {
      const at = P2(780, 185);
      scene.add(mk(cyl(3.2, 3.2, 1.0, 32), M.porcelain, at.x, at.y, 0.5, { rx: Math.PI / 2 }));
      scene.add(mk(cyl(1.9, 2.1, 2.8, 28), M.porcelain, at.x, at.y, 2.4, { rx: Math.PI / 2 }));
      const g = new T.Group();
      g.position.set(at.x, at.y, 3.8);
      g.rotation.x = Math.PI / 2;                   // 燈泡軸線朝向觀看者
      scene.add(g);
      const thread = [];
      for (let i = 0; i <= 12; i++) thread.push(new T.Vector2(i % 2 ? 1.42 : 1.3, i * (1.4 / 12)));
      g.add(mk(new T.LatheGeometry(thread, 28), M.metal));
      const pts = [new T.Vector2(1.15, 1.4), new T.Vector2(1.25, 2.0)];
      for (let a = -1.1; a <= Math.PI / 2 + 1e-6; a += (Math.PI / 2 + 1.1) / 22) pts.push(new T.Vector2(Math.max(0, 3 * Math.cos(a)), 4.9 + 3 * Math.sin(a)));
      lamp.glass = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false, emissive: 0xffc24a, emissiveIntensity: 0 });
      const glass = mk(new T.LatheGeometry(pts, 40), lamp.glass, 0, 0, 0, { cast: false });
      glass.renderOrder = 2;
      g.add(glass);
      lamp.fil = new T.MeshStandardMaterial({ color: 0x6b6b66, roughness: 0.5, emissive: 0xffa12e, emissiveIntensity: 0 });
      g.add(mk(new T.TorusGeometry(0.7, 0.06, 6, 24), lamp.fil, 0, 4.6, 0, { cast: false }));
      lamp.light = new T.PointLight(0xffc870, 0, 0, 1.4);
      lamp.light.position.set(0, 4.9, 0);
      g.add(lamp.light);
      polyTube([[780, 120], [780, 153]], 0.14, M.lead, 0.9);
      polyTube([[780, 217], [780, 250]], 0.14, M.lead, 0.9);
      addLabel('客廳燈 H1 · 60W', P2(860, 172, 3), 'b3d-title', 'above', { short: 'H1' });
    }

    /* ---------- 廚房插座 ---------- */
    {
      scene.add(mk(box(6, 12.4, 0.9), M.plate, BX(670), BY(390), 0.45, { recv: true }));
      [[358, true], [418, false]].forEach(([y]) => {
        scene.add(mk(box(4.6, 4.8, 0.3), M.base, BX(672), BY(y), 1.0));
        scene.add(mk(box(0.35, 1.5, 0.1), M.slot, BX(660), BY(y - 4), 1.2, { cast: false }), mk(box(0.35, 1.5, 0.1), M.slot, BX(684), BY(y - 4), 1.2, { cast: false }));
        scene.add(mk(cyl(0.5, 0.5, 0.1, 16), M.slot, BX(672), BY(y + 13), 1.2, { rx: Math.PI / 2, cast: false }));
      });
      addLabel('廚房插座', P2(670, 318, 1), 'b3d-title', 'above', { wide: true });
    }

    /* ---------- 電熱水壺與插頭 ---------- */
    const kettle = {};
    {
      const kx = BX(885), kz = 9, base = COUNTER_Y;
      const g = new T.Group();
      g.position.set(kx, base, kz);
      scene.add(g);
      g.add(clickable(mk(cyl(5.4, 5.6, 1.1, 36), M.dark, 0, 0.55, 0), 'kettle'));
      const prof = [new T.Vector2(0.01, 1.1), new T.Vector2(5.3, 1.1), new T.Vector2(5.1, 5), new T.Vector2(4.6, 10), new T.Vector2(4.1, 12.4), new T.Vector2(0.01, 12.4)];
      g.add(clickable(mk(new T.LatheGeometry(prof, 40), M.steel, 0, 0, 0), 'kettle'));
      g.add(mk(cyl(3.8, 3.9, 0.8, 32), M.dark, 0, 12.8, 0));
      g.add(mk(cyl(0.6, 0.8, 0.9, 16), M.dark, 0, 13.6, 0));
      g.add(mk(cyl(0.9, 1.3, 4.6, 16), M.steel, -5.3, 9.5, 1.5, { rz: 0.9 }));
      g.add(mk(box(1.4, 9, 1.8), M.dark, 5.9, 6.6, 0), mk(box(2.6, 1.4, 1.8), M.dark, 5.0, 11.2, 0));
      kettle.lever = clickable(mk(box(1.6, 0.8, 1.4), M.knob, 5.9, 1.9, 1.2), 'kettle');
      g.add(kettle.lever);
      kettle.ledMat = new T.MeshStandardMaterial({ color: 0x5a2020, roughness: 0.4, emissive: 0xff2a1a, emissiveIntensity: 0 });
      g.add(mk(new T.SphereGeometry(0.35, 12, 10), kettle.ledMat, 5.2, 2.8, 1.2));
      kettle.g = g;
      kettle.lab = addLabel('電熱水壺 1100W', P2(885, 300, 9), 'b3d-title');
      // 蒸氣
      const puff = document.createElement('canvas');
      puff.width = puff.height = 64;
      const pg = puff.getContext('2d');
      const grd = pg.createRadialGradient(32, 32, 2, 32, 32, 30);
      grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      pg.fillStyle = grd; pg.fillRect(0, 0, 64, 64);
      const puffTex = new T.CanvasTexture(puff);
      kettle.steam = [];
      for (let i = 0; i < 7; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puffTex, color: 0xa9b8c4, transparent: true, opacity: 0, depthWrite: false }));
        sp.scale.setScalar(3);
        g.add(sp);
        kettle.steam.push({ sp, t: i / 7 });
      }
      kettle.puffTex = puffTex;
      // 插頭與電源線
      kettle.plugMesh = clickable(mk(box(2.6, 3.0, 2.2), M.plug, 0, 0, 0), 'plug');
      scene.add(kettle.plugMesh);
      kettle.cord = null;
    }
    function plugPos(plugged) { return plugged ? P2(672, 354, 2.2) : V3(BX(790), COUNTER_Y + 1.5, 15); }
    function updateCord(plugged) {
      const p = plugPos(plugged);
      kettle.plugMesh.position.copy(p);
      kettle.plugMesh.rotation.set(plugged ? 0 : Math.PI / 2, 0, 0);
      const k0 = V3(kettle.g.position.x + 4.6, COUNTER_Y + 0.6, kettle.g.position.z - 3.5);
      const start = p.clone().add(V3(0, plugged ? -1.4 : 0, plugged ? 1.0 : 1.4));
      const mid = start.clone().lerp(k0, 0.5);
      mid.y = Math.min(start.y, k0.y) - (plugged ? 3 : 0.4);
      mid.z += 3;
      const curve = new T.CatmullRomCurve3([start, start.clone().add(V3(0, -2, 1.5)), mid, k0]);
      const geo = new T.TubeGeometry(curve, 48, 0.3, 8, false);
      if (kettle.cord) { kettle.cord.geometry.dispose(); kettle.cord.geometry = geo; kettle.cordHit.geometry.dispose(); kettle.cordHit.geometry = new T.TubeGeometry(curve, 24, 1.2, 6, false); }
      else {
        kettle.cord = new T.Mesh(geo, M.cable);
        kettle.cord.castShadow = true;
        kettle.cord.userData.clamp = ['cord', '熱水壺電線 L+N'];
        kettle.cordHit = new T.Mesh(new T.TubeGeometry(curve, 24, 1.2, 6, false), hitMat);
        kettle.cordHit.visible = false;
        kettle.cordHit.userData.clamp = ['cord', '熱水壺電線 L+N'];
        scene.add(kettle.cord, kettle.cordHit);
        clampWires.push(kettle.cord, kettle.cordHit);
      }
      kettle.curve = curve;
    }

    /* ---------- 量測點 ---------- */
    const tps = new Map();
    const ringGeo = new T.TorusGeometry(1.2, 0.14, 8, 32);
    api.TPS.forEach(t => {
      const pos = P2(t.x, t.y, 2.0);
      scene.add(mk(cyl(0.8, 0.8, 0.3, 20), M.brass, pos.x, pos.y, 1.85, { rx: Math.PI / 2 }));
      const ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0.6, depthTest: false }));
      ring.position.copy(pos).setZ(2.1);
      ring.renderOrder = 10;
      ring.visible = false;
      scene.add(ring);
      const lab = addLabel(String(t.n), pos, 'b3d-tp', 'center', { off: [12, -12] });
      tps.set(t.id, { ...t, pos, ring, lab });
    });

    /* ---------- 儀表模型：紅黑表筆、檢電起子、鉤表 ---------- */
    const UP = V3(0, 1, 0);
    function probeModel(hex) {
      const g = new T.Group();
      const m = std(hex, 0.45);
      g.add(mk(new T.ConeGeometry(0.1, 0.4, 12), M.metal, 0, 0.2, 0, { rx: Math.PI }));
      g.add(mk(cyl(0.1, 0.1, 1.6, 10), M.metal, 0, 1.2, 0));
      g.add(mk(cyl(0.55, 0.45, 0.3, 20), m, 0, 2.1, 0));
      g.add(mk(cyl(0.42, 0.48, 4.6, 20), m, 0, 4.5, 0));
      g.visible = false;
      scene.add(g);
      return g;
    }
    const redProbe = probeModel(0xc72f28), blackProbe = probeModel(0x222222);
    const pen = new T.Group();
    {
      pen.add(mk(cyl(0.12, 0.12, 2.6, 10), M.metal, 0, 1.3, 0));
      pen.add(mk(cyl(0.5, 0.55, 5.2, 20), new T.MeshStandardMaterial({ color: 0xe5484d, roughness: 0.3, transparent: true, opacity: 0.75 }), 0, 5.2, 0));
      pen.neon = new T.MeshStandardMaterial({ color: 0x8a5a40, roughness: 0.4, emissive: 0xff7a1a, emissiveIntensity: 0 });
      pen.add(mk(new T.CapsuleGeometry(0.22, 1.2, 4, 10), pen.neon, 0, 5.0, 0));
      pen.visible = false;
      scene.add(pen);
    }
    const clampG = new T.Group();
    {
      clampG.jaw = mk(new T.TorusGeometry(1.5, 0.38, 10, 36), std(0x1f4fa0, 0.45), 0, 0, 0);
      clampG.add(clampG.jaw);
      clampG.body = mk(box(2.4, 5.4, 1.4), std(0x1f4fa0, 0.45), 0, -4.4, 0);
      clampG.add(clampG.body);
      clampG.visible = false;
      scene.add(clampG);
    }
    const quatFor = axis => new T.Quaternion().setFromUnitVectors(UP, axis.clone().normalize());
    function placeTool(obj, tpId, axis) {
      const t = tps.get(tpId);
      if (!t) { obj.visible = false; return; }
      obj.position.copy(t.pos);
      obj.quaternion.copy(quatFor(axis));
      obj.visible = true;
    }
    function placeClamp(key) {
      let at, dir, r;
      if (key === 'cord' && kettle.curve) {
        at = kettle.curve.getPoint(0.55);
        dir = kettle.curve.getTangent(0.55);
        r = 1.3;
      } else if (CLAMP_AT[key]) {
        const c = CLAMP_AT[key];
        at = P2(c.x, c.y, 1.1);
        dir = V3(1, 0, 0);
        r = c.r;
      } else { clampG.visible = false; return; }
      clampG.position.copy(at);
      // 鉤口套住電線，但稍微轉向鏡頭，看得出是一個圈；握把朝下
      const zA = dir.clone().normalize().add(V3(0, 0, 0.8)).normalize();
      let yA = V3(0, 1, 0).sub(zA.clone().multiplyScalar(zA.y)).normalize();
      const xA = new T.Vector3().crossVectors(yA, zA).normalize();
      yA = new T.Vector3().crossVectors(zA, xA);
      clampG.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xA, yA, zA));
      clampG.jaw.scale.setScalar(r / 1.5);
      clampG.body.position.set(0, -(r + 2.9), 0);
      clampG.visible = true;
    }

    /* ---------- 迴圈 ---------- */
    let raf = 0, last = 0, userMoved = false, hot = false;
    function requestRender() { if (!raf && !disposed) raf = requestAnimationFrame(frame); }
    function frame(t) {
      raf = 0;
      if (disposed) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t;
      let active = controls.update();
      const k = reduce ? 1 : 1 - Math.exp(-dt * 14);
      Object.values(brk).forEach(b => {
        const d = b.target - b.y;
        if (Math.abs(d) > 0.01) { b.y += d * k; active = true; } else b.y = b.target;
        b.handle.position.y = b.y;
      });
      const dr = sw.target - sw.rot;
      if (Math.abs(dr) > 0.001) { sw.rot += dr * k; active = true; } else sw.rot = sw.target;
      sw.pivot.rotation.x = sw.rot;
      if (hot && !reduce) {
        kettle.steam.forEach(s => {
          s.t = (s.t + dt * 0.45) % 1;
          s.sp.position.set(-7.2 + Math.sin(s.t * 6 + s.sp.id) * 0.8 - s.t * 2, 11.5 + s.t * 11, 1.5);
          s.sp.material.opacity = 0.55 * Math.sin(Math.PI * s.t);
          s.sp.scale.setScalar(2 + s.t * 4);
        });
        active = true;
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
      const narrow = w < 520;                              // 窄螢幕：短標籤、隱藏說明性標籤、量測點編號縮小
      labelsEl.classList.toggle('narrow', narrow);
      labels.forEach(L => {
        const { el, p, align } = L;
        if (el.hidden) return;
        const text = narrow && L.short ? L.short : L.full;
        if (text !== L.cur) { el.innerHTML = text; L.cur = text; }
        const s = toScreen(p, w, hh);
        const show = s && s.x > -60 && s.x < w + 60 && s.y > -20 && s.y < hh + 20 && !(narrow && L.wide);
        el.style.visibility = show ? 'visible' : 'hidden';
        if (!show) return;
        let x = s.x, y = s.y;
        if (L.off) { const k = narrow ? 0.55 : 1; x += L.off[0] * k; y += L.off[1] * k; }
        const half = (el.offsetWidth || 0) / 2 + 4;
        if (half * 2 < w) x = clamp(x, half, w - half);
        const tr = align === 'below' ? 'translate(-50%, 2px)' : align === 'center' ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)';
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${tr}`;
      });
    }

    /* ---------- 相機（重設視角 = 正對牆面） ---------- */
    function resetView() {
      const vf = camera.fov * Math.PI / 180;
      const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      const dist = Math.max(60 / Math.tan(hf / 2), 37 / Math.tan(vf / 2));
      controls.target.set(0, 0, 0);
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
      tg.x = clamp(tg.x, -55, 55); tg.y = clamp(tg.y, -32, 34); tg.z = clamp(tg.z, -2, 25);
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

    /* ---------- 點擊 ---------- */
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    let down = null, hoverTp = null, hoverCur = '';
    function aim(e) {
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      ndc.set(x / r.width * 2 - 1, -(y / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return { x, y, w: r.width, h: r.height };
    }
    function nearestTp(a, type) {
      const R = type === 'touch' ? 30 : 20;
      let best = null, bd = R;
      tps.forEach(t => {
        const s = toScreen(t.pos, a.w, a.h);
        if (!s) return;
        const d = Math.hypot(s.x - a.x, s.y - a.y);
        if (d < bd) { bd = d; best = t; }
      });
      if (best) best.dist = bd;
      return best;
    }
    /* 點到什麼：鉤表模式先看電線；否則量測點（除非明顯點在器具上）→ 器具 */
    function pick(e) {
      const a = aim(e);
      const m = api.getModel();
      if (m.tool === 'clamp') {
        // 真的點在電線上（且在器具前面）→ 夾線；點在器具上 → 操作器具；都不是才用較寬的電線點擊範圍
        const exact = ray.intersectObjects(clampWires.filter(o => o.visible), false)[0];
        const devHit = ray.intersectObjects(clickables, false)[0];
        if (exact && (!devHit || exact.distance < devHit.distance)) return { clamp: exact.object.userData.clamp };
        if (!devHit) {
          const fat = ray.intersectObjects(clampWires.filter(o => !o.visible), false)[0];
          if (fat) return { clamp: fat.object.userData.clamp };
        }
      }
      const t = nearestTp(a, e.pointerType);
      const dev = ray.intersectObjects(clickables, false)[0];
      if (t && !(dev && t.dist > 8)) return { tp: t.id };
      if (dev) return { act: dev.object.userData.act };
      if (t) return { tp: t.id };
      return null;
    }
    function onDown(e) {
      if (e.target !== canvas) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    function onUp(e) {
      if (!down || e.pointerId !== down.id) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6;
      down = null;
      if (moved) return;                                   // 那是在轉視角
      const hit = pick(e);
      if (!hit) return;
      if (hit.clamp) api.onClamp(hit.clamp[0], hit.clamp[1]);
      else if (hit.tp) api.onTP(hit.tp);
      else if (hit.act) api.onAct(hit.act);
    }
    function onMove(e) {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      const hit = pick(e);
      const t = hit && hit.tp ? tps.get(hit.tp) : null;
      if (t !== hoverTp) {
        if (hoverTp) hoverTp.ring.visible = false;
        hoverTp = t;
        if (t) t.ring.visible = true;
        requestRender();
      }
      const cur = hit ? (hit.tp ? 'crosshair' : 'pointer') : '';
      if (cur !== hoverCur) { canvas.style.cursor = cur; hoverCur = cur; }
    }
    container.addEventListener('pointerdown', onDown, { capture: true });
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', () => { if (hoverTp) { hoverTp.ring.visible = false; hoverTp = null; requestRender(); } });

    /* ---------- 與故障偵探的狀態同步 ---------- */
    const stLabel = { on: 'ON', off: 'OFF', trip: '跳脫' };
    let plugWas = null;
    function sync() {
      const m = api.getModel();
      const st = m.st;
      [['main', '總開關', '總'], ['b1', '分路1 照明', '分1'], ['b2', '分路2 插座', '分2']].forEach(([k, name, short]) => {
        const b = brk[k], s = st[k];
        b.target = s === 'on' ? b.y0 + b.span : s === 'trip' ? b.y0 : b.y0 - b.span;
        b.handle.material = s === 'on' ? M.on : s === 'trip' ? M.trip : M.off;
        setText(b.lab, `${name} ${stLabel[s]}`, `${short} ${stLabel[s]}`);
        b.lab.el.classList.toggle('bad', s === 'trip');
      });
      sw.target = st.s1 ? -0.18 : 0.18;
      setText(sw.lab, `S1 客廳燈開關 ${st.s1 ? 'ON' : 'OFF'}`, `S1 ${st.s1 ? 'ON' : 'OFF'}`);
      const lit = m.lampOn;
      lamp.glass.emissiveIntensity = lit ? 2.0 : 0;
      lamp.glass.opacity = lit ? 0.9 : 0.3;
      lamp.fil.emissiveIntensity = lit ? 3 : 0;
      lamp.light.intensity = lit ? 260 : 0;
      if (plugWas !== st.plug) { updateCord(st.plug); plugWas = st.plug; }
      kettle.lever.rotation.z = st.kettle ? -0.35 : 0;
      hot = m.kettleHot;
      kettle.ledMat.emissiveIntensity = hot ? 3 : 0;
      if (!hot) kettle.steam.forEach(s => { s.sp.material.opacity = 0; });
      const kState = st.plug ? (hot ? '加熱中' : st.kettle ? '開關 ON（沒電）' : '開關 OFF') : '插頭拔下';
      setText(kettle.lab, `電熱水壺 1100W · ${kState}`, `熱水壺 ${kState.replace('開關 ', '').replace('（沒電）', ' 沒電')}`);
      // 儀表
      const two = m.tool === 'volt' || m.tool === 'ohm' || m.tool === 'megger';
      if (two && m.probes[0]) placeTool(redProbe, m.probes[0], V3(-0.35, 0.5, 1)); else redProbe.visible = false;
      if (two && m.probes[1]) placeTool(blackProbe, m.probes[1], V3(0.35, 0.5, 1)); else blackProbe.visible = false;
      if (m.tool === 'pen' && m.lastPen) { placeTool(pen, m.lastPen.id, V3(0.35, 0.6, 1)); pen.neon.emissiveIntensity = m.lastPen.glow ? 3.2 : 0; }
      else pen.visible = false;
      if (m.tool === 'clamp' && m.lastClamp) placeClamp(m.lastClamp); else clampG.visible = false;
      tps.forEach((t, id) => {
        const r = two && m.probes[0] === id ? 'red' : two && m.probes[1] === id ? 'black' : '';
        t.lab.el.className = 'b3d-label b3d-tp' + (r ? ' ' + r : '');
      });
      requestRender();
    }

    /* 查詢量測點、器具、電線在畫面上的位置（相對於畫布，給測試與除錯用） */
    function inspect() {
      fit();
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      const center = o => toScreen(new T.Box3().setFromObject(o).getCenter(V3()), w, hh);
      const acts = {};
      clickables.forEach(o => { if (!acts[o.userData.act]) acts[o.userData.act] = center(o); });
      const clamps = {};
      Object.entries(CLAMP_AT).forEach(([k, c]) => { clamps[k] = toScreen(P2(c.x, c.y, 1.1), w, hh); });
      if (kettle.curve) clamps.cord = toScreen(kettle.curve.getPoint(0.55), w, hh);
      return {
        tps: Object.fromEntries([...tps.values()].map(t => [t.id, toScreen(t.pos, w, hh)])),
        acts, clamps,
        visible: { red: redProbe.visible, black: blackProbe.visible, pen: pen.visible, clamp: clampG.visible },
        lamp: lamp.light.intensity, kettleLed: kettle.ledMat.emissiveIntensity,
        camera: { pos: camera.position.toArray().map(v => +v.toFixed(2)), target: controls.target.toArray().map(v => +v.toFixed(2)) },
      };
    }

    function dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); mq.removeEventListener('change', applyTheme);
      container.removeEventListener('pointerdown', onDown, { capture: true });
      controls.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(mm => { if (mm.map) mm.map.dispose(); mm.dispose(); });
      });
      kettle.puffTex.dispose();
      envTex.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.forceContextLoss();
      canvas.remove(); labelsEl.remove(); resetBtn.remove();
    }

    resetView();
    fit();
    return { sync, inspect, dispose };
  }

  return { create, current: () => current };
})();
