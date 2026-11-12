import json, re, sys, unicodedata, csv
from collections import defaultdict, Counter
SYL=sys.argv[1]; OUT=sys.argv[2]
d=json.load(open(SYL+'/parsed.json'))
GENERIC={'ai','it','ui','ux','os','id','pc','dx','ip'}
def nk(t): return re.sub(r'\s','',unicodedata.normalize('NFKC',t).lower())
def strip_paren(k): 
    prev=None
    while prev!=k: prev=k; k=re.sub(r'\([^()]*\)','',k)
    return k
def inner(k):
    out=[]
    for m in re.finditer(r'\(([^()]*)\)',k):
        for p in re.split(r'[,，、]',m.group(1)):
            p=p.split(':')[0].strip()
            if len(p)>=2: out.append(p)
    return out
def parts(t):
    k=nk(t); h=strip_paren(k) or k
    ps={k,h}|set(inner(k))
    return {p for p in ps if p and p not in GENERIC}
def acr(t):
    k=unicodedata.normalize('NFKC',t)
    return {a.lower() for a in re.findall(r'(?<![A-Za-z])([A-Z][A-Za-z0-9&]*[A-Z0-9])(?![A-Za-z])',k) if sum(c.isupper() for c in a)>=2}-GENERIC
def junk(t):
    return ('〒' in t or 'TEL' in t or 'ホームページ' in t or (len(t)>20 and '（' not in t and re.search(r'(ために|必要な|している)$',t)))
def clean_term(t): return re.sub(r'^〔[^〕]*〕','',t).strip()
def flat(rows,ver):
    out=[]
    for r in rows:
        for t in r['terms']:
            t=clean_term(t)
            if not t or junk(t): continue
            out.append(dict(ver=ver,dai=f"{r['dai'][0]}:{r['dai'][1]}",chu=f"{r['chu'][0]}:{r['chu'][1]}",sno=r['sno'],sname=r['sname'],term=t,stance=r.get('kind')=='stance'))
    return out
new=flat(d['v01'],'v0.1'); old=flat(d['v65'],'v6.5')
def heads_of(rows,ver):
    return [dict(ver=ver,dai=f"{r['dai'][0]}:{r['dai'][1]}",chu=f"{r['chu'][0]}:{r['chu'][1]}",sno=r['sno'],sname=r['sname'],term=r['item'],stance=False) for r in rows if r.get('item')]
old_h=heads_of([r for r in d['v65'] if r.get('heading')],'v6.5')
new_h=heads_of([r for r in d['v01'] if r.get('kind')!='stance'],'v0.1')
def build(items):
    full=defaultdict(list); hd=defaultdict(list); pt=defaultdict(list); ac=defaultdict(list); heads=[]
    for o in items:
        k=nk(o['term']); h=strip_paren(k) or k
        full[k].append(o); hd[h].append(o)
        for p in parts(o['term']): pt[p].append(o)
        for a in acr(o['term']): ac[a].append(o)
        heads.append((h,o))
    return full,hd,pt,ac,heads
def match(t,ix):
    full,hd,pt,ac,heads=ix
    k=nk(t); h=strip_paren(k) or k
    if k in full: return 'A 完全一致',full[k]
    if h in hd: return 'B 表記ゆれ',hd[h]
    hit=[o for p in parts(t) for o in pt.get(p,[])]
    if hit: return 'C 括弧内・別名で一致',hit
    if len(h)>=4:
        hit=[o for hh,o in heads if len(hh)>=4 and (h in hh or hh in h)]
        if hit: return 'D 部分一致（要目視）',hit[:5]
    hit=[o for a in acr(t) for o in ac.get(a,[])]
    if hit: return 'E 略語一致（要目視）',hit[:5]
    return 'Z 新制度のみ',[]
oix=build(old+old_h); nix=build(new+new_h)
rows=[]
for n in new:
    kind,hit=('S マインド・スタンス（新設の行動項目）',[]) if n['stance'] else match(n['term'],oix)
    rows.append(dict(n,match=kind,old_term=' / '.join(sorted({o['term'] for o in hit}))[:200],old_where=' / '.join(sorted({f"{o['sno']}.{o['sname']}" for o in hit}))[:200]))
orows=[]
for o in old:
    kind,hit=match(o['term'],nix)
    orows.append(dict(o,match=kind.replace('新制度のみ','現行のみ'),new_term=' / '.join(sorted({x['term'] for x in hit}))[:200],new_where=' / '.join(sorted({x['chu'] for x in hit}))[:200]))
with open(OUT+'/ipass_v01_terms.csv','w',newline='',encoding='utf-8-sig') as fp:
    w=csv.writer(fp); w.writerow(['新_大分類','新_中分類','新_小分類','用語（新制度案Ver.0.1）','判定','現行Ver.6.5の対応用語','現行の小分類'])
    for r in rows: w.writerow([r['dai'],r['chu'],f"{r['sno'] or ''} {r['sname'] or ''}".strip(),r['term'],r['match'],r['old_term'],r['old_where']])
with open(OUT+'/ipass_v65_terms.csv','w',newline='',encoding='utf-8-sig') as fp:
    w=csv.writer(fp); w.writerow(['現_大分類','現_中分類','現_小分類','用語（現行Ver.6.5）','判定','新制度案の対応用語','新制度案の中分類'])
    for r in orows: w.writerow([r['dai'],r['chu'],f"{r['sno']}.{r['sname']}",r['term'],r['match'],r['new_term'],r['new_where']])
def tally(rs,key='dai'):
    by=defaultdict(Counter)
    for r in rs: by[r[key]][r['match'][0]]+=1
    return by
res={'new_total':len(new),'old_total':len(old),'new':dict(Counter(r['match'] for r in rows)),'old':dict(Counter(r['match'] for r in orows)),
     'new_by_dai':{k:dict(v) for k,v in tally(rows).items()},'old_by_dai':{k:dict(v) for k,v in tally(orows).items()},
     'new_by_chu':{k:dict(v) for k,v in tally(rows,'chu').items()}}
json.dump(res,open(OUT+'/summary.json','w'),ensure_ascii=False,indent=1)
print(json.dumps({k:res[k] for k in ['new_total','old_total','new','old']},ensure_ascii=False,indent=1))
for k,v in res['new_by_dai'].items(): print('新',k,v)
for k,v in res['old_by_dai'].items(): print('現',k,v)
