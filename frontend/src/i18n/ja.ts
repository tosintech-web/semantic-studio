/*
================================================================================
FILE: frontend/src/i18n/ja.ts
SUMMARY
    ja UI message catalog.
BASIC IDEA
    Use whole sentences and stable placeholders; user data stays unchanged.
INPUTS / INPUT SOURCES
    Message contracts from types.ts.
EXPECTED OUTPUT
    A complete catalog matching the other supported UI locale.
================================================================================
*/

import type { Catalog } from "./types";

export const ja: Catalog = {
  "kind.class": "クラス",
  "kind.objectProperty": "オブジェクトプロパティ",
  "kind.datatypeProperty": "データ型プロパティ",
  "kind.annotationProperty": "注釈プロパティ",
  "kind.property": "プロパティ",
  "kind.concept": "SKOS概念",
  "kind.conceptScheme": "概念体系",
  "kind.collection": "SKOSコレクション",
  "kind.individual": "個体",
  "kind.ontology": "オントロジー",
  "kind.other": "その他",

  "common.retry": "再試行",
  "entities.filter": "辞書内を検索",
  "entities.kind": "種類",
  "entities.sort": "並び順",
  "entities.sortLabel": "名称順",
  "entities.sortIri": "IRI順",
  "entities.all": "すべて",
  "entities.concept": "概念",
  "entities.individual": "個体",
  "entities.class": "クラス",
  "entities.properties": "プロパティ",
  "entities.other": "その他",
  "entities.label": "名称",
  "entities.iri": "識別子（IRI）",
  "entities.description": "説明",
  "entities.reference": "参照のみ",
  "entities.undefined": "この資源は参照されていますが、この辞書内に定義がありません。",
  "entities.copy": "完全なIRIをコピー",
  "entities.copied": "IRIをコピーしました。",
  "entities.range": "{total}件中 {start}〜{end}件",
  "entities.previous": "前のページ",
  "entities.next": "次のページ",
  "entities.empty": "一致する項目はありません。",
  "entities.updating": "辞書の更新が続いています。再試行して最新の項目を取得してください。",
  "entities.truncated": "名称を省略して表示しています。完全な値は詳細で確認できます。",
  "entities.fallback": "希望言語の名称がないため{language}で表示",
  "dictionary.readonly": "閲覧専用",
  "dictionary.editing": "編集中",
  "dictionary.saved": "保存済み",
  "dictionary.dirty": "未保存の変更あり",
  "dictionary.saving": "保存中…",
  "dictionary.saveError": "保存に失敗しました",

  "common.cancel": "キャンセル",
  "search.prompt": "辞書の項目を検索…",
  "search.queryPrompt": "ステップに追加する項目を検索…",
  "search.results": "検索結果",
  "search.loading": "検索中…",
  "search.one": "1件の候補",
  "search.none": "一致する項目はありません",
  "search.count": "{count}件の候補",
  "search.more": "{count}件を表示しています。ほかにも一致する項目があります",
  "search.narrow": "{count}件を超えています。検索語を追加すると絞り込めます。",
  "search.showAll": "項目一覧で全件を見る",
  "search.undrawn": "グラフ外",
  "search.undrawnTitle": "この項目はグラフの描画範囲外にあります",
  "search.from": "参照元：{name}",
  "search.importNone": "参照先に一致する概念はありません。ほかの辞書の概念へ対応付けるには、参照を解決してください。",
  "match.name": "名称：{value}",
  "match.alias": "別名：{value}",
  "match.reading": "読み：{value}",
  "match.search": "検索語：{value}",
  "match.identifier": "識別子：{value}",

  "nav.home": "ホーム",
  "nav.view": "ソース",
  "nav.explore": "探索",
  "nav.edit": "編集",
  "nav.query": "検索クエリ",
  "nav.shapes": "検証ルール",
  "nav.entities": "項目一覧",
  "ui.language": "UIの言語",
  "dictionary.invalidLanguage": "ja、en、ja-JPなどの言語タグを入力してください。",
  "dictionary.apply": "表示言語を適用",
  "dictionary.language": "辞書の表示言語",
  "common.error": "操作を完了できませんでした。詳細を確認してください。",
  "common.notSet": "未設定",
  "crash.title": "問題が発生しました。",
  "crash.description": "画面の処理を停止しました。再読み込みすると辞書ライブラリから再開します。このエラーによって、保存済みのデータは変更されていません。",
  "crash.reload": "アプリを再読み込み",
  "load.success": "「{name}」を読み込みました。"
};
