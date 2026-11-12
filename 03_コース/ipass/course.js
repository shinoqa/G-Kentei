/* ITパスポート（iパス）コース。TANKU STUDY エンジン v1.0.1 用。
   章＝シラバス Ver.6.5 の中分類（23）、カテゴリ＝現行3分野（D-012）。数値は 01_リサーチ/data の実測、estQ のみ推定。
   categories[].evalQuestions / passScore と exam.scoring 以下は、エンジン v1.1（D-010①）で表示に使う。v1.0.1 は読まない。 */
window.COURSE={
 "id": "ipass-2027",
 "title": "ITパスポート試験",
 "exam": {
  "date": "2027-02-15",
  "dateTentative": true,
  "questions": 100,
  "minutes": 120,
  "scoring": "IRT",
  "totalPassScore": 600,
  "scoreMax": 1000,
  "passNote": "総合評価点600点以上かつ3分野それぞれ300点以上（1000点満点・IRT）。正答率とは別物"
 },
 "daily": {
  "goal": 20,
  "session": 10
 },
 "syllabus": {
  "name": "ITパスポート試験 シラバス",
  "version": "Ver.6.5",
  "level": "現行制度（2026年度まで）・23中分類・63小分類・用語例1,140語"
 },
 "categories": [
  {
   "id": "strategy",
   "name": "ストラテジ系",
   "chapters": [
    1,
    2,
    3,
    4,
    5,
    6,
    7
   ],
   "evalQuestions": 32,
   "passScore": 300
  },
  {
   "id": "management",
   "name": "マネジメント系",
   "chapters": [
    8,
    9,
    10,
    11,
    12
   ],
   "evalQuestions": 18,
   "passScore": 300
  },
  {
   "id": "technology",
   "name": "テクノロジ系",
   "chapters": [
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23
   ],
   "evalQuestions": 42,
   "passScore": 300
  }
 ],
 "chapters": [
  {
   "no": 1,
   "name": "企業活動",
   "category": "strategy",
   "weight": 1,
   "estQ": 10.1,
   "terms": 159,
   "calc": [
    "損益分岐点・財務諸表"
   ]
  },
  {
   "no": 2,
   "name": "法務",
   "category": "strategy",
   "weight": 1,
   "estQ": 5.1,
   "terms": 81,
   "calc": []
  },
  {
   "no": 3,
   "name": "経営戦略マネジメント",
   "category": "strategy",
   "weight": 1,
   "estQ": 4.9,
   "terms": 78,
   "calc": []
  },
  {
   "no": 4,
   "name": "技術戦略マネジメント",
   "category": "strategy",
   "weight": 1,
   "estQ": 1.5,
   "terms": 23,
   "calc": []
  },
  {
   "no": 5,
   "name": "ビジネスインダストリ",
   "category": "strategy",
   "weight": 1,
   "estQ": 7,
   "terms": 111,
   "calc": []
  },
  {
   "no": 6,
   "name": "システム戦略",
   "category": "strategy",
   "weight": 1,
   "estQ": 2.9,
   "terms": 45,
   "calc": []
  },
  {
   "no": 7,
   "name": "システム企画",
   "category": "strategy",
   "weight": 1,
   "estQ": 0.5,
   "terms": 8,
   "calc": []
  },
  {
   "no": 8,
   "name": "システム開発技術",
   "category": "management",
   "weight": 1,
   "estQ": 3.9,
   "terms": 22,
   "calc": [
    "開発工数の見積り"
   ]
  },
  {
   "no": 9,
   "name": "ソフトウェア開発管理技術",
   "category": "management",
   "weight": 1,
   "estQ": 4.1,
   "terms": 23,
   "calc": []
  },
  {
   "no": 10,
   "name": "プロジェクトマネジメント",
   "category": "management",
   "weight": 1,
   "estQ": 1.9,
   "terms": 11,
   "calc": [
    "アローダイアグラム（クリティカルパス）"
   ]
  },
  {
   "no": 11,
   "name": "サービスマネジメント",
   "category": "management",
   "weight": 1,
   "estQ": 5.5,
   "terms": 31,
   "calc": []
  },
  {
   "no": 12,
   "name": "システム監査",
   "category": "management",
   "weight": 1,
   "estQ": 2.6,
   "terms": 15,
   "calc": []
  },
  {
   "no": 13,
   "name": "基礎理論",
   "category": "technology",
   "weight": 1,
   "estQ": 3.8,
   "terms": 48,
   "calc": [
    "基数変換・論理演算・集合",
    "確率・統計",
    "ビット・データ量"
   ]
  },
  {
   "no": 14,
   "name": "アルゴリズムとプログラミング",
   "category": "technology",
   "weight": 1,
   "estQ": 3.2,
   "terms": 41,
   "calc": [
    "流れ図・擬似言語"
   ]
  },
  {
   "no": 15,
   "name": "コンピュータ構成要素",
   "category": "technology",
   "weight": 1,
   "estQ": 4.2,
   "terms": 53,
   "calc": []
  },
  {
   "no": 16,
   "name": "システム構成要素",
   "category": "technology",
   "weight": 1,
   "estQ": 2.8,
   "terms": 36,
   "calc": [
    "稼働率・MTBF/MTTR"
   ]
  },
  {
   "no": 17,
   "name": "ソフトウェア",
   "category": "technology",
   "weight": 1,
   "estQ": 0.6,
   "terms": 7,
   "calc": [
    "表計算（関数・参照）"
   ]
  },
  {
   "no": 18,
   "name": "ハードウェア",
   "category": "technology",
   "weight": 1,
   "estQ": 1,
   "terms": 13,
   "calc": []
  },
  {
   "no": 19,
   "name": "情報デザイン",
   "category": "technology",
   "weight": 1,
   "estQ": 2,
   "terms": 26,
   "calc": []
  },
  {
   "no": 20,
   "name": "情報メディア",
   "category": "technology",
   "weight": 1,
   "estQ": 3.7,
   "terms": 47,
   "calc": [
    "画像・音声のデータ量"
   ]
  },
  {
   "no": 21,
   "name": "データベース",
   "category": "technology",
   "weight": 1,
   "estQ": 1.6,
   "terms": 20,
   "calc": []
  },
  {
   "no": 22,
   "name": "ネットワーク",
   "category": "technology",
   "weight": 1,
   "estQ": 6.4,
   "terms": 81,
   "calc": []
  },
  {
   "no": 23,
   "name": "セキュリティ",
   "category": "technology",
   "weight": 1,
   "estQ": 12.7,
   "terms": 161,
   "calc": []
  }
 ],
 "weightNote": "章ごとの出題数はIPA非公表。全章 weight 1。estQ は分野の評価問数を用語数比で割った推定（参考表示用）",
 "sources": [
  {
   "id": "ipa",
   "label": "IPA公開問題",
   "color": "teal",
   "priority": 0,
   "must": true,
   "cite": true,
   "book": "独立行政法人情報処理推進機構（IPA）ITパスポート試験 公開問題 令和3〜7年度",
   "citeFormat": "出典：ITパスポート試験 {year} 問{no}（IPA）。改変した場合は「一部改変」と併記"
  },
  {
   "id": "own",
   "label": "自作",
   "color": "gray",
   "priority": 3
  }
 ],
 "sourcesNote": "令和8年度分は本番形式の模試に温存（D-008）。平成24〜令和2年度は計算・マネジメント系の補強だけに使う",
 "plan": {
  "rounds": 3,
  "goalScore": 90,
  "mocks": 1,
  "mockNote": "模試はIPA公開問題 令和8年度分を本番形式（100問・120分）で解く。アプリには取り込まない",
  "finalDays": 2
 },
 "ai": {
  "persona": "ITパスポート試験の受験者。IT専門職ではない社会人で、業務でIT・AIの導入に関わる立場",
  "level": "一般"
 },
 "features": {
  "glossary": true,
  "timeline": false,
  "sheets": false,
  "notes": true
 },
 "ui": {
  "firstHint": "IPA公開問題から、章の",
  "syl": "シラバス",
  "sylLong": "シラバス",
  "sylName": "ITパスポート シラバス Ver.6.5",
  "sylNote": "ITパスポート シラバス Ver.6.5 の項目（文言は要点の言い換え）。説明できるようになったら付けます。",
  "textLead": "シラバス Ver.6.5 の小分類（63節）の並びで書く通読用テキストです。1節5分ほど。",
  "textNote": "本文はシラバスの項目に沿って自作したもので、公式教材の代わりではありません。法令名や数値の細部はIPAの公式情報で確かめてください。",
  "dateNote": "は仮置きです（2月中旬〜下旬を予定・未予約）。申込受付（2027年1月中旬以降の予定）で予約日が決まったら差し替えます。",
  "passText": "合格基準は総合600点以上かつ各分野300点以上（1000点満点・IRT採点）。アプリの正答率は評価点ではありません",
  "qNote": "IPA公開問題は出典（年度・問番号）を付けて収録します。改変したものは「一部改変」と表示します。自作問題は私的な学習用。選択肢は毎回並べ替えて出します。",
  "rewritten": "",
  "pct": true
 },
 "files": {
  "questions": [
   "questions_ipa.js",
   "questions_own.js"
  ]
 }
};
/* 問題は questions_*.js から (window.QUESTIONS=window.QUESTIONS||[]).push(...) で足す */
window.QUESTIONS=window.QUESTIONS||[];
