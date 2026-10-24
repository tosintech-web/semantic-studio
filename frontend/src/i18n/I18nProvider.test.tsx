// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/i18n/I18nProvider.test.tsx
SUMMARY
    Checks persistent UI locale independently of ontology data.
BASIC IDEA
    Drive a consumer through state transitions and real browser storage errors.
INPUTS / INPUT SOURCES
    localStorage, simulated change actions.
EXPECTED OUTPUT
    Japanese default, English restoration, usable selection when storage fails.
================================================================================
*/
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { I18nProvider, useI18n } from "./I18nProvider";

function Consumer() {
  const { locale, setLocale, t } = useI18n();
  return <><output>{locale}</output><span>{t("nav.home")}</span><button onClick={() => setLocale("en")}>English</button></>;
}
const mount = () => render(<I18nProvider><Consumer /></I18nProvider>);
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("defaults_to_ja_and_updates_document_lang", () => {
  mount();
  expect(screen.getByText("ホーム")).toBeTruthy();
  expect(document.documentElement.lang).toBe("ja");
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("Home")).toBeTruthy();
  expect(document.documentElement.lang).toBe("en");
});
it("restores_en_after_remount", () => {
  const first = mount();
  fireEvent.click(screen.getByRole("button"));
  first.unmount();
  mount();
  expect(screen.getByText("Home")).toBeTruthy();
  expect(localStorage.getItem("semantic-studio.uiLocale.v1")).toBe("en");
});
it("invalid_or_unreadable_storage_defaults_to_ja", () => {
  localStorage.setItem("semantic-studio.uiLocale.v1", "__proto__");
  const first = mount();
  expect(screen.getByText("ホーム")).toBeTruthy();
  first.unmount();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
  mount();
  expect(screen.getByText("ホーム")).toBeTruthy();
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("Home")).toBeTruthy();
});
