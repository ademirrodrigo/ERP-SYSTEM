@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ==============================================================================
REM CORRIGIR PROBLEMAS DE PORTAS - ERP SAAS
REM ==============================================================================

cls
echo.
echo ===============================================================
echo.
echo         CORRIGIR CONFLITOS DE PORTAS - ERP SAAS
echo.
echo ===============================================================
echo.

REM Verificar permissoes de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Este script precisa ser executado como Administrador!
    echo.
    echo Clique com botao direito no arquivo e selecione "Executar como administrador"
    echo.
    pause
    exit /b 1
)

echo Verificando portas em uso...
echo.

REM ==============================================================================
REM VERIFICAR PORTA 3000 (Backend)
REM ==============================================================================

echo [1/3] Verificando porta 3000 (Backend)...
netstat -ano | findstr :3000 >nul 2>&1
if %errorLevel% equ 0 (
    echo [CONFLITO] Porta 3000 esta em uso!
    echo.
    echo Processos usando a porta 3000:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        set PID_3000=%%a
        echo.
        echo PID: %%a
        for /f "tokens=1" %%b in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Processo: %%b
            set PROCESS_3000=%%b
        )
    )
    echo.
    set /p KILL_3000="Deseja encerrar este processo? (S/n): "
    if /i "!KILL_3000!" neq "n" (
        taskkill /F /PID !PID_3000! >nul 2>&1
        if %errorLevel% equ 0 (
            echo [OK] Processo encerrado com sucesso!
        ) else (
            echo [ERRO] Nao foi possivel encerrar o processo
        )
    )
) else (
    echo [OK] Porta 3000 esta livre
)
echo.

REM ==============================================================================
REM VERIFICAR PORTA 5173 (Frontend)
REM ==============================================================================

echo [2/3] Verificando porta 5173 (Frontend)...
netstat -ano | findstr :5173 >nul 2>&1
if %errorLevel% equ 0 (
    echo [CONFLITO] Porta 5173 esta em uso!
    echo.
    echo Processos usando a porta 5173:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
        set PID_5173=%%a
        echo.
        echo PID: %%a
        for /f "tokens=1" %%b in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Processo: %%b
            set PROCESS_5173=%%b
        )
    )
    echo.
    set /p KILL_5173="Deseja encerrar este processo? (S/n): "
    if /i "!KILL_5173!" neq "n" (
        taskkill /F /PID !PID_5173! >nul 2>&1
        if %errorLevel% equ 0 (
            echo [OK] Processo encerrado com sucesso!
        ) else (
            echo [ERRO] Nao foi possivel encerrar o processo
        )
    )
) else (
    echo [OK] Porta 5173 esta livre
)
echo.

REM ==============================================================================
REM VERIFICAR PORTA 5432 (PostgreSQL)
REM ==============================================================================

echo [3/3] Verificando porta 5432 (PostgreSQL)...
netstat -ano | findstr :5432 >nul 2>&1
if %errorLevel% equ 0 (
    echo [CONFLITO] Porta 5432 esta em uso!
    echo.
    echo Processos usando a porta 5432:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5432 ^| findstr LISTENING') do (
        set PID_5432=%%a
        echo.
        echo PID: %%a
        for /f "tokens=1" %%b in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Processo: %%b
            set PROCESS_5432=%%b
        )
    )
    echo.
    echo [AVISO] PostgreSQL pode estar rodando localmente
    echo.
    set /p KILL_5432="Deseja encerrar este processo? (s/N): "
    if /i "!KILL_5432!"=="s" (
        taskkill /F /PID !PID_5432! >nul 2>&1
        if %errorLevel% equ 0 (
            echo [OK] Processo encerrado com sucesso!
        ) else (
            echo [ERRO] Nao foi possivel encerrar o processo
        )
    )
) else (
    echo [OK] Porta 5432 esta livre
)
echo.

REM ==============================================================================
REM OPCAO: MUDAR PORTAS NO DOCKER-COMPOSE
REM ==============================================================================

echo.
echo ===============================================================
echo.
echo Se os processos nao puderam ser encerrados, voce pode:
echo.
echo 1. Usar portas alternativas no docker-compose.yml
echo 2. Parar os processos manualmente
echo 3. Reiniciar o computador
echo.
echo ===============================================================
echo.

set /p CHANGE_PORTS="Deseja alterar as portas do ERP para evitar conflitos? (s/N): "

if /i "!CHANGE_PORTS!"=="s" (
    echo.
    echo Sugestoes de portas alternativas:
    echo   Backend: 3001, 8080, 8000
    echo   Frontend: 5174, 8081, 3001
    echo.

    set /p NEW_BACKEND_PORT="Digite nova porta para Backend (ou ENTER para 3001): "
    if "!NEW_BACKEND_PORT!"=="" set NEW_BACKEND_PORT=3001

    set /p NEW_FRONTEND_PORT="Digite nova porta para Frontend (ou ENTER para 5174): "
    if "!NEW_FRONTEND_PORT!"=="" set NEW_FRONTEND_PORT=5174

    echo.
    echo Atualizando configuracoes...

    REM Backup do docker-compose.yml
    if exist docker-compose.yml (
        copy docker-compose.yml docker-compose.yml.backup >nul
        echo [OK] Backup criado: docker-compose.yml.backup
    )

    REM Atualizar docker-compose.yml (precisaria de PowerShell ou outra ferramenta)
    echo.
    echo [INFO] Para alterar as portas, edite manualmente:
    echo.
    echo 1. Abra: docker-compose.yml
    echo 2. Procure por: "3000:3000" e mude para "!NEW_BACKEND_PORT!:3000"
    echo 3. Procure por: "5173:5173" e mude para "!NEW_FRONTEND_PORT!:5173"
    echo.
    echo 4. Abra: backend\.env
    echo 5. Mude PORT=3000 para PORT=!NEW_BACKEND_PORT!
    echo.
    echo 6. Abra: frontend\.env.local
    echo 7. Mude URL para: http://localhost:!NEW_BACKEND_PORT!/api
    echo.
)

echo.
echo ===============================================================
echo.
echo VERIFICACAO FINAL
echo.
echo ===============================================================
echo.

echo Portas em uso atualmente:
echo.
netstat -ano | findstr ":3000 :5173 :5432" | findstr LISTENING
echo.

echo.
echo Agora tente executar novamente:
echo   docker compose up -d
echo.
echo Ou execute o instalador:
echo   install-windows.bat
echo.

pause
