'use strict';
/* 迴路 05：指針式三用電表模擬 */
const AnalogMeter = (() => {
  const C = 20;                 // Ω 刻度中心值
  const PX = 180, PY = 226;     // 指針軸心
  const SPAN = 48;              // 指針左右最大角度
  const POS = [
    { k: 'OFF', v: 0, lab: 'OFF' },
    { k: 'ACV', v: 10, lab: '10' }, { k: 'ACV', v: 50, lab: '50' }, { k: 'ACV', v: 250, lab: '250' }, { k: 'ACV', v: 1000, lab: '1000' },
    { k: 'DCV', v: 1000, lab: '1000' }, { k: 'DCV', v: 250, lab: '250' }, { k: 'DCV', v: 50, lab: '50' }, { k: 'DCV', v: 10, lab: '10' }, { k: 'DCV', v: 2.5, lab: '2.5' },
    { k: 'mA', v: 250, lab: '250' }, { k: 'mA', v: 25, lab: '25' }, { k: 'mA', v: 2.5, lab: '2.5' },
    { k: 'OHM', v: 10000, lab: '×10k' }, { k: 'OHM', v: 1000, lab: '×1k' }, { k: 'OHM', v: 10, lab: '×10' }, { k: 'OHM', v: 1, lab: '×1' },
  ];
  const GROUPS = [
    { k: 'ACV', name: 'ACV', color: '#C0261B' },
    { k: 'DCV', name: 'DCV', color: '#1E1E1A' },
    { k: 'mA', name: 'DCmA', color: '#1F4FA0' },
    { k: 'OHM', name: 'Ω', color: '#1B6B3A' },
  ];
  const KX = 180, KY = 398, STEP = 360 / POS.length;

  const polar = (r, f) => {
    const a = (-SPAN + 2 * SPAN * f) * Math.PI / 180;
    return [PX + r * Math.sin(a), PY - r * Math.cos(a)];
  };
  const kpt = (r, i) => {
    const a = i * STEP * Math.PI / 180;
    return [KX + r * Math.sin(a), KY - r * Math.cos(a)];
  };
  const fmt = n => n.toFixed(1);

  function faceMarkup() {
    let s = '';
    const arc = (r, f0, f1) => { const [x0, y0] = polar(r, f0), [x1, y1] = polar(r, f1); return `M${fmt(x0)} ${fmt(y0)}A${r} ${r} 0 0 1 ${fmt(x1)} ${fmt(y1)}`; };
    // Ω 刻度
    s += `<path d="${arc(188, 0, 1)}" style="stroke:#1E1E1A;stroke-width:1.6;fill:none"/>`;
    const ohmLabels = [['∞', Infinity], ['200', 200], ['100', 100], ['50', 50], ['30', 30], ['20', 20], ['10', 10], ['5', 5], ['2', 2], ['0', 0]];
    const ohmMinor = [1000, 500, 300, 150, 70, 40, 25, 15, 8, 6, 4, 3, 1.5, 1, 0.5];
    const fo = R => isFinite(R) ? C / (C + R) : 0;
    ohmMinor.forEach(R => { const [x0, y0] = polar(188, fo(R)), [x1, y1] = polar(181, fo(R)); s += `<path d="M${fmt(x0)} ${fmt(y0)}L${fmt(x1)} ${fmt(y1)}" style="stroke:#1E1E1A;stroke-width:1"/>`; });
    ohmLabels.forEach(([t, R]) => {
      const f = fo(R);
      const [x0, y0] = polar(188, f), [x1, y1] = polar(177, f), [tx, ty] = polar(198, f);
      s += `<path d="M${fmt(x0)} ${fmt(y0)}L${fmt(x1)} ${fmt(y1)}" style="stroke:#1E1E1A;stroke-width:1.6"/>`;
      s += `<text x="${fmt(tx)}" y="${fmt(ty)}" text-anchor="middle" style="font-family:var(--font-mono);font-size:11px;font-weight:700;fill:#1B6B3A">${t}</text>`;
    });
    const [ox, oy] = polar(214, 0.04);
    s += `<text x="${fmt(ox)}" y="${fmt(oy)}" style="font-size:15px;font-weight:700;fill:#1B6B3A">Ω</text>`;
    // 反光鏡帶
    s += `<path d="${arc(168, 0, 1)}" style="stroke:#BFC6C9;stroke-width:7;fill:none;opacity:.8"/>`;
    // 線性刻度
    s += `<path d="${arc(152, 0, 1)}" style="stroke:#1E1E1A;stroke-width:1.6;fill:none"/>`;
    for (let i = 0; i <= 50; i++) {
      const f = i / 50, major = i % 10 === 0, mid = i % 5 === 0;
      const [x0, y0] = polar(152, f), [x1, y1] = polar(152 - (major ? 11 : mid ? 7 : 4), f);
      s += `<path d="M${fmt(x0)} ${fmt(y0)}L${fmt(x1)} ${fmt(y1)}" style="stroke:#1E1E1A;stroke-width:${major ? 1.6 : 1}"/>`;
    }
    const rows = [[137, [0, 50, 100, 150, 200, 250]], [124, [0, 10, 20, 30, 40, 50]], [111, [0, 2, 4, 6, 8, 10]]];
    rows.forEach(([r, labs], ri) => labs.forEach((t, i) => {
      const [x, y] = polar(r, i / 5);
      s += `<text x="${fmt(x)}" y="${fmt(y + 4)}" text-anchor="middle" style="font-family:var(--font-mono);font-size:${ri ? 10 : 10.5}px;font-weight:${ri ? 500 : 700};fill:#1E1E1A">${t}</text>`;
    }));
    s += `<text x="180" y="176" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:#555">DCV·ACV·DCmA</text>`;
    s += `<text x="180" y="200" text-anchor="middle" style="font-size:10px;fill:#777">指針式三用電表</text>`;
    return s;
  }

  function create({ onSelect, onAdj }) {
    const svg = sv('svg', { class: 'meter-svg', viewBox: '0 0 360 540', role: 'img', 'aria-label': '指針式三用電表' });
    let knobHTML = '';
    GROUPS.forEach(g => {
      const idx = POS.map((p, i) => p.k === g.k ? i : -1).filter(i => i >= 0);
      const i0 = idx[0] - 0.42, i1 = idx[idx.length - 1] + 0.42;
      const [x0, y0] = kpt(100, i0), [x1, y1] = kpt(100, i1);
      const large = (i1 - i0) * STEP > 180 ? 1 : 0;
      knobHTML += `<path d="M${fmt(x0)} ${fmt(y0)}A100 100 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}" style="stroke:${g.color};stroke-width:3;fill:none"/>`;
      const [tx, ty] = kpt(118, (idx[0] + idx[idx.length - 1]) / 2);
      knobHTML += `<text x="${fmt(tx)}" y="${fmt(ty + 4)}" text-anchor="middle" style="font-family:var(--font-mono);font-size:12px;font-weight:700;fill:${g.color}">${g.name}</text>`;
    });
    svg.innerHTML = `
      <defs><clipPath id="mwin"><rect x="16" y="18" width="328" height="222" rx="10"/></clipPath></defs>
      <rect x="2" y="2" width="356" height="536" rx="28" style="fill:#F2B705;stroke:#B98C00;stroke-width:3"/>
      <rect x="10" y="12" width="340" height="234" rx="14" style="fill:#2A2A26"/>
      <rect x="16" y="18" width="328" height="222" rx="10" style="fill:#F8F7EF"/>
      <g>${faceMarkup()}</g>
      <g clip-path="url(#mwin)"><line class="needle" x1="${PX}" y1="${PY}" x2="${PX}" y2="${PY - 196}" style="stroke:#C0261B;stroke-width:2.2;stroke-linecap:round"/></g>
      <path d="M150 240a30 30 0 0 1 60 0z" style="fill:#2A2A26"/>
      <circle cx="${PX}" cy="${PY}" r="6" style="fill:#555"/>
      <text class="fuse-flag" x="300" y="268" text-anchor="middle" style="font-family:var(--font-mono);font-size:11px;font-weight:700;fill:#C0261B" opacity="0">FUSE ✕</text>
      <g class="adj" transform="translate(48,276)" tabindex="0" role="slider" aria-label="0Ω 歸零旋鈕：拖曳旋轉、滾輪或方向鍵調整" aria-valuemin="-15" aria-valuemax="15" aria-valuenow="0" style="cursor:grab;touch-action:none">
        <circle r="31" style="fill:transparent"/>
        <text x="-27" y="-14" text-anchor="middle" style="font-family:var(--font-mono);font-size:12px;font-weight:700;fill:#2A2A26">−</text>
        <text x="27" y="-14" text-anchor="middle" style="font-family:var(--font-mono);font-size:12px;font-weight:700;fill:#2A2A26">+</text>
        <circle r="19" style="fill:#2A302D;stroke:#111;stroke-width:2"/>
        <line class="adj-line" x1="0" y1="0" x2="0" y2="-15" style="stroke:#fff;stroke-width:3;stroke-linecap:round"/>
        <text y="36" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;font-weight:700;fill:#2A2A26">0Ω ADJ</text>
      </g>
      ${knobHTML}
      <circle cx="${KX}" cy="${KY}" r="50" style="fill:#2A302D;stroke:#111;stroke-width:2"/>
      <circle cx="${KX}" cy="${KY}" r="40" style="fill:#383F3B"/>
      <g class="knob-ptr"><rect x="${KX - 7}" y="${KY - 48}" width="14" height="96" rx="7" style="fill:#4A524E"/><path d="M${KX} ${KY - 46}V${KY - 26}" style="stroke:#fff;stroke-width:4;stroke-linecap:round"/></g>
      <circle cx="44" cy="508" r="13" style="fill:#1E1E1A;stroke:#555;stroke-width:3"/><text x="70" y="512" style="font-family:var(--font-mono);font-size:11px;font-weight:700;fill:#2A2A26">COM −</text>
      <circle cx="316" cy="508" r="13" style="fill:#C0261B;stroke:#7a120b;stroke-width:3"/><text x="290" y="512" text-anchor="end" style="font-family:var(--font-mono);font-size:11px;font-weight:700;fill:#2A2A26">+</text>`;
    const selG = sv('g', {});
    POS.forEach((p, i) => {
      const [x, y] = kpt(78, i);
      const g = GROUPS.find(g => g.k === p.k);
      const hit = sv('circle', { cx: fmt(x), cy: fmt(y), r: 15, class: 'sel-hit', tabindex: 0, role: 'button', 'aria-label': (g ? g.name + ' ' : '') + p.lab });
      hit.addEventListener('click', () => onSelect(i));
      hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } });
      selG.append(hit, sv('text', { x: fmt(x), y: fmt(y + 4), 'text-anchor': 'middle', class: 'sel-lab', style: `fill:${g ? g.color : '#1E1E1A'};font-size:${p.lab.length > 3 ? 10 : 11.5}px` }, p.lab));
    });
    svg.append(selG);

    const needle = svg.querySelector('.needle');
    const ptr = svg.querySelector('.knob-ptr');
    const adjLine = svg.querySelector('.adj-line');
    /* 0Ω ADJ 旋鈕：繞著旋鈕拖曳就能轉，也可以用滾輪或方向鍵 */
    const adjG = svg.querySelector('.adj');
    const adjAngle = e => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return Math.atan2(p.y - 276, p.x - 48) * 180 / Math.PI;
    };
    let adjDrag = null;
    adjG.addEventListener('pointerdown', e => {
      if (!onAdj) return;
      e.preventDefault();
      adjDrag = { id: e.pointerId, a: adjAngle(e) };
      adjG.style.cursor = 'grabbing';
      try { adjG.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    });
    adjG.addEventListener('pointermove', e => {
      if (!adjDrag || e.pointerId !== adjDrag.id) return;
      const a = adjAngle(e);
      let d = a - adjDrag.a;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      adjDrag.a = a;
      onAdj(d / 900);                       // 旋鈕轉 1 度 = 調整 1/900
    });
    const endAdj = () => { adjDrag = null; adjG.style.cursor = 'grab'; };
    adjG.addEventListener('pointerup', endAdj);
    adjG.addEventListener('pointercancel', endAdj);
    adjG.addEventListener('wheel', e => { if (!onAdj) return; e.preventDefault(); onAdj(e.deltaY < 0 ? 0.003 : -0.003); }, { passive: false });
    adjG.addEventListener('keydown', e => {
      const d = { ArrowRight: 0.002, ArrowUp: 0.002, ArrowLeft: -0.002, ArrowDown: -0.002 }[e.key];
      if (d && onAdj) { e.preventDefault(); onAdj(d); }
    });
    const fuseFlag = svg.querySelector('.fuse-flag');
    let ang = -SPAN, vel = 0, target = -SPAN, pinned = false, raf = null, last = 0, posIdx = 0;
    /* 讓 3D 工作台上的電表跟著同一支指針、同一個檔位 */
    const subs = new Set();
    const emit = () => subs.forEach(f => f(ang, posIdx));

    function tick(t) {
      const dt = Math.min(0.04, (t - last) / 1000 || 0.016);
      last = t;
      const tgt = target + (pinned ? Math.sin(t / 30) * 0.8 : 0);
      vel += (140 * (tgt - ang) - 13 * vel) * dt;
      ang += vel * dt;
      needle.setAttribute('transform', `rotate(${ang.toFixed(2)} ${PX} ${PY})`);
      emit();
      if (!pinned && Math.abs(tgt - ang) < 0.03 && Math.abs(vel) < 0.05) { raf = null; return; }
      raf = requestAnimationFrame(tick);
    }
    function setDeflection(f) {
      const fc = clamp(f, -0.07, 1.06);
      pinned = f > 1.03 || f < -0.06;
      target = -SPAN + 2 * SPAN * fc;
      if (prefersReducedMotion()) { ang = target; needle.setAttribute('transform', `rotate(${ang} ${PX} ${PY})`); emit(); return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }
    Page.onLeave(() => { if (raf) cancelAnimationFrame(raf); raf = null; subs.clear(); });
    return {
      el: svg,
      setPos(i) { posIdx = i; ptr.setAttribute('transform', `rotate(${i * STEP} ${KX} ${KY})`); emit(); },
      setAdj(v) { adjLine.setAttribute('transform', `rotate(${v * 900})`); adjG.setAttribute('aria-valuenow', Math.round(v * 100)); },
      setFuse(blown) { fuseFlag.setAttribute('opacity', blown ? 1 : 0); },
      setDeflection,
      subscribe(fn) { subs.add(fn); fn(ang, posIdx); return () => subs.delete(fn); },
    };
  }

  return { create, POS, C };
})();

const MeterLab = (() => {
  const C = AnalogMeter.C;
  const POS = AnalogMeter.POS;

  function makeBench() {
    const v = rand(107, 115);
    return {
      bat1: { name: '1.5V 乾電池', spec: '3 號電池（直流）', kind: 'dc', V: +rand(1.47, 1.6).toFixed(2), terms: [['+', '正極 +'], ['-', '負極 −']] },
      bat9: { name: '9V 電池', spec: '方形電池（直流）', kind: 'dc', V: +rand(8.5, 9.4).toFixed(1), terms: [['+', '正極 +'], ['-', '負極 −']] },
      out: { name: '牆上插座', spec: '110V 接地型（交流）', kind: 'ac', V: +v.toFixed(0), hot: pick(['A', 'B']), terms: [['A', '左孔'], ['B', '右孔'], ['E', '接地孔']] },
      out2: { name: '冷氣插座', spec: '220V（交流）', kind: 'ac', V: +v.toFixed(0), terms: [['X', '左孔'], ['Y', '右孔'], ['E', '接地孔']] },
      r1: { name: '電阻 R1', spec: '色碼被磨掉了', kind: 'res', R: pick([100, 150, 220, 330, 470]), terms: [['1', '腳 1'], ['2', '腳 2']] },
      r2: { name: '電阻 R2', spec: '比 R1 大很多', kind: 'res', R: pick([10000, 15000, 22000, 33000, 47000]), terms: [['1', '腳 1'], ['2', '腳 2']] },
      sw: { name: '單切開關', spec: '拆下來的舊開關', kind: 'sw', on: false, terms: [['1', '端子 1'], ['2', '端子 2']] },
      lamp: { name: '60W 燈泡', spec: '冷的（沒點亮）', kind: 'res', R: +rand(15, 18.5).toFixed(1), terms: [['c', '中心'], ['s', '螺紋']] },
    };
  }

  function nodeV(item, t) {
    if (item.kind === 'dc') return t === '+' ? item.V : 0;
    if (item.kind === 'ac') {
      if (item.hot) return t === item.hot ? item.V : 0;
      return t === 'X' ? item.V : t === 'Y' ? -item.V : 0;
    }
    return 0;
  }

  function render(root) {
    const ch = CHAPTERS.find(c => c.id === 'meter');
    root.append(chapterHeader(ch, ch.sub));
    const B = makeBench();
    const s = {
      pos: POS[0], posI: 0, red: null, black: null, shorted: false, armed: 'red',
      adj: 0, drift: 0, fuse: false, mistakes: 0, swOn: false, swOff: false, lastF: 0, pinnedBefore: false,
    };
    const meter = AnalogMeter.create({ onSelect: i => select(i), onAdj: d => setAdj(s.adj + d) });
    const adjIn = h('input', { type: 'range', id: 'adj', min: -0.15, max: 0.15, step: 0.001, value: 0, 'aria-label': '零歐姆調整旋鈕' });
    const probeRed = h('button', { type: 'button', class: 'probe-btn' });
    const probeBlack = h('button', { type: 'button', class: 'probe-btn' });
    const btnShort = h('button', { type: 'button', class: 'btn btn-sm' }, '兩棒短接');
    const btnLift = h('button', { type: 'button', class: 'btn btn-sm btn-ghost' }, '拿開表筆');
    const btnFuse = h('button', { type: 'button', class: 'btn btn-sm btn-danger', hidden: true }, '更換保險絲');
    const hint = h('div', { class: 'callout read-hint' });
    const note = h('div', { class: 'callout warn small', hidden: true });
    const mistakes = h('div', { class: 'tiny muted' });
    const taskBox = h('div', {});
    const bench = h('div', { class: 'bench' });
    /* 工作台兩種操作方式：3D 拖曳表筆，或原本的清單點選 */
    const can3d = typeof Bench3D !== 'undefined' && Bench3D.supported();
    const bench3dBox = h('div', { class: 'bench3d', hidden: true });
    const benchHelp = h('p', { class: 'small muted' });
    const modeBtns = [['3d', '3D 工作台'], ['list', '清單模式']].map(([m, label]) =>
      h('button', { type: 'button', 'data-mode': m, 'aria-pressed': 'false', onclick: () => setMode(m, true) }, label));
    const modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': '工作台操作方式' }, modeBtns);
    let mode = 'list', bench3d = null, left = false;
    root.append(h('div', { class: 'meter-lab' },
      h('div', { class: 'meter-col' },
        meter.el,
        h('div', { class: 'adj-row' },
          h('label', { for: 'adj' }, '0Ω ADJ'),
          h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': '0Ω ADJ 往左微調', onclick: () => setAdj(s.adj - 0.003) }, '−'),
          adjIn,
          h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': '0Ω ADJ 往右微調', onclick: () => setAdj(s.adj + 0.003) }, '+')),
        h('div', { class: 'probe-row' }, probeRed, probeBlack),
        h('div', { class: 'row' }, btnShort, btnLift, btnFuse),
        hint, note, mistakes,
      ),
      h('div', { class: 'stack' }, taskBox,
        h('div', { class: 'bench-head' }, h('h3', {}, '工作台'), can3d ? modeSeg : null),
        benchHelp, bench3dBox, bench),
    ));

    function select(i) {
      const prev = s.pos;
      s.posI = i; s.pos = POS[i];
      meter.setPos(i);
      // 換 Ω 檔後 0 點會偏掉：大多停在 0 的左邊（電池電壓下降），偶爾稍微超過
      if (s.pos.k === 'OHM' && (prev.k !== 'OHM' || prev.v !== s.pos.v)) s.drift = Math.random() < 0.75 ? -rand(0.03, 0.08) : rand(0.012, 0.025);
      beep(400, 0.02, 'square', 0.03);
      update();
    }
    function setAdj(v) {
      s.adj = clamp(+v.toFixed(4), -0.15, 0.15);
      adjIn.value = s.adj;
      meter.setAdj(s.adj);
      update();
    }
    adjIn.addEventListener('input', () => setAdj(+adjIn.value));
    probeRed.addEventListener('click', () => { s.armed = 'red'; drawProbes(); });
    probeBlack.addEventListener('click', () => { s.armed = 'black'; drawProbes(); });
    btnShort.addEventListener('click', () => { s.shorted = true; s.red = s.black = null; drawProbes(); drawBench(); update(); });
    btnLift.addEventListener('click', () => { if (bench3d) bench3d.home(); s.shorted = false; s.red = s.black = null; s.armed = 'red'; drawProbes(); drawBench(); update(); });

    const HELP = {
      '3d': '用滑鼠或手指<b>拖曳紅、黑表筆</b>：筆尖靠近端子會自動吸上去接觸，指針立刻有反應；把一支拖到另一支的筆尖上就是兩棒短接。拖曳空白處旋轉視角，滾輪或兩指縮放，右鍵拖曳平移。點開關的翹板可以切換 ON/OFF。',
      list: '先點上面的「紅棒」或「黑棒」決定要放哪一支，再點工作台上的端子。放好一支後會自動換另一支。',
    };
    function setMode(m, remember) {
      if (m === '3d' && !can3d) m = 'list';
      mode = m;
      if (remember) { try { localStorage.setItem('peixian-dojo-bench', m); } catch (e) { /* 忽略 */ } }
      modeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
      bench.hidden = m !== 'list';
      bench3dBox.hidden = m !== '3d';
      benchHelp.innerHTML = HELP[m] + (can3d ? '' : '<br>這個瀏覽器不支援 3D 繪圖（WebGL2），所以使用清單模式。');
      if (m === '3d' && !bench3d) {
        bench3d = Bench3D.create(bench3dBox, { items: B, getState: () => s, meter, onProbe: probeFrom3D, onToggleSwitch: toggleSwitch });
        bench3d.ready.catch(() => {
          if (left) return;
          bench3d = null;
          toast('3D 工作台載入失敗（需要網路連線），先改用清單模式。', 'bad');
          setMode('list', false);
        });
      }
      drawProbes(); drawBench();
    }
    /* 3D 工作台回報表筆接觸到哪裡：{item, t} 端子、'short' 兩棒互碰、null 懸空 */
    function probeFrom3D(which, target) {
      if (target === 'short') { s.shorted = true; s.red = s.black = null; }
      else {
        if (s.shorted) { s.shorted = false; s.red = s.black = null; }
        s[which] = target;
      }
      if (target) beep(1000, 0.02, 'square', 0.03);
      drawProbes(); update();
    }
    function toggleSwitch() { B.sw.on = !B.sw.on; beep(700, 0.03); drawBench(); update(); }
    Page.onLeave(() => { left = true; if (bench3d) bench3d.dispose(); bench3d = null; });
    btnFuse.addEventListener('click', () => { s.fuse = false; btnFuse.hidden = true; meter.setFuse(false); toast('換上新的保險絲了。量電壓前先確認檔位！'); update(); });

    const k = () => 1 + s.drift + s.adj;
    const zeroed = () => s.pos.k === 'OHM' && Math.abs(k() - 1) < 0.012;

    function signal() {
      if (s.shorted) return { r: 0 };
      if (!s.red || !s.black) return { open: true };
      if (s.red.item !== s.black.item) return { open: true };
      const it = B[s.red.item];
      if (s.red.t === s.black.t) return { r: 0, same: true };
      if (it.kind === 'dc') return { dc: nodeV(it, s.red.t) - nodeV(it, s.black.t), item: s.red.item };
      if (it.kind === 'ac') return { ac: Math.abs(nodeV(it, s.red.t) - nodeV(it, s.black.t)), item: s.red.item };
      if (it.kind === 'sw') return { r: it.on ? 0 : Infinity, item: s.red.item };
      return { r: it.R, item: s.red.item };
    }
    function deflect(sig) {
      const p = s.pos;
      if (s.fuse && p.k !== 'OFF') return { f: 0, note: '保險絲燒斷了，指針不會動。按「更換保險絲」。' };
      switch (p.k) {
        case 'OFF': return { f: 0 };
        case 'DCV':
          if (sig.ac != null) return { f: 0, note: '用 DCV 量交流電，指針幾乎不動。量插座要用 <b>ACV</b>。' };
          if (sig.dc != null) {
            const f = sig.dc / p.v;
            if (f < -0.02) return { f, note: '<b>反打！</b>指針往左撞。量直流時紅棒接 +、黑棒接 −。' };
            return { f };
          }
          return { f: 0 };
        case 'ACV':
          if (sig.ac != null) return { f: sig.ac / p.v };
          if (sig.dc != null) return { f: Math.abs(sig.dc) * 1.1 / p.v, note: '用 ACV 量直流，讀值不準確。量電池要用 <b>DCV</b>。' };
          return { f: 0 };
        case 'mA':
          if ((sig.ac != null && sig.ac > 1) || (sig.dc != null && Math.abs(sig.dc) > 0.2)) return { f: 1.4, blow: true };
          return { f: 0, note: p.v ? '電流檔要把電路切開、<b>串聯</b>進去量。這個工作台只練電壓和電阻。' : '' };
        case 'OHM':
          if (sig.ac != null) return sig.ac > 5 ? { f: 1.4, blow: true } : { f: k(), note: '<b>帶電的線路不可以量電阻！</b>就算這兩孔之間剛好沒電壓也一樣。' };
          if (sig.dc != null) return { f: clamp(k() * 0.9 + sig.dc * 0.05, 0, 1.1), note: '電池本身有電壓，不能用 Ω 檔量，讀值沒有意義。' };
          if (sig.open) return { f: 0 };
          return { f: k() * C / (C + sig.r / p.v) };
      }
      return { f: 0 };
    }

    function update() {
      const sig = signal();
      const d = deflect(sig);
      if (d.blow && !s.fuse) {
        s.fuse = true; s.mistakes++;
        meter.setFuse(true); btnFuse.hidden = false;
        beep(120, 0.4, 'sawtooth', 0.06);
        toast(s.pos.k === 'mA' ? '砰！電流檔直接碰電源，保險絲燒斷了。' : '砰！在帶電線路上用 Ω 檔，保險絲燒斷了。', 'bad');
      }
      const pinnedNow = d.f > 1.03 && !d.blow && s.pos.k !== 'OHM';   // Ω 檔短接超過 0 只是還沒歸零，不算打表
      if (pinnedNow && !s.pinnedBefore) { s.mistakes++; toast('指針打到底了！檔位太小，換大一檔。', 'bad'); beep(160, 0.2, 'sawtooth', 0.05); }
      s.pinnedBefore = pinnedNow;
      meter.setDeflection(d.blow ? 0 : d.f);
      s.lastF = d.blow ? 0 : d.f;
      if (s.pos.k === 'OHM' && sig.item === 'sw' && zeroed()) { if (B.sw.on) s.swOn = true; else s.swOff = true; }
      note.hidden = !d.note;
      note.innerHTML = d.note || '';
      hint.innerHTML = readHint();
      mistakes.textContent = s.mistakes ? `操作失誤 ${s.mistakes} 次（打表、燒保險絲）。真的電表可能已經壞了。` : '';
      drawTask();
      if (bench3d) bench3d.sync();
    }

    function readHint() {
      const p = s.pos;
      if (p.k === 'OFF') return '<b>OFF</b>：電表關閉。用完記得轉回這裡。';
      if (p.k === 'OHM') {
        const zs = zeroed() ? '<span class="pill ok">已歸零</span>' : '<span class="pill warn">尚未歸零</span>';
        let how = '';
        if (!zeroed()) {
          const sig = signal();
          if (sig.r === 0) how = k() < 1
            ? '<br><b>指針停在 0 的左邊</b> → 把 0Ω ADJ 往 <b>+</b>（右）轉。'
            : '<br><b>指針超過 0 了</b> → 把 0Ω ADJ 往 <b>−</b>（左）轉。';
          else how = '<br>先讓兩支筆尖互碰（兩棒短接），指針會往右偏，再轉 0Ω ADJ 讓它剛好停在 0。';
        }
        return `<b>Ω ×${p.v >= 1000 ? p.v / 1000 + 'k' : p.v}</b> ${zs}<br>讀最上面的綠色 Ω 刻度（右 0、左 ∞），讀值 × ${p.v}。${how}`;
      }
      const name = p.k === 'ACV' ? '交流電壓' : p.k === 'DCV' ? '直流電壓' : '直流電流';
      const unit = p.k === 'mA' ? 'mA' : 'V';
      const how = { 250: '讀 0–250 刻度，直接讀值', 50: '讀 0–50 刻度，直接讀值', 10: '讀 0–10 刻度，直接讀值', 2.5: '讀 0–250 刻度，讀值 ÷ 100', 25: '讀 0–250 刻度，讀值 ÷ 10', 1000: '讀 0–10 刻度，讀值 × 100' }[p.v];
      return `<b>${p.k === 'mA' ? 'DCmA' : p.k} ${p.v}</b>：${name}，最大 ${p.v}${unit}。<br>${how}。`;
    }

    function drawProbes() {
      const loc = (pr) => {
        if (s.shorted) return '兩棒互碰';
        if (!pr) return '未接觸';
        const it = B[pr.item];
        return it.name + '・' + it.terms.find(t => t[0] === pr.t)[1];
      };
      const listMode = mode === 'list';
      probeRed.disabled = probeBlack.disabled = !listMode;
      probeRed.className = 'probe-btn' + (listMode && s.armed === 'red' ? ' armed' : '');
      probeBlack.className = 'probe-btn' + (listMode && s.armed === 'black' ? ' armed' : '');
      probeRed.innerHTML = `<span class="pname"><i class="pdot" style="background:var(--w-red)"></i>紅棒（+）</span><span class="ploc">${loc(s.red)}</span>`;
      probeBlack.innerHTML = `<span class="pname"><i class="pdot" style="background:#1B1B1B;box-shadow:0 0 0 1.5px var(--wire-halo)"></i>黑棒（COM）</span><span class="ploc">${loc(s.black)}</span>`;
    }

    const icons = {
      dc: v => `<svg viewBox="0 0 160 70"><rect x="20" y="20" width="110" height="34" rx="6" style="fill:${v > 5 ? '#2F5D8C' : '#3A3A36'}"/><rect x="130" y="29" width="8" height="16" rx="2" style="fill:#999"/><text x="75" y="42" text-anchor="middle" style="font-family:var(--font-mono);font-size:13px;font-weight:700;fill:#fff">${v > 5 ? '9V' : '1.5V'}</text><text x="142" y="24" style="font-size:12px;font-weight:700;fill:var(--ink)">+</text><text x="8" y="42" style="font-size:14px;font-weight:700;fill:var(--ink)">−</text></svg>`,
      out: two => `<svg viewBox="0 0 160 70"><rect x="50" y="4" width="60" height="62" rx="8" style="fill:var(--plate);stroke:var(--plate-edge)"/>${two ? '<rect x="58" y="22" width="18" height="6" rx="1" style="fill:var(--plate-ink)"/><rect x="84" y="22" width="18" height="6" rx="1" style="fill:var(--plate-ink)"/>' : '<rect x="66" y="14" width="6" height="18" rx="1" style="fill:var(--plate-ink)"/><rect x="88" y="14" width="6" height="18" rx="1" style="fill:var(--plate-ink)"/>'}<path d="M74 52a6 6 0 0 1 12 0v6h-12z" style="fill:var(--plate-ink)"/></svg>`,
      res: () => `<svg viewBox="0 0 160 70"><path d="M8 35H45M115 35H152" style="stroke:#8a8a80;stroke-width:3"/><rect x="45" y="24" width="70" height="22" rx="10" style="fill:#D8C49A;stroke:#8a7a55"/><path d="M60 24v22M72 24v22M86 24v22" style="stroke:#7a6a4a;stroke-width:4;opacity:.35"/></svg>`,
      sw: on => `<svg viewBox="0 0 160 70"><rect x="45" y="6" width="70" height="58" rx="8" style="fill:var(--plate);stroke:var(--plate-edge)"/><circle cx="62" cy="40" r="4" style="fill:var(--plate-ink)"/><circle cx="98" cy="40" r="4" style="fill:var(--plate-ink)"/><path d="${on ? 'M62 40L98 40' : 'M62 40L92 20'}" style="stroke:var(--copper);stroke-width:4;stroke-linecap:round"/><text x="80" y="60" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;font-weight:700;fill:var(--plate-ink)">${on ? 'ON' : 'OFF'}</text></svg>`,
      lamp: () => `<svg viewBox="0 0 160 70"><circle cx="80" cy="28" r="22" style="fill:var(--bulb-off);stroke:var(--ink-3);stroke-width:2"/><rect x="68" y="48" width="24" height="16" rx="3" style="fill:var(--ink-3)"/></svg>`,
    };
    function drawBench() {
      bench.replaceChildren(...Object.entries(B).map(([id, it]) => {
        const icon = it.kind === 'dc' ? icons.dc(it.V) : it.kind === 'ac' ? icons.out(id === 'out2') : it.kind === 'sw' ? icons.sw(it.on) : id === 'lamp' ? icons.lamp() : icons.res();
        const tps = h('div', { class: 'tps' }, it.terms.map(([t, lab]) => {
          const hasR = s.red && s.red.item === id && s.red.t === t;
          const hasB = s.black && s.black.item === id && s.black.t === t;
          return h('button', {
            type: 'button', class: 'tp-btn' + (hasR ? ' has-red' : '') + (hasB ? ' has-black' : ''),
            onclick: () => place(id, t),
          }, hasR ? h('i', { class: 'pin', style: { background: 'var(--w-red)' } }) : null, hasB ? h('i', { class: 'pin', style: { background: '#1B1B1B' } }) : null, lab);
        }));
        return h('div', { class: 'item' },
          h('div', {}, h('h4', {}, it.name), h('div', { class: 'spec' }, it.spec)),
          h('div', { html: icon }),
          tps,
          it.kind === 'sw' ? h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { it.on = !it.on; beep(700, 0.03); drawBench(); update(); } }, it.on ? '切到 OFF' : '切到 ON') : null,
        );
      }));
    }
    function place(id, t) {
      s.shorted = false;
      s[s.armed] = { item: id, t };
      s.armed = s.armed === 'red' ? 'black' : 'red';
      beep(1000, 0.02, 'square', 0.03);
      drawProbes(); drawBench(); update();
    }

    /* ---------- 任務 ---------- */
    const on = (item, rt, bt) => s.red && s.black && s.red.item === item && s.black.item === item && (!rt || s.red.t === rt) && (!bt || s.black.t === bt);
    const onPair = (item, a, b) => on(item) && ((s.red.t === a && s.black.t === b) || (s.red.t === b && s.black.t === a));
    const hotHole = () => B.out.hot === 'A' ? '左孔' : '右孔';
    const TASKS = [
      {
        title: '轉動檔位旋鈕',
        text: '指針式三用電表靠中間的<b>旋鈕</b>決定「量什麼」和「最大量多少」：紅色 ACV 是交流電壓、黑色 DCV 是直流電壓、藍色是直流電流、綠色 Ω 是電阻。<br>點電表上的數字，把旋鈕轉到 <b>DCV 10</b>。',
        auto: () => s.pos.k === 'DCV' && s.pos.v === 10,
      },
      {
        title: '量 1.5V 乾電池',
        text: '電池是直流電，用 <b>DCV</b>。1.5V 比 2.5 小，選 <b>DCV 2.5</b> 指針會偏得比較大、比較好讀（用 10 也可以）。<br>紅棒接 <b>正極 +</b>、黑棒接 <b>負極 −</b>，讀出電壓後輸入。',
        need: () => s.pos.k === 'DCV' && on('bat1', '+', '-'),
        needMsg: '請用 DCV 檔，紅棒接電池 +、黑棒接 −。',
        ask: { unit: 'V', answer: () => B.bat1.V, tol: () => s.pos.v <= 2.5 ? 0.06 : 0.15 },
      },
      {
        title: '量 9V 電池',
        text: '9V 要選哪一檔？比 9 大的最小檔位是 <b>DCV 10</b>。讀 0–10 刻度。',
        need: () => s.pos.k === 'DCV' && on('bat9', '+', '-'),
        needMsg: '請用 DCV 檔，紅棒接 9V 電池 +、黑棒接 −。',
        ask: { unit: 'V', answer: () => B.bat9.V, tol: () => s.pos.v <= 10 ? 0.25 : 1.2 },
      },
      {
        title: '找出插座的火線',
        text: '插座是交流 110V 左右，要用 <b>ACV 250</b>（比 110 大的最小檔）。<br>分別量「左孔 ↔ 接地孔」和「右孔 ↔ 接地孔」：對地有電壓的那一孔就是<b>火線</b>，另一孔是中性線。',
        choice: { q: '哪一孔是火線？', opts: ['左孔', '右孔'], answer: () => B.out.hot === 'A' ? 0 : 1 },
        need: () => s.pos.k === 'ACV',
        needMsg: '先把檔位轉到 ACV（交流電壓）。',
      },
      {
        title: '量插座電壓',
        text: '量 <b>左孔 ↔ 右孔</b>（火線對中性線），這就是插座的供電電壓。',
        need: () => s.pos.k === 'ACV' && onPair('out', 'A', 'B'),
        needMsg: '請用 ACV 檔，兩支表筆分別碰插座左孔和右孔。',
        ask: { unit: 'V', answer: () => B.out.V, tol: () => s.pos.v <= 250 ? 5 : 30 },
      },
      {
        title: '量 220V 冷氣插座',
        text: '冷氣插座兩孔都是火線（L1 和 L2），之間是 220V。還是用 <b>ACV 250</b>。量左孔 ↔ 右孔。',
        need: () => s.pos.k === 'ACV' && onPair('out2', 'X', 'Y'),
        needMsg: '請用 ACV 檔，量冷氣插座左孔和右孔之間。',
        ask: { unit: 'V', answer: () => B.out2.V * 2, tol: () => s.pos.v <= 250 ? 7 : 30 },
      },
      {
        title: '零歐姆調整',
        text: '量電阻之前一定要<b>歸零</b>：<br>① 轉到 <b>Ω ×10</b>　② 讓兩支筆尖互碰：按「兩棒短接」，或在 3D 工作台把一支表筆拖到另一支的筆尖上　③ 拖動 <b>0Ω ADJ</b> 滑桿，讓指針剛好停在 Ω 刻度最右邊的 <b>0</b>。',
        auto: () => s.pos.k === 'OHM' && s.pos.v === 10 && s.shorted && zeroed(),
      },
      {
        title: '量電阻 R1',
        text: '保持 <b>Ω ×10</b>，把兩支表筆接在 R1 兩腳（電阻不分正負）。讀 Ω 刻度再 × 10。<br>指針停在刻度中間附近時最準。',
        need: () => s.pos.k === 'OHM' && on('r1'),
        needMsg: '請用 Ω 檔，兩支表筆接 R1 兩腳。',
        ask: { unit: 'Ω', answer: () => B.r1.R, rel: 0.12 },
      },
      {
        title: '量電阻 R2',
        text: 'R2 很大，用 ×10 時指針幾乎不動。換到 <b>Ω ×1k</b>，讓指針落在中段。<br><b>換檔之後要重新歸零</b>，再量 R2。可以輸入像 15k 這樣的寫法。',
        need: () => s.pos.k === 'OHM' && on('r2'),
        needMsg: '請用 Ω 檔，兩支表筆接 R2 兩腳。',
        ask: { unit: 'Ω', answer: () => B.r2.R, rel: 0.15 },
      },
      {
        title: '檢查開關通不通',
        text: '用 <b>Ω ×1</b>（先歸零）量開關的兩個端子，<b>ON 和 OFF 各量一次</b>（3D 工作台點開關的翹板；清單模式按「切到 ON／OFF」）。',
        need: () => s.swOn && s.swOff,
        needMsg: '還沒在已歸零的 Ω 檔下，把開關 ON、OFF 都量過一次。',
        choice: { q: '開關 OFF 時，指針停在哪裡？', opts: ['最右邊 0（導通）', '最左邊 ∞（不動）', '正中間'], answer: () => 1 },
      },
      {
        title: '冷燈泡的電阻',
        text: '60W 燈泡點亮時燈絲約 200Ω。量量看冷的時候是多少？用 <b>Ω ×1</b>（記得歸零），表筆接燈泡中心和螺紋。',
        need: () => s.pos.k === 'OHM' && on('lamp'),
        needMsg: '請用 Ω 檔，兩支表筆接燈泡的中心和螺紋。',
        ask: { unit: 'Ω', answer: () => B.lamp.R, rel: 0.15 },
        after: '鎢絲冷的時候電阻只有點亮時的 1/10 左右，所以燈泡剛開的瞬間電流特別大，也最容易在開燈時燒斷。',
      },
      {
        title: '收表',
        text: '全部量完了。把旋鈕轉回 <b>OFF</b>（或 ACV 最高檔），避免下次拿起來直接用錯檔位燒表。',
        auto: () => s.pos.k === 'OFF',
      },
    ];

    let step = Math.min(Store.data.meterStep || 0, TASKS.length);
    let wrongTries = 0;
    let afterMsg = null;
    let ansDraft = '';

    function parseVal(str) {
      const m = String(str).trim().replace(/,/g, '').match(/^([\d.]+)\s*([kKmM]?)/);
      if (!m) return NaN;
      const n = parseFloat(m[1]);
      return m[2] === 'k' || m[2] === 'K' ? n * 1000 : m[2] === 'M' ? n * 1e6 : n;
    }
    function scaleReading() {
      const f = s.lastF, p = s.pos;
      if (p.k === 'OHM') {
        if (f <= 0.005) return '指針停在 ∞（不動）';
        const sc = C * (1 - f) / f;
        return `指針約指在 Ω 刻度 ${sc < 10 ? sc.toFixed(1) : sc.toFixed(0)}，× ${p.v} = ${fmtOhm(sc * p.v)}`;
      }
      const rowMax = { 250: 250, 50: 50, 10: 10, 2.5: 250, 25: 250, 1000: 10 }[p.v];
      const mult = { 2.5: 0.01, 25: 0.1, 1000: 100 }[p.v] || 1;
      const sc = f * rowMax;
      return `指針約指在 0–${rowMax} 刻度的 ${sc.toFixed(rowMax === 10 ? 2 : 1)}${mult !== 1 ? `，× ${mult} = ${(sc * mult).toFixed(2)}` : ''}`;
    }
    function advance() {
      step++;
      wrongTries = 0;
      ansDraft = '';
      Store.data.meterStep = Math.max(Store.data.meterStep || 0, step);
      Store.save();
      updateOverall();
      beep(988, 0.08, 'sine', 0.05); setTimeout(() => beep(1319, 0.12, 'sine', 0.05), 90);
      if (step >= TASKS.length) toast('三用電表全部任務完成，迴路 05 通電！', 'ok');
      drawTask();
    }

    let autoTimer = null;
    function drawTask() {
      const steps = h('div', { class: 'task-steps', 'aria-hidden': 'true' }, TASKS.map((_, i) => h('i', { class: i < step ? 'done' : i === step ? 'cur' : '' })));
      if (step >= TASKS.length) {
        taskBox.replaceChildren(h('div', { class: 'task-card' }, steps,
          h('h3', {}, '全部完成！'),
          h('p', {}, '你已經會選檔位、讀刻度、歸零、量電壓和電阻了。工作台可以繼續自由練習；想重新跑一次任務也可以。'),
          afterMsg ? h('div', { class: 'callout ok small', html: afterMsg }) : null,
          h('div', { class: 'row' },
            h('button', { class: 'btn', type: 'button', onclick: () => { step = 0; afterMsg = null; drawTask(); } }, '從頭再練一次'),
            h('a', { class: 'btn btn-primary', href: '#fault' }, '前往故障偵探 →')),
        ));
        return;
      }
      const T = TASKS[step];
      const body = [steps, h('div', { class: 'eyebrow' }, `任務 ${step + 1} / ${TASKS.length}`), h('h3', {}, T.title), h('div', { class: 'prose', html: T.text })];
      if (afterMsg) body.splice(2, 0, h('div', { class: 'callout ok small', html: afterMsg }));
      if (T.auto) {
        const done = T.auto();
        body.push(h('div', { class: 'callout ' + (done ? 'ok' : ''), html: done ? '✓ 做到了！' : '完成後會自動進入下一個任務。' }));
        if (done && !autoTimer) autoTimer = setTimeout(() => { autoTimer = null; afterMsg = null; if (TASKS[step] === T && T.auto()) advance(); }, 700);
      }
      if (T.ask) {
        const inp = h('input', { type: 'text', inputmode: 'decimal', id: 'ans', placeholder: '讀值', autocomplete: 'off' });
        inp.value = ansDraft;
        inp.addEventListener('input', () => { ansDraft = inp.value; });
        const fb = h('div', {});
        const submit = () => {
          if (T.need && !T.need()) { fb.className = 'callout warn small'; fb.innerHTML = T.needMsg; return; }
          const val = parseVal(inp.value);
          if (isNaN(val)) { fb.className = 'callout warn small'; fb.textContent = '請輸入數字。'; return; }
          const ans = T.ask.answer();
          const tol = T.ask.rel ? ans * T.ask.rel : T.ask.tol();
          if (s.pos.k === 'OHM' && !zeroed()) {
            fb.className = 'callout warn small'; fb.innerHTML = '這一檔還<b>沒有歸零</b>，讀值會偏掉。先兩棒短接、調 0Ω ADJ，再接回來量。';
            return;
          }
          if (Math.abs(val - ans) <= tol) {
            afterMsg = `上一題答對：${T.title}，實際值 ${T.ask.unit === 'Ω' ? fmtOhm(ans) : ans + ' ' + T.ask.unit}。${T.after || ''}`;
            advance();
          } else {
            wrongTries++;
            fb.className = 'callout bad small';
            fb.innerHTML = '讀值差太多了，再看一次指針。' + (T.ask.unit === 'Ω' ? '記得 Ω 刻度要乘上倍率。' : '確認讀的是哪一排刻度。') +
              (wrongTries >= 2 ? `<br><b>讀值小幫手：</b>${scaleReading()}。` : '');
          }
        };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        body.push(h('div', { class: 'answer-row' }, h('label', { for: 'ans', class: 'small' }, '讀值'), inp, h('span', { class: 'mono' }, T.ask.unit), h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: submit }, '送出')), fb);
      }
      if (T.choice) {
        const fb = h('div', {});
        body.push(h('div', { class: 'small' }, h('b', {}, T.choice.q)), h('div', { class: 'row' }, T.choice.opts.map((o, i) => h('button', {
          class: 'btn btn-sm', type: 'button', onclick: () => {
            if (T.need && !T.need()) { fb.className = 'callout warn small'; fb.innerHTML = T.needMsg; return; }
            if (i === T.choice.answer()) {
              afterMsg = T.title === '找出插座的火線' ? `答對了，${hotHole()}是火線。插座接線時，火線要接到插座標示 L 的端子。` : '答對了：OFF 時接點斷開，電阻無限大，指針不動；ON 時導通，指針到 0。';
              advance();
            } else { fb.className = 'callout bad small'; fb.textContent = '不對喔，再量量看。'; beep(220, 0.15, 'sawtooth', 0.03); }
          },
        }, o))), fb);
      }
      const card = h('div', { class: 'task-card' }, body);
      const focused = document.activeElement && document.activeElement.id === 'ans';
      taskBox.replaceChildren(card);
      if (focused) { const i = card.querySelector('#ans'); if (i) i.focus(); }
    }

    let savedMode = null;
    try { savedMode = localStorage.getItem('peixian-dojo-bench'); } catch (e) { /* 忽略 */ }
    setMode(savedMode === 'list' || !can3d ? 'list' : '3d', false);
    select(0);
    drawProbes(); drawBench(); update();
  }

  function progress() { return Math.min(1, (Store.data.meterStep || 0) / 12); }

  return { render, progress };
})();
