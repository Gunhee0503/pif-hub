/* PIF 자기주도 학습 — 교재 로드맵 · 독해 과제 검사 기준 · 어휘 정리 노트 작성법
   랜딩(/)과 학생 홈(/learn/)이 같이 씀.  window.PIFSS.roadmap(el) / grades(el, {full}) / note(el) / modal() */
(function () {
  var B = '/assets/books/';
  var STEPS = [
    { c: '#ef8fb4', short: '중등 BASIC', wm: { img: 'wm1', name: '중등 BASIC', n: 22, lv: 'M 기본 · 명사, 형용사 중심', words: 'cloudy · family · gentleman · understand · vacation' },
      rd: { series: '리딩스마트', imgs: ['rd1a', 'rd1b'], name: '리딩스마트 L1 · L2', sub: '독해 입문 단계', desc: '기초 어휘로 시작하는 첫 독해와 문장 구조 익히기' } },
    { c: '#5fc3a6', short: '중등 실력', wm: { img: 'wm2', name: '중등 실력', n: 22, lv: 'M 중급 · 명사, 형용사 중심', words: 'annoyed · ashamed · attractive · mercury · dizzy' },
      rd: { series: '리딩스마트', imgs: ['rd2a', 'rd2b'], name: '리딩스마트 L3 · L4', sub: '중등 독해 실전', desc: '다양한 글 유형과 함께 중등 독해 마무리 단계까지 학습' } },
    { c: '#6aa6dc', short: '중등 고난도', wm: { img: 'wm3', name: '중등 고난도', n: 22, lv: 'H 기초 · 형용사, 동사', words: 'enormous · superior · spread · mature · cooperate' },
      rd: { series: '해커스 Reading Path', imgs: ['rd3a', 'rd3b'], name: 'Reading Path L1 · L2', sub: '고등 진입 독해', desc: '구문 분석 입문 · 문단 구조 이해와 함께 고등 진입 시작' } },
    { c: '#f2c230', short: '고등 BASIC', wm: { img: 'wm4', name: '고등 BASIC', n: 23, lv: 'H 기본 · 형용사, 동사', words: 'consume · adequate · interact · intelligent · immune' },
      rd: { series: '해커스 Reading Path', imgs: ['rd4a', 'rd4b'], name: 'Reading Path L3 · L4', sub: '고등 독해 기본', desc: '주제·요지 파악 · 고등 독해 진입 · 수능형 지문 학습' } },
    { c: '#f39a52', short: '수능 2000', wm: { img: 'wm5', name: '수능 2000', n: 22, lv: 'H 중급 · 형용사, 동사', words: 'permanent · dispersal · deliberate · maintain · tolerate' },
      mock: { compact: { img: 'mini1', name: '미니모의고사 기본' }, full: { imgs: ['sim1a', 'sim1b'], name: '씨뮬 고1 (기출 + 사설)' } } },
    { c: '#4f9e5d', short: '고등 Complete', wm: { img: 'wm6', name: '고등 Complete', n: 25, lv: 'H 중급 · 형용사, 동사', words: 'accompany · domesticate · perspective · thorough · sustain · conventional' },
      mock: { compact: { img: 'mini2', name: '미니모의고사 필수' }, full: { imgs: ['sim2a', 'sim2b'], name: '씨뮬 고2 (기출 + 사설)' } } },
    { c: '#2b2b2e', short: '고등 하이스트', wm: { img: 'wm7', name: '고등 하이스트', lv: 'H 중상급 · 형용사, 동사', words: 'underlie · reluctant · counterfeit · explicit · preoccupy · speculate' },
      mock: { compact: { img: 'mini3', name: '미니모의고사 완성' }, full: { imgs: ['sim3a', 'sim3b'], name: '씨뮬 고3 (기출 + 사설)' } } },
    { c: '#dc5050', short: 'EBS 파이널', wm: { img: 'wm8', name: 'EBS 파이널', lv: 'H 중상급 · 형용사, 동사', words: 'predominant · ingrained · deteriorate · polarize · contradict · obligate' },
      last: '어휘 마무리 집중 단계' }
  ];
  var GRADES = [
    { g: 'A+', grp: 'good', one: '해설지와 비교·점검하고, 문장 구조를 스스로 분석하고, 어휘를 지문의 뜻으로 정리',
      pts: ['문제풀이 후 <b>해설지를 참고</b>하여 <b>본인의 이해와 비교·점검</b>하며 <b>지문의 주제와 흐름을 이해</b>했다.',
        '모르는 문장은 그냥 넘어가지 않고 <b>문장 구조를 스스로 분석하며 고민</b>했다.',
        '어휘 정리노트에 <b>지문에서 사용된 의미(정의)와 예문을 정확하게 검색</b>하여 정리했다.'] },
    { g: 'B', grp: 'good', one: 'A+ 기준에 대부분 도달, 약간의 교정·보완만 하면 A+',
      pts: ['<b>A+ 기준에 대부분 도달했지만 일부 부족한 부분</b>이 있다.', '전반적으로 학습은 잘 이루어졌으며, <b>약간의 교정이나 보완</b>만 하면 A+ 수준이다.'] },
    { g: 'C', grp: 'fix', one: '채점까지만 — 고민·분석의 흔적, 해설지 학습이 부족',
      pts: ['문제를 풀고 <b>채점까지만</b> 했다.', '모르는 문장이나 단어에 대해 <b>깊이 고민하거나 분석한 흔적이 부족</b>하다.',
        '<b>해설지를 읽지 않았거나</b>, 읽더라도 자신의 것으로 이해하려는 과정이 부족하다.'] },
    { g: 'D', grp: 'fix', one: '문제만 간신히 풀고 채점조차 하지 않음', pts: ['문제만 간신히 풀었거나, <b>채점조차 하지 않았다</b>.'] },
    { g: 'F', grp: 'fix', one: '과제를 전혀 수행하지 않음', pts: ['과제를 전혀 수행하지 않았다.'] },
    { g: 'N/A', grp: 'na', one: '부득이한 사정으로 과제를 수행하지 못한 경우', pts: ['부득이한 사정으로 과제를 수행하지 못한 경우 (non applicable)'] }
  ];

  var CSS = `
.ss-rm *,.ss-gr *,.ss-nt *,.ss-sheet *{box-sizing:border-box}
.ss-rm h4,.ss-rm p,.ss-gr p,.ss-gr ul,.ss-nt p,.ss-sheet h3{margin:0}
.ss-rm{--sc:#ef8fb4}
.ss-phase{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;font-size:12.5px;font-weight:700;color:#86868b;letter-spacing:.02em}
.ss-phase span{border-bottom:1px solid #d2d2d7;padding-bottom:7px}
.ss-steps{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-bottom:18px}
.ss-st{position:relative;border:0;background:#fff;border-radius:16px;padding:10px 6px 10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:7px;font:inherit;color:#1d1d1f;box-shadow:0 0 0 1px #e5e5ea inset;transition:transform .15s,box-shadow .15s}
.ss-st:hover{transform:translateY(-2px)}
.ss-st .no{width:26px;height:26px;border-radius:50%;background:var(--c);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
.ss-st img{width:58%;max-width:62px;aspect-ratio:3/4;object-fit:cover;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.12)}
.ss-st small{font-size:11.5px;font-weight:650;line-height:1.25;text-align:center;word-break:keep-all;color:#6e6e73}
.ss-st.on{box-shadow:0 0 0 2.5px var(--c) inset;background:#fff}
.ss-st.on small{color:#1d1d1f}
.ss-panel{display:grid;grid-template-columns:1fr 1.25fr;gap:16px}
.ss-box{background:#fff;border-radius:24px;padding:24px 24px 22px;position:relative;overflow:hidden}
.ss-box::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--sc)}
.ss-box .k{font-size:12px;font-weight:700;letter-spacing:.1em;color:#86868b;margin-bottom:12px}
.ss-wm{display:flex;gap:18px;align-items:flex-start}
.ss-wm img{width:118px;flex-shrink:0;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.14)}
.ss-wm h4,.ss-rd h4{font-size:24px;font-weight:750;letter-spacing:-.03em;line-height:1.2}
.ss-wm h4 small{font-size:14px;color:#86868b;font-weight:600;margin-left:4px}
.ss-lv{display:inline-block;margin:8px 0 12px;font-size:13px;font-weight:700;color:var(--sc);filter:saturate(1.1) brightness(.85)}
.ss-words{background:#f5f5f7;border-radius:12px;padding:10px 12px;font-size:13px;color:#424245;line-height:1.55}
.ss-words b{display:block;font-size:10.5px;letter-spacing:.14em;color:#86868b;margin-bottom:3px}
.ss-words i{font-style:italic}
.ss-covers{display:flex;gap:10px;margin-bottom:14px}
.ss-covers img{height:150px;width:auto;max-width:48%;object-fit:contain;border-radius:5px;box-shadow:0 6px 18px rgba(0,0,0,.14)}
.ss-rd .sub{font-size:14px;font-weight:700;color:#1d1d1f;margin:6px 0 3px}
.ss-rd p{font-size:14.5px;color:#6e6e73;line-height:1.55}
.ss-tracks{display:grid;grid-template-columns:1fr 1.35fr;gap:12px}
.ss-tr{border-radius:16px;padding:12px 12px 14px;background:#f5f5f7}
.ss-tr .tl{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:#fff;border-radius:99px;padding:4px 9px;margin-bottom:10px}
.ss-tr.c .tl{background:#f39a52}.ss-tr.f .tl{background:#2e6b4f}
.ss-tr .cv{display:flex;gap:6px;margin-bottom:9px}
.ss-tr .cv img{height:112px;width:auto;max-width:100%;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.14)}
.ss-tr.f .cv img{max-width:48%}
.ss-tr b{display:block;font-size:14.5px;letter-spacing:-.02em}
.ss-tr span{display:block;font-size:12.5px;color:#6e6e73;margin-top:3px;line-height:1.45}
.ss-last{height:100%;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;color:#6e6e73}
.ss-last b{font-size:22px;color:#1d1d1f;letter-spacing:-.03em}
.ss-nav{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:13px;color:#86868b}
.ss-nav button{border:1px solid #d2d2d7;background:#fff;border-radius:99px;padding:8px 14px;font-weight:600;font-size:13px;font-family:inherit;color:#1d1d1f;cursor:pointer}
.ss-nav button:disabled{opacity:.35;cursor:default}
@media(max-width:860px){
  .ss-phase{display:none}
  .ss-steps{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 6px;margin:0 -2px 14px;scrollbar-width:none}
  .ss-steps::-webkit-scrollbar{display:none}
  .ss-st{flex:0 0 86px;scroll-snap-align:start}
  .ss-panel{grid-template-columns:1fr}
  .ss-wm img{width:96px}
  .ss-covers img{height:128px}
  .ss-tracks{grid-template-columns:1fr}
}
/* 검사 기준 */
.ss-gr .lead{font-size:15px;color:#424245;line-height:1.55;margin-bottom:16px}
.ss-gr .lead b{color:#d2416b}
.ss-lad{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.ss-g{background:#fff;border-radius:18px;padding:16px 14px 15px;position:relative;box-shadow:0 0 0 1px #ececf0 inset}
.ss-g .gg{font:italic 700 30px/1 Georgia,'Times New Roman',serif;letter-spacing:-.02em}
.ss-g.good .gg{color:#d2416b}.ss-g.fix .gg{color:#2b6cb0}.ss-g.na .gg{color:#7a4fa3;font-size:24px}
.ss-g .gp{font-size:10.5px;font-weight:800;letter-spacing:.1em;margin:8px 0 6px;color:#86868b}
.ss-g p{font-size:13px;color:#424245;line-height:1.5;word-break:keep-all}
.ss-g ul{list-style:none;margin:2px 0 0;padding:0}
.ss-g li{font-size:13px;color:#424245;line-height:1.5;padding-left:10px;position:relative;margin-top:4px;word-break:keep-all}
.ss-g li::before{content:"";position:absolute;left:0;top:.62em;width:4px;height:4px;border-radius:50%;background:#aeaeb2}
.ss-g li b{color:#1d1d1f;font-weight:700;box-shadow:inset 0 -6px 0 rgba(210,65,107,.16)}
.ss-gr.full .ss-lad{grid-template-columns:1fr 1fr}
.ss-gr.full .ss-g.good:first-child{grid-column:1/-1}
@media(max-width:860px){.ss-lad{grid-template-columns:repeat(2,1fr)}.ss-gr.full .ss-lad{grid-template-columns:1fr}}
/* 노트 작성법 */
.ss-nt .how{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.ss-nt .how div{background:#f5f5f7;border-radius:16px;padding:14px 16px;font-size:14px;line-height:1.55;color:#424245}
.ss-nt .how b{display:block;font-size:11px;letter-spacing:.12em;color:#86868b;margin-bottom:4px}
.ss-note{border:1.5px solid #1d1d1f;border-radius:14px;overflow:hidden;background:#fff;font-size:14px}
.ss-note .r{display:grid;grid-template-columns:110px 1fr;border-top:1px solid #d2d2d7}
.ss-note .r:first-child{border-top:0}
.ss-note .r>*{padding:10px 12px}
.ss-note .h{background:#f5f5f7;font-weight:700;font-size:12.5px;color:#6e6e73;display:flex;align-items:center;gap:6px}
.ss-note .h i{font-style:normal;width:19px;height:19px;border-radius:50%;background:#e8483f;color:#fff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.ss-note .v{color:#1d1d1f;line-height:1.5}
.ss-note .v em{font-style:normal;color:#86868b;font-size:12.5px;display:block;margin-top:2px}
.ss-tips{margin:12px 0 0;padding:0;list-style:none}
.ss-tips li{font-size:13.5px;color:#424245;line-height:1.55;padding-left:16px;position:relative;margin-top:5px}
.ss-tips li::before{content:"✓";position:absolute;left:0;color:#e8483f;font-weight:800}
.ss-tips b{color:#1d1d1f}
@media(max-width:700px){.ss-nt .how{grid-template-columns:1fr}.ss-note .r{grid-template-columns:86px 1fr}}
/* defy 연습 */
.ss-q{background:#fff;border-radius:20px;padding:20px 20px 18px;margin-top:16px;box-shadow:0 0 0 1px #ececf0 inset}
.ss-q .qk{font-size:11px;font-weight:800;letter-spacing:.12em;color:#e8483f;margin-bottom:8px}
.ss-q .en{font-size:17px;font-weight:600;letter-spacing:-.01em;line-height:1.45}
.ss-q .en u{text-decoration-thickness:2px;text-underline-offset:3px}
.ss-q .ko{font-size:13.5px;color:#86868b;margin:4px 0 14px}
.ss-q .ask{font-size:14px;font-weight:700;margin:14px 0 8px}
.ss-q .ask small{font-weight:500;color:#86868b}
.ss-opt{display:block;width:100%;text-align:left;border:1px solid #d2d2d7;background:#fff;border-radius:12px;padding:10px 12px;margin-top:7px;font:inherit;font-size:14px;line-height:1.45;color:#1d1d1f;cursor:pointer}
.ss-opt em{display:block;font-style:normal;color:#86868b;font-size:12.5px;margin-top:3px}
.ss-opt:hover{border-color:#86868b}
.ss-opt.ok{border-color:#2f9e5b;background:#effaf3;box-shadow:0 0 0 1px #2f9e5b inset}
.ss-opt.no{border-color:#e8483f;background:#fff4f3}
.ss-fb{font-size:13.5px;line-height:1.55;border-radius:12px;padding:10px 12px;margin-top:9px}
.ss-fb.ok{background:#effaf3;color:#1f6b3e}.ss-fb.no{background:#fff4f3;color:#a3322b}
/* 모달 (학생 홈) */
.ss-modal{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center;padding:0}
.ss-sheet{background:#f5f5f7;width:100%;max-width:860px;max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:22px 20px 34px;-webkit-overflow-scrolling:touch}
@media(min-width:760px){.ss-modal{align-items:center;padding:24px}.ss-sheet{border-radius:24px;max-height:88vh}}
.ss-sheet .hd{display:flex;align-items:center;gap:10px;margin-bottom:14px;position:sticky;top:-22px;background:#f5f5f7;padding:10px 0 8px;z-index:2}
.ss-sheet .hd h3{flex:1;font-size:21px;font-weight:750;letter-spacing:-.03em}
.ss-sheet .hd button{border:0;background:#e5e5ea;border-radius:99px;width:34px;height:34px;font-size:18px;cursor:pointer}
.ss-tabs{display:flex;gap:6px;margin-bottom:16px}
.ss-tabs button{white-space:nowrap;border:1px solid #d2d2d7;background:#fff;border-radius:99px;padding:8px 14px;font-weight:600;font-size:13.5px;font-family:inherit;color:#6e6e73;cursor:pointer}
.ss-tabs button.on{background:#1d1d1f;color:#fff;border-color:#1d1d1f}
.ss-sec h5{font-size:16px;font-weight:750;letter-spacing:-.02em;margin:4px 0 10px}
`;
  function css() { if (document.getElementById('ss-css')) return; var s = document.createElement('style'); s.id = 'ss-css'; s.textContent = CSS; document.head.appendChild(s); }
  function img(n, alt, cls) { return '<img src="' + B + n + '.webp" alt="' + alt + '" loading="lazy" decoding="async"' + (cls ? ' class="' + cls + '"' : '') + '>'; }

  function roadmap(el, opt) {
    css(); opt = opt || {};
    var cur = Math.max(0, Math.min(7, (opt.step || 1) - 1));
    el.classList.add('ss-rm');
    el.innerHTML = '<div class="ss-phase"><span>STEP 1–4 · 중등부 → 고등 진입</span><span>STEP 5–8 · 고등 본격 → 수능 마무리</span></div>' +
      '<div class="ss-steps" role="tablist">' + STEPS.map(function (s, i) {
        return '<button class="ss-st" role="tab" data-i="' + i + '" style="--c:' + s.c + '"><span class="no">' + (i + 1) + '</span>' + img(s.wm.img, 'Word Master ' + s.wm.name) + '<small>' + s.short + '</small></button>';
      }).join('') + '</div><div class="ss-panel" role="tabpanel"></div>' +
      '<div class="ss-nav"><button data-d="-1">‹ 이전 단계</button><span class="pos"></span><button data-d="1">다음 단계 ›</button></div>';
    var panel = el.querySelector('.ss-panel');
    function show(i, scroll) {
      cur = i; var s = STEPS[i];
      el.style.setProperty('--sc', s.c);
      el.querySelectorAll('.ss-st').forEach(function (b, j) { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', j === i); });
      var w = s.wm;
      var left = '<div class="ss-box"><div class="k">STEP ' + (i + 1) + ' · 어휘 · Word Master</div><div class="ss-wm">' + img(w.img, 'Word Master ' + w.name) +
        '<div><h4>' + w.name + (w.n ? '<small>[' + w.n + ']</small>' : '') + '</h4><div class="ss-lv">' + w.lv + '</div>' +
        '<div class="ss-words"><b>WORDS</b><i>' + w.words + '</i></div></div></div></div>';
      var right;
      if (s.rd) right = '<div class="ss-box ss-rd"><div class="k">독해 · ' + s.rd.series + '</div><div class="ss-covers">' +
        s.rd.imgs.map(function (n, k) { return img(n, s.rd.name + ' ' + (k + 1)); }).join('') + '</div><h4>' + s.rd.name + '</h4><div class="sub">' + s.rd.sub + '</div><p>' + s.rd.desc + '</p></div>';
      else if (s.mock) right = '<div class="ss-box"><div class="k">독해 · 모의고사 · 해커스 미니모의고사 / 씨뮬</div><div class="ss-tracks">' +
        '<div class="ss-tr c"><span class="tl">COMPACT TRACK</span><div class="cv">' + img(s.mock.compact.img, s.mock.compact.name) + '</div><b>' + s.mock.compact.name + '</b><span>시간 대비 효율 중심의 미니모의고사 학습</span></div>' +
        '<div class="ss-tr f"><span class="tl">FULL TRACK</span><div class="cv">' + s.mock.full.imgs.map(function (n, k) { return img(n, s.mock.full.name + ' ' + (k + 1)); }).join('') + '</div><b>' + s.mock.full.name + '</b><span>실전 감각과 체력을 완성하는 풀모의고사 학습</span></div></div></div>';
      else right = '<div class="ss-box"><div class="ss-last"><div class="k" style="margin:0">STEP 8 · 수능 마무리</div><b>' + s.last + '</b><span>독해·모의고사는 STEP 5~7 트랙으로 마무리하고,<br>EBS 파이널 어휘로 수능 직전까지 다집니다.</span></div></div>';
      panel.innerHTML = left + right;
      el.querySelector('.pos').textContent = 'STEP ' + (i + 1) + ' / 8';
      el.querySelector('[data-d="-1"]').disabled = i === 0; el.querySelector('[data-d="1"]').disabled = i === 7;
      if (scroll) { var b = el.querySelectorAll('.ss-st')[i]; if (b && b.scrollIntoView && getComputedStyle(el.querySelector('.ss-steps')).overflowX === 'auto') b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
    }
    el.querySelectorAll('.ss-st').forEach(function (b) { b.onclick = function () { show(+b.dataset.i, true); }; });
    el.querySelectorAll('.ss-nav button').forEach(function (b) { b.onclick = function () { show(Math.max(0, Math.min(7, cur + (+b.dataset.d))), true); }; });
    show(cur);
  }

  function grades(el, opt) {
    css(); opt = opt || {};
    el.classList.add('ss-gr'); if (opt.full) el.classList.add('full');
    el.innerHTML = '<p class="lead">※ 본 평가는 정답률이 아니라 <b>학습 과정(이해, 고민, 분석, 복습)</b>을 기준으로 평가합니다.</p><div class="ss-lad">' +
      GRADES.map(function (g) {
        var grp = g.grp === 'good' ? '과제 우수자' : g.grp === 'fix' ? '과제 보완 필요' : '예외';
        return '<div class="ss-g ' + g.grp + '"><div class="gg">' + g.g + '</div><div class="gp">' + grp + '</div>' +
          (opt.full ? '<ul>' + g.pts.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>' : '<p>' + g.one + '</p>') + '</div>';
      }).join('') + '</div>';
  }

  function note(el) {
    css();
    el.classList.add('ss-nt');
    el.innerHTML =
      '<div class="how"><div><b>1차 · 해설지로 확인</b>자기주도 독해에서 모르거나 헷갈리는 단어를 체크하고, <u>해설지를 보고 본인의 해석과 비교</u>하면서 단어의 의미를 확인합니다.</div>' +
      '<div><b>2차 · 사전으로 정리</b>의미를 좀 더 자세하게 정리하고 싶은 단어를 <u>사전으로 검색</u>해서 노트에 정리합니다.</div></div>' +
      '<div class="ss-note">' +
      '<div class="r"><div class="h"><i>1</i>단어</div><div class="v">defy</div></div>' +
      '<div class="r"><div class="h"><i>2</i>한글 뜻</div><div class="v">(노력·해결 따위를) 거부하다<em>지문에서 쓰인 뜻과 매칭되는 뜻</em></div></div>' +
      '<div class="r"><div class="h"><i>3</i>영영 정의</div><div class="v">to be impossible to believe, explain, describe, etc.<em>지문에서 쓰인 뜻과 매칭되는 영영 정의</em></div></div>' +
      '<div class="r"><div class="h"><i>4</i>예문</div><div class="v">The beauty of the scene defies description.<em>가능하면 영영사전 예문</em></div></div>' +
      '<div class="r"><div class="h"><i>5</i>해석</div><div class="v">그 풍경의 아름다움은 이루 다 말로 할 수 없다.<em>예문을 직접 해석해 보고 해설지 해석과 비교</em></div></div></div>' +
      '<ul class="ss-tips"><li><b>②한글 뜻과 ③영영 정의</b>는 사전의 첫 번째 뜻이 아니라, <b>지문에서 사용된 의미</b>와 맞는 것을 고릅니다.</li>' +
      '<li><b>④⑤ 예문은 가능한 한 영영사전</b>에서 — 원어민이 실제로 쓰는 문장이 많고, 우리말 해석이 따로 없어 스스로 고민하게 됩니다.</li>' +
      '<li>영한사전 예문은 최대한 쓰지 않기 — 원어민이 잘 쓰지 않는 예문인 경우가 종종 있어요.</li>' +
      '<li>영영 예문이 너무 어렵다면 <b>영한 1개 + 영영 1개</b>씩 정리해도 좋아요.</li></ul>' +
      '<div class="ss-q"><div class="qk">실전 연습 · 직접 골라 보세요</div>' +
      '<div class="en">UFO Report: No Sign Of Aliens, But 143 Mystery Objects <u>Defy</u> Explanation.</div>' +
      '<div class="ko">UFO 보고서: 외계인의 흔적은 없었다. 하지만 143개의 불가사의한 물체들은 설명을 할 수가 없다.</div>' +
      '<div class="ask">① 영한사전 — 밑줄 친 defy와 같은 의미는? <small>(우리말 해석으로 유추)</small></div><div data-q="ko"></div>' +
      '<div class="ask">② 영영사전 — 같은 의미의 정의와 예문은?</div><div data-q="en"></div></div>';
    var Q = {
      ko: { ans: 2, opts: [['…에게 공공연히 반항하다, 감히 도전하다', '~ an enemy 적에 도전하다'], ['…을 무시하다, 문제시하지 않다', '~ public opinion 여론을 무시하다'],
        ['[노력·해결 따위]를 거부[저지]하다, 물리치다', '~ (all) description 도저히 필설로 다할 수 없다 · The problem defies solution. 그 문제는 해결불능이다.'], ['(불가능한 일을 해보라고) [남]에게 대들다', '']],
        ok: '정답! "설명을 할 수가 없다" → 설명(해결)을 거부한다는 뜻이에요. 사전의 첫 번째 뜻이 아니라 지문의 뜻을 찾는 게 핵심!', no: '해석을 다시 보세요. "물체들이 설명을 할 수가 없다" — 무엇을 거부하고 있나요?' },
      en: { ans: 1, opts: [['to refuse to obey or show respect for sb in authority, a law, a rule, etc', "I wouldn't have dared to defy my teachers."],
        ['~ belief, explanation, description, etc. to be impossible to believe, explain, describe, etc', 'a political move that defies explanation · The beauty of the scene defies description.'],
        ['to successfully resist sb/sth to a very unusual degree', 'The baby boy defied all the odds and survived.']],
        ok: '정답! 노트의 ③영영 정의와 ④예문은 바로 이 칸에서 가져옵니다.', no: '이 정의는 지문의 defy와 쓰임이 달라요. 뒤에 오는 explanation을 단서로 다시 골라 보세요.' }
    };
    ['ko', 'en'].forEach(function (k) {
      var box = el.querySelector('[data-q="' + k + '"]'), q = Q[k];
      box.innerHTML = q.opts.map(function (o, i) { return '<button class="ss-opt" data-i="' + i + '">' + (i + 1) + '. ' + o[0] + (o[1] ? '<em>' + o[1] + '</em>' : '') + '</button>'; }).join('') + '<div class="ss-fb" hidden></div>';
      box.querySelectorAll('.ss-opt').forEach(function (b) {
        b.onclick = function () {
          var i = +b.dataset.i, ok = i === q.ans, fb = box.querySelector('.ss-fb');
          box.querySelectorAll('.ss-opt').forEach(function (x) { x.classList.remove('ok', 'no'); });
          b.classList.add(ok ? 'ok' : 'no'); fb.hidden = false; fb.className = 'ss-fb ' + (ok ? 'ok' : 'no'); fb.textContent = ok ? q.ok : q.no;
        };
      });
    });
  }

  function modal(tab) {
    css();
    var m = document.createElement('div'); m.className = 'ss-modal';
    m.innerHTML = '<div class="ss-sheet" role="dialog" aria-modal="true" aria-label="독해 과제 가이드"><div class="hd"><h3>독해 과제 가이드</h3><button aria-label="닫기">✕</button></div>' +
      '<div class="ss-tabs"><button data-t="g">검사 기준</button><button data-t="n">노트 작성법</button><button data-t="r">교재 로드맵</button></div><div class="ss-body"></div></div>';
    document.body.appendChild(m); document.body.style.overflow = 'hidden';
    var body = m.querySelector('.ss-body');
    function go(t) {
      m.querySelectorAll('.ss-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
      body.innerHTML = '<div class="ss-sec"></div>'; var s = body.firstChild;
      if (t === 'g') grades(s, { full: true }); else if (t === 'n') note(s); else roadmap(s);
      m.querySelector('.ss-sheet').scrollTop = 0;
    }
    function close() { m.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    m.querySelector('.hd button').onclick = close;
    m.onclick = function (e) { if (e.target === m) close(); };
    document.addEventListener('keydown', esc);
    m.querySelectorAll('.ss-tabs button').forEach(function (b) { b.onclick = function () { go(b.dataset.t); }; });
    go(tab || 'g');
  }

  window.PIFSS = { STEPS: STEPS, GRADES: GRADES, roadmap: roadmap, grades: grades, note: note, modal: modal };
})();
