'use strict';
/* 首頁（配電盤）、進度與路由 */
const CHAPTERS = [
  { id: 'basics', no: 1, name: '電的基礎', sub: '電壓、電流、電阻、功率，還有電為什麼危險', rating: '15A', desc: '用水管比喻看懂電，拉滑桿體會歐姆定律與過載。' },
  { id: 'gear', no: 2, name: '器材與安全', sub: '斷路器、電線顏色、開關、燈座插座與安全作業', rating: '20A', desc: '認識分電盤、線色規定、三路四路開關與停電作業順序。' },
  { id: 'wiring', no: 3, name: '配線工坊', sub: '七個關卡：從一燈一開關到三路、四路開關與 220V', rating: '20A', desc: '在配線板上親手拉線、送電測試，系統會逐一檢查每種開關組合。' },
  { id: 'box', no: 4, name: '電箱工坊', sub: '組裝端子台，把三相四線 220/380V 接進電箱', rating: '30A', desc: '端子台組裝、三相進線、馬達正反轉與單相分路的負載平衡。' },
  { id: 'meter', no: 5, name: '三用電表', sub: '選檔位、讀刻度、零歐姆調整，量電壓與電阻', rating: '20A', desc: '操作指針式三用電表，練到會讀刻度、不打表、不燒保險絲。' },
  { id: 'fault', no: 6, name: '故障偵探', sub: '用電表、絕緣電阻計、檢電起子與鉤表找出故障', rating: '30A', desc: '接客戶報修，量測後判斷是斷路、短路還是漏電。' },
  { id: 'plan', no: 7, name: '居家用電規劃', sub: '生活中的串聯並聯、電盤能帶多少電器、銅線怎麼選', rating: '30A', desc: '把電器分配到各分路不跳電，替每條迴路選對線徑與斷路器。' },
  { id: 'exam', no: 8, name: '學科模擬考', sub: '題庫隨機出題，80 分以上代表準備好了', rating: '30A', desc: '電學、法規、三相、電表、查修、用電規劃與共同科目綜合模擬。' },
];

function chapterProgress(id) {
  switch (id) {
    case 'basics': case 'gear': case 'plan': return Lessons.progress(id);
    case 'wiring': return Wiring.progress();
    case 'box': return BoxShop.progress();
    case 'meter': return MeterLab.progress();
    case 'fault': return Fault.progress();
    case 'exam': return Exam.progress();
  }
  return 0;
}
function overallProgress() {
  return CHAPTERS.reduce((s, c) => s + chapterProgress(c.id), 0) / CHAPTERS.length;
}
function updateOverall() {
  const p = Math.round(overallProgress() * 100);
  const box = document.getElementById('overall');
  box.querySelector('i').style.width = p + '%';
  box.querySelector('.num').textContent = p + '%';
}

function breakerCard(c) {
  const p = chapterProgress(c.id);
  const on = p >= 1;
  return h('a', { class: 'breaker' + (on ? ' on' : ''), href: '#' + c.id, 'aria-label': `迴路 ${c.no} ${c.name}，${on ? '已通電' : '進度 ' + Math.round(p * 100) + '%'}` },
    h('div', { class: 'b-top' }, h('span', {}, '迴路 ' + String(c.no).padStart(2, '0')), h('span', {}, 'NFB ' + c.rating)),
    h('div', { class: 'b-name' }, c.name),
    h('div', { class: 'b-desc' }, c.desc),
    h('div', { class: 'b-foot' },
      h('div', { class: 'b-handle-wrap' }, h('span', { class: 'b-slot' }, h('span', { class: 'b-handle' })), h('span', { class: 'b-state' }, on ? 'ON' : 'OFF')),
      h('div', { style: { flex: '1', display: 'grid', gap: '4px', maxWidth: '120px' } },
        h('span', { class: 'b-prog' }, h('i', { style: { width: Math.round(p * 100) + '%' } })),
        h('span', { style: { fontSize: '12px', color: '#56615B', textAlign: 'right' }, class: 'num' }, Math.round(p * 100) + '%')),
    ),
  );
}

function renderHome(root) {
  const pct = Math.round(overallProgress() * 100);
  const next = CHAPTERS.find(c => chapterProgress(c.id) < 1);
  root.append(
    h('section', { class: 'hero' },
      h('h1', {}, '配線道場', h('span', { class: 'spec' }, '室內配線丙級')),
      h('p', {}, '給完全沒有電學背景的人。八個迴路依序通電：先懂電，再認器材，接著親手配線、組裝三相電箱、操作三用電表、查出故障、規劃居家用電，最後用模擬考檢驗自己。每完成一章，那一路的開關就會切到 ON。'),
    ),
    h('section', { class: 'enclosure', 'aria-label': '學習進度配電盤' },
      h('div', { class: 'enclosure-plate' }, '1φ3W 110/220V · 學習分電盤'),
      h('div', { class: 'panel-grid' },
        h('a', { class: 'breaker main' + (pct >= 100 ? ' on' : ''), href: next ? '#' + next.id : '#exam', 'aria-label': `總開關，總進度 ${pct}%` },
          h('div', { class: 'b-handle-wrap' }, h('span', { class: 'b-slot' }, h('span', { class: 'b-handle' })), h('span', { class: 'b-state' }, pct >= 100 ? 'ON' : 'OFF')),
          h('div', { class: 'main-body' },
            h('div', { class: 'b-top' }, h('span', {}, '總開關'), h('span', {}, 'ELCB 30mA')),
            h('div', { class: 'main-row' },
              h('span', { class: 'main-pct' }, pct + '%'),
              h('span', { class: 'b-desc' }, next ? `下一步：迴路 ${String(next.no).padStart(2, '0')}「${next.name}」` : '八個迴路全部通電。可以去報名考試了，考前再多做幾次模擬考。')),
          ),
        ),
        h('div', { class: 'branches' }, CHAPTERS.map(breakerCard)),
      ),
    ),
    h('section', { class: 'home-lower' },
      h('div', { class: 'card' },
        h('h2', {}, '關於室內配線丙級檢定'),
        h('dl', { class: 'exam-facts' },
          h('dt', {}, '分成學科與術科'), h('dd', {}, '兩者都及格才能取得技術士證。學科通過後，術科要在規定時間內實際完成配線。'),
          h('dt', {}, '學科'), h('dd', {}, '選擇題，包含本職類的電學、法規、儀表與施工知識，以及共同科目（職業安全衛生、工作倫理、環境保護、節能減碳）。滿分 100，60 分及格。'),
          h('dt', {}, '術科'), h('dd', {}, '依公告的試題圖，在配線板上完成器具裝置、配管與配線，接線要符合規定並通過檢查與通電測試。這裡的「配線工坊」練的就是看懂線路、接對、接安全。'),
          h('dt', {}, '以官方公告為準'), h('dd', {}, '報名時間、試題內容與評審標準會更新，請以勞動部勞動力發展署技能檢定中心公告的最新資料為準。術科的實際手作（剝線、壓接、彎管）一定要找實體器材或職訓課程練習。'),
        ),
      ),
      h('div', { class: 'card' },
        h('h2', {}, '怎麼用這個道場'),
        h('ol', { class: 'route-list' },
          h('li', {}, h('b', {}, '照順序走'), '：後面的章節會用到前面的觀念。'),
          h('li', {}, h('b', {}, '每天一小段'), '：一個迴路大約 20–40 分鐘。'),
          h('li', {}, h('b', {}, '配線關卡拿三顆星'), '：第一顆是功能，第二、三顆是安全與規範，考試兩者都看。'),
          h('li', {}, h('b', {}, '故障偵探多玩幾次'), '：每次案件隨機，練到能用 6 次以內量到答案。'),
          h('li', {}, h('b', {}, '模擬考反覆做'), '：穩定 80 分以上再去考。'),
        ),
        h('p', { class: 'small muted', style: { marginTop: '12px' } }, '進度存在這個瀏覽器裡。換電腦或清除瀏覽資料會重新開始。'),
      ),
    ),
  );
}

const ROUTES = {
  home: renderHome,
  basics: root => Lessons.render(root, 'basics'),
  gear: root => Lessons.render(root, 'gear'),
  wiring: root => Wiring.render(root),
  box: root => BoxShop.render(root),
  meter: root => MeterLab.render(root),
  fault: root => Fault.render(root),
  plan: root => Lessons.render(root, 'plan'),
  exam: root => Exam.render(root),
};

function route() {
  const id = (location.hash || '#home').slice(1);
  const fn = ROUTES[id] || ROUTES.home;
  Page.leave();
  const view = document.getElementById('view');
  view.replaceChildren();
  fn(view);
  const ch = CHAPTERS.find(c => c.id === id);
  document.title = ch ? `${ch.name} · 配線道場` : '配線道場';
  window.scrollTo(0, 0);
  updateOverall();
}
window.addEventListener('hashchange', route);
route();
