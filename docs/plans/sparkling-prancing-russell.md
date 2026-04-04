# Plan: Add Commit-Based Section Headers to PROMPT_HISTORY.md

## Context

PROMPT_HISTORY.md has grown to 46 entries across 10 commits with no visual grouping. Adding simple `##` headers before each commit's group of entries makes it easier to navigate and understand progression.

## Commit-to-Entry Mapping

Based on git log and content analysis:

| Commit | Subject | Entries |
|--------|---------|---------|
| afeb78a | Initial project setup | 1–19 |
| a62de27 | Prompt history tracking | 21–27 |
| 7a67b0b | Implement PageGap v1 | 29–47 |
| 0b237b3 | Plan documentation automation | 49–53 |
| 3bae5bd | Dwell time check | 55–61 |
| e91069e | Plan filename references | 63–65 |
| d613389 | Duplicate detection | 67–73 |
| c38179d | Test fixtures | 75–85 |
| 8226fab | Demo fixes | 87–89 |
| ade317e | Race condition fix | 91–97 |

## Section Header Titles (simple, scannable)

1. `## Initial Setup`
2. `## Prompt History Tracking`
3. `## v1 Implementation`
4. `## Plan Automation`
5. `## Dwell Time`
6. `## Plan References`
7. `## Duplicate Detection`
8. `## Test Fixtures`
9. `## Demo Fixes`
10. `## Race Condition Fix`

## Change

Insert a `## Header\n\n` before the first entry of each group in `docs/PROMPT_HISTORY.md`. No other changes.

File to modify: `docs/PROMPT_HISTORY.md`
