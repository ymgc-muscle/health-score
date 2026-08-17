'use strict';

const UI074_VERSION='0.6.16';

function ui74ProteinParking(){
  const calories=$('caloriesActual');
  const grid=calories?.closest('.grid2');
  if(!grid)return null;
  let parking=$('ui74ProteinParking');
  if(!parking){
    parking=document.createElement('div');
    parking.id='ui74ProteinParking';
    parking.className='ui74-protein-parking';
    grid.appendChild(parking);
  }
  return parking;
}

function ui74ParkProtein(){
  const proteinInput=$('proteinActual'),field=proteinInput?.closest('.field'),parking=ui74ProteinParking();
  if(field&&parking&&field.parentElement!==parking)parking.appendChild(field);
}

function ui74ArrangeProtein(){
  const input=$('input'),proteinInput=$('proteinActual');
  if(!input||!proteinInput)return;

  const proteinCard=input.querySelector('.ratecard[data-field="protein"]');
  const proteinBody=proteinCard?.querySelector('.rate-body');
  const proteinSeg=proteinBody?.querySelector('.seg[data-k="protein"]');
  if(!proteinCard||!proteinBody||!proteinSeg)return;

  let wrap=proteinBody.querySelector('.ui74-protein-entry');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.className='ui74-protein-entry';
    wrap.innerHTML='<div class="ui74-protein-help"></div>';
    proteinBody.insertBefore(wrap,proteinSeg);
  }

  const field=proteinInput.closest('.field');
  if(field&&field.parentElement!==wrap)wrap.prepend(field);
  const label=field?.querySelector('label');
  if(label)label.textContent='1日のたんぱく質実績 (g)';
  proteinInput.step='0.1';
  proteinInput.placeholder='例 90.0';

  const target=Math.max(20,+st.settings.proteinTarget||100);
  const help=wrap.querySelector('.ui74-protein-help');
  if(help)help.textContent=`目標 ${target}g。入力すると、この下に ◎ ○ × の推奨が表示されます。`;

  const calories=$('caloriesActual');
  const actualCard=calories?.closest('.card');
  if(actualCard){
    const title=actualCard.querySelector(':scope>.title');
    if(title)title.textContent='摂取カロリー';
    const grid=calories.closest('.grid2');
    grid?.classList.add('ui74-calorie-grid');
    const calLabel=calories.closest('.field')?.querySelector('label');
    if(calLabel)calLabel.textContent='1日の摂取カロリー (kcal)';
    const helper=actualCard.querySelector(':scope>.help');
    if(helper)helper.textContent='1日の摂取カロリー実績を入力します。食事ごとの評価は下の各項目で入力できます。';
  }

  if($('version'))$('version').textContent=`Health Score v${UI074_VERSION}`;
}

function ui74OpenProtein(){
  ui74ArrangeProtein();
  const card=document.querySelector('#input .ratecard[data-field="protein"]');
  const el=$('proteinActual');
  card?.classList.add('open');
  card?.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>el?.focus(),260);
}

if(typeof ahOpen==='function'){
  const ui74CoreAhOpen=ahOpen;
  ahOpen=function(target){
    if(target==='protein'||target==='proteinActual'){
      goto('input');
      setTimeout(ui74OpenProtein,80);
      return;
    }
    ui74CoreAhOpen(target);
  };
}

const ui74CoreFillDetail=fillDetail;
fillDetail=function(d=$('date').value){
  /* #rated is rebuilt by the core function. Temporarily park the persistent
     proteinActual input outside #rated so the rebuild cannot destroy it. */
  ui74ParkProtein();
  ui74CoreFillDetail(d);
  ui74ArrangeProtein();
};

const ui74CoreGoto=goto;
goto=function(id){
  ui74CoreGoto(id);
  if(id==='input')ui74ArrangeProtein();
  if($('version'))$('version').textContent=`Health Score v${UI074_VERSION}`;
};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  ui74ArrangeProtein();
  if($('version'))$('version').textContent=`Health Score v${UI074_VERSION}`;
});

/* Load the current graph-axis correction after the existing graph modules.
   The service worker caches it after the first successful load. */
(()=>{
  if(document.querySelector('script[data-graph-v075]'))return;
  const s=document.createElement('script');
  s.src='graph-v075.js?v=076';
  s.async=false;
  s.dataset.graphV075='1';
  s.onload=()=>{
    if(typeof chart==='function'&&typeof activeView!=='undefined'&&activeView==='chart')chart();
    if($('version'))$('version').textContent=`Health Score v${UI074_VERSION}`;
  };
  document.head.appendChild(s);
})();
