/*
================================================================================
FILE: frontend/src/reasoning/reasonSentences.test.ts
================================================================================

SUMMARY
    The words of reasoning (axioms-and-reasoning 5.1 to 5.7, Section 6):
    each status line and ending, the group headings with their true counts,
    a premise's mark, and the rule that says when a result is stale.

BASIC IDEA
    Pure functions, called with constructed results. The fact, problem and
    reason sentences themselves are the server's (D-103) and are tested in
    test_reasoning.py; this is the frame around them.

INPUTS / INPUT SOURCES
    - reasonSentences.ts.

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { describe, expect, it } from "vitest";
import type { ReasoningGroup, ReasoningResult } from "../types";
import {
  EMPTY,
  INTRO,
  NOTHING,
  STALE,
  TAXONOMY,
  finishedLine,
  groupHeading,
  importedLine,
  isStale,
  marksShown,
  panelHeading,
  premiseMark,
  runningLine,
  staleLine,
  seconds,
} from "./reasonSentences";

function group(kind: ReasoningGroup["kind"], total: number): ReasoningGroup {
  return { kind, total, offset: 0, items: [] };
}

function result(changes: Partial<ReasoningResult> = {}): ReasoningResult {
  return {
    status: "done",
    key: "3+0|model|no-data",
    includeData: false,
    imports: false,
    basis: { revision: 3, generation: 0, imports: false },
    durationMs: 4200,
    statements: 39,
    sentence: null,
    problems: [{ kind: "neverMembers", sentence: "Robot can never have members.", subject: "x:Robot", causes: [] }],
    groups: [group("kinds", 2), group("same", 0), group("memberships", 30), group("links", 5)],
    importedFacts: group("imported", 0),
    stale: false,
    ...changes,
  };
}

const NOW = { revision: 3, generation: 0, imports: false };

describe("the words around a run (5.1, 5.2, Section 6)", () => {
  it("says what the reasoner does, once, in plain words", () => {
    expect(INTRO).toBe(
      "Reasoning (OWL 2 RL) draws conclusions about the classes and things you have. It does not invent new things, and it changes nothing in your file.",
    );
    expect(TAXONOMY).toBe("Reasoning is for ontology projects.");
    expect(EMPTY).toBe("Press Reason to see what follows from your model.");
  });

  it("counts the seconds while running, and says the end with its counts", () => {
    expect(runningLine(3.7)).toBe("Reasoning… 3 s");
    expect(seconds(4200)).toBe("4 s");
    expect(seconds(240)).toBe("0.2 s");
    expect(seconds(20)).toBe("0.1 s");
    expect(finishedLine(result())).toBe("Reasoned in 4 s: 1 problem, 37 new facts");
    expect(
      finishedLine(result({ problems: [], groups: [group("kinds", 1)], importedFacts: group("imported", 0) })),
    ).toBe("Reasoned in 4 s: 0 problems, 1 new fact");
    // Facts about imported terms count among the new facts.
    expect(finishedLine(result({ importedFacts: group("imported", 12) }))).toBe(
      "Reasoned in 4 s: 1 problem, 49 new facts",
    );
    expect(finishedLine(result({ problems: [], groups: [], importedFacts: group("imported", 0) }))).toBe(
      `Reasoned in 4 s: ${NOTHING.toLowerCase()}`,
    );
  });

  it("says a run that arrives after the model moved is not current (PR #55 review)", () => {
    expect(staleLine(result())).toBe("Reasoned in 4 s, but the model changed meanwhile: Reason again.");
    // A run that did not finish says only how it ended.
    expect(staleLine(result({ status: "stopped", sentence: "Stopped. Nothing was concluded." }))).toBe(
      "Stopped. Nothing was concluded.",
    );
  });

  it("gives every other ending the server's sentence", () => {
    const stopped = result({ status: "stopped", sentence: "Stopped. Nothing was concluded." });
    expect(finishedLine(stopped)).toBe("Stopped. Nothing was concluded.");
    expect(panelHeading(stopped)).toBe("Results");
    expect(panelHeading(null)).toBe("Results");
    expect(panelHeading(result())).toBe("Results: reasoned in 4 s");
  });

  it("heads each group with its true total, and counts imported facts in one line", () => {
    expect(groupHeading("kinds", 2)).toBe("New kinds (2)");
    expect(groupHeading("same", 1)).toBe("Same meaning (1)");
    expect(groupHeading("memberships", 4000)).toBe("New memberships (4,000)");
    expect(groupHeading("links", 5)).toBe("New links (5)");
    expect(importedLine(12)).toBe("12 facts about imported terms");
    expect(importedLine(1)).toBe("1 fact about imported terms");
  });

  it("marks a premise stated or inferred, in words", () => {
    expect(premiseMark(false)).toBe("stated");
    expect(premiseMark(true)).toBe("inferred");
  });
});

describe("what goes stale (5.3)", () => {
  it("is current only for the revision, generation and switch it was computed on", () => {
    expect(isStale(result(), NOW)).toBe(false);
    expect(isStale(result(), { ...NOW, revision: 4 })).toBe(true);
    expect(isStale(result(), { ...NOW, generation: 1 })).toBe(true);
    expect(isStale(result(), { ...NOW, imports: true })).toBe(true);
    // The server's own word: the model moved while the run went.
    expect(isStale(result({ stale: true }), NOW)).toBe(true);
    expect(STALE).toBe("The model changed after this run.");
  });

  it("shows marks only for a finished, current run with Show inferred on", () => {
    expect(marksShown(result(), NOW, true)).toBe(true);
    expect(marksShown(result(), NOW, false)).toBe(false);
    expect(marksShown(result(), { ...NOW, revision: 9 }, true)).toBe(false);
    expect(marksShown(result({ status: "timedOut" }), NOW, true)).toBe(false);
    expect(marksShown(null, NOW, true)).toBe(false);
  });
});

it("describes current result facts in Japanese without changing staleness or counts", () => {
  const current = result();
  const original = JSON.stringify(current);
  expect(finishedLine(current, "ja")).toBe("推論が4秒で完了しました：問題1件、新しい事実37件");
  expect(groupHeading("memberships", 4000, "ja")).toBe("新しい所属関係（4,000件）");
  expect(importedLine(12, "ja")).toBe("インポートした用語に関する事実12件");
  expect(seconds(240, "ja")).toBe("0.2秒");
  expect(runningLine(3.7, "ja")).toBe("推論中… 3秒");
  expect(panelHeading(current, "ja")).toBe("推論結果：4秒で完了");
  expect(staleLine(current, "ja")).toBe("推論は4秒で完了しましたが、実行中にモデルが変更されました。もう一度推論してください。");
  expect(premiseMark(true, "ja")).toBe("推論結果");
  expect(premiseMark(false, "ja")).toBe("記述済み");
  expect(isStale(current, NOW)).toBe(false);
  expect(JSON.stringify(current)).toBe(original);
});

it("renders ending metadata while preserving the legacy diagnostic as data", () => {
  const stopped = result({ status: "stopped", sentence: "Legacy stop detail", uiMessage: { code: "reasoning.stopped", args: {} } });
  expect(finishedLine(stopped, "ja")).toBe("停止しました。推論結果はありません。");
  expect(finishedLine(stopped, "en")).toBe("Stopped. Nothing was concluded.");
  expect(stopped.sentence).toBe("Legacy stop detail");
  const timed = result({ status: "timedOut", sentence: "Legacy detail with 999 seconds", uiMessage: { code: "reasoning.timeout", args: { seconds: 1.5 } } });
  expect(finishedLine(timed, "ja")).toContain("1.5秒");
  expect(finishedLine(timed, "ja")).not.toContain("999");
  const tooLarge = result({ status: "tooLarge", uiMessage: { code: "reasoning.too_large", args: { count: 200001, limit: 200000 } } });
  expect(finishedLine(tooLarge, "ja")).toContain("200,001件");
  expect(finishedLine(tooLarge, "ja")).toContain("200,000件");
});
