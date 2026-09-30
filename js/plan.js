'use strict';
/* 迴路 07 居家用電規劃：生活中的串聯與並聯、電盤能承受多少瓦、銅線怎麼選
   規則數字出處：用戶用電設備裝置規則（PVC 管配線安培容量表、第 7 條電壓降、第 19 條分路最小線徑、第 38 條連續負載 80%、第 79 條過電流保護）。 */
(() => {
  const LAMP_R = 110 * 110 / 60;
  /* PVC 管配線導線安培容量（絕緣物 60°C、周溫 35°C 以下、同一導線管內 3 條以下） */
  const WIRES = [
    { k: '1.6', name: '1.6mm 單線', amp: 13, area: 2.011, branch: false },   // 第 19 條：照明、插座、電熱分路最小 2.0mm
    { k: '2.0', name: '2.0mm 單線', amp: 18, area: 3.142, branch: true },
    { k: '3.5', name: '3.5mm² 絞線', amp: 19, area: 3.519, branch: true },
    { k: '5.5', name: '5.5mm² 絞線', amp: 25, area: 5.498, branch: true },
    { k: '8', name: '8mm² 絞線', amp: 33, area: 7.917, branch: true },
    { k: '14', name: '14mm² 絞線', amp: 50, area: 14.07, branch: true },
  ];
  const RHO = 0.01724;                                   // 銅的電阻率（20°C，Ω·mm²/m）
  const ohmKm = w => RHO / w.area * 1000;
  const BREAKERS = [10, 15, 20, 30, 40, 50];
  const segBtns = (box, list, cur, on) => {
    box.replaceChildren(...list.map(([k, label]) => h('button', {
      type: 'button', 'aria-pressed': k === cur ? 'true' : 'false', onclick: () => on(k),
    }, label)));
  };

  /* ===================== 1. 插座一路接過去（3D） ===================== */
  const chain = {
    title: '插座一路接過去，是串聯還是並聯？',
    html: `
      <div class="prose">
        <p>家裡同一個分路的插座，常常是從分電盤拉線到第一個插座，再從它的端子「跳」到下一個插座，一路接過去，這叫做<b>分歧</b>。看起來像串成一串，其實是<b>並聯</b>：每個插座都各自跨在火線 L 和中性線 N 之間，都拿到完整的 110V。</p>
      </div>
      <div class="bench-head"><span class="small muted">試試下面的按鈕，觀察三盞檯燈</span><div class="seg" role="group" aria-label="顯示方式" data-o="views"></div></div>
      <div class="board3d life3d" data-o="scene"></div>
      <div class="figure" data-o="schemBox" hidden><svg data-o="schem" viewBox="0 0 640 250" role="img" aria-label="三個插座並聯的電路圖"></svg></div>
      <div class="row" data-o="ctrls"></div>
      <div class="callout" data-o="msg" aria-live="polite"></div>`,
    mount(el) {
      let can3d = typeof Life3D !== 'undefined' && typeof Bench3D !== 'undefined' && Bench3D.supported();
      const st = { plugged: [true, true, true], loose: false, view: can3d ? '3d' : 'schem' };
      let model = null, life = null;
      const scene = el.querySelector('[data-o="scene"]');
      const schemBox = el.querySelector('[data-o="schemBox"]');
      const svg = el.querySelector('[data-o="schem"]');
      const views = el.querySelector('[data-o="views"]');
      const ctrls = el.querySelector('[data-o="ctrls"]');
      const msg = el.querySelector('[data-o="msg"]');

      function compute() {
        const E = [];
        const W = (a, b, id) => E.push({ a, b, R: 0.01, id });
        W('SL', 'L1', 'feedL'); if (!st.loose) W('L1', 'L2', 'j12L'); W('L2', 'L3', 'j23L');
        W('SN', 'N1', 'feedN'); W('N1', 'N2', 'j12N'); W('N2', 'N3', 'j23N');
        [1, 2, 3].forEach(i => { if (st.plugged[i - 1]) E.push({ a: 'L' + i, b: 'N' + i, R: LAMP_R, id: 'lamp' + i }); });
        const s = Circuit.solve(E, { SL: 110, SN: 0 });
        const I = id => { const e = E.find(x => x.id === id); return e ? Math.abs(s.current(e)) : 0; };
        const lamps = [1, 2, 3].map(i => st.plugged[i - 1] ? Math.pow(s.V('L' + i) - s.V('N' + i), 2) / LAMP_R / 60 : 0);
        const flow = {};
        ['feed', 'j12', 'j23'].forEach(n => ['L', 'N'].forEach(c => { flow[n + c] = I(n + c) > 0.01; }));
        return { plugged: st.plugged.slice(), loose: st.loose, lamps, flow };
      }
      function drawSchem() {
        const xs = [200, 350, 500];
        const lit = model.lamps;
        let s = `<defs><radialGradient id="plan-glow"><stop offset="0" stop-color="#ffe27a" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd24a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient></defs>
          <rect x="18" y="70" width="84" height="110" rx="8" class="schem-box"/>
          <text x="60" y="120" text-anchor="middle" class="schem-title">分電盤</text><text x="60" y="140" text-anchor="middle" class="schem-txt">110V</text>`;
        const rail = (y, x1, x2, c) => `<path d="M${x1} ${y}H${x2}" class="wire-halo"/><path d="M${x1} ${y}H${x2}" class="wire-core" style="stroke:${c}"/>`;
        s += rail(60, 102, st.loose ? 268 : 540, 'var(--w-red)');
        if (st.loose) s += rail(60, 282, 540, 'var(--w-red)') + `<path d="M268 50l14 20M282 50l-14 20" style="stroke:var(--bad);stroke-width:3"/><text x="275" y="40" text-anchor="middle" class="schem-title" style="fill:var(--bad)">O2 接點鬆脫</text>`;
        s += rail(200, 102, 540, 'var(--w-white)');
        s += `<text x="548" y="64" class="schem-txt">L</text><text x="548" y="204" class="schem-txt">N</text>`;
        xs.forEach((x, i) => {
          const r = lit[i], on = r > 0.02, gone = !st.plugged[i];
          s += `<path d="M${x} 60V102M${x} 158V200" style="stroke:var(--ink);stroke-width:2;${gone ? 'stroke-dasharray:4 4' : ''}"/>
            <circle cx="${x}" cy="60" r="4" style="fill:var(--ink)"/><circle cx="${x}" cy="200" r="4" style="fill:var(--ink)"/>
            ${on ? `<circle cx="${x}" cy="130" r="46" fill="url(#plan-glow)" opacity="${Math.min(1, r).toFixed(2)}"/>` : ''}
            <circle cx="${x}" cy="130" r="22" style="fill:${gone ? 'none' : on ? 'rgba(255,214,80,.95)' : 'var(--surface)'};stroke:var(--ink);stroke-width:2;${gone ? 'stroke-dasharray:4 4' : ''}"/>
            ${gone ? '' : `<path d="M${x - 15} 115L${x + 15} 145M${x + 15} 115L${x - 15} 145" style="stroke:var(--ink);stroke-width:2"/>`}
            <text x="${x + 32}" y="118" class="schem-title">O${i + 1}</text>
            <text x="${x + 32}" y="136" class="schem-txt">${gone ? '已拔掉' : on ? '亮' : '沒電'}</text>`;
        });
        svg.innerHTML = s;
      }
      function drawCtrls() {
        ctrls.replaceChildren(
          h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { st.plugged[0] = !st.plugged[0]; update(); } }, st.plugged[0] ? '拔掉 O1 的檯燈' : '插回 O1 的檯燈'),
          h('button', { type: 'button', class: 'btn btn-sm' + (st.loose ? ' btn-danger' : ''), onclick: () => { st.loose = !st.loose; update(); } }, st.loose ? '把 O2 的火線接點鎖緊' : '讓 O2 的火線接點鬆脫'),
          h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { st.plugged = [true, true, true]; st.loose = false; update(); } }, '全部恢復'),
        );
      }
      function drawMsg() {
        if (st.loose) {
          msg.className = 'callout warn';
          msg.innerHTML = '<b>O2 的火線接點鬆了：O2、O3 都沒電，但 O1 還有電。</b>' +
            (st.plugged[0] ? '' : '（O1 的檯燈現在拔掉了，所以看起來不亮，插座本身還是有電。）') +
            '插座是並聯沒錯，但電是經過 O1、O2 的端子一路「接力」送過去的，前面的接點一鬆，後面的插座就全部沒電。「一整排插座突然沒電」最常見的原因就是這個。查修時先找出「最後一個有電」和「第一個沒電」的插座，問題通常就在這兩個之間的接點。';
        } else if (!st.plugged[0]) {
          msg.className = 'callout ok';
          msg.innerHTML = '<b>拔掉 O1 的檯燈，O2、O3 照樣亮。</b>並聯的電器互不影響，每一盞都直接拿到 110V。如果是串聯，拔掉一盞，其他的就全部熄了。';
        } else {
          msg.className = 'callout';
          msg.innerHTML = '三盞燈都一樣亮：每一盞都直接接在 L 和 N 之間，拿到完整的 110V。發亮的虛線表示電流的路徑：從分電盤經火線送過去，再經中性線回來（交流電方向會來回變化，這裡是示意）。';
        }
      }
      function drawViews() {
        const list = can3d ? [['3d', '3D 實體'], ['schem', '電路圖']] : [['schem', '電路圖']];
        segBtns(views, list, st.view, v => { st.view = v; drawViews(); update(); });
        scene.hidden = st.view !== '3d';
        schemBox.hidden = st.view !== 'schem';
      }
      function update() {
        model = compute();
        drawSchem(); drawCtrls(); drawMsg();
        if (life) life.sync();
      }
      if (can3d) {
        life = Life3D.create(scene, { getModel: () => model });
        life.ready.catch(() => {
          if (!life) return;                             // 已經離開這張卡
          life.dispose(); life = null; can3d = false; st.view = 'schem';
          drawViews(); toast('3D 場景載入失敗，先改用電路圖。');
        });
      }
      drawViews();
      update();
      return () => { if (life) life.dispose(); life = null; };
    },
  };

  /* ===================== 2. 生活中的串聯與並聯 ===================== */
  const everyday = {
    title: '生活中的串聯與並聯',
    html: `
      <div class="prose"><p>家裡的插座和燈都是並聯，那串聯在哪裡？其實到處都有。挑一個例子，動手玩玩看：</p></div>
      <div class="seg" role="group" aria-label="例子" data-o="tabs"></div>
      <div class="figure"><svg data-o="pic" viewBox="0 0 640 230" role="img" aria-label="例子示意圖"></svg></div>
      <div class="row" data-o="ctrls"></div>
      <div class="callout" data-o="msg" aria-live="polite"></div>`,
    mount(el) {
      const svg = el.querySelector('[data-o="pic"]');
      const ctrls = el.querySelector('[data-o="ctrls"]');
      const msg = el.querySelector('[data-o="msg"]');
      const tabs = el.querySelector('[data-o="tabs"]');
      const st = { tab: 'torch', torch: { mode: 'series', flip: false, remove: false }, xmas: { type: 'series', removed: false }, strip: { on: true, unplug: false } };
      const DEFS = `<defs><radialGradient id="plan-glow2"><stop offset="0" stop-color="#ffe27a" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd24a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient></defs>`;
      const glow = (x, y, r, b) => b > 0.02 ? `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="url(#plan-glow2)" opacity="${b.toFixed(2)}"/>` : '';
      const btn = (label, fn, danger) => h('button', { type: 'button', class: 'btn btn-sm' + (danger ? ' btn-danger' : ''), onclick: () => { fn(); draw(); } }, label);

      function drawTorch() {
        const t = st.torch;
        let V = 0, note = '', short = false;
        if (t.mode === 'series') V = t.remove ? 0 : t.flip ? 0 : 3;
        else { V = 1.5; short = t.flip && !t.remove; if (short) V = 0; }
        const b = Math.min(1, (V / 3) ** 2);
        const battery = (x, y, flip, gone) => gone
          ? `<rect x="${x}" y="${y}" width="120" height="44" rx="10" style="fill:none;stroke:var(--ink-3);stroke-dasharray:5 5"/><text x="${x + 60}" y="${y + 28}" text-anchor="middle" class="schem-txt">已拿掉</text>`
          : `<rect x="${x}" y="${y}" width="120" height="44" rx="10" style="fill:#2f5d8c"/><rect x="${flip ? x - 8 : x + 120}" y="${y + 14}" width="8" height="16" rx="2" style="fill:#c9ccd0"/>
             <text x="${x + 60}" y="${y + 28}" text-anchor="middle" style="font-family:var(--font-mono);font-size:13px;font-weight:700;fill:#fff">${flip ? '+ 1.5V −' : '− 1.5V +'}</text>`;
        let s = `<rect x="40" y="50" width="420" height="130" rx="30" style="fill:var(--surface-2);stroke:var(--ink-3);stroke-width:2"/>
          <path d="M460 70l70-30v150l-70-30z" style="fill:var(--surface-2);stroke:var(--ink-3);stroke-width:2"/>
          ${glow(540, 115, 34, b)}<circle cx="540" cy="115" r="24" style="fill:${b > 0.02 ? `rgba(255,214,80,${0.3 + 0.7 * b})` : 'var(--bulb-off)'};stroke:var(--ink);stroke-width:2"/>`;
        if (t.mode === 'series') s += battery(90, 93, false, false) + battery(230, 93, t.flip, t.remove);
        else {
          s += battery(160, 65, false, false) + battery(160, 125, t.flip, t.remove) + `<path d="M150 87V147M290 87V147" style="stroke:${short ? 'var(--bad)' : 'var(--copper)'};stroke-width:${short ? 5 : 3}"/>`;
          if (short) s += `<text x="375" y="121" text-anchor="middle" class="schem-title" style="fill:var(--bad)">⚠ 短路發熱</text>`;
        }
        s += `<text x="250" y="215" text-anchor="middle" class="schem-title">燈泡兩端電壓：${V.toFixed(1)} V（燈泡額定 3V）</text>`;
        svg.innerHTML = DEFS + s;
        ctrls.replaceChildren(
          h('div', { class: 'seg', role: 'group', 'aria-label': '電池接法' }, [['series', '頭尾相接（串聯）'], ['parallel', '並排（並聯）']].map(([k, l]) =>
            h('button', { type: 'button', 'aria-pressed': t.mode === k ? 'true' : 'false', onclick: () => { t.mode = k; t.flip = false; t.remove = false; draw(); } }, l))),
          btn(t.flip ? '把電池轉回來' : '反裝一顆電池', () => { t.flip = !t.flip; }),
          btn(t.remove ? '裝回電池' : '拿掉一顆電池', () => { t.remove = !t.remove; }),
        );
        if (t.mode === 'series') {
          note = t.remove ? '串聯時拿掉一顆，電路斷了，燈就不亮。' : t.flip ? '反裝的電池會把另一顆的電壓「抵消」：1.5V − 1.5V = 0V，燈不亮。裝電池要注意正負極方向。' : '兩顆 1.5V 頭尾相接（串聯），電壓相加變 3V，燈泡正常亮。手電筒、遙控器都是這樣裝。';
          msg.className = 'callout' + (t.remove || t.flip ? ' warn' : ' ok');
        } else {
          note = short ? '<b>危險！</b>並聯時反裝一顆，兩顆電池會互相短路，電流很大、會發熱甚至漏液。' : t.remove ? '並聯時拿掉一顆，另一顆照樣供電：並聯的好處是電壓不變、可以用比較久。' : '並聯時電壓不變，仍是 1.5V，燈泡只有約四分之一亮度；好處是容量變大、用得比較久。';
          msg.className = 'callout' + (short ? ' bad' : '');
        }
        msg.innerHTML = note;
      }

      function drawXmas() {
        const t = st.xmas;
        const colors = ['#e5484d', '#f2b705', '#2a9d4b', '#3b82f6'];
        const on = i => t.type === 'series' ? !t.removed : !(t.removed && i === 3);
        const wy = x => 80 + 16 * Math.sin((x - 30) / 112 * Math.PI);
        let d = `M30 ${wy(30)}`;
        for (let x = 34; x <= 614; x += 4) d += `L${x} ${wy(x).toFixed(1)}`;
        let s = `<path d="${d}" style="fill:none;stroke:var(--ink-2);stroke-width:3;stroke-linejoin:round"/>
          <rect x="4" y="${wy(30) - 14}" width="26" height="28" rx="4" style="fill:var(--surface-2);stroke:var(--ink-3)"/><text x="17" y="${wy(30) + 34}" text-anchor="middle" class="schem-txt">插頭</text>`;
        for (let i = 0; i < 10; i++) {
          const x = 70 + i * 56, y0 = wy(x), y = y0 + 22;
          const lit = on(i), gone = t.removed && i === 3;
          s += `<path d="M${x} ${y0.toFixed(1)}V${y - 10}" style="stroke:var(--ink-2);stroke-width:2"/><rect x="${x - 5}" y="${y - 13}" width="10" height="6" rx="1.5" style="fill:var(--ink-3)"/>`;
          s += gone ? `<circle cx="${x}" cy="${y}" r="10" style="fill:none;stroke:var(--ink-3);stroke-dasharray:3 3"/>`
            : `${lit ? `<circle cx="${x}" cy="${y}" r="21" fill="${colors[i % 4]}" opacity=".35"/>` : ''}<circle cx="${x}" cy="${y}" r="10" style="fill:${lit ? colors[i % 4] : 'var(--bulb-off)'};stroke:var(--ink-3)"/>`;
        }
        s += `<text x="320" y="186" text-anchor="middle" class="schem-title">${t.type === 'series' ? '10 顆串聯在 110V：每顆約分到 11V' : '每顆各自並聯在電源上'}</text>`;
        svg.innerHTML = DEFS + s;
        ctrls.replaceChildren(
          h('div', { class: 'seg', role: 'group', 'aria-label': '燈串種類' }, [['series', '老式（串聯）'], ['parallel', '並聯式']].map(([k, l]) =>
            h('button', { type: 'button', 'aria-pressed': t.type === k ? 'true' : 'false', onclick: () => { t.type = k; draw(); } }, l))),
          btn(t.removed ? '裝回第 4 顆' : '拔掉第 4 顆燈泡', () => { t.removed = !t.removed; }),
        );
        msg.className = 'callout' + (t.removed && t.type === 'series' ? ' warn' : '');
        msg.innerHTML = t.type === 'series'
          ? (t.removed ? '<b>整串都熄了！</b>老式燈串是串聯，拔掉（或燒掉）一顆，電流的路就斷了。以前過節掛燈，常要一顆一顆找是哪一顆壞掉。' : '老式聖誕燈串把 10 顆小燈泡串起來接 110V，每顆只分到約 11V，所以可以用很小的燈泡。')
          : (t.removed ? '並聯式燈串拔掉一顆，其他照樣亮。現在的燈串多半改用並聯或「串並聯」混合，就是為了避免一顆壞全暗。' : '每顆燈泡各自並聯在電源上，互不影響。');
      }

      function drawStrip() {
        const t = st.strip;
        const names = ['檯燈', '電風扇', '手機充電', '收音機'];
        let s = `<rect x="90" y="120" width="500" height="70" rx="14" style="fill:var(--plate);stroke:var(--plate-edge);stroke-width:2"/>
          <rect x="110" y="136" width="34" height="38" rx="6" style="fill:${t.on ? '#e5484d' : '#8a8f8c'}"/>
          <text x="127" y="210" text-anchor="middle" class="schem-txt">總開關 ${t.on ? 'ON' : 'OFF'}</text>
          <path d="M90 155H14" style="stroke:var(--ink-2);stroke-width:5"/><text x="50" y="140" text-anchor="middle" class="schem-txt">往牆上插座</text>`;
        names.forEach((n, i) => {
          const x = 190 + i * 100;
          const plugged = !(t.unplug && i === 1);
          const run = t.on && plugged;
          s += `<rect x="${x}" y="138" width="60" height="34" rx="6" style="fill:var(--surface-2);stroke:var(--plate-edge)"/>`;
          if (plugged) s += `<rect x="${x + 16}" y="128" width="28" height="22" rx="4" style="fill:#2f2f2f"/><path d="M${x + 30} 128V96" style="stroke:#2f2f2f;stroke-width:4"/>`;
          s += `<rect x="${x - 8}" y="40" width="76" height="52" rx="10" style="fill:${run ? 'rgba(242,183,5,.25)' : 'var(--surface-2)'};stroke:${run ? 'var(--accent)' : 'var(--ink-3)'};stroke-width:2"/>
            <text x="${x + 30}" y="62" text-anchor="middle" class="schem-title">${n}</text><text x="${x + 30}" y="80" text-anchor="middle" class="schem-txt">${!plugged ? '已拔掉' : run ? '運作中' : '沒電'}</text>`;
        });
        svg.innerHTML = DEFS + s;
        ctrls.replaceChildren(
          btn(t.on ? '關掉延長線總開關' : '打開延長線總開關', () => { t.on = !t.on; }),
          btn(t.unplug ? '插回電風扇' : '拔掉電風扇', () => { t.unplug = !t.unplug; }),
        );
        msg.className = 'callout' + (!t.on ? ' warn' : '');
        msg.innerHTML = !t.on
          ? '<b>總開關一關，全部都沒電：</b>總開關和後面的插孔是<b>串聯</b>。'
          : t.unplug ? '拔掉電風扇，其他電器照常運作：插孔之間是<b>並聯</b>。' : '延長線 =「一個串聯的總開關」＋「幾個並聯的插孔」。延長線也有額定（常見 15A／1650W），全部電器加起來不能超過，吹風機、電暖器這類大電器最好直接插牆上插座。';
      }

      function draw() {
        segBtns(tabs, [['torch', '手電筒電池'], ['xmas', '聖誕燈串'], ['strip', '延長線']], st.tab, k => { st.tab = k; draw(); });
        if (st.tab === 'torch') drawTorch(); else if (st.tab === 'xmas') drawXmas(); else drawStrip();
      }
      draw();
    },
  };

  /* ===================== 3. 判斷題 ===================== */
  const judge = {
    title: '判斷題：串聯還是並聯？',
    html: `<div class="prose"><p>看情境判斷是串聯、並聯，還是兩種都有。答完會告訴你電流怎麼走。</p></div><div data-o="game"></div>`,
    mount(el) {
      const box = el.querySelector('[data-o="game"]');
      const ITEMS = [
        ['從第一個插座「跳接」到第二、第三個插座，三個插座之間是？', '並聯', '每個插座都跨在 L 和 N 之間；線雖然是一路接過去，電路上仍是並聯。'],
        ['牆上的開關和它控制的天花板燈是？', '串聯', '開關串在燈的火線上，開關導通，電流才能流過燈。'],
        ['手電筒裡兩顆電池頭尾相接，是？', '串聯', '頭尾相接電壓相加：1.5V + 1.5V = 3V。'],
        ['冰箱和電視分別插在客廳和廚房的插座上，它們之間是？', '並聯', '家裡的電器都並聯，各自拿到 110V，互不影響。'],
        ['延長線上的總開關，和延長線上的插孔之間是？', '兩種都有', '總開關和整組插孔是串聯（一關全部沒電），插孔之間是並聯。'],
        ['分電盤裡的無熔絲開關，和它保護的那一個分路是？', '串聯', '斷路器串在分路的線上，過載時跳開就能切斷整個分路。'],
        ['同一個開關控制客廳 4 盞崁燈，燒掉一盞其他照亮。4 盞燈之間是？', '並聯', '燈和燈之間並聯，所以一盞壞了不影響其他盞；它們再和開關串聯。'],
        ['老式聖誕燈串，拔掉一顆整串都熄，燈泡之間是？', '串聯', '串聯只有一條電流路徑，任何一顆斷了整串都斷。'],
      ];
      let i = 0, score = 0;
      const draw = () => {
        if (i >= ITEMS.length) {
          box.replaceChildren(h('div', { class: 'card stack' },
            h('div', { class: 'row', style: { alignItems: 'baseline', gap: '12px' } }, h('span', { class: 'score-big' }, `${score}/${ITEMS.length}`), h('span', { class: 'muted' }, '題答對')),
            h('p', { class: 'muted' }, score >= 7 ? '很好，生活中的串聯並聯你已經分得很清楚了。' : '重點：看「電流有沒有其他路可以走」。只有一條路是串聯，每個負載各有一條路是並聯。'),
            h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => { i = 0; score = 0; draw(); } }, '再玩一次'))));
          return;
        }
        const [q, a, ex] = ITEMS[i];
        const fb = h('div', {});
        const scoreEl = h('b', { class: 'num' }, score);
        const opts = ['串聯', '並聯', '兩種都有'].map(o => h('button', {
          type: 'button', class: 'quiz-opt', 'data-ans': o, onclick: () => {
            opts.forEach(b => { b.disabled = true; if (b.dataset.ans === a) b.classList.add('right'); });
            const ok = o === a;
            if (ok) { score++; scoreEl.textContent = score; } else opts.find(b => b.dataset.ans === o).classList.add('wrong');
            beep(ok ? 1320 : 220, ok ? 0.08 : 0.18, ok ? 'sine' : 'sawtooth', 0.04);
            fb.replaceChildren(h('div', { class: 'callout ' + (ok ? 'ok' : 'bad') }, h('b', {}, ok ? '答對了。' : `答案是「${a}」。`), ' ', ex),
              h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { i++; draw(); } }, i + 1 < ITEMS.length ? '下一題 →' : '看成績')));
          },
        }, o));
        box.replaceChildren(h('div', { class: 'quiz' },
          h('div', { class: 'quiz-top' }, h('span', { class: 'num' }, `${i + 1} / ${ITEMS.length}`), h('div', { class: 'quiz-prog' }, h('i', { style: { width: (i / ITEMS.length * 100) + '%' } })), h('span', {}, '答對 ', scoreEl)),
          h('div', { class: 'quiz-q' }, q), h('div', { class: 'quiz-opts' }, opts), fb));
      };
      draw();
    },
  };

  /* ===================== 4. 電盤能承受多少瓦 ===================== */
  const APPL = {
    dryer: ['吹風機', 1200, 110], rice: ['電鍋', 800, 110], micro: ['微波爐', 1100, 110], kettle: ['電熱水壺', 1500, 110],
    toaster: ['烤麵包機', 900, 110], tv: ['電視', 150, 110], pc: ['電腦', 300, 110], dehum: ['除濕機', 300, 110, true],
    washer: ['洗衣機', 500, 110], heater: ['電暖器', 1200, 110, true], heater2: ['電暖器（第二台）', 1200, 110, true],
    ac: ['冷氣', 2800, 220, true], wh: ['電熱水器', 4400, 220, true],
  };
  const capacity = {
    title: '電盤能承受多少瓦的電器？',
    html: `
      <div class="prose">
        <p>斷路器上寫的數字是<b>電流（安培 A）</b>。換算成瓦數：<b>瓦數 ≈ 電壓 × 電流</b>。例如 110V、20A 的分路，大約可以接 2200W。</p>
        <ul>
          <li><b>長時間使用要留餘裕</b>：冷氣、電暖器、電熱水器這類會連續運轉的負載，依用戶用電設備裝置規則，不得超過分路額定的 <b>80%</b>。20A 分路就是約 1760W。</li>
          <li><b>兩層上限</b>：每個分路有自己的斷路器；所有分路加起來，還要在<b>總開關</b>以內。</li>
          <li><b>單相三線要看兩邊</b>：總開關（例如 2P 50A）是 L1、L2 兩邊各自不能超過 50A。110V 的電器掛在其中一邊，220V 的電器兩邊都會用到。</li>
          <li><b>兩邊要平衡</b>：兩邊 110V 負載的電流在中性線上互相抵消，<b>中性線電流 ＝ 兩邊的差</b>。兩邊差越多，中性線越吃重。</li>
        </ul>
      </div>
      <div class="lab">
        <div class="lab-controls">
          <div class="slider-row"><span class="small muted">電壓</span><div class="seg" role="group" aria-label="電壓" data-o="v"></div></div>
          <div class="slider-row"><span class="small muted">斷路器額定</span><div class="seg seg-wrap" role="group" aria-label="斷路器額定" data-o="a"></div></div>
        </div>
        <div class="readouts">
          <div class="readout"><div class="k">最多約可接</div><div class="v" data-o="max"></div></div>
          <div class="readout"><div class="k">長時間使用上限（80%）</div><div class="v" data-o="cont"></div></div>
        </div>
      </div>
      <div class="table-scroll"><table class="term-table" data-o="tbl"></table></div>`,
    mount(el) {
      const st = { v: 110, a: 20 };
      const draw = () => {
        segBtns(el.querySelector('[data-o="v"]'), [[110, '110V'], [220, '220V']], st.v, k => { st.v = k; draw(); });
        segBtns(el.querySelector('[data-o="a"]'), [15, 20, 30, 40, 50].map(a => [a, a + 'A']), st.a, k => { st.a = k; draw(); });
        el.querySelector('[data-o="max"]').textContent = (st.v * st.a).toLocaleString() + ' W';
        el.querySelector('[data-o="cont"]').textContent = Math.round(st.v * st.a * 0.8).toLocaleString() + ' W';
      };
      const list = ['dryer', 'kettle', 'micro', 'rice', 'heater', 'washer', 'pc', 'tv', 'ac', 'wh'];
      el.querySelector('[data-o="tbl"]').innerHTML = '<thead><tr><th>電器</th><th>功率</th><th>電壓</th><th>電流 ≈ 功率 ÷ 電壓</th></tr></thead><tbody>' +
        list.map(k => { const [n, w, v] = APPL[k]; return `<tr><td>${n}</td><td class="mono">${w}W</td><td class="mono">${v}V</td><td class="mono">${(w / v).toFixed(1)}A</td></tr>`; }).join('') + '</tbody>';
      draw();
    },
  };

  /* ===================== 5. 家電配置遊戲 ===================== */
  const BR = [
    { id: 'b1', name: '分路1 客廳插座', v: 110, leg: 'L1', rating: 20 },
    { id: 'b2', name: '分路2 廚房插座', v: 110, leg: 'L2', rating: 20 },
    { id: 'b3', name: '分路3 臥室插座', v: 110, leg: 'L1', rating: 20 },
    { id: 'b4', name: '分路4 浴室插座', v: 110, leg: 'L2', rating: 20 },
    { id: 'b5', name: '分路5 冷氣專用', v: 220, leg: 'L1+L2', rating: 20 },
    { id: 'b6', name: '分路6 電熱水器專用', v: 220, leg: 'L1+L2', rating: 30 },
  ];
  const MAIN_A = 50;
  const GAME = [
    { name: '早餐尖峰', story: '早上七點，全家同時煮飯、熱早餐、燒開水、吹頭髮。把電器插到不會跳電的分路。', items: ['rice', 'micro', 'kettle', 'toaster', 'dryer'] },
    { name: '夏天晚上', story: '冷氣開著，有人洗熱水澡、有人煮飯看電視，洗衣機和除濕機也在轉。注意總開關兩邊的電流。', items: ['ac', 'wh', 'tv', 'pc', 'dehum', 'rice', 'washer'] },
    { name: '寒流來襲', story: '寒流來了，大家都想取暖。冷氣的暖氣模式「可以不開」，其他電器都要用。總開關撐得住嗎？', items: ['wh', 'heater', 'heater2', 'dryer', 'kettle', 'rice', 'tv', 'ac'], optional: ['ac'] },
  ];
  const game = {
    title: '家電配置遊戲',
    html: `
      <div class="prose"><p>先點一個電器選取它，再按分路上的「插到這裡」。110V 電器只能插 110V 分路，220V 的冷氣和電熱水器只能插專用分路。標著「長時間」的電器，所在分路不要超過額定的 80%。插好後按「檢查」。</p></div>
      <div class="seg seg-wrap" role="group" aria-label="關卡" data-o="lv"></div>
      <div class="callout" data-o="story"></div>
      <div class="stack" data-o="board"></div>`,
    mount(el) {
      Store.data.planGame = Store.data.planGame || {};
      let lvI = 0, place = {}, sel = null, result = null;
      const load = i => { lvI = i; place = {}; sel = null; result = null; GAME[i].items.forEach(k => { place[k] = null; }); draw(); };
      const calc = () => {
        const br = BR.map(b => {
          const items = Object.keys(place).filter(k => place[k] === b.id);
          const I = items.reduce((s, k) => s + APPL[k][1] / b.v, 0);
          const cont = items.some(k => APPL[k][3]);
          return { ...b, items, I, cont, trip: I > b.rating, over80: I > b.rating * 0.8 };
        });
        let L1 = 0, L2 = 0, n1 = 0, n2 = 0;
        br.forEach(b => {
          if (b.v === 220) { L1 += b.I; L2 += b.I; }
          else if (b.leg === 'L1') { L1 += b.I; n1 += b.I; } else { L2 += b.I; n2 += b.I; }
        });
        return { br, L1, L2, N: Math.abs(n1 - n2), mainTrip: Math.max(L1, L2) > MAIN_A };
      };
      const bar = (I, rating, mark) => h('div', { class: 'loadbar' + (I > rating ? ' trip' : I > rating * 0.8 ? ' hot' : '') },
        h('i', { style: { width: Math.min(100, I / rating * 100) + '%' } }), mark ? h('span', { class: 'mark', style: { left: '80%' }, title: '80%' }) : null);
      function tryPlace(bid) {
        const b = BR.find(x => x.id === bid);
        const [n, , v] = APPL[sel];
        if (v !== b.v) { toast(v === 220 ? `${n} 是 220V，插頭插不進 110V 插座，要插在 220V 專用分路。` : `${n} 是 110V 電器，不能插在 220V 專用插座。`, 'bad'); return; }
        place[sel] = bid; sel = null; result = null; beep(900, 0.03); draw();
      }
      function check() {
        const lv = GAME[lvI], c = calc();
        const missing = lv.items.filter(k => !place[k] && !(lv.optional || []).includes(k));
        const trips = c.br.filter(b => b.trip);
        const msgs = [];
        if (missing.length) msgs.push(`還有電器沒插：${missing.map(k => APPL[k][0]).join('、')}。`);
        trips.forEach(b => msgs.push(`${b.name} 跳脫：${b.I.toFixed(1)}A 超過 ${b.rating}A。`));
        if (c.mainTrip) msgs.push(`總開關跳脫：${c.L1 > c.L2 ? 'L1' : 'L2'} 那一邊 ${Math.max(c.L1, c.L2).toFixed(1)}A，超過 ${MAIN_A}A。${(lv.optional || []).length ? '想想看哪個電器可以先不開。' : '試著把 110V 電器平均分到 L1、L2 兩邊。'}`);
        const pass = !missing.length && !trips.length && !c.mainTrip;
        let stars = 0;
        if (pass) {
          stars = 1;
          const hot = c.br.filter(b => b.over80 && b.cont);
          if (!hot.length) stars++; else msgs.push(`${hot.map(b => b.name).join('、')} 有長時間使用的電器，負載卻超過額定的 80%（${hot.map(b => (b.rating * 0.8).toFixed(0) + 'A').join('、')}），長時間下來電線和斷路器會發熱。`);
          if (c.N <= 10) stars++; else msgs.push(`L1、L2 兩邊的 110V 負載差 ${c.N.toFixed(1)}A，中性線比較吃重，可以再平均一點。`);
          const top = Math.max(c.L1, c.L2);
          if (top > MAIN_A * 0.8) msgs.push(`總開關 ${c.L1 >= c.L2 ? 'L1' : 'L2'} 那一邊用到 ${top.toFixed(1)}A，離 ${MAIN_A}A 不遠了，再多開一台大電器就可能跳總開關。`);
          if ((Store.data.planGame[lvI] || 0) < stars) { Store.data.planGame[lvI] = stars; Store.save(); }
          beep(988, 0.08, 'sine', 0.05);
        } else beep(220, 0.2, 'sawtooth', 0.03);
        result = { pass, stars, msgs };
        draw();
      }
      function draw() {
        const lv = GAME[lvI], c = calc();
        segBtns(el.querySelector('[data-o="lv"]'), GAME.map((g, i) => [i, `${i + 1}. ${g.name} ${'★'.repeat(Store.data.planGame[i] || 0)}`]), lvI, load);
        el.querySelector('[data-o="story"]').textContent = lv.story;
        const tray = Object.keys(place).filter(k => !place[k]);
        const board = el.querySelector('[data-o="board"]');
        board.replaceChildren(
          h('div', { class: 'card stack' },
            h('div', { class: 'eyebrow' }, sel ? `已選取：${APPL[sel][0]}，選一個分路插上去` : '還沒插的電器'),
            tray.length ? h('div', { class: 'chips' }, tray.map(k => {
              const [n, w, v, cont] = APPL[k];
              return h('button', { type: 'button', class: 'chip' + (sel === k ? ' sel' : ''), 'aria-pressed': sel === k ? 'true' : 'false', onclick: () => { sel = sel === k ? null : k; draw(); } },
                `${n} ${w}W`, v === 220 ? h('span', { class: 'tag' }, '220V') : null, cont ? h('span', { class: 'tag' }, '長時間') : null, (lv.optional || []).includes(k) ? h('span', { class: 'tag' }, '可以不開') : null);
            })) : h('p', { class: 'small muted' }, '全部插好了。'),
          ),
          h('div', { class: 'branch-grid' }, c.br.map(b => h('div', { class: 'branch-card' + (b.trip ? ' trip' : b.over80 && b.cont ? ' warn' : '') },
            h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', {}, b.name), h('span', { class: 'mono small' }, `${b.v}V ${b.rating}A`)),
            h('div', { class: 'tiny muted' }, b.v === 220 ? '220V：L1、L2 兩邊都會用到' : `110V：接在 ${b.leg}`),
            bar(b.I, b.rating, true),
            h('div', { class: 'row small', style: { justifyContent: 'space-between' } }, h('span', { class: 'mono' }, `${b.I.toFixed(1)} / ${b.rating} A`), h('span', { class: 'pill ' + (b.trip ? 'bad' : b.over80 && b.cont ? 'warn' : b.over80 ? '' : 'ok') }, b.trip ? '跳脫' : b.over80 && b.cont ? '長時間超過 80%' : b.over80 ? '接近上限' : '正常')),
            b.items.length ? h('div', { class: 'chips' }, b.items.map(k => h('button', { type: 'button', class: 'chip on', title: '點一下拔掉', onclick: () => { place[k] = null; result = null; draw(); } }, APPL[k][0], ' ✕'))) : null,
            h('button', { type: 'button', class: 'btn btn-sm', disabled: !sel, onclick: () => tryPlace(b.id) }, '插到這裡'),
          ))),
          h('div', { class: 'card stack' },
            h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', {}, `總開關 2P ${MAIN_A}A`), h('span', { class: 'pill ' + (c.mainTrip ? 'bad' : 'ok') }, c.mainTrip ? '跳脫' : '正常')),
            ...[['L1', c.L1], ['L2', c.L2]].map(([k, I]) => h('div', { class: 'stack plan-leg', style: { gap: '4px' } },
              h('div', { class: 'row small', style: { justifyContent: 'space-between' } }, h('span', {}, `${k} 那一邊`), h('span', { class: 'mono' }, `${I.toFixed(1)} / ${MAIN_A} A`)), bar(I, MAIN_A, false))),
            h('div', { class: 'small muted' }, `中性線電流（兩邊 110V 負載的差）：`, h('b', { class: 'mono' }, `${c.N.toFixed(1)} A`)),
          ),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: check }, '檢查'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => load(lvI) }, '重來')),
          result ? h('div', { class: 'callout ' + (result.pass ? 'ok' : 'bad') },
            h('b', {}, result.pass ? `過關！${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}` : '還沒過關'),
            result.msgs.length ? h('ul', { class: 'steps', style: { marginTop: '6px' } }, result.msgs.map(m => h('li', {}, m))) : h('p', {}, '沒有跳電，長時間使用的分路留有餘裕，L1、L2 兩邊也很平衡。'),
            h('p', { class: 'tiny muted', style: { marginTop: '6px' } }, '★ 不跳電　★ 有長時間使用電器的分路，負載在 80% 以內　★ L1、L2 兩邊平衡（差 10A 以內）')) : null,
        );
      }
      load(0);
    },
  };

  /* ===================== 6. 銅線怎麼選 ===================== */
  const wiresCard = {
    title: '銅線怎麼選：安培容量與電壓降',
    html: `
      <div class="prose">
        <p>選電線要同時過四關：</p>
        <ol>
          <li><b>不能太細</b>：照明、插座、電熱的分路，單線最小 <b>2.0mm</b>、絞線最小 <b>3.5mm²</b>（規則第 19 條）。1.6mm 不能拿來拉這些分路。</li>
          <li><b>安培容量要夠</b>：電線能安全通過的電流要大於負載電流。長時間連續使用的負載，電線要能承受 1.25 倍，負載也不能超過斷路器額定的 80%。</li>
          <li><b>跟斷路器配合</b>：分路的額定由斷路器決定。原則上<b>斷路器額定不得大於電線的安培容量</b>（第 79 條），否則過載時電線會比斷路器先燒；供應兩個以上插座的分路一定要這樣。只接一台電器或照明的分路，在標準額定配不上時可以選高一級，但 2.0mm 最大 15A、3.5mm² 最大 20A、5.5mm² 最大 30A。</li>
          <li><b>電壓降不能太大</b>：電線越長、越細，電阻越大，電壓掉越多。依規則第 7 條，幹線、分路各不得超過標稱電壓的 <b>3%</b>，兩者合計不得超過 <b>5%</b>。</li>
        </ol>
        <p>下表是規則的 PVC 管配線安培容量（絕緣物 60°C、周溫 35°C 以下、同一管 3 條以下）。配線方式不同（金屬管、同管 4 條以上、周溫更高）數值也不同，實際設計要查規則原表。本章的練習一律用保守做法：<b>電線安培容量 ≥ 斷路器額定</b>，這樣一定符合規定。</p>
      </div>
      <div class="table-scroll"><table class="term-table" data-o="tbl"></table></div>
      <div class="callout"><b>電壓降怎麼算：</b>電流要去一趟（火線）再回來（中性線），所以<br><span class="mono">電壓降 ≈ 2 × 電流 × 每公尺電阻 × 長度</span><br>例如 5.5mm² 線、13.6A、45 公尺：2 × 13.6 × 0.00314 × 45 ≈ 3.8V，是 110V 的 3.5%，已經超過 3%。</div>`,
    mount(el) {
      el.querySelector('[data-o="tbl"]').innerHTML = '<thead><tr><th>線別</th><th>安培容量</th><th>可配的斷路器（保守做法）</th><th>每公里電阻（約）</th></tr></thead><tbody>' +
        WIRES.map(w => {
          const b = BREAKERS.filter(x => x <= w.amp).pop();
          return `<tr><td>${w.name}</td><td class="mono">${w.amp}A</td><td>${w.branch ? `<span class="mono">${b}A</span> 以下` : '不能用在照明、插座、電熱分路'}</td><td class="mono">${ohmKm(w).toFixed(2)}Ω</td></tr>`;
        }).join('') + '</tbody>';
    },
  };

  /* ===================== 7. 選線小遊戲 ===================== */
  const TASKS = [
    { name: '臥室照明', desc: 'LED 燈 8 盞，每盞 12W，110V。燈常常一開好幾個小時。線長 15 公尺。', w: 96, v: 110, len: 15, cont: true },
    { name: '廚房插座分路', desc: '插座分路規劃為 20A（所以斷路器是 20A）。電鍋 800W 和微波爐 1100W 可能同時用，110V，線長 12 公尺。', w: 1900, v: 110, len: 12, fixed: 20 },
    { name: '冷氣專用迴路', desc: '冷氣 2800W、220V，夏天會連續運轉。線長 20 公尺。', w: 2800, v: 220, len: 20, cont: true },
    { name: '電熱水器專用迴路', desc: '電熱水器 4400W、220V，洗澡時長時間加熱。線長 10 公尺。', w: 4400, v: 220, len: 10, cont: true },
    { name: '車庫的插座', desc: '插座分路規劃為 20A。高壓清洗機 1500W、110V，但車庫很遠，線長 45 公尺。', w: 1500, v: 110, len: 45, fixed: 20 },
  ];
  function judgeTask(t, bk, wk) {
    const I = t.w / t.v;
    const w = WIRES.find(x => x.k === wk);
    const vd = 2 * I * RHO / w.area * t.len;
    const pct = vd / t.v * 100;
    const checks = [
      { ok: w.branch, t: `${w.name} 符合分路的最小線徑（2.0mm／3.5mm²）`, bad: '照明、插座、電熱分路的電線，單線最小要 2.0mm、絞線最小 3.5mm²，1.6mm 不能用。' },
      { ok: bk >= I, t: `斷路器 ${bk}A ≥ 負載電流 ${I.toFixed(1)}A`, bad: `斷路器 ${bk}A 比負載電流 ${I.toFixed(1)}A 小，一開電器就跳脫。` },
      { ok: !t.cont || I <= bk * 0.8, t: t.cont ? `長時間負載 ${I.toFixed(1)}A ≤ 斷路器的 80%（${(bk * 0.8).toFixed(1)}A）` : '不是長時間連續負載', bad: `長時間負載 ${I.toFixed(1)}A 超過斷路器的 80%（${(bk * 0.8).toFixed(1)}A），斷路器要選大一級。` },
      { ok: w.amp >= bk, t: `電線 ${w.amp}A ≥ 斷路器 ${bk}A，斷路器保護得了電線`, bad: `電線只有 ${w.amp}A，卻配 ${bk}A 斷路器：過載時電線會先過熱，要換粗一點的線。` },
      { ok: pct <= 3, t: `電壓降 ${vd.toFixed(2)}V（${pct.toFixed(1)}%）≤ 3%`, bad: `電壓降 ${vd.toFixed(2)}V（${pct.toFixed(1)}%）超過 3%，線太長太細，要換粗一點的線。` },
    ];
    return { I, vd, pct, checks, pass: checks.every(c => c.ok) };
  }
  /* 參考答案：能過關的最細電線，配上這條線能配的最大斷路器 */
  function refFor(t) {
    for (const w of WIRES) {
      const ok = (t.fixed ? [t.fixed] : BREAKERS).filter(b => judgeTask(t, b, w.k).pass);
      if (ok.length) return { w, bk: ok[ok.length - 1], alt: ok.slice(0, -1) };
    }
    return null;
  }
  const picker = {
    title: '選線小遊戲',
    html: `<div class="prose"><p>替每條迴路選斷路器和電線。五個條件都要過：電線不小於 2.0mm、斷路器夠大、長時間負載留 20% 餘裕、電線撐得住斷路器、電壓降不超過 3%。</p></div><div data-o="game"></div>`,
    mount(el) {
      const box = el.querySelector('[data-o="game"]');
      let ti = 0, bk = null, wk = null, res = null;
      const draw = () => {
        const t = TASKS[ti];
        const ref = refFor(t);
        if (t.fixed) bk = t.fixed;
        const altTxt = ref.alt.length ? `（斷路器用 ${ref.alt.map(b => b + 'A').join('、')} 也可以）` : '';
        let head = '還不行：';
        if (res && res.reveal) head = `參考答案：${ref.bk}A 斷路器 ＋ ${ref.w.name}${altTxt}`;
        else if (res && res.pass) head = wk === ref.w.k ? '完全正確！' : `可以用！不過 ${ref.w.name} 就夠了，線選太粗成本比較高。`;
        box.replaceChildren(h('div', { class: 'task-card' },
          h('div', { class: 'task-steps', 'aria-hidden': 'true' }, TASKS.map((_, i) => h('i', { class: i < ti ? 'done' : i === ti ? 'cur' : '' }))),
          h('div', { class: 'eyebrow' }, `題目 ${ti + 1} / ${TASKS.length}`),
          h('h3', {}, t.name),
          h('p', {}, t.desc),
          h('div', { class: 'stack', style: { gap: '6px' } },
            h('span', { class: 'small muted' }, t.fixed ? `斷路器：${t.fixed}A（已決定）` : '斷路器'),
            t.fixed ? null : h('div', { class: 'seg seg-wrap', role: 'group', 'aria-label': '斷路器' }, BREAKERS.map(b => h('button', { type: 'button', 'aria-pressed': bk === b ? 'true' : 'false', onclick: () => { bk = b; res = null; draw(); } }, b + 'A'))),
            h('span', { class: 'small muted' }, '電線'),
            h('div', { class: 'seg seg-wrap', role: 'group', 'aria-label': '電線' }, WIRES.map(w => h('button', { type: 'button', 'aria-pressed': wk === w.k ? 'true' : 'false', onclick: () => { wk = w.k; res = null; draw(); } }, w.name))),
          ),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn btn-primary', disabled: !(bk && wk), onclick: () => { res = judgeTask(t, bk, wk); beep(res.pass ? 988 : 220, 0.1, res.pass ? 'sine' : 'sawtooth', 0.04); draw(); } }, '檢查'),
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { bk = ref.bk; wk = ref.w.k; res = { reveal: true, ...judgeTask(t, bk, wk) }; draw(); } }, '看解答')),
          res ? h('div', { class: 'callout ' + (res.pass ? 'ok' : 'bad') },
            h('b', {}, head),
            h('div', { class: 'small', style: { marginTop: '4px' } }, `負載電流 = ${t.w}W ÷ ${t.v}V ≈ ${res.I.toFixed(1)}A`),
            h('ul', { class: 'result-list', style: { marginTop: '6px' } }, res.checks.map(c => h('li', { class: c.ok ? 'pass' : 'fail' }, h('span', { class: 'ic' }, c.ok ? '✓' : '✕'), h('span', {}, c.ok ? c.t : c.bad))))) : null,
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn', disabled: ti === 0, onclick: () => { ti--; bk = null; wk = null; res = null; draw(); } }, '← 上一題'),
            h('button', { type: 'button', class: 'btn', disabled: ti === TASKS.length - 1, onclick: () => { ti++; bk = null; wk = null; res = null; draw(); } }, '下一題 →')),
        ));
      };
      draw();
    },
  };

  LESSONS.plan = {
    quiz: { tag: 'plan', n: 8 },
    cards: [chain, everyday, judge, capacity, game, wiresCard, picker],
  };
})();
