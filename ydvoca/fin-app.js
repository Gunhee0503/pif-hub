/* 어휘요약문 로드맵 STEP 3 · FINALE — 회차별 연습 · 리뷰 테스트 · 오답만 다시 (otw-app.js 다음에 불러옴)
   데이터: ydvoca/finale.js (window.FIN)   진도: vt_progress course 'ydvoca'
     <s1r1>-p    연습 { ans:{q01A:답}, st:{q01A:1|0} }  ← 연습·오답·리뷰 테스트 채점 결과가 모두 st에 반영
     <s1r1>-test 리뷰 테스트 { attempts:[{at,set,score,passed,items,ans}], best, passed, paper:[..] }
   배점: 100점 만점 · 문항당 100/문항 수(5점) · 빈칸 2개 문항은 빈칸마다 절반. 통과 = 70점 이상 */
'use strict';
const FIND = window.FIN || { seasons: [] };
const finSeason = id => FIND.seasons.find(s => s.id === id) || FIND.seasons[0];
const finRound = (sid, r) => { const s = finSeason(sid); return s && s.rounds.find(x => x.r === +r); };
const finU = (sid, r) => sid + 'r' + r;
const finBlanks = R => R.qs.flatMap(q => Object.keys(q.bl).sort().map(k => [q, k, q.id + k]));
const finPts = R => 100 / R.qs.length;
const finPass = () => FIND.pass || 70;
function finOk(q, k, v){
  const x = onorm(v); if (!x) return false;
  const opts = q.bl[k] || [];
  return q.key[k].acc.some(w => { const f = otwForms(w, /\(s\)$/.test(w) || opts.some(o => o.sfx === '(s)') ? '(s)' : '');
    return f.has(x) || opts.some(o => o.first && f.has(onorm(o.first + v))); });
}
function finScore(R, st){
  const p = finPts(R); let s = 0;
  R.qs.forEach(q => { const ks = Object.keys(q.bl); ks.forEach(k => { if (st[q.id + k] === 1) s += p / ks.length; }); });
  return Math.round(s * 10) / 10;
}
function finStat(sid, R){
  const u = finU(sid, R.r), st = data(u + '-p').st || {}, t = data(u + '-test');
  const ids = finBlanks(R).map(x => x[2]);
  const qdone = R.qs.filter(q => Object.keys(q.bl).some(k => (q.id + k) in st)).length;
  const wrongQ = R.qs.filter(q => Object.keys(q.bl).some(k => st[q.id + k] === 0)).length;
  return { qdone, wrongQ, n: R.qs.length, passed: !!t.passed, best: t.best, att: (t.attempts || []).length + (t.paper || []).length, ids };
}

/* ---------- 로드맵 홈의 STEP 3 ---------- */
function finHome(){
  if (!FULL) return `<div class="soon"><b>🔒 내신 어휘요약문 반 전용</b><br>온더웨이 다음 단계예요.</div>`;
  const S = finSeason('s1');
  const tabs = `<div class="otabs"><button class="on">${esc(S.name)} <small>${esc(S.sub || '')}</small></button><button disabled>Season 2 <small>2학기 · 준비 중</small></button></div>`;
  const cards = S.rounds.map(R => { const s = finStat(S.id, R);
    const tp = s.passed ? `<span class="pill pass">통과${s.best ? ' · ' + s.best.score + '점' : ''}</span>` : s.att ? `<span class="pill re">재시험${s.best ? ' · 최고 ' + s.best.score + '점' : ''}</span>` : '<span class="pill">테스트</span>';
    return `<a class="lc otw fin" href="#/fin/${S.id}/${R.r}"><div class="n">ROUND ${pad(R.r)}</div><div class="s" style="min-height:0;margin-top:6px">실전연습 ${R.r}회 · ${s.n}문항</div>
      <div class="bar"><i style="width:${Math.round(s.qdone / s.n * 100)}%"></i></div>
      <div class="ic"><span class="pill ${s.qdone ? 'on' : ''}">연습 ${s.qdone}/${s.n}</span>${tp}${s.wrongQ ? `<span class="pill re">오답 ${s.wrongQ}</span>` : ''}</div></a>`; }).join('');
  return `<div class="dual" style="grid-template-columns:1fr"><div class="dc finc"><b>🎆 FINALE · 피날레는 실전완성<span class="k">요약문 어휘 실전</span></b>내신 기출 빈출어휘로 만든 요약문 어휘완성 실전 유형이에요. 첫 글자와 철자 수에 맞춰 <b style="display:inline;font-size:inherit">직접 써 보고</b>, 리뷰 테스트는 <b style="display:inline;font-size:inherit">100점 만점 ${finPass()}점 이상</b>이면 통과예요. 채점하면 정답·기출 출처·해석이 바로 보여요.</div></div>
    ${tabs}<div class="grid otwg">${cards}</div>
    <div class="row" style="margin-top:10px"><button class="b pdf" data-dl="fin-book" data-name="FINALE_Season1_교재">${OTW_PDF}교재 전체 PDF</button></div>`;
}

/* ---------- 회차 화면 ---------- */
function finRoundPage(sid, R){
  const s = finStat(sid, R), u = finU(sid, R.r), t = data(u + '-test'), b = t.best, paper = (t.paper || []).slice(-1)[0], last = (t.attempts || []).slice(-1)[0];
  const v = VID['fin-' + u], vid = v && ytId(v.video_id);
  let k = 0; const N = () => pad(++k);
  $app.innerHTML = `<div class="top"><button onclick="location.hash='#/'">‹ 로드맵</button><div class="t">FINALE · ${esc(finSeason(sid).name.toUpperCase())}</div></div>
    <div class="hero otwh" style="padding:20px 22px"><div class="rings"></div><div class="e">STEP 3 · FINALE · ${esc(finSeason(sid).name)}</div><h1>ROUND ${pad(R.r)}</h1><p>실전연습 ${R.r}회 · 요약문 어휘완성 ${s.n}문항 · 문항당 ${finPts(R)}점</p></div>
    ${vid ? `<div class="card"><h2><span class="no">${N()}</span>해설 영상<span class="role learn">선택</span></h2><div class="vbox"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0&playsinline=1" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div></div>` : ''}
    <div class="card practice"><h2><span class="no">${N()}</span>연습 · 문항 풀기<span class="role practice">PRACTICE</span></h2>
      <p class="d">교재 문항을 그대로 풀어요. 문항마다 <b>확인</b>을 누르면 바로 채점되고 <b>정답·기출 출처·해석</b>이 펼쳐져요. 쓴 답은 저장돼요.</p>
      <div class="pps"><a class="pp" href="#/fin/${sid}/${R.r}/practice"><span class="k">ROUND ${pad(R.r)}</span><span class="t">요약문 어휘완성</span><span class="g"><i style="width:${Math.round(s.qdone / s.n * 100)}%"></i></span><span class="c">${s.qdone}/${s.n}${s.wrongQ ? ` <em>✗${s.wrongQ}</em>` : ''}</span></a></div></div>
    <div class="card"><h2><span class="no">${N()}</span>리뷰 테스트<span class="role check">CHECK · 통과 확인</span></h2>
      <p class="d">해설 없이 ${s.n}문항을 한 번에 풀어요. <b>100점 만점 · 문항당 ${finPts(R)}점</b>(빈칸 2개 문항은 빈칸마다 ${finPts(R) / 2}점), <b>${finPass()}점 이상</b>이면 통과예요. 재시험은 문항 순서가 섞여요.</p>
      ${b ? `<div class="res" style="grid-template-columns:1fr 1fr"><div><i>BEST</i><b>${b.score}</b>점</div><div class="x"><i>RESULT</i><b style="font-size:22px">${t.passed ? '통과' : '재시험'}</b></div></div>` : ''}
      ${s.passed ? '<div class="banner ok">통과했어요! 틀린 문항은 오답만 다시에서 정리해요.</div>' : s.att ? `<div class="banner no">아직 통과 전이에요. ${finPass()}점 이상이면 통과예요.</div>` : ''}
      ${paper ? `<div class="note" style="margin-bottom:10px">종이 시험 기록 · ${paper.score}점 (${new Date(paper.at).toLocaleDateString('ko-KR')})</div>` : ''}
      <div class="row"><a class="b main" href="#/fin/${sid}/${R.r}/test">${(t.attempts || []).length ? '시험 다시 보기' : '시험 보기'}</a>${(t.attempts || []).length || paper ? `<a class="b or" href="#/fin/${sid}/${R.r}/retest">재시험 (순서 섞기)</a>` : ''}${last ? `<a class="b" href="#/fin/${sid}/${R.r}/result">지난 결과 보기</a>` : ''}</div></div>
    <div class="card"><h2><span class="no">${N()}</span>오답만 다시<span class="role apply">REVIEW</span></h2>
      <p class="d">연습과 리뷰 테스트에서 틀린 문항만 모아요. 다시 맞히면 목록에서 빠져요.</p>
      <div class="row">${s.wrongQ ? `<a class="b or" href="#/fin/${sid}/${R.r}/wrong">오답 ${s.wrongQ}문항 다시 풀기</a>` : '<span class="note" style="flex:1">아직 모인 오답이 없어요.</span>'}</div></div>
    <div class="card"><h2><span class="no">${N()}</span>종이 시험지<span class="role apply">선택</span></h2><p class="d">수업에서 쓰는 리뷰 테스트지예요. 종이로 본 점수는 선생님이 기록해 주세요.</p>
      <div class="row"><button class="b pdf" data-dl="fin-t${R.r}" data-name="FINALE_REVIEW_TEST_Round${R.r}">${OTW_PDF}Round ${pad(R.r)} 시험지 PDF</button></div></div>`;
  bindDl(); scrollTo(0, 0);
}

/* ---------- 문항 ---------- */
function finQ(q, no, ans, opt){
  const sum = esc(q.sum).replace(/\((A|B)\)/g, '<span class="fbl">($1)</span>');
  const rows = Object.keys(q.bl).sort().map(k => {
    const ph = q.bl[k].map(o => o.first + '_'.repeat(Math.max(1, o.len - o.first.length)) + (o.sfx || '')).join('  또는  ');
    const lens = q.bl[k].map(o => o.len + '자').join(' / ');
    return `<div class="frow"><span class="fk">(${k})</span><input class="blank" data-id="${q.id + k}" data-q="${q.id}" data-k="${k}" value="${esc((ans || {})[q.id + k] || '')}" placeholder="${esc(ph)}" style="--w:${Math.max(8, Math.max(...q.bl[k].map(o => o.len)) * .72 + 3).toFixed(1)}em" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"><span class="fl">${lens}</span></div>`; }).join('');
  return `<div class="oq fq2" data-q="${q.id}"><div class="fh"><span class="no">${no}</span><span class="fi">${esc(q.inst)} <b>[${opt.pts}점]</b></span></div>
    ${q.title ? `<div class="ft">${esc(q.title)}</div>` : ''}<div class="fp">${esc(q.pas)}</div><div class="fa2">▼</div>
    <div class="fs"><div>➜ ${sum}</div>${q.gloss && opt.gloss ? `<div class="fg">${esc(q.gloss)}</div>` : ''}</div>
    <div class="frows">${rows}${opt.check ? `<button class="ck fck" data-ck="${q.id}" type="button">확인</button>` : ''}</div><div class="fbx"></div></div>`;
}
function finFeedback(q, res, showEx){
  const box = $app.querySelector(`[data-q="${q.id}"] .fbx`); if (!box) return;
  const ks = Object.keys(q.bl).sort();
  let h = ks.map(k => `<div class="fb ${res[k] ? 'ok' : 'bad'}">(${k}) ${res[k] ? '✓ 정답' : '✗ 정답 <b>' + esc(q.key[k].w) + '</b>'}${q.key[k].acc.length > 1 && res[k] ? ` <span style="color:var(--ink2)">(${esc(q.key[k].w)})</span>` : ''}</div>`).join('');
  if (showEx) {
    const src = ks.filter(k => q.key[k].freq || q.key[k].src.length).map(k => `(${k}) ${q.key[k].freq ? '<span class="frq">기출 빈출</span> ' : ''}${q.key[k].src.map(esc).join(' / ')}`).join('<br>');
    const nt = ks.filter(k => q.key[k].note).map(k => `(${k}) ${esc(q.key[k].note)}`).join(' ');
    const ex = q.ex || { flow: '', b: {} };
    const xb = ks.filter(k => ex.b[k]).map(k => `<div class="fxb"><div class="fxm"><b>(${k})</b> ${esc(ex.b[k][0])}</div><div><i>근거</i><span class="fen">${esc(ex.b[k][1])}</span></div><div><i>포인트</i>${esc(ex.b[k][2])}</div></div>`).join('');
    h += `<div class="oex">${ex.flow ? `<div><i>풀이</i>${esc(ex.flow)}</div>` : ''}${xb}${q.gloss ? `<div><i>요약문</i>${esc(q.gloss)}</div>` : ''}${nt ? `<div><i>뜻</i>${nt}</div>` : ''}${src ? `<div><i>기출</i>${src}</div>` : ''}<div><i>해석</i>${esc(q.tr)}</div></div>`;
  }
  box.innerHTML = h;
  ks.forEach(k => { const inp = $app.querySelector(`input[data-id="${q.id + k}"]`); if (inp) { inp.classList.remove('ok', 'bad'); inp.classList.add(res[k] ? 'ok' : 'bad'); } });
}

/* ---------- 연습 · 오답 ---------- */
let FP = null, fpT = null;
function finSavePractice(){
  clearTimeout(fpT);
  fpT = setTimeout(() => { const u = FP.u + '-p', d = data(u), st = d.st || {}, R = FP.R;
    save(u, d, { score: finScore(R, st), max: 100, completed: R.qs.every(q => Object.keys(q.bl).some(k => (q.id + k) in st)) }); }, 1200);
}
function finPractice(sid, R, mode){
  const u = finU(sid, R.r), d = data(u + '-p'); d.ans = d.ans || {}; d.st = d.st || {}; P[u + '-p'] = Object.assign({}, P[u + '-p'], { data: d });
  FP = { sid, R, u };
  const pts = finPts(R);
  let h = `<div class="top"><button onclick="location.hash='#/fin/${sid}/${R.r}'">‹ Round ${pad(R.r)}</button><div class="t">${mode === 'wrong' ? '오답만 다시' : '연습 · 문항 풀기'}</div></div>`;
  const list = mode === 'wrong' ? R.qs.filter(q => Object.keys(q.bl).some(k => d.st[q.id + k] === 0)) : R.qs;
  if (!list.length) h += `<div class="banner ok">남은 오답이 없어요. 잘했어요!</div><div class="row"><a class="b main" href="#/fin/${sid}/${R.r}">회차 화면으로</a></div>`;
  else {
    h += `<div class="note">빈칸마다 <b>주어진 첫 글자</b>로 시작해 <b>철자 수</b>에 맞춰 1단어로 써요. 첫 글자는 빼고 써도 돼요. 문항마다 <b>확인</b>을 누르면 정답·기출 출처·해석이 보여요.${mode === 'wrong' ? ` 틀렸던 <b>${list.length}문항</b>이에요.` : ''}</div>`;
    h += list.map(q => finQ(q, q.no, mode === 'wrong' ? {} : d.ans, { check: true, gloss: true, pts })).join('');
    h += `<div class="sticky"><button class="b main" id="ckAll">모두 확인</button><a class="b" href="#/fin/${sid}/${R.r}">회차 화면으로</a></div>`;
  }
  $app.innerHTML = h; scrollTo(0, 0);
  if (mode !== 'wrong') list.forEach(q => { const ks = Object.keys(q.bl); if (ks.some(k => (q.id + k) in d.st)) { const res = {}; ks.forEach(k => res[k] = d.st[q.id + k] === 1); finFeedback(q, res, true); } });
  const check = qid => { const q = R.qs.find(x => x.id === qid), res = {}; let any = false;
    Object.keys(q.bl).forEach(k => { const inp = $app.querySelector(`input[data-id="${qid + k}"]`), v = inp.value; if (v.trim()) any = true;
      res[k] = finOk(q, k, v); d.ans[qid + k] = v; d.st[qid + k] = res[k] ? 1 : 0; });
    if (!any) { toast('답을 먼저 써 주세요.'); return null; }
    finFeedback(q, res, true); finSavePractice(); return Object.values(res).every(Boolean); };
  $app.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => check(b.dataset.ck));
  $app.querySelectorAll('input.blank').forEach(inp => {
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const all = [...$app.querySelectorAll('input.blank')], nx = all[all.indexOf(inp) + 1];
      if (!nx || nx.dataset.q !== inp.dataset.q) check(inp.dataset.q); if (nx) nx.focus(); } };
    inp.oninput = () => { inp.classList.remove('ok', 'bad'); d.ans[inp.dataset.id] = inp.value; };
  });
  const ca = document.getElementById('ckAll');
  if (ca) ca.onclick = () => { let n = 0, okN = 0; list.forEach(q => { if (Object.keys(q.bl).some(k => $app.querySelector(`input[data-id="${q.id + k}"]`).value.trim())) { n++; if (check(q.id)) okN++; } });
    toast(n ? `${n}문항 확인 · ${okN}문항 모두 정답` : '쓴 답이 없어요.'); };
}

/* ---------- 리뷰 테스트 ---------- */
let FT = null;
function finTest(sid, R, set){
  const seed = Date.now() % 100000, r = rnd(seed), re = set === 're', pts = finPts(R);
  FT = { sid, R, set, seed };
  let h = `<div class="top"><button onclick="if(confirm('저장하지 않고 나갈까요? 지금까지 쓴 답은 저장되지 않아요.'))location.hash='#/fin/${sid}/${R.r}'">‹ 저장하지 않고 나가기</button><div class="t">ROUND ${pad(R.r)} · ${re ? '재시험' : '리뷰 테스트'}</div></div>
    <div class="note"><b>100점 만점</b> · 문항당 ${pts}점(빈칸 2개 문항은 빈칸마다 ${pts / 2}점) · <b>${finPass()}점 이상 통과</b>. 첫 글자는 빼고 써도 돼요. 다 쓰면 맨 아래 <b>채점하기</b>.</div>`;
  (re ? otwShuffle(R.qs, r) : R.qs).forEach((q, i) => h += finQ(q, i + 1, {}, { check: false, gloss: true, pts }));
  h += `<div class="sticky"><button class="b main" id="grade">채점하기</button></div>`;
  $app.innerHTML = h; scrollTo(0, 0);
  $app.querySelectorAll('input.blank').forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const all = [...$app.querySelectorAll('input.blank')], nx = all[all.indexOf(inp) + 1]; if (nx) nx.focus(); } });
  document.getElementById('grade').onclick = finGrade;
}
async function finGrade(){
  const { sid, R, set, seed } = FT, u = finU(sid, R.r);
  const empty = [...$app.querySelectorAll('input.blank')].filter(x => !x.value.trim()).length;
  if (empty && !confirm(`아직 비어 있는 칸이 ${empty}개 있어요. 그래도 채점할까요?`)) return;
  const items = {}, ans = {};
  R.qs.forEach(q => { const res = {}; Object.keys(q.bl).forEach(k => { const v = $app.querySelector(`input[data-id="${q.id + k}"]`).value; res[k] = finOk(q, k, v); items[q.id + k] = res[k] ? 1 : 0; ans[q.id + k] = v; }); finFeedback(q, res, false); });
  $app.querySelectorAll('input').forEach(x => x.disabled = true);
  const score = finScore(R, items), passed = score >= finPass();
  const tu = u + '-test', d = data(tu), list = (d.attempts || []).concat([{ at: Date.now(), set, score, passed, items, ans, seed }]).slice(-12);
  const best = [d.best, { score }].filter(Boolean).sort((a, b) => b.score - a.score)[0];
  const nd = Object.assign({}, d, { attempts: list, best, passed: !!d.passed || passed });
  const g = document.getElementById('grade'); g.disabled = true; g.textContent = '저장하는 중…';
  await save(tu, nd, { score: best.score, max: 100, completed: nd.passed });
  const pd = data(u + '-p'); pd.st = Object.assign({}, pd.st || {}, items); pd.ans = pd.ans || {};
  await save(u + '-p', pd, { score: finScore(R, pd.st), max: 100, completed: R.qs.every(q => Object.keys(q.bl).some(k => (q.id + k) in pd.st)) });
  const okQ = R.qs.filter(q => Object.keys(q.bl).every(k => items[q.id + k] === 1)).length;
  $app.querySelector('.note').insertAdjacentHTML('afterend', `<div class="banner ${passed ? 'ok' : 'no'}">${passed ? `통과! ${score}점` : `${score}점 — 통과하려면 ${finPass()}점 이상이 필요해요. 틀린 문항을 보고 재시험을 봐요.`}</div>
    <div class="res" style="grid-template-columns:1fr 1fr"><div><i>다 맞힌 문항</i><b>${okQ}</b>/${R.qs.length}</div><div class="x"><i>SCORE</i><b>${score}</b>점</div></div>`);
  g.parentElement.innerHTML = `<a class="b" href="#/fin/${sid}/${R.r}">회차 화면으로</a>${okQ < R.qs.length ? `<a class="b or" href="#/fin/${sid}/${R.r}/wrong">오답만 다시</a>` : ''}${passed ? '' : `<a class="b" href="#/fin/${sid}/${R.r}/retest">재시험</a>`}`;
  scrollTo({ top: 0, behavior: 'smooth' });
}
function finResult(sid, R){
  const t = data(finU(sid, R.r) + '-test'), a = (t.attempts || []).slice(-1)[0];
  if (!a) return finRoundPage(sid, R);
  let h = `<div class="top"><button onclick="location.hash='#/fin/${sid}/${R.r}'">‹ Round ${pad(R.r)}</button><div class="t">지난 결과 · ${new Date(a.at).toLocaleString('ko-KR')}</div></div>
    <div class="banner ${a.passed ? 'ok' : 'no'}">${a.passed ? '통과한 시험이에요.' : '통과 전이에요. 틀린 문항을 보고 재시험을 봐요.'} (${a.set === 're' ? '재시험' : '1차'}) · ${a.score}점</div>`;
  const W = finBlanks(R).filter(([, , id]) => a.items[id] === 0);
  h += W.length ? `<div class="note" style="margin-bottom:8px">틀린 빈칸 ${W.length}개 · 내가 쓴 답 → 정답</div>` + W.map(([q, k, id]) => `<div class="q"><span class="qn" style="color:var(--or)">✗ ${q.no}번 (${k})</span><span class="s">${esc(q.sum)}</span>
      <div class="fb bad">${esc(a.ans[id] || '(빈칸)')} → 정답 <b>${esc(q.key[k].w)}</b></div></div>`).join('') : '<div class="banner ok">모두 맞혔어요!</div>';
  $app.innerHTML = h + `<div class="sticky">${W.length ? `<a class="b or" href="#/fin/${sid}/${R.r}/wrong">오답만 다시</a>` : ''}<a class="b" href="#/fin/${sid}/${R.r}/retest">재시험</a></div>`; scrollTo(0, 0);
}

/* ---------- 라우터 (#/fin/s1/3[/practice | /test | /retest | /result | /wrong]) ---------- */
function finRoute(parts){
  if (!FULL) { location.hash = '#/'; return; }
  const [sid, r, sub] = parts, R = finRound(sid, r);
  if (!R) { location.hash = '#/'; return; }
  if (sub === 'practice') return finPractice(sid, R, 'practice');
  if (sub === 'wrong') return finPractice(sid, R, 'wrong');
  if (sub === 'test') return finTest(sid, R, 'main');
  if (sub === 'retest') return finTest(sid, R, 're');
  if (sub === 'result') return finResult(sid, R);
  finRoundPage(sid, R);
}
