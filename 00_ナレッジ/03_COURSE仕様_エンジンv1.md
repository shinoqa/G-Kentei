# COURSE 仕様（TANKU STUDY エンジン v1）と iパス用の拡張案

> 実物（DS STUDY の course.js / app.js, 2026-11-08 版）から起こした仕様。
> 「拡張案」の部分は**未採用**（意思決定ログ D-010）。

## 比喩でいうと

- エンジン＝ゲーム機本体、COURSE＝ソフト。本体はもう完成していて、iパスは**2本目のソフト**。
- ソフトを作る作業は「範囲の地図（章とカテゴリ）」「問題」「テキスト」「用語集」の4つ。

## 1. 現行の COURSE（DS検定の実例）

```js
window.COURSE = {
  id: "ds-2027",                         // 記録の保存先キーにもなる
  title: "DS検定 リテラシーレベル",
  exam: { date: "2027-06-12", dateTentative: true, questions: 100, minutes: 100,
          pass: 0.77, passNote: "…" },    // ← 合格ラインは比率1つ
  daily: { goal: 20, session: 10 },
  syllabus: { name: "…", version: "ver.6", level: "…" },
  categories: [ { id: "kiban", name: "基盤", chapters: [2, 3] }, … ],
  chapters:   [ { no: 2, name: "…", category: "kiban", weight: 1 }, … ],
  sources: [                              // 出典ごとの優先度。priority が小さいほど先に出る
    { id: "text",  label: "…テキスト章末", priority: 1, must: false, book: "書名" },
    { id: "drill", label: "…ドリル",       priority: 2, must: false, book: "書名" },
    { id: "own",   label: "自作",          priority: 3 } ],
  plan: { rounds: 3, goalScore: 90, mocks: 5, mockNote: "模試は本で解く", finalDays: 2 },
  ai: { persona: "受験者像（講師が答えるときの前提）", level: "一般" },
  features: { glossary: true, timeline: false, sheets: false, notes: true },
  skills: { map: { "2": "data", … }, certLevel: 3, note: "スキルハブ7軸への対応" },
  files: { questions: ["questions_text.json", "questions_drill.json"] }
};
window.QUESTIONS = [
  { id: "dst2-01", source: "text", chapter: 2, ref: { no: 1, sec: "2-2" }, term: "…",
    prompt: "…", options: ["…","…","…","…"], correct: 2, explanation: "…" } ];
```

## 2. iパス用の拡張案（エンジン v1.1 候補）

| 拡張 | 中身 | 理由 | 互換性 |
|---|---|---|---|
| ① 分野別の合格基準 | `categories[].pass`（例 0.3）と `exam.passMode: "total+category"` | iパスは総合と**各分野**の両方に基準がある | 項目が無ければ従来どおり |
| ② 公開過去問の出典 | `sources` に `{ id: "ipa", label: "IPA公開問題", priority: 0, must: true, cite: true }`、問題側 `ref: { year: "令和6年度", no: 12, modified: true }` | IPAは出典明記で利用可。表示に出典を必ず出す | 既存の ref と同居 |
| ③ 計算問題 | 問題に `type: "calc"`。解説の途中式を等幅で表示 | 損益分岐点・稼働率・基数変換など | 無ければ従来表示 |
| ④ シラバス版の併記 | 問題・用語に `syl: { v65: "…", v01: "…" }`（現行Ver.6.5／新制度案Ver.0.1 の項目） | 2月の適用版が未確定（F-001）。確定後に片方へ寄せる | 任意項目 |

※ IRT採点のため、**アプリの正答率はそのまま評価点にはならない**。画面では「正答率」と呼び、「点数」「合格見込み」とは表示しない。

## 3. 作るもの（iパス）

```
course.js     COURSE（ipass-2027）＋ QUESTIONS
text_*.js     ストラテジ／マネジメント／テクノロジ（または新制度の分野）ごとの本文
glossary_*.js 用語集（3点セット）
syllabus.js   シラバス項目 → 節ID の対応
app.js        DS STUDY のエンジンを流用（①〜④の採否で v1.1 に）
```
