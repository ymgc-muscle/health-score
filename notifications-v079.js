'use strict';

const NOTIFY079_VERSION='0.6.21';
const NOTIFY079_TOKEN_KEY='health-score-fcm-token-v1';
const NOTIFY079_PREFS_KEY='health-score-notify-prefs-v1';
const NOTIFY079_CONFIG={
  apiKey:'AIzaSyA3ufV7dLgfiXMQXqnDNiXPGyvq9JHQbQM',
  authDomain:'health-score-b637d.firebaseapp.com',
  projectId:'health-score-b637d',
  messagingSenderId:'316048816487',
  appId:'1:316048816487:web:7ecc1f1521fb80b4fd97c2'
};
const NOTIFY079_VAPID='BAU0BOJ4T-duTVTrAPStHtYY_Eva_ZM6EteNQyu3OGij80uR1XH6f5CalCukbF0oTFsDSnYJKXoo1U5i28w_044';
const NOTIFY079_DEFAULTS={morning:true,morningTime:'07:00',evening:true,eveningTime:'17:30',night:true,nightTime:'21:00'};
let n79FirebasePromise=null;

function n79Prefs(){
  try{return{...NOTIFY079_DEFAULTS,...JSON.parse(localStorage.getItem(NOTIFY079_PREFS_KEY)||'{}')}}catch{return{...NOTIFY079_DEFAULTS}}
}
function n79SavePrefs(){
  const p={
    morning:!!$('notify078Morning')?.checked,
    morningTime:$('notify078MorningTime')?.value||'07:00',
    evening:!!$('notify078Evening')?.checked,
    eveningTime:$('notify078EveningTime')?.value||'17:30',
    night:!!$('notify078Night')?.checked,
    nightTime:$('notify078NightTime')?.value||'21:00'
  };
  localStorage.setItem(NOTIFY079_PREFS_KEY,JSON.stringify(p));
}
function n79SetStatus(text,kind=''){
  const el=$('notify078Status');if(!el)return;
  el.textContent=text;el.className=`notify078-status ${kind}`.trim();
}
function n79LoadScript(src,marker){
  return new Promise((resolve,reject)=>{
    const old=document.querySelector(`script[data-${marker}]`);
    if(old){
      if(old.dataset.loaded==='1'||(marker==='firebase-app-079'&&typeof firebase!=='undefined')||(marker==='firebase-msg-079'&&typeof firebase!=='undefined'&&firebase.messaging)){resolve();return}
      old.addEventListener('load',resolve,{once:true});old.addEventListener('error',()=>reject(new Error('Firebaseライブラリを読み込めませんでした')),{once:true});return;
    }
    const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(`data-${marker}`,'1');
    s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=()=>reject(new Error('Firebaseライブラリを読み込めませんでした'));document.head.appendChild(s);
  });
}
async function n79Firebase(){
  if(typeof firebase!=='undefined'&&firebase.initializeApp&&firebase.messaging)return firebase;
  if(!n79FirebasePromise)n79FirebasePromise=(async()=>{
    if(typeof firebase==='undefined')await n79LoadScript('https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js','firebase-app-079');
    if(!firebase.messaging)await n79LoadScript('https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js','firebase-msg-079');
    return firebase;
  })().catch(err=>{n79FirebasePromise=null;throw err});
  return n79FirebasePromise;
}
async function n79Messaging(){
  await n79Firebase();
  if(!firebase.apps?.length)firebase.initializeApp(NOTIFY079_CONFIG);
  return firebase.messaging();
}
async function n79MainWorker(){
  if(!('serviceWorker' in navigator))throw new Error('この端末はWeb Pushに対応していません');
  return navigator.serviceWorker.ready;
}
async function n79GetToken(askPermission=true){
  if(!('Notification' in window))throw new Error('この端末は通知に対応していません');
  if(Notification.permission==='denied')throw new Error('通知が端末側でブロックされています');
  if(askPermission&&Notification.permission!=='granted'){
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('通知が許可されませんでした');
  }
  if(Notification.permission!=='granted')throw new Error('通知を許可してください');
  n79SetStatus('Firebaseに接続しています…');
  const messaging=await n79Messaging();
  const registration=await n79MainWorker();
  try{
    const token=await messaging.getToken({vapidKey:NOTIFY079_VAPID,serviceWorkerRegistration:registration});
    if(!token)throw new Error('端末IDが返ってきませんでした');
    localStorage.setItem(NOTIFY079_TOKEN_KEY,token);
    return token;
  }catch(err){
    const code=err?.code?`${err.code}：`:'';
    throw new Error(`Firebase接続エラー：${code}${err?.message||String(err)}`);
  }
}
async function n79Enable(){
  const btn=$('notify078Enable');if(btn)btn.disabled=true;
  try{
    await n79GetToken(true);
    n79SetStatus('接続できました。この端末はPush通知を受け取れます。','good');
    if(btn)btn.textContent='通知を再接続する';
    if($('notify078Copy'))$('notify078Copy').disabled=false;
    if($('notify078Disable'))$('notify078Disable').disabled=false;
    if(typeof toast==='function')toast('Firebaseとの接続が完了しました');
  }catch(err){
    n79SetStatus(err?.message||'Firebaseに接続できませんでした','bad');
  }finally{if(btn)btn.disabled=false}
}
async function n79LocalTest(){
  try{
    if(Notification.permission!=='granted')throw new Error('通知を先に許可してください');
    const reg=await n79MainWorker();
    await reg.showNotification('Health Score',{body:'通知テストです。タップすると未入力項目を開きます。',icon:'./icon.svg?v=5',tag:'health-score-local-test',data:{route:'next',url:'./?notify=next'}});
  }catch(err){n79SetStatus(err?.message||'テスト通知を出せませんでした','bad')}
}
async function n79Copy(){
  try{
    let token=localStorage.getItem(NOTIFY079_TOKEN_KEY)||'';
    if(!token)token=await n79GetToken(false);
    await navigator.clipboard.writeText(token);
    if(typeof toast==='function')toast('端末IDをコピーしました');
  }catch(err){n79SetStatus(err?.message||'端末IDをコピーできませんでした','bad')}
}
async function n79Disable(){
  try{const messaging=await n79Messaging();await messaging.deleteToken().catch(()=>false)}catch{}
  localStorage.removeItem(NOTIFY079_TOKEN_KEY);
  n79SetStatus('この端末へのPush通知を停止しました');
  n79Refresh();
}
function n79EnsureCard(){
  const settings=$('settings');if(!settings)return;
  let card=$('notify078Card');
  if(!card){
    const advanced=settings.querySelector('.settings-advanced'),p=n79Prefs();card=document.createElement('div');
    card.className='card notify078-card';card.id='notify078Card';
    card.innerHTML=`<div class="title">プッシュ通知</div><div class="help">朝・夕方・夜にHealth Scoreからリマインドを受け取るための設定です。</div><div class="notify078-status" id="notify078Status">確認中…</div><div class="notify078-actions"><button class="btn2" type="button" id="notify078Enable">通知を有効にする</button><button class="btn2" type="button" id="notify078Test">この端末でテスト</button><button class="btn2" type="button" id="notify078Copy">テスト用の端末IDをコピー</button><button class="btn2 notify078-danger" type="button" id="notify078Disable">この端末の通知を停止</button></div><div class="notify078-schedule"><label class="notify078-row"><span><input type="checkbox" id="notify078Morning" ${p.morning?'checked':''}> 朝：体重を記録</span><input type="time" id="notify078MorningTime" value="${p.morningTime}"></label><label class="notify078-row"><span><input type="checkbox" id="notify078Evening" ${p.evening?'checked':''}> 夕方：買い食い対策</span><input type="time" id="notify078EveningTime" value="${p.eveningTime}"></label><label class="notify078-row"><span><input type="checkbox" id="notify078Night" ${p.night?'checked':''}> 夜：今日の記録を完成</span><input type="time" id="notify078NightTime" value="${p.nightTime}"></label></div><div class="help notify078-note">通知をタップすると、朝は体重、夕方は買い食い、夜は最初の未入力項目を直接開きます。</div>`;
    settings.insertBefore(card,advanced||null);
  }
  $('notify078Enable').onclick=n79Enable;$('notify078Test').onclick=n79LocalTest;$('notify078Copy').onclick=n79Copy;$('notify078Disable').onclick=n79Disable;
  ['notify078Morning','notify078MorningTime','notify078Evening','notify078EveningTime','notify078Night','notify078NightTime'].forEach(id=>{const el=$(id);if(el&&!el.dataset.n79){el.dataset.n79='1';el.addEventListener('change',n79SavePrefs)}});
}
function n79Refresh(){
  if(!$('notify078Status'))return;
  const token=localStorage.getItem(NOTIFY079_TOKEN_KEY);
  if(token){n79SetStatus('この端末はHealth ScoreのPush通知に接続済みです。','good');$('notify078Enable').textContent='通知を再接続する';$('notify078Copy').disabled=false;$('notify078Disable').disabled=false}
  else if(Notification.permission==='granted'){n79SetStatus('通知は許可済みです。「通知を有効にする」を押してFirebaseに接続してください。','warn');$('notify078Copy').disabled=true;$('notify078Disable').disabled=true}
  else if(Notification.permission==='denied'){n79SetStatus('通知が端末側でブロックされています。','bad')}
  else n79SetStatus('まだ通知を有効にしていません。');
  if($('version'))$('version').textContent=`Health Score v${NOTIFY079_VERSION}`;
}
function n79Init(){n79EnsureCard();n79Refresh();if($('version'))$('version').textContent=`Health Score v${NOTIFY079_VERSION}`}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',n79Init);else n79Init();
