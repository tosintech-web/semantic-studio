# P2の公開とmain宛てPR

## 現在の方針（2026-10-26）

P2は、公開済みのmain `c3c00a0` から分岐した `feat/p2-team-workspace` で開発する。
このブランチをGitHubへpushし、main宛ての日本語PRでレビュー・統合する。
mainの既存公開履歴を継承することを、新たな機密情報の公開とは扱わない。
mainそのものの履歴は書き換えない。

P2で追加する全コミットのファイルとmetadataを検査し、実運用の設定値・秘密・実データを含めない。
OAuth秘密・許可Workspaceドメイン・初期管理者sub等は運用環境から与える。
値の検査リストはリポジトリ外から渡し、ソースやログへ値を書かない。
元のMIT・著作権表示・第三者通知を保持する。

## 廃止した独立履歴

以前は、mainの旧履歴を継承しない `publish/p2-clean-history` を作り、P2完成内容をpushした。
通常PRに不要な独立履歴を作ったことで混乱を招いたため、ユーザーの指示でローカルとGitHubから削除した。
削除前に、レビュー・修正済みの全ファイルが `feat/p2-team-workspace` と完全に一致することを確認した。
実装・レビューの成果は実装ブランチに残っており、破棄していない。
代わりの公開用ブランチや比較基準ブランチは作らない。

開発途中の旧P2オブジェクトを保持するローカル専用backup refは公開しない。
`--all` / `--mirror` での一括pushは使用しない。

## 検査の境界

新たに送信する `main..feat/p2-team-workspace` の各コミットで、全blobとcommit metadataを検査する。
共有済みmainにある過去の記載の扱いと、P2で新たに機密情報を追加しないことは別の作業である。
今回のPRに、共有履歴の書き換えは含めない。

```sh
python scripts/check_publication.py --git-ref feat/p2-team-workspace \
  --private-values-file "$DEPLOYMENT_PRIVATE_VALUES_FILE"
```

この検査をP2追加コミットごとに行う。通常の秘密・実データ検査も併用し、
静的検査だけで未知の秘密を完全に検出できるとは主張しない。
現在の実装・検証・運用境界は [P2検証記録](p2-verification.md) を参照する。
