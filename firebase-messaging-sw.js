/* Health Score Firebase Cloud Messaging worker v0.6.20 */
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:'AIzaSyA3ufV7dLgfiXMQXqnDNiXPGyvq9JHQbQM',
  authDomain:'health-score-b637d.firebaseapp.com',
  projectId:'health-score-b637d',
  messagingSenderId:'316048816487',
  appId:'1:316048816487:web:7ecc1f1521fb80b4fd97c2'
});

const messaging=firebase.messaging();

messaging.onBackgroundMessage(payload=>{
  if(payload?.notification)return;
  const title=payload?.data?.title||'Health Score';
  const options={
    body:payload?.data?.body||'Health Scoreを確認しましょう。',
    icon:'./icon.svg?v=5',
    tag:payload?.data?.tag||'health-score-reminder',
    data:{url:payload?.data?.url||'./'}
  };
  self.registration.showNotification(title,options);
});
