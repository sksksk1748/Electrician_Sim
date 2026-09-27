'use strict';
/* 課程（迴路 01、02）、測驗引擎與學科模擬考 */

/* ================= 測驗引擎 ================= */
const Quiz = {
  prepare(list) {
    return list.map(q => {
      const order = shuffle(q.o.map((_, i) => i));
      return { ...q, opts: order.map(i => q.o[i]), ans: order.indexOf(0) };
    });
  },
  /* opts: instant 是否每題立即解析；pass 及格比例；onDone(rate) */
  run(root, rawQs, opts = {}) {
    const { instant = true, pass = 0.8, onDone, onRetry, doneLabel = '完成' } = opts;
    const qs = this.prepare(rawQs);
    const picks = [];
    let i = 0;

    const drawQ = () => {
      const q = qs[i];
      const correct = picks.filter((p, k) => p === qs[k].ans).length;
      const prog = h('div', { class: 'quiz-prog' }, h('i', { style: { width: (i / qs.length * 100) + '%' } }));
      const fb = h('div', { class: 'stack' });
      const optBtns = q.opts.map((o, k) => h('button', {
        class: 'quiz-opt', type: 'button',
        onclick: () => choose(k),
      }, h('span', { class: 'letter' }, 'ABCD'[k]), h('span', {}, o)));

      function choose(k) {
        picks[i] = k;
        optBtns.forEach(b => b.disabled = true);
        if (instant) {
          optBtns[q.ans].classList.add('right');
          if (k !== q.ans) optBtns[k].classList.add('wrong');
          const ok = k === q.ans;
          if (ok) beep(1320, 0.08, 'sine', 0.04); else beep(220, 0.18, 'sawtooth', 0.03);
          fb.append(
            h('div', { class: 'callout ' + (ok ? 'ok' : 'bad') },
              h('b', {}, ok ? '答對了。' : '答錯了。'), ' ', q.ex),
            h('div', { class: 'row' },
              h('button', { class: 'btn btn-primary', type: 'button', onclick: next }, i + 1 < qs.length ? '下一題 →' : '看成績')),
          );
          fb.querySelector('.btn-primary').focus();
        } else {
          optBtns[k].classList.add('picked');
          setTimeout(next, 220);
        }
      }
      function next() { i++; if (i < qs.length) drawQ(); else drawEnd(); }

      root.replaceChildren(h('div', { class: 'quiz' },
        h('div', { class: 'quiz-top' },
          h('span', { class: 'num' }, `${i + 1} / ${qs.length}`), prog,
          instant ? h('span', {}, '答對 ', h('b', { class: 'num' }, correct)) : h('span', {}, '模擬考模式'),
        ),
        h('div', { class: 'quiz-q' }, q.q),
        h('div', { class: 'quiz-opts' }, optBtns),
        fb,
      ));
    };

    const drawEnd = () => {
      const correct = picks.filter((p, k) => p === qs[k].ans).length;
      const rate = correct / qs.length;
      const passed = rate >= pass;
      const wrong = qs.map((q, k) => ({ q, p: picks[k] })).filter(x => x.p !== x.q.ans);
      root.replaceChildren(h('div', { class: 'quiz' },
        h('div', { class: 'card stack' },
          h('div', { class: 'eyebrow' }, '成績'),
          h('div', { class: 'row', style: { alignItems: 'baseline', gap: '14px' } },
            h('span', { class: 'score-big' }, Math.round(rate * 100)),
            h('span', { class: 'muted' }, `分（答對 ${correct} / ${qs.length} 題）`),
            h('span', { class: 'pill ' + (passed ? 'ok' : 'bad') }, passed ? '通過' : `未達 ${Math.round(pass * 100)} 分`),
          ),
          h('p', { class: 'muted' }, passed
            ? '這一段已經掌握了。錯的題目看一下解析再往下走。'
            : '把下面答錯的題目解析讀一遍，再試一次。題目順序和選項每次都會重新排列。'),
          h('div', { class: 'row' },
            h('button', { class: 'btn', type: 'button', onclick: () => onRetry ? onRetry() : this.run(root, rawQs, opts) }, '再測一次'),
            onDone ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => onDone(rate, true) }, doneLabel) : null,
          ),
        ),
        wrong.length ? h('div', { class: 'review' },
          h('h3', {}, '答錯的題目'),
          wrong.map(({ q, p }) => h('div', { class: 'review-item' },
            h('b', {}, q.q),
            h('span', { class: 'small' }, '你的答案：', p == null ? '未作答' : q.opts[p]),
            h('span', { class: 'small', style: { color: 'var(--ok)' } }, '正確答案：', q.opts[q.ans]),
            h('span', { class: 'small muted' }, q.ex),
          )),
        ) : null,
      ));
      if (onDone) onDone(rate, false);
    };

    drawQ();
  },
};

/* ================= 插圖 ================= */
let figSeq = 0;
function bulbSVG(size = 160) {
  const id = 'glow' + (++figSeq);
  return `<svg class="bulb" viewBox="0 0 200 220" width="${size}" aria-hidden="true">
    <defs><radialGradient id="${id}"><stop offset="0" stop-color="#FFE27A" stop-opacity=".95"/><stop offset="1" stop-color="#FFE27A" stop-opacity="0"/></radialGradient></defs>
    <circle class="b-glow" cx="100" cy="85" r="98" fill="url(#${id})" opacity="0"/>
    <circle class="b-glass" cx="100" cy="85" r="52" style="fill:var(--bulb-off);stroke:var(--ink-3);stroke-width:2.5"/>
    <path class="b-fil" d="M84 120 L84 98 L90 76 L96 96 L102 76 L108 96 L114 76 L116 98 L116 120" style="fill:none;stroke:var(--ink-2);stroke-width:2.5;stroke-linejoin:round"/>
    <rect x="76" y="134" width="48" height="40" rx="5" style="fill:var(--ink-3)"/>
    <path d="M76 146h48M76 158h48" style="stroke:var(--bg);stroke-width:3"/>
    <path d="M90 174h20l-4 12h-12z" style="fill:var(--ink-2)"/>
  </svg>`;
}
function setBulb(svgEl, b) {
  b = clamp(b, 0, 1.2);
  svgEl.querySelector('.b-glow').setAttribute('opacity', (Math.min(b, 1) * 0.95).toFixed(2));
  const glass = svgEl.querySelector('.b-glass');
  glass.style.fill = b > 0.02 ? `rgba(255, 214, 80, ${0.25 + 0.7 * Math.min(b, 1)})` : 'var(--bulb-off)';
  svgEl.querySelector('.b-fil').style.stroke = b > 0.02 ? '#B86E00' : 'var(--ink-2)';
}

/* ================= 課程內容 ================= */
const LESSONS = {
  basics: {
    quiz: { tag: 'basics', n: 6 },
    cards: [
      {
        title: '用水管來想像電',
        html: `
        <div class="prose">
          <p>電看不見也摸不到（也千萬別摸），初學時用「水」來想像最容易。電池或插座像一個水塔，電線像水管，燈泡像水車。</p>
        </div>
        <div class="figure">
          <svg viewBox="0 0 560 200" role="img" aria-label="水管比喻：水塔、水管、變窄處、水車">
            <rect x="20" y="20" width="90" height="160" rx="6" style="fill:none;stroke:var(--ink-2);stroke-width:2.5"/>
            <rect x="22" y="52" width="86" height="126" style="fill:var(--water);opacity:.75"/>
            <text x="65" y="44" text-anchor="middle" class="schem-txt" style="font-size:13px">水位高度</text>
            <rect x="110" y="140" width="150" height="26" style="fill:var(--water);opacity:.6;stroke:var(--ink-2);stroke-width:2"/>
            <rect x="260" y="147" width="90" height="12" style="fill:var(--water);opacity:.6;stroke:var(--ink-2);stroke-width:2"/>
            <rect x="350" y="140" width="110" height="26" style="fill:var(--water);opacity:.6;stroke:var(--ink-2);stroke-width:2"/>
            <path d="M130 153h40m-10-6l10 6-10 6M380 153h40m-10-6l10 6-10 6" style="stroke:var(--ink);stroke-width:2;fill:none"/>
            <circle cx="500" cy="153" r="34" style="fill:none;stroke:var(--copper);stroke-width:3"/>
            <path d="M500 119v68M466 153h68M476 129l48 48M524 129l-48 48" style="stroke:var(--copper);stroke-width:2"/>
            <text x="185" y="128" text-anchor="middle" class="schem-title">水流量 ＝ 電流</text>
            <text x="305" y="128" text-anchor="middle" class="schem-title">變窄 ＝ 電阻</text>
            <text x="500" y="105" text-anchor="middle" class="schem-title">水車 ＝ 負載</text>
            <text x="65" y="198" text-anchor="middle" class="schem-title">水壓 ＝ 電壓</text>
          </svg>
        </div>
        <div class="table-scroll"><table class="term-table">
          <thead><tr><th>名稱</th><th>符號／單位</th><th>水管比喻</th><th>意思</th></tr></thead>
          <tbody>
            <tr><td><b>電壓</b></td><td class="mono">V · 伏特</td><td>水壓（水位高低差）</td><td>推動電流的力量。插座是 110V。</td></tr>
            <tr><td><b>電流</b></td><td class="mono">I · 安培 A</td><td>每秒流過的水量</td><td>真正在電線裡流動的量，太大電線會發熱。</td></tr>
            <tr><td><b>電阻</b></td><td class="mono">R · 歐姆 Ω</td><td>水管變窄、阻礙水流</td><td>越大越難通過。電線電阻很小，燈絲電阻較大。</td></tr>
            <tr><td><b>功率</b></td><td class="mono">P · 瓦特 W</td><td>水車做功的快慢</td><td>電器的「耗電速度」，吹風機約 1200W。</td></tr>
          </tbody>
        </table></div>
        <div class="callout">重點：<b>電壓兩點之間才有意義</b>（就像水位「差」），所以電表量電壓一定是兩支表筆各接一點。</div>`,
      },
      {
        title: '歐姆定律 V = I × R',
        html: `
        <div class="prose">
          <p>電壓、電流、電阻三者的關係只有一條：<b class="mono">V = I × R</b>。換個寫法：<span class="mono">I = V ÷ R</span>、<span class="mono">R = V ÷ I</span>。</p>
          <p>拉動下面的滑桿試試：電壓固定時，電阻越小，電流越大。把電阻拉到最小，就是「短路」的感覺。</p>
        </div>
        <div class="lab">
          <div class="lab-controls">
            <div class="slider-row"><label for="ohm-v">電壓 V <span class="num" data-o="v"></span></label><input id="ohm-v" type="range" min="0" max="220" step="1" value="110"></div>
            <div class="slider-row"><label for="ohm-r">電阻 R <span class="num" data-o="r"></span></label><input id="ohm-r" type="range" min="5" max="1000" step="1" value="200"></div>
            <div class="readouts">
              <div class="readout"><div class="k">電流 I = V ÷ R</div><div class="v" data-o="i"></div></div>
              <div class="readout"><div class="k">功率 P = V × I</div><div class="v" data-o="p"></div></div>
            </div>
            <div class="callout" data-o="msg"></div>
          </div>
          <div style="display:grid;place-items:center">${bulbSVG(180)}</div>
        </div>`,
        mount(el) {
          const v = el.querySelector('#ohm-v'), r = el.querySelector('#ohm-r');
          const o = k => el.querySelector(`[data-o="${k}"]`);
          const bulb = el.querySelector('.bulb');
          const upd = () => {
            const V = +v.value, R = +r.value, I = V / R, P = V * I;
            o('v').textContent = V + ' V';
            o('r').textContent = R + ' Ω';
            o('i').textContent = I.toFixed(I < 1 ? 3 : 2) + ' A';
            o('p').textContent = P.toFixed(0) + ' W';
            setBulb(bulb, P / 100);
            const msg = o('msg');
            if (I >= 10) { msg.className = 'callout bad'; msg.innerHTML = '<b>電流超過 10A！</b>電阻很小時電流暴增，這就是短路危險的原因。真實線路中，斷路器會在這之前跳脫。'; }
            else if (I >= 3) { msg.className = 'callout warn'; msg.innerHTML = '電流已經不小。電線太細就會發熱，所以大電流電器要用較粗的線。'; }
            else { msg.className = 'callout'; msg.innerHTML = `例：${V}V ÷ ${R}Ω = ${I.toFixed(2)}A。一顆 60W 燈泡點亮時燈絲電阻約 200Ω。`; }
          };
          v.addEventListener('input', upd); r.addEventListener('input', upd); upd();
        },
      },
      {
        title: '功率、用電量與過載',
        html: `
        <div class="prose">
          <p>功率 <b class="mono">P = V × I</b>（瓦特 W）。電費以「度」計算：<b>1 度 = 1 kWh</b>，也就是 1000W 的電器用 1 小時。</p>
          <p>家裡一個插座分路通常用 <b>20A</b> 的無熔絲開關保護。110V × 20A = 2200W，同一分路的電器加起來超過這個量，開關就會跳脫（過載）。勾選下面的電器看看：</p>
        </div>
        <div class="appl-list" data-o="list"></div>
        <div class="stack">
          <div class="loadbar" data-o="bar"><i></i><span class="mark" title="20A"></span></div>
          <div class="readouts">
            <div class="readout"><div class="k">總功率</div><div class="v" data-o="w"></div></div>
            <div class="readout"><div class="k">總電流（110V）</div><div class="v" data-o="a"></div></div>
            <div class="readout"><div class="k">用 1 小時</div><div class="v" data-o="kwh"></div></div>
          </div>
          <div class="callout" data-o="msg"></div>
        </div>`,
        mount(el) {
          const items = [['吹風機', 1200], ['電熱水壺', 1500], ['電鍋', 800], ['微波爐', 1100], ['電視', 120], ['電風扇', 50], ['LED 燈', 12], ['筆電充電', 65]];
          const list = el.querySelector('[data-o="list"]');
          const checks = items.map(([n, w], k) => {
            const cb = h('input', { type: 'checkbox', id: 'appl' + k });
            if (k === 2 || k === 4) cb.checked = true;
            list.append(h('label', { class: 'appl', for: 'appl' + k }, cb, n, h('span', { class: 'w' }, w + 'W')));
            cb.addEventListener('change', upd);
            return cb;
          });
          function upd() {
            const W = items.reduce((s, [, w], k) => s + (checks[k].checked ? w : 0), 0);
            const A = W / 110;
            el.querySelector('[data-o="w"]').textContent = W + ' W';
            el.querySelector('[data-o="a"]').textContent = A.toFixed(1) + ' A';
            el.querySelector('[data-o="kwh"]').textContent = (W / 1000).toFixed(2) + ' 度';
            const bar = el.querySelector('[data-o="bar"]');
            bar.querySelector('i').style.width = Math.min(100, A / 25 * 100) + '%';
            bar.className = 'loadbar' + (A > 20 ? ' trip' : A > 16 ? ' hot' : '');
            const msg = el.querySelector('[data-o="msg"]');
            if (A > 20) { msg.className = 'callout bad'; msg.innerHTML = `<b>過載跳脫！</b>${A.toFixed(1)}A 超過 20A，無熔絲開關會切斷電源。吹風機和電熱水壺這類發熱電器最耗電，不要插在同一分路。`; }
            else if (A > 16) { msg.className = 'callout warn'; msg.innerHTML = '接近上限了。長時間使用接近額定電流，電線和插座會發熱。'; }
            else { msg.className = 'callout'; msg.innerHTML = `電流 = 功率 ÷ 電壓 = ${W} ÷ 110 ≈ ${A.toFixed(1)}A，在 20A 以內。用 1 小時約 ${(W / 1000).toFixed(2)} 度電。`; }
          }
          upd();
        },
      },
      {
        title: '直流 DC 與交流 AC',
        html: `
        <div class="prose">
          <p><b>直流（DC）</b>：電壓方向固定，例如電池 1.5V、手機充電器輸出 5V。<br>
          <b>交流（AC）</b>：電壓方向來回變化，家裡插座就是交流。台灣是 <b>60Hz</b>，每秒來回 60 次。</p>
        </div>
        <div class="figure"><svg data-o="wave" viewBox="0 0 640 220" role="img" aria-label="直流與交流波形"></svg></div>
        <div class="callout">三用電表量交流電時，讀到的是<b>有效值</b>（110V），它和同樣大小的直流做功相同。交流的最高點（峰值）約為 110 × 1.414 ≈ <b>155V</b>。量電池用 <b>DCV</b> 檔，量插座用 <b>ACV</b> 檔，選錯檔位讀值就不對。</div>`,
        mount(el) {
          const svg = el.querySelector('[data-o="wave"]');
          const axis = (x0, lab) => `<path d="M${x0} 110h260M${x0} 20v180" style="stroke:var(--ink-3);stroke-width:1.5"/><text x="${x0 + 130}" y="214" text-anchor="middle" class="schem-title">${lab}</text>`;
          let sine = '';
          for (let k = 0; k <= 240; k++) {
            const x = 350 + k, y = 110 - 80 * Math.sin(k / 240 * 4 * Math.PI);
            sine += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
          }
          svg.innerHTML = axis(30, '直流（電池）') + axis(350, '交流（插座 60Hz）') +
            `<path d="M30 70h240" style="stroke:var(--copper);stroke-width:3.5"/>
             <text x="36" y="62" class="schem-txt">+1.5V 一直不變</text>
             <path d="${sine}" style="fill:none;stroke:var(--copper);stroke-width:3.5"/>
             <text x="410" y="26" class="schem-txt">峰值 +155V</text>
             <text x="530" y="206" class="schem-txt">−155V</text>
             <text x="520" y="100" class="schem-txt">0V</text>`;
        },
      },
      {
        title: '台灣家裡的電：單相三線',
        html: `
        <div class="prose">
          <p>台電送進一般住家的是 <b>單相三線式 110V／220V</b>（寫作 1φ3W）。三條線：兩條火線 <b>L1、L2</b>，一條中性線 <b>N</b>。</p>
          <ul>
            <li>L1 對 N、L2 對 N：各 <b class="mono">110V</b> → 燈、一般插座</li>
            <li>L1 對 L2：<b class="mono">220V</b> → 冷氣、烘衣機等大功率電器</li>
            <li>另外還有一條 <b>接地線 E</b>（綠色），平常不走電流，漏電時保護人員</li>
          </ul>
        </div>
        <div class="figure">
          <svg viewBox="0 0 620 230" role="img" aria-label="單相三線式配電示意">
            <rect x="20" y="30" width="110" height="170" rx="8" class="schem-box"/>
            <text x="75" y="22" text-anchor="middle" class="schem-title">台電變壓器</text>
            <path d="M60 50c16 0 16 20 0 20c16 0 16 20 0 20c16 0 16 20 0 20c16 0 16 20 0 20c16 0 16 20 0 20c16 0 16 20 0 20" style="fill:none;stroke:var(--ink);stroke-width:2.5"/>
            <path d="M60 50H130M60 110H130M60 170H130" style="stroke:var(--ink-3);stroke-width:1.5"/>
            <path d="M130 50H560" class="wire-halo"/><path d="M130 50H560" class="wire-core" style="stroke:var(--w-red)"/>
            <path d="M130 110H560" class="wire-halo"/><path d="M130 110H560" class="wire-core" style="stroke:var(--w-white)"/>
            <path d="M130 170H560" class="wire-halo"/><path d="M130 170H560" class="wire-core" style="stroke:var(--w-black)"/>
            <path d="M60 110v70M44 186h32M50 194h20M56 202h8" style="stroke:var(--w-green);stroke-width:2.5;fill:none"/>
            <text x="570" y="55" class="schem-title">L1</text><text x="570" y="115" class="schem-title">N</text><text x="570" y="175" class="schem-title">L2</text>
            <path d="M300 56v48M300 116v48" style="stroke:var(--copper);stroke-width:2;marker-end:none"/>
            <text x="308" y="85" class="schem-title" style="fill:var(--copper)">110V</text>
            <text x="308" y="145" class="schem-title" style="fill:var(--copper)">110V</text>
            <path d="M450 56v108" style="stroke:var(--copper);stroke-width:2"/>
            <text x="458" y="115" class="schem-title" style="fill:var(--copper)">220V</text>
            <text x="30" y="222" class="schem-txt">中性線在變壓器端接地</text>
          </svg>
        </div>
        <div class="callout">為什麼冷氣用 220V？同樣功率下，電壓加倍，電流就減半（P = V × I），電線可以不用那麼粗，發熱也少。</div>`,
      },
      {
        title: '串聯與並聯',
        html: `
        <div class="prose">
          <p><b>串聯</b>：一條路接到底，電流依序流過每個負載。一顆壞掉，全部都不亮；每顆只分到一部分電壓。<br>
          <b>並聯</b>：每個負載各自接在 L 與 N 之間，都拿到完整 110V，互不影響。<b>家裡的燈和插座都是並聯。</b></p>
        </div>
        <div class="row" role="group" aria-label="接法">
          <button type="button" class="btn btn-sm" data-mode="series">串聯</button>
          <button type="button" class="btn btn-sm" data-mode="parallel">並聯</button>
          <label class="appl" style="margin-left:auto"><input type="checkbox" id="sp-remove"> 拔掉燈泡 A</label>
        </div>
        <div class="figure"><svg data-o="sp" viewBox="0 0 560 240" role="img" aria-label="串聯與並聯電路"></svg></div>
        <div class="callout" data-o="msg"></div>`,
        mount(el) {
          let mode = 'series';
          const svg = el.querySelector('[data-o="sp"]');
          const rm = el.querySelector('#sp-remove');
          const R = 110 * 110 / 60;
          const btns = el.querySelectorAll('[data-mode]');
          btns.forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));
          rm.addEventListener('change', draw);
          function lampAt(x, y, b, lab, gone, side) {
            const lit = b > 0.02;
            const tx = side ? 32 : 0, ty = side ? -2 : 46, anchor = side ? 'start' : 'middle';
            return `<g transform="translate(${x},${y})">
              <circle r="30" fill="rgba(255,226,122,${(Math.min(b, 1) * 0.8).toFixed(2)})"/>
              <circle r="20" style="fill:${gone ? 'none' : lit ? `rgba(255,214,80,${0.3 + 0.7 * Math.min(b, 1)})` : 'var(--bulb-off)'};stroke:var(--ink);stroke-width:2;${gone ? 'stroke-dasharray:4 4' : ''}"/>
              ${gone ? '' : '<path d="M-14 -14L14 14M14 -14L-14 14" style="stroke:var(--ink);stroke-width:2"/>'}
              <text x="${tx}" y="${ty}" text-anchor="${anchor}" class="schem-title">${lab}</text>
              <text x="${tx}" y="${ty + 18}" text-anchor="${anchor}" class="schem-txt">${gone ? '已拔除' : Math.round(b * 60) + ' W'}</text></g>`;
          }
          function draw() {
            btns.forEach(b => b.classList.toggle('btn-primary', b.dataset.mode === mode));
            const RA = rm.checked ? Infinity : R;
            let els;
            if (mode === 'series') els = [{ a: 'L', b: 'A1', R: 0 }, { a: 'A1', b: 'm', R: RA }, { a: 'm', b: 'B1', R: R }, { a: 'B1', b: 'N', R: 0 }];
            else els = [{ a: 'L', b: 'N', R: RA, k: 'A' }, { a: 'L', b: 'N', R: R, k: 'B' }].map(e => ({ ...e }));
            const s = Circuit.solve(els, { L: 110, N: 0 });
            let pA, pB;
            if (mode === 'series') {
              pA = isFinite(RA) ? Math.pow(s.V('A1') - s.V('m'), 2) / RA : 0;
              pB = Math.pow(s.V('m') - s.V('B1'), 2) / R;
            } else { pA = isFinite(RA) ? 110 * 110 / RA : 0; pB = 110 * 110 / R; }
            const wire = (d, c) => `<path d="${d}" class="wire-halo"/><path d="${d}" class="wire-core" style="stroke:${c}"/>`;
            let body = `<rect x="20" y="80" width="70" height="80" rx="6" class="schem-box"/><text x="55" y="118" text-anchor="middle" class="schem-title">110V</text>
              <text x="55" y="138" text-anchor="middle" class="schem-txt">插座</text>`;
            if (mode === 'series') {
              body += wire('M90 100H220', 'var(--w-red)') + wire('M260 100H360', 'var(--w-red)') + wire('M400 100H480V180H90V140', 'var(--w-white)');
              body += lampAt(240, 100, pA / 60, 'A', rm.checked) + lampAt(380, 100, pB / 60, 'B', false);
            } else {
              body += wire('M90 100H480V130M300 100V130', 'var(--w-red)') + wire('M90 140H150V200H480V170M300 200V170', 'var(--w-white)');
              body += lampAt(300, 150, pA / 60, 'A', rm.checked, true) + lampAt(480, 150, pB / 60, 'B', false, true);
            }
            svg.innerHTML = body;
            const msg = el.querySelector('[data-o="msg"]');
            if (mode === 'series') msg.innerHTML = rm.checked
              ? '串聯時拔掉一顆，電流的路就斷了，<b>另一顆也跟著熄滅</b>。'
              : `串聯時兩顆各分到約 55V，功率只剩約 ${Math.round(pB)}W，<b>兩顆都很暗</b>。`;
            else msg.innerHTML = rm.checked
              ? '並聯時拔掉一顆，<b>另一顆照樣全亮</b>。這就是家裡電器互不影響的原因。'
              : '並聯時兩顆都拿到完整 110V，<b>各自全亮 60W</b>。';
          }
          draw();
        },
      },
      {
        title: '電流通過人體有多危險',
        html: `
        <div class="prose">
          <p>觸電傷人的是<b>流過身體的電流</b>。同樣 110V，手濕的時候皮膚電阻下降，流過的電流就大很多。</p>
        </div>
        <div class="table-scroll"><table class="term-table">
          <thead><tr><th>通過人體電流（交流）</th><th>一般反應</th></tr></thead>
          <tbody>
            <tr><td class="mono">約 1 mA</td><td>開始有麻的感覺</td></tr>
            <tr><td class="mono">約 5 mA</td><td>明顯疼痛</td></tr>
            <tr><td class="mono">約 10–20 mA</td><td>肌肉收縮，可能無法自己放手</td></tr>
            <tr><td class="mono">約 50 mA 以上</td><td>可能引起心室顫動，有生命危險</td></tr>
          </tbody>
        </table></div>
        <p class="small muted">數值為一般教材常用的參考值，實際情形依電流路徑、時間與個人體質而不同。</p>
        <div class="callout warn">所以住宅用<b>漏電斷路器</b>設定在 <b>30mA、0.1 秒內</b>跳脫，趕在造成致命傷害之前切斷電源；電器外殼要<b>接地</b>，讓漏電優先流向大地。後面的章節會一一練到。</div>`,
      },
    ],
  },

  gear: {
    quiz: { tag: 'gear', n: 7 },
    cards: [
      {
        title: '分電盤裡有什麼',
        html: `
        <div class="prose"><p>分電盤（配電箱）是全家電力的起點。打開蓋子，通常會看到：</p></div>
        <div class="figure">
          <svg viewBox="0 0 600 300" role="img" aria-label="分電盤內部">
            <rect x="20" y="16" width="290" height="270" rx="10" style="fill:var(--enclosure);stroke:var(--enclosure-edge);stroke-width:2"/>
            <rect x="40" y="36" width="90" height="100" rx="6" class="brk-body"/>
            <rect x="75" y="56" width="20" height="36" rx="3" style="fill:#2A302D"/><rect x="78" y="59" width="14" height="15" rx="2" style="fill:#F2B705"/>
            <circle cx="112" cy="118" r="7" style="fill:#F2B705;stroke:#8a6a00"/><text x="112" y="122" text-anchor="middle" style="font-size:9px;font-weight:700;fill:#1c2421">T</text>
            <text x="85" y="130" text-anchor="middle" style="font-size:10px;fill:#1c2421" class="mono">30mA</text>
            ${[0, 1, 2].map(k => `<rect x="${150 + k * 50}" y="36" width="40" height="100" rx="5" class="brk-body"/>
              <rect x="${162 + k * 50}" y="56" width="16" height="30" rx="3" style="fill:#2A302D"/><rect x="${164 + k * 50}" y="58" width="12" height="13" rx="2" style="fill:#F2B705"/>
              <text x="${170 + k * 50}" y="118" text-anchor="middle" style="font-size:10px;fill:#1c2421" class="mono">${['20A', '20A', '30A'][k]}</text>`).join('')}
            <rect x="40" y="200" width="250" height="14" rx="3" style="fill:var(--w-white);stroke:var(--ink-3)"/>
            <rect x="40" y="244" width="250" height="14" rx="3" style="fill:var(--w-green);stroke:var(--ink-3)"/>
            <path d="M330 86H140M330 56H250M330 222H290M330 251H290" style="stroke:var(--ink-3);stroke-width:1.2;stroke-dasharray:3 3"/>
            <text x="336" y="60" class="schem-title">分路無熔絲開關（NFB）</text>
            <text x="336" y="78" class="schem-txt">照明 20A、插座 20A、冷氣 30A…</text>
            <text x="336" y="94" class="schem-title">主開關（漏電斷路器 ELCB）</text>
            <text x="336" y="112" class="schem-txt">黃色 T 為測試按鈕，應定期按壓測試</text>
            <text x="336" y="226" class="schem-title">中性線端子排（白）</text>
            <text x="336" y="256" class="schem-title">接地端子排（綠）</text>
          </svg>
        </div>
        <div class="table-scroll"><table class="term-table">
          <thead><tr><th>器材</th><th>保護什麼</th><th>怎麼動作</th></tr></thead>
          <tbody>
            <tr><td><b>無熔絲開關 NFB</b></td><td>電線（過載、短路）</td><td>電流長時間偏大 → 熱動跳脫；短路大電流 → 電磁瞬間跳脫</td></tr>
            <tr><td><b>漏電斷路器 ELCB</b></td><td>人（感電）與漏電火災</td><td>比較火線與中性線的電流，差值超過設定（如 30mA）就跳脫</td></tr>
          </tbody>
        </table></div>
        <div class="callout">分路的好處：某一分路出問題只會跳掉那一路，其他地方照常有電，也方便查修時「一路一路」縮小範圍。</div>`,
      },
      {
        title: '電線：粗細與顏色',
        html: `
        <div class="prose">
          <p>導線分兩種寫法：<b>單心線</b>以直徑表示（1.6mm、2.0mm），<b>絞線</b>由多股細線絞成，以截面積表示（3.5mm²、5.5mm²、8mm²）。線越粗，能安全通過的電流越大。</p>
          <p>實際要用多粗，要依負載電流、配線方式查規則中的安培容量表；一般住宅常見照明、插座分路用 2.0mm，冷氣等大電流專用迴路用 5.5mm² 以上。</p>
        </div>
        <div class="table-scroll"><table class="term-table">
          <thead><tr><th>顏色</th><th>用途</th><th>說明</th></tr></thead>
          <tbody>
            <tr><td><span class="chip-wire" style="background:var(--w-red)"></span>紅</td><td>火線 L／L1</td><td>帶電的線（非接地導線）</td></tr>
            <tr><td><span class="chip-wire" style="background:var(--w-black)"></span>黑</td><td>火線 L2、開關線</td><td>單相三線的另一條火線；也常用在開關線、跨接線</td></tr>
            <tr><td><span class="chip-wire" style="background:var(--w-white)"></span>白</td><td>中性線 N</td><td>被接地導線，<b>火線不可用白色</b></td></tr>
            <tr><td><span class="chip-wire" style="background:var(--w-green)"></span>綠</td><td>接地線 E</td><td>只能當接地線，<b>其他用途不可用綠色</b></td></tr>
          </tbody>
        </table></div>
        <div class="callout">規則要求中性線用白（或灰）、接地線用綠；兩條火線用紅、黑區分，不可用白或綠。配線工坊統一：<b>L1 用紅、L2 用黑</b>，開關線與跨接線用黑或紅。</div>`,
      },
      {
        title: '開關家族：單切、三路、四路',
        html: `
        <div class="prose">
          <p>開關就是「可以斷開的導線」。看懂內部接點怎麼動，配線題就能自己推出來。點每個開關切換看看：</p>
        </div>
        <div class="figure"><div data-o="sw" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px"></div></div>
        <ul class="prose" style="padding-left:1.3em;margin:0">
          <li><b>單切開關</b>：2 個端子，一處控制一燈。</li>
          <li><b>三路開關</b>：共同端 C 輪流接到 1 或 2。兩個三路開關可以<b>兩處控制一燈</b>（樓梯上下）。</li>
          <li><b>四路開關</b>：四個端子「平行接 ↔ 交叉接」切換，夾在兩個三路開關中間，每多一個就多一處控制。</li>
          <li><b>指示燈（螢光開關）</b>：並聯在開關兩端的小氖燈，開關 OFF 時微亮，方便夜間找到開關。</li>
        </ul>`,
        mount(el) {
          const box = el.querySelector('[data-o="sw"]');
          const mk = (title, n, draw) => {
            let st = 0;
            const svg = sv('svg', { viewBox: '0 0 170 130', role: 'img', 'aria-label': title });
            const btn = h('button', { type: 'button', class: 'btn btn-sm' }, '切換');
            const cap = h('div', { class: 'small', style: { textAlign: 'center' } });
            const redraw = () => { svg.innerHTML = draw(st); cap.textContent = draw.caption(st); };
            btn.addEventListener('click', () => { st = (st + 1) % n; redraw(); beep(600, 0.04); });
            svg.addEventListener('click', () => btn.click());
            svg.style.cursor = 'pointer';
            redraw();
            box.append(h('div', { class: 'stack', style: { alignItems: 'center', gap: '6px' } }, h('b', {}, title), svg, cap, btn));
          };
          const dot = (x, y, l) => `<circle cx="${x}" cy="${y}" r="6" style="fill:var(--surface);stroke:var(--ink);stroke-width:2"/><text x="${x}" y="${y + 24}" text-anchor="middle" class="schem-title">${l}</text>`;
          const ln = (d) => `<path d="${d}" style="stroke:var(--copper);stroke-width:4;fill:none;stroke-linecap:round"/>`;
          const one = st => dot(40, 70, '1') + dot(130, 70, '2') + (st ? ln('M40 70L130 70') : ln('M40 70L118 38'));
          one.caption = st => st ? 'ON：1–2 導通' : 'OFF：斷開';
          const three = st => dot(30, 70, 'C') + dot(140, 35, '1') + dot(140, 105, '2') + (st ? ln('M30 70L140 105') : ln('M30 70L140 35'));
          three.caption = st => st ? 'C 接 2' : 'C 接 1';
          const four = st => dot(30, 30, '1') + dot(30, 100, '2') + dot(140, 30, '3') + dot(140, 100, '4') +
            (st ? ln('M30 30L140 100') + ln('M30 100L140 30') : ln('M30 30L140 30') + ln('M30 100L140 100'));
          four.caption = st => st ? '交叉：1–4、2–3' : '平行：1–3、2–4';
          mk('單切開關', 2, one); mk('三路開關', 2, three); mk('四路開關', 2, four);
        },
      },
      {
        title: '燈座與插座',
        html: `
        <div class="figure">
          <svg viewBox="0 0 620 230" role="img" aria-label="螺口燈座與插座">
            <g transform="translate(30,20)">
              <text x="80" y="0" text-anchor="middle" class="schem-title">螺口燈座（E27）</text>
              <rect x="40" y="20" width="80" height="120" rx="6" style="fill:#C9C9C0;stroke:var(--ink);stroke-width:2"/>
              <path d="M40 40h80M40 60h80M40 80h80M40 100h80M40 120h80" style="stroke:#8A8A80;stroke-width:3"/>
              <rect x="66" y="140" width="28" height="14" rx="3" style="fill:#B86E00;stroke:var(--ink);stroke-width:1.5"/>
              <path d="M80 154v40" class="wire-halo"/><path d="M80 154v40" class="wire-core" style="stroke:var(--w-black)"/>
              <path d="M120 80h40v114" class="wire-halo"/><path d="M120 80h40v114" class="wire-core" style="stroke:var(--w-white)"/>
              <text x="80" y="210" text-anchor="middle" class="schem-txt">中心 → 開關後的火線</text>
              <text x="170" y="150" class="schem-txt">螺紋 → N</text>
            </g>
            <g transform="translate(260,20)">
              <text x="70" y="0" text-anchor="middle" class="schem-title">110V 接地型插座</text>
              <rect x="10" y="20" width="120" height="140" rx="12" style="fill:var(--plate);stroke:var(--plate-edge);stroke-width:2"/>
              <rect x="42" y="50" width="10" height="34" rx="2" style="fill:var(--plate-ink)"/>
              <rect x="88" y="50" width="10" height="34" rx="2" style="fill:var(--plate-ink)"/>
              <path d="M60 122a10 10 0 0 1 20 0v10h-20z" style="fill:var(--plate-ink)"/>
              <text x="70" y="190" text-anchor="middle" class="schem-txt">兩個直孔 + 接地孔</text>
            </g>
            <g transform="translate(440,20)">
              <text x="70" y="0" text-anchor="middle" class="schem-title">220V 冷氣插座</text>
              <rect x="10" y="20" width="120" height="140" rx="12" style="fill:var(--plate);stroke:var(--plate-edge);stroke-width:2"/>
              <rect x="28" y="62" width="34" height="10" rx="2" style="fill:var(--plate-ink)"/>
              <rect x="78" y="62" width="34" height="10" rx="2" style="fill:var(--plate-ink)"/>
              <path d="M60 122a10 10 0 0 1 20 0v10h-20z" style="fill:var(--plate-ink)"/>
              <text x="70" y="190" text-anchor="middle" class="schem-txt">橫孔，110V 插頭插不進去</text>
            </g>
          </svg>
        </div>
        <ul class="prose" style="padding-left:1.3em;margin:0">
          <li>螺口燈座的<b>螺紋</b>最容易被手碰到，所以接<b>中性線</b>；<b>中心接點</b>接經過開關的火線。</li>
          <li>插座端子通常標示 L／N／接地（⏚）。接地端子一定要接綠色接地線。</li>
          <li>110V 插座兩孔分別接 L 與 N；220V 插座兩孔分別接 L1 與 L2（兩條都是火線）。</li>
        </ul>`,
      },
      {
        title: '電工工具箱',
        html: `
        <div class="table-scroll"><table class="term-table">
          <thead><tr><th>工具</th><th>用途</th><th>注意</th></tr></thead>
          <tbody>
            <tr><td><b>三用電表</b></td><td>量電壓（V）、電阻（Ω）、小電流（mA）</td><td>先選對檔位再接表筆；量電阻一定要斷電</td></tr>
            <tr><td><b>檢電起子</b></td><td>碰觸導體，氖燈亮代表帶電</td><td>只能粗略判斷，不能取代電表</td></tr>
            <tr><td><b>絕緣電阻計（高阻計）</b></td><td>送出 500V 測試電壓，量 MΩ 級絕緣電阻，找漏電</td><td>必須斷電；量線間時要拆下負載</td></tr>
            <tr><td><b>鉤表（夾式電流表）</b></td><td>不剪線就能量電流；同時夾 L+N 可量漏電流</td><td>量負載電流時只夾一條線</td></tr>
            <tr><td><b>剝線鉗、壓接鉗</b></td><td>剝除絕緣皮、壓接套管與端子</td><td>剝線長度適中，不可傷到銅線</td></tr>
            <tr><td><b>PVC 管、彎管器</b></td><td>保護導線的管路，術科會有配管</td><td>彎曲處不可壓扁，管口要去毛邊</td></tr>
          </tbody>
        </table></div>
        <div class="callout">三用電表、檢電起子、絕緣電阻計、鉤表，在「迴路 04」和「迴路 05」會實際操作。</div>`,
      },
      {
        title: '安全作業守則',
        html: `
        <div class="prose">
          <p>停電作業的順序（順序很重要，考試常考）：</p>
          <ol>
            <li><b>確認迴路</b>：要施工的是哪一個分路。</li>
            <li><b>關閉電源</b>：切斷該分路（或總開關）。</li>
            <li><b>驗電</b>：用檢電起子或電表確認真的沒電。</li>
            <li><b>上鎖掛牌</b>：在開關上鎖、掛「施工中 禁止送電」牌。</li>
            <li><b>施工</b>：配線、換器具。</li>
            <li><b>送電前自主檢查</b>：目視接線、用 Ω 檔確認 L–N 間沒有短路、量絕緣電阻。</li>
            <li><b>送電測試</b>：拆牌解鎖，送電並確認功能正常。</li>
          </ol>
        </div>
        <div class="callout bad"><b>有人觸電：</b>先切斷電源，或用乾燥的木棒等絕緣物把電線撥開，不可以直接用手拉。確認斷電後再急救（CPR）並撥打 119。</div>
        <div class="callout warn"><b>電氣火災：</b>先斷電，使用二氧化碳或乾粉滅火器。不可以用水。</div>`,
      },
      {
        title: '導線連接三原則',
        html: `
        <div class="prose">
          <p>電線接頭是線路最容易出問題的地方：接不緊會發熱、氧化，久了就起火。所有接頭都要做到：</p>
          <ol>
            <li><b>電阻不增加</b>：接觸面要緊密，不能鬆動。</li>
            <li><b>機械強度不低於原導線的 80%</b>：拉扯不會脫開。</li>
            <li><b>絕緣效力不降低</b>：接頭要用絕緣膠帶或絕緣套管包覆到跟原本一樣。</li>
          </ol>
          <p>常見做法：壓接套管（用壓接鉗壓合）、絞接後焊錫、壓接端子後鎖在器具端子上。導線要順著螺絲鎖緊的方向（順時針）繞。</p>
        </div>
        <div class="callout">配線工坊的規則：一個端子最多接 2 條線。線太多擠在同一顆螺絲下容易鬆脫。</div>`,
      },
    ],
  },
};

const Lessons = {
  render(root, chId) {
    const ch = CHAPTERS.find(c => c.id === chId);
    const L = LESSONS[chId];
    const seen = new Set(Store.data.seen[chId] || []);
    let cur = 0;
    const total = L.cards.length + 1;
    const toc = h('nav', { class: 'toc', 'aria-label': '本章目錄' });
    const main = h('div', {});
    root.append(chapterHeader(ch, ch.sub), h('div', { class: 'lesson' }, toc, main));

    const drawToc = () => {
      toc.replaceChildren(...L.cards.map((c, k) => h('button', {
        type: 'button', class: (k === cur ? 'cur ' : '') + (seen.has(k) ? 'seen' : ''),
        onclick: () => go(k),
      }, h('span', { class: 'n' }, seen.has(k) ? '✓' : String(k + 1).padStart(2, '0')), c.title)),
      h('button', { type: 'button', class: cur === L.cards.length ? 'cur' : '', onclick: () => go(L.cards.length) },
        h('span', { class: 'n' }, (Store.data.quizBest[chId] || 0) >= 0.8 ? '✓' : 'Q'), '小考'));
    };
    const go = (k) => {
      cur = k;
      if (k < L.cards.length) {
        seen.add(k);
        Store.data.seen[chId] = [...seen];
        Store.save();
      }
      drawToc();
      draw();
      updateOverall();
      const top = main.getBoundingClientRect().top + window.scrollY - 80;
      if (window.scrollY > top) window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    const draw = () => {
      if (cur === L.cards.length) {
        const qs = shuffle(QUESTIONS.filter(q => q.t === L.quiz.tag)).slice(0, L.quiz.n);
        const box = h('div', {});
        main.replaceChildren(h('div', { class: 'lesson-card' },
          h('div', { class: 'eyebrow' }, '本章小考 · 80 分通過'),
          h('h2', {}, ch.name + '：小考'), box));
        Quiz.run(box, qs, {
          pass: 0.8,
          doneLabel: '回配電盤',
          onDone: (rate, nav) => {
            if (!nav) {
              const best = Math.max(Store.data.quizBest[chId] || 0, rate);
              Store.data.quizBest[chId] = best;
              Store.save();
              updateOverall();
              if (rate >= 0.8) toast(`迴路 ${String(ch.no).padStart(2, '0')} 通電！`, 'ok');
            } else location.hash = '#home';
          },
        });
        return;
      }
      const c = L.cards[cur];
      const card = h('article', { class: 'lesson-card' },
        h('div', { class: 'eyebrow' }, `第 ${cur + 1} 課 / 共 ${L.cards.length} 課`),
        h('h2', {}, c.title),
        h('div', { class: 'stack', html: c.html }),
        h('div', { class: 'lesson-nav' },
          h('button', { class: 'btn', type: 'button', disabled: cur === 0, onclick: () => go(cur - 1) }, '← 上一課'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go(cur + 1) }, cur + 1 < L.cards.length ? '下一課 →' : '進入小考 →'),
        ),
      );
      main.replaceChildren(card);
      if (c.mount) c.mount(card);
    };
    go(0);
  },
  progress(chId) {
    const L = LESSONS[chId];
    const seen = (Store.data.seen[chId] || []).length;
    const best = Store.data.quizBest[chId] || 0;
    if (best >= 0.8) return 1;
    return Math.min(0.9, seen / L.cards.length * 0.7 + best * 0.25);
  },
};

/* ================= 學科模擬考 ================= */
const Exam = {
  render(root) {
    const ch = CHAPTERS.find(c => c.id === 'exam');
    root.append(chapterHeader(ch, ch.sub));
    const box = h('div', {});
    root.append(box);
    const home = () => {
      const tags = [['basics', '電學基礎'], ['gear', '器材與法規'], ['meter', '三用電表'], ['fault', '查修與安全'], ['common', '共同科目']];
      box.replaceChildren(h('div', { class: 'home-lower', style: { marginTop: 0 } },
        h('div', { class: 'card stack' },
          h('div', { class: 'eyebrow' }, '模擬考'),
          h('h2', {}, '隨機 30 題，全部作答完才公布答案'),
          h('p', { class: 'muted' }, `題庫共 ${QUESTIONS.length} 題，涵蓋電學、法規、電表、查修與共同科目。正式學科 60 分及格；在這裡拿到 80 分以上，這個迴路才會通電。`),
          Store.data.examBest != null ? h('p', {}, '目前最佳：', h('b', { class: 'num' }, Store.data.examBest), ' 分') : null,
          h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: startExam }, '開始模擬考')),
        ),
        h('div', { class: 'card stack' },
          h('div', { class: 'eyebrow' }, '分類練習'),
          h('h2', {}, '每題立即看解析'),
          h('p', { class: 'muted' }, '挑一個單元，隨機 10 題。'),
          h('div', { class: 'row' }, tags.map(([t, n]) => h('button', { class: 'btn', type: 'button', onclick: () => practice(t, n) }, n))),
        ),
      ));
    };
    const startExam = () => {
      const qs = shuffle(QUESTIONS).slice(0, 30);
      Quiz.run(box, qs, {
        instant: false, pass: 0.6, doneLabel: '回模擬考首頁',
        onRetry: startExam,
        onDone: (rate, nav) => {
          if (nav) return home();
          const score = Math.round(rate * 100);
          Store.data.examBest = Math.max(Store.data.examBest || 0, score);
          Store.save();
          updateOverall();
          if (score >= 80) toast('模擬考 80 分以上，迴路 06 通電！', 'ok');
        },
      });
    };
    const practice = (tag, name) => {
      const qs = shuffle(QUESTIONS.filter(q => q.t === tag)).slice(0, 10);
      Quiz.run(box, qs, { instant: true, pass: 0.8, doneLabel: '回模擬考首頁', onRetry: () => practice(tag, name), onDone: (r, nav) => { if (nav) home(); } });
    };
    home();
  },
  progress() {
    const b = Store.data.examBest;
    if (b == null) return 0;
    return b >= 80 ? 1 : Math.min(0.9, b / 80 * 0.9);
  },
};
