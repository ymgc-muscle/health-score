'use strict';

const UI086_VERSION='0.6.28';
const UI086_RATED_KEYS=['breakfast','lunch','buying','dinner','protein'];

function u86EarnedPoints(k,rating){
  if(!rating)return null;
  if(rating==='g')return maxFor(k);
  if(rating==='y')return ratingPoints(k,'y');
  if(rating==='r')return 0;
  return null;
}

function u86UpdateRatingPoints(){
  UI086_RATED_KEYS.forEach(k=>{
    const card=document.querySelector(`#input .ratecard[data-field="${k}"]`);
    const points=card?.querySelector('.acc-points');
    if(!points)return;
    const rating=card.querySelector(`.seg[data-k="${k}"] .sel`)?.dataset.v||null;
    const max=maxFor(k),earned=u86EarnedPoints(k,rating);
    points.textContent=earned==null?`${max}点満点`:`${earned} / ${max}点`;
  });
}

if(typeof buildRated==='function'){
  const u86CoreBuildRated=buildRated;
  buildRated=function(e){
    u86CoreBuildRated(e);
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

if(typeof goto==='function'){
  const u86CoreGoto=goto;
  goto=function(id){
    u86CoreGoto(id);
    if(id==='input')setTimeout(u86UpdateRatingPoints,0);
    if($('version'))$('version').textContent=`Health Score v${UI086_VERSION}`;
  };
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}

function u86KeepVersion(){
  const el=$('version');if(!el)return;
  const expected=`Health Score v${UI086_VERSION}`;
  if(el.textContent!==expected)el.textContent=expected;
}

document.addEventListener('DOMContentLoaded',()=>{
  u86UpdateRatingPoints();
  u86KeepVersion();
  const version=$('version');
  if(version)new MutationObserver(u86KeepVersion).observe(version,{childList:true,subtree:true,characterData:true});
});
