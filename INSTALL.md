# 📦 Guia de Instalação - Sistema ERP SaaS

Este documento explica como instalar o Sistema ERP SaaS usando os instaladores automáticos para Windows e Linux.

## 📋 Índice

- [Instalação no Windows](#instalação-no-windows)
- [Instalação no Linux (VPS)](#instalação-no-linux-vps)
- [Requisitos do Sistema](#requisitos-do-sistema)
- [Portas Utilizadas](#portas-utilizadas)
- [Troubleshooting](#troubleshooting)

---

## 🪟 Instalação no Windows

### Método 1: Download e Execução Manual

1. **Baixe o instalador**
   ```powershell
   # Abra o PowerShell
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ademirrodrigo/ERP-SYSTEM/main/install-windows.ps1" -OutFile "install-windows.ps1"
   ```

2. **Execute como Administrador**
   ```powershell
   # Permitir execução de scripts (apenas uma vez)
   Set-ExecutionPolicy Bypass -Scope Process -Force

   # Executar instalador
   .\install-windows.ps1
   ```

### Método 2: Instalação em Uma Linha

```powershell
# Abra o PowerShell como Administrador e execute:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/ademirrodrigo/ERP-SYSTEM/main/install-windows.ps1'))
```

### Pré-requisitos Windows

- ✅ Windows 10/11 ou Windows Server 2019+
- ✅ PowerShell 5.1+ (já incluído)
- ✅ Docker Desktop para Windows
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- ✅ Permissões de Administrador

### O Que o Instalador Faz (Windows)

1. ✅ Verifica se está rodando como Administrador
2. ✅ Verifica se Docker Desktop está instalado e rodando
3. ✅ Instala Git (se necessário, via winget)
4. ✅ Cria diretório de instalação (padrão: `C:\Users\[usuario]\ERP-SYSTEM`)
5. ✅ Clona o repositório do GitHub
6. ✅ Configura variáveis de ambiente (.env)
7. ✅ Reconstrói imagens Docker
8. ✅ Inicia todos os containers
9. ✅ Executa migrations do banco de dados
10. ✅ Verifica se os serviços estão respondendo
11. ✅ Abre o navegador automaticamente

### Tempo de Instalação (Windows)

- **Primeira vez**: ~15-20 minutos (download das imagens Docker)
- **Atualizações**: ~5-10 minutos

---

## 🐧 Instalação no Linux (VPS)

### Método 1: Download e Execução Manual

```bash
# 1. Baixar o instalador
wget -O install.sh https://raw.githubusercontent.com/ademirrodrigo/ERP-SYSTEM/main/install-linux.sh

# 2. Dar permissão de execução
chmod +x install.sh

# 3. Executar como root
sudo ./install.sh
```

### Método 2: Instalação em Uma Linha

```bash
curl -fsSL https://raw.githubusercontent.com/ademirrodrigo/ERP-SYSTEM/main/install-linux.sh | sudo bash
```

### Pré-requisitos Linux

- ✅ Sistema Operacional:
  - Ubuntu 20.04 LTS ou superior
  - Debian 10 ou superior
  - CentOS 8 ou superior
  - Rocky Linux 8 ou superior
  - Red Hat Enterprise Linux 8+
- ✅ Arquitetura: x86_64 ou aarch64 (ARM64)
- ✅ Mínimo 2GB RAM (recomendado 4GB+)
- ✅ Mínimo 20GB de espaço em disco
- ✅ Acesso root (sudo)
- ✅ Conexão com a internet

### O Que o Instalador Faz (Linux)

1. ✅ Detecta sistema operacional e arquitetura
2. ✅ Atualiza repositórios do sistema
3. ✅ Instala dependências básicas (curl, wget, git)
4. ✅ Instala Docker e Docker Compose (se necessário)
5. ✅ Inicia e habilita serviço Docker
6. ✅ Configura firewall (UFW ou firewalld)
7. ✅ Cria diretório de instalação (padrão: `/opt/erp-system`)
8. ✅ Clona o repositório do GitHub
9. ✅ Detecta IP público do servidor
10. ✅ Configura variáveis de ambiente com senhas seguras
11. ✅ Reconstrói imagens Docker
12. ✅ Inicia todos os containers
13. ✅ Executa migrations do banco de dados
14. ✅ **[OPCIONAL]** Configura Nginx como reverse proxy
15. ✅ **[OPCIONAL]** Cria serviço systemd para iniciar automaticamente
16. ✅ Verifica se os serviços estão respondendo

### Tempo de Instalação (Linux)

- **VPS novo (sem Docker)**: ~20-30 minutos
- **Com Docker já instalado**: ~15-20 minutos
- **Atualizações**: ~5-10 minutos

### Recursos Adicionais (Linux)

#### Nginx Reverse Proxy

O instalador pode configurar automaticamente o Nginx como reverse proxy:

- ✅ Permite acesso sem especificar porta `:5173` ou `:3000`
- ✅ Prepara para configuração SSL/HTTPS
- ✅ Melhora performance com cache
- ✅ Adiciona headers de segurança

**Exemplo de acesso COM Nginx:**
- Frontend: `http://seudominio.com`
- API: `http://seudominio.com/api`

**Exemplo de acesso SEM Nginx:**
- Frontend: `http://seudominio.com:5173`
- API: `http://seudominio.com:3000`

#### Serviço Systemd

O instalador pode criar um serviço systemd para:

- ✅ Iniciar automaticamente no boot
- ✅ Reiniciar automaticamente se falhar
- ✅ Gerenciar facilmente com comandos systemctl

**Comandos do serviço:**
```bash
# Iniciar
sudo systemctl start erp-system

# Parar
sudo systemctl stop erp-system

# Reiniciar
sudo systemctl restart erp-system

# Ver status
sudo systemctl status erp-system

# Ver logs
sudo journalctl -u erp-system -f
```

#### Configurar SSL/HTTPS (Linux)

Após a instalação com Nginx, configure SSL com Let's Encrypt:

```bash
# 1. Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# 2. Obter certificado SSL
sudo certbot --nginx -d seudominio.com

# 3. Renovação automática já está configurada!
```

---

## 💻 Requisitos do Sistema

### Requisitos Mínimos

| Componente | Windows | Linux |
|------------|---------|-------|
| **CPU** | 2 cores | 2 cores |
| **RAM** | 4 GB | 2 GB |
| **Disco** | 30 GB | 20 GB |
| **SO** | Windows 10/11 | Ubuntu 20.04+ |

### Requisitos Recomendados

| Componente | Windows | Linux |
|------------|---------|-------|
| **CPU** | 4+ cores | 4+ cores |
| **RAM** | 8+ GB | 4+ GB |
| **Disco** | 50+ GB SSD | 40+ GB SSD |
| **SO** | Windows 11 Pro | Ubuntu 22.04 LTS |

### Requisitos de Rede

- ✅ Conexão com internet (apenas durante instalação)
- ✅ Portas abertas no firewall (ver abaixo)
- ✅ Para VPS: IP público estático (recomendado)

---

## 🔌 Portas Utilizadas

O sistema utiliza as seguintes portas:

| Porta | Serviço | Descrição | Acesso Externo |
|-------|---------|-----------|----------------|
| **3000** | Backend API | API REST do sistema | Opcional |
| **5173** | Frontend | Interface web (Vite) | Necessário |
| **5432** | PostgreSQL | Banco de dados | NÃO |
| **6379** | Redis | Cache e sessões | NÃO |
| **5555** | Prisma Studio | Interface do banco | NÃO |
| **80** | HTTP | Nginx (se configurado) | Necessário |
| **443** | HTTPS | SSL (se configurado) | Necessário |

### Configuração de Firewall

#### Windows (Firewall do Windows)

O Docker Desktop geralmente configura automaticamente. Se necessário:

```powershell
# PowerShell como Administrador
New-NetFirewallRule -DisplayName "ERP Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "ERP Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

#### Linux (UFW)

```bash
# Ubuntu/Debian
sudo ufw allow 5173/tcp comment 'ERP Frontend'
sudo ufw allow 3000/tcp comment 'ERP Backend'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw enable
```

#### Linux (firewalld)

```bash
# CentOS/Rocky/RHEL
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Cloud Providers (AWS, Google Cloud, Azure, etc.)

Não esqueça de configurar os Security Groups / Firewall Rules no painel do provedor!

---

## 🛠️ Comandos Úteis Após Instalação

### Windows

```powershell
# Navegar para o diretório de instalação
cd C:\Users\[seu-usuario]\ERP-SYSTEM

# Ver logs
docker-compose logs -f

# Parar sistema
docker-compose down

# Iniciar sistema
docker-compose up -d

# Reiniciar sistema
docker-compose restart

# Ver status dos containers
docker-compose ps

# Acessar Prisma Studio
docker-compose exec backend npx prisma studio
# Acesse: http://localhost:5555
```

### Linux

```bash
# Navegar para o diretório de instalação
cd /opt/erp-system

# Ver logs
docker compose logs -f

# Parar sistema
docker compose down

# Iniciar sistema
docker compose up -d

# Reiniciar sistema
docker compose restart

# Ver status dos containers
docker compose ps

# Acessar Prisma Studio
docker compose exec backend npx prisma studio
# Acesse: http://localhost:5555

# Backup do banco de dados
docker compose exec postgres pg_dump -U postgres erp_saas > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker compose exec -T postgres psql -U postgres erp_saas < backup.sql
```

---

## 🔧 Troubleshooting

### Problema: "Docker não está rodando"

**Windows:**
1. Abra o Docker Desktop
2. Aguarde inicializar completamente
3. Tente novamente

**Linux:**
```bash
sudo systemctl start docker
sudo systemctl status docker
```

### Problema: "Porta já em uso"

**Verificar o que está usando a porta:**

Windows:
```powershell
netstat -ano | findstr :5173
netstat -ano | findstr :3000
```

Linux:
```bash
sudo lsof -i :5173
sudo lsof -i :3000
```

**Solução:** Pare o serviço que está usando a porta ou mude a porta no `docker-compose.yml`

### Problema: "Erro ao conectar no banco de dados"

```bash
# Verificar se PostgreSQL está rodando
docker compose ps postgres

# Ver logs do PostgreSQL
docker compose logs postgres

# Recriar containers
docker compose down -v
docker compose up -d

# Executar migrations novamente
docker compose exec backend npx prisma migrate deploy
```

### Problema: "Frontend não carrega"

```bash
# Ver logs do frontend
docker compose logs frontend

# Reconstruir frontend
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Problema: "Permissão negada" (Linux)

```bash
# Adicionar seu usuário ao grupo docker
sudo usermod -aG docker $USER

# Fazer logout e login novamente
# Ou executar:
newgrp docker
```

### Problema: "Out of disk space"

```bash
# Limpar imagens e containers não utilizados
docker system prune -a --volumes

# Ver uso de disco
docker system df
```

### Problema: "Migration falhou"

```bash
# Resetar banco de dados (CUIDADO: apaga todos os dados!)
docker compose down -v
docker compose up -d postgres redis
sleep 10
docker compose up -d backend frontend
docker compose exec backend npx prisma migrate deploy
```

---

## 📞 Suporte

### Documentação

- 📖 [README.md](README.md) - Documentação completa
- 🚀 [QUICKSTART.md](QUICKSTART.md) - Guia rápido
- 📦 [INSTALL.md](INSTALL.md) - Este arquivo

### Logs

Os logs são sua melhor ferramenta para diagnosticar problemas:

```bash
# Ver todos os logs
docker compose logs

# Ver logs de um serviço específico
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Ver logs em tempo real
docker compose logs -f

# Ver últimas 100 linhas
docker compose logs --tail=100
```

### Contato

- GitHub Issues: https://github.com/ademirrodrigo/ERP-SYSTEM/issues
- Branch: `claude/erp-multicompany-system-011CUfzAksTb7Aznhq7Vyqy9`

---

## 🎯 Checklist Pós-Instalação

Após a instalação bem-sucedida:

- [ ] Sistema está acessível no navegador
- [ ] Foi possível criar conta de administrador
- [ ] Dashboard está carregando
- [ ] É possível cadastrar produtos
- [ ] É possível cadastrar clientes
- [ ] É possível realizar vendas
- [ ] **[PRODUÇÃO]** SSL/HTTPS está configurado
- [ ] **[PRODUÇÃO]** Senhas padrão foram alteradas
- [ ] **[PRODUÇÃO]** Backup automático está configurado
- [ ] **[PRODUÇÃO]** Firewall está configurado corretamente

---

## 🔒 Dicas de Segurança

### Para Produção

1. **Altere TODAS as senhas padrão**
   - Edite `backend/.env`
   - Altere `JWT_SECRET`, `DATABASE_URL` (senha do postgres)

2. **Configure SSL/HTTPS**
   - Use Let's Encrypt (grátis)
   - Redirecione HTTP para HTTPS

3. **Configure Backups Automáticos**
   ```bash
   # Adicionar no crontab
   0 2 * * * cd /opt/erp-system && docker compose exec -T postgres pg_dump -U postgres erp_saas | gzip > /backups/erp_$(date +\%Y\%m\%d).sql.gz
   ```

4. **Atualize Regularmente**
   ```bash
   cd /opt/erp-system
   git pull
   docker compose build
   docker compose up -d
   ```

5. **Monitor de Logs**
   - Configure alertas para erros críticos
   - Use ferramentas como Grafana, Prometheus

6. **Limite Acesso**
   - Use VPN para acesso administrativo
   - Configure IP whitelist no firewall

---

**✨ Instalação concluída! Boa gestão empresarial! 🚀**
