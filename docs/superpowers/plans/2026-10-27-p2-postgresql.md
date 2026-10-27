# P2 PostgreSQL Replacement Implementation Plan

**最終状態の追記（2026-10-27）：P2実装・main統合済み。**
PR #3の最終head `fad9c12`の[CI run 40416830078](https://github.com/tosintech-web/semantic-studio/actions/runs/40416830078)は全11 job成功を確認し、main `e45e2a7`へmerge済み。
Task 9の最終head CI gateは確認済み。以下の各作業時点の「mergeしない」「未確認」は履歴として保持する。
本番Google・実データ移行・配備は別工程。次段階は[P3ローカルDocker計画](2026-10-27-p3-local-releases.md)。


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SQLite利用を製品・保守・テストから廃止し、Compose内限定の専用PostgreSQLへP2を置換する。

**Architecture:** DBは`db_internal`だけに参加し、アプリは外向き通信用`app_net`にも参加する。psycopg接続を一箇所に集め、DB leaseを持つ唯一のwrite接続で認証と共有更新を直列化する。既存のRDF・版・監査・再送・Undo・日英UI契約を保持する。

**Tech Stack:** PostgreSQL 18系安定版、psycopg 3系、Python 3.12/3.14、FastAPI、rdflib、Docker Compose、既存React/TypeScript。

**Spec:** [2026-10-27-p2-postgresql-design.md](../specs/2026-10-27-p2-postgresql-design.md)。SQLite例外撤廃後の設計を正本とする。

作成日：2026-10-27。起点：`feat/p2-team-workspace` の `fa99837`。実装・手元の全試験集合・独立レビュー修正と再レビュー・指定branchへのpush・日本語PR更新を実施済み。最終完了はTask 9末尾の最新head CI gateによって判定する。
既存SQLite版の完了チェックやPR CIを、このPostgreSQL置換の完了証跡として流用しない。
本追補は計画のレビュー・修正だけを対象とする。既存の実装コミットと未コミット変更は保持し、実装の続行・commit・pushはこの計画作成作業では行わない。

## Global Constraints

- DBは専用Composeサービス・DB・schemaとし、SQLiteとの選択式・接続失敗時のlocal/SQLite fallbackを作らない。
- SQLite reader/exporter/importer・互換adapter・SQLiteを作成/接続するテストfixtureを新設・維持しない。旧DBの直接移行も対象外。
- 旧DBを受け取ったら開かず拒否し、既存データを自動削除しない。localファイル移行とPostgreSQL世代復元だけを扱う。
- `db:5432`、IPv4、RFC1918の専用internal bridgeのみ。DBのhost port・host network・外部network参加・port tunnelを禁止。CIも同じ境界を使う。
- subnet/gatewayをCompose IPAM・HBA・接続検証へ共通入力として渡す。gatewayとその他networkからのDB sessionを拒否する。
- HBAはTCP SYNの到達不能を保証するものではない。Docker管理者・host rootは境界外。別host運用・DB TLS必須化は今回含めない。
- DB管理/app/maintenance/backupには、空でない単一行の異なる4つのパスワードを使い、初期化SQLを実行する前に重複も拒否する。
- DBの秘密はfile-backed Compose secrets。appに管理/maintenance/backup credentialをmountしない。実値・資格入りDSN・SQL parameterをGit/ログ/argvに出さない。
- PostgreSQL 18安定patch/digestとpsycopg 3 patch/hashをTask 1で実物確認・固定する。RC/latest、ORM追加、未確認licenseの配布をしない。
- appは1プロセス。DB leaseを持つ唯一のwrite接続をautocommitで保持し、更新だけを明示transactionで囲む。poolへの返却・自動再接続は禁止。
- 更新のmutex待ち5秒、DB lock待ち5秒、通常statement 30秒、DB connect 5秒。DNS待ち上限5秒を別に取り、endpoint取得のDNS＋connect予算は最大10秒。遅延DNS完了後に接続を開始しない。
- 全auth/共有更新で共通write gateを取り、取得後に時計・権限・要求ID・版を読む。RDF解析・外部取得をtransaction内へ持ち込まない。
- 428/409/503、actor別の要求ID、canonical要求hash、確定応答の再送、墓標版、他者Undo禁止、current-role認可を維持。
- RDFの型・lexical・言語・namespace・空白ノード・未知項目・元bytesを保持。payloadは既存canonical JSONのTEXTとしJSONB化しない。
- 日英カタログ・message codeを維持。401/409/503で未送信入力を失わず、自動再送しない。DB障害を認証失効と混同しない。
- DBとblobは別volume。blobを先に確定し、資源・監査・要求結果を同じDB transactionで確定してから公開する。
- 本番teamはLinux container。Windows local版は維持。実DB試験はLinux containerのPython 3.12/3.14両方へ移し、native Windows DB統合成功とは呼ばない。
- 全既存試験・性能予算・SELECT専用・HTTPブローカー境界・元MIT/第三者通知を保持。試験削除や閾値緩和で置換を通さない。
- 実装は隔離worktreeで行いmainを直接変更しない。実Google設定、実データ移行、デプロイ、mainマージは含めない。
- 途中段階は未完成として扱う。旧コードが残る段階でSQLite廃止済みと報告せず、最終gateで全利用経路の除去を確認する。

## Review Focus

1. DB lease接続だけが失われた旧appが別接続で更新を続けない。公開healthはDB待ちで止めない（Tasks 2/5）。
2. mutex/DB待機中のclock逆転、停止/降格、同一要求IDのauth/編集間競合を確定直前に拒否する（Tasks 3/4）。
3. 正しい合成credentialでもhost/別network/superuser TCPから接続できず、DNSを外部addressへ変えても秘密を送らない（Tasks 1/2/8）。
4. COMMIT応答喪失・blob破損・復元途中停止で架空の成功を残さず、元データを変更しない（Tasks 3/6）。
5. JSON escape・NULを含むpayload・非正規化literal・履歴だけのblobが保存/再送/復元で変わらず、任意JSONをblob参照と誤認しない（Tasks 3/6）。

## 作業境界・接続契約

| Task | 成果物と依存 |
| --- | --- |
| 1 | driver/通知、PG専用設定、bootstrap、内部networkの実DB test環境。製品runtimeはまだ切り替えない |
| 2 | `PgStorage`の接続・transaction・DB lease。1の設定を消費 |
| 3 | PG schema/repository・audit/replay/Undo用読取。2を消費 |
| 4 | PG AuthStore・current-role確定前検査。2/3を消費 |
| 5 | workspace/runtime/server接続、業務層からSQL除去。2〜4を消費 |
| 6 | local移行・世代backup/restore・保守CLI。1〜5を消費 |
| 7 | 既存team試験の全移植・SQLite実行経路除去。3〜6を消費 |
| 8 | 製品Compose・browser・CIの最終接続、network/故障の受け入れ。1〜7を消費 |
| 9 | 全差分レビュー修正・配布検査・文書・main向けPR/CI。全Taskを消費 |

共有ファイルの変更・Git操作は実行担当が逐次管理する。既存9テーブル相当を維持し、業務tableは`semantic_studio` schemaへ置く。
`resources/audit/requests/team_users/team_sessions/team_login_attempts/team_auth_events/team_access_requests/team_schema`を管理対象とする。
schema versionはPostgreSQL版1とし、schema所有はmaintenance、appは必要DML、backupはSELECTだけ。
監査/確定要求へのapp権限はSELECT/INSERTのみ。table/column/index/制約/sequence権限も検証する。

### 検証コマンドの約束

Task 1で`docker-compose.postgresql-test.yml`、`Dockerfile.postgresql-test`、service `pg-tests`を作る。
各Taskの`PGTEST <pytest引数>`は次の実コマンドを表す。test runnerは`db_internal`だけに参加する。

```sh
docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest <pytest引数>
```

`PYTHON_VERSION=3.12/3.14`はtest imageのbuild引数、`BUDGET_FACTOR`はrunnerへ渡す（local 1、CI budgets 2）。
project名・secret file・volumeは各検証専用にし、実data directoryをmountしない。通常cleanupで本番volumeへ触れない。
各Taskは失敗を確認→実装→対象成功→差分確認→指定ファイルをcommit、の順に進める。最後に全体を実行する。

## Task 1: driver・専用設定・隔離PostgreSQL検証環境

**Files:**
- Create `backend/app/team/pg_config.py`, `pg_bootstrap.py`。
- Create `docker/postgres/init-roles.sh`, `init-roles.sql`, `Dockerfile.postgresql-test`, `docker-compose.postgresql-test.yml`。
- Create `backend/tests/test_pg_config.py`, `test_pg_bootstrap.py`, `pg_probe.py`, `pg_support.py`; Modify `backend/tests/conftest.py`, `pytest.ini`。
- Modify `backend/requirements.txt`, `requirements-dev.txt`, `constraints-distribution.txt`, `licenses/dependency-inventory.json`, `licenses/texts/`, `THIRD_PARTY_NOTICES.md`。

**Interfaces:**
- `load_pg_config(env: Mapping[str,str], *, role: Literal['app','maintenance','backup']) -> PgConfig`。roleはtrustedな呼出し側が固定する。
- `PgConfig`はhost=`db`、port=5432、validated dbname、role対応user、secret file、network/gateway、上記timeoutを保持。秘密をreprに含めない。
- `PgEndpoint`は秘密を含まない接続先/network設定、`PgConfig`はこれにrole別secret fileを加えた設定とする。
- `render_hba(config: PgEndpoint) -> str`, `write_db_config(env, destination: Path) -> None`。前者はgateway拒否→対象DB/role/subnet SCRAM許可→IPv4/IPv6全拒否の順。
- `db-config` jobはnetworkなしでHBA volumeを生成。`db`はその完了後に起動し、HBA volumeをread-only mountする。
- `init-roles.sh/sql`はUnix peerで固定roleを作り、PUBLICのCONNECT/CREATEを閉じる。passwordはfile→process内変数→安全なSQL literalへ渡し、argv/ログに出さない。
- `pg-tests`はapp/maintenance/backupの合成secretを持つtest image。production appへ保守credentialを流用しない。

- [x] **Step 1: 設定・HBA・bootstrap試験を書く。** 次の名前とassertionを固定する。
  - `test_pg_config_rejects_external_endpoint_and_inline_secret`: `assert host == 'db'`; 外部host/別port/資格入りDSN/不正role/欠落fileを有限codeで拒否。
  - `test_hba_gateway_rule_precedes_subnet`: `assert gateway_reject_index < subnet_allow_index < final_reject_index`。
  - `test_pg_bootstrap_roles_and_secrets`: role属性とDB/PUBLIC権限、superuserのTCP拒否、log/argvへ合成secretが出ないことを確認。table権限の実動作はschema作成後のTask 3で検証し、table不存在を権限拒否の証拠にしない。
- [x] **Step 2: REDを確認。** `cd backend && .venv/bin/python -m pytest tests/test_pg_config.py -q` → 新module不足で失敗。
- [x] **Step 3: 上の設定/bootstrapと検証Composeを実装。** subnetはRFC1918内のIPv4、16 address以上、gatewayは所属する非予約address。DB volumeは`/var/lib/postgresql`、portsなし・internalだけ。公式18安定patch/digestとpsycopg patch/hash・実wheel通知を固定。schema tableはまだ作らない。
- [x] **Step 4: GREENを確認。** `docker compose -f docker-compose.postgresql-test.yml config --quiet`、専用stackのbuild/up、`PGTEST tests/test_pg_config.py tests/test_pg_bootstrap.py -q` → 全成功。inspectでport bindingなし・専用network参加を確認。
- [x] **Step 5: commit。** このTaskの設定・bootstrap・検証基盤・依存/通知だけをcommit。旧team runtimeがPG対応済みとは報告しない。

## Task 2: PostgreSQL接続・唯一のwriter・lease喪失

**Files:** Create `backend/app/team/pg_storage.py`; Create `backend/tests/test_pg_storage.py`; Modify `backend/tests/test_no_direct_network.py`, `pg_support.py`。

**Interfaces:**
- `PgStorage(config: PgConfig, *, on_fatal: Callable[[str],None])`。
- `start_writer() -> None`, `ensure_owner() -> None`, `read_snapshot() -> ContextManager[ReadTx]`, `write_transaction() -> ContextManager[WriteTx]`, `close() -> None`。
- `ReadTx`/`WriteTx`はbind値でSQLを実行し、named columnでrowを返す。productionの接続生成はこのmoduleだけ。
- appのreadはwriter所有を検査。backupはread-only、maintenanceのread-only version検査はlease前でも可能。writeにはroleとleaseを必須にする。
- `APP_LEASE_KEY=(1397969989,1)`、`WRITE_GATE_KEY=(1397969989,2)`。同一専用DBで共有し、test用に値を変えて排他を回避しない。
- `export_snapshot() -> ContextManager[SnapshotExport]`はbackup roleの単一read-only transactionを保持する。Task 6へ固定tableのrow streamとsnapshot内で確定したblob参照を渡す。transactionを閉じてから別snapshotで参照を取り直さない。

- [x] **Step 1: 接続/排他の再現試験を書く。**
  - `test_dns_outside_subnet_never_connects`: `assert connect_calls == []`（gateway/public/IPv6/期限後DNS応答を含む）。
  - `test_writer_retains_same_backend_and_lease`: `assert pid_after_commit == pid_before`; 第二storageのlease取得は失敗。
  - `test_writer_is_not_reopened_after_connection_loss`: `assert new_writer_connections == 0`; 全更新が503相当の有限障害。
  - `test_waiting_writer_uses_read_committed_after_gate`: 別接続のgate解除後に確定版を読む。`SHOW lock_timeout`は5秒、statementは30秒。
- [x] **Step 2: RED。** `PGTEST tests/test_pg_storage.py -q` → module/API不足で失敗。
- [x] **Step 3: 実装。** driverはlazy import。DNSを期限付きで検証し`hostaddr`で固定、資格情報はfile読取のみ。writerはautocommit＋mutex、各writeで明示transactionとadvisory gate。readは短いREPEATABLE READ READ ONLY。broken writerはfatalにして閉じ、pool/自動再接続を作らない。HTTP guardはmodule全体を免除せずresolverだけを狭く検査する。
- [x] **Step 4: GREEN。** `PGTEST tests/test_pg_storage.py tests/test_no_direct_network.py -q` → 全成功。lease切断はtest helperがappと同じroleの別接続から自身のroleのPIDだけを停止する。superuser TCPやrunner内Docker socket、production用管理APIは追加しない。
- [x] **Step 5: commit。** storageと接続guard、その試験をcommit。

## Task 3: schema・repository・canonical保存・原子的replay

**Files:** Create `backend/app/team/pg_schema.py`, `backend/app/team/sql/001_initial.sql`; Modify `backend/app/team/repository.py`, `blobs.py`（必要な世代検証のみ）; Create `backend/tests/test_pg_repository.py`, `test_pg_schema.py`; Modify `pg_support.py`。

**Interfaces:**
- `ensure_schema(storage: PgStorage) -> Literal['created','current']`。maintenanceだけがDDL可能。currentならread-only検査で終了、変更にはapp停止・lease/gate必須。
- `TeamRepository(storage)`。`Resource`、`read/versions/snapshot/commit/read_request/history`の利用者向け戻り値・codeを維持。DB pathとSQLite backup methodは廃止。
- `read_operation_group(actor: str, request_id: str, *, tx: ReadTx | WriteTx | None = None) -> list[dict]`、`latest_operation(key: str, *, tx: ReadTx | WriteTx | None = None) -> OperationGroup | None`を追加。`OperationGroup`は操作・依存版・確定応答を保持するDTO。groupと依存版は同じread snapshotから返す。
- `lookup_request(actor, request_id, body_hash, *, tx: ReadTx | WriteTx) -> dict | None`は設計の要求照合入口。既存`read_request`の呼出しを整理し、更新/replay判定はwrite gate内のtxを渡す。
- `StorageError(kind: str, *, sqlstate: str | None=None)`は有限kindだけを公開し、既存HTTP `storage_error`/503へ接続。`sqlite_code`を残さない。
- `commit(..., authorize: Callable[[WriteTx], Principal])`を必須keywordとして追加する。gate取得後、replayを返す前も含め同じtransactionでcallbackを実行し、返されたactorと要求actorを照合する。HTTP更新ではTask 4の再認可を渡し、別transactionや省略可能な認可fallbackを作らない。保守移行はmaintenance roleを検証した専用入口で扱う。

- [x] **Step 1: repository/schema試験を書く。**
  - `test_pg_commit_is_atomic_under_injected_failure`: `assert resources == before`; `assert audit == before_audit`; `assert replay is None`。
  - `test_pg_cas_one_winner_and_tombstone_aba`: 唯一のwriterを共有する2要求で同じ期待版は一勝一敗、削除/再作成でも単調版。別接続のgate競合はtest専用SQL helperで注入し、第二writerを許す製品用bypassを作らない。
  - `test_pg_replay_canonical_json_is_lossless`: 再送結果同一、異内容同ID拒否。`'001'`、日本語、emoji、JSON内NUL、未知項目を保持。
  - `test_schema_rejects_forged_version_or_missing_constraint`: version行だけ似せても制約/unique/index/権限不一致は拒否し、部分DDLなし。
  - `test_schema_role_privileges`: 存在するtableでappのDDL/監査UPDATE/DELETE、backupのDMLをSQLSTATE `42501`で拒否。appの通常DML/監査INSERTとbackupのSELECTは成功し、sequence/default権限も検証。
- [x] **Step 2: RED。** `PGTEST tests/test_pg_schema.py tests/test_pg_repository.py -q` → API/PG schema不足で失敗。
- [x] **Step 3: 9テーブルを実装。** schema/version1、BIGINT版、identity audit ID、boolean disabled、Unix秒double。payload/要求結果はcanonical ASCII JSON TEXT。writer gate取得後に両要求tableと版を読む。変更・audit・replay応答を一括commit。metadata/DDL検査をpg_catalogへ移し、`?`/PRAGMA/sqlite_master等を除く。
- [x] **Step 4: GREEN。** 上記command＋`PGTEST tests/test_team_rdf_codec.py -q` → 全成功。空白ノード・namespace・lexicalを含む実rdflib往復を維持。
- [x] **Step 5: commit。** schema/repositoryと対象試験をcommit。旧SQLでPGへ接続する互換層は作らない。

## Task 4: AuthStore・current-role・認証と編集の要求ID境界

**Files:** Modify `backend/app/team/auth_store.py`, `auth.py`, `backend/app/routers/auth.py`; Create `backend/tests/test_pg_auth_store.py`; Modify `backend/tests/test_team_auth_routes.py`, `pg_support.py`。

**Interfaces:**
- `AuthStore(storage, *, bootstrap_subs)`。既存OIDC・60/30/5分・opaque token hash・CSRF・Principal DTOを保持。
- `authenticate(token, *, now: float | Callable[[],float], touch=True)`。touchありはgate後にclockを解決。touchなしは短いread-only判定。
- `require_current_principal(tx: WriteTx, *, token_hash, operation) -> Principal`。確定直前のsession/role/disabledと元操作/逆操作の効果を再認可。
- middlewareは認証済cookieからhashを作り、内部専用の`RequestAuth(token_hash, operation)`をscope stateへ渡す。生token/hashをレスポンスやログへ出さない。Task 5はこれを閉じ込めたauthorize callbackをrepositoryへ渡す。callbackは受け取ったtxだけを使用し、再度mutex/transactionを取得しない。
- auth/編集のreplay照合はTask 3の両要求tableを同じwrite gate内で確認し、actor/request IDのnamespaceを分裂させない。

- [x] **Step 1: 認証再現試験を書く。**
  - `test_pg_last_admin_and_login_state_race`: 唯一writerを共有する同時要求でも有効adminが最低1人、同じstate消費は1回。
  - `test_pg_clock_sampled_after_writer_wait`: `assert clock_called_after_gate`; queued requestで誤失効せず、明示numeric逆行は拒否。
  - `test_pg_poll_does_not_touch_idle`: `assert last_seen_after == last_seen_before`; 60/30/5分の境界を既存値で検証。
  - `test_pg_request_id_cannot_cross_access_and_edit`: 同一actor同ID異操作は409、他actorへ応答を返さない。
- [x] **Step 2: RED。** `PGTEST tests/test_pg_auth_store.py tests/test_team_auth_routes.py -q` → storage constructor/PG transaction不足で失敗。
- [x] **Step 3: 実装。** AuthStore自身のschema作成を除きTask 3へ統一。共通writerを使用し、公開エラーへdriver例外を渡さない。Google署名/nonce/state/PKCE、broker固定endpoint、Cookie設定を変えない。
- [x] **Step 4: GREEN。** 上記＋`PGTEST tests/test_team_auth.py tests/test_team_google_transport.py -q` → 全成功。実秘密や実Google資格情報は使わない。
- [x] **Step 5: commit。** auth保存層・接続点・試験をcommit。

## Task 5: workspace・Undo・runtime/serverのPostgreSQL接続

**Files:** Modify `backend/app/team/workspace.py`, `history.py`, `runtime.py`, `config.py`, `middleware.py`, `backend/app/main.py`; Create `backend/app/team/server.py`, `backend/tests/test_pg_runtime.py`, `test_pg_workspace.py`; Modify `backend/tests/test_team_history.py`, `test_team_conflicts.py`, `test_team_workspace.py`, `pg_support.py`。

**Interfaces:**
- `TeamConfig.db: PgConfig | None`を追加。localはNoneでDB/driverを起動しない。teamはapp roleの設定を要求。
- `TeamRuntime.start()`はblob OS lock→storage writer lease→schema検査→shared repository/AuthStore/workspaceの順。失敗は全資源を解放。
- `TeamRuntime.fail_storage(kind)`は新規dataを503、候補破棄、fatal eventを一回発行。`serve_team()`がuvicornを終了させる。
- workspace/historyはTask 3/4のメソッドを消費し、直接connection/SQLを持たない。候補作成前にreadを閉じ、確定時に現在の認可を再確認。
- history/conflictsがimportする`test_team_workspace.Harness/harness`をこのTaskでPG storage・合成user/session・RequestAuthへ先に移植する。認証scope直入れだけで再認可を回避しない。Task 7は残るcaseと全体inventoryを扱う。

- [x] **Step 1: runtime/workspace試験を書く。**
  - `test_pg_lease_loss_fences_old_app`: `assert old_app_write.status_code == 503`; 第二appが異なるblob directoryでも同じDB leaseを取れない。
  - `test_pg_health_precedes_blocked_authenticated_request`: AnyIO worker limiterを1に制限し、そのworkerを実DBのgate待機で占有してからhealthを要求する。`assert order == ['health','authenticated']`。DBの観測・gate解放は独立executorから行い、共有limiterを使って試験自体をdeadlockさせない。eventで制御しtiming閾値に頼らず、finallyでlimiterを復元する。
  - `test_pg_demotion_during_candidate_denies_commit`: 準備後の停止/降格で403/401、`assert resources_and_audit == before`。
  - `test_pg_commit_reply_loss_replays_after_restart`: 確定後の通信断では成功を捏造せず、同IDで確定応答を回収し二重適用しない。
  - `test_local_mode_never_loads_pg_driver`: `assert pg_connect_calls == []`。
- [x] **Step 2: RED。** `PGTEST tests/test_pg_runtime.py tests/test_pg_workspace.py -q` → 未接続runtime/認可/終了連携で失敗。
- [x] **Step 3: 実装。** process lease・唯一のwrite接続・fatal終了を接続。storage busyは一時503、connection喪失はfatalと区別。候補blob→DB原子確定→cache/応答公開を維持。owner検査・storage待ちはthreadpoolへ、公開livenessはasync handlerとして共有workerを要求せず、DB問い合わせも追加しない。上記worker飽和条件はTask 9の再レビューでも検証する。
- [x] **Step 4: GREEN。** 上記＋`PGTEST tests/test_team_history.py tests/test_team_conflicts.py -q` → 全成功。他者Undo・再帰的Redo・降格後の削除/復元・複数基底・入力保持用409 DTOを確認。
- [x] **Step 5: commit。** runtime/server/workspaceのPG接続と試験をcommit。

## Task 6: localファイル移行・世代backup/restore・保守CLI

**Files:** Modify `backend/app/team/maintenance.py`, `runtime.py`, `pg_schema.py`, `rdf_codec.py`, `workspace.py`, `backend/app/main.py`, `scripts/team_workspace.py`; Create `backend/app/team/manage.py`, `pg_archive.py`, `maintenance_io.py`, `backend/tests/test_pg_maintenance.py`, `test_pg_archive.py`; Modify `backend/tests/test_team_maintenance.py`, `test_pg_runtime.py`。

**Interfaces:**
- `inspect_local(source)`, `migrate_local(storage, source, destination, *, dry_run=False)`, `backup(storage, blob_root, destination)`, `restore(storage, archive, destination)`。storageはmaintenance/backup専用role、Google/app secret不要。
- `python -m app.team.manage`に`init-schema`, `inspect-local`, `migrate --source --destination [--dry-run]`, `backup --blob-root --destination`, `restore --archive --destination`。source wrapperはこのmainへ委譲する。
- archive version1は`manifest.json`＋table別NDJSON＋`blobs/<sha256>`。schema version/fingerprint、table件数/hash、blob size/hashを記録。
- `team_schema`の固定metadataはmanifestへ保存し、復元先のschema行へ二重INSERTしない。業務8テーブルを保存し、restoreでsessions/login_attemptsも同じ未公開transaction内へINSERTしてFK/unique/CHECKを検証し、COMMIT前に両tableをDELETEして失効させる。失効対象だからという理由で制約検証を省略しない。
- `maintenance_io.py`は有限エラー・安全な通常file読取・hash付きコピー・fsync・行先公開/未完了markerを担当し、CLIやSQLを持たない。
- archive上限は行256 MiB、manifest 16 MiB、manifestを除くtable/blob合計64 GiB、全file 1,000,000件、各table 10,000,000行、JSON深さ1,000。超過・duplicate JSON key・NaN/Infinityを有限codeで拒否する。
- schema fingerprintは管理下のDDLだけ改行をLFへ統一して計算する。利用者のRDF・元file bytesは正規化しない。

- [x] **Step 1: 移行/復旧試験を書く。**
  - `test_pg_backup_keeps_single_snapshot_and_history_blobs`: 同時更新中でも同一世代。現資源とauditの`file:` payloadだけから参照を集め、履歴だけのblobを保持。
  - `test_pg_archive_preserves_opaque_json_and_bytes`: JSONの任意`blob`キーを参照と誤認しない。NUL escape、`001`、空白ノード、未知項目、CRLF bytesを完全保持。
  - `test_pg_restore_failure_never_publishes_destination`: `assert source_unchanged`; 新行先は未完了markerで起動拒否。途中/COMMIT応答不明でも成功を返さない。
  - `test_pg_restore_keeps_history_but_revokes_login`: `assert sessions == [] and attempts == []`; users/版/墓標/audit/replay一致、ID sequenceは最大IDの次以降。不正な失効対象sessionのFKも復元失敗にする。
  - `test_pg_migrate_rejects_opaque_old_store_without_opening`: 旧DB名のopaque bytesを入力し、読まず変更せず拒否。実SQLite fixtureは作らない。
  - `test_pg_archive_rejects_invalid_limits_and_json`: 各上限の直前/一致/超過、duplicate key、不正型、NaN、path/symlink、payload NULL墓標の不正識別子を拒否し、元archiveは変更しない。
  - `test_private_rdf_diagnostics_preserves_lexical`: 型付きliteralの不正lexicalも値は保持し、移行CLI/HTTP/codecのstdout/stderr/logへ原文を出さない。scope外の通常診断は保持する。
  - `test_schema_fingerprint_ignores_checkout_line_endings`: DDLのLF/CRLFで同じfingerprint、利用者のCRLF blobはbyte一致。
- [x] **Step 2: RED。** `PGTEST tests/test_pg_archive.py tests/test_pg_maintenance.py -q` → 旧backup API/新形式未対応で失敗。
- [x] **Step 3: 実装。** backupは単一read-only snapshotからstreamし、GCせずblobをhash確認して私有一時領域へコピー、完成時だけrename。restore/local移行は空DB・新blob volumeのみ。最初に`.team-import-incomplete`をfsyncして作成、全blobを最終行先へ先行確定後にSQLを一括commitし、既知成功と再検証の後だけmarkerを除去/fsyncして成功を返す。
  失敗/COMMIT不明ならmarkerを残してapp起動を拒否。自動resume・上書き・削除はしない。別の新規行先へやり直せるよう元archive/元dataを保持する。
  runtimeはmarkerと旧DBファイルをschema/service公開より前に検査し拒否する。故障注入でmarker残存先の実際の`TeamRuntime.start()`が失敗することを確認する。
  archiveのtable/columnは固定許可list、path/symlink/drive/stream/サイズ/深さ/hash/件数/schemaを検査し、入力SQLを実行しない。local移行は新しい`migration`操作だけを記録し、存在しない旧履歴を生成しない。
- [x] **Step 4: GREEN。** 上記＋`PGTEST tests/test_team_maintenance.py -q` → 全成功。既存destination・不正schema・欠損blob・不正path・失効を含め、CLI stdout/stderrに秘密/私有pathを出さない。
- [x] **Step 5: commit。** 保守/CLI/archiveと試験をcommit。SQLite用exporterや変換scriptは追加しない。

## Task 7: 全既存team試験の移植とSQLite利用経路の除去

**Files:** Modify `backend/tests/test_team_{config,repository,auth_store,auth_routes,runtime,access,workspace,history,conflicts,maintenance}.py`, `conftest.py`, `pg_support.py`, `pytest.ini`。
Create `backend/tests/test_no_sqlite_storage.py`, `test_pg_test_inventory.py`; Modify `scripts/check_publication.py`, `test_check_publication.py`。

**Interfaces:**
- `team_db` markerは実DBを使うcaseだけに付ける。純粋config/codec/Google署名/transport・local試験は残す。
- test DBはjobごとに専用、caseごとにmaintenance fixtureでschemaを再初期化、逐次実行。DB resetはtest fixtureだけでproduction CLIへ追加しない。
- `test_no_sqlite_storage`はAST import/alias/dynamic import・接続・専用SQLと配置設定を検出。禁止例は不活性なソース文字列、旧DB拒否fixtureはopaque bytesだけ。
- runtime検査はsubprocess audit hookで`sqlite3.connect`イベントを拒否する。SQLite moduleをimportしてmonkeypatchする方法は使わない。

- [x] **Step 1: 残存経路の検出試験を書く。** `assert product_sqlite_uses == []`、`assert test_sqlite_uses == []`、`assert expected_db_test_ids == collected_team_db_ids`。古いconstructor/path、SQLite専用故障注入、backup試験の移植漏れを列挙する。
- [x] **Step 2: RED。** `PGTEST tests/test_no_sqlite_storage.py tests/test_pg_test_inventory.py -q` → 未移植経路を実際に検出。
- [x] **Step 3: 全caseを移植。** `TeamRepository(Path)`/`AuthStore(Path)`と子processのSQLite初期化をstorage fixtureへ変更。schema破損・unique/index改変・disk backup故障はPG catalog/transaction/世代archive相当へ置換。case ID変更は一対一対応表へ記録し、無言削除・一括skip・SQLite互換fakeをしない。DB credential名/資格入りDSNも公開検査に追加。
- [x] **Step 4: GREEN。** `PGTEST tests -m "team_db and not network and not perf" -q`と`PGTEST tests -m "not team_db and not network and not perf" -q`、source guard・script試験 → 全成功。収集した2集合の和集合が全非perf/nonnetwork caseと一致することを確認。
- [x] **Step 5: commit。** 全移植と残存guard、case対応表をcommit。歴史文書/禁止文字列/未使用標準moduleの存在とSQLite実行を混同しない。

## Task 8: 製品Compose・実browser・CIを内部networkへ接続

**Files:** Modify `docker-compose.team.yml`, `Dockerfile`, `.env.example`, `.gitignore`, `.dockerignore`, `.github/workflows/ci.yml`。
Modify `backend/tests/team_browser_server.py`, `.claude/skills/run-semantic-viewer/{driver,p2}.mjs`, `backend/tests/conftest.py`。
Create `scripts/test_pg_compose_network.py`, `test_pg_compose_lifecycle.py`（test orchestrationのみ）。

**Interfaces:**
- 製品serviceは`db-config → db healthy → db-migrate current/成功 → semantic-studio-team`。appのcommandは`python -m app.team.server`。
- `db-config`はnetworkなし、`db`はinternalだけ、appは両network、maintenance/backup/restoreはprofileでinternalだけ。
- HBA生成/role初期化はTask 1の同じ実装を製品とtestで共有する。production appはapp secretだけ。4 roleのsecret重複拒否は本追補で追加した未完了項目としてこのTaskで実装・検証し、Task 1の過去の完了記録には含めない。
- browser fixtureは同じinternal networkのtest containerで実DBに接続。hostへpublishするのは合成HTTPS appのloopback endpointだけ。Chrome/CDPは既存driverが所有し、production imageに署名fixtureを入れない。
- hostのorchestrationだけがDocker CLIを使用する。containerへDocker socket/CAP_NET_ADMINをmount/追加しない。

- [x] **Step 1: 実境界と障害試験を書く。**
  - `test_pg_bootstrap_rejects_reused_or_invalid_passwords`: 4 roleの重複・空・複数行secretで初期化を拒否し、SQL実行前に停止する。実container UIDの読取可否も確認する。値は診断へ出さない。
  - `test_pg_compose_network_boundary`: inspectでDB port bindingなし/internalだけ。同networkのapp成功、hostと別networkの正しい合成credentialでもDB session拒否、別role/別DB拒否。
  - `test_pg_compose_restart_and_owner_loss`: DB再起動/lease切断で旧appが更新できず、app終了→再起動後にDNS再解決・永続data保持。
  - `test_pg_compose_backup_and_restore`: app稼働中backup→別Compose projectの空DB/volumeへrestore、過去履歴blobと失効を確認。元appと元sessionを生かしたまま検証し、元DB/元blobが不変、元sessionは引き続き有効、復元先sessionだけが失効したことを確認する。同一test DBのresetだけでこの受入条件を満たした扱いにしない。
  - browser P2で401/409/503の未送信入力、日英、2利用者CAS、再送、Undo、Shapes/model履歴、AX/Tabを実UIで確認。
- [x] **Step 2: RED。** `python -m unittest scripts.test_pg_compose_network scripts.test_pg_compose_lifecycle`とdriver P2 → 製品Compose未接続/fixture未移植を検出。
- [x] **Step 3: 製品・CIを接続。** app/DB/backup volumeを分離し秘密とdataをbuild contextから除外。host access拒否試験だけはhostからの接続試行を行い、成功を許容しない。固定DB IPではなくinspectで取得した現在IPを使う。DB外向き経路なし、app brokerの外向き経路ありを確認する。
  CIはLinux containerのPG統合3.12/3.14を必須化。Windowsはlocal/純粋logic/ファイル互換、job名・検証範囲を明示。frontend・Docker・publicationは維持。budgetsはlocal/PG双方の全perfとfrontendを実行し参考結果を残す。未分類caseで失敗する収集gateを追加する。
- [x] **Step 4: GREEN。** 上記2 unittest、`node .claude/skills/run-semantic-viewer/driver.mjs smoke`、`... p1`、`... p2`、実image notices/秘密検査 → 全成功。Compose起動・破棄は専用projectだけで行い、通常手順に`down -v`を入れない。
- [x] **Step 5: commit。** 製品Compose・CI・browser/境界試験をcommit。実Google/本番volume/実dataを使わない。

## Task 9: 全体検証・レビュー修正・文書・main向けPR

**Files:** Modify `README.md`, `CLAUDE.md`, `docs/known-state.md`, `docs/p2-{team-operations,user-guide,verification,review}.md`, 本計画と設計の状態。
Create `docs/p2-postgresql-verification.md`、case対応表`docs/p2-postgresql-test-inventory.md`。

**Interfaces:** 一つの検証記録に実際のimage/driver固定版、schema、test集合/件数、command、結果、reviewと修正を集約する。
実装前のSQLite試験数をPG成功数として再利用せず、旧SQLite設計/計画は履歴と明示する。

- [x] **Step 1: 設計全節と本計画を照合。** 下の対応表・Review Focus・変更fileを確認し、抜けた受入条件には再現試験を追加。
- [x] **Step 2: 全体検証。** backendの全非network caseを、nativeの`python -m pytest tests -m "not team_db and not network" -q`（全local/純粋logic/perf、通常倍率1）と`PGTEST tests -m "team_db and not network" -q`（全DB case、3.12/3.14）の互いに重ならない和集合として全成功させる。収集inventoryで全caseが含まれることを確認し、perfを除外しない。frontendの`npm run test -- --maxWorkers=2`、`npm run build`、契約生成check、scripts、source/image SQLite不使用、network/復旧/browser/通知/非公開値検査も全成功させる。Windows local集合はStep 5の最新PR CIで確認し、完了判定まで必須とする。
  性能超過があれば、同じimage・Python版・入力・実行条件で置換前commitと比較し、command/中央値/基準値/失敗数を記録する。旧版も超過することは回帰の調査材料であり、合格の代用にしない。閾値・標本数・データ件数・耐久性を維持し、原因と必要な修正を確認して失敗した全体gateを再実行する。CIの参考budgetsとlocalの必須全予算は別に判定し、未解決ならTask 9を未完了に保つ。
  以前の必須gateだった`PGTEST tests -q`は4時間予算で失敗した。その結果と同条件の旧版の4件超過を保持した上で、設計12節の全case・全予算とhost port非公開を両立するため、実行partitionを上記へ変更する。過去の必須gateを遡って成功や単なる補助測定とは扱わない。同じ4試験をnativeで成功させただけでは完了せず、上記の全集合を実行する。CIの実DB・Windows local・通常機能・参考budgetsの境界は維持する。
- [x] **Step 3: 独立した全差分の通常コード/静的securityレビュー。** 既存P2認可・SQL・秘密・外向き通信・lease・復元を含め、指摘を検証し、再現RED→修正GREEN。指摘が残らなくなるまで修正/再レビューを繰り返す。hosted scanと呼ぶのは実際に実行した場合だけ。
  履歴のMoreはページ取得が成功したときだけ次のoffsetを進め、失敗時は同じページを明示再試行する。読込中の連打は受け付けない。既存のnative buttonへTabで到達しEnter/Spaceで操作でき、focusはglobal `:focus-visible`で示す。読込中もfocusを失わないよう`aria-disabled`とhandlerの排他を併用し、履歴sectionの`aria-busy`で読込状態を支援技術へ伝える。owner変更時はページ状態を分離し、古い応答を表示しない。
- [x] **Step 4: 文書と状態を更新。** PostgreSQLの実際の起動/保守手順、secret permission、Windows coverage、唯一writer、DB再起動、拒否される旧DB入力、restore markerを記録。全既存性能予算の実測・差異を記録し、未検証の本番Google/配備を分ける。
- [x] **Step 5: commit/公開。** `feat/p2-team-workspace`のP2追加各commitとmetadataを非公開値リストで検査し、同branchだけpush、main宛て日本語PR #3を更新する。共有main・local backup refへ触れず、別の公開履歴を作らない。mainへmergeしない。

**最終完了gate：** 全stepの実施だけではTask 9を完了にしない。[PR #3](https://github.com/tosintech-web/semantic-studio/pull/3)の最新headで必須PG3.12/3.14・Linux local・Windows local・Compose/browser・frontend・Docker・publicationの成功と、参考budgetsの結果を確認して完了とする。CI状態はPRのchecksを正本とし、旧SQLite版や別headの成功を代用しない。完了を記録する文書commitによって新headになった場合も、その新headの確認を省略しない。

## 設計・受け入れ対応表

| 設計節 | 実装/検証Task |
| --- | --- |
| 1〜2：完全廃止・依存・モード | 1/2/5/7/9 |
| 3〜4：network・HBA・role・secrets・起動 | 1/2/5/8 |
| 5〜7：保存・SQL境界・transaction・clock・認可 | 2/3/4/5 |
| 8：単一所有権・DB再起動 | 2/5/8 |
| 9：旧DB拒否・localファイル移行 | 6/7/8 |
| 10：整合世代・履歴・失効・失敗した行先 | 6/8 |
| 11：503・ログ・耐久性・私有data | 1/2/5/6/8/9 |
| 12：全受入条件・Windows/PG matrix | 1〜9、特に7/8/9 |
| 13〜16：変更範囲・非目標・根拠・確認 | 全TaskのFiles/Global Constraints/本記録 |

## 計画の確認記録

初版作成時の計画レビューは製品実装ではなく、当時は全checkboxが未完了だった。現在のcheckboxと「実装の進捗」は後続工程の記録であり、本追補で完了判定を追加しない。
設計との対応、型/API名の一致、RED/GREEN順、内部networkだけで実行可能な検証command、SQLite例外なしを自己レビューする。
独立レビューで指摘された計画の不足を修正し、再レビューで指摘がなくなるまで繰り返す。
詳細な結果は計画書の末尾へ追記し、製品コード・依存・Compose実ファイルにはこの段階で変更を加えない。

### レビュー結果（2026-10-27）

- 自己レビュー：設計全16節と対応表を照合。必須authorize callbackと内部RequestAuthを同一WriteTxへ接続、table権限試験をTask 3へ配置、唯一writerを共有する競合試験へ整理、未完了markerのruntime起動拒否と試験をTask 6へ明記した。設計の`lookup_request`/`export_snapshot`も接続契約へ追加した。
- 独立レビュー第1回：Task 5の競合試験がTask 7まで未移植の共有Harnessへ依存する指摘1件。Harness/fixtureのPG・合成session・RequestAuth対応をTask 5へ前倒しした。
- 追加自己確認：lease切断の故障注入をappと同じroleのPID停止に限定し、superuser TCPやrunner内Dockerへの依存を除いた。
- 独立レビュー第2回：上記修正を再読して確認し、残る必須指摘なし。同一transaction認可、固定lease、実table権限、marker拒否、SQLite利用除去、network境界を再確認した。
- 文書検査：9 Task・45未完了step、相対リンク、公開内容の検査を実施。製品コードの変更、PG起動、依存追加、実データ移行は行っていない。本節は計画レビューの記録であり、将来の実装・試験の成功を示すものではない。

### 実装の進捗

Task 1：専用internal Compose上の設定/bootstrap 24件、配布通知の7試験、実配布imageのPython 42依存/native 13 package照合に成功。DBのport非公開・内部IPv4だけの参加・secret非出力も確認。driverはhash固定のpure psycopg 3.3.6とDebian libpq5 17.11を使用し、binary wheelを配布しない。依存導入に必要なDockerfileと通知generatorの変更はTask 1へ前倒しした。製品runtimeと旧team試験はまだSQLite版で、Task 2以降は未完了。

Task 2：固定DNS能力・hostaddr pin・単一write接続・DB lease/write gate・REPEATABLE READ read・有限障害変換を実装。設定/bootstrap/storage/network guardの46試験が成功。別read接続失敗時にmutex外でwriterを閉じる自己レビュー指摘をREDで再現し、実writerの所有権をmutex内で検査する修正後GREEN。未知の診断値も有限codeへ変換。製品runtime切替とrepository/auth/保守移植は未完了。

Task 3：9 table/46 columnのPG schema、read-onlyの厳密catalog照合、repositoryの資源・墓標・audit・replayと必須transaction認可を実装。catalog参照`backend/app/team/sql/001_initial.catalog.json`を固定DDLから生成し、版行だけの偽装や列/制約/index/ACLの違いを拒否する。全PG基盤＋RDF codec＋source guard 102件が成功。部分schemaを自動修復せず、operation group/版/確定応答は同じread snapshotから返す。旧constructorを使うauth/runtime/既存team fixtureは後続Taskで移植する途中段階。

Task 4：AuthStoreを共通PG writerへ移植。auth clockをgate後に取得し、pollはread-only、全更新/replayの現在session/role検査にRequestAuthと必須authorize callbackを提供する。`change_access`にもcallbackを必須とし、Task 5のworkspace接続で渡す。DB障害を認証失効と混同せず、全auth endpointでCookieを消さず503を返す。既存Google署名/nonce/state/PKCE・broker・Cookie契約を保ち、ここまでのPG基盤/認証/HTTP/Google/RDF/source guard 193件が成功。

Task 5：runtime/共有workspace/UndoをPGへ接続し、blob lockとDB lease、fatal後のserver終了、現在session/roleと元操作・逆操作の効果を同じWriteTxで再検査する。共有Harnessと再起動fixtureを実session/新writerへ移植し、SQLを業務層から除去。自己レビューでUndo再送時の降格をREDで再現して修正。対象50件、ここまでの全PG対象244件が成功（既存Starlette警告1件）。実HTTP listenerの終了、DB待機中のhealth応答、確定後の応答喪失注入と新writerでの再送回収を含む。保守CLI/全旧team fixture/製品Compose/CIの切替は未完了。

### 計画追補のレビュー（2026-10-27）

- 第1回（設計全節・受入条件）：4 roleのsecret重複検証、失効対象sessionの制約検査、独立した復元先と稼働中の元sessionの検証を具体化した。既存進捗と初版レビュー記録の時点を区別した。
- 第2回（API・責務・異常入力）：`render_hba`とoperation groupの型を現存の契約へ合わせ、保守IOの責務、archive上限、重複JSON key、不正literalのログ抑制、DDL改行の検証を明記した。
- 第3回（修正後の全節再照合）：設計16節、9 Taskの依存、RED/GREENと最終gate、SQLite例外なし、DB port非公開、元データ保持を再確認し、新規secret検証が完了済みTask 1へ混入していたため未完了のTask 8へ移し、実装済みと誤認しない形に修正した。これは自己レビューの結果であり、独立レビューや製品試験の成功を追加主張するものではない。
- この追補で変更するのは本計画書だけ。製品実装・container起動・実データ移行・GitHub公開は実行しない。

- 第4回（前回修正後の再レビュー）：追加要件の実施先と未完了表示を含めて再照合し、追加の修正事項なし。文書の相対リンク、9 Task/45 stepの構造、差分の空白、公開ポリシー検査を確認した。

Task 6：PostgreSQLの世代archive・空DBへの復元・localファイル移行・保守CLIを実装。全PG対象293件、最新CLIを含む再build後の対象103件、補助script42件が成功。型付きliteralの原文ログ、破損sessionの制約検証、未完了marker、DDLのcheckout改行を再現して修正した。稼働元を残す別Compose projectへの復元はTask 8で別途検証する。

Task 7：残るrepository/auth/runtime/access/config試験をPGへ移植し、製品・補助tool・testのSQLite import/専用SQLを除去。全試験に接続監査を適用し、旧2957 caseと現3080 caseの一対一対応・DB263 caseの分類を機械検査する。DB群263件、local/純粋logic群2774件（任意依存skip 1件）、最終変更対象48件、script44件が成功。性能予算は除外せずTask 9で全実行する。製品ComposeとCIはTask 8で切り替える。

Task 8：製品Composeを専用PG/internal network・role別secrets・schema job・server supervisorへ接続し、CIはPG3.12/3.14とWindows local群を明示。既存必須check名は全新必須jobを待つ集約gateとして維持した。実network/不正secret/UID/復元・再作成を検証し、DBの実IP変更後も新appが再解決して復帰。別DB復元後の再送・Undo/Redo・履歴blob・identityも成功。3.14実DB259件、最終接続/guard76件、smoke/P1/P2実HTTPSが成功。P1の通常中央値252.06ms（基準500ms）。CIの時間予算は参考jobへ分離し、通常の基準とdefault強制は維持。実GitHub CIの結果確認はTask 9で行う。

### 今回の計画レビュー・修正

- 第1回：設計7/8節の「公開healthがDB待機で止まらない」条件について、workerに空きがある試験だけでは不足するため、Task 5にworker飽和・独立したDB解放・limiter復元を明記した。既存Taskの完了checkboxは過去の実施記録として保持し、追加条件の検証は未完了のTask 9でも実施する。
- 第2回：設計12節と全体gateを照合し、性能超過のbaseline比較と合否を分けた。同じ環境の比較、変更してはいけない試験条件、全体gateの再実行、未解決時の未完了表示をTask 9へ追記した。
- 第3回：修正後の設計全16節、9 Task間の接続、5つのReview Focusと試験の対応、SQLite廃止の例外なし、network/秘密/復元の境界を自己再レビューし、追加の修正事項なし。今回の追加は計画書だけであり、既存の実装差分や試験結果を変更せず、実装完了も宣言しない。
