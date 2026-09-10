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
  webServer: {
    // `--mode test` faz o Vite carregar .env.test durante o build (desliga o cenário
    // ambiente de tempo real — ver o comentário nesse arquivo). O preview só serve os
    // arquivos já buildados, então ele não precisa do mesmo modo.
    command: 'npm run build -- --mode test && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
