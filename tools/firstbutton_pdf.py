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

def main(path):
    doc = fitz.open(path)
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
    os.makedirs(ROOT, exist_ok=True)
    open(os.path.join(ROOT, 'data.js'), 'w', encoding='utf-8').write(
        '/* generated by tools/firstbutton_pdf.py */\nwindow.FB = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('units', len(units), 'diag', len(data['diag']))
    if os.environ.get('GRAM_PDF_KEY'):
        encrypt_all(doc, data)

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
