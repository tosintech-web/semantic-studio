/*
================================================================================
FILE: frontend/src/i18n/modelMessages.test.ts
SUMMARY
    Model refusals, warning groups and fix labels preserve facts in both locales.
BASIC IDEA
    Render each wire frame with distinct names and flat word tokens. English
    grammar stays in templates; literal Japanese names and braces stay data.
INPUTS / INPUT SOURCES
    Explicit model-message descriptors and expected Japanese/English sentences.
EXPECTED OUTPUT
    All frames resolve safely, including conjunction meaning and fix direction.
================================================================================
*/
import { expect, it } from "vitest";
import { translate } from "./format";
import { renderServerMessage, validWireMessage } from "./serverMessage";
import type { Translator, UiLocale } from "./types";
const tFor = (locale: UiLocale) => ((code, args) => translate(locale, code, args)) as Translator;

it.each([
  [
    {
      "code": "model.chain.counted_inverse",
      "args": {
        "name": "name 甲 <b>{opaque}",
        "source": "source 甲 <b>{opaque}"
      }
    },
    "A rule counts name 甲 <b>{opaque}, and its inverse source 甲 <b>{opaque} chains; OWL 2 does not allow counting name 甲 <b>{opaque} then.",
    "ルールが「name 甲 <b>{opaque}」の件数を数えていますが、その逆向きの関連「source 甲 <b>{opaque}」が推移するため、OWL 2ではこの件数指定は認められません。"
  ],
  [
    {
      "code": "model.chain.changed_under",
      "args": {
        "name": "name 甲 <b>{opaque}",
        "source": "source 甲 <b>{opaque}",
        "characteristic": [
          {
            "code": "words.characteristic.functional",
            "args": {}
          }
        ]
      }
    },
    "source 甲 <b>{opaque} chains and is below name 甲 <b>{opaque}, which is \"at most one\". OWL 2 does not permit this combination.",
    "「source 甲 <b>{opaque}」は推移し、その上位にある「name 甲 <b>{opaque}」には「最大1件」が指定されています。OWL 2ではこの組み合わせは認められません。"
  ],
  [
    {
      "code": "model.chain.changed_inverse",
      "args": {
        "name": "name 甲 <b>{opaque}",
        "source": "source 甲 <b>{opaque}",
        "characteristic": [
          {
            "code": "words.characteristic.functional",
            "args": {}
          }
        ]
      }
    },
    "source 甲 <b>{opaque} chains and its inverse name 甲 <b>{opaque} is \"at most one\". OWL 2 does not permit this combination.",
    "「source 甲 <b>{opaque}」は推移し、その逆向きの関連「name 甲 <b>{opaque}」には「最大1件」が指定されています。OWL 2ではこの組み合わせは認められません。"
  ],
  [
    {
      "code": "model.count.conflict",
      "args": {
        "name": "name 甲 <b>{opaque}",
        "property": "property 甲 <b>{opaque}",
        "low": 3,
        "high": 2
      }
    },
    "A rule on \"property 甲 <b>{opaque}\" for name 甲 <b>{opaque} cannot require at least 3 and at most 2 values.",
    "クラス「name 甲 <b>{opaque}」の「property 甲 <b>{opaque}」に、下限3件と上限2件を同時に設定することはできません。"
  ],
  [
    {
      "code": "model.loop.broader",
      "args": {
        "name": "name 甲 <b>{opaque}"
      }
    },
    "That would make name 甲 <b>{opaque} narrower than itself.",
    "「name 甲 <b>{opaque}」が自分自身の下位概念になるため、この変更はできません。"
  ],
  [
    {
      "code": "model.related.broader",
      "args": {
        "narrow": "narrow 甲 <b>{opaque}",
        "broad": "broad 甲 <b>{opaque}"
      }
    },
    "narrow 甲 <b>{opaque} is already narrower than broad 甲 <b>{opaque}; SKOS does not allow them to be related as well.",
    "「narrow 甲 <b>{opaque}」はすでに「broad 甲 <b>{opaque}」の下位概念です。SKOSでは、この2つに関連関係を同時に指定できません。"
  ],
  [
    {
      "code": "model.class.disjoint_equivalent",
      "args": {
        "first": "first 甲 <b>{opaque}",
        "second": "second 甲 <b>{opaque}"
      }
    },
    "first 甲 <b>{opaque} cannot be disjoint with second 甲 <b>{opaque} and mean the same as it.",
    "「first 甲 <b>{opaque}」と「second 甲 <b>{opaque}」は同じ意味のクラスなので、互いに重ならないとは指定できません。"
  ],
  [
    {
      "code": "model.members.both",
      "args": {
        "name": "name 甲 <b>{opaque}",
        "first": "first 甲 <b>{opaque}",
        "second": "second 甲 <b>{opaque}"
      }
    },
    "name 甲 <b>{opaque} cannot have members because it is a subclass of both disjoint classes first 甲 <b>{opaque} and second 甲 <b>{opaque}.",
    "クラス「name 甲 <b>{opaque}」は、互いに重ならないクラス「first 甲 <b>{opaque}」と「second 甲 <b>{opaque}」の両方の下位クラスなので、メンバーを持てません。"
  ],
  [
    {
      "code": "model.warning.domain.relationship",
      "args": {
        "name": "name 甲 <b>{opaque}",
        "classes": [
          {
            "text": "甲 <b>{opaque}"
          },
          {
            "code": "words.list.and",
            "args": {}
          },
          {
            "text": "乙 {opaque}"
          }
        ]
      }
    },
    "Separate domains 甲 <b>{opaque} and 乙 {opaque} on name 甲 <b>{opaque} mean each subject of this relationship is in all of those classes in RDFS and OWL. Use sharing to mean either one.",
    "「name 甲 <b>{opaque}」の所属先が甲 <b>{opaque}と乙 {opaque}として別々に指定されています。RDFSとOWLでは、この関連の始点となるものはそれらすべてのクラスに属するという意味になります。少なくとも1つのクラスに属することを表す場合は共有設定を使ってください。"
  ]
])("renders model facts in either language: %j", (wire, english, japanese) => {
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "Legacy detail", tFor("en"))).toBe(english);
  expect(renderServerMessage(wire, "Legacy detail", tFor("ja"))).toBe(japanese);
});
