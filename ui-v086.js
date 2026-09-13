'use strict';

const UI086_VERSION='0.6.41';
const UI086_RATED_KEYS=['breakfast','lunch','buying','dinner','protein'];

const U86_DEFAULT_STRENGTH_MENU=[
  {name:'ワンハンドロー',weight:'',reps:'10〜12回',sets:'2セット'},
  {name:'フロアプレス',weight:'',reps:'8〜12回',sets:'2セット'},
  {name:'ショルダープレス',weight:'',reps:'8〜10回',sets:'2セット'},
  {name:'アームカール',weight:'',reps:'8〜12回',sets:'1〜2セット'},
  {name:'プランク',weight:'自重',reps:'30〜45秒',sets:'2セット'},
  {name:'デッドバグ',weight:'自重',reps:'左右8〜10回',sets:'2セット'}
];

function u86Escape(v){
  return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function u86NormalizeStrengthItem(x){
  if(!x||typeof x!=='object')return{name:'',weight:'',reps:'',sets:''};
  return{
    name:String(x.name??'').trim(),
    weight:String(x.weight??'').trim(),
    reps:String(x.reps??'').trim(),
    sets:String(x.sets??'').trim()
  };
}

function u86DefaultStrengthMenu(){return U86_DEFAULT_STRENGTH_MENU.map(x=>({...x}))}
function u86StrengthMenu(){
  const raw=Array.isArray(st.settings?.strengthMenu)?st.settings.strengthMenu:null;
  const menu=(raw||[]).map(u86NormalizeStrengthItem).filter(x=>x.name);
  return menu.length?menu:u86DefaultStrengthMenu();
}

function u86ExercisePlan(ds){
  const s=ds||today();
  const [y,m,d]=String(s).split('-').map(Number);
  const day=(Number.isFinite(y)&&Number.isFinite(m)&&Number.isFinite(d))?new Date(y,m-1,d).getDay():new Date().getDay();
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

function u86StrengthGuideMarkup(){
  const menu=u86StrengthMenu();
  const rows=menu.map((x,i)=>{
    const dose=[x.reps,x.sets].filter(Boolean).join(' × ');
    const detail=[x.weight?`重さ <b>${u86Escape(x.weight)}</b>`:'',dose?u86Escape(dose):''].filter(Boolean).join('　');
    return `<div style="display:flex;gap:10px;justify-content:space-between;align-items:baseline"><span><b>${i+1}. ${u86Escape(x.name)}</b></span><span style="color:#555;text-align:right">${detail||'内容未設定'}</span></div>`;
  }).join('');
  return `<div class="title">筋トレメニュー</div><div class="sub" style="margin-top:3px">火・木共通・上半身＋腹筋</div><div style="margin-top:11px;display:grid;gap:8px">${rows}</div><div class="help" style="margin-top:10px">迷ったら上から順番に。重さ・回数・セット数は「設定 → 筋トレメニュー」で変更できます。</div>`;
}

function u86UpdateStrengthGuide(){
  const ds=$('date')?.value||today(),p=u86ExercisePlan(ds);
  const exerciseCard=document.querySelector('#input .ratecard[data-field="hiit"]');
  let guide=$('u86StrengthGuideCard');
  if(p.type!=='strength'){
    guide?.remove();
    return;
  }
  if(!exerciseCard)return;
  if(!guide){
    guide=document.createElement('div');
    guide.id='u86StrengthGuideCard';
    guide.className='card';
  }
  guide.innerHTML=u86StrengthGuideMarkup();
  exerciseCard.insertAdjacentElement('afterend',guide);
}

function u86StrengthEditorRow(x,i,total){
  const item=u86NormalizeStrengthItem(x);
  return `<div data-strength-row="${i}" style="border:1px solid #e5e7eb;border-radius:12px;padding:11px;margin-top:10px;background:#fafafa">
    <div class="settings-grid">
      <div class="field"><label>種目名</label><input data-strength-name type="text" value="${u86Escape(item.name)}" placeholder="例 ワンハンドロー"></div>
      <div class="field"><label>重さ</label><input data-strength-weight type="text" value="${u86Escape(item.weight)}" placeholder="例 6kg×2 / 自重"></div>
      <div class="field"><label>回数・時間</label><input data-strength-reps type="text" value="${u86Escape(item.reps)}" placeholder="例 10〜12回 / 30秒"></div>
      <div class="field"><label>セット数</label><input data-strength-sets type="text" value="${u86Escape(item.sets)}" placeholder="例 2セット"></div>
    </div>
    <div style="display:flex;gap:7px;justify-content:flex-end;margin-top:9px">
      <button type="button" class="btn2" data-strength-up="${i}" style="width:auto;padding:8px 11px" ${i===0?'disabled':''}>↑</button>
      <button type="button" class="btn2" data-strength-down="${i}" style="width:auto;padding:8px 11px" ${i===total-1?'disabled':''}>↓</button>
      <button type="button" class="btn2" data-strength-remove="${i}" style="width:auto;padding:8px 11px">削除</button>
    </div>
  </div>`;
}

function u86CollectStrengthEditor(){
  const card=$('u86StrengthSettingsCard');
  if(!card)return[];
  return [...card.querySelectorAll('[data-strength-row]')].map(row=>({
    name:row.querySelector('[data-strength-name]')?.value.trim()||'',
    weight:row.querySelector('[data-strength-weight]')?.value.trim()||'',
    reps:row.querySelector('[data-strength-reps]')?.value.trim()||'',
    sets:row.querySelector('[data-strength-sets]')?.value.trim()||''
  }));
}

function u86RenderStrengthSettings(draft=null){
  const settings=$('settings');
  if(!settings)return;
  let card=$('u86StrengthSettingsCard');
  if(!card){
    card=document.createElement('div');
    card.id='u86StrengthSettingsCard';
    card.className='card';
    const focus=document.querySelector('#settings [data-focus]')?.closest('.card');
    const anchor=settings.querySelector('details.settings-advanced')||$('version');
    if(focus&&focus.parentElement===settings)focus.insertAdjacentElement('afterend',card);
    else if(anchor)anchor.insertAdjacentElement('beforebegin',card);
    else settings.appendChild(card);
  }

  const menu=Array.isArray(draft)?draft.map(x=>({...x})):u86StrengthMenu();
  card.innerHTML=`<div class="title">筋トレメニュー</div>
    <div class="help" style="margin-top:5px">火・木に表示する内容です。重さは「6kg」「6kg×2」「自重」など自由に入力できます。</div>
    <div id="u86StrengthEditor">${menu.map((x,i)=>u86StrengthEditorRow(x,i,menu.length)).join('')}</div>
    <button type="button" class="btn2" id="u86AddStrength" style="margin-top:10px">＋ 種目を追加</button>
    <div class="grid2" style="margin-top:8px">
      <button type="button" class="btn2" id="u86ResetStrength">初期メニューに戻す</button>
      <button type="button" class="btn" id="u86SaveStrength">筋トレメニューを保存</button>
    </div>`;

  $('u86AddStrength').onclick=()=>{
    const items=u86CollectStrengthEditor();
    if(items.length>=20){toast('種目は20個までにしてください');return}
    items.push({name:'',weight:'',reps:'',sets:''});
    u86RenderStrengthSettings(items);
    setTimeout(()=>$('u86StrengthSettingsCard')?.querySelector('[data-strength-row]:last-child [data-strength-name]')?.focus(),0);
  };
  $('u86ResetStrength').onclick=()=>{u86RenderStrengthSettings(u86DefaultStrengthMenu());toast('初期メニューをセットしました。保存で確定します')};
  $('u86SaveStrength').onclick=()=>{
    const items=u86CollectStrengthEditor();
    if(!items.length||items.some(x=>!x.name)){toast('種目名を入力してください');return}
    st.settings.strengthMenu=items.map(u86NormalizeStrengthItem);
    saveState();
    u86UpdateStrengthGuide();
    u86RenderStrengthSettings();
    toast('筋トレメニューを保存しました');
  };
  card.querySelectorAll('[data-strength-remove]').forEach(btn=>btn.onclick=()=>{
    const items=u86CollectStrengthEditor();
    if(items.length<=1){toast('1種目は残してください');return}
    items.splice(+btn.dataset.strengthRemove,1);
    u86RenderStrengthSettings(items);
  });
  card.querySelectorAll('[data-strength-up]').forEach(btn=>btn.onclick=()=>{
    const items=u86CollectStrengthEditor(),i=+btn.dataset.strengthUp;
    if(i<=0)return;
    [items[i-1],items[i]]=[items[i],items[i-1]];
    u86RenderStrengthSettings(items);
  });
  card.querySelectorAll('[data-strength-down]').forEach(btn=>btn.onclick=()=>{
    const items=u86CollectStrengthEditor(),i=+btn.dataset.strengthDown;
    if(i>=items.length-1)return;
    [items[i],items[i+1]]=[items[i+1],items[i]];
    u86RenderStrengthSettings(items);
  });
}

function u86UpdateExerciseCard(){
  const ds=$('date')?.value||today(),p=u86ExercisePlan(ds);
  const card=document.querySelector('#input .ratecard[data-field="hiit"]');
  if(!card)return;
  const title=card.querySelector('.acc-title');
  if(title)title.textContent=p.label;
  const criteriaEl=$('hiitCriteria');
  if(criteriaEl)criteriaEl.innerHTML=u86ExerciseCriteria(ds);

  const oldEmbedded=card.querySelector('#u86StrengthMenu');
  oldEmbedded?.remove();

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

function u86EnsureEditableState(){
  const ds=$('date')?.value||today(),e=ent(ds);
  if(e?.completed)return;
  if(typeof setDetailLocked==='function')setDetailLocked(false);
  const protein=$('proteinActual');
  if(protein)protein.disabled=false;
}

function u86RefreshSelectedDateExercise(){
  u86ArrangeInputOrder();
  u86UpdateExerciseCard();
  u86UpdateStrengthGuide();
  u86UpdateRatingPoints();
  u86EnsureEditableState();
}

function u86UpdateSelectedDateScore(){
  const ds=$('date')?.value||today(),e=ent(ds);
  const score=$('liveScore'),label=$('liveScoreLabel');
  if(score)score.textContent=scoreForDay(e);
  if(label)label.textContent=e?.completed?'確定スコア':'入力中スコア';
}

function u86LoadSelectedDate(ds){
  if(!ds)return;
  const dateEl=$('date');
  if(dateEl&&dateEl.value!==ds)dateEl.value=ds;

  if(typeof fillDetail==='function')fillDetail(ds);
  u86UpdateSelectedDateScore();
  u86RefreshSelectedDateExercise();
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
  const evalParent=rated.parentElement;

  // ui-v064 groups rated / steps / hiit inside #ui64EvalWrap.  Always reorder
  // against rated's actual parent so the exercise refresh keeps running.
  if(hiitCard&&evalParent&&hiitCard.nextElementSibling!==rated)evalParent.insertBefore(hiitCard,rated);
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
    u86RefreshSelectedDateExercise();
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
    u86RefreshSelectedDateExercise();
  };
}

if(typeof fillSettings==='function'){
  const u86CoreFillSettings=fillSettings;
  fillSettings=function(){
    u86CoreFillSettings();
    u86UpdateSettingsLabel();
    u86RenderStrengthSettings();
  };
}

if(typeof goto==='function'){
  const u86CoreGoto=goto;
  goto=function(id){
    u86CoreGoto(id);
    if(id==='input')setTimeout(()=>{
      u86UpdateSelectedDateScore();
      u86RefreshSelectedDateExercise();
    },0);
    if(id==='settings')setTimeout(()=>{u86UpdateSettingsLabel();u86RenderStrengthSettings()},0);
    if(id==='home')setTimeout(()=>{if(typeof ui82RenderNext==='function')ui82RenderNext()},0);
    if($('version'))$('version').textContent=`Health Score v${UI086_VERSION}`;
  };
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}

function u86ForceReopen(d){
  const e=snapshotEntry(ent(d));
  e.completed=false;
  delete e.finalScore;
  delete e.completedAt;
  delete e.scoreSnapshot;
  setEntry(d,e);

  if(d===$('date')?.value){
    if(typeof setDetailLocked==='function')setDetailLocked(false);
    fillDetail(d);
    if(typeof setDetailLocked==='function')setDetailLocked(false);
    const protein=$('proteinActual');
    if(protein)protein.disabled=false;
    if(typeof setAutosave==='function')setAutosave('変更は自動保存されます','ok');
    u86UpdateSelectedDateScore();
    u86RefreshSelectedDateExercise();
  }
  if(typeof renderAll==='function')renderAll();
  toast('記録を再開しました');
}

function u86BindReopenFix(){
  if(window.__u86ReopenFixBound)return;
  window.__u86ReopenFixBound=true;
  document.addEventListener('click',ev=>{
    const btn=ev.target.closest?.('[data-reopen]');
    if(!btn)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    u86ForceReopen(btn.dataset.reopen);
  },true);
}

function u86UpdateSettingsLabel(){
  const field=$('score_hiit')?.closest('.field');
  const label=field?.querySelector('label');
  if(label)label.textContent='運動（曜日メニュー）';
}

function u86BindDateRefresh(){
  const el=$('date');
  if(!el)return;
  const handler=()=>{
    const ds=el.value;
    if(ds)u86LoadSelectedDate(ds);
  };

  // Coreのonchangeに依存せず、この最終UI層で選択日の読み込みを完結させる。
  el.onchange=handler;
  el.oninput=handler;
  el.dataset.u86ExerciseBound='1';
}

function u86KeepVersion(){
  const el=$('version');if(!el)return;
  const expected=`Health Score v${UI086_VERSION}`;
  if(el.textContent!==expected)el.textContent=expected;
}

function u86Init(){
  u86BindDateRefresh();
  u86BindReopenFix();
  u86UpdateSelectedDateScore();
  u86RefreshSelectedDateExercise();
  u86UpdateSettingsLabel();
  u86RenderStrengthSettings();
  if(typeof ui82RenderNext==='function')ui82RenderNext();
  if(typeof renderAppleHome==='function')renderAppleHome();
  u86KeepVersion();
  const version=$('version');
  if(version)new MutationObserver(u86KeepVersion).observe(version,{childList:true,subtree:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',u86Init);else u86Init();
