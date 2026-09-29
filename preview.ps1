$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$previewUrl = 'http://localhost:4173/'
function Test-RitualPreview {
  try {
    $previewResponse = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
    return $previewResponse.Content.Contains('Ritual Virtual')
  } catch { return $false }
}
if (-not (Test-RitualPreview)) {
  $pythonPath = (Get-Command python -ErrorAction Stop).Source
  Start-Process -FilePath $pythonPath -ArgumentList '-m http.server 4173 --bind 127.0.0.1' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 25; $attempt++) {
    if (Test-RitualPreview) { break }
    Start-Sleep -Milliseconds 200
  }
}
if (-not (Test-RitualPreview)) { throw 'No se pudo iniciar la vista previa en el puerto 4173.' }
Start-Process $previewUrl
Write-Host 'Ritual Virtual abierto en http://localhost:4173/'
