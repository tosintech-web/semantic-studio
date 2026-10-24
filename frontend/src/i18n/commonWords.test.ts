/*
================================================================================
FILE: frontend/src/i18n/commonWords.test.ts
SUMMARY
    Japanese common-operation sentences retain names, counts and state meaning.
BASIC IDEA
    Exercise pure wording functions with an explicit Japanese translator.
INPUTS / INPUT SOURCES
    Synthetic names, missing counts, counts and loading states.
EXPECTED OUTPUT
    Whole Japanese sentences and unchanged default English compatibility.
================================================================================
*/
import { expect, it } from "vitest";
import { translate } from "./format";
import type { Translator } from "./types";
import { purposeLabel, outcomeLabel, alwaysPhrase } from "../networkWords";
import { homeStatus, statementCount } from "../statusWords";
import { removalPrompt, removalConfirmation } from "../removalPrompt";
import { stepSentence, stepAnnouncement } from "../loadWords";
const ja = ((code, args) => translate("ja", code, args)) as Translator;
it("names true library and statement counts in Japanese", () => {
  expect(homeStatus(2, 1, ja)).toBe("プロジェクト2件 · ライブラリ内の辞書1件");
  expect(homeStatus(0, 0, ja)).toBe("辞書を読み込むか、プロジェクトを作成してください。");
  expect(statementCount(3036, ja)).toBe("3,036件のステートメント");
});
it("distinguishes unknown and zero saved queries without altering user names", () => {
  expect(removalPrompt("<犬>", null, [], ja)).toBe("「<犬>」を削除しますか？保存された辞書と、この辞書に紐づく保存済みクエリを削除します。元に戻せません。");
  expect(removalPrompt("犬", 0, [], ja)).toBe("「犬」の保存された辞書を削除しますか？再起動後もライブラリには表示されません。");
  expect(removalPrompt("犬", 1, ["<検索>"], ja)).toContain("1件の保存済みクエリ（「<検索>」）");
  expect(removalConfirmation("犬", 2, ja)).toBe("「犬」と保存済みクエリ2件を削除しました。");
});
it("describes the current loading step and progress in Japanese", () => {
  expect(stepSentence({ kind: "sending", name: "犬.ttl", sent: 1024, total: 2048 }, ja)).toBe("「犬.ttl」を送信中：2 KB中1 KB。");
  expect(stepSentence({ kind: "downloading", elapsed: 1 }, ja)).toBe("ダウンロード・読み込み中：1秒経過。");
  expect(stepAnnouncement({ kind: "reading", name: "犬.ttl", size: 2048, elapsed: 1 }, ja)).toBe("「犬.ttl」を読み込み中");
});
it("localizes network capabilities and outcomes with own-key fallbacks", () => {
  expect(purposeLabel("ontology:fetch", ja)).toBe("辞書のダウンロード");
  expect(outcomeLabel("blocked", ja)).toBe("利用者がブロック");
  expect(purposeLabel("constructor", ja)).toBe("その他");
  expect(alwaysPhrase("jsonld:context", ja)).toBe("JSON-LDコンテキストの読み込み");
});
