# iパス現行Ver.6.5の用語のうち、既存アプリ（DS STUDY用語集・G STUDYシラバス辞典）に同名・別名がある語を数える
import sys,re,json,csv,unicodedata,glob
ds_dir,g_syl,ipass_csv,out=sys.argv[1:5]
def nk(t): return re.sub(r'\s','',unicodedata.normalize('NFKC',t).lower())
def heads(t):
    k=nk(t); h=k
    while True:
        h2=re.sub(r'\([^()]*\)','',h)
        if h2==h: break
        h=h2
    ins=[p.split(':')[0] for m in re.finditer(r'\(([^()]*)\)',k) for p in re.split(r'[,，、]',m.group(1))]
    return {x for x in [k,h,*ins] if len(x)>=2}
ds=set()
for f in sorted(glob.glob(ds_dir+'/glossary_*.js')):
    s=open(f,encoding='utf-8').read()
    for m in re.finditer(r"^\['([^']*)','([^']*)'",s,re.M):
        for t in [m[1],*m[2].split('|')]:
            if t: ds|=heads(t)
g=set()
s=open(g_syl,encoding='utf-8').read(); j=json.loads(s[s.find('{'):s.rfind('}')+1])
def walk(o):
    if isinstance(o,dict):
        for k,v in o.items():
            if k in('terms',) and isinstance(v,list):
                for t in v:
                    if isinstance(t,str): g.update(heads(t))
            walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
walk(j)
rows=list(csv.DictReader(open(ipass_csv,encoding='utf-8-sig')))
res=[]
for r in rows:
    hs=heads(r['用語（現行Ver.6.5）'])
    res.append((r,bool(hs&ds),bool(hs&g)))
tot=len(res); a=sum(1 for _,d,_ in res if d); b=sum(1 for _,_,x in res if x); c=sum(1 for _,d,x in res if d or x)
print(json.dumps(dict(ipass_v65_terms=tot,in_ds_glossary=a,in_g_syllabus=b,in_either=c,ds_gloss_keys=len(ds),g_syl_keys=len(g)),ensure_ascii=False))
from collections import Counter
cc=Counter(r['現_大分類'] for r,d,x in res if d or x); print(cc)
with open(out,'w',newline='',encoding='utf-8-sig') as fp:
    w=csv.writer(fp); w.writerow(['現_大分類','現_小分類','用語（現行Ver.6.5）','DS用語集にあり','G検定辞典にあり'])
    for r,d,x in res:
        if d or x: w.writerow([r['現_大分類'],r['現_小分類'],r['用語（現行Ver.6.5）'],'○' if d else '','○' if x else ''])
