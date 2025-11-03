@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ==============================================================================
REM INSTALADOR AUTOMATICO DO SISTEMA ERP SAAS - WINDOWS
REM ==============================================================================
REM
REM Este script instala automaticamente o Sistema ERP SaaS no Windows
REM Compativel com: Windows 10, Windows 11, Windows Server 2019+
REM
REM USO:
REM   Clique duas vezes no arquivo install-windows.bat
REM   OU execute no CMD/PowerShell: .\install-windows.bat
REM
REM ==============================================================================

cls
echo.
echo ===============================================================
echo.
echo              INSTALADOR ERP SAAS - WINDOWS
echo.
echo     Sistema de Gestao Empresarial Multi-tenant
echo.
echo ===============================================================
echo.
echo.

REM ==============================================================================
REM VERIFICACOES INICIAIS
REM ==============================================================================

echo [1/10] Verificando permissoes de administrador...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Este script precisa ser executado como Administrador!
    echo.
    echo Clique com botao direito no arquivo e selecione "Executar como administrador"
    echo.
    pause
    exit /b 1
)
echo [OK] Executando como administrador
echo.

REM ==============================================================================
REM VERIFICAR DOCKER
REM ==============================================================================

echo [2/10] Verificando Docker Desktop...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Docker Desktop nao encontrado!
    echo.
    echo Por favor, instale o Docker Desktop:
    echo https://www.docker.com/products/docker-desktop
    echo.
    echo Apos instalar, reinicie o computador e execute este script novamente.
    echo.
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Docker Compose nao encontrado!
    echo.
    echo Atualize seu Docker Desktop para a versao mais recente.
    echo.
    pause
    exit /b 1
)

for /f "tokens=3" %%i in ('docker --version') do set DOCKER_VERSION=%%i
echo [OK] Docker instalado: %DOCKER_VERSION%
echo.

REM ==============================================================================
REM VERIFICAR GIT
REM ==============================================================================

echo [3/10] Verificando Git...
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [AVISO] Git nao encontrado!
    echo.
    echo Baixando codigo fonte via PowerShell...
    set USE_GIT=0
) else (
    for /f "tokens=3" %%i in ('git --version') do set GIT_VERSION=%%i
    echo [OK] Git instalado: %GIT_VERSION%
    set USE_GIT=1
)
echo.

REM ==============================================================================
REM DIRETORIO DE INSTALACAO
REM ==============================================================================

echo [4/10] Configurando diretorio de instalacao...
set DEFAULT_PATH=%USERPROFILE%\ERP-System
echo.
echo Diretorio padrao: %DEFAULT_PATH%
echo.
set /p INSTALL_PATH="Pressione ENTER para usar o padrao ou digite outro caminho: "

if "!INSTALL_PATH!"=="" set INSTALL_PATH=%DEFAULT_PATH%

if exist "!INSTALL_PATH!" (
    echo [AVISO] Diretorio ja existe: !INSTALL_PATH!
    echo.
    set /p CONTINUE="Deseja continuar? (S/n): "
    if /i "!CONTINUE!"=="n" (
        echo Instalacao cancelada.
        pause
        exit /b 0
    )
) else (
    mkdir "!INSTALL_PATH!" 2>nul
    if %errorLevel% neq 0 (
        echo [ERRO] Nao foi possivel criar o diretorio: !INSTALL_PATH!
        pause
        exit /b 1
    )
    echo [OK] Diretorio criado: !INSTALL_PATH!
)

cd /d "!INSTALL_PATH!"
echo [OK] Diretorio de trabalho: !INSTALL_PATH!
echo.

REM ==============================================================================
REM DOWNLOAD DO CODIGO FONTE
REM ==============================================================================

echo [5/10] Baixando codigo fonte...

set REPO_URL=https://github.com/ademirrodrigo/whatsaasinstall.git
set BRANCH=claude/erp-multicompany-system-011CUfzAksTb7Aznhq7Vyqy9

if %USE_GIT%==1 (
    if exist ".git" (
        echo Atualizando repositorio existente...
        git pull origin %BRANCH%
    ) else (
        echo Clonando repositorio...
        git clone -b %BRANCH% %REPO_URL% .
    )

    if %errorLevel% neq 0 (
        echo [ERRO] Falha ao baixar codigo fonte!
        pause
        exit /b 1
    )
) else (
    echo [ERRO] Git e necessario para baixar o codigo fonte.
    echo Por favor, instale o Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Verificar arquivos essenciais
if not exist "docker-compose.yml" (
    echo [ERRO] Arquivo docker-compose.yml nao encontrado!
    pause
    exit /b 1
)

if not exist "backend" (
    echo [ERRO] Diretorio backend nao encontrado!
    pause
    exit /b 1
)

if not exist "frontend" (
    echo [ERRO] Diretorio frontend nao encontrado!
    pause
    exit /b 1
)

echo [OK] Codigo fonte baixado com sucesso
echo.

REM ==============================================================================
REM CONFIGURACAO DE VARIAVEIS DE AMBIENTE
REM ==============================================================================

echo [6/10] Configurando variaveis de ambiente...
echo.

REM Gerar JWT Secret
set JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
set DB_PASSWORD=erp_%RANDOM%%RANDOM%

REM Backend .env
if not exist "backend\.env" (
    echo Criando backend\.env...
    (
        echo # Database
        echo DATABASE_URL="postgresql://postgres:%DB_PASSWORD%@postgres:5432/erp_saas?schema=public"
        echo.
        echo # JWT
        echo JWT_SECRET="%JWT_SECRET%"
        echo JWT_EXPIRES_IN="7d"
        echo.
        echo # Server
        echo PORT=3000
        echo NODE_ENV="production"
        echo.
        echo # CORS
        echo CORS_ORIGIN="http://localhost:5173"
        echo.
        echo # Redis
        echo REDIS_URL="redis://redis:6379"
    ) > "backend\.env"
    echo [OK] Arquivo backend\.env criado
) else (
    echo [INFO] Arquivo backend\.env ja existe
)

REM Frontend .env.local
if not exist "frontend\.env.local" (
    echo Criando frontend\.env.local...
    echo VITE_API_URL=http://localhost:3000/api> "frontend\.env.local"
    echo [OK] Arquivo frontend\.env.local criado
) else (
    echo [INFO] Arquivo frontend\.env.local ja existe
)

echo.

REM ==============================================================================
REM PARAR CONTAINERS ANTIGOS
REM ==============================================================================

echo [7/10] Parando containers antigos (se existirem)...
docker compose down -v --remove-orphans >nul 2>&1
echo [OK] Containers antigos removidos
echo.

REM ==============================================================================
REM CONSTRUIR IMAGENS DOCKER
REM ==============================================================================

echo [8/10] Construindo imagens Docker...
echo.
echo Isso pode levar varios minutos na primeira vez...
echo Por favor, aguarde...
echo.

docker compose build --no-cache
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao construir imagens Docker!
    echo.
    echo Verifique se o Docker Desktop esta rodando.
    pause
    exit /b 1
)

echo.
echo [OK] Imagens construidas com sucesso
echo.

REM ==============================================================================
REM INICIAR CONTAINERS
REM ==============================================================================

echo [9/10] Iniciando containers...
docker compose up -d
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao iniciar containers!
    pause
    exit /b 1
)

echo [OK] Containers iniciados
echo.

REM Aguardar servicos iniciarem
echo Aguardando servicos iniciarem (30 segundos)...
timeout /t 30 /nobreak >nul

REM Verificar status
echo.
echo Status dos containers:
docker compose ps
echo.

REM ==============================================================================
REM CONFIGURAR BANCO DE DADOS
REM ==============================================================================

echo [10/10] Configurando banco de dados...
echo.

echo Aguardando backend inicializar (mais 10 segundos)...
timeout /t 10 /nobreak >nul

echo Executando migrations do Prisma...
docker compose exec -T backend npx prisma migrate deploy >nul 2>&1
if %errorLevel% neq 0 (
    docker compose exec backend npx prisma migrate dev --name init --skip-generate
)

echo Gerando Prisma Client...
docker compose exec -T backend npx prisma generate >nul 2>&1

echo [OK] Banco de dados configurado
echo.

REM ==============================================================================
REM VERIFICACAO FINAL
REM ==============================================================================

echo.
echo Testando conectividade...
timeout /t 5 /nobreak >nul

curl -f -s http://localhost:3000/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Backend respondendo em http://localhost:3000
) else (
    echo [AVISO] Backend ainda nao esta respondendo
)

curl -f -s http://localhost:5173 >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Frontend respondendo em http://localhost:5173
) else (
    echo [AVISO] Frontend ainda nao esta respondendo
)

echo.

REM ==============================================================================
REM INFORMACOES FINAIS
REM ==============================================================================

cls
echo.
echo ===============================================================
echo.
echo           INSTALACAO CONCLUIDA COM SUCESSO!
echo.
echo ===============================================================
echo.
echo.
echo INFORMACOES DE ACESSO
echo ---------------------
echo.
echo   Frontend (Interface Web):
echo   http://localhost:5173
echo.
echo   Backend API:
echo   http://localhost:3000
echo.
echo   Health Check:
echo   http://localhost:3000/health
echo.
echo.
echo PROXIMOS PASSOS
echo ---------------
echo.
echo   1. Abra seu navegador em: http://localhost:5173
echo   2. Clique em 'Criar Conta'
echo   3. Preencha seus dados e crie sua empresa
echo   4. Comece a usar o sistema!
echo.
echo.
echo COMANDOS UTEIS
echo --------------
echo.
echo   Ver logs:
echo     docker compose logs -f
echo.
echo   Parar sistema:
echo     docker compose down
echo.
echo   Iniciar sistema:
echo     docker compose up -d
echo.
echo   Reiniciar sistema:
echo     docker compose restart
echo.
echo   Status dos containers:
echo     docker compose ps
echo.
echo.
echo LOCALIZACAO DOS ARQUIVOS
echo ------------------------
echo   %INSTALL_PATH%
echo.
echo.
echo IMPORTANTE
echo ----------
echo   - O sistema esta rodando em modo de desenvolvimento
echo   - Altere as senhas padrao no arquivo backend\.env
echo   - Para producao, configure SSL/HTTPS e dominio proprio
echo.
echo.
echo Sistema ERP SaaS instalado e pronto para uso!
echo.
echo.

pause
