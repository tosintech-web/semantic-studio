# UIメッセージ棚卸し（P1）

状態：Task 10の移行中。対象パスの登録は翻訳完了を意味しない。Task 11/12の対象と生成元は、各移行時に追加する。

UIの言語とRDFの表示言語を分離する。識別子・RDFの値・SPARQL本文・第三者からの原文・法的通知原文は翻訳しない。
内部メッセージは`MessageArgs`、サーバーの引数は`backend/app/message_contracts.json`を定義元とする。
テストは言語ごとの引数名の集合を比較する。同じ引数の出現回数は、言語によって異なってよい。

## 対象パス

| source path | 用途 | Task | 状態 |
| --- | --- | --- | --- |
| `frontend/src/App.tsx` | 共通画面・操作・通知 | 10 | 一部移行・残り作業あり |
| `frontend/src/components/HomeScreen.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/OntologyCard.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/ProjectsSection.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/NewProjectDialog.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/ProjectHeader.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/LoadDialog.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/CatalogueList.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/ConfirmDialog.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/AboutPanel.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/NetworkPanel.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/NetworkApprovalDialog.tsx` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/components/ImportsPanel.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/SourceView.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/TurtleEditor.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/GraphNotice.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/Legend.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/loadWords.ts` | 共通画面・操作・通知 | 10 | 一部移行・残り作業あり |
| `frontend/src/networkWords.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/statusWords.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/removalPrompt.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/projects/form.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/catalogue.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |
| `frontend/src/explore/suggestions.ts` | 共通画面・操作・通知 | 10 | 画面所有の文言を移行済み（最終coverage未確認） |

## 登録済みメッセージ

一覧は現在のカタログと使用箇所から生成した作業記録。動的キーの接頭辞も使用箇所として記載する。
契約のみのサーバーメッセージは、生成元からの出力と画面表示をTask 12で接続する。

| code | args | source path | 用途 | Task | 状態 |
| --- | --- | --- | --- | --- | --- |
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
| `app.dismissNotice` | — | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
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
| `home.working` | — | `frontend/src/components/OntologyCard.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.rename` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.saveName` | — | `frontend/src/components/ProjectsSection.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `home.toTaxonomy` | — | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `home.toOntology` | — | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
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
| `common.details` | — | `frontend/src/App.tsx`<br>`frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/NewProjectDialog.tsx`<br>`frontend/src/components/NetworkPanel.tsx`<br>`frontend/src/components/LoadDialog.tsx`<br>`frontend/src/components/HomeScreen.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `remove.done.one` | name, count | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.count.many` | name, count | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.named.many` | name, count, names | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `remove.done.many` | name, count | `frontend/src/removalPrompt.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `common.cancel` | — | `frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/ProjectsSection.tsx`<br>`frontend/src/components/NewProjectDialog.tsx`<br>`frontend/src/components/LoadDialog.tsx`<br>`frontend/src/components/HomeScreen.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.prompt` | — | `frontend/src/components/SearchBox.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `search.queryPrompt` | — | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
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
| `common.error` | — | `frontend/src/i18n/serverMessage.ts`<br>`frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.notSet` | — | `frontend/src/i18n/format.ts` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.title` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.description` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `crash.reload` | — | `frontend/src/components/ErrorBoundary.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `load.success` | name | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `parse.syntax` | format, line | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `model.invalid_value` | value, datatype | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `validation.min_count` | name, count | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `reasoning.timeout` | seconds | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |
| `entities.page_too_large` | total, suggested_limit | `frontend/src/components/EntityList.tsx`<br>`backend/app/routers/ontologies.py` | UI・読み上げ・通知 | 12 | カタログ登録済み |
| `entities.view_changed` | — | `frontend/src/components/EntityList.tsx`<br>`backend/app/routers/ontologies.py` | UI・読み上げ・通知 | 12 | カタログ登録済み |
| `request.invalid` | — | producer接続待ち | UI・読み上げ・通知 | 12 | 契約のみ |

## 対象外・生成元待ち

| source path | 内容 | 理由・次の確認 |
| --- | --- | --- |
| `frontend/src/components/AboutPanel.tsx` | 原MIT・原著作権・保証否認の原文 | 法的通知の原文を保持する。表示用説明の翻訳で置換しない。 |
| `frontend/src/components/NetworkApprovalDialog.tsx` | `reason` / `sends` | サーバーが生成した原文。Task 12で発生箇所にコードと引数を追加する。英語の完成文を解析して翻訳しない。 |
| `frontend/src/components/SourceView.tsx` / `TurtleEditor.tsx` | RDF本文・解析器の技術的原文 | 利用者のデータと外部エラーの原文を維持する。操作・見出しは翻訳対象。 |
| `frontend/src/components/LoadDialog.tsx` / `CatalogueList.tsx` | RDF形式名、提供者名、元データの記述 | 固有の形式名・公開元データの記述を原表記で保持する。アプリが作成したcatalogue.tsの説明・サイズ・対象者案内は翻訳対象。 |
| Task 10対象全般 | className、DOM ID、CSSセレクター、API enum、IRI、ファイル形式・言語タグ | 動作上の識別子であり、表示文の翻訳に合わせて変更しない。 |

## 残りの確認

- Task 10の未移行文字列・通知と各パスのcoverageテスト。
- Task 11の探索・編集・Query・canvasとリンク付き説明文。
- Task 12の検証・推論・既存データ機能、サーバーの全発生箇所。
- Task 13の実ブラウザ・AX・キーボード・日英切替の確認。
