# チーム版の運用・移行・復旧

> 2026-10-27：この手順は現在のSQLite版実装向けです。
> [PostgreSQL置換設計](superpowers/specs/2026-10-27-p2-postgresql-design.md)を追加しましたが、
> 新Compose・DB移行・復旧手順はまだ実装されていません。下記コマンドをPostgreSQL版の手順として使わないでください。

チーム版は単一プロセスとSQLite、ローカル永続ディスクを使います。ネットワーク共有
ディスク、複数worker、複数レプリカには対応しません。既存ローカル領域は自動移行しません。
本番Googleログインと配備環境の確認が終わるまで、本番利用可能とは扱わないでください。

## 設定とHTTPS

`SEMANTIC_STUDIO_MODE=team` と次のサーバー環境変数を明示します。

| 変数 | 内容 |
| --- | --- |
| `SEMANTIC_STUDIO_PUBLIC_ORIGIN` | HTTPSの正確なOrigin。パス・末尾スラッシュなし |
| `SEMANTIC_STUDIO_GOOGLE_CLIENT_ID` | GoogleのWebアプリ用OAuthクライアントID |
| `SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET` | サーバー専用のクライアント秘密 |
| `SEMANTIC_STUDIO_ALLOWED_DOMAINS` | 許可するWorkspaceドメインのカンマ区切り一覧 |
| `SEMANTIC_STUDIO_BOOTSTRAP_SUBS` | 初期管理者の検証済みGoogle subのカンマ区切り一覧 |
| `SEMANTIC_STUDIO_DATA_DIR` | 非公開のローカル永続領域 |

値は配備環境または秘密管理機構から渡します。実ドメイン、sub、秘密、セッション、
tokenはGit・フロントのビルド変数・会話・画像に入れません。`.env.example` は例示専用です。
最初のログインだけでは管理者になりません。Google側で検証済みの本人のsubを
非公開の運用手順で取得して指定します。メールアドレスからsubを推測しないでください。

Google CloudでWebアプリ用クライアントと同意画面を用意し、リダイレクトURIを
`<PUBLIC_ORIGIN>/api/auth/callback` に正確に登録します。要求スコープはopenidとemailです。
本番のGoogle設定作成・ホスティング契約・デプロイは、この実装には含みません。

### 初期管理者のsubを検証して取得する

既に信頼できるGoogle側の管理手順でsubを確認できる場合は、その値を使います。
このアプリで確認する場合は、次の事前確認を本番データと別の領域で行います。

1. HTTPS・OAuthを設定したサーバーで、一時的な空の事前確認用データ領域を指定します。
   bootstrap設定には、運用端末で生成した十分長い乱数に基づく未登録の値を一時指定し、
   実在する利用者を管理者にしない状態で起動します。
2. 管理者になる本人がGoogleでログインします。署名・aud・iss・期限・Workspace・nonce等を
   検証した後でのみ、`team_users` にsubとメールが保存されます。画面上は閲覧者のままです。
3. 一時サーバーを停止し、非共有の管理端末でその領域のSQLiteを読み取り専用で開き、
   `SELECT sub, email, domain FROM team_users;` で本人の検証済み行を確認します。
   未検証のtokenをdecodeした値やメールから推定した値は使いません。
4. 確認したsubを非公開の本番環境設定へ指定し、**別の新しい本番領域**を起動します。
   本人の初回ログインで管理者になることを確認します。一時DBのユーザー・セッションを
   本番へコピーしません。一時領域は非公開で管理します。

既存利用者のroleは、bootstrap設定を変えて再ログインしても再昇格しません。
既存本番環境の権限変更には、現在の管理者によるメンバー操作を使います。
事前確認のsub・メール・DB・token・画面をGitや共有ログへ記録しないでください。

`docker compose -f docker-compose.team.yml up --build -d` は単一アプリの例です。
TLS終端プロキシは運用側で用意し、許可Hostを保ってloopbackの8000番へ転送してください。
任意の転送ヘッダーを認証根拠にしません。外部から8000番へ直接到達させないでください。
データvolumeとバックアップはアクセス制限し、イメージのビルド対象へ入れません。

アプリのアクセスログは無効にします。プロキシ・ロードバランサー・監視でも
callbackのクエリ文字列、Cookie、Authorization、POST本文を記録しない設定にします。
エラーページやトレース採取でもコードとtokenを収集しないでください。

セッションは絶対60分・無操作30分、ログイン試行は5分です。ログアウト・アプリ内利用停止は
次の要求から反映します。Workspace側の停止の即時検知は保証せず、既存セッションが最長60分
残り得ます。offline・Googleの鍵取得失敗では認証を省略しません。

## 元データを保持した移行

ローカル版を停止し、元領域を別途バックアップしてから実施します。Pythonは
`backend/requirements-dev.txt` または本番依存を導入した環境を使います。

```sh
python scripts/team_workspace.py inspect-local /private/local-library
python scripts/team_workspace.py migrate /private/local-library --dry-run
python scripts/team_workspace.py migrate /private/local-library --destination /private/new-team
```

destinationはまだ存在しないパス、親は既存の非公開ディレクトリを指定します。
既存destinationには上書きしません。元のファイルを変更せず、未知の通常ファイルも
不変blobとして保持します。シンボリックリンク・特殊ファイル・既存team DBは拒否します。
Windowsでdrive・代替streamとして解釈されるコロン入りの名前も移行前に拒否します。
元のRDF・namespace・言語・未知述語・空白ノードを型付き形式でも保存します。
移行前の編集者は `migration`（画面では「移行前」）として記録し、個人の過去履歴を作りません。
未適用の個人入力は共有文書への適用とは扱いません。移行後に件数とRDFを確認してください。

## 稼働中バックアップと新領域への復旧

```sh
python scripts/team_workspace.py backup /private/live-team --destination /private/backup-generation
python scripts/team_workspace.py restore /private/backup-generation --destination /private/recovered-team
```

SQLiteのbackup APIで一つの整合した世代を取得し、その世代の現在データと履歴から
参照する不変blobをコピーします。稼働中のDBファイルだけを単純コピーしません。
監査・Undoにだけ必要な旧blobも残します。欠落・破損は失敗とし、架空の値で補いません。
復旧先の全セッション・未完了ログインを無効にします。元の稼働領域のセッションは変更しません。

復旧後に旧プロセスを停止し、環境設定のデータ領域を復旧先へ切り替え、1プロセスだけ起動して
再ログイン・ロール・件数・原文・監査を確認します。公開URLを変えた場合はOAuth設定も確認します。
元領域を消す前に復旧を検証してください。保存日数と取得間隔は運用側で定めます。
バックアップには内部原本・監査・ユーザー情報が含まれます。公開成果物として配布しません。
