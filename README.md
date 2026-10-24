# Wiktionaries per Word

This dataset counts how many Wiktionary editions contain a direct entry for an exact written form in a particular entry language. The idea is to use that coverage as a reasonable **prima facie proxy for the relative usefulness of learning a word** to understand or speak the language.

The score measures editorial coverage, not corpus frequency or empirically validated learning utility. Basic-word lists, shared editorial sources and uneven edition coverage can bias the rankings.

My informal impression is that the rankings generally look useful. One counterexample in the English-entry snapshot is `abase`: 20 editions, tied rank 32, above `now`: 19 editions, tied rank 458. This illustrates a limitation; it is not offered as representative of overall ranking quality. No systematic evaluation establishes how common such cases are.

**One-time snapshot, assembled 2026-10-23. This project is unmaintained. No support, updates or future-schema compatibility are promised.**

## Download and explore

[Download the snapshot](https://github.com/NaroBakkuja/wiktionaries-per-word/releases/tag/2026-10-23). Choose:

- **`wiktionaries-per-word-2026-10-23-explorer.zip`**: the complete static explorer, all language data, per-language downloads, provenance and file checksums.
- **`full-scores.csv.gz`** (98.9 MB): all word counts, tied ranks and contributing edition IDs.
- **`full-evidence.csv.gz`** (236.9 MB): contributing editions and original JSONL line pointers.
- **`full-scores.sqlite.gz`** (327.3 MB): a portable database containing scores and provenance.

The release also includes the source manifest, data notice, opening instructions and `SHA256SUMS.txt`. Large data files are release downloads, not part of the Git checkout. Sizes above use decimal MB.

To use the explorer, unzip it, open a terminal in the extracted folder and run:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/>. Use `python3` if that is your Python command. Choose an entry language, search an exact spelling or prefix, sort columns globally, and enter a page number to jump directly. The page size is configurable. No regeneration or Node installation is needed to browse the snapshot. Direct `file://` opening is unsupported; the static files need an HTTP server. There are no accounts, analytics or live upstream data requests.

CSV files are UTF-8 gzip files; decompress them with a gzip-capable tool and import spellings as text. SQLite users should decompress the `.sqlite.gz` file. Language filenames inside the ZIP are mapped by `snapshots/2026-10-23-first/languages.json`.

## What the snapshot contains

**21,849,856 exact language/form pairs**, in **7,072 raw language-code buckets**, from **38,770,932 records** across these 21 editions:

`cs de el en es fr id it ja ko ku ms nl pl pt ru simple th tr vi zh`

Each edition contributes at most one vote per language/form, including the language's own edition. Repeated senses, parts of speech and etymologies do not add votes. Translation mentions, interwiki links and nested form lists do not count. Explicit top-level form entries do. Equal counts share competition rank: 1, 1, 3. `foreign_only_count` is a separately named comparison.

Entry languages and source editions are independent. All qualifying entry languages are included; the raw-code bucket count is not a claim of 7,072 standardized natural languages. Case, accents, combining sequences, scripts and spellings are preserved without Unicode normalization or code/variant merging. No gloss text is included.

The English source uses a September 2 dump and September 20 extraction; the others use October 1-2 dumps and October 16-18 extractions. Assembly does not synchronize those dates. All retained extractions passed processing checks, but extraction omissions remain possible. Absence means not observed in those files; failed or unprocessed coverage is unknown, not zero. Exact dates, URLs, hashes and source distributions are in the [frozen manifest](manifests/2026-10-23-first.json).

## Method and code

The Python standard-library pipeline streams raw Kaikki JSONL/gzip, deduplicates `(entry language, written form, edition)`, and computes counts and tied ranks. It exports CSV, evidence, SQLite and static chunks; a Node script builds language-aware display ordering. It does not require a private database or post-processed Kaikki downloads.

[Rebuilding instructions](docs/REBUILDING.md) describe the input contract and commands. Exact historical regeneration requires the matching original archives and recorded versions; those archives are not included, and current upstream URLs may serve newer bytes. Later raw extracts can be processed with a new reviewed manifest, but will produce a new snapshot. The code is supplied as-is, without an update service.

See [methodology and schema](docs/METHODOLOGY.md), [validation](docs/VALIDATION.md), [licensing](LICENSE.md) and [source attribution](NOTICE.md).

Original project contributions and any compilation rights held by the publisher are dedicated under CC0, without a project attribution requirement. Third-party rights remain separate; the dedication does not declare all upstream data public domain.
