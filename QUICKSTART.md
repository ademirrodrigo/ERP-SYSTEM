# 🚀 Guia de Inicialização Rápida

## Problema Resolvido

✅ Corrigido erro de dependência OpenSSL no container Docker Alpine Linux

## Como Iniciar o Sistema

### 1. Reconstruir os Containers

```bash
# Parar os containers atuais
docker-compose down

# Reconstruir a imagem do backend (com as novas dependências)
docker-compose build backend

# Ou reconstruir tudo
docker-compose build

# Iniciar os containers
docker-compose up -d
```

### 2. Executar as Migrations do Banco de Dados

```bash
# Executar migrations do Prisma
docker-compose exec backend npx prisma migrate dev --name init

# Gerar o Prisma Client (caso necessário)
docker-compose exec backend npx prisma generate
```

### 3. Verificar se está rodando

```bash
# Ver logs dos containers
docker-compose logs -f

# Ver apenas logs do backend
docker-compose logs -f backend

# Ver apenas logs do frontend
docker-compose logs -f frontend
```

### 4. Acessar a Aplicação

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **API Health**: http://localhost:3000/health

### 5. Criar Primeira Conta

1. Acesse http://localhost:5173/register
2. Preencha:
   - Nome completo
   - Email
   - Senha (mínimo 6 caracteres)
   - Nome da empresa
   - CNPJ (opcional)
3. Clique em "Criar Conta"
4. Você será automaticamente autenticado

## Comandos Úteis

### Parar os Containers
```bash
docker-compose down
```

### Parar e Remover Volumes (limpar banco de dados)
```bash
docker-compose down -v
```

### Ver Status dos Containers
```bash
docker-compose ps
```

### Acessar o Container do Backend
```bash
docker-compose exec backend sh
```

### Acessar o Container do Frontend
```bash
docker-compose exec frontend sh
```

### Prisma Studio (Interface Visual do Banco)
```bash
docker-compose exec backend npx prisma studio
```
Acesse em: http://localhost:5555

### Reiniciar Apenas um Container
```bash
docker-compose restart backend
docker-compose restart frontend
```

## Instalação sem Docker (Local)

### Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite o .env com suas configurações

# Executar migrations
npx prisma migrate dev --name init

# Gerar Prisma Client
npx prisma generate

# Iniciar servidor
npm run dev
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Criar .env.local
echo "VITE_API_URL=http://localhost:3000/api" > .env.local

# Iniciar servidor
npm run dev
```

## Troubleshooting

### Erro: "Port already in use"
```bash
# Verificar o que está usando a porta
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL

# Parar o processo ou mudar a porta no docker-compose.yml
```

### Erro: "Database not found"
```bash
# Recriar banco de dados
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma migrate dev --name init
```

### Erro: "Cannot connect to database"
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps postgres

# Ver logs do PostgreSQL
docker-compose logs postgres

# Reiniciar PostgreSQL
docker-compose restart postgres
```

### Backend não conecta ao banco
```bash
# Verificar URL do banco no .env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/erp_saas?schema=public"

# Testar conexão
docker-compose exec backend npx prisma db push
```

### Limpar tudo e começar do zero
```bash
# Parar containers e remover volumes
docker-compose down -v

# Remover imagens
docker-compose down --rmi all -v

# Reconstruir tudo
docker-compose build
docker-compose up -d

# Executar migrations
docker-compose exec backend npx prisma migrate dev --name init
```

## Estrutura de Arquivos Importantes

```
.
├── docker-compose.yml          # Configuração Docker
├── backend/
│   ├── .env                    # Variáveis de ambiente (criar)
│   ├── .env.example            # Exemplo de variáveis
│   ├── prisma/schema.prisma    # Schema do banco
│   └── src/server.ts           # Servidor principal
└── frontend/
    ├── .env.local              # Variáveis de ambiente (criar)
    └── src/main.tsx            # Entry point
```

## Próximos Passos

Após inicializar:

1. ✅ Criar primeira conta de administrador
2. ✅ Cadastrar produtos
3. ✅ Cadastrar clientes
4. ✅ Fazer primeira venda
5. ✅ Visualizar dashboard

## Suporte

- Documentação: Ver README.md
- Issues: GitHub Issues
- Branch atual: `claude/erp-multicompany-system-011CUfzAksTb7Aznhq7Vyqy9`

---

Desenvolvido com ❤️
