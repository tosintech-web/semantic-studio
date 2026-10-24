# UIメッセージ棚卸し（P1）

状態：Task 10の画面所有文言を移行し、coverage検査を追加。対象パスの登録だけでは翻訳完了を意味しない。Task 11/12の対象と生成元は、各移行時に追加する。

UIの言語とRDFの表示言語を分離する。識別子・RDFの値・SPARQL本文・第三者からの原文・法的通知原文は翻訳しない。
内部メッセージは`MessageArgs`、サーバーの引数は`backend/app/message_contracts.json`を定義元とする。
テストは言語ごとの引数名の集合を比較する。同じ引数の出現回数は、言語によって異なってよい。

## 対象パス

| source path | 用途 | Task | 状態 |
| --- | --- | --- | --- |
| `frontend/src/App.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/HomeScreen.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/OntologyCard.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/ProjectsSection.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/NewProjectDialog.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/ProjectHeader.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/LoadDialog.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/CatalogueList.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/ConfirmDialog.tsx` | 共通画面・操作・通知 | 10 | 表示文を持たず呼び出し元が翻訳（ConfirmDialog） |
| `frontend/src/components/AboutPanel.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/NetworkPanel.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/NetworkApprovalDialog.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/ImportsPanel.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/SourceView.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/TurtleEditor.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/GraphNotice.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/components/Legend.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/loadWords.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/networkWords.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/statusWords.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/removalPrompt.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/projects/form.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/catalogue.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/explore/suggestions.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/sourceTarget.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/sparql/resultNodes.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |
| `frontend/src/i18n/kindLabel.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（静的coverage検査済み、実ブラウザ確認はTask 13） |

## Task 11の対象パス

| source path | 用途 | Task | 状態 |
| --- | --- | --- | --- |
| `frontend/src/components/DetailPanel.tsx` | 探索・編集・クエリ・説明文 | 11 | 操作・所有文言を移行、rule/data生成元は別途移行 |
| `frontend/src/components/ExplainBlock.tsx` | 探索・編集・クエリ・説明文 | 11 | 所有文言を移行済み、最終ブラウザ確認待ち |
| `frontend/src/components/ExploreStart.tsx` | 探索・編集・クエリ・説明文 | 11 | 操作・所有文言を移行、rule/data生成元は別途移行 |
| `frontend/src/components/HierarchyView.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（データラベル・runner拒否の生成元はTask 12） |
| `frontend/src/components/HierarchyActions.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（データラベル・runner拒否の生成元はTask 12） |
| `frontend/src/components/EntityPicker.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/EditSection.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（runner・通知の生成元はTask 12） |
| `frontend/src/components/EditStructure.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（通知・拒否の生成元はTask 12） |
| `frontend/src/components/EditParts.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（runner・通知の生成元はTask 12） |
| `frontend/src/components/CreateForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（エラー・衝突の生成元はTask 12） |
| `frontend/src/components/NewEntityForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（エラー・衝突の生成元はTask 12） |
| `frontend/src/components/RelationshipForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（警告・通知の生成元はTask 12） |
| `frontend/src/components/AttributeForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（共有クラス・警告の生成元は別途移行） |
| `frontend/src/components/AnnotationAdder.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（エラー生成元はTask 12） |
| `frontend/src/components/ConceptRelations.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（エラー生成元はTask 12） |
| `frontend/src/components/SharedDomain.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（警告・通知の生成元はTask 12） |
| `frontend/src/components/ReusePlan.tsx` | 探索・編集・クエリ・説明文 | 11 | 表示文を移行（通知・拒否の生成元はTask 12） |
| `frontend/src/components/DeleteDialog.tsx` | 探索・編集・クエリ・説明文 | 11 | 影響・選択肢を移行（コマンド通知・拒否の生成元はTask 12） |
| `frontend/src/components/LinkPanel.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（拒否・読み取り専用理由の生成元は別途移行） |
| `frontend/src/components/ExampleForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（拒否・読み取り専用理由の生成元は別途移行） |
| `frontend/src/components/QueryPanel.tsx` | 探索・編集・クエリ・説明文 | 11 | 操作・保存・一覧を移行（生成説明・hint・拒否・textQuery通知は継続） |
| `frontend/src/components/QueryStart.tsx` | 探索・編集・クエリ・説明文 | 11 | 開始候補の案内を移行済み |
| `frontend/src/components/ResultsTable.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行済み |
| `frontend/src/components/ResultPanels.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（違反・グループ・データラベルの生成元はTask 12） |
| `frontend/src/components/PathBar.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の文言を移行済み |
| `frontend/src/components/ClassPropsMenu.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行 |
| `frontend/src/components/PredicateMenu.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行 |
| `frontend/src/components/NextSteps.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の文言を移行済み |
| `frontend/src/components/SparqlEditor.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の操作文言を移行済み、外部生成元は接続待ち |
| `frontend/src/components/SparqlPreview.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の操作文言を移行済み、外部生成元は接続待ち |
| `frontend/src/components/NothingSelected.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の文言を移行済み |
| `frontend/src/types.ts` | 探索・編集・クエリ・説明文 | 11 | 種類名の翻訳接続済み |
| `frontend/src/i18n/parts.ts` | リンク付き翻訳テンプレートの組み立て | 11 | 説明画面に接続済み、最終ブラウザ確認待ち |
| `frontend/src/components/SearchBox.tsx` | 探索・編集・クエリ・説明文 | 11 | 種類名の翻訳接続済み |
| `frontend/src/modeling/sentences.ts` | 探索・編集・クエリ・説明文 | 11 | 共通文法関数を移行、呼び出し元への接続は進行中 |
| `frontend/src/modeling/ruleSentences.ts` | 探索・編集・クエリ・説明文 | 11 | 共通の文章・選択肢・検証文を移行、呼び出し元への接続は継続 |
| `frontend/src/explain/explainSentences.ts` | 探索・編集・クエリ・説明文 | 11 | 所有文言を移行済み、最終ブラウザ確認待ち |
| `frontend/src/explain/glossary.ts` | 探索・編集・クエリ・説明文 | 11 | 所有文言を移行済み、最終ブラウザ確認待ち |
| `frontend/src/sparql/starters.ts` | 探索・編集・クエリ・説明文 | 11 | 開始候補の案内を移行済み |
| `frontend/src/canvas/useCanvasData.ts` | 探索・編集・クエリ・説明文 | 11 | API・保存エラーの生成元はTask 12で移行 |
| `frontend/src/canvas/relate.ts` | 探索・編集・クエリ・説明文 | 11 | 関係候補・拒否文・ボックスの読み上げを移行、画面接続済み |
| `frontend/src/canvas/layered.ts` | 探索・編集・クエリ・説明文 | 11 | 表示文言なし（配置計算のみ） |
| `frontend/src/canvas/kindColours.ts` | 探索・編集・クエリ・説明文 | 11 | 種類名の表示を移行、色の定義は保持 |
| `frontend/src/canvas/curves.ts` | 探索・編集・クエリ・説明文 | 11 | 表示文言なし（SVGパス計算のみ） |
| `frontend/src/canvas/RelateMenu.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（runner通知・APIエラー等はTask 12、ブラウザ確認はTask 13） |
| `frontend/src/canvas/ModelCanvas.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（runner通知・APIエラー等はTask 12、ブラウザ確認はTask 13） |
| `frontend/src/canvas/ConceptNode.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（runner通知・APIエラー等はTask 12、ブラウザ確認はTask 13） |
| `frontend/src/canvas/ClassNode.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行（runner通知・APIエラー等はTask 12、ブラウザ確認はTask 13） |
| `frontend/src/canvas/CanvasAids.tsx` | 凡例・キーボードヘルプ・初回案内 | 11 | 画面所有文言を移行、開閉状態とdismissフラグを保持（実ブラウザ確認はTask 13） |
| `frontend/src/components/GraphView.tsx` | 探索グラフの共通操作・ズーム・出力案内 | 11 | 操作を移行、ルールラベル生成元は別途移行 |
| `frontend/src/components/SideTabs.tsx` | 編集・推論の共通タブ表示 | 11 | 既定表示を移行、カスタム表示の生成元は別途移行 |

| `frontend/src/modeling/entity.ts` | 所属クラスの表示用結合 | 11 | 表示言語引数を追加、呼び出し元への接続は進行中 |

| `frontend/src/modeling/values.ts` | 注釈の型・検証・説明文 | 11 | 共通表示関数を移行、呼び出し元への接続は進行中 |

| `frontend/src/components/useSuggestions.ts` | 作成候補の説明・件数 | 11 | 元の取得データから現在のUI言語で表示 |

| `frontend/src/modeling/examples.ts` | 具体例の型説明・入力検証 | 11 | 共通表示関数を移行 |

| `frontend/src/modeling/shapeSentences.ts` | ルール・検証の文章 | 12 | 共通の説明・型と言語の表示・入力確認・結果集計を移行（通知元への接続はTask 12） |

| `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 全体テンプレートを移行、enの既存語形処理を保持 |

| `frontend/src/components/RuleBuilder.tsx` | クラスのルール編集 | 11 | 画面所有文言と説明文を移行、編集内容を保持 |
| `frontend/src/components/RulesBlock.tsx` | ルールの一覧・操作 | 11/12 | 画面所有文言を移行、通知・サーバー警告はTask 12 |

| `frontend/src/components/RuleEditor.tsx` | SHACLルール編集 | 11/12 | 画面所有文言・説明・入力確認を移行、編集値と隠れたフィールドを保持 |
| `frontend/src/components/ShapesView.tsx` | 検証ルールセット一覧 | 11/12 | 画面所有文言・行と件数バッジを移行、結果データから現在言語で表示 |
| `frontend/src/components/ShapeForm.tsx` | 検証ルールセット編集 | 11/12 | 画面所有文言・説明・候補・削除確認を移行（サーバーの生成文はTask 12） |

| `frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数を移行、状態判定と件数集計は保持 |
| `frontend/src/components/ReasoningPanel.tsx` | 推論の操作・結果の枠 | 11/12 | 画面所有文言・終了メタデータを接続（事実・原因・APIエラーの生成元はTask 12） |
| `frontend/src/components/WhyDisclosure.tsx` | 根拠の開閉・表示の枠 | 11/12 | 画面所有文言を移行、開閉と取得済み結果を保持（サーバーの根拠文はTask 12） |
| `frontend/src/components/InferredBlock.tsx` | 詳細の推論結果の枠 | 11/12 | 見出しと個体を持てないことの説明を移行（事実文・APIエラーの生成元はTask 12） |

## 登録済みメッセージ

一覧は現在のカタログと使用箇所から生成した作業記録。動的キーの接頭辞も使用箇所として記載する。
契約のみのサーバーメッセージは、生成元からの出力と画面表示をTask 12で接続する。

| code | args | source path | 用途 | Task | 状態 |
| --- | --- | --- | --- | --- | --- |
| `app.workspace` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.load` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.homeHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.loadHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.pickFirst` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.viewHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.exploreHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.editHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.treeHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.queryHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.shapesHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.aboutHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.about` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.networkHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.network` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.lightHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.darkHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.theme` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.ontology` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.activeOntology` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.closeHint` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.closeOntology` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.noneOpen` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.libraryReadOnly` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.shapesReadOnly` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.libraryCopy` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.saveProject` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.canvas` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.canvasLoading` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.canvasFailed` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.retry` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.reasoning` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.details` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.selectPrompt` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.skipList` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.buildingGraph` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.nodes` | count | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.edges` | count | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.countPartial` | drawn, total | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.count` | count | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.example` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.recoveryTitle` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.discardThem` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.recover` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.recoveryBody` | date | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.commentsTitle` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.dontSave` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.saveBackup` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.commentsBody` | backup | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.changeToTaxonomy` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.changeToOntology` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.change` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.toTaxonomyBody` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.toOntologyBody` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.applyTitle` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.stay` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.discard` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.apply` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.applyBody` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.saveTitle` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.save` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.thisProject` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.saveBody` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.deleteQuestion` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.title` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.builtin` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.bundled` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.library` | name | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.mapped` | name | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.file` | name | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.downloaded` | date | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.loaded` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.blocked` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.failed` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.pending` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.directOne` | count | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.directMany` | count | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.loadedOne` | count | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.loadedMany` | count | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.loadedPendingOne` | count, pending | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.loadedPendingMany` | count, pending | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.resolvedOne` | count | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.resolvedMany` | count | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.usedOne` | count, files | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.usedMany` | count, files | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.notNeeded` | files | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.invalidFile` | file | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.noMatch` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.noIri` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.mismatch` | declared, iri | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.usingUnnamed` | iri | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.using` | iri, name | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.progress` | done, total | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.resolving` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.offline` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.resolve` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.refresh` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.chooseGroup` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.chooseFiles` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.chooseFolder` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.include` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.showTogether` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.showOwn` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.retry` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.openLink` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.copied` | iri | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.copyFailed` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.copy` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.chooseFile` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.useLibraryLabel` | iri | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `imports.useLibrary` | — | `frontend/src/components/ImportsPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.notGraphNode` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.expansion.none` | drawn, total | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.expansion.one.complete` | added, drawn, total | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `app.expansion.one.partial` | added, budget, neighbors, drawn, total | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `app.expansion.many.complete` | added, drawn, total | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `app.expansion.many.partial` | added, budget, neighbors, drawn, total | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `query.shownOnGraph.one` | count | `frontend/src/sparql/resultNodes.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `query.shownOnGraph.many` | count | `frontend/src/sparql/resultNodes.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `app.kindOntology` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.kindTaxonomy` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.projectCopied` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.projectDeleted` | name, location | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.empty` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.emptyHelp` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.title` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.original` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.originalHelp` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.formatted` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.formattedHelp` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.find` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.none` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.previous` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.next` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.copyTitle` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.copied` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.copy` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.reading` | — | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.missingPast` | — | `frontend/src/sourceTarget.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.missing` | — | `frontend/src/sourceTarget.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.matches` | index, total | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.meta` | format, lines, kilobytes | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.partialStatements` | shown, total | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.partialLines` | lines, shown, total | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `source.more` | count | `frontend/src/components/SourceView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.applying` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.invalid` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.edited` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.clean` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.discardHelp` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.noDiscard` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.applyHelp` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.noApply` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.discard` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.apply` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.applyFirst` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.parser` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.results` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.name` | file | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.parseLocation` | line, column | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `editor.help` | — | `frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.all` | total | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.maximum` | drawn, total | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.partial` | drawn, total | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.cleared.one` | count | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.cleared.many` | count | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.less` | — | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.more` | — | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.lessHelp` | — | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.allHelp` | — | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.moreHelp` | — | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.floor` | floor | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `graph.maximumHelp` | drawn | `frontend/src/components/GraphNotice.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.title` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.closedTitle` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.closedText` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.openText` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.collapse` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.ring` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.nodes` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.toggle` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.rdfs` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.relations` | — | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `legend.kindCount` | kind, count | `frontend/src/components/Legend.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.subClassOf` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.subPropertyOf` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.domain` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.range` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.instanceOf` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.assertion` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.broader` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.related` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.inScheme` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.member` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.equivalentClass` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.equivalentProperty` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.disjointWith` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.inverseOf` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.sameAs` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.seeAlso` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `edge.rule` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.project` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.document` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.documentHelp` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.unsavedTag` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.undo` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.redo` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.noUndo` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.noRedo` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.save` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.saveHelp` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.turtleHelp` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.more` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.moreHelp` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.shapes` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.copy` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.canvas` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.close` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.showNames` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.primary` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.additional` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.remove` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.addLanguage` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.add` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.invalidLanguage` | — | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.undoName` | label | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.redoName` | label | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.undoHelp` | label | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.redoHelp` | label | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.language` | language | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.missing` | missing, total, language | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `projectHeader.removeLanguage` | language | `frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.dismissError` | — | `frontend/src/App.tsx`<br>`frontend/src/components/HierarchyView.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `app.dismissNotice` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.title` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.sendingFile` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.readingFile` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.downloading` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.close` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.suggested` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.file` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.url` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.data` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.leaveQuestion` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.leaveHelp` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.leave` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.continue` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.restore` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.suggestedHelp` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.drop` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.address` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.addressHint` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.fetch` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.githubHelp` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.enterpriseHelp` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.allRestored` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.dataTitle` | name | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.dialog.restored` | names | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.downloading` | — | `frontend/src/components/CatalogueList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.original` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.schemaorg.description` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.schemaorg.size` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.schemaorg.audience` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.fibo.description` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.fibo.size` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.fibo.audience` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.unesco.description` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.unesco.size` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `catalogue.unesco.audience` | — | `frontend/src/catalogue.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.library` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.preparing` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.ready` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pick` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.begin` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.newProject` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.search` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.view` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.cards` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.rows` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.retry` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.loading` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.empty` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.or` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.file` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.url` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsQuestion` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsScope` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsWarn` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.generate` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.open` | — | `frontend/src/components/OntologyCard.tsx`<br>`frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.source` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.download` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.fromThis` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.remove` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.example` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.readOnly` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.working` | — | `frontend/src/components/OntologyCard.tsx`<br>`frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.rename` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.saveName` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.toTaxonomy` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.toOntology` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.duplicate` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.export` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.delete` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pending.entities` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pending.explore` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pending.query` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pending.view` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pending.hierarchy` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pending.shapes` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.pending.home` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.matches.one` | — | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.matches.many` | count | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.noMatch` | query | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsOrigin` | name, host | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsInclude.one_one` | individuals, assertions | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsInclude.one_many` | individuals, assertions | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsInclude.many_one` | individuals, assertions | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.docsInclude.many_many` | individuals, assertions | `frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.more` | name | `frontend/src/components/OntologyCard.tsx`<br>`frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.newName` | name | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.openName` | name | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.added` | date | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.changed` | date | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.action.explore` | name | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.hint.explore` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.action.entities` | name | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.hint.entities` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.action.query` | name | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.hint.query` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.action.view` | name | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.hint.view` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.projectSummary` | classes, properties, concepts | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.projectData` | label | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.dataOff` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.concepts.one` | count | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.concepts.many` | count | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `summary.empty` | — | `frontend/src/explore/suggestions.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `summary.contents` | items | `frontend/src/explore/suggestions.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `summary.join` | first, last | `frontend/src/explore/suggestions.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.class.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.class.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.objectProperty.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.objectProperty.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.datatypeProperty.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.datatypeProperty.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.annotationProperty.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.annotationProperty.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.property.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.property.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.concept.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.concept.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.conceptScheme.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.conceptScheme.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.collection.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.collection.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.individual.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.individual.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.ontology.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.ontology.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.other.one` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kindCount.other.many` | count | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.title` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.kindQuestion` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.ontology` | — | `frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.taxonomy` | — | `frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.ontologyHelp` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.taxonomyHelp` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.empty` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.small` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.taxonomy-empty` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.taxonomy-small` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.chooseKind` | — | `frontend/src/components/NewProjectDialog.tsx`<br>`frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.name` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.source` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.chooseFirst` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.templates` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.libraryCopy` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.copyHelp` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.baseIri` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.baseHelp` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.prefix` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.primaryLanguage` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.languageHelp` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.creating` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.create` | — | `frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.error.name` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.error.nameLength` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.error.base` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.error.prefix` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.error.language` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.details` | — | `frontend/src/App.tsx`<br>`frontend/src/components/DetailPanel.tsx`<br>`frontend/src/components/HierarchyView.tsx`<br>`frontend/src/components/HomeScreen.tsx`<br>`frontend/src/components/ImportsPanel.tsx`<br>`frontend/src/components/LoadDialog.tsx`<br>`frontend/src/components/NetworkPanel.tsx`<br>`frontend/src/components/NewProjectDialog.tsx`<br>`frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/SourceView.tsx`<br>`frontend/src/components/TurtleEditor.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.close` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.title` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.loading` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.connections` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.offline` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.offlineState` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.onlineState` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.offlineNotice` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.onlineNotice` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.sites` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.emptySites` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.allowed` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.blockedState` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.revoke` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.recent` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.emptyActivity` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.plain` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.revokeName` | host, purpose | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.revoked` | host | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.panel.bytes` | count | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.why` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.sent` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.sees` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.addressInfo` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.address` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.encryption` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.plain` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.explain` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.whyFirst` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.whySecond` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.duration` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.once` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.site` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.sites` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.hint` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.decline` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.allow` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.queryText` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.serviceNothingElse` | — | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.headingOne` | hosts | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.headingMany` | hosts | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.queryAt` | url | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.approval.always` | purpose, sites | `frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.unreachable` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.always.fetch` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.always.import` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.always.context` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.always.service` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.always.other` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.purpose.fetch` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.purpose.import` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.purpose.context` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.purpose.service` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.purpose.other` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.ok` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.http-error` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.redirect` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.failed` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.refused` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.blocked` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.asked` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.offline` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.too-large` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `network.outcome.other` | — | `frontend/src/networkWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.quote` | value | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.listSeparator` | — | `frontend/src/components/LoadDialog.tsx`<br>`frontend/src/components/NetworkApprovalDialog.tsx`<br>`frontend/src/explore/suggestions.ts`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.empty` | — | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.projects.one` | count | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.projects.many` | count | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.library.one` | count | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.library.many` | count | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.both.one_one` | projects, ontologies | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.both.one_many` | projects, ontologies | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.both.many_one` | projects, ontologies | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.both.many_many` | projects, ontologies | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.statements.one` | count | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `status.statements.many` | count | `frontend/src/statusWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.unknown` | name | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.zero` | name | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.count.one` | name, count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.named.one` | name, count, names | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.done.one` | name, count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `remove.count.many` | name, count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.named.many` | name, count, names | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.done.many` | name, count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | 静的使用箇所確認（動的候補を含む） |
| `load.sending` | name, sent, total, unit | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.downloading.one` | elapsed | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.still.one` | elapsed | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.reading.one` | name, size, elapsed | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.expected.one` | name, size, elapsed, expected | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.downloading.many` | elapsed | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.still.many` | elapsed | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.reading.many` | name, size, elapsed | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.expected.many` | name, size, elapsed, expected | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.announce.sending` | name | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.announce.reading` | name | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.announce.still` | name | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.announce.downloading` | — | `frontend/src/loadWords.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.stopped` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.tooLate` | — | `frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.close` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.purpose` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.description` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.modified` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.source` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.scope` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.notices` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.author` | name | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.upstream` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.privacy` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.privacyDetail` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `about.issues` | — | `frontend/src/components/AboutPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.class` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.objectProperty` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.datatypeProperty` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.annotationProperty` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.property` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.concept` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.conceptScheme` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.collection` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.individual` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.ontology` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `kind.other` | — | `frontend/src/i18n/kindLabel.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.retry` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.filter` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.kind` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.sort` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.sortLabel` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.sortIri` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.all` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.concept` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.individual` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.class` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.properties` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.other` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.label` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.iri` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.description` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.reference` | — | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/ReferenceOnlyPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.undefined` | — | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/ReferenceOnlyPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.copy` | — | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/ReferenceOnlyPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.copied` | — | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/ReferenceOnlyPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.range` | start, end, total | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.previous` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.next` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.empty` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.updating` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.truncated` | — | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.fallback` | language | `frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.readonly` | — | `frontend/src/components/DictionaryContext.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.editing` | — | `frontend/src/components/DictionaryContext.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.saved` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.dirty` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.saving` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/ProjectHeader.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.saveError` | — | `frontend/src/components/DictionaryContext.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.cancel` | — | `frontend/src/App.tsx`<br>`frontend/src/components/AnnotationAdder.tsx`<br>`frontend/src/components/AttributeForm.tsx`<br>`frontend/src/components/ConceptRelations.tsx`<br>`frontend/src/components/DeleteDialog.tsx`<br>`frontend/src/components/EditParts.tsx`<br>`frontend/src/components/EditSection.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/HomeScreen.tsx`<br>`frontend/src/components/ImportsPanel.tsx`<br>`frontend/src/components/LoadDialog.tsx`<br>`frontend/src/components/NewEntityForm.tsx`<br>`frontend/src/components/NewProjectDialog.tsx`<br>`frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/QueryPanel.tsx`<br>`frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/ReusePlan.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.prompt` | — | `frontend/src/App.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.queryPrompt` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.results` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.loading` | — | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.one` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.none` | — | `frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.count` | count | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.more` | count | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.narrow` | count | `frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.showAll` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.undrawn` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.undrawnTitle` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.from` | name | `frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.importNone` | — | `frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.name` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.alias` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.reading` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.search` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.identifier` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/EntityPicker.tsx`<br>`frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.home` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.view` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.explore` | — | `frontend/src/App.tsx`<br>`frontend/src/components/ExploreStart.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.edit` | — | `frontend/src/App.tsx`<br>`frontend/src/components/EditSection.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.query` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.shapes` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.entities` | — | `frontend/src/App.tsx`<br>`frontend/src/components/EntityList.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `ui.language` | — | `frontend/src/components/UiLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.language` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/DictionaryLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.apply` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/DictionaryLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.invalidLanguage` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/DictionaryLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.error` | — | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/TurtleEditor.tsx`<br>`frontend/src/i18n/parts.ts`<br>`frontend/src/i18n/serverMessage.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.notSet` | — | `frontend/src/i18n/format.ts`<br>`frontend/src/i18n/parts.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.title` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.description` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.reload` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.success` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `parse.syntax` | format, line | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `model.invalid_value` | value, datatype | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `validation.min_count` | name, count | `frontend/src/sparql/generate.ts` | UI・読み上げ・通知 | 12 | 静的使用箇所確認（動的候補を含む） |
| `reasoning.timeout` | seconds | `frontend/src/components/RulesBlock.tsx` <br>`backend/app/reasoning.py` | UI・読み上げ・通知 | 12 | 実際のタイムアウト値から生成、推論画面に接続済み |
| `entities.page_too_large` | total, suggested_limit | `frontend/src/components/EntityList.tsx`<br>`backend/app/routers/ontologies.py` | UI・読み上げ・通知 | 12 | カタログ登録済み |
| `entities.view_changed` | — | `frontend/src/components/EntityList.tsx`<br>`backend/app/routers/ontologies.py` | UI・読み上げ・通知 | 12 | カタログ登録済み |
| `request.invalid` | — | `frontend/src/components/RulesBlock.tsx` | UI・読み上げ・通知 | 12 | 静的使用箇所確認（動的候補を含む） |
| `results.title` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.page` | page, pages | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.capHint` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.cap` | count | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.noExport` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.csvHint` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.jsonHint` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.csv` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.json` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.frameHint` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.frame` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.clearHint` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.clear` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.noRows` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.sort` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.source` | name | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.pages` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.first` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.prev` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.next` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.last` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.alreadyFirst` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.alreadyLast` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.range` | end, page, pages, start, total | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.exportTitle` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.exportBody` | count | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.exportAnyway` | — | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.services` | hosts | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.serviceCap` | count, host | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.serviceSkipped` | error, host | `frontend/src/components/ResultsTable.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `sentence.parent` | child, parent | `frontend/src/explain/explainSentences.ts`<br>`frontend/src/modeling/sentences.ts` | リンク付き説明文の共通テンプレート | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `sentence.link.subClassOf` | from, to | `frontend/src/modeling/sentences.ts` | リンク付き説明文の共通テンプレート | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `sentence.link.broader` | from, to | `frontend/src/explain/explainSentences.ts`<br>`frontend/src/modeling/sentences.ts` | リンク付き説明文の共通テンプレート | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `sentence.link.related` | from, to | `frontend/src/modeling/sentences.ts` | リンク付き説明文の共通テンプレート | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `sparql.preview.editHint` | — | `frontend/src/components/SparqlPreview.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.preview.newHint` | — | `frontend/src/components/SparqlPreview.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.preview.edit` | — | `frontend/src/components/SparqlPreview.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.preview.new` | — | `frontend/src/components/SparqlPreview.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.preview.empty` | — | `frontend/src/components/SparqlPreview.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.fork` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.back` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.prefix` | prefix | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.label` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.helpFresh` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.helpRun` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.tabHelp` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.runningAnnouncement` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.runBlockedLabel` | reason | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.runHint` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.running` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.run` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.download` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.open` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `sparql.editor.close` | — | `frontend/src/components/SparqlEditor.tsx` | SPARQL表示・編集操作 | 11 | カタログ・画面接続済み |
| `queryStart.try` | — | `frontend/src/components/QueryStart.tsx` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `queryStart.questions` | — | `frontend/src/components/QueryStart.tsx` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `queryStart.readyHelp` | — | `frontend/src/components/QueryStart.tsx` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `queryStart.or` | — | `frontend/src/components/QueryStart.tsx` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `queryStart.pickHelp` | — | `frontend/src/components/QueryStart.tsx` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.all` | name | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.instances` | count | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.count` | name | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.countDetail` | — | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.narrower` | — | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.narrowerDetail` | — | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.perScheme` | — | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.perSchemeDetail` | — | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.inData` | count | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `starter.declared` | — | `frontend/src/sparql/starters.ts` | クエリ開始候補と説明 | 11 | カタログ・画面接続済み |
| `path.title` | — | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.empty` | — | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.linkHint` | step | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.classHint` | variable | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.optional` | — | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.pinned` | name | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.properties` | count | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.removeHint` | — | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.removeName` | name, step | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.clearHint` | — | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `path.clear` | — | `frontend/src/components/PathBar.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.add` | — | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.addLabel` | count | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.options` | count | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.filterPrompt` | — | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.filterLabel` | — | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.noMatch` | filter | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.from.forward` | anchor, predicate, step | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.from.inverse` | anchor, predicate, step | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.fromCount.forward` | anchor, count, predicate, step | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `next.fromCount.inverse` | anchor, count, predicate, step | `frontend/src/components/NextSteps.tsx` | クエリ経路・次のステップ | 11 | カタログ・画面接続済み |
| `model.type.text` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.type.integer` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.type.decimal` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.type.boolean` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.type.date` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.type.dateTime` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.type.uri` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.type.none` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.noStart` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.noEnd` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.rowAttribute` | start, type | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.rowRelation` | end, start | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.otherConceptOne` | count | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.otherConceptMany` | count | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.otherClassOne` | count | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.otherClassMany` | count | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.readOnlyConcept` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.readOnlyClass` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.readOnlyRelationship` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `model.readOnlyAttribute` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `characteristic.name.functional` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `characteristic.name.inverseFunctional` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `characteristic.name.symmetric` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `characteristic.name.transitive` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `characteristic.name.asymmetric` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `characteristic.name.irreflexive` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `characteristic.name.reflexive` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.exactMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.exactMatch.meaning` | — | `frontend/src/explain/glossary.ts`<br>`frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.closeMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.closeMatch.meaning` | — | `frontend/src/explain/glossary.ts`<br>`frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.broadMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.broadMatch.meaning` | — | `frontend/src/explain/glossary.ts`<br>`frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.narrowMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.narrowMatch.meaning` | — | `frontend/src/explain/glossary.ts`<br>`frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.relatedMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.relatedMatch.meaning` | — | `frontend/src/explain/glossary.ts`<br>`frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `emptyModel.title` | — | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `emptyModel.helpClass` | — | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `emptyModel.helpConcept` | — | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `emptyModel.model` | — | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `emptyModel.counting` | — | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `emptyModel.newClass` | — | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `emptyModel.newConcept` | — | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.class.one` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.class.many` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.concept.one` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.concept.many` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.relationship.one` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.relationship.many` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.attribute.one` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.attribute.many` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.example.one` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `modelCount.example.many` | count | `frontend/src/components/NothingSelected.tsx` | 選択前の編集案内とモデル集計 | 11 | カタログ・画面接続済み |
| `explain.kind.class` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.objectProperty` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.datatypeProperty` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.annotationProperty` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.property` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.individual` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.concept` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.conceptScheme` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.collection` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.ontology` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.kind.other` | label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.stop` | — | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.list.separator` | — | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.list.and` | — | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.list.or` | — | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.end.unnamed` | — | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.end.missing` | — | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.end.union` | classes | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.end.separate` | classes | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.count` | count | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.countMore` | count | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.names.all` | names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.names.some` | names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.property` | from, label, to | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.inverse` | inverse | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.attribute.typed` | domain, label, type | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.attribute.untyped` | domain, label | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.individual` | label, types | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.schemes` | schemes | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.heading` | — | `frontend/src/components/ExplainBlock.tsx` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.terms` | count | `frontend/src/components/ExplainBlock.tsx` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.description.complete` | text | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.description.fragment` | text | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.descriptionMarked.complete` | language, text | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.descriptionMarked.fragment` | language, text | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.children.one` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.children.many` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.membersOwn.one` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.membersOwn.many` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.membersExcluded.one` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.membersExcluded.many` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.collection.one` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.collection.many` | count, names | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.narrower.one` | count | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.narrower.many` | count | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.top.one` | count | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `explain.top.many` | count | `frontend/src/explain/explainSentences.ts` | リンク付き説明・件数・著者の説明 | 11 | カタログ・画面接続済み |
| `glossary.rdf.type` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdf.Property` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdf.langString` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdf.List` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdf.first` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdf.rest` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdf.nil` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.subClassOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.subPropertyOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.domain` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.range` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.label` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.comment` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.Class` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.Literal` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.Resource` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.Datatype` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.isDefinedBy` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.seeAlso` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.rdfs.member` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.Ontology` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.Class` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.Thing` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.Nothing` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.NamedIndividual` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.ObjectProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.DatatypeProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.AnnotationProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.FunctionalProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.InverseFunctionalProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.SymmetricProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.AsymmetricProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.TransitiveProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.ReflexiveProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.IrreflexiveProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.inverseOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.equivalentClass` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.equivalentProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.disjointWith` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.AllDisjointClasses` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.members` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.sameAs` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.differentFrom` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.versionInfo` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.versionIRI` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.priorVersion` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.imports` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.deprecated` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.Restriction` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.onProperty` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.onClass` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.someValuesFrom` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.allValuesFrom` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.hasValue` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.cardinality` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.minCardinality` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.maxCardinality` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.qualifiedCardinality` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.minQualifiedCardinality` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.maxQualifiedCardinality` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.intersectionOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.unionOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.complementOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.oneOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.owl.disjointUnionOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.Concept` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.ConceptScheme` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.Collection` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.OrderedCollection` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.prefLabel` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.altLabel` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.hiddenLabel` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.definition` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.scopeNote` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.note` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.example` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.editorialNote` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.historyNote` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.changeNote` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.notation` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.broader` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.narrower` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.related` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.inScheme` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.hasTopConcept` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.topConceptOf` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.member` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.skos.memberList` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.title` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.description` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.creator` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.contributor` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.publisher` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.created` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.modified` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.issued` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.date` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.license` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.rights` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.source` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.subject` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dcterms.Agent` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dc.title` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dc.description` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dc.date` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dc.creator` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.dc.subject` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.string` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.integer` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.nonNegativeInteger` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.positiveInteger` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.int` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.decimal` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.double` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.float` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.boolean` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.date` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.dateTime` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.time` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.gYear` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `glossary.xsd.anyURI` | — | `frontend/src/explain/glossary.ts` | 標準用語の意味定義 | 11 | 共通定義・画面接続済み |
| `common.loading` | — | `frontend/src/components/DetailPanel.tsx`<br>`frontend/src/components/ExploreStart.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `explore.start` | — | `frontend/src/components/ExploreStart.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `explore.pickHelp` | — | `frontend/src/components/ExploreStart.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `explore.data` | label | `frontend/src/components/ExploreStart.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `explore.entityOne` | count, kind | `frontend/src/components/ExploreStart.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `explore.entityMany` | count, kind | `frontend/src/components/ExploreStart.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.imported` | name | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.data` | label | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.dataRow` | label, row | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.close` | — | `frontend/src/components/DetailPanel.tsx`<br>`frontend/src/components/LinkPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.openIri` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.copyIri` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.fetchingHint` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.expandHint` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.drawing` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.expand` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.names` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.missing` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.rules` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.turtleRule` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.statements` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.references` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.noReferences` | — | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.statementsLimit` | shown, total | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.statementsRulesLimit` | rules, shown, total | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `detail.referencesLimit` | shown, total | `frontend/src/components/DetailPanel.tsx` | 探索・詳細の操作と案内 | 11 | カタログ・画面接続済み |
| `graphUi.stopHint` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.layoutHint` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.stop` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.layout` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.imageHint` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.image` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.linkHelp` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.none` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.noneYet` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.loadHelp` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.description` | drawn, total | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.descriptionImported` | drawn, total | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.zoomGroup` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.zoomIn` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.zoomOut` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.zoomMin` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.zoomMax` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.fit` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `graphUi.fitHint` | — | `frontend/src/components/GraphView.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `sideTabs.details` | — | `frontend/src/components/SideTabs.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `sideTabs.reasoning` | — | `frontend/src/components/SideTabs.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `sideTabs.label` | — | `frontend/src/components/SideTabs.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `sideTabs.badgeNew` | count | `frontend/src/components/SideTabs.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `sideTabs.badgeLabel` | name, spoken | `frontend/src/components/SideTabs.tsx` | グラフ操作・共通タブの案内 | 11 | カタログ・画面接続済み |
| `modelSentences.relation` | from, name, to | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.existing` | from, name, to | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.created` | from, name, to | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.noStart` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.noEnd` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.something` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.thing` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.it` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.noClass` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.importedOntology` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.characteristic.functional` | from, name, to | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.characteristic.inverseFunctional` | from, name, to | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.characteristic.symmetric` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.characteristic.transitive` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.characteristic.asymmetric` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.characteristic.irreflexive` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.characteristic.reflexive` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.oneStart.known` | from, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.oneStart.missing` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.attribute.typed` | domain, name, type | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.attribute.untyped` | domain, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.oneValue` | domain, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.oneValueEmpty` | domain | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.topConcept` | scheme | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.join.separator` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.join.and` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.join.or` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.paragraphJoin` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.suggestion.attributeTyped` | domain, name, type | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.suggestion.attribute` | domain, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.suggestion.relationship` | domain, end, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.already` | — | `frontend/src/canvas/ClassNode.tsx`<br>`frontend/src/components/NewEntityForm.tsx`<br>`frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.use` | cls | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.matches.attribute.one` | count | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.matches.attribute.many` | count | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.matches.relationship.one` | count | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.matches.relationship.many` | count | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.whoever.attribute` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.whoever.relationship` | name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.noClass` | cls, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.already` | cls, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.alreadyVia` | articleClass, cls, name, via | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.move` | cls, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.keep` | articleChild, child, parent | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.subclass` | articleDomain, cls, domain, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.makeKind` | cls, domain | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.union` | classes, either, name, whoever | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.shareIt` | — | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/SharedDomain.tsx`<br>`frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.orParent` | — | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.plan.rdfsParent` | classes, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.parentQuestion` | classes | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.giveParent` | classes | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.importedParent` | cls, source | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.move` | name, parent | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.gains.none` | name, parent | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.gains.one` | articleGain, gain, name, parent | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.gains.many` | gains, name, parent | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.more` | count | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.shared` | classes, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.given` | cls, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.removed` | cls, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.domain.union` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.domain.separate` | — | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.reasonerNote` | — | `frontend/src/components/SharedDomain.tsx`<br>`frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.shareEntry` | from, name, to, verb | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |
| `modelSentences.memberDelete` | member, name | `frontend/src/modeling/sentences.ts` | 関係文・特性例・属性・共有の案内 | 11 | 共通関数を接続、フォームの移行は進行中 |

## 対象外・生成元待ち

| source path | 内容 | 理由・次の確認 |
| --- | --- | --- |
| `frontend/src/components/AboutPanel.tsx` | 原MIT・原著作権・保証否認の原文 | 法的通知の原文を保持する。表示用説明の翻訳で置換しない。 |
| `frontend/src/components/NetworkApprovalDialog.tsx` | `reason` / `sends` | サーバーが生成した原文。Task 12で発生箇所にコードと引数を追加する。英語の完成文を解析して翻訳しない。 |
| `frontend/src/components/SourceView.tsx` / `TurtleEditor.tsx` | RDF本文・解析器の技術的原文 | 利用者のデータと外部エラーの原文を維持する。操作・見出しは翻訳対象。 |
| `frontend/src/components/LoadDialog.tsx` / `CatalogueList.tsx` | RDF形式名、提供者名、元データの記述 | 固有の形式名・公開元データの記述を原表記で保持する。アプリが作成したcatalogue.tsの説明・サイズ・対象者案内は翻訳対象。 |
| Task 10対象全般 | className、DOM ID、CSSセレクター、API enum、IRI、ファイル形式・言語タグ | 動作上の識別子であり、表示文の翻訳に合わせて変更しない。 |

## 残りの確認

- Task 10の最終検証と、Task 11/12の生成元から届く文言の接続。coverage.test.tsは対象パス・キー・型の引数・実際のリテラル使用箇所を検査する。
- Task 11の探索・編集・Query・canvasとリンク付き説明文。
- Task 12の検証・推論・既存データ機能、サーバーの全発生箇所。
- Task 13の実ブラウザ・AX・キーボード・日英切替の確認。

Task 10の補足：`ConfirmDialog`自身は表示文を持たず、呼び出し元が翻訳した見出し・本文・操作名を受け取る。
`ProjectHeader`の操作履歴、参照解決の制限・失敗理由、データスナップショットのラベルなど、生成元で文章化される値はTask 12でコード・引数へ移行する。
`SourceView`、`TurtleEditor`のRDF本文、利用者が指定した名前・IRI、外部解析器の原文は保持する。ファイル名やバックアップ先は翻訳文に値として挿入する。
`coverage.test.ts`はTypeScriptの構文木から使用箇所を読む。任意の未翻訳文言の不在や、画面上の収まり・読み上げの品質まで保証するものではない。

`types.ts`の`KIND_LABELS`は従来の呼び出し元向けの英語互換表。UIの種類名は現在の翻訳関数を渡し、色は引き続き`theme/kinds.ts`の定義を使う。

`i18n/parts.ts`はカタログのテンプレートを先に分割してから値を挿入する。翻訳後の文章や名称・IRIからリンクを探さない。リンク参照は既存の`{iri, label}`を保持し、日英の語順が異なっても同じ参照先へ移動する。

SPARQLエディターの`saveLabel`・`saveTitle`はQueryPanelが生成するため、その呼び出し元の移行で接続する。`TextQuery.note`・`runBlocked`・エラーの既知生成元も棚卸し対象であり、ユーザー／埋め込みクエリ著者の原文と区別して移行する。現時点でこれらを翻訳対象外として確定しない。

開始候補の英語の複数形変換は英語表示時に限定する。日本語の案内には元の名称を渡し、言語を変えても生成するQueryStateとSPARQL本文は同一に保つ。`source → relationship → target`の矢印表記は、名前を並べた構造表示として原表記を維持する。

OWL特性・SKOS対応関係の選択肢は`characteristicChoices(t)`／`mappingChoices(t)`で表示時の翻訳を受け取る。従来の定数は英語の互換投影であり、ID・OWL名・順序・moreフラグは変えない。対応関係の意味はこの共通定義からglossaryでも利用し、別の意味定義を複製しない。

標準用語の意味はglossaryのIRI→コード登録から解決する。日英は同じコードに対応し、SKOS対応関係は編集選択肢と同じ意味コードを共有する。英語互換の`GLOSSARY`定数はこの登録の投影である。本文内の数値・日付はデータ型の字句例として保持する。未知のカスタム定義・著者の原文は翻訳で置換しない。

使用箇所はTypeScript構文木の文字列・リテラル接頭辞を持つテンプレートから検査する。動的キーはテンプレートの静的部分が一致する候補を記載し、すべての分岐の実行済み証明とは区別する。接頭辞を持たない任意の文字列式を、すべてのメッセージの使用とは扱わない。

DetailPanelのルール本文（ruleSentences）とデータ出典ラベル（dataSentences）は、生成元の移行で接続する。探索の順位付けはグラフが変わった時だけ再計算し、UI言語の変更では文言の要約のみ更新する。

GraphViewのルール由来ラベルはruleSentencesの移行で接続する。SideTabsの呼び出し元が渡すカスタム名・バッジは、その生成元で翻訳を組み立てる。既定の編集タブと数値バッジのみをここで生成し、IDや選択状態は翻訳しない。

modelingの文法を伴うヘルパーは末尾のUI locale引数（省略時en）で、文章全体をカタログから選ぶ。英語の冠詞・動詞変形・大文字化は共通モジュールの英語ポリシーだけで行い、他言語では入力の名称を保持する。冠詞付きの表示用引数や結合済みリストは描画時だけに作る値であり、保存する通知の生データにしない。長期保持する通知は生成元で生の名称・配列を保持し、表示時に組み立てる。

| `attributeForm.belongs` | — | `frontend/src/components/AttributeForm.tsx`<br>`frontend/src/components/CreateForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.clearClass` | name | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.clear` | — | `frontend/src/components/AttributeForm.tsx`<br>`frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/RelationshipForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.noClass` | — | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.classLabel` | name | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.changeClass` | — | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.chooseClass` | — | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.changeClassLabel` | name | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.chooseClassLabel` | name | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.valueType` | — | `frontend/src/components/AttributeForm.tsx`<br>`frontend/src/components/NewEntityForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.setType` | — | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.changeType` | — | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.changeTypeLabel` | name | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.howMany` | — | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |
| `attributeForm.oneValue` | — | `frontend/src/components/AttributeForm.tsx` | 属性編集フォーム | 11 | 画面所有文言を移行済み |

| `relationshipForm.sentence` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.warnings` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.fix` | label | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.ends` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.from` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.to` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.clear.start` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.clear.end` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.no.start` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.no.end` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pick.start` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pick.end` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.change.start` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.change.end` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.set.start` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.set.end` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.changeLabel.start` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.changeLabel.end` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.setLabel.start` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.setLabel.end` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.swapTitle` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.noSwap` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.swap` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.inverse` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.none` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.removeInverse` | inverse, name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.nameInverse` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.inverseField` | language | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.create` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.existingInverse` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pickInverse` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.changeInverse` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.newInverse` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.characteristics` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.characteristicsLabel` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.more` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.parent` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.noParent` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.removeParent` | name, parent | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pickParent` | name | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.addParent` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pointers` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pointer` | action, domain, to | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pointerAction` | domain | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.pointerExample` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `relationshipForm.shapes` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `sharedDomain.remove` | cls, name | `frontend/src/components/SharedDomain.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `sharedDomain.removeButton` | — | `frontend/src/components/ConceptRelations.tsx`<br>`frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/SharedDomain.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `sharedDomain.warning` | — | `frontend/src/components/SharedDomain.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `sharedDomain.another` | name | `frontend/src/components/SharedDomain.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `sharedDomain.add` | name | `frontend/src/components/SharedDomain.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |
| `sharedDomain.addButton` | — | `frontend/src/components/SharedDomain.tsx` | 関係・共有クラスの編集 | 11 | 画面所有文言を移行済み |

| `relationshipForm.fixButton` | — | `frontend/src/components/RelationshipForm.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 警告の修正ボタン | 11 | 画面所有文言を移行済み |

| `reusePlan.use` | name | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 共有計画の表示 | 11 | 画面所有文言を移行済み |
| `reusePlan.checking` | name | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 共有計画の表示 | 11 | 画面所有文言を移行済み |
| `reusePlan.pickParent` | — | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 共有計画の表示 | 11 | 画面所有文言を移行済み |
| `reusePlan.existingParent` | — | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 共有計画の表示 | 11 | 画面所有文言を移行済み |
| `reusePlan.yes` | — | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 共有計画の表示 | 11 | 画面所有文言を移行済み |
| `reusePlan.moveUp` | — | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 共有計画の表示 | 11 | 画面所有文言を移行済み |
| `reusePlan.turtle` | — | `frontend/src/components/ReusePlan.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 共有計画の表示 | 11 | 画面所有文言を移行済み |

| `conceptRelations.related` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.noRelated` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.removeRelated` | name, related | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.pickRelated` | name | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.addRelated` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.mappings` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.noMappings` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.removeMapping` | kind, target | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.newMapping` | name | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.kind` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.pickImported` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.link` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.addMapping` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |
| `conceptRelations.imported` | — | `frontend/src/components/ConceptRelations.tsx` | 概念の関連・対応付け | 11 | 画面所有文言を移行済み |

| `values.type.text` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.string` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.integer` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.decimal` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.boolean` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.date` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.dateTime` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.anyURI` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.type.link` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.emptyText` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.badLanguage` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.emptyLink` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.linkSpace` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.badLink` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.badUri` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.problem.integer` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.problem.decimal` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.problem.boolean` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.problem.date` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.problem.dateTime` | value | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.textLang` | language | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.link` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.yes` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.no` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.language` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.other` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.languageTag` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.common` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.document` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.import` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.addTitle` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.property` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.choose` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.loading` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.new` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.newName` | language | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.valuesAre` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.valueType` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.value` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.saving` | — | `frontend/src/components/AnnotationAdder.tsx`<br>`frontend/src/components/EditParts.tsx`<br>`frontend/src/components/EditSection.tsx`<br>`frontend/src/components/HierarchyView.tsx`<br>`frontend/src/components/NewEntityForm.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.create` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `annotation.add` | — | `frontend/src/components/AnnotationAdder.tsx` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.string` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.integer` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.decimal` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.boolean` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.date` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.dateTime` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |
| `values.description.anyURI` | — | `frontend/src/modeling/values.ts`<br>`frontend/src/sparql/generate.ts` | 注釈の入力・値の説明 | 11 | 表示文・入力検証文を移行済み |

| `editParts.copied` | text | `frontend/src/components/EditParts.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editParts.copyFailed` | — | `frontend/src/components/EditParts.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editParts.none` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/EditParts.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editParts.addLabel` | label | `frontend/src/components/EditParts.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editParts.editLabel` | label | `frontend/src/components/EditParts.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editParts.add` | — | `frontend/src/components/EditParts.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editParts.edit` | — | `frontend/src/components/EditParts.tsx`<br>`frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editParts.save` | — | `frontend/src/components/EditParts.tsx`<br>`frontend/src/components/EditSection.tsx`<br>`frontend/src/components/QueryPanel.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.imported` | source | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.fromData` | source | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.external` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.subclass` | name | `frontend/src/components/EditSection.tsx`<br>`frontend/src/components/EditStructure.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.addSubclass` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.hide` | — | `frontend/src/components/EditSection.tsx`<br>`frontend/src/components/HierarchyActions.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.show` | — | `frontend/src/components/EditSection.tsx`<br>`frontend/src/components/HierarchyActions.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.partial` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.names` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.requiredLanguage` | language | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.nameLanguage` | language | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.missing` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.definition` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.definitionLabel` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.annotations` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.noAnnotations` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.addAnnotation` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.examples` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.noExamples` | name | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.newExample` | name | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.submitExample` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.addExample` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.identifier` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.copy` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.changeIdentifier` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.renameNote` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.newIdentifier` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.submitIdentifier` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.delete` | name | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.copyValue` | value | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.editValue` | words | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.removeValue` | words | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.remove` | — | `frontend/src/components/EditSection.tsx`<br>`frontend/src/components/EditStructure.tsx`<br>`frontend/src/components/ExampleForm.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |
| `editSection.turtleOnly` | — | `frontend/src/components/EditSection.tsx` | 共通編集操作・項目編集 | 11 | 画面所有文言を移行済み |

| `editStructure.both` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.sharedWith` | classes | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.shared` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.separator` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.sharedHeading` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.through` | parent | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.structure` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.parent` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.noParent` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.removeParent` | name, parent | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.newParent` | name | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.addParent` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.subclasses` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.noSubclasses` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.addSubclass` | — | `frontend/src/components/EditStructure.tsx`<br>`frontend/src/components/HierarchyActions.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.attributes` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.noAttributes` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.newAttribute` | name | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.addAttribute` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.relationships` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.noRelationships` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.newRelationship` | name | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.addRelationship` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.chooseTarget` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.targetClass` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.pointsTo` | target | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.noTarget` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.change` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.chooseClass` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.broader` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.noBroader` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.removeBroader` | broader, name | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.newBroader` | name | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.addBroader` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.narrower` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.noNarrower` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.newNarrower` | name | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.addNarrower` | — | `frontend/src/components/EditStructure.tsx`<br>`frontend/src/components/HierarchyActions.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |
| `editStructure.scheme` | — | `frontend/src/components/EditStructure.tsx` | 構造・共有・継承の編集 | 11 | 画面所有文言を移行済み |

| `newEntity.name` | language | `frontend/src/components/NewEntityForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `newEntity.another` | — | `frontend/src/components/NewEntityForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `newEntity.use` | cls, name | `frontend/src/components/NewEntityForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `newEntity.more` | — | `frontend/src/components/NewEntityForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `newEntity.identifier` | — | `frontend/src/components/NewEntityForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `newEntity.create` | — | `frontend/src/components/NewEntityForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `newEntity.expressionDomain` | — | `frontend/src/components/useSuggestions.ts` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.class` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/HierarchyView.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.classParent` | parent | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.concept` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/HierarchyView.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.conceptParent` | parent | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.relationship` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/HierarchyView.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.attribute` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/HierarchyView.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.example` | — | `frontend/src/components/CreateForm.tsx`<br>`frontend/src/components/HierarchyView.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.choice` | label, value | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.choose` | — | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.missingExample` | — | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.parentClass` | — | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.parentConcept` | — | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.definition` | — | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |
| `create.exampleClass` | — | `frontend/src/components/CreateForm.tsx` | 項目の新規作成 | 11 | 画面所有文言を移行済み |

| `delete.title` | name | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.busy` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.action` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.checking` | name | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.noProject` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.failed` | detail, name | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.statements.one` | count, name | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.statements.many` | count, name | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.reparent.one` | parents | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.reparent.many` | parents | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.top.one` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.top.many` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.orphan.one` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.orphan.many` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.role.domain` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.role.range` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertyRef` | label, role | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.properties.one` | count, kind, properties, role | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.properties.many` | count, kind, properties | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.individuals.one` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.individuals.many` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.mentions.one` | count | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.mentions.many` | count | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.listSeparator` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertySeparator` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.children.class.one` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.children.class.many` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.children.concept.one` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.children.concept.many` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.children.property.one` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.children.property.many` | count, names | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertyKind.relationship.one` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertyKind.relationship.many` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertyKind.attribute.one` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertyKind.attribute.many` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertyKind.property.one` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |
| `delete.propertyKind.property.many` | — | `frontend/src/components/DeleteDialog.tsx` | 削除影響・確認 | 11 | 画面所有文言を移行済み |

| `linkPanel.title.subClassOf` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.title.broader` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.title.related` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.words.subClassOf` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.words.broader` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.words.related` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.and` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.removing` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `linkPanel.remove` | — | `frontend/src/components/LinkPanel.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.classes` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.noClass` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.values` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.noFields` | classes | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.nothing` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.classJoin` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.hint.single` | description | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.hint.multi` | description | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.to` | target | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.anyEnd` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.remove` | label, name, value | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.noOther` | target | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.noTarget` | cls, target | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.example` | — | `frontend/src/components/ExampleForm.tsx`<br>`frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.class` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.changeLabel` | label | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.linkTo` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.choose` | target | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.anyExample` | — | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.options` | shown, total | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.newValue` | label | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.action.change` | label | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.action.link` | label | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleForm.action.add` | label | `frontend/src/components/ExampleForm.tsx` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.string` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.integer` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.decimal` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.boolean` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.date` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.dateTime` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.anyURI` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.other` | datatype | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.type.text` | — | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.choose` | target | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |
| `exampleValue.give` | label | `frontend/src/modeling/examples.ts` | 関係・具体例の編集 | 11 | 画面所有文言を移行済み |

| `hierarchy.actions` | label | `frontend/src/components/HierarchyActions.tsx`<br>`frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.rename` | — | `frontend/src/components/HierarchyActions.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.delete` | — | `frontend/src/components/HierarchyActions.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.addExamples` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.import` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.outline` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.filter` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.filterLabel` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.expand` | — | `frontend/src/components/HierarchyView.tsx`<br>`frontend/src/components/ResultPanels.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.collapse` | — | `frontend/src/components/HierarchyView.tsx`<br>`frontend/src/components/ResultPanels.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.loading` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.emptyTree` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.sectionCount` | count, title | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.filteredCount` | count, title | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.shown` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.noMatches` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.renameField` | label | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.depth` | level | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.creating` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.from` | source | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.fromData` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.inferredLabel` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.inferred` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.cycleTitle` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.cycle` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.elsewhereLabel` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.elsewhere` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.children.one` | count | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.children.many` | count | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.classes` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.concepts` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.relationships` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.attributes` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.annotations` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.examples` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.objectProperties` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.section.datatypeProperties` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.empty.classes` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.empty.concepts` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.empty.relationships` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.empty.attributes` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.empty.annotations` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |
| `hierarchy.empty.examples` | — | `frontend/src/components/HierarchyView.tsx` | 階層ツリーと行操作 | 11 | 画面所有文言を移行済み |

| `queryMenu.close` | — | `frontend/src/components/ClassPropsMenu.tsx`<br>`frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.title` | name | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.pinned` | name | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.unpin` | name | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.empty` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.all` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.clear` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.count` | count | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.operator` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.noFilter` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.value` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.valueLabel` | label | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.required` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.optionalHint` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.optional` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.optional` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.optionalHint` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.modifier` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.relationships` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.empty` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.primary` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.inverse` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.forward` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.declared` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.restriction` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.inherited` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.count` | count | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.=` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.!=` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.>` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.>=` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.<` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.<=` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.contains` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.startsWith` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `propsMenu.op.lang` | — | `frontend/src/components/ClassPropsMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.modifier.exact` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.hint.exact` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.modifier.star` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.hint.star` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.modifier.plus` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.hint.plus` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.modifier.optional` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |
| `predicateMenu.hint.optional` | — | `frontend/src/components/PredicateMenu.tsx` | クエリの属性・関係メニュー | 11 | 画面所有文言を移行済み |

| `shapePanel.state.fails` | — | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.state.passes` | — | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.state.warnings` | — | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.state.nothing` | — | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.state.error` | — | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.match.one` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.match.many` | — | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.problems.one` | count | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.problems.many` | count | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.fail.one` | failing, focus, name, problems, target | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.fail.many` | failing, focus, name, problems, target | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.pass.one` | name, target | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.pass.many` | count, name, target | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.warning.one` | count, name | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.warning.many` | count, name | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.nothing` | name, target | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.error` | name | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `shapePanel.name` | header, state | `frontend/src/modeling/shapeSentences.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.validateHint` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.validating` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.validate` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.empty` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.stale` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.stopped.one` | shapes, statements | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.stopped.many` | shapes, statements | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.noShapes` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.checkedData` | source | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.shapeError` | error | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.nothingClass` | label | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.nothingOther` | label | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.passes` | — | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.value` | value | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |
| `results.more` | count | `frontend/src/components/ResultPanels.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/sparql/exportResults.ts` | 検証結果の見出し・操作 | 11/12 | 結果パネルの表示を移行（違反説明の生成元はTask 12） |

| `queryPanel.builder` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.options` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.scope.one` | count | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.scope.many` | count | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.scope.alone` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.includesData` | source | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.analysing` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.autoHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.auto` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.pathsHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.paths` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.distinctHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.distinct` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.countGroupedHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.countHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.count` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.refreshHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.refresh` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.limitHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.copyHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.copied` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.copy` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.copyFailed` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.updateHint` | name | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.saveHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.update` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.running` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.execute` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.name` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.duplicate` | name | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.dimmed` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.sampled` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.preview` | count | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.saved` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.open` | name | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.textBadge` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.deleteHint` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.deleteConfirm` | name | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.embedded` | count | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.reading` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.embeddedLimit` | shown, total | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.openEmbedded` | name | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.shaclBadge` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.discard` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.onlySelect` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.cutShort` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |
| `queryPanel.shaclVariables` | — | `frontend/src/components/QueryPanel.tsx` | クエリ画面の操作・保存・一覧 | 11 | 画面所有文言を移行（保存された通知・生成説明は継続） |

| `queryDescription.start.pin` | cls, pin | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.start.all` | cls | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.rootOnly` | start | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.traversal` | hops, start | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.hop` | anchor, modifier, names, target | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.hopOptional` | anchor, modifier, names, target | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.it` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.inverse` | name | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.or` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.modifier.` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.modifier.*` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.modifier.+` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.modifier.?` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.hopsJoin` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.listJoin` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.conditionsJoin` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.sentencesJoin` | — | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.property` | cls, label | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.condition` | cls, condition | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.pinCondition` | cls, pin | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.countGrouped` | root, target | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.count` | target | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.shown` | properties | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.only` | conditions | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.limit` | count | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.limitDistinct` | count | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.=` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.!=` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.>` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.>=` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.<` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.<=` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.contains` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.startsWith` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |
| `queryDescription.filter.lang` | label, value | `frontend/src/sparql/describe.ts` | クエリの説明文 | 11 | 現在のUI言語で生成（QueryStateは変更しない） |

| `ruleSentence.countOne` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.something` | — | `frontend/src/components/RulesBlock.tsx` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.values` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.qualified` | filler | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.countWhat` | filler | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.blank` | cls | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.every.some` | cls, filler, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.every.only` | cls, filler, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.every.value` | cls, filler, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.defines.named` | cls, phrase, with | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.defines.any` | cls, phrase | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.define.some` | filler, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.define.only` | filler, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.define.value` | filler, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.define.blank` | property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.disjoint` | cls, other | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.disjointBlank` | cls | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.equivalent` | cls, other | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.short.defines` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.short.some` | property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.short.only` | property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.short.value` | property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.more.one` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.more.many` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.world.defines` | articleClass | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.world.some` | articleClass, cls, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.world.only` | articleClass, cls, filler, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.world.exactly` | articleClass, cls, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.world.default` | articleClass, cls, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.type.every` | cls | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.type.defines` | cls | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.type.disjoint` | cls | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.type.equivalent` | cls | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.kind.some` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.kind.only` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.kind.exactly` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.kind.atLeast` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.kind.atMost` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.kind.value` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.problem.other` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.problem.property` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.problem.kind` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.problem.attribute` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.problem.number` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.problem.target` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.problem.value` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.that.one` | filler | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.that.many` | filler | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.every.exactly` | cls, count, property, tail | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.define.exactly` | count, property, what | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.short.exactly` | count, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.every.atLeast` | cls, count, property, tail | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.define.atLeast` | count, property, what | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.short.atLeast` | count, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.every.atMost` | cls, count, property, tail | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.define.atMost` | count, property, what | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.short.atMost` | count, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.world.atLeast` | articleClass, cls, count, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |
| `ruleSentence.world.atMost` | articleClass, cls, count, property | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/modeling/ruleSentences.ts` | ルールの説明・選択肢 | 11 | 共通表示関数を移行、画面への接続は継続 |

| `canvasAid.lines` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.line.kindof` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.line.relationship` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.line.broader` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.line.related` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.line.inferred` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.line.rule` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.help` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.helpTitle` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.close` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.key.outline` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.key.create` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.key.edit` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.key.move` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.explanation` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.tip.title` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.tip.addClass` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.tip.addConcept` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.tip.dropClass` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.tip.dropConcept` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.tip.relate` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |
| `canvasAid.tip.dismiss` | — | `frontend/src/canvas/CanvasAids.tsx` | キャンバスの操作案内 | 11 | 移行済み |

| `canvasKind.owl` | — | `frontend/src/canvas/kindColours.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasKind.rdfs` | — | `frontend/src/canvas/kindColours.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasKind.concept` | — | `frontend/src/canvas/kindColours.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasKind.scheme` | — | `frontend/src/canvas/kindColours.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasKind.example` | — | `frontend/src/canvas/kindColours.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasKind.attribute` | — | `frontend/src/canvas/kindColours.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasKind.outside` | — | `frontend/src/canvas/ModelCanvas.tsx`<br>`frontend/src/canvas/kindColours.ts`<br>`frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasKind.imported` | name | `frontend/src/canvas/kindColours.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.mixed` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.otherConcept` | name | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.otherClass` | name | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.noEnds` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.self` | name | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.imported` | name, source | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.alreadyNarrower` | from, to | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.relatedRefusal` | from, to | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.new` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.rule` | name | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasRelate.used` | from, property, to | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.class` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.concept` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.parents.class` | parents | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.parents.concept` | parents | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.join` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.separator` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.children.class.one` | count | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.children.class.many` | count | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.children.concept.one` | count | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.children.concept.many` | count | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.outsideReadonly` | — | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.importedReadonly` | name | `frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |
| `canvasBox.never` | name | `frontend/src/canvas/ClassNode.tsx`<br>`frontend/src/canvas/relate.ts` | キャンバスの種類・関係・読み上げ | 11 | 共通表示関数を移行 |

| `canvasNode.rename` | name | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.taxonomyReadonly` | — | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.ontologyReadonly` | — | `frontend/src/canvas/ConceptNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.neverMembers` | — | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.noType` | — | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.both` | — | `frontend/src/canvas/ClassNode.tsx`<br>`frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.shared` | — | `frontend/src/canvas/ClassNode.tsx`<br>`frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.attributeName` | name | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.valueType` | — | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.add` | — | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.cancel` | — | `frontend/src/canvas/ClassNode.tsx`<br>`frontend/src/canvas/ModelCanvas.tsx`<br>`frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.reuse` | action, name | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.addAttribute` | name | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasNode.attribute` | — | `frontend/src/canvas/ClassNode.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasMenu.to` | — | `frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasMenu.swap` | — | `frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasMenu.swapLabel` | from, to | `frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasMenu.swapTitle` | — | `frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasMenu.name` | — | `frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasMenu.saving` | — | `frontend/src/canvas/ModelCanvas.tsx`<br>`frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasMenu.create` | — | `frontend/src/canvas/RelateMenu.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.name` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.failed` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.retry` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.loading` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.toolbar` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.add` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.palette.class` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.palette.concept` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.paletteHint` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.paletteTitle.class` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.paletteTitle.concept` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.zoomIn` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.zoomOut` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.fit` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.tidy` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.undrawn.one` | count | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.undrawn.many` | count | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.undrawn` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.missing.domain` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.missing.range` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.missing.both` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.missing.expression` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.missing.outside` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.limited` | count | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.empty.class` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.empty.concept` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draftParent.class` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draftParent.concept` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draft.class` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draft.concept` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draftNameParent.class` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draftNameParent.concept` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draftName.class` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draftName.concept` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.draftKeys` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.tidyQuestion` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.tidyEffect` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.remove` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.delete` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.unshare` | member, name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.line.subClassOf` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.line.broader` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.line.related` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.inferred` | text | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.linkInferred` | text | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.sharedLink` | from, name, to | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.relationshipLink` | from, name, to | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.ruleLink` | text | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.rule` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |
| `canvasUI.ruleFallback` | from, to | `frontend/src/canvas/ModelCanvas.tsx` | キャンバス本体・ボックス・関係メニュー | 11 | 画面所有文言を移行 |

| `canvasUI.fixedInferred` | from, to | `frontend/src/canvas/ModelCanvas.tsx` | キャンバスの選択・読取専用・ドラッグ案内 | 11 | 識別子を保持し現在言語で導出 |
| `canvasUI.fixedRelationship` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバスの選択・読取専用・ドラッグ案内 | 11 | 識別子を保持し現在言語で導出 |
| `canvasUI.thisRelationship` | — | `frontend/src/canvas/ModelCanvas.tsx` | キャンバスの選択・読取専用・ドラッグ案内 | 11 | 識別子を保持し現在言語で導出 |
| `canvasUI.fixedImported` | name, source | `frontend/src/canvas/ModelCanvas.tsx` | キャンバスの選択・読取専用・ドラッグ案内 | 11 | 識別子を保持し現在言語で導出 |
| `canvasUI.selectedLine` | text | `frontend/src/canvas/ModelCanvas.tsx` | キャンバスの選択・読取専用・ドラッグ案内 | 11 | 識別子を保持し現在言語で導出 |
| `canvasUI.drop.class` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバスの選択・読取専用・ドラッグ案内 | 11 | 識別子を保持し現在言語で導出 |
| `canvasUI.drop.concept` | name | `frontend/src/canvas/ModelCanvas.tsx` | キャンバスの選択・読取専用・ドラッグ案内 | 11 | 識別子を保持し現在言語で導出 |

| `ruleForm.cap.properties` | shown, total | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.cap.classes` | shown, total | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.cap.things` | shown, total | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.rule` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.with` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.anyClass` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.thatProperty` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.property` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.choose` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.propertyOption` | kind, name | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.propertyKind.relationship` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.propertyKind.attribute` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.kind` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.count` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.optionalClass` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.fillerClass` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.anyThing` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.valueType` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.anyValue` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.thingValue` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.value` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.never` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.equivalent` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.reads` | sentence | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.saving` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.save` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.add` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `ruleForm.cancel` | — | `frontend/src/components/RuleBuilder.tsx`<br>`frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.heading` | name | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.warnings` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.empty` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.turtle` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.editTurtle` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.editLabel` | sentence | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.edit` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.removeLabel` | sentence | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.remove` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.readonly` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.checkLabel` | sentence | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.check` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |
| `rules.add` | — | `frontend/src/components/RulesBlock.tsx` | クラスのルール編集 | 11 | 画面所有文言を移行（通知・警告はTask 12） |

| `shapeWords.separator` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.pathOr` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.value` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.and` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.or` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.list` | head, join, tail | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.typeUnknown` | datatype | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.once` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.twice` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.times` | count | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.as` | type | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.pointing` | target | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.length.between` | high, low | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.length.min.one` | count | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.length.min.many` | count | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.length.max.one` | count | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.length.max.many` | count | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.pattern` | pattern | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.range.between` | high, low | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.range.min` | value | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.range.max` | value | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.allowed` | values | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.languages` | languages | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.unique` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.something` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.relation` | label, target | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.rel.exactly` | times | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.rel.between` | high, low | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.rel.min.one` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.rel.min.many` | count | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.rel.max` | times | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.exactlyOne` | label | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.exactly` | count, label | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.between` | high, label, low | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.required` | label | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.min` | count, label | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.maxOne` | label | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.max` | count, label | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.count.any` | label | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.requiredLanguages` | head, languages | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.each` | qualifier | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.typeLength` | length, type | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.everyMatch` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.everyClass` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.everyConcept` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.every` | name | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.shapeEmpty` | target | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.must` | tail, verb | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.joinRules` | head, last | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.shape` | rules, target | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.row.one` | count, target | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.row.many` | count, target | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.string` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.langString` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.integer` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.decimal` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.boolean` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.date` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.dateTime` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.datatype.anyURI` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.offered.string` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.offered.integer` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.offered.decimal` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.offered.boolean` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.offered.date` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.offered.dateTime` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.offered.anyURI` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.ar` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.ca` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.cs` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.da` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.de` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.el` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.en` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.es` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.fi` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.fr` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.he` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.hi` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.hu` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.it` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.ja` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.ko` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.la` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.nb` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.nl` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.no` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.pl` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.pt` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.ro` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.ru` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.sv` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.tr` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.uk` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.language.zh` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.number` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.length` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.counts` | high, low | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.lengths` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.pattern` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.dateTime` | value | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.date` | value | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.numeric` | value | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.range` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.allowed` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.languages` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |
| `shapeWords.problem.empty` | — | `frontend/src/modeling/shapeSentences.ts` | 検証ルールの説明・入力確認 | 11/12 | 共通関数を移行、画面への接続は継続 |

| `shapeSummary.stopped` | — | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.noProblems` | — | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.problem.one` | — | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.problem.many` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.timeout` | shapes, statements | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.empty` | — | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.total.one` | count, parts | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.total.many` | count, parts | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.passes.one` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.passes.many` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.fails.one` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.fails.many` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.warnings.one` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.warnings.many` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.nothing.one` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.nothing.many` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.error.one` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeSummary.state.error.many` | count | `frontend/src/modeling/shapeSentences.ts` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.change` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.add` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.path` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.choose` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count.none` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count.required` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count.atMostOne` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count.exactlyOne` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count.atLeast` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count.atMost` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.count.between` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.from` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.to` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.min` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.max` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.valueType` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.dontCheck` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.pointsTo` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.classPicker` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.notChecked` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.noRange` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.changeClass` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.chooseClass` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.length` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.minLength` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.maxLength` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.characters` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.dateTimeRange` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.dateRange` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.numberRange` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.minValue` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.maxValue` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.allowed` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.allowedInput` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.allowedLinks` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.allowedValues` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.languages` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.requiredIn` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.onlyIn` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.uniqueLang` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.more` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.pattern` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.patternInput` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.example.email` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.example.code` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.example.year` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.saving` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.save` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.addRule` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.cancel` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.missingPath` | — | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.path.relationship` | name | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.path.attribute` | name | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.eachClass` | name | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.language` | name, tag | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |
| `shapeEditor.reads` | sentence | `frontend/src/components/RuleEditor.tsx` | SHACL編集・結果集計 | 11/12 | 共通関数・画面を移行、結果の通知元への接続は継続 |

| `shapesView.shapeTab` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.resultsTab` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.title` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.add` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.addHint` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.concepts` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.class` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.modelCheck` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.classPicker` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.empty` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.notChecked` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.stale` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.tabs` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.choose` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.intro` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapesView.checking` | — | `frontend/src/components/ShapesView.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.readonly` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.turtle` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.applies` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.targetPicker` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.noTarget` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.change` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.name` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.nameInput` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.rules` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.empty` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.edit` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.remove` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.add` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.suggested` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.chooseTarget` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.reading` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.allSuggested` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.addSuggestion` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.more` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.severity` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.violation` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.warning` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.failureMessage` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.message` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.delete` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.deleteThis` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.cancel` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.editLabel` | path | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.removeLabel` | path | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.suggestionLabel` | sentence | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.deleteQuestion` | name | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.deleteEmpty` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.deleteOne` | — | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |
| `shapeForm.deleteMany` | count | `frontend/src/components/ShapeForm.tsx` | SHACLの一覧・フォーム | 11/12 | 画面所有文言を移行 |

| `reasoning.stopped` | — | `frontend/src/components/RulesBlock.tsx`<br>`backend/app/reasoning.py` | 推論の終了理由 | 12 | サーバーで原因コードと実値を追加、推論画面に接続済み |
| `reasoning.failed` | — | `frontend/src/components/RulesBlock.tsx`<br>`backend/app/reasoning.py` | 推論の終了理由 | 12 | サーバーで原因コードと実値を追加、推論画面に接続済み |
| `reasoning.too_large` | count, limit | `frontend/src/components/RulesBlock.tsx`<br>`backend/app/reasoning.py` | 推論の終了理由 | 12 | サーバーで原因コードと実値を追加、推論画面に接続済み |

| `reasonWords.intro` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.empty` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.nothing` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.stale` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.taxonomy` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.dataSlower` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.valuesFooter` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.neverMembers` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.notSaved` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.group.kinds` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.group.same` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.group.memberships` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.group.links` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.heading` | count, name | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.imported.one` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.imported.many` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.seconds` | value | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.running` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.ended` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.finishedEmpty` | time | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.finished` | facts, problems, time | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.problems.one` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.problems.many` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.facts.one` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.facts.many` | count | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.staleFinished` | time | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.results` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.resultsDone` | time | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.inferred` | — | `frontend/src/components/InferredBlock.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |
| `reasonWords.stated` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/reasoning/reasonSentences.ts` | 推論の状態・件数・案内 | 11/12 | 共通関数と画面を接続（操作通知の生成元はTask 12） |

| `reasonUI.reason` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.stop` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.showInferred` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.includeData` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.dataSpeed` | text | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.again` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.problems` | count | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.why` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx`<br>`frontend/src/components/WhyDisclosure.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.causedBy` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.more` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.shown` | shown, total | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.whyLabel` | label | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/components/WhyDisclosure.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.finding` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/components/WhyDisclosure.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.because` | — | `frontend/src/components/RulesBlock.tsx`<br>`frontend/src/components/WhyDisclosure.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `reasonUI.originalDetails` | — | `frontend/src/components/ReasoningPanel.tsx`<br>`frontend/src/components/RulesBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `inferred.title` | — | `frontend/src/components/InferredBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `inferred.about` | name | `frontend/src/components/InferredBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `inferred.never` | name | `frontend/src/components/InferredBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
| `inferred.empty` | name | `frontend/src/components/InferredBlock.tsx` | 推論画面・根拠・詳細の枠 | 11/12 | 画面所有文言を移行、事実・根拠のサーバー文は接続待ち |
