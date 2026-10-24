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
