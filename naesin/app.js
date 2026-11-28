/* 내신 동형모의고사 — 학생 앱
   #/              시험 목록 + 누적 오답
   #/x/<id>/<mode> 풀기 (full 실전 50분 · mc 객관식만 · sa 서답형만)
   #/r/<id>/<i>    결과
   #/n             오답노트
   #/c/<type>/<scope> 누적 오답 테스트 (type: sa|mc|all · scope: all|<id>) */
'use strict';
const C = 'naesin', $app = document.getElementById('app'), esc = NX.esc, CIRC = NX.CIRC;
const ME = VT.me() || {};
let EXAMS = [], REV = {}, TIMER = null, LOADED = false;
const P = {};          // unit_id → row
/* 서답형 빈칸: 앞글자 칸 + 남은 글자 수만큼 네모 칸 */
function paintBox(inp){
  const v = inp.value.replace(/\s+/g, ''); if (v !== inp.value) inp.value = v;
  const cs = inp.parentNode.querySelectorAll('.c:not(.f)'), act = document.activeElement === inp;
  cs.forEach((c, j) => { c.textContent = v[j] || ''; c.classList.toggle('cur', act && j === Math.min(v.length, cs.length - 1)); });
}
['input', 'focusin', 'focusout', 'keyup', 'click'].forEach(t => document.addEventListener(t, ev => { const i = ev.target; if (i && i.matches && i.matches('.lbx input')) setTimeout(() => paintBox(i), 0); }, true));
function toast(t, ms){ const el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), ms || 2600); }
const getD = id => { const u = 'mk-' + id; if (!P[u]) P[u] = { unit_id: u, data: NX.blank() }; P[u].data = NX.fix(P[u].data); return P[u].data; };
const examOf = id => EXAMS.find(e => e.id === id);
const shortT = e => (e.title || '').replace(/^.*모의고사\s*/, '') || e.id;
const saveT = {};
function save(id, now){
  clearTimeout(saveT[id]);
  const go = async () => { const d = getD(id), b = NX.best(d, REV);
    try { await VT.save(C, 'mk-' + id, d, { score: b, max: b == null ? null : 100, completed: b != null }); }
    catch (e) { toast(e.message === 'TOO_LARGE' ? '기록이 너무 많아 저장하지 못했어요. 선생님께 알려 주세요.' : '저장하지 못했어요. 인터넷 연결을 확인해 주세요.'); } };
  if (now) return go(); saveT[id] = setTimeout(go, 700);
}
async function loadAll(){
  const [ex, pr, rv] = await Promise.all([
    VT.sb.from('hub_mock_exams').select('id,title,school,grade,sort,n_mc,n_sa,minutes,range,range_ko,closes_at').eq('active', true).order('sort'),
    VT.load(C).catch(() => []),
    VT.sb.from('hub_mock_reviews').select('exam_id,key,ok').eq('student_id', ME.sid)
  ]);
  EXAMS = ex.data || [];
  (pr || []).forEach(r => { P[r.unit_id] = r; r.data = NX.fix(r.data); });
  REV = {}; (rv.data || []).forEach(r => REV[r.key] = r.ok);
  LOADED = true;
}
const rows = () => Object.values(P).filter(r => /^mk-/.test(r.unit_id) && EXAMS.some(e => 'mk-' + e.id === r.unit_id));
const noteList = () => NX.notes(rows(), REV, true);
function stopTimer(){ if (TIMER) { clearInterval(TIMER); TIMER = null; } }

/* ---------- 라우터 ---------- */
async function route(){
  if (LEAVE) { try { LEAVE(true); } catch (x) {} LEAVE = null; }
  stopTimer(); document.querySelectorAll('.bar').forEach(b => b.remove()); $app.onclick = $app.oninput = $app.onchange = null;
  if (!LOADED) { try { await loadAll(); } catch (e) { $app.innerHTML = '<div class="empty">불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.</div>'; return; } }
  const h = location.hash.replace(/^#\/?/, '').split('/');
  scrollTo(0, 0);
  if (h[0] === 'x' && examOf(h[1])) return viewExam(h[1], h[2] || 'full');
  if (h[0] === 'r' && examOf(h[1])) return viewResult(h[1], +h[2]);
  if (h[0] === 'n') return viewNotes(h[1] || 'sa');
  if (h[0] === 'c') return viewCum(h[1] || 'sa', h[2] || 'all', h[3] === 'today');
  viewHome();
}
window.addEventListener('hashchange', route);

/* ---------- 처음 화면 ---------- */
const HOW = `<div class="e">HOW IT WORKS</div><h3>동형모의고사, 이렇게 공부해요</h3><ol>
  <li><b>세 가지로 풀 수 있어요</b><span><em>실전</em>(50분, 전체) · <em>객관식만</em> · <em>서답형만</em> 중 골라서 풀어요.</span></li>
  <li><b>서답형은 바로 채점 + 해설</b><span>서답형만 풀기에서는 한 문제씩 <em>정답 확인</em>을 누르면 채점과 해설이 바로 나와요. 빈칸은 <em>글자 수만큼 네모 칸</em>에 써요.</span></li>
  <li><b>틀린 문제는 오답노트로</b><span>틀린 문제는 자동으로 모여요. <em>서답형 오답만</em>, <em>객관식 오답만</em> 골라 다시 풀 수 있어요.</span></li>
  <li><b>졸업 조건</b><span>틀린 날이 아닌 <em>다른 날</em>에 다시 맞히면 오답노트에서 빠져요. 완전히 외운 문제는 <em>직접 빼기</em>도 돼요.</span></li>
  <li><b>내 답도 맞는 것 같으면</b><span>표현이 조금 다른 답은 <em>선생님 확인 요청</em>을 누르세요. 선생님이 인정하면 점수와 오답노트에 반영돼요.</span></li></ol>`;
function howPop(){
  const p = document.createElement('div'); p.className = 'pop';
  p.innerHTML = `<div class="box">${HOW}<button class="b main" style="width:100%;justify-content:center">알겠어요</button></div>`;
  p.onclick = e => { if (e.target === p || e.target.tagName === 'BUTTON') { p.remove(); try { localStorage.setItem('nx_notice_v1', '1'); } catch (x) {} } };
  document.body.appendChild(p);
}
function viewHome(){
  const N = noteList(), sa = N.filter(x => x.key[0] === 's').length, mc = N.length - sa, td = N.filter(x => x.st.last && x.st.last[0] === NX.today()).length;
  let h = `<div class="top"><a href="/learn/">‹ 내 학습</a><div class="t">NAESIN · MOCK EXAM</div></div>
  <div class="hero"><div class="e">내신 동형모의고사</div><h1>${esc(EXAMS[0] ? EXAMS[0].school + ' ' + (EXAMS[0].grade || '') + '학년' : '')} 내신 실전 대비</h1>
    <p>선생님이 올린 동형모의고사를 실전처럼 풀고, 틀린 문제는 다른 날 다시 맞힐 때까지 누적 테스트로 반복해요.</p>
    <button class="how" id="howB">이렇게 공부해요 ›</button></div>`;
  if (!EXAMS.length) { $app.innerHTML = h + '<div class="empty">아직 열린 동형모의고사가 없어요.<br>선생님이 시험을 올리면 여기에 나타나요.</div>'; bindHow(); return; }
  h += `<div class="card cum"><h2><i>REVIEW</i>누적 오답 테스트</h2>
    <p class="d">지금까지 틀린 문제만 모았어요. 틀린 날이 아닌 <b>다른 날</b> 다시 맞히면 빠지고, 다 외운 문제는 직접 뺄 수 있어요.</p>
    <div class="cnt"><div><i>서답형 오답</i><b>${sa}</b></div><div><i>객관식 오답</i><b>${mc}</b></div><div><i>전체</i><b>${N.length}</b></div></div>${td ? `<p class="d" style="margin:-4px 0 10px">오늘 이미 푼 ${td}문항은 다시 풀기에서 빠지고, 다른 날 다시 나와요.</p>` : ''}
    <div class="row"><a class="b ac" href="#/c/sa/all" ${sa ? '' : 'aria-disabled="true" style="opacity:.45;pointer-events:none"'}>서답형 오답 풀기</a>
      <a class="b main" href="#/c/mc/all" ${mc ? '' : 'aria-disabled="true" style="opacity:.45;pointer-events:none"'}>객관식 오답 풀기</a>
      <a class="b" href="#/n">오답노트 보기</a></div></div>
  <div class="sec"><b>EXAMS</b><span>회차를 골라 풀어요 · 실전은 ${esc(EXAMS[0].minutes || 50)}분</span></div><div class="grid">`;
  EXAMS.forEach((e, i) => {
    const d = getD(e.id), b = NX.best(d, REV), na = d.att.length, last = d.att[na - 1];
    const ne = N.filter(x => x.ex === e.id), nsa = ne.filter(x => x.key[0] === 's').length;
    const draft = ['full', 'mc', 'sa'].filter(m => DR.has(e.id, m)), half = d.att.some(a => a.mode === 'sa' && !a.x && Object.keys(a.a || {}).length < (e.n_sa || 10));
    h += `<div class="ex"><div class="h"><span class="n">${pad2(i + 1, e)}<small>회</small></span><span class="tt">${esc((e.title || '').replace(/\s*\d+회$/, ''))}</span></div>
      <div class="rg">${esc(e.range_ko || e.range || '')}</div>
      <div class="sc">${b != null ? `<span class="pill on">실전 최고 ${b}점</span>` : '<span class="pill">실전 미응시</span>'}${ne.length ? `<span class="pill ac">오답 ${ne.length}${nsa ? ` · 서답 ${nsa}` : ''}</span>` : na ? '<span class="pill ok">오답 없음</span>' : ''}
        ${draft.length || half ? `<span class="pill" style="background:#FFF4DD;color:#7A5300">이어 풀기 · ${(draft.length ? draft : ['sa']).map(m => MODE[m]).join(', ')}</span>` : ''}</div>
      <div class="bt"><a class="b main" href="#/x/${e.id}/full">실전<small>${esc(e.minutes || 50)}분 · 전체</small></a><a class="b" href="#/x/${e.id}/mc">객관식만<small>${e.n_mc || ''}문항</small></a><a class="b" href="#/x/${e.id}/sa">서답형만<small>바로 채점</small></a></div>
      ${last ? `<a class="last" href="#/r/${e.id}/${na - 1}">지난 결과 · <b>${({ full: '실전', mc: '객관식', sa: '서답형' })[last.mode] || ''} ${NX.attScore(d, last, REV)}</b>/${last.mx}점 · ${new Date(last.at).toLocaleDateString('ko-KR')} ›</a>` : ''}</div>`;
  });
  h += '</div>';
  $app.innerHTML = h; bindHow();
  try { if (!localStorage.getItem('nx_notice_v1')) howPop(); } catch (x) {}
}
function pad2(i, e){ const m = /(\d+)회/.exec(e.title || ''); return m ? m[1] : i; }
function bindHow(){ const b = document.getElementById('howB'); if (b) b.onclick = howPop; }

/* ---------- 문항 그리기 ---------- */
function qHead(q, key, extra){
  return `<div class="qh"><span class="qn">${key[0] === 'm' ? '객관식' : '서답형'} ${q.no}</span>${q.type ? `<span class="qt">${esc(q.type)}</span>` : ''}${extra || ''}<span class="qp">${q.pts}점</span></div>`;
}
const imgs = q => q.img.map(s => `<img src="${s}" alt="" loading="lazy">`).join('');
function mcOpts(a, lock, ans){
  return `<div class="opts">${CIRC.map((c, i) => { const v = i + 1, cls = lock ? (v === ans ? 'ok' : v === +a ? 'bad' : '') : (v === +a ? 'sel' : '');
    return `<button type="button" data-v="${v}" class="${cls}" ${lock ? 'disabled' : ''}>${c}</button>`; }).join('')}</div>`;
}
function saIns(q, a, res){
  a = a || []; const lock = !!res, P2 = res ? res.parts : [], cls = i => lock ? (P2[i] ? 'ok' : 'bad') : '';
  const D0 = lock ? 'disabled' : '', IA = 'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"';
  let h = '<div class="ins">';
  if (q.kind === 'blank') q.blanks.forEach((b, i) => {
    const full = String(a[i] || '');
    if (!b.first) { h += `<div class="r"><b>${NX.bk(b.k)}</b><input data-i="${i}" ${IA} class="${cls(i)}" value="${esc(full)}" placeholder="단어" ${D0}></div>`; return; }   // 영작: 원래 시험처럼 빈칸만
    const pre = b.first, n = Math.max(1, b.len - pre.length);
    const typed = (pre && full.toLowerCase().startsWith(pre.toLowerCase()) ? full.slice(pre.length) : full).slice(0, n);
    h += `<div class="r"><b>(${b.k})</b><div class="lbx ${cls(i)} ${b.len >= 13 ? 'sm' : ''}">${pre ? `<span class="c f">${esc(pre)}</span>` : ''}${Array.from({ length: n }, (_, j) => `<span class="c">${esc(typed[j] || '')}</span>`).join('')}
      <input data-i="${i}" data-pre="${esc(pre)}" maxlength="${n}" ${IA} value="${esc(typed)}" ${D0} aria-label="(${b.k}) ${b.len}글자${pre ? ', ' + esc(pre) + '로 시작' : ''}"></div></div>`; });
  else if (q.kind === 'fix') q.fix.forEach((_, i) => { const r = a[i] || [];
    h += `<div class="r"><b>${CIRC[i]}</b><input data-i="${i}" data-j="0" ${IA} value="${esc(r[0] || '')}" placeholder="틀린 부분" ${D0}><i>→</i><input data-i="${i}" data-j="1" ${IA} value="${esc(r[1] || '')}" placeholder="고친 것" ${D0}></div>`; });
  else q.wrong.forEach((_, i) => { const r = a[i] || [];
    h += `<div class="r"><b>오류 ${i + 1}</b><select data-i="${i}" data-j="0" ${D0}><option value="">번호</option>${CIRC.map((c, k) => `<option value="${k + 1}" ${+r[0] === k + 1 ? 'selected' : ''}>${c}</option>`).join('')}</select><input data-i="${i}" data-j="1" ${IA} value="${esc(r[1] || '')}" placeholder="틀린 단어" ${D0}></div>`; });
  return h + '</div>' + (q.kind === 'fix' ? '<div class="note" style="margin-top:8px">틀린 부분 4곳을 찾아 고쳐 쓰세요. 순서는 상관없어요.</div>' : '');
}
function readSA(card, q){
  if (q.kind === 'blank') return q.blanks.map((_, i) => { const el = card.querySelector(`.ins [data-i="${i}"]`); return el && el.value ? (el.dataset.pre || '') + el.value : ''; });
  const n = q.kind === 'fix' ? q.fix.length : q.wrong.length, out = [];
  for (let i = 0; i < n; i++) { const a = card.querySelector(`.ins [data-i="${i}"][data-j="0"]`), b = card.querySelector(`.ins [data-i="${i}"][data-j="1"]`);
    out.push([q.kind === 'wrong' ? (+a.value || '') : a.value, b.value]); }
  return out;
}
function expH(q, key){
  if (key[0] === 'm') return `<div class="exp"><div><i>정답</i><b>${CIRC[q.ans - 1]}</b>${q.note ? ` · ${esc(q.note)}` : ''}</div>${q.ex ? `<div class="tx">${esc(q.ex)}</div>` : ''}${q.src ? `<div style="font-size:12px;color:var(--ink2)">${esc(q.src)}</div>` : ''}</div>`;
  return `<div class="exp">${(q.ex || []).map(x => `<div><i>${esc(x[0])}</i><span class="tx">${esc(x[1])}</span></div>`).join('')}</div>`;
}
/* 채점 결과 상자 (서답형) */
function fbSA(q, res){
  const mark = res.ok ? 'ok' : res.got > 0 ? 'mid' : 'bad', parts = NX.parts(q), ans = NX.answerText(q);
  return `<div class="fb ${mark}"><b>${res.ok ? '정답이에요!' : res.got > 0 ? '부분 정답' : '아쉬워요'}</b> · ${res.got} / ${res.max}점<br>
    ${parts.map((p, i) => `${res.parts[i] ? '✓' : '✗'} ${esc(p)} <span class="ans">${esc(ans[i].replace(/^(\([A-Z]\)|정답)\s*/, ''))}</span>`).join('<br>')}</div>`;
}
function claimH(id, d, key, att){
  const c = Object.keys(d.cl).map(k => Object.assign({ id: k }, d.cl[k])).filter(c => c.k === key && (att ? c.t === att.at : true)).pop();
  if (c) { const r = REV[c.id]; return `<div class="claim">${r === true ? '<span class="tag yes">선생님 인정 ✓</span> 내 답을 정답으로 인정했어요.' : r === false ? '<span class="tag no">선생님 확인: 오답</span> 정답과 다시 비교해 보세요.' : '<span class="tag wait">선생님 확인 중</span> 선생님이 확인하면 반영돼요.'}</div>`; }
  return `<div class="claim">표현만 조금 다르고 내 답도 맞는 것 같나요? <button class="b sm gh" data-claim="${key}">선생님 확인 요청</button></div>`;
}
function doClaim(id, key, myA, res, attAt){
  const d = getD(id), q = NX.item(EXC[id], key), cid = key + '-' + Date.now().toString(36);
  const L = d.ev[key] || []; for (let i = L.length - 1; i >= 0; i--) if (L[i][1] === 0) { L[i] = [L[i][0], 2, cid]; break; }
  d.cl[cid] = { k: key, t: attAt || 0, g: NX.r1(res.max - res.got), a: NX.myText(q, myA), c: NX.answerText(q), at: Date.now() };
  const ks = Object.keys(d.cl); if (ks.length > 40) ks.slice(0, ks.length - 40).forEach(k => delete d.cl[k]);
  save(id, true); toast('선생님께 확인을 요청했어요.');
}
const EXC = {};   // id → 시험 묶음
async function bundle(id){ if (!EXC[id]) EXC[id] = await NX.fetchExam(id); return EXC[id]; }
function bundleErr(e){
  const m = { EXAM_LOCKED: '이 시험은 지금 열려 있지 않아요.', COURSE_LOCKED: '우리 반에서 열리지 않은 과정이에요.', NOT_LOGGED_IN: '다시 로그인해 주세요.' }[e && e.code];
  $app.innerHTML = `<div class="top"><a href="#/">‹ 목록</a></div><div class="empty">${m || '시험지를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'}</div>`;
}

/* ---------- 풀기 ---------- */
const dk = (id, mode) => `nx_dr_${ME.sid}_${id}_${mode}`;
const MODE = { full: '실전', mc: '객관식만', sa: '서답형만' };
/* 풀던 답(이어 풀기): 이 기기 + 서버(진도 data.dr)에 함께 저장 → 카톡 안 브라우저·다른 기기에서도 이어짐. 더 최근 것을 씀 */
const DR = {
  get(id, mode){ let l = null; try { l = JSON.parse(localStorage.getItem(dk(id, mode)) || 'null'); } catch (x) {}
    const sv = (getD(id).dr || {})[mode] || null; if (!l) return sv; if (!sv) return l; return (sv.up || 0) > (l.up || 0) ? sv : l; },
  put(id, mode, dr, now){ dr.up = Date.now(); try { localStorage.setItem(dk(id, mode), JSON.stringify(dr)); } catch (x) {}
    const d = getD(id); d.dr = d.dr || {}; d.dr[mode] = dr; save(id, now); },
  del(id, mode){ try { localStorage.removeItem(dk(id, mode)); } catch (x) {} const d = getD(id); if (d.dr) delete d.dr[mode]; },
  has(id, mode){ return !!DR.get(id, mode); }
};
let LEAVE = null;   // 화면을 떠날 때 (걸린 시간 저장)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && LEAVE) LEAVE(true); });
async function viewExam(id, mode){
  if (!MODE[mode]) mode = 'full';
  const e = examOf(id);
  $app.innerHTML = `<div class="top"><a href="#/">‹ 목록</a><div class="t">${esc(shortT(e))} · ${MODE[mode]}</div></div><div class="empty">시험지를 불러오는 중…</div>`;
  let ex; try { ex = await bundle(id); } catch (err) { return bundleErr(err); }
  if (location.hash !== `#/x/${id}/${mode}`) return;
  const keys = NX.keys(ex, mode === 'full' ? 'all' : mode), limit = (ex.minutes || e.minutes || 50) * 60000, d0 = getD(id);
  let dr = DR.get(id, mode), note = '';
  if (dr) note = `이어서 푸는 중이에요. ${mode === 'sa' ? '이미 확인한 문제는 접어 두었어요.' : '이미 고른 답은 그대로 있어요.'}`;
  else if (mode === 'sa') {   // 지난번 서답형만 풀기를 중간에 끝냈으면 → 남은 문항부터
    const last = d0.att.filter(a => a.mode === 'sa' && !a.x).pop(), done = last ? keys.filter(k => last.a[k] != null) : [];
    if (last && done.length && done.length < keys.length) {
      dr = { start: Date.now(), used: last.sec ? last.sec * 1000 : 0, a: {}, chk: {}, rec: done, from: last.at };
      done.forEach(k => { dr.chk[k] = { a: last.a[k], r: NX.gradeSA(NX.item(ex, k), last.a[k]) }; });
      last.x = 1;
      note = `지난번(${new Date(last.at).toLocaleDateString('ko-KR')})에 푼 ${done.length}문항은 접어 두고, 남은 ${keys.length - done.length}문항부터 이어서 풀어요.`;
    }
  }
  const fresh = !dr; if (!dr) dr = { start: Date.now(), used: 0, a: {}, chk: {} };
  dr.a = dr.a || {}; dr.chk = dr.chk || {}; if (dr.used == null) dr.used = 0;
  let t0 = Date.now(), over = false;
  const used = () => dr.used + (Date.now() - t0);
  const keep = now => { if (over) return; dr.used = used(); t0 = Date.now(); DR.put(id, mode, dr, now); };
  const touched = () => Object.keys(dr.chk).length || keys.some(k => NX.answered(k, dr.a[k]));
  if (!fresh) keep(true);
  LEAVE = now => { if (!over && touched()) keep(now); };
  let h = `<div class="top"><button id="quit">‹ 나가기</button><div class="t">${esc(shortT(e))} · ${MODE[mode]}</div></div>`;
  if (!fresh) h += `<div class="banner">${note} <button class="b sm" id="restart" style="margin-left:6px">처음부터 다시</button></div>`;
  if (mode === 'sa') h += '<div class="banner">한 문제씩 답을 쓰고 <b>정답 확인</b>을 누르면 바로 채점과 해설이 나와요. 중간에 나가도 확인한 문제는 남아 있어요. 다 풀면 아래 <b>끝내기</b>로 기록을 남겨요.</div>';
  if (mode === 'full') h += '<div class="banner">중간에 나가면 시계가 멈추고, 다시 들어오면 남은 시간부터 이어져요.</div>';
  h += `<div class="navs" id="navs"></div>`;
  const doneCard = (k, q, ck) => `<div class="q qd" id="q-${k}" data-key="${k}"><div class="qh"><span class="qn">서답형 ${q.no}</span>${q.type ? `<span class="qt">${esc(q.type)}</span>` : ''}<span class="pill ${ck.r.ok ? 'ok' : 'ac'}">${ck.r.ok ? '✓ 맞음' : ck.r.got > 0 ? '△ 부분 정답' : '✗ 틀림'} · ${ck.r.got}/${ck.r.max}</span></div>
    <details><summary>푼 문제 · 해설 다시 보기</summary>${imgs(q)}${saIns(q, ck.a, ck.r)}${fbSA(q, ck.r)}${expH(q, k)}${ck.r.ok ? '' : claimH(id, getD(id), k, null)}</details></div>`;
  ['mc', 'sa'].forEach(s => {
    const ks = keys.filter(k => k[0] === s[0]); if (!ks.length) return;
    const tot = NX.r1(ks.reduce((a, k) => a + NX.item(ex, k).pts, 0));
    h += `<div class="sh"><span class="k">${s === 'mc' ? 'PART 1' : 'PART 2'}</span><b>${s === 'mc' ? '객관식' : '서답형'}</b><span>${ks.length}문항 · ${tot}점</span></div>`;
    ks.forEach(k => { const q = NX.item(ex, k), a = dr.a[k], ck = mode === 'sa' && dr.chk[k];
      if (ck) { h += doneCard(k, q, ck); return; }
      h += `<div class="q" id="q-${k}" data-key="${k}">${qHead(q, k)}${imgs(q)}`;
      if (k[0] === 'm') h += mcOpts(a);
      else { h += saIns(q, a, null); if (mode === 'sa') h += '<div class="chk"><button class="b main sm" data-check>정답 확인</button></div>'; }
      h += '</div>'; });
  });
  $app.innerHTML = h;
  const bar = document.createElement('div'); bar.className = 'bar';
  bar.innerHTML = `<div class="in">${mode === 'full' ? '<span class="tm" id="tm"></span>' : ''}<span class="st" id="st"></span><button class="b ${mode === 'sa' ? 'main' : 'ac'}" id="sub">${mode === 'sa' ? '끝내기' : '제출하고 채점'}</button></div>`;
  document.body.appendChild(bar);
  const isDone = k => mode === 'sa' ? !!dr.chk[k] : NX.answered(k, dr.a[k]);
  const nav = () => {
    if (over || !document.getElementById('st') || !document.getElementById('navs')) return;
    const done = keys.filter(isDone).length;
    document.getElementById('st').textContent = mode === 'sa' ? `확인 ${done} / ${keys.length}` : `답한 문항 ${done} / ${keys.length}`;
    const g = s => keys.filter(k => k[0] === s).map(k => { const c = mode === 'sa' && dr.chk[k]; const cls = c ? (c.r.ok ? 'ok' : 'bad') : (mode !== 'sa' && NX.answered(k, dr.a[k])) ? 'on' : '';
      return `<a href="#q-${k}" class="${cls}" data-go="${k}">${k.slice(1)}</a>`; }).join('');
    document.getElementById('navs').innerHTML = (keys.some(k => k[0] === 'm') ? '<span class="lb">객관식</span>' + g('m') : '') + (keys.some(k => k[0] === 's') ? '<span class="lb" style="margin-left:6px">서답형</span>' + g('s') : '');
  };
  nav();
  if (!fresh) { const first = keys.find(k => !isDone(k)); if (first) setTimeout(() => { const el = document.getElementById('q-' + first); if (el) el.scrollIntoView({ block: 'start' }); }, 150); }
  document.getElementById('navs').onclick = ev => { const a = ev.target.closest('[data-go]'); if (!a) return; ev.preventDefault(); document.getElementById('q-' + a.dataset.go).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $app.onclick = ev => {
    const card = ev.target.closest('.q'); if (!card) return; const k = card.dataset.key, q = NX.item(ex, k);
    const ob = ev.target.closest('.opts button');
    if (ob && !ob.disabled) { dr.a[k] = +ob.dataset.v; keep(); card.querySelectorAll('.opts button').forEach(b => b.classList.toggle('sel', b === ob)); nav(); return; }
    if (ev.target.closest('[data-check]')) {
      const a = readSA(card, q); if (!NX.answered(k, a)) return toast('답을 먼저 써 주세요.');
      const r = NX.gradeSA(q, a); dr.chk[k] = { a, r };
      const d = getD(id); NX.pushEv(d, k, r.ok); keep(true);
      card.outerHTML = `<div class="q" id="q-${k}" data-key="${k}">${qHead(q, k)}${imgs(q)}${saIns(q, a, r)}${fbSA(q, r)}${expH(q, k)}${r.ok ? '' : claimH(id, d, k, null)}</div>`;
      nav(); return;
    }
    const cb = ev.target.closest('[data-claim]');
    if (cb) { const c = dr.chk[k]; if (!c) return; doClaim(id, k, c.a, c.r, 0); cb.parentNode.outerHTML = claimH(id, getD(id), k, null); }
  };
  $app.oninput = $app.onchange = ev => {
    const card = ev.target.closest('.q'); if (!card) return; const k = card.dataset.key;
    if (k[0] === 's' && !dr.chk[k]) { dr.a[k] = readSA(card, NX.item(ex, k)); clearTimeout(nav._t); nav._t = setTimeout(() => { keep(); nav(); }, 400); }
  };
  document.getElementById('quit').onclick = () => { location.hash = '#/'; toast('풀던 답은 저장돼 있어요. 다음에 이어서 풀 수 있어요.'); };
  const rs = document.getElementById('restart'); if (rs) rs.onclick = () => { if (!confirm('처음부터 다시 풀까요? 지금까지 쓴 답은 지워져요.')) return; over = true; DR.del(id, mode); save(id, true); route(); };
  const finish = () => { over = true; LEAVE = null; clearTimeout(nav._t); DR.del(id, mode); };
  const submit = auto => {
    if (mode === 'sa') {
      const ck = keys.filter(k => dr.chk[k]), rec = dr.rec || [], nw = ck.filter(k => !rec.includes(k));
      if (!nw.length) { finish(); save(id, true); location.hash = '#/'; return; }
      if (ck.length < keys.length && !confirm(`${keys.length - ck.length}문항은 아직 풀지 않았어요.\n지금까지 푼 ${ck.length}문항만 기록하고 끝낼까요?\n(취소하고 그냥 나가면 나중에 이어서 풀 수 있어요)`)) return;
      const d = getD(id), sec = Math.round(used() / 1000);
      let att = dr.from && d.att.find(x => x.at === dr.from);
      if (att) { nw.forEach(k => att.a[k] = dr.chk[k].a); att.x = 1; }
      else { att = { at: Date.now(), mode, a: {} }; ck.forEach(k => att.a[k] = dr.chk[k].a); pushAtt(d, att); }
      let g = 0, m = 0; Object.keys(att.a).forEach(k => { const r = NX.gradeSA(NX.item(ex, k), att.a[k]); g += r.got; m += r.max; });
      Object.assign(att, { sec, sc: NX.r1(g), mx: NX.r1(m), mc: [0, 0], sa: [NX.r1(g), NX.r1(m)] });
      if (att.a && Object.keys(att.a).length < keys.length) delete att.x;   // 아직 남았으면 다음에 또 이어 풀기
      Object.keys(d.cl).forEach(c => { if (d.cl[c].t === 0 && ck.includes(d.cl[c].k)) d.cl[c].t = att.at; });
      finish(); save(id, true);
      location.hash = `#/r/${id}/${d.att.indexOf(att)}`; return;
    }
    const left = keys.filter(k => !NX.answered(k, dr.a[k])).length;
    if (!auto && left && !confirm(`아직 ${left}문항에 답하지 않았어요. 그래도 제출할까요?`)) return;
    if (!auto && !left && !confirm('제출하고 채점할까요?')) return;
    const d = getD(id); let mg = 0, mm = 0, sg = 0, sm = 0; const a = {};
    keys.forEach(k => { const r = NX.grade(ex, k, dr.a[k]); a[k] = dr.a[k] == null ? null : dr.a[k];
      if (k[0] === 'm') { mg += r.got; mm += r.max; } else { sg += r.got; sm += r.max; } NX.pushEv(d, k, r.ok); });
    const att = { at: Date.now(), mode, sec: Math.round(Math.min(used(), mode === 'full' ? limit : Infinity) / 1000), sc: NX.r1(mg + sg), mx: NX.r1(mm + sm), mc: [NX.r1(mg), NX.r1(mm)], sa: [NX.r1(sg), NX.r1(sm)], a };
    pushAtt(d, att); finish(); save(id, true);
    stopTimer(); location.hash = `#/r/${id}/${d.att.length - 1}`;
  };
  document.getElementById('sub').onclick = () => submit(false);
  if (mode === 'full') {
    const tm = document.getElementById('tm'); let n = 0;
    const tick = () => { if (!tm.isConnected) return stopTimer(); const left = limit - used();
      if (left <= 0) { stopTimer(); tm.textContent = '00:00'; toast('시간이 끝났어요. 자동으로 제출해요.', 3500); return submit(true); }
      const s = Math.ceil(left / 1000); tm.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); tm.classList.toggle('warn', s <= 300);
      if (++n % 20 === 0) keep(); };
    tick(); TIMER = setInterval(tick, 1000);
  }
}
function pushAtt(d, att){ d.att.push(att); if (d.att.length > 30) { const keepFull = d.att.filter(a => a.mode === 'full').slice(-8); d.att = d.att.slice(-22).filter(a => !keepFull.includes(a)).concat(keepFull).sort((x, y) => x.at - y.at); } }

/* ---------- 결과 ---------- */
async function viewResult(id, i){
  const e = examOf(id), d = getD(id), att = d.att[i];
  if (!att) { location.hash = '#/'; return; }
  $app.innerHTML = `<div class="top"><a href="#/">‹ 목록</a><div class="t">${esc(shortT(e))} · 결과</div></div><div class="empty">불러오는 중…</div>`;
  let ex; try { ex = await bundle(id); } catch (err) { return bundleErr(err); }
  const keys = Object.keys(att.a), sc = NX.attScore(d, att, REV), mm = Math.floor((att.sec || 0) / 60);
  const ok = keys.filter(k => NX.grade(ex, k, att.a[k]).ok).length;
  let h = `<div class="top"><a href="#/">‹ 목록</a><div class="t">${esc(shortT(e))} · ${MODE[att.mode] || ''} 결과</div></div>
    <div class="res"><div class="big"><i>${MODE[att.mode] || ''} 점수</i><b>${sc}<small> / ${att.mx}</small></b></div>
      ${att.mc[1] ? `<div><i>객관식</i><b>${att.mc[0]}<small>/${att.mc[1]}</small></b></div>` : ''}${att.sa[1] ? `<div><i>서답형</i><b>${att.sa[0]}<small>/${att.sa[1]}</small></b></div>` : ''}
      <div><i>맞힌 문항</i><b>${ok}<small>/${keys.length}</small></b></div><div><i>걸린 시간</i><b>${mm}<small>분</small></b></div></div>
    ${sc !== att.sc ? `<div class="banner">선생님이 인정한 답이 반영된 점수예요 (채점 때 ${att.sc}점).</div>` : ''}
    <div class="row" style="margin-bottom:14px"><a class="b ac" href="#/c/all/${id}">이 회차 오답 다시 풀기</a><a class="b" href="#/x/${id}/${att.mode}">다시 풀기</a></div>`;
  ['m', 's'].forEach(s => {
    const ks = keys.filter(k => k[0] === s); if (!ks.length) return;
    h += `<div class="sh"><span class="k">${s === 'm' ? 'PART 1' : 'PART 2'}</span><b>${s === 'm' ? '객관식' : '서답형'}</b><span>틀린 문항은 해설을 펼쳐 보세요</span></div>`;
    ks.forEach(k => { const q = NX.item(ex, k), a = att.a[k], r = NX.grade(ex, k, a);
      const cl = Object.keys(d.cl).find(c => d.cl[c].k === k && d.cl[c].t === att.at), rv = cl && REV[cl], mk = r.ok ? 'o' : rv === true ? 'o' : r.got > 0 || (cl && rv == null) ? 'h' : 'x';
      h += `<div class="rq" data-key="${k}"><div class="rh"><span class="mk ${mk}">${mk === 'o' ? '✓' : mk === 'h' ? '△' : '✗'}</span><span class="lb">${NX.label(k)}</span>${q.type ? `<span class="ty">${esc(q.type)}</span>` : ''}<span class="pt">${r.got}/${r.max}</span></div>`;
      if (k[0] === 'm') h += `<div class="cmp"><i>내 답</i><span>${a ? CIRC[a - 1] : '—'}</span><i>정답</i><span class="c">${CIRC[q.ans - 1]}</span></div>`;
      else h += `<div class="cmp"><i>내 답</i><span>${NX.myText(q, a).map((t, j) => (r.parts[j] ? '✓ ' : '✗ ') + esc(t)).join('<br>')}</span><i>정답</i><span class="c">${NX.answerText(q).map(esc).join('<br>')}</span></div>`;
      h += `<details ${r.ok ? '' : ''}><summary>${r.ok ? '해설 보기' : '해설 · 문제 다시 보기'}</summary>${r.ok ? '' : imgs(q)}${expH(q, k)}</details>`;
      if (k[0] === 's' && !r.ok && NX.answered(k, a)) h += claimH(id, d, k, att);
      h += '</div>'; });
  });
  $app.innerHTML = h;
  $app.onclick = ev => { const cb = ev.target.closest('[data-claim]'); if (!cb) return; const k = cb.dataset.claim, r = NX.grade(ex, k, att.a[k]);
    doClaim(id, k, att.a[k], r, att.at); cb.parentNode.outerHTML = claimH(id, getD(id), k, att); };
}

/* ---------- 오답노트 ---------- */
async function viewNotes(type){
  const all = NX.notes(rows(), REV, false), f = x => type === 'all' || x.key[0] === type[0];
  const N = all.filter(x => x.st.in && f(x)), G = all.filter(x => !x.st.in && f(x));
  let h = `<div class="top"><a href="#/">‹ 목록</a><div class="t">오답노트</div></div>
    <div class="flt">${[['sa', '서답형'], ['mc', '객관식'], ['all', '전체']].map(([k, t]) => `<button data-t="${k}" class="${k === type ? 'on' : ''}">${t} ${all.filter(x => x.st.in && (k === 'all' || x.key[0] === k[0])).length}</button>`).join('')}</div>
    <div class="row" style="margin-bottom:14px"><a class="b ac" href="#/c/${type}/all" ${N.length ? '' : 'style="opacity:.45;pointer-events:none"'}>남은 ${N.length}문항 다시 풀기</a><button class="b" id="prt" ${N.length ? '' : 'disabled'}>시험지로 인쇄</button></div>`;
  if (!N.length && !G.length) h += '<div class="empty">아직 틀린 문제가 없어요.<br>시험을 풀면 틀린 문제가 여기 모여요.</div>';
  EXAMS.forEach(e => {
    const n = N.filter(x => x.ex === e.id), g = G.filter(x => x.ex === e.id); if (!n.length && !g.length) return;
    h += `<div class="nl"><h3>${esc(shortT(e))} · 남은 ${n.length}</h3>`;
    n.forEach(x => h += `<div class="ni"><div class="w"><b>${NX.label(x.key)}</b>${x.st.pend ? '<span class="tag wait">확인 중</span>' : ''}<small>틀린 횟수 ${x.st.wrong} · 마지막으로 틀린 날 ${x.st.lw.slice(5).replace('-', '/')}${x.st.sameDayOK ? ' · 오늘 맞힘 → 다른 날 한 번 더' : ''}</small></div><button class="b sm" data-out="${e.id}|${x.key}">다 외웠어요 · 빼기</button></div>`);
    g.forEach(x => h += `<div class="ni out"><div class="w"><b>${NX.label(x.key)}</b><small>${x.st.grad ? '🎓 다른 날 다시 맞혀서 졸업' : '직접 뺐어요'}</small></div>${x.st.self ? `<button class="b sm gh" data-back="${e.id}|${x.key}">되돌리기</button>` : ''}</div>`);
    h += '</div>';
  });
  $app.innerHTML = h;
  $app.onclick = async ev => {
    const t = ev.target.closest('[data-t]'); if (t) { location.hash = '#/n/' + t.dataset.t; return; }
    const o = ev.target.closest('[data-out]'), b = ev.target.closest('[data-back]');
    if (o || b) { const [id, k] = (o || b).dataset[o ? 'out' : 'back'].split('|'), d = getD(id);
      if (o) d.dn[k] = NX.today(); else delete d.dn[k]; save(id, true); toast(o ? '오답노트에서 뺐어요. 다시 틀리면 돌아와요.' : '오답노트로 되돌렸어요.'); viewNotes(type); return; }
    if (ev.target.id === 'prt') printNotes(N, type);
  };
}
async function printNotes(N, type){
  toast('시험지를 만드는 중…');
  try { const ids = [...new Set(N.map(x => x.ex))]; await Promise.all(ids.map(bundle));
    NX.printSheet(N.map(x => ({ exam: EXC[x.ex], key: x.key, n: x.st.wrong })), { name: ME.name, title: ({ sa: '서답형', mc: '객관식', all: '' })[type] + ' 누적 오답 테스트' });
  } catch (e) { toast('시험지를 불러오지 못했어요.'); }
}

/* ---------- 누적 오답 테스트 ---------- */
async function viewCum(type, scope, withToday){
  const pick = x => (type === 'all' || x.key[0] === type[0]) && (scope === 'all' || x.ex === scope);
  const today = NX.today(), doneToday = x => x.st.last && x.st.last[0] === today;   // 오늘 이미 푼 문제
  const ALL = noteList().filter(pick), TD = ALL.filter(doneToday), N = withToday ? ALL : ALL.filter(x => !doneToday(x));
  if (!N.length && TD.length) { $app.innerHTML = `<div class="top"><a href="#/">‹ 목록</a><div class="t">누적 오답 테스트</div></div>
    <div class="empty">오늘 풀 오답은 다 풀었어요. 🎉<br>오늘 푼 ${TD.length}문항은 <b>다른 날</b> 다시 맞히면 오답노트에서 빠져요.<br><br><a class="b" href="#/c/${type}/${scope}/today">오늘 푼 문제도 다시 풀기</a></div>`; return; }
  const ttl = (scope === 'all' ? '' : shortT(examOf(scope) || {}) + ' · ') + ({ sa: '서답형', mc: '객관식', all: '전체' })[type] + ' 오답';
  if (!N.length) { $app.innerHTML = `<div class="top"><a href="#/">‹ 목록</a><div class="t">누적 오답 테스트</div></div><div class="empty">다시 풀 오답이 없어요. 🎉</div>`; return; }
  $app.innerHTML = `<div class="top"><a href="#/">‹ 목록</a><div class="t">${esc(ttl)}</div></div><div class="empty">문제를 모으는 중…</div>`;
  try { await Promise.all([...new Set(N.map(x => x.ex))].map(bundle)); } catch (err) { return bundleErr(err); }
  let h = `<div class="top"><a href="#/">‹ 목록</a><div class="t">누적 오답 테스트 · ${esc(ttl)}</div></div>
    <div class="banner">${N.length}문항 · 한 문제씩 풀고 <b>정답 확인</b>을 눌러요. 틀린 날이 아닌 <b>다른 날</b> 맞히면 오답노트에서 빠져요.${!withToday && TD.length ? `<br>오늘 이미 푼 ${TD.length}문항은 빼고 보여줘요. <a href="#/c/${type}/${scope}/today" style="font-weight:700">같이 보기</a>` : ''}</div>
    <div class="flt">${[['sa', '서답형'], ['mc', '객관식'], ['all', '전체']].map(([k, t]) => `<button data-t="${k}" class="${k === type ? 'on' : ''}">${t}</button>`).join('')}<button id="prt" style="margin-left:auto">인쇄</button></div>`;
  N.forEach((x, i) => { const ex = EXC[x.ex], q = NX.item(ex, x.key);
    h += `<div class="q" data-ex="${x.ex}" data-key="${x.key}">${qHead(q, x.key, `<span class="pill ac">${esc(shortT(examOf(x.ex)))} · 틀린 ${x.st.wrong}번</span>`)}${imgs(q)}
      ${x.key[0] === 'm' ? mcOpts() : saIns(q)}<div class="chk"><button class="b main sm" data-check>정답 확인</button><button class="b sm gh" data-out>다 외웠어요 · 빼기</button></div></div>`; });
  $app.innerHTML = h;
  let pickMC = {};
  $app.onclick = ev => {
    const t = ev.target.closest('.flt [data-t]'); if (t) { location.hash = `#/c/${t.dataset.t}/${scope}`; return; }
    if (ev.target.id === 'prt') { printNotes(N, type); return; }
    const card = ev.target.closest('.q'); if (!card) return; const id = card.dataset.ex, k = card.dataset.key, ex = EXC[id], q = NX.item(ex, k), d = getD(id);
    const ob = ev.target.closest('.opts button'); if (ob && !ob.disabled) { pickMC[id + k] = +ob.dataset.v; card.querySelectorAll('.opts button').forEach(b => b.classList.toggle('sel', b === ob)); return; }
    if (ev.target.closest('[data-out]')) { d.dn[k] = today; save(id, true); card.querySelector('.chk').outerHTML = '<div class="fb ok">오답노트에서 뺐어요. 다시 틀리면 돌아와요.</div>'; return; }
    const cb = ev.target.closest('[data-claim]'); if (cb) { doClaim(id, k, card._a, card._r, 0); cb.parentNode.outerHTML = claimH(id, d, k, null); return; }
    if (!ev.target.closest('[data-check]')) return;
    const a = k[0] === 'm' ? pickMC[id + k] : readSA(card, q);
    if (!NX.answered(k, a)) return toast(k[0] === 'm' ? '번호를 먼저 골라 주세요.' : '답을 먼저 써 주세요.');
    const r = NX.grade(ex, k, a);
    NX.pushEv(d, k, r.ok); save(id); card._a = a; card._r = r;
    const after = NX.state(d, k, REV);
    let msg;
    if (r.ok) msg = !after.in ? '<div class="fb ok"><span class="grad">🎓 졸업!</span> 다른 날 다시 맞혀서 오답노트에서 빠졌어요.</div>'
      : `<div class="fb mid"><b>맞혔어요!</b> 오늘(${today.slice(5).replace('-', '/')}) 틀렸던 문제라 <b>다른 날</b> 한 번 더 맞히면 빠져요.</div>`;
    else msg = '';
    const body = (k[0] === 'm' ? mcOpts(a, true, q.ans) + (r.ok ? '' : `<div class="fb bad"><b>아직이에요.</b> 정답은 ${CIRC[q.ans - 1]} · 틀린 횟수 ${after.wrong}번</div>`) : saIns(q, a, r) + fbSA(q, r)) + msg + expH(q, k) + (k[0] === 's' && !r.ok ? claimH(id, d, k, null) : '');
    const nt = card.querySelector('.ins + .note'); if (nt) nt.remove(); card.querySelector('.opts, .ins').outerHTML = '<div class="_x"></div>';
    card.querySelector('._x').outerHTML = body; card.querySelector('.chk').remove();
  };
}

route();
