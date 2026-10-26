# チーム版の運用・移行・復旧

現行team版は専用PostgreSQLと不変blobを使います。SQLiteの選択肢・reader・変換CLIはありません。
Linux containerの単一appプロセスを対象とし、local版のファイル保存・Windows利用は維持します。
実装と合成データの結果は[PostgreSQL検証記録](p2-postgresql-verification.md)、契約は
[置換設計](superpowers/specs/2026-10-27-p2-postgresql-design.md)を参照してください。
実Google設定、実データ移行の実施、デプロイは別の運用作業です。

## 設定とHTTPS

`docker-compose.team.yml`はteamモードと`/data`を固定します。次は非公開の環境から渡します。

| 変数 | 内容 |
| --- | --- |
| `SEMANTIC_STUDIO_PUBLIC_ORIGIN` | 正確なHTTPS Origin。パス・末尾スラッシュなし |
| `SEMANTIC_STUDIO_GOOGLE_CLIENT_ID` | Google Webアプリ用OAuthクライアントID |
| `SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET` | サーバー専用のクライアント秘密 |
| `SEMANTIC_STUDIO_ALLOWED_DOMAINS` | 許可Workspaceドメインのカンマ区切り一覧 |
| `SEMANTIC_STUDIO_BOOTSTRAP_SUBS` | 初期管理者の検証済みGoogle sub一覧 |
| `TEAM_DB_SUBNET` / `TEAM_DB_GATEWAY` | 重複しないRFC1918 IPv4 subnetと所属gateway。IPAM/HBA/接続検査の共通入力 |
| `TEAM_DB_{ADMIN,APP,MAINTENANCE,BACKUP}_SECRET_FILE` | 4つの異なるDB passwordファイルのhost側パス |
| `TEAM_APP_PORT` | appのloopback公開port。既定8000 |

`.env.example`は例示です。実値を入れた`.env`、secrets、DB/blob/backupをGit・画像・会話・配布物へ
含めません。Google設定はappだけに渡し、保守jobは要求しません。最初のログインだけでは
管理者になりません。subをメールアドレスから推測しないでください。

Google CloudでWebアプリ用OAuthクライアントと同意画面を設定し、redirect URIを
`<PUBLIC_ORIGIN>/api/auth/callback`へ正確に登録します。scopeはopenidとemailです。
TLS終端proxyは運用側で用意し、正しいHostを保ってloopbackのapp HTTPへ転送します。
任意の転送headerを認証根拠にせず、8000番を外部へ直接公開しません。
proxy・監視もcallback query、Cookie、Authorization、POST本文を記録しない設定にします。
appのaccess log、DBのstatement/parameter logは無効です。

### DB secretの準備

Linuxで運用専用乱数を生成する例です。既存fileは上書きしません。値を引数や端末へ出さず、
UTF-8の1行（末尾LF可）、空/制御文字なし、各file 16 KiB以内にします。
4 roleのpasswordが同じ場合は、role初期化SQLの前に拒否します。

```sh
python3 - <<'PY'
from pathlib import Path
import os, secrets
root = Path('secrets')
root.mkdir(mode=0o700, exist_ok=True)
os.chmod(root, 0o700)
for role in ('admin', 'app', 'maintenance', 'backup'):
    target = root / ('team-' + role)
    with target.open('x') as output:
        output.write(secrets.token_urlsafe(48) + '\n')
    target.chmod(0o444)
PY
```

file-backed Compose secretsはhost側の所有権/modeを引き継ぎます。Composeのuid/mode指定だけに
依存せず、privateな親directoryと、実container UIDが個々のmountを読める権限を確認します。
上の0444は親0700と個別bind mountを前提にします。secretを共有directoryへ置かないでください。
password変更はDB内のroleにも反映する別作業で、file差替えだけではDB passwordは変わりません。

### 新規起動と停止

```sh
docker compose -f docker-compose.team.yml up --build -d
docker compose -f docker-compose.team.yml down
```

`db-config → db healthy → db-migrate成功 → app`の順です。初期化中の一時Unix serverをhealthyと
取り違えず、main PostgreSQLプロセスとUnix socketのreadyを確認します。認証/schemaの正しさは
保守jobとappが別に検査します。appはDDLを実行せず、不正schema/secret/接続で閉じて失敗します。

DBは`db_internal`だけ、appは`app_net`にも参加します。DBの5432は公開しません。
jobもinternal networkから`db:5432`へ接続し、port forward・host alias・SSH tunnelは設けません。
DB TLSは使わず同一hostのprivate bridgeを信頼境界とします。複数host運用は対象外です。
HBAはgateway由来・別network・別DB/role・superuser TCPを拒否します。session拒否と
TCP SYNの到達不能は区別します。host root/Docker管理者はこの隔離の防御対象外です。

PostgreSQL 18のvolumeは`/var/lib/postgresql`へmountします。DB、blob、backupは別volumeです。
通常停止の`down`はvolumeを残します。`down -v`を停止・再起動手順に使いません。
旧版volumeやPostgreSQLの別majorのdata directoryを自動で使い回さないでください。

同じDBは一つのappだけがleaseを保持します。唯一のwriter接続が失われると新規data要求は503、
runtimeは終了し、Composeが新processを起動してDNSを再解決します。裏で自動再接続しません。
DB connect/DNS/mutex/lockは各5秒、通常statementは30秒が上限です。公開healthはDB待ちを行いません。
COMMIT応答喪失は結果不明とし、架空の成功を返しません。画面は自動再送しません。

### 初期管理者のsub

信頼できるGoogle管理手順で本人のsubを確認します。このappで確認する場合は、別の空DB/blobを
持つ事前確認環境を作り、bootstrapに未登録の十分長い乱数識別子を一時指定します。
本人がGoogleでログインした後、本人の認証済み`/api/auth/status`の`user.sub`を非公開で確認します。
これは署名・aud・iss・Workspace・nonce等を検証した結果です。未検証tokenのdecode値は使いません。

事前確認環境を停止し、確認したsubを**別の新しい本番環境**の非公開設定に指定します。
事前確認DBのusers/sessionsはコピーしません。既存userはbootstrap変更で再昇格しないため、
既存環境の権限変更には現在の管理者によるメンバー操作を使います。

sessionは絶対60分・無操作30分、login試行は5分です。app内の停止/降格は次の要求と確定直前に
反映します。Workspace側の停止を即時検知する保証はなく、既存sessionが最長60分残り得ます。
offlineやGoogle鍵取得失敗で認証を省略しません。

## localファイルからの明示移行

元local版を停止し、元領域を別途保持します。`TEAM_LOCAL_SOURCE_DIR`を指定すると、そのpathを
`migrate` jobへ`/source:ro`としてmountします。移行先は新projectの空DB・新blob volumeだけです。
DB/schemaを先に初期化し、移行完了までappを起動しません。

```sh
docker compose -f docker-compose.team.yml up --build -d --wait db
docker compose -f docker-compose.team.yml run --rm --no-deps db-migrate
docker compose -f docker-compose.team.yml --profile maintenance run --rm --no-deps migrate
docker compose -f docker-compose.team.yml --profile maintenance run --rm --no-deps migrate \
  python -m app.team.manage migrate --source /source --destination /data
docker compose -f docker-compose.team.yml up -d semantic-studio-team
```

最初の`migrate`は既定でdry-runです。件数・型付きRDF・namespace・file hashを確認し、次の明示
commandで確定します。元領域は変更せず、未知の通常fileも不変blobで保持します。
NUL識別子、drive/代替stream形式、symlink/特殊file、既存旧DB領域は拒否します。
localに存在しない過去の利用者・監査・版・再送・Undo履歴を作らず、`migration`と記録します。

`inspect-local`とdry-run自体はDB/Google設定不要です。source checkoutの薄い入口も使えます。

```sh
python scripts/team_workspace.py inspect-local /private/local-library
python scripts/team_workspace.py migrate --source /private/local-library --destination /private/new-team --dry-run
```

実移行/backup/restoreはLinux containerの`python -m app.team.manage`を本体として使います。
`.sqlite`/`.sqlite3`/`.db`等の旧DBは、開かず自動変換・上書き・削除もしません。
旧DB実データが必要な場合は既存領域を保持し、別の移行要件として判断します。

## 稼働中backupと別環境へのrestore

```sh
docker compose -f docker-compose.team.yml --profile maintenance run --rm --no-deps backup
```

既定出力は専用backup volumeの`/backups/generation`です。既存世代は上書きしません。
別世代を作る場合はcommandを明示します。

```sh
docker compose -f docker-compose.team.yml --profile maintenance run --rm --no-deps backup \
  python -m app.team.manage backup --blob-root /data/blobs --destination /backups/generation-20261027
```

backup roleはSELECTだけを持ち、一つのREPEATABLE READ READ ONLY snapshotから8業務tableをstreamします。
現在とaudit履歴のblobをhash確認してコピーし、完成後だけrenameで公開します。backup中のblob GCは禁止です。
archiveはschema version/fingerprint、NDJSON、hash/件数とblobを含み、schema SQL・DB password・環境設定を含みません。
users、session hash、未完了loginのnonce/verifier、内部原本も含むため、archiveは非公開でアクセス制限します。
DB単独dumpや稼働中data directoryの単純コピーを、このblob込み復旧世代の代替にはしません。

restoreは**別Compose projectの空DB・空blob volume、app停止中**だけへ実施します。
新しい4 roleのsecret・重複しないCIDR・app port・Google/HTTPS設定を別途用意します。
元環境のDB/blob volumeを復元先へmountせず、世代archiveだけをread-onlyで渡します。
非公開のoverride fileでbackup volumeを指定する例です。

```yaml
volumes:
  team_backups:
    external: true
    name: ${TEAM_RESTORE_ARCHIVE_VOLUME:?required}
```

`TEAM_RESTORE_ARCHIVE_VOLUME`は元projectのbackup volume名です。これはarchiveの受渡しであり、
DB networkの外部共有ではありません。次は新projectだけの操作です。

```sh
docker compose --project-name team-recovery --env-file /private/recovery.env \
  -f docker-compose.team.yml -f /private/restore-volume.yml up --build -d --wait db
docker compose --project-name team-recovery --env-file /private/recovery.env \
  -f docker-compose.team.yml -f /private/restore-volume.yml run --rm --no-deps db-migrate
docker compose --project-name team-recovery --env-file /private/recovery.env \
  -f docker-compose.team.yml -f /private/restore-volume.yml --profile maintenance run --rm --no-deps restore
docker compose --project-name team-recovery --env-file /private/recovery.env \
  -f docker-compose.team.yml -f /private/restore-volume.yml up -d semantic-studio-team
```

復元は資源・墓標版・全audit・確定要求・users/rolesを保持し、identity次値も設定します。
sessions/login_attemptsも型・FK/unique/CHECKを検証しますが、同じ未公開transaction内で削除してcommitします。
復元先は再ログインが必要です。元appのsessionや元DB/blobは変更しません。
既定名以外の世代では、restoreの`--archive`を対応する`/backups/<世代>`へ明示してください。

移行/restoreはblob先行確定とDB原子commitの間を`.team-import-incomplete`で保護します。
途中失敗やCOMMIT応答不明ではmarkerを残して起動拒否し、自動resume/上書き/削除をしません。
markerを手動削除して利用開始せず、失敗先と元archiveを保持して調査し、別の新しい行先でやり直します。
復元後は再ログイン・role・件数・原文・namespace・監査・Undo/Redoを確認してから切り替えます。
保存日数、取得間隔、外部保管先の保護は運用側で定めます。
