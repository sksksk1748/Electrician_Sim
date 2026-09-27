'use strict';
/* 迴路 03：配線工坊 —— 在配線板上拉線、送電測試、自動評分 */
const Wiring = (() => {
  const LAMP_R = 110 * 110 / 60;   // 60W 燈泡點亮時約 201.7Ω
  const PILOT_R = 100000;          // 氖氣指示燈（含限流電阻）
  const TEST_LOAD = 1100;          // 檢查插座時假想插上的負載
  const W = 1000, H = 600;

  const COLORS = [
    { k: 'red', name: '紅', css: 'var(--w-red)', hint: '火線 L / L1' },
    { k: 'black', name: '黑', css: 'var(--w-black)', hint: '火線 L2 / 開關線' },
    { k: 'white', name: '白', css: 'var(--w-white)', hint: '中性線 N' },
    { k: 'green', name: '綠', css: 'var(--w-green)', hint: '接地 E' },
  ];
  const colorCss = k => (COLORS.find(c => c.k === k) || COLORS[0]).css;
  const colorName = k => (COLORS.find(c => c.k === k) || COLORS[0]).name;

  const PANEL_TERMS = {
    '1p2w': [
      { k: 'L', dy: 210, label: 'L 火線', wire: 'red' },
      { k: 'N', dy: 290, label: 'N 中性線', wire: 'white' },
      { k: 'E', dy: 430, label: 'E 接地', wire: 'green' },
    ],
    '1p3w': [
      { k: 'L1', dy: 200, label: 'L1 火線', wire: 'red' },
      { k: 'N', dy: 270, label: 'N 中性線', wire: 'white' },
      { k: 'L2', dy: 340, label: 'L2 火線', wire: 'black' },
      { k: 'E', dy: 430, label: 'E 接地', wire: 'green' },
    ],
  };
  const DEFS = {
    sw1: { w: 100, h: 120, terms: [['a', 30, '1'], ['b', 70, '2']], kind: '單切開關' },
    sw3: { w: 120, h: 120, terms: [['t1', 25, '1'], ['c', 60, 'C'], ['t2', 95, '2']], kind: '三路開關' },
    sw4: { w: 150, h: 120, terms: [['1', 25, '1'], ['2', 58, '2'], ['3', 92, '3'], ['4', 125, '4']], kind: '四路開關' },
    lamp: { w: 120, h: 150, terms: [['c', 35, '中心'], ['s', 85, '螺紋']], kind: '燈' },
    pilot: { w: 80, h: 120, terms: [['a', 22, '1'], ['b', 58, '2']], kind: '指示燈' },
    out110: { w: 130, h: 140, terms: [['L', 25, 'L'], ['N', 65, 'N'], ['E', 105, 'E']], kind: '插座 110V' },
    out220: { w: 130, h: 140, terms: [['X', 25, 'X'], ['Y', 65, 'Y'], ['E', 105, 'E']], kind: '冷氣插座 220V' },
  };

  const LEVELS = [
    {
      id: 'w1', name: '一燈一開關', supply: '1p2w',
      parts: [{ id: 'S1', type: 'sw1', x: 430, y: 360 }, { id: 'H1', type: 'lamp', x: 640, y: 40 }],
      expect: s => ({ H1: s.S1 === 1 }),
      goal: '用開關 S1 控制燈 H1：開關 ON 燈亮，OFF 燈熄。',
      concept: '電流要從火線 L 出發，經過開關、經過燈，再回到中性線 N，繞成一圈才會亮，這一圈叫「迴路」。開關就是放在這條路上的一道門，而且這道門要放在<b>火線</b>那一側。',
      steps: [
        '選<b>紅色</b>，點分電盤的 <b>L</b>（火線），再點開關 S1 的端子 <b>1</b>。',
        '換<b>黑色</b>，從 S1 的端子 <b>2</b> 拉到燈 H1 的<b>中心</b>端子（這段叫開關線，經過開關後的火線）。',
        '選<b>白色</b>，從分電盤 <b>N</b> 拉到燈 H1 的<b>螺紋</b>端子。',
        '點分電盤的<b>主開關</b>（或按「⚡ 送電」）送電，再把 S1 切到 <b>ON</b>，燈就會亮。最後按「檢查評分」。',
      ],
      learn: '這就是所有照明線路的基本型：<b>L → 開關 → 燈 → N</b>。術科題目再複雜，也都是這個形狀的變化。',
    },
    {
      id: 'w2', name: '燈與插座', supply: '1p2w',
      parts: [{ id: 'S1', type: 'sw1', x: 330, y: 360 }, { id: 'H1', type: 'lamp', x: 520, y: 40 }, { id: 'O1', type: 'out110', x: 730, y: 360 }],
      expect: s => ({ H1: s.S1 === 1 }), outlets: ['O1'],
      goal: '開關 S1 控制燈 H1；插座 O1 不受開關控制，永遠有電，而且要接地。',
      concept: '插座和燈是<b>並聯</b>在 L、N 之間的兩個分支。插座直接接 L 和 N，不經過開關；插座的 E 端子要用<b>綠線</b>接到分電盤的接地。',
      steps: [
        '先照第 1 關的方式接好燈：L →（紅）S1 →（黑）H1 中心，N →（白）H1 螺紋。',
        '插座 O1 的 <b>L</b> 用紅線接到分電盤 L（可以從分電盤直接拉，也可以從 S1 的端子 1 分出去）。',
        '插座 O1 的 <b>N</b> 用白線接到分電盤 N（或從燈的螺紋端分出去）。',
        '插座 O1 的 <b>E</b> 用<b>綠線</b>接到分電盤 E。',
      ],
      learn: '一個端子最多接兩條線，所以常會從上一個器具的端子「跳」到下一個，這叫<b>分歧</b>。只要電位相同（同是 L 或同是 N）就可以這樣接。',
    },
    {
      id: 'w3', name: '一開關控制兩燈', supply: '1p2w',
      parts: [{ id: 'S1', type: 'sw1', x: 420, y: 360 }, { id: 'H1', type: 'lamp', x: 520, y: 40 }, { id: 'H2', type: 'lamp', x: 770, y: 40 }],
      expect: s => ({ H1: s.S1 === 1, H2: s.S1 === 1 }),
      goal: '開關 S1 同時控制兩盞燈，而且兩盞都要全亮。',
      concept: '兩盞燈要<b>並聯</b>：每一盞的中心端都接到開關線，每一盞的螺紋端都接到 N。如果把兩盞燈頭尾相連（串聯），每盞只分到一半電壓，會很暗。',
      steps: [
        'L →（紅）S1 端子 1。',
        'S1 端子 2 →（黑）H1 中心，再從 H1 中心 →（黑）H2 中心。',
        'N →（白）H1 螺紋，再從 H1 螺紋 →（白）H2 螺紋。',
      ],
      learn: '判斷並聯的方法：每個負載的兩端，是不是分別直接連到「開關線」和「N」。只要中間夾了另一個負載，就是串聯。',
    },
    {
      id: 'w4', name: '三路開關：兩處控制', supply: '1p2w',
      parts: [{ id: 'S1', type: 'sw3', x: 330, y: 360 }, { id: 'H1', type: 'lamp', x: 560, y: 40 }, { id: 'S2', type: 'sw3', x: 760, y: 360 }],
      rule: { type: 'toggle', lamp: 'H1' },
      goal: '樓梯上下各有一個開關，兩個都能開關同一盞燈：不管燈現在亮不亮，切換任何一個開關都會讓燈改變。',
      concept: '三路開關的共同端 <b>C</b> 會輪流接到 <b>1</b> 或 <b>2</b>。兩個開關之間用兩條「跨接線」連起來：1 接 1、2 接 2。一個開關的 C 接火線，另一個開關的 C 接燈。',
      steps: [
        'L →（紅）S1 的 <b>C</b>。',
        'S1 的 1 →（黑）S2 的 1；S1 的 2 →（黑）S2 的 2（兩條跨接線）。',
        'S2 的 <b>C</b> →（黑）H1 中心。',
        'N →（白）H1 螺紋。',
      ],
      learn: '跨接線只連在開關之間，不接 L 也不接 N。兩個開關「位置相同」時電路接通，任一個切換就斷開，所以兩處都能控制。',
    },
    {
      id: 'w5', name: '四路開關：三處控制', supply: '1p2w',
      parts: [{ id: 'S1', type: 'sw3', x: 280, y: 360 }, { id: 'S3', type: 'sw4', x: 480, y: 360 }, { id: 'H1', type: 'lamp', x: 520, y: 40 }, { id: 'S2', type: 'sw3', x: 740, y: 360 }],
      rule: { type: 'toggle', lamp: 'H1' },
      goal: '三個地方控制同一盞燈：S1、S3、S2 任一個切換，燈都要改變。',
      concept: '四路開關夾在兩個三路開關的跨接線中間。它的 1、2 接一邊的跨接線，3、4 接另一邊；切換時在「平行（1–3、2–4）」與「交叉（1–4、2–3）」之間變換。',
      steps: [
        'L →（紅）S1 的 C；S2 的 C →（黑）H1 中心；N →（白）H1 螺紋。',
        'S1 的 1、2 →（黑）S3 的 1、2。',
        'S3 的 3、4 →（黑）S2 的 1、2。',
      ],
      learn: 'n 處控制一燈 = 2 個三路開關 + (n − 2) 個四路開關。這是學科常考題。',
    },
    {
      id: 'w6', name: '位置指示燈', supply: '1p2w',
      parts: [{ id: 'S1', type: 'sw1', x: 390, y: 360 }, { id: 'PL1', type: 'pilot', x: 560, y: 360 }, { id: 'H1', type: 'lamp', x: 680, y: 40 }],
      expect: s => ({ H1: s.S1 === 1, PL1: s.S1 === 0 }),
      goal: '晚上關燈時，開關上的小指示燈 PL1 要亮，方便找到開關；開燈時指示燈熄滅。',
      concept: '指示燈的電阻非常大（約 100kΩ），把它<b>並聯在開關兩端</b>：開關 OFF 時，微小電流經過指示燈和燈泡，指示燈發光但大燈幾乎不亮；開關 ON 時指示燈兩端被短路，所以熄滅。',
      steps: [
        '照第 1 關接好 L → S1 → H1 中心、N → H1 螺紋。',
        'PL1 的端子 1 接到 S1 的端子 1（紅，和 L 是同一段火線）。',
        'PL1 的端子 2 接到 S1 的端子 2（黑，和開關線相通）。',
      ],
      learn: '這種開關俗稱「螢光開關」。它也是個好例子：同一條電路，元件電阻大小不同，分到的電壓就差很多（分壓）。',
    },
    {
      id: 'w7', name: '單相三線與 220V 插座', supply: '1p3w',
      parts: [{ id: 'S1', type: 'sw1', x: 360, y: 360 }, { id: 'H1', type: 'lamp', x: 540, y: 40 }, { id: 'O2', type: 'out220', x: 760, y: 360 }],
      expect: s => ({ H1: s.S1 === 1 }), outlets: ['O2'],
      goal: '分電盤改成單相三線（L1、N、L2）。燈 H1 用 110V 並由 S1 控制；冷氣插座 O2 要拿到 220V 並接地。',
      concept: 'L1–N、L2–N 是 110V，L1–L2 是 220V。冷氣插座的 X、Y 兩個端子要分別接 <b>L1（紅）</b>與 <b>L2（黑）</b>，不接 N。',
      steps: [
        'L1 →（紅）S1 端子 1；S1 端子 2 →（黑）H1 中心；N →（白）H1 螺紋。',
        'L1 →（紅）O2 的 X；L2 →（黑）O2 的 Y。',
        'E →（綠）O2 的 E。',
      ],
      learn: '220V 迴路的兩條線都是火線，所以兩條都要受斷路器保護，不能只切一條。',
    },
  ];

  /* ---------- 電路分析 ---------- */
  function partTerms(p) {
    if (p.type === 'panel') return PANEL_TERMS[p.supply].map(t => ({ id: 'P.' + t.k, x: p.x + 190, y: p.y + t.dy, dir: 'right', label: t.label, panel: true }));
    const d = DEFS[p.type];
    return d.terms.map(([k, dx, label]) => ({ id: p.id + '.' + k, x: p.x + dx, y: p.y + d.h, dir: 'down', label }));
  }
  function internals(p, st) {
    const t = k => p.id + '.' + k;
    switch (p.type) {
      case 'sw1': return st ? [{ a: t('a'), b: t('b'), R: 0 }] : [];
      case 'sw3': return [{ a: t('c'), b: st ? t('t2') : t('t1'), R: 0 }];
      case 'sw4': return st ? [{ a: t('1'), b: t('4'), R: 0 }, { a: t('2'), b: t('3'), R: 0 }] : [{ a: t('1'), b: t('3'), R: 0 }, { a: t('2'), b: t('4'), R: 0 }];
      case 'lamp': return [{ a: t('c'), b: t('s'), R: LAMP_R }];
      case 'pilot': return [{ a: t('a'), b: t('b'), R: PILOT_R }];
      case 'out110': return [{ a: t('L'), b: t('N'), R: TEST_LOAD }];
      case 'out220': return [{ a: t('X'), b: t('Y'), R: TEST_LOAD * 2 }];
      default: return [];
    }
  }
  function sources(lv) {
    return lv.supply === '1p3w' ? { 'P.L1': 110, 'P.N': 0, 'P.L2': -110, 'P.E': 0 } : { 'P.L': 110, 'P.N': 0, 'P.E': 0 };
  }
  function analyze(lv, wires, states) {
    const elems = wires.map(w => ({ a: w.a, b: w.b, R: 0 }));
    lv.parts.forEach(p => elems.push(...internals(p, states[p.id] || 0)));
    const r = Circuit.solve(elems, sources(lv));
    if (r.short) return { short: true, a: r.a, b: r.b };
    const out = { short: false, targets: {}, outlets: {}, V: r.V, same: r.same };
    for (const p of lv.parts) {
      const V = k => r.V(p.id + '.' + k);
      if (p.type === 'lamp') {
        const v = V('c') - V('s');
        const ratio = v * v / LAMP_R / 60;
        out.targets[p.id] = ratio > 0.8 ? 'on' : ratio > 0.04 ? 'dim' : 'off';
        out[p.id + '_ratio'] = ratio;
      } else if (p.type === 'pilot') {
        out.targets[p.id] = Math.abs(V('a') - V('b')) > 60 ? 'on' : 'off';
      } else if (p.type === 'out110') {
        out.outlets[p.id] = { v: Math.abs(V('L') - V('N')), vL: V('L'), vN: V('N') };
      } else if (p.type === 'out220') {
        out.outlets[p.id] = { v: Math.abs(V('X') - V('Y')) };
      }
    }
    return out;
  }

  function termName(lv, id) {
    const [pid, k] = id.split('.');
    if (pid === 'P') return '分電盤 ' + (PANEL_TERMS[lv.supply].find(t => t.k === k) || {}).label;
    const p = lv.parts.find(x => x.id === pid);
    const d = DEFS[p.type];
    const t = d.terms.find(x => x[0] === k);
    return `${pid} 的「${t ? t[2] : k}」`;
  }
  function stateText(lv, st) {
    return lv.parts.filter(p => p.type.startsWith('sw')).map(p => {
      const v = st[p.id] || 0;
      if (p.type === 'sw1') return `${p.id}=${v ? 'ON' : 'OFF'}`;
      if (p.type === 'sw3') return `${p.id} 在 ${v ? '2' : '1'}`;
      return `${p.id} ${v ? '交叉' : '平行'}`;
    }).join('、');
  }
  const stateLabel = (p, v) => p.type === 'sw1' ? (v ? 'ON' : 'OFF') : p.type === 'sw3' ? (v ? '2' : '1') : (v ? '交叉' : '平行');

  function wiresUF(wires) {
    const par = new Map();
    const f = x => { if (!par.has(x)) par.set(x, x); while (par.get(x) !== x) x = par.get(x); return x; };
    wires.forEach(w => { const a = f(w.a), b = f(w.b); if (a !== b) par.set(a, b); });
    return { same: (a, b) => f(a) === f(b), find: f };
  }

  function grade(lv, wires) {
    const res = { fails: [], safety: [], style: [], rows: [], badWires: new Set() };
    if (!wires.length) { res.fails.push('板子上還沒有任何配線。'); return res; }
    const sws = lv.parts.filter(p => p.type.startsWith('sw'));
    const targets = lv.parts.filter(p => p.type === 'lamp' || p.type === 'pilot');
    const n = sws.length;
    const acts = [];
    let shortMsg = null, hotMsg = null;
    const mism = [];
    const outletMsgs = new Map();

    for (let m = 0; m < (1 << n); m++) {
      const st = {};
      sws.forEach((p, i) => { st[p.id] = (m >> i) & 1; });
      const a = analyze(lv, wires, st);
      const row = { st, short: a.short, act: {}, exp: {} };
      res.rows.push(row);
      if (a.short) {
        if (!shortMsg) shortMsg = `短路！${stateText(lv, st)} 時，${termName(lv, a.a)} 和 ${termName(lv, a.b)} 直接連在一起，斷路器會跳脫。`;
        acts.push(null);
        continue;
      }
      targets.forEach(p => { row.act[p.id] = a.targets[p.id]; });
      acts.push(row.act);
      if (lv.expect) {
        const exp = lv.expect(st);
        for (const [id, want] of Object.entries(exp)) {
          row.exp[id] = want ? 'on' : 'off';
          if (row.act[id] !== row.exp[id]) {
            row.bad = true;
            const actual = row.act[id] === 'dim' ? '很暗（亮度不足）' : row.act[id] === 'on' ? '亮了' : '沒亮';
            mism.push(`${stateText(lv, st)} 時，${id} 應該${want ? '亮' : '熄'}，但實際${actual}。`);
          }
        }
      }
      // 熄燈時燈座是否仍帶電
      lv.parts.filter(p => p.type === 'lamp').forEach(p => {
        if (a.targets[p.id] !== 'off' || hotMsg) return;
        if (Math.abs(a.V(p.id + '.c')) > 30 || Math.abs(a.V(p.id + '.s')) > 30) {
          hotMsg = `${stateText(lv, st)} 時 ${p.id} 雖然熄滅，但燈座仍然帶電。開關要接在<b>火線</b>上，不是中性線；否則換燈泡時會觸電。`;
        }
      });
      (lv.outlets || []).forEach(id => {
        const o = a.outlets[id];
        const p = lv.parts.find(x => x.id === id);
        if (p.type === 'out110') {
          if (o.v < 100) outletMsgs.set(id, `${id} 在 ${stateText(lv, st)} 時沒有 110V（量到 ${o.v.toFixed(0)}V）。插座要直接接 L 和 N，不經過開關。`);
          else if (Math.abs(o.vL) < 30 && Math.abs(o.vN) > 80 && !outletMsgs.has(id + 'pol')) outletMsgs.set(id + 'pol', `${id} 的 L、N 接反了（極性相反）：L 端子應接火線，N 端子應接中性線。`);
        } else if (p.type === 'out220') {
          if (o.v < 200) outletMsgs.set(id, `${id} 只量到 ${o.v.toFixed(0)}V，沒有 220V。X、Y 要分別接 L1 和 L2，不能接 N。`);
        }
      });
    }
    if (shortMsg) res.fails.push(shortMsg);
    if (mism.length) res.fails.push(...mism.slice(0, 2), ...(mism.length > 2 ? [`…另外還有 ${mism.length - 2} 種開關組合不正確，看下方真值表。`] : []));
    outletMsgs.forEach((msg, k) => (k.endsWith('pol') ? res.safety : res.fails).push(msg));

    if (lv.rule && lv.rule.type === 'toggle' && !shortMsg) {
      const id = lv.rule.lamp;
      if (acts.some(x => x && x[id] === 'dim')) res.fails.push(`${id} 在某些組合下很暗，代表有東西跟燈串聯了。`);
      let broken = null;
      for (let m = 0; m < acts.length && !broken; m++) {
        for (let i = 0; i < n; i++) {
          const m2 = m ^ (1 << i);
          if (acts[m][id] === acts[m2][id]) {
            const st = res.rows[m].st;
            broken = `從「${stateText(lv, st)}」切換 ${sws[i].id} 時，${id} 沒有跟著改變（一直${acts[m][id] === 'on' ? '亮' : '熄'}）。`;
            break;
          }
        }
      }
      if (broken) res.fails.push(broken);
      res.rows.forEach((r, m) => { if (!r.short) r.exp[id] = '切換'; });
    }
    if (hotMsg) res.safety.push(hotMsg);

    // 只看導線本身的連接
    const uf = wiresUF(wires);
    lv.parts.filter(p => p.type === 'lamp').forEach(p => {
      if (!uf.same(p.id + '.s', 'P.N')) res.safety.push(`${p.id} 的螺紋端沒有直接接到中性線 N。螺紋最容易被碰到，必須接 N。`);
    });
    (lv.outlets || []).forEach(id => {
      if (!uf.same(id + '.E', 'P.E')) res.safety.push(`${id} 的接地端子 E 沒有接到分電盤 E（綠線）。`);
    });
    if (uf.same('P.N', 'P.E')) res.safety.push('中性線 N 和接地線 E 被接在一起了。這會讓漏電斷路器誤動作，也可能讓外殼帶電。');

    // 顏色
    const hotKeys = lv.supply === '1p3w' ? ['P.L1', 'P.L2'] : ['P.L'];
    const colorIssues = new Set();
    for (const w of wires) {
      const isN = uf.same(w.a, 'P.N'), isE = uf.same(w.a, 'P.E');
      const isL1 = uf.same(w.a, hotKeys[0]), isL2 = hotKeys[1] && uf.same(w.a, hotKeys[1]);
      const roles = [isN, isE, isL1, isL2].filter(Boolean).length;
      if (roles > 1) continue;
      let ok, msg;
      if (isN) { ok = w.c === 'white'; msg = '中性線 N 要用白色'; }
      else if (isE) { ok = w.c === 'green'; msg = '接地線要用綠色'; }
      else if (isL1 && lv.supply === '1p3w') { ok = w.c === 'red'; msg = 'L1 火線用紅色'; }
      else if (isL2) { ok = w.c === 'black'; msg = 'L2 火線用黑色'; }
      else if (isL1) { ok = w.c === 'black' || w.c === 'red'; msg = '火線不可用白色或綠色'; }
      else { ok = w.c === 'black' || w.c === 'red'; msg = '開關線、跨接線要用黑或紅，不可用白色或綠色'; }
      if (!ok) { colorIssues.add(msg); res.badWires.add(w.id); }
    }
    colorIssues.forEach(m => res.style.push('線色：' + m + '。'));

    // 端子線數
    const cnt = new Map();
    wires.forEach(w => [w.a, w.b].forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1)));
    cnt.forEach((c, t) => { if (c > 2 && !t.startsWith('P.')) res.style.push(`${termName(lv, t)} 接了 ${c} 條線，一個端子最多 2 條。`); });
    return res;
  }

  /* ---------- 畫面 ---------- */
  function render(root) {
    const ch = CHAPTERS.find(c => c.id === 'wiring');
    root.append(chapterHeader(ch, ch.sub));
    const strip = h('div', { class: 'lvl-strip', role: 'tablist', 'aria-label': '關卡' });
    const board = h('div', { class: 'board-wrap' });
    const board3dBox = h('div', { class: 'board3d', hidden: true });
    const scrollHint = h('p', { class: 'scroll-hint' }, '↔ 配線板可以左右滑動。先點一個端子，滑到另一邊再點另一個端子。');
    const status = h('div', { class: 'status-line', 'aria-live': 'polite' });
    const palette = h('div', { class: 'palette', role: 'group', 'aria-label': '電線顏色' });
    const btnUndo = h('button', { class: 'btn btn-sm', type: 'button' }, '復原');
    const btnDel = h('button', { class: 'btn btn-sm', type: 'button', disabled: true }, '刪除選取的線');
    const btnClear = h('button', { class: 'btn btn-sm btn-ghost', type: 'button' }, '清空');
    const btnPower = h('button', { class: 'btn btn-sm', type: 'button' }, '⚡ 送電');
    const btnGrade = h('button', { class: 'btn btn-sm btn-primary', type: 'button' }, '檢查評分');
    /* 配線板兩種顯示方式：3D 工作台，或原本的平面配線板 */
    const can3d = typeof Board3D !== 'undefined' && typeof Bench3D !== 'undefined' && Bench3D.supported();
    const viewBtns = [['3d', '3D 工作台'], ['2d', '平面配線板']].map(([m, label]) =>
      h('button', { type: 'button', 'data-view': m, 'aria-pressed': 'false', onclick: () => setView(m, true) }, label));
    const viewSeg = h('div', { class: 'seg', role: 'group', 'aria-label': '配線板顯示方式' }, viewBtns);
    const side = h('aside', { class: 'wb-side' });
    root.append(strip, h('div', { class: 'wb' },
      h('section', { class: 'wb-main' },
        h('div', { class: 'bench-head' }, h('h3', {}, '配線板'), can3d ? viewSeg : null),
        h('div', { class: 'toolbar' }, palette, h('div', { class: 'row' }, btnUndo, btnDel, btnClear, btnPower, btnGrade)),
        status,
        scrollHint,
        board,
        board3dBox,
      ),
      side,
    ));

    let lv, wires, states, live, pending, selWire, color = 'red', undo = [], lastGrade = null, liveA = null;
    let powerHinted = false;           // 這一關是否已提醒過「要先送電」
    let view = '2d', board3d = null, left = false;
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '配線板' });
    board.append(svg);
    let rubber = null;

    COLORS.forEach((c, i) => {
      const b = h('button', { type: 'button', class: 'swatch', title: c.hint + '（快捷鍵 ' + (i + 1) + '）', 'data-c': c.k },
        h('i', { style: { background: c.css } }), `${c.name}・${c.hint}`);
      b.addEventListener('click', () => {
        color = c.k;
        if (selWire) {
          const w = wires.find(x => x.id === selWire);
          if (w) { pushUndo(); w.c = c.k; save(); }
        }
        drawPalette(); redraw();
      });
      palette.append(b);
    });
    const drawPalette = () => palette.querySelectorAll('.swatch').forEach(b => b.classList.toggle('cur', b.dataset.c === color));

    /* 目前的顯示方式重畫一次 */
    function redraw() {
      if (!lv) return;
      if (view === '3d') { if (board3d) board3d.sync(); }
      else draw();
    }

    function loadLevel(i) {
      lv = LEVELS[i];
      wires = (Store.data.wires[lv.id] || []).map(w => ({ ...w }));
      states = {};
      lv.parts.forEach(p => { if (p.type.startsWith('sw')) states[p.id] = 0; });
      live = false; pending = null; selWire = null; undo = []; lastGrade = null; liveA = null; powerHinted = false;
      btnPower.textContent = '⚡ 送電';
      btnPower.classList.remove('btn-danger');
      btnDel.disabled = true;
      drawStrip(); drawSide(); redraw(); drawPalette(); setStatus();
    }
    function drawStrip() {
      strip.replaceChildren(...LEVELS.map((L, i) => h('button', {
        type: 'button', role: 'tab', 'aria-selected': L === lv ? 'true' : 'false',
        class: 'lvl-chip' + (L === lv ? ' cur' : ''), onclick: () => loadLevel(i),
      }, h('span', { class: 'n' }, `第 ${i + 1} 關`), h('span', { class: 't' }, L.name), h('span', { html: starsHTML(Store.data.stars[L.id] || 0) }))));
    }
    function save() { Store.data.wires[lv.id] = wires; Store.save(); lastGrade = null; drawSide(); }
    function pushUndo() { undo.push(JSON.stringify(wires)); if (undo.length > 60) undo.shift(); }
    function setStatus(msg, kind) {
      status.style.color = kind === 'bad' ? 'var(--bad)' : '';
      if (msg) { status.innerHTML = msg; return; }
      if (live) status.innerHTML = '<b>送電中</b>：點開關切換看看。要改配線請先斷電。';
      else if (pending) status.innerHTML = `從 <b>${termName(lv, pending)}</b> 拉線中：點另一個端子完成，按 <span class="kbd">Esc</span> 或點空白處取消。`;
      else if (selWire) status.innerHTML = '已選取一條線：點顏色可改色，按「刪除選取的線」或 <span class="kbd">Delete</span> 刪除。';
      else if (view === '3d') status.innerHTML = '點一個端子、再點另一個端子就能拉線，也可以直接從端子<b>拖曳</b>到另一個端子。拖曳空白處轉視角，滾輪或兩指縮放。';
      else status.innerHTML = '點一個端子開始拉線，再點另一個端子完成。先在上方選好電線顏色。';
    }

    function drawSide() {
      const s = Store.data.stars[lv.id] || 0;
      const idx = LEVELS.indexOf(lv);
      const parts = [
        h('div', { class: 'card stack' },
          h('div', { class: 'eyebrow' }, `第 ${idx + 1} 關 · ${lv.supply === '1p3w' ? '1φ3W 110/220V' : '1φ2W 110V'}`),
          h('h3', {}, lv.name),
          h('p', {}, lv.goal),
          h('div', { class: 'callout small', html: lv.concept }),
          h('details', { class: 'hint' }, h('summary', {}, '看步驟提示'), h('ol', { class: 'steps' }, lv.steps.map(t => h('li', { html: t })))),
        ),
      ];
      if (lastGrade) {
        const g = lastGrade;
        const pass = !g.fails.length;
        const stars = pass ? 1 + (g.safety.length ? 0 : 1) + (g.style.length ? 0 : 1) : 0;
        const items = [
          ...g.fails.map(t => ({ c: 'fail', ic: '✕', t })),
          ...g.safety.map(t => ({ c: 'safety', ic: '!', t })),
          ...g.style.map(t => ({ c: 'style', ic: '!', t })),
        ];
        if (pass) items.unshift({ c: 'pass', ic: '✓', t: '功能正確：每一種開關組合都符合要求。' });
        if (pass && !g.safety.length) items.push({ c: 'pass', ic: '✓', t: '用電安全：開關在火線、燈座螺紋接 N、接地完整。' });
        if (pass && !g.style.length) items.push({ c: 'pass', ic: '✓', t: '線色與端子正確。' });
        const sws = lv.parts.filter(p => p.type.startsWith('sw'));
        const tg = lv.parts.filter(p => p.type === 'lamp' || p.type === 'pilot');
        const sym = v => v === 'on' ? '亮' : v === 'dim' ? '暗' : v === 'off' ? '熄' : v || '';
        const table = h('table', { class: 'truth' },
          h('thead', {}, h('tr', {}, sws.map(p => h('th', {}, p.id)), tg.map(p => h('th', {}, p.id + ' 要求')), tg.map(p => h('th', {}, p.id + ' 實際')))),
          h('tbody', {}, g.rows.map(r => h('tr', {},
            sws.map(p => h('td', {}, stateLabel(p, r.st[p.id]))),
            tg.map(p => h('td', {}, sym(r.exp[p.id]) || '—')),
            r.short ? h('td', { class: 'bad', colspan: tg.length }, '短路') :
              tg.map(p => h('td', { class: (r.exp[p.id] && r.exp[p.id] !== '切換' && r.exp[p.id] !== r.act[p.id]) || r.act[p.id] === 'dim' ? 'bad' : '' }, sym(r.act[p.id]))),
          ))));
        parts.push(h('div', { class: 'card stack' },
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', {}, pass ? '通過！' : '還沒通過'), h('span', { html: starsHTML(stars) })),
          h('ul', { class: 'result-list' }, items.map(x => h('li', { class: x.c }, h('span', { class: 'ic' }, x.ic), h('span', { html: x.t })))),
          h('div', { class: 'table-scroll' }, table),
          h('p', { class: 'small muted', html: '評分時會自動模擬上表每一種開關組合，不需要先送電。想親眼看燈亮：點分電盤的<b>主開關</b>送電，再把開關切到 ON。' }),
          pass ? h('div', { class: 'callout ok small', html: '<b>學到了：</b>' + lv.learn }) : null,
          pass && idx + 1 < LEVELS.length ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => loadLevel(idx + 1) }, '下一關 →') : null,
          pass && idx + 1 === LEVELS.length ? h('a', { class: 'btn btn-primary', href: '#home' }, '全部完成，回配電盤') : null,
        ));
      } else {
        parts.push(h('div', { class: 'card small muted stack' },
          h('div', {}, '評分標準：'),
          h('div', { html: '★ 功能正確（每種開關組合都測）<br>★ 用電安全（開關在火線、燈座螺紋接 N、有接地）<br>★ 線色與端子數正確' }),
          s ? h('div', { html: '目前最佳：' + starsHTML(s) }) : null,
        ));
      }
      side.replaceChildren(...parts);
    }

    /* ---------- 平面配線板 ---------- */
    function termPos(id) {
      for (const p of allParts()) for (const t of partTerms(p)) if (t.id === id) return t;
      return null;
    }
    function allParts() { return [{ id: 'P', type: 'panel', x: 20, y: 40, supply: lv.supply }, ...lv.parts]; }
    function wirePath(t1, t2, off) {
      const dist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const sag = Math.min(105, 34 + dist * 0.16) + off;
      const v = d => d === 'right' ? [1, 0] : [0, 1];
      const [ax, ay] = v(t1.dir), [bx, by] = v(t2.dir);
      return `M${t1.x} ${t1.y} C${t1.x + ax * sag} ${t1.y + ay * sag} ${t2.x + bx * sag} ${t2.y + by * sag} ${t2.x} ${t2.y}`;
    }

    function drawPanel(p) {
      const g = sv('g', { transform: `translate(${p.x},${p.y})` });
      const terms = PANEL_TERMS[p.supply];
      g.innerHTML = `
        <rect x="0" y="0" width="190" height="470" rx="12" style="fill:var(--enclosure);stroke:var(--enclosure-edge);stroke-width:2"/>
        <text x="16" y="-10" class="part-title">分電盤</text>
        <text x="16" y="26" style="font-family:var(--font-mono);font-size:11px;fill:var(--ink-2)">${p.supply === '1p3w' ? '1φ3W 110/220V' : '1φ2W 110V'}</text>`;
      const brk = sv('g', { class: 'clickable', 'data-act': 'power', transform: 'translate(40,44)' });
      brk.innerHTML = `
        <title>主開關：點一下送電／斷電</title>
        <rect x="0" y="0" width="100" height="110" rx="6" class="brk-body"/>
        <rect x="37" y="20" width="26" height="54" rx="4" style="fill:#2A302D"/>
        <rect x="40" y="${live ? 23 : 49}" width="20" height="22" rx="3" style="fill:${live ? '#F2B705' : '#5A645E'}"/>
        <text x="50" y="14" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;font-weight:700;fill:${live ? '#1B7D45' : '#6A746E'}">${live ? 'ON' : 'OFF'}</text>
        <text x="50" y="92" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:#1c2421">NFB 20A</text>
        <text x="50" y="104" text-anchor="middle" style="font-family:var(--font-mono);font-size:9px;fill:#56615B">${p.supply === '1p3w' ? '2P (L1·L2)' : '2P'}</text>`;
      g.append(brk);
      // 盤內匯流線
      const xs = p.supply === '1p3w' ? { L1: 58, N: 90, L2: 122 } : { L: 70, N: 110 };
      let bus = '';
      terms.forEach(t => {
        if (t.k === 'E') {
          bus += `<path d="M20 ${t.dy}H190" class="wire-halo"/><path d="M20 ${t.dy}H190" class="wire-core" style="stroke:var(--w-green)"/>
            <path d="M20 ${t.dy}v14M8 ${t.dy + 14}h24M12 ${t.dy + 20}h16M16 ${t.dy + 26}h8" style="stroke:var(--w-green);stroke-width:2.5;fill:none"/>`;
        } else {
          const x = xs[t.k];
          const d = `M${x} 154V${t.dy}H190`;
          bus += `<path d="${d}" class="wire-halo"/><path d="${d}" class="wire-core" style="stroke:${colorCss(t.wire)}"/>`;
        }
        bus += `<text x="182" y="${t.dy - 10}" text-anchor="end" style="font-size:12px;font-weight:700;fill:var(--ink)">${t.label}</text>`;
      });
      const busG = sv('g', {});
      busG.innerHTML = bus;
      g.insertBefore(busG, brk);
      return g;
    }

    function drawPart(p) {
      const d = DEFS[p.type];
      const st = states[p.id] || 0;
      const isSw = p.type.startsWith('sw');
      const g = sv('g', { transform: `translate(${p.x},${p.y})`, class: isSw ? 'sw-live' : '', 'data-sw': isSw ? p.id : null });
      let s = `<text x="0" y="-8" class="part-title">${p.id} ${d.kind}</text>`;
      const lead = (x1, y1, x2) => `<path d="M${x1} ${y1}V${d.h - 22}L${x2} ${d.h}" class="lead"/>`;
      const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="4.5" style="fill:var(--plate-ink)"/>`;
      const ct = (dd) => `<path d="${dd}" class="contact"/>`;
      if (isSw) s += `<rect x="0" y="0" width="${d.w}" height="${d.h - 22}" rx="8" class="plate"/>`;
      if (p.type === 'sw1') {
        s += lead(30, 70, 30) + lead(70, 70, 70) + dot(30, 70) + dot(70, 70) + (st ? ct('M30 70L70 70') : ct('M30 70L64 42'));
        s += `<text x="50" y="26" text-anchor="middle" class="plate-ink">${st ? 'ON' : 'OFF'}</text>`;
      } else if (p.type === 'sw3') {
        s += lead(25, 40, 25) + lead(60, 76, 60) + lead(95, 40, 95) + dot(25, 40) + dot(95, 40) + dot(60, 76) + ct(st ? 'M60 76L95 40' : 'M60 76L25 40');
        s += `<text x="60" y="24" text-anchor="middle" class="plate-ink">C→${st ? '2' : '1'}</text>`;
      } else if (p.type === 'sw4') {
        const X = [25, 58, 92, 125];
        X.forEach(x => { s += lead(x, 80, x) + dot(x, 80); });
        s += st ? ct('M25 80C25 38 125 38 125 80') + ct('M58 80C58 52 92 52 92 80') : ct('M25 80C25 30 92 30 92 80') + ct('M58 80C58 44 125 44 125 80');
        s += `<text x="75" y="18" text-anchor="middle" class="plate-ink">${st ? '交叉 1-4 2-3' : '平行 1-3 2-4'}</text>`;
      } else if (p.type === 'lamp') {
        const ratio = liveA && !liveA.short ? (liveA[p.id + '_ratio'] || 0) : 0;
        const b = live ? clamp(ratio, 0, 1) : 0;
        s += `<circle cx="60" cy="50" r="58" fill="url(#wbGlow)" opacity="${(b * 0.95).toFixed(2)}"/>
          <circle cx="60" cy="50" r="34" style="fill:${b > 0.03 ? `rgba(255,214,80,${0.3 + 0.7 * b})` : 'var(--bulb-off)'};stroke:var(--plate-edge);stroke-width:2"/>
          <path d="M48 70V58L53 40L58 58L62 40L67 58L72 40L72 58V70" style="fill:none;stroke:${b > 0.03 ? '#B86E00' : '#7a7a70'};stroke-width:2"/>
          <rect x="38" y="84" width="44" height="30" rx="4" style="fill:#BDBDB3;stroke:var(--plate-edge)"/>
          <path d="M38 92h44M38 100h44M38 108h44" style="stroke:#8f8f86;stroke-width:2"/>
          <path d="M60 114V122L35 ${d.h - 16}V${d.h}" class="lead"/><path d="M82 100H92L85 ${d.h - 16}V${d.h}" class="lead"/>`;
        if (live && ratio > 0.04 && ratio <= 0.8) s += `<text x="100" y="30" class="part-note">很暗</text>`;
      } else if (p.type === 'pilot') {
        const on = live && liveA && !liveA.short && liveA.targets[p.id] === 'on';
        s += `<rect x="0" y="0" width="${d.w}" height="${d.h - 22}" rx="8" class="plate"/>
          <circle cx="40" cy="40" r="22" fill="#FF7A1A" opacity="${on ? 0.45 : 0}"/>
          <circle cx="40" cy="40" r="11" style="fill:${on ? '#FF8A3D' : '#8d6a55'};stroke:var(--plate-ink);stroke-width:1.5"/>
          <path d="M22 70V${d.h - 22}M58 70V${d.h - 22}M22 70H32M58 70H48" class="lead"/>`;
      } else if (p.type === 'out110' || p.type === 'out220') {
        const o = live && liveA && !liveA.short ? liveA.outlets[p.id] : null;
        s += `<rect x="0" y="0" width="${d.w}" height="${d.h - 22}" rx="12" class="plate"/>`;
        s += p.type === 'out110'
          ? `<rect x="42" y="22" width="9" height="28" rx="2" style="fill:var(--plate-ink)"/><rect x="79" y="22" width="9" height="28" rx="2" style="fill:var(--plate-ink)"/>`
          : `<rect x="30" y="30" width="28" height="9" rx="2" style="fill:var(--plate-ink)"/><rect x="72" y="30" width="28" height="9" rx="2" style="fill:var(--plate-ink)"/>`;
        s += `<path d="M56 74a9 9 0 0 1 18 0v8h-18z" style="fill:var(--plate-ink)"/>`;
        if (o) s += `<rect x="30" y="${d.h - 52}" width="70" height="20" rx="4" style="fill:${o.v > 100 ? '#1B7D45' : '#8a2a20'}"/><text x="65" y="${d.h - 37}" text-anchor="middle" style="font-family:var(--font-mono);font-size:12px;font-weight:700;fill:#fff">${o.v.toFixed(0)} V</text>`;
        d.terms.forEach(([, x]) => { s += `<path d="M${x} ${d.h - 22}V${d.h}" class="lead"/>`; });
      }
      g.innerHTML = s;
      return g;
    }

    function draw() {
      svg.replaceChildren();
      svg.innerHTML = `<defs>
        <radialGradient id="wbGlow"><stop offset="0" stop-color="#FFE27A" stop-opacity=".95"/><stop offset="1" stop-color="#FFE27A" stop-opacity="0"/></radialGradient>
        <pattern id="grain" width="120" height="18" patternUnits="userSpaceOnUse"><path d="M0 9C30 4 60 14 120 8" style="stroke:var(--board-grain);stroke-width:2;fill:none"/></pattern>
        </defs>
        <rect width="${W}" height="${H}" style="fill:var(--board)"/><rect width="${W}" height="${H}" fill="url(#grain)" opacity=".7"/>`;
      const parts = allParts();
      svg.append(drawPanel(parts[0]));
      lv.parts.forEach(p => svg.append(drawPart(p)));

      // 導線
      const pairCount = new Map();
      const gW = sv('g', {});
      wires.forEach(w => {
        const t1 = termPos(w.a), t2 = termPos(w.b);
        if (!t1 || !t2) return;
        const key = [w.a, w.b].sort().join('|');
        const k = pairCount.get(key) || 0;
        pairCount.set(key, k + 1);
        const d = wirePath(t1, t2, k * 16);
        const g = sv('g', { 'data-w': w.id });
        if (w.id === selWire) g.append(sv('path', { d, class: 'wire-sel' }));
        if (lastGrade && lastGrade.badWires.has(w.id)) g.append(sv('path', { d, style: 'stroke:var(--bad);stroke-width:12;fill:none;opacity:.35;stroke-dasharray:6 5' }));
        g.append(sv('path', { d, class: 'wire-halo' }), sv('path', { d, class: 'wire-core', style: `stroke:${colorCss(w.c)}` }), sv('path', { d, class: 'wire-hit' }));
        gW.append(g);
      });
      svg.append(gW);

      // 端子
      parts.forEach(p => partTerms(p).forEach(t => {
        const tg = sv('g', { class: 'term' + (pending === t.id ? ' pending' : ''), 'data-t': t.id, transform: `translate(${t.x},${t.y})` });
        tg.append(sv('circle', { r: 16, class: 'term-hit' }), sv('circle', { r: 7.5, class: 'term-screw' }), sv('path', { d: 'M-4 -4L4 4', class: 'term-slot' }));
        if (!t.panel) tg.append(sv('text', { y: 26, 'text-anchor': 'middle', class: 'term-label' }, t.label));
        tg.append(sv('title', {}, termName(lv, t.id)));
        svg.append(tg);
      }));
      rubber = sv('path', { class: 'rubber', style: `stroke:${colorCss(color)}`, d: '' });
      svg.append(rubber);
    }

    function flashTrip(msg) {
      if (view === '3d') { if (board3d) board3d.flashTrip(); }
      else {
        const g = sv('g', { class: 'trip-flash' });
        g.innerHTML = `<rect width="${W}" height="${H}" fill="#E23B2E" opacity=".35"/>
          <text x="${W / 2}" y="${H / 2}" text-anchor="middle" style="font-family:var(--font-display);font-size:54px;font-weight:700;fill:#fff;stroke:#7a120b;stroke-width:2">⚡ 短路跳脫！</text>`;
        svg.append(g);
        setTimeout(() => g.remove(), 1500);
      }
      setStatus(msg, 'bad');
    }

    function evalLive() {
      liveA = analyze(lv, wires, states);
      if (liveA.short) {
        live = false;
        const msg = `<b>短路！</b>${termName(lv, liveA.a)} 和 ${termName(lv, liveA.b)} 直接接通了，斷路器跳脫。檢查看看是哪條線把火線和中性線（或接地）接在一起。`;
        liveA = null;
        btnPower.textContent = '⚡ 送電';
        btnPower.classList.remove('btn-danger');
        beep(140, 0.35, 'sawtooth', 0.06);
        redraw();
        flashTrip(msg);
        return;
      }
      redraw();
      // 送電了但燈都沒亮：告訴使用者是開關還沒切，還是配線有問題
      const lamps = lv.parts.filter(p => p.type === 'lamp');
      if (lamps.length && !lamps.some(p => liveA.targets[p.id] === 'on')) {
        const offs = lv.parts.filter(p => p.type === 'sw1' && !states[p.id]).map(p => p.id);
        setStatus(`<b>送電中</b>：燈還沒亮。${offs.length ? `${offs.join('、')} 目前是 <b>OFF</b>，點開關切到 ON 看看。` : '切換開關看看；如果怎麼切都不亮，就是配線有問題，按「檢查評分」看哪裡錯。'}`);
      } else setStatus();
    }
    function setPower(on) {
      if (on && !wires.length) { toast('板子上還沒有配線。'); return; }
      live = on; pending = null; selWire = null;
      btnPower.textContent = on ? '斷電' : '⚡ 送電';
      btnPower.classList.toggle('btn-danger', on);
      btnDel.disabled = true;
      if (on) { beep(520, 0.06); evalLive(); } else { liveA = null; redraw(); setStatus(); }
    }

    /* ---------- 操作（平面與 3D 共用） ---------- */
    const busy = () => { toast('帶電中不可施工！請先斷電再改配線。', 'bad'); };
    function addWire(a, b) {
      if (wires.some(w => (w.a === a && w.b === b) || (w.b === a && w.a === b))) { toast('這兩個端子之間已經有一條線了。'); return; }
      pushUndo();
      const nid = 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
      wires.push({ id: nid, a, b, c: color });
      save();
      beep(1200, 0.03);
    }
    function clickTerminal(id) {
      if (live) return busy();
      selWire = null; btnDel.disabled = true;
      if (!pending) { pending = id; beep(900, 0.02); }
      else if (pending === id) pending = null;
      else { addWire(pending, id); pending = null; }
      redraw(); setStatus();
    }
    function connect(a, b) {
      if (live) return busy();
      selWire = null; btnDel.disabled = true; pending = null;
      if (a !== b) addWire(a, b);
      redraw(); setStatus();
    }
    function clickWire(id) {
      if (live) return busy();
      pending = null;
      selWire = selWire === id ? null : id;
      btnDel.disabled = !selWire;
      redraw(); setStatus();
    }
    function clickSwitch(id) {
      states[id] ^= 1;
      beep(700, 0.03);
      if (live) { evalLive(); return; }
      redraw();
      // 沒送電時切開關，燈當然不會亮：講清楚下一步
      setStatus('<b>還沒送電</b>：開關切好了，但分電盤的主開關還是 OFF，所以燈不會亮。點分電盤的<b>主開關</b>（或按「⚡ 送電」）送電。');
      if (!powerHinted) { powerHinted = true; toast('還沒送電：先點分電盤的主開關，燈才會亮。'); }
    }
    function clickBackground() {
      if (!pending && !selWire) return;
      pending = null; selWire = null; btnDel.disabled = true;
      redraw(); setStatus();
    }

    const toSvg = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    svg.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-act]');
      const sEl = ev.target.closest('[data-sw]');
      const tEl = ev.target.closest('[data-t]');
      const wEl = ev.target.closest('[data-w]');
      if (act) return setPower(!live);
      if (sEl) return clickSwitch(sEl.dataset.sw);
      if (tEl) return clickTerminal(tEl.dataset.t);
      if (wEl) return clickWire(wEl.dataset.w);
      clickBackground();
    });
    svg.addEventListener('pointermove', (ev) => {
      if (!pending || !rubber) return;
      const t = termPos(pending);
      const p = toSvg(ev);
      rubber.setAttribute('d', `M${t.x} ${t.y}L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      rubber.style.stroke = colorCss(color);
    });

    function delSel() {
      if (!selWire || live) return;
      pushUndo();
      wires = wires.filter(w => w.id !== selWire);
      selWire = null; btnDel.disabled = true;
      save(); redraw(); setStatus();
    }
    btnDel.addEventListener('click', delSel);
    btnUndo.addEventListener('click', () => {
      if (live) return toast('請先斷電。');
      if (!undo.length) return toast('沒有可以復原的步驟。');
      wires = JSON.parse(undo.pop());
      selWire = null; pending = null;
      save(); redraw(); setStatus();
    });
    let clearArmed = false;
    btnClear.addEventListener('click', () => {
      if (live) return toast('請先斷電。');
      if (!clearArmed) { clearArmed = true; btnClear.textContent = '再按一次確認清空'; setTimeout(() => { clearArmed = false; btnClear.textContent = '清空'; }, 2500); return; }
      clearArmed = false; btnClear.textContent = '清空';
      pushUndo(); wires = []; selWire = null; pending = null;
      save(); redraw(); setStatus();
    });
    btnPower.addEventListener('click', () => setPower(!live));
    btnGrade.addEventListener('click', () => {
      if (live) setPower(false);
      const g = grade(lv, wires);
      lastGrade = g;
      const pass = !g.fails.length;
      if (pass) {
        const stars = 1 + (g.safety.length ? 0 : 1) + (g.style.length ? 0 : 1);
        if (stars > (Store.data.stars[lv.id] || 0)) { Store.data.stars[lv.id] = stars; Store.save(); }
        toast(stars === 3 ? '滿分！三顆星。' : `通過，${stars} 顆星。看看右邊哪裡可以更好。`, 'ok');
        beep(988, 0.08, 'sine', 0.05); setTimeout(() => beep(1319, 0.12, 'sine', 0.05), 90);
        updateOverall();
      } else {
        beep(220, 0.2, 'sawtooth', 0.03);
      }
      drawStrip(); drawSide(); redraw();
      if (window.matchMedia('(max-width: 1000px)').matches) side.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });

    const onKey = (e) => {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (e.key === 'Escape') { pending = null; selWire = null; btnDel.disabled = true; redraw(); setStatus(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selWire) { e.preventDefault(); delSel(); }
      else if (['1', '2', '3', '4'].includes(e.key)) { const c = COLORS[+e.key - 1]; palette.querySelector(`[data-c="${c.k}"]`).click(); }
    };
    document.addEventListener('keydown', onKey);
    Page.onLeave(() => document.removeEventListener('keydown', onKey));

    /* ---------- 3D 工作台 ---------- */
    const api3d = {
      DEFS, PANEL_TERMS, partTerms,
      getModel: () => ({ lv, parts: allParts(), wires, states, live, liveA, pending, selWire, color, badWires: lastGrade ? lastGrade.badWires : null }),
      onTerminal: clickTerminal,
      onConnect: connect,
      onWire: clickWire,
      onSwitch: clickSwitch,
      onPower: () => setPower(!live),
      onBackground: clickBackground,
    };
    function setView(m, remember) {
      if (m === '3d' && !can3d) m = '2d';
      view = m;
      if (remember) { try { localStorage.setItem('peixian-dojo-wiring-view', m); } catch (e) { /* 忽略 */ } }
      viewBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.view === m ? 'true' : 'false'));
      board.hidden = m !== '2d';
      scrollHint.hidden = m !== '2d';
      board3dBox.hidden = m !== '3d';
      if (m === '3d' && !board3d) {
        board3d = Board3D.create(board3dBox, api3d);
        board3d.ready.catch(() => {
          if (left) return;
          board3d = null;
          toast('3D 配線板載入失敗（需要網路連線），先改用平面配線板。', 'bad');
          setView('2d', false);
        });
      }
      redraw(); setStatus();
    }
    Page.onLeave(() => { left = true; if (board3d) board3d.dispose(); board3d = null; });

    const firstOpen = LEVELS.findIndex(L => !(Store.data.stars[L.id] > 0));
    loadLevel(firstOpen < 0 ? 0 : firstOpen);
    let savedView = null;
    try { savedView = localStorage.getItem('peixian-dojo-wiring-view'); } catch (e) { /* 忽略 */ }
    setView(savedView === '2d' || !can3d ? '2d' : '3d', false);
  }

  function progress() {
    return LEVELS.filter(L => (Store.data.stars[L.id] || 0) > 0).length / LEVELS.length;
  }

  return { render, progress, LEVELS, grade, analyze };
})();
