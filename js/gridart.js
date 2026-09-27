'use strict';
/* 迴路 01「電從發電廠到你家」的十站插圖與說明。
   每張圖是 640×360 的 SVG；marks 是圖上編號的位置（課程卡會疊成可點的圓點），對應 spots 的說明。
   顏色用 --art-* 變數，深色模式會變成夜景。 */
const GridArt = (() => {
  const W = 640, H = 360;
  const r1 = n => Math.round(n * 10) / 10;
  const fill = c => `style="fill:${c}"`;
  const ln = (d, c = 'var(--art-steel)', w = 1.5, more = '') => `<path d="${d}" style="stroke:${c};stroke-width:${w};fill:none;stroke-linecap:round;stroke-linejoin:round${more}"/>`;
  const pt = p => `${p[0]} ${p[1]}`;

  /* ---------- 共用元件 ---------- */
  const DEFS = `<defs><linearGradient id="ga-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--art-sky-1)"/><stop offset="1" style="stop-color:var(--art-sky-2)"/></linearGradient><pattern id="ga-mesh" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0L7 7M7 0L0 7" style="stroke:var(--art-steel);stroke-width:.7"/></pattern><pattern id="ga-dots" width="11" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" style="fill:var(--art-steel)"/><circle cx="7.5" cy="5.5" r=".8" style="fill:var(--art-steel)"/></pattern></defs>`;
  const cloud = (x, y, k = 1) => `<g style="fill:var(--art-cloud)" opacity=".9"><ellipse cx="${x}" cy="${y}" rx="${r1(38 * k)}" ry="${r1(10 * k)}"/><ellipse cx="${r1(x - 14 * k)}" cy="${r1(y - 6 * k)}" rx="${r1(17 * k)}" ry="${r1(11 * k)}"/><ellipse cx="${r1(x + 11 * k)}" cy="${r1(y - 9 * k)}" rx="${r1(21 * k)}" ry="${r1(14 * k)}"/></g>`;
  function backdrop(gy = 300, o = {}) {
    let s = DEFS + `<rect width="${W}" height="${H}" style="fill:url(#ga-sky)"/>`;
    if (o.clouds !== false) s += cloud(92, 52) + cloud(505, 34, 0.72);
    if (o.hills !== false) {
      s += `<path d="M0 ${gy - 52}C60 ${gy - 78} 140 ${gy - 70} 210 ${gy - 80}S360 ${gy - 104} 450 ${gy - 78}S580 ${gy - 66} 640 ${gy - 88}V${gy}H0Z" ${fill('var(--art-hill-2)')}/>`;
      s += `<path d="M0 ${gy - 26}C90 ${gy - 44} 170 ${gy - 30} 260 ${gy - 38}S430 ${gy - 52} 520 ${gy - 34}S610 ${gy - 30} 640 ${gy - 40}V${gy}H0Z" ${fill('var(--art-hill)')}/>`;
    }
    s += `<rect y="${gy}" width="${W}" height="${H - gy}" ${fill(o.floor || 'var(--art-ground)')}/>`;
    if (o.floor === 'var(--art-gravel)') s += `<rect y="${gy}" width="${W}" height="${H - gy}" style="fill:url(#ga-dots)" opacity=".45"/>`;   // 碎石
    return s + ln(`M0 ${gy}H${W}`, 'var(--art-ground-2)', 3);
  }
  const street = (y = 300) => `<rect y="${y}" width="${W}" height="12" ${fill('var(--art-walk)')}/><rect y="${y + 12}" width="${W}" height="${H - y - 12}" ${fill('var(--art-road)')}/>` + ln(`M0 ${y + 36}H${W}`, 'var(--art-walk)', 2, ';stroke-dasharray:18 14');

  /* 懸垂礙子串：從 (x, y) 往下 len，n 片 */
  function insul(x, y, len, n) {
    const gap = len / n, rx = r1(Math.max(1.6, gap * 1.05)), ry = r1(Math.max(0.7, gap * 0.34));
    let s = ln(`M${x} ${y}V${r1(y + len)}`, 'var(--art-steel)', 1);
    for (let i = 0; i < n; i++) s += `<ellipse cx="${x}" cy="${r1(y + (i + 0.5) * gap)}" rx="${rx}" ry="${ry}" ${fill('var(--art-insul)')}/>`;
    return s;
  }
  /* 瓷套管（一節一節）：底部 (x, yb)、高 hh */
  function bushing(x, yb, hh, w = 7, col = 'var(--art-porc)') {
    const n = Math.max(3, Math.round(hh / 5)), gap = hh / n;
    let s = `<rect x="${r1(x - w * 0.28)}" y="${r1(yb - hh)}" width="${r1(w * 0.56)}" height="${r1(hh)}" ${fill(col)}/>`;
    for (let i = 0; i < n; i++) s += `<ellipse cx="${x}" cy="${r1(yb - hh + (i + 0.5) * gap)}" rx="${r1(w / 2)}" ry="${r1(Math.min(2, gap * 0.35))}" ${fill(col)}/>`;
    return s + `<rect x="${r1(x - w * 0.3)}" y="${r1(yb - hh - 3)}" width="${r1(w * 0.6)}" height="3" rx="1" ${fill('#c3c8cc')}/>`;
  }
  /* 導線：兩點之間下垂的弧線；分裂導線畫成兩條 */
  const span = (a, b, sag, w = 1.2) => ln(`M${pt(a)}Q${r1((a[0] + b[0]) / 2)} ${r1((a[1] + b[1]) / 2 + 2 * sag)} ${pt(b)}`, 'var(--art-wire)', w);
  const bundle = (a, b, sag, gap = 2, w = 1) => span(a, b, sag, w) + span([a[0], r1(a[1] + gap)], [b[0], r1(b[1] + gap)], sag, w);

  /* 雙回線懸垂鐵塔（正面）：x 中心、yb 塔腳、h 高。回傳 6 個導線掛點（由下往上，左右交替）與塔頂 */
  function tower(x, yb, h, o = {}) {
    const bw = t => h * (t <= 0.64 ? 0.16 - 0.115 * t / 0.64 : 0.045 - 0.012 * (t - 0.64) / 0.33);
    const sw = r1(Math.max(0.6, h / 110));
    const ts = [0, 0.13, 0.26, 0.39, 0.52, 0.64, 0.71, 0.78, 0.85, 0.92, 0.97];
    const Lp = ts.map(t => [r1(x - bw(t)), r1(yb - t * h)]), Rp = ts.map(t => [r1(x + bw(t)), r1(yb - t * h)]);
    let s = ln('M' + Lp.map(pt).join('L'), 'var(--art-steel)', sw) + ln('M' + Rp.map(pt).join('L'), 'var(--art-steel)', sw);
    let br = '';
    for (let i = 0; i < ts.length - 1; i++) br += `M${pt(Lp[i])}L${pt(Rp[i + 1])}M${pt(Rp[i])}L${pt(Lp[i + 1])}`;
    s += ln(br, 'var(--art-steel)', r1(sw * 0.55));
    const tw = bw(0.97), top = r1(yb - h);
    s += ln(`M${r1(x - tw)} ${r1(yb - 0.97 * h)}L${x} ${top}L${r1(x + tw)} ${r1(yb - 0.97 * h)}`, 'var(--art-steel)', sw);
    const pts = [], li = (o.insul ?? 0.1) * h;
    [[0.64, 0.21], [0.78, 0.25], [0.92, 0.21]].forEach(([t, a]) => {
      const y = r1(yb - t * h), b = bw(t), A = a * h;
      [-1, 1].forEach(sd => {
        const x0 = r1(x + sd * b), x1 = r1(x + sd * (b + A));
        s += ln(`M${x0} ${y}L${x1} ${y}L${x0} ${r1(y + 0.05 * h)}`, 'var(--art-steel)', sw);
        const ix = r1(x1 - sd * 0.012 * h);
        s += insul(ix, y, r1(li), Math.max(4, Math.round(li / 2.6)));
        pts.push([ix, r1(y + li)]);
      });
    });
    return { svg: s, pts, top: [x, top] };
  }

  /* 電力變壓器（正面）：x 油箱左緣、yb 地面、w 寬、hh 油箱高。回傳高壓（與中壓）套管頂點 */
  function xfmr(x, yb, w, hh, o = {}) {
    const top = yb - 8 - hh, rw = o.rad ?? Math.round(w * 0.22);
    let s = `<rect x="${x - rw - 4}" y="${yb - 8}" width="${w + rw + 8}" height="8" ${fill('var(--art-pole)')}/>`;
    s += `<rect x="${x - rw}" y="${r1(top + hh * 0.12)}" width="${rw}" height="${r1(hh * 0.8)}" ${fill('var(--art-tank-2)')}/>`;
    let d = '';
    for (let fx = x - rw + 3; fx < x - 1; fx += 4) d += `M${fx} ${r1(top + hh * 0.15)}V${r1(top + hh * 0.89)}`;
    s += ln(d, 'var(--art-tank)', 1.6);
    s += `<rect x="${x}" y="${top}" width="${w}" height="${hh}" rx="3" ${fill('var(--art-tank)')}/>`;
    s += ln(`M${x} ${top + 5}H${x + w}M${x} ${top + hh - 4}H${x + w}`, 'var(--art-tank-2)', 2);
    s += `<rect x="${r1(x + w * 0.1)}" y="${r1(top + hh * 0.42)}" width="${r1(w * 0.15)}" height="${r1(hh * 0.2)}" rx="1" ${fill('#e4e6e0')}/>`;
    if (o.cons !== false) {
      s += ln(`M${r1(x + w * 0.72)} ${r1(top - hh * 0.14)}V${top}M${r1(x + w * 0.9)} ${r1(top - hh * 0.14)}V${top}`, 'var(--art-tank-2)', 2);
      s += `<rect x="${r1(x + w * 0.64)}" y="${r1(top - hh * 0.32)}" width="${r1(w * 0.36)}" height="${r1(hh * 0.18)}" rx="${r1(hh * 0.09)}" ${fill('var(--art-tank)')}/>`;
    }
    const bh = o.bh ?? hh * 0.7, bw = o.bw ?? 7;
    const hv = [0.2, 0.36, 0.52].map(f => { const bx = r1(x + w * f); s += bushing(bx, top, bh, bw); return [bx, r1(top - bh - 3)]; });
    const mv = !o.mv ? [] : [0.7, 0.81, 0.92].map(f => { const bx = r1(x + w * f); s += bushing(bx, top, r1(bh * 0.6), r1(bw * 0.85)); return [bx, r1(top - bh * 0.6 - 3)]; });
    return { svg: s, hv, mv, top };
  }
  /* 戶外斷路器：頂端在 yb - hh */
  const breaker = (x, yb, hh = 60) => ln(`M${x - 5} ${yb}V${r1(yb - hh * 0.45)}M${x + 5} ${yb}V${r1(yb - hh * 0.45)}`, 'var(--art-steel)', 2)
    + `<rect x="${x - 8}" y="${r1(yb - hh * 0.56)}" width="16" height="${r1(hh * 0.12)}" rx="2" ${fill('var(--art-metal)')}/>`
    + bushing(x, r1(yb - hh * 0.56), r1(hh * 0.44 - 3), 7);
  /* 門型鐵構：兩根格子柱＋橫樑，樑下掛三串礙子 */
  function gantry(x1, x2, yb, yt, o = {}) {
    const cw = o.cw ?? 8, bh = o.bh ?? 9, li = o.li ?? 18;
    let s = '';
    [x1, x2].forEach(cx => {
      s += ln(`M${cx - cw / 2} ${yb}V${yt}M${cx + cw / 2} ${yb}V${yt}`, 'var(--art-steel)', 1.8);
      let d = '';
      for (let y = yb; y > yt + cw; y -= cw * 1.6) d += `M${cx - cw / 2} ${r1(y)}L${cx + cw / 2} ${r1(y - cw * 0.8)}L${cx - cw / 2} ${r1(y - cw * 1.6)}`;
      s += ln(d, 'var(--art-steel)', 0.8);
    });
    s += ln(`M${x1 - cw / 2} ${yt}H${x2 + cw / 2}M${x1 - cw / 2} ${yt + bh}H${x2 + cw / 2}`, 'var(--art-steel)', 1.8);
    let d = '';
    for (let x = x1; x < x2 - 1; x += bh * 1.2) d += `M${r1(x)} ${yt + bh}L${r1(x + bh * 0.6)} ${yt}L${r1(x + bh * 1.2)} ${yt + bh}`;
    s += ln(d, 'var(--art-steel)', 0.8);
    const pts = [1, 2, 3].map(i => {
      const px = r1(x1 + (x2 - x1) * i / 4);
      s += insul(px, yt + bh, li, Math.round(li / 2.6));
      return [px, r1(yt + bh + li)];
    });
    return { svg: s, pts };
  }
  function fence(x1, x2, yb, hh = 22) {
    let d = '';
    for (let x = x1 + 6; x <= x2; x += 26) d += `M${x} ${yb}V${yb - hh - 4}`;
    return `<rect x="${x1}" y="${yb - hh}" width="${x2 - x1}" height="${hh}" style="fill:url(#ga-mesh)" opacity=".6"/>`
      + ln(d, 'var(--art-steel)', 2) + ln(`M${x1} ${yb - hh}H${x2}M${x1} ${yb - hh - 4}H${x2}`, 'var(--art-steel)', 1.2);
  }
  const bolt = (x, y, k = 1) => `<path d="M${x} ${y}l${-6 * k} ${11 * k}h${5 * k}l${-3 * k} ${12 * k} ${9 * k} ${-15 * k}h${-5 * k}l${4 * k} ${-8 * k}z" ${fill('#d0312d')}/>`;
  const sign = (x, y) => `<rect x="${x}" y="${y}" width="66" height="34" rx="3" style="fill:#f5c518;stroke:#1b1b1b;stroke-width:1.5"/>${bolt(x + 12, y + 5)}`
    + `<text x="${x + 40}" y="${y + 15}" text-anchor="middle" class="ga-sign">高壓危險</text><text x="${x + 40}" y="${y + 28}" text-anchor="middle" class="ga-sign ga-red">禁止進入</text>`;

  /* 水泥電桿：頂端橫擔三個高壓掛點（中間那個在桿頂） */
  function dpole(x, yb, h, o = {}) {
    const top = yb - h, aw = o.arm ?? 30;
    let s = `<path d="M${x - 5} ${yb}L${x - 3} ${top}H${x + 3}L${x + 5} ${yb}Z" ${fill('var(--art-pole)')}/>`
      + `<path d="M${x} ${yb}V${top}H${x + 3}L${x + 5} ${yb}Z" style="fill:#000;opacity:.14"/>`;   // 背光面
    s += `<rect x="${x - aw}" y="${top + 6}" width="${aw * 2}" height="4" ${fill('var(--art-steel)')}/>` + ln(`M${r1(x - aw * 0.6)} ${top + 10}L${x} ${top + 22}L${r1(x + aw * 0.6)} ${top + 10}`, 'var(--art-steel)', 1.3);
    const pts = [[x - aw + 4, top - 1], [x, top - 8], [x + aw - 4, top - 1]];
    pts.forEach(([px, py]) => { s += `<rect x="${px - 2.5}" y="${py}" width="5" height="8" rx="1.5" style="fill:#ece9df;stroke:#a19d91;stroke-width:.6"/>`; });
    return { svg: s, pts, top };
  }
  function poleXf(x, y, w = 28, hh = 44) {
    let d = '';
    for (let i = 1; i < 5; i++) d += `M${r1(x - w / 2 + i * w / 5)} ${y + 6}V${y + hh - 5}`;
    return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${hh}" rx="4" ${fill('var(--art-metal)')}/>` + ln(d, 'var(--art-steel)', 0.8, ';opacity:.55')
      + `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="3" ${fill('var(--art-steel)')}/>` + bushing(x - 6, y, 9, 4.5, 'var(--art-insul)') + bushing(x + 6, y, 9, 4.5, 'var(--art-insul)');
  }
  function padXf(x, yb, w = 84, hh = 54) {
    let d = '';
    for (let i = 0; i < 6; i++) d += `M${x + 8} ${yb - hh + 10 + i * 5}H${x + 32}`;
    return `<rect x="${x - 3}" y="${yb - hh - 5}" width="${w + 6}" height="6" rx="2" ${fill('#2f6a48')}/><rect x="${x}" y="${yb - hh}" width="${w}" height="${hh}" rx="2" ${fill('#3d7f58')}/>`
      + ln(d, '#2b5c40', 1.6) + `<rect x="${x + w - 30}" y="${yb - hh + 10}" width="22" height="20" rx="1" ${fill('#f5c518')}/>${bolt(x + w - 17, yb - hh + 12, 0.65)}`
      + `<rect x="${x - 4}" y="${yb - 4}" width="${w + 8}" height="4" ${fill('var(--art-pole)')}/>`;
  }
  const tree = (x, yb, k = 1) => `<rect x="${r1(x - 2 * k)}" y="${r1(yb - 18 * k)}" width="${r1(4 * k)}" height="${r1(18 * k)}" ${fill('#7a5a3a')}/><g ${fill('var(--art-tree)')}><circle cx="${x}" cy="${r1(yb - 26 * k)}" r="${r1(11 * k)}"/><circle cx="${r1(x - 8 * k)}" cy="${r1(yb - 19 * k)}" r="${r1(8 * k)}"/><circle cx="${r1(x + 8 * k)}" cy="${r1(yb - 19 * k)}" r="${r1(8 * k)}"/></g>`;
  const car = (x, yb, col = '#c9423a') => `<path d="M${x} ${yb - 5}h36v-7l-7-6h-19l-7 6h-3z" ${fill(col)}/><path d="M${x + 12} ${yb - 16}h8v5h-12zM${x + 22} ${yb - 16}h6l5 5h-11z" ${fill('var(--art-win)')}/><circle cx="${x + 8}" cy="${yb - 4}" r="3.6" ${fill('#222')}/><circle cx="${x + 28}" cy="${yb - 4}" r="3.6" ${fill('#222')}/>`;
  /* 透天厝：一樓鐵捲門，樓上窗戶與陽台 */
  function house(x, yb, w, floors, col) {
    const fh = 44, top = yb - fh * floors;
    let s = `<rect x="${x}" y="${top}" width="${w}" height="${yb - top}" ${fill(col)}/><rect x="${x - 3}" y="${top - 5}" width="${w + 6}" height="6" ${fill('var(--art-bldg-2)')}/>`;
    for (let f = 0; f < floors - 1; f++) {
      const y = top + f * fh;
      s += `<rect x="${x + 12}" y="${y + 10}" width="${w - 24}" height="20" ${fill('var(--art-win)')}/>` + ln(`M${x + 6} ${y + 35}H${x + w - 6}`, 'var(--art-bldg-2)', 2.5);
    }
    s += `<rect x="${x + 10}" y="${yb - fh + 8}" width="${w - 20}" height="${fh - 8}" ${fill('var(--art-bldg-2)')}/>`;
    let d = '';
    for (let i = 1; i < 7; i++) d += `M${x + 10} ${r1(yb - fh + 8 + i * (fh - 8) / 7)}H${x + w - 10}`;
    return s + ln(d, col, 0.8);
  }

  /* ---------- 1. 發電廠 ---------- */
  function plant() {
    let s = backdrop(300);
    s += `<path d="M452 300A80 64 0 0 1 612 300Z" ${fill('var(--art-bldg)')}/>` + ln('M474 300Q484 246 532 236M590 300Q580 246 532 236M532 236V300', 'var(--art-bldg-2)', 1.5);
    s += ln('M440 227V300M400 190V300', 'var(--art-steel)', 2) + ln('M478 262L352 146', 'var(--art-steel)', 7) + ln('M478 262L352 146', 'var(--art-bldg-2)', 3);
    s += `<rect x="352" y="198" width="36" height="16" ${fill('var(--art-bldg-2)')}/>`;
    s += `<path d="M384 300L394 28H410L420 300Z" ${fill('#e7e3da')}/><path d="M393.3 48L394 28H410L410.7 48ZM392.8 78L393.4 60H410.6L411.2 78Z" ${fill('#d0312d')}/>`;
    s += `<g style="fill:var(--art-cloud)" opacity=".7"><ellipse cx="410" cy="18" rx="11" ry="7"/><ellipse cx="430" cy="12" rx="15" ry="8"/><ellipse cx="456" cy="9" rx="17" ry="7"/></g>`;
    s += `<rect x="262" y="92" width="80" height="16" ${fill('var(--art-bldg-2)')}/><rect x="252" y="106" width="100" height="194" ${fill('var(--art-bldg)')}/>`;
    let d = '';
    for (let i = 1; i < 5; i++) d += `M${252 + i * 20} 108V300`;
    s += ln(d, 'var(--art-bldg-2)', 1);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) s += `<rect x="${257 + c * 20}" y="${122 + r * 26}" width="10" height="6" ${fill('var(--art-win)')}/>`;
    s += ln('M252 176H176V198', '#b8783c', 6);
    s += `<rect x="52" y="198" width="198" height="102" ${fill('var(--art-bldg-2)')}/><path d="M46 198H256L248 186H54Z" ${fill('var(--art-steel)')}/>`;
    s += `<rect x="70" y="212" width="164" height="78" rx="6" style="fill:#46525a;stroke:#2f383e;stroke-width:2"/>` + ln('M80 262H230', '#d6dbe0', 3);
    s += `<rect x="86" y="251" width="18" height="22" rx="3" ${fill('#b3bdc4')}/><rect x="106" y="246" width="22" height="32" rx="4" ${fill('#a5b0b8')}/><rect x="130" y="240" width="30" height="44" rx="5" ${fill('#98a4ad')}/>`;
    s += `<rect x="172" y="243" width="46" height="38" rx="9" ${fill('#5d86aa')}/>` + ln('M179 247V277M187 247V277M195 247V277M203 247V277M211 247V277', '#4a6f90', 1.5);
    s += `<rect x="220" y="255" width="8" height="14" rx="2" ${fill('#7d8b95')}/>` + ln('M76 288H228', '#2f383e', 2);
    return { svg: s, marks: [[1, 302, 150], [2, 118, 228], [3, 195, 228], [4, 436, 66], [5, 532, 278]] };
  }

  /* ---------- 2. 升壓變電所 ---------- */
  function stepup() {
    let s = backdrop(300, { floor: 'var(--art-gravel)' });
    s += `<g opacity=".85"><rect x="18" y="186" width="62" height="114" ${fill('var(--art-bldg-2)')}/><path d="M86 300L91 108H99L104 300Z" ${fill('#e7e3da')}/><path d="M90.6 124L91 108H99L99.4 124Z" ${fill('#d0312d')}/></g>`;
    s += `<rect x="80" y="256" width="46" height="9" ${fill('var(--art-metal)')}/>`;
    const T = xfmr(150, 300, 130, 72, { bh: 46, bw: 9 });
    const G1 = gantry(340, 460, 300, 132, { li: 20 }), G2 = gantry(492, 602, 300, 104, { li: 24 });
    s += T.svg + G1.svg + G2.svg;
    G1.pts.forEach((p, i) => { s += breaker(p[0], 300, 66) + ln(`M${pt(p)}V234`, 'var(--art-wire)', 1.2) + span(T.hv[i], p, 6) + span(p, G2.pts[i], 5); });
    G2.pts.forEach((p, i) => { s += span(p, [660, 58 + i * 16], 6); });
    s += fence(0, 640, 338) + sign(36, 300);
    return { svg: s, marks: [[1, 214, 262], [2, 197, 148], [3, 134, 212], [4, 415, 246], [5, 400, 116], [6, 612, 64]] };
  }

  /* ---------- 3. 超高壓輸電 ---------- */
  function transmission() {
    let s = backdrop(300);
    const A = tower(150, 334, 296), B = tower(392, 266, 150), C = tower(528, 246, 86), D = tower(596, 234, 50);
    s += D.svg + C.svg + B.svg + tree(452, 268, 0.7) + tree(470, 270, 0.55);
    for (let i = 0; i < 6; i++) {
      s += bundle(C.pts[i], D.pts[i], 3, 1.1, 0.7) + bundle(B.pts[i], C.pts[i], 6, 1.5, 0.8) + bundle(A.pts[i], B.pts[i], 14, 2.4);
      s += bundle(A.pts[i], [r1(A.pts[i][0] - 240), r1(A.pts[i][1] + 70)], 10, 2.4);
    }
    s += span(C.top, D.top, 3, 0.7) + span(B.top, C.top, 5, 0.8) + span(A.top, B.top, 12) + span(A.top, [A.top[0] - 240, A.top[1] + 60], 10);
    s += A.svg + `<circle cx="271" cy="89" r="5.5" style="fill:#e8662b;stroke:#fff;stroke-width:1"/>` + car(236, 346);
    return { svg: s, marks: [[1, 200, 262], [2, 246, 156], [3, 326, 214], [4, 212, 48], [5, 292, 72]] };
  }

  /* ---------- 4. 超高壓變電所 E/S ---------- */
  function ehv() {
    let s = backdrop(300, { floor: 'var(--art-gravel)' });
    const A = tower(34, 300, 230, { insul: 0.11 }), B = tower(634, 300, 170);
    const G1 = gantry(112, 244, 300, 96, { li: 30, bh: 11, cw: 10 }), G2 = gantry(452, 560, 300, 150, { li: 18 });
    const T = xfmr(290, 300, 140, 84, { bh: 58, bw: 10, mv: true, cons: false });
    s += B.svg + A.svg + G1.svg + G2.svg + T.svg;
    [0, 2, 4].forEach(i => { s += span(A.pts[i], [-40, A.pts[i][1] + 24], 4); });
    [[5, 0], [3, 1], [1, 2]].forEach(([a, g]) => { s += span(A.pts[a], G1.pts[g], 4); });
    G1.pts.forEach((p, i) => { s += breaker(p[0], 300, 84) + ln(`M${pt(p)}V216`, 'var(--art-wire)', 1.2) + span(p, T.hv[i], 5); });
    G2.pts.forEach((p, i) => { s += breaker(p[0], 300, 60) + ln(`M${pt(p)}V240`, 'var(--art-wire)', 1.2) + span(T.mv[i], p, 4) + span(p, B.pts[[4, 2, 0][i]], 4); });
    s += fence(0, 640, 352) + sign(40, 316);
    return { svg: s, marks: [[1, 66, 62], [2, 161, 190], [3, 372, 252], [4, 560, 132], [5, 560, 316]] };
  }

  /* ---------- 5. 一次變電所 P/S ---------- */
  function primary() {
    let s = backdrop(300, { floor: 'var(--art-gravel)' });
    const A = tower(40, 300, 200), G = gantry(106, 196, 300, 140, { li: 20 }), T = xfmr(236, 300, 100, 60, { bh: 36, bw: 8 });
    s += A.svg + G.svg;
    [0, 2, 4].forEach(i => { s += span(A.pts[i], [-40, A.pts[i][1] + 20], 4); });
    [[5, 2], [3, 1], [1, 0]].forEach(([a, g]) => { s += span(A.pts[a], G.pts[g], 3); });
    G.pts.forEach((p, i) => { s += breaker(p[0], 300, 60) + ln(`M${pt(p)}V240`, 'var(--art-wire)', 1.2) + span(p, T.hv[i], 4); });
    s += T.svg + `<rect x="336" y="244" width="46" height="10" ${fill('var(--art-metal)')}/>`;
    // 開關室
    s += `<rect x="376" y="190" width="168" height="8" ${fill('var(--art-bldg-2)')}/><rect x="380" y="198" width="160" height="102" ${fill('var(--art-bldg)')}/>`;
    let d = '';
    for (let y = 224; y < 264; y += 5) d += `M394 ${y}H450`;
    s += ln(d, 'var(--art-bldg-2)', 2) + `<rect x="470" y="252" width="32" height="48" ${fill('var(--art-bldg-2)')}/><rect x="398" y="206" width="48" height="13" rx="2" ${fill('#f4f2ea')}/><text x="422" y="216" text-anchor="middle" class="ga-sign">開關室</text>`;
    const roof = [490, 506, 522].map(x => { s += bushing(x, 190, 16, 6); return [x, 171]; });
    // 69kV 鋼管桿
    s += `<path d="M594 300L597 108H603L606 300Z" ${fill('var(--art-metal)')}/>`;
    const arms = [128, 154, 180].map(y => { s += ln(`M600 ${y}H570`, 'var(--art-steel)', 2.5) + insul(572, y, 10, 4); return [572, y + 10]; });
    roof.forEach((p, i) => { s += span(p, arms[i], 3) + span(arms[i], [660, arms[i][1] - 18], 4); });
    s += fence(0, 640, 338) + sign(40, 302);
    return { svg: s, marks: [[1, 72, 96], [2, 300, 262], [3, 476, 232], [4, 556, 106]] };
  }

  /* ---------- 6. 二次變電所 S/S（屋內型，右半邊剖開） ---------- */
  function secondary() {
    const gy = 290;
    let s = backdrop(gy, { hills: false, floor: 'var(--art-soil)' });
    [[0, 150, 58], [60, 120, 44], [106, 172, 40], [430, 136, 56], [488, 178, 40], [530, 108, 60], [592, 160, 48]].forEach(([x, y, w]) => {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${gy - y}" ${fill('var(--art-hill-2)')}/>`;
      for (let yy = y + 10; yy < gy - 14; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 12) s += `<rect x="${xx}" y="${yy}" width="6" height="7" ${fill('var(--art-win)')} opacity=".5"/>`;
    });
    s += `<rect y="${gy - 4}" width="${W}" height="6" ${fill('var(--art-road)')}/>`;
    // 地下管路：69kV 從左邊進來、22.8kV 往右邊送出去
    s += `<rect x="0" y="318" width="252" height="16" rx="8" ${fill('var(--art-pole)')}/><rect x="412" y="304" width="228" height="20" rx="10" ${fill('var(--art-pole)')}/>`;
    s += ln('M0 326H258', '#1f1f1f', 3) + ln('M404 310H640M404 318H640', '#1f1f1f', 2.5);
    // 建築外觀
    const X0 = 150, X1 = 252, X2 = 420, T0 = 110;
    s += `<rect x="${X0}" y="${T0}" width="${X2 - X0}" height="${gy - T0}" ${fill('var(--art-bldg)')}/><rect x="${X0 - 4}" y="${T0 - 6}" width="${X2 - X0 + 8}" height="7" ${fill('var(--art-bldg-2)')}/>`;
    [T0, 155, 200].forEach(y => { s += `<rect x="${X0 + 12}" y="${y + 12}" width="34" height="20" ${fill('var(--art-win)')}/><rect x="${X0 + 56}" y="${y + 12}" width="34" height="20" ${fill('var(--art-win)')}/>`; });
    s += `<rect x="${X0 + 10}" y="250" width="82" height="15" rx="2" style="fill:#f4f2ea;stroke:#8d8a80;stroke-width:.8"/><text x="${X0 + 51}" y="261.5" text-anchor="middle" class="ga-sign">○○變電所</text>`;
    s += `<rect x="${X0 + 14}" y="268" width="74" height="22" ${fill('var(--art-bldg-2)')}/>` + ln(`M${X0 + 26} 268V290M${X0 + 38} 268V290M${X0 + 50} 268V290M${X0 + 62} 268V290M${X0 + 74} 268V290`, 'var(--art-steel)', 1.2);
    s += `<path d="M${X0 + 51} 271l9 15h-18z" style="fill:#f5c518;stroke:#1b1b1b;stroke-width:1"/>` + bolt(X0 + 52, 274, 0.45);
    // 剖面：控制室、GIS、配電盤、主變壓器、地下電纜層
    s += `<rect x="${X1}" y="${T0}" width="${X2 - X1 - 8}" height="${gy - T0}" ${fill('#3d474f')}/><rect x="${X1 - 4}" y="${gy}" width="${X2 - X1 + 4}" height="46" style="fill:#3d474f;stroke:var(--art-bldg-2);stroke-width:4"/>`;
    [155, 200, 245, gy].forEach(y => { s += `<rect x="${X1}" y="${y - 2}" width="${X2 - X1}" height="4" ${fill('var(--art-bldg-2)')}/>`; });
    for (let i = 0; i < 4; i++) {
      const x = X1 + 10 + i * 38;
      s += `<rect x="${x}" y="121" width="30" height="32" rx="2" ${fill('#cfd6db')}/><circle cx="${x + 8}" cy="128" r="2" ${fill('#2a9d4b')}/><circle cx="${x + 15}" cy="128" r="2" ${fill('#d0312d')}/><rect x="${x + 5}" y="134" width="20" height="9" ${fill('#5b6a74')}/>`;
    }
    s += `<rect x="${X1 + 8}" y="181" width="${X2 - X1 - 30}" height="13" rx="6.5" ${fill('var(--art-metal)')}/>`;
    [0, 1, 2].forEach(i => { const x = X1 + 24 + i * 44; s += `<rect x="${x}" y="161" width="16" height="30" rx="7" ${fill('var(--art-metal)')}/>` + ln(`M${x - 1} 170H${x + 17}M${x - 1} 185H${x + 17}`, 'var(--art-steel)', 1.5); });
    for (let i = 0; i < 4; i++) { const x = X1 + 8 + i * 32; s += `<rect x="${x}" y="206" width="26" height="37" rx="1.5" ${fill('#d6dad4')}/><rect x="${x + 5}" y="211" width="16" height="8" ${fill('#5b6a74')}/>` + ln(`M${x + 20} 228V236`, '#5b6a74', 2); }
    s += xfmr(X1 + 46, gy - 2, 64, 26, { bh: 10, bw: 5 }).svg;
    let d = '';
    for (let y = 252; y < 286; y += 5) d += `M${X2 - 7} ${y}H${X2 - 1}`;
    s += ln(d, 'var(--art-bldg-2)', 1.5) + ln(`M${X1 + 64} ${gy + 2}V${gy + 20}H${X2 - 10}M${X1 + 72} ${gy + 2}V${gy + 28}H${X2 - 10}`, '#1f1f1f', 2.5) + ln(`M${X1} 326H${X1 + 30}V${gy + 2}`, '#1f1f1f', 3);
    return { svg: s, marks: [[1, 201, 154], [2, 398, 170], [3, 392, 262], [4, 398, 224], [5, 530, 340]] };
  }

  /* ---------- 7. 配電線路 ---------- */
  function distribution() {
    let s = backdrop(300, { hills: false });
    [[0, 96, 3, 'var(--art-bldg)'], [100, 104, 4, 'var(--art-bldg-3)'], [208, 92, 3, 'var(--art-bldg)'], [304, 110, 4, 'var(--art-bldg-3)'], [418, 96, 3, 'var(--art-bldg)'], [518, 122, 4, 'var(--art-bldg-3)']]
      .forEach(([x, w, f, c]) => { s += house(x, 300, w, f, c); });
    s += street(300) + `<ellipse cx="470" cy="325" rx="26" ry="5" style="fill:#5b5e61;stroke:#7b7e80;stroke-width:1.5"/>`;
    const P = [dpole(96, 306, 192), dpole(334, 306, 192), dpole(572, 306, 192)];
    P.forEach(p => { s += p.svg + `<rect x="${p.pts[1][0] + 3}" y="164" width="8" height="4" ${fill('var(--art-steel)')}/><rect x="${p.pts[1][0] - 11}" y="200" width="8" height="4" ${fill('var(--art-steel)')}/>`; });
    for (let i = 0; i < 3; i++) s += span([-10, P[0].pts[i][1] + 3], P[0].pts[i], 2) + span(P[0].pts[i], P[1].pts[i], 7) + span(P[1].pts[i], P[2].pts[i], 7) + span(P[2].pts[i], [650, P[2].pts[i][1] + 3], 2);
    const low = [[-10, 172], [106, 166], [344, 166], [582, 166], [650, 172]];
    const tel = [[-10, 208], [88, 202], [326, 202], [564, 202], [650, 208]];
    for (let i = 0; i < 4; i++) {
      s += span(low[i], low[i + 1], 9, 2.8);
      s += `<g opacity=".8">${span(tel[i], tel[i + 1], 8, 3.2)}${span([tel[i][0], tel[i][1] + 8], [tel[i + 1][0], tel[i + 1][1] + 8], 8, 2)}</g>`;
    }
    s += `<rect x="440" y="214" width="16" height="10" rx="2" ${fill('var(--art-steel)')}/>`;
    s += `<rect x="329" y="228" width="10" height="16" rx="1" style="fill:#f4f4ef;stroke:#8d8d86;stroke-width:.8"/>` + ln('M331 233H337M331 237H337M331 241H335', '#555', 1);
    return { svg: s, marks: [[1, 215, 96], [2, 334, 88], [3, 215, 160], [4, 453, 240], [5, 354, 236], [6, 512, 324]] };
  }

  /* ---------- 8. 配電變壓器 ---------- */
  function xfScene() {
    let s = backdrop(300, { hills: false });
    s += `<rect x="326" y="134" width="318" height="7" ${fill('var(--art-bldg-2)')}/><rect x="330" y="140" width="310" height="160" ${fill('var(--art-bldg)')}/>`;
    for (let x = 346; x < 630; x += 54) s += `<rect x="${x}" y="152" width="36" height="24" ${fill('var(--art-win)')}/><rect x="${x}" y="198" width="36" height="24" ${fill('var(--art-win)')}/>`;
    s += `<rect x="330" y="238" width="310" height="8" ${fill('#c9423a')}/><rect x="344" y="252" width="116" height="48" ${fill('var(--art-win)')}/><rect x="478" y="252" width="146" height="48" ${fill('var(--art-win)')}/>`;
    s += street(300) + padXf(452, 300);
    s += `<path d="M162 306L166 36H174L178 306Z" ${fill('var(--art-pole)')}/><path d="M170 306V36H174L178 306Z" style="fill:#000;opacity:.14"/>`;
    s += `<rect x="118" y="50" width="104" height="5" ${fill('var(--art-steel)')}/>` + ln('M136 55L170 70L204 55', 'var(--art-steel)', 1.5);
    const tops = [[124, 42], [170, 28], [216, 42]];
    tops.forEach(([x, y]) => { s += `<rect x="${x - 3}" y="${y}" width="6" height="8" rx="1.5" style="fill:#ece9df;stroke:#a19d91;stroke-width:.6"/>` + span([-10, y + 6], [x, y], 3) + span([x, y], [650, y + 6], 3); });
    s += `<rect x="112" y="92" width="116" height="5" ${fill('var(--art-steel)')}/>`;
    s += bushing(122, 92, 16, 6, 'var(--art-insul)') + bushing(218, 92, 16, 6, 'var(--art-insul)');
    [140, 200].forEach(cx => { s += `<g transform="rotate(-18 ${cx} 110)"><rect x="${cx - 3}" y="98" width="6" height="24" rx="2" ${fill('var(--art-porc)')}/><rect x="${cx + 4}" y="96" width="3.2" height="28" rx="1.5" ${fill('#3a3a3a')}/></g>`; });
    s += ln('M124 45Q130 70 138 97M216 45Q210 70 198 97M122 73L124 45M218 73L216 45M146 121L140 139M206 121L200 139', 'var(--art-wire)', 1.2);
    s += `<rect x="124" y="194" width="92" height="5" ${fill('var(--art-steel)')}/>` + ln('M130 199L166 222M210 199L174 222', 'var(--art-steel)', 1.5);
    s += poleXf(146, 150) + poleXf(194, 150);
    s += span([160, 186], [330, 206], 8, 2.6) + span([208, 188], [330, 212], 8, 2.6) + span([132, 188], [-10, 204], 8, 2.6);
    s += `<rect x="165" y="228" width="10" height="16" rx="1" style="fill:#f4f4ef;stroke:#8d8d86;stroke-width:.8"/>`;
    return { svg: s, marks: [[1, 232, 172], [2, 236, 110], [3, 104, 82], [4, 494, 230], [5, 262, 226]] };
  }

  /* ---------- 9. 接戶線與電表 ---------- */
  function service() {
    let s = backdrop(300, { hills: false }) + street(300);
    const P = dpole(64, 306, 212);
    s += P.svg + `<rect x="68" y="144" width="8" height="4" ${fill('var(--art-steel)')}/>`;
    P.pts.forEach(p => { s += span([-10, p[1] + 3], p, 2) + span(p, [650, p[1] + 6], 6); });
    s += span([-10, 152], [72, 146], 4, 2.8);
    // 透天厝
    const HX = 240, HW = 160;
    s += `<rect x="${HX - 4}" y="156" width="${HW + 8}" height="7" ${fill('var(--art-bldg-2)')}/><rect x="${HX}" y="162" width="${HW}" height="138" ${fill('var(--art-bldg-3)')}/>` + ln(`M${HX + 42} 163V300`, 'var(--art-bldg-2)', 1.5);
    [172, 218].forEach(y => { s += `<rect x="${HX + 52}" y="${y}" width="${HW - 62}" height="26" ${fill('var(--art-win)')}/>` + ln(`M${HX + 48} ${y + 31}H${HX + HW - 6}`, 'var(--art-bldg-2)', 3); });
    s += `<rect x="${HX + 50}" y="258" width="${HW - 58}" height="42" ${fill('var(--art-bldg-2)')}/>`;
    let d = '';
    for (let i = 1; i < 7; i++) d += `M${HX + 50} ${258 + i * 6}H${HX + HW - 8}`;
    s += ln(d, 'var(--art-bldg-3)', 0.8);
    // 接戶線、接戶點、進屋管、電表
    s += span([72, 148], [262, 184], 10, 2.4) + ln('M262 184Q270 192 262 199', 'var(--art-wire)', 2.4);
    s += `<circle cx="262" cy="184" r="3.4" ${fill('var(--art-insul)')}/><rect x="259" y="198" width="6" height="34" ${fill('var(--art-metal)')}/>` + ln('M258 199Q262 193 266 199', 'var(--art-steel)', 2.5);
    s += `<rect x="246" y="232" width="32" height="40" rx="2" style="fill:#dfe2de;stroke:#9aa0a6;stroke-width:1"/><rect x="251" y="237" width="22" height="29" rx="2" ${fill('#f6f6f2')}/><rect x="254" y="241" width="16" height="7" ${fill('#2f5d4a')}/><circle cx="267" cy="254" r="1.4" ${fill('#d0312d')}/><text x="258" y="262" class="ga-tiny">kWh</text>`;
    s += `<rect x="259" y="272" width="6" height="12" ${fill('var(--art-metal)')}/><circle cx="262" cy="287" r="4" ${fill('#4a4a4a')}/>`;
    // 小圖：公寓大樓的集中電表箱
    s += `<rect x="430" y="112" width="196" height="190" rx="10" style="fill:var(--art-bldg-2);stroke:var(--art-steel);stroke-width:1.5"/><text x="520" y="133" text-anchor="middle" class="ga-cap">公寓大樓的集中電表箱</text><rect x="440" y="142" width="176" height="150" rx="4" ${fill('#d9dcd7')}/>`;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      const x = 448 + c * 33, y = 150 + r * 46;
      s += `<rect x="${x}" y="${y}" width="26" height="31" rx="2" style="fill:#f6f6f2;stroke:#a3a8ad;stroke-width:.8"/><rect x="${x + 4}" y="${y + 4}" width="18" height="6" ${fill('#2f5d4a')}/><text x="${x + 13}" y="${y + 41}" text-anchor="middle" class="ga-tiny">${r + 2}F-${c + 1}</text>`;
    }
    return { svg: s, marks: [[1, 166, 156], [2, 246, 164], [3, 298, 250], [4, 226, 282], [5, 612, 130]] };
  }

  /* ---------- 10. 你家的分電盤 ---------- */
  function panel() {
    let s = DEFS + `<rect width="${W}" height="${H}" ${fill('var(--art-wall)')}/><rect y="326" width="${W}" height="34" ${fill('var(--art-floor)')}/>` + ln('M0 326H640', 'var(--art-bldg-2)', 4);
    s += `<rect x="297" y="0" width="16" height="52" ${fill('var(--art-metal)')}/><rect x="295" y="20" width="20" height="6" ${fill('var(--art-steel)')}/>`;
    s += `<path d="M180 50L110 70V292L180 312Z" style="fill:#d3d8d3;stroke:#9aa29c;stroke-width:1.5"/><path d="M122 104L168 94V190L122 200Z" ${fill('#ffffff')}/>`;
    let d = 'M127 110L163 102';
    for (let i = 0; i < 6; i++) d += `M127 ${123 + i * 12}L${i % 2 ? 158 : 163} ${r1(115 + i * 12 - (i % 2 ? 1 : 0))}`;
    s += ln(d, '#8f969a', 1.4);
    s += `<rect x="180" y="50" width="250" height="262" rx="6" style="fill:#c7ccc7;stroke:#9aa29c;stroke-width:1.5"/><rect x="192" y="62" width="226" height="238" rx="3" ${fill('#e6e9e5')}/>`;
    s += `<rect x="270" y="74" width="70" height="50" rx="4" style="fill:#f7f7f2;stroke:#9aa29c;stroke-width:1"/><rect x="287" y="86" width="14" height="26" rx="2" ${fill('#2b2b2b')}/><rect x="309" y="86" width="14" height="26" rx="2" ${fill('#2b2b2b')}/><rect x="285" y="96" width="40" height="4" ${fill('#2b2b2b')}/><text x="305" y="138" text-anchor="middle" class="ga-sign">總開關 2P 50A</text>`;
    const mod = (x, y, name, rating, o = {}) => {
      let m = `<rect x="${x}" y="${y}" width="48" height="42" rx="3" style="fill:${o.elcb ? '#e2ebf1' : '#f7f7f2'};stroke:#9aa29c;stroke-width:1"/>`;
      if (o.spare) m += `<text x="${x + 24}" y="${y + 25}" text-anchor="middle" class="ga-tiny">預備</text>`;
      else if (o.p2) m += `<rect x="${x + 11}" y="${y + 10}" width="10" height="22" rx="2" ${fill('#2b2b2b')}/><rect x="${x + 27}" y="${y + 10}" width="10" height="22" rx="2" ${fill('#2b2b2b')}/><rect x="${x + 10}" y="${y + 19}" width="28" height="3" ${fill('#2b2b2b')}/>`;
      else m += `<rect x="${x + 18}" y="${y + 10}" width="12" height="22" rx="2" ${fill('#2b2b2b')}/>`;
      if (o.elcb) m += `<circle cx="${x + 40}" cy="${y + 7}" r="3.6" style="fill:#f2b705;stroke:#9a7a00;stroke-width:1"/>`;
      if (!o.spare) m += `<text x="${x + 24}" y="${y + 54}" text-anchor="middle" class="ga-tiny">${name}</text><text x="${x + 24}" y="${y + 65}" text-anchor="middle" class="ga-tiny">${rating}</text>`;
      return m;
    };
    s += mod(200, 150, '客廳插座', '20A') + mod(254, 150, '臥室插座', '20A') + mod(308, 150, '照明', '15A') + mod(362, 150, '廚房插座', '20A', { elcb: true });
    s += mod(200, 226, '浴室插座', '20A', { elcb: true }) + mod(254, 226, '電熱水器', '2P 30A', { elcb: true, p2: true }) + mod(308, 226, '', '', { spare: true }) + mod(362, 226, '冷氣', '2P 20A', { p2: true });
    const lead = (x1, y1, x2, y2) => ln(`M${x1} ${y1}L${x2} ${y2}`, 'var(--art-ink)', 1.2) + `<circle cx="${x2}" cy="${y2}" r="2.5" ${fill('var(--art-ink)')}/>`;
    s += lead(459, 100, 340, 99) + lead(459, 164, 402, 157) + lead(459, 246, 392, 247) + lead(95, 150, 124, 150);
    return { svg: s, marks: [[1, 470, 100], [2, 470, 164], [3, 470, 246], [4, 84, 150], [5, 334, 26]] };
  }

  const stations = [
    {
      name: '發電廠', volt: '約 1～2 萬 V', art: plant,
      text: '火力、核能、水力、風力、太陽光電等，把各種能量變成電。圖中是火力電廠：燒燃料產生蒸汽、推動汽輪機，帶動發電機發電。電不容易大量儲存，所以發電量要隨時跟著用電量調整，這叫電力調度。',
      alt: '火力發電廠：左邊的汽機房剖開，可以看到汽輪機和發電機；中間是鍋爐房，右邊是紅白相間的煙囪和圓頂煤倉。',
      spots: [
        ['鍋爐', '燒煤或天然氣，把水加熱成高溫高壓的蒸汽。'],
        ['汽輪機', '蒸汽吹動一層層葉片，讓轉軸高速旋轉（常見每分鐘 3600 轉，剛好對應 60Hz）。'],
        ['發電機', '和汽輪機接在同一根軸上，轉起來就發出交流電，出口電壓大約一萬多到兩萬多伏特。'],
        ['煙囪', '排出燃燒後的廢氣，排放前會先經過除塵、脫硫等設備處理。紅白相間是為了讓飛機看得見。'],
        ['燃料倉', '燃煤電廠用大型圓頂煤倉存煤；燃氣電廠則用管線送來天然氣。'],
      ],
    },
    {
      name: '升壓變電所', volt: '升到 161／345kV', art: stepup,
      text: '就蓋在電廠旁邊，用升壓變壓器把發電機的電升高到 161kV 或 345kV，準備長距離輸送。為什麼要升壓？下一課會用實驗告訴你。',
      alt: '電廠旁的升壓變電所：前面是大型主變壓器，後面是鐵構架、斷路器和往外送電的導線，前方有圍籬和高壓危險標誌。',
      spots: [
        ['主變壓器', '把發電機出來的一兩萬伏特升到 161kV 或 345kV，一台可能比一輛卡車還大。'],
        ['套管', '高壓電要從變壓器裡面接出來，得穿過外殼，靠這些一節一節的絕緣套管隔開。'],
        ['散熱器', '變壓器運轉會發熱，裡面的絕緣油流過這些散熱片降溫。'],
        ['斷路器', '發生故障時把電切斷，就像家裡無熔絲開關的超大版。'],
        ['鐵構架與礙子', '撐起導線；礙子讓帶電的導線和鐵架之間絕緣。'],
        ['出線', '接上輸電鐵塔，把電送出去。'],
      ],
    },
    {
      name: '超高壓輸電', volt: '345kV', art: transmission,
      text: '高大的鐵塔（有些路段改走地下電纜）跨縣市把電送到全台各地。電壓越高，同樣的電力所需的電流越小，線路發熱損失就越少。',
      alt: '一整排超高壓輸電鐵塔越過山丘，每座鐵塔兩側各有三支橫擔，掛著長長的礙子串和成對的導線，塔腳旁的汽車顯得很小。',
      spots: [
        ['鐵塔', '用鋼材組成，常見有幾十公尺高，把導線架在高處，遠離地面和建物。和塔腳旁的汽車比比看。'],
        ['礙子串', '一片片絕緣礙子串成一長串。電壓越高，礙子串通常越長，可以用來分辨線路電壓的高低。'],
        ['分裂導線', '超高壓線路的每一相，常用好幾條導線並成一組，可以減少電暈放電造成的損失和雜音。'],
        ['架空地線', '最上面比較細的線不帶電，用來擋雷擊，保護下面的導線；有的裡面還包著通訊用的光纖。'],
        ['航空警示球', '掛在跨越山谷或靠近機場的線上，提醒飛機注意電線。'],
      ],
    },
    {
      name: '超高壓變電所', volt: '345→161kV', art: ehv,
      text: '台電稱為 E/S。把 345kV 降成 161kV，再分送到各區域。戶外型的佔地很大，多半蓋在郊區。',
      alt: '超高壓變電所：左邊的 345kV 鐵塔把電送進開關場，中間是巨大的變壓器，右邊的 161kV 線路把電送出去，地上鋪滿碎石。',
      spots: [
        ['345kV 進線', '超高壓輸電線從這裡進入變電所。'],
        ['開關場', '一排排的斷路器、隔離開關和鐵構架，負責切換線路、隔離故障。'],
        ['超高壓變壓器', '把 345kV 降成 161kV。這麼大的變壓器，運送時要用特殊的拖車。'],
        ['161kV 出線', '降壓後的電，從這裡送往各地的一次變電所。'],
        ['碎石地面', '可以排水、防止雜草，也讓地表電阻變大，萬一發生故障可以降低人員觸電的危險。'],
      ],
    },
    {
      name: '一次變電所', volt: '161→69kV', art: primary,
      text: '台電稱為 P/S。把 161kV 降到 69kV。另外也有「一次配電變電所」（D/S），直接把 161kV 降到 22.8kV 或 11.4kV。',
      alt: '一次變電所：161kV 鐵塔把電送進來，經過主變壓器降壓，接到旁邊的開關室，再由鋼管桿把 69kV 送出去。',
      spots: [
        ['161kV 進線', '從超高壓變電所送來的 161kV。'],
        ['主變壓器', '把 161kV 降成 69kV。'],
        ['開關室', '有些開關設備蓋在屋內，比較不佔地，也不怕風吹日曬。'],
        ['69kV 出線', '69kV 線路常用較矮的鐵塔或鋼管桿，礙子也比 161kV 的短。'],
      ],
    },
    {
      name: '二次變電所', volt: '69→22.8kV', art: secondary,
      text: '台電稱為 S/S。把 69kV 降到 22.8kV 或 11.4kV 的配電電壓，準備送進市區和社區。都市裡的變電所常蓋在建築物裡，外觀和一般大樓差不多。',
      alt: '都市裡的屋內型變電所：外觀像一般大樓；右半邊剖開，可以看到控制室、氣體絕緣開關、配電盤和主變壓器，電纜從地下管路進出。',
      spots: [
        ['變電所建築', '外觀像一般大樓，門口有變電所的名牌和警告標示，閒雜人等不能進入。'],
        ['氣體絕緣開關（GIS）', '把開關封在充滿絕緣氣體（常用六氟化硫 SF6）的金屬筒裡，比戶外開關場省下很多空間。'],
        ['主變壓器', '把 69kV 降成 22.8kV 或 11.4kV。外牆的百葉窗用來通風散熱。'],
        ['配電盤', '22.8kV 的電在這裡分成好幾條「饋線」，每一條都有自己的斷路器。'],
        ['地下管路', '69kV 的電纜從地下送進來，22.8kV 的電纜再從馬路底下的管路送往各個社區。'],
      ],
    },
    {
      name: '配電線路', volt: '22.8／11.4kV', art: distribution,
      text: '沿著電線桿或地下管路，把電送到每條街、每個社區。電線桿上由上往下，依序是高壓線、低壓線，最下面通常是電信和有線電視的纜線。',
      alt: '街道旁的水泥電桿：最上面三條是高壓配電線，中間是低壓線，最下面是電信纜線；馬路上有人孔蓋。',
      spots: [
        ['高壓配電線', '最上面的三條，電壓 22.8kV 或 11.4kV。放風箏、釣魚竿、長竿子都要遠離。'],
        ['礙子', '把導線固定在橫擔上並絕緣。配電電壓比輸電低，礙子小很多。'],
        ['低壓線', '110／220V，從變壓器接出來，再分接到各戶。'],
        ['電信與有線電視纜線', '通常掛在最下面，不是電力線。'],
        ['電桿號碼牌', '每支電桿都有編號。看到電線掉落或停電，打台電客服 1911 報修時，可以告訴他們這個號碼。'],
        ['人孔蓋', '市區很多配電線改走地下。蓋子上寫著「電力」或台電字樣的，底下多半是電力電纜。'],
      ],
    },
    {
      name: '配電變壓器', volt: '→ 110／220V', art: xfScene,
      text: '電線桿上的「桿上變壓器」或路邊綠色箱子的「亭置式變壓器」，把電降到家用的 110／220V 單相三線。',
      alt: '左邊電線桿上掛著兩個灰色的桿上變壓器，上方有熔絲鏈開關和避雷器；右邊人行道上有綠色的亭置式變壓器。',
      spots: [
        ['桿上變壓器', '電線桿上的灰色桶子，把 22.8kV 或 11.4kV 降成 110／220V。有時一個，有時幾個一組。'],
        ['熔絲鏈開關', '變壓器的保險絲。變壓器或下游故障時會熔斷，把它和高壓線路隔開。'],
        ['避雷器', '打雷時把突波引到大地，保護變壓器。'],
        ['亭置式變壓器', '人行道上的綠色箱子，功能和桿上變壓器一樣，只是放在地面、電纜走地下。不要攀爬，也不要在旁邊堆東西。'],
        ['低壓線', '降壓後的 110／220V，從這裡接到附近的住戶。'],
      ],
    },
    {
      name: '接戶線與電表', volt: '110／220V', art: service,
      text: '低壓線經由接戶線接到你家，再經過電表計算用了幾度電。接戶線和電表屬於台電；進屋線和屋內線路屬於用戶，要由合格的電器承裝業施工。',
      alt: '電線桿拉出一條接戶線到透天厝的牆上，沿著管子往下接到一樓的電表；右邊小圖是公寓大樓集中在一起的電表箱。',
      spots: [
        ['接戶線', '從電桿的低壓線拉到你家的線。'],
        ['接戶點', '接戶線固定在建築物上的地方。線會先往下彎一段再進管子，防止雨水順著線流進去。'],
        ['電表', '計算用了幾度電。新式的智慧電表有液晶螢幕，可以遠端讀表。'],
        ['進屋線', '從接戶點進到屋內、接到總開關的這段線，中間會經過電表。'],
        ['集中電表箱', '公寓大樓通常把每一戶的電表集中裝在一樓或地下室，上面標著樓層和門牌。'],
      ],
    },
    {
      name: '你家的分電盤', volt: '總開關→各分路', art: panel,
      text: '電表之後是用戶自己的「屋內線路」：總開關、各分路、插座與燈具。這一段正是室內配線技術士負責施工的範圍。',
      alt: '打開門的住家分電盤：上方是總開關，下面兩排是各分路的斷路器，有黃色測試按鈕的是漏電斷路器，門內側貼著分路表。',
      spots: [
        ['總開關', '整間房子的電都經過它。檢修時先把它關掉，但要記得：總開關的電源側（進線那一端）仍然有電。'],
        ['漏電斷路器', '有黃色測試按鈕，偵測到漏電就跳脫。浴室插座、陽台插座、廚房水槽 1.8 公尺內的插座和電熱水器的分路，規則都要求裝設（熱水器本身已內建的除外）。'],
        ['分路斷路器', '每一路各自保護，一路跳脫，其他分路照常有電。'],
        ['分路表', '門內側貼著每一路的名稱，跳電時才知道是哪一路。'],
        ['進屋線', '從電表接進來，接到總開關的電源側。'],
      ],
    },
  ];

  return { stations, W, H };
})();
