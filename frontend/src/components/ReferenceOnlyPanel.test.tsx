// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/ReferenceOnlyPanel.test.tsx
SUMMARY
    Full reference identifiers and explicit clipboard feedback.
BASIC IDEA
    Operate the read-only panel through its visible buttons.
INPUTS / INPUT SOURCES
    A long IRI and clipboard success/failure at the browser boundary.
EXPECTED OUTPUT
    No edit form, intact clipboard value and polite result text.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ReferenceOnlyPanel from "./ReferenceOnlyPanel";
afterEach(cleanup);
it("copies the complete identifier and reports success in words", async () => {
  const iri = "https://example.org/" + "犬".repeat(500); const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } });
  const close = vi.fn(); render(<ReferenceOnlyPanel iri={iri} onClose={close} />);
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Reference only" }));
  expect(screen.getByText(iri).textContent).toBe(iri); expect(screen.queryByRole("textbox")).toBeNull();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy full IRI" })); });
  expect(copy).toHaveBeenCalledWith(iri); expect(screen.getByRole("status").textContent).toBe("IRI copied.");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(close).toHaveBeenCalledOnce();
});
it("explains a failed or unavailable clipboard without throwing", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  render(<ReferenceOnlyPanel iri="https://example.org/ref" onClose={vi.fn()} />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy full IRI" })); });
  expect(screen.getByRole("status").textContent).toBe("The operation could not be completed. Check the details.");
});
