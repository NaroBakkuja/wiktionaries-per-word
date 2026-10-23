# Methodology and data schema

For entry language `L` and exact form `W`, let `P(L,W)` contain each source edition with at least one raw top-level record whose `lang_code == L` and `word == W`. The main score is `|P(L,W)|`. All editions, including an exact-code own edition, have equal weight. One vote is independent of the number of senses, parts of speech, etymologies and duplicate records.

Only top-level fields identify a direct entry. `senses`, `forms`, `translations`, `redirects`, `related` and other nested metadata do not introduce additional forms. An explicit top-level form entry still qualifies without a textual definition. There is no “substantive definition” filter or language-specific heuristic.

No NFC, NFD, NFKC, trimming, case folding, transliteration, script exclusion or spelling-variant merge changes identity. Unicode scalar order (SQLite UTF-8 BINARY collation) is used for deterministic spelling order, not locale dictionary collation. The JavaScript comparator handles supplementary-plane characters consistently with that order.

`unknown` is an upstream unassigned-language sentinel. Those records have no safely identified entry language and are excluded as a reported class rather than merged into a fictional language. Valid-looking novel, historical, dialect and macrolanguage codes are retained exactly; no ISO registry repair is inferred. `mul` (Translingual) is retained because it is an explicit upstream attribution. A code’s display labels are explanatory source metadata and never its identity.

## Formats

Scores CSV columns:

| Column | Meaning |
|---|---|
| language_code | Raw top-level `lang_code`, unmodified |
| word | Raw top-level `word`, unmodified |
| count | Distinct contributing editions, own edition included |
| tied_rank | Competition rank within the entire entry language |
| foreign_only_count | Main count minus presence of the identical-code edition, if it is in the panel; Simple English is not mapped to `en` |
| edition_ids | Semicolon-separated contributing editions in frozen panel order |
| edition_mask | Bit `i` corresponds to `panel[i]`, least significant bit first |
| record_count | Number of qualifying raw records across contributors; not used for ranking |

Evidence CSV columns: `language_code,word,edition_id,first_raw_line,record_count`. Raw line numbers are one-based physical JSONL lines in the decompressed archive. A line points to a full original entry and can independently substantiate its top-level language and spelling. Original raw glosses are not duplicated into this project’s deliverables.

The portable SQLite table `scores` contains the same fields, except `lang` names the language and IDs can be decoded from `edition_mask` with `meta.manifest.panel`. `languages` contains code, row count and source labels. `sources` contains one processing state and diagnostics per edition. `meta` contains the frozen manifest and coverage policy. The derived `presence.sqlite` is a separate intermediate: one row per language/form/edition, record count and first raw line. It is not an upstream Kaikki archive.

CSV is UTF-8 with LF line endings, standard quoting and a header. Gzip has fixed mtime 0 and no original filename. Spelling cells are exact data and can start with spreadsheet formula characters; import them as text in spreadsheet programs instead of changing the authoritative bytes. SQLite is preferable for programmatic queries and avoids spreadsheet interpretation.

## Coverage and ordering

Only observed qualifying forms are in the full main universe; there are no invented zero-score words. For a requested form outside that universe, absence is “not observed in processed sources.” If coverage is incomplete, the observed count is a lower bound and missing editions remain unknown. Final export normally requires every frozen source complete. A processed edition with zero records for a language is distinguished from an unprocessed or failed edition.

The main rank is always calculated against all forms in the language. Searching does not renumber ranks. Static chunks contain two full global orders, word ascending and count descending with word ascending as the tie order. Reversing chunks and rows produces globally correct descending word or ascending count / descending rank. Count and rank are inversely related. Search reads only word-index candidate chunks, collects every matching result, then globally sorts that result set. A broad prefix may require more selected-language data; it never triggers loading every language. UI pages contain 50 rows; data chunks contain 2,000 rows.

Raw source omissions and extractor errors can affect scores even when processing is complete. The source panel is intentionally fixed, and edition coverage is uneven. Counts are not a measure of semantic quality, corpus frequency or universal dictionary coverage. Live convenience links can change; archived source hashes and JSONL line pointers are the historical evidence.
