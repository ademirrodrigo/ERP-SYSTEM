FROM node:20-alpine

# Instalar dependências necessárias para o Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
