param(
  [Parameter(Mandatory=$true)][string]$DataRoot,
  [Parameter(Mandatory=$true)][string]$Paths,
  [string]$Manifest = "manifests/2026-10-23-first.json"
)
$ErrorActionPreference = "Stop"
# Choose a new DataRoot for a fresh rebuild. No existing outputs are deleted.
$targetRoot = [IO.Path]::GetFullPath($DataRoot)
New-Item -ItemType Directory -Force -Path "$targetRoot/tmp","$targetRoot/checkpoints" | Out-Null
$env:TEMP = "$targetRoot/tmp"
$env:TMP = $env:TEMP
$env:SQLITE_TMPDIR = $env:TEMP
python -X utf8 -m unittest discover -s tests -v
if ($LASTEXITCODE -ne 0) { throw "Python tests failed" }
node tests/web.test.mjs
if ($LASTEXITCODE -ne 0) { throw "Offline JavaScript tests failed" }
python -X utf8 -m wpw.pipeline ingest --manifest $Manifest --paths $Paths --database "$targetRoot/presence.sqlite" --checkpoints "$targetRoot/checkpoints"
if ($LASTEXITCODE -ne 0) { throw "Source ingest failed; see checkpoints" }
python -X utf8 -m wpw.pipeline score --database "$targetRoot/presence.sqlite" --output "$targetRoot/scores.sqlite"
if ($LASTEXITCODE -ne 0) { throw "Score assembly failed" }
python -X utf8 -m wpw.validate scores --database "$targetRoot/scores.sqlite" --output "$targetRoot/score-validation.json"
if ($LASTEXITCODE -ne 0) { throw "Score validation failed" }
python -X utf8 -m wpw.export --scores "$targetRoot/scores.sqlite" --presence "$targetRoot/presence.sqlite" --output "$targetRoot/artifacts" --web web
if ($LASTEXITCODE -ne 0) { throw "Export failed" }
node scripts/build_ui_indexes.mjs --root "$targetRoot/artifacts"
if ($LASTEXITCODE -ne 0) { throw "Display ordering index failed" }
Write-Output "Artifacts staged at $targetRoot/artifacts. Nothing published."
