'use strict';

const COMPACT_VERSION='0.6.5';

function ui64MealLabel(k){return {breakfast:'朝食',lunch:'昼食',dinner:'夕食'}[k]||LABELS[k]||k}

/* ---------- Detail input: keep decisions visible, tuck supporting data away ---------- */
function compactInput(){
  const section=$('input');if(!section)return;

  const rated=$('rated'),stepsCard=section.querySelector('[data-field="steps"]'),hiitCard=section.querySelector('[data-field="hiit"]');
  if(rated&&stepsCard&&hiitCard){
    let wrap=$('ui64EvalWrap');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='ui64EvalWrap';wrap.className='ui64-eval-wrap';
      wrap.innerHTML='<div class="ui64-eval-title">今日の評価</div><div class="ui64-eval-sub">◎ ○ × を選ぶだけ。食事量などは必要なときだけ開けます。</div>';
      rated.before(wrap);wrap.append(rated,stepsCard,hiitCard);
    }else{
      if(rated.parentElement!==wrap)wrap.appendChild(rated);
      if(stepsCard.parentElement!==wrap)wrap.appendChild(stepsCard);
      if(hiitCard.parentElement!==wrap)wrap.appendChild(hiitCard);
    }
  }

  ['breakfast','lunch','dinner'].forEach(k=>{
    const card=section.querySelector(`.ratecard[data-field="${k}"]`);if(!card)return;
    const body=card.querySelector('.rate-body'),grid=body?.querySelector(':scope>.grid2'),seg=body?.querySelector('.seg'),suggest=body?.querySelector('.suggest');
    if(!body||!grid||grid.closest('.ui64-meal-more'))return;
    const d=document.createElement('details');d.className='ui64-meal-more';
    d.innerHTML=`<summary>${ui64MealLabel(k)}の kcal・バランス</summary>`;
    d.appendChild(grid);
    if(suggest)body.insertBefore(d,suggest);else if(seg)seg.after(d);else body.appendChild(d);
  });

  const memo=$('memo'),memoCard=memo?.closest('.card');
  if(memo&&memoCard){
    let d=$('ui64Memo');
    if(!d){
      d=document.createElement('details');d.id='ui64Memo';d.className='ui64-disclosure ui64-memo';
      d.innerHTML='<summary>メモ</summary><div class="ui64-disclosure-body"></div>';
      memoCard.before(d);d.querySelector('.ui64-disclosure-body').appendChild(memo);
    }else if(memo.parentElement!==d.querySelector('.ui64-disclosure-body'))d.querySelector('.ui64-disclosure-body').appendChild(memo);
  }
}

/* ---------- Settings: snapshot first, forms only on demand ---------- */
function ui64SettingTile(k,v,unit=''){return `<div class="ui64-summary-tile"><div class="k">${k}</div><div class="v">${v}<small>${unit}</small></div></div>`}
function ui64UpdateSettingsSummary(){
  const box=$('ui64SettingsSummary');if(!box)return;
  const p=st.settings,goal=p.goalWeight!=null&&Number.isFinite(+p.goalWeight)?(+p.goalWeight).toFixed(1):'--',cal=Number.isFinite(+p.calorieTarget)?(+p.calorieTarget).toLocaleString():'--',protein=Number.isFinite(+p.proteinTarget)?Math.round(+p.proteinTarget):'--',steps=Number.isFinite(+p.stepTarget)?(+p.stepTarget).toLocaleString():'--';
  box.innerHTML=ui64SettingTile('目標体重',goal,'kg')+ui64SettingTile('カロリー',cal,'kcal')+ui64SettingTile('たんぱく質',protein,'g')+ui64SettingTile('歩数',steps,'歩');
}
function ui64SettingsItem(card,label,icon,meta,cls=''){
  if(!card)return null;
  const d=document.createElement('details');d.className=`ui64-settings-item ${cls}`.trim();
  d.innerHTML=`<summary><span class="ui64-set-icon">${uiIcon(icon)}</span><span>${label}<span class="ui64-set-meta">${meta}</span></span></summary><div class="ui64-settings-item-body"></div>`;
  d.querySelector('.ui64-settings-item-body').appendChild(card);return d;
}
function compactSettings(){
  const section=$('settings');if(!section)return;
  const head=section.querySelector(':scope>.ui-page-head');if(head){const sub=head.querySelector('.ui-page-sub');if(sub)sub.textContent=''}

  let summary=$('ui64SettingsSummary');
  if(!summary){summary=document.createElement('div');summary.id='ui64SettingsSummary';summary.className='ui64-summary-row ui64-settings-summary';const anchor=section.querySelector(':scope>.card, :scope>details');anchor?.before(summary)}
  ui64UpdateSettingsSummary();

  const goalCard=$('setGoalWeight')?.closest('.card'),healthCard=$('setCalorieTarget')?.closest('.card'),save=$('saveSettings');
  if(goalCard&&healthCard&&save){
    let basic=$('ui64SettingsBasic');
    if(!basic){
      basic=document.createElement('details');basic.id='ui64SettingsBasic';basic.className='ui64-disclosure ui64-settings-basic';
      basic.innerHTML='<summary><span>目標を編集</span></summary><div class="ui64-disclosure-body"></div>';
      summary.after(basic);
    }
    const body=basic.querySelector('.ui64-disclosure-body');
    [goalCard,healthCard,save].forEach(x=>{if(x.parentElement!==body)body.appendChild(x)});
  }

  const adv=section.querySelector('details.settings-advanced');if(!adv)return;adv.open=true;
  const advBody=adv.querySelector(':scope>div');if(!advBody)return;
  let menu=advBody.querySelector(':scope>.ui64-advanced-menu');
  if(!menu){menu=document.createElement('div');menu.className='ui64-advanced-menu';advBody.prepend(menu)}

  const cards=[...advBody.querySelectorAll(':scope>.card')];
  cards.forEach(card=>{
    if(card.closest('.ui64-settings-item'))return;
    let label='その他',icon='settings',meta='';
    if(card.querySelector('#score_weight')){label='スコアと配点';icon='target';meta='　100点の配分'}
    else if(card.querySelector('#allCriteria')){label='評価基準';icon='edit';meta='　◎ ○ × の判定'}
    else if(card.querySelector('#weekly')){label='週間サマリー';icon='chart';meta='　直近7日の確認'}
    else if(card.querySelector('#export')){label='データ';icon='backup';meta='　バックアップ・CSV'}
    const item=ui64SettingsItem(card,label,icon,meta,card.querySelector('#export')?'ui64-data':'');if(item)menu.appendChild(item);
  });
}

/* Re-apply after screens rebuild their DOM. */
const ui64CoreFillDetail=fillDetail;
fillDetail=function(d=$('date').value){ui64CoreFillDetail(d);compactInput()};
const ui64CoreFillSettings=fillSettings;
fillSettings=function(){ui64CoreFillSettings();compactSettings();ui64UpdateSettingsSummary()};

const ui64CoreGoto=goto;
goto=function(id){ui64CoreGoto(id);if(id==='input')compactInput();if(id==='settings'){compactSettings();ui64UpdateSettingsSummary()}};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));

/* ---------- v0.6.5: keep Settings semantically clean ---------- */
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
  menu?.querySelectorAll('.ui64-settings-item').forEach(item=>{if(!item.querySelector('.card'))item.remove()});
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
  compactInput();compactSettings();ui65MoveReadOnlyInfo();
  if($('version'))$('version').textContent=`Health Score v${COMPACT_VERSION}`;
});
