# P2 PostgreSQL置換の実装・検証記録

2026-10-27。対象はmain派生の`feat/p2-team-workspace`、置換実装の起点は`d112965`です。
Task 1〜8は実装・対象検証済み。最終全体試験・独立レビュー・GitHub最新headのCIは進行中です。
[実装計画](superpowers/plans/2026-10-27-p2-postgresql.md)のTask 9が完了するまで、公開工程の完了とは扱いません。

## 実装された契約

- 専用PostgreSQLだけを使い、SQLiteのimport/接続/専用SQL/互換reader/fixture/selectorを除去。
  旧DB名はopaque bytesのまま開かず拒否する。未使用のPython標準moduleの存在とは区別する。
- DBのhost port非公開、IPv4 internal bridgeだけ、共通IPAM/HBA/DNS検証、gateway/superuser TCP等の拒否。
- app/maintenance/backupのcredentialと権限を分離。4 roleの別password、実UIDのsecret読取、有限診断。
- DB lease接続を唯一writerとし、auth/共有更新を同じgateへ直列化。gate後のclock/current-role/要求ID/CAS検査。
- canonical JSON TEXT、墓標版、監査・要求応答の原子確定。COMMIT応答不明で成功を捏造せず再送記録で確認。
- blob先行確定、現在と履歴だけにあるblobを含む単一snapshot世代。restoreは別の空DB/volumeのみ。
  未完了markerを保持し、失効するsession行も制約検証してcommit前に削除する。
- localファイル移行は元bytes/RDFを保持し、localにない旧DB履歴を生成しない。元領域は不変。
- runtime喪失後は503とserver終了。Compose再起動で新DNS解決。localはDB不要、Windows利用も維持。
- 日英UI、401/409/503の入力保持、再送・Undo/Redo・Shapes/model履歴・AX/Tabを実ブラウザーで確認。

## 固定版と配布

| 対象 | 実装値 |
| --- | --- |
| PostgreSQL | `18.6-bookworm@sha256:bbf83594798e144bff365a9c191c5d779f181fb3135902064ab8ff11918020fc` |
| driver | hash固定pure `psycopg 3.3.6` wheel。psycopg-binary/ORMは追加しない |
| system libpq | Debian `libpq5=17.11-0+deb13u1` |
| schema | version 1、9 table/46 column。DDLと固定catalog参照を検査 |
| archive | version 1、manifest + 8業務tableのNDJSON + blob |

製品image buildで実物のPython 42依存/native 13 packageのversion/原文通知を照合する。
原MIT・第三者通知を維持し、新規native成分の原文と参照するGPL-3.0全文も配布する。
DB secret、実データ、世代archive、テスト生成keyはGit/build context/製品imageへ含めない。

## 検証環境と試験集合

DB試験は専用Compose runnerから接続し、CIでも5432を公開しない。既定CIDRがhost既存networkと
重複したため、手元の専用projectだけ`10.253.53.0/24`/`.1`へ共通入力を上書きした。
実境界試験は別の合成project/subnetを使う。通常停止はvolumeを保持する。

[機械inventory](p2-postgresql-test-inventory.json)は旧版全2957 caseの一対一対応と現行3082 caseを保持。
現行の実DB群は259 case。純粋DNS4 caseはdriver importなしにしてWindows互換群へ戻した。
[対応表と分類方針](p2-postgresql-test-inventory.md)を参照。試験削除・一括skip・予算緩和は行っていない。

`PGTEST`は次を表す。secretとproject/IPAMは検証専用の環境から与える。

```sh
docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest <引数>
```

| 検証 | 実行結果 |
| --- | --- |
| Task 7の全DB群（分類変更前） | 263 passed、3 warnings、205.25秒 |
| Task 7 local/純粋logic群 | 2774 passed、1 optional-lxml skipped、69 warnings、286.77秒 |
| Linux container Python 3.14の現行DB群 | 259 passed、3 warnings、187.97秒 |
| 最終設定/lease/server/分類/SQLite/HTTP guard | 76 passed、17.72秒 |
| native Python 3.14のDNS純粋logic（PGROOT入力あり） | 4 passed、9 deselected |
| 実Compose全受入 | 8 tests passed、85.347秒 |
| app broker取得とDB宛てIRI拒否を含むnetwork群 | 6 tests passed、36.330秒 |
| app secret fileなしbackup + 別DB復旧 | 2 tests passed、45.986秒 |
| 既存local smoke | 実API/Chromeの全step成功。graph screenshotを目視確認 |
| P1実Chrome | 全step成功、response-to-click中央値252.06ms（通常基準500ms） |
| P2実HTTPS/2 cookie context | 全step成功。実DB503・再起動を含めSQLite接続audit hook下で検証 |
| backend全体（予算込み）初回 | 3075 passed、4時間予算 failed、1 skipped、2 network deselected、729.03秒。閾値を維持して同条件の旧版比較を調査中 |
| frontend全体/型/build | 最終実行待ち。結果確認後に追記 |
| GitHub最新headの必須CI | push後に確認。Windows native team DB統合成功とは報告しない |

境界試験は、正しい合成credentialを同networkで確認した上でhost/別network拒否を検証する。
hostからはPostgreSQL StartupMessageがSCRAM開始前にHBA拒否されることを確認する。
DBの実IPを変える再作成では、旧IPを短時間のtest-only containerで占有し、新appのDNS再解決と
永続data/sessionの保持を確認した。製品のapp接続先を固定IPにする実装ではない。

復旧試験は元app/sessionを生かしたまま別project/DB/blob volumeへrestoreし、元の不変と
復元先だけの失効を確認する。資源・墓標・audit・users/roles・確定要求のhash一致後、
復元した要求のreplay、Undo/Redo、履歴blob、identity次値を実行して検証した。
単一test DBのresetだけで、この受入条件を満たした扱いにはしていない。

CIの`backend-linux`/`backend-windows`という既存必須check名は集約gateとして維持し、
Linux local + PG3.12/3.14 + Compose/browser、Windows local/pure/file群の成功をそれぞれ待つ。
backend/frontendの時間予算とP1 browser中央値は参考`budgets` jobへ分離する。既定localは倍率1、
CI budgetsは既存どおり倍率2。P1 blocking機能試験のreport-onlyは時間測定結果も出し、参考jobでは
同じ基準を強制する。判定分離の否定試験にだけ使った0.5msの合成値は性能実績として扱わない。

## レビューと未実施事項

自己レビューで、read接続失敗時のwriter閉鎖、Undo再送後の降格、復元時の失効対象FK、
duplicate JSON key、不正墓標path、private RDF警告、CRLF DDL fingerprint、secret重複、
初期化中の誤healthy、backup blob-root、server proxy/access log継承を再現して修正した。
独立した全差分レビューと静的securityレビューはTask 9で実施し、結果と修正をここへ追記する。

実Googleクライアント作成・本番ログイン、実データ移行、デプロイ、main mergeは実施しない。
local/P1/P2の合成受入成功を、本番配備済みという意味では使わない。
