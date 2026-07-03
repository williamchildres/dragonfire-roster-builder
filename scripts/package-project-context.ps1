param(
  [switch]$SelfTest,
  [string]$NodePath = $env:npm_node_execpath,
  [string]$RepositoryRoot = '',
  [switch]$GuardOnly
)

$ErrorActionPreference = 'Stop'

$root = if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
  Resolve-Path (Join-Path $PSScriptRoot '..')
} else {
  Resolve-Path $RepositoryRoot
}
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

function Invoke-Git {
  param([string[]]$Arguments)

  $output = & git @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed: $output"
  }
  return ($output | Out-String).Trim()
}

function Assert-FullCommitSha {
  param([string]$Commit)

  if ($Commit -notmatch '^[a-fA-F0-9]{40}$') {
    throw "Source commit must be a full 40-character Git SHA: $Commit"
  }
  $type = Invoke-Git -Arguments @('cat-file', '-t', $Commit)
  if ($type -ne 'commit') {
    throw "Source commit must name a commit object: $Commit"
  }
}

function Get-SourceProvenance {
  Push-Location $root
  try {
    $branch = Invoke-Git -Arguments @('branch', '--show-current')
    if ([string]::IsNullOrWhiteSpace($branch)) {
      $branch = Invoke-Git -Arguments @('rev-parse', '--abbrev-ref', 'HEAD')
    }
    if ([string]::IsNullOrWhiteSpace($branch)) {
      throw 'Source branch must be non-empty before packaging project context.'
    }

    $commit = Invoke-Git -Arguments @('rev-parse', 'HEAD')
    Assert-FullCommitSha -Commit $commit

    return @{
      Branch = $branch
      Commit = $commit
    }
  } finally {
    Pop-Location
  }
}

function Convert-GitPath {
  param([string]$Path)

  return $Path.Replace('\', '/')
}

function Is-AllowedGeneratedPath {
  param([string]$Path)

  $normalized = Convert-GitPath $Path
  return $normalized -eq 'project-context.zip' -or $normalized.StartsWith('project-context/')
}

function Get-DisallowedStatusEntries {
  Push-Location $root
  try {
    $lines = @(& git status --porcelain=v1 --untracked-files=all)
    if ($LASTEXITCODE -ne 0) {
      throw 'git status --porcelain failed.'
    }
  } finally {
    Pop-Location
  }

  $entries = @()
  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.Length -lt 4) {
      continue
    }

    $status = $line.Substring(0, 2)
    $path = $line.Substring(3)
    if ($path.Contains(' -> ')) {
      $path = ($path -split ' -> ')[-1]
    }
    $path = Convert-GitPath $path.Trim('"')

    if (Is-AllowedGeneratedPath $path) {
      continue
    }

    $states = @()
    if ($status -eq '??') {
      $states += 'untracked'
    } else {
      if ($status[0] -ne ' ') {
        $states += 'staged'
      }
      if ($status[1] -ne ' ') {
        $states += 'unstaged'
      }
    }

    $entries += [pscustomobject]@{
      Status = $status
      Path = $path
      State = if ($states.Count -gt 0) { $states -join '+' } else { 'changed' }
    }
  }

  return $entries
}

function Assert-CleanSourceTree {
  $disallowed = @(Get-DisallowedStatusEntries)
  if ($disallowed.Count -eq 0) {
    return
  }

  $lines = @('Packaging blocked because source changes exist outside project-context/** and project-context.zip.')
  foreach ($entry in $disallowed) {
    $lines += "$($entry.State): $($entry.Path)"
  }
  $lines += 'Commit or discard source changes before packaging project context so the recorded source commit matches the exported source tree.'
  throw ($lines -join [Environment]::NewLine)
}

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
  param(
    [string]$ScriptName,
    [string[]]$Arguments = @()
  )

  Push-Location $root
  try {
    & (Resolve-NodePath) (Join-Path $root "scripts/$ScriptName") @Arguments
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

function Get-ContextDirectoryStats {
  $files = @(Get-ChildItem -LiteralPath $contextDir -File -Recurse)
  $bytes = ($files | Measure-Object -Property Length -Sum).Sum
  if ($null -eq $bytes) {
    $bytes = 0
  }
  return @{
    Count = $files.Count
    Bytes = [int64]$bytes
  }
}

function Assert-GeneratedProvenance {
  param(
    [string]$SourceBranch,
    [string]$SourceCommit
  )

  $markdownPath = Join-Path $contextDir 'PROJECT_CONTEXT.md'
  $contextPath = Join-Path $contextDir 'dragonfire-project-context.json'
  $statePath = Join-Path $contextDir 'project-state.json'

  $markdown = Get-Content -LiteralPath $markdownPath -Raw
  if ($markdown -notmatch [regex]::Escape("Branch: $SourceBranch") -or $markdown -notmatch [regex]::Escape("Commit: $SourceCommit")) {
    throw 'PROJECT_CONTEXT.md source provenance does not match the captured branch and commit.'
  }

  $context = Get-Content -LiteralPath $contextPath -Raw | ConvertFrom-Json
  if ($context.source.branch -ne $SourceBranch -or $context.source.commit -ne $SourceCommit) {
    throw 'dragonfire-project-context.json source provenance does not match the captured branch and commit.'
  }

  $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
  if ($state.source.branch -ne $SourceBranch -or $state.source.commit -ne $SourceCommit) {
    throw 'project-state.json source provenance does not match the captured branch and commit.'
  }
}

if ($SelfTest) {
  $provenance = Get-SourceProvenance
  Assert-CleanSourceTree
  New-Item -ItemType Directory -Path $contextDir -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $contextDir 'formation-review-cases-stale.txt') -Value 'stale legacy context' -Encoding UTF8
} else {
  $provenance = Get-SourceProvenance
  Assert-CleanSourceTree
}

if ($GuardOnly) {
  Write-Host "Source branch: $($provenance.Branch)"
  Write-Host "Source commit: $($provenance.Commit)"
  Write-Host 'Clean-source guard: passed'
  exit 0
}

Invoke-NodeScript -ScriptName 'export-project-context.mjs' -Arguments @('--source-branch', $provenance.Branch, '--source-commit', $provenance.Commit)

if ($SelfTest -and (Test-Path -LiteralPath (Join-Path $contextDir 'formation-review-cases-stale.txt'))) {
  throw 'Self-test stale file survived context export.'
}

Assert-GeneratedProvenance -SourceBranch $provenance.Branch -SourceCommit $provenance.Commit
Invoke-NodeScript -ScriptName 'validate-project-context.mjs'

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$expectedEntries = @(Get-ContextFileSet)
Assert-NoForbiddenPath -Paths $expectedEntries
$contextStats = Get-ContextDirectoryStats

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
Write-Host "Source branch: $($provenance.Branch)"
Write-Host "Source commit: $($provenance.Commit)"
Write-Host "Context files: $($contextStats.Count)"
Write-Host "Context bytes: $($contextStats.Bytes)"
Write-Host "ZIP bytes: $zipSize"
Write-Host "ZIP entries: $($actualEntries.Count)"
