# 国・政府組織グループの検証記録

対象ブランチ：`feat/country-government-ontology`。設計は[国・政府組織オントロジー設計](superpowers/specs/2026-10-28-country-government-ontology-design.md)、実行順は[実装計画](superpowers/plans/2026-10-28-country-government-ontology.md)。合成データだけで検証する。

実装・全ローカル検証・4回の独立レビューは完了。Task 8の残りは最新PR headのCI確認であり、CIが終わるまで開発目標全体の完了とは扱わない。

## 受け入れ条件との対応

| 条件 | 主な検証 | 状態 |
| --- | --- | --- |
| 1. メニューから別々のグループを作成 | GroupNavigation / HomeScreen / NewProjectDialog / Appの試験、Chrome `government` | G1/G2/G3メニュー操作まで確認済み |
| 2. 国IRI・同名の識別、名称変更時の固定IRI | government_commands / government_http / CountryPicker、Chromeの拡張受け入れ | API・拡張local Chrome確認済み |
| 3. 200件超の候補とstale拒否 | 251件の候補、ページ・検索・code/IRI・source snapshot試験 | 確認済み |
| 4. 施行日前後の移管切替 | government_records / government_changes、Chromeの2030-03-31/2030-04-01操作 | 2020年の日付はAPI、2030年は実Chromeで確認済み |
| 5. 統合・分割・吸収・原子的なUndo | government_changes / team_government、実Chromeの吸収・移管・Undo | 既存writer再起動後も確認済み |
| 6. 未知日付・未来改称・存在期間 | government_records / government_changes / GovernmentView、日英Chrome | 確認済み |
| 7. 所有者・参照元切替・遅延・再認証 | command/http/team/API/UIの競合試験、P2回帰 | P2全回帰・政府組織team Chrome確認済み |
| 8. 再起動・再送・復元・複製・ZIP | 新しいlocal services、real writer restart、PG archive backup/restore | 全PG partitionを両Pythonで確認済み |
| 9. 日英・Tab/Escape・focus・AX | Chromeによるメニュー作成、入力保持、確認checkbox、実Tab/Enter、720px | local・team確認済み |
| 10. 全履歴／投影と公開境界 | ZIPのaccepted RDF照合、投影ヘッダー、release-preview/approveの拒否 | 機能別確認済み |

## 機能別の確認済み結果

- Task 1：profile・template・既存project互換のbackend109件、frontend19件。
- Task 2：期間・投影・循環・未知境界・存在期間の21件。
- Task 3：関連backend408件、PG関連82件をPython 3.12/3.14それぞれで確認。応答喪失後の再送、viewer拒否、commit直前の国更新、profile previewの無変更を含む。
- Task 4：フォーム・権限・App・i18nの関連340件、詳細API25件。Chromeで国登録、国グループ接続、組織登録、言語原値保持、AX/Tab/focusを確認。
- Task 5：履歴関連backend112件。PGの改編・再送・Undo・preview競合7件を両Pythonで確認。
- Task 6：関連backend104件、PG9件を両Pythonで確認。frontend全145ファイル・2589件を既定倍率1の順次実行で確認。Chromeで移管前後・吸収・一回Undo・日本語・720px・確認の実Tab/Enterと可視focusを確認。
- Task 7：Appを含む関連268件、最終のメニュー・Home・dialog・順序・i18n83件。実Chromeでメニューから両グループを作成し、キャンセル時のfocus復帰と未確定入力の移動拒否／破棄確認を実施。
- Task 8途中：ローカルのZIP・複製・復元・再起動と既存project83件。PGの政府組織／公開境界22件（Python 3.12）。inventory照合2件。

並列frontend実行で、既存ReasoningPanelの5000ms timeoutと、既存NextSteps/ExploreStartの時間予算が失敗した実行を保持した。制限値・倍率・検証項目を変更せず、関連の再確認と全件順次実行を行った。全件の最終実行結果は以下へ追記する。

## 最終検証

未実施・実行中の項目を成功と表示しない。

| ゲート | コマンド／方法 | 結果 |
| --- | --- | --- |
| native backend全件・既定性能予算 | `cd backend && .venv/bin/python -m pytest tests -m 'not team_db and not network' -q` | 2973 passed / 1 skipped、385.27秒。既定倍率1、全非DB・非network試験 |
| PG全件 Python 3.12 | internal-only Compose、`-m 'team_db and not network'` | 285 passed、190.82秒（最新backend） |
| PG全件 Python 3.14 | 同上、別の専用project | 285 passed、178.90秒（最新backend） |
| frontend全件・既定性能予算 | `npm --prefix frontend run test -- --maxWorkers=1` | 146ファイル、2615 passed、247.85秒。既定倍率1 |
| TypeScript・build | `npm --prefix frontend run build` | レビュー修正後成功 |
| local government Chrome | `node .claude/skills/run-semantic-viewer/driver.mjs government` | 同名国・組織、固定IRI、stale、メニュー・履歴・Undo・日英・720pxを確認済み |
| signed HTTPS / PG government Chrome | 同driver `government-team` | 全P2回帰・全政府組織UI・再送・閲覧拒否・国を保持するUndo・実際のclean poll後の外部名称保持を確認済み |
| 既存smoke/P1/P2/P3 | 同driver、P2はgovernment-teamでも全実行 | smoke・P1・P2・P3成功（P1中央値251.98ms） |
| message contracts | `python scripts/generate_message_contracts.py --check` | 成功 |
| publication / notices | 既存NUL対象ファイル列挙と配布検査 | source/commit scan成功、publication37件・notices7件成功 |
| 独立レビューと修正後の再レビュー | 変更指摘がなくなるまで実施 | 4回実施。計13指摘を修正し、4回目は重大・重要・軽微とも指摘なし |
| 最新head CI | PR #5のblocking gates | 未実施 |

## 試験inventoryと保存境界

[PostgreSQL対応表](p2-postgresql-test-inventory.md)と機械inventoryは、今回の追加時点で全3261 case、実DB285 case。旧2957 caseの対応先を維持する。行番号を含む生成試験IDは同一AST呼出しと出現順で対応付け、行番号の偶然の一致で別の生成元を対応付けない。

PostgreSQLは専用Compose projectのinternal network内だけで使用し、DB portをhostへ公開しない。実際のbackup/restore試験では、元writerを閉じ、新規maintenance接続・新しいdata directoryへ復元し、新規writer・sessionでRDFとprofileと国basisを検査した。復元時に既存sessionが再開しない既存PG archive試験も、全partitionの対象である。

localの既存Undoは開いている編集sessionの機能を再利用し、保存後のdomain履歴RDFを新しいservicesで確認する。teamはwriter再起動・backup/restore後の本人Undoも検証する。後続の本人操作を飛び越すUndoの拒否規則を弱めていない。

## 独立レビューの修正

初回レビューで挙がった7点を修正した。所属関係に説明がある組織を単一登録フォームから書き換えず、履歴編集へ誘導する。統合・分割・その他の制約をAPIとUIで一致させた。基準日の確定所属と編集用の過去参照を分離し、基準日の国解決状態と名称の確度をDTOへ追加した。表示言語はWorkspaceから全専用読取へ伝え、再認証だけでは保持中の国参照tokenを更新しない。国をまたぐ確定した包含は説明なしで拒否する。各指摘は修正前に失敗する回帰試験を追加し、修正後の関連試験で確認した。全件と再レビューは上表に追記する。

再レビューでは、通常組織編集からの包含検証の迂回、存在recordのない組織への二重存在編集、存在期間の出典の取り違え、複数国選択間のsnapshot更新を修正した。全frontend実行で検出したメニューボタンの高さ違反も、既存規則を変えず修正した。IRIを別表示し、長い名称を省略しても識別子とaccessible nameを保持する。修正前の回帰試験でbackend3件・frontend2件の失敗を確認し、修正後の関連101件・246件を確認した。

3回目のレビューでは、未編集の組織フォームがteamの新しいtarget revisionに追随せず旧値で上書きできる点と、国接続のclean metadata更新が架空のdirty選択を作る点を修正した。cleanなフォームを新しいrevisionで再読込し、dirty入力は保持して旧targetでの保存を拒否する。再読込の破棄確認も追加した。接続先は未編集の場合だけ追随し、実際の選択中入力は維持する。新しい回帰試験で修正前3件の失敗、修正後の関連297件成功を確認した。実際のteam pollを使うChrome回帰も追加した。

4回目の独立レビューは、機能ソース `5686efd` に対して重大・重要・軽微とも指摘なし。全frontendの146ファイル・2615件も成功した。追加の署名付きHTTPS／実PostgreSQL Chrome検証では、未編集の組織を開いたまま外部commandで改称し、実際の10秒pollが新名称を読み込んだ後、識別子だけ編集して改称を保持することを確認した。独立レビュー担当者は試験を再実行せず、実行結果は本記録のexecutor検証による。

## 実装時の判断と影響

| 判断 | 誤っていた場合の影響 |
| --- | --- |
| ユーザーの実装指示を設計・計画の承認として実行 | 別方針なら設計と実装の調整が必要 |
| 指定済み機能ブランチで作業しmainを変更しない | 別作業との分離が必要なら追加worktreeが必要 |
| 存在しない外部設計資料を補作せずCLAUDE.mdと既存P2/P3を基準にする | 未共有の制約があれば追補が必要 |
| 軽微な指摘も含め反復レビューしてからpush | レビュー時間が増える |
| 既存プロジェクト名の改行正規化を維持 | 原文改行の保持には別の互換変更が必要 |
| profile変更を検証後の一回のmanifest書込へ集約 | 呼出順依存があれば互換調整が必要 |
| 時間付き検証の作業量を合計1,000,000で拒否 | 大規模で正しいグラフでも分割入力が必要になり得る |
| 読取DTOの組立をviews.pyへ分離しrouterを薄くする | module境界の調整が必要になり得る |
| 共有reference_lockでlocalの国snapshotと書込を結ぶ | 未参加の書込経路があれば追加保護が必要 |
| teamは既存の全resource versionによるCASを再利用 | 無関係の更新でも再確認が必要になり得る |
| 正確なJSON booleanのpreviewだけを無変更として扱う | 文字列booleanの新規クライアントは修正が必要 |
| command本文256KiB制限を共通endpointへ適用 | 以前に大きなcommandを送るクライアントは分割が必要 |
| 新しいdomain commandsは専用authority fixtureで試験 | 汎用fixtureとの統合差分は全体試験で継続確認が必要 |
| 参照元切替のpreviewは旧・新の両snapshotを保持 | 片側の更新でも再確認が必要 |
| IDの存在確認を必須日付検証より先に行う | エラー順序を変える際は既存404互換の調整が必要 |
| フォームの忠実な編集に必要な詳細DTO・iri/q検索を追加 | APIクライアント側で追加項目への対応が必要になり得る |
| 全履歴commandsでpreviewBasisを要求し新recordはproposal由来UUIDを使う | 直接commandを送るクライアントは先にpreviewが必要 |
| 全RDF差分を50件ずつレビューし汎用delta上限500を維持 | 大きな改編では確認ページが増える |
| 組織・record候補は50件ページと固定IRIで選択し暗黙作成しない | 新設組織は先に登録する必要がある |
| メニューは既存作成dialogのtemplateを指定しgraphを先読みしない | metadataが未更新なら一覧refreshが必要 |
| 復元後も既存の最新本人transactionだけをUndoする規則を維持 | 後続の本人操作があれば前の改編を直接Undoできない |
| レビューを完了してからpushし、その後最新head CIを確認 | CI結果の記録は後続の文書commitになる |
| repository全体のlocal複数tab CASはこの機能へ追加しない | 汎用local同時編集には別のconcurrency改善が必要 |
| 別政府グループ横断・複数国同時所属・Excel・公開profileは設計通り後続 | これらの操作には追加開発が必要 |
| 無関係の未追跡spreadsheet設計は変更・公開しない | 後続設計との整合は別途確認が必要 |
| 独立した大入力benchmarkは行わず既存全性能予算と明示capを検証 | 専用の大規模データで追加測定が必要になり得る |
