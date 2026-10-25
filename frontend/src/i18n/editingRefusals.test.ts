/*
================================================================================
FILE: frontend/src/i18n/editingRefusals.test.ts
SUMMARY
    Fixed editing refusals have complete Japanese and English display frames.
BASIC IDEA
    Render wire descriptors from the server contract with both translators,
    checking each refusal's meaning without parsing its old English detail.
INPUTS / INPUT SOURCES
    Fixed codes and explicit expected whole sentences for editing and recovery.
EXPECTED OUTPUT
    Known metadata and complete sentences for both supported UI languages.
================================================================================
*/
import { expect, it } from "vitest";
import { translate } from "./format";
import { renderServerMessage, validWireMessage } from "./serverMessage";
import type { Translator, UiLocale } from "./types";
const tFor = (locale: UiLocale) => ((code, args) => translate(locale, code, args)) as Translator;

it.each([
  [
    "editing.refusal.definition_text",
    "A definition is text.",
    "定義はテキストで指定してください。"
  ],
  [
    "editing.refusal.annotation_identity_required",
    "A new annotation property needs a name or an IRI.",
    "新しい注釈プロパティには、名前またはIRIを指定してください。"
  ],
  [
    "editing.refusal.ends_required",
    "Say which end to set: a domain, a range, or both.",
    "関連の始点・終点、またはその両方を指定してください。"
  ],
  [
    "editing.refusal.share_model_document",
    "Attributes and relationships live in model.ttl; share them there.",
    "属性と関連の共有設定は、モデル文書（model.ttl）で編集してください。"
  ],
  [
    "editing.refusal.characteristic_switch_required",
    "Say whether the characteristic is on or off.",
    "特性を有効にするか無効にするかを指定してください。"
  ],
  [
    "editing.refusal.unchanged_iri",
    "The new IRI is the same as the old one.",
    "新しいIRIが現在のIRIと同じです。"
  ],
  [
    "editing.refusal.delete_strategy",
    "The strategy is reparent (children move up) or orphan.",
    "削除時の子項目の扱いは、親へ移動するか、親を外すかを選択してください。"
  ],
  [
    "editing.refusal.examples_model_document",
    "Examples live in model.ttl; run example commands on the model document.",
    "具体例はモデル文書（model.ttl）で編集してください。"
  ],
  [
    "editing.refusal.value_kind_and_text_required",
    "A value needs its kind and its text.",
    "値の種類とテキストを指定してください。"
  ],
  [
    "editing.refusal.rules_model_document",
    "A class's rules live in model.ttl; run rule commands on the model document.",
    "クラスのルールはモデル文書（model.ttl）で編集してください。"
  ],
  [
    "editing.refusal.attribute_value_kind",
    "An attribute's value is text or a typed value.",
    "属性の値は、テキストまたは型付きの値を指定してください。"
  ],
  [
    "editing.refusal.attribute_value_no_link",
    "An attribute's value is text or a typed value, not a link.",
    "属性の値にリンクは指定できません。テキストまたは型付きの値を指定してください。"
  ],
  [
    "editing.refusal.rule_form",
    "The form is \"every\" or \"defines\".",
    "ルールの形式は、すべてに成立する条件、または定義を選択してください。"
  ],
  [
    "editing.refusal.rule_kind",
    "The kind is some, only, exactly, atLeast, atMost or value.",
    "ルールの条件は、少なくとも1件・指定した種類のみ・件数が等しい・件数の下限・件数の上限・指定した値のいずれかを選択してください。"
  ],
  [
    "editing.refusal.rule_identity_required",
    "Name the rule by what it says: form, property, kind, filler and n.",
    "操作するルールを内容で特定できません。形式、対象の属性や関連、条件、相手の種類や値、件数の情報を指定してください。"
  ],
  [
    "editing.refusal.no_change",
    "That would change nothing.",
    "変更内容がありません。"
  ],
  [
    "editing.refusal.shapes_document",
    "Shapes live in shapes.ttl; run shape commands on the shapes document.",
    "検証ルールセットは検証文書（shapes.ttl）で編集してください。"
  ],
  [
    "editing.refusal.shape_missing",
    "There is no such shape in shapes.ttl.",
    "shapes.ttlに指定した検証ルールセットが見つかりません。"
  ],
  [
    "editing.refusal.rule_path_required",
    "A rule needs the attribute or relationship it is about.",
    "ルールの対象となる属性または関連を指定してください。"
  ],
  [
    "editing.refusal.rule_object_required",
    "A rule is an object: the path and what is checked on it.",
    "ルールには、対象の経路と確認する条件をまとめて指定してください。"
  ],
  [
    "editing.refusal.length_bounds_conflict",
    "The shortest length is longer than the longest; the rule could never be met.",
    "文字数の下限が上限を超えているため、このルールを満たせません。"
  ],
  [
    "editing.refusal.rule_check_required",
    "A rule needs at least one thing to check.",
    "ルールには少なくとも1つの確認条件を指定してください。"
  ],
  [
    "editing.refusal.shape_preset",
    "The preset is modelCheck, or none.",
    "プリセットは「モデルの確認」または「なし」を指定してください。"
  ],
  [
    "editing.refusal.shape_name_required",
    "A shape's name cannot be empty.",
    "検証ルールセットの名前は空にできません。"
  ],
  [
    "editing.refusal.shape_severity",
    "The severity is violation (a problem) or warning.",
    "検証結果の重大度は「問題」または「警告」を選択してください。"
  ],
  [
    "editing.refusal.shape_message_text",
    "A message is text.",
    "検証メッセージはテキストで指定してください。"
  ],
  [
    "editing.refusal.explicit_iri_required",
    "An IRI cannot be made from that name; give the IRI as well.",
    "この名前からIRIを生成できません。IRIも指定してください。"
  ],
  [
    "editing.refusal.relationship_value_iri",
    "A relationship's value is a thing, by its IRI.",
    "関連の値には、対象となるもののIRIを指定してください。"
  ],
  [
    "editing.refusal.rule_count_range",
    "A number of 0 to 1,000.",
    "件数は0から1,000までの整数で指定してください。"
  ],
  [
    "editing.refusal.rule_count_condition",
    "Only exactly, at least and at most take a number.",
    "件数を指定できるのは、件数が等しい・件数の下限・件数の上限の条件だけです。"
  ],
  [
    "editing.refusal.rule_value_required",
    "Choose the value.",
    "ルールで指定する値を選択してください。"
  ],
  [
    "editing.refusal.rule_defining_class",
    "Only the defining form (\"is exactly\") names a class with the rule.",
    "ルールとともに定義に含めるクラスを指定できるのは、定義の形式だけです。"
  ],
  [
    "editing.refusal.pattern_text",
    "A pattern is a regular expression.",
    "パターンには正規表現を指定してください。"
  ],
  [
    "editing.refusal.allowed_values_required",
    "List at least one allowed value.",
    "許容する値を少なくとも1つ指定してください。"
  ],
  [
    "editing.refusal.command_arguments_object",
    "A command's arguments are an object.",
    "操作の引数は、項目名と値の組み合わせで指定してください。"
  ],
  [
    "editing.refusal.dry_run_unavailable",
    "Only DeleteEntity and ShareDomain have a dry run.",
    "事前確認を利用できるのは、項目の削除と共有設定の操作だけです。"
  ],
  [
    "editing.refusal.recovery_choice",
    "Choose recover or discard.",
    "下書きを復元するか、破棄するかを選択してください。"
  ],
  [
    "editing.refusal.rule_target_class_required",
    "Choose the class it points to.",
    "ルールの対象となる関連の相手のクラスを選択してください。"
  ],
  [
    "editing.refusal.value_bounds_conflict",
    "The minimum is above the maximum; the rule could never be met.",
    "最小値が最大値を超えているため、このルールを満たせません。"
  ],
  [
    "editing.refusal.value_bounds_kind",
    "The minimum and the maximum must be the same kind of value.",
    "最小値と最大値は、同じ種類の値を指定してください。"
  ],
  [
    "editing.refusal.undo_unavailable",
    "There is nothing to undo.",
    "元に戻せる操作がありません。"
  ],
  [
    "editing.refusal.redo_unavailable",
    "There is nothing to redo.",
    "やり直せる操作がありません。"
  ]
])("renders a fixed refusal in both languages: %s", (code, english, japanese) => {
  const wire = { code, args: {} };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, english, tFor("en"))).toBe(english);
  expect(renderServerMessage(wire, english, tFor("ja"))).toBe(japanese);
});


it.each(["9007199254740993", "1" + "0".repeat(400)])("keeps the exact conflicting count %s in both locale explanations", low => {
  const wire = { code: "editing.guard.count_bounds_conflict", args: { low, high: "9007199254740992" } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "original detail", tFor("ja"))).toBe(`件数の下限${low}が上限9007199254740992を超えているため、このルールを満たせません。`);
  expect(renderServerMessage(wire, "original detail", tFor("en"))).toBe(`The minimum count ${low} is greater than the maximum count 9007199254740992; the rule could never be met.`);
});
