/* 관리자 · 내신 어휘요약문 로드맵 학생 진단 · 처방 (BASE CAMP · 온더웨이 · 피날레)
   - 학생이 쓴 답을 정답과 비교해 오답 유형을 나눈다: 철자 · 형태(품사) · 의미 · 빈칸
   - 영역별 정답률, 자주 틀린 단어(기출 빈출 표시), 한 줄 진단, 처방 추천
   - 반 히트맵 · 주의 학생 · 주간 요약, 처방 과제(hub_assignments), 오답 맞춤 시험지 출력
   데이터: window.YD(BASE CAMP) · window.OTW · window.FIN, vt_progress course 'ydvoca' */
const DG = (() => {
  const YDL = (window.YD && window.YD.lessons) || [];
  const OTWS = ((window.OTW && window.OTW.seasons) || [])[0];
  const FINS = ((window.FIN && window.FIN.seasons) || [])[0];
  const pad2 = n => String(n).padStart(2, '0');
  const nrm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[□_]/g, '').replace(/\s+/g, ' ').replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '').trim();
  const lev = (a, b) => { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n]; };
  const SUF = ['ization', 'ation', 'ition', 'tion', 'sion', 'ion', 'ment', 'ness', 'ity', 'ance', 'ence', 'ancy', 'ency', 'ive', 'ous', 'ful', 'less', 'able', 'ible', 'ical', 'ial', 'al', 'ic', 'ly', 'ing', 'ed', 'er', 'or', 'ize', 'ise', 'ate', 'ant', 'ent', 'ary', 'ory', 'ist', 'ism', 'ship', 'en', 'es', 's', 'y', 'e'];
  const stem = w => { for (const s of SUF) if (w.length - s.length >= 3 && w.endsWith(s)) return [w.slice(0, -s.length), s]; return [w, '']; };
  const lcp = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  /* 오답 유형: ok · spell · form · meaning · blank */
  function classify(ans, keys){
    const a = nrm(ans); if (!a) return 'blank';
    const K = keys.map(nrm).filter(Boolean); if (K.includes(a)) return 'ok';
    let best = 'meaning';
    for (const k of K) {
      const d = lev(a, k);
      if ((a.startsWith(k) || k.startsWith(a)) && Math.abs(a.length - k.length) <= 4 && Math.min(a.length, k.length) >= 3) return 'form';
      if (d <= 1 || (d <= 2 && k.length >= 8 && stem(a)[1] === stem(k)[1])) return 'spell';
      const [sa, fa] = stem(a), [sk, fk] = stem(k), p = lcp(sa, sk);
      if (fa !== fk && p >= 3 && p >= Math.min(sa.length, sk.length) * 0.7) best = 'form';
      else if (lcp(a, k) >= 5 && lcp(a, k) >= k.length * 0.6 && best !== 'form') best = 'form';
    }
    return best;
  }
  const TY = { spell: ['철자', '#C08A1E'], form: ['형태(품사)', '#7B5EA7'], meaning: ['의미', '#C8582A'], blank: ['빈칸', '#9AA19E'] };

  /* ---------- 문항 사전 ---------- */
  const IDX = {};
  YDL.forEach(l => { const t = l.test || {};
    ['B1', 'R1'].forEach(set => (t[set] || []).forEach((q, i) => IDX[`${l.id}-test:${set[0]}${pad2(i + 1)}`] = { area: 'BASE CAMP · 어원 단어 쓰기', keys: [q.a], word: q.a, ctx: `${q.q} → ____ (${q.ko})`, stage: 'bc', unit: l.id, label: `${+l.no}강` }));
    ['B2', 'R2'].forEach(set => (t[set] || []).forEach((q, i) => { const want = (q.parts || []).filter(p => typeof p !== 'string').map(p => p.a);
      IDX[`${l.id}-test:${set[0]}${pad2(i + 6)}`] = { area: 'BASE CAMP · 문장 속 단어 쓰기', keys: want, multi: true, word: want.join(' / '), ctx: (q.parts || []).map(p => typeof p === 'string' ? p : '____').join(''), ko: q.ko ? q.ko.replace(/\[\[(.+?)\]\]/g, '**$1**') : '', stage: 'bc', unit: l.id, label: `${+l.no}강` }; }));
    (t.A || []).forEach((q, i) => IDX[`${l.id}-test:A${pad2(i + 1)}`] = { area: 'BASE CAMP · 뜻 고르기', mcq: true, word: (q.s.match(/\*\*(.+?)\*\*/) || [])[1] || '', ctx: q.s, stage: 'bc', unit: l.id, label: `${+l.no}강` });
    (t.C || []).forEach((q, i) => IDX[`${l.id}-test:C${pad2(i + 1)}`] = { area: 'BASE CAMP · 영영 뜻 맞히기', keys: [q.a], word: q.a, ctx: `${q.d} → ____`, stage: 'bc', unit: l.id, label: `${+l.no}강` });
  });
  const OTWP = { a: 'Part 1 동의어·반의어', b: 'Part 2 혼동어휘', c: 'Part 3 어형변화' };
  if (OTWS) OTWS.days.forEach(D => {
    const add = (p, it, g) => { const k = it.key, keys = [k].concat(it.hint === '(ed)' ? [k.endsWith('e') ? k + 'd' : k + 'ed'] : it.hint === '(s)' ? [k + 's', k + 'es'] : []);
      const kk = /\(s\)$/.test(k) ? [k.replace(/\(s\)$/, ''), k.replace(/\(s\)$/, 's')] : keys;
      const obj = { area: '온더웨이 · ' + OTWP[it.id[0]], keys: kk, first: it.first || '', word: k, hint: it.hint || '', ctx: (it.pre || '') + ' ____ ' + (it.post || ''), ko: it.ko || '', alts: it.alts || [], bogi: g ? g.words : null, stage: 'otw', unit: 's1d' + D.d, label: `Day ${pad2(D.d)}`, no: it.no, part: p };
      IDX[`s1d${D.d}-p:${it.id}`] = obj; IDX[`s1d${D.d}-test:${it.id}`] = obj; };
    D.p1.forEach(it => add(1, it)); D.p2.forEach(g => g.items.forEach(it => add(2, it, g))); D.p3.forEach(g => g.items.forEach(it => add(3, it, g)));
  });
  if (FINS) FINS.rounds.forEach(R => R.qs.forEach(q => Object.keys(q.bl).forEach(k => {
    const acc = q.key[k].acc.flatMap(w => /\(s\)$/.test(w) ? [w.replace(/\(s\)$/, ''), w.replace(/\(s\)$/, 's')] : [w]);
    const obj = { area: '피날레 · 요약문 빈칸', keys: acc, first: (q.bl[k][0] || {}).first || '', word: q.key[k].w, freq: q.key[k].freq, ctx: q.sum, q, k, stage: 'fin', unit: 's1r' + R.r, label: `${R.r}회`, no: q.no };
    IDX[`s1r${R.r}-p:${q.id + k}`] = obj; IDX[`s1r${R.r}-test:${q.id + k}`] = obj; })));
  const fixAns = (m, v) => { const a = nrm(v); return m.first && a && !m.keys.some(k => nrm(k)[0] === a[0]) ? m.first + v : v; };

  /* ---------- 학생 한 명 진단 ---------- */
  function student(rows){
    const R = rows.filter(r => r.course === 'ydvoca'), byU = {}; R.forEach(r => byU[r.unit_id] = r);
    const area = {}, err = { spell: 0, form: 0, meaning: 0, blank: 0 }, words = {}, units = [];
    const addArea = (name, ok) => { const a = area[name] = area[name] || { ok: 0, n: 0 }; a.n++; if (ok) a.ok++; };
    const addWrong = (key, m, ans, unit) => { const w = words[m.word] = words[m.word] || { word: m.word, n: 0, freq: !!m.freq, where: new Set(), last: '', type: '', keys: [] };
      w.n++; w.where.add(m.label + (m.stage === 'otw' ? ' P' + m.part : m.stage === 'fin' ? ' ' + m.no + '번' : '')); w.last = ans; w.m = m; w.key = key; };
    // 단계별 상태
    const stageOf = (pref, list) => list.map(id => { const t = byU[id + '-test'], d = (t && t.data) || {}; return { id, passed: !!d.passed, best: d.best, att: (d.attempts || []).length + (d.paper || []).length, updated: t && t.updated_at, attempts: d.attempts || [] }; });
    const bc = stageOf('bc', YDL.map(l => l.id)), otw = OTWS ? stageOf('otw', OTWS.days.map(D => 's1d' + D.d)) : [], fin = FINS ? stageOf('fin', FINS.rounds.map(x => 's1r' + x.r)) : [];
    // 시험: 단위마다 가장 최근 응시로 영역 정답률, 모든 응시로 오답 횟수
    const latestItem = {};
    [...bc, ...otw, ...fin].forEach(u => { u.attempts.forEach((a, ai) => Object.entries(a.items || {}).forEach(([id, ok]) => {
      const key = `${u.id}-test:${id}`, m = IDX[key]; if (!m) return;
      if (ai === u.attempts.length - 1) addArea(m.area, ok === 1);
      if (ok !== 1 && !m.mcq) { const ans = (a.ans || {})[id] || ''; addWrong(key, m, ans, u.id); latestItem[m.word] = { ans, m }; }
      else if (ok !== 1 && m.mcq) { const w = words[m.word] = words[m.word] || { word: m.word, n: 0, where: new Set(), m, mcq: true }; w.n++; w.where.add(m.label + ' 뜻'); }
    })); });
    // 연습(온더웨이·피날레): 지금 틀린 채로 남은 문항 = 오답 목록
    const backlog = {};
    R.filter(r => /^s1[dr]\d+-p$/.test(r.unit_id)).forEach(r => { const d = r.data || {}, st = d.st || {}, ans = d.ans || {}, u = r.unit_id.replace('-p', '');
      Object.entries(st).forEach(([id, v]) => { const m = IDX[`${r.unit_id}:${id}`]; if (!m) return;
        if (!otw.concat(fin).find(x => x.id === u && x.attempts.length)) addArea(m.area + ' (연습)', v === 1);
        if (v === 0) { backlog[u] = (backlog[u] || 0) + 1; if (!latestItem[m.word]) { addWrong(`${r.unit_id}:${id}`, m, ans[id] || '', u); latestItem[m.word] = { ans: ans[id] || '', m }; } } }); });
    // 오답 유형: 단어마다 최근 답 기준
    Object.values(words).forEach(w => { if (w.mcq) return; const li = latestItem[w.word]; if (!li) return;
      const m = li.m; let t;
      if (m.multi) { const parts = String(li.ans).split('/'), ts = m.keys.map((k, i) => classify(parts[i] || '', [k])).filter(x => x !== 'ok'); t = ts[0] || 'spell'; }
      else t = classify(fixAns(m, li.ans), m.keys);
      if (t === 'ok') t = 'spell'; w.type = t; err[t]++; });
    const errN = err.spell + err.form + err.meaning + err.blank;
    const areas = Object.entries(area).map(([k, v]) => ({ name: k, ok: v.ok, n: v.n, pct: Math.round(v.ok / v.n * 100) })).sort((a, b) => a.name.localeCompare(b.name));
    const wl = Object.values(words).sort((a, b) => (b.freq - a.freq) || (b.n - a.n)).map(w => Object.assign(w, { where: [...w.where] }));
    const last = R.map(r => r.updated_at).filter(Boolean).sort().pop();
    // 주의 신호
    const flags = [];
    const started = R.length > 0;
    if (started && last && (Date.now() - new Date(last)) / 864e5 >= 7) flags.push(`${Math.floor((Date.now() - new Date(last)) / 864e5)}일째 활동 없음`);
    [...bc.map((u, i) => [u, `BASE CAMP ${i + 1}강`]), ...otw.map((u, i) => [u, `온더웨이 Day ${pad2(i + 1)}`]), ...fin.map((u, i) => [u, `피날레 ${i + 1}회`])]
      .forEach(([u, nm]) => { if (!u.passed && u.att >= 3) flags.push(`${nm} 재시험 ${u.att - 1}번째도 불통과`); });
    const bl = Object.values(backlog).reduce((a, b) => a + b, 0);
    if (bl >= 15) flags.push(`남은 오답 ${bl}개`);
    [...otw, ...fin].forEach(u => { if (!u.attempts.length) return; const p = byU[u.id + '-p'], n = Object.keys(((p && p.data) || {}).st || {}).length;
      const tot = Object.keys(IDX).filter(k => k.startsWith(u.id + '-p:')).length; if (tot && n / tot < .3) flags.push(`${u.id.includes('d') ? '온더웨이 Day ' + pad2(u.id.split('d')[1]) : '피날레 ' + u.id.split('r')[1] + '회'} 연습 없이 시험만 봄`); });
    // 한 줄 진단
    const weak = areas.filter(a => a.n >= 5 && a.pct < 70).sort((a, b) => a.pct - b.pct)[0] || areas.filter(a => a.n >= 2 && a.pct < 60).sort((a, b) => a.pct - b.pct)[0];
    const domT = errN >= 3 ? Object.entries(err).sort((a, b) => b[1] - a[1])[0] : null;
    const why = { spell: '단어는 아는데 철자가 흔들려요', form: '뜻은 아는데 빈칸 자리의 품사·형태를 못 맞춰요', meaning: '지문 근거를 못 찾거나 단어 뜻을 몰라요', blank: '모르는 단어가 많거나 시간이 부족해요' };
    let summary = [];
    if (weak) summary.push(`약한 영역: ${weak.name} ${weak.pct}%`);
    if (domT && domT[1] / errN >= .35) summary.push(`오답의 ${Math.round(domT[1] / errN * 100)}%가 ${TY[domT[0]][0]} 오류 — ${why[domT[0]]}`);
    if (domT && domT[1] / errN < .35) summary.push(`오답 유형이 고르게 섞여 있어요 (${Object.entries(err).filter(([, v]) => v).map(([k, v]) => TY[k][0] + ' ' + v).join(' · ')})`);
    if (!summary.length) summary.push(started ? (flags.length ? '정답률은 괜찮지만 아래 주의 신호를 확인하세요' : '뚜렷한 약점 없음 · 지금 흐름 유지') : '아직 로드맵 기록이 없어요');
    // 처방 추천
    const pres = [];
    Object.entries(backlog).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([u, n]) => {
      if (u.includes('d')) pres.push({ title: `온더웨이 Day ${pad2(u.split('d')[1])} 오답만 다시 (${n}문항)`, link: `/ydvoca/#/otw/s1/${u.split('d')[1]}/wrong`, note: '틀린 문항을 다시 풀고 해설을 읽어요.' });
      else pres.push({ title: `피날레 ${u.split('r')[1]}회 오답만 다시 (${n}문항)`, link: `/ydvoca/#/fin/s1/${u.split('r')[1]}/wrong`, note: '해설의 근거·포인트를 읽고 다시 써 봐요.' }); });
    [...bc.map((u, i) => [u, `BASE CAMP ${i + 1}강 재시험`, `/ydvoca/#/${u.id}/retest`]), ...otw.map((u, i) => [u, `온더웨이 Day ${pad2(i + 1)} 재시험`, `/ydvoca/#/otw/s1/${i + 1}/retest`]), ...fin.map((u, i) => [u, `피날레 ${i + 1}회 재시험`, `/ydvoca/#/fin/s1/${i + 1}/retest`])]
      .filter(([u]) => u.att && !u.passed).slice(0, 2).forEach(([u, t, link]) => pres.push({ title: t + (u.best ? ` (최고 ${u.best.score != null ? u.best.score + '점' : u.best.total + '/30'})` : ''), link, note: '오답 정리 후 다시 도전해요.' }));
    if (domT && domT[1] / errN >= .35) {
      const P = { spell: { title: '틀린 단어 철자 3번씩 쓰기', note: '오답 시험지의 단어를 소리 내며 3번씩 써요.' },
        form: { title: '어형변화 복습 · 빈칸 앞뒤 품사 확인', note: '온더웨이 Part 3를 다시 풀고, 빈칸 앞(관사·be동사·to)과 뒤를 보고 품사부터 정해요.', link: '/ydvoca/#/otw/s1/1/practice/3' },
        meaning: { title: '피날레 해설의 "근거" 읽고 지문 다시 보기', note: '요약문 빈칸이 지문의 어느 문장을 바꿔 쓴 것인지 표시하며 읽어요.' },
        blank: { title: '기출 빈출 단어 먼저 외우고 재시험', note: '자주 틀린 단어(기출 빈출 표시)부터 외운 뒤 시험을 다시 봐요.' } }[domT[0]];
      pres.push(Object.assign({ link: null }, P));
    }
    return { areas, err, errN, words: wl, flags, summary, pres, bc, otw, fin, backlog: bl, last, started };
  }

  /* ---------- 학생 진단 카드 ---------- */
  function cardH(s, d){
    const bar = d.errN ? `<div class="dg-bar">${Object.entries(d.err).filter(([, v]) => v).map(([k, v]) => `<i style="flex:${v};background:${TY[k][1]}" title="${TY[k][0]} ${v}"></i>`).join('')}</div>
      <div class="dg-leg">${Object.entries(d.err).map(([k, v]) => `<span><b style="background:${TY[k][1]}"></b>${TY[k][0]} ${v}${d.errN ? ` (${Math.round(v / d.errN * 100)}%)` : ''}</span>`).join('')}</div>` : '<div class="muted">분석할 오답이 아직 없어요.</div>';
    const ar = d.areas.length ? `<table class="mini"><tr><th>영역</th><th>정답률</th><th></th></tr>${d.areas.map(a => `<tr><td>${esc(a.name)}</td><td><b style="color:${a.pct < 60 ? '#C0392B' : a.pct < 80 ? '#C08A1E' : '#2F6B52'}">${a.pct}%</b> <span class="muted">${a.ok}/${a.n}</span></td><td style="width:40%"><div class="dg-p"><i style="width:${a.pct}%;background:${a.pct < 60 ? '#E07B6A' : a.pct < 80 ? '#E9B949' : '#5BA383'}"></i></div></td></tr>`).join('')}</table>` : '';
    const wl = d.words.slice(0, 12);
    const wt = wl.length ? `<table class="mini"><tr><th>단어</th><th>틀린 횟수</th><th>유형</th><th>최근 답</th><th>어디서</th></tr>${wl.map(w => `<tr><td><b>${esc(w.word)}</b>${w.freq ? ' <span class="dg-fr">기출 빈출</span>' : ''}</td><td>${w.n}</td><td>${w.mcq ? '뜻' : w.type ? `<span style="color:${TY[w.type][1]};font-weight:700">${TY[w.type][0]}</span>` : '—'}</td><td class="muted">${w.mcq ? '' : esc(w.last || '(빈칸)')}</td><td class="muted">${esc(w.where.slice(0, 3).join(', '))}</td></tr>`).join('')}</table>` : '';
    return `<div class="sec dgx" style="--c:#6B7B2C"><h3><i></i>내신 진단 · 처방 <small>어휘요약문 로드맵 · 학생이 쓴 답으로 분석</small></h3>
      <div class="dg-sum">${d.summary.map(x => `<div>• ${esc(x)}</div>`).join('')}${d.flags.length ? `<div class="dg-flags">${d.flags.map(f => `<span>⚠ ${esc(f)}</span>`).join('')}</div>` : ''}</div>
      <div class="dg-h">오답 유형 <span class="muted">(틀린 단어 ${d.errN}개 기준)</span></div>${bar}
      ${ar ? `<div class="dg-h">영역별 정답률 <span class="muted">(최근 응시 기준)</span></div>${ar}` : ''}
      ${wt ? `<div class="dg-h">자주 틀린 단어 <span class="muted">기출 빈출 먼저</span></div>${wt}` : ''}
      <div class="dg-h">처방 <span class="muted">보내면 학생 로드맵 화면 맨 위에 "선생님 처방"으로 떠요</span></div>
      <div id="dgPres">${d.pres.map((p, i) => `<div class="dg-pr"><div><b>${esc(p.title)}</b><div class="muted">${esc(p.note || '')}</div></div><button class="btn sm" data-dgsend="${i}">처방 보내기</button></div>`).join('') || '<div class="muted">추천할 처방이 아직 없어요.</div>'}</div>
      <div class="dg-new"><input id="dgT" placeholder="직접 쓰기 — 예: 온더웨이 Day 3 Part 1 다시 + 해설 읽기"><input id="dgDue" type="date"><button class="btn sm sec" id="dgAdd">보내기</button></div>
      <div class="dg-h">보낸 처방</div><div id="dgList" class="muted">불러오는 중…</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm" id="dgPrint" ${d.words.filter(w => !w.mcq).length ? '' : 'disabled'}>오답 맞춤 시험지 출력 (틀린 단어 ${d.words.filter(w => !w.mcq).length}개)</button></div></div>`;
  }
  async function bindCard(s, d){
    const list = async () => { const r = await SB.from('hub_assignments').select('*').eq('student_id', s.id).order('created_at', { ascending: false }).limit(20);
      const L = r.data || [], el = document.getElementById('dgList'); if (!el) return;
      el.className = ''; el.innerHTML = L.length ? L.map(a => `<div class="dg-as ${a.done_at ? 'done' : ''}"><span>${a.done_at ? '✅' : '⏳'}</span><div><b>${esc(a.title)}</b>${a.due ? ` <span class="muted">~ ${a.due}</span>` : ''}<div class="muted">${new Date(a.created_at).toLocaleDateString('ko-KR')} 보냄${a.done_at ? ' · ' + new Date(a.done_at).toLocaleDateString('ko-KR') + ' 완료' : ' · 아직 안 함'}</div></div><button class="btn sm red" data-dgdel="${a.id}">삭제</button></div>`).join('') : '<span class="muted">보낸 처방이 없어요.</span>';
      el.querySelectorAll('[data-dgdel]').forEach(b => b.onclick = async () => { if (!confirm('이 처방을 지울까요?')) return; await SB.from('hub_assignments').delete().eq('id', b.dataset.dgdel); list(); }); };
    const send = async (p, due) => { const { error } = await SB.from('hub_assignments').insert({ student_id: s.id, course: 'ydvoca', title: p.title, link: p.link || null, note: p.note || null, due: due || null });
      if (error) return toast(errMsg(error)); toast('처방을 보냈어요.'); list(); };
    document.querySelectorAll('[data-dgsend]').forEach(b => b.onclick = () => send(d.pres[+b.dataset.dgsend], document.getElementById('dgDue').value));
    document.getElementById('dgAdd').onclick = () => { const t = document.getElementById('dgT').value.trim(); if (!t) return toast('처방 내용을 써 주세요.'); send({ title: t }, document.getElementById('dgDue').value); document.getElementById('dgT').value = ''; };
    const pb = document.getElementById('dgPrint'); if (pb) pb.onclick = () => printWrong(s, d);
    list();
  }

  /* ---------- 오답 맞춤 시험지 ---------- */
  function printWrong(s, d){
    const W = d.words.filter(w => !w.mcq && w.m);
    const groups = [['bc', 'BASE CAMP · 단어 쓰기'], ['otw', '온더웨이'], ['fin', '피날레 · 요약문 빈칸']];
    let n = 0; const seenQ = new Set();
    const qs = groups.map(([st, title]) => { const L = W.filter(w => w.m.stage === st); if (!L.length) return '';
      return `<h2>${title} <small>${L.length}문항</small></h2>` + L.map(w => { const m = w.m; n++;
        if (st === 'fin') { const q = m.q; if (seenQ.has(q)) { n--; return ''; } seenQ.add(q);
          const ks = L.filter(x => x.m.q === q).map(x => x.m.k);
          let sum = esc(q.sum); ks.forEach(k => { const bl = (q.bl[k] || [])[0] || {}; sum = sum.replace('(' + k + ')', `<b class="bl">(${k}) ${esc(bl.first || '')}${'_'.repeat(Math.max(4, (bl.len || 7) - 1))}</b>`); });
          return `<div class="q"><span class="n">${n}</span><div><div class="src">${esc(m.label)} ${m.no}번 · 빈칸 ${ks.join('·')}</div><div class="pas">${esc(q.pas)}</div><div class="sum">➜ ${sum}</div></div></div>`; }
        const ctx = esc(m.ctx).replace('____', `<b class="bl">${esc(m.first || '')}________</b>${m.hint ? ' ' + esc(m.hint) : ''}`);
        return `<div class="q"><span class="n">${n}</span><div><div class="src">${esc(m.label)}${m.part ? ' · Part ' + m.part : ''}</div><div class="s">${ctx}</div>${m.bogi ? `<div class="bogi">보기 · ${m.bogi.map(esc).join(' · ')}</div>` : ''}${m.ko ? `<div class="ko">${esc(m.ko).replace(/\*\*(.+?)\*\*/g, '<u>$1</u>')}</div>` : ''}</div></div>`; }).join(''); }).join('');
    let k = 0;
    const seenK = new Set();
    const key = groups.map(([st]) => W.filter(w => w.m.stage === st).map(w => { if (st === 'fin') { const q = w.m.q; if (seenK.has(q)) return ''; seenK.add(q);
        return `<div><i>${++k}</i>${W.filter(x => x.m.q === q).map(x => `(${x.m.k}) ${esc(x.word)}${x.freq ? ' ★' : ''}`).join(' · ')}</div>`; }
      return `<div><i>${++k}</i>${esc(w.word)}${w.freq ? ' ★' : ''}</div>`; }).join('')).join('');
    const today = new Date().toLocaleDateString('ko-KR');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.name)} 오답 시험지</title><style>
      @page{size:A4;margin:16mm 14mm}body{font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#1C2420;font-size:13px}
      .hd{display:flex;align-items:flex-end;gap:14px;border-bottom:3px solid #1E3F2E;padding-bottom:8px;margin-bottom:14px}.hd h1{margin:0;font-size:22px;color:#1E3F2E}.hd .m{margin-left:auto;font-size:12px;color:#5F6A65}
      .hd .sc{border:2px solid #C8582A;padding:4px 12px;font-weight:700;color:#C8582A}
      h2{font-size:15px;color:#1E3F2E;border-left:5px solid #6B7B2C;padding-left:8px;margin:18px 0 8px}h2 small{color:#5F6A65;font-weight:400}
      .q{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #E5DCC5;break-inside:avoid}.n{flex:none;width:24px;height:24px;background:#1E3F2E;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:4px}
      .src{font-size:11px;color:#C8582A;font-weight:700}.s,.sum{font-family:Georgia,serif;font-size:14px;line-height:1.75}.pas{font-family:Georgia,serif;font-size:12.5px;line-height:1.6;color:#333;margin:2px 0 4px}
      .bl{font-family:Georgia,serif;color:#1E3F2E;letter-spacing:1px}.ko{font-size:11.5px;color:#5F6A65}.bogi{font-size:12px;color:#1E3F2E;margin:2px 0}
      .key{page-break-before:always}.key .g{columns:3;font-size:13px}.key .g div{break-inside:avoid;padding:2px 0}.key i{font-style:normal;color:#C8582A;font-weight:700;display:inline-block;width:26px}
      .note{font-size:11.5px;color:#5F6A65;margin-bottom:6px}
    </style></head><body>
      <div class="hd"><h1>오답 맞춤 시험지</h1><div>${esc(s.name)} · ${today}</div><div class="m">어휘요약문 로드맵 · ${n}문항</div><div class="sc">&nbsp;&nbsp;&nbsp;&nbsp;/ ${n}</div></div>
      <div class="note">지금까지 틀린 단어만 모았어요. 기출 빈출 단어(정답지 ★)부터 확실히 외우세요.</div>${qs}
      <div class="key"><div class="hd"><h1>정답</h1><div>${esc(s.name)}</div></div><div class="g">${key}</div></div>
      <script>setTimeout(()=>print(),400)<\/script></body></html>`;
    const w = window.open('', '_blank'); if (!w) return toast('팝업이 막혀 있어요. 팝업을 허용해 주세요.');
    w.document.write(html); w.document.close();
  }

  /* ---------- 반 히트맵 · 주의 학생 · 주간 요약 ---------- */
  function classH(S, per){
    const cols = [...YDL.map(l => ({ id: l.id + '-test', h: `BC${l.no}`, g: 'bc' })), ...(OTWS ? OTWS.days.map(D => ({ id: `s1d${D.d}-test`, h: `D${D.d}`, g: 'otw' })) : []), ...(FINS ? FINS.rounds.map(R => ({ id: `s1r${R.r}-test`, h: `F${R.r}`, g: 'fin' })) : [])];
    const D = S.map(s => ({ s, rows: per(s), d: student(per(s)) }));
    const cell = (rows, c) => { const t = rows.find(r => r.course === 'ydvoca' && r.unit_id === c.id), d = (t && t.data) || {}, att = (d.attempts || []).length + (d.paper || []).length;
      const sc = d.best ? (d.best.score != null ? d.best.score : d.best.total != null ? Math.round(d.best.total / 30 * 100) : '') : '';
      const cls = d.passed ? 'ok' : att >= 3 ? 'bad' : att ? 're' : 'no';
      return `<td class="hm ${cls}" title="${c.h} · ${d.passed ? '통과' : att ? '재시험 ' + att + '회' : '안 함'}${sc !== '' ? ' · 최고 ' + sc : ''}">${sc !== '' ? sc : ''}</td>`; };
    let h = `<h3 style="margin:30px 0 6px;font-size:18px">반 히트맵 · 내신 진단 <small class="muted" style="font-weight:500;font-size:13px">초록 통과 · 주황 재시험 · 빨강 재시험 2번 이상 불통과 · 회색 안 함 · 숫자 = 최고점(100점 환산)</small></h3>`;
    h += `<div class="tw"><table class="hmap"><tr><th>이름</th>${cols.map((c, i) => `<th class="${c.g}${i && cols[i - 1].g !== c.g ? ' gs' : ''}">${c.h}</th>`).join('')}<th>진단</th></tr>`;
    D.forEach(({ s, rows, d }) => { h += `<tr><td class="nm"><a href="#" data-dgopen="${s.id}"><b>${esc(s.name)}</b></a>${d.flags.length ? ' <span class="dg-warn" title="' + esc(d.flags.join(' · ')) + '">⚠</span>' : ''}</td>${cols.map(c => cell(rows, c)).join('')}<td class="muted" style="font-size:11.5px;min-width:180px">${esc(d.summary[0] || '')}</td></tr>`; });
    h += `</table></div>`;
    // 주의 학생
    const warn = D.filter(x => x.d.flags.length);
    h += `<div class="dg-box"><b>⚠ 주의 학생 ${warn.length}명</b>${warn.length ? warn.map(x => `<div><a href="#" data-dgopen="${x.s.id}"><b>${esc(x.s.name)}</b></a> — ${esc(x.d.flags.join(' · '))}</div>`).join('') : '<div class="muted">지금은 없어요.</div>'}</div>`;
    // 주간 요약
    const wk = Date.now() - 7 * 864e5; let passW = 0, attW = 0; const errC = { spell: 0, form: 0, meaning: 0, blank: 0 }, wc = {};
    D.forEach(({ rows, d }) => { rows.filter(r => r.course === 'ydvoca' && /-test$/.test(r.unit_id)).forEach(r => (((r.data || {}).attempts) || []).forEach(a => { if (a.at >= wk) { attW++; if (a.passed) passW++; } }));
      Object.keys(errC).forEach(k => errC[k] += d.err[k]); d.words.forEach(w => { if (w.mcq) return; const c = wc[w.word] = wc[w.word] || { w: w.word, n: 0, freq: w.freq, where: w.where[0] }; c.n++; }); });
    const top = Object.values(wc).sort((a, b) => b.n - a.n).slice(0, 10), eN = Object.values(errC).reduce((a, b) => a + b, 0);
    h += `<div class="dg-box"><b>이번 주 요약</b><div>최근 7일 응시 <b>${attW}</b>회 · 통과 <b>${passW}</b>회 · 주의 학생 <b>${warn.length}</b>명</div>
      ${eN ? `<div>반 오답 유형 — ${Object.entries(errC).map(([k, v]) => `${TY[k][0]} ${Math.round(v / eN * 100)}%`).join(' · ')}</div>` : ''}
      ${top.length ? `<div style="margin-top:4px">반 전체가 많이 틀린 단어 (수업에서 다시 짚기): ${top.map(t => `<b>${esc(t.w)}</b>${t.freq ? '★' : ''} <span class="muted">${t.n}명</span>`).join(' · ')}</div>` : ''}</div>`;
    return h;
  }
  function bindClass(){ document.querySelectorAll('[data-dgopen]').forEach(a => a.onclick = e => { e.preventDefault(); openStudent(a.dataset.dgopen); }); }

  /* ---------- AI 리포트용 요약 ---------- */
  function facts(rows){
    const d = student(rows); if (!d.started) return null;
    return { 한줄진단: d.summary, 주의: d.flags, 오답유형: Object.fromEntries(Object.entries(d.err).map(([k, v]) => [TY[k][0], v])),
      약한영역: d.areas.filter(a => a.pct < 70).map(a => `${a.name} ${a.pct}%`), 자주틀린단어: d.words.slice(0, 8).map(w => `${w.word}${w.freq ? '(기출 빈출)' : ''} ${w.n}회`),
      남은오답: d.backlog, 추천처방: d.pres.map(p => p.title) };
  }
  return { classify, student, cardH, bindCard, classH, bindClass, facts, printWrong };
})();
