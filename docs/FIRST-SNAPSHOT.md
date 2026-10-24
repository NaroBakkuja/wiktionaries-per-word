# Snapshot assembled 2026-10-23

The [release downloads](https://github.com/NaroBakkuja/wiktionaries-per-word/releases/tag/2026-10-23) contain 21,849,856 exact language/form pairs across 7,072 raw language-code buckets. They were built from 38,770,932 JSONL records in 21 complete edition extractions. Counts include the language's own edition.

| Download | Compressed bytes |
|---|---:|
| `full-scores.csv.gz` | 98,878,552 |
| `full-evidence.csv.gz` | 236,941,546 |
| `full-scores.sqlite.gz` | 327,259,870 |

`wiktionaries-per-word-2026-10-23-explorer.zip` contains the current static explorer with direct page jumps, all full/per-language downloads, frozen metadata, attribution and file checksums. See GitHub for the ZIP size and `SHA256SUMS.txt` for release-asset hashes. The original data files retain their original checksums; documentation and explorer files were prepared for this release.

Original source archives total 5,425,798,108 bytes and are not included. The deduplicated presence intermediate was 1,076,838,400 bytes; the final uncompressed score database is 1,213,341,696 bytes. These are distinct from raw Kaikki extraction files.

English uses September 2/20 dump/extraction dates. Other editions use October 1-2 dumps and October 16-18 extractions. Assembly is not source synchronization. All processing passed, but that does not establish complete coverage of live Wiktionary.

All 1,489,351 historical English comparison rows and 94,478 Vietnamese rows matched the older foreign-only scores and edition IDs. Inclusive Vietnamese examples are `nước` 19, `công ty` 9 and `công ti` 4; English `February` scores 21. See [validation](VALIDATION.md).

This snapshot and code are supplied as a one-time release. No maintenance, support or updates are planned.
