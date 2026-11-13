#!/usr/bin/env python3
"""그래머 첫단추 통합본 PDF → firstbutton/data.js (+ GRAM_PDF_KEY가 있으면 암호화 파일: firstbutton/files/*.bin
   챕터 PDF 13개 + 교재 전체, 앱 안에서 보는 페이지 이미지 묶음)

사용법: GRAM_PDF_KEY=<hub-file 함수의 키> python3 tools/firstbutton_pdf.py 그래머첫단추.pdf
교재를 고쳐 다시 만든 경우 같은 명령을 다시 실행하면 됩니다(페이지 구성은 머리글로 자동 판별).
"""
import sys, re, os, json, base64, warnings
warnings.filterwarnings('ignore')
import fitz

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'firstbutton')
CIRC = '①②③④⑤'

def kind(page):
    t = page.get_text().strip(); f = t.split('\n')[0]
    if f.startswith('Chapter') or (f.startswith('Beyond X') and 'Grammar Beyond' in t[:60]): return 'cover'
    if f.startswith('UNIT') or (f.startswith('Beyond X') and '이 단원이 끝나면' in t) or '먼저 알아 두기' in f: return 'open'
    if 'Key Takeaway' in f: return 'review' if '리뷰체크업' in t[:80] else 'summary'
    if 'Summary Note' in f: return 'summary'
    if 'Review Note' in f: return 'review'
    if f.startswith('워크북 A'): return 'wa'
    if f.startswith('워크북'): return 'wb'
    if f.startswith('정답') and '워크북' in t[:40]: return 'wbans'
    if f.startswith('마무리') and '자가체크' in t: return 'finale'
    if '참고 부록' in f: return 'appendix'
    if f.startswith('MEMO'): return 'memo'
    if f.startswith('마무리 정리'): return 'endcover'
    if f.startswith('한 장 총정리'): return 'onepage'
    if f.startswith('종합 진단'): return 'diag'
    if f.startswith('정답 · 돌아갈 곳'): return 'diagans'
    return 'other'

def lines(t): return [l.strip() for l in t.split('\n') if l.strip()]

def parse_toc(doc):
    for p in doc:
        t = p.get_text()
        if t.startswith('CONTENTS'):
            L = lines(t); out = []
            for i, l in enumerate(L):
                if re.fullmatch(r'(0\d|10|4-2|X[1-3])', l):
                    out.append({'no': l, 'title': L[i+1], 'sub': L[i+2], 'page': int(L[i+3])})
            return out
    return []

def goals_of(page):
    t = page.get_text(); m = re.search(r'이 단원이 끝나면 할 수 있어요\n(.*)', t, re.S)
    if not m: return []
    body = m.group(1); items = []
    for l in lines(body):
        if l.startswith('☐'): items.append(l.lstrip('☐ ').strip())
        elif items and not re.match(r'^(PIF|Grammar|BASIC|Beyond|\d+$|UNIT|Chapter|\d\d$)', l) and len(items[-1]) < 120:
            items[-1] += (' ' if re.search(r'[A-Za-z]$', items[-1]) else '') + l if not items[-1].endswith(' ') else l
        else:
            if items and re.match(r'^(PIF|\d+$)', l): break
    return [re.sub(r'\s+', ' ', g.split('진도 지도')[0]).strip() for g in items]

def checks_of(t):
    m = re.search(r'자가체크[^\n]*\n(.*?)(\n✓가|\n2\n|\n!\n|자주 틀리는)', t, re.S)
    if not m: return []
    out = []
    for l in lines(m.group(1)):
        if l.startswith('☐'): out.append(l.lstrip('☐ ').strip())
        elif out: out[-1] += ' ' + l
    return out

def split_opts(ls):
    """['① a', 'b(cont)', '② c ③ d'] → ['a b(cont)', 'c', 'd']"""
    opts = []
    for l in ls:
        parts = re.split(r'([①②③④⑤])', l)
        if parts[0].strip() and opts: opts[-1] += ' ' + parts[0].strip()
        for j in range(1, len(parts), 2):
            opts.append(parts[j+1].strip())
    # 표 형식 (①\nwho\nthat\nwho)
    return [re.sub(r'\s+', ' ', o).strip(' –') for o in opts]

def parse_finale(t, unitno):
    ans = {}
    m = re.search(r'정답[^\n]*\n(.*?)\n실전에서는', t, re.S)
    if m:
        for qm in re.finditer(r'Q(\d)\s(.*?)(?=\nQ\d\s|\Z)', m.group(1), re.S):
            ans[int(qm.group(1))] = re.sub(r'\s*\n\s*', ' ', qm.group(2)).strip()
    qs = []
    body = t.split('실전에서는', 1)[1] if '실전에서는' in t else ''
    body = re.split(r'\n1\n✓|\n✓자가체크', body)[0]
    blocks = re.split(r'\nQ(\d)\.\s*', body)
    for k in range(1, len(blocks), 2):
        n = int(blocks[k]); L = [l for l in lines(blocks[k+1]) if l not in ('(A)', '(B)', '(C)')]
        stem_l, opt_l, seen = [], [], False
        for l in L:
            if re.match(r'^[①②③④⑤]', l): seen = True
            (opt_l if seen else stem_l).append(l)
        # 표 형식: '①' 단독 줄 + 값 줄들
        if opt_l and any(re.fullmatch(r'[①②③④⑤]', l) for l in opt_l):
            opts, cur = [], None
            for l in opt_l:
                if re.fullmatch(r'[①②③④⑤]', l): cur = []; opts.append(cur)
                elif cur is not None: cur.append(l)
            opts = [' – '.join(o) for o in opts]
        else:
            opts = split_opts(opt_l)
        stem = stem_l[0] if stem_l else ''
        rest = stem_l[1:]
        a = ans.get(n, '')
        ctx = []
        for l in rest:
            if ctx and re.match(r'^by\s', l): ctx[-1] += ' ______ ' + l
            else: ctx.append(l)
        q = {'q': stem, 'ctx': ctx}
        mm = re.match(r'^([①②③④⑤])\s*(.*)', a)
        if len(opts) == 5 and mm:
            q.update(type='mcq', options=opts, answer=CIRC.index(mm.group(1)) + 1, expl=mm.group(2))
        else:
            q.update(type='write', answer_text=a)
            if opts: q['options'] = opts
        qs.append(q)
    return qs

def parse_unit07(t):
    m = re.search(r'정답[^\n]*\n(.*?)\n실전에서는', t, re.S)
    keys = dict((int(a), b.strip()) for a, b in re.findall(r'(\d+)\)\s*([^·]+?)(?=\s*·|\s*$)', re.sub(r'\s*\n\s*', ' ', m.group(1))))
    items = re.findall(r'(\d+)\.\s*(.*?\[\s*([^\]/]+?)\s*/\s*([^\]]+?)\s*\].*?)(?=\n\d+\.|\n1\n|\Z)', t.split('실전에서는', 1)[1], re.S)
    out = []
    for no, stem, a, b in items:
        no = int(no); key = keys.get(no, '')
        answord = key.split('→')[-1].strip()
        opts = [a.strip(), b.strip()]
        out.append({'type': 'pick', 'q': re.sub(r'\s+', ' ', stem).strip(), 'options': opts,
                    'answer': opts.index(answord) + 1 if answord in opts else 0, 'expl': '주어(머리 명사) ' + key})
    return out

def parse_diag(doc, pages, anspage):
    items = []
    for p in pages:
        L = lines(doc[p].get_text())
        L = [l for l in L if not l.startswith(('종합 진단', '[ ] 안에서', '시간을 재고', 'PIF영어', '마무리')) and not re.fullmatch(r'\d{3}', l)]
        cur = None
        for l in L:
            if re.fullmatch(r'\d{1,2}', l) and (cur is None or int(l) == cur['no'] + 1):
                cur = {'no': int(l), 'lines': []}; items.append(cur)
            elif cur is not None: cur['lines'].append(l)
    A = lines(doc[anspage].get_text())
    keys = {}
    i = 0
    while i < len(A) - 3:
        if re.fullmatch(r'\d{1,2}', A[i]) and re.fullmatch(r'(0\d|10|4-2|X[1-3])', A[i+2] if i+2 < len(A) else ''):
            keys[int(A[i])] = {'answer': A[i+1], 'unit': A[i+2], 'back': A[i+3]}; i += 4
        else: i += 1
    out = []
    for it in items:
        L = it['lines']; k = keys.get(it['no'], {})
        m = re.search(r'\[\s*(.+?)\s*/\s*(.+?)\s*\]', ' '.join(L))
        if m and len(L) == 1:
            opts = [m.group(1), m.group(2)]
            out.append({'no': it['no'], 'type': 'pick', 'q': L[0], 'options': opts,
                        'answer': opts.index(k['answer']) + 1 if k.get('answer') in opts else 0, 'unit': k.get('unit'), 'back': k.get('back')})
        else:
            stem = [l for l in L if not re.match(r'^[①②③④⑤]', l)]; opts = split_opts([l for l in L if re.match(r'^[①②③④⑤]', l)])
            out.append({'no': it['no'], 'type': 'mcq', 'q': ' '.join(stem), 'options': opts,
                        'answer': CIRC.index(k['answer']) + 1 if k.get('answer') in CIRC else 0, 'unit': k.get('unit'), 'back': k.get('back')})
    return out

# ---------- 앱 안에서 쓰는 칸(빈칸·밑줄·선택지·체크박스) ----------
def blanks(pg):
    out = {}
    for x in pg.get_drawings():
        f = x.get('fill')
        if not f or not x['items'] or len(x['items']) < 40: continue
        if not all(it[0] == 'l' for it in x['items'][:3]): continue
        if tuple(round(v, 2) for v in f) != (0.78, 0.21, 0.23): continue
        r = x['rect']
        if r.width < 17 or r.height < 10: continue
        if r.width < 19 and r.height < 15: continue      # '관계사가 가져간 빈자리' 표시 (쓰는 칸 아님)
        out[(round(r.x0, 1), round(r.y0, 1))] = r
    rs = sorted(out.values(), key=lambda r: (round(r.y0 / 4), r.x0))
    return rs

SEP = {'/'}
def choices(pg):
    W = pg.get_text('words')
    lines = {}
    for w in W: lines.setdefault((w[5], w[6]), []).append(w)
    groups = []
    for key, ws in lines.items():
        ws.sort(key=lambda w: w[0])
        # tokenise: split leading ( [ and trailing ) ] into own tokens
        T = []
        for w in ws:
            s = w[4]; x0, y0, x1, y1 = w[:4]; cw = (x1 - x0) / max(len(s), 1)
            lead = ''; trail = ''
            while s and s[0] in '([': lead += s[0]; s = s[1:]
            while s and s[-1] in ')]': trail = s[-1] + trail; s = s[:-1]
            xa = x0 + cw * len(lead); xb = x1 - cw * len(trail)
            for ch in lead: T.append(('open', ch, None))
            if s:
                if s == '/': T.append(('sep', s, None))
                elif '/' in s and len(s) > 1:
                    parts = s.split('/'); pos = xa
                    for i, p in enumerate(parts):
                        if p: T.append(('w', p, (pos, y0, pos + cw * len(p), y1)))
                        pos += cw * len(p)
                        if i < len(parts) - 1: T.append(('sep', '/', None)); pos += cw
                else: T.append(('w', s, (xa, y0, xb, y1)))
            for ch in trail: T.append(('close', ch, None))
        i = 0
        while i < len(T):
            if T[i][0] == 'open':
                j = i + 1; opts = [[]]; ok = False
                while j < len(T):
                    t = T[j]
                    if t[0] == 'w': opts[-1].append(t)
                    elif t[0] == 'sep': opts.append([])
                    elif t[0] == 'close': ok = True; break
                    else: break
                    j += 1
                if ok and len(opts) >= 2 and all(opts) and all(len(o) <= 3 for o in opts):
                    g = []
                    for o in opts:
                        x0 = min(t[2][0] for t in o); y0 = min(t[2][1] for t in o); x1 = max(t[2][2] for t in o); y1 = max(t[2][3] for t in o)
                        g.append((fitz.Rect(x0, y0, x1, y1), ' '.join(t[1] for t in o)))
                    groups.append(g); i = j
            i += 1
    groups.sort(key=lambda g: (round(g[0][0].y0 / 4), g[0][0].x0))
    return groups

def anslines(pg, avoid=()):
    W = pg.get_text('words'); out = []
    for x in pg.get_drawings():
        r = x['rect']
        if x['type'] != 'f' or not x.get('fill') or r.height > 1.6 or r.width < 40 or len(x['items']) > 2: continue
        if tuple(round(v, 2) for v in x['fill']) not in ((0.71, 0.65, 0.61), (0.53, 0.53, 0.5)): continue
        zone = fitz.Rect(r.x0, r.y0 - 15, r.x1, r.y0 - 0.5)
        cov = sum(max(0, min(w[2], zone.x1) - max(w[0], zone.x0)) for w in W if w[3] > zone.y0 + 3 and w[1] < zone.y1)
        if cov > r.width * 0.35: continue
        if any(fitz.Rect(a).intersects(zone) for a in avoid): continue
        if any(abs(o.y0 - r.y0) < 1 and abs(o.x0 - r.x0) < 1 for o in out): continue
        out.append(r)
    return sorted(out, key=lambda r: (round(r.y0 / 4), r.x0))

def checkboxes(pg):
    out = []
    for x in pg.get_drawings():
        r = x['rect']
        if x['type'] != 'fs' or not (6 < r.width < 12) or abs(r.width - r.height) > 1.5: continue
        if tuple(round(v, 2) for v in (x.get('color') or ())) != (0.53, 0.53, 0.5): continue
        if any(abs(o.x0 - r.x0) < 1 and abs(o.y0 - r.y0) < 1 for o in out): continue
        out.append(r)
    return out

def label_lines(pg, taken):
    """'해석' / '[해석]' 라벨 오른쪽이 비어 있으면 쓰기 칸으로"""
    W = pg.get_text('words'); out = []
    for w in W:
        if w[4].strip('[]:') not in ('해석',): continue
        x0 = w[2] + 5; y0, y1 = w[1] - 3, w[3] + 3
        right = [v[0] for v in W if v[0] > w[2] + 1 and v[3] > y0 + 2 and v[1] < y1 - 2]
        right += [r.x0 for r in checkboxes(pg) if r.x0 > w[2] and r.y1 > y0 - 10 and r.y0 < y1 + 10]
        x1 = min(right + [pg.rect.width - 58]) - 6
        if x1 - x0 < 110: continue
        r = fitz.Rect(x0, y0, x1, y1)
        if any(r.intersects(t) for t in taken): continue
        out.append(r)
    return out

def overlays(pg):
    W, H = pg.rect.width, pg.rect.height
    q = lambda r: [round(r.x0 / W, 4), round(r.y0 / H, 4), round(r.width / W, 4), round(r.height / H, 4)]
    b = blanks(pg); L = anslines(pg, b)
    zones = [fitz.Rect(r.x0, r.y0 - 15, r.x1, r.y0) for r in L]
    F = [['b'] + q(r) for r in b] + [['l'] + q(z) for z in zones]
    F += [['l'] + q(r) for r in label_lines(pg, b + zones)]
    F += [['k'] + q(r) for r in checkboxes(pg)]
    F += [['c', [q(fitz.Rect(r.x0 - 2, r.y0 - 1, r.x1 + 2, r.y1 + 1)) for r, t in g]] for g in choices(pg)]
    return F

# ---------- 정답 키 (자동 채점용) ----------
from collections import Counter
from functools import lru_cache
d = None
OVL = {}
@lru_cache(None)
def words(p): return d[p - 1].get_text('words')
@lru_cache(None)
def marks(p):
    """정답 페이지의 동그라미(곡선 테두리)와 칠한 체크 칸"""
    E, K = [], []
    for x in d[p - 1].get_drawings():
        r = x['rect']; it = [i[0] for i in x['items']]
        if x['type'] == 's' and it.count('c') >= 4 and it.count('c') > 2 * it.count('l') and 're' not in it and r.width > 8: E.append(r)
        f = x.get('fill')
        if x['type'] in ('f', 'fs') and f and tuple(round(v, 2) for v in f) == (0.45, 0.14, 0.24) and 5 < r.width < 14: K.append(r)
    return E, K
def R(a): W, H = d[0].rect.width, d[0].rect.height; return fitz.Rect(a[0] * W, a[1] * H, (a[0] + a[2]) * W, (a[1] + a[3]) * H)
def cy(w): return (w[1] + w[3]) / 2
def offset(p, r, cands):
    cntp = Counter(w[4] for w in words(p))
    near = [w for w in words(p) if abs(cy(w) - (r.y0 + r.y1) / 2) < 70 and len(w[4]) > 1]
    best = None
    for q in cands:
        idx = {}
        for w in words(q): idx.setdefault(w[4], []).append(w)
        uniq = [w for w in near if cntp[w[4]] == 1 and len(idx.get(w[4], [])) == 1]
        use = uniq if len(uniq) >= 2 else near
        votes = Counter()
        for w in use:
            for v in idx.get(w[4], []):
                dx, dy = v[0] - w[0], v[1] - w[1]
                if abs(dy) < 60 and abs(dx) < 80:
                    votes[(round(dx / 2) * 2, round(dy / 2) * 2)] += 1 / (1 + abs(cy(w) - (r.y0 + r.y1) / 2) / 12)
        if votes:
            (dx, dy), sc = votes.most_common(1)[0]
            if not best or sc > best[0]: best = (sc, q, dx, dy)
    return best
def band(ws, y0, y1):
    return sorted([w for w in ws if y0 <= cy(w) <= y1], key=lambda w: w[0])
def norm(t): return re.sub(r'\s+', ' ', t).strip()
def row_answer(p, fields, i, q, dx, dy):
    """같은 줄의 고정 글자로 정규식을 만들어 정답 페이지 줄에서 빈칸 자리를 찾는다"""
    r = fields[i]
    y0, y1 = r.y0 - 2, r.y1 + 2
    toks = [('w', w[0], w[4]) for w in band(words(p), y0, y1)]
    blanks = [(j, f) for j, f in fields.items() if f is not None and abs((f.y0 + f.y1) / 2 - (r.y0 + r.y1) / 2) < 6]
    toks += [('b', f.x0, j) for j, f in blanks]
    toks.sort(key=lambda t: t[1])
    # 빈칸 바로 앞뒤의 고정 글자만 사용 (먼 글자는 줄바꿈이 달라질 수 있어 제외)
    pat, groups = '', []
    for k, t in enumerate(toks):
        if t[0] == 'w': pat += re.escape(t[2]) + r'\s*'
        else: pat += r'(.*?)\s*' if k < len(toks) - 1 else r'(.*)'; groups.append(t[2])
    ws = band(words(q), y0 + dy - 3, y1 + dy + 3)
    line = ' '.join(w[4] for w in ws)
    m = re.search(pat, line)
    if m:
        a = norm(m.group(groups.index(i) + 1))
        if a: return a, 'row'
    return None, 'none'
def geo_answer(p, r, q, dx, dy):
    rr = r + (dx, dy, dx, dy)
    ws = [w for w in words(q) if rr.x0 - 3 <= (w[0] + w[2]) / 2 <= rr.x1 + 3 and rr.y0 - 3 <= cy(w) <= rr.y1 + 3]
    ws.sort(key=lambda w: (round(w[1] / 5), w[0]))
    return norm(' '.join(w[4] for w in ws)) or None
def clean(a):
    if not a: return a
    if re.search('[가-힣]', a): a = re.sub(r'(?:(?<=\s)|^)[SVOC](?=\s|$)', '', a)
    a = a.replace('↶', ' ').replace('↺', ' ').replace('✓', ' ')
    return norm(a) or None
def norm_opt(t): return re.sub(r'[^0-9a-zA-Z가-힣]', '', t).lower()
def choice_key(cands):
    """정답 페이지들의 선택지 묶음 (순서대로) + 동그라미 친 보기"""
    G = []
    for q in cands:
        E, _ = marks(q)
        for g in choices(d[q - 1]):
            sig = tuple(norm_opt(t) for r, t in g)
            pick = [j for j, (r, t) in enumerate(g) if any(e.contains(fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)) or (e.intersects(r) and e.width < r.width + 30) for e in E)]
            G.append((sig, pick))
    return G
def map_choices(pages, cands):
    """B의 선택지 묶음을 A의 같은 보기 묶음에 순서대로 대응"""
    G = choice_key(cands); out = {}; k = 0
    for p in pages:
        for g in choices(d[p - 1]):
            sig = tuple(norm_opt(t) for r, t in g)
            for m in range(k, len(G)):
                if G[m][0] == sig:
                    out[(p, round(g[0][0].x0, 1), round(g[0][0].y0, 1))] = G[m][1]; k = m + 1; break
    return out
CH = {}
def stream_answer(p, r, cands):
    """빈칸 앞뒤 낱말(문맥)로 정답 페이지의 글 흐름에서 빈칸 자리를 찾는다 (줄바꿈이 달라도 됨)"""
    def ordered(q): return sorted(words(q), key=lambda w: (round(cy(w) / 4), w[0]))
    Q = [w for w in ordered(p) if w[4] not in ('✓',)]
    mid = (r.y0 + r.y1) / 2
    before = [w for w in Q if (round(cy(w) / 4) < round(mid / 4) and cy(w) < r.y0) or (abs(cy(w) - mid) < 6 and w[2] <= r.x0 + 2)]
    after = [w for w in Q if (abs(cy(w) - mid) < 6 and w[0] >= r.x1 - 2) or (cy(w) > r.y1 and round(cy(w) / 4) > round(mid / 4))]
    before = [w for w in before if mid - cy(w) < 40][-3:]
    after = after[:2]
    if not before and not after: return None, None
    L = r'\s+'.join(re.escape(w[4]) for w in before); Rt = r'\s+'.join(re.escape(w[4]) for w in after)
    for q in cands:
        txt = ' '.join(w[4] for w in ordered(q))
        m = re.search((L + r'\s+' if L else '') + r'(.{1,60}?)' + (r'\s+' + Rt if Rt else r'(?:\s|$)'), txt)
        if m and m.group(1).strip(): return norm(m.group(1)), ' '.join(w[4] for w in after)
    return None, ' '.join(w[4] for w in after)
def page_answers(p, cands):
    F = OVL.get(str(p), [])
    rects = {i: (R(f[1:]) if f[0] in 'blk' else None) for i, f in enumerate(F)}
    tx = {i: r for i, r in rects.items() if r is not None and F[i][0] in 'bl'}
    out = []
    for i, f in enumerate(F):
        if f[0] == 'c':
            r0 = R(f[1][0]); key = (p, round(r0.x0 + 2, 1), round(r0.y0 + 1, 1))
            hit = next((v for kk, v in CH.items() if kk[0] == p and abs(kk[1] - key[1]) < 1 and abs(kk[2] - key[2]) < 1), None)
            out.append({'c': hit} if hit else None)
        elif f[0] == 'k':
            r = rects[i]; b = offset(p, r, cands)
            if not b: out.append(None); continue
            sc, q, dx, dy = b; _, K = marks(q); rr = r + (dx - 3, dy - 3, dx + 3, dy + 3)
            on = any(rr.intersects(k) for k in K) or any(w[4].startswith('✓') and rr.intersects(fitz.Rect(w[:4])) for w in words(q))
            out.append({'k': 1 if on else 0})
        else:
            r = rects[i]; b = offset(p, r, cands)
            if not b: out.append(None); continue
            sc, q, dx, dy = b
            ra, _ = row_answer(p, tx, i, q, dx, dy); ga = geo_answer(p, r, q, dx, dy)
            ra, ga = clean(ra), clean(ga)
            a = ra if ra and (not ga or len(ra) <= max(len(ga) * 1.6, len(ga) + 8)) else ga
            sa, right = stream_answer(p, r, cands)
            # 빈칸 바로 뒤에 인쇄된 글자가 정답처럼 잡혔으면(= 문제에 이미 있는 글자) 글 흐름으로 다시 찾기
            if right and a and norm(a).replace(' ', '').startswith(norm(right).replace(' ', '')[:4]): a = clean(sa)
            elif not a and sa: a = clean(sa)
            out.append({'a': a, 'h': 'row'} if a else None)
    return out

def row_text(p, F, i):
    """채점용 문맥: 그 칸이 있는 줄 (이 칸은 【?】, 다른 칸은 ___)"""
    f = F[i]
    r = R(f[1][0]) if f[0] == 'c' else R(f[1:])
    if f[0] == 'c':
        r = fitz.Rect(R(f[1][0]).x0, R(f[1][0]).y0, R(f[1][-1]).x1, R(f[1][-1]).y1)
    y0, y1 = r.y0 - 12, r.y1 + 12
    toks = [(round(cy(w) / 7), w[0], w[4]) for w in words(p) if y0 <= cy(w) <= y1]
    for j, g in enumerate(F):
        if g[0] in 'bl':
            q = R(g[1:])
            if y0 <= (q.y0 + q.y1) / 2 <= y1: toks.append((round((q.y0 + q.y1) / 14), q.x0, '【?】' if j == i else '___'))
    toks.sort()
    return norm(' '.join(t for _, _, t in toks))[:220]
def page_inst(p):
    L = [l.strip() for l in d[p - 1].get_text().split('\n') if l.strip()]
    return ' '.join(L[1:4])[:200]
GROUPS = [['자동사', '타동사'], ['주격', '목적격', '소유격'], ['문장', '명사'], ['명사', '동사', '형용사', '부사'], ['형용사', '부사'],
          ['능동', '수동'], ['완전', '불완전'], ['단수', '복수'], ['○', '✕'], ['있음', '없음'],
          ['현재', '과거', '미래', '현재진행', '과거진행', '현재완료', '과거완료']]
def group_of(a, page_keys):
    """정답이 정해진 낱말 중 하나면 고르기 칸으로 (몇 번째 GROUPS)"""
    if not a: return None
    t = re.sub(r'[→←\s]', '', a)
    t = {'O': '○', 'o': '○', 'X': '✕', 'x': '✕'}.get(t, t)
    hits = [g for g, G in enumerate(GROUPS) if t in G]
    if not hits: return None
    if len(hits) == 1: return hits[0]
    pk = {re.sub(r'[→←\s]', '', k) for k in page_keys if k}
    if t == '명사' and '문장' in pk: return 2
    if '동사' in pk or '명사' in pk and t != '명사': return 3
    if t in ('형용사', '부사'): return 4
    return 2 if t == '명사' else 3
def answer_keys(units):
    """Review→Summary Note, 워크북 B→워크북 A(+정답 쪽)에서 칸마다 정답과 문맥"""
    K, I = {}, {}
    for u in units:
        for k in ('review', 'wb'):
            cands = u['parts']['summary'] if k == 'review' else u['parts'].get('wa', []) + u['parts'].get('wbans', [])
            CH.clear()
            if cands: CH.update(map_choices(u['parts'].get(k, []), cands))
            for p in u['parts'].get(k, []):
                F = OVL.get(str(p))
                if not F: continue
                A = page_answers(p, cands) if cands else [None] * len(F)
                out = []
                for i, (f, a) in enumerate(zip(F, A)):
                    if f[0] == 'c':
                        e = {'c': a['c'] if a else None, 'o': []}
                        for g in choices(d[p - 1]):
                            if abs(g[0][0].x0 - R(f[1][0]).x0 - 2) < 1.5 and abs(g[0][0].y0 - R(f[1][0]).y0 - 1) < 1.5: e['o'] = [t for _, t in g]; break
                        e['r'] = row_text(p, F, i)
                    elif f[0] == 'k': e = {'k': a['k'] if a else None}
                    else: e = {'a': a['a'] if a else None, 'r': row_text(p, F, i)}
                    out.append(e)
                # 고르기 칸: 정답이 정해진 낱말이면 보기로, 같은 열의 정답 없는 칸도 같은 보기로
                pk = [e.get('a') for e in out]
                for i, (f, e) in enumerate(zip(F, out)):
                    if f[0] in 'bl' and e.get('a'):
                        g = group_of(e['a'], pk)
                        if g is not None:
                            e['g'] = g; t = re.sub(r'[→←\s]', '', e['a']); e['a'] = {'O': '○', 'X': '✕'}.get(t, t)
                same_col = lambda i, j: abs(F[j][1] - F[i][1]) < 0.01 and abs(F[j][3] - F[i][3]) < 0.01
                drop = []
                for i, (f, e) in enumerate(zip(F, out)):
                    if 'g' not in e: continue
                    col = [j for j in range(len(F)) if F[j][0] in 'bl' and same_col(i, j) and out[j].get('a')]
                    if sum('g' not in out[j] for j in col) > sum('g' in out[j] for j in col): drop.append(i)
                for i in drop: del out[i]['g']    # 같은 열이 주로 직접 쓰는 정답(the dog 등)이면 고르기로 바꾸지 않음
                for i, (f, e) in enumerate(zip(F, out)):
                    if f[0] in 'bl' and 'g' not in e:
                        col = [out[j]['g'] for j, h in enumerate(F) if j != i and h[0] in 'bl' and 'g' in out[j] and abs(h[1] - f[1]) < 0.01 and abs(h[3] - f[3]) < 0.01]
                        if col and not e.get('a'): e['g'] = max(set(col), key=col.count)
                K[str(p)] = out; I[str(p)] = page_inst(p)
    return K, I

def main(path):
    doc = fitz.open(path)
    try:
        prev = open(os.path.join(ROOT, 'data.js'), encoding='utf-8').read(); prev = json.loads(prev[prev.index('{'):prev.rindex('}') + 1])
    except Exception: prev = {}
    K = [kind(p) for p in doc]
    toc = parse_toc(doc)
    units = []
    for i, u in enumerate(toc):
        start = u['page'] - 1
        end = (toc[i+1]['page'] - 1 if i + 1 < len(toc) else next(j for j, k in enumerate(K) if k == 'endcover'))
        rng = list(range(start, end))
        parts = {}
        for j in rng:
            k = K[j]
            if k in ('cover', 'memo'): continue
            key = {'open': 'open', 'summary': 'summary', 'wa': 'wa', 'review': 'review', 'wb': 'wb', 'wbans': 'wbans', 'finale': 'finale', 'appendix': 'finale'}.get(k)
            if key: parts.setdefault(key, []).append(j + 1)
        fin = next(j for j in rng if K[j] == 'finale')
        ft = doc[fin].get_text()
        openp = next(j for j in rng if K[j] == 'open')
        uid = 'u' + u['no'].lower().replace('-', '')
        units.append({'id': uid, 'no': u['no'], 'level': 'Beyond' if u['no'].startswith('X') else 'BASIC',
                      'title': u['title'], 'sub': u['sub'], 'pages': [start + 1, end],
                      'goals': goals_of(doc[openp]), 'checks': checks_of(ft),
                      'quiz': parse_unit07(ft) if u['no'] == '07' else parse_finale(ft, u['no']),
                      'parts': parts})
    one = [j + 1 for j, k in enumerate(K) if k == 'onepage']
    dg = [j for j, k in enumerate(K) if k == 'diag']
    da = next(j for j, k in enumerate(K) if k == 'diagans')
    data = {'title': '그래머 첫단추', 'units': units,
            'extra': {'intro': [1, 8], 'onepage': one, 'diag': [dg[0] + 1, dg[-1] + 1], 'diagans': [da + 1]},
            'diag': parse_diag(doc, dg, da)}
    data['extra']['book'] = doc.page_count
    ovl = {}
    for u in units:
        for k in ('review', 'wb'):
            for p in u['parts'].get(k, []):
                f = overlays(doc[p - 1])
                if f: ovl[str(p)] = f
    data['ov'] = ovl
    print('overlay pages', len(ovl), 'fields', sum(len(v) for v in ovl.values()))
    global d; d = doc; OVL.clear(); OVL.update(ovl)
    data['key'], data['inst'] = answer_keys(units)
    data['groups'] = GROUPS
    # 선생님이 확인해 고친 정답 (쪽: [(자동 추출 정답, 바꿀 정답)])  ' / '로 나누면 모두 정답
    OVERRIDE = {'23': [('which', 'which / that'), ('뒤에서 앞으로', '뒤에서')]}
    for pg_, pairs in OVERRIDE.items():
        for old, new in pairs:
            e = next((e for e in data['key'].get(pg_, []) if e.get('a') == old), None)
            if e: e['a'] = new
            else: print('override not applied', pg_, old)
    nk = sum(1 for v in data['key'].values() for e in v if e.get('a') or e.get('c') or e.get('k') is not None)
    print('answer keys', nk)
    os.makedirs(ROOT, exist_ok=True)
    open(os.path.join(ROOT, 'data.js'), 'w', encoding='utf-8').write(
        '/* generated by tools/firstbutton_pdf.py */\nwindow.FB = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('units', len(units), 'diag', len(data['diag']))
    if os.environ.get('GRAM_PDF_KEY'):
        encrypt_all(doc, data)
    else:   # 키 없이 돌리면 data.js만 새로 (암호화 파일·크기 정보는 그대로)
        for k in ('sizes', 'chapters'):
            if k in prev: data[k] = prev[k]
        open(os.path.join(ROOT, 'data.js'), 'w', encoding='utf-8').write(
            '/* generated by tools/firstbutton_pdf.py */\nwindow.FB = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')

CHAPTERS = [('01', ['u01']), ('02', ['u02']), ('03', ['u03']), ('04', ['u04', 'u42']), ('05', ['u05']), ('06', ['u06']), ('07', ['u07']),
            ('08', ['u08']), ('09', ['u09']), ('10', ['u10']), ('x1', ['ux1']), ('x2', ['ux2']), ('x3', ['ux3'])]
VIEW_PARTS = ('open', 'summary', 'wa', 'review', 'wb', 'wbans', 'finale')

def encrypt_all(doc, data):
    """학생용 파일 (모두 AES-GCM, 키는 hub-file 함수에만)
    · ch01~ch10, chx1~chx3 : 챕터별 PDF 13개 (04는 4-2 포함)  · book : 교재 전체
    · v-<unit> : 앱 안에서 보는 페이지 이미지 묶음 (WebP)  · v-intro, v-onepage"""
    import io, struct, glob
    from PIL import Image
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    key = AESGCM(base64.b64decode(os.environ['GRAM_PDF_KEY']))
    out = os.path.join(ROOT, 'files'); os.makedirs(out, exist_ok=True)
    for old in glob.glob(os.path.join(out, '*.bin')): os.remove(old)
    def put(name, raw):
        n = os.urandom(12); open(os.path.join(out, name + '.bin'), 'wb').write(n + key.encrypt(n, raw, None)); return len(raw)
    def pdf(name, pages):
        d = fitz.open()
        for p in pages: d.insert_pdf(doc, from_page=p - 1, to_page=p - 1)
        try: d.subset_fonts()
        except Exception: pass
        return put(name, d.tobytes(garbage=4, deflate=True, clean=True))
    def view(name, pages):
        head, blob = [], bytearray()
        for p in pages:
            pix = doc[p - 1].get_pixmap(dpi=150); im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            b = io.BytesIO(); im.save(b, 'WEBP', quality=55, method=5); b = b.getvalue()
            head.append({'n': p, 'w': im.width, 'h': im.height, 'o': len(blob), 'l': len(b)}); blob += b
        hj = json.dumps({'pages': head}).encode()
        return put(name, b'FBV1' + struct.pack('>I', len(hj)) + hj + bytes(blob))
    UB = {u['id']: u for u in data['units']}
    sizes, chap = {}, []
    for no, ids in CHAPTERS:
        s, e = UB[ids[0]]['pages'][0], UB[ids[-1]]['pages'][1]
        sizes['ch' + no] = pdf('ch' + no, range(s, e + 1))
        chap.append({'id': 'ch' + no, 'units': ids, 'pages': [s, e]})
    sizes['book'] = pdf('book', range(1, doc.page_count + 1))
    for u in data['units']:
        pg = sorted({p for k in VIEW_PARTS for p in u['parts'].get(k, [])})
        sizes['v-' + u['id']] = view('v-' + u['id'], pg)
    ex = data['extra']
    sizes['v-intro'] = view('v-intro', range(ex['intro'][0], ex['intro'][1] + 1))
    sizes['v-onepage'] = view('v-onepage', ex['onepage'])
    data['sizes'] = sizes; data['chapters'] = chap
    open(os.path.join(ROOT, 'data.js'), 'w', encoding='utf-8').write(
        '/* generated by tools/firstbutton_pdf.py */\nwindow.FB = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('files', len(sizes), 'total', sum(sizes.values()) // 1024, 'KB')

if __name__ == '__main__':
    main(sys.argv[1])
