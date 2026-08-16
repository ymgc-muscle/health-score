'use strict';

const HOME_TIDY_VERSION='0.6.8';

/* Treat +/-0.2 kg around the target line as on track, with a tiny epsilon
   so values such as 77.4 - 77.2 do not become 0.20000000000000284. */
if(typeof ahTrendStatus==='function'){
  ahTrendStatus=function(avg,target){
    const sw=+st.settings.startWeight,gw=+st.settings.goalWeight;
    if(!avg||!Number.isFinite(target)||!Number.isFinite(sw)||!Number.isFinite(gw))return'グラフを見る';
    const delta=avg.avg-target,dir=Math.sign(gw-sw);
    if(Math.abs(delta)<=0.200001)return'予定通り';
    const ahead=dir<0?delta<0:delta>0;
    return `${Math.abs(delta).toFixed(1)}kg${ahead?'先行':'遅れ'}`;
  };
}

function ui68TidyHome(){
  const add=$('ahAdd');
  if(add)add.remove();
  if(typeof renderAppleHome==='function'&&activeView==='home'){
    const box=$('appleHome');
    if(box&&!box.dataset.ui68Wrapped){
      box.dataset.ui68Wrapped='1';
    }
  }
  if($('version'))$('version').textContent=`Health Score v${HOME_TIDY_VERSION}`;
}

/* renderAppleHome rebuilds its markup, so remove the obsolete add button after
   every home render as well as on initial load. */
if(typeof renderAppleHome==='function'){
  const ui68CoreRenderAppleHome=renderAppleHome;
  renderAppleHome=function(){
    ui68CoreRenderAppleHome();
    $('ahAdd')?.remove();
  };
}

document.addEventListener('DOMContentLoaded',()=>{
  if(typeof renderAppleHome==='function'&&activeView==='home')renderAppleHome();
  ui68TidyHome();
});
