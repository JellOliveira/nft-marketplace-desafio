# Servidor de tempo real

Relay Socket.IO usado pelos eventos `nft.updated` e `order.updated` do app principal. Não
guarda nenhum dado de negócio — ver `ARCHITECTURE.md` na raiz do projeto, seção "Tempo real",
para o porquê desta arquitetura existir separada do app.

## Rodando localmente

```bash
npm install
npm start          # porta 4001 por padrão (PORT no ambiente)
```

Ou, a partir da raiz do projeto: `npm run dev:realtime` (ou `npm run dev:all` para subir o
app e este servidor juntos).

## Deploy

Publicado via Docker (`Dockerfile` neste diretório) — qualquer plataforma com suporte a
Docker funciona. Variável de ambiente `ALLOWED_ORIGINS` (lista separada por vírgula) define
quais origens podem se conectar via CORS/Socket.IO; `localhost` em qualquer porta é sempre
liberado, para desenvolvimento.
