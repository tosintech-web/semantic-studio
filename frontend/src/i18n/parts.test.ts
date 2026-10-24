/*
================================================================================
FILE: frontend/src/i18n/parts.test.ts
SUMMARY
    Rich message templates preserve linked entities independently of word order.
BASIC IDEA
    Only catalog placeholders are parsed. User values can contain markup,
    braces, repeated names or the old control markers without becoming syntax.
INPUTS / INPUT SOURCES
    Real ja/en messages and synthetic linked names/IRIs.
EXPECTED OUTPUT
    Plain text and original reference objects, with safe malformed-input fallback.
================================================================================
*/
import { describe, expect, it } from "vitest";
import { translateParts, type MessagePart, type PartArgs } from "./parts";
const text = (parts: MessagePart[]) => parts.map(part => typeof part === "string" ? part : part.label).join("");

describe("linked message templates", () => {
  it("orders the original references using the current language's template", () => {
    const child = { iri: "https://example.org/child", label: "<b>犬{parent}\u0001</b>" };
    const parent = { iri: "https://example.org/parent", label: "Animal" };
    const en = translateParts("en", "sentence.parent", { child, parent });
    const ja = translateParts("ja", "sentence.parent", { child, parent });
    expect(text(en)).toBe("<b>犬{parent}\u0001</b> is a more specific kind of Animal");
    expect(text(ja)).toBe("Animalより具体的な種類が<b>犬{parent}\u0001</b>です");
    expect(en.filter(part => typeof part !== "string")).toEqual([child, parent]);
    const refs = ja.filter(part => typeof part !== "string");
    expect(refs[0]).toBe(parent);
    expect(refs[1]).toBe(child);
  });

  it("keeps a sequence of linked parents and repeated placeholders intact", () => {
    const first = { iri: "https://example.org/a", label: "同じ名前" };
    const second = { iri: "https://example.org/b", label: "同じ名前" };
    const parents: readonly MessagePart[] = [first, "・", second];
    const parts = translateParts("ja", "sentence.parent", { child: "子", parent: parents });
    expect(parts.filter(part => typeof part !== "string")).toEqual([first, second]);
    expect(text(parts)).toBe("同じ名前・同じ名前より具体的な種類が子です");
    const repeated = translateParts("ja", "imports.mismatch", { declared: "別のIRI", iri: first });
    expect(repeated.filter(part => part === first)).toHaveLength(2);
  });

  it("uses own arguments and rejects malformed references without leaking template markers", () => {
    const inherited = Object.create({ child: "Child", parent: "Parent" }) as PartArgs<"sentence.parent">;
    expect(translateParts("ja", "sentence.parent", inherited)).toEqual(["操作を完了できませんでした。詳細を確認してください。"]);
    const invalid = { child: "Child", parent: { label: "Missing IRI" } } as unknown as PartArgs<"sentence.parent">;
    expect(translateParts("en", "sentence.parent", invalid)).toEqual(["The operation could not be completed. Check the details."]);
    expect(translateParts("ja", "constructor" as "sentence.parent", { child: "Child", parent: "Parent" })).toEqual(["操作を完了できませんでした。詳細を確認してください。"]);
  });
});

// Compile-time checks also run in the production TypeScript build.
function partContracts() {
  translateParts("ja", "sentence.parent", { child: "犬", parent: { iri: "https://example.org/animal", label: "動物" } });
  translateParts("en", "nav.home");
  // @ts-expect-error both names are required
  translateParts("ja", "sentence.parent", { child: "犬" });
  // @ts-expect-error a numeric placeholder does not accept a linked reference
  translateParts("ja", "results.cap", { count: { iri: "https://example.org/count", label: "3" } });
  // @ts-expect-error a label without an IRI is not a reference
  translateParts("ja", "sentence.parent", { child: "犬", parent: { label: "動物" } });
}
void partContracts;
