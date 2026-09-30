param([switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot
$previewUrl = 'http://127.0.0.1:4173/'

function Test-RitualPreview {
  $response = $null
  $reader = $null
  try {
    $request = [System.Net.HttpWebRequest]::Create($previewUrl)
    $request.Proxy = $null
    $request.Timeout = 1500
    $request.ReadWriteTimeout = 1500
    $response = $request.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    return $reader.ReadToEnd().Contains('Ritual Virtual')
  } catch { return $false }
  finally {
    if ($reader) { $reader.Dispose() }
    if ($response) { $response.Dispose() }
  }
}

try {
  $chromeCandidates = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  $chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $chromePath) { throw 'No se encontro Google Chrome instalado.' }
  Write-Host 'Comprobando la vista previa local...'
  if (-not (Test-RitualPreview)) {
    $pythonCandidates = @(
      "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
      "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
      "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
    )
    $pythonPath = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $pythonPath) {
      $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
      if ($pythonCommand -and $pythonCommand.Source -notlike '*WindowsApps*') { $pythonPath = $pythonCommand.Source }
    }
    if (-not $pythonPath) { throw 'No se encontro Python. Instala Python para iniciar la vista previa.' }
    Write-Host 'Iniciando el servidor local...'
    $serverLog = Join-Path $env:TEMP "ritual-preview-$PID.log"
    $serverProcess = Start-Process -FilePath $pythonPath -ArgumentList '-m http.server 4173 --bind 127.0.0.1' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardError $serverLog -PassThru
    $deadline = (Get-Date).AddSeconds(15)
    do {
      if (Test-RitualPreview) { break }
      if ($serverProcess.HasExited) { throw "El servidor no pudo iniciar. Detalle: $serverLog" }
      Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)
  }
  if (-not (Test-RitualPreview)) { throw 'La vista previa no responde en el puerto 4173. Puede estar ocupado por otro programa.' }
  if ($VerifyOnly) {
    Write-Host "Verificado: servidor disponible y Chrome encontrado en $chromePath"
  } else {
    Write-Host 'Abriendo Google Chrome...'
    Start-Process -FilePath $chromePath -ArgumentList $previewUrl
    Write-Host 'Listo. Puedes cerrar esta ventana; el servidor seguira activo.'
  }
  exit 0
} catch {
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
