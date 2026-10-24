# Rebuilding the dated snapshot

The code reads raw Kaikki/Wiktextract JSONL: one UTF-8 JSON object per line, optionally gzip-compressed. Required entry fields are nonempty top-level strings `word` and `lang_code`; optional `lang` supplies a display label. Nested translations/forms do not create entries. Unscoped redirects are recognized only when both identity fields are absent and string `title` and `redirect` fields are present. Other missing identities, NUL and unpaired surrogates fail the source. Irrelevant additive fields are ignored.

The announced removal of post-processed downloads does not require an importer change: this project already uses complete raw extracts. See the [upstream announcement](https://github.com/tatuylonen/wiktextract/issues/1178) and [raw-download documentation](https://kaikki.org/dictionary/rawdata.html). Source edition is assigned by the manifest; `lang_code` is the entry language, not the source edition.

## Requirements and inputs

Python 3.11+ standard library and Node 18+ with full ICU. No pip/npm packages, paid services or API keys are required. The recorded build used Python 3.14.7, SQLite 3.50.4 and zlib 1.3.1.zlib-ng; display indexes used Node 24.19.0 and ICU 78.3. Other supported-version combinations were not all tested.

Use the source attached to release tag `2026-10-23`. For the historical snapshot, obtain the exact archives described by `manifests/2026-10-23-first.json`. The release distributes derived scores/evidence, not the original extraction archives. Current download URLs are provenance/discovery links and do not guarantee historical bytes. Exact historical reconstruction requires retained copies matching the hashes. See `validation/build-provenance.json` for the original pipeline revision and code hashes.

Copy `docs/paths.example.json` to a local `paths.json` and replace every placeholder with the corresponding archive location. Relative paths are resolved from the working directory where the command runs. Do not confuse an edition's complete multilingual extract with entries in just that edition's own language. Keep archives, derived presence data and final scores as separate layers.

Choose a new output directory with sufficient free space. Full builds require several GB beyond the retained inputs. Set `TEMP`, `TMP` and `SQLITE_TMPDIR` to a suitable working directory on a drive with room for intermediate SQLite files. Do not overwrite retained snapshots.

## Commands

Run from the repository root. Use `python3` instead of `python` where appropriate.

```sh
python -m unittest discover -s tests -v
node tests/web.test.mjs
python -c "from pathlib import Path; Path('work').mkdir(exist_ok=True)"
python -m wpw.pipeline ingest --manifest manifests/2026-10-23-first.json --paths paths.json --database work/presence.sqlite --checkpoints work/checkpoints
python -m wpw.pipeline score --database work/presence.sqlite --output work/scores.sqlite
python -m wpw.validate scores --database work/scores.sqlite --output work/score-validation.json
python -m wpw.export --scores work/scores.sqlite --presence work/presence.sqlite --output work/explorer --web web
node scripts/build_ui_indexes.mjs --root work/explorer
python -m http.server 8765 --bind 127.0.0.1 --directory work/explorer
```

Open <http://127.0.0.1:8765/>. The JavaScript tests and Python fixtures are small; the full commands require all matching source archives. `scripts/build.ps1` is an optional PowerShell wrapper. The exporter and scoring command refuse to overwrite existing outputs. Ingestion resumes completed editions and rolls back a failed edition; a partial source never contributes partial votes.

## Other input vintages

For each new raw extract, run `python -m wpw.inspect --archive INPUT.jsonl.gz --output CENSUS.json`. Review sample identities, invalid records, language distributions and source dates. Create a distinct manifest with the exact source panel, URLs, dates, archive sizes/SHA-256, expected records/languages/redirects, and supported adapter/policy versions; supply a corresponding paths file and new database. The tests in `tests/test_pipeline.py` provide small manifest examples.

Do not edit the historical manifest just to make a mismatch pass. Checksums and frozen distributions must match before an edition is accepted. A changed checksum alone does not prove schema compatibility. Renamed required fields or other unsupported formats require code changes and tests. No compatibility with every future schema or automatic acquisition is promised.

## Reproducibility and evidence

The original archives retain full source records. `presence.sqlite` is a deduplicated intermediate with one row per language/form/edition, record counts and original first-line pointers. Final score/evidence files contain no glosses. Each layer has its own provenance.

Sorted rows, fixed panel order, gzip mtime 0 and explicit rank/mask policies make output deterministic. `artifact-inventory.json` covers every packaged file except itself. Canonical row SHA-256 is the cross-runtime comparison; exact SQLite/gzip bytes also depend on recorded runtime versions. Source hashes and physical JSONL line pointers provide historical evidence; links in the explorer open current pages.

Display indexes are separate row permutations over frozen chunks. Building them checks chunk hashes and does not alter scores or evidence. Reuse the recorded Node/ICU versions for identical collation. The release packaging helper targets this first snapshot and never publishes or contacts GitHub.

This is a one-time, unmaintained release. There is no update schedule or support commitment.
