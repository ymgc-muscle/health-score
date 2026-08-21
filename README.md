# Health Score

日々の体重・食事・運動を記録し、100点満点のスコアで健康行動を振り返るための個人用PWAです。

**Current version: v0.6.23**

## 主な機能

- 1日の健康行動を100点満点でスコア化
- 体重、朝食、昼食、帰宅時の買い食い、夕食、たんぱく質、歩数、HIIT / 運動を記録
- 摂取カロリー・たんぱく質実績の記録
- 体重推移グラフ
- カレンダーと週間サマリー
- JSONバックアップ / 復元
- PWAとしてホーム画面から起動
- Firebase Cloud MessagingによるPush通知
- 毎日 7:00 / 17:30 / 21:00 のリマインド
- 通知タップで関連する入力欄へ直接移動
  - 朝 → 体重
  - 夕方 → 買い食い
  - 夜 → その日の最初の未入力項目

## アプリ

https://ymgc-muscle.github.io/health-score/

## データについて

健康記録データはブラウザの `localStorage` に保存されます。
記録内容そのものをGitHubやFirebaseへ送信する仕組みはありません。

Push通知にはFirebase Cloud MessagingとGitHub Actionsを利用しています。

## 更新履歴

バージョンごとの主な変更は [CHANGELOG.md](CHANGELOG.md) を参照してください。

## Push通知の設定

Push通知のセットアップに関するメモは [PUSH_SETUP.md](PUSH_SETUP.md) にあります。
