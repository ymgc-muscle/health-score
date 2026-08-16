'use strict';

const SEMANTIC_VERSION='0.6.5';

function ui65MoveReadOnlyInfo(){
  const input=$('input'),chart=$('chart'),settings=$('settings');
  if(!input||!chart||!settings)return;

  const settingsHead=settings.querySelector(':scope>.ui-page-head');
  if(settingsHead){
    const sub=settingsHead.querySelector('.ui-page-sub');
    if(sub)sub.textContent='変更できる項目だけをまとめています。';
  }

  const basic=$('ui64SettingsBasic');
  if(basic){
    const s=basic.querySelector(':scope>summary span')||basic.querySelector(':scope>summary');
    if(s)s.textContent='目標を編集';
    if($('saveSettings'))$('saveSettings').textContent='目標を保存';
  }

  const scoreCard=$('score_weight')?.closest('.card');
  const scoreItem=scoreCard?.closest('.ui64-settings-item');
  if(scoreItem){
    const label=scoreItem.querySelector(':scope>summary>span:nth-child(2)');
    if(label){
      label.childNodes[0].nodeValue='スコア配点';
      const meta=label.querySelector('.ui64-set-meta');if(meta)meta.textContent='　100点の配分';
    }
    if(scoreCard&&!$('ui65SaveWeights')){
      const b=document.createElement('button');
      b.id='ui65SaveWeights';b.type='button';b.className='btn ui65-save-score';b.textContent='配点を保存';
      scoreCard.appendChild(b);b.onclick=()=>saveSettings();
    }
  }

  const dataCard=$('export')?.closest('.card');
  const dataItem=dataCard?.closest('.ui64-settings-item');
  if(dataItem){
    const label=dataItem.querySelector(':scope>summary>span:nth-child(2)');
    if(label){
      label.childNodes[0].nodeValue='データ管理';
      const meta=label.querySelector('.ui64-set-meta');if(meta)meta.textContent='　バックアップ・CSV';
    }
  }

  const criteriaCard=$('allCriteria')?.closest('.card');
  if(criteriaCard){
    const oldItem=criteriaCard.closest('.ui64-settings-item');
    let ref=$('ui65Rules');
    if(!ref){
      ref=document.createElement('details');ref.id='ui65Rules';ref.className='ui65-reference';
      ref.innerHTML=`<summary><span class="ui65-ref-icon">${uiIcon('edit')}</span><span class="ui65-ref-copy"><b>採点ルール</b><small>参照用・設定項目ではありません</small></span><span class="ui65-ref-arrow">›</span></summary><div class="ui65-reference-body"></div>`;
      const memo=$('ui64Memo');
      if(memo)memo.after(ref);else input.appendChild(ref);
    }
    const body=ref.querySelector('.ui65-reference-body');
    if(criteriaCard.parentElement!==body)body.appendChild(criteriaCard);
    criteriaCard.classList.add('ui65-reference-card');
    oldItem?.remove();
  }

  const weeklyCard=$('weekly')?.closest('.card');
  if(weeklyCard){
    const oldItem=weeklyCard.closest('.ui64-settings-item');
    let wrap=$('ui65WeeklyAnalysis');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='ui65WeeklyAnalysis';wrap.className='card ui65-weekly-analysis';
      wrap.innerHTML=`<div class="ui65-weekly-head"><span class="ui65-weekly-icon">${uiIcon('chart')}</span><div><div class="title">週間サマリー</div><div class="sub">食事・歩数・スコアの直近7日</div></div></div><div class="ui65-weekly-body"></div>`;
      const insight=chart.querySelector('.graph-insights')?.closest('.card');
      if(insight)insight.after(wrap);else chart.appendChild(wrap);
    }
    const body=wrap.querySelector('.ui65-weekly-body');
    if(weeklyCard.parentElement!==body)body.appendChild(weeklyCard);
    weeklyCard.classList.add('ui65-weekly-card');
    oldItem?.remove();
  }

  const menu=settings.querySelector('.ui64-advanced-menu');
  menu?.querySelectorAll('.ui64-settings-item').forEach(item=>{
    if(!item.querySelector('.card'))item.remove();
  });
}

const ui65CoreFillDetail=fillDetail;
fillDetail=function(d=$('date').value){ui65CoreFillDetail(d);ui65MoveReadOnlyInfo()};

const ui65CoreFillSettings=fillSettings;
fillSettings=function(){ui65CoreFillSettings();ui65MoveReadOnlyInfo()};

const ui65CoreRenderWeekly=renderWeekly;
renderWeekly=function(){ui65CoreRenderWeekly();ui65MoveReadOnlyInfo()};

const ui65CoreGoto=goto;
goto=function(id){ui65CoreGoto(id);ui65MoveReadOnlyInfo()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

document.addEventListener('DOMContentLoaded',()=>{
  ui65MoveReadOnlyInfo();
  if($('version'))$('version').textContent=`Health Score v${SEMANTIC_VERSION}`;
});
