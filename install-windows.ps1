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

# Cores para output
$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.BackgroundColor = "Black"
Clear-Host

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green "✓ $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "ℹ $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "⚠ $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "✗ $message"
}

function Write-Header($message) {
    Write-ColorOutput Magenta "`n========================================`n$message`n========================================`n"
}

# Banner
Write-Host "`n"
Write-ColorOutput Cyan @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              INSTALADOR ERP SAAS - WINDOWS                    ║
║                                                               ║
║     Sistema de Gestão Empresarial Multi-tenant               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@
Write-Host "`n"

# ==============================================================================
# VERIFICAÇÕES DE REQUISITOS
# ==============================================================================

Write-Header "Verificando Requisitos do Sistema"

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Este script precisa ser executado como Administrador!"
    Write-Info "Clique com botão direito no PowerShell e selecione 'Executar como Administrador'"
    Write-Host "`nPressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}
Write-Success "Executando como Administrador"

# Verificar Docker Desktop
Write-Info "Verificando Docker Desktop..."
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Success "Docker encontrado: $dockerVersion"
    }
} catch {
    Write-Error "Docker Desktop não encontrado!"
    Write-Info "Por favor, instale o Docker Desktop:"
    Write-Info "https://www.docker.com/products/docker-desktop/"
    Write-Host "`nPressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Verificar se Docker está rodando
Write-Info "Verificando se Docker está rodando..."
try {
    docker ps >$null 2>&1
    Write-Success "Docker está rodando"
} catch {
    Write-Error "Docker não está rodando!"
    Write-Info "Por favor, inicie o Docker Desktop e tente novamente"
    Write-Host "`nPressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Verificar Git
Write-Info "Verificando Git..."
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Success "Git encontrado: $gitVersion"
    }
} catch {
    Write-Warning "Git não encontrado. Tentando instalar via winget..."
    try {
        winget install -e --id Git.Git
        Write-Success "Git instalado com sucesso!"
        Write-Info "Por favor, reinicie o PowerShell e execute o instalador novamente"
        Write-Host "`nPressione qualquer tecla para sair..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        exit 0
    } catch {
        Write-Error "Não foi possível instalar o Git automaticamente"
        Write-Info "Por favor, instale o Git manualmente:"
        Write-Info "https://git-scm.com/download/win"
        Write-Host "`nPressione qualquer tecla para sair..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        exit 1
    }
}

# ==============================================================================
# CONFIGURAÇÃO DO DIRETÓRIO DE INSTALAÇÃO
# ==============================================================================

Write-Header "Configurando Diretório de Instalação"

$defaultPath = "$env:USERPROFILE\ERP-SYSTEM"
Write-Info "Diretório padrão de instalação: $defaultPath"
$installPath = Read-Host "Pressione ENTER para usar o padrão ou digite outro caminho"

if ([string]::IsNullOrWhiteSpace($installPath)) {
    $installPath = $defaultPath
}

# Criar diretório se não existir
if (-not (Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    Write-Success "Diretório criado: $installPath"
} else {
    Write-Warning "Diretório já existe: $installPath"
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

Write-Header "Baixando Código Fonte"

$repoUrl = "https://github.com/ademirrodrigo/ERP-SYSTEM.git"
$branch = "claude/erp-multicompany-system-011CUfzAksTb7Aznhq7Vyqy9"

if (Test-Path ".git") {
    Write-Info "Repositório já existe. Atualizando..."
    git pull origin $branch
    Write-Success "Código atualizado"
} else {
    Write-Info "Clonando repositório..."
    git clone -b $branch $repoUrl .
    Write-Success "Código baixado com sucesso"
}

# ==============================================================================
# CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE
# ==============================================================================

Write-Header "Configurando Variáveis de Ambiente"

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

    $backendEnv | Out-File -FilePath $backendEnvPath -Encoding UTF8
    Write-Success "Arquivo backend/.env criado"
} else {
    Write-Info "Arquivo backend/.env já existe"
}

# Frontend .env.local
$frontendEnvPath = "frontend\.env.local"
if (-not (Test-Path $frontendEnvPath)) {
    Write-Info "Criando arquivo frontend/.env.local..."

    $frontendEnv = "VITE_API_URL=http://localhost:3000/api"
    $frontendEnv | Out-File -FilePath $frontendEnvPath -Encoding UTF8
    Write-Success "Arquivo frontend/.env.local criado"
} else {
    Write-Info "Arquivo frontend/.env.local já existe"
}

# ==============================================================================
# INSTALAÇÃO COM DOCKER
# ==============================================================================

Write-Header "Instalando Sistema com Docker"

Write-Info "Parando containers antigos (se existirem)..."
docker-compose down -v --remove-orphans 2>$null

Write-Info "Reconstruindo imagens Docker..."
Write-Warning "Isso pode levar alguns minutos na primeira vez..."
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Error "Erro ao construir imagens Docker"
    exit 1
}
Write-Success "Imagens construídas com sucesso"

Write-Info "Iniciando containers..."
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Erro ao iniciar containers"
    exit 1
}
Write-Success "Containers iniciados"

# Aguardar serviços iniciarem
Write-Info "Aguardando serviços iniciarem (30 segundos)..."
Start-Sleep -Seconds 30

# Verificar status dos containers
Write-Info "Verificando status dos containers..."
docker-compose ps

# ==============================================================================
# EXECUTAR MIGRATIONS DO BANCO DE DADOS
# ==============================================================================

Write-Header "Configurando Banco de Dados"

Write-Info "Executando migrations do Prisma..."
docker-compose exec -T backend npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Tentando criar migration inicial..."
    docker-compose exec -T backend npx prisma migrate dev --name init
}

Write-Info "Gerando Prisma Client..."
docker-compose exec -T backend npx prisma generate

Write-Success "Banco de dados configurado"

# ==============================================================================
# VERIFICAÇÃO FINAL
# ==============================================================================

Write-Header "Verificação Final"

Write-Info "Testando conectividade..."

# Testar backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Success "Backend respondendo em http://localhost:3000"
    }
} catch {
    Write-Warning "Backend não está respondendo ainda"
    Write-Info "Os serviços podem levar alguns minutos para iniciar completamente"
}

# Testar frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Success "Frontend respondendo em http://localhost:5173"
    }
} catch {
    Write-Warning "Frontend não está respondendo ainda"
    Write-Info "Os serviços podem levar alguns minutos para iniciar completamente"
}

# ==============================================================================
# INFORMAÇÕES FINAIS
# ==============================================================================

Write-Host "`n"
Write-ColorOutput Green @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              INSTALAÇÃO CONCLUÍDA COM SUCESSO!                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@

Write-Host "`n"
Write-Header "📋 INFORMAÇÕES DE ACESSO"
Write-Host ""
Write-ColorOutput Cyan "  🌐 Frontend (Interface Web):"
Write-ColorOutput White "     http://localhost:5173"
Write-Host ""
Write-ColorOutput Cyan "  🔌 Backend API:"
Write-ColorOutput White "     http://localhost:3000"
Write-Host ""
Write-ColorOutput Cyan "  ❤️  Health Check:"
Write-ColorOutput White "     http://localhost:3000/health"
Write-Host ""
Write-ColorOutput Cyan "  🗄️  Prisma Studio (Banco de Dados):"
Write-ColorOutput White "     Execute: docker-compose exec backend npx prisma studio"
Write-ColorOutput White "     Acesse: http://localhost:5555"
Write-Host ""

Write-Header "🚀 PRÓXIMOS PASSOS"
Write-Host ""
Write-ColorOutput Yellow "  1. Abra seu navegador em: http://localhost:5173"
Write-ColorOutput Yellow "  2. Clique em 'Criar Conta'"
Write-ColorOutput Yellow "  3. Preencha seus dados e crie sua empresa"
Write-ColorOutput Yellow "  4. Comece a usar o sistema!"
Write-Host ""

Write-Header "🛠️  COMANDOS ÚTEIS"
Write-Host ""
Write-ColorOutput White "  Ver logs:"
Write-ColorOutput Gray "    docker-compose logs -f"
Write-Host ""
Write-ColorOutput White "  Parar sistema:"
Write-ColorOutput Gray "    docker-compose down"
Write-Host ""
Write-ColorOutput White "  Iniciar sistema:"
Write-ColorOutput Gray "    docker-compose up -d"
Write-Host ""
Write-ColorOutput White "  Reiniciar sistema:"
Write-ColorOutput Gray "    docker-compose restart"
Write-Host ""
Write-ColorOutput White "  Status dos containers:"
Write-ColorOutput Gray "    docker-compose ps"
Write-Host ""

Write-Header "📁 LOCALIZAÇÃO DOS ARQUIVOS"
Write-ColorOutput White "  $installPath"
Write-Host ""

Write-Header "📚 DOCUMENTAÇÃO"
Write-ColorOutput White "  README.md"
Write-ColorOutput Gray "    Documentação completa do sistema"
Write-Host ""
Write-ColorOutput White "  QUICKSTART.md"
Write-ColorOutput Gray "    Guia rápido de inicialização"
Write-Host ""

Write-ColorOutput Green "`n🎉 Sistema ERP SaaS instalado e pronto para uso!"
Write-ColorOutput Cyan "   Desenvolvido com ❤️  para facilitar a gestão empresarial`n"

Write-Host "Pressione qualquer tecla para abrir o navegador..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Abrir navegador
Start-Process "http://localhost:5173"

Write-Success "Instalação finalizada!"
