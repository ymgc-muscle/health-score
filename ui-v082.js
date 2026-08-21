'use strict';

const UI082_VERSION='0.6.23';

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

if(typeof renderAppleHome==='function'){
  const ui82CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){ui82CoreRenderAppleHome();ui82RenderNext()};
}
if(typeof renderHome==='function'){
  const ui82CoreRenderHome=renderHome;
  renderHome=function(){ui82CoreRenderHome();ui82RenderNext()};
}

document.addEventListener('DOMContentLoaded',()=>{
  ui82RenderNext();
  const detailNav=document.querySelector('nav button[data-v="input"]');
  if(detailNav&&detailNav.childNodes.length)detailNav.childNodes[detailNav.childNodes.length-1].textContent='記録';
  if($('version'))$('version').textContent=`Health Score v${UI082_VERSION}`;
});
