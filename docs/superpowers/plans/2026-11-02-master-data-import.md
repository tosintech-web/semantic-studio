# 国・組織マスター取り込み Implementation Plan

実装記録（2026-11-02）: Tasks 1–7とTask 8の実ブラウザー操作を実装済み。レビューで指摘された複数列の集合置換、既存期間記録0件、再認証後の入力保持を再現テスト付きで修正した。国・組織・関係の取り込み、再取り込みの無変更、1回のUndoは実Chromeで成功。新規依存・DB schema変更なし。

検証: 取り込み／在庫整合性45件、API／画面／状態／翻訳48件、同一利用者の再認証と別利用者への入力引き継ぎ拒否5件、CI構成6件が成功。内部専用PostgreSQL Python 3.12は全289件成功。最終ソースのPython 3.14全体と[PR #11のCI](https://github.com/tosintech-web/semantic-studio/pull/11)で最終ゲートを確認する。Macの全体回帰では127.0.0.2未設定の既存3件と性能予算の超過を記録し、閾値・テスト選択は変更していない。元のチェックリストは設計時の受け入れ条件として残す。


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. If the user chooses delegated execution, use superpowers:subagent-driven-development instead. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第1段階として、CSV／Excelから国・組織の新規登録・差分更新、および明示した組織関係の追加・訂正・終了を、安全なプレビューと一括Undo付きで実装する。

**Architecture:** 表の安全な解析、型のある入力への対応付け、変更前グラフS0での全行照合、候補S1の全体検証、単一Changeの確定を分離する。ファイル解析はマスターを書き換えず、確定は新設する `ImportMasterBatch` だけを通す。ローカルとチームは同じ計画生成器を使い、権限・CAS・監査・再送は既存の正本境界に統合する。

**Tech Stack:** 既存のPython 3.11+ / FastAPI / rdflib / openpyxl / defusedxml、React 18 / TypeScript / Vitest、専用PostgreSQL Compose runner、既存Chrome harness。依存パッケージ追加なし。

**Spec:** [改訂設計案](../specs/2026-11-01-master-data-import-design.md)。本計画作成のみを依頼された段階であり、アプリの実装・コミット・プッシュは本作業では実行しない。

## Global Constraints

- 優先順位は①CSV／Excel、②RDF／Turtle、③Web／PDF。本計画で実装可能なタスクへ分解するのは第1段階。
- 第1段階から新規登録と差分更新を実装する。統合・分割・移管イベント、名称履歴の一括生成は含めない。
- ファイル5 MiB、表2,000行・100列、セル32,767文字。解析後の候補グラフ100,000ステートメント。
- 既存の256 KiBはJSONコマンド要求本体の上限。プレビューと確定の両方へ適用し、ファイル制限やRDF量と混同しない。
- 1表・1対象プロジェクト・1確定につき1つのChange／Undo。無確認の自動分割・部分登録・欠落行の削除をしない。
- コードは名称と分離し、大小文字等を自動変換しない。既存IRIを維持し、未対応付け項目・他言語・履歴を保持する。
- Excelの識別キーは文字列セルのみ。数値・数式から表示上の先頭ゼロや失われた桁を復元しない。
- 全行をS0で先に照合し、操作種別をまたぐ同一記録への重複操作を拒否する。
- `editing.py` だけがプロジェクト文書を変更する。行単位の既存Createコマンド連続実行や、任意のRDF差分の受付は禁止。
- 同じ内容の再取り込みは変更なし。プレビューはモデル・Undo・チーム資源版・監査・再送記録を増やさない。
- チームのDBアクセスは既存の正本境界を使う。新規SQL、DB schema変更、SQLite、DBポート公開は不要。
- 新規ソースにはCLAUDE.mdの構造化ヘッダー。UIは日英カタログ・既存エラー境界・focus-visibleを使い、入力をHTMLとして描画しない。
- 既存スナップショット取り込み、専用フォーム、履歴編集、Table利用者、性能予算を維持する。

## Review Focus

1. 列名の重複、`__proto__`、空行・改行セルで別の列／行を更新しない（Task 1・6）。
2. 確認後の国参照・profile・認証・対象切り替えで古い差分を適用しない（Task 4・5・6）。
3. 行を除外した後、照合先・重複・循環を再計算し、除外前の承認を使わない（Task 2・3・6）。
4. 既存一致の追加と訂正／終了が同じ記録に重なる場合、行順に依存しない（Task 3）。
5. 保存・公開途中の失敗、応答喪失、全件無変更で部分適用・二重登録・不要な履歴を作らない（Task 4・5・8）。

## 実装前提と依存順

実装開始時にCLAUDE.md、設計案、本計画を再読する。PR #10のホームタブ・ORG固定作成を前提とするため、最新mainへの取り込み状況を確認し、未取り込みなら依存ブランチを明示する。今回の未追跡設計案も実装ブランチへ持ち込む。無関係なアカウントメニュー・ユーザーガイド・AGENTS等の作業中変更を混ぜない。

依存順は **Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**。各タスクはRED→GREEN→回帰確認→コミットの順。解析・候補生成だけで第1段階全体を完了扱いにしない。

| 単位 | 主な責務 |
| --- | --- |
| `government/import_models.py` / `import_mapping.py` | 入力DTO、列位置による対応付け、欠落／空欄／明示消去の区別 |
| `government/import_tabular.py` / `tabular.py` | 元の行位置とセル種別を保つ安全な読取、従来読取との互換性 |
| `government/import_entities.py` / `import_relations.py` / `import_plan.py` | コード照合、項目マージ、記録操作、S1と差分・レポート |
| `government/import_receipts.py` / `import_context.py` | 元ファイル由来の入力と対象・要求所有者の結び付け |
| `editing.py` / `routers/government.py` / `routers/projects.py` | 読取HTTP、dryRun、単一Changeの確定・Undo・失敗回復 |
| `team/permissions.py` / `team/workspace.py` | 読取例外、CAS、再送、無変更確定 |
| `frontend/src/government/imports/` | 型、要求サイズ、状態遷移、専用ウィザード |

## 計画で固定する境界とインターフェース

### 入力・HTTP・一時データ

ファイルはブラウザーが保持し、必要な読み取りへ再送する。サーバーへ原ファイルや解析セッションを永続保存しない。
ファイルから生成した操作と確認基準の対応を検証できるよう、標準ライブラリHMAC-SHA256で **準備済みbatchの署名receipt** を作る。新しいDBや外部秘密管理サービスは追加しない。
署名鍵はapp lifespanで生成するプロセス内の32 byte鍵で、分離候補ごとに生成しない。署名対象はversion・元ファイルSHA-256・表選択・列対応・対象行・型付き操作・対象pid/doc・所有者で、応答やログへ鍵／セッション値を出さない。
チームの所有者はサーバーのprincipalとRequestAuthに結び付ける。ローカルはown-page guardに加え、UI操作nonceで別ウィザードの応答を混ぜない。nonceを認証権限として扱わない。
再起動・再認証で未確定receiptが無効なら再解析・再確認する。既に受理したチーム再送は既存の永続再送結果を先に返し、再起動後も元の受理結果を取り出せる順序を保つ。
この方式は設計の「ファイル基準をサーバーで検証する」を具体化する計画上の選択である。

| HTTP | 入出力と用途 |
| --- | --- |
| `POST /api/projects/{pid}/government/import/inspect` | multipart `file`・`mode`・JSON文字列`options`。モード、シート・見出し、位置付き見本、総行数・制限・候補列を返す。編集権限を要する非共有更新の読取 |
| `POST /api/projects/{pid}/government/import/prepare` | 同じファイル＋`mode`・`options`・`mapping`・`selectedRows`・操作nonce。型付きbatchとreceipt、または位置付き入力エラーを返す。上限超過ならbatchを発行せず分割対象を示す |
| `POST /api/projects/{pid}/documents/model/commands` | `{command:"ImportMasterBatch",args:{batch,receipt,previewBasis?,reportOffset?,reportLimit?},dryRun?}`。dryRunはグラフ照合・全体検証、確定はその基準を再計算して単一Changeを適用 |
| `GET /api/projects/{pid}/government/import/templates/{mode}/{format}` | mode=`countries`/`organizations`/`relations`、format=`csv`/`xlsx`。有限値だけ許可し、ローカルパスとして展開しない。read権限 |

解析・prepareでは既存と同じstreaming読取・タイムアウト・contextvarsの継承を使う。プロジェクトとprofileの確認をbody解釈より先に行う。
multipart総体は `tabular.MAX_BYTES + ontologies.CHUNK_BYTES`、ファイル実体5 MiB、JSON form値の合計32 KiBをそれぞれ確認する。コマンドは現行の正確な256 KiBを維持する。
inspectは見本20行まで、セル表示256文字までとし、切り詰めの有無と真の長さを返す。prepareは常にサーバーが原値を再読するため、見本の切り詰めは書き込み値を変えない。
レポート表示は50行ずつ、真の合計と位置を持つ。全行を内部で検証し、画面の先頭50行だけで適用可否を判定しない。表示ページ変更は同じbatchの読み取りとして扱う。ページ変更の応答も基準と要求generationを照合する。

### 共通データ契約

`import_models.py` はPydanticのextra禁止モデルを、TS側は同じwire名を定義する。下記は公開する型の最小契約で、無制限のdictや任意述語を追加しない。

- `SourcePosition {rowId:int, record:int, startLine:int, sheet?:str}`：rowIdとrecordは1始まりの安定した非空データ行ID／論理レコード番号。ExcelのstartLineは物理行。selectedRowsは昇順の一意なrowIdとしてcanonical化する。
- `CellEvidence {column:int, originalHeader:str, text:str, kind:"text"|"number"|"formula"|"date"|"boolean"|"empty", truncated:bool, length:int}`。適用用の原値は見本DTOから復元しない。
- `MasterMode = "countries"|"organizations"|"relations"`。
- `FieldEdit {op:"set"|"append"|"replace"|"clear", language?:str, values:list}`。namesは言語付き文字列、aliasesは言語付き文字列集合、sourcesは既存Source型、期間境界は既存Bound型、他の単一値は文字列とする。names/scalar/boundはset、aliases/sourcesはappend/replace、clearは設計上消去可能な項目だけ。clearのvaluesは空、他のopの必須値を厳密検証する。JSONの未指定を保持として扱い、日付不明の明示値と区別する。
- `MasterMapping {columns:list[ColumnMapping], defaults:dict, rowOverrides:list[RecordOverride]}`。ColumnMappingは `{column:int,field:FieldName,language?:str,sourceKind?:"text"|"iri",op,delimiter?:str}`。defaultsのキー・型は下記FieldNameに限定し、code/recordIri/subjectCodeの共通既定値は禁止。defaultsは新規個体・新規記録の不足値にだけ適用する。map段階では埋めず、S0照合後にplannerが新規と判断した場合のみ使い、既存行の未指定・空欄を保持する。RecordOverrideは `{rowId:int,existenceRecordIri?:str,affiliationRecordIri?:str,recordIri?:str}` のみ。UIの記録選択もprepareをやり直してこの値を署名対象に含める。
- `FieldName` の許可表：countries=`code,names,aliases,description,sources`、organizations=`code,names,orgKind,countryCode,existenceStart,existenceEnd,affiliationStart,affiliationEnd,existenceRecordIri,affiliationRecordIri,sources`、relations=`action,recordIri,subjectCode,predicate,objectCode,relationStart,relationEnd,sources,description`。names/aliasesのlanguageは必須。delimiterはaliases/sourcesだけ。上記以外の項目は422。
- `EntityIntent {row:SourcePosition, code:str, fields:dict[str,FieldEdit]}`。fieldsの許可キーと値型はcountries/organizationsの上記FieldNameに限定し、codeはfieldsに置かない。記録IRIの指定も型付きで保持する。組織の期間訂正には確認対象の既存記録IRIを含む。
- `RelationIntent {row:SourcePosition,action:"add"|"correct"|"end",recordIri?:str,subjectCode:str,predicate:str,objectCode?:str,fields:dict[str,FieldEdit]}`。fieldsはrelationStart/relationEnd/sources/descriptionだけ。predicateは設計第6節の5種類だけ。correct/endはrecordIri必須、addはobjectCode必須。endのfieldsは明示したISO終了日のrelationEndだけで、出典・説明等の変更は拒否する。correctのsubjectCodeとpredicateはS0の記録への照合条件であり、主体・述語の変更はこの操作で行わない。関係種別を変える場合は旧記録の終了＋新記録の追加を明示する。
- `MappedRows {intents:list[EntityIntent|RelationIntent],issues:list[RowIssue],selectedRows:list[int]}`。`RowIssue {row:SourcePosition,code:str,args:dict,column?:int}` は既存message contractで許可した平坦な引数だけを持つ。
- `MasterBatch {version:1,source:{sha256:str,filename:str,options:dict},mode:MasterMode,mapping:MasterMapping,selectedRows:list[int],operationNonce:str,intents:list[EntityIntent|RelationIntent]}`。コードの原値・正規化値、空欄ポリシーもcanonicalな内容へ含める。
- `PreparedBatch {batch:MasterBatch|null, receipt:str|null, issues:list[RowIssue],summary:ImportSummary,requiredBytes:int}`。署名する前に、プレビューと確定の要求全体が上限内であることを確認する。
- `ImportOwner`：pid/docとサーバー認証所有者、ローカルnonce。内部専用で、セッション識別子をwire型へ露出しない。
- `MasterImportPlan`：S0の基準、候補S1、追加・除去する実際のRDF値、安定した候補IRI、行ごとの結果、warning、適用可否、no-op。内部型で、S1をクライアントへ任意差分として渡さない。
- `ImportSummary {selected:int,excluded:int,created:int,updated:int,unchanged:int,errors:int,needsReview:int}`。件数はRDF statement数ではなく元表の行数。warningsは別に表示する。
- `RowReport {row:SourcePosition,status:"created"|"updated"|"unchanged"|"error"|"needs-review",entityIri?:str,recordIri?:str,issues:list[RowIssue],fields:list[FieldDelta],recordChoices:list[str]}`。recordChoicesは対象S0で選択可能な既存記録IRIだけ。
- `FieldDelta {field:FieldName,language?:str,recordIri?:str,before:list[RdfTerm],after:list[RdfTerm]}`。RdfTermは `{kind:"iri"|"bnode",value:str}` または `{kind:"literal",value:str,language?:str,datatype?:str}`。内部のRDF termを表示用の名称から復元しない。
- `MasterImportPreview {basis:str,resourceVersions?:ResourceVersions,ready:bool,noop:bool,summary:ImportSummary,rows:list[RowReport],totalRows:int,warnings:list[RowIssue],offset:int,limit:int}`。既存の一意な期間記録に明示確認が必要なら、recordChoicesを返してneeds-reviewとする。UIでRecordOverrideを選び、prepare→previewをやり直す。
- 表示ページは同じpreview要求に `reportOffset` / `reportLimit`（最大50）を外側の表示パラメーターとして付ける。basis・署名batch・候補IRIにページを含めず、意味的なpayloadとページの更新を分離する。
- `MasterImportResult`：既存CommandResultのrevision/state/label/deltaと同じ境界に、型付き`importReport`と`noop`を加える。文字列化済みの英語文を状態として保持しない。

`previewBasis`は64文字のSHA-256。JSON要求サイズはJSの文字数ではなくUTF-8 bytesで測り、確定用のbasisを入れた要求も含めて256 KiB以内とする。
`FieldEdit`のitemsを厳密に検証し、clearで必須名称・記録出典・不変の照合コードを消せないようにする。日付はISO日付／明示した不明・境界なしを区別し、Excelの時刻付き値を無断で日付へ切り捨てない。

## Task 1: 位置とセル型を失わない解析・対応付けの基礎

**Files:** Create `backend/app/government/import_models.py`, `import_tabular.py`, `import_mapping.py`; modify `backend/app/tabular.py`; create `backend/tests/test_master_import_tabular.py`; extend `backend/tests/test_tabular.py`, `test_xlsx_defences.py` only for compatibility assertions.

**Interfaces:** MasterTableは `table:Table,positions:list[SourcePosition],evidence:list[list[CellEvidence]]` と同じ行数・列位置の原値を持つ内部型。`options`は既存DataOptionsのCSV/Excel選択項目のみとし、extraは禁止する。`read_master_table(data:bytes,filename:str,options:dict)->MasterTable`; `map_master_rows(table:MasterTable,mode:MasterMode,mapping:MasterMapping,selected_rows:list[int])->MappedRows`. MasterTableは位置・型・原値を保持し、従来Tableは既存の位置引数・DTOを維持する。modeはoptionsと別引数とし、国profileはcountriesだけ、組織profileはorganizations/relationsだけを許可する。row selectionは空集合・重複・範囲外を拒否する。未指定の選択は全非空データ行を候補にする。

- [ ] **RED:** `test_csv_positions_survive_blank_and_multiline_records`：見出し1行、空行2行目、改行セルを持つレコード開始3行目、次の開始5行目をそのまま報告する。
- [ ] **RED:** `test_xlsx_key_evidence_is_not_display_text`：文字列`001`のみキーとして許可。数値1＋書式000、数式の有／無キャッシュ、16桁数値キーは位置付き拒否。通常の名称・日付・説明セルはキー規則を適用しない。
- [ ] **RED:** `test_formula_only_row_without_cache_is_not_blank`：キー列のキャッシュなし数式だけがある行を、通常の空行として捨てずに取り込み対象のエラー行として数える。既存の通常Table利用者の空行処理は維持する。
- [ ] **RED:** `test_duplicate_headers_and_proto_names_keep_column_identity`：同名列2つと`__proto__`を列位置0/1/2で区別し、欠落・空欄・clearの意図を別々に保持。
- [ ] Run: `cd backend && python -m pytest tests/test_master_import_tabular.py -q`。未実装による失敗を確認する。
- [ ] Implement: 既存の保護されたCSV／workbook readerにメタデータ取得を追加。数式情報取得で別の無防備なXML parserを導入せず、通常読取のdata_only動作・空セル・Sheet選択を維持する。既存の列名補正を流用しても、列IDは位置にする。
- [ ] **GREEN:** 上記＋5 MiB/2,001行/101列/32,768文字/選択行の範囲外と重複、途中のExcel見出し、ZIP/XML拒否を検証。`python -m pytest tests/test_master_import_tabular.py tests/test_tabular.py tests/test_xlsx_defences.py -q` が成功すること。
- [ ] Commit: `feat(import): preserve source positions and identifier cell evidence`。

## Task 2: 国・組織の識別と非破壊マージ

**Files:** Create `backend/app/government/import_entities.py`, `import_plan.py`; extend `import_models.py`; create `backend/tests/test_master_import_entities.py`. 既存 `references.py` / `commands.py` の規則は参照し、通常フォームの動作を変更しない。

**Interfaces:** `plan_entities(ctx,batch:MasterBatch)->MasterImportPlan`。S0の所有グラフとmanifest、国参照snapshotを消費する。コードの索引は検索APIのページから作らない。生のRDF値と未対応構造を区別して照合する。未変更値を文字列化したフォーム値から組み立て直さず、元のRDF termを保持する。

- [ ] **RED:** `test_country_patch_preserves_unmapped_values`：既存IRI `urn:test:jp`、英語名Japan・日本語名日本・既存出典Aに、日本語名の訂正と別名1件・出典Bを取り込む。IRI・英語名・Aが残り、別名とBだけが追加される。
- [ ] **RED:** `test_ambiguous_code_never_becomes_new_entity`：同じコードが2個体にある／1個体に複数コードがある／コード値が未対応の場合、先頭選択・新規化をせずneeds-review。
- [ ] **RED:** `test_new_organization_resolves_country_beyond_first_page`：51番目の国コードも正しいIRIへ解決。未知コード・未接続・別profileはエラー。
- [ ] Run: `python -m pytest tests/test_master_import_entities.py -q` をbackend内で実行し、REDを確認する。
- [ ] Implement: 名称は言語単位set、別名・出典は既定で集合追加、明示したreplace/clearのみ除去。コードは照合用で書き換えない。空欄は保持。組織種別は許可する3種だけ。期間訂正は既存フォームが安全に扱える一意な記録と、確認対象のIRIを要求する。
- [ ] **GREEN:** 上記に加え、入力キー重複、空白正規化、他言語保持、必須clear拒否、新規行だけに共通既定値を適用して既存行の空欄期間・出典を保持すること、単一記録の未指定境界保持、複雑な所属履歴の拒否、既存IRI衝突、同じ入力の再計画で差分0を検証する。行除外後は残る選択行だけで再検証し、除外でエラーが解消したことも確認する。
- [ ] Commit: `feat(import): plan country and organization patches without data loss`。

## Task 3: 関係表の操作とS0での全行照合

**Files:** Create `backend/app/government/import_relations.py`; extend `import_plan.py`; create `backend/tests/test_master_import_relations.py`.

**Interfaces:** `plan_relations(ctx,batch:MasterBatch)->MasterImportPlan`; `plan_master_import(ctx,batch:MasterBatch)->MasterImportPlan` はmodeによりTask 2/3を呼ぶ。候補IRIはproject・S0基準・入力内容・安定した行IDに結び付け、同じ確認で再生成できる。

- [ ] **RED:** `test_same_record_mixed_actions_rejected_in_both_orders`：既存Rに一致するadd＋Rのcorrect、add＋endの2組を行順反転しても、両行位置付きで同じ拒否となる。
- [ ] **RED:** `test_relation_reimport_preserves_record_identity`：同じ主体・述語・対象・両境界で1件一致したRへsource Bを集合追加し、再取り込みではRも出典も増えない。2件一致は拒否。
- [ ] **RED:** `test_close_and_add_are_validated_as_one_candidate`：Rの終了日2030-04-01と、新関係の開始日2030-04-01が一緒に成立。他の記録を保持し、重なる境界や循環は全体で拒否する。
- [ ] Run: `python -m pytest tests/test_master_import_relations.py -q` でREDを確認する。
- [ ] Implement: 全行の対象をS0で解決してから候補へ反映。同じ既存記録IRIへの複数操作をaction横断で拒否。correct/endはIRIの所有・記録種別・主体を検証。1組織が複数関係行に登場するのは許可し、個体表のキー重複規則を使わない。endは終了境界だけ、その他は未指定値を保持する。
- [ ] **GREEN:** 別マスターの記録IRI、誤主体、未知述語、記録の不明境界、候補全体の100,001件、行除外後の照合・循環、同じ最終記録を生む複数行を追加。`test_master_import_entities.py` と関係の既存 `test_government_records.py` / `test_government_changes.py` も成功すること。
- [ ] Commit: `feat(import): plan explicit relationship record operations atomically`。

## Task 4: 読取API、確認基準、ローカル一括確定

**Files:** Create `backend/app/government/import_receipts.py`, `import_context.py`, `import_templates.py`; modify `backend/app/main.py`, `routers/government.py`, `routers/projects.py`, `editing.py`; create `backend/tests/test_master_import_http.py`, `test_master_import_commands.py`, `test_master_import_receipts.py`.

**Interfaces:** `SourceReceiptSigner.sign(batch,owner)->str` / `verify(batch,receipt,owner)->None`; `bind_import_context(signer,owner)` のContextVarをHTTP側で束縛しworkerへ継承する。内部の `ImportOwner` をclient argsから採用しない。`EditingService.command` に `ImportMasterBatch` の専用dispatchを既存handler検索の前に追加し、`_apply_master_import(document,plan)` による変更はediting.py内だけで実行する。

- [ ] **RED:** `test_prepare_receipt_binds_source_mapping_rows_and_owner`：元データ・列対応・選択行・pid・所有者の1要素改変で拒否。鍵が変わった未確定receiptは再解析を要求。
- [ ] **RED:** `test_preview_ids_equal_apply_and_stale_basis_rejects`：previewとapplyで新規IRI・差分が一致。グラフ、Undo/Redo、profile、接続国の変更後は拒否。
- [ ] **RED:** `test_last_row_failure_and_publish_failure_leave_s0_intact`：最終行の失敗と、公開処理への故障注入で、グラフ・revision・dirty・source状態・Undoが元のまま。成功時は全行で1つのUndo、redoも一括。
- [ ] Run: 新規3ファイルをbackend内のpytestで実行し、各REDを確認する。
- [ ] Implement: inspect/prepare/templateのHTTPと厳密schema、署名、read timeout、body上限、オフイベントループ処理を追加。コマンドdryRunはS0を読むだけでS1と基準を返す。apply時に署名・基準・参照元を再検証して計画を再計算し、原子性のためS0と関連状態を保持して公開失敗を回復する。後のautosave失敗は未保存として報告し、受理した変更を取り消したと報告しない。
- [ ] Implement: 全件差分0は一般コマンドの「変更なし」例外へ落とさずreportを返し、revision・dirty・Undoを維持する。レポートは実数と50行ページ、確認可否と警告を分離する。rawファイル・receipt・巨大なbatchをUndoや永続reportへ複製しない。
- [ ] Implement: モード別CSVとxlsxのテンプレートを有限factoryから生成し、xlsxのコードセルは文字列とする。第三者の実データやURLを初期値にしない。
- [ ] **GREEN:** 不正pid/profileはbody解釈前に拒否、未許可mode/format、URI文字列のHTML逃がし、JSON余分なキー、5 MiB＋framing/32 KiB form/正確な256 KiB/100,000 statements境界、日本語のUTF-8 byte数、全件無変更、元ファイルを保存しないことを検証。既存 `test_government_commands.py` / `test_government_http.py` / `test_upload_limits.py` / `test_no_direct_mutation.py` も通す。
- [ ] Commit: `feat(import): add reviewed bulk master command and read-only preparation API`。

## Task 5: チームの権限・CAS・再送・無変更処理

**Files:** Modify `backend/app/team/permissions.py`, `workspace.py` と必要な要求context連携、`backend/tests/test_team_auth_routes.py`; create `backend/tests/test_team_master_import.py`; update `docs/p2-postgresql-test-inventory.json`.

**Interfaces:** inspect/prepareは `operation="edit", shared_update=False` の明示policy、template GETはread。通常のedit POSTから自動導出したshared_update=Trueをこの2経路だけ除外する。model commandsのdryRun例外は `ImportMasterBatch` の完全一致を追加するだけ。その他コマンド／doc／未知経路は従来の認可のまま。

- [ ] **RED:** `test_preview_has_edit_auth_but_no_publication`：viewer403、editor200。inspect/prepare/dryRunでresources・audit・requestsの件数と版が変わらない。偽のdryRun文字列や未知コマンドは例外にしない。
- [ ] **RED:** `test_bulk_commit_cas_owns_country_and_target`：プレビュー後の参照国・対象・profile変更で409、全行未適用、国の資源は書き換えない。同時確定は1要求だけ受理。
- [ ] **RED:** `test_replay_after_response_loss_and_server_restart`：同じactor/request ID/inputは元の結果・IRI・版を返し、内容変更はrequest_mismatch。再起動後も受理済み再送は新しいプロセス鍵によるreceipt検証より先に永続結果を返す。再認可は省かない。
- [ ] **RED:** `test_noop_creates_no_resource_or_undo_version`：ImportMasterBatchのserver生成no-op結果だけはworkspace版を増やさず、既存repositoryの空changesの確定で要求結果を1件保持する。個体・文書・Undo・資源監査は増やさず、同じ要求の再送も同じreport。
- [ ] Run: 専用Compose runnerの `python -m pytest tests/test_team_master_import.py -q` でREDを確認する。DBのホストポートを開けず、既存pg_supportと合成secretを使用する。
- [ ] Implement: request-owned signer/ownerを分離候補でも同一プロセスから供給し、コマンドbodyやclientのownerを信用しない。対象／参照元／workspaceの期待版で確定する。現行の無条件workspace更新をImportMasterBatchの検証済みno-opに限り分岐させ、clientのnoopフラグで迂回できないようにする。候補を開いたことによるread由来の状態を正本変更として公開しない。
- [ ] **GREEN:** DB commit失敗で資源・監査・再送結果がまとめてrollback、期限切れ・利用停止・再認証、同じrequest IDの別actor、版付きUndoの成功・競合を検証。既存team政府・履歴・権限試験を回帰実行する。
- [ ] Inventory: backendで `python -m pytest tests --collect-only -m "" --team-inventory-output=/tmp/master-import-inventory.json` を実行。既存previous_casesの対応を保持してcases/team_dbを追加し、inventory試験も通す。以後のbackend新規case追加でも同じ更新を行う。
- [ ] Commit: `feat(team): preserve bulk import preview CAS replay and no-op semantics`。

## Task 6: クライアントの型・API・保持状態

**Files:** Create `frontend/src/government/imports/types.ts`, `importState.ts`, `request.ts`, `importState.test.ts`, `request.test.ts`; modify `frontend/src/api.ts`, `i18n/types.ts`, `i18n/ja.ts`, `i18n/en.ts`, `docs/i18n-message-inventory.md`, `backend/app/message_contracts.json`; generate `frontend/src/i18n/server-contracts.ts` with the existing generator.

**Interfaces:** api.tsに `inspectMasterImport(pid,file,mode,options,signal?)`、`prepareMasterImport(pid,file,mode,options,mapping,selectedRows,nonce,signal?)`、`previewMasterImport(pid,prepared)`、`applyMasterImport(pid,prepared,preview)`、`downloadMasterTemplate(pid,mode,format)` を追加し、既存send/postForm/bytesとCLIENT_HEADERを使用。`importState.ts` は `ImportOwnerKey {pid,editorSession,authEpoch,nonce}` と入力generationごとに結果を保持する。

- [ ] **RED:** `test_late_response_cannot_replace_new_file_project_or_auth_owner`：A→Bのファイル選択、project切替、editorSession変更、再認証後にAの成功／失敗が届いてもBの状態を変えない。
- [ ] **RED:** `test_mapping_and_exclusions_invalidate_review_not_input`：列対応・共通値・空欄ポリシー・対象行を変えるとprepare/previewを無効化し、元fileと残る入力を保持。記録選択はRecordOverrideに入りprepareをやり直す。言語変更だけなら入力・RDF言語・基準を維持。
- [ ] **RED:** `test_apply_uses_reviewed_versions_and_exact_utf8_envelope`：previewのworkspace/対象/国の版を明示ヘッダーへ使い、最新のグローバル版に差し替えない。日本語文字列のbyte数とbasis追加後の256 KiBを検証する。
- [ ] Run: `npm --prefix frontend test -- src/government/imports/importState.test.ts src/government/imports/request.test.ts` でREDを確認する。
- [ ] Implement: reducerを段階 `file → mapping → review → result` と要求所有者で分ける。prepareとpreviewを区別し、receipt付きbatchのclient編集を禁止する。通信中の確定を1件に制限。401/409/503は原因と入力を保持して停止し、自動再送・自動承認・自動分割をしない。受理不明時は同じチーム要求IDの照会／再送だけを既存client規則で扱う。
- [ ] Implement: 行・理由は型付きcode/argsで保持し、未知エラーは元オブジェクトを既存renderServerErrorへ渡す。new source metadataに原キー値やトークンを不要に永続化しない。raw server errorを英語文字列で分類しない。
- [ ] **GREEN:** 古い応答、Abort、言語変更、nonce、receipt期限切れ、行除外後の再prepare、列名`__proto__`、確認後の版を使った確定、全件無変更で新しいUndoを通知しないケースを通す。i18n coverage、`frontend/src/api.test.ts` と `frontend/src/team/client.test.ts` を回帰実行する。
- [ ] Commit: `feat(import-ui): add typed import API and owner-bound review state`。

## Task 7: 専用ウィザードとホーム・編集画面の入口

**Files:** Create `frontend/src/government/imports/MasterImportWizard.tsx`, `ImportMapping.tsx`, `ImportReview.tsx`, `ImportResult.tsx` と各component test; modify `frontend/src/government/GroupNavigation.tsx`, `GovernmentWorkspace.tsx`, `frontend/src/components/HomeScreen.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css` と該当既存tests。

**Interfaces:** HomeProjects / GroupNavigationに任意の `onImport(pid:string):void`、GovernmentWorkspaceに任意の `onImport():void` を追加する。Homeの各master行と編集画面の両方からAppの同じガードへ渡す。
Appは既存の未保存入力ガードで対象を開き、`masterImportOwner:ImportOwnerKey|null` を所有する。`MasterImportWizard({owner:ImportOwnerKey,onClose,onApplied})` はAppが所有するmodalとして1つだけ表示する。GovernmentWorkspaceへ別の独立import stateを追加しない。
`onApplied(result:MasterImportResult,owner:ImportOwnerKey)` は発行時のpid/editorSession/authEpoch/nonceが現在も一致するときだけprojectStore.reload・一覧更新・結果通知を行う。古いopenProject応答で別のmodalを開かない。

- [ ] **RED:** `MasterImportWizard.test.tsx`：国／組織／関係の各modeでfile→mapping→review→apply→report。名称・lang・period・set操作・記録IRIを確認でき、未解決エラーや未確認の期間訂正があると確定不可。
- [ ] **RED:** Home/GroupNavigation：Homeの各master行の「データから取り込む」がそのpidだけを開き、曖昧な一覧全体ボタンを作らない。viewerは一覧・templateを閲覧できても解析・確定は実行不可。
- [ ] **RED:** `ImportReview.test.tsx`：総計51行でも50行しか描画せず51と表示、他言語・出典の除去値を列挙、警告とneeds-reviewを区別。行除外は再検証へ戻し、全件無変更は「完了」で終了できる。
- [ ] Run: 新規component testsとHome/GroupNavigation/GovernmentWorkspace/Appの関連ケースでREDを確認する。
- [ ] Implement: 対象選択は既存project summariesのみで行い、ホームを開いただけではgraphを読まない。既存の新規作成・ORG固定作成・マスター管理メニューを保持。wizardはuseDialogTrapでmodalを囲み、import中のpending formをprojectStore.registerPendingFormへ登録し、キャンセル・Escape・別projectへの遷移は既存ガードで入力喪失を確認する。
- [ ] Implement: ファイルを既存の未適用Turtle入力と同時に書き込まない。変更済みの対象文書があれば既存の適用／破棄手順で解消してからpreviewする。Cancel時は元の取込ボタンへfocus、段階移動は見出しへfocus。ボタンはaria-disabledと理由を持ち、全操作をnative controlで構成する。
- [ ] **GREEN:** 3モード、Excel sheet/header訂正、文字列キー拒否の説明、既存記録IRI確認、clearの取り消し、Undo/Redo、再取り込み、対象切替・言語変更・再認証・未適用Turtle、template downloadを通す。a11y-checkのキーボード／読み上げ／色以外の状態表示を確認する。
- [ ] Commit: `feat(import-ui): integrate master import wizard and guarded entry points`。

## Task 8: 実アプリ・全回帰・文書と出荷判定

**Files:** Create `.claude/skills/run-semantic-viewer/master-import.mjs`, `docs/master-import-verification.md`, `docs/master-import-user-guide.md`; extend `driver.mjs`, `government-team.mjs`, run-semantic-viewer `SKILL.md` と必要なfixture作成helper。必要なload-bearing ruleだけを `CLAUDE.md` / `docs/known-state.md` に追記する。

**Interfaces:** `runMasterImportWorkflow({BASE,b,api,log})` をlocalと既存team driverの内部HTTPS環境で共用する。driverに `master-import` / `master-import-team` を追加。実データ・ユーザーライブラリ・secretを使わず、生成したファイルと合成projectだけで動かす。

- [ ] **RED:** ブラウザーでCSV国→Excel組織→関係追加→基本項目差分→関係終了＋追加を順に確認。IRI維持、他言語・出典保持、同一入力再取り込み0件、1回Undoで確定分だけが戻ることをAPIと画面でassertする。
- [ ] **RED:** 同じ記録の混合操作、最後の行エラー、数値001のExcel、重複列、期間不明、256 KiB超過、対象行除外後の再検証、日英切替、狭い画面、AX・Tab・Enter・Escapeを確認。teamでは401/409/503と応答喪失・再送・再起動・版付きUndoも確認する。
- [ ] Implement harness / guides: prototype段階の挙動を完成扱いにしない。上限・コード照合・基本表／関係表の違い・文字列Excelキー・空欄保持・履歴操作・分割単位を利用者向けに説明する。大きなデータを用いたbefore/afterは既存perf-budget規則に従い、timing上限を緩和しない。
- [ ] Verify native backend: `cd backend && python -m pytest tests -m "not team_db and not network"`。既存のdefault-factor性能予算も含める。
- [ ] Verify DB: 既存の専用secret/project設定で、 `PYTHON_VERSION=3.12 docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest tests -m "team_db and not network"` と `PYTHON_VERSION=3.14 docker compose -f docker-compose.postgresql-test.yml run --rm pg-tests python -m pytest tests -m "team_db and not network"` を実行する。設定手順は `docs/p2-team-operations.md` / `docs/p2-postgresql-test-inventory.md` を使用し、DBポートは公開しない。
- [ ] Verify frontend/build: `npm --prefix frontend test`、`npm --prefix frontend run build`。timingが不安定なら元の失敗と単独再実行を記録し、全体成功に読み替えない。
- [ ] Verify browser: `node .claude/skills/run-semantic-viewer/driver.mjs master-import` と `master-import-team`。既存smoke / p1 / p3 / government / government-teamの回帰を実行し、関連スクリーンショットを開いて確認する。
- [ ] Update docs: 検証記録に各AC、コマンド、結果、未確認項目、branch/PR、before/afterを残す。specは第1段階だけをbuiltとし、第2・3段階は未実装のまま維持する。新規backend caseのinventoryを確定する。
- [ ] Independent review: 解析、receipt、部分更新、ローカル公開失敗、CAS/no-op/replay、UI所有者の境界をレビュー。指摘を修正して必要なテストを再実行する。
- [ ] Commit: `test(import): verify local and team bulk master workflows`。実装の統合が承認されたら第1段階のPRを作成し、backend-linux/backend-windows/frontend/docker/publicationを確認する。budgetsも結果を読む。未承認のmergeや自動mergeはしない。

## 設計の受け入れ条件との対応

| 設計の検証項目 | 実装・検証タスク |
| --- | --- |
| CSV/Excel新規・差分、関係操作 | 1–4、7、8 |
| 再取り込みの冪等性、無変更の版・Undo | 2–5、8 |
| 言語・別名・出典・clearの保持範囲 | 2、6、7 |
| コード衝突、複数コード、表の粒度 | 1–3、7 |
| 混合操作の行順非依存 | 3、8 |
| 記録IRI・出典・旧関係と新関係の全体検証 | 2、3、7、8 |
| 原行位置、重複ヘッダー | 1、6、8 |
| Excel数値・数式のキー忠実性 | 1、7、8 |
| 失敗・競合・権限・Undo競合で部分登録なし | 4、5、8 |
| preview非公開、新規IRI一致、再送 | 4、5、6、8 |
| サイズ境界、行除外後の依存・循環 | 1、3、4、6、8 |
| 日英、古い応答、入力所有者 | 6、7、8 |
| a11yとフォーカス | 7、8 |
| 既存取り込み・フォーム・Table・性能の回帰 | 1、4、5、7、8 |

## 第2・第3段階の引き継ぎ

第1段階完了後、RDF／Turtle adapterはMasterBatchと共通plannerへ接続する独立計画を作る。既存IRIとコードが衝突する場合、未対応RDF、名前空間・source保持、外部取得拒否を先に設計する。
続いてWeb／PDF adapterの計画を作り、取得方法・OCR・抽出手段・外部サービス／原資料保存を確認する。資料から候補を抽出しただけでは確定せず、同じpreview/applyを使う。
未決の外部サービスやOCR方式を、第1段階の依存追加・ネットワーク経路として先取りしない。

## 計画セルフレビュー

- 設計第1–8・10節の第1段階要件を上記8タスクと対応表へ割り当てた。第9節は後続段階の引き継ぎとして残した。
- 既存のCreate連続呼び出し、フォームDTOによる全値置換、HISTORY_COMMANDSの無制限な拡張を行わない。
- 既存の無条件workspace版更新と一般コマンドのno-change例外を調査し、専用の検証と処理をTask 4/5へ割り当てた。
- ファイル解析と256 KiBのJSON commandを分離し、receipt・所有者・再起動時再送の順序を定義した。
- 計画上の追加選択はstatelessな署名batch、解析見本・reportのページ上限、mode別template factory、correctで主体・述語を変えない操作境界。元ファイルの永続保存や新DBは追加しない。
- この文書作成では実装・実行試験をしていない。上記チェックボックスはすべて未実施。
