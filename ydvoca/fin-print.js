/* 피날레 누적 오답 — 문항 고르기 · 시험지 출력 (학생 앱 /ydvoca/ 와 관리자 /admin/ 이 함께 씀)
   finPoolOf(get, uptoId)  get(unit) → 진도 data, uptoId 시즌 '앞' 시즌들에서 자주 틀린 문항 (uptoId 없으면 모든 시즌)
     자주 틀린 문항 = 지금도 틀린 채 남은 빈칸이 있거나, 어떤 빈칸을 2번 이상 틀린 문항 (리뷰 테스트 오답 + 연습 wc)
     fin-cum.rm 에 있는 문항(학생이 '완성'으로 뺀 문항)은 gone 으로
   finPrintSheet({ name, title, items, key: 'student'|'teacher' })  새 창에 A4 시험지를 만들고 인쇄 */
'use strict';
function finPoolOf(get, uptoId){
  const SS = (window.FIN && window.FIN.seasons) || [];
  const idx = uptoId ? SS.findIndex(s => s.id === uptoId) : SS.length;
  const rm = (get('fin-cum') || {}).rm || {}, out = [], gone = [];
  SS.slice(0, Math.max(0, idx)).forEach(S => S.rounds.forEach(R => {
    const u = S.id + 'r' + R.r, p = get(u + '-p') || {}, st = p.st || {}, wc = p.wc || {}, at = (get(u + '-test') || {}).attempts || [];
    R.qs.forEach(q => { let n = 0, open = false;
      Object.keys(q.bl).forEach(k => { const id = q.id + k, c = (wc[id] || 0) + at.filter(a => a.items && a.items[id] === 0).length; n = Math.max(n, c); if (st[id] === 0) open = true; });
      if (!(open || n >= 2)) return;
      const it = { key: S.id + 'r' + R.r + ':' + q.id, S, R, q, n: Math.max(n, 1), open };
      (rm[it.key] ? gone : out).push(it); });
  }));
  out.sort((a, b) => b.n - a.n || (b.open - a.open));
  return { out, gone };
}

function finPrintSheet(o){
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hl = t => e(t).replace(/\(([A-D])\)/g, '<b class="bl">($1)</b>');
  const items = o.items || [], teacher = o.key === 'teacher', today = new Date().toLocaleDateString('ko-KR');
  const qs = items.map((it, i) => { const q = it.q, ks = Object.keys(q.bl).sort();
    const rows = ks.map(k => { const ph = q.bl[k].map(b => (b.first || '') + ' ' + '_ '.repeat(Math.max(1, b.len - (b.first || '').length)).trim() + (b.sfx ? ' ' + b.sfx : '')).join('  또는  ');
      return `<div class="ln"><span class="k">${k === 'X' ? '정답' : '(' + k + ')'}</span><span class="w">${e(ph)}</span><span class="c">${q.bl[k].map(b => b.len + '자').join('/')}</span></div>`; }).join('');
    return `<div class="q"><div class="qh"><span class="n">${i + 1}</span><span class="src">${e(it.S.name)} · ${it.R.r}회 ${q.no}번 · 틀린 횟수 ${it.n}</span></div>
      <div class="ins">${e(q.inst)}</div>${q.title ? `<div class="tt">${e(q.title)}</div>` : ''}
      ${q.inpas ? `<div class="pas">${hl(q.pas)}</div>` : `<div class="pas">${e(q.pas)}</div><div class="sum">➜ ${hl(q.sum)}</div>`}
      ${q.bogi ? `<div class="bogi"><b>&lt;보기&gt;</b> ${q.bogi.map(w => `<span>${e(w)}</span>`).join('')}</div>` : ''}<div class="ans">${rows}</div></div>`; }).join('');
  const key = items.map((it, i) => { const q = it.q, ks = Object.keys(q.bl).sort(), ex = (q.ex && q.ex.b) || {};
    return `<div class="kr"><i>${i + 1}</i><div><b>${ks.map(k => (k === 'X' ? '' : '(' + k + ') ') + e(q.key[k].w)).join(' · ')}</b>
      ${teacher ? ks.filter(k => ex[k]).map(k => `<div class="kx">${k === 'X' ? '' : '(' + k + ') '}${e(ex[k][0])}${ex[k][2] ? ' — ' + e(ex[k][2]) : ''}</div>`).join('') : ''}
      <div class="ks">${ks.flatMap(k => q.key[k].src || []).slice(0, 2).map(e).join(' / ')}</div></div></div>`; }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${e(o.name || '')} 누적 오답 시험지</title><style>
    @page{size:A4;margin:14mm 13mm}*{box-sizing:border-box}body{margin:0;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#1C2420;font-size:12.5px}
    .hd{display:flex;align-items:flex-end;gap:12px;border-bottom:3px solid #141B2E;padding-bottom:8px;margin-bottom:10px}.hd h1{margin:0;font-size:21px;color:#141B2E}.hd .sub{font-size:12px;color:#C93A2E;font-weight:700;letter-spacing:.08em}
    .hd .m{margin-left:auto;text-align:right;font-size:11.5px;color:#5F6A65;line-height:1.5}.box{display:flex;gap:8px;margin-bottom:10px}.box div{flex:1;border:1.5px solid #141B2E;padding:6px 10px;font-size:12px}.box b{color:#141B2E;margin-right:6px}
    .note{font-size:11.5px;color:#5F6A65;margin-bottom:8px}
    .q{border-bottom:1px solid #DCCFAE;padding:10px 0 12px;break-inside:avoid}.qh{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    .n{flex:none;width:24px;height:24px;background:#141B2E;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:4px}
    .src{font-size:11px;color:#C93A2E;font-weight:700}.ins{font-size:12px;color:#444;line-height:1.5;margin:0 0 4px 32px}.tt{font:700 13.5px Georgia,serif;color:#141B2E;margin:2px 0 2px 32px}
    .pas{font:13px/1.7 Georgia,serif;margin-left:32px}.sum{font:13.5px/1.8 Georgia,serif;margin:6px 0 0 32px;background:#F7F2E6;border-left:4px solid #141B2E;padding:4px 10px}
    .bl{color:#C93A2E;font-family:Georgia,serif}.bogi{margin:6px 0 0 32px;border:1.3px dashed #141B2E;padding:5px 8px}.bogi b{color:#C93A2E;font-size:11.5px}.bogi span{display:inline-block;border:1px solid #141B2E;padding:1px 8px;margin:2px 5px 2px 0;font:600 13px Georgia,serif}
    .ans{margin:8px 0 0 32px}.ln{display:flex;align-items:baseline;gap:10px;padding:3px 0}.ln .k{font-weight:700;color:#141B2E;width:34px}.ln .w{flex:1;border-bottom:1.3px solid #141B2E;font:15px Georgia,serif;letter-spacing:1px;color:#999;padding-bottom:2px;max-width:330px}.ln .c{font-size:11px;color:#5F6A65}
    .key{page-break-before:always}.kr{display:flex;gap:8px;padding:5px 0;border-bottom:1px dotted #DCCFAE;break-inside:avoid}.kr i{font-style:normal;color:#C93A2E;font-weight:700;width:24px;flex:none}
    .kr b{font:700 13.5px Georgia,serif;color:#141B2E}.kx{font-size:11.5px;color:#1C2420;margin-top:2px;line-height:1.5}.ks{font-size:10.5px;color:#5F6A65;margin-top:1px}
    .kg{columns:${teacher ? 1 : 2};column-gap:22px}
  </style></head><body>
    <div class="hd"><div><div class="sub">FINALE · 피날레 실전완성</div><h1>${e(o.title || '누적 오답 테스트')}</h1></div><div class="m">${e(o.name || '')}<br>${today} · ${items.length}문항</div></div>
    <div class="box"><div><b>이름</b>${e(o.name || '')}</div><div><b>맞힌 문항</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ ${items.length}</div></div>
    <div class="note">지난 시즌에서 자주 틀린 문항(지금도 틀린 채 남았거나 2번 이상 틀린 문항)이에요. 첫 글자로 시작해 철자 수에 맞춰 1단어로 써요. 다 풀고 맨 뒤 정답으로 채점해요.</div>
    ${qs}
    <div class="key"><div class="hd"><div><div class="sub">ANSWER KEY</div><h1>정답${teacher ? ' · 해설' : ''}</h1></div><div class="m">${e(o.name || '')}</div></div><div class="kg">${key}</div></div>
    <script>setTimeout(function(){print()},500)<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html); w.document.close(); return true;
}
