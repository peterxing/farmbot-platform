param(
  [int]$Rows = 10,
  [int]$Cols = 10,
  [int]$TotalAreaSqm = 242800
)

$ErrorActionPreference = 'Stop'

$outPath = Join-Path $PSScriptRoot '..\apps\api\data\plots.json'

$plots = @()

# Integer sqm per plot for display; remainder is distributed +1 sqm to first N plots
$baseArea = [math]::Floor($TotalAreaSqm / ($Rows * $Cols))
$remainder = $TotalAreaSqm - ($baseArea * $Rows * $Cols)

$idx = 1

for ($r = 1; $r -le $Rows; $r++) {
  for ($c = 1; $c -le $Cols; $c++) {
    $x0 = ($c - 1) / [double]$Cols
    $x1 = $c / [double]$Cols
    $y0 = ($r - 1) / [double]$Rows
    $y1 = $r / [double]$Rows

    $id = ('plot_{0:D3}' -f $idx)
    $name = ('Grid r{0:D2}c{1:D2}' -f $r, $c)

    $areaSqm = $baseArea
    if ($idx -le $remainder) { $areaSqm = $baseArea + 1 }

    $plots += [ordered]@{
      id = $id
      name = $name
      areaSqm = $areaSqm
      polygonImage = @(
        @($x0, $y0),
        @($x1, $y0),
        @($x1, $y1),
        @($x0, $y1)
      )
    }

    $idx++
  }
}

# Out-File writes a UTF-8 BOM by default; API loader strips BOM, so this is fine.
$plots | ConvertTo-Json -Depth 6 | Out-File -Encoding UTF8 $outPath
Write-Output "Wrote $($plots.Count) plots ($Rows x $Cols) to $outPath; baseArea=$baseArea remainder=$remainder"
