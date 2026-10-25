# P2 Team Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workspaceメンバーが日英UIで辞書を共有し、認可・永続履歴・競合対策を伴って安全に編集できるようにする。

**Architecture:** local版は維持し、team版を明示設定する。SQLiteを正本とし、rdflibのRDFを型・空白ノードIDごと保持する。Google認証も既存ネットワークブローカーを経由し、サーバー管理セッションを発行する。

**Tech Stack:** React 18 / TypeScript / FastAPI / rdflib / Python標準sqlite3、Google検証はgoogle-auth（導入時に固定版・通知を検証）。

**Spec:** `docs/superpowers/specs/2026-10-25-p2-team-workspace-design.md`（承認済み）。

## Global Constraints

- **多言語化を必須とする。** P2の全画面・確認・エラー・権限・履歴・競合・保存・読み上げ文言はP1の型付き日英カタログで管理し、言語追加可能にする。
- サーバーの既知エラーは安定codeとuiMessageを返す。英語完成文の推定翻訳、UI言語によるRDF・氏名・IRIの変更を禁止。
- 許可Workspaceドメインは非公開のサーバー運用設定。公開コードは導入先に応じて設定可能。メール末尾は認証根拠にしない。
- 実ドメインはテストや公開文書にも残さない。例示用ドメインを使い、公開前にリポジトリ外の非公開値リストでGit blobと履歴を検査する。設定方針は `docs/team-configuration-privacy.md`。
- 公開先へ送るのは履歴検査済みのrefだけとする。開発用P2は旧mainの履歴を継承するため、そのまま公開しない。`docs/publication-history.md` に従い公開用snapshotを更新し、一括の `--all` / `--mirror` pushをしない。
- Google署名/aud/iss/exp/hd/email_verified/nonceを検証。subを恒久IDとする。
- 絶対60分、無操作30分、ログイン試行5分。未認証・設定不備でデータへ到達させない。
- 全共有更新は期待versionとrequest ID必須。不足428、競合409。二重要求は二重適用しない。
- RDF・監査・versionを同時確定。失敗した変更を共有グラフへ公開しない。
- 他者変更後のUndoは禁止。close/discard/logoutは共有データを破棄しない。
- single process / local persistent disk。複数worker・network filesystemは運用対象外。
- 元のMIT・第三者通知、既存性能予算・SELECT専用・外部通信ガードを維持する。
- 実データ、秘密、認証コード、トークン、セッション、画面画像を公開しない。合成データでCI。
- mainを直接変更しない。実Google設定・デプロイ・mainへのマージはこの実装に含めない。

## Review Focus

1. 同じrequest IDの再送と内容違いで二重編集や別利用者の応答混入を防ぐ（Task 2/6）。
2. 空白ノード・未知の述語・型付き/言語付きliteralを再起動・Undo後にも保持する（Task 1/2/6）。
3. 認証失効中・競合中に入力とUI言語を切り替えても文言・入力・所有者が混ざらない（Task 7）。
4. DB確定前後の例外とblob保存失敗で部分的な変更や架空の成功を残さない（Task 2/6/8）。
5. ダウンロード・docs・静的配信・ログ・プロキシに認証例外や秘密漏えいを残さない（Task 4/5/8/9）。

## 作業単位と接続契約

既存アーキテクチャの実態はCLAUDE.mdと対象コードで確認する。外部のarchitecture.md /
decisions.md / backlog.mdは本checkoutに存在しないため、架空の更新や番号を作らず、
`docs/p2-verification.md`へ変更境界と検証を記録する。
各単位はRED→GREEN、関連試験、差分確認、コミットを行う。
実装担当の並列作業は新規モジュールに限定し、共有カタログと既存サービスの変更は逐次統合する。

### Task 1: モード設定とRDFの保存契約

**Files:** Create `backend/app/team/__init__.py`, `config.py`, `rdf_codec.py`; tests `backend/tests/test_team_config.py`, `test_team_rdf_codec.py`。

**Interfaces:** `TeamConfig.from_env(env: Mapping[str,str]) -> TeamConfig`、modeはlocal/team。
teamではorigin（HTTPS・pathなし）、OAuth client ID/secret、allowed domains、bootstrap subs、data dirを必須にする。
`encode_graph(graph: Graph) -> dict` / `decode_graph(payload: dict) -> Graph` は明示term型とnamespaceを扱う。
IRI/BNode/literal（言語・型・lexical）を保持し、外部パーサー/ネットワークを呼ばない。

- [x] 欠落設定、未知mode、HTTP本番、資格情報入りURL、ワイルドカード/空domain、空adminを拒否するテストを書く。
- [x] 型付きliteral、空白ノードの再参照、未知述語、日本語言語タグ・namespaceの往復試験を書く。
- [x] `pytest tests/test_team_config.py tests/test_team_rdf_codec.py` が実装前に失敗することを確認。
- [x] 設定とcodecを実装。秘密をrepr/例外へ含めない。codecは厳密なデータ検証を行う。
- [x] 同じコマンドで成功を確認し、コミット。

### Task 2: SQLiteの原子的な正本・履歴・要求重複排除

**Files:** Create `backend/app/team/repository.py`; test `backend/tests/test_team_repository.py`。

**Interfaces:** `TeamRepository(path: Path)`。
`read(key: str) -> Resource | None`、Resourceはkey/version/payload(JSON)。
`commit(actor: str, request_id: str, expected: dict[str,int|None], changes: dict[str,dict|None], operation: str) -> dict`。
None期待値は新規作成のみ。None変更は削除を示す。readの戻り値はコピー。
`history(key: str, offset=0, limit=50) -> list[dict]`、`backup(path: Path)`。
409/428等のHTTP変換前の `Conflict` / `RequestMismatch` 等は構造化したドメイン例外とする。
初期版schemaはresources, audit, requests。auth tablesはTask 4で同一接続ポリシーに追加。

- [x] 別接続の同じexpected更新は1件だけ成功し、敗者は内容/監査を変えない試験を書く。
- [x] 再起動、複数key原子性、削除/再作成のABA回避、重複ID同内容/内容違い/別actorの試験を書く。
- [x] DB書込失敗でrollback、backupから整合する復元、未知schema拒否の試験を書く。
- [x] `pytest tests/test_team_repository.py` のREDを確認。
- [x] BEGIN IMMEDIATE、単調version（墓標を保持）、canonical JSON要求hash、UTC監査と重複排除を実装。
- [x] 同じ試験のGREENを確認し、コミット。

### Task 3: 日英のP2メッセージ契約

**Files:** Modify `backend/app/message_contracts.json`, `frontend/src/i18n/{en,ja,types,server-contracts}.ts`, `docs/i18n-message-inventory.md`; Create `frontend/src/i18n/teamMessages.test.ts`。

**Interfaces:** 追加codeは `team.*`。role名、auth失敗/失効、csrf、設定不備、required version、競合、Undo不可、保存状態、履歴、管理操作、login/logoutとaccessible namesを型付きにする。
APIドメイン例外のcodeはUI messageから独立し、HTTP adapterが `make_message` へ変換する。

- [x] 必須codeの日英描画、引数一致、UI locale変更で意味の識別子とRDF値が不変の試験を書く。
- [x] `vitest run src/i18n/teamMessages.test.ts` のREDを確認。
- [x] カタログ・契約・利用箇所台帳を更新し、`python scripts/generate_message_contracts.py`。
- [x] 対象試験・`coverage.test.ts`・生成check・tscのGREENを確認、コミット。

### Task 4: Google OIDC・セッション・管理者

**Files:** Create `backend/app/team/{auth,auth_store,google_transport}.py`, `backend/app/routers/auth.py`; Modify `network_broker.py`, requirements/配布台帳; tests `test_team_auth.py`, `test_team_auth_store.py`, `test_team_google_transport.py`。

**Interfaces:** `AuthStore(path)`にusers/sessions/login_attemptsを追加。
`begin_login(browser_cookie, now)`, `consume_login(state,browser_cookie,now)` は一度限り5分。
`create_session(sub, now) -> token`, `authenticate(token,now) -> Principal`、`revoke(token)`。
Principalはsub/email/role/disabled。raw tokenを保存しない。
`GoogleIdentity.verify(id_token, nonce) -> claims`、network注入はBroker経由のみ。
`GET /api/auth/status`, `POST /api/auth/login`, `GET /api/auth/callback`, `POST /api/auth/logout`。
ログイン開始は独自header+Origin、callbackだけstate/browser連携の限定例外。

- [x] 不正claims全種、state/nonceの欠落/再利用/別ブラウザ、code再送を拒否する試験を書く。
- [x] 60分絶対/30分idle/5分試行、停止・降格即反映、最後のadmin保護、sub同一性を試験する。
- [x] 専用能力は固定HTTPS endpointのみ、redirect拒否、offline拒否、応答サイズ/timeout、秘密非記録を試験する。
- [x] 対象pytestのREDを確認。
- [x] google-authの固定版と実際の依存・ライセンス通知を検証して導入し、上記サービス/ルートを実装。
- [x] すべてGREENとsource network guard試験、コミット。

### Task 5: 認可の完全な境界とteam起動

**Files:** Create `backend/app/team/{middleware,runtime,permissions}.py`; Modify `main.py`, `local_guard.py`; tests `test_team_access.py`, `test_team_runtime.py`。

**Interfaces:** runtimeは設定→排他起動→DB→authを初期化。team設定不足で起動失敗。
全APIのdefault deny分類表でroleを検証し、明示した公開経路以外は要認証。
共有更新のCSRF tokenとOriginを検証。read-only computationのPOSTを編集と混同しない。
local modeでは既存挙動を維持。docs/openapiはteamで非公開。healthはデータなし。

- [ ] 全既存ルートを列挙し、未分類route追加で試験失敗させる。
- [ ] 未認証のAPI、HEAD、ZIP、原文、URL encoded path、docs/static漏れを試験する。
- [ ] 3role×操作分類、他Origin、偽proxy header、設定不足/二重processの試験を書く。
- [ ] RED→境界実装→GREEN。既存local_guard/main/API試験も実行し、コミット。

### Task 6: 全共有更新・Undoの永続化とサービス接続

**Files:** Create `backend/app/team/{workspace,commands,history,blobs}.py`; Modify `editing.py`, `projects.py`, `store.py`, `snapshots.py`, `queries_store.py`, routers/projects,data,ontologies,queries,network,examples; tests `test_team_workspace.py`, `test_team_conflicts.py`, `test_team_history.py`。

**Interfaces:** TeamWorkspaceは既存commandsの候補グラフ評価とRepository.commitを接続する。
既存localサービスをteamの正本にしない。文書/manifest/layout/snapshot/library/query/policyはresource keyで識別。
更新は `X-Semantic-Studio-Request-Id`、`X-Semantic-Studio-Versions`（key:versionのJSON）を要求。
期待値なし428、競合409のbody `{code, currentVersions, uiMessage}`。
team responseには現在のresourceVersionsを付加する。既存localのJSON/保存意味論は維持。
`undo(actor, key, expected, request_id)` / redoは最新の本人操作のみを逆操作の新revisionとして記録する。
open/closeは個別画面の参照で、共有文書を破棄しない。

- [ ] 2利用者/2接続の更新、model+shapesの複数基底、layout/snapshot/manifest/queries/policyの競合試験を書く。
- [ ] 他者Undo防止、再起動Undo、応答喪失再送、DB失敗、blob失敗、閉じる/破棄の非破壊を試験する。
- [ ] team版の保存警告・元text・namespace・空白ノード維持をfixtureで確認する。
- [ ] RED→候補評価/commit/公開の順に実装→GREEN。更新ルート全分類の試験と既存編集一式、コミット。

### Task 7: 認証・権限・履歴・競合の日英UI

**Files:** Create `frontend/src/team/{types,TeamProvider,LoginPanel,AccountMenu,TeamHistory,ConflictPanel}.tsx/ts`（型はtypes.ts、各componentはtsx）、同名test; Modify `api.ts`, `App.tsx`, `state/projectStore.ts`, `types.ts`, 既存Header/保存表示、必要時catalog/inventory。

**Interfaces:** auth statusはmode/authenticated/user/csrf。API wrapperは認証状態とresourceVersions/request IDを保持。
409の承認要求と競合をcodeで区別し、競合は自動再送しない。401は対象の入力を保持し再認証入口を出す。
roleに沿って既存操作をdisable/説明する。履歴APIは `GET /api/team/history?key&offset&limit`、管理は `GET/PATCH /api/team/users`。
他者更新は10秒間隔のversion読取で検知し、未送信入力がない時だけ表示を更新する。

- [ ] 日英のlogin/logout/role/history/conflict/session expiryとキーボード/AXをcomponent試験する。
- [ ] 入力中の401/409・辞書切替・UI言語切替・遅延応答に対する所有者保全を試験する。
- [ ] RED→UI/中央API接続→GREEN。カタログキー/引数/利用箇所、tsc/build、既存App/編集試験、コミット。

### Task 8: 移行・バックアップ・配備

**Files:** Create `backend/app/team/maintenance.py`, `scripts/team_workspace.py`, `docker-compose.team.yml`, `docs/p2-team-operations.md`; Modify README、Docker除外・publication検査/通知; tests `test_team_maintenance.py`。

**Interfaces:** CLI `inspect-local`, `migrate --dry-run`, `migrate --destination`, `backup`, `restore --destination`。
migrationは新領域のみ、元は読取専用。restoreは新領域のみ、sessions/loginsを全失効。
運用secretは環境で渡し、.env.exampleは空/placeholderのみ。データvolumeはイメージへ含めない。

- [ ] 元データ不変、RDF同値、未知項目/空白ノード、missing blob拒否、失効済みrestoreを試験する。
- [ ] 稼働中backupの整合性、既存destination拒否、複数process排他を試験する。
- [ ] RED→CLI/配備例/復旧手順→GREEN、実Docker検査と公開検査、コミット。

### Task 9: 統合検証・独立レビュー・PR

**Files:** Modify `.claude/skills/run-semantic-viewer/driver.mjs`（teamシナリオ）、Create `docs/p2-verification.md`, `docs/p2-user-guide.md`; Update CLAUDE/known-state、spec進捗。

**Interfaces:** 合成Google署名fixtureと実2ブラウザsessionで認可と編集競合を再現する。
本番資格情報を使わず全自動検証を完結させ、実Google loginの運用確認は別欄で管理する。

- [ ] backend全体・frontend全体・契約生成・公開検査・tsc/build、既存smokeを成功させる。
- [ ] 実Chromeで日英/IME/権限/履歴/競合/401復帰/Undo/再起動、AX/Tab、2利用者を確認する。
- [ ] 単一process排他・バックアップ復元・Docker秘密非混入を確認する。
- [ ] 全差分の独立レビューとセキュリティレビューを行い、指摘を根拠付きで修正・再検証する。
- [ ] 本番Google login未確認なら「P2本番利用可能」としない。未確認を検証書とPRに明記する。
- [ ] 公開先とPRの基準ブランチを確定し、履歴検査済みのrefだけを送信して日本語PRを作成する。公開用snapshotは旧mainと共通祖先がないため、既存リポジトリの通常PR用には使わない。必須CI（Linux/Windows/frontend/docker）とpublication・budgets結果を確認する。

## 自己レビュー・実行方針

設計の全節をTasks 1–9へ割当済み。多言語化はTask 3/7だけでなく各API・例外・CLIの完了条件にも適用する。
CLIの運用向け技術診断はcodeと機械可読結果を保持し、アプリ利用者への表示はカタログを通す。
新規基盤は分離モジュールとして検証後に統合し、未完成のteamモードを既存localへ露出させない。
ユーザーは設計・詳細計画・実装の継続を承認済み（2026-10-25）。計画を理由に再確認を求めない。
実行は共有ファイルを逐次編集し、独立モジュールを担当分離してレビューする。

## 基盤チェックポイント（2026-10-25）

Tasks 1〜4を実装・独立レビュー済み。Task 8の公開検査部分を必要性により前倒し。
全体試験はbackend 2,812成功、frontend 2,498成功、scripts 31成功、build/型検査とDocker成功。
`docs/p2-verification.md`に証跡と未接続の境界を記録した。
次にTask 5のAPI全体の認証・認可、その後Task 6の既存共有更新への接続を行う。
ログイン等の製品画面（Task 7）と配備・受け入れ（Tasks 8〜9）はまだ完了していない。
P2全体を完了・本番利用可能と扱わない。
