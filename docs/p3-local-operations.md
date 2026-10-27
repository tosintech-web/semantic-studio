# P3 ローカルDockerの配布・参照手順

編集側は既存の[P2 team構成](p2-team-operations.md)を使います。
以下は独立した配布用Composeプロジェクトです。編集用DB・private volume・Google secretを配布側へ渡しません。
外部向けサーバー、DNS、本番TLS、クラウド契約は不要です。初回のimage取得・buildにはネットワークが必要です。
実データの一般公開はこの手順の承認範囲ではありません。

## パッケージを取り込む

管理者が編集画面から承認済みパッケージをダウンロードし、ローカルの非公開ディレクトリへ保存します。
次のPATH・ファイル名・UUIDは自分のものへ置き換えます。出力物をGitへ追加しないでください。

```sh
export COMPOSE_PROJECT_NAME=ss-p3-public
export RELEASE_INPUT_DIR=/absolute/path/to/private/release-input
export RELEASE_ID=12345678-1234-4234-8234-123456789012
# 空きportが必要。既定は127.0.0.1:8080 / 8081だけを公開。
export RELEASE_PORT=8080
export RELEASE_CONSUMER_PORT=8081

docker compose -f docker-compose.releases.yml build release-distribution
docker compose -f docker-compose.releases.yml run --rm release-import import-package --package /input/release.zip
docker compose -f docker-compose.releases.yml run --rm release-import activate --release-id "$RELEASE_ID"
docker compose -f docker-compose.releases.yml up -d --no-build release-distribution release-consumer
```

配布のcurrentは `http://127.0.0.1:8080/current.json`、利用サンプルは `http://127.0.0.1:8081/`。
manifestと各ファイルは `/releases/版UUID/manifest.json` 等から取得できます。
importだけではcurrentは変わりません。未承認preview、改変・破損・異常サイズ・不正entryのZIPは拒否します。
サポートするZIP圧縮方式は、製品が生成するDEFLATEと無圧縮です。
manifestのapproved印は電子署名ではありません。import CLIへファイルを渡せるローカル運用者を信頼境界とします。

## 新版・切り戻し

新版も別UUIDの不変版としてimportし、activateでcurrentを切り替えます。
切り戻しは旧UUIDをactivateしてください。編集アプリ・DBが停止していても配布側だけで実行できます。

```sh
docker compose -f docker-compose.releases.yml run --rm release-import status
docker compose -f docker-compose.releases.yml run --rm release-import activate --release-id "$RELEASE_ID"
```

利用サンプルは起動時の `RELEASE_ID` に固定されます。
別の版を試すには `RELEASE_ID` を明示変更し、consumerを作り直します。

```sh
docker compose -f docker-compose.releases.yml up -d --no-build --force-recreate release-consumer
```

各ファイルと版IDを検証した一版だけを採用し、取得失敗では以前の版を保持します。
初回取得に失敗した場合は503になります。`POST /api/refresh`で同じ指定版の取得を再試行できます。
総取得時間は15秒、同時取得workerは最大1です。timeout後の未完了workerが残っている間は新しい取得を拒否します。
長く復旧しない場合はconsumerを再作成します。遅れて完了した取得結果を勝手に採用しません。

## 保管・障害・停止

`release_public` volumeに不変版とcurrent、privateな `receipts.jsonl` を保持します。
通常の `docker compose -f docker-compose.releases.yml down` はvolumeを残します。通常運用に `down -v` を使いません。
配布HTTPはread-only mount、書込みはnetworkなしのrelease-importだけです。DB networkには入りません。内部参照はrelease_internal専用alias release-filesを使います。
localhostのport公開には別のrelease_host bridgeを使います。外向き経路はありますが、consumerに任意URL入力・redirect・proxyを許可しません。

容量不足、hash不一致、検証失敗では旧版を使い続けます。activate時はreceiptのpreparedを先に保存してからcurrentをatomic replaceします。
切り替え直後にreceipt追記などが失敗すると結果は不確定です。成功を推測せず、`status` のreleaseId/manifestSha256とreceiptを照合してください。
破損を自動修復したり既存の同じ版IDを上書きしたりしません。復旧時は正常な版とvolumeを別途保全します。
編集DB側の承認・監査・再送・package blobはP2の世代backup/restoreにも含まれます。
配布volumeは独立しています。必要な版・current・receiptを保管し、ファイルを公開Web rootへ丸ごと移さないでください。

## 開発受け入れ

```sh
node .claude/skills/run-semantic-viewer/driver.mjs p3
```

P2の合成Google署名・HTTPS・実DB・3権限の確認を引き継ぎ、P3 UI承認、download/import、版固定、
切り戻し、編集app/DB停止後の新規consumerからの参照を行います。実Google設定や実データを使いません。
同時に別のP2/P3 browser受け入れを走らせると専用試験subnetが競合するため、順次実行します。
本番配備・外部サービス認証・汎用検索API・WordNet全件は別工程です。
