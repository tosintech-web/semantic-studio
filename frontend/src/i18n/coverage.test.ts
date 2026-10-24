/*
================================================================================
FILE: frontend/src/i18n/coverage.test.ts
SUMMARY
    Checks the P1 message inventory against real sources and message contracts.
BASIC IDEA
    Parse TypeScript literals, including Unicode, instead of searching escaped
    source fragments. The inventory must name every Task 10 path and every
    catalog entry with the arguments from its independent type contract.
INPUTS / INPUT SOURCES
    Production TypeScript, the inventory Markdown, ja/en and server contracts.
EXPECTED OUTPUT
    Missing paths, undocumented uses, unknown keys and argument drift fail.
================================================================================
*/
import { describe, expect, it } from "vitest";
import ts from "typescript";
import inventory from "../../../docs/i18n-message-inventory.md?raw";
import { en } from "./en";
import { ja } from "./ja";
import { SERVER_CONTRACTS } from "./server-contracts";

const sources = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const production = Object.entries(sources).filter(([path]) => !/\.test\.|\.d\.ts$|\/testutils\//.test(path));
const paths = ["App.tsx", ...[
  "HomeScreen", "OntologyCard", "ProjectsSection", "NewProjectDialog", "ProjectHeader", "LoadDialog",
  "CatalogueList", "ConfirmDialog", "AboutPanel", "NetworkPanel", "NetworkApprovalDialog", "ImportsPanel",
  "SourceView", "TurtleEditor", "GraphNotice", "Legend",
].map(name => `components/${name}.tsx`), "loadWords.ts", "networkWords.ts", "statusWords.ts", "removalPrompt.ts", "projects/form.ts"];
const rows = inventory.split("\n").filter(line => /^\| `/.test(line)).map(line => line.split("|").slice(1, -1).map(cell => cell.trim()));
const codeRows = rows.filter(row => !row[0].includes("/"));
const documented = new Map(codeRows.map(row => [row[0].slice(1, -1), row]));
const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]))].sort();
function parse(path: string, source: string) {
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

describe("P1 message inventory", () => {
  it("covers every common screen and helper in Task 10 with an existing source path", () => {
    const scoped = rows.filter(row => row[2] === "10").map(row => row[0].slice(1, -1));
    for (const path of paths) expect(scoped, path).toContain(`frontend/src/${path}`);
    for (const path of scoped) expect(sources[path.replace("frontend/", "/")], path).toBeTruthy();
    for (const row of codeRows) {
      for (const match of row[2].matchAll(/`(frontend\/src\/[^`]+)`/g)) {
        expect(sources[match[1].replace("frontend/", "/")], match[1]).toBeTruthy();
      }
    }
  });

  it("documents exactly the registered keys and their type-contracted placeholders", () => {
    expect(codeRows.length).toBe(documented.size);
    expect([...documented.keys()].sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
    const contracts = new Map<string, string[]>(Object.entries(SERVER_CONTRACTS).map(([key, args]) => [key, Object.keys(args).sort()]));
    const source = sources["/src/i18n/types.ts"];
    expect(source).toContain("interface MessageArgs");
    const tree = parse("types.ts", source);
    for (const node of tree.statements) {
      if (!ts.isInterfaceDeclaration(node) || node.name.text !== "MessageArgs") continue;
      for (const member of node.members) {
        if (!ts.isPropertySignature(member) || !member.name || !ts.isStringLiteral(member.name)) continue;
        const args = member.type && ts.isTypeLiteralNode(member.type)
          ? member.type.members.flatMap(arg => ts.isPropertySignature(arg) && arg.name ? [arg.name.getText(tree)] : []) : [];
        contracts.set(member.name.text, args.sort());
      }
    }
    expect([...contracts.keys()].sort()).toEqual(Object.keys(en).sort());
    for (const [code, args] of contracts) {
      const row = documented.get(code);
      expect(row, code).toBeDefined();
      expect(row![1] === "—" ? [] : row![1].split(", ").sort(), code).toEqual(args);
      expect(placeholders(en[code as keyof typeof en]), code).toEqual(args);
      expect(placeholders(ja[code as keyof typeof ja]), code).toEqual(args);
    }
  });

  it("records source paths for literal message uses and rejects unknown direct calls", () => {
    for (const [path, source] of production) {
      if (/\/i18n\/(en|ja|types|server-contracts)\.ts$/.test(path)) continue;
      const fullPath = `frontend${path}`;
      const visit = (node: ts.Node) => {
        if (ts.isStringLiteral(node) && Object.prototype.hasOwnProperty.call(en, node.text)) {
          expect(documented.get(node.text)?.[2], `${fullPath}: ${node.text}`).toContain(`\`${fullPath}\``);
        }
        if (ts.isCallExpression(node) && ["t", "makeUiMessage"].includes(node.expression.getText()) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          expect(Object.prototype.hasOwnProperty.call(en, node.arguments[0].text), `${fullPath}: ${node.arguments[0].text}`).toBe(true);
        }
        ts.forEachChild(node, visit);
      };
      visit(parse(path, source));
    }
  });
});
