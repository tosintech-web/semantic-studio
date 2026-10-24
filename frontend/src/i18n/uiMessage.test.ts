/*
================================================================================
FILE: frontend/src/i18n/uiMessage.test.ts
SUMMARY
    Internal notices preserve exact code/argument types as catalogs grow.
BASIC IDEA
    A literal producer returns its own descriptor; a UI state may widen that to
    the full union. This avoids multiplying the entire union at each conditional.
INPUTS / INPUT SOURCES
    Typed synthetic notices and the real ja/en translator.
EXPECTED OUTPUT
    Original facts rendered in the current language, with compiler-checked types.
================================================================================
*/
import { expect, it } from "vitest";
import { makeUiMessage, renderUiMessage } from "./uiMessage";
import { translate } from "./format";
import type { Translator } from "./types";
it("keeps raw facts and translates the same descriptor at render time", () => {
  const notice = makeUiMessage("load.success", { name: "犬" });
  const ja = ((code, args) => translate("ja", code, args)) as Translator;
  const en = ((code, args) => translate("en", code, args)) as Translator;
  expect(notice).toEqual({ code: "load.success", args: { name: "犬" } });
  expect(renderUiMessage(notice, ja)).toBe("「犬」を読み込みました。");
  expect(renderUiMessage(notice, en)).toBe('Loaded “犬”.');
});
// The production TypeScript build checks these without running them.
function exactProducerContract() {
  const notice = makeUiMessage("load.success", { name: "犬" });
  const code: "load.success" = notice.code;
  const name: string = notice.args.name;
  // @ts-expect-error this exact message has no count argument
  const count = notice.args.count;
  // @ts-expect-error the producer still checks the argument's type
  makeUiMessage("load.success", { name: 3 });
  return { code, name, count };
}
void exactProducerContract;
