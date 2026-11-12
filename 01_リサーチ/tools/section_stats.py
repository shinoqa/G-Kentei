# Ver.6.5 の小分類ごとに、用語数・新制度との重なり・計算系キーワードの有無を集計する
import sys,re,csv,json,subprocess,unicodedata
from collections import defaultdict,Counter
pdf,terms_csv,out_json=sys.argv[1:4]
txt=subprocess.run(['pdftotext','-layout',pdf,'-'],capture_output=True,text=True).stdout
lines=txt.split('\n')
# 小分類ごとの本文
sec=defaultdict(list); cur=None; body=False
for l in lines:
    s=l.strip()
    if re.match(r'大分類\s*\d+：\S+\s+中分類',s): body=True
    if not body or '....' in s: continue
    m=re.match(r'^(\d+)\.\s+(\S.*)$',s)
    if m and int(m[1])<=63: cur=int(m[1])
    if cur: sec[cur].append(re.sub(r'(?<=[^\x00-\x7f])\s+(?=[^\x00-\x7f])','',s))
CALC=['計算','求め','算出','損益分岐','稼働率','2進','基数','確率','期待値','平均','標準偏差','工数','見積','データ量','転送','ビット','バイト','論理演算','真理値','アルゴリズム','流れ図','フローチャート','擬似','表計算','関数','財務諸表','利益','回転率','ROE','ROA','MTBF','MTTR','解像度','圧縮率','待ち']
rows=list(csv.DictReader(open(terms_csv,encoding='utf-8-sig')))
by=defaultdict(Counter); meta={}
for r in rows:
    no=int(r['現_小分類'].split('.')[0]); by[no][r['判定'][0]]+=1
    meta[no]=(r['現_大分類'],r['現_中分類'],r['現_小分類'].split('.',1)[1])
out=[]
for no in range(1,64):
    t=' '.join(sec.get(no,[]))
    hits=sorted({k for k in CALC if k in t})
    c=by.get(no,Counter())
    dai,chu,name=meta.get(no,(None,None,None))
    if name is None:
        # 用語例欄なし：本文の見出しから名前を取る
        head=sec.get(no,[''])[0]; name=re.sub(r'^\d+\.\s*','',head)
    out.append(dict(no=no,dai=dai,chu=chu,name=name,terms=sum(c.values()),common=c['A']+c['B']+c['C'],review=c['D']+c['E'],only=c['Z'],calc=hits,noterms=sum(c.values())==0))
json.dump(out,open(out_json,'w'),ensure_ascii=False,indent=1)
for o in out: print(o['no'],o['name'],o['terms'],o['common'],o['review'],o['only'],','.join(o['calc'][:6]),'(用語例なし)' if o['noterms'] else '')
