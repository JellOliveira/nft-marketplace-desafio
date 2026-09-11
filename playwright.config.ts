import { defineConfig, devices } from '@playwright/test'

// Configuração do Playwright (item 9 do desafio). Roda contra o build de produção servido
// por `vite preview` — não o dev server — porque é isso que valida que o MSW, o Socket.IO e
// o roteamento funcionam exatamente como vão funcionar no ambiente publicado. Chromium nos
// dois viewports (desktop e mobile) exigidos pelo item 8.
export default defineConfig({
  testDir: './tests',
  // Serial, não paralelo: o servidor de tempo real (realtime-server/) é compartilhado por
  // todos os testes, assim como seria em produção — um evento anunciado por um teste chega,
  // via broadcast real do socket, em QUALQUER página conectada, inclusive a de outro teste
  // rodando ao mesmo tempo sobre o mesmo NFT. Rodar em série troca velocidade por zero risco
  // de um teste contaminar o resultado de outro. Documentado em ARCHITECTURE.md.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Regressão visual (item 9 do desafio, tests/visual-regression.spec.ts). `animations:
  // 'disabled'` neutraliza transform/opacity residuais no instante do screenshot;
  // `maxDiffPixelRatio` tolera até 2% de pixels divergentes — as baselines versionadas neste
  // repositório foram geradas no Windows 11 + Chromium, e a rasterização de fonte varia entre
  // sistemas operacionais mesmo sem nenhuma mudança real de layout (ver comentário no topo do
  // spec).
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // Dois servidores: o app (build + preview) e o relay Socket.IO real (realtime-server/), que
  // tests/realtime.spec.ts exige de verdade — sem ele, o evento nunca chega e o teste falha.
  // Listar os dois aqui (em vez de exigir `npm run dev:realtime` numa aba separada) é o que
  // garante que `npm run test:e2e` funcione sozinho a partir de um checkout limpo (item 12 do
  // desafio: "sem depender de serviços privados").
  webServer: [
    {
      // `--mode test` faz o Vite carregar .env.test durante o build (desliga o cenário
      // ambiente de tempo real — ver o comentário nesse arquivo). O preview só serve os
      // arquivos já buildados, então ele não precisa do mesmo modo.
      command: 'npm run build -- --mode test && npm run preview -- --port 4173',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'node realtime-server/server.js',
      url: 'http://localhost:4001',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
