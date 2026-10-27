# P3 実装・検証記録

2026-10-27（日本時間）。対象branch：`feat/p3-local-releases`、起点main `e45e2a7`。
実装・手元の全体検証・反復レビューと修正を実施済み。PR作成と最新head CIを次の完了gateとして確認する。
設計：[P3ローカル公開版](superpowers/specs/2026-10-27-p3-local-releases-design.md)。

## 検証境界

合成データ・合成Google署名・HTTPS・独立cookie・専用PostgreSQLを使用する。
DB portはhostへ公開しない。配布/consumerはDBから独立したrelease_internalとlocalhost ingress用release_hostを使用。consumerの固定originは内部専用alias release-files。
実Google設定、実データ移行、インターネット公開、本番配備は行わない。

## 実行記録

| 検証 | 確認した結果 |
| --- | --- |
| 既存frontend基準状態 | 135 files / 2553 passed、112.18秒 |
| 最初のnative backend全体 | 2827 passed / 1 optional skip / inventory 1 failed。新規case追加後の台帳未更新による失敗。閾値・caseを削除せずinventoryを更新し、下記の最終全体で成功 |
| 初回全DB Python3.12 | 271 passed、203.14秒。既存259 + P3実DB12 case |
| レビュー修正後package/consumer/distribution | 26 passed、0.60秒。未承認/不正ZIP、絶対IRI、型・lexical、総deadline、1worker上限、サイズ境界、root fsyncを含む |
| Session再認証/翻訳台帳 | ReleasePanel 5 + inventory 3 case成功。metadata保持、旧preview無効化と処理中状態解除 |
| TypeScript/Vite | 成功。既存のchunk-size警告は保持 |
| 実image build | third-party notices検証を含め成功。image `7d699d2902998ee9907025eb1834bf9557d36e5ce3eb345282ac813a4b2529b8` のbackend全114 fileがsourceとbyte一致 |
| 実Chrome初回P3 | 継承P2の全操作成功。P3 previewのwait selectorの引用符誤りで失敗。試験driverを修正し、下記の最終通し試験で成功 |
| native最終全体（全非DB・全性能予算、倍率1） | 2846 passed、1 optional-lxml skipped、273 deselected（DB271 + network2）、385.88秒 |
| Python3.14 最終全DB | 271 passed、171.65秒。DB port非公開の専用内部network。後述の容量不足を受け、試験DBだけ/tmp bind、runner /tmpだけtmpfsへ移して再実行 |
| 全case inventory | 3120 case、DB271。旧2957 case対応を保持。2846成功 + optional skip1 + DB271 + network除外2で全件対応 |
| frontend全体 | 136 files / 2558 passed、114.33秒。折り返し修正後のReleasePanel/API/styles関連66件も成功 |
| TypeScript/Vite 最終 | 成功、4.40秒。既存chunk-size警告は保持 |
| local smoke / P1実Chrome | 両方の全step成功。P1 response-to-click中央値254.49ms、通常基準500ms |
| P2を継承するP3実Chrome + Docker | 全step成功。3権限、日英、native Tab/focus・AX、折り返し、UI承認、stale拒否、版の不変、download/import、編集app/DB停止後に新規consumerから取得、切り戻し、参照画面を確認 |
| 実Docker host ingress | 旧internal-only構成でhost到達失敗を再現。専用bridge追加後、定義と実到達の2試験成功 |
| 補助script | 54 tests、48 passed / 6 Docker opt-in skipped、13.960秒。P3実Docker ingressの2試験は別途成功。既存P2のDocker統合はCIの必須Compose/browser jobでも実行 |
| 最新head CI | PRのchecksを正本とする。手元の成功や過去headを代用しない |

## レビューと修正

独立したコードレビュー第1回で6件を指摘された。すべて再現試験を追加して修正した。

- 認証epoch更新でpreview/承認のbusyと古いreviewが残る：metadataだけを保持し、owner別request世代と読込世代を更新する。
- 遅いHTTP受信が総deadlineを超える：read1/残時間timeoutに加え、transport全体を単一daemon workerと独立待機deadlineで囲む。未完了workerが残る間は追加workerを拒否する。
- 破損deflateの例外が漏れる：有限ReleaseErrorへ変換。再レビューを受け、サポート方式もDEFLATE/STOREDへ限定しLZMA/BZIP2を拒否する。
- 相対IRIでJSON/Turtleの意味が異なる：主語・IRI object・literal datatypeを絶対IRIとして検証する。
- consumerのZIP再構築で正当なサイズ境界を拒否：公開ファイルを共通validatorで直接検証する。
- 初回importの親directoryのdurability不足：receiptとgeneration確定後にrootもfsyncする。

第2回では元6件中4件の解消、残るtimeout（header/framing）とZIP（別圧縮codec）の不足を確認。
上記の全transport deadlineと圧縮方式限定で追加修正し、第3回で元6件に残る指摘なし。
別のfresh contextによる全差分レビューでは、dialogのnowrap継承とreceiptの完了/失敗記録不足の2件を追加。
再現試験と実Chromeのlayout検査を追加して修正し、再レビューで具体的な未解消指摘なし。
実Dockerで検出したconsumerのpackage shadowとinternal-only port到達も修正し、追加差分レビューで未解消指摘なし。
修正しないと判断した指摘・minorの先送りはない。
レビューは静的確認と再現であり、本番の侵入試験・hosted scan成功を主張しない。

## 完了追記

最終PR/CIの結果はPR本文とchecksで管理し、最新headの必須gateと参考budgetsを確認するまで公開工程の完了としない。
実装をmainへmergeする作業は行わない。

## 容量不足と試験環境の補足

途中でhost filesystemが満杯となり、Python3.14のDB試験は122 passed/149 errors、その後の再試行は265 passed/1 failed/5 errorsとなった。
PostgreSQLの `could not write init file: No space left on device` を確認した。これらを成功扱いにはしない。
今回作成した旧image・特定IDの未共有build cache・終了済みの専用browser volumeだけを整理した。一般のimage/volume pruneは行っていない。
専用試験DBを `/tmp/semantic-studio-p3-pg-data` のbindへ、runnerの一時領域をtmpfsへ移すローカル専用overrideで最終全DBを成功させた。
製品ComposeのDB保存方式、port非公開、権限、network、テスト集合、閾値は変えていない。CIでは標準の専用Compose volumeを使う。

## 実装上の判断

- own-modelの正本は既存typed graph resourceから直接読む。全ProjectをCandidateとしてmaterializeする必要はなく、旧Saveへの依存と余分な解析を避ける。
- consumerはZIPを再構築せず共通の公開file validatorを使う。総時間制限の後に残るworkerは最大1件とし、残留中の再試行を503で拒否する。
- Dockerのhost ingressは内部参照networkと別にする。外向き経路の存在を設計に明記し、固定内部alias・DB/secret/private mount非参加・localhost公開で境界を保つ。
- UIはProjectHeaderに入口とdialogを置く。App.tsxへの追加状態は不要だった。
- 外部のarchitecture.md/decisions.mdはこのcheckoutにないため、変更したAPI・上限・信頼境界はP3設計・運用書・known-stateへ記録した。

