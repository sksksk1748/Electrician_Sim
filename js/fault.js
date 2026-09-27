'use strict';
/* 迴路 05：故障偵探 —— 用儀表找出隱藏的故障 */
const Fault = (() => {
  const RW = 0.01;                    // 導線與接點電阻
  const LAMP_HOT = 110 * 110 / 60;
  const LAMP_COLD = 16.5;
  const HEATER = 11;                  // 1100W 電熱水壺

  const TPS = [
    { id: 'ML', n: 1, x: 80, y: 172, name: '主開關出線 L' },
    { id: 'MN', n: 2, x: 140, y: 172, name: '主開關出線 N' },
    { id: 'B1L', n: 3, x: 290, y: 210, name: '分路1 L' },
    { id: 'B1N', n: 4, x: 290, y: 250, name: '分路1 N' },
    { id: 'S1a', n: 5, x: 450, y: 120, name: '開關進線' },
    { id: 'S1b', n: 6, x: 530, y: 120, name: '開關出線' },
    { id: 'Hc', n: 7, x: 780, y: 120, name: '燈座中心' },
    { id: 'Hs', n: 8, x: 780, y: 250, name: '燈座螺紋' },
    { id: 'B2L', n: 9, x: 290, y: 350, name: '分路2 L' },
    { id: 'B2N', n: 10, x: 290, y: 390, name: '分路2 N' },
    { id: 'OL', n: 11, x: 640, y: 350, name: '插座 L' },
    { id: 'ON', n: 12, x: 640, y: 390, name: '插座 N' },
    { id: 'OE', n: 13, x: 640, y: 430, name: '插座 E' },
    { id: 'E', n: 14, x: 290, y: 470, name: '接地銅排' },
  ];
  const tp = id => TPS.find(t => t.id === id);
  const circ = n => '⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭'[n];

  const STORY_LAMP = { who: '陳先生（公寓住戶）', say: '客廳的燈，開關打開也不會亮。家裡其他地方的電都正常。' };
  const STORY_OUT = { who: '林太太（透天住戶）', say: '廚房那個插座不知道怎麼了，熱水壺插上去按了也不會熱。客廳燈是好的。' };
  const FAULTS = {
    open_w1: {
      group: 'lamp', label: '分路 1 到開關之間的火線斷了（開關進線沒電）', story: STORY_LAMP,
      explain: `S1 ON、送電時，${circ(3)}分路1 L 對 ${circ(4)} 有 110V，但 ${circ(5)}開關進線 對 ${circ(4)} 是 0V。電壓在 ${circ(3)} 到 ${circ(5)} 之間消失，斷點就在這一段線（常見是接頭鬆脫）。`,
    },
    sw_bad: {
      group: 'lamp', label: '開關 S1 內部接點壞了（切到 ON 也不導通）', story: STORY_LAMP,
      explain: `S1 ON 時 ${circ(5)} 有 110V、${circ(6)} 是 0V，電壓卡在開關。斷電後用 Ω 檔量 ${circ(5)}–${circ(6)}，ON 時仍是 OL（不通），開關壞了，更換即可。`,
    },
    open_w2: {
      group: 'lamp', label: '開關到燈座之間的線斷了', story: STORY_LAMP,
      explain: `S1 ON 時 ${circ(6)}開關出線 對 N 有 110V，但 ${circ(7)}燈座中心 是 0V。斷在 ${circ(6)} 到 ${circ(7)} 這段。`,
    },
    burnt: {
      group: 'lamp', label: '燈泡燈絲燒斷了', story: STORY_LAMP,
      explain: `S1 ON 時燈座兩端 ${circ(7)}–${circ(8)} 量得到 110V，燈卻不亮，表示電送到了但燈泡不通。斷電後量 ${circ(7)}–${circ(8)} 為 OL（冷燈絲正常約 16Ω），燈絲斷了。`,
    },
    open_w3: {
      group: 'lamp', label: '燈座回中性線的線斷了', story: STORY_LAMP,
      explain: `S1 ON 時 ${circ(7)}、${circ(8)} 用檢電起子都會亮，${circ(8)}螺紋 對 E 有 110V，但 ${circ(7)}–${circ(8)} 之間 0V。燈座兩端都是火線電位，代表回 N 的路斷了。這種狀況燈座螺紋帶電，很危險。`,
    },
    short_socket: {
      group: 'trip', label: '燈座內部短路（中心接點和螺紋相碰）',
      story: { who: '王小姐（租屋族）', say: '只要一打開客廳燈的開關，分電盤裡「分路 1」的開關就跳掉。' },
      explain: `斷電後把 S1 切到 ON，量 ${circ(3)}–${circ(4)} 電阻接近 0Ω（正常應是燈絲冷電阻約 16Ω）。再量 ${circ(7)}–${circ(8)} 也是 0Ω，短路點在燈座。`,
    },
    leak_outlet: {
      group: 'trip', label: '插座受潮，火線對地絕緣劣化（漏電）',
      story: { who: '張伯伯（老房子）', say: '總開關（漏電斷路器）跳了，推上去馬上又跳。最近下大雨，廚房牆壁有點濕。' },
      explain: `關掉分路 2 後總開關就不再跳，問題在分路 2。拔掉電器、斷電後用絕緣電阻計量 ${circ(11)}插座 L 對 ${circ(13)} 或 ${circ(14)}，只有約 0.002MΩ，遠低於 0.1MΩ：插座絕緣劣化漏電。`,
    },
    leak_app: {
      group: 'trip', label: '電熱水壺內部漏電',
      story: { who: '林太太（透天住戶）', say: '每次用熱水壺燒水，整間房子就停電，要去推總開關。' },
      explain: `熱水壺插著但不開時不會跳，一打開就跳。斷電後把熱水壺開關切到 ON，用絕緣電阻計量 ${circ(11)}–${circ(13)} 只有約 0.0015MΩ；拔掉熱水壺再量，變成 > 1000MΩ。漏電在電器本身，請客戶送修或更換。`,
    },
    open_w4: {
      group: 'outlet', label: '插座的火線斷了', story: STORY_OUT,
      explain: `${circ(9)}分路2 L 對 E 有 110V，但 ${circ(11)}插座 L 對 E 是 0V，檢電起子也不亮：火線在 ${circ(9)} 到 ${circ(11)} 之間斷了。`,
    },
    open_w5: {
      group: 'outlet', label: '插座的中性線斷了', story: STORY_OUT,
      explain: `${circ(11)} 對 ${circ(13)}（L 對地）有 110V，火線正常；但 ${circ(11)}–${circ(12)}（L 對 N）只有 0V，而且檢電起子碰 ${circ(12)} 會亮（電從熱水壺繞回來）。中性線斷了。`,
    },
  };
  const GROUP_HINT = {
    lamp: '從電源一路往燈量過去：分路有沒有電 → 開關進線 → 開關出線 → 燈座。<b>電壓在哪裡消失，斷點就在那一段。</b>量電壓時開關要 ON。',
    trip: '先用<b>分割法</b>：一次只送一個分路、一個電器，看是誰造成跳脫。短路用 Ω 檔（斷電）找；漏電用絕緣電阻計量「線對地」。',
    outlet: '先確認插座 L 對地（E）有沒有 110V，再量 L 對 N。兩個結果一比對，就知道斷的是火線還是中性線。',
  };

  const TOOLS = [
    { k: 'volt', name: '電表 V~', icon: '<svg viewBox="0 0 26 26"><rect x="4" y="2" width="18" height="22" rx="3" style="fill:#F2B705;stroke:#8a6a00"/><rect x="7" y="5" width="12" height="7" rx="1" style="fill:#C9D4B8"/><text x="13" y="20" text-anchor="middle" style="font-size:7px;font-weight:700;fill:#1c2421">V~</text></svg>', desc: '量兩點間的交流電壓（要送電）' },
    { k: 'ohm', name: '電表 Ω', icon: '<svg viewBox="0 0 26 26"><rect x="4" y="2" width="18" height="22" rx="3" style="fill:#F2B705;stroke:#8a6a00"/><rect x="7" y="5" width="12" height="7" rx="1" style="fill:#C9D4B8"/><text x="13" y="21" text-anchor="middle" style="font-size:9px;font-weight:700;fill:#1c2421">Ω</text></svg>', desc: '量電阻、通不通（必須斷電）' },
    { k: 'megger', name: '絕緣電阻計', icon: '<svg viewBox="0 0 26 26"><rect x="2" y="4" width="22" height="18" rx="3" style="fill:#C0261B"/><rect x="5" y="7" width="16" height="7" rx="1" style="fill:#C9D4B8"/><text x="13" y="20" text-anchor="middle" style="font-size:6px;font-weight:700;fill:#fff">MΩ</text></svg>', desc: '500V 量絕緣電阻（必須斷電）' },
    { k: 'pen', name: '檢電起子', icon: '<svg viewBox="0 0 26 26"><path d="M4 22L16 10" style="stroke:#555;stroke-width:3;stroke-linecap:round"/><rect x="14" y="3" width="6" height="12" rx="2" transform="rotate(45 17 9)" style="fill:#E5484D"/></svg>', desc: '碰一個點，亮 = 帶電' },
    { k: 'clamp', name: '鉤表', icon: '<svg viewBox="0 0 26 26"><path d="M13 4a7 7 0 1 1-6 3.5" style="fill:none;stroke:#1F4FA0;stroke-width:3.5"/><rect x="10" y="14" width="6" height="10" rx="2" style="fill:#1F4FA0"/></svg>', desc: '夾線量電流（要送電）' },
  ];

  function render(root) {
    const ch = CHAPTERS.find(c => c.id === 'fault');
    root.append(chapterHeader(ch, ch.sub));
    const schem = h('div', { class: 'schem-wrap' });
    const side = h('aside', { class: 'stack' });
    const below = h('div', { class: 'stack' });
    root.append(h('div', { class: 'fault' }, h('div', { class: 'stack' }, schem, below), side));

    let st, fault, tool = 'volt', probes = [], reading = null, log = [], count = 0, violations = 0, sol = null, answered = null, lastKey = null;

    function newCase() {
      const keys = Object.keys(FAULTS).filter(k => k !== lastKey);
      lastKey = pick(keys);
      fault = { key: lastKey, ...FAULTS[lastKey] };
      st = {
        main: 'on', b1: 'on', b2: 'on', plug: true,
        s1: fault.group === 'lamp' || fault.key === 'short_socket' ? 1 : 0,
        kettle: fault.group === 'outlet' || fault.key === 'leak_app',
      };
      probes = []; reading = null; log = []; count = 0; violations = 0; answered = null;
      const msgs = energize();
      if (msgs.length) pushLog('— ' + msgs.join('；'));
      drawAll();
    }

    function buildElems(mode) {
      const f = fault.key;
      const E = [];
      const W = (a, b, id) => E.push({ a, b, R: RW, id });
      if (st.main === 'on') { W('SRC_L', 'ML', 'mainL'); W('SRC_N', 'MN', 'mainN'); }
      if (st.b1 === 'on') { W('ML', 'B1L', 'b1L'); W('MN', 'B1N', 'b1N'); }
      if (st.b2 === 'on') { W('ML', 'B2L', 'b2L'); W('MN', 'B2N', 'b2N'); }
      if (f !== 'open_w1') W('B1L', 'S1a', 'w1');
      if (st.s1 && f !== 'sw_bad') W('S1a', 'S1b', 's1');
      if (f !== 'open_w2') W('S1b', 'Hc', 'w2');
      if (f !== 'burnt') E.push({ a: 'Hc', b: 'Hs', R: mode === 'hot' ? LAMP_HOT : LAMP_COLD, id: 'lamp' });
      if (f === 'short_socket') W('Hc', 'Hs', 'short');
      if (f !== 'open_w3') W('Hs', 'B1N', 'w3');
      if (f !== 'open_w4') W('B2L', 'OL', 'w4');
      if (f !== 'open_w5') W('B2N', 'ON', 'w5');
      W('E', 'OE', 'w6');
      if (f === 'leak_outlet') E.push({ a: 'OL', b: 'OE', R: 2000, id: 'leak' });
      if (st.plug) {
        W('OL', 'AL', 'cordL'); W('ON', 'AN', 'cordN'); W('OE', 'AB', 'cordE');
        if (st.kettle) W('AL', 'AS', 'ksw');
        E.push({ a: 'AS', b: 'AN', R: HEATER, id: 'heater' });
        if (f === 'leak_app') E.push({ a: 'AS', b: 'AB', R: 1500, id: 'leak2' });
      }
      return E;
    }

    /* 送電並檢查跳脫，回傳訊息 */
    function energize() {
      const msgs = [];
      sol = null;
      if (st.main !== 'on') return msgs;
      for (let iter = 0; iter < 4; iter++) {
        const E = buildElems('hot');
        const s = Circuit.solve(E, { SRC_L: 110, SRC_N: 0, E: 0 });
        const I = id => { const e = E.find(x => x.id === id); return e ? s.current(e) : 0; };
        if (st.b1 === 'on' && Math.abs(I('b1L')) > 20) { st.b1 = 'trip'; msgs.push('分路1 無熔絲開關跳脫'); continue; }
        if (st.b2 === 'on' && Math.abs(I('b2L')) > 20) { st.b2 = 'trip'; msgs.push('分路2 無熔絲開關跳脫'); continue; }
        const leak = Math.abs(I('w6'));
        if (leak > 0.03) { st.main = 'trip'; msgs.push(`漏電斷路器動作（漏電流約 ${Math.round(leak * 1000)}mA）`); return msgs; }
        sol = { s, E, I };
        return msgs;
      }
      return msgs;
    }
    const V = n => sol ? sol.s.V(n) : 0;
    const lampOn = () => sol && Math.abs(V('Hc') - V('Hs')) > 90;
    const kettleHot = () => sol && st.plug && st.kettle && Math.abs(V('AS') - V('AN')) > 90;

    function change(fn, label) {
      fn();
      const msgs = energize();
      if (msgs.length) {
        toast('⚡ ' + msgs.join('，'), 'bad');
        beep(140, 0.3, 'sawtooth', 0.05);
        pushLog(`— ${label}：${msgs.join('；')}`);
      } else pushLog(`— ${label}`);
      reading = null;
      drawAll();
    }
    const brkLabel = { on: 'ON', off: 'OFF', trip: '跳脫' };
    const toggleBrk = (k, name) => change(() => { st[k] = st[k] === 'on' ? 'off' : 'on'; }, `${name} → ${st[k] === 'on' ? 'OFF' : 'ON'}`);

    function pushLog(t) { log.unshift(t); if (log.length > 40) log.pop(); }

    /* ---------- 量測 ---------- */
    function measureAt(id) {
      if (answered) return;
      if (tool === 'clamp') return;
      if (tool === 'pen') {
        count++;
        const glow = sol && Math.abs(V(id)) > 60;
        reading = { mode: '檢電起子', val: glow ? '亮' : '不亮', sub: `${circ(tp(id).n)} ${tp(id).name}`, pen: glow };
        if (glow) beep(1500, 0.05, 'sine', 0.03);
        pushLog(`檢電 ${circ(tp(id).n)}：${glow ? '亮' : '不亮'}`);
        drawAll();
        return;
      }
      probes.push(id);
      if (probes.length > 2) probes = [id];
      if (probes.length < 2) { reading = null; drawAll(); return; }
      const [a, b] = probes;
      const na = circ(tp(a).n), nb = circ(tp(b).n);
      count++;
      if (tool === 'volt') {
        const v = Math.abs(V(a) - V(b));
        reading = { mode: 'AC V', val: v.toFixed(1) + ' V', sub: `紅 ${na} ${tp(a).name}／黑 ${nb} ${tp(b).name}` };
        pushLog(`V ${na}–${nb}：${v.toFixed(1)}V`);
      } else {
        const live = sol && (Math.abs(V(a)) > 5 || Math.abs(V(b)) > 5);
        if (live) {
          violations++;
          reading = { mode: tool === 'ohm' ? 'Ω' : 'MΩ 500V', val: '⚠ 帶電！', sub: '量電阻和絕緣電阻前必須先斷電（關掉分路或總開關）。', danger: true };
          toast('帶電中不能量電阻！先關掉電源。', 'bad');
          beep(140, 0.3, 'sawtooth', 0.05);
          pushLog(`${tool === 'ohm' ? 'Ω' : 'MΩ'} ${na}–${nb}：帶電中，錯誤操作`);
        } else {
          const R = Circuit.resistance(buildElems('cold'), a, b);
          if (tool === 'ohm') {
            const txt = !isFinite(R) || R > 40e6 ? 'OL' : R < 1 ? '0.0 Ω' : fmtOhm(R);
            reading = { mode: 'Ω', val: txt, sub: `${na} ${tp(a).name}／${nb} ${tp(b).name}${txt === 'OL' ? '（不通）' : R < 1 ? '（導通）' : ''}` };
            if (R < 1) beep(2400, 0.15, 'square', 0.03);
            pushLog(`Ω ${na}–${nb}：${txt}`);
          } else {
            const M = R / 1e6;
            const txt = !isFinite(R) || M > 1000 ? '> 1000 MΩ' : M.toPrecision(2) + ' MΩ';
            const good = !isFinite(R) || M >= 0.1;
            reading = { mode: 'MΩ 500V', val: txt, sub: `${na}–${nb}：${good ? '絕緣良好（≥ 0.1MΩ）' : '絕緣不良（< 0.1MΩ）'}${M < 0.001 ? '　（量到的可能是負載或短路）' : ''}` };
            pushLog(`MΩ ${na}–${nb}：${txt}`);
          }
        }
      }
      drawAll();
    }
    function clampAt(k, label) {
      if (answered) return;
      count++;
      let I = 0;
      if (sol) {
        const c = id => sol.I(id);
        I = { b1l: c('w1'), b1ln: c('w1') - c('w3'), b2l: c('w4'), b2ln: c('w4') + c('w5'), cord: st.plug ? c('cordL') + c('cordN') : 0 }[k];
      }
      I = Math.abs(I);
      const txt = I < 0.0005 ? '0.0 mA' : I < 1 ? (I * 1000).toFixed(0) + ' mA' : I.toFixed(2) + ' A';
      reading = { mode: '鉤表 A~', val: txt, sub: label };
      pushLog(`鉤表 ${label}：${txt}`);
      drawAll();
    }

    /* ---------- 繪圖 ---------- */
    function drawSchem() {
      const wire = (d, c) => `<path d="${d}" class="wire-halo" style="stroke-width:6"/><path d="${d}" class="wire-core" style="stroke:${c};stroke-width:3.5"/>`;
      const K = 'var(--w-black)', Wc = 'var(--w-white)', G = 'var(--w-green)';
      const hop = (x, y) => `M${x - 8} ${y}a8 8 0 0 1 16 0`;
      const brk = (x, y, w, hgt, stt, act, label, sub) => {
        const hy = stt === 'on' ? y + 14 : stt === 'trip' ? y + 26 : y + 38;
        return `<g class="clickable" data-act="${act}" tabindex="0" role="button" aria-label="${label} ${brkLabel[stt]}">
          <rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="6" class="brk-body"/>
          <rect x="${x + w / 2 - 9}" y="${y + 10}" width="18" height="44" rx="3" style="fill:#2A302D"/>
          <rect x="${x + w / 2 - 7}" y="${hy}" width="14" height="14" rx="2" style="fill:${stt === 'on' ? '#F2B705' : stt === 'trip' ? '#E5484D' : '#5A645E'}"/>
          <text x="${x + w / 2}" y="${y + hgt - 16}" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;font-weight:700;fill:${stt === 'on' ? '#1B7D45' : stt === 'trip' ? '#C0261B' : '#56615B'}">${brkLabel[stt]}</text>
          <text x="${x + w / 2}" y="${y + hgt - 4}" text-anchor="middle" style="font-size:9.5px;fill:#1c2421">${sub}</text></g>`;
      };
      let s = `<rect x="16" y="36" width="290" height="478" rx="12" style="fill:var(--enclosure);stroke:var(--enclosure-edge);stroke-width:2"/>
        <text x="26" y="28" class="schem-title">分電盤</text>
        <text x="80" y="14" text-anchor="middle" class="schem-txt">台電 L</text><text x="140" y="14" text-anchor="middle" class="schem-txt">N</text>`;
      s += wire('M80 18V70', K) + wire('M140 18V70', Wc);
      // 匯流排
      s += wire('M80 150V350', K) + wire('M140 150V390', Wc);
      s += wire('M80 210H132', K) + `<path d="${hop(140, 210)}" class="wire-halo" style="stroke-width:6;fill:none"/><path d="${hop(140, 210)}" class="wire-core" style="stroke:${K};stroke-width:3.5"/>` + wire('M148 210H190', K);
      s += wire('M140 250H190', Wc);
      s += wire('M80 350H132', K) + `<path d="${hop(140, 350)}" class="wire-halo" style="stroke-width:6;fill:none"/><path d="${hop(140, 350)}" class="wire-core" style="stroke:${K};stroke-width:3.5"/>` + wire('M148 350H190', K);
      s += wire('M140 390H190', Wc);
      s += wire('M260 210H290', K) + wire('M260 250H290', Wc) + wire('M260 350H290', K) + wire('M260 390H290', Wc);
      s += wire('M36 470H290', G) + `<path d="M36 470v16M24 486h24M28 493h16M32 500h8" style="stroke:var(--w-green);stroke-width:2.5;fill:none"/>`;
      s += `<text x="52" y="462" class="schem-txt">接地銅排</text>`;
      // 分路 1
      s += wire('M290 210H330V120H450', K) + wire('M530 120H780', K) + wire('M780 250H290', Wc);
      const s1on = st.s1 === 1;
      s += `<g class="clickable" data-act="s1" tabindex="0" role="button" aria-label="開關 S1 ${s1on ? 'ON' : 'OFF'}">
        <rect x="436" y="78" width="108" height="60" rx="8" style="fill:transparent"/>
        <path d="${s1on ? 'M450 120L530 120' : 'M450 120L520 88'}" class="schem-sym" style="stroke-width:3.5"/>
        <text x="490" y="74" text-anchor="middle" class="schem-title">S1 ${s1on ? 'ON' : 'OFF'}</text></g>`;
      const lit = lampOn();
      s += `<path d="M780 120V159M780 211V250" class="schem-sym"/>
        <circle cx="780" cy="185" r="44" fill="rgba(255,226,122,${lit ? 0.6 : 0})"/>
        <circle cx="780" cy="185" r="26" style="fill:${lit ? 'rgba(255,214,80,.95)' : 'var(--surface)'};stroke:var(--ink);stroke-width:2.2"/>
        <path d="M762 167L798 203M798 167L762 203" class="schem-sym"/>
        <text x="818" y="182" class="schem-title">客廳燈 H1</text><text x="818" y="200" class="schem-txt">60W</text>`;
      // 分路 2
      s += wire('M290 350H640', K) + wire('M290 390H640', Wc) + wire('M290 470H600V430H640', G);
      s += `<rect x="640" y="330" width="60" height="120" rx="8" class="schem-box"/>
        <text x="670" y="322" text-anchor="middle" class="schem-title">廚房插座</text>
        <text x="708" y="354" class="schem-txt" style="font-size:11px">L</text><text x="708" y="394" class="schem-txt" style="font-size:11px">N</text><text x="708" y="434" class="schem-txt" style="font-size:11px">E</text>`;
      // 熱水壺
      const hot = kettleHot();
      if (st.plug) s += wire('M700 350H800', K) + wire('M700 390H800', Wc) + wire('M700 430H800', G);
      else s += `<path d="M700 350H730M700 390H730M700 430H730" style="stroke:var(--ink-3);stroke-width:3;stroke-dasharray:4 4"/>`;
      s += `<g class="clickable" data-act="plug" tabindex="0" role="button" aria-label="${st.plug ? '拔下' : '插上'}熱水壺插頭"><rect x="718" y="330" width="70" height="120" fill="transparent"/>
        <text x="752" y="470" text-anchor="middle" class="schem-txt">${st.plug ? '插頭已插上' : '插頭已拔下'}</text></g>`;
      s += `<rect x="800" y="320" width="170" height="160" rx="10" style="fill:${hot ? 'rgba(229,72,77,.12)' : 'var(--surface-2)'};stroke:var(--ink-3);stroke-width:1.5;stroke-dasharray:6 4"/>
        <text x="885" y="312" text-anchor="middle" class="schem-title">電熱水壺 1100W</text>
        <path d="M800 350H830M870 350H910V358l8 5-16 6 16 6-16 6 8 5V390H800" class="schem-sym"/>
        <path d="M800 430H950" style="stroke:var(--w-green);stroke-width:2.5"/>
        <text x="880" y="450" text-anchor="middle" class="schem-txt">金屬外殼接地</text>
        <text x="930" y="376" class="schem-txt" style="fill:${hot ? '#C0261B' : 'var(--ink-3)'}">${hot ? '加熱中' : '未加熱'}</text>`;
      s += `<g class="clickable" data-act="kettle" tabindex="0" role="button" aria-label="熱水壺開關 ${st.kettle ? 'ON' : 'OFF'}"><rect x="820" y="326" width="62" height="40" fill="transparent"/>
        <path d="${st.kettle ? 'M830 350L870 350' : 'M830 350L864 332'}" class="schem-sym" style="stroke-width:3"/>
        <text x="850" y="378" text-anchor="middle" class="schem-txt" style="font-size:11px">${st.kettle ? 'ON' : 'OFF'}</text></g>`;
      // 斷路器
      s += `<g class="clickable" data-act="main" tabindex="0" role="button" aria-label="漏電斷路器 ${brkLabel[st.main]}">
          <rect x="50" y="70" width="120" height="80" rx="6" class="brk-body"/>
          <rect x="86" y="80" width="18" height="44" rx="3" style="fill:#2A302D"/>
          <rect x="88" y="${st.main === 'on' ? 84 : st.main === 'trip' ? 96 : 108}" width="14" height="14" rx="2" style="fill:${st.main === 'on' ? '#F2B705' : st.main === 'trip' ? '#E5484D' : '#5A645E'}"/>
          <text x="95" y="140" text-anchor="middle" style="font-size:10px;fill:#1c2421">漏電 30mA ${brkLabel[st.main]}</text></g>
        <g class="clickable" data-act="test" tabindex="0" role="button" aria-label="漏電斷路器測試按鈕"><circle cx="145" cy="100" r="10" style="fill:#F2B705;stroke:#8a6a00"/><text x="145" y="104" text-anchor="middle" style="font-size:10px;font-weight:700;fill:#1c2421">T</text></g>`;
      s += brk(190, 186, 70, 90, st.b1, 'b1', '分路1', '分路1 照明');
      s += brk(190, 326, 70, 90, st.b2, 'b2', '分路2', '分路2 插座');
      // 量測點
      TPS.forEach(t => {
        const pi = probes.indexOf(t.id);
        const ring = tool !== 'pen' && tool !== 'clamp' && pi >= 0 ? `<circle cx="${t.x}" cy="${t.y}" r="15" style="fill:none;stroke:${pi === 0 ? 'var(--w-red)' : 'var(--ink)'};stroke-width:3"/>` : '';
        s += `<g class="tp" data-tp="${t.id}" tabindex="0" role="button" aria-label="量測點 ${t.n} ${t.name}">${ring}<circle class="tp-dot" cx="${t.x}" cy="${t.y}" r="10"/><text x="${t.x}" y="${t.y + 4}" text-anchor="middle">${t.n}</text><title>${t.n} ${t.name}</title></g>`;
      });
      schem.innerHTML = `<svg viewBox="0 0 1000 520" role="img" aria-label="住宅線路圖">${s}</svg>`;
    }

    function drawSide() {
      const parts = [];
      parts.push(h('div', { class: 'card stack' },
        h('div', { class: 'eyebrow' }, `案件 · 已破案 ${Store.data.faultSolved || 0} 件`),
        h('div', { class: 'story' }, h('span', { class: 'who' }, fault.story.who + '：'), h('blockquote', {}, fault.story.say)),
        h('details', { class: 'hint' }, h('summary', {}, '查修思路'), h('p', { class: 'small', html: GROUP_HINT[fault.group] })),
      ));
      const toolBtns = h('div', { class: 'tools' }, TOOLS.map(t => h('button', {
        type: 'button', class: 'tool-btn' + (tool === t.k ? ' cur' : ''), title: t.desc,
        onclick: () => { tool = t.k; probes = []; reading = null; drawAll(); },
      }, h('span', { html: t.icon }), t.name)));
      const T = TOOLS.find(t => t.k === tool);
      const lcd = h('div', { class: 'lcd' + (reading && reading.danger ? ' danger' : '') },
        h('div', { class: 'lcd-mode' }, reading ? reading.mode : T.name),
        h('div', { class: 'lcd-val' }, reading ? reading.val : '— —'),
        h('div', { class: 'lcd-sub' }, reading ? reading.sub : (tool === 'pen' ? '點線路圖上的量測點' : tool === 'clamp' ? '選擇要夾的電線' : probes.length === 1 ? `紅棒在 ${circ(tp(probes[0]).n)}，再點第二個點` : '點兩個量測點（紅棒、黑棒）')),
      );
      const clampOpts = tool === 'clamp' ? h('div', { class: 'ctrl-grid' },
        [['b1l', '分路1 火線'], ['b1ln', '分路1 L+N 一起夾'], ['b2l', '分路2 火線'], ['b2ln', '分路2 L+N 一起夾'], ['cord', '熱水壺電線 L+N']].map(([k, l]) =>
          h('button', { type: 'button', class: 'btn btn-sm', onclick: () => clampAt(k, l) }, l))) : null;
      parts.push(h('div', { class: 'card stack' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', {}, '儀表'), h('span', { class: 'tiny muted' }, T.desc)),
        toolBtns, lcd, clampOpts,
        h('div', { class: 'tiny muted' }, `量測次數 ${count}` + (violations ? `・帶電誤量 ${violations} 次` : '')),
      ));
      const ctrl = (label, stt, act) => h('button', { type: 'button', class: 'btn btn-sm', onclick: () => doAct(act) }, `${label}：${stt}`);
      parts.push(h('div', { class: 'card stack' },
        h('h3', {}, '開關與插頭'),
        h('div', { class: 'ctrl-grid' },
          ctrl('總開關', brkLabel[st.main], 'main'), ctrl('分路1', brkLabel[st.b1], 'b1'), ctrl('分路2', brkLabel[st.b2], 'b2'),
          ctrl('S1', st.s1 ? 'ON' : 'OFF', 's1'), ctrl('插頭', st.plug ? '插上' : '拔下', 'plug'), ctrl('熱水壺', st.kettle ? 'ON' : 'OFF', 'kettle'),
          h('button', { type: 'button', class: 'btn btn-sm', onclick: () => doAct('test') }, '按測試鈕 T')),
        h('p', { class: 'tiny muted' }, '線路圖上的開關、斷路器、插頭也可以直接點。'),
      ));
      if (!answered) {
        const opts = fault.group === 'trip'
          ? Object.keys(FAULTS).filter(k => FAULTS[k].group === 'trip').concat(['open_w2'])
          : Object.keys(FAULTS).filter(k => FAULTS[k].group === fault.group).concat(fault.group === 'outlet' ? ['leak_outlet', 'burnt'] : ['short_socket']);
        const form = h('form', { class: 'stack' });
        const list = h('div', { class: 'diag-opts' }, shuffleStable(opts).map(k => h('label', { class: 'diag-opt' },
          h('input', { type: 'radio', name: 'diag', value: k }), FAULTS[k].label)));
        form.append(list, h('button', { class: 'btn btn-primary', type: 'submit' }, '提交診斷'));
        form.addEventListener('submit', e => {
          e.preventDefault();
          const v = form.querySelector('input[name="diag"]:checked');
          if (!v) return toast('先選一個診斷結果。');
          submit(v.value);
        });
        parts.push(h('div', { class: 'card stack' }, h('h3', {}, '你的診斷'), h('p', { class: 'small muted' }, '量到有把握了再提交。量測次數越少、沒有帶電誤量，星星越多。'), form));
      } else {
        const ok = answered.ok;
        parts.push(h('div', { class: 'card stack' },
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', {}, ok ? '破案！' : '診斷錯誤'), h('span', { html: starsHTML(answered.stars) })),
          h('div', { class: 'callout ' + (ok ? 'ok' : 'bad') }, h('b', {}, '真正的故障：'), fault.label),
          h('p', { class: 'small', html: '<b>怎麼找出來：</b>' + fault.explain }),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: newCase }, '下一個案件 →'),
        ));
      }
      side.replaceChildren(...parts);
    }
    let orderCache = null;
    function shuffleStable(arr) {
      const key = fault.key + arr.join();
      if (!orderCache || orderCache.key !== key) orderCache = { key, arr: shuffle(arr) };
      return orderCache.arr;
    }

    function drawBelow() {
      below.replaceChildren(
        h('div', { class: 'card stack' },
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', {}, '量測紀錄'), h('span', { class: 'tiny muted' }, '最新的在最上面')),
          log.length ? h('ul', { class: 'log' }, log.map((t, i) => h('li', { class: i === 0 ? 'new' : '' }, t))) : h('p', { class: 'small muted' }, '還沒有紀錄。選一個儀表，點線路圖上的數字量測點開始。'),
        ),
        h('details', { class: 'card hint' },
          h('summary', {}, '儀表使用說明'),
          h('ul', { class: 'steps', style: { listStyle: 'disc' } },
            h('li', { html: '<b>電表 V~</b>：要送電。量「某點 對 N」或「某點 對 E」，有 110V 表示這點有火線的電。' }),
            h('li', { html: '<b>電表 Ω</b>：<b>要斷電</b>（關掉該分路或總開關）。0Ω = 導通，OL = 不通。燈泡冷電阻約 16Ω。' }),
            h('li', { html: '<b>絕緣電阻計</b>：<b>要斷電</b>。量「線 對 地（E）」，低壓 150V 以下至少要 0.1MΩ。量線與線之間時，燈泡、電器要先拿掉，否則會量到負載。' }),
            h('li', { html: '<b>檢電起子</b>：只要碰一點，亮表示對地有電壓。' }),
            h('li', { html: '<b>鉤表</b>：夾單一條線量負載電流；L+N 一起夾，正常應為 0，有讀值就是漏電流。' }),
          ),
        ),
      );
    }
    function drawAll() { drawSchem(); drawSide(); drawBelow(); }

    function doAct(act) {
      if (act === 'main') return toggleBrk('main', '總開關');
      if (act === 'b1') return toggleBrk('b1', '分路1');
      if (act === 'b2') return toggleBrk('b2', '分路2');
      if (act === 's1') return change(() => { st.s1 ^= 1; }, `S1 → ${st.s1 ? 'OFF' : 'ON'}`);
      if (act === 'plug') return change(() => { st.plug = !st.plug; }, st.plug ? '拔下熱水壺插頭' : '插上熱水壺插頭');
      if (act === 'kettle') return change(() => { st.kettle = !st.kettle; }, `熱水壺 → ${st.kettle ? 'OFF' : 'ON'}`);
      if (act === 'test') {
        if (st.main === 'on') { st.main = 'trip'; energize(); pushLog('— 按下測試鈕：漏電斷路器正常跳脫'); toast('測試鈕：漏電斷路器正常動作。記得每個月測一次。', 'ok'); }
        else toast('總開關沒有送電，測試鈕不會有反應。');
        reading = null;
        drawAll();
      }
    }
    schem.addEventListener('click', e => {
      const a = e.target.closest('[data-act]');
      if (a) return doAct(a.dataset.act);
      const t = e.target.closest('[data-tp]');
      if (t) {
        if (tool === 'clamp') return toast('鉤表是夾電線用的，請在右邊選擇要夾哪一條。');
        measureAt(t.dataset.tp);
      }
    });
    schem.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const a = e.target.closest('[data-act]'), t = e.target.closest('[data-tp]');
      if (a || t) { e.preventDefault(); a ? doAct(a.dataset.act) : measureAt(t.dataset.tp); }
    });

    function submit(k) {
      const ok = k === fault.key;
      let stars = 0;
      if (ok) {
        stars = count <= 6 ? 3 : count <= 12 ? 2 : 1;
        if (violations) stars = Math.max(1, stars - 1);
        Store.data.faultSolved = (Store.data.faultSolved || 0) + 1;
        Store.data.faultStars = (Store.data.faultStars || 0) + stars;
        Store.save();
        updateOverall();
        beep(988, 0.08, 'sine', 0.05); setTimeout(() => beep(1319, 0.12, 'sine', 0.05), 90);
        if (Store.data.faultSolved === 4) toast('破案 4 件，迴路 05 通電！', 'ok');
      } else beep(220, 0.25, 'sawtooth', 0.04);
      answered = { ok, stars };
      drawAll();
    }

    newCase();
  }

  function progress() { return Math.min(1, (Store.data.faultSolved || 0) / 4); }
  return { render, progress };
})();
