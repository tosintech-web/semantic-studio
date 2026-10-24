# P1 日本語辞書ワークスペース Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日本語で辞書を選択・一覧・検索し、既存フォームで編集できるローカル版を、公開対象管理の基盤とともに実装する。

**Architecture:** 既存React/FastAPI/rdflibと編集コマンドを再利用し、表示用の言語層とサーバー側の検索・一覧索引を追加する。UI言語・辞書表示言語・RDFの主言語を分ける。索引はグラフ表示上限から独立し、既存のrevision・imports・data世代の読取境界に接続する。

**Tech Stack:** React 18、TypeScript、FastAPI、Python 3.11以上、rdflib、既存Vitest/pytest。P1では新しいランタイム依存、DB、認証基盤、検索エンジンを追加しない。

**Spec:** `docs/superpowers/specs/2026-10-24-semantic-studio-customization-design.md` §5–7・11。横断計画は `docs/superpowers/plans/2026-10-24-license-publication.md`。

## 計画の状態・範囲

基準：MainのPR #1マージ `dbb3576`。作成日：2026-10-24。
本書はマージ済み仕様のP1を実装へ分解した計画。独立レビューの重要指摘は修正・再確認済み。
2026-10-24：ユーザーの実装承認を受け、Task 1〜10の基盤・検索・一覧・構造化メッセージと共通画面の翻訳を実装済み。
Task 11〜12の探索・編集・クエリ・検証等の翻訳、Task 13の
性能・実ブラウザ・公開前確認、および実装全体の独立レビューは未完了。
部分的な日本語表示をP1全体の完成とは扱わない。
問い合わせ先はユーザー指定により、このリポジトリのIssuesとする。改変部分の新しい
著作権者名は未確認のため追加せず、元のMIT表示を維持する。
ブランチ・開発環境・基準テストの結果は
[実装準備記録](2026-10-24-p1-readiness.md)を参照する。
着手時は同記録の既存性能4件の未達を最初に確認し、今回の変更による退行と区別する。
P2のGoogle Workspace認証（`osintech.net`限定）、P3の公開版/API、P4のWordNet全件、
P5の専用Excel/JSON取り込みは後続。P2以降のDB・セッション・運用URLは本書で決定しない。

P1でネットワーク上のチーム運用を始めない。原本ZIPを公開用出力と見なさない。
公開操作・merge・デプロイは、実装計画の作成に含めない。
本書は担当者が順番に実装する方式を推奨するが、実行方式のユーザー選択を済ませたとは扱わない。
各タスクに別の実装担当とレビュー担当を割り当てる方式を選んでも、契約と検証条件は同じとする。

## Global Constraints

- `CLAUDE.md` の構造化ファイルヘッダー、唯一の編集入口 `editing.py`、SELECT専用、出力上限、ネットワークブローカーを維持する。
- UIは `ja` / `en`、初期値 `ja`。RDF内容・IRI・言語タグ・未知の項目を翻訳/削除/書換しない。
- 新しい画面ではraw HTMLを描画せず、既存focus-visibleと種類色の唯一の定義を利用する。
- 1文字検索、IME確定後300ms。候補25件。一覧は既定50行、API最大100行、真の総件数を返す。
- 既存 `/search` の配列形式、既定limit、既存kindの意味、既存API呼び出しの互換性を維持する。
- Library/インポート/データ由来個体の読み取り専用規則、Projectの保存・Undo/Redoを維持する。
- 実データ・認証秘密は公開しない。通常CIは合成データのみで実行し、元MITと第三者条件を保持する。
- 既存の利用者の `.gitignore` 変更、`test_data/`、ローカルデータを無断でコミット/移動/消去しない。
- 時間テストは中央値・`perf` / `[budget]`・`BUDGET_FACTOR`に従う。合格前に性能を達成済みと表示しない。
- 各実装タスクは赤→最小実装→緑→差分レビュー→対象ファイルだけをコミット。低影響な文書編集に実装追認だけのテストを追加しない。

## Review Focus

1. Graphに描かれないラベルだけの資源・未宣言クラスの個体を一覧/検索から落とさない（Task 4）。
2. edit/undo、importsの再解決、snapshot on/offで古い索引・ページを使わない（Task 5/6/8）。
3. UI/辞書/Projectの各言語が混ざらず、IME・遅い旧応答・辞書切替で誤選択しない（Task 2/3/7/8）。
4. 長いIRI・巨大な名称・欠損説明でも、件数の偽装や無言の行落ちを起こさない（Task 6）。
5. 日本語説明が英語完成文の推定翻訳にならず、外部の原文や利用者の語句を破損しない（Task 9–12）。

## 作業順とPRの分割案

| 順 | タスク | 依存 | 成果物 |
| --- | --- | --- | --- |
| A | 1 | なし | 混入防止・合成辞書・帰属整備の基盤 |
| B | 2 | Aの検査・合成データ部分 | 日英UIコンテキスト、型付きカタログ |
| C | 3 | B | 辞書の言語別表示と設定の独立 |
| D | 4–6 | A/C | 索引、キャッシュ、互換検索・一覧API |
| E | 7–8 | B/D | 1文字検索、項目一覧、選択対象の明示 |
| F | 9 | B | サーバーからの構造化メッセージ契約 |
| G | 10–12 | B/F | 全UI・説明・警告の翻訳移行 |
| H | 13 | A–G | 統合・性能・実ブラウザ・配布前確認 |

A〜Hごとにレビュー可能なPRへ分ける。P1の完成宣言はHの受け入れまで行わない。
未翻訳の画面が残る中間PRでは、日英対応済みという製品表記をしない。
帰属確認だけが未完了の場合もローカル実装は進められるが、その帰属を必要とする配布は止める。

## ファイル構成と責任

| 追加/変更先 | 責任 |
| --- | --- |
| `frontend/src/i18n/{types,ja,en,format}.ts` | UIロケール、メッセージID・引数、純粋な翻訳/書式化 |
| `frontend/src/i18n/I18nProvider.tsx` | ロケール設定、localStorage、document.lang、Reactへの供給 |
| `frontend/src/i18n/server-contracts.ts`（生成物） | backendメッセージ契約から生成した型付き定義 |
| `frontend/src/dictionary/useDictionaryLanguage.ts` | 辞書IDごとの明示言語とUI/Projectからの既定値 |
| `frontend/src/components/{UiLanguageSelect,DictionaryLanguageSelect,EntityList,DictionaryContext}.tsx` | 言語選択、一覧、現在の対象表示 |
| `frontend/src/entities/types.ts` | 一覧/検索のwire型。サーバーのsnake_caseを勝手にcamelCaseへ変えない |
| `backend/app/entity_index.py` | 名前付き資源集合、値の正規化、一致理由・順位 |
| `backend/app/entity_views.py` | 読取ビューの索引キャッシュ、順序付き投影、ページング、応答制限 |
| `backend/app/messages.py` / `message_contracts.json` | 互換英語文と独立したコード/引数の契約 |
| `scripts/generate_message_contracts.py` | backend JSON契約からfrontend定義を生成・照合 |
| `docs/i18n-message-inventory.md` | 文字列移行の画面/生成箇所と担当タスクの確認表 |
| 既存 `store.py` / `imports.py` / `routers/ontologies.py` | 言語・派生キャッシュ・新APIへの接続。ルーターに検索ロジックを置かない |
| 既存 `api.ts` / `App.tsx` / `state/projectStore.ts` | 表示言語と世代、画面切替、選択・編集の連携 |

以下のテストファイルは対応する実装とともに追加する。既存テストを理由なく削除しない。

## Task 1 — 公開対象管理と合成データの基盤

**Files / Interfaces:** 横断計画のTask 1・2・2aに定義済みのファイルとCLI・生成器を使う。
P1専用の別検査器・別データ生成器を作らない。

- [ ] 実行前に現在のブランチ/既存変更、元LICENSE、公開対象を確認し、必要な隔離作業環境を準備する。
  本書の実行時には `superpowers:using-git-worktrees` を適用する。既存ローカル変更を持ち込まない。
- [ ] `check_publication.py` とその回帰テスト、`publication-policy.json` を横断計画Task 2の契約で実装する。
  指定Git blobと作業ツリーが異なるケース、改名した元データ、ZIP、失敗時の終了2も確認する。
- [ ] `build_synthetic_organizations(count: int = 3035) -> Graph` をTask 2aに従って追加する。
  名称・ID・コメントは元データから転用せず、個体3,035件、同名の意味2件、欠損説明、別名/読みを生成する。
- [ ] 横断計画Task 1の帰属・第三者通知を整備する。権利者名が未確認なら元MITを維持し、
  自動で社名を書かない。未確認事項を配布条件として記録する。
- [ ] backendで `python -m pytest tests/test_synthetic_dictionary.py`、repo rootで
  `python -m unittest discover -s scripts -p 'test_check_publication.py'` を実行し、すべてPASSを確認する。
- [ ] チェックアウトから `test_data/` を除いたCIでも通ることを確認して対象変更だけをコミットする。

## Task 2 — 日英UIの型付き基盤

**Files:** 追加 `frontend/src/i18n/{types,ja,en,format}.ts`、`I18nProvider.tsx`、
`format.test.ts`、`I18nProvider.test.tsx`、`components/UiLanguageSelect.tsx` と同テスト。
変更 `main.tsx`、`index.html`、`components/ErrorBoundary.tsx`。

**Interfaces:** `UiLocale = 'ja' | 'en'`。
`useI18n(): {locale: UiLocale; setLocale(locale: UiLocale): void; t: Translator}`。
`Translator` は `MessageArgs` のキーごとに必要な引数だけを受け取りstringを返す型とする。
`translate(locale, code, args): string`、`formatNumber(locale, value): string`、
`formatDateTime(locale, iso): string` を純粋関数として公開する。
保存キーは `semantic-studio.uiLocale.v1`。保存できないブラウザでもメモリ上で選択できる。

- [ ] `defaults_to_ja_and_updates_document_lang`、`restores_en_after_remount`、
  `invalid_or_unreadable_storage_defaults_to_ja` のテストを書き、未実装で失敗を確認する。
- [ ] 純粋関数ではキー/引数の一致、`en`フォールバック、最終的な共通説明を検証する。
  未知コードで生のキーを表示せず、`__proto__` 等をown-keyで判定する。
- [ ] カタログは英語型の文断片連結ではなく文章単位で定義する。navigationの日本語は仕様の6語を使う。
  表示する引数はReactのテキストで扱い、HTMLにしない。日付は保存された瞬間を変えず、
  ブラウザのタイムゾーンでIntl表示し、無効日時は共通の未設定表示にする。
- [ ] `I18nProvider` をErrorBoundaryの外側へ配置し、エラー画面も翻訳可能にする。
  翻訳自体の失敗時はProviderに依存しない最小の安全な説明を残す。
- [ ] 言語selectをヘッダーとエラー画面で利用可能にし、Tab・標準select操作・focus-visibleを維持する。
- [ ] frontendで `npm run test -- src/i18n/format.test.ts src/i18n/I18nProvider.test.tsx src/components/UiLanguageSelect.test.tsx` を実行し、PASSを確認してコミットする。

## Task 3 — UIと独立した辞書表示言語

**Files:** 追加 `dictionary/useDictionaryLanguage.ts` と同テスト、`components/DictionaryLanguageSelect.tsx`。
変更 `api.ts`、`state/projectStore.ts`、`App.tsx`、`components/ProjectHeader.tsx`、
`components/NewProjectDialog.tsx` と同テスト、
`backend/app/store.py`、`graph_builder.py`、`imports.py`、`routers/ontologies.py`。
テスト：`backend/tests/test_display_languages.py`、既存 `test_imports.py`、frontend `api.test.ts`。

**Interfaces:** `useDictionaryLanguage({ontologyId, projectLanguage, uiLocale})` は
`{language: string; setLanguage(value: string): void}` を返す。
Libraryの明示選択は `semantic-studio.dictionaryLanguages.v1` の辞書ID→言語として保存する。
Projectは既存の言語設定を使う。閉じたProjectの言語を次のLibraryへ引き継がない。

既存APIメソッドの位置引数は維持し、名前を返すメソッドに最後の任意引数
`displayLanguage?: string` を追加する。明示指定があれば旧module状態より優先する。
全該当呼出箇所を明示指定へ移行し、`setDisplayLanguage` は既存呼出の互換シムとして残す。
`lang`未指定のAPIクライアントに対しては従来のLibraryの選択規則を維持する。
対象は `getGraph`、`getNeighborhood`、`getResultNodes`、`fetchHierarchy`、`getNodeDetails`、
`searchNodes`、`getQuerySchema`、`getQueryNode`、`runSparql`。
backendは必要なlang入力をquery-schema/query-node/sparqlにも追加し、
`query_schema.py` / `sparql_exec.py` の表示ラベル選択に伝える。クエリ本文・結果値・実行制限は変えない。

- [ ] `ui_switch_does_not_change_explicit_dictionary_language`、`project_language_does_not_leak_to_library`、
  `new_project_defaults_to_ui_locale_but_can_override` を書いて赤を確認する。
- [ ] backendでLibraryの希望言語→無言語→他言語→IRI末尾、Projectの希望→主言語→同フォールバックを検証する。
  地域タグ、同じ優先度の複数ラベルは `(predicate priority, language, literal text)` の安定順とする。
  別名しかない資源に別名を代表名として自動採用しない。
- [ ] `Ontology.label_langs` をLibraryの明示langにも対応させ、ラベル選択の共通規則を
  graph/detail/hierarchyへ接続する。`label_language` と `label_fallback` の任意メタデータで
  実際の代替言語を伝え、表示文字列のサフィックスを後から解析しない。
- [ ] 説明の選択は `skos:definition`、`rdfs:comment`、`dcterms:description` の順を同一言語内の優先順にする。
  表示言語選択のために保存グラフを変更しない。詳細には既存通り全ての値を残す。
- [ ] `App` のGraph/Hierarchy/Detail、検索結果ラベル、Queryの表示ラベルに選択を渡す。
  query schema/results等の表示名経路も一覧化し、SPARQLの式や結果値そのものを翻訳しない。
- [ ] backendで `python -m pytest tests/test_display_languages.py tests/test_node_detail.py tests/test_imports.py`、
  frontendで `npm run test -- src/dictionary/useDictionaryLanguage.test.tsx src/api.test.ts` を実行し、PASS後コミットする。

## Task 4 — 全項目を扱う検索索引

**Files:** 追加 `backend/app/entity_index.py`、`backend/tests/test_entity_index.py`。
既存 `graph_builder.py` の種類判定・ラベル選択を再利用し、必要な共通部分だけを抽出する。
未宣言クラスの個体判定は `node_kind` と共有し、一覧と詳細が異なる種類を表示しないようにする。

**Interfaces:** `normalize_query(text: str) -> str` はNFKC+casefold+前後空白除去。
`build_entity_index(graph: Graph, graph_nodes: list[dict]) -> EntityIndex`。
`rank_matches(index: EntityIndex, query: str, languages: tuple[str, ...]) -> list[EntityMatch]`。
`EntityMatch` はIRI、reason (`name|alias|reading|search|identifier`)、完全な一致値、順位を保持する。
内部索引にraw JSON、コメント、説明全文を入れない。

- [ ] テストで `set(index.entities)` がURI主語と表示上限前graphノードの和集合に一致することを確認する。
  ラベルのみ・未宣言クラス個体は含み、空白主語・単なる値URL・未定義の述語だけのIRIは含めない。
- [ ] 「犬」の別IRI2件、別名、読み、仕様にある組織名前空間の5プロパティ、全角英字を検証する。
  RDF原文、元IDの先頭ゼロが変わらないこと、内部コメント/raw JSONでヒットしないことも確認する。
- [ ] 読取プロパティ対応を `SEARCH_FIELDS` 定数一か所に置き、既存の全名称と
  `skos:altLabel` / `skos:hiddenLabel` を追加する。略語・原語名はalias、sourceOrgIdとIRIはidentifier。
- [ ] 順位は `(tier, normalized_display_label, iri)`。tierは名称完全0/名称前方1/
  別名等完全または前方2/名称・別名等部分3/識別子4。同一IRIで複数一致なら最小tierを採用し、
  同tierの理由はname→alias→reading→search→identifier、値の辞書順で一意に決める。
- [ ] kindは既存 `node_kind` と明示型を基にし、未宣言の一般クラス型を持つ資源はindividualとする。
  型なしの主語はother。参照だけのノードには `reference_only=true` を持たせる。
  UIの種類を決めるためにrdf:typeを書き込まない。
- [ ] `python -m pytest tests/test_entity_index.py tests/test_node_detail.py` で赤→緑を確認しコミットする。

## Task 5 — 索引ビューのキャッシュ・世代・並行読み取り

**Files:** 追加 `backend/app/entity_views.py`、`backend/tests/test_entity_views.py`。
変更 `store.py` / `imports.py` の派生ビュー管理。既存の編集・snapshotの無効化経路を再利用する。

**Interfaces:** `get_entity_view(ontology: Ontology, *, include_imports: bool, language: str | None) -> EntityView`。
`EntityView` はindex、表示言語順、revision_token、原グラフ/由来情報への参照を持つ。
revision_tokenはP1の一覧専用の不透明な文字列。既存Projectの数値revisionを変更しない。
新しいビューを作る度に新トークンを割り当て、再起動後のトークン継続は保証しない。

- [ ] 編集→Undo→Redo、imports再解決、snapshot on/off、言語変更で古い結果を使わないテストを書く。
  変更なしの再検索では索引構築回数が増えないことをカウントで検証する。
- [ ] `imports_service.reading` / `view_graph` と同じデータ集合・由来を利用する。
  キャッシュキーはontology ID、revision、snapshot generation、importsフラグ、merged viewのidentity、
  言語順。graph参照も保持し、解放済みobject IDの再利用を同一ビューと見なさない。
- [ ] own graphのin-place更新をrevisionで検出する。snapshotがなくなったケースも世代を比較する。
  Libraryは不変でもimports変更を拾う。read lockと既存のshapes→modelの順序を維持する。
- [ ] 同一ontologyで保持する投影キャッシュは最大4件とし、言語を切り替え続けても増え続けない。
  重い索引構築と全走査をASGIイベントループ上で行わない。
- [ ] 同時の編集/一覧読取で半分だけ更新された件数やラベルを返さず、レスポンス全体が同じトークンに属するテストを追加する。
- [ ] `python -m pytest tests/test_entity_views.py tests/test_imports.py tests/test_editing.py` を実行し、PASS後コミットする。

## Task 6 — 一覧APIと既存検索APIの互換接続

**Files:** 変更 `routers/ontologies.py`、追加 `backend/tests/test_entities_api.py`、
変更 `entity_views.py`、`frontend/src/entities/types.ts`（追加）、`frontend/src/api.ts` / `types.ts`。

**Interfaces:** `GET /api/ontologies/{oid}/entities`。
入力：q（既定空、最大512文字）、kind (`all|concept|individual|class|properties|other`)、
lang（既存max_length=35）、imports、offset（0以上）、limit（1〜100、既定50）、sort (`label|iri`)。
出力：`{items: EntityItem[], total: number, offset: number, limit: number, revision: string}`。
`EntityItem={iri,label,kind,description:string|null,match:EntityMatchWire|null,label_language:string|null,
label_fallback:boolean,label_truncated:boolean,reference_only:boolean}`。
`EntityMatchWire={reason,value,truncated:boolean}`。名前/説明/一致値の表示は各200 Unicodeコードポイントまで。

frontendは `getEntities(id, params, signal?): Promise<EntityPage>` を追加する。
既存searchの各VizNodeに任意 `match` を加えるが、id/label/kind等の既存キーと配列を維持する。
`/search` は従来のSearchKindを保持し、/entitiesのkind群を流用しない。

- [ ] 3,035個体がoffset/limitで重複なくすべて取得でき、グラフbudgetを下げてもtotalが不変のテストを書く。
  並べ替えはlabel→IRIまたはIRIのみ、フィルター適用後のtotalを返す。
- [ ] URI主語だけの資源、参照のみ、空データ、無効ID/入力、limit 0/101と負offsetを試す。
  legacy `/search` の型・pickerのkind動作と、1文字のサーバー検索を確認する。
- [ ] APIは薄く保ち、`get_entity_view` とページ投影へ委譲する。indexのraw valueをレスポンスへ丸ごと返さない。
  両APIのmatch判断は同じ索引と順位を使う。個体等の新しい検索結果も既存VizNodeの必須キーを満たす。
- [ ] compact JSONをUTF-8へ符号化した最終応答を256KiB以内に制限する。超過は400、
  `detail={code:'ENTITY_PAGE_TOO_LARGE',message:string,total:number,suggested_limit:number}`。
  limit=1ならsuggested_limit=1とし、詳細参照への案内を返す。IRIを切らず、無言で行を捨てない。
- [ ] 絵文字を含む200文字、巨大IRI、長い名前、limit=1で拒否、真のtotalとインデックス保存のテストを行う。
- [ ] `python -m pytest tests/test_entities_api.py` と `npm run test -- src/api.test.ts` を各ディレクトリで実行し、PASS後コミットする。

## Task 7 — 1文字・IME検索と一致理由

**Files:** 変更 `components/SearchBox.tsx` と同テスト、`components/EntityPicker.tsx`、`App.tsx`。
追加 `components/EntityPicker.test.tsx`。
追加 `entities/useEntitySearch.ts` と同テスト。対応するi18nカタログを更新する。

**Interfaces:** `useEntitySearch({ontologyId,language,imports,revision,viewGeneration,query,composing})` は
`{results,loading,error,more}` を返す。既存候補25件のため26件を要求する。
「項目一覧で全件を見る」は `onShowAll(query: string)` へ渡し、Query条件は変更しない。

- [ ] compositionStart→入力→待機では0リクエスト、compositionEnd後299msでは0、300msで1回を検証する。
  日本語1文字/英字1文字、空欄、IME終了直後の二重発火を試す。
- [ ] AbortControllerと検索世代を併用し、辞書/言語/ビュー世代変更後の旧結果を無視する。
  revision・imports・language・viewGenerationをeffectの依存に含める。
  viewGenerationは既存AppのimportsVersionとsnapshot更新通知を含む表示更新キーとし、
  Projectのrevisionやimportsのbooleanだけから算出しない。詳細の再取得にも同じキーを渡す。
  imports=true・revision不変の再解決で再取得し、再解決前の遅延応答を破棄するテストを追加する。
- [ ] 候補に代表名・一致理由と値を表示する。25件超なら一覧入口、0件/失敗/読込を翻訳表示する。
  キーボード上下/Enter/Escape・aria-activedescendantとフォーカスを維持する。
- [ ] 概念選択は既存 `selectFromOutsideGraph`、Queryでの候補選択は既存のステップ追加へ接続する。
  型が未知の参照のみ資源をクリックしてもQueryへ無効なクラスを作らず、既存の拒否説明を使う。
- [ ] `npm run test -- src/components/SearchBox.test.tsx src/entities/useEntitySearch.test.tsx src/components/EntityPicker.test.tsx` を実行し、PASS後コミットする。

## Task 8 — 項目一覧・辞書コンテキスト・既存編集の連携

**Files:** 追加 `components/EntityList.tsx` / 同テスト、`DictionaryContext.tsx` / 同テスト、
`entities/useEntityPage.ts` / 同テスト。変更 `App.tsx`、`types.ts`、`api.ts`、`index.css`。

**Interfaces:** AppModeに `entities` を追加し、既存IDは維持する。
`EntityList` は `{ontologyId,language,imports,revision,viewGeneration,initialQuery,onSelect(iri):void}` を受ける。
一覧内の条件はローカル状態、Projectの編集状態は既存projectStoreのみで管理する。
`useEntityPage` は `{page,loading,error,reload}` を返し、辞書ID/条件の変更でoffset=0。
Task 7と同じviewGenerationを監視し、importsの同flag再解決・snapshotの切替/更新でも
offset=0へ戻して再取得する。旧世代の一覧・詳細応答を破棄する契約と回帰テストを含める。
`DictionaryContext` は名前、閲覧/編集、文書名、保存状態を受ける表示専用とする。

- [ ] 一覧から同名の別IRIを区別して開けること、50行・総件数・範囲、6種類群とsortをテストする。
  条件変更・辞書切替時の旧ページ応答を無視し、失敗時に別辞書の行を残さない。
  同じ条件でもサーバーのrevision tokenが変わったページは既存ページと継ぎ合わせず、
  offset=0へ戻して一度取り直す。更新が続く場合は更新中の説明と再試行操作を表示する。
- [ ] 新モードをGraph/Queryの描画分岐と分離し、一覧を開くための `/graph` 取得を待たない。
  既存のGraphノード集合はサーバー索引構築で必要になるが、ブラウザはgraph JSONを受信しない。
- [ ] 行クリックは選択IRIと既存DetailPanelに接続する。参照のみでnode APIが404になる場合は
  「参照のみ・定義なし」のパネルと完全IRIのコピーを表示し、編集フォームを出さない。
- [ ] Projectの既存フォームを同じ詳細欄へ渡す。保存/Undo/Redoで一覧再取得、
  同一IRIの選択を維持するが結果から消えた行は一覧上で選択中と偽らない。
  Library/imported/fromDataの編集可否を独自に上書きしない。
- [ ] 読み込み成功・失敗、Project/Library/文書切替のヘッダー表示と通知をテストする。
  長い名称の完全値確認、保存状態のテキスト、未保存確認を維持する。
- [ ] 通常table+リンク/ボタンで構築し、Tab・見出しへのフォーカス・ページ範囲のpolite通知を確認する。
  stylesは既存トークンを利用し、フォーカスや種類色の新たな独自定義を作らない。
- [ ] `npm run test -- src/components/EntityList.test.tsx src/components/DictionaryContext.test.tsx src/entities/useEntityPage.test.tsx src/App.test.tsx src/styles.test.ts` を実行し、PASS後コミットする。

## Task 9 — サーバーの構造化メッセージ契約

**Files:** 追加 `backend/app/messages.py` / `message_contracts.json`、
`backend/tests/test_message_contracts.py`、`scripts/generate_message_contracts.py`、
`frontend/src/i18n/server-contracts.ts`（生成）、`frontend/src/i18n/serverMessage.ts` / 同テスト。
変更 `api.ts` / `types.ts`、`backend/app/main.py`、各routerの例外応答。

**Interfaces:** `WireMessage={code:string, args:Record<string,string|number|boolean|null>}`。
既知のpayloadに任意 `uiMessage: WireMessage` を加え、既存の `detail`、`text`、
parse_errorの `message`（文字列）等の意味/型は変えない。
`make_message(code: str, **args) -> dict` は契約のコード・引数名/型を検証する。
`CommandError` 等は英語のstrを維持し、任意 `ui_message` を持てるようにする。
フロントは `renderServerMessage(wire, legacyText, translator): string` を使う。

- [ ] JSON契約はversion=1とcodesを持ち、各codeが引数型を宣言する。
  generatorの `--check` で生成済みTSと不一致なら非0終了、通常実行は決定的なTSを出力する。
  backend側JSONを唯一の定義とし、frontendのビルドはコミット済み生成物を利用する。
- [ ] `parse.syntax`, `model.invalid_value`, `validation.min_count`, `reasoning.timeout`,
  `entities.page_too_large` の代表例でコード/args、日英の引数一致を赤→緑で検証する。
- [ ] 英語完成文のregex/置換からargsを推定しない。生成時に既存のIRI・数値等を渡す。
  保存済みの英語だけの結果は「過去の結果」等の翻訳された見出しと原文を表示する。
- [ ] 未知コード・契約違反・外部エラーは共通の操作説明と原文詳細へフォールバックする。
  外部原文は日本語へ自動翻訳せず、名前の中のHTML/引用符もテキストのまま表示する。
- [ ] `ApiError` に任意uiMessageを保持し、レンダリング時に現在のlocaleで表示する。
  エラーが出た後にUI言語を切り替えても、英語の完成文がReact stateへ固定されないようにする。
- [ ] `python scripts/generate_message_contracts.py --check`、backendの
  `python -m pytest tests/test_message_contracts.py`、frontendの
  `npm run test -- src/i18n/serverMessage.test.ts src/api.test.ts` を実行し、PASS後コミットする。

## Task 10 — ホーム・読み込み・共通操作の翻訳

**Files:** `App.tsx`、`components/{HomeScreen,OntologyCard,ProjectsSection,NewProjectDialog,
ProjectHeader,LoadDialog,CatalogueList,ConfirmDialog,AboutPanel,NetworkPanel,NetworkApprovalDialog,
ImportsPanel,SourceView,TurtleEditor,GraphNotice,Legend}.tsx`、`loadWords.ts`、`networkWords.ts`、
`statusWords.ts`、`removalPrompt.ts`、`projects/form.ts`、対応テスト、日英カタログ。
追加 `docs/i18n-message-inventory.md`、`frontend/src/i18n/coverage.test.ts`。

- [x] 画面文字列・title/aria/placeholder・純粋関数・サーバー例外の発生箇所を棚卸しし、
  inventoryにsource path、用途、code、args、Task番号、状態を記録する。
  ナビ6語、閲覧/編集の区別、保存状態の意味を既存スナップショット任せでなく明示的にテストする。
- [x] `UiLanguageSelect` をホームでも表示し、各列挙コンポーネントをカタログへ移行する。
  既存の英語表示テストはen Providerを明示し、アプリの初期値を英語へ戻して通さない。
- [x] 数値/日時/ライブ通知も移行し、ファイル形式名・RDF言語タグ・利用者の名前は原表記を保つ。
- [x] AboutのMIT・原作者・第三者通知はTask 1の内容を利用し、翻訳で法的原文を置き換えない。
  ソース参照先を元作者と改変版で区別する。未知の提供者名を補わない。
- [x] inventoryを検証するcoverageテストを追加し、対象source pathの漏れ、存在しないキー、
  ja/enのキー・引数不一致を失敗させる。RDF/SPARQL/外部原文は理由付きで対象外と記録する。
- [x] frontendの上記既存テストと `npm run test -- src/i18n/coverage.test.ts src/components/HomeScreen.test.tsx src/components/LoadDialog.test.tsx src/components/ProjectHeader.test.tsx src/components/AboutPanel.test.tsx` を実行し、PASS後コミットする。

## Task 11 — 探索・編集・クエリとフロント説明文の翻訳

**Files:** `components/{DetailPanel,ExplainBlock,ExploreStart,HierarchyView,HierarchyActions,
EntityPicker,EditSection,EditStructure,EditParts,CreateForm,NewEntityForm,RelationshipForm,AttributeForm,
AnnotationAdder,ConceptRelations,SharedDomain,ReusePlan,DeleteDialog,LinkPanel,ExampleForm,
QueryPanel,QueryStart,ResultsTable,ResultPanels,PathBar,ClassPropsMenu,PredicateMenu,NextSteps,
SparqlEditor,SparqlPreview,NothingSelected}.tsx`、`canvas/`、`modeling/sentences.ts`、
`modeling/ruleSentences.ts`、`explain/explainSentences.ts`、`explain/glossary.ts`、`sparql/starters.ts`、対応テスト。
種類の表示関数は `types.ts` を変更するが、色の定義を翻訳カタログへコピーしない。

- [ ] inventoryのTask 11対象を追加し、使用する全メッセージ/引数をカタログに定義する。
  標準用語の意味の定義はglossaryを唯一の意味定義とし、日英の文章を同じキーへ結び付ける。
- [ ] 名前に日本語、英語、不正なHTML様テキストがある関係文を日英で確認する。
  jaでは `a/an` や英語動詞変形を通さず、項目間の関係を文章全体で表す。
  既存の `sentences.table.json` はenの挙動確認として維持する。
- [ ] ExplainBlockなどのリンク付き説明は既存の `Part[]` 形式を保ち、言語ごとの
  文章テンプレートからテキストと参照を組み立てる。翻訳後の完成文を解析してIRIリンクを探さない。
- [ ] kind/edgeラベルにlocaleを適用しても色トークンと未知kindのown-key判定を維持する。
  層を越えて `canvas/` をeager importする変更をしない。
- [ ] フォームの新規作成/削除確認、読み取り専用の説明、Query開始候補/結果/制限表示を翻訳する。
  SPARQL本文・データ・埋め込みクエリの著者による説明は翻訳しない。
- [ ] `RuleBuilder` / `RuleEditor` の関係説明、`WhyDisclosure` など共通表示も移行し、
  将来の翻訳追加で日本語固有ロジックを各コンポーネントへ散在させない。
- [ ] `npm run test -- src/modeling/sentences.test.ts src/modeling/ruleSentences.test.ts src/explain/explainSentences.test.ts src/explain/glossary.test.ts src/components/DetailPanel.test.tsx src/components/QueryPanel.test.tsx src/theme/kinds.test.ts` と対象canvas/フォームの既存テストを実行し、PASS後コミットする。

## Task 12 — 検証・推論・既存データ機能のメッセージ移行

**Files:** `components/{ShapesView,ShapeForm,RuleBuilder,RuleEditor,RulesBlock,ReasoningPanel,
InferredBlock,DataWizard,SnapshotList,ImportReport,RmlEditor,WhyDisclosure}.tsx`、
`modeling/{shapeSentences,dataSentences}.ts`、`reasoning/reasonSentences.ts`。
backendの `editing.py`、`modeling_checks.py`、`shacl.py`、`reasoning.py`、`parse_errors.py`、
`shapes_form.py`、`snapshots.py`、`tabular.py`、`rml.py`、`projects.py`、router群と対応テスト。

- [ ] inventoryでbackendの既知の拒否・警告・検証・推論結果の全生成箇所とcode/argsを対応付ける。
  metadata契約と生成TSを更新し、旧英語のdetail/textを保持して追加項目として出力する。
- [ ] SHACL件数/型/言語/範囲違反、モデル循環・domain共有の拒否、推論timeout/問題説明、
  RDF構文失敗を各1件以上日英のフロント表示まで確認する。unknownの第三者エラーは原文詳細にする。
- [ ] 比較・推論アルゴリズム、ネットワーク可否、元データの値を翻訳対応に合わせて変更しない。
  メッセージに使う名前は読取時の表示言語を尊重し、元IRIで追跡できる。
- [ ] 既存CSV/Excel/RML機能の操作・エラーは翻訳するが、専用タグExcel/組織JSON仕様を追加しない。
- [ ] `python scripts/generate_message_contracts.py --check`、backendで
  `python -m pytest tests/test_message_contracts.py tests/test_shacl.py tests/test_reasoning.py tests/test_parse_errors.py tests/test_editing.py`、
  frontendで `npm run test -- src/modeling/shapeSentences.test.ts src/modeling/dataSentences.test.ts src/reasoning/reasonSentences.test.ts src/components/ShapesView.test.tsx src/components/ReasoningPanel.test.tsx src/i18n/coverage.test.ts` を実行し、PASS後コミットする。

## Task 13 — 統合・性能・実ブラウザ・公開前確認

**Files:** 追加 `backend/tests/test_entity_budgets.py`、`frontend/src/components/EntityList.budget.test.tsx`。
変更 `.claude/skills/run-semantic-viewer/driver.mjs`、`.github/workflows/ci.yml`、
`README.md`、`docs/known-state.md`、inventory。必要な配布通知は横断計画Task 4で定義済みの場所へ置く。

- [ ] 合成グラフ1k/10k/40kで索引構築と温まった検索/一覧の前後を測定する。
  10kは初回1秒/温200ms以内、40kは初回3秒/温500ms以内。中央値と既存予算係数を使う。
  キャッシュ再利用の回数テストを時間テストと分けてblocking jobに残す。
- [ ] 一覧応答256KiB、語句の表示200文字、件数・ページ境界・拒否時のtotalを試す。
  ブラウザは応答受信→操作可能500ms以内、表示DOM行50以下を確認する。
  既存graphのサイズ/速度が上限を超えないことも1k/10k/40kで測る。
- [ ] 既存driverへ `p1` シナリオを追加する。ローカルserverと一時data dirを使い、
  合成辞書のload→1文字IME検索→同名項目の選択→一覧paging→Project編集/Undo/Save→
  日英UIと辞書言語の独立→辞書切替→再読込を実際のブラウザで確認する。
  キーボード/AX tree、ダーク/ライト、長い名前、縮小表示も確認する。
- [ ] private試験データを使わず、画面画像・ログに元JSON/トークンがなく、
  公開しない成果物がGit/Dockerへ入らないことを横断計画の検査で確認する。
- [ ] backendで `python -m pytest tests`、frontendで `npm run test` と `npm run build`、
  repo rootで `node .claude/skills/run-semantic-viewer/driver.mjs smoke` と同 `p1` を実行する。
  実行環境/合否/性能値をPRへ日本語で記載し、未実行をPASSとして報告しない。
- [ ] P1で配布する場合は横断計画Task 4/5を前倒しする。内部原本ZIPを公開用とせず、
  通知がDocker/フロント等の実配布物へ同梱されることを検査する。
- [ ] ユーザー向け手順・互換APIの任意フィールド・表示言語の意味・制限をREADMEへ追記する。
  新しい判断と性能根拠をknown-stateへ記録する。
- [ ] 必要チェックがPASSした対象差分だけをコミットし、日本語のPR説明でレビューする。
  CIのbackend-linux/backend-windows/frontend/dockerが緑になるまでP1完了としない。

## 仕様とタスクの対応

| 仕様 | 実装タスク | 最終確認 |
| --- | --- | --- |
| §5 意味・RDF互換性 | 3/4/8/11/12 | 13の保存・出力と未知項目保持 |
| §6.1 日英UI・言語分離 | 2/3/9–12 | 13の日英/再読込 |
| §6.2 現在の対象 | 3/7/8/10 | 13の切替/失敗/保存状態 |
| §6.3 一覧と母集合 | 4–6/8 | 3,035個体+同名+参照のみ |
| §6.4 検索・IME | 4–7 | 1文字/別名/読み/旧応答 |
| §6.5 API・キャッシュ | 3/5/6/9 | imports/data/edit/互換API |
| §6.6 アクセシビリティ | 2/7/8/10–12 | 13の実ブラウザ/AX |
| §7 シナリオ1–11・性能 | 1–13 | 全テスト/型/ビルド/CI |
| §11 ライセンス・公開防止 | 1/10/13、横断計画 | 送信Git blobと配布物 |

## 未確定事項の扱い・引き継ぎ

P1の実装方式・契約は上記で定めた。文言カタログの追加はinventoryとテストで管理し、
仕様値や範囲を変える必要が判明したら先に差分を示す。
改変部分の実際の権利者名は未確認。公開版連絡先はリポジトリのIssuesと確認済み。検索や翻訳の実装を止めず、
元の帰属とMITを保持して独立作業を進める。未確認の新しい帰属を表示して配布しない。

P2以降の詳細計画は、各段階の仕様が確定してから作る。Google認証用の本番秘密を
本計画やPRへ貼り付けてもらうことはしない。
本書の作成・自己確認は、実装や性能/機密検査が完了したことを意味しない。
