/*
================================================================================
FILE: frontend/src/modeling/projectNotices.test.ts
================================================================================
SUMMARY
    Command-history labels distinguish display metadata from operation failures.
BASIC IDEA
    New and older servers can supply different metadata versions. An unknown or
    malformed descriptor must keep the successful operation's legacy label,
    rather than claiming that the already completed operation failed.
INPUTS / INPUT SOURCES
    Synthetic literal names, valid descriptors and unsupported wire objects.
EXPECTED OUTPUT
    Localized known labels with literal operands and correct hierarchy direction,
    plus unchanged legacy labels for unsupported metadata.
================================================================================
*/

import { describe, expect, it } from "vitest";
import { translate } from "../i18n/format";
import type { Translator } from "../i18n/types";
import { historyLabel } from "./projectNotices";

const ja = ((code, args) => translate("ja", code, args)) as Translator;

describe("history metadata compatibility", () => {
  it.each([
    undefined,
    null,
    { code: "future.command", args: {} },
    { code: "__proto__", args: {} },
    { code: "command.created_class", args: {} },
    { code: "command.created_class", args: { name: 3 } },
  ])("keeps the actual successful operation label for unsupported metadata: %j", message => {
    expect(historyLabel("Created class <img>{name}", message, ja)).toBe("Created class <img>{name}");
  });

  it("uses validated names literally and leaves the descriptor untouched", () => {
    const message = Object.freeze({ code: "command.created_class", args: Object.freeze({ name: "犬 <img>{name}" }) });
    expect(historyLabel("Legacy action", message, ja)).toBe("クラス「犬 <img>{name}」の作成");
  });
});


// Expected English is the public legacy API wording, rather than catalog lookup.
// Distinct operands expose missing arguments and direction changes in either locale.
const operationCases = [
  [{ code: "command.added_annotation", args: { property: "p:注釈", name: "甲 <b>{name}</b>" } }, "Added p:注釈 to 甲 <b>{name}</b>"],
  [{ code: "command.removed_annotation", args: { property: "p:注釈", name: "甲 <b>{name}</b>" } }, "Removed p:注釈 from 甲 <b>{name}</b>"],
  [{ code: "command.changed_annotation", args: { property: "p:注釈", name: "甲 <b>{name}</b>" } }, "Changed p:注釈 of 甲 <b>{name}</b>"],
  [{ code: "command.added_subclass", args: { child: "甲 <b>{child}</b>", parent: "乙 {parent}" } }, "Made 甲 <b>{child}</b> a subclass of 乙 {parent}"],
  [{ code: "command.removed_subclass", args: { child: "甲 <b>{child}</b>", parent: "乙 {parent}" } }, "Removed 甲 <b>{child}</b> as a subclass of 乙 {parent}"],
  [{ code: "command.added_subproperty", args: { child: "p:甲 <b>{child}</b>", parent: "p:乙 {parent}" } }, "Made p:甲 <b>{child}</b> a more specific kind of p:乙 {parent}"],
  [{ code: "command.removed_subproperty", args: { child: "p:甲 <b>{child}</b>", parent: "p:乙 {parent}" } }, "Removed p:乙 {parent} as more general than p:甲 <b>{child}</b>"],
  [{ code: "command.added_broader", args: { concept: "狭い <b>{concept}</b>", broader: "広い {broader}" } }, "Made 狭い <b>{concept}</b> narrower than 広い {broader}"],
  [{ code: "command.removed_broader", args: { concept: "狭い <b>{concept}</b>", broader: "広い {broader}" } }, "Removed 広い {broader} as broader of 狭い <b>{concept}</b>"],
  [{ code: "command.added_related", args: { concept: "甲 <b>{concept}</b>", related: "乙 {related}" } }, "Related 甲 <b>{concept}</b> to 乙 {related}"],
  [{ code: "command.removed_related", args: { concept: "甲 <b>{concept}</b>", related: "乙 {related}" } }, "Removed 乙 {related} as related to 甲 <b>{concept}</b>"],
  [{ code: "command.renamed_iri", args: { old: "p:前{old}", new: "p:後{new}" } }, "Renamed p:前{old} to p:後{new}"],
  [{ code: "command.swapped_ends", args: { name: "関係 <b>{name}</b>" } }, "Swapped the ends of 関係 <b>{name}</b>"],
  [{ code: "command.cleared_inverse", args: { name: "関係 <b>{name}</b>" } }, "Removed the other way round of 関係 <b>{name}</b>"],
  [{ code: "command.created_example", args: { name: "例 <b>{name}</b>", class_name: "クラス {class_name}" } }, "Created example 例 <b>{name}</b> of クラス {class_name}"],
  [{ code: "command.added_restriction", args: { property: "p:関係{property}", name: "クラス <b>{name}</b>" } }, "Added a rule on p:関係{property} to クラス <b>{name}</b>"],
  [{ code: "command.changed_restriction", args: { property: "p:関係{property}", name: "クラス <b>{name}</b>" } }, "Changed a rule on p:関係{property} of クラス <b>{name}</b>"],
  [{ code: "command.removed_restriction", args: { property: "p:関係{property}", name: "クラス <b>{name}</b>" } }, "Removed a rule on p:関係{property} from クラス <b>{name}</b>"],
  [{ code: "command.added_disjoint", args: { first: "甲 <b>{first}</b>", second: "乙 {second}" } }, "Made 甲 <b>{first}</b> and 乙 {second} disjoint"],
  [{ code: "command.removed_disjoint", args: { first: "甲 <b>{first}</b>", second: "乙 {second}" } }, "Removed the disjointness of 甲 <b>{first}</b> and 乙 {second}"],
  [{ code: "command.added_equivalent", args: { first: "甲 <b>{first}</b>", second: "乙 {second}" } }, "Made 甲 <b>{first}</b> and 乙 {second} mean the same thing"],
  [{ code: "command.removed_equivalent", args: { first: "甲 <b>{first}</b>", second: "乙 {second}" } }, "Removed that 甲 <b>{first}</b> and 乙 {second} mean the same thing"],
] as const;

it.each(operationCases)("renders both locales with literal operands for %j", (message, legacy) => {
  const japanese = historyLabel(legacy, message, ja);
  const english = historyLabel(legacy, message, ((code, args) => translate("en", code, args)) as Translator);
  expect(english).toBe(legacy);
  expect(japanese).not.toBe(legacy);
  for (const value of Object.values(message.args)) expect(japanese).toContain(value);
});

it("keeps hierarchy direction and annotation ownership in the Japanese word order", () => {
  expect(historyLabel("Legacy", { code: "command.added_subclass", args: { child: "犬", parent: "動物" } }, ja)).toBe("「犬」を「動物」の下位クラスにする変更");
  expect(historyLabel("Legacy", { code: "command.added_broader", args: { concept: "犬", broader: "動物" } }, ja)).toBe("「犬」を「動物」の下位概念にする変更");
  expect(historyLabel("Legacy", { code: "command.changed_annotation", args: { name: "犬", property: "rdfs:comment" } }, ja)).toBe("「犬」のrdfs:commentの変更");
});
