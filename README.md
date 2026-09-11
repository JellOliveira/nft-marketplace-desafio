# Kurio — NFT Marketplace

Marketplace de NFTs desenvolvido em React + TypeScript, com dados, autenticação, carteiras e
pagamentos totalmente simulados (MSW) e tempo real via Socket.IO. Veja `ARCHITECTURE.md` para
detalhes de arquitetura, contratos REST/eventos e decisões técnicas.

## Stack

React · TypeScript · TanStack Router · TanStack Query · Axios · Tailwind CSS · shadcn/ui ·
MSW · Socket.IO · Playwright · Lighthouse.

## Pré-requisitos

- Node.js 20+ e npm.

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Nenhuma variável é obrigatória para rodar localmente — os valores padrão já apontam para o
ambiente de desenvolvimento.

| Variável | Onde é usada | Padrão | Descrição |
| --- | --- | --- | --- |
| `VITE_ENABLE_MOCKS` | build/preview | `true` (sempre ligado, exceto se explicitamente `false`) | Liga/desliga a camada MSW. Existe para permitir, no futuro, apontar para uma API real. |
| `VITE_SOCKET_URL` | build | `http://localhost:4001` em dev (`.env.development`); precisa ser definida na Vercel para produção | URL do servidor de tempo real (ver `realtime-server/`). |
| `VITE_DISABLE_AMBIENT_REALTIME` | build de teste | — | Desliga o cenário ambiente de mudança de preço aleatória (usado só em `.env.test`, para os testes E2E não interferirem uns nos outros). |

## Comandos

```bash
npm run dev              # app em modo desenvolvimento (só o frontend)
npm run dev:realtime     # servidor Socket.IO local (necessário para tempo real funcionar)
npm run dev:all          # os dois juntos (recomendado para desenvolvimento)

npm run build            # build de produção
npm run preview          # serve o build de produção localmente

npm run typecheck        # verificação de tipos
npm run lint             # lint (oxlint)

npm run test:e2e         # testes Playwright (builda, sobe o preview e roda a suíte)
npm run test:e2e:report  # abre o último relatório HTML gerado
```

Para desenvolver localmente com tempo real funcionando, use `npm run dev:all` — ele sobe o
app e o servidor de tempo real juntos. Sem o servidor de tempo real rodando, o app continua
funcionando normalmente (os eventos simplesmente não chegam; a reconciliação REST via
polling continua cobrindo os pedidos).

## Credenciais fictícias

Dois usuários já vêm cadastrados no cenário padrão:

| E-mail | Senha |
| --- | --- |
| `colecionadora@kurio.app` | `colecionador123` |
| `artista@kurio.app` | `artista456` |

Nenhuma senha é armazenada em texto claro — mesmo no mock, elas ficam com hash SHA-256 (ver
`src/lib/crypto.ts`).

## Cenários de mock e reset

O estado simulado (usuários, catálogo, carrinho, pedidos, carteiras) fica em `localStorage`,
sob a chave `nft-marketplace:mock-db`. Para restaurar o cenário determinístico original a
qualquer momento:

```js
// no console do navegador, com o app aberto
localStorage.removeItem('nft-marketplace:mock-db')
location.reload()
```

O catálogo (preços, disponibilidade, categorias) é gerado de forma determinística a partir de
uma seed fixa (`src/mocks/data/nfts.ts`) — o mesmo conjunto de 64 NFTs sempre que o estado é
resetado.

### Cupons disponíveis para teste

| Código | Efeito |
| --- | --- |
| `KURIO10` | 10% de desconto |
| `BEMVINDO15` | 15% de desconto |
| `EXPIRADO5` | Cupom expirado — reproduz o cenário de erro |

## Cenários de rede (item 6.1 do desafio)

Todo handler REST passa por um único ponto (`src/mocks/network.ts`) antes de responder, que
aplica o cenário de rede ativo — configurável e reproduzível (PRNG com semente fixa, não
`Math.random()`), reaproveitado em dev, na demonstração e nos testes Playwright:

```js
// no console do navegador, com o app aberto
window.__setNetworkScenario({ scenario: 'slow' })      // latência fixa de 4s em toda chamada
window.__setNetworkScenario({ scenario: 'variable' })  // latência aleatória 200–3500ms (reprodutível)
window.__setNetworkScenario({ scenario: 'timeout' })   // nunca responde — estoura o timeout do Axios (15s)
window.__setNetworkScenario({ scenario: 'offline' })   // erro de rede (ERR_NETWORK), sem status HTTP
window.__setNetworkScenario({ scenario: 'error', errorRate: 50, errorStatus: 503 }) // 50% das chamadas falham com 503
window.__resetNetworkScenario()                        // volta ao normal (latência fixa 250ms)
```

O cenário fica persistido em `localStorage` (sobrevive a refresh) até ser resetado.

## Reproduzindo os fluxos de falha

| Cenário | Como reproduzir |
| --- | --- |
| Login com credenciais inválidas | Use qualquer e-mail/senha diferente dos cadastrados. |
| Cadastro com e-mail já em uso | Tente se cadastrar com `colecionadora@kurio.app`. |
| Cupom inválido | Aplique um código qualquer, ex. `NAOEXISTE`. |
| Cupom expirado | Aplique `EXPIRADO5`. |
| Disponibilidade excedida no carrinho | Aumente a quantidade além do que o NFT tem disponível — o "+" desabilita no limite. |
| Pagamento recusado | Na tela de pagamento, marque "Simular pagamento recusado (cenário de teste determinístico)" antes de confirmar. |
| Pedido pendente → confirmado | Fluxo padrão: leva ~3s de "processando" antes de confirmar (simula o tempo de uma transação real). |
| Sessão expirada durante a navegação | No console: `localStorage.setItem('nft-marketplace:session-token', 'invalido')` e navegue para uma rota protegida (ex. `/perfil`) — redireciona para o login preservando o destino. |
| Mudança de preço/disponibilidade em tempo real | Com um NFT no carrinho e o app aberto em duas abas, use `window.__triggerNftUpdate('<id-do-nft>', { priceEth: '9.99' })` no console (o mesmo gatilho que os testes E2E usam) — ou aguarde até 25s pelo cenário ambiente automático. |
| Falha ao favoritar (rollback otimista) | Reproduzido automaticamente pelo teste `tests/auth-flow.spec.ts` via interceptação de rede — não há um gatilho manual dedicado na UI para este caso específico. |

## Testes E2E (Playwright)

```bash
npm run test:e2e
```

A suíte builda o projeto, sobe `vite preview` e roda contra o build de produção — não o dev
server. Os testes rodam **em série** (não em paralelo): o servidor de tempo real é
compartilhado entre todas as execuções, então rodar em paralelo permitiria que um teste
"vazasse" um evento para outro (ver `ARCHITECTURE.md`, seção "Tempo real"). Relatório HTML e
traces de falha ficam em `playwright-report/` e `test-results/`.

Cobertura: catálogo (busca/filtros/paginação/histórico), acesso direto ao detalhe e NFT
inexistente, cadastro/login/expiração de sessão/logout/troca de usuário, favoritos com
rollback, carrinho (quantidade/cupom/persistência), compra completa até o recibo, pagamento
recusado, idempotência de pedido, mudança de preço em tempo real bloqueando o checkout, e
acessibilidade (teclado, foco de diálogo, validação de formulário).

## Auditoria Lighthouse

```bash
npm run audit:lighthouse
```

Builda, sobe `vite preview` e o `realtime-server` juntos, e roda 3 medições por página
(Início, Detalhe) e por perfil (mobile, desktop) — 12 no total — contra o build de produção.
Relatórios HTML/JSON de cada rodada ficam em `lighthouse-reports/`, com a mediana consolidada
em `lighthouse-reports/SUMMARY.md`. Config versionada em `scripts/lighthouse-audit.mjs`. Ver
`ARCHITECTURE.md` (seção "Lighthouse") para os resultados e a justificativa de qualquer
categoria abaixo da meta.

## Deploy

- **App**: Vercel — `https://<preencher-apos-deploy>.vercel.app`
- **Servidor de tempo real**: VPS própria via EasyPanel — `https://realtime.flowconnectdev.com.br`

O build de produção publicado já roda com os mocks ativados por padrão (não depende de
nenhum backend real).
