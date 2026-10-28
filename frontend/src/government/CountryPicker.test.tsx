// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/CountryPicker.test.tsx
SUMMARY
    Checks bounded country search and explicit, owner-bound reference selection.
BASIC IDEA
    Deferred API replies prove old projects cannot replace current choices.
INPUTS / INPUT SOURCES
    Complete synthetic country pages and manually resolved API promises.
EXPECTED OUTPUT
    Search, pagination and reselection preserve the exact selected authority.
================================================================================
*/
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderEn as render } from "../testutils/i18n";
import CountryPicker from "./CountryPicker";
import type { CountryPage } from "./types";

const { getCountryChoices } = vi.hoisted(() => ({ getCountryChoices: vi.fn() }));
vi.mock("../api", () => ({ getCountryChoices }));
const basis = { sourceProjectId: "prj-111111111111", sourceToken: "token-a" };
const page: CountryPage = { items: [
  { iri: "urn:country:a", label: "Same name", code: "A" },
  { iri: "urn:country:b", label: "Same name", code: "B" },
], total: 251, offset: 0, limit: 50, basis };

beforeEach(() => getCountryChoices.mockReset().mockResolvedValue(page));
afterEach(cleanup);

it("selects a same-name country by IRI and exact source basis", async () => {
  const onChange = vi.fn();
  render(<CountryPicker projectId="prj-222222222222" value="" onChange={onChange} busy={false} />);
  const choice = await screen.findByRole("combobox", { name: "Choose country" });
  expect(screen.getByRole("option", { name: /Same name.*A.*urn:country:a/ })).toBeTruthy();
  fireEvent.change(choice, { target: { value: "urn:country:b" } });
  expect(onChange).toHaveBeenCalledWith({ iri: "urn:country:b", basis });
  // The same IRI can be selected again after refreshing an old source basis.
  fireEvent.change(choice, { target: { value: "urn:country:b" } });
  expect(onChange).toHaveBeenCalledTimes(2);
});

it("searches and reaches the final page with complete counts", async () => {
  render(<CountryPicker projectId="prj-222222222222" value="" onChange={vi.fn()} busy={false} />);
  await screen.findByRole("combobox", { name: "Choose country" });
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await act(async () => {});
  expect(getCountryChoices.mock.lastCall?.[1].offset).toBe(50);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search countries" }), { target: { value: "SYN" } });
  await act(async () => {});
  expect(getCountryChoices.mock.lastCall?.[1]).toMatchObject({ query: "SYN", offset: 0 });
  expect(screen.getByText(/251/)).toBeTruthy();
});

it("discards a delayed reply from the previous project", async () => {
  let resolve!: (value: CountryPage) => void;
  getCountryChoices.mockReturnValueOnce(new Promise<CountryPage>(done => { resolve = done; }));
  const view = render(<CountryPicker projectId="prj-222222222222" value="" onChange={vi.fn()} busy={false} />);
  view.rerender(<CountryPicker projectId="prj-333333333333" value="" onChange={vi.fn()} busy={false} />);
  await screen.findByRole("option", { name: /urn:country:b/ });
  await act(async () => resolve({ ...page, items: [{ iri: "urn:old", label: "Stale country", code: null }] }));
  expect(screen.queryByText(/Stale country/)).toBeNull();
});

it("shows a recoverable source failure without clearing the selected IRI", async () => {
  getCountryChoices.mockRejectedValueOnce(new Error("Disconnected country group"));
  const onChange = vi.fn();
  render(<CountryPicker projectId="prj-222222222222" value="urn:country:kept" onChange={onChange} busy={false} />);
  await screen.findByRole("alert");
  expect(screen.getByText(/urn:country:kept/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("combobox", { name: "Choose country" });
  expect(onChange).not.toHaveBeenCalled();
});
