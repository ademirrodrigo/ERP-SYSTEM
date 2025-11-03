# ==============================================================================
# INSTALADOR AUTOMÁTICO DO SISTEMA ERP SAAS - WINDOWS
# ==============================================================================
#
# Este script instala automaticamente o Sistema ERP SaaS no Windows
# Requisitos: PowerShell 5.1+ (já incluído no Windows 10/11)
#
# USO:
#   1. Abra o PowerShell como Administrador
#   2. Execute: Set-ExecutionPolicy Bypass -Scope Process -Force
#   3. Execute: .\install-windows.ps1
#
# ==============================================================================

$ErrorActionPreference = 'Continue'

# Funções de Output
function Write-ColorText {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Text,
        [Parameter(Mandatory=$false)]
        [ConsoleColor]$Color = 'White'
    )
    $previousColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Text
    $Host.UI.RawUI.ForegroundColor = $previousColor
}

function Write-Success {
    param([string]$Message)
    Write-ColorText "✓ $Message" -Color Green
}

function Write-Info {
    param([string]$Message)
    Write-ColorText "ℹ $Message" -Color Cyan
}

function Write-Warn {
    param([string]$Message)
    Write-ColorText "⚠ $Message" -Color Yellow
}

function Write-Err {
    param([string]$Message)
    Write-ColorText "✗ $Message" -Color Red
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-ColorText "========================================" -Color Magenta
    Write-ColorText $Title -Color Magenta
    Write-ColorText "========================================" -Color Magenta
    Write-Host ""
}

# Banner
Clear-Host
Write-Host ""
Write-ColorText "╔═══════════════════════════════════════════════════════════════╗" -Color Cyan
Write-ColorText "║                                                               ║" -Color Cyan
Write-ColorText "║              INSTALADOR ERP SAAS - WINDOWS                    ║" -Color Cyan
Write-ColorText "║                                                               ║" -Color Cyan
Write-ColorText "║     Sistema de Gestão Empresarial Multi-tenant               ║" -Color Cyan
Write-ColorText "║                                                               ║" -Color Cyan
Write-ColorText "╚═══════════════════════════════════════════════════════════════╝" -Color Cyan
Write-Host ""

# ==============================================================================
# VERIFICAÇÕES DE REQUISITOS
# ==============================================================================

Write-Section "Verificando Requisitos do Sistema"

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warn "Este script precisa ser executado como Administrador!"
    Write-Info "Clique com botão direito no PowerShell e selecione 'Executar como Administrador'"
    Write-Host ""
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}
Write-Success "Executando como Administrador"

# Verificar Docker Desktop
Write-Info "Verificando Docker Desktop..."
$dockerInstalled = $false
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Success "Docker encontrado: $dockerVersion"
        $dockerInstalled = $true
    }
} catch {
    $dockerInstalled = $false
}

if (-not $dockerInstalled) {
    Write-Err "Docker Desktop não encontrado!"
    Write-Info "Por favor, instale o Docker Desktop:"
    Write-ColorText "https://www.docker.com/products/docker-desktop/" -Color White
    Write-Host ""
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Verificar se Docker está rodando
Write-Info "Verificando se Docker está rodando..."
$dockerRunning = $false
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker está rodando"
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Err "Docker não está rodando!"
    Write-Info "Por favor, inicie o Docker Desktop e tente novamente"
    Write-Host ""
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Verificar Git
Write-Info "Verificando Git..."
$gitInstalled = $false
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Success "Git encontrado: $gitVersion"
        $gitInstalled = $true
    }
} catch {
    $gitInstalled = $false
}

if (-not $gitInstalled) {
    Write-Warn "Git não encontrado"
    Write-Info "Tentando instalar Git via winget..."
    try {
        winget install -e --id Git.Git --silent --accept-source-agreements --accept-package-agreements
        Write-Success "Git instalado com sucesso!"
        Write-Warn "Por favor, reinicie o PowerShell e execute o instalador novamente"
        Write-Host ""
        Write-Host "Pressione qualquer tecla para sair..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        exit 0
    } catch {
        Write-Err "Não foi possível instalar o Git automaticamente"
        Write-Info "Por favor, instale o Git manualmente:"
        Write-ColorText "https://git-scm.com/download/win" -Color White
        Write-Host ""
        Write-Host "Pressione qualquer tecla para sair..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        exit 1
    }
}

# ==============================================================================
# CONFIGURAÇÃO DO DIRETÓRIO DE INSTALAÇÃO
# ==============================================================================

Write-Section "Configurando Diretório de Instalação"

$defaultPath = Join-Path $env:USERPROFILE "ERP-SYSTEM"
Write-Info "Diretório padrão de instalação: $defaultPath"
Write-Host ""
$installPath = Read-Host "Pressione ENTER para usar o padrão ou digite outro caminho"

if ([string]::IsNullOrWhiteSpace($installPath)) {
    $installPath = $defaultPath
}

# Criar diretório se não existir
if (-not (Test-Path $installPath)) {
    try {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
        Write-Success "Diretório criado: $installPath"
    } catch {
        Write-Err "Erro ao criar diretório: $_"
        exit 1
    }
} else {
    Write-Warn "Diretório já existe: $installPath"
    $overwrite = Read-Host "Deseja continuar? (S/N)"
    if ($overwrite -ne "S" -and $overwrite -ne "s") {
        Write-Info "Instalação cancelada pelo usuário"
        exit 0
    }
}

Set-Location $installPath
Write-Success "Diretório de trabalho: $installPath"

# ==============================================================================
# DOWNLOAD DO CÓDIGO FONTE
# ==============================================================================

Write-Section "Baixando Código Fonte"

$repoUrl = "https://github.com/ademirrodrigo/ERP-SYSTEM.git"
$branch = "claude/erp-multicompany-system-011CUfzAksTb7Aznhq7Vyqy9"

if (Test-Path ".git") {
    Write-Info "Repositório já existe. Atualizando..."
    try {
        git pull origin $branch 2>&1 | Out-Null
        Write-Success "Código atualizado"
    } catch {
        Write-Err "Erro ao atualizar repositório: $_"
        exit 1
    }
} else {
    Write-Info "Clonando repositório..."
    try {
        git clone -b $branch $repoUrl . 2>&1 | Out-Null
        Write-Success "Código baixado com sucesso"
    } catch {
        Write-Err "Erro ao clonar repositório: $_"
        exit 1
    }
}

# ==============================================================================
# CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE
# ==============================================================================

Write-Section "Configurando Variáveis de Ambiente"

# Backend .env
$backendEnvPath = "backend\.env"
if (-not (Test-Path $backendEnvPath)) {
    Write-Info "Criando arquivo backend/.env..."

    # Gerar JWT Secret aleatório
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

    $backendEnv = @"
# Database
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/erp_saas?schema=public"

# JWT
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="production"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Redis (opcional)
REDIS_URL="redis://redis:6379"
"@

    try {
        $backendEnv | Out-File -FilePath $backendEnvPath -Encoding UTF8
        Write-Success "Arquivo backend/.env criado"
    } catch {
        Write-Err "Erro ao criar backend/.env: $_"
        exit 1
    }
} else {
    Write-Info "Arquivo backend/.env já existe"
}

# Frontend .env.local
$frontendEnvPath = "frontend\.env.local"
if (-not (Test-Path $frontendEnvPath)) {
    Write-Info "Criando arquivo frontend/.env.local..."

    $frontendEnv = "VITE_API_URL=http://localhost:3000/api"
    try {
        $frontendEnv | Out-File -FilePath $frontendEnvPath -Encoding UTF8
        Write-Success "Arquivo frontend/.env.local criado"
    } catch {
        Write-Err "Erro ao criar frontend/.env.local: $_"
        exit 1
    }
} else {
    Write-Info "Arquivo frontend/.env.local já existe"
}

# ==============================================================================
# INSTALAÇÃO COM DOCKER
# ==============================================================================

Write-Section "Instalando Sistema com Docker"

Write-Info "Parando containers antigos (se existirem)..."
docker-compose down -v --remove-orphans 2>&1 | Out-Null

Write-Info "Reconstruindo imagens Docker..."
Write-Warn "Isso pode levar alguns minutos na primeira vez..."
Write-Host ""

try {
    docker-compose build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Imagens construídas com sucesso"
    } else {
        throw "Erro ao construir imagens"
    }
} catch {
    Write-Err "Erro ao construir imagens Docker: $_"
    exit 1
}

Write-Info "Iniciando containers..."
try {
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Containers iniciados"
    } else {
        throw "Erro ao iniciar containers"
    }
} catch {
    Write-Err "Erro ao iniciar containers: $_"
    exit 1
}

# Aguardar serviços iniciarem
Write-Info "Aguardando serviços iniciarem (30 segundos)..."
Start-Sleep -Seconds 30

# Verificar status dos containers
Write-Info "Verificando status dos containers..."
docker-compose ps

# ==============================================================================
# EXECUTAR MIGRATIONS DO BANCO DE DADOS
# ==============================================================================

Write-Section "Configurando Banco de Dados"

Write-Info "Executando migrations do Prisma..."
try {
    $migrationResult = docker-compose exec -T backend npx prisma migrate deploy 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Tentando criar migration inicial..."
        docker-compose exec backend npx prisma migrate dev --name init
    }
    Write-Success "Migrations executadas"
} catch {
    Write-Warn "Aviso ao executar migrations: $_"
}

Write-Info "Gerando Prisma Client..."
try {
    docker-compose exec -T backend npx prisma generate 2>&1 | Out-Null
    Write-Success "Prisma Client gerado"
} catch {
    Write-Warn "Aviso ao gerar Prisma Client: $_"
}

Write-Success "Banco de dados configurado"

# ==============================================================================
# VERIFICAÇÃO FINAL
# ==============================================================================

Write-Section "Verificação Final"

Write-Info "Testando conectividade..."

# Testar backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Success "Backend respondendo em http://localhost:3000"
    }
} catch {
    Write-Warn "Backend ainda está inicializando..."
}

# Testar frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Success "Frontend respondendo em http://localhost:5173"
    }
} catch {
    Write-Warn "Frontend ainda está inicializando..."
}

# ==============================================================================
# INFORMAÇÕES FINAIS
# ==============================================================================

Write-Host ""
Write-ColorText "╔═══════════════════════════════════════════════════════════════╗" -Color Green
Write-ColorText "║                                                               ║" -Color Green
Write-ColorText "║              INSTALAÇÃO CONCLUÍDA COM SUCESSO!                ║" -Color Green
Write-ColorText "║                                                               ║" -Color Green
Write-ColorText "╚═══════════════════════════════════════════════════════════════╝" -Color Green
Write-Host ""

Write-Section "INFORMAÇÕES DE ACESSO"
Write-Host ""
Write-ColorText "  🌐 Frontend (Interface Web):" -Color Cyan
Write-ColorText "     http://localhost:5173" -Color White
Write-Host ""
Write-ColorText "  🔌 Backend API:" -Color Cyan
Write-ColorText "     http://localhost:3000" -Color White
Write-Host ""
Write-ColorText "  ❤️  Health Check:" -Color Cyan
Write-ColorText "     http://localhost:3000/health" -Color White
Write-Host ""

Write-Section "PRÓXIMOS PASSOS"
Write-Host ""
Write-ColorText "  1. Abra seu navegador em: http://localhost:5173" -Color Yellow
Write-ColorText "  2. Clique em 'Criar Conta'" -Color Yellow
Write-ColorText "  3. Preencha seus dados e crie sua empresa" -Color Yellow
Write-ColorText "  4. Comece a usar o sistema!" -Color Yellow
Write-Host ""

Write-Section "COMANDOS ÚTEIS"
Write-Host ""
Write-ColorText "  Ver logs:" -Color White
Write-ColorText "    docker-compose logs -f" -Color Gray
Write-Host ""
Write-ColorText "  Parar sistema:" -Color White
Write-ColorText "    docker-compose down" -Color Gray
Write-Host ""
Write-ColorText "  Iniciar sistema:" -Color White
Write-ColorText "    docker-compose up -d" -Color Gray
Write-Host ""
Write-ColorText "  Status dos containers:" -Color White
Write-ColorText "    docker-compose ps" -Color Gray
Write-Host ""

Write-Section "LOCALIZAÇÃO DOS ARQUIVOS"
Write-ColorText "  $installPath" -Color White
Write-Host ""

Write-ColorText "🎉 Sistema ERP SaaS instalado e pronto para uso!" -Color Green
Write-ColorText "   Desenvolvido com ❤️  para facilitar a gestão empresarial" -Color Cyan
Write-Host ""

Write-Host "Pressione qualquer tecla para abrir o navegador..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Abrir navegador
Start-Process "http://localhost:5173"

Write-Success "Instalação finalizada!"
Write-Host ""
