# P3 Local Releases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Delegation is not selected by this plan.

**Goal:** ローカルDockerで確認済みの辞書版を作成・配布し、独立した利用サンプルが編集app/DB停止中も指定版を参照できるようにする。

**Architecture:** P2のPostgreSQL resources/audit/replayと不変blobへ承認済みpackageを保存する。認証済みdownloadからローカル運用者が独立配布volumeへimportし、読取専用HTTPと利用側を別networkで動かす。DB commitと配布volume更新を一つのtransactionに見せない。

**Tech Stack:** 既存React 18 / TypeScript / FastAPI / rdflib / psycopg / Docker Compose、Python標準zipfile/hashlib。新runtime依存なし。

**Spec:** [P3ローカル公開版設計](../specs/2026-10-27-p3-local-releases-design.md)（レビュー用具体案、未実装）。

状態：2026-10-27、方針変更を受けて新規作成。既存のP3詳細計画は存在しなかったため、上位仕様を具体化したもの。
P1/P2はmain統合済み。P2の本番配備は本計画の依存にしない。全checkboxは未実施。
実装開始前に設計案のprofile・承認権限・配布契約を確認する。本書作成は製品実装の開始を意味しない。

## Global Constraints

- ローカルDockerで開発・受け入れ。本番サーバー、クラウド契約、実Google/実データは不要。
- team版のP2認証・session・Origin/CSRF・CAS・監査・再送・commit内の現在権限検査を維持。localへfallbackしない。
- DB port非公開、配布/利用側をDB networkから隔離。配布にprivate volume・secretを渡さない。
- 初期対象はProjectのmodel正本だけ。imports/shapes/snapshot/推論/Libraryは対象外。
- `dictionary-v1` の許可述語・RDF値保持・ZIP 5 entry・JSON型・API status・サイズ上限は設計4〜6節を契約とする。
- editor/adminがpreview、adminだけがapprove、viewer以上が承認済みdownload。previewに承認を偽装しない。
- 公開版は一般公開の承認ではない。受け入れは合成データのみ、実組織/タグデータをcommit/image/成果物に含めない。
- UIは日英カタログ、サーバーはcode/uiMessage、入力保持・owner identityを維持。
- source header/コメント、SELECT-only、raw HTML禁止、broker、依存・通知・公開検査はCLAUDEを継承。
- 既存の通常倍率1の性能予算、全native非DB群と内部Compose DB群3.12/3.14、frontend/build/実browserと最新head CIを維持。

## Review Focus

1. プレビュー後に別の人がmodelを変更：409で再確認。古いgraphやSave済み原本を承認しない。（Task 2/3/4）
2. 許可述語の値にも非公開情報が入る：全出力をレビュー可能にし、許可リストだけを公開許諾と扱わない。（Task 1/4）
3. DB成功後の応答喪失と降格再送：同一blob/IDを再取得し、現在の権限は再検査する。（Task 2/3）
4. 新namespaceが通常編集/Undo/backupで消える：不変版を保持し、restoreでも全blobを照合する。（Task 2）
5. 配布途中の停止・不正ZIP・利用側cache：旧currentを維持し、編集系停止後に新規利用側から参照する。（Task 5/6/7）

## ファイルと実装境界

新規 `backend/app/releases/` を設け、`profile.py`（抽出規則）、`package.py`（DTO/bytes生成・検証）、
`service.py`（承認・保存）、`http.py`（team専用HTTP adapter）、`distribution.py`（ローカルimport/activate）、
`server.py`（読取HTTP）へ分ける。`__init__.py`を含め各sourceは構造化headerを持つ。
新規consumerは `examples/release-consumer/`。本番アプリにdemo認証やconsumerのHTTP取得を混ぜない。
既存team dispatcher・Candidate・archive・Undoを変えるTask 2/3を先に完了させ、UI・Dockerから仮APIへ接続しない。

## Task 1: 公開profile・型付きJSON・packageの純粋処理

**Files:** Create `backend/app/releases/{__init__,profile,package}.py`, `backend/tests/test_release_package.py`。

**Interfaces:**
- `project_graph(graph: Graph) -> Projection`。Projectionはgraph、entity_count、statement_count、excluded_by_reasonを保持する。
- `build_package(projection: Projection, *, release_id: str, created_at: str, metadata: dict, approved: bool) -> bytes`。
- `validate_package(data: bytes, *, require_approved: bool = True) -> ValidatedPackage`。検証済みmanifestと固定5 entryのbytesを返す。
- `preview_digest(projection: Projection, *, metadata: dict, basis: dict) -> str`。profile版を含む安定表現からSHA-256。
- package内のbytes/hashはmanifest以外の4 entryに対し計算し、manifest自身の循環hashを設けない。

- [ ] **Step 1: RED用試験を書く。** `test_only_allowed_own_model_statements`、`test_literal_lexical_language_datatype_roundtrip`、`test_same_label_different_iri`、`test_private_metadata_absent_from_all_entries`、`test_preview_cannot_be_imported`、`test_limits_refuse_without_partial_package`。未知述語、内部comment/raw JSON、blank-node、参照先IRI、長い日本語/HTML風literalを合成する。
- [ ] **Step 2: RED確認。** `cd backend && python -m pytest tests/test_release_package.py -q`。未実装のimport/契約が原因で失敗することを確認。
- [ ] **Step 3: 実装。** profileは設計4節の一つの定数、graphをcloneして抽出。JSONはIRI順・statement安定順。URI/literalの別とlexicalを保持する。上限を事前・生成中とも強制し、preview digestとpackage bytesを再計算可能にする。
- [ ] **Step 4: GREEN確認。** 同じcommandで全成功。出力を再parseし、公開graphの集合とJSONのstatement集合が一致することを確認。
- [ ] **Step 5: commit。** 本Taskの新規fileだけをstageし、`feat: define reviewed dictionary release packages`。

## Task 2: P2 transactionへの不変release保存・復旧・Undo境界

**Files:** Create `backend/app/releases/service.py`, `backend/tests/test_team_releases.py`。
Modify `backend/app/team/{workspace,history,pg_archive}.py`。
Test `backend/tests/test_team_maintenance.py`, `backend/tests/test_pg_archive.py`, `backend/tests/test_team_history.py`。

**Interfaces:**
- `ReleaseService(repository: TeamRepository, blobs: BlobStore)`。
- `preview(*, project_id: str, metadata: dict) -> dict`：snapshotのresources/versionsからCandidateでmodelを復元し、metadata/profile/basis/digestとpreview packageを作る。DBは変更しない。
- `approve(*, actor: str, project_id: str, metadata: dict, preview_digest: str, expected: dict, request_id: str, identity: dict, authorize: Callable, response_factory: Callable[[dict, dict], dict]) -> dict`。
- `list_releases(*, project_id: str, offset: int, limit: int) -> dict`、`read_package(*, project_id: str, release_id: str) -> bytes`。
- approveは `release:{rid}` と `workspace={"kind":"workspace"}` を同じchangesで確定する。新ridのexpected=Noneを追加し、既存expected全体を保持する。
- response_factoryはsummaryとcommit後の予測versionsから既存 `TeamWorkspace._response` 形式（status/headers/base64 body）を作る。commitへこのenvelopeを保存し、approveは `commit_result["response"]` を返す。初回も再送も同じenvelopeを既存 `_send` で送信する。API summaryだけやStarlette Responseをrequestsへ保存しない。
- 保存型は設計6節の `release:{rid}` payload。`packageBlob`参照抽出・型検証をarchiveへ明示追加する。

- [ ] **Step 1: RED用実DB試験。** `test_approve_uses_committed_unsaved_model`、`test_stale_preview_conflicts`、`test_replay_after_lost_response_has_one_release_and_audit`、`test_demoted_admin_cannot_replay`、`test_ordinary_edit_and_undo_preserve_release`、`test_approval_cannot_be_undone_even_by_admin`、`test_project_deletion_keeps_release_downloadable`、`test_release_backup_restore_keeps_history_blobs`。失敗commit後の孤立blobは配布・一覧へ出ないことも確認。
- [ ] **Step 2: RED確認。** 専用internal Compose runnerで `python -m pytest tests/test_team_releases.py -m 'team_db and not network' -q`。接続不能をREDの代わりにしない。
- [ ] **Step 3: 実装。** snapshotから候補を復元し、既存 `TeamRepository.commit` の `authorize` とexpected mapでbasisを確定。blob先行、release/監査/再送を原子commit。既存IDの上書き・削除を拒否する。通常workspace差分のfile:/graph:/state:フィルターを維持し、Candidate.captureからreleaseを更新・削除しない。承認操作に対するUndoはadminも含め拒否し、UIのcanUndoにも反映する。承認以前の履歴を遡る新しいUndoは作らない。archiveは現在とaudit双方のpayloadを型検証しblob参照へ加える。
- [ ] **Step 4: GREEN確認。** 上記実DB試験を3.12/3.14で成功させ、既存Undo/再送/backup/restoreの関連集合も成功。旧archive・新releaseありarchiveの別DB復元後にpackage bytesと監査を照合する。
- [ ] **Step 5: commit。** `feat: persist immutable dictionary releases with team transactions`。

## Task 3: team専用HTTP・権限・容量・再送契約

**Files:** Create `backend/app/releases/http.py`, `backend/tests/test_release_http.py`。
Modify `backend/app/team/{permissions,workspace}.py`, `backend/app/main.py`, `backend/app/messages.py`。

**Interfaces:**
- `dispatch_release_request(service: ReleaseService, *, scope: dict, body: bytes, expected: dict, request_id: str | None, identity: dict | None, authorize: Callable) -> dict`（既存workspace response envelope）。
- `TeamWorkspace._request`が既存header/body/sessionを検証した後、一般Candidate/captureへ入る前にrelease用pathだけをdispatchする。commitはTask 2だけが所有する。http adapterはTask 2へresponse_factoryを渡し、preview/GETも同じenvelopeへ変換する。
- previewは新しい明示policy `preview_release`（editor/admin、shared_update=False）、approveはadmin/shared_update=True、GETはread。
  `allows`、`RoutePolicy.minimum_role`、`AuthStore.require_current_principal`とのoperation連携も検査する。
- 設計5節の4 API。preview JSON応答はpackage download用のbase64 fieldを含め、browserでblob化する。50 MiB ZIPに対するbase64膨張も含めメモリ計測する。

- [ ] **Step 1: RED用HTTP試験。** role matrix、viewer preview拒否、local 404、未知path、HEAD、他projectのrid、CSRF/Origin、欠落version/request-id、不正body/64 KiB超過、401/409/413/422/428/503、再送の同じ応答と降格拒否を作る。
- [ ] **Step 2: RED確認。** 専用Compose runnerで `python -m pytest tests/test_release_http.py -m 'team_db and not network' -q`。local/pureのケースにはteam_dbを付けずnativeでも実行。
- [ ] **Step 3: 実装。** 薄いHTTP adapterをworkspaceへ接続、Task 2へ委譲。preview/readも現在権限を検査。既存compute/readの意味を変えず、例外は有限code/uiMessageへ変換。preview/approveだけは現存projectを確認する。一覧/downloadは削除後もreleaseのprojectIdで照合する。package responseはattachment/no-store。
- [ ] **Step 4: GREEN確認。** role matrixと既存のroute inventory/default-deny試験が成功。preview/downloadが辞書resources・release・業務auditを変更しないことを比較する。既存認証のsession touchは許容する。
- [ ] **Step 5: commit。** `feat: expose authorized release review and downloads`。

## Task 4: 日英レビューUI・承認済み版一覧

**Files:** Create `frontend/src/releases/ReleasePanel.tsx`, `frontend/src/releases/ReleasePanel.test.tsx`。
Modify `frontend/src/App.tsx`, `frontend/src/api.ts`、`frontend/src/components/ProjectHeader.tsx`、
`frontend/src/i18n/{ja,en,types}.ts`、必要な既存server message契約生成出力。

**Interfaces:**
- api.tsに `previewRelease(projectId, metadata)`、`approveRelease(projectId, metadata, previewDigest)`、`listReleases(projectId, offset, limit)`、`downloadRelease(projectId, releaseId)`。既存session/CSRF/CAS/request-ID transportへ統合する。
- `ReleasePanel({ projectId, role, onClose })`。metadata入力、preview digest/basis、全出力download、承認、一覧、package downloadを保持。
- preview/approveはUI owner（project/session）を固定し、metadata変更時は旧digestを無効にする。配布currentを推測しない。

- [ ] **Step 1: RED用UI試験。** role別操作、全出力確認、metadata変更後の承認不可、401/409/503入力保持、旧project/sessionの遅延応答破棄、日英切替で再承認しない、一覧失敗時にoffsetを進めないことをvi.mock apiで再現する。
- [ ] **Step 2: RED確認。** `cd frontend && npx vitest run src/releases/ReleasePanel.test.tsx`。既存jsdom patternを使う。
- [ ] **Step 3: 実装。** Project header入口と通常dialog/table/button。P1カタログ・通知・原文詳細を再利用。承認済みと配布済みを分け、成功だけを表示する。
- [ ] **Step 4: GREEN確認。** 上記component試験とi18n key/arg/contract check、本番build成功。browserでTab/Enter・focus復帰・AX・日英を確認するためのシナリオをTask 7 driverへ追加。
- [ ] **Step 5: commit。** `feat: add bilingual dictionary release review`。

## Task 5: ローカルpackage import・atomic activate・読取HTTP

**Files:** Create `backend/app/releases/{distribution,server}.py`, `backend/tests/test_release_distribution.py`。

**Interfaces:**
- `import_package(package_path: Path, root: Path) -> dict`：Task 1 validatorを使い不変版directoryを作る。
- `activate_release(root: Path, release_id: str) -> dict`：検証済み版へcurrentをatomic replace。
- `distribution.main(argv: list[str] | None = None) -> int`：設計6節の3 subcommand。`--root`を必須にする。
- `create_distribution_app(root: Path) -> FastAPI`：設計6節の固定read pathだけ。FastAPI既存runtimeを使う。
- `server.main(argv: list[str] | None = None) -> int` は `--root` 必須、`--host`/`--port`を受け、uvicornで上記appを起動する。Composeは `python -m app.releases.server --root /releases --host 0.0.0.0 --port 8080` を使う。

- [ ] **Step 1: RED用試験。** 正常import→activate、import単体でcurrent不変、同ID異bytes、preview、ZIP traversal/symlink/重複/余分entry、hash偽装、圧縮爆弾、容量不足・fsync/rename失敗・途中停止、競合activate、receipt記録失敗、v1→v2→v1、再起動を試験する。
- [ ] **Step 2: RED確認。** `cd backend && python -m pytest tests/test_release_distribution.py -m 'not team_db and not network' -q`。
- [ ] **Step 3: 実装。** stage検証後に不変directoryを確定。配布rootで単一writer lockを取得してimport/activateを直列化する。private receiptとcurrentを照合可能にし、commit成功の推定をしない。HTTPはGET/HEAD固定、path安全性・ETag・current no-store・405を実装する。
- [ ] **Step 4: GREEN確認。** 同command全成功。公開HTTPにreceipt/stage/private manifest/pathが出ないこと、壊れたpackageを拒否して旧currentを返すことを確認。
- [ ] **Step 5: commit。** `feat: import and serve independent release generations`。

## Task 6: Docker分離と版を固定する利用側サンプル

**Files:** Create `docker-compose.releases.yml`, `examples/release-consumer/{app.py,index.html,README.md}`,
`backend/tests/test_release_consumer.py`, `scripts/test_release_compose.py`。
Modify `CLAUDE.md`（独立consumer専用transportの適用範囲を明記）。
Modify `.dockerignore` と `scripts/check_publication.py` は新しい出力・receiptの除外が必要な場合だけ。

**Interfaces:**
- Composeは既存team構成へのoverlay。distribution/consumer/import jobを追加し、DB接続やsecretを継承させない。
- distributionはTask 5のserver.main、CLIは `python -m app.releases.distribution`。
- 既存Dockerfileの `COPY examples ./examples` を再利用する。consumerは `python /app/examples/release-consumer/app.py` をcommandにし、同fileのmainでuvicornを0.0.0.0:8081へ起動する。アプリ製品のapp.mainやGoogle設定を初期化しない。
- consumer設定 `RELEASE_ORIGIN`（Composeで固定する配布HTTP origin）、`RELEASE_ID`（必須UUID）。任意URL入力は受け付けない。
- `load_release(origin: str, release_id: str) -> dict` はtimeout・サイズ上限・hash検証後に一版を採用する。
  標準urllibでredirect禁止、環境proxyを使わず固定originの固定pathだけを取得。これは独立demo専用で製品brokerを迂回させない。

- [ ] **Step 1: RED用試験。** 同名IRI別件、名称の日本語部分一致、manifest/data hash不一致、新版取得失敗で旧版維持、初回失敗、指定版固定、意図しないredirect拒否をconsumerで再現。ComposeでDB port/volume/network分離をassertする。
- [ ] **Step 2: RED確認。** nativeのconsumer試験と `python -m unittest discover -s scripts -p 'test_release_compose.py'`。Docker実動作は専用projectのみを使うopt-in試験として失敗を確認。
- [ ] **Step 3: 実装。** 新規依存なしの最小検索/詳細UI。配布volume永続化、HTTPはread-only mount、import jobだけwrite、host portはloopback。receipt/package入力はGit/build contextから除外する。
- [ ] **Step 4: GREEN確認。** dedicated Composeで起動・import/activate・新規consumer読取・再起動を実行。編集app/DBを停止してconsumerを再作成し、manifest/dataのnetwork取得と検索を確認する。volume/mount/network/imageの実物にsecretがないことを検査。
- [ ] **Step 5: commit。** `feat: demonstrate pinned releases in isolated local containers`。

## Task 7: 全体受け入れ・レビュー・運用文書・CI

**Files:** Create `.claude/skills/run-semantic-viewer/p3.mjs`, `docs/p3-{user-guide,local-operations,verification}.md`。
Modify `.claude/skills/run-semantic-viewer/driver.mjs`, `.github/workflows/ci.yml`, `README.md`,
本計画、本設計、全体仕様。新規load-bearing ruleがあれば `CLAUDE.md` / `docs/known-state.md`。

**Interfaces:** `node .claude/skills/run-semantic-viewer/driver.mjs p3` が合成HTTPS認証の3権限、実DB、配布containerと利用側を検証し、private成果物は一時領域へ書く。

- [ ] **Step 1: E2E試験を接続。** 設計8節の10条件を番号で追跡。v1承認・download・import・activate、model変更後v1不変、stale preview拒否、v2承認、配布切り替え・切り戻し、編集系停止後の新規consumer読取、401/409/503とAX/keyboardを実行する。
- [ ] **Step 2: 全試験集合を確認。** backend nativeで `python -m pytest tests -m 'not team_db and not network' -q`、専用内部Composeで全 `team_db and not network` をPython3.12/3.14、frontendで `npm run test` / `npm run build`。既存inventoryと新規case分類を照合し全case/全予算を維持する。
- [ ] **Step 3: 実物・既存browserを確認。** `smoke` / `p1` / `p2` / `p3`、distribution通知、公開検査、Compose isolation/restore、契約生成checkを実行。計測条件と失敗は検証書へ記録し、通常倍率1の未解決予算を参考CI成功で代用しない。
- [ ] **Step 4: 全差分レビュー。** 認可・public/private抽出・RDF/ZIP・path・CAS/監査/replay・archive・分離と障害時をレビュー。指摘は再現→修正→再確認。実施していないhosted scanや本番認証成功を主張しない。
- [ ] **Step 5: 文書とPRを仕上げる。** 起動・停止・保管・import/activate・照合・切り戻し、公開と内部backupの違い、上限、データ条件を日英UI説明と整合させる。実装時のユーザーのGit/push方針に従いPRを用意し、最新headの必須CI（Linux/Windows local、PG3.12/3.14、Compose/browser、frontend、Docker、publication）と参考budgetsを確認してから完了を記録する。

## 見積もり・実装順・レビュー記録

依存順：Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7。
Task 5はTask 1完了後に技術上独立するが、本計画では順次実装し未選択の並列agent運用は前提にしない。
暫定6〜10人日。Task 2/3とTask 5の最小実証が通った時点で、復旧・UI・browserの実工数を含めて再見積もりする。
クラウド費用は不要。P2本番配備・P4/P5・本番APIをこの工数へ含めない。

設計対応：1〜3節→Task 2/3/6/7、4節→Task 1/4、5節→Task 2/3/4、6節→Task 1/2/5、
7節→Task 4/6、8節→全Task、9〜11節→Task 7と本計画の範囲・見積もり。
作成時の自己照合では、旧Turtle出力の流用、配布へのprivate volume共有、DBと配布の二重書込、
release namespaceのcapture/Undo/archive落ち、viewerによるpreview、cacheだけの停止時試験を避ける作業を明示した。
本節は文書レビュー記録であり、未実装の試験成功・製品完成を主張しない。

### 独立設計レビューへの対応（2026-10-27）

別contextのbuilder checkで、Project削除後の版取得、承認操作のUndo、consumer通信境界の3点を指摘された。
設計5/6/7/8節とTask 2/3/6へ反映した。session touchと辞書/業務監査不変の違いもTask 3へ明記した。
現行workspaceの差分フィルターはreleaseを削除しないため、不必要なCandidate改造を避けるようTask 2を修正した。
型・API・保存・archive・分離の自己照合と文書リンク検査は文書確認であり、製品試験の成功を意味しない。

再確認では、初回/再送のresponse envelopeとworkspace markerの同時commit、配布serverのCLI入口、既存image内のconsumer実行pathを追記した。
