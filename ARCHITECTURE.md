# Arquitetura

## Visão geral

Aplicação inteiramente client-side (SPA), sem backend real. Duas peças rodam separadas:

1. **App React** (Vercel, estático) — UI, roteamento, estado remoto e a camada de mocks REST
   (MSW), que roda dentro do próprio navegador do usuário.
2. **Servidor de tempo real** (`realtime-server/`, VPS própria via EasyPanel) — um relay
   Socket.IO minúsculo, sem lógica de negócio própria (ver seção "Tempo real" abaixo).

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│  Navegador (Vercel, estático)│        │  VPS (EasyPanel, Docker) │
│                               │        │                          │
│  React + TanStack Router/Query│◄──────►│  realtime-server         │
│  Axios → MSW (Service Worker)│  wss   │  (Node + socket.io)      │
│  socket.io-client            │        │                          │
└─────────────────────────────┘        └──────────────────────────┘
```

Toda a "verdade" dos dados (catálogo, carrinho, pedidos, perfil) mora no MSW, persistido em
`localStorage` sob a chave `nft-marketplace:mock-db` (ver `src/mocks/db.ts`). O servidor de
tempo real não guarda nenhum dado de negócio — ele só relaia, para um `socket.io-client`
real, os eventos que o próprio app pede para ele emitir.

## Contratos REST

Todas as rotas abaixo estão prefixadas com `/api` e implementadas em `src/mocks/handlers/`.

| Recurso | Rotas |
| --- | --- |
| Sessão e conta | `POST /auth/register`, `POST /auth/login`, `GET /auth/session`, `POST /auth/logout` |
| NFTs | `GET /nfts` (busca/filtro/ordenação/paginação), `GET /nfts/facets`, `GET /nfts/featured`, `GET /nfts/:id` |
| Favoritos | `GET /favorites`, `POST /favorites/:nftId`, `DELETE /favorites/:nftId` |
| Carrinho | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:nftId`, `DELETE /cart/items/:nftId`, `POST /cart/coupon`, `DELETE /cart/coupon` |
| Pedidos | `POST /orders` (idempotente via header `Idempotency-Key`), `GET /orders/:id` |
| Perfil | `GET /profile`, `PATCH /profile`, `PUT /profile/avatar`, `DELETE /profile/avatar`, `POST /profile/password` |
| Carteiras | `GET /wallets`, `PUT /wallets/:role`, `DELETE /wallets/:role` (`role` = `primary`\|`secondary`) |

Erros seguem o formato `{ message: string, fieldErrors?: Record<string, string> }`, com o
status HTTP correspondente (422 validação, 401 sessão inválida, 404 não encontrado, 409
conflito, 410 cupom expirado).

### Idempotência de pedidos

`POST /orders` exige o header `Idempotency-Key`. A mesma chave reenviada com o mesmo corpo
devolve o pedido já criado (200); reenviada com corpo diferente, devolve 409. A chave é
gerada uma única vez no cliente, ao montar a tela de pagamento (`useIdempotencyKey`), e
reaproveitada em qualquer reenvio — nunca gerada de novo a cada clique.

## Tempo real

### Por que não usamos `@mswjs/socket.io-binding`

O enunciado cita essa lib como exemplo de integração. Testamos sistematicamente (build de
produção via `vite preview`, não só o dev server) e confirmamos uma limitação real: o
matcher de WebSocket do MSW (testado nas versões 2.15.0 e 2.10.2 — a versão exata do peer
dependency da lib) não intercepta URLs de WebSocket que contenham query string. O
`socket.io-client` sempre anexa uma (`?EIO=4&transport=websocket`) de forma não
configurável — então nenhuma conexão Socket.IO real chega a ser interceptada.

### Arquitetura adotada

Um servidor `socket.io` real e próprio (`realtime-server/`), publicado separadamente da
aplicação. Ele não é uma simulação da UI: o `socket.io-client` real conecta nele via WSS, e
os handlers de evento no cliente (`src/features/realtime/realtime-provider.tsx`) processam
exatamente o que chega pelo socket — nenhum dado é escrito diretamente no estado da
aplicação por fora desse caminho.

Dois eventos, dois papéis:

- **`order.updated`**: quando um pedido é criado (`POST /orders`), o handler mock já sabe
  quando e como ele vai se resolver (confirmado ou recusado, conforme a chave
  `simulateRefusal`). Ele pede ao servidor de tempo real, via `order:watch`, para ecoar esse
  resultado de volta *só para aquele socket* depois de um tempo simulado de processamento.
- **`nft.updated`**: um "anunciante" (o cenário ambiente automático, ou o gatilho
  determinístico `window.__triggerNftUpdate` usado pelos testes) aplica a mudança de
  preço/disponibilidade localmente e emite `nft:announce`; o servidor faz broadcast do
  evento `nft.updated` para todos os sockets conectados — inclusive o que emitiu, fechando o
  ciclo real pelo `socket.io-client`.

Em nenhum dos dois casos a UI decide sozinha o resultado: o cliente só aplica o que o evento
carrega, sempre com uma versão (`version`) que descarta eventos antigos ou duplicados (ver
`src/features/realtime/realtime-provider.tsx`).

### Reconciliação REST ↔ Socket.IO

Pedidos usam **os dois caminhos ao mesmo tempo, de propósito**: `useOrder` faz polling REST
(1s) enquanto o pedido estiver `pending`, e o evento `order.updated` também dispara uma
invalidação da mesma query. Qualquer um dos dois que chegar primeiro resolve o estado —
nenhum dos dois escreve o status diretamente no cache, os dois só disparam um refetch que
volta a consultar `GET /orders/:id`, a fonte única de verdade. Se o servidor de tempo real
estiver fora do ar, o polling REST sozinho já garante a experiência completa.

Na reconexão do socket (não a primeira conexão), o cliente invalida o catálogo, os facets e
os pedidos ativos — reconciliando com a API REST em vez de assumir que nenhum evento foi
perdido enquanto a conexão estava caída.

### Limitação conhecida dos testes E2E

Como o servidor de tempo real é compartilhado por todas as execuções, testes rodando em
paralelo sobre o mesmo NFT podem "vazar" eventos entre si. A suíte Playwright roda em série
(`fullyParallel: false, workers: 1`) para eliminar esse risco — mais lenta, mas
determinística.

## Isolamento de dados entre usuários

- Toda chave de query do TanStack Query que depende do usuário inclui o `userId` (ou
  `"guest"`) — ver `userScope()` em `src/features/auth/query-keys.ts`.
- Logout dispara `queryClient.clear()` — limpa **todo** o cache, não só a sessão — e
  reconecta o socket do zero, descartando qualquer `order:watch` pendente da sessão
  anterior.
- No servidor mock, favoritos, carrinho, pedidos, perfil e carteiras são todos indexados por
  `userId` (nunca uma coleção global), e os handlers resolvem esse id a partir do token de
  sessão — nunca de um id enviado pelo cliente.

Um bug real foi encontrado e corrigido durante o desenvolvimento: o interceptor de resposta
do Axios disparava um evento global de "sessão expirada" (que limpa o cache) em **qualquer**
401 — inclusive o 401 normal e esperado de `GET /auth/session` para um visitante. Isso
quebrava silenciosamente o carregamento de dados públicos (catálogo) para quem abria a
página deslogado. Corrigido excluindo explicitamente esse endpoint do gatilho (ver
`src/lib/http.ts`).

## Estado do carrinho

O carrinho guarda só `{ nftId, edição, quantidade }` — preço, disponibilidade e a versão
usada para detectar cotação desatualizada são sempre recalculados a partir do catálogo atual
no momento da consulta (`getEffectiveNft`), nunca congelados na linha do carrinho. Isso é o
que garante que uma mudança de preço via evento em tempo real apareça automaticamente no
resumo do carrinho, sem nenhuma sincronização manual extra.

`quoteVersion` (devolvido em `GET /cart`) combina a versão interna do carrinho (mutações
explícitas: adicionar, remover, cupom) com a soma das versões dos NFTs presentes nele — é
assim que uma mudança de preço, que não é uma "mutação do carrinho" em si, ainda invalida a
cotação que o colecionador tinha revisado na tela de pagamento.

Carrinho de visitante (antes do login) é identificado por um id gerado e persistido em
`localStorage` (`src/lib/guest-id.ts`), enviado no header `X-Guest-Id`. No login/cadastro, o
handler mescla esse carrinho no do usuário autenticado, somando quantidades de linhas
equivalentes (`mergeGuestCartIntoUser` em `src/mocks/handlers/auth.ts`).

## Cache (TanStack Query)

- `staleTime` global de 30s, `retry: 1`, sem refetch automático no foco da janela
  (`src/lib/query-client.ts`) — os dados mudam por evento de tempo real ou mutação
  explícita, não por polling ambiente.
- Catálogo usa `placeholderData: keepPreviousData` — a página anterior fica visível durante a
  troca de filtro/paginação, sem piscar para um skeleton a cada clique; o `AbortSignal` do
  próprio React Query descarta respostas fora de ordem automaticamente.
- Atualização otimista com rollback: favoritar/desfavoritar (`useToggleFavorite`) — o coração
  muda na hora, e volta ao estado anterior se a mutação falhar.
- Pedidos e carrinho não são otimistas: dependem de confirmação do servidor antes de
  atualizar a tela — deliberado, para nunca mostrar sucesso antes de sua confirmação real.

## Substituições de asset e desvios do Figma

- **Imagens dos NFTs**: o Figma disponibiliza apenas capturas de tela das composições, sem
  os assets individuais de cada NFT exportados. As artes usadas nos cards (`src/assets/
  nft-art`, `hero`, `promo`, `blog`) foram recortadas dessas capturas e otimizadas em webp —
  um conjunto de 8 artes únicas, cicladas deterministicamente por índice na fixture
  (`src/mocks/data/nfts.ts`), já que não há arte individual por NFT para todos os 64 itens
  gerados. `src/lib/placeholder-image.ts` (SVG com gradiente determinístico + iniciais)
  segue existindo só como 4º item da galeria de cada NFT (varia por item sem exigir mais
  recortes) — nenhuma imagem depende de serviço externo, então o catálogo continua
  funcionando 100% offline dos mocks (sem flakiness de rede na auditoria Lighthouse).
- **Coração de favoritar**: no Figma, os ícones de ação do card (carrinho, coração, busca)
  só aparecem no hover. Implementado sempre visível — um controle interativo que só aparece
  no hover é inoperável por teclado, o que violaria o requisito de navegação por teclado.
- **Preço no carrinho (mobile)**: o preço unitário por item some em telas estreitas (para não
  apertar o layout), mas o total da linha ficou sempre visível — no desenho original ambos
  ficavam ocultos no mobile, o que deixaria o carrinho sem nenhuma indicação de valor numa
  tela pequena.
- **Login/Cadastro**: implementados como rota real (`/login`, `/cadastro`) que renderiza um
  modal sobre o cabeçalho — em vez de um modal client-side sem rota própria — para que
  acesso direto e refresh nessas telas funcionem (exigido pelo item 3 do desafio).
- **Espaçamento e proporção de texto**: a composição geral segue o Figma, mas o espaçamento
  entre blocos de texto não reproduz o valor exato do arquivo em todas as telas — pequenas
  variações de `line-height`/`gap` foram ajustadas visualmente durante a implementação em vez
  de copiadas pixel a pixel do token original.
- **Rodapé — ícones em vez de iniciais**: os três blocos de destaque do rodapé ("Segurança da
  carteira", "Criadores em destaque", "Alertas de lançamentos") usam ícones temáticos no lugar
  das iniciais "W", "C", "D" do Figma — mais claros para identificar o assunto de cada bloco
  sem depender de decorar o que cada letra abrevia.
- **Seletor de edição do NFT**: o elemento visual ao redor das opções de edição (no detalhe do
  NFT) foi refeito para ficar mais próximo do Figma do que a primeira versão implementada —
  ajuste feito durante o desenvolvimento, não um desvio deliberado final.
- **Carrossel de "mais coleções" / detalhe**: uma seta com opacidade reduzida nas bordas indica
  que há mais itens para arrastar lateralmente — affordance que o Figma não representa
  explicitamente nesses carrosséis.
- **Indicador de carteira conectada (pagamento)**: foi adicionado um texto com indicador verde
  mostrando claramente que a carteira está conectada, com opção de desconectar — não está
  desenhado assim no Figma; ajuda a visualizar o estado durante o teste do fluxo de
  conexão/recusa/desconexão exigido pelo item 3.
- **Atalho de login no pagamento (desktop)**: abaixo do botão "Confirmar compra", foi
  adicionada a opção "já tem conta? Entrar" na lateral, para quem chega ao checkout sem sessão
  não precisar abrir o fluxo de cadastro completo.
- **Botões**: alguns botões têm pequenas diferenças de padding/raio em relação ao Figma —
  ajustados para manter consistência com os componentes shadcn/ui adaptados, mantendo a
  identidade visual, não uma cópia exata de cada instância do arquivo.
- **Ícone de zoom/lupa**: usa um ícone diferente do desenhado no Figma para a mesma ação.
- **Mobile — botão central da barra inferior**: o Figma não identifica para onde esse botão
  leva; foi implementado como atalho de acesso rápido ao menu.
- **Mobile — adaptação geral de conteúdo**: o Figma disponibiliza bem menos frames mobile do
  que desktop, e as telas desktop concentram mais informação do que cabe confortavelmente numa
  tela pequena. Sem um prazo de entrega explícito encontrado no repositório do desafio, a
  prioridade foi adaptar o máximo de telas possível dentro do tempo disponível, mantendo a
  fidelidade onde havia referência direta e seguindo o mesmo padrão visual (item 1 do
  enunciado: "Estados não desenhados devem seguir o mesmo padrão visual") onde não havia. Como
  consequência, o preenchimento e a densidade de informação no mobile podem não reproduzir
  exatamente o Figma em todas as telas.

## Limitações conhecidas

- **Busca e filtros por texto no mobile**: abaixo do breakpoint `lg`, a Home usa um cabeçalho
  compacto próprio (`site-header.tsx`, `hasOwnMobileHeader`) e a sidebar de filtros
  (categoria/rede/preço) fica oculta (`hidden lg:block`, `src/routes/index.tsx`) — no mobile,
  filtros e ordenação vivem no painel aberto pelo botão central da barra inferior
  (`mobile-tab-bar.tsx`), mas esse painel não tem um campo de busca por texto livre
  equivalente ao do cabeçalho desktop. Os testes de busca/filtro por rede
  (`tests/catalog.spec.ts`, `tests/accessibility.spec.ts`) cobrem o fluxo no desktop; no
  mobile-chromium eles são pulados (`test.skip`) com o motivo registrado no próprio teste, em
  vez de falhar silenciosamente ou fingir cobertura que não existe. Fechar essa lacuna (campo
  de busca dentro do painel mobile, com teste E2E dedicado) é o próximo item se sobrar tempo.

## Testes

Ver `README.md` para os comandos. Estratégia: estado isolado por teste (contexto de
navegador novo do Playwright = `localStorage` limpo), gatilho determinístico para cenários
de tempo real (sem depender do temporizador ambiente), interceptação de rede
(`page.route`) para simular falhas transitórias sem exigir suporte dedicado no app para cada
cenário de erro possível.

## Lighthouse

Configuração versionada em `scripts/lighthouse-audit.mjs` (`npm run audit:lighthouse` builda,
sobe `vite preview` + o `realtime-server` juntos, e roda 3 medições por página/perfil contra o
build de produção — nunca o dev server, nunca uma versão simplificada). Relatórios HTML/JSON
de cada rodada ficam em `lighthouse-reports/`, com a mediana consolidada em
`lighthouse-reports/SUMMARY.md`. Auditado com Lighthouse 13.4.1, Chrome (`chrome-launcher`),
Node 24, Windows 11 — ver `lighthouse-reports/summary.json` para o ambiente completo de cada
rodada.

### Resultados (mediana de 3 medições, build local via `vite preview`)

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 58 | 100 | 77 | 92 | 5,7s | 0,019 | 319ms |
| Início | desktop | 86 | 100 | 77 | 92 | 1,2s | 0,173 | 10ms |
| Detalhe | mobile | 52 | 96 | 77 | 92 | 5,7s | 0,130 | 325ms |
| Detalhe | desktop | 83 | 97 | 77 | 92 | 1,6s | 0,121 | 13ms |

Metas: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥90.

### Por que Best Practices trava em 77 no build local (e como isso se resolve)

Duas causas, sempre as mesmas nas 12 rodadas — nenhuma delas é falta de otimização:

1. **"Não usa HTTPS"**: artefato de auditar `http://localhost:4173` — `vite preview` não serve
   TLS localmente. Rodando a mesma auditoria contra a URL pública da Vercel (HTTPS de
   verdade), essa causa desaparece e o Best Practices sobe para **96** (acima da meta) em
   todas as combinações — ver `lighthouse-reports/producao/` (rodada de confirmação, 1 medição
   por página/perfil, complementar às 12 oficiais contra o build local).
2. **Erro no console: `401` em `GET /auth/session`**: comportamento correto e documentado (ver
   "Isolamento de dados entre usuários" acima) — é assim que o app descobre que ninguém está
   logado. O DevTools do Chrome loga qualquer resposta não-2xx como "erro" no console
   independente da aplicação tratar isso normalmente em JS (e trata: nenhum erro chega ao
   usuário, nenhum comportamento quebra). Corrigir isso "de verdade" exigiria não usar `401`
   para uma sessão inexistente — pior design de API só para agradar a métrica, o que o item 10
   do desafio proíbe explicitamente ("sem simplificações exclusivas para melhorar a
   pontuação"). Mantido como está, documentado aqui.

### Por que Performance mobile fica abaixo da meta

Início/Detalhe mobile ficam em 52–58 (meta: 90), desktop em 83–86 (perto da meta, mas ainda
abaixo). LCP mobile em ~5,7s é a causa dominante — decomposto via os relatórios individuais:

- **CPU 4x mais lenta simulada pelo perfil mobile do Lighthouse**: o bundle inicial carrega o
  worker do MSW (`browser-*.js`, ~264KB) inteiro antes de qualquer requisição de API poder
  responder — em uma CPU real de topo isso é imperceptível, mas sob o throttling padrão do
  Lighthouse mobile o parsing/execução desse bundle domina o tempo até a primeira pintura útil.
- **Máquina de desenvolvimento local**: a auditoria contra o build local roda em uma máquina
  Windows comum (não um runner de CI dedicado nem o CDN de borda da Vercel) — a mesma
  auditoria contra a URL pública (`lighthouse-reports/producao/`) mostra números de mobile na
  mesma faixa, então o gargalo é real e não só do ambiente local, mas a mediana absoluta pode
  variar numa máquina diferente.
- **Não simplificado para pontuar**: a auditoria roda com os mocks, o Socket.IO e as imagens
  reais da entrega — exatamente como o item 10 exige. Uma correção real (que não coube no
  prazo desta entrega) seria dividir o `browser-*.js` do MSW com `dynamic import()` carregado
  só depois do primeiro paint, ou trocar o worker do MSW por um `Response` mock mais leve nas
  rotas de leitura mais chamadas no carregamento inicial (catálogo/destaque).

SEO (92) e o Accessibility de Detalhe (96–97) já superam a meta em toda combinação — Início
Accessibility chegou a 100 depois da correção de 3 problemas reais encontrados via esta própria
auditoria (não simulados): um `SelectTrigger` sem nome acessível quando o rótulo visível fica
oculto abaixo de `xl`, hierarquia de heading quebrada no mobile (a barra lateral de filtros —
com os únicos `<h2>` da página — fica oculta ali, pulando de `<h1>` direto para os `<h3>` dos
cards; corrigido com um `<h2 className="sr-only">` antes da grade), e as bolinhas do carrossel
do herói com área de toque de 8px (abaixo do mínimo recomendado de 24px) — ver
`src/routes/index.tsx`.
