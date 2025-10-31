# 🚀 ERP SaaS - Sistema de Gestão Empresarial Multi-tenant

Sistema ERP completo desenvolvido para empresas de comércio e serviço, com arquitetura multi-empresa (multi-tenant) e multi-usuário, totalmente escalável e expansível.

## 📋 Índice

- [Características](#características)
- [Tecnologias](#tecnologias)
- [Módulos](#módulos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Expansibilidade](#expansibilidade)

## ✨ Características

### 🏢 Multi-tenant
- Isolamento completo de dados entre empresas
- Cada empresa possui seus próprios usuários, clientes, produtos e vendas
- Sistema de planos (BASIC, PROFESSIONAL, ENTERPRISE)

### 👥 Multi-usuário
- Sistema de permissões baseado em roles (RBAC)
- 6 níveis de acesso: ADMIN, MANAGER, USER, SALESPERSON, CASHIER, TECHNICIAN
- Autenticação JWT segura

### 📊 Dashboard Inteligente
- KPIs em tempo real
- Vendas do mês e do dia
- Contas a pagar e receber
- Produtos com estoque baixo
- Análise de top produtos

### 🛒 Sistema de Vendas Completo
- PDV (Ponto de Venda)
- Múltiplas formas de pagamento
- Controle de estoque automático
- Histórico de vendas
- Cancelamento de vendas com devolução ao estoque

### 📦 Gestão de Estoque
- Controle de produtos
- Categorização
- Estoque mínimo e máximo
- Movimentações de estoque
- Alertas de estoque baixo

### 💰 Módulo Financeiro
- Contas a pagar
- Contas a receber
- Fluxo de caixa
- Controle de vencimentos

### 🔧 Ordens de Serviço
- Gestão completa de serviços
- Atribuição de técnicos
- Controle de status
- Histórico de atendimentos

## 🛠 Tecnologias

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Prisma ORM** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação
- **Zod** - Validação de dados
- **Bcrypt** - Criptografia de senhas

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **React Router** - Roteamento
- **TanStack Query** - Gerenciamento de estado servidor
- **Zustand** - Gerenciamento de estado local
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **React Hook Form** - Formulários
- **Sonner** - Notificações

### DevOps
- **Docker** + **Docker Compose**
- **Redis** - Cache (opcional)

## 📦 Módulos

### 1. Autenticação e Usuários
- Login/Registro
- Gerenciamento de usuários
- Controle de permissões
- Perfil de usuário

### 2. Dashboard
- Visão geral do negócio
- Indicadores chave de performance
- Vendas recentes
- Produtos mais vendidos

### 3. Produtos e Estoque
- CRUD de produtos
- Categorias
- Controle de estoque
- Movimentações
- SKU e código de barras

### 4. Clientes e Fornecedores
- Cadastro completo
- CPF/CNPJ
- Endereço completo
- Limite de crédito
- Histórico de compras

### 5. Vendas (PDV)
- Frente de caixa
- Múltiplas formas de pagamento
- Descontos
- Impressão de cupom
- Cancelamento

### 6. Compras
- Pedidos de compra
- Recebimento
- Entrada automática no estoque

### 7. Serviços
- Ordens de serviço
- Agendamentos
- Controle de técnicos
- Status de atendimento

### 8. Financeiro
- Contas a pagar
- Contas a receber
- Fluxo de caixa
- Relatórios financeiros

## 🚀 Instalação

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose
- Git

### Instalação Rápida com Docker

1. Clone o repositório:
```bash
git clone <repository-url>
cd whatsaasinstall
```

2. Inicie os containers:
```bash
docker-compose up -d
```

3. Execute as migrations do banco:
```bash
docker-compose exec backend npx prisma migrate dev
```

4. Acesse a aplicação:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Instalação Manual

#### Backend

1. Entre na pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Execute as migrations:
```bash
npx prisma migrate dev
```

5. Gere o Prisma Client:
```bash
npx prisma generate
```

6. Inicie o servidor:
```bash
npm run dev
```

#### Frontend

1. Entre na pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## ⚙️ Configuração

### Variáveis de Ambiente (Backend)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/erp_saas?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Redis (opcional)
REDIS_URL="redis://localhost:6379"
```

### Variáveis de Ambiente (Frontend)

```env
VITE_API_URL="http://localhost:3000/api"
```

## 📖 Uso

### Criar Primeira Empresa e Usuário

1. Acesse http://localhost:5173/register
2. Preencha os dados do usuário administrador
3. Preencha os dados da empresa
4. Clique em "Criar Conta"
5. Você será automaticamente autenticado

### Principais Funcionalidades

#### Cadastrar Produto
1. Acesse "Produtos" no menu
2. Clique em "Novo Produto"
3. Preencha os dados
4. Salve

#### Realizar Venda
1. Acesse "Vendas" > "Nova Venda"
2. Adicione produtos
3. Selecione a forma de pagamento
4. Finalize a venda

#### Visualizar Dashboard
1. Acesse o Dashboard
2. Visualize as estatísticas em tempo real
3. Acompanhe vendas recentes e produtos mais vendidos

## 📁 Estrutura do Projeto

```
whatsaasinstall/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Schema do banco de dados
│   ├── src/
│   │   ├── config/                # Configurações
│   │   ├── controllers/           # Controladores
│   │   ├── middleware/            # Middlewares
│   │   ├── routes/                # Rotas da API
│   │   ├── services/              # Lógica de negócio
│   │   ├── types/                 # Tipos TypeScript
│   │   ├── utils/                 # Utilitários
│   │   └── server.ts              # Servidor principal
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/            # Componentes React
│   │   ├── contexts/              # Contextos (Auth, etc)
│   │   ├── pages/                 # Páginas
│   │   ├── services/              # Serviços (API)
│   │   ├── types/                 # Tipos TypeScript
│   │   ├── App.tsx                # Componente principal
│   │   └── main.tsx               # Entry point
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml             # Configuração Docker
└── README.md                      # Este arquivo
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário autenticado

### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Buscar produto
- `POST /api/products` - Criar produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto

### Clientes
- `GET /api/customers` - Listar clientes
- `GET /api/customers/:id` - Buscar cliente
- `POST /api/customers` - Criar cliente
- `PUT /api/customers/:id` - Atualizar cliente
- `DELETE /api/customers/:id` - Deletar cliente

### Vendas
- `GET /api/sales` - Listar vendas
- `GET /api/sales/:id` - Buscar venda
- `POST /api/sales` - Criar venda
- `PUT /api/sales/:id` - Atualizar venda
- `POST /api/sales/:id/cancel` - Cancelar venda

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas do dashboard

## 🔧 Expansibilidade

O sistema foi desenvolvido com arquitetura modular e escalável, permitindo fácil expansão:

### Adicionar Novos Módulos

1. **Backend**: Crie controller, routes e services
2. **Frontend**: Crie páginas e componentes
3. **Database**: Adicione models no Prisma schema

### Integrações Possíveis

- **Nota Fiscal Eletrônica** (NF-e, NFC-e)
- **Gateway de Pagamento** (Stripe, PagSeguro, Mercado Pago)
- **Email Marketing** (SendGrid, Mailchimp)
- **WhatsApp Business API**
- **Relatórios Avançados** (PDFs, Excel)
- **BI e Analytics**
- **Mobile App** (React Native)

### Recursos Adicionais Sugeridos

- **Multi-idioma** (i18n)
- **Temas** (Dark mode)
- **Backup Automático**
- **Auditoria** (Logs de ações)
- **Importação/Exportação** de dados
- **API Pública** para integrações
- **Webhooks**
- **Sistema de Plugins**

## 🔒 Segurança

- Autenticação JWT
- Senhas criptografadas com bcrypt
- Validação de dados com Zod
- CORS configurado
- Helmet.js para headers de segurança
- Rate limiting
- SQL Injection prevention (Prisma)
- XSS prevention

## 🎯 Roadmap

- [ ] Integração com NFe
- [ ] App Mobile
- [ ] Módulo de CRM
- [ ] Relatórios avançados
- [ ] BI integrado
- [ ] API Pública
- [ ] Marketplace de plugins
- [ ] Sistema de assinaturas/pagamentos
- [ ] Multi-idioma
- [ ] Tema escuro

---

Desenvolvido com ❤️ para facilitar a gestão de empresas de comércio e serviço.
