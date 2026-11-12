# Ver.6.5 目次（中分類→小分類番号）に基づき、章（=中分類）ごとに集計する
import json,sys
sec=json.load(open(sys.argv[1])); out=sys.argv[2]
TOC=[(1,'企業活動',1,3,1),(2,'法務',4,8,1),(3,'経営戦略マネジメント',9,12,2),(4,'技術戦略マネジメント',13,13,2),(5,'ビジネスインダストリ',14,17,2),
(6,'システム戦略',18,21,3),(7,'システム企画',22,24,3),(8,'システム開発技術',25,25,4),(9,'ソフトウェア開発管理技術',26,26,4),(10,'プロジェクトマネジメント',27,27,5),
(11,'サービスマネジメント',28,30,6),(12,'システム監査',31,32,6),(13,'基礎理論',33,35,7),(14,'アルゴリズムとプログラミング',36,39,7),(15,'コンピュータ構成要素',40,42,8),
(16,'システム構成要素',43,44,8),(17,'ソフトウェア',45,48,8),(18,'ハードウェア',49,49,8),(19,'情報デザイン',50,51,9),(20,'情報メディア',52,53,9),
(21,'データベース',54,57,9),(22,'ネットワーク',58,60,9),(23,'セキュリティ',61,63,9)]
DAI={1:'企業と法務',2:'経営戦略',3:'システム戦略',4:'開発技術',5:'プロジェクトマネジメント',6:'サービスマネジメント',7:'基礎理論',8:'コンピュータシステム',9:'技術要素'}
FIELD=lambda d:'strategy' if d<=3 else ('management' if d<=6 else 'technology')
Q={'strategy':32,'management':18,'technology':42}  # IPA公表の分野別評価問数
CALC={3:'損益分岐点・財務諸表',25:'開発工数の見積り',27:'アローダイアグラム（クリティカルパス）',33:'基数変換・論理演算・集合',34:'確率・統計',35:'ビット・データ量',37:'流れ図・擬似言語',44:'稼働率・MTBF/MTTR',47:'表計算（関数・参照）',52:'画像・音声のデータ量'}
S={s['no']:s for s in sec}
chs=[]
for no,name,a,b,d in TOC:
    ss=[S[i] for i in range(a,b+1)]
    c=dict(no=no,name=name,dai=f'{d}:{DAI[d]}',field=FIELD(d),sections=[f"{s['no']}.{s['name']}" for s in ss],
           noterm_sections=[f"{s['no']}.{s['name']}" for s in ss if s['noterms']],
           terms=sum(s['terms'] for s in ss),common=sum(s['common'] for s in ss),review=sum(s['review'] for s in ss),only=sum(s['only'] for s in ss),
           calc=[CALC[i] for i in range(a,b+1) if i in CALC])
    chs.append(c)
for f in Q:
    fc=[c for c in chs if c['field']==f]; tot=sum(c['terms'] for c in fc)
    for c in fc: c['estQ']=round(Q[f]*c['terms']/tot,1)
json.dump(chs,open(out,'w'),ensure_ascii=False,indent=1)
FN={'strategy':'ストラテジ','management':'マネジメント','technology':'テクノロジ'}
for c in chs: print(f"| {c['no']} | {c['name']} | {FN[c['field']]} | {len(c['sections'])} | {c['terms']} | {c['common']} | {c['only']} | {c['review']} | {c['estQ']} | {'・'.join(c['calc'])} |")
for f in Q:
    fc=[c for c in chs if c['field']==f]; print(f,len(fc),sum(c['terms'] for c in fc),sum(c['common'] for c in fc),sum(c['only'] for c in fc),sum(c['review'] for c in fc))
