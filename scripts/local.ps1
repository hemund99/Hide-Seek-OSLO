# Uses installed tools, or Codex's bundled tools if they are not on PATH.
# PATH changes apply to this PowerShell process only.
$ErrorActionPreference = 'Stop'
$runtimeDependencies = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
foreach ($relativeDirectory in @('node\bin', 'native\git\cmd', 'bin\fallback', 'python')) {
    $toolDirectory = Join-Path $runtimeDependencies $relativeDirectory
    if (Test-Path -LiteralPath $toolDirectory) { $env:PATH += ";$toolDirectory" }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js >=22.13.0 first.' }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'Install pnpm 11.25.0 first.' }
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    [string[]]$pnpmArguments = if ($args.Count) { $args } else { @('dev') }
    & pnpm @pnpmArguments
    $commandExitCode = $LASTEXITCODE
} finally { Pop-Location }
exit $commandExitCode
