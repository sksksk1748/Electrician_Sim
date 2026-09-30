'use strict';
/* 迴路 04：電箱工坊 —— 組裝端子台，把三相四線 220/380V 電源接進電箱
   線色：規則規定中性線白、接地線綠；三條相線依業界常用 R 紅、S 黑、T 藍。 */
const BoxShop = (() => {
  const W = 1000, H = 760;
  const PHASES = ['R', 'S', 'T'];
  const WANT = { R: 'red', S: 'black', T: 'blue', N: 'white', E: 'green' };
  const COLORS = [
    { k: 'red', name: '紅', css: 'var(--w-red)', hint: 'R 相' },
    { k: 'black', name: '黑', css: 'var(--w-black)', hint: 'S 相' },
    { k: 'blue', name: '藍', css: 'var(--w-blue)', hint: 'T 相' },
    { k: 'white', name: '白', css: 'var(--w-white)', hint: '中性線 N' },
    { k: 'green', name: '綠', css: 'var(--w-green)', hint: '接地 E' },
  ];
  const colorCss = k => (COLORS.find(c => c.k === k) || COLORS[0]).css;
  const ROLE = { R: 'R 相', S: 'S 相', T: 'T 相', N: '中性線 N', E: '接地 E' };
  const BRK = ['main', 'mcb3', 'mcb1'];

  /* 零件端子：[鍵, 相對 x, 相對 y, 方向（線從哪邊離開）, 標籤] */
  const DEFS = {
    tb: { kind: '端子台 TB', terms: ['R', 'S', 'T', 'N', 'E'].map((k, i) => [k, 24 + i * 48, 120, 'down', k]) },
    main: { kind: '總開關', terms: [['R1', 30, 0, 'up', 'R'], ['S1', 75, 0, 'up', 'S'], ['T1', 120, 0, 'up', 'T'], ['R2', 30, 160, 'down', 'R'], ['S2', 75, 160, 'down', 'S'], ['T2', 120, 160, 'down', 'T']] },
    nbar: { kind: 'N 中性線匯流排', terms: [1, 2, 3, 4, 5, 6].map(i => [String(i), 25 + (i - 1) * 50, 26, 'down', '']) },
    ebar: { kind: 'E 接地匯流排', terms: [1, 2, 3, 4, 5, 6].map(i => [String(i), 25 + (i - 1) * 50, 26, 'down', '']) },
    pl: { kind: '指示燈', terms: [['a', 22, 0, 'up', '相'], ['b', 58, 0, 'up', 'N']] },
    mcb3: { kind: '分路開關 3P', terms: [['i1', 25, 0, 'up', '1'], ['i2', 60, 0, 'up', '3'], ['i3', 95, 0, 'up', '5'], ['o1', 25, 110, 'down', '2'], ['o2', 60, 110, 'down', '4'], ['o3', 95, 110, 'down', '6']] },
    mcb1: { kind: '分路開關 1P', terms: [['i', 28, 0, 'up', '1'], ['o', 28, 110, 'down', '2']] },
    motor: { kind: '三相馬達 380V', terms: [['U', 30, 0, 'up', 'U'], ['V', 70, 0, 'up', 'V'], ['W', 110, 0, 'up', 'W'], ['E', 160, 0, 'up', 'E']] },
    lamp: { kind: '燈 220V', terms: [['L', 30, 0, 'up', 'L'], ['N', 70, 0, 'up', 'N']] },
    sock: { kind: '插座 220V', terms: [['L', 25, 0, 'up', 'L'], ['N', 65, 0, 'up', 'N'], ['E', 105, 0, 'up', 'E']] },
  };
  const BASE = [
    { id: 'TB', type: 'tb', x: 60, y: 40 },
    { id: 'Q0', type: 'main', x: 400, y: 200, name: '總開關 3P 50A' },
    { id: 'NB', type: 'nbar', x: 650, y: 50 },
    { id: 'EB', type: 'ebar', x: 650, y: 150 },
  ];
  const INCOMING = [['TB.R', 'Q0.R1', 'red'], ['TB.S', 'Q0.S1', 'black'], ['TB.T', 'Q0.T1', 'blue'], ['TB.N', 'NB.1', 'white'], ['TB.E', 'EB.1', 'green']];

  const LEVELS = [
    {
      id: 'b1', name: '進線與相指示燈',
      parts: [...BASE,
        { id: 'PR', type: 'pl', x: 330, y: 480, ph: 'R' },
        { id: 'PS', type: 'pl', x: 470, y: 480, ph: 'S' },
        { id: 'PT', type: 'pl', x: 610, y: 480, ph: 'T' }],
      goal: '把端子台的三相四線電源接進電箱：R、S、T 接到總開關 Q0 的電源側（上方），N、E 接到匯流排。Q0 負載側（下方）再接三個相指示燈，送電後 R、S、T 三盞都要亮。',
      concept: '三相四線 220/380V：任兩條相線之間是 <b>380V</b>（線電壓），任一條相線對中性線 N 是 <b>220V</b>（相電壓），380 ≈ 220 × √3。規則規定中性線用白色、接地線用綠色；三條相線業界常用 <b>R 紅、S 黑、T 藍</b>。',
      steps: [
        '選<b>紅色</b>，點端子台 R 下方的螺絲，再點 Q0 上方的 R；S 用<b>黑色</b>、T 用<b>藍色</b>，照樣接到 Q0 的 S、T。',
        '<b>白色</b>：端子台 N → N 匯流排；<b>綠色</b>：端子台 E → E 匯流排。',
        '指示燈 PR 的「相」端子接 Q0 下方的 R（紅），「N」端子接 N 匯流排（白）；PS、PT 照樣接 S、T。',
        '點總開關 Q0 送電，三盞燈都亮了，再按「檢查評分」。',
      ],
      learn: '電箱門上的三顆相指示燈，哪一顆不亮就代表哪一相沒電（例如「缺相」）。三相馬達在缺相時會轉不起來或過熱，所以這三顆燈是很實用的檢查工具。',
    },
    {
      id: 'b2', name: '三相馬達與單相分路',
      fixed: INCOMING,
      parts: [...BASE,
        { id: 'Q1', type: 'mcb3', x: 150, y: 430, name: 'Q1 3P 30A', note: '馬達' },
        { id: 'Q2', type: 'mcb1', x: 430, y: 430, name: 'Q2 1P 15A', note: '照明' },
        { id: 'Q3', type: 'mcb1', x: 560, y: 430, name: 'Q3 1P 20A', note: '插座' },
        { id: 'M', type: 'motor', x: 120, y: 610, brk: 'Q1' },
        { id: 'H', type: 'lamp', x: 420, y: 610, brk: 'Q2' },
        { id: 'O', type: 'sock', x: 560, y: 610, brk: 'Q3' }],
      goal: '進線已經接好了。從總開關 Q0 接出三個分路：Q1（3P 30A）供電給三相馬達 M，而且要<b>正轉</b>；Q2 供電給燈 H；Q3 供電給插座 O。兩個單相負載要分到不同相。',
      concept: '單相 220V 負載接「<b>一條相線 + N</b>」。三相馬達接三條相線、不接 N，但外殼一定要接地。馬達轉向由相序決定：<b>R→U、S→V、T→W</b> 是正轉，任意對調兩條相線就會反轉。',
      steps: [
        'Q0 下方的 R、S、T 分別接到 Q1 上方的 1、3、5（紅、黑、藍）。',
        'Q1 下方的 2、4、6 接馬達的 U、V、W（紅、黑、藍）；馬達的 E 接 E 匯流排（綠）。',
        'Q0 下方 R → Q2 上方（紅）；Q2 下方 → 燈 H 的 L（紅）；H 的 N → N 匯流排（白）。',
        'Q0 下方 S → Q3 上方（黑）；Q3 下方 → 插座 O 的 L（黑）；O 的 N → N 匯流排（白）；O 的 E → E 匯流排（綠）。',
      ],
      learn: '三相電箱要注意<b>負載平衡</b>：單相負載平均分到 R、S、T，各相電流才不會差太多，中性線也比較不會吃重。',
    },
  ];

  /* ---------- 電路分析：用「相位」而不是電壓來算 ---------- */
  const partById = (lv, id) => lv.parts.find(p => p.id === id);
  function termsOf(p) {
    return DEFS[p.type].terms.map(([k, dx, dy, dir, label]) => ({ id: p.id + '.' + k, x: p.x + dx, y: p.y + dy, dir, label, bar: p.type === 'nbar' || p.type === 'ebar' }));
  }
  function internals(lv, st) {
    const pairs = [];
    lv.parts.forEach(p => {
      const t = k => p.id + '.' + k;
      const on = !!st[p.id];
      if (p.type === 'main' && on) pairs.push([t('R1'), t('R2')], [t('S1'), t('S2')], [t('T1'), t('T2')]);
      if (p.type === 'mcb3' && on) pairs.push([t('i1'), t('o1')], [t('i2'), t('o2')], [t('i3'), t('o3')]);
      if (p.type === 'mcb1' && on) pairs.push([t('i'), t('o')]);
      if (p.type === 'nbar' || p.type === 'ebar') for (let i = 2; i <= 6; i++) pairs.push([t('1'), t(String(i))]);
    });
    return pairs;
  }
  function allWires(lv, wires) {
    return [...(lv.fixed || []).map(([a, b, c], i) => ({ id: 'fx' + i, a, b, c, fixed: true })), ...wires];
  }
  function analyze(lv, wires, st) {
    const par = new Map();
    const f = x => { if (!par.has(x)) par.set(x, x); while (par.get(x) !== x) x = par.get(x); return x; };
    const u = (a, b) => { const ra = f(a), rb = f(b); if (ra !== rb) par.set(ra, rb); };
    allWires(lv, wires).forEach(w => u(w.a, w.b));
    internals(lv, st).forEach(([a, b]) => u(a, b));
    const src = new Map();
    ['R', 'S', 'T', 'N', 'E'].forEach(k => { const r = f('TB.' + k); if (!src.has(r)) src.set(r, new Set()); src.get(r).add(k); });
    let short = null, bondNE = false;
    src.forEach(set => {
      if (set.size > 1 && [...set].some(k => PHASES.includes(k)) && !short) short = [...set];
      if (set.has('N') && set.has('E')) bondNE = true;
    });
    // 每個節點是哪一相；N 和 E 被接在一起時當成 N
    const pot = id => {
      const s = src.get(f(id));
      if (!s) return null;
      if (s.size === 1) return [...s][0];
      return s.has('N') && s.has('E') && s.size === 2 ? 'N' : 'X';
    };
    return { short, bondNE, pot, same: (a, b) => f(a) === f(b) };
  }
  const isPh = x => PHASES.includes(x);
  /* 燈、指示燈、插座：一條相線 + N 才是 220V */
  function single(a, hot, neu) {
    const x = a.pot(hot), y = a.pot(neu);
    if (isPh(x) && isPh(y)) return x === y ? { st: 'off' } : { st: 'burn', v: 380 };
    if (isPh(x) && y === 'N') return { st: 'on', v: 220, ph: x };
    if (isPh(y) && x === 'N') return { st: 'on', v: 220, ph: y, rev: true };
    if ((isPh(x) && y === 'E') || (isPh(y) && x === 'E')) return { st: 'gnd' };
    return { st: 'off' };
  }
  function motorState(a, id) {
    const ps = ['U', 'V', 'W'].map(k => a.pot(id + '.' + k));
    if (ps.some(p => p === 'N' || p === 'E')) return { st: 'bad' };
    const phs = ps.filter(isPh);
    const uniq = new Set(phs);
    if (phs.length === 3 && uniq.size === 3) {
      const ix = ps.map(p => PHASES.indexOf(p));
      const fwd = (ix[1] - ix[0] + 3) % 3 === 1 && (ix[2] - ix[1] + 3) % 3 === 1;
      return { st: 'run', fwd, seq: ps.join('') };
    }
    if (uniq.size >= 2) return { st: 'single' };
    return { st: 'off' };
  }
  function loadOf(a, p) {
    if (p.type === 'pl') return single(a, p.id + '.a', p.id + '.b');
    if (p.type === 'lamp' || p.type === 'sock') return single(a, p.id + '.L', p.id + '.N');
    if (p.type === 'motor') return motorState(a, p.id);
    return null;
  }
  const loads = lv => lv.parts.filter(p => ['pl', 'lamp', 'sock', 'motor'].includes(p.type));
  const hotTerms = p => p.type === 'motor' ? ['U', 'V', 'W'] : p.type === 'pl' ? ['a', 'b'] : ['L', 'N'];
  const energized = (a, p) => hotTerms(p).some(k => isPh(a.pot(p.id + '.' + k)));
  function allOn(lv) { const s = {}; lv.parts.forEach(p => { if (BRK.includes(p.type)) s[p.id] = 1; }); return s; }
  function shortText(set) {
    const ph = set.filter(isPh);
    if (ph.length > 1) return `${ph.join('、')} 相直接接在一起，相間短路！`;
    if (set.includes('N')) return `${ph[0]} 相接到了中性線 N，短路！`;
    return `${ph[0]} 相接到了接地線 E，接地故障！`;
  }
  function termName(lv, id) {
    const [pid, k] = id.split('.');
    const p = partById(lv, pid);
    if (p.type === 'tb') return `端子台 ${k}`;
    if (p.type === 'nbar') return `N 匯流排第 ${k} 孔`;
    if (p.type === 'ebar') return `E 匯流排第 ${k} 孔`;
    const t = DEFS[p.type].terms.find(x => x[0] === k);
    return `${pid} 的「${t ? t[4] : k}」`;
  }

  function grade(lv, wires) {
    const res = { fails: [], safety: [], style: [], badWires: new Set() };
    if (!wires.length) { res.fails.push('電箱裡還沒有你拉的線。'); return res; }
    const on = allOn(lv);
    const a = analyze(lv, wires, on);
    if (a.short) { res.fails.push('送電時' + shortText(a.short) + '總開關會跳脫。'); return res; }
    loads(lv).forEach(p => {
      const s = loadOf(a, p);
      if (p.type === 'pl') {
        if (s.st === 'burn') res.fails.push(`${p.id} 兩端接到兩條不同的相線，承受 380V 會燒毀。一端接相線、一端接 N。`);
        else if (s.st === 'gnd') res.fails.push(`${p.id} 的另一端接到了接地 E。回路要走中性線 N，不能走接地線。`);
        else if (s.st !== 'on') res.fails.push(`${p.id}（${p.ph} 相指示燈）沒亮：一端要接 Q0 負載側的 ${p.ph} 相，另一端接 N 匯流排。`);
        else if (s.ph !== p.ph) res.fails.push(`${p.id} 接到 ${s.ph} 相了。標示 ${p.ph} 相的指示燈要接 ${p.ph} 相，否則缺相時會看錯。`);
      } else if (p.type === 'motor') {
        if (s.st === 'bad') res.fails.push('馬達的 U、V、W 接到了 N 或 E。三相馬達只接三條相線。');
        else if (s.st === 'single') res.fails.push('馬達只接到兩相（缺相），會嗡嗡叫轉不起來，久了會過熱燒毀。U、V、W 要接齊 R、S、T。');
        else if (s.st !== 'run') res.fails.push('馬達沒有電。從 Q1 下方接到馬達的 U、V、W。');
        else if (!s.fwd) res.fails.push(`馬達反轉了（目前 U、V、W 接的是 ${s.seq.split('').join('、')}）。照 R→U、S→V、T→W 接，或任意對調兩條相線就會正轉。`);
      } else {
        const name = p.type === 'lamp' ? `燈 ${p.id}` : `插座 ${p.id}`;
        if (s.st === 'burn') res.fails.push(`${name} 接到兩條相線，是 380V，${p.type === 'lamp' ? '燈泡會燒毀' : '插上的 220V 電器會燒毀'}。L 接相線、N 接中性線。`);
        else if (s.st === 'gnd') res.fails.push(`${name} 的 N 端接到了接地 E。回路要走中性線 N。`);
        else if (s.st !== 'on') res.fails.push(`${name} 沒有 220V：L 端接分路開關下方的相線，N 端接 N 匯流排。`);
        else if (s.rev) res.safety.push(`${name} 的 L、N 接反了：相線要接 L 端子，中性線接 N 端子。`);
      }
    });
    // 保護：關掉總開關或該分路開關，負載要斷電
    if (!res.fails.length) {
      const a0 = analyze(lv, wires, { ...on, Q0: 0 });
      loads(lv).forEach(p => { if (energized(a0, p)) res.fails.push(`關掉總開關 Q0 後，${p.id} 還是有電：它的線沒有經過總開關。`); });
      loads(lv).filter(p => p.brk).forEach(p => {
        const q = partById(lv, p.brk);
        const aq = analyze(lv, wires, { ...on, [p.brk]: 0 });
        if (energized(aq, p)) res.fails.push(`關掉 ${p.brk}（${q.note}）後，${p.id} 還是有電。${p.id} 要從 ${p.brk} 的下方接出，才受它保護。`);
      });
    }
    // 接地
    if (!a.same('EB.1', 'TB.E')) res.safety.push('E 接地匯流排沒有接到端子台的 E，整個電箱的接地都沒接上。');
    lv.parts.filter(p => p.type === 'motor' || p.type === 'sock').forEach(p => {
      if (!a.same(p.id + '.E', 'TB.E')) res.safety.push(`${p.id} 的接地端子 E 沒有接到 E 匯流排（綠線）。${p.type === 'motor' ? '馬達外殼' : '插座的接地孔'}一定要接地。`);
    });
    if (a.bondNE) res.safety.push('中性線 N 和接地線 E 在電箱裡接在一起了。兩者要分開，否則漏電斷路器會誤動作，接地線也可能帶電流。');
    // 相序與負載平衡
    if (lv.parts.some(p => p.type === 'pl')) {
      const order = ['R', 'S', 'T'].filter(k => a.pot('Q0.' + k + '1') !== k);
      if (order.length) res.style.push('總開關電源側的相序要和端子台一致：R 接 R、S 接 S、T 接 T，之後才不會搞混。');
    }
    const sp = lv.parts.filter(p => p.type === 'lamp' || p.type === 'sock').map(p => loadOf(a, p)).filter(s => s.st === 'on').map(s => s.ph);
    if (sp.length > 1 && new Set(sp).size < sp.length) res.style.push(`單相負載都接在 ${sp[0]} 相，三相不平衡。把燈和插座分到不同相。`);
    // 線色
    const colorIssues = new Set();
    wires.forEach(w => {
      const role = a.pot(w.a);
      if (!WANT[role] || w.c === WANT[role]) return;
      colorIssues.add(`${ROLE[role]}要用${COLORS.find(c => c.k === WANT[role]).name}色`);
      res.badWires.add(w.id);
    });
    colorIssues.forEach(m => res.style.push('線色：' + m + '。'));
    // 端子線數
    const cnt = new Map();
    allWires(lv, wires).forEach(w => [w.a, w.b].forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1)));
    cnt.forEach((c, t) => {
      const bar = t.startsWith('NB.') || t.startsWith('EB.');
      if (bar && c > 1) res.style.push(`${termName(lv, t)} 接了 ${c} 條線。匯流排一個孔只接一條線。`);
      else if (!bar && c > 2) res.style.push(`${termName(lv, t)} 接了 ${c} 條線，一個端子最多 2 條。`);
    });
    return res;
  }

  /* ---------- 端子台組裝 ---------- */
  const ASM = [
    { part: 'rail', done: 'DIN 軌道鎖好了。', why: '第一步要先把 DIN 軌道（35mm 寬的金屬軌道）鎖在電箱背板上，所有端子都卡在它上面。' },
    { part: 'stop', done: '左端的固定座裝好了。', why: '先在左端裝固定座（止動片），端子排好之後才不會左右滑動。' },
    { part: 'tb', done: 'R 相的端子卡上去了。', why: '接著依序卡上一般端子：R、S、T、N 各一個。' },
    { part: 'tb', done: 'S 相的端子卡上去了。', why: '還要再卡一般端子，給 S 相用。' },
    { part: 'tb', done: 'T 相的端子卡上去了。', why: '還要再卡一般端子，給 T 相用。' },
    { part: 'tb', done: 'N 的端子卡上去了。', why: '還要再卡一般端子，給中性線 N 用。' },
    { part: 'pe', done: '接地端子卡上去了。它的金屬底座會和軌道、箱體導通。', why: '四個一般端子之後，卡上綠黃色的接地端子給 E 用。' },
    { part: 'end', done: '端板蓋上了。', why: '端子的一側是開放的，最後一片的開放面要用端板蓋住，避免帶電的金屬外露。' },
    { part: 'stop', done: '右端的固定座也裝好了，整排端子夾緊了。', why: '最後在右端再裝一個固定座，把整排夾緊。' },
    { part: 'mark', done: '標示條插好了：R、S、T、N、E。', why: '零件都裝好後插上標示條，配線和日後檢修才認得出每個端子。' },
  ];
  const TRAY = [
    ['tb', '一般端子（灰）'], ['end', '端板'], ['mark', '標示條'], ['rail', 'DIN 軌道'], ['pe', '接地端子（綠黃）'], ['stop', '固定座'],
  ];
  const ASM_Q = [
    { q: '5.5mm² 的絞線要接到端子台，剝線要剝多長？', o: ['照端子台標示的剝線長度：銅線剛好全部夾進端子，不外露，也不夾到絕緣皮', '剝越長越好，比較好夾', '只剝一點點，看得到銅線就好'], ex: '剝太長，銅線露在端子外面，容易觸電或碰到隔壁的端子；剝太短，會夾到絕緣皮，接觸不良而發熱。' },
    { q: '絞線（多股細銅線）接到螺絲式端子前，要怎麼處理？', o: ['壓接合適的 Y 型或 O 型壓接端子，用對應線徑的壓接鉗壓緊', '把銅線扭一扭直接塞進去', '剪掉幾股，比較好塞'], ex: '細銅絲直接鎖在螺絲下容易散開、斷股，接觸面積變小就會發熱；剪掉幾股更等於把電線變細。單心線則可以直接鎖。' },
    { q: '端子螺絲要鎖多緊？', o: ['用合適的起子鎖到規定扭力，鎖完輕拉電線確認不會鬆脫', '越緊越好，鎖到轉不動為止', '線不會掉下來就好'], ex: '太鬆會接觸不良、發熱；太緊可能把螺紋或導線壓壞。鎖完輕拉電線，是確認有沒有真的夾到的好習慣。' },
    { q: '三相四線的進線，各條線用什麼顏色？', o: ['R 紅、S 黑、T 藍、N 白、E 綠', 'R 紅、S 白、T 黑、N 綠、E 藍', '全部用黑色，再貼標籤區分'], ex: '規則規定中性線用白色（或灰色）、接地線用綠色；三條相線常用紅、黑、藍區分，一眼就認得出來。' },
  ];

  const store = () => {
    Store.data.box = Store.data.box || {};
    const b = Store.data.box;
    b.stars = b.stars || {}; b.wires = b.wires || {};
    return b;
  };

  /* ---------- 畫面 ---------- */
  function render(root) {
    const ch = CHAPTERS.find(c => c.id === 'box');
    root.append(chapterHeader(ch, ch.sub));
    const strip = h('div', { class: 'lvl-strip', role: 'tablist', 'aria-label': '關卡' });
    const mainEl = h('section', { class: 'wb-main' });
    const side = h('aside', { class: 'wb-side' });
    root.append(strip, h('div', { class: 'wb' }, mainEl, side));
    let stage = null;                                  // 'asm' 或關卡索引
    let cleanup = null;
    Page.onLeave(() => { if (cleanup) cleanup(); });

    function drawStrip() {
      const B = store();
      const chips = [
        h('button', { type: 'button', role: 'tab', 'aria-selected': stage === 'asm' ? 'true' : 'false', class: 'lvl-chip' + (stage === 'asm' ? ' cur' : ''), onclick: () => open('asm') },
          h('span', { class: 'n' }, '準備'), h('span', { class: 't' }, '組裝端子台'), h('span', { class: 'stars' }, B.asm ? '✓ 完成' : '')),
        ...LEVELS.map((L, i) => h('button', { type: 'button', role: 'tab', 'aria-selected': stage === i ? 'true' : 'false', class: 'lvl-chip' + (stage === i ? ' cur' : ''), onclick: () => open(i) },
          h('span', { class: 'n' }, `第 ${i + 1} 關`), h('span', { class: 't' }, L.name), h('span', { html: starsHTML(B.stars[L.id] || 0) }))),
      ];
      strip.replaceChildren(...chips);
    }
    function open(s) {
      if (cleanup) cleanup();
      cleanup = null;
      stage = s;
      drawStrip();
      cleanup = s === 'asm' ? assembly() : workshop(LEVELS[s], s);
    }

    /* ===== 組裝端子台 ===== */
    function assembly() {
      const B = store();
      let step = B.asm ? ASM.length + ASM_Q.length : 0;
      const svg = sv('svg', { viewBox: '0 0 1000 420', role: 'img', 'aria-label': '端子台組裝' });
      const tray = h('div', { class: 'asm-tray', role: 'group', 'aria-label': '零件' });
      const quiz = h('div', {});
      const status = h('div', { class: 'status-line', 'aria-live': 'polite' });
      mainEl.replaceChildren(h('div', { class: 'bench-head' }, h('h3', {}, '端子台組裝')), status, h('div', { class: 'board-wrap asm-wrap' }, svg), tray, quiz);

      const pieces = () => ASM.slice(0, Math.min(step, ASM.length)).map(s => s.part);
      function drawSvg() {
        const got = pieces();
        const marked = got.includes('mark');
        const wired = step >= ASM.length + ASM_Q.length;
        let s = `<rect width="1000" height="420" style="fill:var(--enclosure)"/><rect x="30" y="20" width="940" height="380" rx="10" style="fill:var(--surface-2);stroke:var(--enclosure-edge);stroke-width:2"/>
          <text x="50" y="50" class="part-title">電箱背板</text>`;
        const railY = 205;
        if (got.includes('rail')) {
          s += `<rect x="120" y="${railY - 18}" width="760" height="36" rx="3" style="fill:#aeb5bb;stroke:#7d858c;stroke-width:1.5"/><rect x="120" y="${railY - 10}" width="760" height="20" style="fill:#c3c9ce"/>`;
          for (let x = 150; x < 880; x += 100) s += `<ellipse cx="${x}" cy="${railY}" rx="9" ry="4" style="fill:#7d858c"/>`;
          s += `<circle cx="136" cy="${railY}" r="6" style="fill:#5f666c"/><circle cx="864" cy="${railY}" r="6" style="fill:#5f666c"/>`;
        } else s += `<rect x="120" y="${railY - 18}" width="760" height="36" rx="3" style="fill:none;stroke:var(--ink-3);stroke-width:2;stroke-dasharray:8 6"/><text x="500" y="${railY + 5}" text-anchor="middle" class="part-note">DIN 軌道要裝在這裡</text>`;
        const letters = ['R', 'S', 'T', 'N', 'E'];
        const phaseColor = ['var(--w-red)', 'var(--w-black)', 'var(--w-blue)', 'var(--w-white)', 'var(--w-green)'];
        let x = 330, ti = 0, stops = 0;
        got.forEach(p => {
          if (p === 'stop') {
            s += `<path d="M${x} ${railY - 34}h26v68h-26z" style="fill:#3f4448"/><circle cx="${x + 13}" cy="${railY - 20}" r="4" style="fill:#9aa1a7"/>`;
            x += 30; stops++;
          } else if (p === 'tb' || p === 'pe') {
            const pe = p === 'pe';
            s += `<rect x="${x}" y="${railY - 95}" width="52" height="190" rx="5" style="fill:${pe ? 'url(#asm-pe)' : '#cfd3cf'};stroke:#7d8580;stroke-width:1.5"/>`;
            s += `<rect x="${x + 12}" y="${railY - 90}" width="28" height="14" rx="3" style="fill:#3a3f43"/><rect x="${x + 12}" y="${railY + 76}" width="28" height="14" rx="3" style="fill:#3a3f43"/>`;
            [railY - 58, railY + 58].forEach(y => { s += `<circle cx="${x + 26}" cy="${y}" r="11" style="fill:#d8d2c2;stroke:#5b5446;stroke-width:1.5"/><path d="M${x + 19} ${y - 7}L${x + 33} ${y + 7}" style="stroke:#5b5446;stroke-width:2"/>`; });
            s += `<rect x="${x + 8}" y="${railY - 16}" width="36" height="32" rx="3" style="fill:${marked ? '#ffffff' : '#b9bdb9'};stroke:#8a908b"/>`;
            if (marked) s += `<text x="${x + 26}" y="${railY + 7}" text-anchor="middle" style="font:700 18px var(--font-mono);fill:#1b1b1b">${letters[ti]}</text>`;
            if (wired) {
              const c = phaseColor[ti];
              [[railY - 95, 0], [railY + 95, 420]].forEach(([y0, y1]) => { s += `<path d="M${x + 26} ${y0}V${y1}" class="wire-halo"/><path d="M${x + 26} ${y0}V${y1}" class="wire-core" style="stroke:${c}"/>`; });
            }
            x += 52; ti++;
          } else if (p === 'end') {
            s += `<rect x="${x}" y="${railY - 92}" width="9" height="184" rx="2" style="fill:#9ea4a0;stroke:#6f7571"/>`;
            x += 10;
          }
        });
        // 下一個零件的位置（虛線框）
        const nx = step < ASM.length ? ASM[step].part : null;
        if (nx && nx !== 'rail' && nx !== 'mark' && got.includes('rail')) {
          const w = nx === 'stop' ? 26 : nx === 'end' ? 9 : 52;
          s += `<rect x="${x}" y="${railY - 95}" width="${w}" height="190" rx="4" style="fill:rgba(242,183,5,.15);stroke:var(--accent);stroke-width:2;stroke-dasharray:6 5"/>`;
        }
        svg.innerHTML = `<defs><pattern id="asm-pe" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#2a9d4b"/><rect width="7" height="14" fill="#e8c93a"/></pattern></defs>` + s;
      }
      function drawTray() {
        const done = step >= ASM.length;
        tray.hidden = done;
        tray.replaceChildren(...TRAY.map(([k, label]) => h('button', { type: 'button', class: 'asm-part', onclick: () => pick(k) }, h('span', { class: 'asm-ic ' + k, 'aria-hidden': 'true' }), label)));
      }
      function pick(k) {
        const cur = ASM[step];
        if (!cur) return;
        if (k !== cur.part) { beep(220, 0.15, 'sawtooth', 0.03); setMsg(`順序不對。${cur.why}`, 'bad'); return; }
        step++;
        beep(900, 0.04);
        setMsg(cur.done + (step < ASM.length ? '' : ' 零件都裝好了，接著回答下面的接線問題。'));
        refresh();
      }
      let msg = '', msgKind = '';
      function setMsg(m, kind = '') { msg = m; msgKind = kind; status.innerHTML = m; status.style.color = kind === 'bad' ? 'var(--bad)' : ''; }
      function drawQuiz() {
        const qi = step - ASM.length;
        if (qi < 0) { quiz.replaceChildren(); return; }
        if (qi >= ASM_Q.length) {
          quiz.replaceChildren(h('div', { class: 'callout ok' }, h('b', {}, '端子台組裝完成！'), ' 上方接好了電源進線，下方拉出去接總開關。接下來到第 1 關，實際把三相四線接進電箱。',
            h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => open(0) }, '開始第 1 關 →'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { step = 0; setMsg('重新組裝一次。'); refresh(); } }, '重新組裝'))));
          return;
        }
        const Q = ASM_Q[qi];
        const fb = h('div', {});
        const opts = shuffle(Q.o.map((t, k) => ({ t, ok: k === 0 })));
        const btns = opts.map(o => h('button', {
          type: 'button', class: 'quiz-opt', onclick: () => {
            btns.forEach((b, j) => { b.disabled = true; if (opts[j].ok) b.classList.add('right'); });
            if (!o.ok) { btns[opts.indexOf(o)].classList.add('wrong'); beep(220, 0.15, 'sawtooth', 0.03); }
            else beep(1320, 0.08, 'sine', 0.04);
            fb.replaceChildren(h('div', { class: 'callout ' + (o.ok ? 'ok' : 'bad') }, h('b', {}, o.ok ? '答對了。' : '不對喔。'), ' ', Q.ex),
              h('div', { class: 'row', style: { marginTop: '10px' } }, o.ok
                ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { step++; if (step >= ASM.length + ASM_Q.length) finish(); refresh(); } }, qi + 1 < ASM_Q.length ? '下一題 →' : '完成組裝')
                : h('button', { type: 'button', class: 'btn', onclick: () => drawQuiz() }, '再試一次')));
          },
        }, o.t));
        quiz.replaceChildren(h('div', { class: 'quiz' },
          h('div', { class: 'quiz-top' }, h('span', {}, `接線前的準備 ${qi + 1} / ${ASM_Q.length}`)),
          h('div', { class: 'quiz-q' }, Q.q), h('div', { class: 'quiz-opts' }, btns), fb));
      }
      function finish() {
        const b = store();
        if (!b.asm) { b.asm = true; Store.save(); updateOverall(); toast('端子台組裝完成！', 'ok'); }
        setMsg('完成！端子台上方接電源進線，下方拉出去接總開關。');
        drawStrip();
      }
      function drawSide() {
        const list = ASM.map((a, i) => h('li', { class: i < step ? 'pass' : i === step ? 'cur' : '' }, h('span', { class: 'ic' }, i < step ? '✓' : String(i + 1)), h('span', {}, ['裝 DIN 軌道', '左端固定座', 'R 相端子', 'S 相端子', 'T 相端子', 'N 端子', '接地端子', '端板', '右端固定座', '標示條'][i])));
        side.replaceChildren(
          h('div', { class: 'card stack' },
            h('div', { class: 'eyebrow' }, '準備 · 端子台'),
            h('h3', {}, '組裝端子台'),
            h('p', {}, '端子台（TB）是電源線進入電箱的「接線中繼站」：外面來的電線接在上方，箱內配線接在下方。要拆裝、檢修時，只要鬆開端子，不必動到整條電線。'),
            h('div', { class: 'callout small' }, '依正確順序，從下方零件盒點選零件裝到 DIN 軌道上。順序錯了會告訴你原因。'),
          ),
          h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, '組裝順序'), h('ul', { class: 'result-list asm-list' }, list)),
        );
      }
      function refresh() { drawSvg(); drawTray(); drawQuiz(); drawSide(); }
      setMsg(step ? '端子台已經組裝好了。可以重新組裝一次，或直接到第 1 關。' : '從下方零件盒選出第一個要裝的零件。');
      refresh();
      return null;
    }

    /* ===== 三相配線關卡 ===== */
    function workshop(lv, idx) {
      const B = store();
      let wires = (B.wires[lv.id] || []).map(w => ({ ...w }));
      let st = allOn(lv); st.Q0 = 0;
      let live = false, liveA = null, pending = null, selWire = null, color = 'red', undo = [], lastGrade = null;
      const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '三相電箱配線板' });
      const palette = h('div', { class: 'palette', role: 'group', 'aria-label': '電線顏色' });
      const status = h('div', { class: 'status-line', 'aria-live': 'polite' });
      const btnUndo = h('button', { class: 'btn btn-sm', type: 'button' }, '復原');
      const btnDel = h('button', { class: 'btn btn-sm', type: 'button', disabled: true }, '刪除選取的線');
      const btnClear = h('button', { class: 'btn btn-sm btn-ghost', type: 'button' }, '清空');
      const btnPower = h('button', { class: 'btn btn-sm', type: 'button' }, '⚡ 送電');
      const btnGrade = h('button', { class: 'btn btn-sm btn-primary', type: 'button' }, '檢查評分');
      mainEl.replaceChildren(
        h('div', { class: 'bench-head' }, h('h3', {}, '三相電箱 · 3φ4W 220/380V')),
        h('div', { class: 'toolbar' }, palette, h('div', { class: 'row' }, btnUndo, btnDel, btnClear, btnPower, btnGrade)),
        status,
        h('p', { class: 'scroll-hint' }, '↔ 配線板可以左右滑動。先點一個端子，滑到另一邊再點另一個端子。'),
        h('div', { class: 'board-wrap' }, svg),
      );
      COLORS.forEach((c, i) => {
        const b = h('button', { type: 'button', class: 'swatch', title: c.hint + '（快捷鍵 ' + (i + 1) + '）', 'data-c': c.k }, h('i', { style: { background: c.css } }), `${c.name}・${c.hint}`);
        b.addEventListener('click', () => {
          color = c.k;
          if (selWire) { const w = wires.find(x => x.id === selWire); if (w) { pushUndo(); w.c = c.k; save(); } }
          drawPalette(); draw();
        });
        palette.append(b);
      });
      const drawPalette = () => palette.querySelectorAll('.swatch').forEach(b => b.classList.toggle('cur', b.dataset.c === color));
      function save() { store().wires[lv.id] = wires; Store.save(); lastGrade = null; drawSide(); }
      function pushUndo() { undo.push(JSON.stringify(wires)); if (undo.length > 60) undo.shift(); }
      function setStatus(msg, kind) {
        status.style.color = kind === 'bad' ? 'var(--bad)' : '';
        if (msg) { status.innerHTML = msg; return; }
        if (live) status.innerHTML = '<b>送電中</b>：可以點分路開關切換看看。要改配線請先把總開關 Q0 關掉。';
        else if (pending) status.innerHTML = `從 <b>${termName(lv, pending)}</b> 拉線中：點另一個端子完成，按 <span class="kbd">Esc</span> 或點空白處取消。`;
        else if (selWire) status.innerHTML = '已選取一條線：點顏色可改色，按「刪除選取的線」或 <span class="kbd">Delete</span> 刪除。';
        else status.innerHTML = '點一個端子開始拉線，再點另一個端子完成。先在上方選好電線顏色。';
      }

      const termList = () => lv.parts.flatMap(termsOf);
      const termPos = id => termList().find(t => t.id === id);
      function wirePath(t1, t2, off) {
        const dist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
        const sag = Math.min(110, 30 + dist * 0.18) + off;
        const v = d => d === 'up' ? -1 : 1;
        return `M${t1.x} ${t1.y} C${t1.x} ${t1.y + v(t1.dir) * sag} ${t2.x} ${t2.y + v(t2.dir) * sag} ${t2.x} ${t2.y}`;
      }
      const breakerSvg = (p, w, hh, poles, on) => {
        let s = `<rect x="0" y="10" width="${w}" height="${hh - 20}" rx="6" class="brk-body"/>`;
        DEFS[p.type].terms.forEach(([, x, y]) => { s += `<path d="M${x} ${y}V${y === 0 ? 10 : hh - 10}" class="lead"/>`; });
        const hx = w / 2 - Math.min(14 * poles, w * 0.36), hw = Math.min(28 * poles, w * 0.72);
        s += `<rect x="${hx}" y="${hh / 2 - 26}" width="${hw}" height="52" rx="4" style="fill:#2A302D"/><rect x="${hx + 3}" y="${on ? hh / 2 - 23 : hh / 2 + 1}" width="${hw - 6}" height="22" rx="3" style="fill:${on ? '#F2B705' : '#5A645E'}"/>`;
        s += `<text x="${w / 2}" y="${hh / 2 - 32}" text-anchor="middle" style="font:700 10px var(--font-mono);fill:${on ? '#1B7D45' : '#6A746E'}">${on ? 'ON' : 'OFF'}</text>`;
        return s;
      };
      function drawPart(p) {
        const on = !!st[p.id];
        const g = sv('g', { transform: `translate(${p.x},${p.y})` });
        let s = '';
        if (p.type === 'tb') {
          s += `<rect x="-14" y="44" width="268" height="28" rx="3" style="fill:#aeb5bb;stroke:#7d858c"/>`;
          ['R', 'S', 'T', 'N', 'E'].forEach((k, i) => {
            const x0 = i * 48 + 4, pe = k === 'E';
            s += `<path d="M${x0 + 20} -40V14" class="wire-halo"/><path d="M${x0 + 20} -40V14" class="wire-core" style="stroke:${colorCss(WANT[k])}"/>`;
            s += `<rect x="${x0}" y="0" width="40" height="120" rx="4" style="fill:${pe ? 'url(#bx-pe)' : '#cfd3cf'};stroke:#7d8580;stroke-width:1.2"/>`;
            s += `<circle cx="${x0 + 20}" cy="16" r="7.5" class="term-screw"/><rect x="${x0 + 7}" y="46" width="26" height="24" rx="2" style="fill:#fff;stroke:#8a908b"/><text x="${x0 + 20}" y="64" text-anchor="middle" style="font:700 15px var(--font-mono);fill:#1b1b1b">${k}</text>`;
          });
          s += `<rect x="244" y="0" width="7" height="120" rx="2" style="fill:#9ea4a0"/><text x="262" y="40" class="part-title">端子台 TB</text><text x="262" y="58" class="part-note">上方：電源進線</text><text x="262" y="74" class="part-note">3φ4W 220/380V</text>`;
        } else if (p.type === 'main') {
          s += breakerSvg(p, 150, 160, 3, on) + `<text x="75" y="138" text-anchor="middle" style="font:700 11px var(--font-mono);fill:#1c2421">NFB 3P 50A</text><text x="158" y="80" class="part-title">Q0 總開關</text><text x="158" y="98" class="part-note">點一下送電／斷電</text>`;
        } else if (p.type === 'mcb3' || p.type === 'mcb1') {
          const w = p.type === 'mcb3' ? 120 : 56;
          s += breakerSvg(p, w, 110, p.type === 'mcb3' ? 3 : 1, on) + `<text x="${w + 8}" y="46" class="part-title">${p.name.split(' ')[0]}</text><text x="${w + 8}" y="64" class="part-note">${p.name.split(' ').slice(1).join(' ')}</text><text x="${w + 8}" y="80" class="part-note">${p.note}</text>`;
        } else if (p.type === 'nbar' || p.type === 'ebar') {
          const e = p.type === 'ebar';
          s += `<rect x="0" y="0" width="300" height="26" rx="4" style="fill:#d8bf73;stroke:#9c8440"/>`;
          s += `<text x="0" y="-8" class="part-title" style="fill:${e ? 'var(--w-green)' : 'var(--board-ink)'}">${DEFS[p.type].kind}</text>`;
          if (e) s += `<path d="M300 13H318V30M306 30H330M310 36H326M314 42H322" style="stroke:var(--w-green);stroke-width:2.5;fill:none"/><text x="326" y="58" class="part-note">接箱體</text>`;
        } else if (p.type === 'pl') {
          const L = liveA && !liveA.short ? loadOf(liveA, p) : null;
          const lit = live && L && L.st === 'on';
          s += `<path d="M22 0V26M58 0V26" class="lead"/><rect x="0" y="20" width="80" height="80" rx="10" class="plate"/>`;
          s += `<circle cx="40" cy="60" r="30" fill="#FF9F1A" opacity="${lit ? 0.45 : 0}"/><circle cx="40" cy="60" r="16" style="fill:${lit ? '#FFB347' : '#7a5f4a'};stroke:var(--plate-ink);stroke-width:1.5"/>`;
          s += `<text x="40" y="120" text-anchor="middle" class="part-title">${p.id}（${p.ph} 相）</text>`;
          if (live && L && L.st === 'burn') s += `<text x="40" y="138" text-anchor="middle" class="part-note" style="fill:var(--bad)">380V 燒毀！</text>`;
        } else if (p.type === 'motor') {
          const M = liveA && !liveA.short ? motorState(liveA, p.id) : null;
          const run = live && M && M.st === 'run';
          s += `<path d="M30 0V24M70 0V24M110 0V24M160 0V24" class="lead"/><rect x="10" y="20" width="170" height="26" rx="4" style="fill:#c9d0d6;stroke:#7f8a93"/>`;
          s += `<rect x="20" y="46" width="150" height="80" rx="12" style="fill:#6f8aa3;stroke:#4d6478;stroke-width:1.5"/>`;
          for (let x = 34; x < 160; x += 12) s += `<path d="M${x} 52V120" style="stroke:#58728a;stroke-width:3"/>`;
          s += `<circle cx="95" cy="86" r="30" style="fill:#e9edf0;stroke:#4d6478;stroke-width:2"/>`;
          s += `<g class="box-fan${run ? ' spin' : ''}${run && !M.fwd ? ' rev' : ''}"><path d="M95 86L95 60A26 26 0 0 1 115 72ZM95 86L118 99A26 26 0 0 1 95 112ZM95 86L72 99A26 26 0 0 1 75 72Z" style="fill:#4d6478"/></g><circle cx="95" cy="86" r="5" style="fill:#2b2f33"/>`;
          s += `<text x="190" y="70" class="part-title">M 三相馬達</text><text x="190" y="88" class="part-note">380V，外殼要接地</text>`;
          if (live && M) {
            const txt = M.st === 'run' ? (M.fwd ? '正轉 ↻' : '反轉 ↺') : M.st === 'single' ? '缺相，轉不動！' : '';
            if (txt) s += `<rect x="190" y="96" width="${M.st === 'run' ? 70 : 110}" height="22" rx="4" style="fill:${M.st === 'run' && M.fwd ? '#1B7D45' : '#8a2a20'}"/><text x="${M.st === 'run' ? 225 : 245}" y="111" text-anchor="middle" style="font:700 12px var(--font-body);fill:#fff">${txt}</text>`;
          }
        } else if (p.type === 'lamp') {
          const L = liveA && !liveA.short ? loadOf(liveA, p) : null;
          const lit = live && L && L.st === 'on';
          s += `<path d="M30 0V70M70 0V70" class="lead"/><circle cx="50" cy="78" r="46" fill="url(#bxGlow)" opacity="${lit ? 0.9 : 0}"/>`;
          s += `<rect x="30" y="54" width="40" height="22" rx="3" style="fill:#bdbdb3;stroke:var(--plate-edge)"/><circle cx="50" cy="96" r="24" style="fill:${lit ? '#FFD650' : 'var(--bulb-off)'};stroke:var(--plate-edge);stroke-width:2"/>`;
          s += `<text x="100" y="70" class="part-title">H 燈</text><text x="100" y="88" class="part-note">220V</text>`;
          if (live && L && L.st === 'burn') s += `<text x="100" y="106" class="part-note" style="fill:var(--bad)">380V 燒毀！</text>`;
        } else if (p.type === 'sock') {
          const L = liveA && !liveA.short ? loadOf(liveA, p) : null;
          s += `<path d="M25 0V24M65 0V24M105 0V24" class="lead"/><rect x="0" y="20" width="130" height="100" rx="12" class="plate"/>`;
          s += `<rect x="24" y="48" width="30" height="9" rx="2" style="fill:var(--plate-ink)"/><rect x="76" y="48" width="30" height="9" rx="2" style="fill:var(--plate-ink)"/><path d="M56 84a9 9 0 0 1 18 0v8h-18z" style="fill:var(--plate-ink)"/>`;
          s += `<text x="140" y="60" class="part-title">O 插座</text><text x="140" y="78" class="part-note">220V</text>`;
          if (live && L) s += `<rect x="140" y="88" width="64" height="22" rx="4" style="fill:${L.st === 'on' ? '#1B7D45' : '#8a2a20'}"/><text x="172" y="103" text-anchor="middle" style="font:700 12px var(--font-mono);fill:#fff">${L.st === 'on' ? '220 V' : L.st === 'burn' ? '380 V' : '0 V'}</text>`;
        }
        g.innerHTML = s;
        if (BRK.includes(p.type)) { g.setAttribute('class', 'clickable'); g.dataset.brk = p.id; }
        return g;
      }
      function draw() {
        svg.innerHTML = `<defs>
          <radialGradient id="bxGlow"><stop offset="0" stop-color="#FFE27A" stop-opacity=".95"/><stop offset="1" stop-color="#FFE27A" stop-opacity="0"/></radialGradient>
          <pattern id="bx-pe" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#2a9d4b"/><rect width="6" height="12" fill="#e8c93a"/></pattern></defs>
          <rect width="${W}" height="${H}" style="fill:var(--enclosure)"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="10" style="fill:var(--surface-2);stroke:var(--enclosure-edge);stroke-width:2"/>`;
        lv.parts.forEach(p => svg.append(drawPart(p)));
        const pairCount = new Map();
        const gW = sv('g', {});
        allWires(lv, wires).forEach(w => {
          const t1 = termPos(w.a), t2 = termPos(w.b);
          if (!t1 || !t2) return;
          const key = [w.a, w.b].sort().join('|');
          const k = pairCount.get(key) || 0;
          pairCount.set(key, k + 1);
          const d = wirePath(t1, t2, k * 16);
          const g = sv('g', w.fixed ? { opacity: '.75' } : { 'data-w': w.id });
          if (w.id === selWire) g.append(sv('path', { d, class: 'wire-sel' }));
          if (lastGrade && lastGrade.badWires.has(w.id)) g.append(sv('path', { d, style: 'stroke:var(--bad);stroke-width:12;fill:none;opacity:.35;stroke-dasharray:6 5' }));
          g.append(sv('path', { d, class: 'wire-halo' }), sv('path', { d, class: 'wire-core', style: `stroke:${colorCss(w.c)}` }));
          if (!w.fixed) g.append(sv('path', { d, class: 'wire-hit' }));
          gW.append(g);
        });
        svg.append(gW);
        termList().forEach(t => {
          const tg = sv('g', { class: 'term' + (pending === t.id ? ' pending' : ''), 'data-t': t.id, transform: `translate(${t.x},${t.y})` });
          tg.append(sv('circle', { r: t.bar ? 12 : 16, class: 'term-hit' }), sv('circle', { r: t.bar ? 6.5 : 7.5, class: 'term-screw' }), sv('path', { d: 'M-4 -4L4 4', class: 'term-slot' }));
          if (t.label && !t.id.startsWith('TB.') && !t.id.startsWith('Q0.')) tg.append(sv('text', { y: t.dir === 'up' ? -12 : 26, 'text-anchor': 'middle', class: 'term-label' }, t.label));
          tg.append(sv('title', {}, termName(lv, t.id)));
          svg.append(tg);
        });
        const lab = sv('g', {});
        lab.innerHTML = ['R', 'S', 'T'].map((k, i) => `<text x="${430 + i * 45}" y="186" text-anchor="middle" class="term-label">${k}</text><text x="${430 + i * 45}" y="390" text-anchor="middle" class="term-label">${k}</text>`).join('');
        svg.append(lab);
        rubber = sv('path', { class: 'rubber', style: `stroke:${colorCss(color)}`, d: '' });
        svg.append(rubber);
      }
      let rubber = null;

      function drawSide() {
        const s = store().stars[lv.id] || 0;
        const parts = [h('div', { class: 'card stack' },
          h('div', { class: 'eyebrow' }, `第 ${idx + 1} 關 · 3φ4W 220/380V`),
          h('h3', {}, lv.name),
          h('p', { html: lv.goal }),
          h('div', { class: 'callout small', html: lv.concept }),
          h('details', { class: 'hint' }, h('summary', {}, '看步驟提示'), h('ol', { class: 'steps' }, lv.steps.map(t => h('li', { html: t })))),
        )];
        if (lastGrade) {
          const g = lastGrade, pass = !g.fails.length;
          const stars = pass ? 1 + (g.safety.length ? 0 : 1) + (g.style.length ? 0 : 1) : 0;
          const items = [...g.fails.map(t => ({ c: 'fail', ic: '✕', t })), ...g.safety.map(t => ({ c: 'safety', ic: '!', t })), ...g.style.map(t => ({ c: 'style', ic: '!', t }))];
          if (pass) items.unshift({ c: 'pass', ic: '✓', t: '功能正確：每個負載都拿到正確的電壓，而且都受開關保護。' });
          if (pass && !g.safety.length) items.push({ c: 'pass', ic: '✓', t: '用電安全：接地完整、N 與 E 分開。' });
          if (pass && !g.style.length) items.push({ c: 'pass', ic: '✓', t: '線色、相序與端子線數正確。' });
          parts.push(h('div', { class: 'card stack' },
            h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', {}, pass ? '通過！' : '還沒通過'), h('span', { html: starsHTML(stars) })),
            h('ul', { class: 'result-list' }, items.map(x => h('li', { class: x.c }, h('span', { class: 'ic' }, x.ic), h('span', { html: x.t })))),
            pass ? h('div', { class: 'callout ok small', html: '<b>學到了：</b>' + lv.learn }) : null,
            pass && idx + 1 < LEVELS.length ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => open(idx + 1) }, '下一關 →') : null,
            pass && idx + 1 === LEVELS.length ? h('a', { class: 'btn btn-primary', href: '#home' }, '全部完成，回配電盤') : null,
          ));
        } else {
          parts.push(h('div', { class: 'card small muted stack' },
            h('div', {}, '評分標準：'),
            h('div', { html: '★ 功能正確（電壓、馬達轉向、開關保護）<br>★ 用電安全（接地完整、N 與 E 分開）<br>★ 線色、相序、負載平衡與端子線數' }),
            s ? h('div', { html: '目前最佳：' + starsHTML(s) }) : null,
          ));
        }
        side.replaceChildren(...parts);
      }

      function flashTrip(msg) {
        const g = sv('g', { class: 'trip-flash' });
        g.innerHTML = `<rect width="${W}" height="${H}" fill="#E23B2E" opacity=".35"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" style="font-family:var(--font-display);font-size:54px;font-weight:700;fill:#fff;stroke:#7a120b;stroke-width:2">⚡ 跳脫！</text>`;
        svg.append(g);
        setTimeout(() => g.remove(), 1500);
        setStatus(msg, 'bad');
      }
      function evalLive() {
        liveA = analyze(lv, wires, { ...st, Q0: 1 });
        if (liveA.short) {
          const msg = `<b>${shortText(liveA.short)}</b>總開關跳脫了。檢查看看是哪條線接錯。`;
          live = false; liveA = null; st.Q0 = 0;
          btnPower.textContent = '⚡ 送電'; btnPower.classList.remove('btn-danger');
          beep(140, 0.35, 'sawtooth', 0.06);
          draw(); flashTrip(msg);
          return;
        }
        draw(); setStatus();
      }
      function setPower(on) {
        if (on && !allWires(lv, wires).length) { toast('電箱裡還沒有配線。'); return; }
        live = on; st.Q0 = on ? 1 : 0; pending = null; selWire = null; btnDel.disabled = true;
        btnPower.textContent = on ? '斷電' : '⚡ 送電';
        btnPower.classList.toggle('btn-danger', on);
        if (on) { beep(520, 0.06); evalLive(); } else { liveA = null; draw(); setStatus(); }
      }
      const busy = () => toast('帶電中不可施工！請先把總開關 Q0 關掉。', 'bad');
      function clickTerminal(id) {
        if (live) return busy();
        selWire = null; btnDel.disabled = true;
        if (!pending) { pending = id; beep(900, 0.02); }
        else if (pending === id) pending = null;
        else {
          const a = pending, b = id;
          pending = null;
          if (allWires(lv, wires).some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a))) toast('這兩個端子之間已經有一條線了。');
          else { pushUndo(); wires.push({ id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), a, b, c: color }); save(); beep(1200, 0.03); }
        }
        draw(); setStatus();
      }
      svg.addEventListener('click', ev => {
        const bEl = ev.target.closest('[data-brk]'), tEl = ev.target.closest('[data-t]'), wEl = ev.target.closest('[data-w]');
        if (tEl) return clickTerminal(tEl.dataset.t);
        if (bEl) {
          const id = bEl.dataset.brk;
          if (id === 'Q0') return setPower(!live);
          st[id] = st[id] ? 0 : 1; beep(700, 0.03);
          if (live) evalLive(); else { draw(); setStatus(`${id} 切到 ${st[id] ? 'ON' : 'OFF'}。總開關 Q0 還沒送電。`); }
          return;
        }
        if (wEl) {
          if (live) return busy();
          pending = null; selWire = selWire === wEl.dataset.w ? null : wEl.dataset.w; btnDel.disabled = !selWire;
          draw(); setStatus(); return;
        }
        if (pending || selWire) { pending = null; selWire = null; btnDel.disabled = true; draw(); setStatus(); }
      });
      svg.addEventListener('pointermove', ev => {
        if (!pending || !rubber) return;
        const t = termPos(pending);
        const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        rubber.setAttribute('d', `M${t.x} ${t.y}L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      });
      function delSel() {
        if (!selWire || live) return;
        pushUndo(); wires = wires.filter(w => w.id !== selWire); selWire = null; btnDel.disabled = true;
        save(); draw(); setStatus();
      }
      btnDel.addEventListener('click', delSel);
      btnUndo.addEventListener('click', () => {
        if (live) return toast('請先斷電。');
        if (!undo.length) return toast('沒有可以復原的步驟。');
        wires = JSON.parse(undo.pop()); selWire = null; pending = null; save(); draw(); setStatus();
      });
      let clearArmed = false;
      btnClear.addEventListener('click', () => {
        if (live) return toast('請先斷電。');
        if (!clearArmed) { clearArmed = true; btnClear.textContent = '再按一次確認清空'; setTimeout(() => { clearArmed = false; btnClear.textContent = '清空'; }, 2500); return; }
        clearArmed = false; btnClear.textContent = '清空';
        pushUndo(); wires = []; selWire = null; pending = null; save(); draw(); setStatus();
      });
      btnPower.addEventListener('click', () => setPower(!live));
      btnGrade.addEventListener('click', () => {
        if (live) setPower(false);
        const g = grade(lv, wires);
        lastGrade = g;
        if (!g.fails.length) {
          const stars = 1 + (g.safety.length ? 0 : 1) + (g.style.length ? 0 : 1);
          const b = store();
          if (stars > (b.stars[lv.id] || 0)) { b.stars[lv.id] = stars; Store.save(); }
          toast(stars === 3 ? '滿分！三顆星。' : `通過，${stars} 顆星。看看右邊哪裡可以更好。`, 'ok');
          beep(988, 0.08, 'sine', 0.05); setTimeout(() => beep(1319, 0.12, 'sine', 0.05), 90);
          updateOverall();
        } else beep(220, 0.2, 'sawtooth', 0.03);
        drawStrip(); drawSide(); draw();
        if (window.matchMedia('(max-width: 1000px)').matches) side.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      });
      const onKey = e => {
        if (e.target.closest && e.target.closest('input, textarea')) return;
        if (e.key === 'Escape') { pending = null; selWire = null; btnDel.disabled = true; draw(); setStatus(); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && selWire) { e.preventDefault(); delSel(); }
        else if (['1', '2', '3', '4', '5'].includes(e.key)) palette.querySelector(`[data-c="${COLORS[+e.key - 1].k}"]`).click();
      };
      document.addEventListener('keydown', onKey);
      drawPalette(); draw(); drawSide(); setStatus();
      return () => document.removeEventListener('keydown', onKey);
    }

    const B = store();
    const firstOpen = LEVELS.findIndex(L => !(B.stars[L.id] > 0));
    open(!B.asm ? 'asm' : firstOpen < 0 ? 0 : firstOpen);
  }

  function progress() {
    const B = store();
    return ((B.asm ? 1 : 0) + LEVELS.filter(L => (B.stars[L.id] || 0) > 0).length) / (LEVELS.length + 1);
  }

  return { render, progress, LEVELS, grade, analyze };
})();
