/* 관리자 · 어휘요약문 로드맵 STEP 2 ON THE WAY (데이터 /ydvoca/otw.js)
   진도 unit: s1d1-p (연습: st 맞음1/틀림0), s1d1-test (리뷰 테스트 attempts·best·passed·paper) — 통과 = Part 1 70% 이상 */
const OTWA = (window.OTW && window.OTW.seasons) || [];
const otwaN = D => [D.p1.length, D.p2.reduce((a, g) => a + g.items.length, 0), D.p3.reduce((a, g) => a + g.items.length, 0)];
const otwaNeed = D => Math.ceil(D.p1.length * ((window.OTW && window.OTW.pass1) || .7) - 1e-9);
function otwaCell(rows, sid, D){
  const u = sid + 'd' + D.d, t = rows.find(r => r.course === 'ydvoca' && r.unit_id === u + '-test'), p = rows.find(r => r.course === 'ydvoca' && r.unit_id === u + '-p');
  const d = (t && t.data) || {}, st = ((p && p.data) || {}).st || {}, n = otwaN(D), tot = n[0] + n[1] + n[2];
  const done = Object.keys(st).length, wrong = Object.values(st).filter(x => x === 0).length, att = (d.attempts || []).length + (d.paper || []).length;
  return { d, done, wrong, att, tot, n, last: [t, p].filter(Boolean).map(x => x.updated_at).sort().pop() };
}
/* 어휘요약문 로드맵 탭 — 반 전체 표 + 자료 */
function otwAdminH(S, per){
  if (!OTWA.length) return '';
  const S1 = OTWA[0];
  let h = `<h3 style="margin:30px 0 6px;font-size:18px">STEP 2 · 온더웨이 ON THE WAY <small class="muted" style="font-weight:500;font-size:13px">Day 1~7 · 통과 = Part 1 동의어·반의어 70% 이상 (14/20) · 점수 = 맞은 개수 100점 환산</small></h3>`;
  h += `<div class="kpis" style="grid-template-columns:repeat(7,1fr)">${S1.days.map(D => `<div class="kpi"><small>Day ${D.d} 통과</small><b>${S.filter(s => otwaCell(per(s), S1.id, D).d.passed).length}<i> / ${S.length}</i></b></div>`).join('')}</div>`;
  h += `<div class="tw"><table><tr><th>이름</th>${S1.days.map(D => `<th>Day ${String(D.d).padStart(2, '0')}</th>`).join('')}<th>종이 시험</th></tr>`;
  S.forEach(s => { const rows = per(s);
    h += `<tr><td><b>${esc(s.name)}</b> <span class="muted">${esc(s.last4)}</span></td>` + S1.days.map(D => { const c = otwaCell(rows, S1.id, D), b = c.d.best;
      return `<td>${c.d.passed ? '<span class="ok">통과</span>' : c.att ? '<span class="warn" style="margin:0">재시험</span>' : '<span class="muted">미응시</span>'}${b ? ` <b>${b.score}</b><span class="muted">점</span>` : ''}
        <div class="muted" style="font-size:11.5px;margin-top:3px">${b ? `P1 ${b.c[0]}/${c.n[0]} · ` : ''}연습 ${c.done}/${c.tot}${c.wrong ? ` · 오답 ${c.wrong}` : ''}</div></td>`; }).join('')
      + `<td><button class="btn sm sec" data-otwpaper="${s.id}">점수 입력</button></td></tr>`; });
  h += `</table></div><div class="note">연습은 칸마다 채점한 개수, 오답은 지금 틀린 채로 남은 문항 수예요(연습·앱 시험 결과 모두 반영). 종이 시험 점수는 Part별 맞은 개수로 넣으면 100점 환산·통과가 자동 계산돼요.</div>`;
  h += `<div class="sec2" style="margin-top:12px"><b>온더웨이 자료</b> <span class="muted">시험지는 학생도 받을 수 있고, 정답지는 선생님만 받아요.</span>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"><button class="btn sm sec" data-otwdl="otw-book" data-nm="On_The_Way_교재">교재 전체</button>
    ${S1.days.map(D => `<span style="display:inline-flex;gap:3px"><button class="btn sm sec" data-otwdl="otw-t${D.d}" data-nm="On_The_Way_REVIEW_TEST_Day${D.d}">Day ${D.d} 시험지</button><button class="btn sm" data-otwdl="otw-a${D.d}" data-nm="On_The_Way_REVIEW_TEST_Day${D.d}_정답">정답</button></span>`).join('')}</div></div>`;
  return h;
}
function otwAdminBind(){
  document.querySelectorAll('[data-otwpaper]').forEach(b => b.onclick = () => otwPaper(D.students.find(x => x.id === b.dataset.otwpaper)));
  document.querySelectorAll('[data-otwdl]').forEach(b => b.onclick = async () => { b.disabled = true;
    try { await VT.download(b.dataset.otwdl, 'full', b.dataset.nm + '.pdf'); } catch(e){ toast(e.code === 'NO_FILE' ? '아직 올라가지 않은 파일이에요.' : '내려받지 못했어요.'); }
    b.disabled = false; });
}
function otwPaper(s){
  const S1 = OTWA[0];
  $('drawer').innerHTML = `<button class="x" onclick="closeDrawer()">✕</button><h2>${esc(s.name)} · 온더웨이 종이 시험</h2>
    <div class="note">수업에서 종이로 본 리뷰 테스트의 Part별 맞은 개수를 넣어요. Part 1이 70% 이상이면 통과로 기록되고, 점수는 100점으로 환산돼요.</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0">
      <label>Day<select id="opD" style="width:100%">${S1.days.map(D => `<option value="${D.d}">Day ${String(D.d).padStart(2, '0')}</option>`).join('')}</select></label>
      <label>Part 1 <span class="muted" id="opN1"></span><input id="op1" type="number" min="0" style="width:100%"></label><label>Part 2 <span class="muted" id="opN2"></span><input id="op2" type="number" min="0" style="width:100%"></label><label>Part 3 <span class="muted" id="opN3"></span><input id="op3" type="number" min="0" style="width:100%"></label></div>
    <button class="btn w" id="opGo">저장</button>`;
  $('drawer').hidden = false; $('scrim').hidden = false;
  const day = () => S1.days.find(D => D.d === +$('opD').value), showN = () => { const n = otwaN(day()); [1, 2, 3].forEach(k => $('opN' + k).textContent = '/ ' + n[k - 1]); };
  $('opD').onchange = showN; showN();
  $('opGo').onclick = async () => { const D = day(), n = otwaN(D), v = [1, 2, 3].map(k => Number($('op' + k).value));
    if ([1, 2, 3].some(k => $('op' + k).value === '') || v.some((x, i) => !(Number.isInteger(x) && x >= 0 && x <= n[i]))) return toast('Part별 맞은 개수를 문항 수 안에서 모두 넣어 주세요.');
    $('opGo').disabled = true;
    const { error } = await SB.rpc('vt_staff_otw_paper', { p_student: s.id, p_unit: S1.id + 'd' + D.d + '-test', p_c1: v[0], p_c2: v[1], p_c3: v[2], p_n1: n[0], p_n2: n[1], p_n3: n[2] });
    $('opGo').disabled = false;
    if (error) return toast(errMsg(error));
    toast(v[0] >= otwaNeed(D) ? '저장했어요 · 통과' : '저장했어요 · 재시험'); closeDrawer(); load(); };
}
/* 학생 상세 */
function otwStudentH(rows){
  if (!OTWA.length) return '';
  const S1 = OTWA[0];
  return `<div class="sec" style="--c:var(--yd)"><h3><i></i>온더웨이 ON THE WAY <small>Day 1~7 · 통과 = Part 1 70% 이상 · 점수 100점 환산</small></h3>
    <table class="mini"><tr><th>Day</th><th>테스트</th><th>최고 P1·P2·P3</th><th>점수</th><th>응시</th><th>연습</th><th>오답</th><th>최근</th></tr>${S1.days.map(D => { const c = otwaCell(rows, S1.id, D), b = c.d.best, pp = (c.d.paper || []).length;
      return `<tr><td><b>Day ${String(D.d).padStart(2, '0')}</b></td><td>${c.d.passed ? '<span class="ok">통과</span>' : c.att ? '<span class="warn">재시험</span>' : '<span class="muted">미응시</span>'}</td>
        <td>${b ? `${b.c[0]}/${c.n[0]} · ${b.c[1]}/${c.n[1]} · ${b.c[2]}/${c.n[2]}` : '—'}</td><td>${b ? `<b>${b.score}</b>` : '—'}</td><td>${(c.d.attempts || []).length}회${pp ? ` <span class="muted">+ 종이 ${pp}</span>` : ''}</td>
        <td>${c.done}/${c.tot}</td><td>${c.wrong || '—'}</td><td class="muted">${c.last ? ago(c.last) : '—'}</td></tr>`; }).join('')}</table></div>`;
}
/* AI 리포트용 요약 */
function otwReport(rows, inP, p, mark){
  if (!OTWA.length) return null;
  const S1 = OTWA[0];
  return S1.days.map(D => { const c = otwaCell(rows, S1.id, D), at = c.d.attempts || []; at.forEach(a => mark(a.at));
    return { Day: D.d, 통과: !!c.d.passed, 최고점: c.d.best ? `${c.d.best.score}점 (Part1 ${c.d.best.c[0]}/${c.n[0]})` : '미응시', 연습: `${c.done}/${c.tot}`, 남은오답: c.wrong,
      기간내_응시: at.filter(a => inP(a.at, p)).map(a => `${a.set === 're' ? '재시험' : '1차'} ${a.score}점${a.passed ? ' 통과' : ''}`) }; });
}
