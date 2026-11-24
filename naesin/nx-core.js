/* 내신 동형모의고사 공통 (학생 앱 · 관리자 함께 씀)
   - 시험 묶음: hub-file 'mk-<id>' → { id, title, minutes, mc:[{no,pts,ans,note,src,ex,img}], sa:[{no,type,pts,src,img,ex:[[라벨,글]],kind,...}] }
   - 진도: vt_progress course 'naesin', unit 'mk-<id>'
       data = { v:1,
         att: [{ at, mode:'full'|'mc'|'sa'|'cum', sec, sc, mx, mc:[점,만점], sa:[점,만점], a:{ m1:3, s1:['..','..'], s9:[['틀린','고친'],..], s10:[[3,'word'],..] } }],
         ev:  { m1:[[날짜,1|0|2,cid?], ...], s4:[...] }   1 맞음 · 0 틀림 · 2 선생님 확인 요청 중
         cl:  { cid:{ k, t(시도 at), g(잃은 점수), a(학생 답 글), c(정답 글), at } }
         dn:  { s4:'2026-11-25' }   학생이 스스로 뺀 날 }
   - 오답 졸업: 틀린 날보다 '다른 날(나중 날짜)'에 다시 맞히면 자동으로 빠짐, 또는 학생이 직접 빼기 */
(function () {
  'use strict';
  var NX = {};
  NX.CIRC = ['①', '②', '③', '④', '⑤'];
  NX.today = function () { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); };   // 한국 날짜
  NX.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  NX.r1 = function (x) { return Math.round(x * 10) / 10; };

  /* ---------- 시험 묶음 ---------- */
  var CACHE = {};
  NX.fetchExam = function (id) {
    if (!CACHE[id]) CACHE[id] = VT.fetchFile('mk-' + id).then(function (b) { return b.text(); }).then(function (t) { return JSON.parse(t); })
      .catch(function (e) { delete CACHE[id]; throw e; });
    return CACHE[id];
  };
  NX.item = function (ex, key) { var n = +key.slice(1); return (key[0] === 'm' ? ex.mc : ex.sa).filter(function (q) { return q.no === n; })[0]; };
  NX.keys = function (ex, which) {
    var a = [];
    if (which !== 'sa') ex.mc.forEach(function (q) { a.push('m' + q.no); });
    if (which !== 'mc') ex.sa.forEach(function (q) { a.push('s' + q.no); });
    return a;
  };
  NX.label = function (key) { return (key[0] === 'm' ? '객관식 ' : '서답형 ') + key.slice(1); };

  /* ---------- 채점 ---------- */
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ').trim().replace(/^[\s"'.,;:!?()\[\]]+|[\s"'.,;:!?()\[\]]+$/g, '');
  }
  NX.norm = norm;
  function hasWord(hay, needle) { return needle && (' ' + hay + ' ').indexOf(' ' + needle + ' ') >= 0; }
  NX.parts = function (q) {          // 서답형 칸 이름
    if (q.kind === 'blank') return q.blanks.map(function (b) { return '(' + b.k + ')'; });
    if (q.kind === 'fix') return q.fix.map(function (_, i) { return '어법 ' + (i + 1); });
    return q.wrong.map(function (_, i) { return '오류 ' + (i + 1); });
  };
  NX.answerText = function (q) {      // 정답 글
    if (q.kind === 'blank') return q.blanks.map(function (b) { return '(' + b.k + ') ' + b.acc.join(' / '); });
    if (q.kind === 'fix') return q.fix.map(function (f) { return f.w + ' → ' + f.c.join(' / '); });
    return q.wrong.map(function (w) { return NX.CIRC[w.n - 1] + ' ' + w.w + (w.c ? ' (→ ' + w.c + ')' : ''); });
  };
  NX.myText = function (q, a) {
    a = a || [];
    if (q.kind === 'blank') return q.blanks.map(function (b, i) { return '(' + b.k + ') ' + (a[i] || '—'); });
    if (q.kind === 'fix') return q.fix.map(function (_, i) { var r = a[i] || []; return (r[0] || '—') + ' → ' + (r[1] || '—'); });
    return q.wrong.map(function (_, i) { var r = a[i] || []; return (r[0] ? NX.CIRC[r[0] - 1] : '—') + ' ' + (r[1] || '—'); });
  };
  /* 서답형 채점 → { got, max, ok, parts:[bool], hit:[학생 칸 i → 맞춘 정답 j] } */
  NX.gradeSA = function (q, a) {
    a = a || []; var pts = q.pts, res = { max: pts, parts: [] };
    if (q.kind === 'blank') {
      res.parts = q.blanks.map(function (b, i) { var x = norm(a[i]); return !!x && b.acc.some(function (y) { return norm(y) === x; }); });
    } else if (q.kind === 'fix') {
      var used = {};
      res.parts = q.fix.map(function (f) {
        var fw = norm(f.w);
        for (var i = 0; i < 4 && i < Math.max(a.length, q.fix.length); i++) {
          if (used[i]) continue;
          var r = a[i] || [], sw = norm(r[0]), sc = norm(r[1]);
          if (!sw || !sc || !hasWord(sw, fw)) continue;
          var ok = f.c.some(function (c) {
            var nc = norm(c); if (sc === nc) return true;
            var exp = (' ' + sw + ' ').replace(' ' + fw + ' ', ' ' + nc + ' ').trim();   // 앞뒤 낱말까지 같이 쓴 경우
            return sc === exp;
          });
          if (ok) { used[i] = 1; return true; }
        }
        return false;
      });
    } else {
      var used2 = {};
      res.parts = q.wrong.map(function (w) {
        for (var i = 0; i < a.length; i++) {
          if (used2[i]) continue; var r = a[i] || [];
          if (+r[0] === w.n && (norm(r[1]) === norm(w.w) || hasWord(norm(r[1]), norm(w.w)))) { used2[i] = 1; return true; }
        }
        return false;
      });
    }
    var each = pts / res.parts.length;
    res.got = NX.r1(res.parts.filter(Boolean).length * each);
    res.ok = res.parts.every(Boolean);
    return res;
  };
  NX.gradeMC = function (q, a) { var ok = +a === q.ans; return { got: ok ? q.pts : 0, max: q.pts, ok: ok }; };
  NX.grade = function (ex, key, a) { var q = NX.item(ex, key); return key[0] === 'm' ? NX.gradeMC(q, a) : NX.gradeSA(q, a); };
  NX.answered = function (key, a) {
    if (key[0] === 'm') return !!a;
    return Array.isArray(a) && a.some(function (x) { return Array.isArray(x) ? x.some(function (y) { return String(y || '').trim(); }) : String(x || '').trim(); });
  };

  /* ---------- 기록 ---------- */
  NX.blank = function () { return { v: 1, att: [], ev: {}, cl: {}, dn: {} }; };
  NX.fix = function (d) { d = d || {}; d.att = d.att || []; d.ev = d.ev || {}; d.cl = d.cl || {}; d.dn = d.dn || {}; return d; };
  NX.pushEv = function (d, key, ok, cid) {
    var L = d.ev[key] = d.ev[key] || [], e = [NX.today(), ok ? 1 : 0];
    if (cid) e = [NX.today(), 2, cid];
    L.push(e); if (L.length > 14) d.ev[key] = L.slice(-14);
  };
  /* 선생님 판정: revs = { cid: true|false } */
  function evVal(e, revs) { if (e[1] !== 2) return e[1]; var r = revs && revs[e[2]]; return r === false ? 0 : 1; }
  NX.state = function (d, key, revs) {   // 한 문항의 오답 상태
    var L = (d.ev && d.ev[key]) || [], wrong = 0, lw = '', lastOK = '', pend = false;
    L.forEach(function (e) { var v = evVal(e, revs); if (e[1] === 2 && !(revs && e[2] in revs)) pend = true;
      if (v === 0) { wrong++; if (e[0] > lw) lw = e[0]; } });
    L.forEach(function (e) { if (evVal(e, revs) === 1 && e[0] > lastOK) lastOK = e[0]; });
    if (!wrong) return { in: false, wrong: 0, pend: pend };
    var grad = L.some(function (e) { return evVal(e, revs) === 1 && e[0] > lw; });
    var self = d.dn && d.dn[key] && d.dn[key] >= lw;
    return { in: !grad && !self, wrong: wrong, lw: lw, grad: grad, self: !!self && !grad, sameDayOK: !grad && lastOK === lw, pend: pend, last: L[L.length - 1] };
  };
  /* 반 학생의 오답 목록: rows = vt_progress 행들(course naesin) → [{ ex(id), key, st }] */
  NX.notes = function (rows, revs, onlyIn) {
    var out = [];
    rows.forEach(function (r) {
      var m = /^mk-(.+)$/.exec(r.unit_id); if (!m) return; var d = NX.fix(r.data);
      Object.keys(d.ev).forEach(function (k) { var st = NX.state(d, k, revs); if (st.wrong && (!onlyIn || st.in)) out.push({ ex: m[1], key: k, st: st }); });
    });
    return out.sort(function (a, b) { return a.ex < b.ex ? -1 : a.ex > b.ex ? 1 : (a.key[0] === b.key[0] ? +a.key.slice(1) - +b.key.slice(1) : a.key[0] < b.key[0] ? 1 : -1); });
  };
  /* 시도 점수 (선생님이 인정한 확인 요청만큼 더함) */
  NX.attScore = function (d, att, revs) {
    var add = 0; Object.keys(d.cl || {}).forEach(function (cid) { var c = d.cl[cid]; if (c.t === att.at && revs && revs[cid] === true) add += c.g || 0; });
    return NX.r1(att.sc + add);
  };
  NX.best = function (d, revs) {
    var b = null; (d.att || []).forEach(function (a) { if (a.mode === 'full') { var s = NX.attScore(d, a, revs); if (b == null || s > b) b = s; } });
    return b;
  };

  /* ---------- 인쇄 (누적 오답 테스트지) ---------- */
  /* items = [{ exam(묶음), key, n(틀린 횟수) }], o = { name, title, teacher } */
  NX.printSheet = function (items, o) {
    o = o || {}; var e = NX.esc, today = new Date().toLocaleDateString('ko-KR');
    var qs = items.map(function (it, i) {
      var q = NX.item(it.exam, it.key), lines = '';
      if (it.key[0] === 'm') lines = '<div class="omr">' + NX.CIRC.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>';
      else lines = NX.parts(q).map(function (p, i) {
        var bl = q.kind === 'blank' && q.blanks[i];
        if (bl && bl.first) { var pre = o.hint === false ? '' : bl.first, bx = '';
          for (var j = 0; j < bl.len - pre.length; j++) bx += '<u></u>';
          return '<div class="ln"><b>' + e(p) + '</b><span class="bx">' + (pre ? '<u class="f">' + e(pre) + '</u>' : '') + bx + '</span></div>'; }
        return q.kind === 'blank' ? '<div class="ln"><b>' + e(p) + '</b><span></span></div>'
          : q.kind === 'fix' ? '<div class="ln"><b>' + e(p) + '</b><span></span><i>→</i><span></span></div>'
          : '<div class="ln"><b>' + e(p) + '</b><em>번호</em><span class="sm"></span><em>틀린 단어</em><span></span></div>';
      }).join('');
      return '<div class="q"><div class="qh"><span class="n">' + (i + 1) + '</span><span class="src">' + e(it.exam.title.replace(/^.*모의고사\s*/, '')) + ' · ' + NX.label(it.key) +
        (q.type ? ' · ' + e(q.type) : '') + ' · ' + e(q.pts) + '점' + (it.n ? ' · 틀린 횟수 ' + it.n : '') + '</span></div>' +
        q.img.map(function (s) { return '<img src="' + s + '">'; }).join('') + '<div class="ans">' + lines + '</div></div>';
    }).join('');
    var key = items.map(function (it, i) {
      var q = NX.item(it.exam, it.key), body;
      if (it.key[0] === 'm') body = '<b>' + NX.CIRC[q.ans - 1] + '</b>' + (q.note ? ' <span class="nt">' + e(q.note) + '</span>' : '') + (o.teacher && q.ex ? '<div class="kx">' + e(q.ex) + '</div>' : '');
      else body = '<b>' + NX.answerText(q).map(e).join(' · ') + '</b>' + (o.teacher ? q.ex.filter(function (x) { return /정답 뜻|근거|해설|어형/.test(x[0]); }).slice(0, 2).map(function (x) { return '<div class="kx"><i>' + e(x[0]) + '</i> ' + e(x[1]) + '</div>'; }).join('') : '');
      return '<div class="kr"><i>' + (i + 1) + '</i><div><span class="ks">' + NX.label(it.key) + '</span> ' + body + '</div></div>';
    }).join('');
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + e(o.name || '') + ' 동형모의고사 누적 오답</title><style>' +
      '@page{size:A4;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#1B2236;font-size:12px}' +
      '.hd{display:flex;align-items:flex-end;gap:12px;border-bottom:3px solid #1B2A4A;padding-bottom:8px;margin-bottom:10px}.hd h1{margin:0;font-size:20px;color:#1B2A4A}.hd .sub{font-size:11.5px;color:#C2412D;font-weight:700;letter-spacing:.08em}' +
      '.hd .m{margin-left:auto;text-align:right;font-size:11px;color:#5B6478;line-height:1.5}.box{display:flex;gap:8px;margin-bottom:10px}.box div{flex:1;border:1.5px solid #1B2A4A;padding:6px 10px}.box b{margin-right:6px}' +
      '.q{padding:8px 0 12px;border-bottom:1px solid #D5DAE5}.qh{display:flex;align-items:center;gap:8px;margin-bottom:6px;break-after:avoid}.ans{break-inside:avoid}.n{flex:none;width:24px;height:24px;background:#1B2A4A;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:4px}' +
      '.src{font-size:11px;color:#C2412D;font-weight:700}.q img{display:block;width:100%;max-width:470px;margin:0 auto 4px;break-inside:avoid}' +
      '.ans{margin:6px 0 0 32px}.ln{display:flex;align-items:flex-end;gap:8px;padding:5px 0}.ln b{width:54px;color:#1B2A4A;font-size:12px}.ln span{flex:1;border-bottom:1.3px solid #1B2A4A;height:20px;max-width:240px}.ln span.sm{max-width:50px}.ln span.bx{border:0;height:auto;max-width:none;display:flex;gap:3px}.bx u{display:inline-flex;width:20px;height:22px;border:1.2px solid #1B2A4A;border-radius:3px;text-decoration:none;align-items:center;justify-content:center;font-weight:700;font-size:13px}.bx u.f{background:#EEF2F9}.ln em{font-style:normal;font-size:10.5px;color:#5B6478}.ln i{font-style:normal}' +
      '.omr{display:flex;gap:12px;font-size:17px;color:#1B2A4A}.key{page-break-before:always}.key h2{font-size:16px;color:#1B2A4A;border-bottom:2px solid #1B2A4A;padding-bottom:5px}' +
      '.kr{display:flex;gap:8px;padding:5px 0;border-bottom:1px dotted #D5DAE5;break-inside:avoid}.kr>i{font-style:normal;color:#C2412D;font-weight:700;width:22px;flex:none}.kr b{color:#1B2A4A;font-size:12.5px}.ks{font-size:10.5px;color:#5B6478}.nt{font-size:11px;color:#5B6478}' +
      '.kx{font-size:11px;line-height:1.55;margin-top:2px;color:#333}.kx i{font-style:normal;font-weight:700;color:#C2412D}.kg{columns:' + (o.teacher ? 1 : 2) + ';column-gap:22px}' +
      '</style></head><body><div class="hd"><div><div class="sub">내신 동형모의고사 · 누적 오답</div><h1>' + e(o.title || '누적 오답 테스트') + '</h1></div><div class="m">' + e(o.name || '') + '<br>' + today + ' · ' + items.length + '문항</div></div>' +
      '<div class="box"><div><b>이름</b>' + e(o.name || '') + '</div><div><b>점수</b></div></div>' + qs +
      '<div class="key"><h2>정답' + (o.teacher ? ' · 해설 (선생님용)' : '') + '</h2><div class="kg">' + key + '</div></div></body></html>';
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    var go = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (x) {} setTimeout(function () { f.remove(); }, 60000); };
    var imgs = f.contentDocument.images, left = imgs.length; if (!left) return setTimeout(go, 200);
    Array.prototype.forEach.call(imgs, function (im) { if (im.complete) { if (!--left) setTimeout(go, 200); } else im.onload = im.onerror = function () { if (!--left) setTimeout(go, 200); }; });
  };
  window.NX = NX;
})();
