/* 보카트리 통합 공통 모듈 (VT)
   - BEACON과 같은 Supabase 프로젝트를 공유: 반 코드 + 이름 + 휴대폰 뒷자리 4 → 선생님 승인
   - 코스별 진도는 vt_progress 에 저장 (RPC vt_save_progress)
   - 기존 앱(Fundamental/Essential/Spectrum)은 localStorage 키 묶음을 그대로 서버에 동기화
*/
(function () {
  'use strict';
  var SB_URL = 'https://ucacbqkmckucahvsowtu.supabase.co';
  var SB_KEY = 'sb_publishable_Eh7x8AdkJx44szuHJtIbAQ__LmzxNac';
  var MARK = 'vt_me';               // {sid, name, class_code, class_name, ts}
  var COURSES = {
    fundamental: { name: 'Fundamental', ko: '보카트리 펀더멘탈', path: '/fundamental/', prefixes: ['vocaTree'] },
    essential:   { name: 'Essential',   ko: '보카트리 에센셜',   path: '/essential/',   prefixes: ['vte_'] },
    spectrum:    { name: 'Spectrum',    ko: '보카트리 스펙트럼', path: '/spectrum/',    prefixes: ['vts_'] },
    matching:    { name: 'Word Matching', ko: '어휘 매칭 훈련',  path: '/matching/',    prefixes: ['vtm_'], native: true },
    grammar:     { name: 'Grammar STEP',  ko: '문법 · 출제자의 시선', path: '/grammar/', prefixes: ['vtg_'], native: true },
    gfirst:      { name: 'Grammar 첫단추', ko: '문법 · 그래머 첫단추', path: '/firstbutton/', prefixes: ['vtf_'], native: true }
  };
  var LS = (function () { try { var k = '__vt'; localStorage.setItem(k, 1); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
  var rawSet = LS ? Storage.prototype.setItem : null;
  /* 이전 주소(voca-tree-*.vercel.app)에서 넘어온 기기 기록: #vtimport=<base64 JSON> */
  (function () {
    var h = location.hash || '';
    if (h.indexOf('#vtimport=') !== 0) return;
    try { sessionStorage.setItem('vt_import', h.slice(10)); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  })();
  var rawRemove = LS ? Storage.prototype.removeItem : null;

  var sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  function me() { try { return JSON.parse(LS.getItem(MARK) || 'null'); } catch (e) { return null; } }
  function setMe(st) {
    var v = st ? { sid: st.student_id, name: st.name, class_code: st.class_code, class_name: st.class_name, ts: Date.now() } : null;
    try { v ? rawSet.call(LS, MARK, JSON.stringify(v)) : rawRemove.call(LS, MARK); } catch (e) {}
    return v;
  }

  async function status() {
    if (!sb) throw new Error('Supabase 로드 실패');
    var s = await sb.auth.getSession();
    if (!s.data.session) return null;
    var r = await sb.rpc('my_status'); if (r.error) throw r.error;
    return (r.data && r.data[0]) || null;
  }

  function errText(e) {
    var m = (e && (e.message || e.error_description || e.msg)) || String(e);
    if (/CLASS_NOT_FOUND/.test(m)) return '반 코드를 찾을 수 없어요. 선생님께 받은 코드를 다시 확인해 주세요.';
    if (/BAD_NAME/.test(m)) return '이름을 확인해 주세요.';
    if (/BAD_LAST4/.test(m)) return '휴대폰 뒷자리 숫자 4개를 입력해 주세요.';
    if (/[Aa]nonymous sign-ins are disabled/.test(m)) return '학생 로그인이 아직 열리지 않았어요. 선생님께 알려 주세요.';
    if (/rate limit|too many/i.test(m)) return '잠시 후 다시 시도해 주세요. (요청이 많아요)';
    if (/Invalid login credentials/.test(m)) return '이메일 또는 비밀번호가 맞지 않아요.';
    if (/Email not confirmed/.test(m)) return '메일함의 확인 링크를 먼저 눌러 주세요.';
    if (/already registered/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
    if (/Password should be/i.test(m)) return '비밀번호는 8자 이상으로 정해 주세요.';
    if (/NOT_APPROVED/.test(m)) return '아직 선생님 승인 전이에요.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return '인터넷 연결을 확인해 주세요.';
    return '문제가 생겼어요: ' + m;
  }

  /* 반에 열린 코스 ['fundamental',...,'syntax'] + 구문 편(edition) */
  async function access() {
    var r = await sb.rpc('vt_my_access'); if (r.error) throw r.error;
    var a = (r.data && r.data[0]) || null;
    if (a) { var m = me(); if (m) { m.courses = a.courses; m.edition = a.edition; try { rawSet.call(LS, MARK, JSON.stringify(m)); } catch (e) {} } }
    return a;
  }
  function allowed(course) { var m = me(); return !m || !m.courses || m.courses.indexOf(course) >= 0; }

  async function requestAccess(code, name, last4) {
    var s = await sb.auth.getSession(), session = s.data.session;
    if (session && session.user && !session.user.is_anonymous) { await sb.auth.signOut(); session = null; }
    if (!session) { var a = await sb.auth.signInAnonymously(); if (a.error) throw a.error; }
    var r = await sb.rpc('request_access', { p_class: code, p_name: name, p_last4: last4 });
    if (r.error) throw r.error;
    return status();
  }

  /* ---------- 진도 저장 ---------- */
  async function save(course, unit, data, opt) {
    opt = opt || {};
    var r = await sb.rpc('vt_save_progress', {
      p_course: course, p_unit: unit, p_data: data,
      p_score: opt.score == null ? null : opt.score, p_max: opt.max == null ? null : opt.max,
      p_completed: !!opt.completed
    });
    if (r.error) throw r.error;
  }
  async function load(course, unit) {
    var m = me(); if (!m) return [];
    var q = sb.from('vt_progress').select('course,unit_id,data,score,max_score,completed,updated_at').eq('student_id', m.sid);
    if (course) q = q.eq('course', course);
    if (unit) q = q.eq('unit_id', unit);
    var r = await q; if (r.error) throw r.error;
    return r.data || [];
  }
  /* 시도 기록 누적 (Fundamental 결과 제출용) */
  async function appendAttempt(course, unit, attempt, opt) {
    var rows = await load(course, unit);
    var d = (rows[0] && rows[0].data) || {};
    var list = Array.isArray(d.attempts) ? d.attempts : [];
    list.push(attempt); if (list.length > 30) list = list.slice(-30);
    var best = Math.max(d.best || 0, (opt && opt.score) || 0);
    await save(course, unit, { attempts: list, best: best }, { score: best, max: opt && opt.max, completed: opt && opt.completed });
  }

  /* ---------- localStorage 묶음 동기화 (기존 앱용) ---------- */
  function keysWith(prefixes) {
    var out = {};
    if (!LS) return out;
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i);
      if (k && prefixes.some(function (p) { return k.indexOf(p) === 0; })) out[k] = LS.getItem(k);
    }
    return out;
  }
  function parse(v) { try { return JSON.parse(v); } catch (e) { return v; } }
  function mergeVal(a, b) {            // a: local, b: server  (둘 다 파싱된 값)
    if (a == null) return b; if (b == null) return a;
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (typeof a === 'string' && typeof b === 'string') {
      var na = Number(a), nb = Number(b);
      if (a !== '' && b !== '' && !isNaN(na) && !isNaN(nb)) return String(Math.max(na, nb));
      return a || b;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      var seen = {}, out = [];
      a.concat(b).forEach(function (x) { var s = JSON.stringify(x); if (!seen[s]) { seen[s] = 1; out.push(x); } });
      return out;
    }
    if (typeof a === 'object' && typeof b === 'object') {
      var o = {}; Object.keys(b).concat(Object.keys(a)).forEach(function (k) { o[k] = mergeVal(a[k], b[k]); });
      if (Array.isArray(o.correct) && Array.isArray(o.wrong)) o.wrong = o.wrong.filter(function (w) { return o.correct.indexOf(w) < 0; });
      return o;
    }
    return a;
  }
  function serial(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
  function clearPrefixes() {
    if (!LS) return;
    var all = [];
    Object.keys(COURSES).forEach(function (c) { all = all.concat(COURSES[c].prefixes); });
    Object.keys(keysWith(all)).forEach(function (k) { try { rawRemove.call(LS, k); } catch (e) {} });
  }
  /* 서버 스냅샷을 localStorage에 합쳐 넣음. 바뀐 키가 있으면 true */
  async function pull(courses) {
    var rows = await load();
    var changed = false;
    (courses || Object.keys(COURSES)).forEach(function (c) {
      var row = rows.filter(function (r) { return r.course === c && r.unit_id === 'state'; })[0];
      if (!row || !row.data || !row.data.ls) return;
      Object.keys(row.data.ls).forEach(function (k) {
        if (!COURSES[c].prefixes.some(function (p) { return k.indexOf(p) === 0; })) return;
        var local = LS.getItem(k), server = row.data.ls[k];
        var merged = local == null ? server : serial(mergeVal(parse(local), parse(server)));
        if (merged !== local) { try { rawSet.call(LS, k, merged); changed = true; } catch (e) {} }
      });
    });
    return changed;
  }
  function fundUserKey(m) {
    var z = function (x) { return String(x || '').replace(/[\s:|]/g, '_'); };
    return z(m.name) + '|' + z(m.class_name) + '|' + z(m.class_code) + '|' + z(String(m.sid).slice(0, 4));
  }
  /* 넘어온 기록을 이 학생의 localStorage에 합침. 바뀐 코스 목록을 돌려줌 */
  function applyImport() {
    var raw; try { raw = sessionStorage.getItem('vt_import'); } catch (e) {}
    if (!raw || !LS) return [];
    var m = me(); if (!m) return [];
    var data; try { data = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw))))); } catch (e) { data = null; }
    try { sessionStorage.removeItem('vt_import'); } catch (e) {}
    if (!data || typeof data !== 'object') return [];
    var touched = {};
    Object.keys(data).forEach(function (k) {
      var key = k;
      if (k.indexOf('vocaTreeLessonScores::') === 0 || k.indexOf('vocaTreeTotalLearningTime::') === 0) {
        var parts = k.split('::'), who = (parts[1] || '').split('|')[0];
        if (who !== String(m.name).replace(/[\s:|]/g, '_')) return;      // 같은 기기를 쓴 다른 학생 기록은 가져오지 않음
        key = parts[0] + '::' + fundUserKey(m);
      }
      var course = null;
      Object.keys(COURSES).forEach(function (c) { if (COURSES[c].prefixes.some(function (p) { return key.indexOf(p) === 0; })) course = c; });
      if (!course || COURSES[course].native) return;
      var local = LS.getItem(key), merged = local == null ? data[k] : serial(mergeVal(parse(local), parse(data[k])));
      if (merged !== local) { try { rawSet.call(LS, key, merged); touched[course] = 1; } catch (e) {} }
    });
    return Object.keys(touched);
  }
  var syncTimers = {};
  function pushState(course) {
    var c = COURSES[course]; if (!c || !me()) return Promise.resolve();
    var snap = keysWith(c.prefixes);
    var summary = (VT.summarize && VT.summarize[course]) ? VT.summarize[course](snap) : null;
    return save(course, 'state', { ls: snap }, summary || {}).catch(function () {
      clearTimeout(syncTimers[course]); syncTimers[course] = setTimeout(function () { pushState(course); }, 15000);
    });
  }
  function watch(course) {
    var c = COURSES[course]; if (!LS || !c) return;
    function touched(k) { return k && c.prefixes.some(function (p) { return String(k).indexOf(p) === 0; }); }
    function queue() { clearTimeout(syncTimers[course]); syncTimers[course] = setTimeout(function () { pushState(course); }, 1200); }
    Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === LS && touched(k)) queue(); };
    Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === LS && touched(k)) queue(); };
    function flush() { if (syncTimers[course]) { clearTimeout(syncTimers[course]); syncTimers[course] = null; pushState(course); } }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  }

  /* ---------- 코스 페이지 게이트 ----------
     <head>에서 동기적으로 호출: 로그인 표시가 없으면 홈으로 보냄.
     있으면 앱을 그대로 실행하고, 뒤에서 서버 상태를 확인/동기화. */
  function gate(course) {
    var m = me();
    if (!m) { location.replace('/learn/?next=' + encodeURIComponent(location.pathname)); document.documentElement.style.display = 'none'; return null; }
    if (course && !allowed(course)) { location.replace('/learn/?locked=' + course); document.documentElement.style.display = 'none'; return null; }
    if (course && COURSES[course] && !COURSES[course].native) watch(course);
    window.addEventListener('DOMContentLoaded', function () { chip(m); });
    (async function () {
      try {
        var st = await status();
        if (!st || st.status !== 'approved' || st.student_id !== m.sid) { setMe(null); clearPrefixes(); location.replace('/learn/'); return; }
        try { await access(); } catch (e) {}
        if (course && !allowed(course)) { location.replace('/learn/?locked=' + course); return; }
        if (course && !COURSES[course].native) {
          var changed = await pull([course]);
          var imp = applyImport();
          if (imp.length) { await Promise.all(imp.map(function (c) { return pushState(c); })); if (imp.indexOf(course) >= 0) changed = true; }
          var flag = 'vt_reloaded_' + course;
          if (changed && !sessionStorage.getItem(flag)) { sessionStorage.setItem(flag, '1'); location.reload(); return; }
          sessionStorage.removeItem(flag);
          pushState(course);
        }
      } catch (e) { /* 오프라인이면 그대로 학습 계속 */ }
    })();
    return m;
  }
  function chip(m) {
    if (document.getElementById('vt-chip') || document.body.dataset.vtNoChip != null) return;
    var bar = document.createElement('nav');
    bar.id = 'vt-chip'; bar.setAttribute('aria-label', 'PIF Hub 이동');
    var home = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';
    bar.innerHTML = '<a href="/" title="처음 화면(소개 페이지)">' + home + '<span>처음으로</span></a><i></i><a href="/learn/">내 학습</a>';
    bar.setAttribute('style', 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(10px,env(safe-area-inset-bottom));z-index:99999;display:flex;align-items:center;' +
      'padding:3px;border-radius:999px;background:rgba(29,29,31,.74);box-shadow:0 6px 18px -8px rgba(0,0,0,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)');
    Array.prototype.forEach.call(bar.querySelectorAll('a'), function (a) {
      a.setAttribute('style', 'display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;color:#f5f5f7;' +
        'font:600 12px/1 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;text-decoration:none;white-space:nowrap');
    });
    bar.querySelector('i').setAttribute('style', 'width:1px;height:14px;background:rgba(255,255,255,.25)');
    document.body.appendChild(bar);
  }


  async function logout() {
    var m = me();
    if (m) { await Promise.all(Object.keys(COURSES).map(function (c) { return syncTimers[c] ? pushState(c) : null; })); }
    try { await sb.auth.signOut(); } catch (e) {}
    setMe(null); clearPrefixes();
    try { sessionStorage.removeItem('voca_user'); } catch (e) {}
  }

  /* ---------- AI 피드백 ---------- */
  async function ai(payload) {
    var r = await sb.functions.invoke('vt-ai', { body: payload });
    if (r.error) {
      var detail = null;
      try { detail = await r.error.context.json(); } catch (e) {}
      var err = new Error((detail && detail.error) || r.error.message || 'AI_ERROR');
      err.code = detail && detail.error; throw err;
    }
    return r.data;
  }

  /* ---------- 로그인한 사람만 받는 파일 (Edge Function hub-file) ---------- */
  async function download(file, kind, filename) {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) { var e0 = new Error('NOT_LOGGED_IN'); e0.code = 'NOT_LOGGED_IN'; throw e0; }
    var r = await fetch(SB_URL + '/functions/v1/hub-file', { method: 'POST',
      headers: { Authorization: 'Bearer ' + s.access_token, apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: file, kind: kind || 'student' }) });
    if (!r.ok) { var code = null; try { code = (await r.json()).error; } catch (x) {} var e = new Error(code || ('HTTP ' + r.status)); e.code = code; throw e; }
    var blob = await r.blob(), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename || (file + '.pdf'); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  var VT = window.VT = {
    sb: sb, COURSES: COURSES, me: me, setMe: setMe, status: status, requestAccess: requestAccess, errText: errText,
    access: access, allowed: allowed, applyImport: applyImport, save: save, load: load, appendAttempt: appendAttempt, pull: pull, pushState: pushState, clearPrefixes: clearPrefixes,
    gate: gate, logout: logout, ai: ai, download: download, summarize: {}
  };

  /* 코스별 요약 점수 (관리자 목록용): {score, max, completed} */
  VT.summarize.essential = function (snap) {
    var done = 0, n = 0;
    Object.keys(snap).forEach(function (k) {
      if (/^vte_part_done_lesson\d+$/.test(k)) { n++; var d = parse(snap[k]) || {};
        if (['p1', 'p2', 'p3'].every(function (p) { return (d[p] || 0) >= 80; })) done++; }
    });
    return { score: done, max: 5, completed: done >= 5 };
  };
  VT.summarize.spectrum = function (snap) {
    var done = 0;
    Object.keys(snap).forEach(function (k) { var m = /^vts_p01_score_lesson(\d+)$/.exec(k); if (m && Number(snap[k]) >= 80) done++; });
    return { score: done, max: 4, completed: false };
  };
  VT.summarize.fundamental = function (snap) {
    var done = 0;
    Object.keys(snap).forEach(function (k) {
      if (k.indexOf('vocaTreeLessonScores') !== 0) return;
      var d = parse(snap[k]) || {};
      Object.keys(d).forEach(function (l) { var p = d[l] || {}; var v = Object.keys(p).map(function (x) { return p[x]; });
        if (v.length >= 3 && v.every(function (x) { return x >= 80; })) done++; });
    });
    return { score: done, max: 4, completed: done >= 4 };
  };
})();
