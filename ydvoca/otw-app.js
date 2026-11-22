/* 어휘요약문 로드맵 STEP 2 · ON THE WAY — Day별 연습(교재 풀기) · 리뷰 테스트 · 오답만 다시
   데이터: ydvoca/otw.js (window.OTW)   진도: vt_progress course 'ydvoca'
     <s1d1>-p    연습 { ans:{id:답}, st:{id:1|0} }  ← 연습·오답·리뷰 테스트 채점 결과가 모두 st에 반영 (오답 목록 = st 0)
     <s1d1>-test 리뷰 테스트 { attempts:[{at,set,c:[p1,p2,p3],n:[..],score,passed,items,ans}], best, passed, paper:[..] }
   통과: Part 1(동의어·반의어) 70% 이상 (20문항 중 14개). 점수는 전체 맞은 개수 ÷ 문항 수 × 100 */
'use strict';
const OTWD = window.OTW || { seasons: [] };
const OTW_PARTS = { 1: ['동의어 & 반의어', 'SYNONYMS & ANTONYMS'], 2: ['혼동어휘', 'CONFUSING WORDS'], 3: ['어형변화', 'DERIVATIVES'] };
const otwSeason = id => OTWD.seasons.find(s => s.id === id) || OTWD.seasons[0];
const otwDay = (sid, d) => { const s = otwSeason(sid); return s && s.days.find(x => x.d === +d); };
const otwU = (sid, d) => sid + 'd' + d;
const otwItems = (D, p) => p === 1 ? D.p1 : D['p' + p].flatMap(g => g.items);
const otwAll = D => [1, 2, 3].flatMap(p => otwItems(D, p).map(it => [p, it]));
const otwN = D => [1, 2, 3].map(p => otwItems(D, p).length);
const otwNeed = D => Math.ceil(D.p1.length * (OTWD.pass1 || .7) - 1e-9);
const otwB = s => esc(s).replace(/\*\*(.+?)\*\*/g, (m, x) => '<b>' + x.trim() + '</b>' + (x.endsWith(' ') ? ' ' : ''));

/* ---------- 채점 (대소문자·띄어쓰기 무시, (ed)·(s) 붙여 써도 정답) ---------- */
const onorm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[□_]/g, '').replace(/\s+/g, ' ').replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '').trim();
function otwForms(key, hint){
  let k = onorm(key), base = [k];
  if (/\(s\)$/.test(k)) { const b = k.replace(/\(s\)$/, ''); base = [b, b + 's']; }
  const out = new Set(base);
  base.forEach(b => {
    if (hint === '(ed)') { out.add(b.endsWith('e') ? b + 'd' : b + 'ed'); if (/[^aeiou]y$/.test(b)) out.add(b.slice(0, -1) + 'ied');
      if (/[^aeiou][aeiou][bdgklmnprt]$/.test(b)) out.add(b + b.slice(-1) + 'ed'); }
    if (hint === '(s)') { out.add(b + 's'); if (/(s|x|z|ch|sh)$/.test(b)) out.add(b + 'es'); if (/[^aeiou]y$/.test(b)) out.add(b.slice(0, -1) + 'ies'); }
  });
  return out;
}
function otwOk(p, it, v){
  const x = onorm(v); if (!x) return false;
  const hint = p === 1 ? (/^\(s\)/.test(it.post) ? '(s)' : '') : it.hint;
  const f = otwForms(it.key, hint);
  return f.has(x) || (p === 1 && it.first && f.has(onorm(it.first + v)));
}

/* ---------- 상태 ---------- */
function otwStat(sid, D){
  const u = otwU(sid, D.d), pr = data(u + '-p'), t = data(u + '-test'), st = pr.st || {};
  const ids = otwAll(D).map(([, it]) => it.id), tot = ids.length;
  const done = ids.filter(i => i in st).length, ok = ids.filter(i => st[i] === 1).length, wrong = ids.filter(i => st[i] === 0).length;
  const att = (t.attempts || []).length + (t.paper || []).length;
  return { done, ok, wrong, tot, passed: !!t.passed, best: t.best, att };
}

/* ---------- 로드맵 홈의 STEP 2 ---------- */
function otwHome(){
  if (!FULL) return `<div class="soon"><b>🔒 내신 어휘요약문 반 전용</b><br>학교 시험 범위에 맞춘 단계라 내신반에서 열려요. BASE CAMP는 누구나 끝까지 할 수 있어요.</div>`;
  const sid = sessionStorage.getItem('otw_season') || 's1', S = otwSeason(sid);
  const tabs = `<div class="otabs">${OTWD.seasons.map(s => `<button class="${s.id === S.id ? 'on' : ''}" data-season="${s.id}">${esc(s.name)} <small>${esc(s.sub || '')}</small></button>`).join('')}<button disabled>Season 2 <small>2학기 · 준비 중</small></button></div>`;
  const cards = S.days.map(D => { const s = otwStat(S.id, D), n = otwN(D);
    const tp = s.passed ? `<span class="pill pass">통과${s.best ? ' · ' + s.best.score + '점' : ''}</span>` : s.att ? `<span class="pill re">재시험${s.best ? ' · 최고 ' + s.best.score + '점' : ''}</span>` : '<span class="pill">테스트</span>';
    return `<a class="lc otw" href="#/otw/${S.id}/${D.d}"><div class="n">DAY ${pad(D.d)}</div><div class="s" style="min-height:0;margin-top:6px">동·반 ${n[0]} · 혼동 ${n[1]} · 어형 ${n[2]}</div>
      <div class="bar"><i style="width:${Math.round(s.done / s.tot * 100)}%"></i></div>
      <div class="ic"><span class="pill ${s.done ? 'on' : ''}">연습 ${s.done}/${s.tot}</span>${tp}${s.wrong ? `<span class="pill re">오답 ${s.wrong}</span>` : ''}</div></a>`; }).join('');
  return `<div class="dual" style="grid-template-columns:1fr"><div class="dc otwc"><b>🏃 ON THE WAY · Day별 회독<span class="k">연습 + 리뷰 테스트</span></b>교재 문항을 앱에서 <b style="display:inline;font-size:inherit">직접 써 보며</b> 회독하고, 리뷰 테스트로 확인해요. 통과 기준은 <b style="display:inline;font-size:inherit">Part 1 동의어·반의어 70점(20문항 중 14개) 이상</b>. 영상 없이 문제와 해설로 공부하는 단계예요.</div></div>
    ${tabs}<div class="grid otwg">${cards}</div>
    <div class="row" style="margin-top:10px"><button class="b pdf" data-dl="otw-book" data-name="On_The_Way_Season1_교재">${OTW_PDF}교재 전체 PDF</button></div>`;
}
const OTW_PDF = '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"/></svg>';
function otwBindHome(){ $app.querySelectorAll('[data-season]').forEach(b => b.onclick = () => { sessionStorage.setItem('otw_season', b.dataset.season); home(); }); }

/* ---------- Day 화면 ---------- */
function otwDayPage(sid, D){
  const s = otwStat(sid, D), u = otwU(sid, D.d), t = data(u + '-test'), n = otwN(D), need = otwNeed(D);
  const last = (t.attempts || []).slice(-1)[0], paper = (t.paper || []).slice(-1)[0], b = t.best;
  const v = VID['otw-' + u], vid = v && ytId(v.video_id);
  let k = 0; const N = () => pad(++k);
  const partBar = p => { const ids = otwItems(D, p).map(i => i.id), st = data(u + '-p').st || {}, dn = ids.filter(i => i in st).length, ok = ids.filter(i => st[i] === 1).length;
    return `<a class="pp" href="#/otw/${sid}/${D.d}/practice/${p}"><span class="k">PART ${pad(p)}</span><span class="t">${OTW_PARTS[p][0]}</span><span class="g"><i style="width:${Math.round(ok / ids.length * 100)}%"></i></span><span class="c">${ok}/${ids.length}${dn > ok ? ` <em>✗${dn - ok}</em>` : ''}</span></a>`; };
  $app.innerHTML = `<div class="top"><button onclick="location.hash='#/'">‹ 로드맵</button><div class="t">ON THE WAY · ${esc(otwSeason(sid).name.toUpperCase())}</div></div>
    <div class="hero otwh" style="padding:20px 22px"><div class="rings"></div><div class="e">STEP 2 · ON THE WAY · ${esc(otwSeason(sid).name)}</div><h1>DAY ${pad(D.d)}</h1><p>동의어·반의어 ${n[0]} · 혼동어휘 ${n[1]} · 어형변화 ${n[2]} — 모두 ${s.tot}문항</p></div>
    ${vid ? `<div class="card"><h2><span class="no">${N()}</span>해설 영상<span class="role learn">선택</span></h2><div class="vbox"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0&playsinline=1" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div></div>` : ''}
    <div class="card practice"><h2><span class="no">${N()}</span>연습 · 교재 풀기<span class="role practice">PRACTICE</span></h2>
      <p class="d">교재 문항을 그대로 직접 써 봐요. 칸마다 <b>확인</b>(또는 Enter)을 누르면 바로 채점되고, Part 1은 뜻·대체 단어·해석·TIP 해설이 펼쳐져요. 쓴 답은 저장돼서 이어서 할 수 있어요.</p>
      <div class="pps">${[1, 2, 3].map(partBar).join('')}</div></div>
    <div class="card"><h2><span class="no">${N()}</span>리뷰 테스트<span class="role check">CHECK · 통과 확인</span></h2>
      <p class="d">힌트 없이 Part 1~3을 한 번에 풀어요. 점수는 맞은 개수를 100점 만점으로 환산하고, <b>Part 1 동의어·반의어 ${need}/${n[0]} (70점) 이상</b>이면 통과예요. 재시험은 문항 순서가 섞여요.</p>
      ${b ? `<div class="res"><div><i>PART 1</i><b>${b.c[0]}</b>/${n[0]}</div><div><i>PART 2</i><b>${b.c[1]}</b>/${n[1]}</div><div><i>PART 3</i><b>${b.c[2]}</b>/${n[2]}</div><div class="x"><i>SCORE</i><b>${b.score}</b>점</div></div>` : ''}
      ${s.passed ? '<div class="banner ok">통과했어요! 틀린 문항은 오답만 다시에서 정리해요.</div>' : s.att ? `<div class="banner no">아직 통과 전이에요. Part 1을 ${need}개 이상 맞히면 통과예요.</div>` : ''}
      ${paper ? `<div class="note" style="margin-bottom:10px">종이 시험 기록 · Part 1 ${paper.c[0]} · Part 2 ${paper.c[1]} · Part 3 ${paper.c[2]} · ${paper.score}점 (${new Date(paper.at).toLocaleDateString('ko-KR')})</div>` : ''}
      <div class="row"><a class="b main" href="#/otw/${sid}/${D.d}/test">${(t.attempts || []).length ? '시험 다시 보기' : '시험 보기'}</a>${(t.attempts || []).length || paper ? `<a class="b or" href="#/otw/${sid}/${D.d}/retest">재시험 (순서 섞기)</a>` : ''}${last ? `<a class="b" href="#/otw/${sid}/${D.d}/result">지난 결과 보기</a>` : ''}</div></div>
    <div class="card"><h2><span class="no">${N()}</span>오답만 다시<span class="role apply">REVIEW</span></h2>
      <p class="d">연습과 리뷰 테스트에서 틀린 문항만 모아요. 다시 맞히면 목록에서 빠져요.</p>
      <div class="row">${s.wrong ? `<a class="b or" href="#/otw/${sid}/${D.d}/wrong">오답 ${s.wrong}문항 다시 풀기</a>` : '<span class="note" style="flex:1">아직 모인 오답이 없어요.</span>'}</div></div>
    <div class="card"><h2><span class="no">${N()}</span>종이 시험지<span class="role apply">선택</span></h2><p class="d">수업에서 쓰는 리뷰 테스트지예요. 종이로 본 점수는 선생님이 기록해 주세요.</p>
      <div class="row"><button class="b pdf" data-dl="otw-t${D.d}" data-name="On_The_Way_REVIEW_TEST_Day${D.d}">${OTW_PDF}Day ${pad(D.d)} 시험지 PDF</button></div></div>`;
  bindDl(); scrollTo(0, 0);
}

/* ---------- 문항 그리기 ---------- */
function otwInput(p, it, val, opt){
  const w = Math.max(6, (p === 1 ? it.ph.length : String(it.key).length) * .7 + 2);
  const ph = p === 1 ? it.ph : '';
  return `<span class="oin"><input class="blank" data-id="${it.id}" data-p="${p}" style="--w:${w.toFixed(1)}em" value="${esc(val || '')}" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">${opt.check ? `<button class="ck" data-ck="${it.id}" type="button">확인</button>` : ''}</span>`;
}
const otwJoin = (pre, mid, post) => esc(pre) + (pre && !/[\s(“‘]$/.test(pre) ? ' ' : '') + mid + (post && !/^[,.;:!?)(]/.test(post) ? ' ' : '') + esc(post);
function otwItemH(p, it, no, val, opt){
  if (p === 1) {
    return `<div class="oq o1" data-q="${it.id}"><div class="src"><span class="no">${no}</span><span class="s">${otwJoin(it.pre, otwInput(1, it, val, opt), it.post)}</span><span class="lab ${it.lab === '반의어' ? 'ant' : 'syn'}">${esc(it.lab)}</span></div>
      <div class="alts">${it.alts.map(a => `<div>${otwB(a)}</div>`).join('')}${opt.notes && it.notes.length ? it.notes.map(n => `<div class="nt">${esc(n)}</div>`).join('') : ''}</div><div class="fbx"></div></div>`;
  }
  return `<div class="oq o2" data-q="${it.id}"><span class="no">${no}</span><div class="c"><div class="en">${otwJoin(it.pre, otwInput(p, it, val, opt) + (it.hint ? `<span class="hint">${esc(it.hint)}</span>` : ''), it.post)}${it.tag ? ` <span class="tag">${esc(it.tag)}</span>` : ''}</div>
    <div class="ko">${otwB(it.ko)}</div><div class="fbx"></div></div></div>`;
}
const otwGroupHead = g => `<div class="ogh"><span class="chip">${esc(g.label)}</span><span>${esc(g.inst)}</span></div>${g.words.length > 1 || g.label !== '어형변화' ? `<div class="obogi"><span class="k">보기</span>${g.words.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : `<div class="obogi"><span class="k">보기</span><span>${esc(g.words[0] || '')}</span></div>`}`;
function otwNotes(g){
  if (!g.notes || !g.notes.length) return '';
  return `<details class="onote"><summary>참고 · ${esc(g.notes.map(n => n.t).join(' · '))}</summary>${g.notes.map(n => n.r.map(r => r[0] === 'h' ? `<div class="h">${esc(r[1])}</div>` : r[0] === 't' ? `<div class="tr"><span>${otwB(r[1])}</span><span>${otwB(r[2])}</span></div>` : `<div>${otwB(r[1])}</div>`).join('')).join('<hr>')}</details>`;
}
function otwFeedback(p, it, ok, showEx){
  const box = $app.querySelector(`[data-q="${it.id}"] .fbx`); if (!box) return;
  let h = `<div class="fb ${ok ? 'ok' : 'bad'}">${ok ? '✓ 정답' : '✗ 정답 <b>' + esc(it.key) + '</b>' + (it.hint ? ` <span style="color:var(--ink2)">${esc(it.hint)}</span>` : '')}</div>`;
  if (p === 1 && showEx && it.ex) h += `<div class="oex"><div><i>뜻</i>${esc(it.ex[0])}</div>${it.ex[1] ? `<div><i>${it.lab === '반의어' ? '반의어' : '동의어'}</i>${esc(it.ex[1])}</div>` : ''}<div><i>해석</i>${esc(it.ex[2])}</div>${it.ex[3] ? `<div class="tip"><i>TIP</i>${esc(it.ex[3])}</div>` : ''}</div>`;
  box.innerHTML = h;
  const inp = $app.querySelector(`input[data-id="${it.id}"]`); if (inp) { inp.classList.remove('ok', 'bad'); inp.classList.add(ok ? 'ok' : 'bad'); }
}

/* ---------- 연습 · 오답 ---------- */
let OP = null;           // { sid, D, u, mode:'practice'|'wrong', part }
let opT = null;
function otwSavePractice(){
  clearTimeout(opT);
  opT = setTimeout(() => { const u = OP.u + '-p', d = data(u), ids = otwAll(OP.D).map(([, it]) => it.id), st = d.st || {};
    save(u, d, { score: ids.filter(i => st[i] === 1).length, max: ids.length, completed: ids.every(i => i in st) }); }, 1200);
}
function otwPractice(sid, D, part, mode){
  const u = otwU(sid, D.d), d = data(u + '-p'); d.ans = d.ans || {}; d.st = d.st || {}; P[u + '-p'] = Object.assign({}, P[u + '-p'], { data: d });
  OP = { sid, D, u, mode, part };
  let h = `<div class="top"><button onclick="location.hash='#/otw/${sid}/${D.d}'">‹ Day ${pad(D.d)}</button><div class="t">${mode === 'wrong' ? '오답만 다시' : '연습 · 교재 풀기'}</div></div>`;
  if (mode === 'practice') {
    h += `<div class="otabs">${[1, 2, 3].map(p => `<a class="${p === part ? 'on' : ''}" href="#/otw/${sid}/${D.d}/practice/${p}">PART ${pad(p)} <small>${OTW_PARTS[p][0]}</small></a>`).join('')}</div>`;
    h += otwPartH(D, part, d, true);
    h += `<div class="sticky"><button class="b main" id="ckAll">이 Part 모두 확인</button>${part < 3 ? `<a class="b" href="#/otw/${sid}/${D.d}/practice/${part + 1}">다음 Part ›</a>` : `<a class="b" href="#/otw/${sid}/${D.d}">Day 화면으로</a>`}</div>`;
  } else {
    const W = otwAll(D).filter(([, it]) => d.st[it.id] === 0);
    if (!W.length) h += `<div class="banner ok">남은 오답이 없어요. 잘했어요!</div><div class="row"><a class="b main" href="#/otw/${sid}/${D.d}">Day 화면으로</a></div>`;
    else {
      h += `<div class="note">틀렸던 <b>${W.length}문항</b>이에요. 맞히면 다음에 들어올 때 목록에서 빠져요.</div>`;
      [1, 2, 3].forEach(p => { const L = W.filter(x => x[0] === p); if (!L.length) return;
        h += otwSecH(p, L.length);
        L.forEach(([, it]) => { if (p > 1) { const g = D['p' + p].find(g => g.items.includes(it)); h += `<div class="obogi sm"><span class="k">보기</span>${g.words.map(w => `<span>${esc(w)}</span>`).join('')}</div>`; }
          h += otwItemH(p, it, it.no, '', { check: true, notes: true }); }); });
      h += `<div class="sticky"><button class="b main" id="ckAll">모두 확인</button></div>`;
    }
  }
  $app.innerHTML = h; scrollTo(0, 0);
  if (mode === 'practice') Object.entries(d.st).forEach(([id, ok]) => { const x = otwAll(D).find(([, it]) => it.id === id); if (x && x[0] === part) otwFeedback(x[0], x[1], ok === 1, true); });
  const check = id => { const x = otwAll(D).find(([, it]) => it.id === id), inp = $app.querySelector(`input[data-id="${id}"]`); if (!x || !inp) return;
    if (!inp.value.trim()) { inp.focus(); return toast('답을 먼저 써 주세요.'); }
    const ok = otwOk(x[0], x[1], inp.value); d.ans[id] = inp.value; d.st[id] = ok ? 1 : 0; otwFeedback(x[0], x[1], ok, true); otwSavePractice(); return ok; };
  $app.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => check(b.dataset.ck));
  $app.querySelectorAll('input.blank').forEach(inp => {
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); check(inp.dataset.id); const all = [...$app.querySelectorAll('input.blank')], nx = all[all.indexOf(inp) + 1]; if (nx) nx.focus(); } };
    inp.oninput = () => { inp.classList.remove('ok', 'bad'); d.ans[inp.dataset.id] = inp.value; };
  });
  const ca = document.getElementById('ckAll');
  if (ca) ca.onclick = () => { let n = 0, okN = 0; $app.querySelectorAll('input.blank').forEach(inp => { if (inp.value.trim()) { n++; if (check(inp.dataset.id)) okN++; } });
    toast(n ? `${n}문항 확인 · ${okN}개 정답` : '쓴 답이 없어요.'); };
}
const otwSecH = (p, n) => `<div class="st" style="--c:${p === 1 ? 'var(--dk)' : p === 2 ? 'var(--tl)' : 'var(--or)'}"><span class="k">${pad(p)}</span><span class="tt">${OTW_PARTS[p][0]}</span><span class="dd">${OTW_PARTS[p][1]}</span><span style="margin-left:auto;font:500 14px var(--en);color:var(--ink2)">${n}문항</span></div>`;
function otwPartH(D, p, d, practice){
  let h = otwSecH(p, otwItems(D, p).length);
  if (p === 1) h += `<div class="note" style="margin-bottom:6px"><b>동의어·반의어 관계</b>에 유의해 빈칸에 들어갈 말을 앞글자에 맞춰 쓰세요. ➜ 아래 문장은 같은 자리에 들어가는 동의어 또는 반의어예요.${D.d === 7 ? ' <b>Day 7은 실전형</b> — 네모 칸 수가 정답 글자 수예요.' : ''}</div>`
    + D.p1.map(it => otwItemH(1, it, it.no, practice ? d.ans[it.id] : '', { check: practice, notes: true })).join('');
  else D['p' + p].forEach(g => { h += otwGroupHead(g) + g.items.map(it => otwItemH(p, it, it.no, practice ? d.ans[it.id] : '', { check: practice })).join('') + (practice ? otwNotes(g) : ''); });
  return h;
}

/* ---------- 리뷰 테스트 ---------- */
let OT = null;
function otwShuffle(a, r){ a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function otwTest(sid, D, set){
  const seed = Date.now() % 100000, r = rnd(seed), re = set === 're', n = otwN(D), need = otwNeed(D);
  OT = { sid, D, set, seed };
  let h = `<div class="top"><button onclick="if(confirm('저장하지 않고 나갈까요? 지금까지 쓴 답은 저장되지 않아요.'))location.hash='#/otw/${sid}/${D.d}'">‹ 저장하지 않고 나가기</button><div class="t">DAY ${pad(D.d)} · ${re ? '재시험' : '리뷰 테스트'}</div></div>
    <div class="note"><b>통과 기준</b> Part 1 동의어·반의어 ${need}/${n[0]} (70점) 이상. 점수 = 맞은 개수 ÷ ${n[0] + n[1] + n[2]} × 100. (ed)·(s)는 이미 주어진 어미라 빈칸에는 그 앞부분만 써도 돼요. 다 쓰면 맨 아래 <b>채점하기</b>.</div>`;
  h += otwSecH(1, n[0]) + `<div class="note" style="margin-bottom:6px">빈칸에 들어갈 말을 앞글자에 맞춰 쓰세요. ➜ 아래 문장은 같은 자리에 들어가는 동의어 또는 반의어예요.${D.d === 7 ? ' 네모 칸 수 = 정답 글자 수.' : ''}</div>`;
  (re ? otwShuffle(D.p1, r) : D.p1).forEach((it, i) => h += otwItemH(1, it, i + 1, '', { check: false, notes: false }));
  [2, 3].forEach(p => { h += otwSecH(p, n[p - 1]); let k = 0;
    (re ? otwShuffle(D['p' + p], r) : D['p' + p]).forEach(g => { h += otwGroupHead(g) + (re ? otwShuffle(g.items, r) : g.items).map(it => otwItemH(p, it, ++k, '', { check: false })).join(''); }); });
  h += `<div class="sticky"><button class="b main" id="grade">채점하기</button></div>`;
  $app.innerHTML = h; scrollTo(0, 0);
  $app.querySelectorAll('input.blank').forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const all = [...$app.querySelectorAll('input.blank')], nx = all[all.indexOf(inp) + 1]; if (nx) nx.focus(); } });
  document.getElementById('grade').onclick = otwGrade;
}
async function otwGrade(){
  const { sid, D, set, seed } = OT, u = otwU(sid, D.d), n = otwN(D), need = otwNeed(D);
  const empty = [...$app.querySelectorAll('input.blank')].filter(x => !x.value.trim()).length;
  if (empty && !confirm(`아직 비어 있는 칸이 ${empty}개 있어요. 그래도 채점할까요?`)) return;
  const items = {}, ans = {}, c = [0, 0, 0];
  otwAll(D).forEach(([p, it]) => { const inp = $app.querySelector(`input[data-id="${it.id}"]`), ok = otwOk(p, it, inp.value);
    items[it.id] = ok ? 1 : 0; ans[it.id] = inp.value; if (ok) c[p - 1]++; otwFeedback(p, it, ok, false); });
  $app.querySelectorAll('input').forEach(x => x.disabled = true);
  const total = c[0] + c[1] + c[2], N = n[0] + n[1] + n[2], score = Math.round(total / N * 100), passed = c[0] >= need;
  const tu = u + '-test', d = data(tu), list = (d.attempts || []).concat([{ at: Date.now(), set, c, n, score, passed, items, ans, seed }]).slice(-12);
  const best = [d.best, { c, n, score }].filter(Boolean).sort((a, b) => b.score - a.score || b.c[0] - a.c[0])[0];
  const nd = Object.assign({}, d, { attempts: list, best, passed: !!d.passed || passed });
  const g = document.getElementById('grade'); g.disabled = true; g.textContent = '저장하는 중…';
  await save(tu, nd, { score: best.score, max: 100, completed: nd.passed });
  const pd = data(u + '-p'); pd.st = Object.assign({}, pd.st || {}, items); pd.ans = pd.ans || {};
  const ids = Object.keys(items); await save(u + '-p', pd, { score: ids.filter(i => pd.st[i] === 1).length, max: ids.length, completed: ids.every(i => i in pd.st) });
  const head = `<div class="banner ${passed ? 'ok' : 'no'}">${passed ? `통과! Part 1 ${c[0]}/${n[0]}` : `Part 1 ${c[0]}/${n[0]} — 통과하려면 ${need}개 이상이 필요해요. 틀린 문항을 확인하고 재시험을 봐요.`}</div>
    <div class="res"><div><i>PART 1</i><b>${c[0]}</b>/${n[0]}</div><div><i>PART 2</i><b>${c[1]}</b>/${n[1]}</div><div><i>PART 3</i><b>${c[2]}</b>/${n[2]}</div><div class="x"><i>SCORE</i><b>${score}</b>점</div></div>`;
  $app.querySelector('.note').insertAdjacentHTML('afterend', head);
  g.parentElement.innerHTML = `<a class="b" href="#/otw/${sid}/${D.d}">Day 화면으로</a>${total < N ? `<a class="b or" href="#/otw/${sid}/${D.d}/wrong">오답만 다시</a>` : ''}${passed ? '' : `<a class="b" href="#/otw/${sid}/${D.d}/retest">재시험</a>`}`;
  scrollTo({ top: 0, behavior: 'smooth' });
}
function otwResult(sid, D){
  const t = data(otwU(sid, D.d) + '-test'), a = (t.attempts || []).slice(-1)[0];
  if (!a) return otwDayPage(sid, D);
  let h = `<div class="top"><button onclick="location.hash='#/otw/${sid}/${D.d}'">‹ Day ${pad(D.d)}</button><div class="t">지난 결과 · ${new Date(a.at).toLocaleString('ko-KR')}</div></div>
    <div class="banner ${a.passed ? 'ok' : 'no'}">${a.passed ? '통과한 시험이에요.' : '통과 전이에요. 틀린 문항을 보고 재시험을 봐요.'} (${a.set === 're' ? '재시험' : '1차'})</div>
    <div class="res"><div><i>PART 1</i><b>${a.c[0]}</b>/${a.n[0]}</div><div><i>PART 2</i><b>${a.c[1]}</b>/${a.n[1]}</div><div><i>PART 3</i><b>${a.c[2]}</b>/${a.n[2]}</div><div class="x"><i>SCORE</i><b>${a.score}</b>점</div></div>`;
  const W = otwAll(D).filter(([, it]) => a.items[it.id] === 0);
  h += W.length ? `<div class="note" style="margin-bottom:8px">틀린 ${W.length}문항 · 내가 쓴 답 → 정답</div>` + W.map(([p, it]) => `<div class="q"><span class="qn" style="color:var(--or)">✗ P${p}-${it.no}</span><span class="s">${otwJoin(it.pre, '<b class="gap">____</b>', it.post)}</span>
      <div class="fb bad">${esc(a.ans[it.id] || '(빈칸)')} → 정답 <b>${esc(it.key)}</b>${it.hint ? ' ' + esc(it.hint) : ''}</div></div>`).join('') : '<div class="banner ok">모두 맞혔어요!</div>';
  $app.innerHTML = h + `<div class="sticky">${W.length ? `<a class="b or" href="#/otw/${sid}/${D.d}/wrong">오답만 다시</a>` : ''}<a class="b" href="#/otw/${sid}/${D.d}/retest">재시험</a></div>`; scrollTo(0, 0);
}

/* ---------- 라우터 (#/otw/s1/3[/practice/2 | /test | /retest | /result | /wrong]) ---------- */
function otwRoute(parts){
  if (!FULL) { location.hash = '#/'; return; }
  const [sid, d, sub, x] = parts, D = otwDay(sid, d);
  if (!D) { location.hash = '#/'; return; }
  if (sub === 'practice') return otwPractice(sid, D, Math.min(3, Math.max(1, +x || 1)), 'practice');
  if (sub === 'wrong') return otwPractice(sid, D, 0, 'wrong');
  if (sub === 'test') return otwTest(sid, D, 'main');
  if (sub === 'retest') return otwTest(sid, D, 're');
  if (sub === 'result') return otwResult(sid, D);
  otwDayPage(sid, D);
}
