# 国・政府組織グループと入力テンプレート：開発方針・設計案

作成日：2026-10-28（日本時間）。状態：2026-10-28のユーザー指示により本設計・計画の実装を承認。実装中。
ユーザーが承認した開発目標は、国と組織を別グループで管理し、連携する入力テンプレートをシステムメニューに追加すること。
保存形式・API・画面配置・制約は本設計の契約とする。実装承認は機能の実装済みを意味しない。
実装後は独立レビューと修正を指摘がなくなるまで繰り返し、GitHubへpushしてPRコメントへ結果を記録する。[実装計画](../plans/2026-10-28-country-government-ontology.md)。

## 1. 目的と現在地

各国の省庁、政府機関、局・部・課を登録し、組織間・部署間のつながり、統合・分割・移管・改称を記録する。
人の所属、役職、ポスト管理は初期対象外。国情報は別グループを正本とし、政府組織から固定IRIで参照する。
国名や組織名は識別子ではない。同名・多言語・改称・廃止後の名称再利用を扱う。

基点はP3のPR #4が統合された `origin/main`（`0251e89`）。既存実装の再利用先：

- `backend/app/projects.py`：project.json、model.ttl、shapes.ttl、テンプレート、複製・export。
- `backend/app/vocab/manifest.json`：ORGとSKOSは同梱済み。取得URLや原本bytes/hashを変更しない。
- `backend/app/examples.py` / `shapes_form.py`：汎用個体フォーム。OWLのdomain/typeを中心に項目を生成し、期間付きの関係の専用編集は持たない。
- `frontend/src/components/HomeScreen.tsx` / `NewProjectDialog.tsx` / `ProjectHeader.tsx`：入口・作成・プロジェクト内の操作。
- `backend/app/editing.py`：既存command、Undo、Turtle適用、保存。新規の書込みもこの境界を通す。
- `backend/app/team/`：P2の認証、PostgreSQL正本、CAS、監査、再送、detached candidate、backup。
- `backend/app/rml.py`：取り込みは一つのTriplesMap、2,000行上限。複数表の一括取り込みや更新照合は未実装。
- `backend/app/releases/profile.py`：dictionary-v1にORGや本設計の履歴述語は含まれない。

既存データを自動変換しない。普通のontology/taxonomyプロジェクトはそのまま使える。

## 2. 比較した方針と推奨案

| 案 | 利点 | コスト・制約 |
| --- | --- | --- |
| A：既存プロジェクトを役割別グループとして使う（推奨） | 保存・認証・Undoを再利用。国グループと政府組織グループの所有境界が明確 | プロジェクト間の明示参照と期間付き編集を追加する |
| B：複数プロジェクトを束ねる新しいグループ基盤 | 任意の横断管理へ拡張しやすい | 所有・権限・削除・移行を再設計する必要がある |
| C：Turtleテンプレートのみを配布 | 小さい変更で試せる | 別グループの候補検索、関係・改編の一括入力を解決しない |

比較の上でAを採用する。2026-10-28の実装指示により、本設計と計画を実行する。
ここでグループとは、`kind=ontology` のプロジェクト一つ。国グループは複数国を収容し、
政府組織グループは一国または複数国を収容できる。国ごとのプロジェクト作成は強制しない。

初期開発はG1（国・組織と連携）、G2（関係と履歴）、G3（メニューからの統合受け入れ）に分割する。
G1だけで履歴入力まで完成したとは表示しない。詳細Excel一括入力、国家継承の専用UI、公開配布の拡張は後続。

## 3. グループの識別・互換性

project.jsonに任意の `domainProfile` を追加する。

```json
{"domainProfile":{"id":"government-organizations-v1","version":1,
  "countryProjectId":"prj-012345abcdef"}}
```

国グループは `id=countries-v1`、`version=1`、countryProjectIdなし。
この設定は編集用メタデータで、RDFの意味はmodel.ttlで保持する。国参照元の選択は一つ。
作成時テンプレートIDは `countries` / `government-organizations`。両方とも既存のontology kind。
未知のprofile/versionは汎用エディターで開き、専用フォームを無効化して理由を示す。
既存プロジェクトへprofileを自動付与しない。専用プロジェクトのkind変更は明示解除を求め、黙ってprofileを捨てない。

複製は個体IRIを保持する「別の編集コピー」。参照元project IDの自動置換はしない。
国グループを複製しても既存組織の参照先を切り替えない。別の正本として運用する場合はIRI移行が別途必要。
復元で参照元project IDが存在しないときは未接続として保持し、利用者が明示的に再接続する。

## 4. RDFプロファイル v1

ORGが定義しない国・期間付き関係・改編の入力上の区分は拡張語彙で表す。
初期拡張名前空間は固定の `urn:semantic-studio:government:v1#`（以下 `gov:`）。
これは提案するアプリ内語彙であり、W3C標準でも公開済みHTTP語彙でもない。
語彙定義は新規 `backend/app/domain_vocab/government-v1.ttl` に一つだけ置く。
インスタンスIRIは各プロジェクトのbase IRI＋UUIDとし、名称・国コード・project IDから再生成しない。

| 種別 | RDF・項目 | 初期フォームの規則 |
| --- | --- | --- |
| 国 | `gov:Country`、`skos:prefLabel` / `altLabel`、`gov:countryCode` | 名称を最低一つ。原語・表示言語を区別。コードは任意、文字列。ISO認証とは表示しない |
| 組織 | `org:Organization` / `FormalOrganization` / `OrganizationalUnit`、SKOS名称、`org:identifier` | 名称・国への関係が必須。FormalOrganizationを政府機関一律の既定にしない |
| 組織の存在期間 | `gov:ExistenceRecord`、`gov:entity`、期間、出典 | 組織ごと一つのnamed record。境界不明も明示できる |
| 名称履歴 | `gov:NameRecord`、`gov:entity`、`gov:nameValue`、期間 | 改称前の名称と期間を保持。言語タグを保持 |
| 関係記録 | `gov:RelationRecord`、`gov:subject` / `predicate` / `object`、期間 | named node。開始終了の既知・未知を保存 |
| 改編 | `org:ChangeEvent`、`gov:changeKind`、`org:originalOrganization` / `resultingOrganization` | named node、施行日、説明、出典、同一性判断 |

期間の述語は `gov:validFrom` / `gov:validUntil`（xsd:date）。開始を含み終了を含まない `[from, until)`。
欠落は「不明」であり、過去・未来へ無期限と同義にしない。明示的な無境界は
`gov:openStart true` / `gov:openEnd true`。境界ごとにdateとopen flagを同時指定できない。
日が分からない年だけの資料を1月1日へ補完しない。説明に原文を残し、その境界は不明として登録できる。
日が分かる両端では from < until。初期フォームは日付単位で、日時の時間帯問題を持ち込まない。

出典には `dct:source`、説明には `dct:description` を使用する。関係と改編の出典を必須にし、
出典はIRIまたは書誌文字列。URLを入力しても取得しない。公開リンク表示は既存のlinkTargetを通す。
「必須」「単一」などはアプリのprofile/SHACL規則であり、ORG全体の必須条件とは説明しない。

### 関係の区別

`gov:predicate` の初期許可値は以下の5種類。自由な述語入力は汎用Turtleで行う。

- `gov:inCountry`：組織→国。「登録上の所属国」。所在地や法的管轄、領有権承認を意味しない。
- `org:unitOf`：内部部局→組織。
- `org:subOrganizationOf`：組織→包含する上位組織。
- `gov:supervisedBy`：組織→監督する組織。包含とは別。
- `gov:cooperatesWith`：組織間の連携。逆向き検索も同じ関係として表示するが、RDFを二重保存しない。

初期v1では組織の所属国は各確定時点で一つ。親からの暗黙継承はせず各組織に明示する。
国をまたぐ連携・監督は可能。包含関係の国不一致は警告し、資料に基づく例外を説明付きで記録可能。
国際共同機関の複数国所属は初期v1の専用フォーム対象外と明記する。
国以外の関係端点は初期v1では同じ政府組織グループ内の組織に限定する。
国をまたぐ監督・連携を入力する場合、その複数国の組織を同じグループで管理する。
別の政府組織グループへの横断参照・検索・CASは後続とし、国グループ連携とは別の機能として扱う。
包含の自己参照・同じ時点の循環、同種同端点の重複期間、所属国の確定期間の重なりは拒否する。
日付不明のため判定できない重なりは警告し、確定済みと表示しない。
複数の上位組織を一般的なORG違反とは扱わない。

### 履歴と基準日

正本はRelationRecord。過去の `org:unitOf` を無条件の直接statementとして蓄積しない。
指定日の関係は、独立した読取用graphにORGの直接関係として投影する。参照国も同様。
読取時の投影は保存・Undo・推論の元graphを書き換えない。
基準日を含むと確定できる記録だけを「確定した関係」に含め、不明境界で判定不能な記録は別一覧に示す。
期間の穴は穴として表示する。基準日の既定値はUIが明示する今日で、APIはISO日付を必須とする。
基準日なしの汎用Explore/Query/SHACLには履歴記録の正本が見える。
専用画面の基準日表示、検証、投影Turtle downloadは別操作とし、両者を混同させない。
基準日投影には基準日と元revisionを添付し、「全履歴export」と区別する。

### 改編と同一性

- 統合：前身2以上、後身1以上。分割：前身1以上、後身2以上。前後集合が完全に同じなら拒否する。
  新設統合は新しい後身IRI、吸収統合は存続する前身IRIを後身にも指定できる。分割も存続組織のIRI保持を許す。
  新設・存続をpreviewで明示し、後身IRIを名前だけで既存組織へ統合しない。
- 改称：同じIRIを保持し、前後に同じ組織を指定可能。NameRecordを追加し、現行名称の変更は利用者が明示する。
- 移管：同じ組織IRIを保持。旧関係の終了と新関係の開始を施行日でまとめて変更する。
- その他：前身・後身を各1以上とし説明を必須。同一性を決められない場合は登録を保留できる。

改編の前身後身だけから廃止・新設や全関係の終了を推測しない。変更する関係・名称をpreviewで列挙し、
一回のcommandで一括確定、Undoも一回。未来の改称で現在のラベルを自動上書きしない。
存在期間の変更も同じpreviewへ含める。吸収される組織の終了は明示変更し、存続側の存在期間は維持する。
名称履歴を使う基準日画面は、その日の確定名称を優先し、不明なら通常ラベルに「名称の時点未確認」を添える。
組織自体の存在期間も同じPeriodで明示入力する。改編だけから新設日・廃止日を補完しない。
基準日一覧は存在状態をactive/inactive/uncertainで返し、存続確認済み・存在時期不明・期間外を区別する。
既定表示はactiveとuncertain。期間外も明示操作で表示でき、通常の汎用一覧からは消さない。
期間外の組織へ結ぶactiveな関係は矛盾として表示し、基準日投影から除外する。
存在時期不明の組織の関係は関係自体の期間で判定し、存在確認済みとは表示しない。
投影Turtleの各組織にも `gov:existenceState` の文字列注記を付け、未知の存在期間を推測補完しない。

## 5. 別グループ参照

countryProjectIdは同じローカルライブラリ／team workspaceにあるcountries-v1プロジェクトだけを選択できる。
参照はネットワーク取得や `owl:imports` で別プロジェクトを丸ごと取り込む操作ではない。
国候補は参照元の受理済みmodel正本から読む。国の表示名は読取時の言語で選び、保存値はIRI。
検索は名称・別名・国コード・IRI。表示上限50、最大100、真の総数と次ページを返し、先頭200件だけに固定しない。
同名国はコード・IRIで識別できるようにする。

参照元snapshotとversion tokenを結果へ含める。UIの国選択、preview、確定はそのbasisを保持する。
参照元更新・削除・profile解除後の古い選択での確定は409にして選択内容を保ち、再確認を求める。
localは共通の検証／書込ロック、teamは同一repository snapshot・expected mapで検証と確定を結ぶ。
国側のgraph・profileメタデータと組織側のgraphをCAS対象に含め、別々のHTTP呼出しの偶然の整合に依存しない。
候補読取は国プロジェクトをUIで開くことや保存することを要求しない。

国名変更は表示に反映し、IRI参照の書換えをしない。参照先が削除されても組織データを連鎖削除しない。
既存IRIと未解決状態を表示して編集を継続できるが、新規確定の国参照は存在・型を検査する。
参照元切替は既存全IRIの解決可否をpreviewし、未解決を確認した上で設定のみ変更する。IRIを名前で自動再対応しない。
権限は既存workspaceのviewer/editor/adminを継承し、新しいプロジェクト別ACLを作らない。

## 6. システムメニューと入力テンプレート

「システムメニュー」の具体案は、Homeの共通ナビゲーションに `国 / Countries`、`政府組織 / Government organizations` を追加すること。
メニューはrole別プロジェクト一覧へ移動し、既存グループを開くか、新規作成できる。
新規プロジェクトダイアログにも同じ二つのテンプレートを追加し、別々の作成ロジックを持たない。
一覧はmanifestだけで表示し、Home表示時に全graphをparseしない。viewerも一覧・閲覧でき、作成編集はeditor/admin。

| テンプレート／操作 | 主な入力 |
| --- | --- |
| 国グループ作成 | 名称、base IRI、言語。実在国を無断投入しない |
| 国登録 | 正式名称、多言語名称、別名、任意コード、説明・出典 |
| 政府組織グループ作成 | 名称、base IRI、言語、国参照元グループ |
| 組織登録 | 名称、多言語名称、種別、存在期間、国、国所属の期間・出典、任意識別子 |
| 関係登録 | 関係種別、元組織、相手、期間、出典・説明 |
| 改編登録 | 種別、施行日、前身・後身、同一性判断、変更する関係・名称・存在期間、出典 |

参照元なしの政府組織グループは下書きとして作成可能。国登録済みまで組織確定を無効化し、国グループへの導線を示す。
専用フォームはmodelの通常のindividualを作り、SKOS名称と同梱ORGを使う。標準語彙のdomain/rangeを入力都合で改変しない。
多言語表示と編集原値を分ける。UI日英切替、別グループ移動、team再認証でも入力のownerとdraftを守る。
各一覧は検索・ページング・基準日を持ち、詳細で関係と改編をたどる。初期v1の専用表示は一覧と詳細で十分。
グラフィカルな組織図、タイムライン、ドラッグによる移管は別工程とする。

## 7. 実装境界とAPI案

純粋なRDF/profile処理を新規 `backend/app/government/` に集約する。
`profile.py`（語彙・型・DTO）、`records.py`（読取・期間・投影）、`commands.py`（Change生成）、
`references.py`（参照元snapshot・候補）、`validation.py`（時間・関係・改編の検査）。
既存editing.pyのcommand registryへ `CreateCountry`、`CreateGovernmentOrganization`、`PutGovernmentRelation`、
`ApplyGovernmentChange`、`PutGovernmentName` を登録。編集も同じcommandで対象IRIと旧basisを指定する。
削除は汎用commandを利用し、参照消失の通知を専用一覧で扱う。新しい別系統のRDF保存経路は作らない。
各commandは一つの所有プロジェクトのmodelだけを書き、国側は読取検査だけ。

HTTP案（新規 `backend/app/routers/government.py`、通常のmain登録とteam dispatcherの両方へ接続）：

- `GET /api/projects/{pid}/government/countries?q=&offset=&limit=&displayLanguage=`：国参照候補とbasis。
- `GET /api/projects/{pid}/government/view?at=YYYY-MM-DD&offset=&limit=&displayLanguage=`：確定／未確定関係、名称、総数、basis。
- `GET /api/projects/{pid}/government/projection?at=YYYY-MM-DD`：基準日投影TurtleとbasisのHTTPヘッダー。
- 書込みは既存command route。profile設定は既存create/patchへ許可フィールドとして追加する。
- domainProfileの解除・参照元切替はpatchのdryRun previewと確定に対応させ、受理済み設定を一回だけ変更する。

上限案：候補検索200文字、1ページ最大100、単一commandの前身・後身各100、変更関係100、本文256KiB。
超過は明示拒否し、部分適用しない。巨大な全graphの投影は既存100,000 statementsを上限に拒否し、件数を正直に表示。
状態コードは不明対象404、権限403、stale409、入力422、本文超過413。既存HTTP上限がより小さい場合は既存値を優先し仕様に反映する。
日英エラーは既存code/uiMessage契約と生成手順を使用する。

## 8. 保存・配布・運用

local保存とteam候補captureにdomainProfileを含める。複製・export/import・backup/restoreでprofileと正本RDFを保持する。
受理済みグラフ、revision、参照元basisが検査対象。dirtyなTurtleを勝手にapplyしない。
既存編集の離脱確認・session・CSRF・現在権限検査・再送・本人Undo・PostgreSQL commit境界を維持。
派生一覧cacheはproject/document、profile、双方のrevision、imports view、言語、基準日をキーにする。
古い応答は別projectや別基準日の画面へ適用しない。ローカル一覧とteam永続保存を混ぜない。

dictionary-v1の公開許可リストは変更しない。専用グループから既存release作成を試みたら、
履歴・組織関係が欠落するため専用profile未対応として承認を止める（汎用プロジェクトの挙動は維持）。
全履歴の既存project ZIP exportと基準日投影downloadを用意する。別グループ正本の自動同梱・自動公開はしない。
将来の政府組織公開profileでは、参照国の版固定、出典・権利、依存graph、履歴の許可述語を改めて設計する。
新runtime依存、新SQL table、クラウド配備、実データ移行は今回の前提にしない。

## 9. 受け入れ条件

1. メニューから別々の国・政府組織グループを作成でき、既存ontology/taxonomyの起動・編集を維持する。
2. 合成国2件と同名組織を登録し、国IRIで区別できる。国名変更で組織の参照IRIは変わらない。
3. 参照元が200件超でも末尾の国を検索・選択できる。存在しない国・stale basisを拒否する。
4. 部局の移管を2020-04-01に登録し、2020-03-31と2020-04-01で上位組織が切り替わる。
5. 統合・分割の前身後身を複数登録でき、吸収統合・移管は存続組織IRIを保つ。previewと一回Undoが存在期間を含む全変更に一致する。
6. 未知日付・未来改称・同名再利用を区別する。確定できない履歴を現在の事実と断定しない。
7. 国削除・参照元切替・再認証・別画面への遅延応答でもデータや入力を誤ったownerへ適用しない。
8. local再起動、team応答喪失後の再送、backup/restore、複製/exportでIRI・profile・履歴が保たれる。
9. 日英・Tab/Escape・フォーカス・スクリーンリーダーの名称と通知を実Chromeで確認する。
10. 全履歴exportと基準日投影を区別し、未対応releaseを完全な公開版と表示しない。

## 10. 実装前のレビュー論点

推奨案は、既存プロジェクト＝グループ、国の関係名は「所属国」、単一所属国、日単位の期間と不明状態、
関係記録を正本として基準日投影、初期メニューはHome共通ナビゲーション。
これらはユーザーの未確定な詳細を実装側で具体化した案であり、このPRのレビュー対象とする。
複数国所属、年単位の期間推定、国家承継、公開配布の拡張を必須にする場合は実装範囲を再調整する。

## 参考

- [W3C Organization Ontology](https://www.w3.org/TR/vocab-org/)：組織の包含、ORGプロファイル、ChangeEventと履歴管理の境界。
- [W3C ORG 組織構造](https://www.w3.org/TR/vocab-org/#organizational-structure)
- [W3C ORG 組織履歴](https://www.w3.org/TR/vocab-org/#historical-information)
- [W3C ORG 適合性](https://www.w3.org/TR/vocab-org/#conformance)
- [P2 PostgreSQL設計](2026-10-27-p2-postgresql-design.md)
- [P3公開版設計](2026-10-27-p3-local-releases-design.md)
