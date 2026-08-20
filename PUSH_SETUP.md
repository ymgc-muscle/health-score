# Health Score Web Push setup

Health Score v0.6.18 uses the standard Web Push API with the existing GitHub Pages PWA and GitHub Actions.

## Notification schedule

- 07:00 Asia/Tokyo — morning weight reminder
- 17:30 Asia/Tokyo — before-going-home check
- 21:00 Asia/Tokyo — finish today's Health Score

GitHub Actions scheduled runs can be delayed under load, so these are reminder times rather than real-time guarantees.

## One-time device registration

1. Open the installed Health Score PWA on the Android device.
2. Open Settings > Push notifications.
3. Tap `通知を有効にする` and allow notifications.
4. Tap `テスト通知` to confirm that Android can display a notification.
5. Tap `端末登録情報をコピー`.

## GitHub repository secrets

Open the repository's Settings > Secrets and variables > Actions, and create these repository secrets:

- `PUSH_SUBSCRIPTION` — paste the JSON copied from the Health Score app.
- `VAPID_PRIVATE_KEY` — use the private key corresponding to the public key already embedded in the app. Keep this secret private and never commit it to the repository.

The VAPID public key in the app is:

`BIJ3c77ebWnXpENqyTWlFlcJ8q1jAv5VW36MNAiUMX8AnwkEoQIxZnr_xe9qjogx7lRdDioHmWOUtRh0ohde-yg`

## Test remote push

After both secrets exist:

1. Open GitHub Actions.
2. Select `Health Score push reminders`.
3. Run the workflow manually with `test`.
4. Put the PWA in the background and confirm the remote Push notification arrives.

## Security notes

- The Push subscription identifies the browser/device subscription and should be stored as a GitHub Secret.
- The VAPID private key can authorize Push sends and must remain a GitHub Secret.
- The VAPID public key is intentionally public and is safe to include in the web app.
