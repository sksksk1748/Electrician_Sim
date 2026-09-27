'use strict';
/* 迴路 06 的 3D 場景：牆上三個插座「一路接過去」（分歧接線），各插一盞檯燈。
   狀態（拔插頭、接點鬆脫、各段有沒有電流）由課程卡計算好後傳進來；這裡只負責畫。
   three.js 的載入沿用 bench3d.js（Bench3D.loadLib）。單位：公分，牆面在 z = 0。 */
const Life3D = (() => {
  const XS = [-32, 0, 32];                          // 三個插座的位置
  const TABLE_Y = -14;
  const COND = [                                    // 導線：顏色、水平走線高度、端子左右位移、前後深度
    { k: 'L', hex: 0xd0312d, y: 22, dx: -2.4, z: 1.9 },
    { k: 'N', hex: 0xf2f2ec, y: 19.5, dx: 0, z: 1.45 },
    { k: 'E', hex: 0x2a9d4b, y: 17, dx: 2.4, z: 1.0 },
  ];
  const TERM_Y = 11.2;

  let current = null;                               // 目前頁面上的場景（除錯用）
  function create(container, api) {
    let view = null, dead = false;
    const loading = h('div', { class: 'b3d-loading' }, '正在載入 3D 場景…');
    container.replaceChildren(loading);
    const obj = {
      sync() { if (view) view.sync(); },
      inspect() { return view ? view.inspect() : null; },
      dispose() { dead = true; if (view) view.dispose(); view = null; if (current === obj) current = null; },
    };
    current = obj;
    obj.ready = Bench3D.loadLib().then(lib => {
      if (dead) return;
      view = build(lib, container, api);
      loading.remove();
      view.sync();
    });
    return obj;
  }

  function build({ T, OrbitControls, RoomEnvironment }, container, api) {
    const reduce = prefersReducedMotion();
    const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    let disposed = false;

    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.NeutralToneMapping;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '三個插座一路接過去的 3D 示意，每個插座插著一盞檯燈');
    const labelsEl = h('div', { class: 'b3d-labels', 'aria-hidden': 'true' });
    const resetBtn = h('button', { type: 'button', class: 'btn btn-sm b3d-reset' }, '重設視角');
    const legend = h('div', { class: 'b3d-legend', 'aria-hidden': 'true' },
      COND.map(c => h('span', {}, h('i', { style: { background: '#' + c.hex.toString(16).padStart(6, '0') } }), c.k === 'L' ? '火線 L' : c.k === 'N' ? '中性線 N' : '接地 E')));
    container.append(canvas, labelsEl, legend, resetBtn);

    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTex = pmrem.fromScene(room, 0.04).texture;
    if (room.dispose) room.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.5;

    const camera = new T.PerspectiveCamera(34, 1.6, 1, 800);
    const controls = new OrbitControls(camera, canvas);
    Object.assign(controls, {
      enableDamping: !reduce, dampingFactor: 0.12, minDistance: 30, maxDistance: 220,
      minAzimuthAngle: -0.9, maxAzimuthAngle: 0.9, minPolarAngle: 0.75, maxPolarAngle: 1.95, screenSpacePanning: true,
    });
    scene.add(new T.HemisphereLight(0xffffff, 0x8a7a66, 0.5));
    const sun = new T.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-40, 60, 90);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 50, bottom: -50, near: 20, far: 280 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    scene.add(sun);

    const std = (color, roughness, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const M = {
      wall: std(0xe7e2d8, 0.95), plate: std(0xf4f3ee, 0.5), face: std(0xe9e4d4, 0.55), slot: std(0x0b0b0b, 0.95),
      brass: std(0xd4ad55, 0.35, 1), wood: std(0x9c7b56, 0.65), plug: std(0x2f2f2f, 0.5), cable: std(0x2a2a2a, 0.55),
      lampBody: std(0x2f3a45, 0.4, 0.3), shade: std(0xf2b705, 0.45), floor: std(0x8a6c4a, 0.75),
    };
    M.shade.side = T.DoubleSide;
    const mk = (geo, mat, x = 0, y = 0, z = 0, o = {}) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (o.rx) m.rotation.x = o.rx;
      if (o.rz) m.rotation.z = o.rz;
      m.castShadow = o.cast !== false;
      m.receiveShadow = !!o.recv;
      return m;
    };
    const box = (w, hh, d) => new T.BoxGeometry(w, hh, d);
    const cyl = (a, b, hh, s = 24) => new T.CylinderGeometry(a, b, hh, s);
    const tubeOf = (pts, r, seg) => {
      const path = new T.CurvePath();
      for (let i = 1; i < pts.length; i++) path.add(new T.LineCurve3(pts[i - 1], pts[i]));
      return { geo: new T.TubeGeometry(path, seg || Math.max(12, pts.length * 12), r, 8, false), path };
    };

    /* 牆、桌子、地板 */
    scene.add(mk(box(140, 80, 4), M.wall, 0, 4, -2, { cast: false, recv: true }));
    scene.add(mk(box(140, 1.2, 70), M.floor, 0, -44.6, 33, { cast: false, recv: true }));
    scene.add(mk(box(120, 1.6, 26), M.wood, 0, TABLE_Y - 0.8, 13, { recv: true }));
    [[-56, 3], [56, 3], [-56, 24], [56, 24]].forEach(([x, z]) => scene.add(mk(box(2, 29, 2), M.wood, x, TABLE_Y - 16, z)));

    /* 標籤 */
    const labels = [];
    const addLabel = (text, p, cls = '', o = {}) => { const el = h('div', { class: 'b3d-label ' + cls }, text); labelsEl.append(el); const L = { el, p, text, ...o }; labels.push(L); return L; };

    /* 插座與端子 */
    XS.forEach((x, i) => {
      scene.add(mk(box(7, 11, 0.9), M.plate, x, 4, 0.45, { recv: true }));
      scene.add(mk(box(5.2, 4.2, 0.3), M.face, x, 6, 1.05), mk(box(5.2, 4.2, 0.3), M.face, x, 1, 1.05));
      [6, 1].forEach(y => {
        scene.add(mk(box(0.35, 1.5, 0.1), M.slot, x - 1.2, y + 0.4, 1.24, { cast: false }), mk(box(0.35, 1.5, 0.1), M.slot, x + 1.2, y + 0.4, 1.24, { cast: false }));
        scene.add(mk(cyl(0.45, 0.45, 0.1, 14), M.slot, x, y - 1.2, 1.24, { rx: Math.PI / 2, cast: false }));
      });
      COND.forEach(c => scene.add(mk(cyl(0.55, 0.55, 0.35, 16), M.brass, x + c.dx, TERM_Y, 1.0, { rx: Math.PI / 2 })));
      addLabel(`插座 O${i + 1}`, V3(x, -2, 1.2), 'b3d-title', { below: true });
    });
    addLabel('← 從分電盤來', V3(-45, 23.6, 2), 'b3d-state', { short: '← 分電盤' });

    /* 導線：每一段都是「水平走線 → 往下接到端子」，同一顆螺絲接進來、再接出去 */
    const segs = {};                                  // 例如 segs.feedL、segs.j12L
    const flowTex = (() => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 8;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 64, 8);
      g.fillStyle = 'rgba(255,236,150,0.95)';
      g.fillRect(0, 0, 14, 8);
      const t = new T.CanvasTexture(c);
      t.wrapS = T.RepeatWrapping;
      return t;
    })();
    function segPoints(c, xFrom, xTo, loose) {
      const pts = [];
      const zc = c.z;
      if (xFrom == null) pts.push(V3(-66, c.y, zc));
      else {
        const tx = xFrom + c.dx;
        pts.push(V3(tx, TERM_Y + 0.2, 1.25), V3(tx + 0.5, TERM_Y + 1.3, zc), V3(tx + 0.5, c.y, zc));
      }
      const tx2 = xTo + c.dx;
      pts.push(V3(tx2 - 0.5, c.y, zc));
      if (loose) pts.push(V3(tx2 - 0.5, TERM_Y + 3.2, zc));                 // 鬆脫：線頭沒有碰到螺絲
      else pts.push(V3(tx2 - 0.5, TERM_Y + 1.3, zc), V3(tx2, TERM_Y + 0.2, 1.25));
      return pts;
    }
    function buildSegs(loose) {
      Object.values(segs).forEach(s => {
        scene.remove(s.mesh, s.flow);
        s.mesh.geometry.dispose(); s.mesh.material.dispose();
        s.flow.geometry.dispose(); s.flow.material.dispose(); s.tex.dispose();
      });
      COND.forEach(c => {
        const mat = std(c.hex, 0.45);
        [['feed', null, XS[0]], ['j12', XS[0], XS[1]], ['j23', XS[1], XS[2]]].forEach(([name, a, b]) => {
          const isLoose = loose && c.k === 'L' && name === 'j12';
          const { geo, path } = tubeOf(segPoints(c, a, b, isLoose), 0.32);
          const mesh = new T.Mesh(geo, mat);
          mesh.castShadow = true;
          const len = path.getLength();
          const tex = flowTex.clone();
          tex.needsUpdate = true;
          tex.repeat.set(len / 3, 1);
          const flow = new T.Mesh(tubeOf(segPoints(c, a, b, isLoose), 0.4).geo, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
          flow.visible = false;
          scene.add(mesh, flow);
          segs[name + c.k] = { mesh, flow, tex, dir: c.k === 'N' ? 1 : -1 };
        });
      });
    }
    const looseRing = mk(new T.TorusGeometry(1.1, 0.16, 8, 28), new T.MeshBasicMaterial({ color: 0xe5484d }), XS[1] + COND[0].dx, TERM_Y, 1.6, { cast: false });
    looseRing.visible = false;
    scene.add(looseRing);
    const looseLab = addLabel('接點鬆脫', V3(XS[1] - 9, TERM_Y + 0.8, 2), 'b3d-state bad');
    looseLab.el.hidden = true;

    /* 檯燈、插頭與電線 */
    const glowTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,240,190,1)');
      gr.addColorStop(0.3, 'rgba(255,214,110,.6)');
      gr.addColorStop(1, 'rgba(255,200,90,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return new T.CanvasTexture(c);
    })();
    const LAMP_DX = 10;
    const lamps = XS.map(x => {
      const g = new T.Group();
      g.position.set(x + LAMP_DX, TABLE_Y, 12);
      scene.add(g);
      g.add(mk(cyl(3.2, 3.6, 1, 28), M.lampBody, 0, 0.5, 0));
      g.add(mk(cyl(0.35, 0.35, 12, 12), M.lampBody, 0, 7, 0));
      g.add(mk(new T.CylinderGeometry(1.4, 4.2, 4.2, 28, 1, true), M.shade, 0, 15, 0));
      const bulbMat = new T.MeshStandardMaterial({ color: 0xf5f1e6, roughness: 0.3, emissive: 0xffc24a, emissiveIntensity: 0 });
      g.add(mk(new T.SphereGeometry(1.7, 20, 16), bulbMat, 0, 12.4, 0, { cast: false }));
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
      glow.scale.set(11, 11, 1);
      glow.position.set(0, 12.4, 1.5);
      glow.visible = false;
      g.add(glow);
      const light = new T.PointLight(0xffc870, 0, 0, 1.4);
      light.position.set(0, 12, 0);
      g.add(light);
      const plug = mk(box(2.4, 2.8, 2.2), M.plug, 0, 0, 0);
      scene.add(plug);
      return { g, bulbMat, glow, light, plug, cord: null, plugged: null };
    });
    function setPlug(L, i, plugged) {
      const x = XS[i];
      const p = plugged ? V3(x, 6.4, 2.3) : V3(x + 1, TABLE_Y + 1.4, 20);
      L.plug.position.copy(p);
      L.plug.rotation.x = plugged ? 0 : Math.PI / 2;
      const start = p.clone().add(V3(0, plugged ? -1.4 : 0, plugged ? 0.9 : 1.2));
      const end = V3(x + LAMP_DX - 2.6, TABLE_Y + 0.5, 12);
      const mid = start.clone().lerp(end, 0.5);
      mid.y = Math.min(start.y, end.y) + (plugged ? -3 : 0.2);
      mid.z += 4;
      const geo = new T.TubeGeometry(new T.CatmullRomCurve3([start, start.clone().add(V3(0, -2, 1.5)), mid, end]), 40, 0.25, 8, false);
      if (L.cord) { L.cord.geometry.dispose(); L.cord.geometry = geo; }
      else { L.cord = new T.Mesh(geo, M.cable); L.cord.castShadow = true; scene.add(L.cord); }
      L.plugged = plugged;
    }

    /* 迴圈 */
    let raf = 0, last = 0, userMoved = false, flowing = false, wasNarrow = null;
    const requestRender = () => { if (!raf && !disposed) raf = requestAnimationFrame(frame); };
    function frame(t) {
      raf = 0;
      if (disposed) return;
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      if (!w || !hh) { last = 0; return; }             // 切到電路圖時先停；再顯示時 ResizeObserver 會叫醒
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t;
      let active = controls.update();
      if (flowing && !reduce) {
        Object.values(segs).forEach(s => { if (s.flow.visible) s.tex.offset.x += s.dir * dt * 1.2; });
        active = true;
      }
      renderer.render(scene, camera);
      const narrow = w < 520;                            // 窄螢幕：標籤縮小、改用短字
      if (narrow !== wasNarrow) {
        wasNarrow = narrow;
        labelsEl.classList.toggle('narrow', narrow);
        labels.forEach(L => { if (L.short) L.el.textContent = narrow ? L.short : L.text; });
      }
      labels.forEach(({ el, p, below }) => {
        if (el.hidden) return;
        const v = p.clone().project(camera);
        const show = v.z < 1;
        el.style.visibility = show ? 'visible' : 'hidden';
        if (show) el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * hh).toFixed(1)}px) translate(-50%, ${below ? '0' : '-100%'})`;
      });
      if (active && !raf) raf = requestAnimationFrame(frame);
      if (!active) last = 0;
    }
    function resetView() {
      const vf = camera.fov * Math.PI / 180;
      const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      const dist = Math.max(56 / Math.tan(hf / 2), 30 / Math.tan(vf / 2));
      controls.target.set(0, 4, 6);
      camera.position.set(0, 4, 6 + dist);
      camera.lookAt(controls.target);
      controls.update();
      userMoved = false;
      requestRender();
    }
    function fit() {
      const w = container.clientWidth, hh = container.clientHeight;
      if (!w || !hh) return;
      const dpr = renderer.getPixelRatio();
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(hh * dpr)) {
        renderer.setSize(w, hh, false);
        camera.aspect = w / hh;
        camera.updateProjectionMatrix();
        if (!userMoved) resetView();
      }
      requestRender();
    }
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    controls.addEventListener('start', () => { userMoved = true; });
    controls.addEventListener('change', requestRender);
    resetBtn.addEventListener('click', resetView);
    const applyTheme = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim();
      try { scene.background = new T.Color(v || '#dce2db'); } catch (e) { scene.background = new T.Color('#dce2db'); }
      requestRender();
    };
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-app-theme', 'data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    applyTheme();

    let builtLoose = null;
    function sync() {
      const m = api.getModel();
      if (builtLoose !== m.loose) { buildSegs(m.loose); builtLoose = m.loose; }
      looseRing.visible = m.loose;
      looseLab.el.hidden = !m.loose;
      lamps.forEach((L, i) => {
        if (L.plugged !== m.plugged[i]) setPlug(L, i, m.plugged[i]);
        const r = m.lamps[i];
        L.bulbMat.emissiveIntensity = r > 0.02 ? 1.5 + 1.5 * r : 0;
        L.light.intensity = r > 0.02 ? 220 * r : 0;
        L.glow.visible = r > 0.02;
        L.glow.material.opacity = Math.min(1, r);
      });
      flowing = false;
      Object.entries(segs).forEach(([k, s]) => { s.flow.visible = !!m.flow[k]; if (s.flow.visible) flowing = true; });
      requestRender();
    }

    function dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); mq.removeEventListener('change', applyTheme);
      controls.dispose();
      scene.traverse(o => {
        if (o.geometry && !o.isSprite) o.geometry.dispose();          // Sprite 的幾何是 three.js 共用的
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(mm => { if (mm.map) mm.map.dispose(); mm.dispose(); });
      });
      flowTex.dispose(); glowTex.dispose(); envTex.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.forceContextLoss();
      canvas.remove(); labelsEl.remove(); legend.remove(); resetBtn.remove();
    }

    resetView();
    fit();
    /* 測試用：回傳鏡頭與目前的亮燈、電流狀態 */
    function inspect() {
      fit();
      return {
        camera, controls, render: requestRender,
        lamps: lamps.map(L => +L.light.intensity.toFixed(1)),
        flow: Object.keys(segs).filter(k => segs[k].flow.visible),
      };
    }
    return { sync, dispose, inspect };
  }

  return { create, current: () => current };
})();
