'use strict';

const UI086_VERSION='0.6.36';
const UI086_RATED_KEYS=['breakfast','lunch','buying','dinner','protein'];

const U86_STRENGTH_MENU=[
  ['ワンハンドロー','10〜12回 × 2セット'],
  ['フロアプレス','8〜12回 × 2セット'],
  ['ショルダープレス','8〜10回 × 2セット'],
  ['アームカール','8〜12回 × 1〜2セット'],
  ['プランク','30〜45秒 × 2セット'],
  ['デッドバグ','左右8〜10回 × 2セット']
];

function u86ExercisePlan(ds){
  const day=dateObj(ds||today()).getDay();
  if(day===1||day===3||day===5)return{type:'hiit',label:'HIIT',homeLabel:'HIIT',scheduled:true};
  if(day===2||day===4)return{type:'strength',label:'筋トレ',homeLabel:'筋トレ',scheduled:true};
  return{type:'rest',label:'休養日',homeLabel:'休養',scheduled:false};
}

function u86ExerciseCriteria(ds){
  const p=u86ExercisePlan(ds),max=maxFor('hiit');
  if(p.scheduled){
    return `<span class="cg"><b>${max}点</b>：今日の予定「${p.label}」を実施。</span><br><span class="cr"><b>0点</b>：実施予定だったが未実施。</span>`;
  }
  return `<span class="cg"><b>${max}点</b>：計画どおり休養。軽い運動をした日も満点。</span>`;
}

function u86StrengthMenuMarkup(){
  return `<details id="u86StrengthMenu" style="margin:10px 0 12px;padding:10px 12px;border:1px solid #e3e6e8;border-radius:12px;background:#fafafa"><summary style="cursor:pointer;font-weight:800">筋トレメニューを見る <span style="font-weight:600;color:#777">（上半身＋腹筋・15〜20分）</span></summary><div style="margin-top:10px;display:grid;gap:7px">${U86_STRENGTH_MENU.map((x,i)=>`<div style="display:flex;gap:8px;justify-content:space-between;align-items:baseline"><span><b>${i+1}. ${x[0]}</b></span><span style="color:#555;white-space:nowrap">${x[1]}</span></div>`).join('')}</div><div class="help" style="margin-top:9px">火・木は同じメニュー。迷ったら上から順番にやればOKです。</div></details>`;
}

function u86UpdateExerciseCard(){
  const ds=$('date')?.value||today(),p=u86ExercisePlan(ds);
  const card=document.querySelector('#input .ratecard[data-field="hiit"]');
  if(!card)return;
  const title=card.querySelector('.acc-title');
  if(title)title.textContent=p.label;
  const criteriaEl=$('hiitCriteria');
  if(criteriaEl)criteriaEl.innerHTML=u86ExerciseCriteria(ds);

  const body=card.querySelector('.rate-body'),oldMenu=$('u86StrengthMenu');
  if(p.type==='strength'){
    if(body&&!oldMenu){
      const seg=$('hiitSeg');
      if(seg)seg.insertAdjacentHTML('beforebegin',u86StrengthMenuMarkup());
    }
  }else oldMenu?.remove();

  const done=$('hiitSeg')?.querySelector('[data-v="done"]');
  const rest=$('hiitSeg')?.querySelector('[data-v="rest"]');
  const missed=$('hiitSeg')?.querySelector('[data-v="missed"]');
  if(p.scheduled){
    if(done){done.textContent='実施';done.style.display=''}
    if(rest){rest.style.display='none'}
    if(missed){missed.textContent='未実施';missed.style.display=''}
  }else{
    if(done){done.textContent='軽く運動';done.style.display=''}
    if(rest){rest.textContent='休養';rest.style.display=''}
    if(missed){missed.style.display='none'}
  }
}

function u86EarnedPoints(k,rating){
  if(!rating)return null;
  if(rating==='g')return maxFor(k);
  if(rating==='y')return ratingPoints(k,'y');
  if(rating==='r')return 0;
  return null;
}

function u86SetPoints(card,earned,max){
  const points=card?.querySelector('.acc-points');
  if(!points)return;
  points.textContent=earned==null?`${max}点満点`:`${earned} / ${max}点`;
}

function u86UpdateRatingPoints(){
  const ds=$('date')?.value||today();
  const e=ent(ds);

  UI086_RATED_KEYS.forEach(k=>{
    const card=document.querySelector(`#input .ratecard[data-field="${k}"]`);
    const max=maxFor(k),earned=u86EarnedPoints(k,e[k]||null);
    u86SetPoints(card,earned,max);
  });

  const stepsCard=document.querySelector('#input .ratecard[data-field="steps"]');
  const stepsMax=maxFor('steps');
  const stepsEarned=e.steps==null?null:stepPoints(e.steps);
  u86SetPoints(stepsCard,stepsEarned,stepsMax);

  const hiitCard=document.querySelector('#input .ratecard[data-field="hiit"]');
  const hiitMax=maxFor('hiit');
  const hiitEarned=!e.hiit?null:(e.hiit==='missed'?0:hiitMax);
  u86SetPoints(hiitCard,hiitEarned,hiitMax);
}

function u86ArrangeInputOrder(){
  const input=$('input'),rated=$('rated');
  if(!input||!rated)return;

  const hiitCard=input.querySelector('.ratecard[data-field="hiit"]');
  const stepsCard=input.querySelector('.ratecard[data-field="steps"]');
  const calorieCard=$('caloriesActual')?.closest('.card');

  // 朝: 体重（週末は腹囲がこの直後に入る）→ 今日の運動 → 食事評価群
  if(hiitCard&&hiitCard.nextElementSibling!==rated)input.insertBefore(hiitCard,rated);

  // 夜の締め: 食事評価群（最後がたんぱく質）→ 歩数 → 摂取カロリー → メモ
  if(stepsCard&&rated.nextElementSibling!==stepsCard)rated.insertAdjacentElement('afterend',stepsCard);
  if(calorieCard&&stepsCard&&stepsCard.nextElementSibling!==calorieCard)stepsCard.insertAdjacentElement('afterend',calorieCard);
}

if(typeof criteria==='function'){
  const u86CoreCriteria=criteria;
  criteria=function(k){
    if(k==='hiit')return u86ExerciseCriteria($('date')?.value||today());
    return u86CoreCriteria(k);
  };
}

if(typeof ahCheckLabel==='function'){
  const u86CoreAhCheckLabel=ahCheckLabel;
  ahCheckLabel=function(k){return k==='hiit'?u86ExercisePlan(today()).homeLabel:u86CoreAhCheckLabel(k)};
}

if(typeof ui82RenderNext==='function'){
  const u86CoreUi82RenderNext=ui82RenderNext;
  ui82RenderNext=function(){
    if(typeof ui82Labels!=='undefined')ui82Labels.hiit=u86ExercisePlan(today()).label;
    u86CoreUi82RenderNext();
  };
}

if(typeof renderHome==='function'){
  const u86CoreRenderHome=renderHome;
  renderHome=function(){
    const old=LABELS.hiit;
    LABELS.hiit=u86ExercisePlan(today()).label;
    try{u86CoreRenderHome()}finally{LABELS.hiit=old}
  };
}

if(typeof buildRated==='function'){
  const u86CoreBuildRated=buildRated;
  buildRated=function(e){
    u86CoreBuildRated(e);
    u86ArrangeInputOrder();
    u86UpdateExerciseCard();
    u86UpdateRatingPoints();
  };
}

if(typeof updateLiveScore==='function'){
  const u86CoreUpdateLiveScore=updateLiveScore;
  updateLiveScore=function(){
    u86CoreUpdateLiveScore();
    u86UpdateRatingPoints();
  };
}

if(typeof fillDetail==='function'){
  const u86CoreFillDetail=fillDetail;
  fillDetail=function(d=$('date').value){
    u86CoreFillDetail(d);
    u86ArrangeInputOrder();
    u86UpdateExerciseCard();
    u86UpdateRatingPoints();
  };
}

if(typeof goto==='function'){
  const u86CoreGoto=goto;
  goto=function(id){
    u86CoreGoto(id);
    if(id==='input')setTimeout(()=>{u86ArrangeInputOrder();u86UpdateExerciseCard();u86UpdateRatingPoints()},0);
    if(id==='home')setTimeout(()=>{if(typeof ui82RenderNext==='function')ui82RenderNext()},0);
    if($('version'))$('version').textContent=`Health Score v${UI086_VERSION}`;
  };
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}

function u86UpdateSettingsLabel(){
  const field=$('score_hiit')?.closest('.field');
  const label=field?.querySelector('label');
  if(label)label.textContent='運動（曜日メニュー）';
}

function u86KeepVersion(){
  const el=$('version');if(!el)return;
  const expected=`Health Score v${UI086_VERSION}`;
  if(el.textContent!==expected)el.textContent=expected;
}

function u86Init(){
  u86ArrangeInputOrder();
  u86UpdateExerciseCard();
  u86UpdateRatingPoints();
  u86UpdateSettingsLabel();
  if(typeof ui82RenderNext==='function')ui82RenderNext();
  if(typeof renderAppleHome==='function')renderAppleHome();
  u86KeepVersion();
  const version=$('version');
  if(version)new MutationObserver(u86KeepVersion).observe(version,{childList:true,subtree:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',u86Init);else u86Init();
