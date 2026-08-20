import { createSign } from 'node:crypto';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const fcmToken = process.env.HEALTH_SCORE_FCM_TOKEN;
const slot = process.argv[2] || 'test';

if (!serviceAccountRaw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
if (!fcmToken) throw new Error('HEALTH_SCORE_FCM_TOKEN is not set.');

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountRaw);
} catch {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
}

const { client_email: clientEmail, private_key: privateKey, project_id: projectId } = serviceAccount;
if (!clientEmail || !privateKey || !projectId) {
  throw new Error('Firebase service account JSON is missing client_email, private_key, or project_id.');
}

const templates = {
  morning: {
    title: 'Health Score',
    body: 'おはよう。今朝の体重を記録しよう。',
    tag: 'health-score-morning',
    route: 'weight'
  },
  evening: {
    title: 'Health Score',
    body: '帰宅前チェック。買い食いせず、予定どおりいこう。',
    tag: 'health-score-evening',
    route: 'buying'
  },
  night: {
    title: 'Health Score',
    body: '今日の記録を完成させよう。',
    tag: 'health-score-night',
    route: 'next'
  },
  test: {
    title: 'Health Score',
    body: 'FirebaseからのPush通知テストです。',
    tag: 'health-score-remote-test',
    route: 'next'
  }
};

const message = templates[slot];
if (!message) throw new Error(`Unknown notification slot: ${slot}`);

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Google OAuth failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function sendPush() {
  const accessToken = await getAccessToken();
  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`;
  const url = `https://ymgc-muscle.github.io/health-score/?notify=${encodeURIComponent(message.route)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        data: {
          title: message.title,
          body: message.body,
          tag: message.tag,
          route: message.route,
          url
        },
        webpush: {
          headers: { Urgency: slot === 'test' ? 'high' : 'normal' }
        }
      }
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`FCM send failed (${response.status}): ${text}`);
  }
  console.log(`Health Score push sent successfully: ${slot} -> ${message.route}`);
  console.log(text);
}

await sendPush();
