'use strict';

const NAV_VERSION='0.6.6';
const UI66_ORDER=['home','input','calendar','chart','settings'];

function ui66HiddenStash(){
  let stash=$('ui66HiddenLogic');
  if(!stash){
    stash=document.createElement('div');
    stash.id='ui66HiddenLogic';
    stash.hidden=true;
    $('settings')?.appendChild(stash);
  }
  return stash;
}

function ui66ArrangeInfo(){
  const input=$('input'),calendar=$('calendar'),chart=$('chart'),settings=$('settings');
  if(!input||!calendar||!chart||!settings)return;

  /* Scoring rules already live inside each input row. Keep the generated
     settings copy in the DOM for app logic, but do not show a duplicate UI. */
  const criteriaCard=$('allCriteria')?.closest('.card');
  const stash=ui66HiddenStash();
  if(criteriaCard&&stash&&criteriaCard.parentElement!==stash)stash.appendChild(criteriaCard);
  $('ui65Rules')?.remove();

  /* Weekly summary is history/context, so it belongs with Calendar. */
  const weeklyCard=$('weekly')?.closest('.card');
  let weekly=$('ui66WeeklyAnalysis');
  if(!weekly){
    weekly=document.createElement('div');
    weekly.id='ui66WeeklyAnalysis';
    weekly.className='card ui66-weekly-analysis';
    weekly.innerHTML=`<div class="ui66-weekly-head"><span class="ui66-weekly-icon">${uiIcon('chart')}</span><div><div class="title">週間サマリー</div><div class="sub">直近7日の記録</div></div></div><div class="ui66-weekly-body"></div>`;
    const calendarCard=[...calendar.querySelectorAll(':scope>.card')].find(c=>c.querySelector('#cal'));
    if(calendarCard)calendarCard.after(weekly);else calendar.appendChild(weekly);
  }
  if(weeklyCard&&weeklyCard.parentElement!==weekly.querySelector('.ui66-weekly-body')){
    weekly.querySelector('.ui66-weekly-body').appendChild(weeklyCard);
    weeklyCard.classList.add('ui66-weekly-card');
  }
  const oldWeekly=$('ui65WeeklyAnalysis');
  if(oldWeekly&&oldWeekly!==weekly)oldWeekly.remove();

  /* Settings should only present editable settings or data actions. */
  const head=settings.querySelector(':scope>.ui-page-head .ui-page-sub');
  if(head)head.textContent='変更できる項目だけをまとめています。';
  const menu=settings.querySelector('.ui64-advanced-menu');
  menu?.querySelectorAll('.ui64-settings-item').forEach(item=>{
    const card=item.querySelector('.card');
    if(!card||card.querySelector('#allCriteria')||card.querySelector('#weekly'))item.remove();
  });

  if($('version'))$('version').textContent=`Health Score v${NAV_VERSION}`;
}

/* Replace the previous v0.6.5 placement routine. Existing wrappers call this
   binding dynamically, which keeps the DOM from bouncing between screens. */
if(typeof ui65MoveReadOnlyInfo==='function')ui65MoveReadOnlyInfo=ui66ArrangeInfo;

const ui66CoreFillDetail=fillDetail;
fillDetail=function(d=$('date').value){ui66CoreFillDetail(d);ui66ArrangeInfo()};

const ui66CoreFillSettings=fillSettings;
fillSettings=function(){ui66CoreFillSettings();ui66ArrangeInfo()};

const ui66CoreRenderWeekly=renderWeekly;
renderWeekly=function(){ui66CoreRenderWeekly();ui66ArrangeInfo()};

const ui66CoreRenderCalendar=renderCalendar;
renderCalendar=function(){ui66CoreRenderCalendar();ui66ArrangeInfo()};

const ui66CoreGoto=goto;
goto=function(id){ui66CoreGoto(id);ui66ArrangeInfo()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

/* ---------- Horizontal swipe navigation ---------- */
let ui66Touch=null;
let ui66SuppressClickUntil=0;

function ui66InteractiveTarget(target){
  return !!target.closest('input,textarea,select,[contenteditable="true"]');
}

function ui66SwipeGoto(next,direction){
  if(!next||next===activeView)return;
  goto(next);
  const view=$(next);
  if(view){
    view.classList.remove('ui66-swipe-left','ui66-swipe-right');
    void view.offsetWidth;
    view.classList.add(direction==='left'?'ui66-swipe-left':'ui66-swipe-right');
    setTimeout(()=>view.classList.remove('ui66-swipe-left','ui66-swipe-right'),220);
  }
}

document.addEventListener('touchstart',ev=>{
  if(ev.touches.length!==1||ui66InteractiveTarget(ev.target)){ui66Touch=null;return}
  const t=ev.touches[0];
  const edge=24;
  if(t.clientX<edge||t.clientX>window.innerWidth-edge){ui66Touch=null;return}
  ui66Touch={x:t.clientX,y:t.clientY,time:Date.now()};
},{passive:true});

document.addEventListener('touchend',ev=>{
  if(!ui66Touch||ev.changedTouches.length!==1)return;
  const t=ev.changedTouches[0],dx=t.clientX-ui66Touch.x,dy=t.clientY-ui66Touch.y,dt=Date.now()-ui66Touch.time;
  ui66Touch=null;
  if(dt>900||Math.abs(dx)<72||Math.abs(dx)<Math.abs(dy)*1.35)return;
  const i=UI66_ORDER.indexOf(activeView);if(i<0)return;
  const ni=dx<0?i+1:i-1;
  if(ni<0||ni>=UI66_ORDER.length)return;
  ui66SuppressClickUntil=Date.now()+420;
  ui66SwipeGoto(UI66_ORDER[ni],dx<0?'left':'right');
},{passive:true});

document.addEventListener('touchcancel',()=>{ui66Touch=null},{passive:true});
document.addEventListener('click',ev=>{
  if(Date.now()<ui66SuppressClickUntil){ev.preventDefault();ev.stopPropagation()}
},true);

document.addEventListener('DOMContentLoaded',()=>{
  ui66ArrangeInfo();
  if($('version'))$('version').textContent=`Health Score v${NAV_VERSION}`;
});
