/* 관리자 · 어휘요약문 로드맵 STEP 3 FINALE (데이터 /ydvoca/finale.js)
   진도 unit: s1r1-p (연습: 빈칸별 맞음1/틀림0), s1r1-test (리뷰 테스트 attempts·best·passed·paper) — 통과 = 70점 이상 */
const FINA = (window.FIN && window.FIN.seasons) || [];
function finaCell(rows, sid, R){
  const u = sid + 'r' + R.r, t = rows.find(r => r.course === 'ydvoca' && r.unit_id === u + '-test'), p = rows.find(r => r.course === 'ydvoca' && r.unit_id === u + '-p');
  const d = (t && t.data) || {}, st = ((p && p.data) || {}).st || {};
  const done = R.qs.filter(q => Object.keys(q.bl).some(k => (q.id + k) in st)).length;
  const wrong = R.qs.filter(q => Object.keys(q.bl).some(k => st[q.id + k] === 0)).length;
  return { d, done, wrong, n: R.qs.length, att: (d.attempts || []).length + (d.paper || []).length, last: [t, p].filter(Boolean).map(x => x.updated_at).sort().pop() };
}
function finAdminH(S, per){
  if (!FINA.length) return '';
  const S1 = FINA[0];
  let h = `<h3 style="margin:30px 0 6px;font-size:18px">STEP 3 · 피날레 FINALE <small class="muted" style="font-weight:500;font-size:13px">${esc(S1.name)} · 100점 만점 · 문항당 5점 · 통과 = ${(window.FIN && window.FIN.pass) || 70}점 이상</small></h3>`;
  h += `<div class="kpis" style="grid-template-columns:repeat(7,1fr)">${S1.rounds.map(R => `<div class="kpi"><small>${R.r}회 통과</small><b>${S.filter(s => finaCell(per(s), S1.id, R).d.passed).length}<i> / ${S.length}</i></b></div>`).join('')}</div>`;
  h += `<div class="tw"><table><tr><th>이름</th>${S1.rounds.map(R => `<th>${R.r}회</th>`).join('')}<th>종이 시험</th></tr>`;
  S.forEach(s => { const rows = per(s);
    h += `<tr><td><b>${esc(s.name)}</b> <span class="muted">${esc(s.last4)}</span></td>` + S1.rounds.map(R => { const c = finaCell(rows, S1.id, R), b = c.d.best;
      return `<td>${c.d.passed ? '<span class="ok">통과</span>' : c.att ? '<span class="warn" style="margin:0">재시험</span>' : '<span class="muted">미응시</span>'}${b ? ` <b>${b.score}</b><span class="muted">점</span>` : ''}
        <div class="muted" style="font-size:11.5px;margin-top:3px">연습 ${c.done}/${c.n}${c.wrong ? ` · 오답 ${c.wrong}` : ''}</div></td>`; }).join('')
      + `<td><button class="btn sm sec" data-finpaper="${s.id}">점수 입력</button></td></tr>`; });
  h += `</table></div><div class="note">연습은 한 번이라도 채점한 문항 수, 오답은 지금 틀린 채로 남은 문항 수예요. 종이 시험은 채점한 점수(100점 만점, 0.5점 단위)를 넣으면 통과가 자동 계산돼요.</div>`;
  h += `<div class="sec2" style="margin-top:12px"><b>피날레 자료</b> <span class="muted">시험지는 학생도 받을 수 있고, 정답지는 선생님만 받아요.</span>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"><button class="btn sm sec" data-findl="fin-book" data-nm="FINALE_Season1_교재">교재 전체</button>
    ${S1.rounds.map(R => `<span style="display:inline-flex;gap:3px"><button class="btn sm sec" data-findl="fin-t${R.r}" data-nm="FINALE_REVIEW_TEST_Round${R.r}">${R.r}회 시험지</button><button class="btn sm" data-findl="fin-a${R.r}" data-nm="FINALE_REVIEW_TEST_Round${R.r}_정답">정답</button></span>`).join('')}</div></div>`;
  return h;
}
function finAdminBind(){
  document.querySelectorAll('[data-finpaper]').forEach(b => b.onclick = () => finPaper(D.students.find(x => x.id === b.dataset.finpaper)));
  document.querySelectorAll('[data-findl]').forEach(b => b.onclick = async () => { b.disabled = true;
    try { await VT.download(b.dataset.findl, 'full', b.dataset.nm + '.pdf'); } catch(e){ toast(e.code === 'NO_FILE' ? '아직 올라가지 않은 파일이에요.' : '내려받지 못했어요.'); }
    b.disabled = false; });
}
function finPaper(s){
  const S1 = FINA[0];
  $('drawer').innerHTML = `<button class="x" onclick="closeDrawer()">✕</button><h2>${esc(s.name)} · 피날레 종이 시험</h2>
    <div class="note">수업에서 종이로 본 리뷰 테스트 점수를 넣어요. 문항당 5점, 빈칸 2개 문항은 빈칸마다 2.5점이에요. 70점 이상이면 통과로 기록돼요.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0">
      <label>회차<select id="fpR" style="width:100%">${S1.rounds.map(R => `<option value="${R.r}">${R.r}회</option>`).join('')}</select></label>
      <label>점수 <span class="muted">/ 100</span><input id="fpS" type="number" min="0" max="100" step="0.5" style="width:100%"></label></div>
    <button class="btn w" id="fpGo">저장</button>`;
  $('drawer').hidden = false; $('scrim').hidden = false;
  $('fpGo').onclick = async () => { const v = Number($('fpS').value);
    if ($('fpS').value === '' || !(v >= 0 && v <= 100) || Math.round(v * 2) !== v * 2) return toast('0~100 사이 점수를 0.5점 단위로 넣어 주세요.');
    $('fpGo').disabled = true;
    const { error } = await SB.rpc('vt_staff_fin_paper', { p_student: s.id, p_unit: S1.id + 'r' + $('fpR').value + '-test', p_score: v });
    $('fpGo').disabled = false;
    if (error) return toast(errMsg(error));
    toast(v >= 70 ? '저장했어요 · 통과' : '저장했어요 · 재시험'); closeDrawer(); load(); };
}
function finStudentH(rows){
  if (!FINA.length) return '';
  const S1 = FINA[0];
  return `<div class="sec" style="--c:var(--yd)"><h3><i></i>피날레 FINALE <small>${esc(S1.name)} · 100점 만점 · 통과 70점 이상</small></h3>
    <table class="mini"><tr><th>회차</th><th>테스트</th><th>최고점</th><th>응시</th><th>연습</th><th>오답</th><th>최근</th></tr>${S1.rounds.map(R => { const c = finaCell(rows, S1.id, R), b = c.d.best, pp = (c.d.paper || []).length;
      return `<tr><td><b>${R.r}회</b></td><td>${c.d.passed ? '<span class="ok">통과</span>' : c.att ? '<span class="warn">재시험</span>' : '<span class="muted">미응시</span>'}</td>
        <td>${b ? `<b>${b.score}</b>` : '—'}</td><td>${(c.d.attempts || []).length}회${(c.d.attempts || []).some(a => a.gl === 0) ? ` <span class="muted">(2차 ${(c.d.attempts || []).filter(a => a.gl === 0).length})</span>` : ''}${pp ? ` <span class="muted">+ 종이 ${pp}</span>` : ''}</td>
        <td>${c.done}/${c.n}</td><td>${c.wrong || '—'}</td><td class="muted">${c.last ? ago(c.last) : '—'}</td></tr>`; }).join('')}</table></div>`;
}
function finReport(rows, inP, p, mark){
  if (!FINA.length) return null;
  const S1 = FINA[0];
  return S1.rounds.map(R => { const c = finaCell(rows, S1.id, R), at = c.d.attempts || []; at.forEach(a => mark(a.at));
    return { 회차: R.r, 통과: !!c.d.passed, 최고점: c.d.best ? `${c.d.best.score}점` : '미응시', 연습: `${c.done}/${c.n}`, 남은오답: c.wrong,
      기간내_응시: at.filter(a => inP(a.at, p)).map(a => `${a.set === 're' ? '재시험' : '1차'} ${a.score}점${a.passed ? ' 통과' : ''}`) }; });
}
