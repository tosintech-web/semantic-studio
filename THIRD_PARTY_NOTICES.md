# 第三者通知 / Third-party notices

Semantic Studio本体のMITは、同梱データと依存物のライセンスを置き換えません。
元作者はImran Khan氏、上流は https://github.com/imrankhan1984/semantic-studio です。
本体の全文・免責は [LICENSE](LICENSE) を保持しています。

## 同梱データ

| 対象・版 | 出典・帰属 | 条件・通知 | 確認状態・改変 |
| --- | --- | --- | --- |
| 標準語彙11件、2026-09-27取得 | W3C、DCMI、Dan Brickley/Libby Miller、BFO authors。個別URLと著作権は下記NOTICE | [個別通知](backend/app/vocab/NOTICE.md)、[版・SHA-256](backend/app/vocab/manifest.json) | 原本の条件表示と固定ハッシュを確認、原本未改変 |
| SKOS / PROV-O / SHACL / vCard | W3C、個別URLは上記NOTICE | [W3C Document License 2023](licenses/W3C-Document-2023.html) | 原本の通知を保持。UI翻訳は語彙原本を書き換えない |
| DCMI Terms/Elements、DCAT3、OWL-Time、BFO2020 | 個別ファイル・NOTICEの権利者表示 | [CC BY 4.0全文](licenses/CC-BY-4.0.txt) | 上記NOTICEと原本の条件表示を維持 |
| FOAF | Dan Brickley and Libby Miller | [CC BY 1.0全文](licenses/CC-BY-1.0.txt) | 原本未改変 |
| ORG | W3C | [PDDL 1.0全文](licenses/PDDL-1.0.txt) | 原本未改変 |
| backend/app/examples/space-exploration.ttl / middle-earth.ttl | 上流Semantic Studioの独自記述。ファイルの帰属とメタデータを保持 | CC BY 4.0、[例の版・SHA-256](backend/app/examples/manifest.json) | 原本未改変。第三者の推薦・商標等の権利を主張しない |
| examples/space-exploration.ttl、backend/app/templates/*.ttl | 上流Semantic Studio | 本体MITを保持 | 原本未改変 |
| backend/tests/synthetic_dictionary.pyの生成内容 | 本改変版で独立生成。example.org配下の試験用架空データ | 本体MIT。ORG/SKOSのIRIは出典を識別する参照 | 元Excel/JSON・変換物・外部文章を使用しない |
| 日本語WordNet | https://bond-lab.github.io/wnja/、Princeton WordNet | 両者の条件が必要。既存サンプルを追加する際は原ライセンス全文と出典を同梱 | このブランチの追跡対象にはWordNetデータを含めていない。自動で公開許可しない |

データセットの固定内容は [publication-policy.json](publication-policy.json) で追跡します。
非公開のタグExcel・組織JSON・変換結果は公開許可表へ登録しません。

ライセンス本文の取得元：W3Cは公式ページ、CC/PDDLは公式ページで条件を確認し、
[SPDX License List](https://github.com/spdx/license-list-data/tree/main/text) の対応本文を保存。
これらの条件をMITへ改変していません。

## 依存ライブラリ

[依存物一覧](licenses/dependency-inventory.json) に、実際の準備環境で解決したPythonの
直接・推移依存とnpm lockfileの各版を記録し、取得できた原文/NOTICEを
[licenses/texts](licenses/texts/) にSHA-256で対応付けています。原文は改変せず保存しています。
開発専用依存も追跡のため含みます。`not-installed-on-this-platform`は他OS向けの任意依存で、
今回の環境では未配布です。`project-text-collected`は同じ版の上流プロジェクト本文を
親パッケージから取得したことを示します。
`upstream-text-collected`は、npm公開版の`gitHead`に対応する上流コミットから
原文を取得したことを示します。saxes 6.0.0のISC原文と同梱の上流通知は、この方法で
取得した原文を改変せず保存し、版・ソースコミット・SHA-256を台帳に記録しています。

これは依存更新後やDocker内の再解決を自動承認する台帳ではありません。
配布時にはその実物の版・同梱物と照合し、必要な原文/NOTICEを同梱します。
本Gitソースはnpm/Pythonのライブラリ本体やnode_modules/.venvを配布しません。

未確認事項：開発専用のstackback 0.0.2は、インストール済み配布物と移転先の上流
リポジトリから主ライセンス全文を回収できていません。V8部分のBSD通知は別に保存しました。
依存本体を同梱する配布は、その確認・通知の取得、または同梱しないことの確認を必要とします。
`unconfirmed`をMIT確認済みと読み替えません。

改変部分の追加の権利者表示は確認中です。運用ドメインから社名を推測していません。
上流のLICENSE全文と元作者表示は維持します。

## P1の実配布物

フロントビルドの台帳は、実際の出力モジュールに基づきます。26個のライブラリと、
Viteが挿入するプリロード／CommonJS補助コードについて原文通知を同梱します。
ViteのLICENSEには同梱CommonJSプラグインの通知も含まれ、その原文全体を保持します。
開発用stackbackが出力モジュールに含まれないことを、実ビルドで確認します。
Pythonは実際にインストールされたアプリ依存の版・原文を台帳と照合し、
Docker用の解決版を `backend/constraints-distribution.txt` で固定します。
実物のファイル位置と検査範囲は [配布物別の通知](docs/distribution-notices.md)を参照してください。
html5rdf 1.2.1とet_xmlfile 2.0.0の著者一覧も、実際の配布物から原文のまま収集しています。
