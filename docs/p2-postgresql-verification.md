# P2 PostgreSQL置換の実装・検証記録

2026-10-27。対象はmain派生の`feat/p2-team-workspace`、置換実装の起点は`d112965`です。
実装・手元の全試験集合・独立レビュー修正と再レビュー・指定branchへのpush・日本語PR更新を実施しました。
最新CIの状態は[PR #3のchecks](https://github.com/tosintech-web/semantic-studio/pull/3/checks)を正本とし、実際に全gateを確認するまで完了としません。
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
| Python runtime base | `3.12-slim@sha256:a0f57064cbdcd6285fa45f51237ab0b35ea8ebaed06a1f5973e89e19dfb86704` |
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
| 以前の必須gate：containerでのbackend全体（予算込み） | 3075 passed、4時間予算 failed、1 skipped、2 network deselected、729.03秒。下記の同条件旧版比較・partition変更を記録 |
| 同じ4時間予算のnative Python 3.14測定 | 4 passed、1 warning、54.61秒。全体成功の代用とはせず、下記の最終全集合検証を実行 |
| native全非DB群（全時間予算、倍率1） | 2820 passed、1 optional-lxml skipped、261 deselected（DB259 + network2）、69 warnings、382.47秒 |
| 最終全DB群（内部network、Python 3.12） | 259 passed、2823 deselected、3 warnings、198.81秒 |
| 最終全DB群（内部network、Python 3.14） | 259 passed、2823 deselected、3 warnings、208.73秒 |
| 補助script最終検証 | 52 tests、47 passed、5 explicit Compose opt-in skipped、13.880秒。実Compose受入は上記8件で別途検証 |
| frontend全体/型/build | 135 files・2551 tests passed、111.41秒。TypeScript/Vite build成功 |
| GitHub最新headの必須CI | [PR #3のchecks](https://github.com/tosintech-web/semantic-studio/pull/3/checks)で最新headを確認する。下記の過去runの失敗や成功は代用しない。Windows native team DB統合成功とは報告しない |

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

### 時間予算の環境比較と最終gate

公式containerのPython 3.12で失敗したのは、canvas union attributes（150ms）、2 snapshotの
推論（8000ms）、6000結論のfilter/group/explain（300ms）、2 snapshotのopen（1000ms）の4件。
同じimage・依存版・入力の置換前`d112965`でも4件とも超過した（順に157.8/10386.58/348.13/1040.55ms）。
置換後の同条件再測定はcanvasが成功し、残る3件は10312.29/355.92/1058.01msだった。
container Python 3.14でも4件が超過した。一方、既存native Python 3.14では4件とも通常倍率1で成功した。
このcontainer全体実行は当初の必須gateであり、失敗した事実を保持する。下記の実行partitionへ変更するが、
過去の必須gateを成功や単なる補助測定と呼び替えない。

推論workerではnamed graph管理の負荷を計測し、SimpleMemoryの候補で中央値8769msまで改善したが、
8000msに届かず候補は撤回した。GC計測も方針変更を裏付けず、推論コード・GC動作は変更していない。
閾値、標本数、データ件数、永続化の耐久性は変更していない。

正式な最終backend検証は、nativeの全`not team_db and not network`（全perf込み、倍率1）と、
内部networkの全`team_db and not network`（Python 3.12/3.14）の和集合とする。
単なる問題4件の再実行や一部試験の成功で済ませず、機械inventoryで全caseを照合する。
これにより既存local/nativeの時間予算と、host DB portを開かない実DB検証を両立する。
公式containerでの倍率1の時間予算は上記の失敗として残し、CIの参考budgetsは既存どおり倍率2で判定する。
native/Compose 3.12/Compose 3.14からそれぞれ全件を再収集し、3082 case IDと259 DB IDが
機械inventoryと完全一致した。正式な和集合はnative2821（成功2820 + 任意依存skip1）＋DB259で、
外部networkの2件を明示除外する。全時間予算を含み、試験の削除・一括skipはしていない。

最終製品imageは`sha256:ebdd57dd31a601a3b8305063c514ce8d8e922e10df28ee19d4117c236857734d`。
networkなしの一時containerでapp全107 fileのSHA-256 manifestを取り、SQLite不使用を検証した
レビュー済みsourceとbyte単位の一致を確認した。buildには実依存・原文通知検証も含む。

## レビューと未実施事項

自己レビューで、read接続失敗時のwriter閉鎖、Undo再送後の降格、復元時の失効対象FK、
duplicate JSON key、不正墓標path、private RDF警告、CRLF DDL fingerprint、secret重複、
初期化中の誤healthy、backup blob-root、server proxy/access log継承を再現して修正した。
独立した全差分コード/静的securityレビューの指摘と修正結果は次のとおり。

独立レビュー第1回（`c3c00a0..b85a742`）で、同期health handlerが認証DB待機と同じAnyIO workerを
要求するため、worker飽和時にlivenessも停止する指摘を受けた。実DB gate待機とlimiter 1でREDを確認し、
handlerをasyncへ変更した。DB観測・解放は独立executorから行い、limiterはfinallyで復元する。
修正後の関連72件が成功（35.41秒）、同じ実DB回帰試験の再実行も成功（1.71秒）。
新しいcontextの独立レビュー第2回（`c3c00a0..5dff3ce`）では、追加のCritical/Important/Minor指摘なし。
通常コードと静的securityの確認であり、hosted scanや動的攻撃試験の成功という意味ではない。
全試験・性能受入・最新headのCIは別の必須gateとして完了まで維持する。

初回[CI run 40409187989](https://github.com/tosintech-web/semantic-studio/actions/runs/40409187989)は
job作成前に失敗した。`jobs.<id>.env`で利用できない`runner.temp`をPostgreSQLとbudgetsの
2箇所で参照していた。公式releaseのSHA-256を照合したactionlint 1.7.12で同じ2エラーを再現し、
実行step内の`RUNNER_TEMP`から`GITHUB_ENV`へsecret directoryを設定する形へ修正した。
修正後actionlintと、空白を含むpathでの両Bash stepの実行検査が成功した。製品の依存は追加していない。

次の[CI run 40409773850](https://github.com/tosintech-web/semantic-studio/actions/runs/40409773850)では
両PG版・Linux local・Windows local・frontend・publicationが成功した一方、DockerとComposeは
native通知検査で停止した。mutableなPython base tagの更新により、`libssl3t64`が手元cacheの
`3.5.7-1~deb13u2`からCIの`3.5.7-1~deb13u3`へ変わっていた。
CIと同じ公式base digestで同じlibpqを実際に導入し、全13 native package名と全原文hashを照合した。
差はこのrevisionだけで、原文bytesはすべて同一。台帳をu3へ更新し、製品baseを上記digestへ固定して
配布通知検証を通す再buildに成功した。検査の省略・許可範囲の緩和はしていない。
この固定はruntime baseのtag変動を防ぐもので、APTやfrontend baseまで不変にするものではない。
将来の未知のnative版・原文変更は引き続きbuildを失敗させ、再レビューを要求する。

実Googleクライアント作成・本番ログイン、実データ移行、デプロイ、main mergeは実施しない。
local/P1/P2の合成受入成功を、本番配備済みという意味では使わない。
