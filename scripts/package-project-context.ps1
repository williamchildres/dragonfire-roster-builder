param(
  [switch]$SelfTest,
  [string]$NodePath = $env:npm_node_execpath
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $root 'project-context'
$zipPath = Join-Path $root 'project-context.zip'
$sizeLimitBytes = 2000000
$forbiddenNames = @(
  'formation-review-cases',
  'unresolved-mechanics',
  'capability-framework',
  'expected-interactions',
  'formation-review-case.schema',
  'synergy-capability.schema'
)

function Resolve-NodePath {
  if (-not [string]::IsNullOrWhiteSpace($NodePath)) {
    return $NodePath
  }

  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    return $nodeCommand.Source
  }

  throw 'Node.js executable was not found. Pass -NodePath or run through npm.'
}

function Invoke-NodeScript {
  param([string]$ScriptName)

  Push-Location $root
  try {
    & (Resolve-NodePath) (Join-Path $root "scripts/$ScriptName")
    if ($LASTEXITCODE -ne 0) {
      throw "$ScriptName failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

function Get-ContextFileSet {
  if (-not (Test-Path -LiteralPath $contextDir)) {
    throw 'project-context directory is missing.'
  }

  $rootPath = $root.Path.TrimEnd('\')
  Get-ChildItem -LiteralPath $contextDir -File -Recurse |
    ForEach-Object {
      $_.FullName.Substring($rootPath.Length + 1).Replace('\', '/')
    } |
    Sort-Object
}

function Read-ZipEntrySet {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $archive.Entries |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_.Name) } |
      ForEach-Object { $_.FullName.Replace('\', '/') } |
      Sort-Object
  } finally {
    $archive.Dispose()
  }
}

function Assert-NoForbiddenPath {
  param([string[]]$Paths)

  foreach ($path in $Paths) {
    foreach ($name in $forbiddenNames) {
      if ($path -like "*$name*") {
        throw "Forbidden retired path or filename found in package: $path"
      }
    }
  }
}

function Assert-SameSet {
  param(
    [string[]]$Expected,
    [string[]]$Actual
  )

  $missing = $Expected | Where-Object { $_ -notin $Actual }
  $unexpected = $Actual | Where-Object { $_ -notin $Expected }

  if ($missing.Count -gt 0) {
    throw "ZIP is missing expected files: $($missing -join ', ')"
  }

  if ($unexpected.Count -gt 0) {
    throw "ZIP contains unexpected files: $($unexpected -join ', ')"
  }
}

if ($SelfTest) {
  New-Item -ItemType Directory -Path $contextDir -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $contextDir 'formation-review-cases-stale.txt') -Value 'stale legacy context' -Encoding UTF8
}

Invoke-NodeScript 'export-project-context.mjs'

if ($SelfTest -and (Test-Path -LiteralPath (Join-Path $contextDir 'formation-review-cases-stale.txt'))) {
  throw 'Self-test stale file survived context export.'
}

Invoke-NodeScript 'validate-project-context.mjs'

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$expectedEntries = @(Get-ContextFileSet)
Assert-NoForbiddenPath -Paths $expectedEntries

Push-Location $root
try {
  Compress-Archive -LiteralPath $contextDir -DestinationPath $zipPath -CompressionLevel Optimal
} finally {
  Pop-Location
}

$actualEntries = @(Read-ZipEntrySet)
Assert-SameSet -Expected $expectedEntries -Actual $actualEntries
Assert-NoForbiddenPath -Paths $actualEntries

$zipSize = (Get-Item -LiteralPath $zipPath).Length
if ($zipSize -gt $sizeLimitBytes) {
  throw "project-context.zip is $zipSize bytes; limit is $sizeLimitBytes."
}

Write-Host "ZIP path: $zipPath"
Write-Host "ZIP bytes: $zipSize"
Write-Host "ZIP entries: $($actualEntries.Count)"
