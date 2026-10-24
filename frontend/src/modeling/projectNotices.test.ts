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
    Localized known labels and unchanged legacy labels for unsupported metadata.
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
