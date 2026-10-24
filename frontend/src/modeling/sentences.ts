/*
================================================================================
FILE: frontend/src/modeling/sentences.ts
================================================================================

SUMMARY
    The sentences a relationship is read as (relationships 5.2, 5.3, 5.5):
    *A Person works for an Organization.* while it is being named, *Person is
    a kind of Organization* in the relate menu, *Employee is a kind of
    Person* in the link panel, the announcement once one is created, a
    tree row's ends, *Person → Organization* or *Person, text*, and the one
    line that says a project holds content of its other kind (5.1).

    Stage B's forms read back the same way (5.6 to 5.8): the relationship's
    sentence with *(no start yet)* or *(no end yet)* where an end is
    missing, its other way round, each characteristic's example written with
    the relationship's own names, its more general relationship, the
    attribute's sentence and *one value only*, a concept's related line, and
    what each kind of mapping means.

    attribute-reuse 5.1, 5.2 and 5.4 read the same way: a suggestion under
    the name (*hasName, an attribute of Employee (text).*), each case of the
    reuse plan in the person's names, what a union means (*whatever has
    hasName is an Employee or a Contractor*), the shared parent's question,
    who else gains a property moved up, the canvas's *Share* entry and its
    two-way Delete question, and what the live region says after.

    And the two grammar rules every sentence shares (X-12, T-18, T-19): *a*
    or *an* before a name, and a relationship's label read as a verb, after
    a subject or after *must*. backend/app/sentences.py holds the same two,
    and both sides are tested with one table (sentences.table.json); no
    other module may define its own (sentences.test.ts scans for one).

BASIC IDEA
    Every relationship reads as a sentence, before and after it is created
    (Section 7), so the sentence is built in one place and tested without
    drawing anything. *an* goes before a vowel sound, judged from the first
    word: a vowel letter, except words starting *uni*, *use*, *usu*, *eu*,
    *one* or *once*; words starting *hour*, *honest*, *honor* or *heir*; and
    a word in capitals, read letter by letter, whose first letter's name
    starts with a vowel sound (*an XML file*, *a URL*). Four copies chose by
    the first letter alone and wrote *an University*.

    A label is a verb when its first word is one (*is*, *has*, *can*) or ends
    in a single *s* (*uses*); one ending in a preposition or starting with a
    participle reads after *is* or *be* (*part of*, *located in*); a bare
    noun (*holder*) is left as written. No article is guessed before a label:
    *Ann is member of Team A* stays. A name is used exactly as written;
    nothing here reads ontology text as markup or as a pattern.

INPUTS / INPUT SOURCES
    - Names: a class's, a concept's, a relationship's, already chosen in the
      display language by the server; null for an end not set yet.

EXPECTED OUTPUT
    - Strings.
================================================================================
*/

import { englishTranslator, translate } from "../i18n/format";
import type { MessageId, Translator, UiLocale } from "../i18n/types";

// Grammar belongs here, not in form components. Other UI languages receive
// untouched names, never the English a/an or verb transformation.
const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;
const articleName = (name: string, locale: UiLocale): string => locale === "en" ? a(name) : name;
const verbName = (name: string, locale: UiLocale): string => locale === "en" ? verb(name) : name;

// Letters whose names start with a vowel sound: "an F", "an H", "an X".
const VOWEL_NAMED_LETTERS = "AEFHILMNORSX";
// A vowel letter sounded as a consonant, and a silent h.
const CONSONANT_STARTS = ["uni", "use", "usu", "eu", "one", "once"];
const SILENT_H = ["hour", "honest", "honor", "heir"];

/** *a* or *an* before a name, by how its first word sounds. */
export function article(name: string): string {
  const first = /^[A-Za-z]+/.exec(name.trim())?.[0];
  if (!first) return "a";
  // Capitals to start (XML, URLs, a lone X): read letter by letter.
  const two = first.slice(0, 2);
  if (two === two.toUpperCase()) return VOWEL_NAMED_LETTERS.includes(first[0]) ? "an" : "a";
  const lower = first.toLowerCase();
  if (SILENT_H.some((start) => lower.startsWith(start))) return "an";
  if (CONSONANT_STARTS.some((start) => lower.startsWith(start))) return "a";
  return "aeiou".includes(lower[0]) ? "an" : "a";
}

/** A name with its article: *a Person*, *an Organization*. */
export function a(name: string): string {
  return `${article(name)} ${name}`;
}

// First words that already read as a verb.
const AUXILIARIES = new Set([
  "is", "are", "was", "were", "be", "been", "has", "have", "had", "can", "could",
  "may", "might", "must", "shall", "should", "will", "would", "does", "do", "did",
]);
// Last words that mark a label needing *is*.
const PREPOSITIONS = new Set([
  "of", "to", "in", "at", "by", "for", "with", "from", "on", "into", "onto", "about",
  "above", "below", "under", "over", "inside", "near", "before", "after", "within", "than",
]);

/** A label's words, split as the server splits them: *worksFor* is *works*
 *  and *For*. */
function words(label: string): RegExpMatchArray[] {
  return [...label.matchAll(/[A-Za-z][a-z]*/g)];
}

function thirdPerson(word: string): boolean {
  return word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us");
}

function readsAfterIs(lower: string[]): boolean {
  return PREPOSITIONS.has(lower[lower.length - 1]) || lower[0].endsWith("ed");
}

/** A relationship's label as the verb after a subject: *uses* and *has
 *  part* stay, *part of* and *located in* read after *is*, a bare noun
 *  (*holder*) is left alone. */
export function verb(label: string): string {
  const lower = words(label).map((m) => m[0].toLowerCase());
  if (!lower.length) return label;
  if (AUXILIARIES.has(lower[0]) || thirdPerson(lower[0])) return label;
  return readsAfterIs(lower) ? `is ${label}` : label;
}

/** The same label after *must* or *may*: *uses* -> *use*, *has part* ->
 *  *have part*, *is part of* and *part of* -> *be part of*; a bare noun is
 *  left alone. */
export function mustVerb(label: string): string {
  const found = words(label);
  if (!found.length) return label;
  const lower = found.map((m) => m[0].toLowerCase());
  const head = found[0];
  const start = head.index ?? 0;
  const rest = label.slice(start + head[0].length);
  if (lower[0] === "is" || lower[0] === "are") return `be${rest}`;
  if (lower[0] === "has") return `have${rest}`;
  if (AUXILIARIES.has(lower[0])) return label;
  if (thirdPerson(lower[0])) {
    const written = head[0];
    let base: string;
    if (lower[0].endsWith("ies") && lower[0].length > 4) base = `${written.slice(0, -3)}y`;
    else if (/(ches|shes|sses|xes|zes|oes)$/.test(lower[0])) base = written.slice(0, -2);
    else base = written.slice(0, -1);
    return `${label.slice(0, start)}${base}${rest}`;
  }
  return readsAfterIs(lower) ? `be ${label}` : label;
}

/** A new relationship read as it is named: *A Person works for an
 *  Organization.* With no name yet, the gap is shown, so the sentence has
 *  its shape before the first key. */
export function relationshipSentence(from: string, name: string, to: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.relation", { from: capital(articleName(from, locale), locale), name: name.trim() || "…", to: articleName(to, locale) });
}

/** The link a line would make, or has made, as the relate menu and the link
 *  panel read it. */
export function linkSentence(kind: "subClassOf" | "broader" | "related", from: string, to: string, t: Translator = englishTranslator): string {
  return t(`sentence.link.${kind}`, { from, to });
}

/** An existing relationship the line would complete. */
export function existingSentence(from: string, name: string, to: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.existing", { from, name, to });
}

/** What the live region says once a relationship is made (5.2). */
export function createdAnnouncement(name: string, from: string, to: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.created", { name, from, to });
}

/** An attribute's datatype as a word, for *name (Person, text)*: the seven
 *  types of E-6, and the prefixed name for any other. */
const TYPE_CODES: Record<string, Extract<MessageId, `model.type.${string}`>> = {
  "xsd:string": "model.type.text",
  "rdf:langString": "model.type.text",
  "xsd:integer": "model.type.integer",
  "xsd:decimal": "model.type.decimal",
  "xsd:boolean": "model.type.boolean",
  "xsd:date": "model.type.date",
  "xsd:dateTime": "model.type.dateTime",
  "xsd:anyURI": "model.type.uri",
};

export function typeWord(datatype: string | null, t: Translator = englishTranslator): string {
  if (!datatype) return t("model.type.none");
  return Object.prototype.hasOwnProperty.call(TYPE_CODES, datatype) ? t(TYPE_CODES[datatype]) : datatype;
}

/** A tree row's ends: *Person → Organization* for a relationship, *Person,
 *  text* for an attribute; a missing end says so rather than vanishing. */
export function rowEnds(
  ends: { domain: string | null; range: string | null },
  attribute: boolean,
  t: Translator = englishTranslator,
): string {
  const start = ends.domain ?? t("model.noStart");
  if (attribute) return t("model.rowAttribute", { start, type: typeWord(ends.range, t) });
  return t("model.rowRelation", { start, end: ends.range ?? t("model.noEnd") });
}

/** The one line shown when a document holds the other kind's content
 *  (5.1): how much, and where it is changed. Null when there is none. */
export function otherKindNote(kind: "ontology" | "taxonomy" | null, count: number, t: Translator = englishTranslator): string | null {
  if (!kind || count === 0) return null;
  return kind === "ontology"
    ? t(count === 1 ? "model.otherConceptOne" : "model.otherConceptMany", { count })
    : t(count === 1 ? "model.otherClassOne" : "model.otherClassMany", { count });
}

/** Why one entity of the other kind is not changed in the visual doors. */
export function otherKindReason(kind: "ontology" | "taxonomy" | null, entityKind: string, t: Translator = englishTranslator): string | null {
  if (kind === "ontology" && entityKind === "concept") {
    return t("model.readOnlyConcept");
  }
  if (kind === "taxonomy" && entityKind === "class") {
    return t("model.readOnlyClass");
  }
  // Relationships and attributes belong to classes, so a taxonomy shows them
  // as it shows classes (5.10 item 2).
  if (kind === "taxonomy" && entityKind === "objectProperty") {
    return t("model.readOnlyRelationship");
  }
  if (kind === "taxonomy" && entityKind === "datatypeProperty") {
    return t("model.readOnlyAttribute");
  }
  return null;
}

// ---------------------------------------------------------------------------
// Stage B: the relationship and attribute forms (5.6, 5.7), concepts (5.8)
// ---------------------------------------------------------------------------

function capital(text: string, locale: UiLocale = "en"): string {
  return locale === "en" && text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

/** *a Person*, or what stands in for an end not set yet. */
function end(name: string | null, missing: string, locale: UiLocale = "en"): string {
  return name ? articleName(name, locale) : missing;
}

/** The Sentence block (5.6): what the blocks below say, read back. */
export function formSentence(from: string | null, name: string, to: string | null, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  return t("modelSentences.relation", { from: capital(end(from, t("modelSentences.noStart"), locale), locale), name: name.trim() || "…", to: end(to, t("modelSentences.noEnd"), locale) });
}

/** The other way round read as a sentence: *An Organization employs a
 *  Person.* Its start is this relationship's end. */
export function inverseSentence(inverse: string, from: string | null, to: string | null, locale: UiLocale = "en"): string {
  return formSentence(to, inverse, from, locale);
}

export type Characteristic =
  | "functional"
  | "inverseFunctional"
  | "symmetric"
  | "transitive"
  | "asymmetric"
  | "irreflexive"
  | "reflexive";

/** The seven, in the order the form offers them: four always, three under
 *  *More* (5.6). The OWL term is shown small beside each (Section 7). */
const CHARACTERISTIC_IDENTITIES: { id: Characteristic; owl: string; more: boolean }[] = [
  { id: "functional", owl: "owl:FunctionalProperty", more: false },
  { id: "inverseFunctional", owl: "owl:InverseFunctionalProperty", more: false },
  { id: "symmetric", owl: "owl:SymmetricProperty", more: false },
  { id: "transitive", owl: "owl:TransitiveProperty", more: false },
  { id: "asymmetric", owl: "owl:AsymmetricProperty", more: true },
  { id: "irreflexive", owl: "owl:IrreflexiveProperty", more: true },
  { id: "reflexive", owl: "owl:ReflexiveProperty", more: true },
];

export function characteristicChoices(t: Translator = englishTranslator): { id: Characteristic; name: string; owl: string; more: boolean }[] {
  return CHARACTERISTIC_IDENTITIES.map(entry => ({ ...entry, name: t(`characteristic.name.${entry.id}`) }));
}
// Compatibility for callers that have not yet adopted the current translator.
export const CHARACTERISTICS = characteristicChoices();

/** Each characteristic's example, written from the relationship's own
 *  names (5.6). An end not set yet reads as *something* or *thing*. */
export function characteristicExample(id: Characteristic, name: string, from: string | null, to: string | null, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const said = name.trim() || "…";
  if (id === "functional") return t("modelSentences.characteristic.functional", { from: capital(end(from, t("modelSentences.something"), locale), locale), name: said, to: to ?? t("modelSentences.thing") });
  if (id === "inverseFunctional") return t("modelSentences.characteristic.inverseFunctional", { from: from ?? t("modelSentences.thing"), name: said, to: capital(end(to, t("modelSentences.something"), locale), locale) });
  return t(`modelSentences.characteristic.${id}`, { name: said });
}

/** *works for is a more specific kind of member of* (5.6). */
export function parentSentence(child: string, parent: string, t: Translator = englishTranslator): string {
  return t("sentence.parent", { child, parent });
}

/** Why one start and one end, with the relationship's own names (5.6):
 *  *To use "works for" from Robot too, make Person and Robot kinds of a
 *  common class ...* -- the other class is the learner's to think of. */
export function oneStartOneEnd(name: string, from: string | null, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const said = name.trim() || t("modelSentences.it");
  return from ? t("modelSentences.oneStart.known", { name: said, from }) : t("modelSentences.oneStart.missing", { name: said });
}

/** A type of value after *as*: *a date*, *a whole number*, but *text* and
 *  *yes or no*, which take none; a type without a word is its name. */
export function asType(datatype: string, locale: UiLocale = "en"): string {
  const word = typeWord(datatype, tFor(locale));
  if (locale !== "en" || !Object.prototype.hasOwnProperty.call(TYPE_CODES, datatype) || word === "text" || word === "yes or no") return word;
  return a(word);
}

/** The attribute's sentence (5.7): *A Person has a name, as text.*, *A
 *  Person has a birth date, as a date.* */
export function attributeSentence(domain: string | null, name: string, datatype: string | null, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const start = capital(end(domain, t("modelSentences.something"), locale), locale);
  const said = articleName(name.trim() || "…", locale);
  return datatype ? t("modelSentences.attribute.typed", { domain: start, name: said, type: asType(datatype, locale) }) : t("modelSentences.attribute.untyped", { domain: start, name: said });
}

/** *One value only* read with the attribute's names: *A Person has at most
 *  one name.* */
export function oneValueExample(domain: string | null, name: string, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const start = capital(end(domain, t("modelSentences.something"), locale), locale);
  return name.trim() ? t("modelSentences.oneValue", { domain: start, name: name.trim() }) : t("modelSentences.oneValueEmpty", { domain: start });
}

/** The five mapping kinds (5.8), each explained in one sentence. */
const MAPPING_IDS = ["exactMatch", "closeMatch", "broadMatch", "narrowMatch", "relatedMatch"] as const;
export function mappingChoices(t: Translator = englishTranslator): { id: string; name: string; means: string }[] {
  return MAPPING_IDS.map(id => ({ id, name: t(`mapping.${id}.name`), means: t(`mapping.${id}.meaning`) }));
}
// Glossary and legacy forms share the same meanings; do not copy definitions.
export const MAPPINGS = mappingChoices();

/** *Top concept of Fruits* (5.8). */
export function topConceptSentence(scheme: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.topConcept", { scheme });
}

// ---------------------------------------------------------------------------
// Reuse (attribute-reuse 5.1, 5.2, 5.4)
// ---------------------------------------------------------------------------

export type PropertyWord = "attribute" | "relationship";

/** *Employee*, *Employee and Contractor*, *Employee, Contractor and Intern*. */
export function namesList(names: string[], joiner: "and" | "or" = "and", locale: UiLocale = "en"): string {
  if (names.length <= 1) return names[0] ?? "";
  const t = tFor(locale);
  return names.slice(0, -1).join(t("modelSentences.join.separator")) + t(`modelSentences.join.${joiner}`) + names[names.length - 1];
}

/** A domain's classes in words (attribute-reuse 5.3): *Employee or
 *  Contractor* for a union, *Employee and Manager* for two domain lines,
 *  which mean both; the one rule the form, the tree's words and the
 *  suggestions share. */
export function domainWords(form: "union" | "separate", names: string[], locale: UiLocale = "en"): string {
  return namesList(names, form === "union" ? "or" : "and", locale);
}

/** *an Employee or a Contractor*: each name with its article. */
function either(names: string[], locale: UiLocale): string {
  return namesList(names.map(name => articleName(name, locale)), "or", locale);
}

/** A suggestion under the name field (5.1): *hasName, an attribute of
 *  Employee (text).*, *reportsTo, from Employee to Manager.* The domain is
 *  the server's reading: *Employee or Contractor* when shared, *no class
 *  yet* when it has none. */
export function suggestionLine(kind: PropertyWord, name: string, domain: string | null, end: string | null, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const of = domain ?? t("modelSentences.noClass");
  if (kind === "attribute") return end ? t("modelSentences.suggestion.attributeTyped", { name, domain: of, type: typeWord(end, t) }) : t("modelSentences.suggestion.attribute", { name, domain: of });
  return t("modelSentences.suggestion.relationship", { name, domain: of, end: end ?? t("modelSentences.noClass") });
}

/** The suggestions' heading and each one's button. */
export const ALREADY_HERE = englishTranslator("modelSentences.already");
export function useOn(cls: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.use", { cls });
}

/** What the live region says once typing pauses: the count, never the list. */
export function matchesSaid(count: number, kind: PropertyWord, locale: UiLocale = "en"): string {
  return tFor(locale)(`modelSentences.matches.${kind}.${count === 1 ? "one" : "many"}`, { count });
}

/** Who has a property, for *It means: whatever has a name ...*. */
function whoever(kind: PropertyWord, name: string, locale: UiLocale): string {
  return tFor(locale)(`modelSentences.whoever.${kind}`, { name: kind === "relationship" ? verbName(name, locale) : name });
}

/** Case A (5.2): no class yet. */
export function planNoClass(name: string, cls: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.plan.noClass", { name, cls });
}

/** Case B: the class has it already, through the class named in `via`. */
export function planAlready(name: string, cls: string, via: string, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  return via === cls ? t("modelSentences.plan.already", { name, cls }) : t("modelSentences.plan.alreadyVia", { name, cls, articleClass: articleName(cls, locale), via: articleName(via, locale) });
}

/** Case C: the domain is a kind of the class, so the property moves up. */
export function planMoveUp(name: string, cls: string, domain: string[], locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const join = t("modelSentences.paragraphJoin");
  const kept = domain.map(child => t("modelSentences.plan.keep", { child, articleChild: articleName(child, locale), parent: articleName(cls, locale) })).join(join);
  return t("modelSentences.plan.move", { name, cls }) + join + kept;
}

/** Case D, the first choice: the plain question, then what it does. */
export function planSubclass(name: string, cls: string, domain: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.plan.subclass", { name, cls, domain, articleDomain: articleName(domain, locale) });
}
export function makeKindOf(cls: string, domain: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.makeKind", { cls, domain });
}

/** Case D, the union, for OWL classes: what it means in one sentence. */
export function planUnion(kind: PropertyWord, name: string, classes: string[], locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.plan.union", { name, classes: namesList(classes, "and", locale), whoever: whoever(kind, name, locale), either: either(classes, locale) });
}
export const SHARE_IT = englishTranslator("modelSentences.shareIt");
export const OR_PARENT = englishTranslator("modelSentences.orParent");

/** Case D with an RDFS class: a shared parent is the only way. */
export function planRdfsParent(name: string, classes: string[], locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.plan.rdfsParent", { name, classes: namesList(classes, "and", locale) });
}

/** The shared parent's name field and its button. */
export function parentQuestion(classes: string[], locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.parentQuestion", { classes: namesList(classes, "and", locale) });
}
export function giveParent(classes: string[], locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.giveParent", { classes: namesList(classes, "and", locale) });
}

/** Why no shared parent is offered: a class is another ontology's. */
export function importedParentNote(cls: string, from: string | null, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  return t("modelSentences.importedParent", { cls, source: from ?? t("modelSentences.importedOntology") });
}

/** A parent the classes already share: the button, and who else gains. */
export function moveUpTo(name: string, parent: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.move", { name, parent });
}
export function gainsSentence(name: string, parent: string, gains: string[], total: number, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  if (total === 0) return t("modelSentences.gains.none", { name, parent });
  if (total === 1) return t("modelSentences.gains.one", { name, gain: gains[0], articleGain: articleName(gains[0], locale), parent: articleName(parent, locale) });
  const shown = total > gains.length ? [...gains, t("modelSentences.more", { count: total - gains.length })] : gains;
  return t("modelSentences.gains.many", { gains: namesList(shown, "and", locale), name, parent: articleName(parent, locale) });
}

/** The live region once a choice is made. */
export function sharedAnnouncement(name: string, classes: string[], locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.shared", { name, classes: namesList(classes, "and", locale) });
}
export function givenAnnouncement(name: string, cls: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.given", { name, cls });
}
export function removedAnnouncement(name: string, cls: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.removed", { name, cls });
}

/** *Belongs to* for a shared domain: what the list means. */
export function domainListNote(form: "union" | "separate", locale: UiLocale = "en"): string {
  return tFor(locale)(`modelSentences.domain.${form}`);
}

/** Said where a shared domain is shown (Section 7, 5.0 row 6). */
export const REASONER_NOTE = englishTranslator("modelSentences.reasonerNote");

/** The canvas relate menu's entry (5.1): share an existing relationship. */
export function shareEntry(name: string, from: string, to: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.shareEntry", { name, from: articleName(from, locale), verb: verbName(name, locale), to: articleName(to, locale) });
}

/** Delete on one line of a shared relationship (5.3). */
export function memberDeleteQuestion(member: string, name: string, locale: UiLocale = "en"): string {
  return tFor(locale)("modelSentences.memberDelete", { member, name });
}
