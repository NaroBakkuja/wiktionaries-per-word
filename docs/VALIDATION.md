# Validation plan and evidence

1. Verify every input archive byte length and SHA-256. Parse every raw record through the versioned identity adapter; compare complete language distributions, record counts and redirect counts with retained metadata. Confirm optional raw-stream SHA-256 values.
2. Before accepting the new metric, compare all archived EN ranking rows against the exact old foreign-only count and edition IDs. Compare all archived VI ranking rows against their old foreign-only semantics. The previous gloss baseline is only a historical comparison, never an input to the main word universe.
3. Then verify Vietnamese inclusive/foreign pairs: `nước` 19/18, `công ty` 9/8, `công ti` 4/3.
4. Check all final score rows: range, bit count, own-edition subtraction, competition ranks, record counts and SQLite integrity. Cross-check deterministic source samples against independently retained raw JSON rows. This is supplementary validation; the pipeline does not depend on that database.
5. Run fixture tests for duplicates across senses/POS, explicit forms, nested translations and forms, separate-language homographs, `zh`/`cmn`, case and combining marks, Simple English, unknown tags, redirects, missing required fields, failed/unprocessed states, checksum/distribution changes, resume behavior and deterministic reruns.
6. Rebuild fixture exports twice and compare every file hash. Offline JavaScript checks cover Unicode scalar order, search index boundaries, pagination, reverse orders, exact matching, worker execution and DOM element references. These are not browser-rendered UI tests.

Machine-readable reports are saved under `validation/` after the full build. Raw-data outputs and full inventories remain with the staged artifacts on D:.

Remaining publication work: select a code license, decide and verify the derived-data licensing/attribution approach across source editions, and perform rendered browser review after the existing security hold is resolved by the user. No master dictionary integration is part of this repository build.
