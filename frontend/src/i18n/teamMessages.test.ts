/*
================================================================================
FILE: frontend/src/i18n/teamMessages.test.ts
SUMMARY
    Team message contracts render in either locale without changing raw values.
BASIC IDEA
    Test finite server refusals and UI labels separately; keep domain error
    identifiers independent from the translated words shown at render time.
INPUTS / INPUT SOURCES
    Synthetic wire errors, literal account/history values, and day/night inputs.
EXPECTED OUTPUT
    Exact bilingual messages, strict argument validation and unchanged RDF/input.
================================================================================
*/
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ja } from "./ja";
import { translate } from "./format";
import { renderServerMessage, validWireMessage } from "./serverMessage";
import type { Translator, UiLocale } from "./types";
const translator = (locale: UiLocale) => ((code, args) => translate(locale, code, args)) as Translator;
const refusals = [
  {
    "code": "team.auth_required",
    "args": {},
    "en": "Sign in to open the team workspace.",
    "ja": "チームのワークスペースを開くにはログインしてください。"
  },
  {
    "code": "team.auth_expired",
    "args": {},
    "en": "Your session has expired. Sign in again. Your unsent input is kept.",
    "ja": "セッションの有効期限が切れました。再度ログインしてください。未送信の入力は保持されます。"
  },
  {
    "code": "team.auth_failed",
    "args": {},
    "en": "Sign-in failed. Try again or contact your administrator.",
    "ja": "ログインできませんでした。再試行するか、管理者にお問い合わせください。"
  },
  {
    "code": "team.config_unavailable",
    "args": {},
    "en": "Team sign-in is unavailable. Contact your administrator.",
    "ja": "チームのログインを利用できません。管理者にお問い合わせください。"
  },
  {
    "code": "team.forbidden",
    "args": {},
    "en": "Your role does not allow this action.",
    "ja": "現在の権限ではこの操作を実行できません。"
  },
  {
    "code": "team.csrf",
    "args": {},
    "en": "This request could not be verified. Reload the page and try again.",
    "ja": "要求を確認できませんでした。ページを再読み込みして、もう一度お試しください。"
  },
  {
    "code": "team.version_required",
    "args": {},
    "en": "Reload the latest version before making this change.",
    "ja": "この変更を行う前に最新版を読み込んでください。"
  },
  {
    "code": "team.revision_conflict",
    "args": {},
    "en": "Another member changed this item. Your input is kept. Load the latest version and review your changes.",
    "ja": "他のメンバーがこの項目を変更しました。入力は保持されています。最新版を読み込み、変更内容を確認してください。"
  },
  {
    "code": "team.request_mismatch",
    "args": {},
    "en": "This request ID was already used for different content. Reload and review your changes.",
    "ja": "この要求IDは別の内容に使用されています。再読み込みして変更内容を確認してください。"
  },
  {
    "code": "team.undo_forbidden",
    "args": {},
    "en": "This change cannot be undone because another member has made a change.",
    "ja": "他のメンバーの変更があるため取り消せません。"
  },
  {
    "code": "team.last_admin",
    "args": {},
    "en": "The last active administrator cannot be disabled or assigned another role.",
    "ja": "最後の有効な管理者は利用停止や権限変更ができません。"
  },
  {
    "code": "team.disabled",
    "args": {},
    "en": "Your account has been disabled. Contact your administrator.",
    "ja": "このアカウントは利用停止中です。管理者にお問い合わせください。"
  }
] as const;
const labels = [
  {
    "code": "team.stored",
    "args": {},
    "en": "Saved to the team",
    "ja": "チームに保存済み"
  },
  {
    "code": "team.history",
    "args": {},
    "en": "Change history",
    "ja": "変更履歴"
  },
  {
    "code": "team.history.empty",
    "args": {},
    "en": "No changes have been recorded.",
    "ja": "変更履歴はまだありません。"
  },
  {
    "code": "team.history.entry",
    "args": {
      "actor": "犬 <b>{value}</b>",
      "operation": "http://example.test/夜 @ja"
    },
    "en": "{actor}: {operation}",
    "ja": "{actor}：{operation}"
  },
  {
    "code": "team.history.beforeMigration",
    "args": {},
    "en": "Before migration",
    "ja": "移行前"
  },
  {
    "code": "team.role.viewer",
    "args": {},
    "en": "Viewer",
    "ja": "閲覧者"
  },
  {
    "code": "team.role.editor",
    "args": {},
    "en": "Editor",
    "ja": "編集者"
  },
  {
    "code": "team.role.admin",
    "args": {},
    "en": "Administrator",
    "ja": "管理者"
  },
  {
    "code": "team.login",
    "args": {},
    "en": "Sign in with Google",
    "ja": "Googleでログイン"
  },
  {
    "code": "team.logout",
    "args": {},
    "en": "Sign out",
    "ja": "ログアウト"
  },
  {
    "code": "team.account",
    "args": {},
    "en": "Account",
    "ja": "アカウント"
  },
  {
    "code": "team.account.name",
    "args": {
      "name": "犬 <b>{value}</b>"
    },
    "en": "Account: {name}",
    "ja": "アカウント：{name}"
  },
  {
    "code": "team.role",
    "args": {},
    "en": "Role",
    "ja": "権限"
  },
  {
    "code": "team.login.progress",
    "args": {},
    "en": "Signing in…",
    "ja": "ログイン中…"
  },
  {
    "code": "team.login.failure",
    "args": {},
    "en": "Sign-in failed. Please try again.",
    "ja": "ログインできませんでした。もう一度お試しください。"
  },
  {
    "code": "team.conflict.title",
    "args": {},
    "en": "This item has changed",
    "ja": "この項目は変更されています"
  },
  {
    "code": "team.conflict.reload",
    "args": {},
    "en": "Load the latest version",
    "ja": "最新版を読み込む"
  },
  {
    "code": "team.conflict.keepInput",
    "args": {},
    "en": "Keep my input",
    "ja": "入力を保持する"
  },
  {
    "code": "team.members",
    "args": {},
    "en": "Team members",
    "ja": "チームメンバー"
  },
  {
    "code": "team.members.setRole",
    "args": {},
    "en": "Change role",
    "ja": "権限を変更"
  },
  {
    "code": "team.members.disable",
    "args": {},
    "en": "Disable account",
    "ja": "利用停止"
  },
  {
    "code": "team.members.enable",
    "args": {},
    "en": "Enable account",
    "ja": "利用再開"
  }
];
describe("team message contracts", () => {
  it.each(refusals)("renders $code from its source metadata in either locale", ({ code, args, en: english, ja: japanese }) => {
    const wire = Object.freeze({ code, args: Object.freeze(args) });
    expect(validWireMessage(wire)).toBe(true);
    expect(renderServerMessage(wire, "unrelated English detail", translator("en"))).toBe(english);
    expect(renderServerMessage(wire, "unrelated English detail", translator("ja"))).toBe(japanese);
    expect(validWireMessage({ code, args: { unexpected: "secret" } })).toBe(false);
  });
  it.each(labels)("registers $code with exact bilingual placeholders", ({ code, args, en: english, ja: japanese }) => {
    expect(en[code as keyof typeof en]).toBe(english);
    expect(ja[code as keyof typeof ja]).toBe(japanese);
    const expectedArgs = Object.keys(args).sort();
    for (const template of [english, japanese]) {
      expect([...template.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()).toEqual(expectedArgs);
    }
  });
  it.each(["day", "night"])("keeps raw identity, RDF and pending input across UI languages in %s mode", theme => {
    const state = Object.freeze({ theme, user: "犬 <b>{name}</b>", sub: "google-sub-123",
      iri: "https://example.test/夜", language: "ja", turtle: '<https://example.test/夜> <https://example.test/p> "昼"@ja .',
      input: 'SELECT ?犬 WHERE { ?犬 ?p "夜"@ja }', errorCode: "revision_conflict",
      uiMessage: Object.freeze({ code: "team.revision_conflict", args: Object.freeze({}) }) });
    const original = JSON.stringify(state);
    expect(renderServerMessage(state.uiMessage, "", translator("ja"))).toContain("入力は保持されています");
    expect(renderServerMessage(state.uiMessage, "", translator("en"))).toContain("Your input is kept");
    expect(translate("ja", "team.account.name", { name: state.user })).toBe("アカウント：犬 <b>{name}</b>");
    expect(translate("en", "team.account.name", { name: state.user })).toBe("Account: 犬 <b>{name}</b>");
    const args = { actor: state.user, operation: state.iri + " @" + state.language };
    expect(translate("ja", "team.history.entry", args)).toBe(`犬 <b>{name}</b>：${state.iri} @ja`);
    expect(translate("en", "team.history.entry", args)).toBe(`犬 <b>{name}</b>: ${state.iri} @ja`);
    expect(JSON.stringify(state)).toBe(original);
  });
  it("does not classify errors by their final English text or accept domain codes as messages", () => {
    expect(validWireMessage({ code: "revision_conflict", args: {} })).toBe(false);
    expect(renderServerMessage(undefined, refusals[7].en, translator("ja"))).toBe(translate("ja", "common.error"));
  });
});
function typeContract(t: Translator) {
  t("team.login");
  t("team.history.entry", { actor: "犬", operation: "Changed label" });
  t("team.account.name", { name: "犬" });
  // @ts-expect-error history facts need both literal fields
  t("team.history.entry", { actor: "犬" });
  // @ts-expect-error roles take no untrusted interpolation arguments
  t("team.role.admin", { name: "犬" });
  // @ts-expect-error account names remain literal strings
  t("team.account.name", { name: 42 });
}
void typeContract;
