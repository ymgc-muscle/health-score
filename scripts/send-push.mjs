import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const webpush=require('web-push');

const PUBLIC_KEY='BIJ3c77ebWnXpENqyTWlFlcJ8q1jAv5VW36MNAiUMX8AnwkEoQIxZnr_xe9qjogx7lRdDioHmWOUtRh0ohde-yg';
const privateKey=process.env.VAPID_PRIVATE_KEY;
const subscriptionRaw=process.env.PUSH_SUBSCRIPTION;
const kind=process.env.REMINDER_KIND||'test';

if(!privateKey)throw new Error('Missing GitHub secret: VAPID_PRIVATE_KEY');
if(!subscriptionRaw)throw new Error('Missing GitHub secret: PUSH_SUBSCRIPTION');

let subscription;
try{subscription=JSON.parse(subscriptionRaw)}catch{throw new Error('PUSH_SUBSCRIPTION is not valid JSON');}

const messages={
  morning:{title:'Health Score',body:'おはよう。今朝の体重を記録しよう。',tag:'health-score-morning'},
  evening:{title:'帰宅前チェック',body:'買い食いする前に、今日の空腹具合を確認。必要なら計画的に補食しよう。',tag:'health-score-evening'},
  night:{title:'今日のHealth Score',body:'今日の記録を完成させよう。',tag:'health-score-night'},
  test:{title:'Health Score',body:'Push通知の送信テストです。',tag:'health-score-test-remote'}
};
const message=messages[kind]||messages.test;

webpush.setVapidDetails('https://ymgc-muscle.github.io',PUBLIC_KEY,privateKey);
await webpush.sendNotification(
  subscription,
  JSON.stringify({...message,url:'./'}),
  {TTL:3600,urgency:'normal'}
);
console.log(`Sent ${kind} push notification.`);
