import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configuração do Vite. A ordem dos plugins importa: o gerador de rotas do TanStack Router
// precisa rodar antes do plugin do React, para que a árvore de rotas já exista quando o
// Babel/SWC do React processa os arquivos.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
})
