param(
  [ValidateSet('local','deploy-pages')]
  [string]$Mode = 'local',

  [string]$RepoUrl = 'https://github.com/peterxing/farmbot-platform',
  [string]$Dir = "$PWD\\farmbot-platform"
)

$ErrorActionPreference = 'Stop'

function Assert-Bin($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Missing required binary on PATH: $name" }
}

Assert-Bin git
Assert-Bin node
Assert-Bin npm

if (-not (Test-Path $Dir)) {
  Write-Output "Cloning $RepoUrl -> $Dir"
  git clone $RepoUrl $Dir
}

Set-Location $Dir

npm install

if ($Mode -eq 'local') {
  Write-Output "\nRun locally:\n- npm run dev:api\n- npm run dev:web\nOpen: http://127.0.0.1:5173/"
  exit 0
}

if ($Mode -eq 'deploy-pages') {
  npm run deploy:pages
  Write-Output "\nDeployed. Primary URL: https://farmbot-platform-mvp.pages.dev"
  exit 0
}
