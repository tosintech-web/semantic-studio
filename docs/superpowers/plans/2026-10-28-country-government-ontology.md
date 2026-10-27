# 国・政府組織グループ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task under the user-approved design. Steps use checkbox (`- [ ]`) syntax for tracking. Delegation is not selected by this plan.

**Goal:** 国と政府組織を別グループで管理し、メニューから専用入力テンプレートを開き、国への参照・期間付き組織関係・改編履歴を登録できるようにする。

**Architecture:** 既存ontologyプロジェクトをdomainProfileで役割分けし、国グループを固定IRIで参照する。期間付き関係の正本と指定日の投影を分離し、書込みは既存editing commandとP2のcandidate/CAS/監査へ統合する。

**Tech Stack:** 既存React 18 / TypeScript / FastAPI / rdflib / pySHACL / PostgreSQL / Docker Compose。新runtime依存なし。

**Spec:** [開発方針・設計案](../specs/2026-10-28-country-government-ontology-design.md)。

状態：2026-10-28のユーザー指示により実装承認、Task 1から実行中。
実装後に独立レビューと修正を指摘がなくなるまで反復し、GitHubへpushしてPRコメントを追加する。
基点：P3統合済みmain `0251e89`。G1=Task 1〜4、G2=Task 5〜6、G3=Task 7〜8。

## Global Constraints

- グループはkind=ontologyの既存プロジェクト。profileはcountries-v1 / government-organizations-v1、version=1。
- 固定拡張語彙はurn:semantic-studio:government:v1#。独自語彙とW3C ORGを区別する。
- 個体IRIはプロジェクトbase IRI＋UUID。名称・国コード・project IDから再生成しない。
- 期間は日付単位の[from, until)。欠落は不明、openStart/openEndだけが無境界。日付を推測補完しない。
- 国は独立した参照元一つ。初期v1は組織ごと各確定時点で所属国一つ。親から暗黙継承しない。組織同士の端点は同じ政府組織グループ内に限定する。
- 新runtime依存、新SQL table、クラウド配備、実データ移行は今回の前提にしない。
- 既存profileなしのontology/taxonomyは変更しない。汎用Turtleから入力した未対応構造は破壊せず読取専用で示す。
- teamは既存PostgreSQL正本、認証・現在権限・CAS・監査・再送・本人Undo・backupを継承しlocalへfallbackしない。
- dictionary-v1は拡張しない。専用profileのrelease承認を未対応として止め、project ZIPと基準日投影を区別する。
- UIは日英カタログ、サーバーはcode/uiMessage。表示言語は保存IRI・言語タグ・入力原値を変えない。
- CLAUDE.mdの構造化header、薄いrouter、broker、SELECT-only、raw HTML禁止、件数表示、性能予算を継承する。
- 実装完了はnative全非DB・非network試験、内部Composeの全team_db非network群3.12/3.14、frontend全体・build、実Chrome、最新head CI成功で判定する。

## Review Focus

1. 国選択後の他者編集・削除：古い国snapshotで確定せず409、draftを保持する。（Task 3/4）
2. 同名・コード再利用・複製：IRIで区別し、名称で自動対応付けや参照先切替をしない。（Task 1/2/3）
3. 日付境界・不明期間・未来改称：過去の関係や未来の名前を現在へ混ぜない。（Task 2/5/6）
4. 再送・Undo・backup：改編の部分適用や二重作成を起こさず、参照元を巻き戻さない。（Task 3/5/8）
5. 言語・プロジェクト・基準日切替中の遅延応答：別ownerへ結果や失敗を適用しない。（Task 4/6/7）

## ファイル配置と共通インターフェース

新規backendパッケージは `backend/app/government/`。語彙原本は `backend/app/domain_vocab/government-v1.ttl`。
UIは `frontend/src/government/` に専用フォームと純粋ロジックをまとめ、Home/Appは入口とowner切替だけを担当する。
専用routerは `backend/app/routers/government.py`。teamの保護と読取／書込分類は既存workspace dispatcherへ登録する。
新しいサービスsingletonや別DBは作らない。

型はTask 1でPython dataclassと対応TypeScript interfaceを定義し、後続Taskはその型を使う。

```text
DomainProfile = {id: "countries-v1" | "government-organizations-v1", version: 1,
                 countryProjectId?: string}
Bound = {date: ISODate | null, open: boolean}  # null/false は不明
Period = {start: Bound, end: Bound}
Source = {kind: "iri" | "text", value: string}
RelationInput = {iri?: string, subject: string, predicate: string, object: string,
                 period: Period, sources: Source[], description: string}
NameInput = {iri?: string, entity: string, value: string, language: string,
             period: Period, sources: Source[]}
ReferenceBasis = {sourceProjectId: string, sourceToken: string}
Page<T> = {items: T[], total: number, offset: number, limit: number}
```

sourceTokenは受理済み国graphの内容hash＋profileメタデータのhashによるopaque値。
UIは解釈しない。teamのexpected versionsはtokenの代替ではなくcommit時の読取集合に別途加える。
国一覧DTOは `CountryChoice={iri,label,code:string|null}`。
`GovernmentView={at,basis,organizations:Page<OrganizationView>,relations:Page<RelationView>,uncertain:Page<RelationView>}`。
OrganizationViewはiri,label,countryIri,kind,existencePeriod,existenceState（active/inactive/uncertain）、RelationViewはRelationInputにdisplay labelと判定結果を加える。
viewのoffset/limitは三つのPageへ共通適用し、それぞれ独立のtotalを返す。
失敗DTOは既存のHTTP/detail/code/uiMessage形式を維持し、独自の例外JSON形式を増やさない。

---

## Task 1: 語彙・profile・プロジェクトテンプレート（G1）

**Files:** Create `backend/app/government/{__init__,profile}.py`, `backend/app/domain_vocab/government-v1.ttl`,
`backend/app/templates/{countries,government-organizations}.ttl`, 同名 `.shapes.ttl`,
`backend/tests/test_government_profiles.py`, `frontend/src/government/types.ts`。
Modify `backend/app/projects.py`, `backend/app/routers/projects.py`, `frontend/src/types.ts`,
`frontend/src/projects/form.ts`, `frontend/src/components/NewProjectDialog.tsx`, `frontend/src/api.ts`。
既存テンプレート・project試験にも互換性ケースを追加する。

**Interfaces:** `parse_profile(raw: dict | None) -> DomainProfile | None`、
`new_entity_iri(base: str) -> URIRef`、`load_domain_vocabulary() -> Graph` をprofile.pyへ定義。
既存create/patchは `domainProfile` を受け取り、templateとの不一致と未知profileの新規作成を422で拒否する。
既存の未知profile読取は保持し、専用編集不可とする。profile解除・参照元切替のdryRunは影響一覧とbasisを返す。
テンプレート作成直後のmodel/shapesを返す既存project契約を維持する。

- [x] **Step 1: RED試験を追加。** `test_templates_use_org_and_shared_domain_vocabulary`、`test_old_projects_have_no_implicit_profile`、`test_country_and_org_iri_survive_rename_and_duplicate`、`test_unknown_profile_is_preserved_read_only`、`test_profile_kind_change_requires_explicit_detach`。テンプレートをrdflibでparseし、国・組織の標準名がskos:prefLabelを使いORGを独自語彙で置換していないこともassert。
- [x] **Step 2: RED確認。** `cd backend && python -m pytest tests/test_government_profiles.py -q`。profile/テンプレート未実装による失敗を確認。
- [x] **Step 3: 実装。** profile型・語彙・任意メタデータ保存・二つのテンプレート・create/patchの許可項目を追加。definitionsを各プロジェクトへ手作業コピーせず共通の同梱語彙として読む。実在国はseedしない。
- [x] **Step 4: GREEN確認。** 上記試験と既存project/template試験を実行。新旧projectのcreate/list/open/duplicate/exportとprofile解除previewを確認。
- [x] **Step 5: commit。** `feat: add country and government project profiles`。

## Task 2: 期間・名称・関係記録の読取と基準日投影（G1の基盤）

**Files:** Create `backend/app/government/{records,validation}.py`, `backend/tests/test_government_records.py`。

**Interfaces:** `read_relations(graph: Graph) -> list[RelationRecord]`、
`period_state(period: Period, at: date) -> Literal["active","inactive","uncertain"]`、
`project_at(graph: Graph, *, at: date) -> Projection`、
`validate_relations(graph: Graph) -> list[Problem]`。
Projectionはgraphとuncertain records、存在期間との矛盾diagnosticsを保持。RelationRecordはRelationInputの全値を保持する。
Problemは既存message契約へ変換するcode、severity、対象IRI、引数を持つ。
project_atは元graphを変更せず、RelationRecordとNameRecordの記録用statementを除いた表示graphへ
確定した関係・名称を追加する。対象組織の通常ラベルは、確定名称がある言語でだけ置換する。
ExistenceRecordも三値判定し、存在期間外へのactiveな関係は投影から除外してdiagnosticsへ出す。
存在不明の端点でも関係自体は期間で判定し、投影graphの各組織に `gov:existenceState` の文字列注記を付ける。
未対応recordはreadonly理由付きで返し、専用フォームは書き直さない。

- [x] **Step 1: RED試験。** `test_transfer_switches_on_effective_date`、`test_unknown_bound_is_not_unbounded`、`test_explicit_open_bound_projects`、`test_future_name_does_not_replace_current_name`、`test_gap_and_uncertainty_stay_visible`、`test_source_graph_unchanged`、`test_cycle_is_checked_per_overlapping_period`、`test_inactive_endpoint_is_excluded_with_diagnostic`、`test_unknown_existence_is_annotated`。2020-03-31/2020-04-01の切替と日付不明を具体値でassert。
- [x] **Step 2: RED確認。** `cd backend && python -m pytest tests/test_government_records.py -q`。
- [x] **Step 3: 実装。** 日付のstrict parse、半開区間、三値判定、同時点の包含循環・重複、名称投影を純粋処理にする。unknownをdatetime.min/maxへ置換しない。循環検査は包含2述語を合わせ、監督・連携は含めない。
- [x] **Step 4: GREEN確認。** 上記試験を成功させ、serialize/parse往復で期間・言語・出典が同一であることも確認。
- [x] **Step 5: commit。** `feat: model dated government relations and projections`。

## Task 3: 国参照と原子的な国・組織登録（G1）

**Files:** Create `backend/app/government/{references,commands,views}.py`, `backend/app/routers/government.py`,
`backend/tests/test_government_commands.py`, `backend/tests/test_government_http.py`, `backend/tests/test_team_government.py`。
Modify `backend/app/editing.py`, `backend/app/main.py`, `backend/app/team/{workspace,commands,permissions}.py`,
`backend/app/messages.py`, `frontend/src/api.ts`。必要な型付きmessage契約を既存generatorで更新。

**Interfaces:** `country_choices(source: Graph, *, query: str, offset: int, limit: int, languages: list[str]) -> dict`、
`reference_basis(*, source_project_id: str, graph: Graph, profile: DomainProfile) -> ReferenceBasis`。
既存 `Context -> Change` 形式で `cmd_create_country(ctx, args)` と `cmd_create_government_organization(ctx, args)` を実装。
Country argsは任意対象iri、names（value/language）、code、sources、description。
Organization argsは任意対象iri、names、kind、identifier、existencePeriod、countryIri、countryPeriod、sources、referenceBasis。
iriなしはUUID新規、ありは同profileの既存対象だけを編集。編集でもIRIは不変。
組織作成ではExistenceRecordと所属国RelationRecordも同じChangeに含め、一回Undoでまとめて戻す。

- [x] **Step 1: RED試験。** 251件の国から251番目を検索・ページ選択できtotal=251、同名の別IRIが別候補、国名変更後も参照IRI不変、国以外IRI拒否、参照元削除/profile変更後は409、countryProjectId切替で名前による再対応なし。
- [x] **Step 2: team RED試験。** 同一snapshotの参照元を別editorが変えたときのCAS拒否、応答喪失後の再送で組織・関係・監査が一つ、viewer拒否、降格後の再送拒否を `test_team_government.py` に追加。専用Compose runnerで実行し、接続不能をREDの代わりにしない。
- [x] **Step 3: 実装。** 国読取を参照元を開かずに行い、tokenと現在型を検査。localは共通lockを設定変更／graph更新にも適用し、teamはsource graph・manifestのexpectedをcommitへ追加。lookupだけの二段階書込みを作らない。新routeをteamのread分類へ明示登録し未保護routeを残さない。
- [x] **Step 4: GREEN確認。** local HTTP/command試験とteam試験を3.12/3.14で成功させ、既存権限・再送・Undoの関連群も実行。検索200文字・page100・本文256KiBの境界と413/422を確認。
- [x] **Step 5: commit。** `feat: link government organizations to country project authority`。

## Task 4: 国・組織の専用入力フォーム（G1完了）

**Files:** Create `frontend/src/government/{CountryForm,OrganizationForm,CountryPicker}.tsx`,
同名 `.test.tsx`, `frontend/src/government/{form,form.test}.ts`。
Modify `frontend/src/App.tsx`, `frontend/src/state/projectStore.ts`, `frontend/src/i18n/{en,ja}.ts`。
API型はTask 1/3を使い、既存ExampleFormの振る舞いを変えない。

**Interfaces:** CountryPickerは `projectId,value,onChange,busy` を受け、
onChangeへ `{iri,basis}` を返す。フォームは `projectId,targetIri?,onSaved,onCancel` を受け、
既存projectStoreのcommand実行・draft owner・離脱確認を利用する。
国候補なし、参照元未接続、未解決IRI、stale409を別の状態として表示する。

- [ ] **Step 1: RED試験。** コード/名称/IRI検索、同名候補識別、末尾ページ、国未登録で組織確定不可、日英切替で原値保持、stale後に入力保持、遅い旧projectの候補応答破棄、Tab/Escape/復帰focusをassert。
- [ ] **Step 2: RED確認。** `cd frontend && npm run test -- src/government/CountryForm.test.tsx src/government/OrganizationForm.test.tsx src/government/CountryPicker.test.tsx src/government/form.test.ts`。
- [ ] **Step 3: 実装。** 型・言語・期間入力の純粋処理をform.tsへ分離。候補を丸ごとselectへ詰めず検索とpageを持つpickerにする。名前の変更でIRIを再生成しない。
- [ ] **Step 4: GREEN確認。** 上記試験とprojectStore関連試験を実行。a11y-check skillを読み、実Chromeで国作成→組織登録と入力保持を確認する。
- [ ] **Step 5: commit。** `feat: add country and government organization entry forms`。

## Task 5: 関係・改編・名称履歴のcommand（G2）

**Files:** Modify `backend/app/government/{commands,validation,records}.py`, `backend/app/editing.py`,
`backend/app/routers/government.py`, `backend/app/messages.py`。
Create `backend/tests/test_government_changes.py`、Modify `backend/tests/test_team_government.py`。

**Interfaces:** `cmd_put_government_relation(ctx, args) -> Change`（RelationInputとbasis）、
`cmd_put_government_name(ctx, args) -> Change`（NameInput）、
`cmd_apply_government_change(ctx, args) -> Change`。
Change argsは任意対象iri、kind（merge/split/transfer/rename/other）、effectiveDate、
originalIris、resultingIris、relationEdits:RelationInput[]、nameEdits:NameInput[]、
existenceEdits:{entity:string,period:Period,sources:Source[]}[]、sources、description、referenceBasis。
既存dryRunの結果へ変更一覧とbasisを載せ、確定時に全検査を再実行する。既存command resultは後方互換。
改編編集で変更済み関係を黙って再適用せず、preview時のtarget revision/CASを必須にする。

- [ ] **Step 1: RED試験。** merge/splitの複数前身後身、吸収統合の存続IRIと吸収側終了の明示変更、別組織グループ端点の拒否、改称/移管の同一IRI、未来の名称、不明期間、包含循環、他国所属の包含警告、監督を包含と誤認しないこと、100件超の拒否と無変更、日付/出典不備時の全拒否を確認。
- [ ] **Step 2: RED確認。** `cd backend && python -m pytest tests/test_government_changes.py -q`。teamにはpreview後競合、再送、改編一回Undo、国側をUndoしない試験を追加して専用runnerでRED確認。
- [ ] **Step 3: 実装。** commandは全Changeを検証してから返し、旧関係の終了と新関係の開始を別commandにしない。新組織はTask 3で事前登録し、改編フォームが未登録組織の暗黙作成をしない。日付不明の重なりは警告、確定重複は拒否。
- [ ] **Step 4: GREEN確認。** localと実DB3.12/3.14で全成功。dryRun前後にgraph hashが変わらず、確定・Undo・Redoの集合が一致することを確認。
- [ ] **Step 5: commit。** `feat: record atomic government reorganizations and history`。

## Task 6: 関係・改編フォームと基準日表示（G2完了）

**Files:** Create `frontend/src/government/{RelationForm,ChangeForm,GovernmentView}.tsx`, 同名 `.test.tsx`,
`frontend/src/government/{history,history.test}.ts`。
Modify `frontend/src/api.ts`, `frontend/src/government/types.ts`, `frontend/src/i18n/{en,ja}.ts`。

**Interfaces:** フォームpropsはTask 4と同型。GovernmentViewは `projectId,at,onDateChange,onSelect`。
読取APIは設計7節のview/projection、Task 1のGovernmentView型。cacheと応答ownerはproject/document/basis/at/languageを含める。
参照した国の名称は表示だけに使い、編集原値を変えない。

- [ ] **Step 1: RED試験。** 関係5種の方向表示、統合/分割の複数選択、preview全変更の確認、施行日前後の切替、存在不明と期間外組織の表示切替、存在期間の矛盾表示、未来改称、別基準日の遅延応答、再認証時のdraft保持、全履歴とprojectionのラベル区別をassert。
- [ ] **Step 2: RED確認。** `cd frontend && npm run test -- src/government/RelationForm.test.tsx src/government/ChangeForm.test.tsx src/government/GovernmentView.test.tsx src/government/history.test.ts`。
- [ ] **Step 3: 実装。** 一覧・詳細・基準日入力を優先し専用グラフを作らない。日付APIは必須、初期画面は利用者の今日を明示して送る。不明の記録を見えなくせず別一覧へ出す。
- [ ] **Step 4: GREEN確認。** 上記試験成功後、a11y-checkと実Chromeで移管前後・統合・Undo・日英の一連操作を確認する。
- [ ] **Step 5: commit。** `feat: add dated government relations and change entry UI`。

## Task 7: システムメニューとprofile別一覧（G3）

**Files:** Create `frontend/src/government/{GroupNavigation,GroupNavigation.test}.tsx`。
Modify `frontend/src/components/{HomeScreen,NewProjectDialog,ProjectHeader}.tsx` と各試験、
`frontend/src/App.tsx`, `frontend/src/home/libraryOrder.ts`, `frontend/src/i18n/{en,ja}.ts`。

**Interfaces:** GroupNavigationは `projects,onOpen,onCreate,canEdit` を受け、
onCreateへtemplate IDを渡して既存作成ダイアログを開く。project summaryへdomainProfileを含め、Homeはgraph読取をしない。
未保存入力のあるprojectからの移動は既存guardを使用する。

- [ ] **Step 1: RED試験。** 国/政府組織の入口、role別一覧、空状態からの作成、viewer閲覧可/作成不可、既存プロジェクト表示順維持、Homeがgraph requestを出さないこと、group移動でdraftの破棄確認とfocus復帰をassert。
- [ ] **Step 2: RED確認。** `cd frontend && npm run test -- src/government/GroupNavigation.test.tsx src/components/HomeScreen.test.tsx src/components/NewProjectDialog.test.tsx src/components/ProjectHeader.test.tsx`。
- [ ] **Step 3: 実装。** 「国 / Countries」「政府組織 / Government organizations」をHome共通navigationへ追加し、作成処理を二重化しない。個体の種類を開発者向け語彙名だけで説明しない。
- [ ] **Step 4: GREEN確認。** 上記試験とApp関連試験、実Chromeでメニュー→作成→入力→一覧の導線、幅の狭い画面とTab順を確認。
- [ ] **Step 5: commit。** `feat: expose country and government groups in system navigation`。

## Task 8: 永続化・配布境界・全体受け入れ（G3完了）

**Files:** Modify `backend/app/releases/{service,http}.py`（profile未対応の明示拒否）、
`backend/tests/test_team_government.py`, `backend/tests/test_government_http.py`, `backend/tests/test_team_releases.py`。
必要なら `backend/app/team/{commands,project_views,pg_archive}.py` を変更し、既存形式でmetadata/RDFを保持する。
Create `docs/government-user-guide.md`, `docs/government-verification.md`。
Modify `.claude/skills/run-semantic-viewer/driver.mjs` と同driverの既存補助ファイル、
`docs/p2-postgresql-test-inventory.json` と対応md（既存inventory維持）。

**Interfaces:** profile付きprojectのrelease-preview/approveは同じ明示エラー
`government_release_profile_unsupported` で拒否。普通のprojectのdictionary-v1は維持。
project ZIPは記録用RDF/profileを保持し、projection GETは基準日・basis付きの派生Turtleだけを返す。
download responseの基準日ヘッダーは `X-Semantic-Studio-As-Of`、basisヘッダーは `X-Semantic-Studio-Basis`。

- [ ] **Step 1: RED試験。** local再起動、国参照元削除後の未解決表示、複製で参照元不変、別環境復元の未接続表示、team backup/restoreのgraph/profile/basis再評価、改編後Undoの再起動、専用release拒否と通常release維持を確認。
- [ ] **Step 2: GREEN実装。** 不足するcapture/復元/filterを既存形式に追加。新SQL schemaを作らず、旧バックアップにprofileがないことを許容。ユーザーガイドへ範囲、単一国、不明期間、IRI固定、公開未対応を記載。
- [ ] **Step 3: 全backend検証。** `cd backend && python -m pytest tests -m "not team_db and not network"`。内部Composeで全 `team_db and not network` 群をPython3.12/3.14で実行。専用runnerの起動方法は `docs/p2-team-operations.md` と現行 `.github/workflows/ci.yml` に従いDB portを公開しない。新caseをinventoryへ追加し旧case集合を保持する。
- [ ] **Step 4: 全frontend/build検証。** `cd frontend && npm run test`、`npx tsc -b`、`npm run build`。通常倍率1の全性能予算を維持する。
- [ ] **Step 5: 実browser受け入れ。** run-semantic-viewer skillを読み、合成データだけでlocal/team双方の国2件、部署移管、組織統合、同名、未知日付、stale、再送、Undo、日英、Tab/focusを確認。既存smoke/P1/P2/P3のregressionも確認する。
- [ ] **Step 6: 配布検査。** `python scripts/generate_message_contracts.py --check` を実行。`git ls-files -z --cached --others --exclude-standard > /tmp/semantic-studio-publication-files.txt` でNUL区切りの検査対象を列挙し、`python scripts/check_publication.py --root . --files-from /tmp/semantic-studio-publication-files.txt` と既存通知検査を実施。今回追加した語彙の権利表示とimage同梱を確認する。
- [ ] **Step 7: 記録・commit・PR。** 設計9節の10受け入れ条件と試験証拠を対応付け、未実施は未実施と記録。`feat: verify country and government ontology workflows` をcommitして機能PRを更新し、最新head CIの成功を確認する。今回の設計PRを機能実装完了と表示しない。

## 実行前の確認と分割

本計画は一つの機能をG1/G2/G3に分けたもの。G1を先に機能PRとしてレビューできるが、全目標の完了はG3の受け入れ後。
別環境の国公開版を直接参照する機能、複数国所属、国家の分裂・統合、詳細Excel一括入力、公開profile追加はこの計画へ黙って混ぜない。
設計PRの確認後に実装開始を判断する。実装担当は既存CLAUDE.mdと設計・本計画を合わせて読み、必要な型・上限変更をPRに明記する。
