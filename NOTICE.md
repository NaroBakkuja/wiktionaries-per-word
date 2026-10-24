# Third-party sources and attribution

The snapshot is derived from **Wiktionary contributors**, using **Kaikki.org** extractions produced by **Wiktextract**. It transforms raw entries into distinct edition presences, inclusive counts, competition ranks, evidence line pointers and display indexes. It does not distribute raw definitions/glosses, media or complete extraction archives. The project makes no claim to exclusive rights in bare words or facts.

## Source identification

The fixed source panel is `cs de el en es fr id it ja ko ku ms nl pl pt ru simple th tr vi zh`. The frozen manifest identifies each edition's raw download URL, dump/extraction/retrieval dates, sizes and checksums. In the explorer ZIP it is `snapshots/2026-10-23-first/manifest.json`; it is also supplied as `source-manifest.json` beside the release assets.

Score rows list contributing `edition_ids`; evidence rows record `edition_id` and one-based `first_raw_line` in the matching decompressed archive. A current entry/history can be reached at `https://EDITION.wiktionary.org/wiki/URL_ENCODED_WORD`. The explorer provides these links. They identify the contributing Wikimedia project/page; they do not by themselves identify a historical revision in the extraction. Exact raw bytes and line pointers are the frozen evidence.

## Upstream notices

[Kaikki's data notice](https://kaikki.org/dictionary/index.html) states that its data has the same licensing as Wiktionary, CC BY-SA and GFDL. [Wikimedia's Terms of Use, section 7](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content) describes CC BY-SA 4.0 and, where applicable, GFDL; imported text and other material can have additional notices or exceptions. These notices and third-party rights are not waived by the publisher's scoped CC0 dedication. Use the applicable terms where permission is required; no blanket claim about every source entry's copyright status or license is made here.

Relevant license texts: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en) and [GFDL](https://www.gnu.org/licenses/fdl-1.3.html). The [Wiktextract software license](https://github.com/tatuylonen/wiktextract/blob/master/LICENSE) concerns its software and specified exceptions; it does not independently relicense extracted dictionary content. See also the [raw data documentation](https://kaikki.org/dictionary/rawdata.html).

A verified notice inconsistency exists on [Turkish Wiktionary's copyright-policy page](https://tr.wiktionary.org/wiki/Vikis%C3%B6zl%C3%BCk:Telif_hakk%C4%B1): its body, last edited in 2017, links [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/), while the current footer links [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.tr). This records the notices without treating the inconsistency as an established prohibition on these word-presence outputs. The 21-edition panel is unchanged.

The publisher applies CC0 only to rights the publisher holds in original code, original documentation and the generated compilation; this creates no project attribution requirement. See [LICENSE.md](https://github.com/NaroBakkuja/wiktionaries-per-word/blob/2026-10-23/LICENSE.md) for that scope. The original code and documentation are separate from upstream-derived written forms, language labels and source metadata included in the data outputs. Nothing here restricts public-domain material or uses that do not require permission.

Source notices were reviewed on 2026-10-24. For academic attribution, Kaikki requests citation of Tatu Ylonen, *Wiktextract: Wiktionary as Machine-Readable Structured Data*, LREC 2022.

## Software and packaging

The release contains project source code and static HTML/CSS/JavaScript, plus derived data. Python, SQLite, Node and ICU are build/runtime dependencies, not bundled software in these downloads. No third-party libraries, fonts, media or raw extraction archives are bundled. This notice does not relicense those external projects.
