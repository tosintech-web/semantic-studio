# PostgreSQL置換の試験対応表

旧版 `d112965` の全2957 caseを、実行せず収集したIDで固定する。
[機械検査用inventory](p2-postgresql-test-inventory.json)の `previous_cases` が一対一の対応表、
`cases` が現行の全収集ID、`team_db` が内部PostgreSQLを必要とする集合である。
`test_pg_test_inventory.py` は毎回全件を再収集して照合する。
新しいcaseの追加・分類変更時は、このinventoryをレビューして更新する。

| 旧case名 | 置換後 | 保持する検証意図 |
| --- | --- | --- |
| `test_sqlite_writer_wait_cannot_block_public_health` | `test_postgresql_writer_wait_cannot_block_public_health` | DB gate待機中も公開healthが先に応答 |
| `test_separate_connections_concurrent_compare_and_swap` | `test_shared_writer_concurrent_compare_and_swap` | 2要求のCAS一勝一敗・監査と要求の重複なし |
| `test_sqlite_failure_rolls_back_data_audit_and_replay` | `test_storage_failure_rolls_back_data_audit_and_replay` | 制約例外で全資源・監査・要求記録をrollback |

上記以外の旧case IDは同一名で保持する。SQLite固有の不正rowid/primary key順を検査していた
`audit_desc_pk` は、PostgreSQLではaudit IDのidentityが欠落したschemaとして再現する。
`future/unversioned/incomplete` は同じPG schema metadataの不正version/欠落/不完全tableを検査する。
旧backupの整合性は世代archiveで再現し、旧auth schema版は共通`team_schema`で検査する。

2 repository/AuthStoreは同じ唯一writerを共有する。独立した接続のgate競合・lease排他は
`test_pg_storage.py` と `test_pg_auth_store.py` で実PostgreSQLを用いて追加検証する。
再起動を示すcaseは旧writerをcloseして新しい接続・leaseを取得し、キャッシュの再生成だけで代替しない。

DB fixtureを必要とするcaseだけに `team_db` を付ける。fixture closureの `pg_schema` から
間接依存も分類する。純粋logic/local/codec/Google署名等を一括除外しない。
Linux containerの3.12/3.14は実DB、Windows nativeは `not team_db` の互換試験を担当する。
通常の実行でnetwork試験は除外するが、inventory収集ではnetwork/perfを含む全件を固定する。

保守の単一DBリセットによるunit復元試験は、元appを稼働させた別Compose projectへの
復元試験の代替ではない。後者の受入証跡はTask 8/9で別途記録する。

Task 8の分類レビューで、DBを使わないDNS拒否/期限の4 caseをlibpq importなしへ整理し、Windowsの純粋logic群へ戻した。server起動設定と分類退行の2 caseを追加し、現行は3082 case（実DB259 case）。旧2957 caseの対応は保持している。

## 全集合の実行

local/純粋logicは通常のnative開発環境で、時間予算も含めて実行する。

```sh
cd backend
python -m pytest tests -m "not team_db and not network" -q
```

DB群はLinux上のrepository rootから、専用Compose projectで実行する。次のsubnet/gatewayは
例示であり、hostの既存networkと重複しないRFC1918範囲へ両方を合わせる。実データをmountせず、
secret生成helperは既存fileを自動更新しない。DBはhostへ公開しない。

```sh
export COMPOSE_PROJECT_NAME="ss-pg-tests-$(date +%s)"
export TEAM_TEST_SECRETS_DIR="$(mktemp -d /tmp/semantic-studio-pg-tests.XXXXXX)"
export TEAM_DB_SUBNET=10.253.53.0/24
export TEAM_DB_GATEWAY=10.253.53.1
python backend/tests/pg_support.py --init-secrets "$TEAM_TEST_SECRETS_DIR"
PYTHON_VERSION=3.12 docker compose -f docker-compose.postgresql-test.yml build pg-tests
PYTHON_VERSION=3.12 docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest tests -m "team_db and not network" -q -o cache_dir=/tmp/pytest-cache
PYTHON_VERSION=3.14 docker compose -f docker-compose.postgresql-test.yml build pg-tests
PYTHON_VERSION=3.14 docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest tests -m "team_db and not network" -q -o cache_dir=/tmp/pytest-cache
docker compose -f docker-compose.postgresql-test.yml down
```

両集合の和が全非network caseで、重複はない。`test_pg_test_inventory.py`の再収集照合も省略しない。
`not perf`は付けず、nativeの倍率1・標本数・データ件数・閾値を維持する。
Windows互換集合はCIのnative Windows jobで検証し、team DB群のWindows native成功とは呼ばない。
通常停止はvolumeを保持する。再利用する場合は同じproject名・secret file・IPAM設定を保持する。
