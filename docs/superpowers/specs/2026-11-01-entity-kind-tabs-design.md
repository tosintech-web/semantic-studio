# Dictionary kind tabs and list icon

The user confirmed that “kind” means the existing concept/individual/class/
properties/other classification, rather than dictionary-defined rdf:type values.
Only classifications present in the entire current dictionary view appear as
tabs. Keep All available, including for an empty dictionary. Search, page size,
row selection and the existing detail-panel editing workflow remain unchanged.

## Approach

Use the existing server-side index to return bounded `kind_counts` metadata in
entity pages. Counts describe the complete view, independent of query, selected
kind, sort or page offset; imports, snapshots and edits use the same view revision
as the rows. Cache counts with that view and reuse them between language reads.
The response adds this field without changing filters, limits or existing fields.

The client keeps the last accepted metadata while paging/searching/switching tabs,
so tabs do not flicker or disappear during loading. A dictionary switch must not
reuse another dictionary's metadata. Fresh responses update the tabs. If an edit
or imports change removes the selected kind, return to All; preserve the chosen
kind if it still exists. Stale responses must not restore removed tabs or rows.
Do not derive available tabs from the visible 50 rows or search results.

The alternative of filtering only the visible page is incorrect: it misses kinds
on later pages. Fixed tabs expose irrelevant empty groups and were rejected by
the user. No rdf:type grouping or inline cell-editing feature is introduced.

## Interaction and icon

- One active tab is in the Tab sequence. Arrow keys and Home/End move focus and
  activate the selected kind, following the app's existing tabs convention.
- The global focus-visible rule draws focus. Tabs expose selected state and an
  associated named tabpanel. Loading and empty/error state stay accessible.
- Changing kind resets paging, retains search/sort and keeps focus on the tab;
  ordinary page navigation still focuses the list heading when it completes.
- A removed focused tab returns focus to All without stealing focus from an
  editing form. Names follow the Japanese/English UI language.
- Add a table-shaped 20px SVG for the top-bar Entities item, using the existing
  currentColor/1.7px line style and decorative aria-hidden/focusable=false attrs.

## Verification

Prove whole-view counts, filtering/page invariance, empty views and view changes
with real API/index tests; preserve full test inventory identities. Test dynamic
presence, search retention, paging, stale replies, disappearing kinds and native
keyboard behavior. Check real Chrome geometry/AX/Tab/arrow interaction in both
languages, run relevant suites and the frontend build, then independent review.
