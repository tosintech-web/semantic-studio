/*
================================================================================
FILE: frontend/src/i18n/types.ts
SUMMARY
    Types for UI locale and complete message arguments.
BASIC IDEA
    Keep interface language independent from RDF language and project values.
INPUTS / INPUT SOURCES
    Stable message identifiers and primitive interpolation arguments.
EXPECTED OUTPUT
    Compile-time checking of message calls, including required arguments.
================================================================================
*/

import type { ServerMessageArgs } from "./server-contracts";
export type UiLocale = "ja" | "en";
export type Primitive = string | number | boolean | null;
export interface MessageArgs extends ServerMessageArgs {
  "common.details": undefined;
  "network.panel.close": undefined;
  "network.panel.title": undefined;
  "network.panel.loading": undefined;
  "network.panel.connections": undefined;
  "network.panel.offline": undefined;
  "network.panel.offlineState": undefined;
  "network.panel.onlineState": undefined;
  "network.panel.offlineNotice": undefined;
  "network.panel.onlineNotice": undefined;
  "network.panel.sites": undefined;
  "network.panel.emptySites": undefined;
  "network.panel.allowed": undefined;
  "network.panel.blockedState": undefined;
  "network.panel.revoke": undefined;
  "network.panel.recent": undefined;
  "network.panel.emptyActivity": undefined;
  "network.panel.plain": undefined;
  "network.panel.revokeName": { host: string; purpose: string };
  "network.panel.revoked": { host: string };
  "network.panel.bytes": { count: number };
  "network.approval.why": undefined;
  "network.approval.sent": undefined;
  "network.approval.sees": undefined;
  "network.approval.addressInfo": undefined;
  "network.approval.address": undefined;
  "network.approval.encryption": undefined;
  "network.approval.plain": undefined;
  "network.approval.explain": undefined;
  "network.approval.whyFirst": undefined;
  "network.approval.whySecond": undefined;
  "network.approval.duration": undefined;
  "network.approval.once": undefined;
  "network.approval.site": undefined;
  "network.approval.sites": undefined;
  "network.approval.hint": undefined;
  "network.approval.decline": undefined;
  "network.approval.allow": undefined;
  "network.approval.queryText": undefined;
  "network.approval.serviceNothingElse": undefined;
  "network.approval.headingOne": { hosts: string };
  "network.approval.headingMany": { hosts: string };
  "network.approval.queryAt": { url: string };
  "network.approval.always": { purpose: string; sites: string };

  "network.unreachable": undefined;
  "network.always.fetch": undefined;
  "network.always.import": undefined;
  "network.always.context": undefined;
  "network.always.service": undefined;
  "network.always.other": undefined;
  "network.purpose.fetch": undefined;
  "network.purpose.import": undefined;
  "network.purpose.context": undefined;
  "network.purpose.service": undefined;
  "network.purpose.other": undefined;
  "network.outcome.ok": undefined;
  "network.outcome.http-error": undefined;
  "network.outcome.redirect": undefined;
  "network.outcome.failed": undefined;
  "network.outcome.refused": undefined;
  "network.outcome.blocked": undefined;
  "network.outcome.asked": undefined;
  "network.outcome.offline": undefined;
  "network.outcome.too-large": undefined;
  "network.outcome.other": undefined;

  "common.quote": { value: string };
  "common.listSeparator": undefined;
  "status.empty": undefined;
  "status.projects.one": { count: number };
  "status.projects.many": { count: number };
  "status.library.one": { count: number };
  "status.library.many": { count: number };
  "status.both.one_one": { projects: number; ontologies: number };
  "status.both.one_many": { projects: number; ontologies: number };
  "status.both.many_one": { projects: number; ontologies: number };
  "status.both.many_many": { projects: number; ontologies: number };
  "status.statements.one": { count: number };
  "status.statements.many": { count: number };
  "remove.unknown": { name: string };
  "remove.zero": { name: string };
  "remove.count.one": { name: string; count: number };
  "remove.named.one": { name: string; count: number; names: string };
  "remove.done.one": { name: string; count: number };
  "remove.count.many": { name: string; count: number };
  "remove.named.many": { name: string; count: number; names: string };
  "remove.done.many": { name: string; count: number };
  "load.sending": { name: string; sent: string; total: string; unit: string };
  "load.downloading.one": { elapsed: number };
  "load.still.one": { elapsed: number };
  "load.reading.one": { name: string; size: string; elapsed: number };
  "load.expected.one": { name: string; size: string; elapsed: number; expected: number };
  "load.downloading.many": { elapsed: number };
  "load.still.many": { elapsed: number };
  "load.reading.many": { name: string; size: string; elapsed: number };
  "load.expected.many": { name: string; size: string; elapsed: number; expected: number };
  "load.announce.sending": { name: string };
  "load.announce.reading": { name: string };
  "load.announce.still": { name: string };
  "load.announce.downloading": undefined;
  "load.stopped": undefined;
  "load.tooLate": undefined;

  "about.close": undefined;
  "about.purpose": undefined;
  "about.description": undefined;
  "about.modified": undefined;
  "about.source": undefined;
  "about.scope": undefined;
  "about.notices": undefined;
  "about.author": { name: string };
  "about.upstream": undefined;
  "about.privacy": undefined;
  "about.privacyDetail": undefined;
  "about.issues": undefined;

  "kind.class": undefined;
  "kind.objectProperty": undefined;
  "kind.datatypeProperty": undefined;
  "kind.annotationProperty": undefined;
  "kind.property": undefined;
  "kind.concept": undefined;
  "kind.conceptScheme": undefined;
  "kind.collection": undefined;
  "kind.individual": undefined;
  "kind.ontology": undefined;
  "kind.other": undefined;

  "common.retry": undefined;
  "entities.filter": undefined;
  "entities.kind": undefined;
  "entities.sort": undefined;
  "entities.sortLabel": undefined;
  "entities.sortIri": undefined;
  "entities.all": undefined;
  "entities.concept": undefined;
  "entities.individual": undefined;
  "entities.class": undefined;
  "entities.properties": undefined;
  "entities.other": undefined;
  "entities.label": undefined;
  "entities.iri": undefined;
  "entities.description": undefined;
  "entities.reference": undefined;
  "entities.undefined": undefined;
  "entities.copy": undefined;
  "entities.copied": undefined;
  "entities.range": { start: number; end: number; total: number };
  "entities.previous": undefined;
  "entities.next": undefined;
  "entities.empty": undefined;
  "entities.updating": undefined;
  "entities.truncated": undefined;
  "entities.fallback": { language: string };
  "dictionary.readonly": undefined;
  "dictionary.editing": undefined;
  "dictionary.saved": undefined;
  "dictionary.dirty": undefined;
  "dictionary.saving": undefined;
  "dictionary.saveError": undefined;

  "common.cancel": undefined;
  "search.prompt": undefined;
  "search.queryPrompt": undefined;
  "search.results": undefined;
  "search.loading": undefined;
  "search.one": undefined;
  "search.none": undefined;
  "search.count": { count: number };
  "search.more": { count: number };
  "search.narrow": { count: number };
  "search.showAll": undefined;
  "search.undrawn": undefined;
  "search.undrawnTitle": undefined;
  "search.from": { name: string };
  "search.importNone": undefined;
  "match.name": { value: string };
  "match.alias": { value: string };
  "match.reading": { value: string };
  "match.search": { value: string };
  "match.identifier": { value: string };

  "nav.home": undefined;
  "nav.view": undefined;
  "nav.explore": undefined;
  "nav.edit": undefined;
  "nav.query": undefined;
  "nav.shapes": undefined;
  "nav.entities": undefined;
  "ui.language": undefined;
  "dictionary.language": undefined;
  "dictionary.apply": undefined;
  "dictionary.invalidLanguage": undefined;
  "common.error": undefined;
  "common.notSet": undefined;
  "crash.title": undefined;
  "crash.description": undefined;
  "crash.reload": undefined;
  "load.success": { name: string };
}
export type MessageId = keyof MessageArgs;
export type Catalog = { [K in MessageId]: string };
export type Translator = <K extends MessageId>(code: K, ...args: MessageArgs[K] extends undefined ? [] : [args: MessageArgs[K]]) => string;
