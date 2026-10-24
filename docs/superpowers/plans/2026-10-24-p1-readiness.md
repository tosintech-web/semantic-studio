# P1 実装準備・独立レビュー記録

作成日：2026-10-24。対象ブランチ：`feat/p1-dictionary-workspace`。
基準コミット：`dbb3576`（カスタマイズ計画のPR #1マージ）。
実装対象は [P1実装計画](2026-10-24-p1-dictionary-workspace.md)。
この準備作業ではアプリの実装を開始しない。

## 独立レビュー

計画作成担当とは別のレビュー担当が、仕様・計画・現行コードを照合した。
importsを同じ設定で再解決した場合、Projectのrevisionとimportsのbooleanが変わらず、
新しい索引ができてもフロントの検索・一覧が再取得されない可能性を指摘した。

Task 7/8に独立した`viewGeneration`を追加し、既存`importsVersion`とsnapshot更新通知を
反映する契約にした。検索・一覧・詳細の再取得、旧応答の破棄、同flag・revision不変の
再解決を試す回帰テストも追記した。レビュー担当は修正を再確認し、
追加の重大指摘なし・P1着手可能と判定した。

## ローカル作業環境

- Python 3.14.4、`backend/.venv`へ既存`requirements-dev.txt`を導入。
- フロントは既存lockfileのまま`npm ci`で導入。依存宣言・lockfileは変更しない。
- システムNode 24.13.1はlockfileのjsdom 30の要求範囲外のため、
  Node 24.15.0を`/tmp/semantic-studio-p1-node`へ導入した。
  フロントのコマンドは次のPATHを付けて実行する。

```bash
PATH=/tmp/semantic-studio-p1-node/node_modules/.bin:$PATH npm --prefix frontend run test
PATH=/tmp/semantic-studio-p1-node/node_modules/.bin:$PATH npm --prefix frontend run build
```

`/tmp`内のNodeは一時環境のため、削除後は同等の対応版Nodeを再導入する。
`.venv`・`node_modules`・`dist`・`test_data`がGitの無視対象であることを確認した。
既存の利用者の`.gitignore`変更と実データはコミット対象に含めない。
テストはconftestによる一時data directoryを使用する。

## 検証と引き継ぎ

フロントの型検査・production buildは成功。
全体テストの初回はExploreStartの20ms予算に対し29.77msで1件失敗（1,762件合格）。
該当ファイルの単独実行は14件合格し、`npm run test -- --maxWorkers=2`で
全88ファイル・1,763件合格を確認した。予算値・BUDGET_FACTORは変更していない。
バックエンド全体は1,484件合格、4件失敗、1件skip、外部ネットワーク2件除外。
失敗はすべて既存の時間予算テストであり、次の値だった（BUDGET_FACTOR=1）。

| 対象 | 測定値 | 予算 |
| --- | --- | --- |
| union属性のcanvas表示 | 177.86ms | 150ms |
| 10万statementのキャッシュ済みquery-schema | 5.73ms | 5ms |
| 6,000推論結果の分類・説明 | 378.10ms | 300ms |
| snapshot 2件を持つProjectのopen | 1,316.38ms | 1,000ms |

機能検証の失敗はなく、依存の整合性は`pip check`で確認した。
ただし今回の環境で既存性能基準をすべて達成したとは扱わない。
失敗4件だけの単独再実行でも4件とも時間予算を超過した。
この測定だけでは負荷・環境・依存版・既存実装のどれが原因かは断定しない。
比較基準として記録し、P1着手時の最初の確認項目にする。
無関係な性能改修や予算の緩和を、準備作業へ混ぜない。

準備判定：開発ブランチ・環境・独立レビュー済み計画は整備済み。
計画上の着手を妨げる重大指摘は解消した。上記の既存性能未達は残課題として明示し、
全検証合格、P1完成、配布可能という判定は行わない。
今回はGitHubへのpush/PR作成・デプロイ・アプリ変更を実施しない。
最初の実装タスクはTask 1の公開対象検査・合成辞書・帰属整備。
本番資格情報、非公開のExcel/JSONおよび変換物を試験fixtureへ転用しない。
専用インポーターとGoogle認証は後続段階の対象とする。

`npm ci`の監査出力には既存依存の6件（moderate 2 / high 4）がある。
本準備で依存の自動更新は行わず、Task 1の依存台帳確認時に内訳と対処を確認し、
配布前の判断へ引き継ぐ。この記録は脆弱性の到達可能性を判定したものではない。
