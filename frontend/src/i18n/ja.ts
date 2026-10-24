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
