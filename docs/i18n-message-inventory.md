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
| `frontend/src/components/DetailPanel.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/ExplainBlock.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/ExploreStart.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/HierarchyView.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/HierarchyActions.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/EntityPicker.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/EditSection.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/EditStructure.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/EditParts.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/CreateForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/NewEntityForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/RelationshipForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/AttributeForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/AnnotationAdder.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/ConceptRelations.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/SharedDomain.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/ReusePlan.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/DeleteDialog.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/LinkPanel.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/ExampleForm.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/QueryPanel.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/QueryStart.tsx` | 探索・編集・クエリ・説明文 | 11 | 開始候補の案内を移行済み |
| `frontend/src/components/ResultsTable.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有文言を移行済み |
| `frontend/src/components/ResultPanels.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/PathBar.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の文言を移行済み |
| `frontend/src/components/ClassPropsMenu.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/PredicateMenu.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/components/NextSteps.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の文言を移行済み |
| `frontend/src/components/SparqlEditor.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の操作文言を移行済み、外部生成元は接続待ち |
| `frontend/src/components/SparqlPreview.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の操作文言を移行済み、外部生成元は接続待ち |
| `frontend/src/components/NothingSelected.tsx` | 探索・編集・クエリ・説明文 | 11 | 画面所有の文言を移行済み |
| `frontend/src/types.ts` | 探索・編集・クエリ・説明文 | 11 | 種類名の翻訳接続済み |
| `frontend/src/i18n/parts.ts` | リンク付き翻訳テンプレートの組み立て | 11 | 共通機構を実装、説明画面への接続待ち |
| `frontend/src/components/SearchBox.tsx` | 探索・編集・クエリ・説明文 | 11 | 種類名の翻訳接続済み |
| `frontend/src/modeling/sentences.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/modeling/ruleSentences.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/explain/explainSentences.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/explain/glossary.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/sparql/starters.ts` | 探索・編集・クエリ・説明文 | 11 | 開始候補の案内を移行済み |
| `frontend/src/canvas/useCanvasData.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/relate.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/layered.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/kindColours.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/curves.ts` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/RelateMenu.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/ModelCanvas.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/ConceptNode.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/ClassNode.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |
| `frontend/src/canvas/CanvasAids.tsx` | 探索・編集・クエリ・説明文 | 11 | 未移行（Task 11進行中） |

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
| `app.expansion.one.complete` | added, drawn, total | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `app.expansion.one.partial` | added, budget, neighbors, drawn, total | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `app.expansion.many.complete` | added, drawn, total | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `app.expansion.many.partial` | added, budget, neighbors, drawn, total | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `query.shownOnGraph.one` | count | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `query.shownOnGraph.many` | count | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
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
| `app.dismissError` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `home.open` | — | `frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.source` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.download` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.fromThis` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.remove` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.example` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.readOnly` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.working` | — | `frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `home.more` | name | `frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `project.ontology` | — | `frontend/src/projects/form.ts`<br>`frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.taxonomy` | — | `frontend/src/projects/form.ts`<br>`frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.ontologyHelp` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.taxonomyHelp` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.empty` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.small` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.taxonomy-empty` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.template.taxonomy-small` | — | `frontend/src/projects/form.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `project.chooseKind` | — | `frontend/src/projects/form.ts`<br>`frontend/src/components/NewProjectDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `common.details` | — | `frontend/src/App.tsx`<br>`frontend/src/components/TurtleEditor.tsx`<br>`frontend/src/components/SourceView.tsx`<br>`frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/NewProjectDialog.tsx`<br>`frontend/src/components/NetworkPanel.tsx`<br>`frontend/src/components/LoadDialog.tsx`<br>`frontend/src/components/ImportsPanel.tsx`<br>`frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `common.listSeparator` | — | `frontend/src/removalPrompt.ts`<br>`frontend/src/explore/suggestions.ts`<br>`frontend/src/components/NetworkApprovalDialog.tsx`<br>`frontend/src/components/LoadDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `remove.unknown` | name | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.zero` | name | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.count.one` | name, count | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.named.one` | name, count, names | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.done.one` | name, count | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `remove.count.many` | name, count | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.named.many` | name, count, names | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.done.many` | name, count | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
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
| `entities.reference` | — | `frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.undefined` | — | `frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.copy` | — | `frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `entities.copied` | — | `frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `common.cancel` | — | `frontend/src/App.tsx`<br>`frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/NewProjectDialog.tsx`<br>`frontend/src/components/LoadDialog.tsx`<br>`frontend/src/components/ImportsPanel.tsx`<br>`frontend/src/components/HomeScreen.tsx`<br>`frontend/src/components/EntityPicker.tsx` <br>`frontend/src/components/ResultsTable.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.prompt` | — | `frontend/src/App.tsx`<br>`frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.queryPrompt` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.results` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.loading` | — | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.one` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.none` | — | `frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.count` | count | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.more` | count | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.narrow` | count | `frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.showAll` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.undrawn` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.undrawnTitle` | — | `frontend/src/components/SearchBox.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.from` | name | `frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.importNone` | — | `frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.name` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.alias` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.reading` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.search` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `match.identifier` | value | `frontend/src/components/EntityList.tsx`<br>`frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.home` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.view` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.explore` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.edit` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.query` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.shapes` | — | `frontend/src/App.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.entities` | — | `frontend/src/App.tsx`<br>`frontend/src/components/EntityList.tsx`<br>`frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `ui.language` | — | `frontend/src/components/UiLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.language` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/DictionaryLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.apply` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/DictionaryLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.invalidLanguage` | — | `frontend/src/components/DictionaryContext.tsx`<br>`frontend/src/components/DictionaryLanguageSelect.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.error` | — | `frontend/src/i18n/serverMessage.ts`<br>`frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/EntityList.tsx`<br>`frontend/src/components/TurtleEditor.tsx` <br>`frontend/src/i18n/parts.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.notSet` | — | `frontend/src/i18n/format.ts` <br>`frontend/src/i18n/parts.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.title` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.description` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.reload` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.success` | name | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `parse.syntax` | format, line | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `model.invalid_value` | value, datatype | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `validation.min_count` | name, count | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `reasoning.timeout` | seconds | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `entities.page_too_large` | total, suggested_limit | `frontend/src/components/EntityList.tsx`<br>`backend/app/routers/ontologies.py` | UI・読み上げ・通知 | 12 | カタログ登録済み |
| `entities.view_changed` | — | `frontend/src/components/EntityList.tsx`<br>`backend/app/routers/ontologies.py` | UI・読み上げ・通知 | 12 | カタログ登録済み |
| `request.invalid` | — | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `results.title` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.page` | page, pages | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.capHint` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.cap` | count | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.noExport` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.csvHint` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.jsonHint` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.csv` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.json` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.frameHint` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.frame` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.clearHint` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.clear` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.noRows` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.sort` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.source` | name | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.pages` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.first` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.prev` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.next` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.last` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.alreadyFirst` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.alreadyLast` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.range` | end, page, pages, start, total | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.exportTitle` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.exportBody` | count | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.exportAnyway` | — | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.services` | hosts | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.serviceCap` | count, host | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `results.serviceSkipped` | error, host | `frontend/src/components/ResultsTable.tsx` | クエリ結果・操作・通知 | 11 | カタログ・画面接続済み |
| `sentence.parent` | child, parent | `frontend/src/modeling/sentences.ts` | リンク付き説明文の共通テンプレート | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `sentence.link.subClassOf` | from, to | `frontend/src/modeling/sentences.ts` | リンク付き説明文の共通テンプレート | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `sentence.link.broader` | from, to | `frontend/src/modeling/sentences.ts` | リンク付き説明文の共通テンプレート | 11 | 共通関数を接続済み、画面の移行は進行中 |
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
| `mapping.exactMatch.meaning` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.closeMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.closeMatch.meaning` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.broadMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.broadMatch.meaning` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.narrowMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.narrowMatch.meaning` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.relatedMatch.name` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
| `mapping.relatedMatch.meaning` | — | `frontend/src/modeling/sentences.ts` | 型・読み取り専用境界・特性・対応関係の案内 | 11 | 共通関数を接続済み、画面の移行は進行中 |
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
