# Rebuilding and compatibility

## Supported upstream contract

Adapter `kaikki-jsonl-v1` supports one JSON object per UTF-8 line, optionally gzip-compressed. A direct entry requires nonempty string `word` and `lang_code`. Unscoped page redirects are recognized only when both entry identity fields are absent and string `title` and `redirect` are present. Other missing/invalid identity fields fail the edition with its line number. NUL and unpaired surrogates fail. Additive and irrelevant nested fields are tolerated and ignored.

The manifest freezes archive byte length and SHA-256, expected physical record count, expected records per raw language code, expected unscoped redirects, optional decompressed SHA-256, URLs, dump/extraction/retrieval dates, exact panel, policy and adapter versions. All frozen distributions must match exactly. Counts and hashes are verified before accepting an edition. This contract does not guarantee compatibility with future upstream schemas.

For a new source vintage, inspect and census candidate bytes first using `python -m wpw.inspect --archive PATH --output REPORT.json`. Review missing identity fields, language counts, newly appearing/disappearing codes, major distribution changes and representative source samples against the previous manifest. Only then create a distinct dated manifest and derived database. Do not silently update a frozen manifest to make failures pass. A newly approved dataset’s different SHA-256 does not establish schema compatibility by itself. Add a new versioned adapter and fixtures if meaning or structure changes.

## Layers and storage

1. **Original extraction archives**: gzip JSONL with Kaikki/Wiktextract output. Preserve whole original bytes and checksums outside Git. The existing October archives remain retained on D:. English has a new retained D: copy; its C: original is unchanged.
2. **Derived presence database**: deduplicated `(language,word,edition)` with count and first line. Created from one streaming pass per archive. It contains no glosses and requires no private audit database schema.
3. **Final snapshots**: full/per-language score and evidence CSV.gz, portable SQLite.gz, metadata, and static explorer chunks. Staged locally for review, without publishing a release.

Temporary sort/journal files must stay on D: on this machine. Set `TEMP`, `TMP` and `SQLITE_TMPDIR` to the adjacent data directory before running. Inspect free disk before full builds. Do not move existing work or delete source archives to make room.

SQLite works with bounded memory and an indexed compact intermediate. Each edition is one transaction. A failed source leaves explicit `failed` state and no partial presences; a future invocation retries that source. Interrupted sources remain `processing` until retried. Complete source checkpoints are immutable for the frozen manifest. A process exception reports the exact source and line/check failure.

## Reproducibility

Source order is the frozen panel. Identity and ordering use raw strings. Score ties and mask encoding are explicit. Exports use sorted rows, stable filenames and gzip mtime 0. Content hashes in `artifact-inventory.json` cover every distributed file; the inventory itself is deliberately not self-referential. A canonical sorted-row SHA-256 is also stored, because SQLite file bytes can vary with SQLite version or runtime implementation even when rows agree. Exact byte-identical gzip requires the same Python/zlib implementation; logical row determinism is the cross-runtime guarantee.

The completed build record includes code file hashes, Git revision, Python/SQLite versions and checksums of validation reports. Rebuild archived snapshots using that code revision and original source bytes, not a current upstream download. There is no network updater or scheduled acquisition.

The explorer source is in `web/`. `wpw.export` assembles it with data outside Git. Serve that folder as static files on localhost for review. The original build used source, worker and DOM-contract checks. The later explorer update also passed checks in the existing Chrome tab through the supported browser extension; no blocked browser executable was launched. No public hosting, Pages, release or analytics is configured.

## Display ordering indexes

After `wpw.export`, run `node scripts/build_ui_indexes.mjs --root ARTIFACT_FOLDER`. This reads only frozen word chunks, verifies their hashes and writes display-only row permutations under `ui-indexes/`. It never reprocesses the raw archives or changes snapshot counts, downloads or source metadata. Use the recorded Node/ICU versions for an identical collation rebuild. Unsupported raw codes use Unicode scalar order, explicitly labelled in the explorer. `scripts/build.ps1` performs this step for a new full build.

For an existing served snapshot, update the files from `web/`, generate the supplemental indexes, then run `python scripts/checkpoint_ui.py --root ARTIFACT_FOLDER --checkpoint CHECKPOINT_FOLDER --verify-frozen`. The checkpoint folder must already contain the previous `artifact-inventory.json`; it serves as the immutable baseline. The updater refreshes UI file checksums and adds supplemental index entries while retaining all frozen snapshot file records. It does not repack the original private ZIP. Refresh the browser with Ctrl+F5 after a live UI update.
