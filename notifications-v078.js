'use strict';

const NOTIFY078_VERSION='0.6.18';
const NOTIFY078_PREFS_KEY='health-score-notify-prefs-v1';
const NOTIFY078_TOKEN_KEY='health-score-fcm-token-v1';
const FIREBASE_CONFIG_078={
  apiKey:'AIzaSyA3uifV7dLgfiXMQXqnDNiXPGyvq9JHQbQM',
  authDomain:'health-score-b637d.firebaseapp.com',
  projectId:'health-score-b637d',
  messagingSenderId:'316048816487',
  appId:'1:316048816487:web:7ecc1f1521fb80b4fd97c2'
};
const FCM_VAPID_KEY_078='BAU0BOJ4T-duTVTrAPStHtYY_Eva_ZM6EteNQyu3OGij80uR1XH6f5CalCukbF0oTFsDSnYJKXoo1U5i28w_044';
const NOTIFY078_DEFAULTS={morning:true,morningTime:'07:00',evening:true,eveningTime:'17:30',night:true,nightTime:'21:00'};
const FIREBASE_APP_URL_078='https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js';
const FIREBASE_MSG_URL_078='https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js';
let n78FirebasePromise=null;

function n78Prefs(){
  try{return{...NOTIFY078_DEFAULTS,...JSON.parse(localStorage.getItem(NOTIFY078_PREFS_KEY)||'{}')}}catch{return{...NOTIFY078_DEFAULTS}}
}
function n78SavePrefs(){
  const p={
    morning:!!$('notify078Morning')?.checked,
    morningTime:$('notify078MorningTime')?.value||'07:00',
    evening:!!$('notify078Evening')?.checked,
    eveningTime:$('notify078EveningTime')?.value||'17:30',
    night:!!$('notify078Night')?.checked,
    nightTime:$('notify078NightTime')?.value||'21:00'
  };
  localStorage.setItem(NOTIFY078_PREFS_KEY,JSON.stringify(p));
}
function n78BrowserSupported(){return 'serviceWorker' in navigator&&'Notification' in window}
function n78SetStatus(text,kind=''){
  const el=$('notify078Status');if(!el)return;
  el.textContent=text;el.className=`notify078-status ${kind}`.trim();
}
function n78LoadScript(src,key){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[data-${key}]`);
    if(existing){
      if(existing.dataset.loaded==='1'){resolve();return}
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Firebaseの読み込みに失敗しました')),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;s.async=true;s.dataset[key]='1';
    s.onload=()=>{s.dataset.loaded='1';resolve()};
    s.onerror=()=>reject(new Error('Firebaseの読み込みに失敗しました'));
    document.head.appendChild(s);
  });
}
async function n78EnsureFirebase(){
  if(typeof firebase!=='undefined'&&firebase.initializeApp&&firebase.messaging)return firebase;
  if(!n78FirebasePromise)n78FirebasePromise=(async()=>{
    await n78LoadScript(FIREBASE_APP_URL_078,'firebaseApp078');
    await n78LoadScript(FIREBASE_MSG_URL_078,'firebaseMsg078');
    if(typeof firebase==='undefined'||!firebase.initializeApp||!firebase.messaging)throw new Error('Firebaseの通知機能を読み込めませんでした');
    return firebase;
  })().catch(err=>{n78FirebasePromise=null;throw err});
  return n78FirebasePromise;
}
async function n78FirebaseMessaging(){
  await n78EnsureFirebase();
  if(!firebase.apps?.length)firebase.initializeApp(FIREBASE_CONFIG_078);
  return firebase.messaging();
}
async function n78WorkerRegistration(){
  if(!('serviceWorker' in navigator))throw new Error('このブラウザーは通知に対応していません');
  return navigator.serviceWorker.register('./firebase-messaging-sw.js?v=019',{scope:'./firebase-cloud-messaging-push-scope/'});
}
async function n78GetToken(askPermission){
  if(!n78BrowserSupported())throw new Error('この端末ではWeb Pushを利用できません');
  if(Notification.permission==='denied')throw new Error('通知が端末側でブロックされています');
  if(askPermission&&Notification.permission!=='granted'){
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('通知が許可されませんでした');
  }
  if(Notification.permission!=='granted')return null;
  await n78EnsureFirebase();
  const registration=await n78WorkerRegistration();
  const messaging=await n78FirebaseMessaging();
  let token;
  try{
    token=await messaging.getToken({vapidKey:FCM_VAPID_KEY_078,serviceWorkerRegistration:registration});
  }catch(err){
    const detail=err?.code?`${err.code}: ${err.message||''}`:(err?.message||String(err));
    throw new Error(`Firebase接続エラー：${detail}`);
  }
  if(!token)throw new Error('通知用の端末IDを取得できませんでした');
  localStorage.setItem(NOTIFY078_TOKEN_KEY,token);
  return token;
}
async function n78Refresh(){
  if(!$('notify078Status'))return;
  if(!n78BrowserSupported()){
    n78SetStatus('この端末ではWeb Pushを利用できません','bad');
    $('notify078Enable').disabled=true;$('notify078Copy').disabled=true;$('notify078Disable').disabled=true;return;
  }
  if(Notification.permission==='denied'){
    n78SetStatus('通知が端末側でブロックされています。ブラウザーのサイト設定で許可してください。','bad');
    $('notify078Enable').disabled=true;$('notify078Copy').disabled=true;$('notify078Disable').disabled=true;return;
  }
  const token=localStorage.getItem(NOTIFY078_TOKEN_KEY);
  if(token){
    n78SetStatus('この端末はHealth Scoreの通知を受け取れる状態です。','good');
    $('notify078Enable').textContent='通知を再接続する';$('notify078Copy').disabled=false;$('notify078Disable').disabled=false;
  }else if(Notification.permission==='granted'){
    n78SetStatus('通知は許可済みです。接続を完了してください。','warn');
    $('notify078Copy').disabled=true;$('notify078Disable').disabled=true;
  }else{
    n78SetStatus('まだ通知を有効にしていません。');
    $('notify078Copy').disabled=true;$('notify078Disable').disabled=true;
  }
  if($('version'))$('version').textContent=`Health Score v${NOTIFY078_VERSION}`;
}
async function n78Enable(){
  try{
    n78SetStatus('Firebaseに接続しています…');
    const token=await n78GetToken(true);
    if(token){
      n78SetStatus('接続できました。この端末はPush通知を受け取れます。','good');
      $('notify078Enable').textContent='通知を再接続する';$('notify078Copy').disabled=false;$('notify078Disable').disabled=false;
      if(typeof toast==='function')toast('通知を有効にしました');
    }
  }catch(err){
    n78SetStatus(err?.message||'通知を有効にできませんでした','bad');
    if(typeof toast==='function')toast('Firebaseへの接続を確認してください');
  }
}
async function n78LocalTest(){
  try{
    if(Notification.permission!=='granted')throw new Error('先に通知を有効にしてください');
    const reg=await n78WorkerRegistration();
    await reg.showNotification('Health Score',{body:'通知テストです。',icon:'./icon.svg?v=5',tag:'health-score-local-test'});
  }catch(err){if(typeof toast==='function')toast(err?.message||'テスト通知を出せませんでした')}
}
async function n78CopyText(text){
  if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
  const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
}
async function n78Copy(){
  try{
    let token=localStorage.getItem(NOTIFY078_TOKEN_KEY)||'';
    if(!token)token=await n78GetToken(false)||'';
    if(!token)throw new Error('先に通知を有効にしてください');
    await n78CopyText(token);
    if(typeof toast==='function')toast('テスト用の端末IDをコピーしました');
  }catch(err){n78SetStatus(err?.message||'端末IDをコピーできませんでした','bad')}
}
async function n78Disable(){
  try{const messaging=await n78FirebaseMessaging();await messaging.deleteToken().catch(()=>false)}catch{}
  localStorage.removeItem(NOTIFY078_TOKEN_KEY);
  n78SetStatus('この端末へのHealth Score通知を停止しました');
  await n78Refresh();
}
function n78EnsureCard(){
  const settings=$('settings');if(!settings||$('notify078Card'))return;
  const advanced=settings.querySelector('.settings-advanced'),prefs=n78Prefs(),card=document.createElement('div');
  card.className='card notify078-card';card.id='notify078Card';
  card.innerHTML=`<div class="title">プッシュ通知</div>
    <div class="help">朝・夕方・夜にHealth Scoreからリマインドを受け取るための設定です。</div>
    <div class="notify078-status" id="notify078Status">確認中…</div>
    <div class="notify078-actions"><button class="btn2" type="button" id="notify078Enable">通知を有効にする</button><button class="btn2" type="button" id="notify078Test">この端末でテスト</button><button class="btn2" type="button" id="notify078Copy">テスト用の端末IDをコピー</button><button class="btn2 notify078-danger" type="button" id="notify078Disable">この端末の通知を停止</button></div>
    <div class="notify078-schedule">
      <label class="notify078-row"><span><input type="checkbox" id="notify078Morning" ${prefs.morning?'checked':''}> 朝：体重を記録</span><input type="time" id="notify078MorningTime" value="${prefs.morningTime}"></label>
      <label class="notify078-row"><span><input type="checkbox" id="notify078Evening" ${prefs.evening?'checked':''}> 夕方：買い食い対策</span><input type="time" id="notify078EveningTime" value="${prefs.eveningTime}"></label>
      <label class="notify078-row"><span><input type="checkbox" id="notify078Night" ${prefs.night?'checked':''}> 夜：今日の記録を完成</span><input type="time" id="notify078NightTime" value="${prefs.nightTime}"></label>
    </div>
    <div class="help notify078-note">時刻はこの端末に保存されます。自動配信との接続は、テスト通知が届くことを確認した次のステップで行います。</div>`;
  settings.insertBefore(card,advanced||null);
  $('notify078Enable').onclick=n78Enable;$('notify078Test').onclick=n78LocalTest;$('notify078Copy').onclick=n78Copy;$('notify078Disable').onclick=n78Disable;
  ['notify078Morning','notify078MorningTime','notify078Evening','notify078EveningTime','notify078Night','notify078NightTime'].forEach(id=>$(id)?.addEventListener('change',n78SavePrefs));
  n78Refresh();
}
async function n78Foreground(){
  try{
    const messaging=await n78FirebaseMessaging();
    messaging.onMessage(payload=>{
      const title=payload?.notification?.title||'Health Score',body=payload?.notification?.body||payload?.data?.body||'通知を受信しました';
      if(typeof toast==='function')toast(`${title}：${body}`);
    });
  }catch(err){console.warn('FCM foreground listener unavailable',err)}
}
function n78Init(){
  n78EnsureCard();n78Foreground();
  if(Notification?.permission==='granted')n78GetToken(false).then(()=>n78Refresh()).catch(()=>n78Refresh());
  if($('version'))$('version').textContent=`Health Score v${NOTIFY078_VERSION}`;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',n78Init);else n78Init();
