/* 관리자 · 내신 동형모의고사 (NX: /naesin/nx-core.js)
   반 고르기 → 확인 요청(서답형 학생 판정) · 점수표 · 문항 정답률 · 남은 오답 · 시험 배정/공개 */
const NXA = { cls: localStorage.getItem('pifhub_admin_nxcls') || '', ex: '' };
async function renderNX(){
  const has = a => (a || []).includes('naesin');
  const cls = D.classes.filter(c => has(c.courses) || D.students.some(s => s.class_code === c.code && has(s.courses)));
  $('body').innerHTML = '<div class="empty">불러오는 중…</div>';
  const exr = await SB.from('hub_mock_exams').select('*').order('sort');
  const EX = exr.data || [];
  if (!cls.length) { $('body').innerHTML = `<div class="empty">아직 내신 동형모의고사가 열린 반이 없어요.<br><span class="muted">반·수강 관리에서 반의 수강 코스에 <b>내신 동형모의고사</b>를 켜 주세요.</span></div>` + nxManageH(EX, D.classes); nxBindManage(EX); return; }
  if (!cls.some(c => c.code === NXA.cls)) NXA.cls = cls[0].code;
  const c0 = cls.find(c => c.code === NXA.cls), S = D.students.filter(s => s.class_code === NXA.cls && has(coursesOf(s))), ids = S.map(s => s.id);
  const EXc = EX.filter(e => (e.classes || []).includes(NXA.cls));
  if (!EXc.some(e => e.id === NXA.ex)) NXA.ex = (EXc[0] || {}).id || '';
  const [pr, rv] = ids.length ? await Promise.all([
    SB.from('vt_progress').select('student_id,unit_id,data,score,updated_at').eq('course', 'naesin').in('student_id', ids),
    SB.from('hub_mock_reviews').select('student_id,exam_id,key,ok').in('student_id', ids)
  ]) : [{ data: [] }, { data: [] }];
  const R = (pr.data || []).map(r => (r.data = NX.fix(r.data), r)), REV = {}; (rv.data || []).forEach(r => REV[r.key] = r.ok);
  const per = s => R.filter(r => r.student_id === s.id), rowOf = (s, id) => R.find(r => r.student_id === s.id && r.unit_id === 'mk-' + id);
  const exT = id => { const e = EX.find(x => x.id === id); return e ? ((/(\d+)회/.exec(e.title) || [])[1] || '') + '회' : id; };
  /* 확인 요청 */
  const Q = [];
  S.forEach(s => per(s).forEach(r => { const id = r.unit_id.slice(3); Object.keys(r.data.cl).forEach(cid => { if (!(cid in REV)) Q.push({ s, id, cid, c: r.data.cl[cid] }); }); }));
  Q.sort((a, b) => b.c.at - a.c.at);
  const notesOf = s => NX.notes(per(s), REV, true);
  const totSA = S.reduce((a, s) => a + notesOf(s).filter(x => x.key[0] === 's').length, 0);
  let h = `<div class="bar"><select id="nxCls">${cls.map(c => `<option value="${esc(c.code)}" ${c.code === NXA.cls ? 'selected' : ''}>${esc(c.name)} · ${esc(c.code)}</option>`).join('')}</select><span class="sp" style="flex:1"></span><button class="btn sm sec" id="nxRe">새로고침</button></div>
    <div class="kpis" style="grid-template-columns:repeat(4,1fr)"><div class="kpi"><small>학생</small><b>${S.length}명</b></div><div class="kpi"><small>이 반 시험</small><b>${EXc.length}회</b></div>
    <div class="kpi"><small>확인 요청 대기</small><b>${Q.length}건</b></div><div class="kpi"><small>남은 서답형 오답 (반 전체)</small><b>${totSA}</b></div></div>`;
  h += `<h3 style="margin:22px 0 6px;font-size:17px">서답형 확인 요청 <span class="muted" style="font-size:12.5px;font-weight:500">학생이 "내 답도 맞다"고 요청한 답 · 인정하면 점수와 오답노트에 반영돼요</span></h3>`;
  h += Q.length ? `<div class="tw"><table><tr><th>학생</th><th>문항</th><th>학생 답</th><th>정답</th><th style="width:150px"></th></tr>${Q.map((q, i) => `<tr><td><b>${esc(q.s.name)}</b><br><span class="muted">${new Date(q.c.at).toLocaleString('ko-KR')}</span></td>
      <td>${exT(q.id)} ${NX.label(q.c.k)}</td><td>${(q.c.a || []).map(esc).join('<br>')}</td><td class="ok" style="font-weight:600">${(q.c.c || []).map(esc).join('<br>')}</td>
      <td><button class="btn sm" data-rv="${i}|1">인정</button> <button class="btn sm red" data-rv="${i}|0">오답</button></td></tr>`).join('')}</table></div>`
    : '<div class="muted" style="font-size:13px">대기 중인 요청이 없어요.</div>';
  /* 점수표 */
  h += `<h3 style="margin:28px 0 6px;font-size:17px">점수 · 남은 오답 <span class="muted" style="font-size:12.5px;font-weight:500">실전 최고점 (실전을 안 봤으면 최근 부분 풀이 점수) · 남은 오답은 다른 날 다시 맞히거나 학생이 직접 빼면 줄어요</span></h3>
    <div class="tw"><table><tr><th>이름</th>${EXc.map(e => `<th>${exT(e.id)}</th>`).join('')}<th>남은 오답<br><span class="muted" style="font-weight:500">서답 · 객관</span></th><th>최근</th><th></th></tr>`;
  S.forEach(s => { const N = notesOf(s), last = per(s).map(r => r.updated_at).sort().pop();
    h += `<tr><td><b>${esc(s.name)}</b> <span class="muted">${esc(s.last4 || '')}</span></td>${EXc.map(e => { const r = rowOf(s, e.id); if (!r || !r.data.att.length) return '<td class="muted">—</td>';
      const b = NX.best(r.data, REV), la = r.data.att[r.data.att.length - 1];
      return `<td>${b != null ? `<b>${b}</b>` : `<span class="muted">${({ mc: '객', sa: '서' })[la.mode] || ''} ${NX.attScore(r.data, la, REV)}/${la.mx}</span>`}<br><span class="muted" style="font-size:11.5px">${r.data.att.length}회 풀이</span></td>`; }).join('')}
      <td><b>${N.filter(x => x.key[0] === 's').length}</b> · ${N.filter(x => x.key[0] === 'm').length}</td><td class="muted">${last ? new Date(last).toLocaleDateString('ko-KR') : '—'}</td>
      <td><button class="btn sm sec" data-nxprint="${s.id}" ${N.length ? '' : 'disabled'}>오답 시험지</button></td></tr>`; });
  h += '</table></div>';
  /* 문항 정답률 */
  if (EXc.length) {
    const e = EXc.find(x => x.id === NXA.ex), rs = S.map(s => rowOf(s, NXA.ex)).filter(Boolean);
    const cell = k => { let n = 0, ok = 0; rs.forEach(r => { const L = r.data.ev[k]; if (!L || !L.length) return; n++; const v = L[0][1] === 2 ? (REV[L[0][2]] === false ? 0 : 1) : L[0][1]; ok += v; });
      return { n, p: n ? Math.round(ok / n * 100) : null }; };
    const row = (pre, cnt) => Array.from({ length: cnt }, (_, i) => { const k = pre + (i + 1), c = cell(k), col = c.p == null ? '#EEF0F5' : c.p >= 80 ? '#4E9A72' : c.p >= 50 ? '#E3A23B' : '#D0533F';
      return `<div title="${NX.label(k)} · 처음 풀 때 ${c.n}명 중 ${c.p == null ? '-' : c.p + '%'} 정답" style="background:${col};color:${c.p == null ? '#999' : '#fff'};border-radius:8px;padding:6px 0;text-align:center;font-size:12px;font-weight:700">${i + 1}<br><span style="font-weight:500;font-size:11px">${c.p == null ? '—' : c.p + '%'}</span></div>`; }).join('');
    h += `<h3 style="margin:28px 0 6px;font-size:17px">문항 정답률 <span class="muted" style="font-size:12.5px;font-weight:500">학생마다 처음 풀었을 때 기준 · 초록 80%↑ · 주황 50%↑ · 빨강 50% 미만</span></h3>
      <div class="bar"><select id="nxEx">${EXc.map(x => `<option value="${esc(x.id)}" ${x.id === NXA.ex ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select><span class="muted">${rs.length}명 기록</span></div>
      <div style="font-weight:700;font-size:13px;margin:6px 0">객관식</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:5px">${row('m', e.n_mc || 18)}</div>
      <div style="font-weight:700;font-size:13px;margin:12px 0 6px">서답형</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:5px">${row('s', e.n_sa || 10)}</div>`;
  }
  h += nxManageH(EX, cls);
  $('body').innerHTML = h;
  $('nxCls').onchange = e => { NXA.cls = e.target.value; localStorage.setItem('pifhub_admin_nxcls', NXA.cls); renderNX(); };
  $('nxRe').onclick = renderNX;
  if ($('nxEx')) $('nxEx').onchange = e => { NXA.ex = e.target.value; renderNX(); };
  $('body').querySelectorAll('[data-rv]').forEach(b => b.onclick = async () => {
    const [i, ok] = b.dataset.rv.split('|'), q = Q[+i]; b.disabled = true;
    const { error } = await SB.from('hub_mock_reviews').upsert({ student_id: q.s.id, exam_id: q.id, key: q.cid, ok: ok === '1', by_email: STAFF && STAFF.email, at: new Date().toISOString() });
    if (error) { b.disabled = false; return toast('저장하지 못했어요: ' + error.message); }
    toast(ok === '1' ? '인정했어요.' : '오답으로 확인했어요.'); renderNX();
  });
  $('body').querySelectorAll('[data-nxprint]').forEach(b => b.onclick = async () => {
    const s = S.find(x => x.id === b.dataset.nxprint), N = notesOf(s); b.disabled = true; toast('시험지를 만드는 중…');
    try { const B = {}; await Promise.all([...new Set(N.map(x => x.ex))].map(async id => B[id] = await NX.fetchExam(id)));
      NX.printSheet(N.map(x => ({ exam: B[x.ex], key: x.key, n: x.st.wrong })), { name: s.name, title: '동형모의고사 누적 오답 테스트', teacher: true });
    } catch (e) { toast('시험지를 불러오지 못했어요.'); }
    b.disabled = false;
  });
  nxBindManage(EX);
}
/* 시험 배정 · 공개 */
function nxManageH(EX, cls){
  const C = D.classes.filter(c => cls.some(x => x.code === c.code) || EX.some(e => (e.classes || []).includes(c.code)));
  const loc = t => t ? new Date(new Date(t).getTime() + 9 * 3600000).toISOString().slice(0, 16) : '';
  return `<h3 style="margin:30px 0 6px;font-size:17px">시험 배정 · 공개 <span class="muted" style="font-size:12.5px;font-weight:500">체크한 반 학생에게만 보여요 · 공개를 끄면 숨겨져요 (기록은 남음) · 공개 시각을 정하면 그때부터 열려요</span></h3>
    <div class="tw"><table><tr><th>시험</th><th>배정 반</th><th>공개</th><th>공개 시각 (한국)</th><th></th></tr>${EX.map((e, i) => `<tr data-nxe="${i}"><td><b>${esc(e.title)}</b><br><span class="muted" style="font-size:12px">${esc(e.range_ko || e.range || '')}</span></td>
      <td>${C.map(c => `<label style="display:inline-flex;gap:4px;align-items:center;margin:0 10px 4px 0;font-size:13px;white-space:nowrap"><input type="checkbox" data-c="${esc(c.code)}" ${(e.classes || []).includes(c.code) ? 'checked' : ''}>${esc(c.name)}</label>`).join('')}</td>
      <td><input type="checkbox" data-act ${e.active ? 'checked' : ''}></td><td><input type="datetime-local" data-op value="${loc(e.opens_at)}" style="font-size:13px"></td>
      <td><button class="btn sm" data-save>저장</button></td></tr>`).join('')}</table></div>
    <p class="muted" style="font-size:12.5px;margin-top:8px">새 동형모의고사는 시험지 PDF · 정답 · 해설지를 Claude에게 주면 문항별로 변환해서 여기에 등록돼요.</p>`;
}
function nxBindManage(EX){
  document.querySelectorAll('[data-nxe]').forEach(tr => tr.querySelector('[data-save]').onclick = async () => {
    const e = EX[+tr.dataset.nxe], op = tr.querySelector('[data-op]').value;
    const up = { classes: [...tr.querySelectorAll('[data-c]')].filter(x => x.checked).map(x => x.dataset.c), active: tr.querySelector('[data-act]').checked,
      opens_at: op ? new Date(op + ':00+09:00').toISOString() : null, updated_at: new Date().toISOString() };
    const { error } = await SB.from('hub_mock_exams').update(up).eq('id', e.id);
    if (error) return toast('저장하지 못했어요: ' + error.message);
    toast('저장했어요.'); renderNX();
  });
}
