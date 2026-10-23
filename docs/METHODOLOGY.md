# Methodology and data schema

For entry language `L` and exact form `W`, let `P(L,W)` contain each source edition with at least one raw top-level record whose `lang_code == L` and `word == W`. The main score is `|P(L,W)|`. All editions, including an exact-code own edition, have equal weight. One vote is independent of the number of senses, parts of speech, etymologies and duplicate records.

Only top-level fields identify a direct entry. `senses`, `forms`, `translations`, `redirects`, `related` and other nested metadata do not introduce additional forms. An explicit top-level form entry still qualifies without a textual definition. There is no “substantive definition” filter or language-specific heuristic.

No NFC, NFD, NFKC, trimming, case folding, transliteration, script exclusion or spelling-variant merge changes identity. Unicode scalar order (SQLite UTF-8 BINARY collation) is used for deterministic spelling order, not locale dictionary collation. The JavaScript comparator handles supplementary-plane characters consistently with that order.

`unknown` is an upstream unassigned-language sentinel. Those records have no safely identified entry language and are excluded as a reported class rather than merged into a fictional language. Valid-looking novel, historical, dialect and macrolanguage codes are retained exactly; no ISO registry repair is inferred. `mul` (Translingual) is retained because it is an explicit upstream attribution. A code’s display labels are explanatory source metadata and never its identity. The first snapshot has 111 raw codes with whitespace or nonstandard characters; diagnostics expose these without silently repairing them. The explicit `und` (Undetermined) source category is retained as a labelled raw-code bucket, not represented as an identified natural language. The reported code-bucket total is not a count of standardized or distinct natural languages.

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

The main rank is always calculated against all forms in the language. Searching does not renumber ranks. Frozen score/evidence downloads and original chunks retain their deterministic Unicode order.

The live explorer uses separate, compact row-permutation indexes under `ui-indexes/`. These reference the frozen word chunks without altering any row, score, rank or evidence. Alphabetical display ordering is generated with `Intl.Collator` for the exact raw code when supported (`usage: sort`, `sensitivity: variant`, `numeric: false`, punctuation retained), then Unicode scalar order as a deterministic fallback for equal collations. Unsupported or invalid locale codes use Unicode scalar order and the UI says so. Canonically equivalent spellings remain distinct rows. The generator pins Node and ICU versions in each index; the first UI update used Node 24.19.0 and ICU 78.3. This avoids browser-specific ICU versions changing the frozen display order.

Both ascending and descending count/rank sorts use alphabetical ascending ties. Word descending reverses alphabetical word order. The three complete language-wide permutations ensure sorting is global across page boundaries. Exact/prefix search still uses exact source strings and the original Unicode search index, then orders all matches by the same display permutation. At most the selected language's compact order index is loaded; a largest-language index is about 8.4 MB, cached across pagination. Individual rows are fetched from only the required source chunks. Page sizes are 25, 50, 100, 250 and 500; the URL preserves size/page and browser storage remembers preferred size and six recent language codes.

Raw source omissions and extractor errors can affect scores even when processing is complete. The source panel is intentionally fixed, and edition coverage is uneven. Counts are not a measure of semantic quality, corpus frequency or universal dictionary coverage. Live convenience links can change; archived source hashes and JSONL line pointers are the historical evidence.
