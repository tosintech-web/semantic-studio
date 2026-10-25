// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/canvas/CanvasAids.test.tsx
SUMMARY
    Canvas legend, keyboard help and first-use guidance in both UI languages.
BASIC IDEA
    Switch language while help is open and after dismissing the tip. The same
    controls keep their state, markers and focus destination.
INPUTS / INPUT SOURCES
    Actual locale provider, synthetic line kinds and isolated browser storage.
EXPECTED OUTPUT
    Current-language guidance without reopening help or dismissed tips.
================================================================================
*/
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "../components/UiLanguageSelect";
import { Legend, TipCard, TIP_KEY } from "./CanvasAids";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

it("keeps keyboard help open and the same markers when switching language", () => {
  render(<I18nProvider><UiLanguageSelect /><Legend lines={["kindof", "relationship", "broader", "related", "inferred", "rule"]} /></I18nProvider>);
  const list = screen.getByRole("list", { name: "線の意味" });
  expect(within(list).getAllByRole("listitem").map(item => item.textContent)).toEqual(["下位クラス", "関係", "上位概念", "関連概念", "推論結果", "ルール"]);
  const paths = [...list.querySelectorAll("path")];
  const markers = paths.map(path => path.getAttribute("marker-end"));
  const help = screen.getByRole("button", { name: "キーボード操作のヘルプ" });
  help.focus();
  fireEvent.click(help);
  const dialog = screen.getByRole("dialog", { name: "キーボード操作と線の意味" });
  expect(dialog.textContent).toContain("Shift+F10");
  expect(dialog.textContent).toContain("ファイルには保存されません");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("dialog", { name: "Keyboard and lines" })).toBe(dialog);
  expect(dialog.textContent).toContain("A dashed line is inferred");
  expect([...list.querySelectorAll("path")]).toEqual(paths);
  expect(paths.map(path => path.getAttribute("marker-end"))).toEqual(markers);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(help);
});

it.each(["Class", "Concept"] as const)("keeps the %s tip dismissed and returns focus to its canvas", word => {
  render(<I18nProvider><UiLanguageSelect /><div className="model-canvas" tabIndex={-1}><TipCard word={word} /></div></I18nProvider>);
  const tip = screen.getByRole("region", { name: "3つのドラッグ操作" });
  expect(tip.textContent).toContain(word === "Class" ? "クラスをキャンバス" : "概念をキャンバス");
  expect(tip.textContent).toContain(word === "Class" ? "下位クラス" : "下位概念");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("region", { name: "Three drags" })).toBe(tip);
  expect(tip.textContent).toContain(`Drag ${word} onto the canvas`);
  fireEvent.click(within(tip).getByRole("button", { name: "Got it" }));
  expect(document.activeElement).toBe(document.querySelector(".model-canvas"));
  expect(localStorage.getItem(TIP_KEY)).toBe("dismissed");
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  expect(screen.queryByRole("region")).toBeNull();
});
