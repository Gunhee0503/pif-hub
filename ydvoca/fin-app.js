/* 어휘요약문 로드맵 STEP 3 · FINALE — 회차별 연습 · 리뷰 테스트 · 오답만 다시 (otw-app.js 다음에 불러옴)
   데이터: ydvoca/finale.js (window.FIN)   진도: vt_progress course 'ydvoca'
     <s1r1>-p    연습 { ans:{q01A:답}, st:{q01A:1|0} }  ← 연습·오답·리뷰 테스트 채점 결과가 모두 st에 반영
     <s1r1>-test 리뷰 테스트 { attempts:[{at,set,score,passed,items,ans}], best, passed, paper:[..] }
     <s1r1>-p.wc  빈칸별 틀린 횟수(연습·오답·누적 테스트에서 틀릴 때마다 +1) — 누적 오답 고르기에 씀
     fin-cum      누적 오답 테스트 { rm:{'s1r3:q05':at}, hist:[{at,sid,n,ok}] } — rm = 학생이 '완성'으로 뺀 문항
   시즌: 1학기·2학기 구분 없이 Season 1 → 2 → … (계속 추가). Season N 화면에서 Season 1~N-1의 자주 틀린 문항을 누적 오답 테스트로 다시 풀어요.
     자주 틀린 문항 = 지금도 틀린 채로 남은 빈칸이 있거나, 어떤 빈칸을 2번 이상 틀린 문항
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

const finFile = (S, f) => 'fin-' + (S.files ? S.files + '-' : '') + f;          // s1: fin-book · s2: fin-s2-book
const finSN = S => S.name.replace(/\D+/g, '');
function finSeasonStat(S){ const st = S.rounds.map(R => finStat(S.id, R)); return { passed: st.filter(x => x.passed).length, active: st.some(x => x.qdone || x.att), n: S.rounds.length }; }
function finCurSeason(){
  let id = null; try { id = localStorage.getItem('pif_fin_season'); } catch(e){}
  if (id && FIND.seasons.some(s => s.id === id)) return finSeason(id);
  const act = FIND.seasons.filter(S => finSeasonStat(S).active).pop();          // 마지막으로 공부한 시즌
  return act || FIND.seasons[0];
}

/* ---------- 누적 오답 (지난 시즌) ---------- */
function finPool(upto){                       // upto 시즌 앞의 모든 시즌에서 자주 틀린 문항
  const idx = FIND.seasons.findIndex(s => s.id === upto), rm = data('fin-cum').rm || {}, out = [], gone = [];
  FIND.seasons.slice(0, Math.max(0, idx)).forEach(S => S.rounds.forEach(R => {
    const u = finU(S.id, R.r), p = data(u + '-p'), st = p.st || {}, wc = p.wc || {}, at = data(u + '-test').attempts || [];
    R.qs.forEach(q => { const ks = Object.keys(q.bl); let n = 0, open = false;
      ks.forEach(k => { const id = q.id + k, c = (wc[id] || 0) + at.filter(a => a.items && a.items[id] === 0).length; n = Math.max(n, c); if (st[id] === 0) open = true; });
      if (!(open || n >= 2)) return;
      const it = { key: S.id + 'r' + R.r + ':' + q.id, S, R, q, n: Math.max(n, 1), open };
      (rm[it.key] ? gone : out).push(it); });
  }));
  out.sort((a, b) => b.n - a.n || (b.open - a.open));
  return { out, gone };
}
function finCumCard(S){
  const idx = FIND.seasons.findIndex(s => s.id === S.id); if (idx < 1) return '';
  const prev = FIND.seasons.slice(0, idx).map(x => x.name).join(' · '), { out, gone } = finPool(S.id), h = data('fin-cum').hist || [], last = h.slice(-1)[0];
  return `<div class="card fcum"><h2><span class="no">↺</span>누적 오답 테스트<span class="role apply">${esc(prev)}</span></h2>
    <p class="d">지난 시즌에서 <b>자주 틀린 문항</b>(지금도 틀린 채 남았거나 2번 이상 틀린 문항)만 모았어요. 풀어 보고 <b>완성한 단어는 직접 골라 빼요.</b></p>
    <div class="res" style="grid-template-columns:1fr 1fr 1fr"><div><i>남은 문항</i><b>${out.length}</b></div><div><i>완성해서 뺌</i><b>${gone.length}</b></div><div class="x"><i>최근</i><b style="font-size:18px">${last ? last.ok + '/' + last.n : '—'}</b></div></div>
    <div class="row">${out.length ? `<a class="b or" href="#/fin/cum/${S.id}">누적 오답 테스트 보기 (${Math.min(out.length, 20)}문항)</a>` : '<span class="note" style="flex:1">지난 시즌에 모인 오답이 없어요. 좋아요!</span>'}${gone.length ? `<a class="b" href="#/fin/cum/${S.id}/done">뺀 단어 ${gone.length}개</a>` : ''}</div></div>`;
}

/* ---------- 시즌 안내 팝업 ---------- */
const FIN_NOTICE = 'pif_fin_notice_v1';
function finNotice(){
  if (document.getElementById('finNotice')) return;
  const n = FIND.seasons.length;
  const el = document.createElement('div'); el.id = 'finNotice'; el.className = 'fnov';
  el.innerHTML = `<div class="fnbox" role="dialog" aria-modal="true" aria-labelledby="fnT"><div class="fnh"><span>FINALE</span><b id="fnT">피날레 시즌 안내</b></div>
    <ol class="fnl">
      <li><b>학기 구분 없는 시즌제</b><span>1학기·2학기로 나누지 않아요. <em>Season 1 → Season 2 → …</em> 순서대로 이어서 풀어요.</span></li>
      <li><b>시즌은 계속 추가돼요</b><span>지금은 Season 1~${n}이 열려 있어요. 다음 시즌이 나오면 이 화면에 바로 생겨요.</span></li>
      <li><b>다음 시즌으로 가면 오답이 따라와요</b><span>지난 시즌에서 <em>자주 틀린 문항</em>만 모아 <em>누적 오답 테스트</em>로 다시 풀어요.</span></li>
      <li><b>완성한 단어는 내가 빼요</b><span>누적 테스트를 보고 확실히 외운 단어는 직접 골라 목록에서 빼요. 다시 넣을 수도 있어요.</span></li>
    </ol>
    <div class="fnflow"><span>Season 1</span><i>→</i><span>Season 2</span><i>→</i><span>Season 3 …</span></div>
    <button class="b main" type="button" id="fnOk" style="width:100%">확인했어요</button></div>`;
  document.body.appendChild(el);
  const close = () => { try { localStorage.setItem(FIN_NOTICE, '1'); } catch(e){} el.remove(); };
  el.querySelector('#fnOk').onclick = close; el.onclick = e => { if (e.target === el) close(); };
}
function finBindHome(){
  $app.querySelectorAll('[data-fseason]').forEach(b => b.onclick = () => { try { localStorage.setItem('pif_fin_season', b.dataset.fseason); } catch(e){}
    const y = scrollY; home(); scrollTo(0, y); });
  $app.querySelectorAll('[data-fnotice]').forEach(b => b.onclick = finNotice);
  let seen = false; try { seen = localStorage.getItem(FIN_NOTICE) === '1'; } catch(e){}
  if (FULL && !seen) setTimeout(finNotice, 400);
}

/* ---------- 로드맵 홈의 STEP 3 ---------- */
function finHome(){
  if (!FULL) return `<div class="soon"><b>🔒 내신 어휘요약문 반 전용</b><br>온더웨이 다음 단계예요.</div>`;
  const S = finCurSeason(), si = FIND.seasons.indexOf(S), ss = finSeasonStat(S), nx = FIND.seasons[si + 1];
  const tabs = `<div class="otabs">${FIND.seasons.map(x => { const t = finSeasonStat(x);
      return `<button class="${x.id === S.id ? 'on' : ''}" data-fseason="${x.id}">${esc(x.name)} <small>${t.passed === t.n ? '완료' : t.passed ? '통과 ' + t.passed + '/' + t.n : ''}</small></button>`; }).join('')}<button disabled>Season ${FIND.seasons.length + 1} <small>준비 중</small></button><button class="fni" data-fnotice type="button">ⓘ 시즌 안내</button></div>`;
  const cards = S.rounds.map(R => { const s = finStat(S.id, R);
    const tp = s.passed ? `<span class="pill pass">통과${s.best ? ' · ' + s.best.score + '점' : ''}</span>` : s.att ? `<span class="pill re">재시험${s.best ? ' · 최고 ' + s.best.score + '점' : ''}</span>` : '<span class="pill">테스트</span>';
    return `<a class="lc otw fin" href="#/fin/${S.id}/${R.r}"><div class="n">ROUND ${pad(R.r)}</div><div class="s" style="min-height:0;margin-top:6px">실전연습 ${R.r}회 · ${s.n}문항</div>
      <div class="bar"><i style="width:${Math.round(s.qdone / s.n * 100)}%"></i></div>
      <div class="ic"><span class="pill ${s.qdone ? 'on' : ''}">연습 ${s.qdone}/${s.n}</span>${tp}${s.wrongQ ? `<span class="pill re">오답 ${s.wrongQ}</span>` : ''}</div></a>`; }).join('');
  return `<div class="dual" style="grid-template-columns:1fr"><div class="dc finc"><b>🎆 FINALE · 피날레 실전완성<span class="k">시즌제 · 계속 추가</span></b>영동일고 기출 어휘로 만든 서답형 어휘완성 실전 유형이에요. 학기 구분 없이 <b style="display:inline;font-size:inherit">Season 1 → 2 → …</b> 순서로 이어지고, 다음 시즌에서는 지난 시즌의 자주 틀린 문항을 <b style="display:inline;font-size:inherit">누적 오답 테스트</b>로 다시 풀어요. 리뷰 테스트는 <b style="display:inline;font-size:inherit">100점 만점 ${finPass()}점 이상</b>이면 통과예요.</div></div>
    ${tabs}${ss.passed === ss.n && nx ? `<div class="banner ok" style="display:flex;gap:10px;align-items:center;justify-content:space-between">${esc(S.name)} 완료! 다음 시즌으로 넘어가요.<button class="b main sm" data-fseason="${nx.id}">${esc(nx.name)} →</button></div>` : ''}
    ${finCumCard(S)}<div class="grid otwg">${cards}</div>
    <div class="row" style="margin-top:10px"><button class="b pdf" data-dl="${finFile(S, 'book')}" data-name="FINALE_${S.name.replace(' ', '')}_교재">${OTW_PDF}${esc(S.name)} 교재 전체 PDF</button></div>`;
}

/* ---------- 회차 화면 ---------- */
function finRoundPage(sid, R){
  const s = finStat(sid, R), u = finU(sid, R.r), t = data(u + '-test'), b = t.best, paper = (t.paper || []).slice(-1)[0], last = (t.attempts || []).slice(-1)[0];
  const v = VID['fin-' + u], vid = v && ytId(v.video_id);
  let k = 0; const N = () => pad(++k);
  $app.innerHTML = `<div class="top"><button onclick="location.hash='#/'">‹ 로드맵</button><div class="t">FINALE · ${esc(finSeason(sid).name.toUpperCase())}</div></div>
    <div class="hero otwh" style="padding:20px 22px"><div class="rings"></div><div class="e">STEP 3 · FINALE · ${esc(finSeason(sid).name)}</div><h1>ROUND ${pad(R.r)}</h1><p>실전연습 ${R.r}회 · 어휘완성 ${s.n}문항 · 문항당 ${finPts(R)}점</p></div>
    ${vid ? `<div class="card"><h2><span class="no">${N()}</span>해설 영상<span class="role learn">선택</span></h2><div class="vbox"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0&playsinline=1" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div></div>` : ''}
    <div class="card practice"><h2><span class="no">${N()}</span>연습 · 문항 풀기<span class="role practice">PRACTICE</span></h2>
      <p class="d">교재 문항을 그대로 풀어요. 문항마다 <b>확인</b>을 누르면 바로 채점되고 <b>정답·기출 출처·해석</b>이 펼쳐져요. 쓴 답은 저장돼요.</p>
      <div class="pps"><a class="pp" href="#/fin/${sid}/${R.r}/practice"><span class="k">ROUND ${pad(R.r)}</span><span class="t">어휘완성</span><span class="g"><i style="width:${Math.round(s.qdone / s.n * 100)}%"></i></span><span class="c">${s.qdone}/${s.n}${s.wrongQ ? ` <em>✗${s.wrongQ}</em>` : ''}</span></a></div></div>
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
      <div class="row"><button class="b pdf" data-dl="${finFile(finSeason(sid), 't' + R.r)}" data-name="FINALE_${finSeason(sid).name.replace(' ', '')}_Round${R.r}">${OTW_PDF}Round ${pad(R.r)} 시험지 PDF</button></div></div>`;
  bindDl(); scrollTo(0, 0);
}

/* ---------- 문항 ---------- */
function finQ(q, no, ans, opt){
  const hl = t => esc(t).replace(/\(([A-D])\)/g, '<span class="fbl">($1)</span>');
  const rows = Object.keys(q.bl).sort().map(k => {
    const ph = q.bl[k].map(o => o.first + '_'.repeat(Math.max(1, o.len - o.first.length)) + (o.sfx || '')).join('  또는  ');
    const lens = q.bl[k].map(o => o.len + '자').join(' / ');
    return `<div class="frow"><span class="fk">${k === 'X' ? '정답' : '(' + k + ')'}</span><input class="blank" data-id="${q.id + k}" data-q="${q.id}" data-k="${k}" value="${esc((ans || {})[q.id + k] || '')}" placeholder="${esc(ph)}" style="--w:${Math.max(8, Math.max(...q.bl[k].map(o => o.len)) * .72 + 3).toFixed(1)}em" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"><span class="fl">${lens}</span></div>`; }).join('');
  return `<div class="oq fq2" data-q="${q.id}"><div class="fh"><span class="no">${no}</span><span class="fi">${esc(q.inst)} <b>[${opt.pts}점]</b></span></div>
    ${opt.tag ? `<div class="fsrc">${esc(opt.tag)}</div>` : ''}${q.title ? `<div class="ft">${esc(q.title)}</div>` : ''}${q.inpas ? `<div class="fp">${hl(q.pas)}</div>` : `<div class="fp">${esc(q.pas)}</div><div class="fa2">▼</div>
    <div class="fs"><div>➜ ${hl(q.sum)}</div>${q.gloss && opt.gloss ? `<div class="fg">${esc(q.gloss)}</div>` : ''}</div>`}
    ${q.bogi ? `<div class="fbogi"><b>&lt;보기&gt;</b>${q.bogi.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
    <div class="frows">${rows}${opt.check ? `<button class="ck fck" data-ck="${q.id}" type="button">확인</button>` : ''}</div><div class="fbx"></div></div>`;
}
function finFeedback(q, res, showEx){
  const box = $app.querySelector(`[data-q="${q.id}"] .fbx`); if (!box) return;
  const ks = Object.keys(q.bl).sort();
  const L = k => k === 'X' ? '' : `(${k}) `;
  let h = ks.map(k => `<div class="fb ${res[k] ? 'ok' : 'bad'}">${L(k)}${res[k] ? '✓ 정답' : '✗ 정답 <b>' + esc(q.key[k].w) + '</b>'}${q.key[k].acc.length > 1 && res[k] ? ` <span style="color:var(--ink2)">(${esc(q.key[k].w)})</span>` : ''}</div>`).join('');
  if (showEx) {
    const src = ks.filter(k => q.key[k].freq || q.key[k].src.length || (q.key[k].tags || []).length).map(k => `${L(k)}${q.key[k].freq ? '<span class="frq">기출 빈출</span> ' : ''}${(q.key[k].tags || []).map(t => `<span class="frq ft2">${esc(t)}</span> `).join('')}${q.key[k].src.map(esc).join(' / ')}`).join('<br>');
    const nt = ks.filter(k => q.key[k].note).map(k => `${L(k)}${esc(q.key[k].note)}`).join(' ');
    const ex = Object.assign({ flow: '', b: {} }, q.ex || {});
    const xb = ks.filter(k => ex.b[k]).map(k => `<div class="fxb"><div class="fxm"><b>${k === 'X' ? q.key[k].w : '(' + k + ')'}</b> ${esc(ex.b[k][0])}</div><div><i>근거</i><span class="fen">${esc(ex.b[k][1])}</span></div><div><i>포인트</i>${esc(ex.b[k][2])}</div></div>`).join('');
    h += `<div class="oex">${ex.flow ? `<div><i>풀이</i>${esc(ex.flow)}</div>` : ''}${xb}${q.gloss ? `<div><i>요약문</i>${esc(q.gloss)}</div>` : ''}${nt ? `<div><i>뜻</i>${nt}</div>` : ''}${src ? `<div><i>기출</i>${src}</div>` : ''}<div><i>해석</i>${esc(q.tr)}</div></div>`;
  }
  box.innerHTML = h;
  ks.forEach(k => { const inp = $app.querySelector(`input[data-id="${q.id + k}"]`); if (inp) { inp.classList.remove('ok', 'bad'); inp.classList.add(res[k] ? 'ok' : 'bad'); } });
}

/* ---------- 1차 (우리말 해석 있음) / 2차 (해석 없음) ---------- */
function finGl(){ try { return localStorage.getItem('pif_fin_gloss') !== '0'; } catch(e){ return true; } }
function finGlBar(){ const on = finGl();
  return `<div class="glbar"><span>요약문 우리말 해석</span><button class="${on ? 'on' : ''}" data-gl="1">1차 · 해석 있음</button><button class="${on ? '' : 'on'}" data-gl="0">2차 · 해석 없음</button></div>`; }
function finGlBind(){ $app.classList.toggle('nogl', !finGl());
  $app.querySelectorAll('[data-gl]').forEach(b => b.onclick = () => { try { localStorage.setItem('pif_fin_gloss', b.dataset.gl); } catch(e){}
    $app.querySelectorAll('[data-gl]').forEach(x => x.classList.toggle('on', x.dataset.gl === b.dataset.gl)); $app.classList.toggle('nogl', b.dataset.gl === '0');
    toast(b.dataset.gl === '1' ? '1차 · 요약문 해석을 보여 줘요.' : '2차 · 요약문 해석 없이 풀어요.'); }); }
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
    h += finGlBar();
    h += list.map(q => finQ(q, q.no, mode === 'wrong' ? {} : d.ans, { check: true, gloss: true, pts })).join('');
    h += `<div class="sticky"><button class="b main" id="ckAll">모두 확인</button><a class="b" href="#/fin/${sid}/${R.r}">회차 화면으로</a></div>`;
  }
  $app.innerHTML = h; scrollTo(0, 0); finGlBind();
  if (mode !== 'wrong') list.forEach(q => { const ks = Object.keys(q.bl); if (ks.some(k => (q.id + k) in d.st)) { const res = {}; ks.forEach(k => res[k] = d.st[q.id + k] === 1); finFeedback(q, res, true); } });
  const check = qid => { const q = R.qs.find(x => x.id === qid), res = {}; let any = false;
    Object.keys(q.bl).forEach(k => { const inp = $app.querySelector(`input[data-id="${qid + k}"]`), v = inp.value; if (v.trim()) any = true;
      res[k] = finOk(q, k, v); d.ans[qid + k] = v; d.st[qid + k] = res[k] ? 1 : 0; if (v.trim() && !res[k]) { d.wc = d.wc || {}; d.wc[qid + k] = (d.wc[qid + k] || 0) + 1; } });
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
  h += finGlBar();
  (re ? otwShuffle(R.qs, r) : R.qs).forEach((q, i) => h += finQ(q, i + 1, {}, { check: false, gloss: true, pts }));
  h += `<div class="sticky"><button class="b main" id="grade">채점하기</button></div>`;
  $app.innerHTML = h; scrollTo(0, 0); finGlBind();
  $app.querySelectorAll('input.blank').forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const all = [...$app.querySelectorAll('input.blank')], nx = all[all.indexOf(inp) + 1]; if (nx) nx.focus(); } });
  document.getElementById('grade').onclick = finGrade;
}
async function finGrade(){
  const { sid, R, set, seed } = FT, u = finU(sid, R.r);
  const empty = [...$app.querySelectorAll('input.blank')].filter(x => !x.value.trim()).length;
  if (empty && !confirm(`아직 비어 있는 칸이 ${empty}개 있어요. 그래도 채점할까요?`)) return;
  const items = {}, ans = {};
  R.qs.forEach(q => { const res = {}; Object.keys(q.bl).forEach(k => { const v = $app.querySelector(`input[data-id="${q.id + k}"]`).value; res[k] = finOk(q, k, v); items[q.id + k] = res[k] ? 1 : 0; ans[q.id + k] = v; }); finFeedback(q, res, false); });
  $app.querySelectorAll('input').forEach(x => x.disabled = true); $app.querySelectorAll('[data-gl]').forEach(x => x.disabled = true);
  const score = finScore(R, items), passed = score >= finPass();
  const tu = u + '-test', d = data(tu), list = (d.attempts || []).concat([{ at: Date.now(), set, score, passed, items, ans, seed, gl: finGl() ? 1 : 0 }]).slice(-12);
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

/* ---------- 누적 오답 테스트 (#/fin/cum/s2[/done]) ---------- */
let FC = null;
function finCum(sid, sub){
  const S = finSeason(sid), { out, gone } = finPool(S.id), cd = data('fin-cum'); cd.rm = cd.rm || {};
  let h = `<div class="top"><button onclick="location.hash='#/'">‹ 로드맵</button><div class="t">누적 오답 테스트 · ${esc(S.name)}</div></div>`;
  if (sub === 'done') {
    h += `<div class="note">완성해서 뺀 문항이에요. 다시 헷갈리면 <b>다시 넣기</b>를 눌러 누적 테스트에 넣어요.</div>` + (gone.length ? gone.map(it => `<div class="q fcrow"><span class="qn">${esc(it.S.name)} ${it.R.r}회 ${it.q.no}번</span>
      <span class="s"><b>${Object.keys(it.q.bl).sort().map(k => esc(it.q.key[k].w)).join(' · ')}</b> <span class="muted">· 틀린 횟수 ${it.n}</span></span><button class="b sm" data-back="${it.key}">다시 넣기</button></div>`).join('') : '<div class="banner ok">뺀 문항이 없어요.</div>')
      + `<div class="sticky"><a class="b main" href="#/fin/cum/${sid}">누적 오답 테스트로</a></div>`;
    $app.innerHTML = h; scrollTo(0, 0);
    $app.querySelectorAll('[data-back]').forEach(b => b.onclick = async () => { delete cd.rm[b.dataset.back]; b.disabled = true; await save('fin-cum', cd, {}); toast('누적 테스트에 다시 넣었어요.'); finCum(sid, 'done'); });
    return;
  }
  if (!out.length) { $app.innerHTML = h + `<div class="banner ok">남은 누적 오답이 없어요. 잘했어요!</div><div class="row"><a class="b main" href="#/">로드맵으로</a>${gone.length ? `<a class="b" href="#/fin/cum/${sid}/done">뺀 단어 ${gone.length}개</a>` : ''}</div>`; scrollTo(0, 0); return; }
  const list = otwShuffle(out.slice(0, 20), rnd(Date.now() % 100000));
  FC = { sid, list };
  h += `<div class="note">지난 시즌에서 자주 틀린 <b>${out.length}문항</b> 중 많이 틀린 순서로 <b>${list.length}문항</b>을 섞었어요. 다 쓰고 <b>채점하기</b>를 누르면 정답·해설이 보여요. 그다음 <b>완성한 문항만 골라 빼요.</b></div>`;
  h += finGlBar();
  list.forEach((it, i) => h += finQ(it.q, i + 1, {}, { check: false, gloss: true, pts: finPts(it.R), tag: `${it.S.name} · ${it.R.r}회 ${it.q.no}번 · 틀린 횟수 ${it.n}`, pfx: it.key }).replace(/data-id="(q\d\dX?[A-DX]?)"/g, `data-id="${it.key}|$1"`).replace(`data-q="${it.q.id}"`, `data-q="${it.key}"`));
  h += `<div class="sticky"><button class="b main" id="cumGrade">채점하기</button><a class="b" href="#/">나가기</a></div>`;
  $app.innerHTML = h; scrollTo(0, 0); finGlBind();
  $app.querySelectorAll('input.blank').forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const all = [...$app.querySelectorAll('input.blank')], nx = all[all.indexOf(inp) + 1]; if (nx) nx.focus(); } });
  document.getElementById('cumGrade').onclick = finCumGrade;
}
async function finCumGrade(){
  const { sid, list } = FC, cd = data('fin-cum'); cd.rm = cd.rm || {};
  const empty = [...$app.querySelectorAll('input.blank')].filter(x => !x.value.trim()).length;
  if (empty && !confirm(`아직 비어 있는 칸이 ${empty}개 있어요. 그래도 채점할까요?`)) return;
  const g = document.getElementById('cumGrade'); g.disabled = true; g.textContent = '저장하는 중…';
  let okN = 0; const byU = {};
  list.forEach(it => { const q = it.q, res = {}, u = finU(it.S.id, it.R.r) + '-p';
    const pd = byU[u] || (byU[u] = Object.assign({}, data(u), { R: it.R })); pd.st = Object.assign({}, pd.st || {}); pd.wc = Object.assign({}, pd.wc || {});
    Object.keys(q.bl).forEach(k => { const inp = $app.querySelector(`input[data-id="${it.key}|${q.id + k}"]`), v = inp.value; res[k] = finOk(q, k, v);
      pd.st[q.id + k] = res[k] ? 1 : 0; if (!res[k]) pd.wc[q.id + k] = (pd.wc[q.id + k] || 0) + 1;
      inp.classList.remove('ok', 'bad'); inp.classList.add(res[k] ? 'ok' : 'bad'); inp.disabled = true; });
    const all = Object.values(res).every(Boolean); if (all) okN++;
    const card = $app.querySelector(`[data-q="${it.key}"]`); card.setAttribute('data-q', q.id); finFeedback(q, res, true); card.setAttribute('data-q', it.key);
    card.querySelector('.fbx').insertAdjacentHTML('beforeend', `<label class="fdone ${all ? 'ok' : ''}"><input type="checkbox" data-rm="${it.key}"> <b>완성!</b> 이 문항은 확실히 외웠어요 · 목록에서 빼기</label>`); });
  for (const [u, pd] of Object.entries(byU)) { const R = pd.R; delete pd.R; P[u] = Object.assign({}, P[u], { data: pd });
    await save(u, pd, { score: finScore(R, pd.st), max: 100, completed: R.qs.every(q => Object.keys(q.bl).some(k => (q.id + k) in pd.st)) }); }
  cd.hist = (cd.hist || []).concat([{ at: Date.now(), sid, n: list.length, ok: okN }]).slice(-30);
  await save('fin-cum', cd, {});
  $app.querySelectorAll('[data-gl]').forEach(x => x.disabled = true);
  $app.querySelector('.note').insertAdjacentHTML('afterend', `<div class="banner ${okN === list.length ? 'ok' : 'no'}">${list.length}문항 중 <b>${okN}문항</b>을 모두 맞혔어요. 확실히 외운 문항에 <b>완성!</b>을 체크하고 맨 아래 <b>저장</b>을 눌러요.</div>`);
  g.parentElement.innerHTML = `<button class="b" id="cumAll" type="button">맞힌 문항 모두 체크</button><button class="b main" id="cumRm" type="button">체크한 문항 빼고 저장</button>`;
  document.getElementById('cumAll').onclick = () => $app.querySelectorAll('.fdone.ok input').forEach(x => x.checked = true);
  document.getElementById('cumRm').onclick = async () => { const ks = [...$app.querySelectorAll('[data-rm]:checked')].map(x => x.dataset.rm);
    const b = document.getElementById('cumRm'); b.disabled = true; ks.forEach(k => cd.rm[k] = Date.now()); await save('fin-cum', cd, {});
    toast(ks.length ? `${ks.length}문항을 완성 목록으로 뺐어요.` : '빼지 않고 저장했어요.'); location.hash = '#/'; };
  scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- 라우터 (#/fin/s1/3[/practice | /test | /retest | /result | /wrong] · #/fin/cum/s2[/done]) ---------- */
function finRoute(parts){
  if (!FULL) { location.hash = '#/'; return; }
  if (parts[0] === 'cum') return finCum(parts[1], parts[2]);
  const [sid, r, sub] = parts, R = finRound(sid, r);
  if (!R) { location.hash = '#/'; return; }
  if (sub === 'practice') return finPractice(sid, R, 'practice');
  if (sub === 'wrong') return finPractice(sid, R, 'wrong');
  if (sub === 'test') return finTest(sid, R, 'main');
  if (sub === 'retest') return finTest(sid, R, 're');
  if (sub === 'result') return finResult(sid, R);
  finRoundPage(sid, R);
}
