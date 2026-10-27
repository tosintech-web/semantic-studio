# 国・政府組織グループの検証記録

対象ブランチ：`feat/country-government-ontology`。設計は[国・政府組織オントロジー設計](superpowers/specs/2026-10-28-country-government-ontology-design.md)、実行順は[実装計画](superpowers/plans/2026-10-28-country-government-ontology.md)。合成データだけで検証する。

現状はTask 8の最終受け入れを実行中。全体検証・独立レビュー・最新PR headのCIが終わるまで、実装完了とは扱わない。

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
| native backend全件・既定性能予算 | `cd backend && .venv/bin/python -m pytest tests -m 'not team_db and not network' -q` | レビュー前2953 passed / 1 skipped、391.02秒。修正後全件を実行中 |
| PG全件 Python 3.12 | internal-only Compose、`-m 'team_db and not network'` | 285 passed、213.46秒 |
| PG全件 Python 3.14 | 同上、別の専用project | 285 passed、212.50秒 |
| frontend全件・既定性能予算 | `npm --prefix frontend run test -- --maxWorkers=1` | 最終headは未実施 |
| TypeScript・build | `npm --prefix frontend run build` | レビュー修正後成功 |
| local government Chrome | `node .claude/skills/run-semantic-viewer/driver.mjs government` | 同名国・組織、固定IRI、stale、メニュー・履歴・Undo・日英・720pxを確認済み |
| signed HTTPS / PG government Chrome | 同driver `government-team` | 全P2回帰・全政府組織UI・再送・閲覧拒否・国を保持するUndoを確認済み |
| 既存smoke/P1/P2/P3 | 同driver、P2はgovernment-teamでも全実行 | smoke・P1・P2・P3成功（P1中央値251.98ms） |
| message contracts | `python scripts/generate_message_contracts.py --check` | 成功 |
| publication / notices | 既存NUL対象ファイル列挙と配布検査 | source scan成功、publication37件・notices7件成功。commit後再確認予定 |
| 独立レビューと修正後の再レビュー | 変更指摘がなくなるまで実施 | 初回7指摘を修正、98 backend / 222 frontend関連試験・build成功。再レビュー予定 |
| 最新head CI | PR #5のblocking gates | 未実施 |

## 試験inventoryと保存境界

[PostgreSQL対応表](p2-postgresql-test-inventory.md)と機械inventoryは、今回の追加時点で全3258 case、実DB285 case。旧2957 caseの対応先を維持する。行番号を含む生成試験IDは同一AST呼出しと出現順で対応付け、行番号の偶然の一致で別の生成元を対応付けない。

PostgreSQLは専用Compose projectのinternal network内だけで使用し、DB portをhostへ公開しない。実際のbackup/restore試験では、元writerを閉じ、新規maintenance接続・新しいdata directoryへ復元し、新規writer・sessionでRDFとprofileと国basisを検査した。復元時に既存sessionが再開しない既存PG archive試験も、全partitionの対象である。

localの既存Undoは開いている編集sessionの機能を再利用し、保存後のdomain履歴RDFを新しいservicesで確認する。teamはwriter再起動・backup/restore後の本人Undoも検証する。後続の本人操作を飛び越すUndoの拒否規則を弱めていない。

## 独立レビューの修正

初回レビューで挙がった7点を修正した。所属関係に説明がある組織を単一登録フォームから書き換えず、履歴編集へ誘導する。統合・分割・その他の制約をAPIとUIで一致させた。基準日の確定所属と編集用の過去参照を分離し、基準日の国解決状態と名称の確度をDTOへ追加した。表示言語はWorkspaceから全専用読取へ伝え、再認証だけでは保持中の国参照tokenを更新しない。国をまたぐ確定した包含は説明なしで拒否する。各指摘は修正前に失敗する回帰試験を追加し、修正後の関連試験で確認した。全件と再レビューは上表に追記する。
