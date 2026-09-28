param([ValidateSet('preview','build')][string]$Mode = 'preview')
$ErrorActionPreference = 'Stop'
$runtime = Get-Command node -ErrorAction SilentlyContinue
if ($runtime) { $nodePath = $runtime.Source }
else {
    $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js is required. Install Node.js, then reopen this launcher.' }
}
if ($Mode -eq 'preview') { & $nodePath (Join-Path $PSScriptRoot 'preview.mjs') }
else { & $nodePath (Join-Path $PSScriptRoot 'content.mjs') --site }
if ($LASTEXITCODE -ne 0) { throw 'The site was not updated. Correct the reported note and try again.' }
