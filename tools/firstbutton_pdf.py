#!/usr/bin/env python3
"""그래머 첫단추 통합본 PDF → firstbutton/data.js (+ GRAM_PDF_KEY가 있으면 암호화 PDF: firstbutton/files/*.bin)

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
    if f.startswith('정답') and '워크북' in t[:40]: return 'wb'
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
            key = {'open': 'open', 'summary': 'summary', 'wa': 'wa', 'review': 'review', 'wb': 'wb', 'finale': 'finale', 'appendix': 'finale'}.get(k)
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
    os.makedirs(ROOT, exist_ok=True)
    open(os.path.join(ROOT, 'data.js'), 'w', encoding='utf-8').write(
        '/* generated by tools/firstbutton_pdf.py */\nwindow.FB = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('units', len(units), 'diag', len(data['diag']))
    if os.environ.get('GRAM_PDF_KEY'):
        encrypt_all(doc, data)

def encrypt_all(doc, data):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    key = AESGCM(base64.b64decode(os.environ['GRAM_PDF_KEY']))
    out = os.path.join(ROOT, 'files'); os.makedirs(out, exist_ok=True)
    def save(name, pages):
        d = fitz.open()
        for p in pages: d.insert_pdf(doc, from_page=p - 1, to_page=p - 1)
        try: d.subset_fonts()
        except Exception: pass
        raw = d.tobytes(garbage=4, deflate=True, clean=True)
        n = os.urandom(12); open(os.path.join(out, name + '.bin'), 'wb').write(n + key.encrypt(n, raw, None))
        return len(raw)
    sizes = {}
    for u in data['units']:
        s, e = u['pages']; sizes[u['id'] + '-all'] = save(u['id'] + '-all', range(s, e + 1))
        for k, pg in u['parts'].items():
            if k == 'open': continue
            sizes[u['id'] + '-' + k] = save(u['id'] + '-' + k, pg)
    ex = data['extra']
    sizes['intro'] = save('intro', range(ex['intro'][0], ex['intro'][1] + 1))
    sizes['onepage'] = save('onepage', ex['onepage'])
    sizes['diag'] = save('diag', range(ex['diag'][0], ex['diag'][1] + 1))
    sizes['diagans'] = save('diagans', ex['diagans'])
    sizes['book'] = save('book', range(1, doc.page_count + 1))
    data['sizes'] = sizes
    open(os.path.join(ROOT, 'data.js'), 'w', encoding='utf-8').write(
        '/* generated by tools/firstbutton_pdf.py */\nwindow.FB = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('files', len(sizes), 'total', sum(sizes.values()) // 1024, 'KB')

if __name__ == '__main__':
    main(sys.argv[1])
