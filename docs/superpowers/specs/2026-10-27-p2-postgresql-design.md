# P2 PostgreSQL置換・Compose内限定接続の設計

作成日：2026-10-27（日本時間）。状態：Task 1〜8の実装・対象検証済み。最終全体試験・独立レビュー・PR CIはTask 9で進行中。
ユーザー指定：SQLiteを廃止し、専用PostgreSQLをDocker Composeで起動する。同じDocker network内のアクセスだけで利用する。
対象ブランチ：`feat/p2-team-workspace`。調査起点：`dd0c63d`（SQLite版P2、PR #3）。

本書は[P2詳細設計](2026-10-25-p2-team-workspace-design.md)のDB選択・保存・起動・復旧・CI構成を置き換える。
認証、権限、日英UI、RDF、競合、監査、Undoの製品契約は引き継ぐ。
現行の製品コード・Composeは本設計のPostgreSQL構成へ置換済み。
旧SQLite版の記録は履歴として区別し、[実装検証記録](../../p2-postgresql-verification.md)で現在の証跡を管理する。
実装手順・試験・受け入れ順序は[PostgreSQL置換の実装計画](../plans/2026-10-27-p2-postgresql.md)で管理する。

## 1. 目的・範囲

- team版の正本をPostgreSQLに一本化する。SQLiteとの選択式、接続失敗時のSQLite/localフォールバックは作らない。
- SQLite reader/exporter/importer、互換adapter、SQLiteを作成・接続するテストfixtureも設けない。保守・移行だけの例外を残さない。
- アプリ専用DBサービス・DB・ロール・永続volumeを、このComposeプロジェクト内に設ける。外部DBや既存の他用途DBを利用しない。
- DBの5432をホストへpublishしない。DBは専用internal networkだけに参加する。
- local版の既存ファイル保存とWindows利用を維持する。local版はDB接続もPostgreSQLの起動も要求しない。
- 一つのチーム・一つのアプリプロセスというP2の初期構成を維持する。複数アプリサーバー、レプリケーション、S3へのblob移行は今回含めない。
- 実Google設定、実データ移行の実行、デプロイ、mainへのマージは別作業。本書では実装や依存追加を行わない。

## 2. 置換前の実装との差分

| 置換前 | 置換後 |
| --- | --- |
| `team.sqlite`、Python標準sqlite3 | 専用PostgreSQL、psycopg 3系 |
| `BEGIN IMMEDIATE`とSQLite制約 | 明示トランザクション、共通write gate、PostgreSQL制約 |
| `PRAGMA`・sqlite_masterによるschema検査 | version管理されたDDLとPostgreSQL catalog検査 |
| 認証と共有データの同一SQLiteファイル | 認証と共有データの同一PostgreSQL DB・schema |
| SQLite backup API＋blob | 一貫したPostgreSQL論理snapshot＋blobの世代archive |
| 同じデータdirectoryのOS排他 | 同じDBのsession advisory lock＋同じblob directoryのOS排他 |
| teamのDB試験もホスト上で実行 | teamの実DB試験は同じCompose network内のrunnerで実行 |

PostgreSQLは18系安定版を対象とし、実装は公式18.6-bookwormのpatch/digestを固定した。`latest`・RCは使わない。
psycopgはpure 3.3.6 wheelのpatch/hashとsystem libpq5 17.11を固定した。実DBはLinux/Python 3.12/3.14、Windowsはlocal/純粋logicの互換範囲で検証する。
binary配布物に同梱されるlibpq等も含め、実物のライセンス原文・依存台帳・Docker配布通知を更新する。
SQLAlchemy等のORMは追加しない。既存SQLと保存契約を明示的に置換する。

## 3. Docker networkの境界

| サービス | `app_net` | `db_internal` | ホストへの公開 |
| --- | --- | --- | --- |
| アプリ | 参加 | 参加 | 既存どおりloopbackのアプリHTTPだけ |
| `db` | 不参加 | 参加 | なし。`ports`・host networkを禁止 |
| schema移行・backup/restoreの一時job | 不参加 | 参加 | なし。必要時だけ起動 |
| HTTPS proxy | 必要な場合だけ参加 | 不参加 | HTTPS。既存の運用管理範囲 |

`app_net`はGoogle OIDC・既存ブローカーの許可済み外向き通信に使う。
`db_internal`は`driver: bridge`、`internal: true`、IPv4だけとし、external networkとして共有しない。
Composeプロジェクト名でnetworkを分離し、固定のグローバルnetwork名を付けない。
DB接続先はservice DNS名`db:5432`。コンテナIPをアプリの接続先に固定しない。
DBをアプリ側networkへ追加せず、DB用port forward・SSH tunnel・host aliasも設けない。
team設定はこのhost/portを検証し、任意の外部DSN、SQLite URL、ホストUnix socketへの切替を受け付けない。
初版のDB通信は同一hostの内部bridgeを信頼境界とし、DB TLSを必須にしない。browser側のHTTPSは維持する。

`internal`とport非公開だけでホスト由来の通信拒否を断言しない。
DB側の`pg_hba.conf`も次の順に制限する。

1. コンテナ内Unix socketの管理操作はOSユーザーに対応するpeer認証。ネットワークからのsuperuserログインは禁止。
2. DB networkのgateway IPv4からのPostgreSQL接続は拒否する。ホストからbridgeへ直接接続する経路も拒否対象とする。
3. 設定されたDB subnetから、対象DBと専用app/maintenance/backupロールだけをSCRAM-SHA-256で許可する。
4. それ以外のIPv4/IPv6、別DB、別ロールは拒否する。`trust`を使わない。

subnetとgatewayは`TEAM_DB_SUBNET`・`TEAM_DB_GATEWAY`としてCompose IPAM・HBA生成・DB接続検証の共通入力にする。
例示値は`172.30.53.0/24`・`172.30.53.1`。運用時は既存networkとの重複を避けて選ぶ。
生成側はCIDR/IPv4・gatewayの所属と予約addressを検証し、独立した二つの設定を手作業で合わせない。
DBはそのnetwork以外のinterfaceを持たない。追加参加にはDocker管理権限が必要である。
HBAはDBセッションの確立を拒否するものであり、TCP SYN自体の到達不能を保証するものではない。
ホストroot・Docker管理者がcontainerへexec/attachできる権限は、このnetwork隔離の防御対象外とする。

### 構成の抜粋

以下はnetwork・volumeの設計図であり、今すぐ起動する完成版Composeではない。
実装版にはHBA生成、role初期化、secrets、schema job、healthcheckを本書の契約どおり組み込む。

```yaml
services:
  semantic-studio-team:
    build: .
    ports: ["127.0.0.1:8000:8000"]
    environment:
      SEMANTIC_STUDIO_MODE: team
      SEMANTIC_STUDIO_DATA_DIR: /data
      SEMANTIC_STUDIO_DB_HOST: db
      SEMANTIC_STUDIO_DB_PORT: "5432"
      SEMANTIC_STUDIO_DB_NAME: semantic_studio_team
      SEMANTIC_STUDIO_DB_USER: team_app
      SEMANTIC_STUDIO_DB_PASSWORD_FILE: /run/secrets/team_db_password
      SEMANTIC_STUDIO_DB_SUBNET: ${TEAM_DB_SUBNET:-172.30.53.0/24}
      SEMANTIC_STUDIO_DB_GATEWAY: ${TEAM_DB_GATEWAY:-172.30.53.1}
    networks: [app_net, db_internal]
    volumes: ["team_data:/data"]
  db:
    image: postgres:18 # 実装時に安定patch・digestへ固定
    networks: [db_internal]
    volumes: ["postgres_data:/var/lib/postgresql"]
    # ports、network_mode: host、app_net参加を設けない
networks:
  app_net:
    driver: bridge
  db_internal:
    driver: bridge
    internal: true
    enable_ipv6: false
    ipam:
      config:
        - subnet: ${TEAM_DB_SUBNET:-172.30.53.0/24}
          gateway: ${TEAM_DB_GATEWAY:-172.30.53.1}
volumes:
  team_data:
  postgres_data:
```

PostgreSQL 18の公式imageでは永続volumeのmount先を`/var/lib/postgresql`とする。
17以前の慣例を流用して誤った場所へmountしない。major更新時に既存volumeをそのまま使い回さない。

## 4. 認証情報・ロール・起動

- DB管理・app・maintenance・backupのパスワードは別にし、Compose secretsのファイルから読む。
- `.env.example`には秘密そのものを入れない。secret sourceのパスを指定する変数だけを用意する。
- DBの初期化は公式imageの`POSTGRES_PASSWORD_FILE`と初期化scriptを使い、専用ロールを作る。
- appにはappパスワードだけをmountする。DB管理・DDL用パスワードはmountしない。
- appはresources等の必要なDMLだけを許可し、schema変更・role作成・DB作成を許可しない。
  監査・確定要求の行はappにSELECT/INSERTだけを許可し、通常のUPDATE/DELETEを許可しない。
- maintenanceはschema所有・明示移行/復元用、backupは既存dataのSELECT用とする。superuserのTCP利用はしない。
- 業務tableは専用`semantic_studio` schemaに置く。PUBLICのDB接続/schema作成権限を閉じ、各roleへ必要な権限だけを明示する。
- file-backed Compose secretsのuid/mode変更が必ず適用されるとは仮定せず、実際のcontainer UIDで読めるhost file権限を検証する。
- パスワード、接続URL、SQL本文・パラメーター、RDF原文をargv・例外本文・SQLログへ残さない。
  role初期化はSQL identifier/literalを安全に構成し、失敗出力も秘密なしの有限codeに変換する。

起動順は`db healthy → db-migrate正常終了 → app`とする。
DBのhealthcheckはUnix socketの`pg_isready`。認証・schemaの成功はmigration jobとappで別に検査する。
`db-migrate`は一回限りの同一app imageのjobで、現在versionならread-only検査で終了する。
DDLが必要なときはapp停止とDB lease取得を必須にし、既存データを暗黙に変更しない。
appはschemaを作成せず、version不一致・認証失敗・接続失敗で閉じたまま起動を失敗させる。
再起動時にDB volumeを作り直したり、SQLiteへ退避したりしない。

## 5. 保存データと互換性

従来の`resources`・`audit`・`requests`、users/sessions/login_attempts/auth_events/access_requestsを維持する。
schema versionはSQLiteのPRAGMAに代わる`team_schema`で一括管理する。
schema管理を含む9テーブルを基本とし、DB名・schema・columns・constraints・indexesを移行DDLで固定する。

- 資源versionとaudit IDは符号付き64bit整数。削除した資源はpayload NULLの墓標を残す。
- RDFと文書state、要求結果、監査の前後payloadは**既存canonical JSONのTEXT**を第一段階で維持する。
  JSONBへの変換は行わず、文字列・lexical値・JSON escape・未知項目の保存意味論を変えない。
- audit/auth_eventsのIDはidentity列を使い、rollbackで番号に欠番があってもよい。
- 認証時刻はUnix秒のdouble precision、disabledはbooleanへ明示変換する。TTLの60/30/5分は維持する。
- 実ファイルは引き続き`/data/blobs/<sha256>`。RDF処理はrdflibで行い、SQLでSPARQLを実行しない。
- 元のnamespace、言語、空白ノード、数値literalのlexical、未知述語、元のファイルbytesを変えない。
- DBのTEXT列に使う識別子はUTF-8・NULなしを検査する。変換不能な移行元localファイルの資源識別子は移行を拒否し、黙って置換しない。

## 6. 保存層の境界

新設する`backend/app/team/pg_storage.py`だけがpsycopgへの接続を行う。
`pg_schema.py`とversion付きSQLがDDL・catalog検査を担当する。
`TeamRepository(storage)`と`AuthStore(storage, bootstrap_subs=...)`は同じstorageを共有する。
`workspace.py`・`history.py`から直接SQL/driver/connectionを扱うコードを除き、保存層の明示メソッドへ移す。

| インタフェース | 契約 |
| --- | --- |
| `storage.read_snapshot()` | 短いREPEATABLE READ READ ONLY transaction。資源と墓標versionを同じsnapshotから返す |
| `storage.write_transaction()` | 共通write session・排他mutex・READ COMMITTED・DB write gateを取得。成功だけcommit |
| `repository.read_operation_group()` | 同一操作のauditと依存版を一貫したreadから取得。UndoのSQLをUI/業務層へ漏らさない |
| `repository.lookup_request()` | actor/request IDとcanonical要求hashを照合。確定済み応答を返す |
| `storage.export_snapshot()` | backup用の同一read-only snapshotから既知table行とblob参照manifestをstreamする |

SQLの値はbind parameterを使う。未知のtable/column/SQLをarchiveやHTTP入力から実行しない。
SQLite固有SQL・型・例外・接続pathを残さず、`StorageError.sqlite_code`も廃止する。
storage障害は既存`storage_error`/`team.config_unavailable`の503へ変換する。SQLSTATEは必要時だけ値なしの内部診断に使う。
DB通信はtrustedな`db:5432`専用の接続能力とし、利用者IRIを受け付けない。
起動時に`db`の解決結果をDB subnet内・gateway以外のIPv4へ限定し、psycopgへ検証済み`hostaddr`を渡す。
短い名前のDNS解決が外部addressへ流れた場合も接続しない。addressはruntimeの寿命だけ保持し、再起動で再解決する。
DNS待機を含む起動予算を超えたら接続を開始しない。OSのDNS処理自体を強制終了するとは保証しない。
既存HTTPブローカーとは分離し、HTTP/JSON-LD/SERVICEが私設DBへ到達できないガードを維持する。
接続生成箇所をsource scanで限定し、psycopgの別モジュールへの持ち込みを検出する。
DBのresolverだけの狭い例外を検査し、`pg_storage.py`全体をHTTP/socket guardの免除対象にはしない。

## 7. 更新の直列化・競合・権限

DB置換に伴う同時編集の仕様拡大はしない。workspace全体の版確認を含む、現在の保守的なCASを維持する。

1. read snapshotから資源・versionを取得してtransactionを閉じ、候補グラフを別領域で評価する。
2. 必要なblobを不変ファイルとして先に確定する。この時点でDBへ参照を公開しない。
3. write sessionのmutexとtransactionを取得し、共通の`pg_advisory_xact_lock`を取得する。
4. **lock取得後**に現在時刻、セッション・権限、actor/request ID、双方の要求table、現在versionを読み直す。
5. 同一要求なら保存済み応答を返す。異内容の再利用は拒否。期待版不足428、版競合409を維持する。
6. resources・全audit・version・要求結果を同じtransactionで確定してから応答・cacheを公開する。

全auth更新も同じwrite gateを通し、最後のadmin保護とlogin state一回消費を直列化する。
READ COMMITTEDでgate取得後に版を読む。待機前の古いsnapshotでCASを判定しない。
文書/権限/削除/Undo/Redoは確定直前の権限も再確認し、準備中に停止・降格した権限で確定しない。
認証clockはmutexとDB gate取得後に読む。status/versionsのpollはidle延長を行わず、短いreadだけで判定する。
ネットワーク取得・RDF解析・推論をwrite transaction中に行わない。
DB待機はthreadpoolへ逃がし、公開healthが止まらないことを実測する。

接続timeout 5秒、DB lock待ち5秒、通常のstatement 30秒を初期上限とする。
待機mutexにも5秒の上限を設け、待ち続ける要求を作らない。
COMMIT時の接続切断は結果不明として503にし、成功もrollbackも決めつけない。
再起動後、同じrequest IDの確定済み記録で判定できるようにする。フロントの自動再送は禁止のまま。

## 8. 単一アプリの所有権とDB再起動

同じDBへの二重app起動を防ぐsession advisory lockと、blob directoryの既存OS lockを併用する。
DB leaseとwrite gateは別の固定keyにし、同一DBの全storeで共通化する。

**leaseを保持する専用PostgreSQL接続を、そのappの唯一のwrite接続として使う。**
全更新はその接続のmutex内で行う。readは別の短命接続を使用できる。
lease接続をpoolへ返したり、切断した接続を裏で自動再接続したりしない。
専用接続はautocommitで保持し、各更新だけを`connection.transaction()`で囲む。
lease取得だけの暗黙transactionを残さず、transaction終了のたびに接続をcloseする使い方もしない。
これによりleaseだけを失った旧appが別のpool接続で更新を続ける経路を作らない。
二つ目のappはblob directoryが違ってもDB lease取得に失敗する。

lease接続・DB自体が失われたら新規データ要求を503で閉じ、候補を破棄してruntimeを停止する。
各データ要求はlease接続の生存を短く検査し、失われた所有権をread cacheだけで代替しない。
team用server入口がruntimeのfatal状態を受けてuvicornを終了させ、Composeのrestart policyで再起動する。
公開livenessはDBの待機で止めない。mutexの一時的な混雑とlease接続の喪失は区別する。
DB接続の状態だけを見てlocalへ切り替えず、Composeのapp再起動で新しい所有権を取得する。
read cache・once grant・実行中jobは引き続き単一app内の状態。PostgreSQL化だけでmulti-workerを許可しない。

## 9. 初期化とlocalファイルからの移行

新しいteamサービスは、PostgreSQLへの新規初期化とlocalファイル領域からの明示移行だけを扱う。
SQLite DB・SQLite backupの読取、変換、論理export、importを本製品の機能として実装しない。
旧案にあった`tools/legacy/`のoffline exporterとSQLite fixtureは撤回する。

既存の旧DBファイルがdata directoryにある場合は、未対応の旧保存領域として起動を拒否する。
ファイルをDBとして開かず、読み取り・自動変換・上書き・削除を試みない。
新しい空のPostgreSQL DBと新しいblob volumeを明示的に用意する。
旧保存領域を自動廃棄して「移行済み」と扱うことを禁止する。

localファイルからの移行では、inspect/dry-runで件数・型付きRDF・namespace・ファイルhashを検査し、元領域を変更しない。
移行先は空のPostgreSQL schemaと新しいblob volumeだけとし、既存データを上書きしない。
localファイルにない過去の利用者・監査・版番号・再送記録・Undo履歴を作らず、移行操作を`migration`として記録する。
セッション・未完了loginを外部入力から復活させず、移行後は再ログインさせる。

旧SQLite版の監査・Undo等を新DBへ自動継承できるとは主張しない。
旧DBに必要な実データがあると判明した場合は、既存領域を保持したまま別の移行要件として判断する。
この判断をSQLiteの移行用依存を復活させる口実にせず、元データの削除や履歴欠落を伴う切替を自動実行しない。

## 10. backup/restore

appのbackup形式は、version付きの非公開世代archiveに改める。
`manifest.json`、既知tableのstream可能な行データ、現在と履歴から参照するblob、各hash/件数を含める。
schemaのSQLやDBロールのパスワード・運用環境・接続secretはarchiveへ含めない。

- backupはbackup専用roleの一つのREPEATABLE READ READ ONLY transactionで、全tableと参照manifestを取得する。
- 取得後のblobは不変であり、backup中のblob削除/GCは禁止。DB snapshot時点の参照blobを全てhash検証してコピーする。
- 書込み中DBでも一貫した世代を取得し、appのwriterをbackup完了まで止めない。
- 出力は私有の一時領域で作り、検証完了後にだけrenameで公開。途中失敗に成功manifestを残さない。
- restoreは新しいComposeプロジェクトの空DB・空blob volumeだけへ行う。app停止とDB lease取得を必須にする。
- version・columns・件数・hash・型付きRDF・制約を確認して一括importし、全sessions/login_attemptsを失効させる。
- 失敗した行先を利用開始せず、稼働中の元DB/元blobを変更しない。復元先のCIDR/secret/Google設定は運用側で別途与える。

`pg_dump`等のDB管理backupを別途併用してもよいが、DB単体のdumpをappのblob込み復旧世代とは呼ばない。
PostgreSQLの物理data directoryの稼働中単純コピーは行わない。
backup/restore/migrateは`docker compose run --rm`のmaintenance profileで、同じ`db_internal`から実行する。
保守のために5432を一時公開する手順は作らない。アプリimage内の`python -m app.team.manage`をCLI本体とし、
既存`scripts/team_workspace.py`はsource checkout用の薄い入口へ整理する。
保守jobはstorage専用設定を読み、Googleのsecret・appのセッション設定・app用DB credentialを要求しない。
CIのDB resetは専用test DBのfixtureだけへ閉じ、production CLIへ汎用drop/reset機能を追加しない。

## 11. ログ・障害・永続化

DBの`fsync`・`synchronous_commit`を有効のままにし、性能試験のために耐久性を落とさない。
DB volumeとapp blob volumeは分離し、通常の停止・再作成で残す。`down -v`を通常停止手順に使わない。
パスワードの誤り、schema不一致、DB停止、blob欠損を区別する内部有限codeと日英UIを用意する。
既存の認証失効401とDB障害503を混同せず、未送信入力を保持する。
SQL/parameterのログ出力を無効化し、DBのerror statement/DETAIL/CONTEXTにも秘密が出ない設定・試験を設ける。
Docker secrets、DB volume、論理backup、実データをGit/Docker build context/配布artifactから除外する。
公開検査にDBパスワードの設定名・資格入りPostgreSQL DSNを追加し、埋込みを再現fixtureで検出する。
秘密や接続先を含み得るdriver例外をそのままHTTPやログへ出さない。

## 12. CI・受け入れ条件

team版の運用対象はLinux containerとする。Windowsのlocal版互換性は維持する。
従来のWindows native backend jobから実DB接続する方法は、host port公開が必要になるため採用しない。
実PostgreSQL試験はPython 3.12/3.14の両方をLinux container内で実行し、Windows jobはlocal/純粋logic/ファイル互換を検証する。
この検証範囲の変更をCI名・検証書へ明記し、Windows nativeでteam DB統合を通したとは報告しない。
DB試験を削除せず`team_db`等で明示分類し、必須のCompose統合jobへ全件移す。
CIごとに専用Compose project/DBを作り、test fixtureだけでschemaを初期化する。host portはCIでも公開しない。

- app・maintenanceからDNS名`db`で接続成功、DBのhost port bindingなし、DBの参加networkがinternalだけ。
- 別networkのcontainer・通常hostプロセスから、DB container IPを直接指定してもDB sessionを確立できない。既知の合成credentialでも拒否を検証。
- 同じDB networkでも誤ったcredential/別role/別DBを拒否。DBに外向き通信経路なし。
- appのGoogle用外向き通信は既存broker経由で可能。DB用接続能力をHTTP/IRIから悪用できない。
- DB再作成後もDNS名で再接続、既存volumeのデータ保持、missing config/secret/schema時に閉じて失敗。
- 二つのHTTP利用者・二つの独立DB接続でCAS一勝一敗、要求の二重適用なし、actor混入なし。
- 認証と資源要求の同一ID衝突、最後のadmin、state二重消費、queued clock、pollのidle非延長。
- 停止・降格と準備中更新の競合で、不許可の変更を確定しない。
- DB確定前の例外・blob失敗・COMMIT応答喪失・DB再起動で、部分更新や架空の成功を残さない。
- 別blob directoryの二重appも起動拒否。lease切断後の旧appが別接続で更新を継続しない。
- RDF・原文・空白ノード・namespace・未知項目がlocalファイル移行とPostgreSQLの再起動/復元後にも一致。
- PostgreSQLの世代backup/restoreでは墓標version・全audit・要求再送記録・users/rolesを保持し、ID列の次値を再設定する。履歴・Undo/Redo・再送の意味が一致し、sessions/login_attemptsだけは失効する。
- localファイル移行で、存在しない旧DB履歴を生成・継承したと表示しない。旧DB入力を与えても開かず、元ファイルと既存DBを変更しない。
- 稼働中backupの整合性、旧auditだけのblob、失敗した復元先の非公開、移行元不変、復元後再ログイン。
- 日英UI、401/409/503での入力保持、実HTTPS・2利用者・Shapes/model履歴・AX/Tabを再検証。
- backend/frontend全体と既存性能予算、型検査/build、配布通知・秘密検査、実PostgreSQL Compose統合を必須gateにする。
- 製品のアプリ・保守/移行CLI・補助tool・テストfixtureにsqlite3/SQLite接続・専用SQL・backend selectorなし。reader/exporter/importerを配布先だけ変えて残すことも禁止。
- source scanで製品コードのSQLite import・接続・PRAGMA・sqlite_master・SQLite専用transactionを検出し、テスト/補助toolを免除しない。拒否試験はDBを作らずopaque bytesを入力する。
- 検出器を検証する禁止例のソース断片は文字列としてだけ扱い、SQLiteをimport/実行して再現しない。仕様・履歴文書・拒否対象の文字列と、実際のDB利用を区別する。
- app imageに製品のSQLite実装・互換adapterを含めず、runtime呼出しにもSQLite接続がないことを検査する。Python標準ライブラリ一般に未使用moduleが存在することと、本製品のDB利用・依存は区別する。

## 13. 実装時に変更するファイル群

| 領域 | 対象と責務 |
| --- | --- |
| 接続・schema | 新規`backend/app/team/pg_storage.py`、`pg_schema.py`、version付きSQL。psycopgとtransaction/leaseを集約 |
| 保存・認証 | `repository.py`、`auth_store.py`、`runtime.py`、`config.py`。SQLite依存を除去しstorageを共有 |
| team起動 | 新規`backend/app/team/server.py`。既存uvicorn設定を引き継ぎ、DB lease喪失時の終了・再起動を管理 |
| 業務層 | `workspace.py`、`history.py`。直接SQLを保存メソッドへ移す。候補/確定/公開の順序を維持 |
| 保守 | `maintenance.py`、新規`manage.py`、`scripts/team_workspace.py`。PostgreSQL世代backup/restoreとlocalファイル移行だけ。SQLite用reader等は新設しない |
| 配備 | `docker-compose.team.yml`、DB初期化/HBA生成、`.env.example`、Dockerfile・除外。DB専用network/volume/secrets |
| 依存・通知 | requirements/constraints、licenses台帳・実配布通知。新driverと同梱native成分を検証 |
| 試験 | 既存`test_team_*`をPostgreSQL実接続へ移植。DB lease/backup/network/切断故障注入を追加 |
| browser/CI | `team_browser_server.py`、P2 driverのfixture起動、Compose test runner、CIのDB統合matrix・Windows local job |
| 文書 | P2設計・計画・利用/運用/検証書、CLAUDE、known-state。実装前に完了扱いしない |

実装は、接続/配備境界 → repository/auth → workspace/Undo → 保守/localファイル移行 → 全体/実ブラウザ/配布検証の順に進める。
これは作業範囲の分解であり、RED/GREEN手順を含む詳細実装計画は本設計の確認後に作成する。

## 14. 設計側の判断と未実施事項

ユーザーが指定したのはSQLite廃止、専用PostgreSQL Compose起動、同network内限定接続である。
18系、psycopg 3、TEXT互換保存、唯一のwrite session、論理世代backup、Linux containerのteam運用は設計側の提案として明示した。
同時更新の細粒度化やmulti-worker化を同時に行わず、P2契約の保持と置換の検証を優先する。
実装、image起動、依存追加、データ移行、既存PRの変更・pushはこの設計作業では行わない。

## 15. 確認資料（2026-10-27参照）

- [Docker Compose networks](https://docs.docker.com/reference/compose-file/networks/)：internal、IPAM、明示的なservice参加。
- [Compose networking](https://docs.docker.com/compose/how-tos/networking/)：service DNSとcontainer port/host portの区別。
- [PostgreSQL公式image](https://hub.docker.com/_/postgres)：18のPGDATA/volume、初期化script、password file。
- [PostgreSQL HBA](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)：最初に一致するruleによる認証・拒否。
- [PostgreSQL locks](https://www.postgresql.org/docs/current/explicit-locking.html)：transaction/session advisory lock。
- [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html)：READ COMMITTED/REPEATABLE READ。
- [PostgreSQL logging](https://www.postgresql.org/docs/current/runtime-config-logging.html)：error statement・parameter・verbosityの制御。
- [psycopg transactions](https://www.psycopg.org/psycopg3/docs/basic/transactions.html)：commit/rollback・接続寿命。

製品として採用する制約と、資料に記載されたDB/Docker自体の機能は区別する。

## 16. 設計作成時の確認記録

2026-10-27、独立した実装担当者の視点でbuilder checkを行い、計画作成を妨げる重要な未決事項なし。
設計例のYAMLをparseし、DBのport非公開・network参加・internal設定・IPv6無効・18系のvolume位置を検査した。
`docker compose config --quiet`、文書の相対リンク、公開ポリシーと外部の非公開値リストによる検査が成功。
この確認は設計文書に対するもの。PostgreSQL container起動・実接続・HBAの実動作・移行/復旧・性能・CIはまだ試験していない。
変更は本書と既存文書の参照/状態表示だけで、製品コード・依存・実Compose・実データには触れていない。

### SQLite完全廃止の設計再レビュー

移行用offline exporter・SQLite fixtureを許していた箇所を撤回し、SQLite利用の例外をなくした。
あわせて、旧DB履歴の自動継承という前提を削除し、localファイル移行とPostgreSQL世代復元の保証を分けた。
設計再レビュー時点では`repository.py`・`auth_store.py`・`maintenance.py`等にSQLite実装が残っており、廃止済みとは報告しなかった。
今回の依頼は設計レビュー・修正であるとユーザーが明示しており、製品コードの置換は別工程とする。
独立した全節の再レビューでも、SQLite利用の例外や旧DB履歴の暗黙移行は残っておらず、重要な修正指摘なしを確認した。
