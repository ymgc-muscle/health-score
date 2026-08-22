'use strict';

const UI082_VERSION='0.6.24';

const ui82Order=['weight','breakfast','lunch','buying','dinner','protein','steps','hiit'];
const ui82Labels={weight:'今朝の体重',breakfast:'朝食',lunch:'昼食',buying:'帰宅時の買い食い',dinner:'夕食',protein:'たんぱく質',steps:'今日の歩数',hiit:'HIIT / 運動'};

function ui82IsEntered(k,e){
  if(k==='weight')return e?.weight!==undefined&&e?.weight!==null&&e?.weight!=='';
  if(k==='steps')return e?.steps!==undefined&&e?.steps!==null&&e?.steps!=='';
  return !!e?.[k];
}
function ui82Next(e){return ui82Order.find(k=>!ui82IsEntered(k,e))||null}
function ui82Open(k){
  if(typeof ahOpen==='function'){ahOpen(k);return}
  goto('input');
  setTimeout(()=>scrollToField(k),60);
}
function ui82RenderNext(){
  const box=$('appleHome');if(!box)return;
  let card=$('ui82Next');
  if(!card){
    card=document.createElement('button');
    card.type='button';card.id='ui82Next';card.className='ui82-next';
    const scoreCard=box.querySelector('.ah-score-card');
    scoreCard?.insertAdjacentElement('afterend',card);
  }
  const e=ent(today()),count=completionCount(e),next=ui82Next(e),done=!!e.completed;
  if(done||!next){
    card.classList.add('done');card.disabled=true;
    card.innerHTML='<span class="ui82-kicker">TODAY</span><span class="ui82-main">今日の記録は完了</span><span class="ui82-sub">8 / 8 入力済み</span>';
    return;
  }
  card.disabled=false;card.classList.remove('done');card.dataset.target=next;
  card.innerHTML=`<span class="ui82-kicker">NEXT</span><span class="ui82-main">${ui82Labels[next]}を入力</span><span class="ui82-sub">入力 ${count} / 8 ・ あと ${Math.max(0,8-count)} 項目 <b>›</b></span>`;
  card.onclick=()=>ui82Open(card.dataset.target);
}

// v0.6.24: 帰宅が遅い日の実態に合わせ、買い食いを「禁止」ではなく
// 夕食までの計画的な補食として評価する。
if(typeof criteria==='function'){
  const ui82CoreCriteria=criteria;
  criteria=function(k){
    if(k!=='buying')return ui82CoreCriteria(k);
    const w=weights();
    return `<span class="cg"><b>◎ ${w.buying}点</b>：夕食までの計画的な補食。食べない日も◎。1〜2品、目安100〜350 kcal程度で止められた。ハンバーガー1個などもOK。</span><br><span class="cy"><b>○ ${ratingPoints(k,'y')}点</b>：やや多め（目安350〜500 kcal）だが、爆食いではなく夕食量を調整できた。</span><br><span class="cr"><b>× 0点</b>：補食の範囲を超える爆食い。セット＋追加、複数の揚げ物・菓子など、ほぼ一食分以上を食べたうえ通常の夕食も食べた。</span>`;
  };
}

if(typeof drawSettingsGuide==='function'){
  drawSettingsGuide=function(){
    const b=calorieBands(+$('setCalorieTarget').value||st.settings.calorieTarget),steps=+$('setStepTarget').value||10000,protein=+$('setProteinTarget').value||100;
    $('targetGuide').innerHTML=`<div class="sub">現在の目安</div><div class="grid2" style="margin-top:8px"><b>朝食 ◎ ${b.breakfast[0]}〜${b.breakfast[1]} kcal</b><b>昼食 ◎ ${b.lunch[0]}〜${b.lunch[1]} kcal</b><b>夕食 ◎ ${b.dinner[0]}〜${b.dinner[1]} kcal</b><b>補食 ◎ 100〜350 kcal程度（1〜2品）</b><b>歩数 ◎ ${steps.toLocaleString()}歩〜</b><b>たんぱく質 ◎ ${Math.round(protein*.9)}g〜</b></div>`;
  };
}

if(typeof renderAppleHome==='function'){
  const ui82CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){ui82CoreRenderAppleHome();ui82RenderNext()};
}
if(typeof renderHome==='function'){
  const ui82CoreRenderHome=renderHome;
  renderHome=function(){ui82CoreRenderHome();ui82RenderNext()};
}

if(typeof goto==='function'){
  const ui82CoreGoto=goto;
  goto=function(id){
    ui82CoreGoto(id);
    if($('version'))$('version').textContent=`Health Score v${UI082_VERSION}`;
  };
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>goto(b.dataset.v));
}

document.addEventListener('DOMContentLoaded',()=>{
  ui82RenderNext();
  const detailNav=document.querySelector('nav button[data-v="input"]');
  if(detailNav&&detailNav.childNodes.length)detailNav.childNodes[detailNav.childNodes.length-1].textContent='記録';
  if($('version'))$('version').textContent=`Health Score v${UI082_VERSION}`;
});
