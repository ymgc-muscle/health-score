'use strict';

const UI086_VERSION='0.6.30';
const UI086_RATED_KEYS=['breakfast','lunch','buying','dinner','protein'];

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
  if(hiitCard&&hiitCard.nextElementSibling!==rated)input.insertBefore(hiitCard,rated);

  const stepsCard=input.querySelector('.ratecard[data-field="steps"]');
  const calorieCard=$('caloriesActual')?.closest('.card');
  if(stepsCard&&calorieCard&&calorieCard!==stepsCard&&stepsCard.nextElementSibling!==calorieCard){
    stepsCard.insertAdjacentElement('afterend',calorieCard);
  }
}

if(typeof buildRated==='function'){
  const u86CoreBuildRated=buildRated;
  buildRated=function(e){
    u86CoreBuildRated(e);
    u86ArrangeInputOrder();
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
    u86UpdateRatingPoints();
  };
}

if(typeof goto==='function'){
  const u86CoreGoto=goto;
  goto=function(id){
    u86CoreGoto(id);
    if(id==='input')setTimeout(()=>{u86ArrangeInputOrder();u86UpdateRatingPoints()},0);
    if($('version'))$('version').textContent=`Health Score v${UI086_VERSION}`;
  };
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}

function u86KeepVersion(){
  const el=$('version');if(!el)return;
  const expected=`Health Score v${UI086_VERSION}`;
  if(el.textContent!==expected)el.textContent=expected;
}

function u86Init(){
  u86ArrangeInputOrder();
  u86UpdateRatingPoints();
  u86KeepVersion();
  const version=$('version');
  if(version)new MutationObserver(u86KeepVersion).observe(version,{childList:true,subtree:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',u86Init);else u86Init();
