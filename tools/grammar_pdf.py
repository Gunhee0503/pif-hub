#!/usr/bin/env python3
"""문법 STEP 학습지 PDF → grammar/data.js

사용법:  python3 tools/grammar_pdf.py 학습지.pdf [학습지2.pdf ...]
같은 회차(기본 01회 등)는 덮어쓰고, 새 회차는 추가합니다.
"""
import sys, re, json, os, warnings
warnings.filterwarnings('ignore')
import fitz

CIRC = '①②③④⑤'
OUT = os.path.join(os.path.dirname(__file__), '..', 'grammar', 'data.js')

def lines_of(page):
    """chars grouped into lines: [(y, [(x0,x1,y1,c)])]"""
    out = []
    for b in page.get_text('rawdict')['blocks']:
        for l in b.get('lines', []):
            cs = []
            for s in l['spans']:
                for ch in s['chars']:
                    x0, y0, x1, y1 = ch['bbox']
                    cs.append((x0, x1, y1, ch['c']))
            if cs:
                out.append((round(l['bbox'][1], 1), l['bbox'][3], cs))
    return out

def parse_set_page(page):
    text = page.get_text()
    m = re.search(r'SET\s*(\d+)\s+(.+)', text)
    setno, title = int(m.group(1)), m.group(2).strip()
    unders = [d['rect'] for d in page.get_drawings()
              if d['rect'].height < 2.5 and d['rect'].width > 4 and d.get('fill')]
    L = lines_of(page)
    y_step1 = next(y for y, yb, cs in L if ''.join(c[3] for c in cs).strip().startswith('STEP 1'))
    y_choice = next(y for y, yb, cs in L if re.fullmatch(r'[①②③④⑤\s]+', ''.join(c[3] for c in cs)) and y > y_step1)
    plines = sorted([l for l in L if y_step1 + 5 < l[0] < y_choice - 2], key=lambda l: (round(l[0] / 6), l[2][0][0]))
    # merge lines on same baseline row (pdf may split)
    rows = {}
    for y, yb, cs in plines:
        rows.setdefault(round(yb / 4), []).extend(cs)
    segs = []  # list of [text, n]
    cur_n = 0
    pending_n = 0
    for key in sorted(rows):
        cs = sorted(rows[key], key=lambda c: c[0])
        if segs and not segs[-1][0].endswith(' '):
            segs.append([' ', 0])
        prev_x1 = None
        for x0, x1, y1, c in cs:
            if prev_x1 is not None and x0 - prev_x1 > 2.2 and c != ' ':
                add(segs, ' ', 0 if not under_at(unders, (prev_x1 + x0) / 2, y1) else cur_n)
            prev_x1 = x1
            if c in CIRC:
                pending_n = CIRC.index(c) + 1
                continue
            u = under_at(unders, (x0 + x1) / 2, y1)
            if u and c != ' ':
                if pending_n:
                    cur_n = pending_n; pending_n = 0
                add(segs, c, cur_n)
            else:
                if c == ' ' and u:
                    add(segs, c, cur_n)
                else:
                    add(segs, c, 0)
    # clean: trim spaces inside underline edges, collapse spaces
    out = []
    for t, n in segs:
        if out and out[-1][1] == n:
            out[-1][0] += t
        else:
            out.append([t, n])
    fin = []
    for t, n in out:
        if n:
            lead, core, trail = re.match(r'(\s*)(.*?)(\s*)$', t, re.S).groups()
            if lead: fin.append([' ', 0])
            fin.append([core, n])
            if trail: fin.append([' ', 0])
        else:
            fin.append([re.sub(r'\s+', ' ', t), 0])
    passage = []
    for t, n in fin:
        if passage and not n and not passage[-1].get('n'):
            passage[-1]['t'] = re.sub(r'\s+', ' ', passage[-1]['t'] + t)
        else:
            passage.append({'t': t, 'n': n} if n else {'t': t})
    passage[0]['t'] = passage[0]['t'].lstrip()
    passage[-1]['t'] = passage[-1]['t'].rstrip()
    # translation
    tm = re.search(r'우리말 해석[^\n]*\n(.*?)STEP 2', text, re.S)
    tr = [re.sub(r'^\d+\.\s*', '', s).strip() for s in re.findall(r'\d+\.\s*[^\n]+', tm.group(1))]
    return {'set': setno, 'title': title, 'passage': passage, 'tr': tr}

def add(segs, c, n):
    segs.append([c, n])

def under_at(unders, x, y):
    for r in unders:
        if r.x0 - 0.5 <= x <= r.x1 + 0.5 and -1 <= r.y0 - y <= 4.5:
            return True
    return False

def cell_text(page, rect):
    raw = page.get_text('text', clip=fitz.Rect(rect), sort=True)
    lines = [l.strip() for l in raw.split('\n') if l.strip()]
    s = ''
    for l in lines:
        # 한글 줄바꿈: 앞 줄이 조사·어미로 끝나면 띄어쓰기, 아니면 단어 중간에서 끊긴 것으로 보고 붙임
        if s and re.search(r'[가-힣]$', s) and re.match(r'[가-힣]', l) and not re.search(r'(의|는|은|를|을|가|이므로|므로|로|고|며|서|면|다|와|과|도|에)$', s):
            s += l
        else:
            s += (' ' if s else '') + l
    s = re.sub(r'\s+([.,])', r'\1', s)
    return re.sub(r'\s+', ' ', s).strip()

def parse_answer_pages(pages):
    keys = {}
    for page in pages:
        text = page.get_text()
        heads = [(m.start(), int(m.group(1)), m.group(2)) for m in re.finditer(r'SET\s*(\d+)\s+.+?·\s*정답\s*([①②③④⑤])', text)]
        tabs = [t for t in page.find_tables().tables if t.row_count >= 6]
        for (pos, sn, ans), t in zip(heads, tabs):
            items = []
            for row in t.rows[1:]:
                c = [cell_text(page, cb) if cb else '' for cb in row.cells]
                n = CIRC.index(c[0].strip()[0]) + 1
                ox = 'X' if 'X' in c[2] else 'O'
                last = c[4]
                it = {'n': n, 'point': c[1], 'ox': ox, 'expl': c[3]}
                if ox == 'X':
                    it['fix'] = last
                else:
                    it['wrong_ex'] = re.sub(r'^오답\s*예시\s*', '', last)
                items.append(it)
            keys[sn] = {'answer': CIRC.index(ans) + 1, 'items': items}
    return keys

def parse_pdf(path):
    doc = fitz.open(path)
    p0 = doc[0].get_text()
    level = re.search(r'(기본|심화|실전)', p0)
    rnd = re.search(r'(\d+)\s*회', p0)
    sets, ans_pages = [], []
    for p in doc:
        t = p.get_text()
        if '정답 및 해설' in t or ('정답' in t and '고친 형태' in t):
            ans_pages.append(p)
        elif re.search(r'SET\s*\d+', t) and 'STEP 1' in t:
            sets.append(parse_set_page(p))
    keys = parse_answer_pages(ans_pages)
    for s in sets:
        s.update(keys[s['set']])
    return {'level': level.group(1) if level else '기본', 'round': int(rnd.group(1)) if rnd else 1, 'sets': sets}

def main():
    rounds = []
    if os.path.exists(OUT):
        raw = open(OUT, encoding='utf-8').read()
        m = re.search(r'window\.GRAM\s*=\s*(\{.*\});?\s*$', raw, re.S)
        if m: rounds = json.loads(m.group(1))['rounds']
    for path in sys.argv[1:]:
        r = parse_pdf(path)
        r['id'] = f"{r['level']}-{r['round']:02d}"
        rounds = [x for x in rounds if x['id'] != r['id']] + [r]
        print(f"{r['id']}: SET {len(r['sets'])}개")
        for s in r['sets']:
            marks = [p['n'] for p in s['passage'] if p.get('n')]
            print(f"  SET {s['set']:02d} {s['title']} · 밑줄 {marks} · 정답 {s['answer']} · 해석 {len(s['tr'])}문장")
    lv = {'기본': 0, '심화': 1, '실전': 2}
    rounds.sort(key=lambda r: (lv.get(r['level'], 9), r['round']))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* generated by tools/grammar_pdf.py — 직접 수정해도 됩니다 */\nwindow.GRAM = ' + json.dumps({'rounds': rounds}, ensure_ascii=False, indent=1) + ';\n')

if __name__ == '__main__':
    main()
