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
    plus unchanged legacy labels for unsupported metadata and conditional
    editing vocabulary resolved in the current language.
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


const conditionalName = "名 <b>{name}</b>";
const conditionalOther = "対象 {other}";
const sharedNames = [{ text: "甲 <img>{first}" }, { code: "words.list.and", args: {} }, { text: "乙 {second}" }];
const conditionalCases = [
  [{ code: "command.set_label", args: { name: conditionalName, language: "fr" } }, `Set label of ${conditionalName} (fr)`],
  [{ code: "command.set_comment", args: { name: conditionalName, language: "fr" } }, `Set comment of ${conditionalName} (fr)`],
  [{ code: "command.set_domain", args: { name: conditionalName, target: conditionalOther } }, `Set domain of ${conditionalName} to ${conditionalOther}`],
  [{ code: "command.set_range", args: { name: conditionalName, target: conditionalOther } }, `Set range of ${conditionalName} to ${conditionalOther}`],
  [{ code: "command.set_ends_domain", args: { name: conditionalName, domain: conditionalOther } }, `Set the ends of ${conditionalName}: from ${conditionalOther}`],
  [{ code: "command.set_ends_range", args: { name: conditionalName, range: conditionalOther } }, `Set the ends of ${conditionalName}: to ${conditionalOther}`],
  [{ code: "command.set_ends_both", args: { name: conditionalName, domain: "始点 {from}", range: "終点 {to}" } }, `Set the ends of ${conditionalName}: from 始点 {from} to 終点 {to}`],
  [{ code: "command.cleared_domain", args: { name: conditionalName } }, `Cleared the start of ${conditionalName}`],
  [{ code: "command.cleared_range", args: { name: conditionalName } }, `Cleared the end of ${conditionalName}`],
  [{ code: "command.assigned_domain", args: { property: conditionalName, class_name: conditionalOther } }, `Gave ${conditionalName} to ${conditionalOther}`],
  [{ code: "command.moved_domain", args: { property: conditionalName, class_name: conditionalOther } }, `Moved ${conditionalName} up to ${conditionalOther}`],
  [{ code: "command.shared_domain", args: { property: conditionalName, names: sharedNames } }, `Shared ${conditionalName} between 甲 <img>{first} and 乙 {second}`],
  [{ code: "command.shared_parent", args: { property: conditionalName, names: sharedNames } }, `Gave 甲 <img>{first} and 乙 {second} a shared parent, and ${conditionalName} to it`],
  [{ code: "command.removed_domain_member", args: { property: conditionalName, class_name: conditionalOther } }, `Removed ${conditionalOther} from ${conditionalName}`],
  [{ code: "command.made_inverse", args: { name: conditionalName, inverse: conditionalOther } }, `Made ${conditionalOther} the other way round of ${conditionalName}`],
  [{ code: "command.linked_example_value", args: { subject: conditionalName, target: conditionalOther, property: "p:関係" } }, `Linked ${conditionalName} to ${conditionalOther} by p:関係`],
  [{ code: "command.removed_example_link", args: { subject: conditionalName, target: conditionalOther, property: "p:関係" } }, `Removed the link from ${conditionalName} to ${conditionalOther} by p:関係`],
  [{ code: "command.set_example_value", args: { subject: conditionalName, property: "p:属性" } }, `Set p:属性 of ${conditionalName}`],
  [{ code: "command.added_example_value", args: { subject: conditionalName, property: "p:属性" } }, `Added p:属性 to ${conditionalName}`],
  [{ code: "command.removed_example_value", args: { subject: conditionalName, property: "p:属性" } }, `Removed p:属性 from ${conditionalName}`],
  [{ code: "command.applied_turtle", args: {} }, "Applied Turtle edits"],
] as const;

it.each(conditionalCases)("renders a conditional operation without freezing names or conjunctions: %j", (message, legacy) => {
  const japanese = historyLabel(legacy, message, ja);
  expect(historyLabel(legacy, message, ((code, args) => translate("en", code, args)) as Translator)).toBe(legacy);
  expect(japanese).not.toBe(legacy);
  for (const value of Object.values(message.args)) {
    if (typeof value === "string") expect(japanese).toContain(value);
    else if (Array.isArray(value)) {
      for (const part of value) if ("text" in part) expect(japanese).toContain(part.text);
      expect(japanese).toContain("甲 <img>{first}と乙 {second}");
    }
  }
});

const characteristicCases = [
  ["functional", "at most one", "最大1件"], ["inverseFunctional", "identifies its start", "始点を一意に識別"],
  ["symmetric", "works both ways", "双方向に成り立つ"], ["transitive", "chains", "推移する"],
  ["asymmetric", "never both ways", "逆向きには成り立たない"],
  ["irreflexive", "never to itself", "自分自身とは結び付かない"],
  ["reflexive", "always to itself", "常に自分自身と結び付く"],
  ["functionalAttribute", "one value only", "値は最大1つ"],
] as const;

it.each(characteristicCases)("renders both characteristic states and the exact word meaning: %s", (token, english, japaneseWord) => {
  for (const on of [true, false]) {
    const message = { code: on ? "command.marked_characteristic" : "command.unmarked_characteristic", args: { name: conditionalName, characteristic: [{ code: `words.characteristic.${token}`, args: {} }] } };
    const legacy = `${on ? "Marked" : "Unmarked"} ${conditionalName} as "${english}"`;
    expect(historyLabel(legacy, message, ((code, args) => translate("en", code, args)) as Translator)).toBe(legacy);
    expect(historyLabel(legacy, message, ja)).toBe(`「${conditionalName}」の特性「${japaneseWord}」の${on ? "設定" : "解除"}`);
  }
});

const mappingWordCases = [
  ["exactMatch", "an exact match", "完全一致"], ["closeMatch", "a close match", "近似一致"],
  ["broadMatch", "a broader match", "他の用語集の上位概念"],
  ["narrowMatch", "a narrower match", "他の用語集の下位概念"],
  ["relatedMatch", "a related match", "他の用語集の関連概念"],
] as const;

it.each(mappingWordCases)("renders both external mapping operations from the semantic kind: %s", (token, english, japaneseWord) => {
  for (const remove of [false, true]) {
    const message = { code: remove ? "command.removed_mapping" : "command.added_mapping", args: { concept: conditionalName, target: "https://example.org/concept", mapping: [{ code: `words.mapping.${token}`, args: {} }] } };
    const legacy = `${remove ? "Removed" : "Added"} ${english} of ${conditionalName}: https://example.org/concept`;
    expect(historyLabel(legacy, message, ((code, args) => translate("en", code, args)) as Translator)).toBe(legacy);
    const japanese = historyLabel(legacy, message, ja);
    expect(japanese).toContain(japaneseWord);
    expect(japanese).toContain(conditionalName);
    expect(japanese).toContain("https://example.org/concept");
    expect(japanese).not.toBe(legacy);
  }
});

const deleteWordCases = [
  ["class", "class", "クラス"], ["objectProperty", "object property", "関係"],
  ["datatypeProperty", "datatype property", "属性"], ["annotationProperty", "annotation property", "注釈プロパティ"],
  ["property", "property", "プロパティ"], ["concept", "concept", "概念"],
  ["conceptScheme", "concept scheme", "概念体系"], ["example", "example", "個体"], ["entity", "entity", "エンティティ"],
] as const;

it.each(deleteWordCases)("renders deletion for each semantic entity kind: %s", (token, english, japaneseWord) => {
  const message = { code: "command.deleted_entity", args: { name: conditionalName, kind: [{ code: `words.kind.${token}`, args: {} }] } };
  const legacy = `Deleted ${english} ${conditionalName}`;
  expect(historyLabel(legacy, message, ((code, args) => translate("en", code, args)) as Translator)).toBe(legacy);
  expect(historyLabel(legacy, message, ja)).toBe(`${japaneseWord}「${conditionalName}」の削除`);
});
