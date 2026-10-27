# オントロジーグループ表編集 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan does not select delegation; use superpowers:subagent-driven-development only if the user explicitly chooses that execution method.

**Goal:** 選んだグループの全データへ到達でき、属性・関係のセル編集、Excelからの貼り付け、取り込みデータの整合した更新ができる表画面を追加する。

**Architecture:** 出典別のRDF正本を捕捉した読取索引と、サーバーが判定する編集capabilityを共有する。文書変更はediting.pyの単一Change、snapshot変更は元表の再生成トランザクションを通し、localの復旧とteamのCAS・監査・Undoへ接続する。

**Tech Stack:** 既存React 18 / TypeScript / FastAPI / rdflib / PostgreSQL / Vitest / pytest。新runtime依存なし。

**Spec:** [オントロジーグループの全データを閲覧・直接編集する表画面](../specs/2026-10-28-ontology-spreadsheet-design.md)。

状態：2026-10-28作成、設計・計画のレビュー対象。アプリの実装・テストは未実施。
照合したHEAD：`1e399ed`。設計書の基点`af2c4be`以後に国・政府組織機能が追加済みのため、Task 5/13で現行handlerを統合する。
その機能の再実装や、設計書の過去時点の記述の書換えは本計画に含めない。

## Global Constraints

- 1グループ＝1プロジェクト。1行＝エンティティ、1列＝属性や関係。行identityは`(sourceId, subjectTerm)`。
- model、shapes、全snapshot、解決済みimports、型なしsubject、無名ノード、参照先だけのIRIへ到達可能。初期範囲はmodel＋有効snapshot。
- 外部正本・viewer・推論結果は編集不可。読取による外部取得、複数プロジェクト一括書込、数式・マクロ実行は追加しない。
- 初期50行、最大100行／応答。可視属性は既定8列、同時取得最大20列。セル表示2値、詳細50値／ページ。
- 1応答・1書込リクエスト上限1 MiB。貼付けは1出典、最大500セル、部分成功なし。
- RMLは既存の2,000行上限を維持。snapshot変更はgenerationを1回進め、modelのrevision/dirtyで代用しない。
- termの言語・datatype・lexical formを保持。空文字と削除を区別し、表示名・省略文字列を保存しない。
- column名・predicate・source列名をキーにするmapはnull prototype／own-key lookupを使い、`__proto__`等を通常データとして扱う。
- 単セル確定／貼付けをUndo1回にする。snapshot履歴と文書履歴は分離。teamは現在権限・本人・versionを再検証する。
- `editing.py`だけがプロジェクト文書を変更。SELECT-only、broker、raw HTML禁止、typed i18n、真の総数表示を維持。
- 既存の国・政府組織のprofile・期間・参照元CAS・最終状態検査を迂回しない。
- 全ソースに構造化header。新規依存・SQL table・別singletonなし。既存CLAUDE.mdを実行前に再読する。
- 作業は実行開始時にworktree等で隔離する。本計画の保存段階ではアプリコードを変更しない。

## Review Focus

1. 同じIRI／blank node IDが複数出典にある場合：正しい正本だけを変更する。（Task 1/2/5）
2. 画面では同じ1値でも複数CSV行・object mapが生成した場合：逆変換しない。（Task 9）
3. 空文字、先頭ゼロ、巨大整数、言語fallback、複数datatype：元のRDF termを壊さない。（Task 1/4/5/9）
4. IME中のEnter、TSV内の引用付き改行、切替中の遅延応答：誤確定・誤対象更新を起こさない。（Task 6/7/8）
5. snapshot更新の途中停止、再取込後Undo、権限降格後の再送：混在世代や権限の復活を許さない。（Task 10/11/12）

## ファイル配置・共通契約

backendは新規`backend/app/spreadsheet/`に読取・term・変更計画の純粋ロジックを置く。
文書への適用は`editing.py`、snapshotの適用は既存`SnapshotService`が所有する。
frontendは新規`frontend/src/spreadsheet/`にUIと純粋ロジックをまとめる。
Appはmode、遅延読込、owner切替だけを担当し、キー入力stateを持たない。

共通wire型をTask 1でPython dataclass／TypeScript interfaceに定義し、後続Taskは再定義しない。

```text
Term = {kind: "iri"|"literal"|"bnode", value: string, datatype?: string, language?: string}
Basis = opaque string                 # ownerと全読取resourceの構造世代、表示言語とは独立
ViewToken = opaque string             # Basis＋表示言語＋投影条件、旧応答判定に使用
Source = {id, kind: "model"|"shapes"|"snapshot"|"import"|"library", enabled, editable, state}
CellRef = {sourceId: string, subject: Term, predicate: string}
CellEdit = {ref: CellRef, operation: "add"|"replace"|"remove", oldTerm?: Term, newTerm?: Term}
TablePatch = {operationId: string, basis: Basis, edits: CellEdit[], previewHash?: string}
SourceCellEdit = {sourceRowId: number, sourceColumn: number, oldText: string, newText: string}
SourcePatch = {operationId: string, basis: Basis, snapshotId: string,
               mode: "source", edits: SourceCellEdit[], previewHash?: string}
SnapshotPatch = SourcePatch | (TablePatch & {snapshotId: string, mode: "rdf"})
SourcePage = {basis: Basis, viewToken: ViewToken, snapshotId: string,
              columns: Page<{index: number, name: string}>,
              rows: Page<{sourceRowId: number, cells: Record<columnIndex, string>}>}
Preview = {basis: Basis, previewHash: string, changedCells: number, added: number,
           removed: number, warnings: WireMessage[], changes: Page<StatementDelta>}
Capability = {mode: "direct"|"values"|"source"|"specialist"|"readonly", reason?: WireMessage}
Cell = {values: {termId: string, term?: Term, display: string, requiresDetail: boolean}[],
        totalValues, hasMore, capability}
Row = {rowKey: string, sourceId: string, subject: Term, displayName: string,
       kinds: string[], referenceOnly: boolean, cells: Record<predicateIRI, Cell>}
Page<T> = {items: T[], total: number, offset: number, limit: number, hasMore: boolean}
```

rows応答は`{viewToken,basis,rows:Page<Row>}`。設計のtotalRowsは`rows.total`に統一する。
columns/source/cellの読取もbasis/viewTokenを返す。追加のsource・preview-deltaページも同じPage形式。
subjectはIRIまたはbnodeのみ。termId/rowKeyはサーバー発行で出典に結び付け、bnodeの書込には同じBasisを要求する。
1セルはsource/subject/predicateで数え、同一セル内の複数操作も500セル上限と1 MiBの両方で制限する。
Previewの完全差分はページで読み、commitは全差分のhashを検査する。表示上限の先だけを確定対象にしない。
SourcePatchはraw文字列の置換だけを表し、空文字はソースの空欄化。RDFの空文字リテラルとは区別する。
sourceColumnは0始まりの物理列index、sourceRowIdは同じBasisの1始まりのデータ行番号。
SourcePageには未マッピング列や主語を生成しない行も含め、列の窓を動かして全列へ到達できる。
大きな値の一覧ではtermを省略してrequiresDetailを返せるが、不完全なTermは返さない。
詳細の完全termを取得できるまでその値の置換を許可しない。

### 依存順序と段階

| 段階 | Task | 段階完了時の機能 |
| --- | --- | --- |
| S1 | 1〜3 | 出典付き全件閲覧・属性選択・構造展開 |
| S2 | 4〜6 | 文書のセル編集・保存・Undo・入力保護 |
| S3 | 7〜8 | コピー／貼付け・差分確認・原子的な一括反映 |
| S4 | 9〜12 | snapshot逆変換・元表編集・復旧・専用Undo |
| S5 | 13〜14 | profile統合・性能・実ブラウザー・全検証 |

Task 1→2→3→4→5→6→7→8→9→10→11→12→13→14の順に実行する。
S1/S2/S3の途中成果を、snapshot編集を含む完成版とは表示しない。

以下のRED/GREENは実装時の手順であり、今回実行済みという意味ではない。
各Taskは指定した試験をREDで確認し、実装後GREENにして、そのTaskのファイルだけをstageしてcommitする。
test名は指定ケースの契約。追加の実装詳細は既存パターンに合わせる。

---

## Task 1: RDF term・出典・basisと完全な索引（S1）

**Files:** Create `backend/app/spreadsheet/{__init__,types,terms,sources,index}.py`,
`backend/tests/test_spreadsheet_index.py`, `frontend/src/spreadsheet/types.ts`。
Modify `backend/app/editing.py`, `backend/app/snapshots.py`（捕捉用読取口のみ）。

**Interfaces:** `capture_sources(ontology, *, scope: str, imports: bool) -> SourceSnapshot`、
`build_index(snapshot: SourceSnapshot) -> TableIndex`、`encode_term(term) -> dict`、`decode_term(raw: dict) -> Identifier`。
SourceSnapshotはsources、ロック内で捕捉した元graphの独立コピー、Basisを持つ。TableIndexは出典別subject/predicate/valueと参照先だけのIRIを保持。

- [ ] **Step 1 — RED:** `test_same_iri_keeps_two_sources`は同一IRIのmodel/snapshotが2行になること、`test_bnodes_are_source_scoped`は同名bnodeが交ざらないことをassert。`test_every_subject_and_predicate_is_indexed`は型なし・形状・rdf:restを含む入力statementがすべてたどれることをassert。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_index.py -q`。未定義の索引／term APIで失敗することを確認。
- [ ] **Step 3 — 実装:** 上記signatureを定義。既存editingの共通ロックを外側に、shapes→model→snapshotの順で捕捉し、importsの解決basisも検査。teamはrequest-bound candidateだけを読む。索引は元statement一巡で作り、描画node一覧を入力にしない。無効snapshotも取得できるread-only口を追加する。
- [ ] **Step 4 — GREEN:** 同じcommandに`test_literal_roundtrip_preserves_lexical_language_and_datatype`を追加。`""`、`"001"`、`"9007199254740993"^^xsd:integer`、`"01"^^xsd:integer`、ja/enを文字列のまま往復し、表示言語だけの変更でBasis不変・ViewToken変化を確認。`test_writer_after_capture_cannot_change_indexed_basis`でcaptureとindexの間に別threadで編集を入れ、捕捉済み値だけが読めることもassert。Basisを内容／永続versionに結び付け、team requestのobject identityに依存させない。
- [ ] **Step 5 — commit:** `feat: index complete source-scoped ontology tables`。

## Task 2: ページ読取・検索・ソート・能力表示API（S1）

**Files:** Create `backend/app/spreadsheet/{views,capabilities}.py`, `backend/app/routers/spreadsheet.py`,
`backend/tests/test_spreadsheet_http.py`。Modify `backend/app/main.py`, `backend/app/team/permissions.py`,
`backend/app/message_contracts.json`, `frontend/src/api.ts`, `frontend/src/i18n/{en,ja,types,server-contracts}.ts`。

**Interfaces:** `read_rows(index, params) -> dict`、`read_columns(index, params) -> dict`、`read_cell(index, ref, *, offset: int, limit: int) -> dict`、
`cell_capability(context, ref: CellRef) -> Capability`。`GET /api/ontologies/{oid}/table/{sources,columns,rows,cell}`。
frontendの`getTableRows(oid, params, signal?)`等はTask 1の型を返す。

- [ ] **Step 1 — RED:** `test_page_reaches_every_row`は101行を50/50/1で取得、`test_sort_precedes_slice`は最終ページの最小値が昇順先頭へ来ることをassert。`test_scope_exposes_disabled_and_unresolved_sources`、`test_search_reads_unshortened_values`、`test_import_read_makes_no_network_request`を追加する。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_http.py -q`。404または未実装による失敗を確認。
- [ ] **Step 3 — 実装:** 行50/100、列8/20、cell詳細50、全応答1 MiBを適用。一覧の長文はrequiresDetail付きで省略し、詳細にも収まらない単一termは上限とソース編集／ダウンロード導線を返す。column一覧もページ化し、未使用の定義済みpropertyを選択可能にする。検索は全値、ソートは代表term＋source/subjectで安定化。registryは当初readonly/specialistを返し、Task 4/5で対応を増やす。新routeは明示的にteamのreadへ登録する。
- [ ] **Step 4 — GREEN:** 上記と`test_large_response_returns_honest_total_and_retry_hint`、`test_oversized_literal_row_stays_reachable_but_not_partially_editable`、`test_unknown_source_is_404`、`test_changed_basis_never_mixes_pages`を実行。`python scripts/generate_message_contracts.py`と`--check`をrootで実行し、生成物を同じcommitへ含める。
- [ ] **Step 5 — commit:** `feat: expose bounded ontology spreadsheet reads`。

## Task 3: 遅延読込の表画面と全件到達（S1）

**Files:** Create `frontend/src/spreadsheet/{SpreadsheetView,TableGrid,ColumnPicker,CellValuesPanel}.tsx`,
`frontend/src/spreadsheet/{useTablePage,viewPreferences}.ts`, 対応`.test.tsx`／`.test.ts`。
Modify `frontend/src/{App.tsx,App.test.tsx,types.ts,index.css}`, `frontend/src/i18n/{en,ja,types}.ts`。

**Interfaces:** `SpreadsheetView({ontologyId, projectId, ownerSession, language, onOpenSource, onOpenEntity})`、
`useTablePage(identity, query) -> {page,loading,error,reload}`。identityにownerSession、ontology、Basis、言語、scopeを保持。

- [ ] **Step 1 — RED:** `SpreadsheetView.test.tsx`でnavから表を開く、50行だけ描画、次ページ・全predicate選択・無名構造展開・出典変更を検証。`useTablePage.test.tsx`でA→B切替後にAの成功／失敗が届いてもBを変えないことをassert。
- [ ] **Step 2 — RED実行:** `npm --prefix frontend run test -- src/spreadsheet/SpreadsheetView.test.tsx src/spreadsheet/useTablePage.test.tsx src/App.test.tsx`。
- [ ] **Step 3 — 実装:** AppModeに`spreadsheet`を追加しReact.lazyで開く。source/種類/class/値検索、件数、column窓、固定4列、列幅、昇降順を実装。CellValuesPanelは2値以降を50値ページで読む。未解決・対象外件数と参照先のみのfilterを表示。列セットと幅は既存UI設定方式を参考にowner・class・version付きローカル設定へ保存し、RDFへ書かない。
- [ ] **Step 4 — GREEN:** 同試験に「同名列をIRIで識別」「readonly理由」「ViewToken変更で旧cellページを破棄」を追加し成功。編集能力がまだない段階では編集可能と表示しない。
- [ ] **Step 5 — commit:** `feat: add complete ontology spreadsheet browsing`。

## Task 4: 管理predicateの変更計画と最終状態検査（S2）

**Files:** Create `backend/app/spreadsheet/{planning,validation}.py`, `backend/tests/test_spreadsheet_planning.py`。
Modify `backend/app/spreadsheet/capabilities.py`, `backend/app/editing.py`, `backend/app/modeling_checks.py`。

**Interfaces:** `plan_cells(ctx, edits: list[CellEdit]) -> PlannedChange`、
`validate_final(ctx, plan: PlannedChange) -> list[Problem]`。PlannedChangeはadded/removed集合、対応セル、専用handlerの検査情報を持ち、元graphを変更しない。
registryの各entryは`capability(ctx,ref)`と`plan(ctx,edit)`を同じ規則で提供する。

- [ ] **Step 1 — RED:** `test_plan_does_not_mutate_original`、`test_preserves_other_languages_and_values`、`test_empty_literal_is_not_remove`、`test_final_valid_hierarchy_is_order_independent`、`test_new_cycle_is_rejected`を追加。最後の2件は同じ差分を逆順で入力し、最終graphが有効なら両方成功、循環なら両方拒否とassert。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_planning.py -q`。
- [ ] **Step 3 — 実装:** 旧値・term・所有を元basisで検査し、既存handlerの入力／計画／意味検査を必要な範囲だけ分離。label/comment/annotation、個体値、subClass/subProperty、SKOS、domain/rangeをregistryへ登録。top concept・union等の付随差分も統合する。未対応の構造・管理predicateは専用編集へ誘導し、汎用term置換へfallbackしない。
- [ ] **Step 4 — GREEN:** 上記と`test_domain_union_and_top_concept_invariants`、`test_unrelated_legacy_violation_does_not_block`、`test_conflicting_edits_and_rename_mix_are_rejected`を成功させる。`tests/test_editing.py tests/test_no_direct_mutation.py`も実行し、既存handlerの振る舞いを変えていないことを確認。
- [ ] **Step 5 — commit:** `refactor: plan table edits through existing semantic checks`。

## Task 5: 文書command・preview・競合・再送（S2）

**Files:** Create `backend/app/spreadsheet/operations.py`, `backend/tests/test_spreadsheet_commands.py`,
`backend/tests/test_team_spreadsheet.py`。Modify `backend/app/editing.py`, `backend/app/routers/{projects,spreadsheet}.py`,
`backend/app/main.py`, `backend/app/team/{workspace,permissions}.py`, `backend/app/spreadsheet/capabilities.py`, `frontend/src/api.ts`。

**Interfaces:** `cmd_edit_table_cells(ctx, args: dict) -> Change`を既存COMMANDSへ登録。
`preview_table_patch(pid, doc, patch: TablePatch) -> Preview`、
`table_operation_status(pid, operation_id: str) -> dict`。
previewは`POST /api/projects/{pid}/table/preview`、結果照会は`GET .../table/operations/{operation_id}`。
commitは既存commandsへ`EditTableCells`を送信し、`ChangeResult`を返す。

- [ ] **Step 1 — RED:** `test_one_cell_one_revision_one_undo`、`test_stale_basis_is_409_without_history`、`test_preview_is_read_only`、`test_preview_hash_covers_all_edits`、`test_external_subject_is_forbidden_but_external_predicate_is_allowed`、`test_duplicate_operation_does_not_apply_twice`を追加。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_commands.py -q`。teamケースはTask 14の内部Compose手順で指定fileを実行する。
- [ ] **Step 3 — 実装:** commitはロック内でBasis、oldTerm、権限、previewHashを再検査しTask 4の1 Changeだけを適用。変更なしはno-changeとして履歴を作らない。previewはedit権限・非shared_updateでcandidateを公開しない。team expectedには読取集合と参照国resourceも含め、監査・replay成功後だけ応答する。main.request_body_limitとprojects.run_commandのstream読取に共通envelope上限1 MiBを設定し、decode後はEditTableCells以外へ従来256 KiB上限を再適用。preview/source書込も1 MiBを両境界へ登録する。
- [ ] **Step 4 — GREEN:** teamで`test_viewer_cannot_commit`、`test_cas_loser_keeps_no_audit`、`test_replayed_write_checks_current_role`を追加。`test_table_patch_between_256kib_and_1mib_succeeds`、`test_ordinary_command_retains_256kib_limit`をlocal/team・宣言長あり／chunkedの両方で確認。`test_preview_hash_stable_for_new_union_bnodes`では既存bnodeのidentityを保持し新規bnodeだけを正規化してhash化する。localのoperation receiptは編集sessionに結び付け、同じIDで別payloadは409。再起動／session終了で照会不能ならunknownを返し、自動再適用しない。後述snapshotの永続receiptとは分ける。
- [ ] **Step 5 — commit:** `feat: apply versioned spreadsheet document commands`。

## Task 6: セルエディター・入力保持・保存とUndo（S2）

**Files:** Create `frontend/src/spreadsheet/{CellEditor,ConflictPanel}.tsx`,
`frontend/src/spreadsheet/{draftStore,terms,editing}.ts`, 対応test。
Modify `frontend/src/spreadsheet/{SpreadsheetView,TableGrid,CellValuesPanel}.tsx`,
`frontend/src/state/projectStore.ts`, `frontend/src/team/TeamProvider.tsx`, `frontend/src/api.ts`。

**Interfaces:** `draftStore.begin(owner, ref, term)`、`update(text)`、`commit(): Promise<void>`、`cancel()`。
ownerはprojectSession/source/CellRef/Basis/認証epoch。`submitTablePatch(owner, patch) -> Promise<ChangeResult>`は同じownerだけへ結果を通知する。

- [ ] **Step 1 — RED:** CellEditorで`test_ime_enter_does_not_commit`、`test_tab_commits_then_moves`、`test_escape_restores_original`、`test_hidden_languages_survive_replace`、`test_failed_save_retains_input`を追加。draftStoreでproject切替、UI言語変更、auth epoch変更、遅い成功／失敗を検証する。
- [ ] **Step 2 — RED実行:** `npm --prefix frontend run test -- src/spreadsheet/CellEditor.test.tsx src/spreadsheet/draftStore.test.ts src/spreadsheet/terms.test.ts`。
- [ ] **Step 3 — 実装:** F2/Enter/double-click、型別editor、IRI候補と識別子、全値パネルを接続。数値は文字列のまま扱い、言語fallback編集時は実際のpredicate/tagを表示。未確定入力を既存exit guard・team pending-inputへ登録し、再認証／最新版受入が書込を再送しないようにする。
- [ ] **Step 4 — GREEN:** 保存済み／反映済み未保存／通信結果不明を区別し、Undo/Redoは現在の文書を示す。競合は元値・現在値・入力値を比較して明示的に再preview。sort/filterで移動する編集行は一時保持し更新操作を提示。`test_typing_does_not_rerender_app`も追加する。
- [ ] **Step 5 — commit:** `feat: edit typed ontology cells with retained drafts`。

## Task 7: 矩形選択・TSVコピー／貼付け計画（S3）

**Files:** Create `frontend/src/spreadsheet/{selection,clipboard,pastePlan}.ts`, 対応`.test.ts`。
Modify `frontend/src/spreadsheet/{TableGrid,SpreadsheetView}.tsx`, `frontend/src/index.css`。

**Interfaces:** `parseTsv(text: string) -> string[][]`、`serializeTsv(cells: string[][]) -> string`、
`planPaste(page, selection, matrix) -> {edits: CellEdit[], problems: PasteProblem[]}`。
PasteProblemはセル座標とtyped message。未読セル／複数出典／多値等の曖昧な置換は計画段階で拒否。

- [ ] **Step 1 — RED:** `test_quoted_tabs_newlines_and_trailing_empty_columns`、`test_empty_paste_is_no_change`、`test_leading_zero_and_formula_text_stay_literal`、`test_500_cells_allowed_501_rejected`、`test_unread_or_cross_source_target_is_rejected`を追加。500セルは10行×50列の未読範囲ではなく、同時取得20列以内の25×20で検証する。
- [ ] **Step 2 — RED実行:** `npm --prefix frontend run test -- src/spreadsheet/selection.test.ts src/spreadsheet/clipboard.test.ts src/spreadsheet/pastePlan.test.ts`。
- [ ] **Step 3 — 実装:** 矢印・Shift矩形選択・コピー／TSV貼付けを追加。Tabによる表への出入と編集セル移動を分離し、スクリーンリーダーへ座標・選択を伝える。値の追加や削除は空欄貼付けと区別し、ページをまたぐ選択や暗黙の行追加は行わない。
- [ ] **Step 4 — GREEN:** 同試験と`test_multivalue_paste_requires_value_editor`、`test_repeated_copy_paste_preserves_matrix`、`test_prototype_named_source_headers_are_literal`を成功させる。clipboardへHTMLを生成せず、アプリ内で数式を評価しない。
- [ ] **Step 5 — commit:** `feat: select and paste spreadsheet cell ranges`。

## Task 8: 一括preview・原子的確定・行の作成／削除（S3）

**Files:** Create `frontend/src/spreadsheet/PatchPreview.tsx`, `backend/tests/test_spreadsheet_bulk.py`,
`frontend/src/spreadsheet/PatchPreview.test.tsx`。Modify `backend/app/spreadsheet/{planning,operations}.py`,
`frontend/src/spreadsheet/SpreadsheetView.tsx`, `frontend/src/spreadsheet/editing.ts`, `frontend/src/api.ts`。

**Interfaces:** `PatchPreview({owner, patch, preview, onCommit, onCancel})`。
一括commitもTask 5のTablePatchを使う。削除はremoveの配列、行追加は既存Create系commandを使い、識別子変更は既存専用操作へ移動する。

- [ ] **Step 1 — RED:** backendで`test_500_cell_patch_is_one_change_and_one_undo`、`test_one_invalid_cell_rolls_back_all`、`test_over_1mib_rejected_before_work`、`test_preview_basis_change_is_409`を追加。frontendでpreview差分の全ページ、取消、1回だけ送信、失敗時matrix保持を検証する。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_bulk.py -q`と`npm --prefix frontend run test -- src/spreadsheet/PatchPreview.test.tsx`を、それぞれroot基準の別shellで実行。
- [ ] **Step 3 — 実装:** 削除と複数セル変更をpreviewへ接続し、サーバーでも500セル／1 MiBを検査。UIは現在の出典へだけ送信。追加行は保存先と種類を指定し、クラス／概念／個体の既存作成フォーム・commandに接続する。
- [ ] **Step 4 — GREEN:** RED試験と`test_remove_is_not_empty_literal`、`test_row_creation_is_explicit`を成功させる。team版の一括CAS競合とUndoはTask 12でも確認する。
- [ ] **Step 5 — commit:** `feat: preview and atomically apply spreadsheet patches`。

## Task 9: RML生成元追跡と逆変換可能性（S4）

**Files:** Create `backend/app/spreadsheet/snapshot_mapping.py`, `backend/tests/test_spreadsheet_snapshot_mapping.py`。
Modify `backend/app/rml.py`, `backend/app/spreadsheet/capabilities.py`。

**Interfaces:** `run_traced(mapping, table) -> TracedRun`、既存`run(mapping,table) -> (Graph,dict)`は契約不変。
TracedRunはgraph/reportと`statement -> set[(sourceRowId,column,objectMapId)]`を保持する。
`resolve_snapshot_edit(run, ref, old_term, new_term) -> SourceCellEdit | Refusal`。
複数の逆変換結果は同じ元セルの同一変更なら1件へ集約し、newTextが異なるなら全体を拒否する。
sourceRowIdは同じBasisのsource.csvにおける1始まりのデータ行番号。更新後の別Basisへ流用しない。

- [ ] **Step 1 — RED:** `test_two_rows_producing_one_statement_are_not_direct_editable`、`test_two_maps_same_statement_are_not_direct_editable`、`test_single_origin_maps_to_exact_source_cell`、`test_regenerated_term_must_equal_requested_term`を追加。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_snapshot_mapping.py tests/test_rml.py -q`。
- [ ] **Step 3 — 実装:** 既存RML評価を共有してtraceを任意取得し、通常importのコストを増やしすぎない。subjectキー、複合template、定数、bnodeはsource編集へ分類。逆変換後に全体を再生成し、empty/datatype/lexicalが再現できない直接編集は拒否する。
- [ ] **Step 4 — GREEN:** `test_source_empty_removes_statement_but_literal_empty_is_refused`、`test_invalid_typed_value_is_plain_literal_only_in_source_preview`、`test_row_2001_is_never_generated`、`test_two_rdf_edits_conflicting_on_one_source_cell_are_rejected`を成功させる。traceなしrunとtraceありrunのgraph/reportが同じであることもassert。
- [ ] **Step 5 — commit:** `feat: trace snapshot statements to editable source cells`。

## Task 10: snapshot候補生成とlocalの原子的更新・復旧（S4）

**Files:** Create `backend/app/spreadsheet/{snapshot_plan,snapshot_journal}.py`,
`backend/tests/test_spreadsheet_snapshot_transactions.py`。Modify `backend/app/snapshots.py`, `backend/app/projects.py`。

**Interfaces:** `prepare_snapshot_patch(service,pid,sid,patch: SnapshotPatch) -> SnapshotCandidate`、
`SnapshotService.commit_table_patch(pid,sid,candidate) -> dict`、
`recover_snapshot_transactions(data_dir: Path) -> None`。
SnapshotCandidateはbasis/hash、source.csv/data.ttl/snapshot.jsonの前後bytes、元Excelのhash、変更差分を保持。

- [ ] **Step 1 — RED:** `test_snapshot_edit_changes_generation_once_not_model_revision`、`test_disabled_snapshot_stays_disabled`、`test_reopen_regenerates_identical_graph`、`test_xlsx_original_bytes_unchanged`を追加。障害注入でファイル公開の各境界に停止を入れ、再起動後に全て旧または全て新になることをassert。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_snapshot_transactions.py -q`。
- [ ] **Step 3 — 実装:** local専用journalをdata rootの`.snapshot-transactions/`へ保存し、project ZIPやRDFへ入れない。段階はPREPARED（旧へrollback可能）→COMMIT決定（新へroll-forward）→公開完了。前後bytesとhashを先にflushし、決定markerを永続化後に各ファイルを公開。読取・カード集計・複製・ZIP exportを共通editing gate→文書lock→snapshot lockの捕捉へ接続し、startupではloadより先に復旧する。復旧不能は対象を利用不可として理由を表示し、現行loadの破損snapshot黙示skipへ流さない。sourceRow/columnの存在・oldText・同一セルの矛盾を候補生成時に検査する。
- [ ] **Step 4 — GREEN:** 障害注入を全境界で通す。元値とjournal pathをserver発行IDで検証し、任意pathを受けない。再生成report・行対応・カードdata集計も同時世代へ更新し、operation receiptをjournalに含めて結果不明の再適用を防ぐ。公開完了後はoperation ID・payload hash・成功結果のreceiptを別記録へ永続化し、そのflush完了後、lock解放前にjournalを退役する。次の通常snapshot操作も未退役journalの復旧を先に行う。`test_export_cannot_observe_partial_generation`、`test_retired_journal_does_not_overwrite_later_refresh`、`test_crash_before_after_receipt_flush_and_journal_retirement_preserves_result`を追加し、再起動後の同一操作の照会／再送が元結果を返しgenerationを進めないことをassert。Windowsではdirectory置換やfsyncの仮定を分離し、native試験を追加する。
- [ ] **Step 5 — commit:** `feat: commit and recover local snapshot table edits`。

## Task 11: snapshot専用Undo・再取込による失効（S4）

**Files:** Create `backend/app/spreadsheet/snapshot_history.py`, `backend/tests/test_spreadsheet_snapshot_history.py`。
Modify `backend/app/snapshots.py`, `backend/app/spreadsheet/snapshot_journal.py`。

**Interfaces:** `snapshot_history_state(pid,sid) -> dict`、
`undo_snapshot_patch(pid,sid,basis,operation_id,*,redo: bool=False) -> dict`。
履歴はlocal専用、開いているsnapshot sessionごとの前後candidateを持つ。journalは復旧・receipt用であり無期限履歴として扱わない。

- [ ] **Step 1 — RED:** `test_snapshot_undo_restores_source_graph_and_report_together`、`test_redo_restores_same_candidate`、`test_refresh_remap_remove_invalidate_table_history`、`test_undo_does_not_resurrect_deleted_snapshot`、`test_model_history_is_unchanged`を追加。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_snapshot_history.py -q`。
- [ ] **Step 3 — 実装:** Task 10と同じ公開経路で旧／新candidateを復元し、Undo/Redoごとgenerationを進める。refresh/remap/edit_mapping/set_enabled/removeに失効を接続し、状態確認はexpected basisも検査。再起動後のlocal Undoは提供せず、その状態をUIへ返す。編集中snapshotのreceiptは再起動後も結果照会可能とする。
- [ ] **Step 4 — GREEN:** `tests/test_snapshots.py`と新試験を実行。別projectの遅いUndoや新規編集後の古いRedoが拒否されることもassert。
- [ ] **Step 5 — commit:** `feat: add source-scoped snapshot edit undo`。

## Task 12: snapshot API・team確定・ソース表UI（S4）

**Files:** Create `frontend/src/spreadsheet/{SnapshotSourceView,SnapshotEditPreview}.tsx`, 対応test、
`backend/tests/test_spreadsheet_snapshot_http.py`, `backend/tests/test_team_spreadsheet_snapshots.py`。
Modify `backend/app/routers/spreadsheet.py`, `backend/app/team/{commands,workspace,permissions,history}.py`,
`frontend/src/spreadsheet/SpreadsheetView.tsx`, `frontend/src/spreadsheet/editing.ts`, `frontend/src/api.ts`, `frontend/src/state/projectStore.ts`。

**Interfaces:** `GET /api/projects/{pid}/data/{sid}/table`はSourcePageを返す。
`POST .../table/preview`、`POST .../table/commit`、`POST .../table/{undo,redo}`。
preview/commitはSnapshotPatchを受ける。previewはTask 10のSnapshotCandidateを生成してPreviewを返し、commitはbasis/hashを再照合する。
`SnapshotSourceView({owner,snapshotId,onClose})`は元の列・行のPageを編集し、再生成結果のpreviewを開く。

- [ ] **Step 1 — RED:** `test_snapshot_preview_changes_no_resources`、`test_team_commit_updates_existing_resources_once`、`test_editor_undo_updates_values_but_cannot_create_or_delete_resource`、`test_role_downgrade_blocks_replay_and_undo`を追加。`test_unmapped_columns_and_skipped_rows_are_editable_in_source_mode`、`test_unknown_source_coordinate_and_stale_old_text_are_rejected`でRDF subjectのない元表セルを検証。UIでは多重生成値がsource表を開くこと、空欄化によるstatement削除、IRI変更の参照切れ警告を検証。
- [ ] **Step 2 — RED実行:** HTTP試験をnativeで、team試験をTask 14の内部Composeで、UI試験を`npm --prefix frontend run test -- src/spreadsheet/SnapshotSourceView.test.tsx src/spreadsheet/SnapshotEditPreview.test.tsx`で実行。
- [ ] **Step 3 — 実装:** previewはeditor・非shared_update、読取はviewer、commit/undo/redoはeditorとして明示登録。team candidateではlocal journal/historyを作らず、既存source/data/meta・graph・generationを同じresource commitへ載せる。必要な新metadataは既存snapshot.json内の値とし、新resourceを作らない。workspaceの広いproject `/undo`判定を文書／snapshotの厳密なroute別分岐へ変更し、既存repository/historyのinverse・権限検査は再利用する。snapshot応答はsnapshot summary/generation/history stateで返し、文書stateへ偽装しない。
- [ ] **Step 4 — GREEN:** team CAS一勝一敗、同じoperation replay、別操作後Undo拒否、backup/restore後の再生成一致を検証。`test_snapshot_a_undo_rejects_latest_snapshot_b_or_model_edit`、`test_document_undo_rejects_latest_snapshot_edit`で最新本人operationのproject/source/種別を厳密に照合する。UIに原本Excel保持／取り込み後編集済み／再取込時の置換差分を表示。source表も500セル・1 MiB、原子的確定を継承する。
- [ ] **Step 5 — commit:** `feat: edit snapshot source tables in local and team modes`。

## Task 13: 国・政府組織profileと専用編集の接続（S5）

**Files:** Modify `backend/app/spreadsheet/{capabilities,planning,validation}.py`,
`backend/app/government/{commands,references,validation}.py`, `backend/app/editing.py`,
`frontend/src/spreadsheet/{viewPreferences.ts,SpreadsheetView.tsx}`。
Create `backend/tests/test_spreadsheet_government.py`、frontendのprofile列セット試験。

**Interfaces:** registryから現行`CreateCountry`、`CreateGovernmentOrganization`、
`PutGovernmentRelation`、`PutGovernmentName`等の計画・最終検証を再利用する。
profileごとの列セットは通常のpredicate IRI配列であり、正本に投影用の直接関係を追加しない。

- [ ] **Step 1 — RED:** `test_country_name_edit_preserves_iri_and_reference`、`test_relation_period_edits_validate_final_record`、`test_reference_country_change_invalidates_preview`、`test_projected_relation_is_not_editable_canonical_data`、`test_unsupported_profile_field_routes_to_specialist`を追加。
- [ ] **Step 2 — RED実行:** `cd backend && python -m pytest tests/test_spreadsheet_government.py -q`。
- [ ] **Step 3 — 実装:** Country/Organization/RelationRecord/NameRecord/ChangeEventに列セットを用意。履歴recordのsubject/predicate/object/期間/出典は一括最終状態で検証。profileが所有する項目を汎用annotation変更で迂回させず、まだ適応できない項目は既存専用フォームへ明示的に誘導。元のprofile handlerが使うcountry snapshotとexpected集合を維持する。
- [ ] **Step 4 — GREEN:** 新試験、`tests/test_government_commands.py tests/test_government_changes.py`、teamの`test_team_government.py`を該当partitionで実行。国・組織以外の通常ontology/taxonomyも回帰確認する。
- [ ] **Step 5 — commit:** `feat: connect spreadsheet editing to government profiles`。

## Task 14: 性能・アクセシビリティ・実ブラウザー・全検証（S5）

**Files:** Create `backend/tests/test_spreadsheet_budgets.py`, `frontend/src/spreadsheet/SpreadsheetView.budget.test.tsx`,
`scripts/spreadsheet_browser.mjs`, `docs/spreadsheet-verification.md`。
Modify `README.md`, `docs/known-state.md`, `CLAUDE.md`（検証で新たに確定した規則のみ）、
`docs/p2-postgresql-test-inventory.{json,md}`, `docs/i18n-message-inventory.md`。
必要に応じ`.github/workflows/ci.yml`へ既存と同じ内部Compose/browser実行を追加する。

**Interfaces:** `node scripts/spreadsheet_browser.mjs local`と`team`。
既存driverのCDP／server管理を再利用し、一時データだけで起動、終了時に自分のprocessを回収する。
`team`は既存内部Composeの認証fixtureと非公開DBを使い、hostへDBを公開しない。

- [ ] **Step 1 — RED:** 既存synthetic_dictionaryの規模で全件到達・列取得・更新後再索引を検証。100行×20属性以外をDOMへ描画しないこと、warm pageで元graphを再走査しないことをcountでassert。時間試験はbackend median5、frontend warm-up後median7以上、limit_ms/limitMs経由とする。
- [ ] **Step 2 — 予算設定:** 同じfixtureの既存entities読取と並べて基準を測定し、50行×8列のwarm pageは中央値500 ms、単セル確定後のwarm再読込は中央値1,000 msを初期予算とする。cold索引は既存entities索引の中央値3倍以内も測定。いずれも実測と比較条件を記録し、緩和で失敗を隠さず原因を修正する。
- [ ] **Step 3 — 実ブラウザー:** ローカルで一覧→セル編集→Undo→500セル貼付け→無効値拒否→snapshot編集→再読込を通す。teamで2 session競合・viewer拒否・再送・source Undoを通す。IME、引用付きTSV、F2/Enter/Tab/Escape、表外へのTab、フォーカス復帰、日英切替、light/dark、構造と全値の展開を操作し、スクリーンショットを開いて確認する。実行時にprojectの`run-semantic-viewer`と`a11y-check`、性能測定には`perf-budget`を読む。
- [ ] **Step 4 — 全GREEN:** 以下の全検証を実行し、環境・command・件数・結果をverificationへ記録。新backendケースは既存case IDを保持したままinventoryを更新し、team_db分類を実fixture依存から確認する。新source/header、i18n生成、配布依存、遅延chunkもbuildで確認する。
- [ ] **Step 5 — commit:** `test: verify ontology spreadsheet workflows and budgets`。レビュー可能な差分をまとめる。push／PR作成はその時点のユーザー指示に従う。既存CIへ出した場合は最新headの必須checks成功までを実装完了条件とする。

全検証command（各ブロックはrepository rootを基準に別shellで実行）：

```bash
cd backend
python -m pytest tests -m "not team_db and not network" -q
```

```bash
npm --prefix frontend run test
npm --prefix frontend run build
python scripts/generate_message_contracts.py --check
node scripts/spreadsheet_browser.mjs local
node .claude/skills/run-semantic-viewer/driver.mjs smoke
```

team DBは[既存の内部runner手順](../../p2-postgresql-test-inventory.md#全集合の実行)で一時secrets・
専用Compose project・非重複subnetを用意し、`PYTHON_VERSION`ごとにbuild後、次を実行する。
これは準備なしでhost DBへ接続するcommandではない。

```bash
PYTHON_VERSION=3.12 docker compose -f docker-compose.postgresql-test.yml build pg-tests
PYTHON_VERSION=3.12 docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest tests -m "team_db and not network" -q -o cache_dir=/tmp/pytest-cache
PYTHON_VERSION=3.14 docker compose -f docker-compose.postgresql-test.yml build pg-tests
PYTHON_VERSION=3.14 docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest tests -m "team_db and not network" -q -o cache_dir=/tmp/pytest-cache
node scripts/spreadsheet_browser.mjs team
```

## 設計との対応・引き渡し

| 設計書 | 実装Task |
| --- | --- |
| §1〜4：全データ・行・列・方式 | 1〜3 |
| §5：型・多値・言語・入力・保存 | 1、4〜6 |
| §6：Excel操作・一括 | 7〜8 |
| §7.1：文書command・意味検査 | 4〜5、13 |
| §7.2：snapshot・逆変換・復旧・履歴 | 9〜12 |
| §7.3：外部参照・ライブラリ | 2〜3、5 |
| §8：API・basis・preview・競合 | 1〜2、5〜6、8、12 |
| §9：上限・キャッシュ・純粋ロジック | 1〜3、6〜7、14 |
| §10：国・組織 | 13 |
| §11〜12：全受入条件・残る実装判断 | 1〜14 |

本計画で追加確定した実装判断：camelCase wire、source別のoperation receipt、local snapshot journalの
PREPARED/COMMIT公開、再起動後のlocal snapshot Undo非提供、teamは既存resource値更新のみ。
これらは全件到達・正本所有・原子性・RDF保持という設計の契約を狭めない。

計画の自己点検：全12節と5つのReview FocusにTaskを割当済み。共通型、API、依存順序、
local/teamの書込口を照合する。今回の文書チェックはアプリの実装・テスト成功を意味しない。
実装開始時は設計書と本計画の両方を読み、進捗はチェックボックスとverificationへ記録する。
