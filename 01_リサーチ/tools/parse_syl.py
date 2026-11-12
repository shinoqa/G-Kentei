import re, json, sys, unicodedata, pdfplumber
SYL=sys.argv[1]

def clean(s):
    s=s.replace('\n','')
    # remove spaces between CJK/fullwidth chars (layout artifacts)
    s=re.sub(r'(?<=[^\x00-\x7f])\s+(?=[^\x00-\x7f])','',s)
    s=re.sub(r'(?<=[^\x00-\x7f])\s+(?=[\x00-\x7f])',lambda m:'' ,s) if False else s
    s=re.sub(r'\s+',' ',s).strip()
    return s

def split_terms(s):
    out=[];depth=0;cur=''
    for ch in s:
        if ch in '（(': depth+=1
        if ch in '）)': depth=max(0,depth-1)
        if ch=='，' and depth==0:
            out.append(cur);cur=''
        else: cur+=ch
    out.append(cur)
    res=[]
    for t in out:
        t=t.strip(' 　，,')
        t=re.sub(r'\s*など$','',t).strip()
        if t: res.append(t)
    return res

# ---- new (Ver.0.1): tables
def parse_new(path):
    pdf=pdfplumber.open(path); rows=[]; dai=chu=None; sno=sname=None
    for p in pdf.pages[1:]:
        for t in p.extract_tables():
            for r in t:
                cells=[c for c in r if c not in (None,'')]
                if not cells: continue
                j=' '.join(cells)
                m=re.match(r'大分類\s*(\d+)：(.+?)\s*中分類\s*(\d+)：(.+)',clean(j))
                if m:
                    dai=(int(m[1]),m[2].strip()); chu=(int(m[3]),m[4].strip()); sno=sname=None; continue
                if j.startswith('【内容】') or j.startswith('・') or '小分類' in j or 'XXXX' in j: continue
                if dai is None: continue
                # positional: first col = no, then name, then item, then terms
                vals=[c for c in r if c is not None]
                if r[0] not in (None,'') and re.fullmatch(r'\d+',r[0].strip()):
                    sno=int(r[0]); rest=[c for c in r[1:] if c not in (None,'')]
                    sname=clean(rest[0]); item=clean(rest[1]) if len(rest)>1 else ''; terms=rest[2] if len(rest)>2 else ''
                else:
                    rest=[c for c in r if c not in (None,'')]
                    if len(rest)==2: item,terms=clean(rest[0]),rest[1]
                    elif len(rest)==1: # continuation of terms
                        txt1=clean(rest[0])
                        if '基礎知識を問う' in txt1 or not rows: continue
                        last=re.split('，',rows[-1]['raw'])[-1]
                        rows[-1]['raw']+= (txt1 if 0<len(last)<=5 and not last.endswith('）') else '，'+txt1); continue
                    else: continue
                rows.append(dict(dai=dai,chu=chu,sno=sno,sname=sname,item=item,raw=clean(terms)))
    for r in rows:
        if r['chu'][0]==7 and r['sno'] is None:
            # マインド・スタンス：行動記述の表。用語は「項目」名
            r['terms']=[r['item']]; r['kind']='stance'
        else:
            raw=re.sub(r'〔[^〕]*〕','，',r['raw'])
            r['terms']=[t for t in split_terms(raw) if not t.endswith('。') and '基礎知識を問う' not in t]
    return rows

# ---- old (Ver.6.5): layout text
def parse_old(path):
    import subprocess
    txt=subprocess.run(['pdftotext','-layout',path,'-'],capture_output=True,text=True).stdout.split('\n')
    rows=[]; dai=chu=None; sno=sname=None; sub=''; i=0; body=False
    kei=None
    while i<len(txt):
        L=txt[i]; s=L.strip()
        if '....' in s: i+=1; continue
        m=re.match(r'大分類\s*(\d+)：(\S+)\s+中分類\s*(\d+)：(\S+)',s)
        if m: dai=(int(m[1]),m[2]); chu=(int(m[3]),m[4]); body=True; i+=1; continue
        if not body: i+=1; continue
        m=re.match(r'^(\d+)\.\s+(\S.*)$',s)
        if m and int(m[1])<=70: sno=int(m[1]); sname=clean(m[2]); sub=''; i+=1; continue
        m=re.match(r'^\((\d+)\)\s*(\S.*)$',s)
        if m:
            sub=clean(m[2]); rows.append(dict(dai=dai,chu=chu,sno=sno,sname=sname,item=sub,raw='',terms=[],heading=True)); i+=1; continue
        m=re.match(r'^用\s*語\s*例\s+(.*)$',s)
        if m:
            bullet=m[1].startswith('・'); buf=[m[1].lstrip('・')]; i+=1
            while i<len(txt):
                t=txt[i].strip()
                if bullet and t.startswith('・'):
                    buf.append('，'+t[1:]); i+=1; continue
                if not t or re.match(r'^活\s*用\s*例',t) or t.startswith('Copyright') or re.fullmatch(r'-\s*\d+\s*-',t) or re.match(r'^(\(\d+\)|[①-⑳]|・|\d+\.\s|【|大分類)',t): break
                buf.append(t); i+=1
            raw=clean(''.join(buf))
            rows.append(dict(dai=dai,chu=chu,sno=sno,sname=sname,item=sub,raw=raw,terms=split_terms(raw)))
            continue
        i+=1
    return rows

new=parse_new(SYL+'/syllabus_ip_ver0_1.pdf'); old=parse_old(SYL+'/syllabus_ip_ver6_5.pdf')
json.dump({'v01':new,'v65':old},open(SYL+'/parsed.json','w'),ensure_ascii=False,indent=1)
for name,rows in [('v0.1',new),('v6.5',old)]:
    n=sum(len(r['terms']) for r in rows)
    print(name,'rows',len(rows),'terms',n,'大分類',sorted({r['dai'] for r in rows}))
