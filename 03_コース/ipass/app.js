/* TANKU STUDY エンジン v1.0.1（2026-11-12：v1 の画面文言を COURSE.ui へ移し、問題0問でも動くようにした。COURSE.ui が無ければ v1 と同じ表示）
   TANKU STUDY エンジン v1（2026-11-08）
   試験に依存するものはすべて window.COURSE（course.json）から読む。問題は window.QUESTIONS。
   記録：db の data/users/<利用者ID>/<コースID> に1文書（利用者ごとに非公開）。db が使えないときは localStorage。
   Claudeに聞く：sample で解説を作り、db の asks/<コースID>__<問題ID> に残す（Claude Code からも読める）。 */
(()=>{
'use strict';
const C=window.COURSE, Q=window.QUESTIONS||[];
const BY=Object.fromEntries(Q.map(q=>[q.id,q]));
const IDS=Q.map(q=>q.id);
const GOAL=C.daily.goal, SESSION=C.daily.session, EXAM=C.exam.date;
const CH=Object.fromEntries(C.chapters.map(c=>[c.no,c]));
const SRC=Object.fromEntries((C.sources||[]).map(s=>[s.id,s]));
const KEY='tanku-study:'+C.id;
/* 試験ごとに変わる画面の文言。無ければ DS STUDY（v1）の文言 */
const UI=Object.assign({
  firstHint:SRC.text?'即答テキストの章末問題から':'最初の章から',
  syl:'★1', sylLong:'公式★1', sylName:'スキルチェックリスト ver.6',
  sylNote:'スキルチェックリスト ver.6 の★1項目（番号は公式のもの、文言は要点の言い換え）。説明できるようになったら付けます。',
  textLead:'試験範囲（スキルチェックリスト ver.6 の★1と、モデルカリキュラム）の並びで書いた通読用テキストです。1節5分ほど。',
  textNote:'本文は公式の範囲名と★1の項目に沿って自作したもので、公式教材の代わりではありません。法令や数値の細部は公式情報で確かめてください。',
  dateNote:'は仮置きです。受験する回の受験期間（年3回：3月・6月・11月）と予約日が決まったら差し替えます。',
  passText:null, qNote:'市販教材の問題は、原文を写さず論点と正解の筋を保って書き直したものです。私的な学習用。選択肢は毎回並べ替えて出します。',
  rewritten:'（書き直し）', pct:false
},C.ui||{});
const sc=n=>UI.pct?`正答率${n}%`:`${n}点`;
const pc=(a,b)=>b?a/b*100:0;
/* テキスト・用語集・公式★1（text_*.js / glossary_*.js / syllabus.js） */
const PARTS=window.TEXT_PARTS||[];
const SECS=PARTS.flatMap(p=>p.sections.map(x=>({...x,part:p.id,partName:p.name})));
const SEC=Object.fromEntries(SECS.map(x=>[x.id,x]));
const SYL=(window.SYLLABUS&&window.SYLLABUS.items)||{};
const SYLNO=new Set(Object.values(SYL).flat().map(x=>x[0]));
const GL=(window.GLOSS||[]).map(([t,al,sec,d,m,u])=>({t,al:al?al.split('|'):[],sec,d,m,u}));
const GBY=Object.fromEntries(GL.map(g=>[g.t,g]));
const GLINK=(()=>{const keys=[];GL.forEach(g=>[g.t,...g.al].forEach(k=>{if(k&&k.length>=2&&!/[&<>"']/.test(k))keys.push([k,g.t]);}));
  keys.sort((a,b)=>b[0].length-a[0].length);const map=new Map(keys);
  const pat=keys.map(([k])=>{const e=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return /^[A-Za-z0-9]/.test(k)?`(?<![A-Za-z0-9])${e}(?![A-Za-z0-9])`:e;}).join('|');
  return {map,re:pat?new RegExp(pat,'g'):null};})();
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- 日付（日本時間） ---------- */
const day=(d=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
const diff=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/864e5);
const md=d=>{const [,m,dd]=d.split('-');return `${+m}/${+dd}`;};
const wk=d=>'日月火水木金土'[new Date(d+'T00:00:00Z').getUTCDay()];

/* ---------- 出題順：出典の優先度ごとに、章を順番に混ぜる ---------- */
const ORDER=(()=>{
  const pri=q=>(SRC[q.source]&&SRC[q.source].priority)??9;
  const groups=new Map();
  Q.forEach(q=>{const k=pri(q);if(!groups.has(k))groups.set(k,new Map());const g=groups.get(k);if(!g.has(q.chapter))g.set(q.chapter,[]);g.get(q.chapter).push(q.id);});
  const out=[];
  [...groups.keys()].sort((a,b)=>a-b).forEach(k=>{
    const lists=[...groups.get(k).entries()].sort((a,b)=>a[0]-b[0]).map(e=>e[1].slice());
    while(lists.some(l=>l.length))lists.forEach(l=>{if(l.length)out.push(l.shift());});
  });
  return out;
})();

/* ---------- 記録 ---------- */
const fresh=()=>({v:1,updated:'',days:{},cards:{},log:{},rounds:[],asked:{},read:{},can:{}});
function clean(raw){
  const s=fresh(); if(!raw||typeof raw!=='object')return s;
  const ok=new Set(IDS), iso=/^\d{4}-\d{2}-\d{2}$/;
  s.updated=typeof raw.updated==='string'?raw.updated:'';
  for(const [d,v] of Object.entries(raw.days||{}))if(iso.test(d)&&v&&Array.isArray(v.ids))s.days[d]={ids:v.ids.filter(i=>ok.has(i)),ok:+v.ok||0};
  for(const [i,v] of Object.entries(raw.cards||{}))if(ok.has(i)&&v&&iso.test(v.due))s.cards[i]={st:Math.max(0,Math.min(4,+v.st||0)),due:v.due,last:v.last||v.due,ok:+v.ok||0,miss:+v.miss||0};
  for(const [i,v] of Object.entries(raw.log||{}))if(ok.has(i)&&v)s.log[i]={n:+v.n||0,ok:+v.ok||0,streak:+v.streak||0};
  if(Array.isArray(raw.rounds))s.rounds=raw.rounds.filter(r=>r&&iso.test(r.start)&&r.ans).map(r=>{const a={};for(const [i,x] of Object.entries(r.ans))if(ok.has(i))a[i]=x?1:0;return{start:r.start,end:iso.test(r.end||'')?r.end:null,ans:a};});
  for(const [i,v] of Object.entries(raw.asked||{}))if(ok.has(i)&&typeof v==='string')s.asked[i]=v;
  for(const [i,v] of Object.entries(raw.read||{}))if(SEC[i]&&iso.test(v))s.read[i]=v;
  for(const [i,v] of Object.entries(raw.can||{}))if(SYLNO.has(i)&&iso.test(v))s.can[i]=v;
  return s;
}
let S=fresh();
try{S=clean(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(e){}

function curRound(){let r=S.rounds[S.rounds.length-1];if(!r||r.end){r={start:day(),end:null,ans:{}};S.rounds.push(r);}return r;}
const roundScore=r=>{const v=Object.values(r.ans);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*100):0;};
const isWeak=id=>{const l=S.log[id];return !!l&&l.ok<l.n&&l.streak<2;};
const mastered=id=>(S.cards[id]?.st||0)>=2;
const todayRec=()=>S.days[day()]||{ids:[],ok:0};

function answer(id,correct){
  const d=day();
  const t=S.days[d]||(S.days[d]={ids:[],ok:0});
  const first=!t.ids.includes(id);
  if(first){t.ids.push(id);if(correct)t.ok++;}
  const l=S.log[id]||{n:0,ok:0,streak:0};
  l.n++; if(correct){l.ok++;l.streak++;}else l.streak=0; S.log[id]=l;
  if(first){
    const p=S.cards[id]||{st:0,ok:0,miss:0};
    const st=correct?Math.min(4,p.st+1):0;
    let due=addDays(d,correct?[1,1,3,7,14][st]:1);
    if(d<addDays(EXAM,-1)&&due>=EXAM)due=addDays(EXAM,-1);
    S.cards[id]={st,due,last:d,ok:p.ok+(correct?1:0),miss:p.miss+(correct?0:1)};
    const r=curRound();
    if(!(id in r.ans)){r.ans[id]=correct?1:0;if(Object.keys(r.ans).length>=IDS.length)r.end=d;}
  }
  save();
}

/* ---------- 出題キュー ---------- */
function queue(mode,ch){
  const d=day(), done=new Set(todayRec().ids);
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const inCh=i=>!ch||(Array.isArray(ch)?ch.includes(BY[i].chapter):BY[i].chapter===ch);
  if(mode==='weak')return shuffle(IDS.filter(i=>isWeak(i)&&inCh(i))).slice(0,SESSION);
  if(mode==='chapter'){
    const r=curRound(), ids=ORDER.filter(inCh);
    return [...ids.filter(i=>!(i in r.ans)),...shuffle(ids.filter(i=>i in r.ans))].slice(0,SESSION);
  }
  const dueIds=IDS.filter(i=>S.cards[i]&&S.cards[i].due<=d&&!done.has(i)).sort((a,b)=>S.cards[a].due.localeCompare(S.cards[b].due)||S.cards[b].miss-S.cards[a].miss);
  const r=curRound(), fresh=ORDER.filter(i=>!(i in r.ans)&&!done.has(i)&&!dueIds.includes(i));
  const q=[...dueIds,...fresh];
  if(q.length<SESSION)q.push(...shuffle(IDS.filter(i=>!q.includes(i)&&!done.has(i))));
  return q.slice(0,SESSION);
}

/* ---------- 保存・同期 ---------- */
let DB=null, ME=null, docRef=null, stamp='', timer=null, syncState='local', ASKS={}, SAMPLE=null;
function save(){
  S.updated=stamp=new Date().toISOString();
  try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}
  if(!docRef)return;
  clearTimeout(timer);
  timer=setTimeout(()=>{docRef.set(JSON.parse(JSON.stringify(S))).then(()=>setSync('on')).catch(e=>{setSync('err');toast('記録を保存できませんでした（'+(e&&e.code||'不明')+'）');});},500);
}
function setSync(s){syncState=s;const el=$('#sync');el.className='sync'+(s==='on'?' on':s==='err'?' err':'');el.textContent=s==='on'?'同期中':s==='err'?'同期できません':s==='wait'?'接続中…':'この端末に保存';}
(async()=>{
  if(!window.claude||!claude.use){return;}
  setSync('wait');
  const [db,user,sample]=await Promise.all([claude.use('db'),claude.use('user'),claude.use('sample')]);
  SAMPLE=sample; if(page==='quiz')render();
  if(!db||!user){setSync('local');return;}
  const uid=await user.id(); if(!uid){setSync('local');return;}
  DB=db; ME=uid; docRef=db.doc('data/users/'+uid+'/'+C.id);
  let first=true;
  const to=setTimeout(()=>{if(first)setSync('err');},10000);
  docRef.onSnapshot(snap=>{
    const d=snap.exists?snap.data():null;
    if(first&&!snap.metadata.fromCache){first=false;clearTimeout(to);}
    if(!d){if(!snap.metadata.fromCache&&(S.updated||Object.keys(S.days).length))save();setSync('on');return;}
    if(d.updated===stamp){setSync('on');return;}
    if((d.updated||'')>(S.updated||'')){S=clean(JSON.parse(JSON.stringify(d)));try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}if(page!=='quiz')render();}
    else if((S.updated||'')>(d.updated||''))save();
    setSync('on');
  },()=>{clearTimeout(to);docRef=null;setSync('local');});
  db.collection('asks').where('course','==',C.id).onSnapshot(snap=>{ASKS={};snap.docs.forEach(x=>{const v=x.data();ASKS[v.qid]=v;});if(page==='quiz'&&quiz&&quiz.answered)render();},()=>{});
})();

/* ---------- 画面 ---------- */
let page='home', quiz=null, confirmReset=false, openWeak=false;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600);}
const chName=n=>`第${n}章 ${CH[n]?.name||''}`;
const srcChip=q=>`<span class="chip ${esc(q.source)}">${esc(SRC[q.source]?.label||q.source)}</span>`;

function ring(n,goal){
  const r=40,c=2*Math.PI*r,p=Math.min(1,n/goal);
  return `<svg class="ring" viewBox="0 0 96 96" role="img" aria-label="今日 ${n}/${goal}問"><circle cx="48" cy="48" r="${r}" fill="none" stroke="var(--pale)" stroke-width="9"/>${p>0?`<circle cx="48" cy="48" r="${r}" fill="none" stroke="var(--teal)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c*p} ${c}" transform="rotate(-90 48 48)"/>`:''}<text x="48" y="52" text-anchor="middle" font-size="22">${n}</text><text x="48" y="68" text-anchor="middle" font-size="10" fill="var(--muted)">/ ${goal}</text></svg>`;
}
function catStats(cat){
  const ids=IDS.filter(i=>cat.chapters.includes(BY[i].chapter));
  const m=ids.filter(mastered).length, seen=ids.filter(i=>S.log[i]).length;
  const n=ids.reduce((a,i)=>a+(S.log[i]?.n||0),0), ok=ids.reduce((a,i)=>a+(S.log[i]?.ok||0),0);
  return {total:ids.length,m,seen,acc:n?Math.round(ok/n*100):null};
}
function chStats(no){
  const ids=IDS.filter(i=>BY[i].chapter===no);
  const n=ids.reduce((a,i)=>a+(S.log[i]?.n||0),0), ok=ids.reduce((a,i)=>a+(S.log[i]?.ok||0),0);
  return {no,total:ids.length,seen:ids.filter(i=>S.log[i]).length,acc:n?Math.round(ok/n*100):null,weak:ids.filter(isWeak).length,m:ids.filter(mastered).length};
}

function home(){
  const t=todayRec(), left=diff(day(),EXAM), r=curRound();
  const inRound=Object.keys(r.ans).length, rest=IDS.length-inRound;
  const dueN=IDS.filter(i=>S.cards[i]&&S.cards[i].due<=day()&&!t.ids.includes(i)).length;
  const weakN=IDS.filter(isWeak).length;
  const done=S.rounds.filter(x=>x.end);
  const pace=left>0?Math.ceil(rest/left):rest;
  let next;
  if(!Object.keys(S.log).length)next=IDS.length?`まずは10問。${UI.firstHint}順に出します。`:'問題はまだ入っていません。テキストから読めます。';
  else if(t.ids.length>=GOAL)next=`今日の${GOAL}問は達成。続けるなら苦手だけ解くのがおすすめです。`;
  else if(dueN)next=`復習の日が来た問題が${dueN}問あります。先にそれを出します。`;
  else next=`通し第${S.rounds.length}周の残りは${rest}問。`;
  const tentative=C.exam.dateTentative?'<span class="chip">仮の日付</span>':'';
  return `
  <section class="hero">
    <p class="label">${esc(C.title)}</p>
    <div class="row" style="align-items:baseline;gap:10px"><span class="count">${left>0?left:0}<small>日</small></span><span class="muted">試験まで（${md(EXAM)}・${wk(EXAM)}）</span>${tentative}</div>
  </section>
  <section class="panel">
    <div class="today">${ring(t.ids.length,GOAL)}<div class="stack" style="gap:6px;min-width:0"><h2>今日の学習</h2><p>${esc(next)}</p><p class="tiny">今日の正解 ${t.ok}／${t.ids.length}問</p></div></div>
    <button class="cta" data-start="today">${t.ids.length?'続きの10問を解く':'今日の10問を始める'}</button>
    <div class="row"><button data-start="weak" ${weakN?'':'disabled'}>苦手だけ解く（${weakN}問）</button><button data-tab="review">章を選んで解く</button></div>
  </section>
  <section class="panel">
    <div class="row" style="justify-content:space-between;align-items:baseline"><h2>通し 第${S.rounds.length}周</h2><span class="tiny">${inRound}／${IDS.length}問</span></div>
    <div class="track" style="height:10px"><i class="m" style="width:${pc(inRound,IDS.length)}%"></i></div>
    <p class="tiny">目標は${C.plan.rounds}周、直近の周で${sc(C.plan.goalScore)}以上。この周の${UI.pct?'正答率':'点数'} ${inRound?(UI.pct?roundScore(r)+'%':roundScore(r)+'点'):'—'}${left>0&&rest?`・試験までに終えるには1日${pace}問`:''}</p>
    ${done.length?`<p class="tiny">終えた周：${done.map((x,i)=>`第${i+1}周 ${sc(roundScore(x))}`).join('／')}</p>`:''}
  </section>
  <section class="panel">
    <h2>分野ごとの身につき具合</h2>
    <div class="legend"><span><i style="background:var(--teal)"></i>身についた（日をまたいで2回連続正解）</span><span><i style="background:color-mix(in srgb,var(--teal) 35%,var(--pale))"></i>解いた</span></div>
    <div class="bars">${C.categories.map(cat=>{const s=catStats(cat);return `<div class="bar"><b>${esc(cat.name)}</b><span>${s.m}／${s.total}問${s.acc!=null?`・正答率${s.acc}%`:''}</span><div class="track"><i class="m" style="width:${pc(s.m,s.total)}%"></i><i class="s" style="width:${pc(s.seen-s.m,s.total)}%"></i></div></div>`;}).join('')}</div>
  </section>
  <section class="panel">
    <div class="row" style="justify-content:space-between;align-items:baseline"><h2>テキストと${esc(UI.sylLong)}</h2><span class="tiny">読んだ節 ${SECS.filter(x=>S.read[x.id]).length}／${SECS.length}・${esc(UI.syl)}「できる」 ${[...SYLNO].filter(n=>S.can[n]).length}／${SYLNO.size}</span></div>
    <button data-sec="${esc((SECS.find(x=>!S.read[x.id])||SECS[0]||{}).id)}">${SECS.some(x=>S.read[x.id])?'続きを読む':'テキストを読み始める'}：${esc((SECS.find(x=>!S.read[x.id])||SECS[0]||{}).title)}</button>
  </section>
  <p class="tiny" style="padding-bottom:8px">模試はアプリに入れていません。${esc(C.plan.mockNote||'')}</p>`;
}

function review(){
  const rows=C.chapters.filter(c=>IDS.some(i=>BY[i].chapter===c.no)).map(c=>chStats(c.no));
  const sorted=[...rows].sort((a,b)=>(a.acc??101)-(b.acc??101)||a.no-b.no);
  const weakIds=IDS.filter(isWeak);
  return `
  <section class="hero"><p class="label">Review</p><h1>苦手から先に</h1><p class="muted">正答率の低い章が上に来ます。苦手＝一度でも間違えて、まだ2回続けて正解していない問題。</p></section>
  <section class="panel">
    <div class="tbl"><table><thead><tr><th>章</th><th>解いた</th><th>正答率</th><th>苦手</th><th></th></tr></thead><tbody>
    ${sorted.map(s=>`<tr><td>${esc(chName(s.no))}</td><td class="n">${s.seen}/${s.total}</td><td class="n">${s.acc==null?'—':s.acc+'%'}</td><td class="n">${s.weak||''}</td><td class="n"><button data-start="chapter" data-ch="${s.no}">解く</button>${s.weak?` <button data-start="weak" data-ch="${s.no}">苦手</button>`:''}</td></tr>`).join('')}
    </tbody></table></div>
  </section>
  <section class="panel">
    <details ${openWeak?'open':''} id="weakList"><summary>苦手な問題の一覧（${weakIds.length}問）</summary>
    ${weakIds.length?`<div class="wl">${weakIds.map(i=>{const q=BY[i],l=S.log[i];return `<button data-show="${esc(i)}"><span class="tiny">${esc(chName(q.chapter))}・${l.ok}/${l.n}回正解</span><b>${esc(q.term||q.prompt.slice(0,40))}</b></button>`;}).join('')}</div>`:'<p class="tiny">まだありません。</p>'}
    </details>
  </section>`;
}

function stats(){
  const days=[...Array(14)].map((_,i)=>addDays(day(),i-13));
  const vals=days.map(d=>S.days[d]||{ids:[],ok:0});
  const max=Math.max(GOAL,...vals.map(v=>v.ids.length));
  const W=560,H=180,pl=28,pb=24,pt=10,bw=(W-pl)/14;
  const y=v=>pt+(H-pt-pb)*(1-v/max);
  const ticks=[0,GOAL,max].filter((v,i,a)=>a.indexOf(v)===i);
  const svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="直近14日の解答数">
    ${ticks.map(v=>`<line x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${v===GOAL?'stroke-dasharray="4 4"':''}/><text x="${pl-6}" y="${y(v)+3}" text-anchor="end">${v}</text>`).join('')}
    ${vals.map((v,i)=>{const x=pl+i*bw+bw*.18,w=bw*.64,n=v.ids.length;return `<rect x="${x}" y="${y(n)}" width="${w}" height="${y(0)-y(n)}" rx="3" fill="color-mix(in srgb,var(--teal) 35%,var(--pale))"/><rect x="${x}" y="${y(v.ok)}" width="${w}" height="${y(0)-y(v.ok)}" rx="3" fill="var(--teal)"/><text x="${x+w/2}" y="${H-8}" text-anchor="middle">${md(days[i])}</text>`;}).join('')}
  </svg>`;
  const allDays=Object.values(S.days), total=allDays.reduce((a,v)=>a+v.ids.length,0), ok=allDays.reduce((a,v)=>a+v.ok,0);
  let streak=0;for(let d=todayRec().ids.length>=GOAL?day():addDays(day(),-1);(S.days[d]?.ids.length||0)>=GOAL;d=addDays(d,-1))streak++;
  return `
  <section class="hero"><p class="label">Record</p><h1>積み上げ</h1></section>
  <section class="panel">
    <div class="row" style="gap:24px">
      <div><p class="tiny">解いた（日ごとの初回）</p><p class="count" style="font-size:30px">${total}<small>問</small></p></div>
      <div><p class="tiny">正答率</p><p class="count" style="font-size:30px">${total?Math.round(ok/total*100):0}<small>%</small></p></div>
      <div><p class="tiny">${GOAL}問達成の連続</p><p class="count" style="font-size:30px">${streak}<small>日</small></p></div>
    </div>
  </section>
  <section class="panel">
    <h2>直近14日</h2>
    <div class="legend"><span><i style="background:var(--teal)"></i>正解</span><span><i style="background:color-mix(in srgb,var(--teal) 35%,var(--pale))"></i>解いた数</span><span>点線＝1日の目標 ${GOAL}問</span></div>
    <div class="chart">${svg}</div>
  </section>
  <section class="panel">
    <h2>通しの記録</h2>
    <div class="tbl"><table><thead><tr><th>周</th><th>開始</th><th>終了</th><th>解いた</th><th>${UI.pct?'正答率':'点数'}</th></tr></thead><tbody>
    ${S.rounds.length?S.rounds.map((r,i)=>`<tr><td>第${i+1}周</td><td>${md(r.start)}</td><td>${r.end?md(r.end):'進行中'}</td><td class="n">${Object.keys(r.ans).length}/${IDS.length}</td><td class="n">${Object.keys(r.ans).length?sc(roundScore(r)):'—'}</td></tr>`).join(''):`<tr><td colspan="5" class="muted">最初の問題を解くと第1周が始まります。</td></tr>`}
    </tbody></table></div>
  </section>`;
}

function settings(){
  const counts={};Q.forEach(q=>counts[q.source]=(counts[q.source]||0)+1);
  return `
  <section class="hero"><p class="label">Settings</p><h1>このコースについて</h1></section>
  <section class="panel">
    <h2>${esc(C.title)}</h2>
    <p>${C.exam.questions}問・${C.exam.minutes}分・${UI.passText?esc(UI.passText):`合格の目安は正答率${Math.round(C.exam.pass*100)}%前後`}。範囲は${esc(C.syllabus?.name||'')} ${esc(C.syllabus?.version||'')}。</p>
    <p class="tiny">試験日 ${esc(EXAM)}${C.exam.dateTentative?esc(UI.dateNote):''}</p>
    <p class="tiny">テキスト ${SECS.length}節・用語 ${GL.length}語${SYLNO.size?`・${esc(UI.sylLong)} ${SYLNO.size}項目（${esc(UI.sylName)}）`:''}。</p>
  </section>
  <section class="panel">
    <h2>入っている問題（${Q.length}問）</h2>
    <div class="tbl"><table><tbody>${(C.sources||[]).filter(s=>counts[s.id]).map(s=>`<tr><td><span class="chip ${esc(s.id)}">${esc(s.label)}</span></td><td>${esc(s.book||'')}</td><td class="n">${counts[s.id]}問</td></tr>`).join('')}</tbody></table></div>
    <p class="tiny">${esc(UI.qNote)}</p>
  </section>
  <section class="panel">
    <h2>記録</h2>
    <p class="tiny">${syncState==='on'?'あなた専用の場所に保存し、同じアカウントのiPhone・iPad・Macで同期しています。':'いまはこの端末にだけ保存しています。'}</p>
    ${confirmReset?`<div class="confirm"><span>このコースの記録をすべて消します。元に戻せません。</span><button class="danger" data-act="reset-yes">消す</button><button data-act="reset-no">やめる</button></div>`:`<button class="danger" data-act="reset">記録を消す</button>`}
  </section>
  <p class="tiny" style="padding-bottom:8px">AIの解説は誤りを含むことがあります。最終確認は教材で。</p>`;
}

/* ---------- 出題 ---------- */
function startQuiz(mode,ch){
  const ids=queue(mode,ch);
  if(!ids.length){toast(mode==='weak'?'苦手な問題はありません':'出せる問題がありません');return;}
  quiz={mode,ch,ids,i:0,ok:0,perm:null,answered:null,ai:null};
  newPerm(); page='quiz'; render(); scrollTo(0,0);
}
function showOne(id){quiz={mode:'one',ids:[id],i:0,ok:0,perm:null,answered:null,ai:null};newPerm();page='quiz';render();scrollTo(0,0);}
function newPerm(){const p=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}quiz.perm=p;quiz.answered=null;quiz.ai=null;}
function quizView(){
  const id=quiz.ids[quiz.i], q=BY[id], a=quiz.answered, l=S.log[id];
  const title={today:'今日の学習',weak:'苦手だけ',chapter:quiz.from?'節の問題':'章を解く',one:'問題を見る'}[quiz.mode];
  const opts=quiz.perm.map((o,k)=>{
    let cls='opt'; if(a!=null){if(o===q.correct)cls+=' right';else if(o===a)cls+=' wrong';}
    return `<button class="${cls}" data-pick="${o}" ${a!=null?'disabled':''}><span class="k">${'ABCD'[k]}</span><span>${esc(q.options[o])}</span></button>`;
  }).join('');
  const saved=ASKS[id];
  const aiText=quiz.ai?.text||saved?.answer||'';
  const aiBlock=a==null?'':`
    <section class="panel">
      <div class="row" style="justify-content:space-between;align-items:center"><h2>Claudeに聞く</h2>${SAMPLE&&!quiz.ai?.busy?`<button data-act="ask" style="flex:0 0 auto">${aiText?'もう一度聞く':'たとえで説明してもらう'}</button>`:''}</div>
      ${aiText?`<div class="ai">${esc(aiText)}</div>`:`<p class="tiny">${SAMPLE?'解説で分からないところを、身近なたとえで説明します。答えはこの問題に残り、あとで振り返れます。':'この画面ではClaudeを呼べません（Claudeで開くと使えます）。'}</p>`}
      ${quiz.ai?.busy?'<p class="tiny">考えています…</p>':''}
    </section>`;
  return `
  <div class="qhead"><button data-act="quit">← やめる</button><span class="tiny">${esc(title)}　${quiz.i+1}／${quiz.ids.length}</span></div>
  <div class="prog"><i style="width:${(quiz.i+(a!=null?1:0))/quiz.ids.length*100}%"></i></div>
  <section class="panel">
    <div class="meta">${srcChip(q)}<span class="chip">${esc(chName(q.chapter))}</span>${isWeak(id)?'<span class="chip weak">苦手</span>':''}${l?`<span class="tiny">これまで ${l.ok}/${l.n}回正解</span>`:''}</div>
    <p class="prompt">${esc(q.prompt)}</p>
    <div class="opts">${opts}</div>
  </section>
  ${a==null?'':`
  <section class="panel">
    <p class="verdict ${a===q.correct?'ok':'ng'}">${a===q.correct?'正解':'不正解'}</p>
    ${q.term?`<p class="label" style="text-transform:none;letter-spacing:.04em">論点：${esc(q.term)}</p>`:''}
    <p class="exp">${esc(q.explanation)}</p>
    <p class="tiny">出典：${esc(SRC[q.source]?.label||q.source)} ${q.ref?esc([q.ref.sec,q.ref.no!=null?'問'+q.ref.no:''].filter(Boolean).join('・')):''}${esc(UI.rewritten)}</p>
    ${relatedFor(q)}
  </section>
  ${aiBlock}
  <div class="sticky"><button class="cta" data-act="next">${quiz.i+1<quiz.ids.length?'次の問題へ':'結果を見る'}</button></div>`}`;
}
function resultView(){
  const t=todayRec();
  return `
  <section class="hero"><p class="label">Done</p><h1>${quiz.ok}／${quiz.ids.length}問 正解</h1><p class="muted">今日の合計 ${t.ids.length}問（目標${GOAL}問）</p></section>
  <section class="panel">
    <button class="cta" data-start="${quiz.mode==='one'?'today':quiz.mode}" ${quiz.ch?`data-ch="${[].concat(quiz.ch).join(',')}"`:''}>もう10問</button>
    ${quiz.from?`<button data-sec="${esc(quiz.from)}">テキストに戻る</button>`:''}
    <button data-act="home">ホームに戻る</button>
  </section>`;
}
async function ask(){
  const id=quiz.ids[quiz.i], q=BY[id], a=quiz.answered;
  const prompt=`あなたは${C.ai?.persona||C.title+'の受験者'}を支える家庭教師です。
次の4択問題について、受験者が${a===q.correct?'正解しましたが理解を確かめたい':'間違えた'}ので説明してください。

【問題】${q.prompt}
【選択肢】
${q.options.map((o,i)=>`- ${o}`).join('\n')}
【正解】${q.options[q.correct]}
${a!==q.correct?`【受験者が選んだもの】${q.options[a]}\n`:''}【教材の解説】${q.explanation}

書き方：
- 400字以内、です・ます調、見出しや記号の装飾なし
- まず論点「${q.term||''}」をひとことで言い、次に中学生にも分かる身近なたとえで説明する
- ${a!==q.correct?'選んだ選択肢がなぜ違うかを1〜2文で':'ほかの選択肢との違いを1〜2文で'}
- 選択肢を記号や番号で呼ばない（毎回並びが変わるため）。中身の言葉で呼ぶ
- 最後に「覚え方」を1行`;
  quiz.ai={busy:true,text:''}; render();
  try{
    const r=await SAMPLE(prompt,{cache:false,onText:({text})=>{if(quiz&&quiz.ids[quiz.i]===id){quiz.ai.text=text;const el=document.querySelector('.ai');if(el)el.textContent=text;else render();}}});
    if(!quiz||quiz.ids[quiz.i]!==id)return;
    quiz.ai={busy:false,text:r.text};
    S.asked[id]=day(); save();
    if(DB)DB.collection('asks').doc(C.id+'__'+id).set({course:C.id,qid:id,chapter:q.chapter,term:q.term||'',picked:q.options[a],correct:a===q.correct,answer:r.text,at:new Date().toISOString()}).catch(()=>{});
  }catch(e){
    if(quiz&&quiz.ai)quiz.ai.busy=false;
    toast(e&&e.code==='rate_limited'?'少し時間をおいてからもう一度どうぞ':e&&e.code==='not_granted'?'Claudeの利用が許可されていません':'説明を作れませんでした');
  }
  render();
}

/* ---------- テキスト・用語集 ---------- */
let curSec=null, gArea='', gQuery='';
const AREA_NAME=Object.fromEntries(PARTS.map(p=>[p.id,p.name]));
const secPart=id=>SEC[id]?.part;
function linkTerms(html,used){
  if(!GLINK.re)return html;
  return html.replace(GLINK.re,m=>{const t=GLINK.map.get(m);if(!t||used.has(t))return m;used.add(t);return `<button class="tl" data-term="${esc(t)}">${m}</button>`;});
}
function renderBody(body){
  const used=new Set(), out=[]; let list=null;
  const close=()=>{if(list){out.push(`<ul class="tx">${list.join('')}</ul>`);list=null;}};
  const T=s=>linkTerms(esc(s),used);
  for(const raw of body.split('\n')){
    const line=raw.replace(/\s+$/,'');
    if(!line.trim()){close();continue;}
    const sub=line.match(/^  - (.*)/), li=line.match(/^- (.*)/), h=line.match(/^## (.*)/), co=line.match(/^(例|ツボ|仕事|注意)｜(.*)/);
    if(sub||li){(list=list||[]).push(`<li${sub?' class="sub"':''}>${T((sub||li)[1])}</li>`);continue;}
    close();
    if(h)out.push(`<h3>${esc(h[1])}</h3>`);
    else if(co)out.push(`<p class="co co-${{例:'ex',ツボ:'pt',仕事:'wk',注意:'nt'}[co[1]]}"><b>${esc(co[1]==='ツボ'?'試験のツボ':co[1]==='仕事'?'仕事でいうと':co[1])}</b>${T(co[2])}</p>`);
    else out.push(`<p>${T(line)}</p>`);
  }
  close(); return out.join('');
}
function qCount(sec){return sec.ch.length?IDS.filter(i=>sec.ch.includes(BY[i].chapter)).length:0;}
function sylDone(id){return (SYL[id]||[]).filter(([n])=>S.can[n]).length;}
function textList(){
  const nRead=SECS.filter(x=>S.read[x.id]).length, nCan=[...SYLNO].filter(n=>S.can[n]).length;
  return `
  <section class="hero"><p class="label">Text</p><h1>公式の範囲で読む</h1><p class="muted">${esc(UI.textLead)}</p></section>
  <section class="panel">
    <div class="row" style="gap:24px">
      <div><p class="tiny">読んだ節</p><p class="count" style="font-size:30px">${nRead}<small>／${SECS.length}</small></p></div>
      <div><p class="tiny">${esc(UI.syl)}「できる」</p><p class="count" style="font-size:30px">${nCan}<small>／${SYLNO.size}</small></p></div>
    </div>
    <div class="track" style="height:8px"><i class="m" style="width:${nCan/Math.max(1,SYLNO.size)*100}%"></i></div>
    <p class="tiny">${esc(UI.syl)}の到達目標は、各節の終わりで自分で「できる」を付けます。問題の正答率とは別の、自己評価です。</p>
  </section>
  ${PARTS.map(p=>`
  <section class="panel">
    <div><p class="label" style="text-transform:none;letter-spacing:.04em">${esc(p.name)}</p><p class="tiny">${esc(p.lead||'')}</p></div>
    <div class="toc">${p.sections.map(x=>{const n=(SYL[x.id]||[]).length,d=sylDone(x.id);return `<button data-sec="${esc(x.id)}" class="${S.read[x.id]?'done':''}"><span class="ck" aria-hidden="true">${S.read[x.id]?'✓':''}</span><span class="tt"><b>${esc(x.title)}</b><span class="tiny">${n?`${esc(UI.syl)} ${d}/${n}`:''}${n&&qCount(x)?'・':''}${qCount(x)?`問題 ${qCount(x)}問`:''}</span></span></button>`;}).join('')}</div>
  </section>`).join('')}
  <p class="tiny" style="padding-bottom:8px">${esc(UI.textNote)}</p>`;
}
function sylBox(id){
  const items=SYL[id]||[]; if(!items.length)return '<div data-sylbox></div>';
  return `<section class="panel" data-sylbox>
    <div class="row" style="justify-content:space-between;align-items:baseline"><h2>${esc(UI.sylLong)}の到達目標</h2><span class="tiny">${sylDone(id)}／${items.length} できる</span></div>
    <p class="tiny">${esc(UI.sylNote)}</p>
    <div class="syl">${items.map(([n,t])=>`<button data-can="${esc(n)}" aria-pressed="${S.can[n]?'true':'false'}"><span class="box" aria-hidden="true">${S.can[n]?'✓':''}</span><span><span class="tiny">${esc(n)}</span><br>${esc(t)}</span></button>`).join('')}</div>
  </section>`;
}
function secView(id){
  const x=SEC[id], i=SECS.findIndex(y=>y.id===id), prev=SECS[i-1], next=SECS[i+1], nq=qCount(x);
  return `
  <div class="qhead"><button data-tab="text">← 目次</button><span class="tiny">${esc(x.partName)}　${i+1}／${SECS.length}</span></div>
  <section class="hero" style="padding-top:4px"><p class="label" style="text-transform:none;letter-spacing:.04em">${esc(x.partName)}</p><h1>${esc(x.title)}</h1>
    <div class="meta">${x.subs.map(s=>`<span class="chip">${esc(s)}</span>`).join('')}</div>
    <p class="muted">ねらい：${esc(x.goal)}</p></section>
  <section class="panel prose">${renderBody(x.body)}</section>
  ${sylBox(id)}
  <section class="panel">
    <button class="cta" data-secstart="${esc(id)}" ${nq?'':'disabled'}>${nq?`この節の問題を解く（関連${nq}問から10問）`:'この節に対応する問題はまだありません'}</button>
    <button data-act="read" aria-pressed="${S.read[id]?'true':'false'}">${S.read[id]?'✓ 読んだ（取り消す）':'読んだ'}</button>
    ${x.ch.length?`<p class="tiny">対応する問題の章：${x.ch.map(n=>esc(chName(n))).join('、')}</p>`:''}
  </section>
  <div class="row" style="padding-bottom:12px">${prev?`<button data-sec="${esc(prev.id)}">← ${esc(prev.title)}</button>`:''}${next?`<button data-sec="${esc(next.id)}">${esc(next.title)} →</button>`:''}</div>`;
}
function openSec(id){if(!SEC[id])return;curSec=id;page='sec';quiz=null;const d=$('#term');if(d&&d.open)d.close();render();scrollTo(0,0);}
function termCard(g,withLink){
  return `<div class="term"><h3>${esc(g.t)}</h3>${g.al.length?`<p class="tiny">${esc(g.al.join('・'))}</p>`:''}
    <p>${esc(g.d)}</p>
    <p class="co co-ex"><b>たとえ</b>${esc(g.m)}</p>
    <p class="co co-pt"><b>この文脈での役割</b>${esc(g.u)}</p>
    ${withLink&&SEC[g.sec]?`<button data-sec="${esc(g.sec)}">テキスト「${esc(SEC[g.sec].title)}」へ</button>`:''}</div>`;
}
function showTerm(t){const g=GBY[t];if(!g)return;const d=$('#term');$('#termBody').innerHTML=termCard(g,!(page==='sec'&&curSec===g.sec));if(!d.open)d.showModal();}
function glossItems(){
  const q=gQuery.trim().toLowerCase();
  return GL.filter(g=>(!gArea||secPart(g.sec)===gArea)&&(!q||[g.t,...g.al,g.d].some(s=>s.toLowerCase().includes(q))))
    .sort((a,b)=>a.t.localeCompare(b.t,'ja'));
}
function glossListHtml(){
  const L=glossItems();
  return `<p class="tiny">${L.length}語</p>${L.map(g=>`<details class="gl"><summary><b>${esc(g.t)}</b>${g.al.length?`<span class="tiny">${esc(g.al.join('・'))}</span>`:''}<span class="gd">${esc(g.d)}</span></summary>${termCard(g,true)}</details>`).join('')||'<p class="muted">見つかりません。</p>'}`;
}
function glossView(){
  const areas=PARTS.map(p=>p.id).filter(a=>a!=='intro');
  return `
  <section class="hero"><p class="label">Glossary</p><h1>用語集</h1><p class="muted">定義・身近なたとえ・試験と仕事での役割。テキスト中の下線の用語からも開けます。</p></section>
  <section class="panel">
    <input id="gq" type="search" placeholder="用語・別名・説明で探す" value="${esc(gQuery)}" autocomplete="off">
    <div class="row chips"><button data-garea="" aria-pressed="${gArea===''}">すべて</button>${areas.map(a=>`<button data-garea="${a}" aria-pressed="${gArea===a}">${esc(AREA_NAME[a])}</button>`).join('')}</div>
    <div id="glist">${glossListHtml()}</div>
  </section>`;
}
document.addEventListener('click',e=>{const d=$('#term');if(d&&e.target===d)d.close();});
document.addEventListener('input',e=>{if(e.target.id==='gq'){gQuery=e.target.value;$('#glist').innerHTML=glossListHtml();}});
function relatedFor(q){
  const secs=SECS.filter(x=>x.ch.includes(q.chapter)&&x.part!=='intro').slice(0,3);
  const t=(q.term||'').replace(/（.*?）/g,'');
  const terms=t?GL.filter(g=>[g.t,...g.al].some(k=>k.length>=2&&(t.includes(k)||k===t))).slice(0,4):[];
  if(!secs.length&&!terms.length)return '';
  return `<div class="rel">${secs.length?`<p class="tiny">テキストで読む</p><div class="row">${secs.map(x=>`<button data-sec="${esc(x.id)}">${esc(x.title)}</button>`).join('')}</div>`:''}
    ${terms.length?`<p class="tiny">用語</p><div class="row">${terms.map(g=>`<button data-term="${esc(g.t)}">${esc(g.t)}</button>`).join('')}</div>`:''}</div>`;
}

/* ---------- 描画とイベント ---------- */
function render(){
  const m=$('#main');
  if(page==='quiz')m.innerHTML=quiz.i>=quiz.ids.length?resultView():quizView();
  else if(page==='sec')m.innerHTML=secView(curSec);
  else m.innerHTML={home,review,text:textList,gloss:glossView,stats,settings}[page]();
  const tab=page==='quiz'?'home':page==='sec'?'text':page;
  document.querySelectorAll('nav button').forEach(b=>b.toggleAttribute('aria-current',b.dataset.tab===tab));
  document.querySelectorAll('nav button[aria-current]').forEach(b=>b.setAttribute('aria-current','page'));
}
document.addEventListener('toggle',e=>{if(e.target.id==='weakList')openWeak=e.target.open;},true);
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b||b.disabled)return;
  if(b.dataset.tab){page=b.dataset.tab;quiz=null;confirmReset=false;render();scrollTo(0,0);return;}
  if(b.dataset.sec){openSec(b.dataset.sec);return;}
  if(b.dataset.term){showTerm(b.dataset.term);return;}
  if(b.dataset.can){const k=b.dataset.can;if(S.can[k])delete S.can[k];else S.can[k]=day();save();const st=b.closest('[data-sylbox]');if(st)st.outerHTML=sylBox(curSec);else render();return;}
  if(b.dataset.secstart){const x=SEC[b.dataset.secstart];const ids=queue('chapter',x.ch);if(!ids.length){toast('この節の問題はまだありません');return;}quiz={mode:'chapter',ch:x.ch,from:x.id,ids,i:0,ok:0,perm:null,answered:null,ai:null};newPerm();page='quiz';render();scrollTo(0,0);return;}
  if(b.dataset.garea!=null){gArea=b.dataset.garea;render();return;}
  if(b.dataset.start){const c=b.dataset.ch?b.dataset.ch.split(',').map(Number):null;startQuiz(b.dataset.start,c&&c.length===1?c[0]:c);return;}
  if(b.dataset.show){showOne(b.dataset.show);return;}
  if(b.dataset.pick!=null&&quiz&&quiz.answered==null){
    const o=+b.dataset.pick, id=quiz.ids[quiz.i], ok=o===BY[id].correct;
    quiz.answered=o; if(ok)quiz.ok++;
    answer(id,ok); render();
    return;
  }
  const act=b.dataset.act;
  if(act==='next'){quiz.i++;if(quiz.i<quiz.ids.length)newPerm();render();scrollTo(0,0);}
  else if(act==='quit'||act==='home'){const back=quiz&&quiz.from;quiz=null;if(back&&act==='quit'){openSec(back);return;}page='home';render();scrollTo(0,0);}
  else if(act==='ask')ask();
  else if(act==='read'){if(S.read[curSec])delete S.read[curSec];else S.read[curSec]=day();save();render();}
  else if(act==='close-term')$('#term').close();
  else if(act==='reset'){confirmReset=true;render();}
  else if(act==='reset-no'){confirmReset=false;render();}
  else if(act==='reset-yes'){S=fresh();confirmReset=false;save();render();toast('記録を消しました');}
});
render();
})();
