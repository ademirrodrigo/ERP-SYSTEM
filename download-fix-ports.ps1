# Download fix-ports.bat do GitHub
Write-Host "Baixando fix-ports.bat..." -ForegroundColor Cyan

$url = "https://raw.githubusercontent.com/ademirrodrigo/whatsaasinstall/claude/erp-multicompany-system-011CUfzAksTb7Aznhq7Vyqy9/fix-ports.bat"
$output = "fix-ports.bat"

try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "OK - Arquivo baixado com sucesso: $output" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora execute: fix-ports.bat (como Administrador)" -ForegroundColor Yellow
} catch {
    Write-Host "ERRO ao baixar arquivo!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
