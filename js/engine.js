'use strict';
/* 電路求解器
   元件格式 {a, b, R}：R = 0 為理想導線（直接合併節點），R > 0 為電阻，R = Infinity 視為斷開。
   fixed = { 節點: 電壓 } 為電源固定電位。交流以同相位的有效值計算（純電阻負載下結果一致）。 */
const Circuit = (() => {
  const LEAK = 1e-11; // 每個浮接節點對地的微小電導，避免矩陣奇異

  function makeUF() {
    const p = new Map();
    const find = (x) => {
      if (!p.has(x)) p.set(x, x);
      let r = x;
      while (p.get(r) !== r) r = p.get(r);
      let c = x;
      while (p.get(c) !== r) { const n = p.get(c); p.set(c, r); c = n; }
      return r;
    };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) p.set(ra, rb); };
    return { find, union };
  }

  function gauss(A, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (piv !== c) { [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]; }
      const d = A[c][c];
      if (Math.abs(d) < 1e-300) continue;
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / d;
        if (f === 0) continue;
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r];
      for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
      x[r] = Math.abs(A[r][r]) < 1e-300 ? 0 : s / A[r][r];
    }
    return x;
  }

  function solve(elems, fixed) {
    const uf = makeUF();
    const nodes = new Set();
    for (const e of elems) { nodes.add(e.a); nodes.add(e.b); }
    for (const n of Object.keys(fixed)) nodes.add(n);
    for (const e of elems) if (e.R === 0) uf.union(e.a, e.b);

    const fixedByRoot = new Map();
    for (const [n, v] of Object.entries(fixed)) {
      const r = uf.find(n);
      const prev = fixedByRoot.get(r);
      if (prev && Math.abs(prev.v - v) > 1e-9) {
        return { short: true, a: prev.n, b: n, same: (x, y) => uf.find(x) === uf.find(y) };
      }
      fixedByRoot.set(r, { n, v });
    }

    const roots = [...new Set([...nodes].map(n => uf.find(n)))];
    const unk = roots.filter(r => !fixedByRoot.has(r));
    const idx = new Map(unk.map((r, i) => [r, i]));
    const N = unk.length;
    const G = Array.from({ length: N }, () => new Float64Array(N));
    const I = new Float64Array(N);
    for (let i = 0; i < N; i++) G[i][i] += LEAK;

    for (const e of elems) {
      if (!(e.R > 0) || !isFinite(e.R)) continue;
      const ra = uf.find(e.a), rb = uf.find(e.b);
      if (ra === rb) continue;
      const g = 1 / e.R;
      const ia = idx.get(ra), ib = idx.get(rb);
      if (ia !== undefined) {
        G[ia][ia] += g;
        if (ib !== undefined) G[ia][ib] -= g; else I[ia] += g * fixedByRoot.get(rb).v;
      }
      if (ib !== undefined) {
        G[ib][ib] += g;
        if (ia !== undefined) G[ib][ia] -= g; else I[ib] += g * fixedByRoot.get(ra).v;
      }
    }

    const x = N ? gauss(G, I) : [];
    const Vroot = new Map();
    fixedByRoot.forEach((o, r) => Vroot.set(r, o.v));
    unk.forEach((r, i) => Vroot.set(r, x[i]));
    const V = (n) => { const r = uf.find(n); return Vroot.has(r) ? Vroot.get(r) : 0; };
    const same = (a, b) => uf.find(a) === uf.find(b);
    const current = (e) => (e.R > 0 && isFinite(e.R)) ? (V(e.a) - V(e.b)) / e.R : 0;
    return { short: false, V, same, current };
  }

  /* 兩點間等效電阻（斷電狀態，用 1V 測試電壓） */
  function resistance(elems, a, b) {
    if (a === b) return 0;
    const s = solve(elems, { [a]: 1, [b]: 0 });
    if (s.short) return 0;
    let i = 0;
    for (const e of elems) {
      if (!(e.R > 0) || !isFinite(e.R)) continue;
      const inA = s.same(e.a, a), inB = s.same(e.b, a);
      if (inA && !inB) i += (1 - s.V(e.b)) / e.R;
      else if (inB && !inA) i += (1 - s.V(e.a)) / e.R;
    }
    return i < 2e-10 ? Infinity : 1 / i;
  }

  return { solve, resistance };
})();
