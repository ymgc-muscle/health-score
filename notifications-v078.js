'use strict';

const NOTIFY078_VERSION='0.6.18';
const HEALTH_PUSH_PUBLIC_KEY='BIJ3c77ebWnXpENqyTWlFlcJ8q1jAv5VW36MNAiUMX8AnwkEoQIxZnr_xe9qjogx7lRdDioHmWOUtRh0ohde-yg';

function n78Base64UrlToUint8Array(value){
  const pad='='.repeat((4-value.length%4)%4);
  const base64=(value+pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
}

function n78Supported(){
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function n78Registration(){
  if(!n78Supported())throw new Error('このブラウザーはWeb Pushに対応していません。');
  return navigator.serviceWorker.ready;
}

async function n78Subscription(){
  const reg=await n78Registration();
  return reg.pushManager.getSubscription();
}

function n78SubscriptionText(sub){
  return sub?JSON.stringify(sub.toJSON()):'';
}

function n78StatusText(permission,sub){
  if(!n78Supported())return ['この端末ではWeb Pushを利用できません。','bad'];
  if(permission==='denied')return ['通知がブラウザー設定でブロックされています。','bad'];
  if(sub)return ['この端末はPush通知に登録済みです。','good'];
  if(permission==='granted')return ['通知許可済み。Push登録を完了してください。','warn'];
  return ['通知はまだ有効になっていません。',''];
}

function n78EnsureCard(){
  const settings=$('settings');
  if(!settings||$('notify078Card'))return;
  const advanced=settings.querySelector('.settings-advanced');
  const card=document.createElement('div');
  card.className='card notify078-card';
  card.id='notify078Card';
  card.innerHTML=`
    <div class="title">プッシュ通知</div>
    <div class="help notify078-times">予定：<b>7:00</b> 体重記録　<b>17:30</b> 帰宅前チェック　<b>21:00</b> 今日の記録</div>
    <div class="notify078-status" id="notify078Status">確認中…</div>
    <div class="notify078-actions">
      <button class="btn2" type="button" id="notify078Enable">通知を有効にする</button>
      <button class="btn2" type="button" id="notify078Test">テスト通知</button>
      <button class="btn2" type="button" id="notify078Copy">端末登録情報をコピー</button>
      <button class="btn2 notify078-danger" type="button" id="notify078Disable">通知を解除</button>
    </div>
    <div class="help notify078-note">「端末登録情報」はGitHub Secretsへの初回設定にだけ使います。アプリ内には秘密鍵を保存しません。</div>`;
  settings.insertBefore(card,advanced||null);

  $('notify078Enable').onclick=n78Enable;
  $('notify078Test').onclick=n78Test;
  $('notify078Copy').onclick=n78Copy;
  $('notify078Disable').onclick=n78Disable;
  n78Refresh();
}

async function n78Refresh(){
  const status=$('notify078Status');
  if(!status)return;
  try{
    const sub=n78Supported()?await n78Subscription():null;
    const [text,cls]=n78StatusText(n78Supported()?Notification.permission:'unsupported',sub);
    status.textContent=text;
    status.className=`notify078-status ${cls}`.trim();
    $('notify078Test').disabled=Notification.permission!=='granted';
    $('notify078Copy').disabled=!sub;
    $('notify078Disable').disabled=!sub;
    $('notify078Enable').disabled=!!sub||Notification.permission==='denied';
  }catch(err){
    status.textContent=`通知状態を確認できませんでした：${err.message||err}`;
    status.className='notify078-status bad';
  }
  if($('version'))$('version').textContent=`Health Score v${NOTIFY078_VERSION}`;
}

async function n78Enable(){
  try{
    if(!n78Supported())throw new Error('このブラウザーはWeb Pushに対応していません。');
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){
      await n78Refresh();
      return;
    }
    const reg=await n78Registration();
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:n78Base64UrlToUint8Array(HEALTH_PUSH_PUBLIC_KEY)
      });
    }
    localStorage.setItem('health-score-push-subscription',n78SubscriptionText(sub));
    await n78Refresh();
    if(typeof toast==='function')toast('この端末のPush通知を有効にしました');
  }catch(err){
    if(typeof toast==='function')toast(`通知を有効にできませんでした：${err.message||err}`);
    await n78Refresh();
  }
}

async function n78Test(){
  try{
    if(Notification.permission!=='granted')throw new Error('通知を先に有効にしてください。');
    const reg=await n78Registration();
    await reg.showNotification('Health Score',{body:'通知テストです。',icon:'./icon.svg?v=5',tag:'health-score-test',data:{url:'./'}});
  }catch(err){
    if(typeof toast==='function')toast(`テスト通知を出せませんでした：${err.message||err}`);
  }
}

async function n78Copy(){
  try{
    const sub=await n78Subscription();
    if(!sub)throw new Error('Push登録がありません。');
    const text=n78SubscriptionText(sub);
    await navigator.clipboard.writeText(text);
    localStorage.setItem('health-score-push-subscription',text);
    if(typeof toast==='function')toast('端末登録情報をコピーしました');
  }catch(err){
    if(typeof toast==='function')toast(`コピーできませんでした：${err.message||err}`);
  }
}

async function n78Disable(){
  try{
    const sub=await n78Subscription();
    if(sub)await sub.unsubscribe();
    localStorage.removeItem('health-score-push-subscription');
    await n78Refresh();
    if(typeof toast==='function')toast('この端末のPush登録を解除しました');
  }catch(err){
    if(typeof toast==='function')toast(`Push登録を解除できませんでした：${err.message||err}`);
  }
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message',ev=>{
    if(ev.data?.type==='HEALTH_SCORE_NOTIFICATION_CLICK'&&typeof goto==='function')goto('input');
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  n78EnsureCard();
  if($('version'))$('version').textContent=`Health Score v${NOTIFY078_VERSION}`;
});
