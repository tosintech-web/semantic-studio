# 配布物のライセンス通知

本体の元MIT全文とImran Khan氏の表示を保持しています。辞書データや依存物の
条件はそれぞれ適用され、本体MITへ置き換わりません。

## Docker

- `/app/LICENSE`：本体の元MIT全文。
- `/app/THIRD_PARTY_NOTICES.md` と `/app/licenses/`：出典台帳と原文。
  ソース内の `backend/app/` は、イメージでは `/app/app/` に対応します。
- `/app/app/vocab/NOTICE.md`、同 `manifest.json`、`/app/app/examples/manifest.json`：同梱語彙・例の通知と固定版。
- `/app/notices/python/runtime-components.json` と同 `texts/`：実際に解決されたPythonアプリ依存の版と原文。
  ビルド時にソース台帳と版・原文バイトを照合し、不一致はビルドを失敗させます。
  ベースイメージのpip等のインストールツールとOSは、このアプリ依存台帳の対象外です。
  それらに元から付属する通知は削除しません。
- `/app/static/THIRD_PARTY_NOTICES.md`、同 `runtime-components.json`、同 `licenses/texts/`：フロント実配布物の通知。

## フロントビルド

`frontend/dist/` の `LICENSE`、`THIRD_PARTY_NOTICES.md`、`runtime-components.json`、
`licenses/texts/` をJS/CSS等と一緒に配布します。About画面から同梱通知を開けます。
台帳はRollupが実際の出力チャンクへ入れたモジュールから作成します。
Viteのプリロード／CommonJS補助コードも、その原文通知を同梱します。
未確認の依存物や台帳にない版を含める場合、ビルドが失敗します。
開発用stackbackを配布したという前提で主ライセンスを補作しません。

## 文書ZIP

ZIPの `LICENSE` は生成したHTML・グラフビューワー・CSSの元MITです。
`NOTICE.md` は辞書データの権利を区別します。`index.html` から両方に到達できます。
表示から個体を除いても、`source/original.*` は原本の全内容を保持します。
内部原本のバックアップを、公開データを除去済みの成果物として配布しないでください。
文書サイト本文は現行どおり英語です。P1で翻訳する対象はアプリ内の画面・操作説明です。

## 国・政府組織のテンプレートと拡張語彙

`backend/app/domain_vocab/government-v1.ttl` と、`backend/app/templates/`の
`countries*`・`government-organizations*`は、このリポジトリで作成したMITの
拡張語彙・空の入力テンプレートです。実在国・実在組織のデータセットを含みません。
公開検査の`publication-policy.json`へ個別の出典・ライセンス・原文ハッシュを登録しています。

標準ORG/SKOSは従来の固定版をそのまま使用し、原文・ハッシュ・通知を変更していません。
専用画面のために標準語彙を複製・改変したファイルを配布せず、新しいruntime依存も追加していません。
