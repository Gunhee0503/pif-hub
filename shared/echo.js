/* ECHO · 수업 구문 다시듣기 — 허브에서 구문 드릴(syntax-drill) 서버 함수 부르기
   데이터는 syntax-drill 프로젝트에 있고, 이 함수가 허브 로그인(VT.sb 세션)을 허브에 직접 확인한다.
   허브 토큰은 x-hub-token 머리글로 보냄 (Authorization은 쓰지 않음). */
(function () {
  'use strict';
  var FN = 'https://kyboczqmdrjkubklajtb.supabase.co/functions/v1/echo';
  var KEY = 'sb_publishable_ftGo0kcR3GjcT6UM4giMxA_6Ca5qahQ';   // syntax-drill 공개키
  async function call(sb, op, body) {
    var s = await sb.auth.getSession();
    var t = s && s.data && s.data.session && s.data.session.access_token;
    if (!t) throw new Error('NO_SESSION');
    var r = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, 'x-hub-token': t },
      body: JSON.stringify(Object.assign({ op: op }, body || {}))
    });
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || ('HTTP_' + r.status));
    return j;
  }
  window.ECHO = { call: call };
})();
