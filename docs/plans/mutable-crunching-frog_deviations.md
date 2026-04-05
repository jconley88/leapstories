# Deviations: Refactor content.js into Separate Modules

Significant deviations from the original plan occurred through iterative refinement after the initial split:

## 1. Module structure changed from feature-based to capability-based

**Plan:** `parse.js`, `storage.js`, `duplicates.js`, `gaps.js`, `content.js` — organized by feature (duplicates, gaps).

**Actual:** `page.js`, `storage.js`, `content.js` — organized by what they touch (DOM, storage, orchestration). `duplicates.js` and `gaps.js` were merged first into `parse.js`/`render.js`, then `render.js` merged into `parse.js`, then renamed to `page.js`. Files moved into `src/` directory.

**Why:** User preference for grouping by capability (DOM reads/writes, storage, orchestration) rather than vertical feature slices.

## 2. Orchestrator redesigned with strict abstraction levels

**Plan:** Flat orchestrator with scattered early returns mixing policy decisions with implementation.

**Actual:** Orchestrator (`pagegap()`) only coordinates at one level: `handleSaveSnapshot`, `handleDuplicates`, `handleGaps`, with policy gates (`isDwellMet`, `!prevSnapshot`) between them. Data logic (`findDuplicateIds`, `findGapIds`) lives in content.js but separate from the orchestrator.

**Why:** Each function should operate at a single level of abstraction. The orchestrator reads like a policy document; handlers contain the mechanics.

## 3. Functions refactored to work with IDs instead of story objects

**Plan:** Functions pass full story objects (with DOM references) between modules.

**Actual:** Most functions now work with ID arrays. `parseStories` replaced by `parseStoryIds`. `findDuplicates` became `findDuplicateIds`. `markDuplicates` looks up DOM rows by ID. `getStoriesFromDoc(ids, doc)` resolves IDs to story objects only when needed for injection.

**Why:** Story objects were unnecessary carriers — IDs are sufficient for matching. DOM rows can be looked up when needed.

## 4. Set construction removed

**Plan:** Used `new Set()` for ID lookups.

**Actual:** Plain arrays with `.includes()`. At 30 stories per page, the optimization is unnecessary.

**Why:** Premature optimization that added plumbing noise to handler functions.

## 5. Magic strings extracted into constants

**Plan:** Hardcoded selectors and class names throughout.

**Actual:** `STORY_ROW_SELECTOR`, `TITLE_LINK_SELECTOR`, `DUPLICATE_CLASS`, `DUPLICATE_PREFIX` defined as constants in `page.js`.

**Why:** Reduces duplication and elevates HN-specific hooks to visible configuration.

## 6. Dwell check extracted to orchestrator

**Plan:** Dwell time check embedded inside gap detection logic.

**Actual:** `isDwellMet()` function called as a policy gate in the orchestrator, alongside other guards.

**Why:** The dwell check is a policy decision at the same level as "is there a previous snapshot?" — it belongs with the other gates, not buried in implementation.

## 7. Test suite restructured

**Plan:** No test changes expected.

**Actual:** Tests restructured into standalone functions with a simple runner loop. Each test sets up its own state. Extracted `getServiceWorker` helper (eliminated triplicated lookup) and navigation/DOM query helpers. Tests 3-4 navigate to page 1 themselves instead of relying on prior test state.

**Why:** Test isolation — each test should be self-contained and not depend on side effects from previous tests.

## 8. `fetchFreshPreviousPage` generalized to `fetchPage`

**Plan:** `fetchFreshPreviousPage(pageNum)` hardcoded `pageNum - 1`.

**Actual:** `fetchPage(pageNum)` fetches the given page number. Caller passes `pageNum - 1`.

**Why:** More general — the function fetches a page, the caller decides which one.
