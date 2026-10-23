# First private snapshot: 2026-10-23-first

The snapshot contains **21,849,856 language/form pairs in 7,072 raw language-code buckets**, built directly from **38,770,932 JSONL records across 21 archives**. Raw-code categories retain source spellings and include nonstandard upstream labels; see `validation/raw-code-diagnostics.json`. Counts include the own edition. Nothing is publicly hosted or released.

All 1,489,351 archived EN and 94,478 archived VI rows matched the older foreign-only count and contributor IDs. Inclusive VI examples: nước 19, công ty 9, công ti 4. English February is 21. All score masks, ranges, record counts and competition ranks passed, and SQLite integrity is `ok`. Two complete score builds are byte-identical. The code has seven Python test cases, deterministic fixture-export checks, offline JavaScript/DOM checks and real-data worker checks. The latter covered exact counts, rank order, prefix search, and a French pagination boundary at row 2,000 using only nine static file fetches. No browser was launched or rendered.

## Download artifacts

Locally staged folder: `D:/Projects/wiktionaries-per-word-data/artifacts/2026-10-23-first`.

| Artifact | Filename | Bytes (gzip compressed) |
|---|---|---:|
| All score/rank rows | `full-scores.csv.gz` | 98,878,552 |
| All contributing-edition evidence | `full-evidence.csv.gz` | 236,941,546 |
| Portable score database | `full-scores.sqlite.gz` | 327,259,870 |
| Vietnamese scores | `l06277-scores.csv.gz` | 578,255 |
| Vietnamese evidence | `l06277-evidence.csv.gz` | 1,306,995 |
| English scores | `l01693-scores.csv.gz` | 8,367,168 |

The artifact folder includes a static explorer, full and per-language downloads, frozen source metadata, processing diagnostics, licensing notes and file checksums. The verified private review ZIP is `wiktionaries-per-word-2026-10-23-first-private.zip`, staged alongside it: **1,209,910,588 bytes**. ZIP integrity passed. `validation/delivery.json` records its SHA-256 and inventory totals. Large files remain outside Git history. No release upload was performed.

## Retained layers

- Original gzip extraction archives: **5,425,798,108 bytes** across the panel. The existing October inputs remain in their original D: directory. The retained English archive has a D: copy with its original SHA-256; its C: source is untouched.
- Derived deduplicated presence database: **1,076,838,400 bytes**. It was built from the raw archives and contains no glosses.
- Final uncompressed portable score database: **1,213,341,696 bytes**. Compressed distribution sizes are above. A second score build is retained as a verification checkpoint.

Source dates are mixed by design: English September; other editions October. Assembly is not source synchronization. Complete processing does not guarantee complete extraction coverage of Wiktionary.

## Remaining review

Rendered-browser review is pending the existing Smart App/Playwright security hold. Code and derived-data public licensing remain owner decisions. The repository remains private; Pages is disabled; there are no releases. Master-dictionary or extension integration is intentionally outside this task.
