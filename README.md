# Wiktionaries per Word

Wiktionaries per Word counts how many language editions of Wiktionary contain a direct entry for a word in a particular language. The idea is that coverage across dictionaries may be a useful rough guide when choosing vocabulary to learn.

My impression is that the rankings generally look useful, though they have some odd results. In the English snapshot, for example, `abase` appears in 20 editions and has tied rank 32, above `now` with 19 editions and tied rank 458. I don't take that example as representative of the ranking as a whole, but there has been no systematic evaluation of how well the score reflects learning value.

What the score measures is editorial coverage. It is not a frequency list, and basic-word lists, shared editorial sources and uneven coverage can skew the results.

This is a one-time snapshot, assembled on October 23, 2026. The project is unmaintained, with no commitment to support it, update the data or adapt the code to future input formats.

## Download and browse

The [release downloads](https://github.com/NaroBakkuja/wiktionaries-per-word/releases/tag/2026-10-23) include:

- **`wiktionaries-per-word-2026-10-23-explorer.zip`** (1.38 GB): the complete explorer, all language data, per-language downloads, provenance and file checksums.
- **`full-scores.csv.gz`** (98.9 MB): all word counts, tied ranks and contributing edition IDs.
- **`full-evidence.csv.gz`** (236.9 MB): contributing editions and line pointers into the original JSONL files.
- **`full-scores.sqlite.gz`** (327.3 MB): a portable database of scores and provenance.

Sizes use decimal MB and GB. These files are separate from the Git checkout. The release also includes the source manifest, licensing notices, opening instructions and `SHA256SUMS.txt`.

To browse the snapshot, unzip the explorer, open a terminal in the extracted folder and run:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8765/>. Use `python3` if that is your Python command. The explorer needs a local HTTP server; opening its HTML file directly with `file://` will not work.

You can choose an entry language, search an exact spelling or prefix, sort the full results, change the page size and jump to a page number. Everything needed to browse is already in the ZIP, so no data regeneration or Node installation is needed. The explorer has no accounts, analytics or live upstream data requests.

For use in other tools, decompress the UTF-8 CSV or SQLite downloads. Import CSV spellings as text to preserve them. Within the ZIP, `snapshots/2026-10-23-first/languages.json` maps language codes to their filenames.

## How the counts work

The snapshot contains 21,849,856 exact language/form pairs across 7,072 raw language-code buckets, drawn from 38,770,932 records in these 21 source editions:

`cs de el en es fr id it ja ko ku ms nl pl pt ru simple th tr vi zh`

A word counts only when an edition contains a direct entry for that exact written form, explicitly attributed to the entry language. Each contributing edition gets one vote, including the language's own edition. Extra senses, parts of speech or etymologies do not add votes. Translation mentions, interwiki links and nested form lists do not count; explicit top-level form entries do.

Equal counts share a competition rank: 1, 1, 3. The optional `foreign_only_count` excludes the language's own edition and is kept as a separate comparison.

Source editions and entry languages are different things: an English Wiktionary extract, for example, contains entries for many languages. This snapshot includes all qualifying entry languages in the retained files. The 7,072 buckets preserve upstream language codes; they should not be read as a count of standardized natural languages. Case, accents, combining sequences, scripts and spellings are preserved without Unicode normalization or merging codes and variants. No gloss text is included.

The sources come from different dates. The English extract uses a September 2, 2026 dump and a September 20 extraction. The others use October 1–2 dumps and October 16–18 extractions. October 23 is the assembly date, not a common date for all the sources. Exact dates, URLs, hashes and source distributions are in the [frozen manifest](manifests/2026-10-23-first.json).

All retained extractions passed processing checks, but they may still omit entries. Absence means a form was not observed in those files. Failed or unprocessed source coverage is treated as unknown, not zero.

## Using the code

The Python standard-library pipeline reads raw Kaikki JSONL or gzip files, deduplicates `(entry language, written form, edition)`, and calculates counts and tied ranks. It exports CSV, evidence, SQLite and static data chunks. A Node script adds language-aware display ordering. The pipeline does not require a private database or post-processed Kaikki downloads.

The [rebuilding instructions](docs/REBUILDING.md) cover the input contract and commands. Reproducing this exact snapshot requires the matching original archives and recorded versions. Those archives are not included, and the upstream URLs may now serve different files. Later raw extracts can be used with a new reviewed manifest to produce a new snapshot.

More detail is available in the [methodology and schema](docs/METHODOLOGY.md) and [validation notes](docs/VALIDATION.md).

## Rights and sources

Original project contributions and any compilation rights held by the publisher are dedicated under CC0, with no requirement to attribute this project. Wiktionary, Kaikki and other third-party rights remain separate; the dedication does not make all upstream data public domain. See the [license scope](LICENSE.md) and [source attribution](NOTICE.md).

*This README was drafted by an LLM from the project author's instructions.*
