# Validation plan and evidence

1. Verify every input archive byte length and SHA-256. Parse every raw record through the versioned identity adapter; compare complete language distributions, record counts and redirect counts with retained metadata. Confirm optional raw-stream SHA-256 values.
2. Before accepting the new metric, compare all archived EN ranking rows against the exact old foreign-only count and edition IDs. Compare all archived VI ranking rows against their old foreign-only semantics. The previous gloss baseline is only a historical comparison, never an input to the main word universe.
3. Then verify Vietnamese inclusive/foreign pairs: `nước` 19/18, `công ty` 9/8, `công ti` 4/3.
4. Check all final score rows: range, bit count, own-edition subtraction, competition ranks, record counts and SQLite integrity. Cross-check deterministic source samples against independently retained raw JSON rows. This is supplementary validation; the pipeline does not depend on that database.
5. Run fixture tests for duplicates across senses/POS, explicit forms, nested translations and forms, separate-language homographs, `zh`/`cmn`, case and combining marks, Simple English, unknown tags, redirects, missing required fields, failed/unprocessed states, checksum/distribution changes, resume behavior and deterministic reruns.
6. Rebuild fixture exports twice and compare every file hash. Offline JavaScript checks cover Unicode scalar order, search index boundaries, pagination, reverse orders, exact matching, worker execution and DOM element references. These are not browser-rendered UI tests.

Machine-readable reports are saved under `validation/`. The first build passed all 1,489,351 EN and 94,478 VI historical comparisons; all 21,849,856 score rows passed. There are 156 independent source samples, including raw English archive checks. Two complete score database assemblies were byte-identical (1,213,341,696 bytes). Seven Python test cases plus offline JavaScript/DOM checks passed; the export fixture was rebuilt twice with every file hash identical. Full inventories accompany the downloadable snapshot.

The original machine reports record the checks at their build dates. Later rendered explorer checks are recorded separately below; the historical reports are retained as evidence.

## Explorer update

The v2 explorer adds stable paging, page-size preferences, common/recent language choices and fixed language-aware alphabetical indexes. See [the separate validation report](../validation/ui-pagination-v2.json). All 56,406 frozen snapshot files passed SHA-256 checks against the original inventory. Counts, ranks, evidence and original downloads are unchanged. The release explorer ZIP includes these display indexes and the later direct page-jump control.

Checks in the already-open Chrome tab confirmed unchanged scroll position for Next and Previous, including a short final page; page sizes and URLs; Vietnamese prefix search; alphabetical score ties in both directions; full language search; and persistent recent languages. No blocked browser executable was launched, no security settings changed, and the existing server remains on 127.0.0.1:8765.

## Direct page navigation

The page-number field and Go/Enter action passed invalid-input, first/last-page, empty-result, filtered-sort, bookmark-reload and scroll-preservation checks in existing Chrome. See [the page-jump report](../validation/ui-page-jump-v3.json). No score, rank or evidence data changed.
