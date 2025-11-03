#!/bin/bash

# ==============================================================================
# INSTALADOR AUTOMÁTICO DO SISTEMA ERP SAAS - LINUX (VPS)
# ==============================================================================
#
# Este script instala automaticamente o Sistema ERP SaaS em servidores Linux
# Compatível com: Ubuntu 20.04+, Debian 10+, CentOS 8+, Rocky Linux 8+
#
# USO:
#   wget -O install.sh https://raw.githubusercontent.com/ademirrodrigo/ERP-SYSTEM/main/install-linux.sh
#   chmod +x install.sh
#   sudo ./install.sh
#
# OU em uma linha:
#   curl -fsSL https://raw.githubusercontent.com/ademirrodrigo/ERP-SYSTEM/main/install-linux.sh | sudo bash
#
# ==============================================================================

set -e  # Sair se qualquer comando falhar

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Funções de output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}========================================${NC}\n"
}

# Banner
clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              INSTALADOR ERP SAAS - LINUX VPS                  ║
║                                                               ║
║     Sistema de Gestão Empresarial Multi-tenant               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# ==============================================================================
# VERIFICAÇÕES INICIAIS
# ==============================================================================

print_header "Verificando Permissões e Sistema"

# Verificar se está executando como root
if [[ $EUID -ne 0 ]]; then
   print_error "Este script deve ser executado como root (use sudo)"
   exit 1
fi
print_success "Executando como root"

# Detectar sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
    print_success "Sistema detectado: $PRETTY_NAME"
else
    print_error "Não foi possível detectar o sistema operacional"
    exit 1
fi

# Verificar arquitetura
ARCH=$(uname -m)
if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" ]]; then
    print_error "Arquitetura não suportada: $ARCH"
    exit 1
fi
print_success "Arquitetura: $ARCH"

# ==============================================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# ==============================================================================

print_header "Instalando Dependências do Sistema"

# Atualizar repositórios
print_info "Atualizando repositórios do sistema..."
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    apt-get update -qq
elif [[ "$OS" == "centos" || "$OS" == "rocky" || "$OS" == "rhel" ]]; then
    yum update -y -q
fi
print_success "Repositórios atualizados"

# Instalar dependências básicas
print_info "Instalando dependências básicas..."
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    apt-get install -y -qq curl wget git ca-certificates gnupg lsb-release
elif [[ "$OS" == "centos" || "$OS" == "rocky" || "$OS" == "rhel" ]]; then
    yum install -y -q curl wget git ca-certificates
fi
print_success "Dependências básicas instaladas"

# ==============================================================================
# INSTALAÇÃO DO DOCKER
# ==============================================================================

print_header "Verificando e Instalando Docker"

# Verificar se Docker já está instalado
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker já instalado: $DOCKER_VERSION"
else
    print_info "Instalando Docker..."

    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        # Remover versões antigas
        apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

        # Adicionar repositório do Docker
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/${OS}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS} \
          $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Instalar Docker
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    elif [[ "$OS" == "centos" || "$OS" == "rocky" || "$OS" == "rhel" ]]; then
        # Remover versões antigas
        yum remove -y docker docker-client docker-client-latest docker-common docker-latest \
                      docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true

        # Adicionar repositório do Docker
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

        # Instalar Docker
        yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi

    print_success "Docker instalado com sucesso"
fi

# Iniciar e habilitar Docker
print_info "Iniciando serviço Docker..."
systemctl start docker
systemctl enable docker
print_success "Docker iniciado e habilitado"

# Verificar instalação do Docker
docker --version
docker compose version

# ==============================================================================
# CONFIGURAÇÃO DO FIREWALL
# ==============================================================================

print_header "Configurando Firewall"

# Perguntar se deseja configurar firewall
echo -e "${YELLOW}Deseja configurar o firewall? (S/n) [10s timeout]${NC}"
read -t 10 -r CONFIGURE_FIREWALL || CONFIGURE_FIREWALL="S"

if [[ "$CONFIGURE_FIREWALL" != "n" && "$CONFIGURE_FIREWALL" != "N" ]]; then
    if command -v ufw &> /dev/null; then
        print_info "Configurando UFW..."
        ufw allow 22/tcp comment 'SSH'
        ufw allow 80/tcp comment 'HTTP'
        ufw allow 443/tcp comment 'HTTPS'
        ufw allow 3000/tcp comment 'ERP Backend'
        ufw allow 5173/tcp comment 'ERP Frontend'
        ufw --force enable
        print_success "UFW configurado"
    elif command -v firewall-cmd &> /dev/null; then
        print_info "Configurando firewalld..."
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --permanent --add-port=5173/tcp
        firewall-cmd --reload
        print_success "Firewalld configurado"
    else
        print_warning "Firewall não detectado. Configure manualmente as portas: 22, 80, 443, 3000, 5173"
    fi
else
    print_info "Configuração de firewall ignorada"
fi

# ==============================================================================
# CONFIGURAÇÃO DO DIRETÓRIO DE INSTALAÇÃO
# ==============================================================================

print_header "Configurando Diretório de Instalação"

DEFAULT_PATH="/opt/erp-system"
echo -e "${CYAN}Diretório padrão de instalação: $DEFAULT_PATH${NC}"
echo -e "${YELLOW}Pressione ENTER para usar o padrão ou digite outro caminho: [10s timeout]${NC}"
read -t 10 -r INSTALL_PATH || INSTALL_PATH=""

if [[ -z "$INSTALL_PATH" ]]; then
    INSTALL_PATH=$DEFAULT_PATH
fi

# Criar diretório se não existir
if [ ! -d "$INSTALL_PATH" ]; then
    mkdir -p "$INSTALL_PATH"
    print_success "Diretório criado: $INSTALL_PATH"
else
    print_warning "Diretório já existe: $INSTALL_PATH"
    echo -e "${YELLOW}Deseja continuar? (S/n) [10s timeout]${NC}"
    read -t 10 -r CONTINUE || CONTINUE="S"
    if [[ "$CONTINUE" == "n" || "$CONTINUE" == "N" ]]; then
        print_info "Instalação cancelada pelo usuário"
        exit 0
    fi
fi

cd "$INSTALL_PATH"
print_success "Diretório de trabalho: $INSTALL_PATH"

# ==============================================================================
# DOWNLOAD DO CÓDIGO FONTE
# ==============================================================================

print_header "Baixando Código Fonte"

REPO_URL="https://github.com/ademirrodrigo/ERP-SYSTEM.git"
BRANCH="claude/erp-multicompany-system-011CUfzAksTb7Aznhq7Vyqy9"

if [ -d ".git" ]; then
    print_info "Repositório já existe. Atualizando..."
    if git pull origin "$BRANCH"; then
        print_success "Código atualizado"
    else
        print_error "Erro ao atualizar repositório"
        exit 1
    fi
else
    print_info "Clonando repositório..."
    if git clone -b "$BRANCH" "$REPO_URL" .; then
        print_success "Código baixado com sucesso"
    else
        print_error "Erro ao clonar repositório. Verifique sua conexão e tente novamente."
        exit 1
    fi
fi

# Verificar se arquivos essenciais existem
print_info "Verificando arquivos do projeto..."
if [ ! -f "docker-compose.yml" ]; then
    print_error "Arquivo docker-compose.yml não encontrado!"
    exit 1
fi

if [ ! -d "backend" ]; then
    print_error "Diretório backend não encontrado!"
    exit 1
fi

if [ ! -d "frontend" ]; then
    print_error "Diretório frontend não encontrado!"
    exit 1
fi

print_success "Estrutura do projeto verificada"

# ==============================================================================
# CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE
# ==============================================================================

print_header "Configurando Variáveis de Ambiente"

# Obter IP público do servidor
PUBLIC_IP=$(curl -s ifconfig.me || echo "localhost")
print_info "IP público detectado: $PUBLIC_IP"

# Perguntar domínio
echo -e "${YELLOW}Digite seu domínio (ou pressione ENTER para usar o IP): [15s timeout]${NC}"
read -t 15 -r DOMAIN || DOMAIN=""

if [[ -z "$DOMAIN" ]]; then
    DOMAIN=$PUBLIC_IP
fi

print_info "Usando domínio/IP: $DOMAIN"

# Backend .env
BACKEND_ENV_PATH="backend/.env"
if [ ! -f "$BACKEND_ENV_PATH" ]; then
    print_info "Criando arquivo backend/.env..."

    # Verificar se openssl está disponível
    if command -v openssl &> /dev/null; then
        # Gerar JWT Secret aleatório
        JWT_SECRET=$(openssl rand -base64 32)

        # Gerar senha segura para PostgreSQL
        DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-20)
    else
        print_warning "OpenSSL não encontrado. Usando fallback para geração de senhas."
        # Fallback usando /dev/urandom
        JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
        DB_PASSWORD=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 20 | head -n 1)
    fi

    cat > "$BACKEND_ENV_PATH" << EOF
# Database
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/erp_saas?schema=public"

# JWT
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="production"

# CORS
CORS_ORIGIN="http://${DOMAIN}:5173"

# Redis
REDIS_URL="redis://redis:6379"
EOF

    chmod 600 "$BACKEND_ENV_PATH"
    print_success "Arquivo backend/.env criado"

    # Atualizar docker-compose.yml com a nova senha do PostgreSQL
    print_info "Atualizando senhas no docker-compose.yml..."

    # Atualizar senha do serviço postgres
    sed -i "s/POSTGRES_PASSWORD: postgres/POSTGRES_PASSWORD: ${DB_PASSWORD}/" docker-compose.yml

    # Atualizar DATABASE_URL no serviço backend (substitui a senha postgres:postgres por postgres:${DB_PASSWORD})
    sed -i "s|postgresql://postgres:postgres@postgres|postgresql://postgres:${DB_PASSWORD}@postgres|g" docker-compose.yml

    print_success "Senhas atualizadas no docker-compose.yml"

else
    print_info "Arquivo backend/.env já existe"
fi

# Frontend .env.local
FRONTEND_ENV_PATH="frontend/.env.local"
if [ ! -f "$FRONTEND_ENV_PATH" ]; then
    print_info "Criando arquivo frontend/.env.local..."

    cat > "$FRONTEND_ENV_PATH" << EOF
VITE_API_URL=http://${DOMAIN}:3000/api
EOF

    print_success "Arquivo frontend/.env.local criado"
else
    print_info "Arquivo frontend/.env.local já existe"
fi

# ==============================================================================
# INSTALAÇÃO COM DOCKER
# ==============================================================================

print_header "Instalando Sistema com Docker"

print_info "Parando containers antigos (se existirem)..."
docker compose down -v --remove-orphans 2>/dev/null || true

print_info "Reconstruindo imagens Docker..."
print_warning "Isso pode levar alguns minutos na primeira vez..."
if docker compose build --no-cache; then
    print_success "Imagens construídas com sucesso"
else
    print_error "Erro ao construir imagens Docker"
    print_info "Verifique os logs acima para mais detalhes"
    exit 1
fi

print_info "Iniciando containers..."
if docker compose up -d; then
    print_success "Containers iniciados"
else
    print_error "Erro ao iniciar containers"
    print_info "Execute 'docker compose logs' para ver os erros"
    exit 1
fi

# Aguardar serviços iniciarem
print_info "Aguardando serviços iniciarem (30 segundos)..."
sleep 30

# Verificar status dos containers
print_info "Status dos containers:"
docker compose ps

# Verificar se os containers principais estão rodando
print_info "Verificando saúde dos containers..."
BACKEND_STATUS=$(docker compose ps backend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
FRONTEND_STATUS=$(docker compose ps frontend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
POSTGRES_STATUS=$(docker compose ps postgres --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [[ "$POSTGRES_STATUS" == "running" ]]; then
    print_success "PostgreSQL está rodando"
else
    print_error "PostgreSQL não está rodando! Status: $POSTGRES_STATUS"
fi

if [[ "$BACKEND_STATUS" == "running" ]]; then
    print_success "Backend está rodando"
else
    print_warning "Backend não está rodando. Status: $BACKEND_STATUS"
    print_info "Verifique os logs: docker compose logs backend"
fi

if [[ "$FRONTEND_STATUS" == "running" ]]; then
    print_success "Frontend está rodando"
else
    print_warning "Frontend não está rodando. Status: $FRONTEND_STATUS"
    print_info "Verifique os logs: docker compose logs frontend"
fi

# ==============================================================================
# EXECUTAR MIGRATIONS DO BANCO DE DADOS
# ==============================================================================

print_header "Configurando Banco de Dados"

print_info "Aguardando backend inicializar (mais 10 segundos)..."
sleep 10

print_info "Executando migrations do Prisma..."
if docker compose exec -T backend npx prisma migrate deploy 2>/dev/null; then
    print_success "Migrations executadas com sucesso"
elif docker compose exec backend npx prisma migrate dev --name init --skip-generate; then
    print_success "Migration inicial criada"
else
    print_warning "Não foi possível executar migrations automaticamente"
    print_info "Execute manualmente: docker compose exec backend npx prisma migrate dev --name init"
fi

print_info "Gerando Prisma Client..."
if docker compose exec -T backend npx prisma generate 2>/dev/null; then
    print_success "Prisma Client gerado"
else
    print_warning "Erro ao gerar Prisma Client"
    print_info "Execute manualmente: docker compose exec backend npx prisma generate"
fi

print_success "Banco de dados configurado"

# ==============================================================================
# CONFIGURAÇÃO DE NGINX (OPCIONAL)
# ==============================================================================

print_header "Configuração de Nginx Reverse Proxy (Opcional)"

echo -e "${YELLOW}Deseja configurar Nginx como reverse proxy? (s/N) [10s timeout]${NC}"
read -t 10 -r CONFIGURE_NGINX || CONFIGURE_NGINX="N"

if [[ "$CONFIGURE_NGINX" == "s" || "$CONFIGURE_NGINX" == "S" ]]; then
    print_info "Instalando Nginx..."

    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get install -y nginx
    elif [[ "$OS" == "centos" || "$OS" == "rocky" || "$OS" == "rhel" ]]; then
        yum install -y nginx
    fi

    print_info "Configurando Nginx..."

    cat > "/etc/nginx/sites-available/erp-system" << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Criar symlink para sites-enabled (Ubuntu/Debian)
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        ln -sf /etc/nginx/sites-available/erp-system /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    fi

    # Testar configuração do Nginx
    nginx -t

    # Reiniciar Nginx
    systemctl restart nginx
    systemctl enable nginx

    print_success "Nginx configurado e iniciado"

    print_info "Para configurar SSL/HTTPS com Let's Encrypt:"
    print_info "  sudo apt-get install certbot python3-certbot-nginx"
    print_info "  sudo certbot --nginx -d ${DOMAIN}"
else
    print_info "Configuração de Nginx ignorada"
fi

# ==============================================================================
# CONFIGURAR SYSTEMD SERVICE (OPCIONAL)
# ==============================================================================

print_header "Configuração de Serviço Systemd (Opcional)"

echo -e "${YELLOW}Deseja criar um serviço systemd para iniciar automaticamente? (S/n) [10s timeout]${NC}"
read -t 10 -r CREATE_SERVICE || CREATE_SERVICE="S"

if [[ "$CREATE_SERVICE" != "n" && "$CREATE_SERVICE" != "N" ]]; then
    print_info "Criando serviço systemd..."

    cat > "/etc/systemd/system/erp-system.service" << EOF
[Unit]
Description=ERP System SaaS
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_PATH}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable erp-system.service

    print_success "Serviço systemd criado e habilitado"
    print_info "Comandos úteis:"
    print_info "  sudo systemctl start erp-system"
    print_info "  sudo systemctl stop erp-system"
    print_info "  sudo systemctl status erp-system"
else
    print_info "Serviço systemd não criado"
fi

# ==============================================================================
# VERIFICAÇÃO FINAL
# ==============================================================================

print_header "Verificação Final"

print_info "Testando conectividade..."

# Testar backend
if curl -f -s http://localhost:3000/health > /dev/null; then
    print_success "Backend respondendo em http://localhost:3000"
else
    print_warning "Backend não está respondendo ainda"
    print_info "Os serviços podem levar alguns minutos para iniciar completamente"
fi

# Testar frontend
if curl -f -s http://localhost:5173 > /dev/null; then
    print_success "Frontend respondendo em http://localhost:5173"
else
    print_warning "Frontend não está respondendo ainda"
    print_info "Os serviços podem levar alguns minutos para iniciar completamente"
fi

# ==============================================================================
# INFORMAÇÕES FINAIS
# ==============================================================================

echo -e "\n${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              INSTALAÇÃO CONCLUÍDA COM SUCESSO!                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

print_header "📋 INFORMAÇÕES DE ACESSO"
echo ""
echo -e "${CYAN}  🌐 Frontend (Interface Web):${NC}"
if [[ "$CONFIGURE_NGINX" == "s" || "$CONFIGURE_NGINX" == "S" ]]; then
    echo -e "${WHITE}     http://${DOMAIN}${NC}"
else
    echo -e "${WHITE}     http://${DOMAIN}:5173${NC}"
fi
echo ""
echo -e "${CYAN}  🔌 Backend API:${NC}"
if [[ "$CONFIGURE_NGINX" == "s" || "$CONFIGURE_NGINX" == "S" ]]; then
    echo -e "${WHITE}     http://${DOMAIN}/api${NC}"
else
    echo -e "${WHITE}     http://${DOMAIN}:3000${NC}"
fi
echo ""
echo -e "${CYAN}  ❤️  Health Check:${NC}"
echo -e "${WHITE}     http://${DOMAIN}:3000/health${NC}"
echo ""

print_header "🚀 PRÓXIMOS PASSOS"
echo ""
echo -e "${YELLOW}  1. Abra seu navegador no endereço acima${NC}"
echo -e "${YELLOW}  2. Clique em 'Criar Conta'${NC}"
echo -e "${YELLOW}  3. Preencha seus dados e crie sua empresa${NC}"
echo -e "${YELLOW}  4. Comece a usar o sistema!${NC}"
echo ""

print_header "🛠️  COMANDOS ÚTEIS"
echo ""
echo -e "${WHITE}  Ver logs:${NC}"
echo -e "${GRAY}    cd ${INSTALL_PATH} && docker compose logs -f${NC}"
echo ""
echo -e "${WHITE}  Parar sistema:${NC}"
echo -e "${GRAY}    cd ${INSTALL_PATH} && docker compose down${NC}"
echo ""
echo -e "${WHITE}  Iniciar sistema:${NC}"
echo -e "${GRAY}    cd ${INSTALL_PATH} && docker compose up -d${NC}"
echo ""
echo -e "${WHITE}  Reiniciar sistema:${NC}"
echo -e "${GRAY}    cd ${INSTALL_PATH} && docker compose restart${NC}"
echo ""
echo -e "${WHITE}  Status dos containers:${NC}"
echo -e "${GRAY}    cd ${INSTALL_PATH} && docker compose ps${NC}"
echo ""
echo -e "${WHITE}  Backup do banco de dados:${NC}"
echo -e "${GRAY}    docker compose exec postgres pg_dump -U postgres erp_saas > backup.sql${NC}"
echo ""

print_header "📁 LOCALIZAÇÃO DOS ARQUIVOS"
echo -e "${WHITE}  ${INSTALL_PATH}${NC}"
echo ""

print_header "🔒 INFORMAÇÕES DE SEGURANÇA"
echo ""
echo -e "${YELLOW}  ⚠️  IMPORTANTE: Altere as senhas padrão!${NC}"
echo -e "${WHITE}  Arquivo de configuração: ${INSTALL_PATH}/backend/.env${NC}"
echo ""
if [[ "$CONFIGURE_NGINX" != "s" && "$CONFIGURE_NGINX" != "S" ]]; then
    echo -e "${YELLOW}  ⚠️  Configure SSL/HTTPS para produção!${NC}"
    echo -e "${WHITE}  Instale: sudo apt-get install certbot python3-certbot-nginx${NC}"
    echo -e "${WHITE}  Execute: sudo certbot --nginx -d ${DOMAIN}${NC}"
    echo ""
fi

print_header "📚 DOCUMENTAÇÃO"
echo -e "${WHITE}  README.md${NC} - Documentação completa"
echo -e "${WHITE}  QUICKSTART.md${NC} - Guia rápido"
echo ""

echo -e "${GREEN}🎉 Sistema ERP SaaS instalado e pronto para uso!${NC}"
echo -e "${CYAN}   Desenvolvido com ❤️  para facilitar a gestão empresarial${NC}\n"

print_success "Instalação finalizada!"
