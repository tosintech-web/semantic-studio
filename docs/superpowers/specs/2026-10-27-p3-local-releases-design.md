# P3 公開版・外部参照：ローカルDocker開発設計

作成日：2026-10-27（日本時間）。状態：2026-10-27のユーザー指示で実装を承認。実装・手元の最終受け入れ・反復レビュー修正済み。[PR #4](https://github.com/tosintech-web/semantic-studio/pull/4)の最新head CIを最終gateとする。
ユーザーが指定した方針は「P1・P2実装済みを反映し、P3をローカルDockerで進め、本番配備を分ける」。
本書のAPI・権限配分・形式・上限は実装側が具体化した案であり、本設計と計画によるP3実装をユーザーが承認した。
上位契約：[全体仕様](2026-10-24-semantic-studio-customization-design.md)。
作業順：[P3実装計画](../plans/2026-10-27-p3-local-releases.md)。

## 1. 現在地と目的

P1はmain統合済み。日英UI、辞書表示言語、項目一覧・検索・既存編集を再利用する。
P2はGoogle Workspace認証・viewer/editor/admin、CAS、監査・再送・本人Undo、専用PostgreSQLと不変blobを実装済み。
PR #3はmain `e45e2a7`へmerge済み。最終head `fad9c12`の
[CI run 40416830078](https://github.com/tosintech-web/semantic-studio/actions/runs/40416830078)は全11 job成功を確認した。
現行の保存・network・復旧契約は[PostgreSQL設計](2026-10-27-p2-postgresql-design.md)を継承する。
本番Google login、実データ移行、本番配備は未実施であり、P3開発の前提にしない。

目的は、編集チームが確認した辞書の一版を、独立した利用側が固定して使えること。
「公開版」はレビュー採用済みの配布版であり、インターネットへの一般公開を意味しない。
組織JSON・タグExcel由来の実データは非公開のまま。P3受け入れは合成データだけで行う。

## 2. 採用方針と比較

| 案 | 特徴 | 判断 |
| --- | --- | --- |
| ローカルDocker、版付きファイル配布、独立した利用サンプル | 外部サーバー不要。版の固定・抽出・停止時の独立性を先に検証できる | 初期P3の推奨具体案 |
| ローカルDocker、検索APIから開始 | 実行時検索を実証できるが、API認証・索引・運用契約が増える | 必要性を実証後に追加 |
| 最初からクラウド配備 | 実サービス接続まで進めるが、認証実設定・DNS/TLS・費用が先行 | 本番配備の別工程 |

現在のGoogle認証・broker・Origin/CSRFを緩和せず、P2の合成署名/HTTPSテスト環境を再利用する。
試験用ログイン例外を製品へ追加しない。実Googleとの接続試験は任意の後続運用作業。
P3をlocalモードだけで通してteam版の公開操作検証の代わりにしない。

## 3. 境界・Docker構成

- 編集系：既存のteam app、専用PostgreSQL、private blob volume。DBの5432はhostへ公開しない。
- 配布系：新しい独立したread-only HTTPサービス。承認済みパッケージを取り込んだ専用volumeだけを読む。
- 利用側：版IDを指定してmanifest・JSON/Turtleを取得し、検索・詳細参照する最小サンプル。編集API・DBへ接続しない。
- 配布系と利用側は専用release_internal networkで接続する。内部参照originは同networkだけのalias `release-files` に固定する。
- Dockerでhost portを公開するため、両readerへrelease_host bridgeも追加する。host側portは127.0.0.1だけにbindし、DB networkへは参加しない。
  release_hostには外向き経路があるが、サーバーは読取専用で外部取得を持たず、consumerは固定内部origin以外へ通信しない。
- 配布サービスはprivate data、DB secret、Google secret、backupをmountしない。
- 一回限りのimport CLIだけが配布volumeへ書く。配布HTTPはGET/HEADのみ、アップロード・proxy・任意URL取得は持たない。
- 編集appから配布appへHTTP転送しない。既存brokerのprivate宛て拒否を維持する。
  管理者が認証済み編集APIから取得したpackageを、明示したローカルpath経由でimport CLIへ渡す。
- 稼働後に編集app/DBを停止・削除しても、配布済み版の参照と配布側の切り戻しは継続できる。
  試験の停止対象は専用Compose projectのみ。通常手順にvolume削除を入れない。

製品用Compose overlayと、合成認証・障害注入を行う試験専用runnerは分離する。
インターネット未接続でも動く受け入れを用意する。image/dependencyの初回取得は別途必要。

## 4. 公開グラフと公開プロファイル v1

初期対象はteam Projectの `model` 文書の受理済み正本だけ。
書式Save前でもDBへ確定済みの編集を使い、元Turtleの古いbytesから生成しない。
未送信のフォーム値は対象外。imports、shapes、snapshot、推論結果、Libraryは初期対象に含めず、その除外をプレビューに表示する。
P4/P5で追加する際は、明示的な対象・出典・許可規則を拡張する。

プロファイルはサーバー配布の `dictionary-v1` 一つ。任意述語指定をAPIで受け付けない。
許可する述語：`rdf:type`、`rdfs:label`、`rdfs:subClassOf`、`rdfs:subPropertyOf`、`rdfs:domain`、`rdfs:range`、
`skos:prefLabel`、`skos:altLabel`、`skos:hiddenLabel`、`skos:definition`、`skos:broader`、`skos:narrower`、`skos:related`、`skos:inScheme`、`skos:topConceptOf`、`skos:hasTopConcept`。
主語はURIのみ。IRI値・literal値はRDFの型、言語タグ、lexical formを保持し、空白ノードを含むstatementは除外する。
URI主語の集合は全許可statementから決める。関係先にしかないIRIはJSONで参照として保持し、定義済みentityへ昇格させない。
構造・空白ノードの除外数を表示し、黙って完全な再現と称しない。語彙対応は一つの定数で管理する。

`rdfs:comment`、組織独自の管理述語・元JSON、未知の述語、設定・履歴・ユーザーIDは出力しない。
ただし許可述語の値にも内部情報は入り得る。許可リストは内容の公開許諾・匿名化を保証せず、管理者が抽出結果全体をレビューする。
source/licenseは管理者入力の必須メタデータ。入力だけで再配布権を自動判定しない。
今回のサンプルは合成データ。実データの一般公開には別の明示的な範囲変更が必要。

## 5. レビュー・版作成・権限

1. editor/adminがプレビューを作る。公開グラフ、含む/除く件数、全出力のdownload、privateな元版basis、profile、入力metadataを提示する。
2. adminがプレビューの内容を確認して版を承認する。preview digestは抽出graph・profile・入力metadata・basisを含める。
3. 承認時に同じbasisから再計算しdigestを照合する。表示後の編集・metadata変更・profile変更は409とし再確認を求める。
4. 不変packageのblobを先に確定し、release resource・監査・再送結果を同じP2 transactionで確定する。
5. 管理者が承認済みpackageをdownloadし、配布CLIで明示import。編集側の「承認済み」と配布側の「現在参照中」は別の状態として表示する。

viewerは承認済みの一覧・downloadのみ。editorはプレビューまで。adminだけが版を承認する。
承認時・再送時ともtransaction内で現在session/roleを再検査する。降格・失効後の再送を拒否する。
一人のadminによるレビューを初期範囲とし、別人の二段階承認は追加しない。
通常の編集Undo/Redoは公開版を変更しない。版は削除・上書きしない。
承認操作はworkspaceの最新操作となるが、adminを含め編集Undoの対象にしない。承認直後のUndoは拒否し、承認以前の編集を飛び越してUndoする機能は追加しない。
Project削除後も承認済み版は保持し、一覧/downloadはrelease payloadのprojectIdで照合する。
新規preview/approveだけが現存Projectを要求する。削除後の一覧は保持した版を返し、未知IDは空一覧、未知releaseのdownloadは404とする。

API案（team専用。local版では404、既存local動作は維持）：

| API | 権限・入力・結果 |
| --- | --- |
| `POST /api/projects/{pid}/release-preview` | editor/admin、metadata。200でpreview digest、basis、件数、公開graphのプレビューpackage。辞書resource・release・業務監査不変 |
| `POST /api/projects/{pid}/releases` | admin、metadata + previewDigest、P2のversion/request-ID headers。201でrelease summary。再送は同一結果 |
| `GET /api/projects/{pid}/releases?offset=0&limit=50` | viewer以上、上限100、items/total/offset/limit |
| `GET /api/projects/{pid}/releases/{rid}/package` | viewer以上、承認済みのみ。添付download、no-store |

不正入力422、未認証401、権限不足403、不明project/release404、競合409、版header不足428、上限超過413、DB/blob障害503。
uiMessageの安定code/構造化引数とP1の日英カタログを維持する。
preview packageは承認済みpackageと同じグラフ・JSONをレビューできる形式だが、未承認の印を持つ。配布CLIは承認済みだけを受け付ける。
previewは計算操作として扱い、editor以上に限定する新しいpolicy operation `preview_release` を明示的に追加する。他のcompute権限を変えない。

## 6. 保存・配布形式・障害時の動作

編集側のprivate resourceは `release:{rid}`。payloadはversion 1、projectId、basis、previewDigest、profile、
approvedBy、approvedAt、packageBlob、packageBytes、packageSha256。公開manifestとは分ける。
metadataはsource/licenseの2つの非空文字列のみ（各8 KiB UTF-8以下、未知field拒否）。licenseはLICENSE.txtの内容としてそのまま使う。
basisはprivateなresourceVersions全体とmodel文書IDを含む。projectのIRIからrelease IDやactorを推測生成しない。
承認はworkspace markerも同時に更新し、既存と同じHTTP response envelopeを再送記録へ保存する。初回と応答喪失後の再送でstatus/header/bodyを一致させる。
release IDはserver生成UUID。workspace全体のCASに加え、同じrelease IDの再作成・更新・削除を拒否する。
新しいSQL tableは追加せず既存resources/audit/replayを使う。既存workspace差分のfile:/graph:/state:フィルターは広げない。通常編集のCandidate.capture対象外としてreleaseを維持し、承認専用dispatchでのみ作成する。
backup/restoreは新namespaceの厳密な型とblob参照を検査し、現在・監査内のrelease blobを保存する。
旧世代archiveは新namespace不在として復元可能。namespace追加を理由に既存schemaの自動変更を行わない。

公開packageはZIP、entryは次の5つに固定。privateなbasis・projectId・承認者subは含めない。

- `manifest.json`：formatVersion=1、releaseId、approved=true、createdAt、profileId/profileVersion、source、license、entityCount、statementCount、各dataファイルのbytes/SHA-256。
- `dictionary.ttl`：許可済みgraphだけ。serialize用cloneを使い正本を変更しない。
- `dictionary.json`：version 1、entitiesをIRI順。各entityはiriとstatements（predicate、object）。objectはkind=iri/literal、value、literalのlanguage/datatypeを明示する。IRI値を名前へ置換しない。
- `LICENSE.txt`：metadataのデータ利用条件。ソフトウェアMITをデータへ自動適用しない。
- `NOTICE.txt`：出典とprofile・配布形式の説明。秘密・ローカルpathを含めない。

出力は安定した順序・JSON encodingで作り、データhashは実際のファイルbytesに対して計算する。
同じリクエストの再送は新しいtimestamp/IDを作らず、確定済みblobを返す。
制限案：preview/approve body 64 KiB、抽出前model 100,000 statements、uncompressed package合計50 MiB、ZIP 50 MiB。
上限超過時は部分版を作らず拒否する。P4で件数とメモリを実測して見直す。

配布CLI：`import-package --package PATH`、`activate --release-id UUID`、`status`。
ZIPの許可圧縮方式はDEFLATE/STOREDのみ。importはsymlink・path traversal・重複/余分entry・宣言と実測のサイズ差・hash不一致を拒否し、展開合計50 MiBを読みながら強制する。
manifestのapprovedは暗号学的署名ではない。CLIへpackageを渡せるローカル運用者を信頼境界とする。一般公開APIからの受信は行わない。
一時directoryで全検証→fsync→不変版directoryの確定。既存IDへ異なるbytesを入れない。
activateは対象版を再検証し、`current.json`をatomic replace。旧版は保持する。importだけではcurrentを変えない。
配布操作のrelease ID・時刻・hash・prepared/completed/failedをprivateなローカルreceiptへ残す。未検証のID/hashはnullとし、raw pathやエラー原文を記録しない。
失敗receiptのoutcomeはunknownとし、処理失敗をpointer未反映と同一視しない。journal自体が書けない場合は失敗記録も不可能なため、操作を失敗として返しstatusとの照合を要求する。receipt記録不能なら切り替え前に拒否する。
切り替え後のreceipt更新で停止してもcurrentと不変manifestから結果を照合でき、成功を捏造しない。
途中停止・容量不足・破損では既存currentを維持する。切り戻しは既存版への明示activateで、app/DBなしでも動く。

配布HTTP：`/releases/{rid}/manifest.json`、`/releases/{rid}/dictionary.ttl`、`/releases/{rid}/dictionary.json`、
`/releases/{rid}/LICENSE.txt`、`/releases/{rid}/NOTICE.txt`と`/current.json`だけ。directory一覧なし。
不変URLはhash ETag、currentはno-store。HEADもGETと同じ対象・header規則。任意pathは404、書込methodは405。
各file hashは改ざんの自己修復には使わず、破損を検出したら利用側は新規採用を拒否する。

## 7. 画面・利用側サンプル

Project headerから「公開版」を開く。新規画面はプレビュー、除外理由、source/license入力、全出力確認、承認、既存版一覧、package downloadを扱う。
「一般公開した」と表示しない。「承認済み／配布は別操作」を明示する。配布先currentを編集appが推定しない。
全操作を日英化し、標準button/tableを使う。Tab/Enter、focus-visible、dialog focus復帰、読取・成功・拒否のpolite通知を確認する。
401/409/503でmetadata入力を保持。project/session変更後の旧応答を破棄し、言語変更では再承認しない。

利用サンプルはJS/HTMLと既存Python/FastAPIを使い、新runtime依存を追加しない。
server側が固定の配布originから取得し、browserのCORS緩和や編集appのネットワーク例外は不要。
CLAUDEの外向き通信規則は製品編集appへ維持する。独立した実証サンプルだけは固定originへの専用transportを使い、
redirect・環境proxy・任意URL入力を禁止し、timeoutとサイズを制限する。
総取得時間15秒を独立した待機期限で強制し、未完了のdaemon workerは最大1件。timeout後の結果は採用せず、worker残留中の次の取得は503とする。この適用範囲は実装時にCLAUDEへ明記する。
起動設定でrelease IDを必須指定する。current追従は明示操作だけ。manifestとdataのhash検証が済んだ一版を検索・詳細表示する。
検索はJSONの名称のNFKC/casefold相当の部分一致、同名IRIを別件表示。P1の検索機能全体を再実装しない。
新しい版の取得失敗では採用済み版を維持し、初回失敗ではエラーとする。メモリcacheを永続配布の代わりにしない。

## 8. 受け入れ条件

1. 合成Google署名・HTTPS・viewer/editor/adminでpreview/approve/download権限を実APIとbrowserから検証する。viewerのpreviewを拒否する。
2. 許可/未知述語、raw JSON、内部comment、空白ノード、imports/snapshots/shapes/inferenceを含むfixtureで、ZIP全entryと利用結果に漏れがない。
3. Save前の確定編集は入る。未送信入力は入らない。プレビュー後の変更は409。通常編集は承認済み版のhashを変えない。
4. COMMIT応答喪失、再送、同時承認、降格、DB/blob障害で二重版・監査欠落・未承認downloadを生まない。
5. release作成後の通常編集・Undo/Redo・Project削除・backup/別DB restoreで版・blob・監査・再送を保持する。承認そのもののUndoは全roleで拒否する。
6. ZIP/hash/サイズ/path異常とimport/activate中の障害で旧currentを保つ。v1→v2→v1切り戻し、配布再起動後の保持を確認する。
7. 編集appとDBを停止した状態で、利用側を新規起動し指定版の検索・参照が成功する。旧processのcacheだけで成功としない。
8. DB port非公開、network分離、配布containerのmount/image/応答にprivate data・secretがないことを実物で検査する。
9. UIの日本語/英語、AX・keyboard、遅延応答・入力保持を実Chromeで確認する。
10. CLAUDEの全既存試験partition・性能予算・CI gateを維持し、新規試験を同じ分類へ追加する。

## 9. 範囲外と後続

外部サーバー構築、クラウド契約、DNS/本番TLS、実Google設定、実データ移行、インターネット配信、機械認証、
汎用検索API、二人承認、WordNet全件、専用取り込みは本P3へ混ぜない。
P4は現行rdflib読み込み・索引・候補生成の全件コストをまず計測する。PostgreSQL化だけを性能達成とみなさない。
P5はその時点のExcel/JSON形式を再確認する。P3のprofileに合わせて元データを破壊的に変換しない。

## 10. 期間・費用の扱い

P3暫定工数6〜10人日（設計・実装・レビュー・試験込み）は前回の参考値を維持し、最初のtransaction/配布実証後に再見積もりする。
外部サーバー構築・P2本番配備は依存から外す。外部待ちを除き約1〜2作業週の目安で、AIの経過時間保証ではない。
ローカルDockerのため追加クラウド費用は不要。既存機材の容量・電力、AI利用料は別。AI料金は契約・実測なしに金額を固定しない。
P4/P5は前回の暫定7〜12/5〜10人日。P3〜P5で18〜32人日、予備25%込み23〜40人日。
P2本番確認2〜3人日は別工程へ移し、ローカルP3開始を待たせない。実装後の実績で更新する。

## 11. 文書の更新対象と判断の状態

全体仕様、P2設計冒頭と検証の最終状態を更新し、履歴の実測値・失敗記録は保存する。
新設計と計画の文書更新後、ユーザーが製品実装・反復レビュー・PRへのpushを指示した。公開データの一般公開・本番配備・mainへのmergeは行わない。
ローカルDockerという方針はユーザー指定。初期profile、admin承認、package手渡し、API案・上限・UIは実装側の具体案。
実装前レビューとユーザーの実装指示を受けて具体化した。後続の変更時も本書と計画を一緒に更新する。

### 実Docker確認による接続方針の補足

internal-only containerはHostConfig.PortBindingsがあってもNetworkSettings.Portsがnullとなり、hostのlocalhost公開portへ到達しなかった。
コンテナ内部の検索は200だったため、データ・認証ではなくingressの問題と特定した。
専用の実Docker到達試験でREDを確認し、上記のhost ingress bridgeを追加する。DB/secret/private mountの境界と内部参照aliasを維持する。
consumerのscript名app.pyが製品package appをshadowする問題は、Pythonのsafe-path指定 `python -P` と `PYTHONPATH=/app` で解消する。
