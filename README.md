# Wiktionaries per Word

Dated, reproducible rankings of exact written forms **within each entry language**, by the number of distinct Wiktionary editions containing a direct entry attributed to that language.

The main count includes the language’s own edition on equal terms. Each edition contributes at most one vote, regardless of repeated senses, parts of speech or etymologies. This measures observed cross-edition coverage, not frequency, quality or importance.

**Private first version.** No public site or release is enabled. The first snapshot is being built from 21 retained Kaikki archives; machine validation reports and measured artifact sizes are added when the build passes. No master dictionary or extension is changed.

## Data comes first

The universe is the union of every qualifying `(raw language code, exact written form)` in the panel. It is not limited to a gloss vocabulary. No gloss text appears in scores, evidence exports or the explorer.

- Full and per-language **CSV.gz scores**: count, competition tied rank, contributing edition IDs, edition mask, separately named `foreign_only_count`, and raw record count.
- Full and per-language **CSV.gz evidence**: language, exact word, edition, first raw JSONL line and number of matching raw records. The first line is a reproducible pointer; it is not a claim that only one record exists.
- **Portable SQLite.gz**: all scores, language labels, explicit source processing states and frozen provenance.
- A **static HTML explorer** with searchable languages, snapshot selection, exact/prefix word search, global word/count/rank sorting, pagination, evidence details, downloads and bookmarkable URLs.

Large inputs and generated data stay outside Git history. On this machine the source checkout is `D:/Projects/wiktionaries-per-word`; working data, temporary files and checkpoints are `D:/Projects/wiktionaries-per-word-data`. Original October archives remain in their existing D: location. A checksum-verified retained copy of the September English archive is on D:; its original is unchanged.

## Snapshot and interpretation

The fixed panel is `cs de el en es fr id it ja ko ku ms nl pl pt ru simple th tr vi zh`. Source editions and entry languages are independent axes. The panel covers thousands of entry-language codes, not just 21 languages.

Snapshot assembly is dated **2026-10-23**. English uses the retained **2026-09-02 dump / 2026-09-20 extraction**. Other sources use **October 1–2 dumps / October 16–18 extractions**. Exact per-source dates, retrieval evidence, sizes, SHA-256 and expected language distributions are frozen in [the manifest](manifests/2026-10-23-first.json). Assembly does not make these sources contemporaneous.

Exact identity preserves case, diacritics, Unicode combining sequences, spaces, punctuation and scripts. **No Unicode normalization** is applied. `á` and `a` + combining acute remain distinct; `zh`, `cmn` and `yue` remain distinct. Explicit forms, abbreviations, proper names and symbols count if they are direct entries. Nested translations, interwiki links and nested form lists do not create entries. Explicit `unknown` language tags and unscoped redirects are excluded with diagnostics. Other raw codes, including `mul`, are retained verbatim.

Tied rank uses competition ranking: `1 + number of forms in the same language with a strictly larger count` (1, 1, 3). The optional foreign-only comparison excludes only the panel edition with the identical language code; Simple English remains a separate vote as in the previous EN audit. There is no macrolanguage mapping.

A complete processing state means the entire retained extraction passed checks. An absent direct entry is **not observed in that extraction**, not proof of absence from live Wiktionary. Failed/unprocessed sources are unknown, never zero; final snapshots require all sources complete unless an explicitly labelled partial diagnostic is requested.

## Rebuild locally

Python 3.11+ standard library; Node 18+ only for offline JavaScript tests. No package installation, paid APIs, models or live data fetches are required.

```powershell
$env:TEMP='D:/Projects/wiktionaries-per-word-data/tmp'
$env:TMP=$env:TEMP
$env:SQLITE_TMPDIR=$env:TEMP
python -X utf8 -m unittest discover -s tests -v
node tests/web.test.mjs

python -X utf8 -m wpw.pipeline ingest --manifest manifests/2026-10-23-first.json --paths D:/Projects/wiktionaries-per-word-data/paths.json --database D:/Projects/wiktionaries-per-word-data/presence.sqlite --checkpoints D:/Projects/wiktionaries-per-word-data/checkpoints
python -X utf8 -m wpw.pipeline score --database D:/Projects/wiktionaries-per-word-data/presence.sqlite --output D:/Projects/wiktionaries-per-word-data/scores.sqlite
python -X utf8 -m wpw.export --scores D:/Projects/wiktionaries-per-word-data/scores.sqlite --presence D:/Projects/wiktionaries-per-word-data/presence.sqlite --output D:/Projects/wiktionaries-per-word-data/artifacts/2026-10-23-first --web web
```

`paths.json` maps each panel edition ID to a local `.jsonl` or `.jsonl.gz` path (see [the example](docs/paths.example.json)); it stays outside Git. The first frozen manifest pins gzip bytes. A decompressed JSONL input needs its own manifest checksum and byte size. Source URLs are discovery/provenance links, not an instruction to use whatever bytes they serve today. Keep the original archives: mutable upstream download URLs cannot guarantee historical rebuilds.

Ingestion resumes complete editions only and rolls back all votes for a failed edition. Changing a frozen manifest requires a new derived database. Score and export commands refuse to overwrite snapshots. For fresh rebuilds, choose new output paths; do not delete retained checkpoints.

Serve a staged artifact folder with a **local static file server**, then open its `index.html`:

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory D:/Projects/wiktionaries-per-word-data/artifacts/2026-10-23-first
```

This serves static files only; there is no application backend. The explorer fetches packaged chunks, never upstream live entries. Direct `file://` loading is not supported by browser module/worker security rules. Browser rendering remains unverified while the existing security hold is in place.

See [methodology and schema](docs/METHODOLOGY.md), [rebuilding and compatibility](docs/REBUILDING.md), [validation](docs/VALIDATION.md), and [licensing and attribution](LICENSE.md). No public code license or derived-data dedication has been chosen.
