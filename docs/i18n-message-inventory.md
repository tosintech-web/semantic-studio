# UIメッセージ棚卸し（P1）

状態：Task 10の移行中。対象パスの登録は翻訳完了を意味しない。Task 11/12の対象と生成元は、各移行時に追加する。

UIの言語とRDFの表示言語を分離する。識別子・RDFの値・SPARQL本文・第三者からの原文・法的通知原文は翻訳しない。
内部メッセージは`MessageArgs`、サーバーの引数は`backend/app/message_contracts.json`を定義元とする。
テストは言語ごとの引数名の集合を比較する。同じ引数の出現回数は、言語によって異なってよい。

## 対象パス

| source path | 用途 | Task | 状態 |
| --- | --- | --- | --- |
| `frontend/src/App.tsx` | 共通画面・操作・通知 | 10 | 一部移行・残り作業あり |
| `frontend/src/components/HomeScreen.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/OntologyCard.tsx` | 共通画面・操作・通知 | 10 | 一部移行・残り作業あり |
| `frontend/src/components/ProjectsSection.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/NewProjectDialog.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/ProjectHeader.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
| `frontend/src/components/LoadDialog.tsx` | 共通画面・操作・通知 | 10 | 一部移行・残り作業あり |
| `frontend/src/components/CatalogueList.tsx` | 共通画面・操作・通知 | 10 | 未移行 |
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
| `frontend/src/projects/form.ts` | 共通画面・操作・通知 | 10 | 未移行 |

## 登録済みメッセージ

一覧は現在のカタログと使用箇所から生成した作業記録。動的キーの接頭辞も使用箇所として記載する。
契約のみのサーバーメッセージは、生成元からの出力と画面表示をTask 12で接続する。

| code | args | source path | 用途 | Task | 状態 |
| --- | --- | --- | --- | --- | --- |
| `common.details` | — | `frontend/src/components/NetworkPanel.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `common.listSeparator` | — | `frontend/src/removalPrompt.ts`<br>`frontend/src/components/NetworkApprovalDialog.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `load.stopped` | — | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
| `load.tooLate` | — | producer接続待ち | UI・読み上げ・通知 | 2/3/7/8/10 | 契約のみ |
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
| `dictionary.saved` | — | `frontend/src/components/DictionaryContext.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.dirty` | — | `frontend/src/components/DictionaryContext.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.saving` | — | `frontend/src/components/DictionaryContext.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `dictionary.saveError` | — | `frontend/src/components/DictionaryContext.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `common.cancel` | — | `frontend/src/components/ReferenceOnlyPanel.tsx`<br>`frontend/src/components/EntityPicker.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `nav.home` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.view` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.explore` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.edit` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.query` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.shapes` | — | `frontend/src/App.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
| `nav.entities` | — | `frontend/src/App.tsx`<br>`frontend/src/components/EntityList.tsx` | UI・読み上げ・通知 | 2/3/7/8/10 | カタログ登録済み |
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
| `frontend/src/components/LoadDialog.tsx` / `CatalogueList.tsx` | RDF形式名、提供者名、カタログ記述 | 固有の形式名・公開元の記述を原表記で保持する。操作・案内は翻訳対象。 |
| Task 10対象全般 | className、DOM ID、CSSセレクター、API enum、IRI、ファイル形式・言語タグ | 動作上の識別子であり、表示文の翻訳に合わせて変更しない。 |

## 残りの確認

- Task 10の未移行文字列・通知と各パスのcoverageテスト。
- Task 11の探索・編集・Query・canvasとリンク付き説明文。
- Task 12の検証・推論・既存データ機能、サーバーの全発生箇所。
- Task 13の実ブラウザ・AX・キーボード・日英切替の確認。
