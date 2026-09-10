# Imagem mínima para o servidor Socket.IO real. Build determinístico via `npm ci`, sem
# devDependencies (este servidor não tem nenhuma) — mantém a imagem pequena para deploy
# rápido em qualquer plataforma baseada em Docker (ver ARCHITECTURE.md, seção "Tempo real").
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

ENV PORT=4001
EXPOSE 4001

CMD ["node", "server.js"]
