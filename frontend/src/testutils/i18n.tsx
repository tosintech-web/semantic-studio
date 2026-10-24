/*
================================================================================
FILE: frontend/src/testutils/i18n.tsx
SUMMARY
    Explicit English UI context for the pre-existing component test fixtures.
BASIC IDEA
    Keep legacy text assertions independent of the application's Japanese default.
    Actual language-switch tests mount their own inner I18nProvider.
INPUTS / INPUT SOURCES
    React test content and Testing Library render options.
EXPECTED OUTPUT
    The ordinary render result under a stable, explicitly chosen English locale.
================================================================================
*/
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import { I18nContext, type I18nValue } from "../i18n/I18nProvider";
import { translate } from "../i18n/format";
import type { Translator } from "../i18n/types";
const t = ((code, args) => translate("en", code, args)) as Translator;
const englishContext: I18nValue = { locale: "en", setLocale() {}, t };
function English({ children }: { children: ReactNode }) {
  return <I18nContext.Provider value={englishContext}>{children}</I18nContext.Provider>;
}
export function renderEn(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options, wrapper: English });
}
