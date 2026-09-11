#!/usr/bin/env node
// Auditoria de performance e qualidade (item 10 do desafio): Início e Detalhe do NFT, perfis
// mobile e desktop, 3 medições por página/perfil, mediana de cada categoria. Roda contra
// `vite preview` (build de produção, o mesmo cenário padrão dos mocks — nunca o dev server e
// nunca uma versão simplificada só para pontuar melhor). Versionado aqui, conforme exigido:
// "Versione a configuração da auditoria".
//
// Uso:
//   npm run build && npm run preview -- --port 4173   (em um terminal)
//   node scripts/lighthouse-audit.mjs                  (em outro)
//
// Ou simplesmente `npm run audit:lighthouse`, que já builda e sobe o preview sozinho.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const BASE_URL = process.env.LH_BASE_URL ?? 'http://localhost:4173'
const OUT_DIR = 'lighthouse-reports'
const RUNS_PER_COMBO = 3

const PAGES = [
  { slug: 'inicio', path: '/' },
  // nft_1: primeiro item do catálogo determinístico (seed fixa, src/mocks/data/nfts.ts) —
  // sempre existe num cenário recém-resetado.
  { slug: 'detalhe', path: '/nft/nft_1' },
]

const PROFILES = [
  { name: 'mobile', extraArgs: [] },
  { name: 'desktop', extraArgs: ['--preset=desktop'] },
]

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // ainda subindo
    }
    await sleep(500)
  }
  throw new Error(`Servidor não respondeu em ${url} depois de ${timeoutMs}ms`)
}

function runLighthouse(url, profile, outPathNoExt) {
  const args = [
    'lighthouse',
    url,
    '--output=html',
    '--output=json',
    `--output-path=${outPathNoExt}`,
    '--chrome-flags=--headless=new --no-sandbox',
    '--quiet',
    '--only-categories=performance,accessibility,best-practices,seo',
    ...profile.extraArgs,
  ]
  try {
    execFileSync('npx', args, { stdio: 'inherit', shell: true })
  } catch (error) {
    // Bug conhecido do chrome-launcher no Windows: falha ao apagar o diretório temporário do
    // perfil do Chrome logo após o processo encerrar (EPERM, provável lock momentâneo de
    // antivírus/indexação) — acontece DEPOIS que o relatório já foi escrito com sucesso. Se os
    // dois arquivos de saída existem, o run é válido; só a limpeza falhou.
    const reportExists = existsSync(`${outPathNoExt}.report.json`) && existsSync(`${outPathNoExt}.report.html`)
    if (!reportExists) throw error
    console.warn(
      `  (aviso: limpeza do perfil temporário do Chrome falhou após gerar o relatório — ignorando, ver comentário no script)`,
    )
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  await waitForServer(BASE_URL)

  const results = []

  for (const page of PAGES) {
    for (const profile of PROFILES) {
      const url = `${BASE_URL}${page.path}`
      const runMetrics = []

      for (let run = 1; run <= RUNS_PER_COMBO; run++) {
        const outPathNoExt = `${OUT_DIR}/${page.slug}-${profile.name}-run${run}`
        console.log(`\n=== ${page.slug} / ${profile.name} / rodada ${run} — ${url} ===`)
        runLighthouse(url, profile, outPathNoExt)

        const json = JSON.parse(readFileSync(`${outPathNoExt}.report.json`, 'utf-8'))
        runMetrics.push({
          performance: json.categories.performance.score * 100,
          accessibility: json.categories.accessibility.score * 100,
          bestPractices: json.categories['best-practices'].score * 100,
          seo: json.categories.seo.score * 100,
          lcp: json.audits['largest-contentful-paint'].numericValue,
          cls: json.audits['cumulative-layout-shift'].numericValue,
          tbt: json.audits['total-blocking-time'].numericValue,
          lighthouseVersion: json.lighthouseVersion,
          userAgent: json.userAgent,
        })
      }

      results.push({
        page: page.slug,
        profile: profile.name,
        url,
        medians: {
          performance: median(runMetrics.map((m) => m.performance)),
          accessibility: median(runMetrics.map((m) => m.accessibility)),
          bestPractices: median(runMetrics.map((m) => m.bestPractices)),
          seo: median(runMetrics.map((m) => m.seo)),
          lcpMs: median(runMetrics.map((m) => m.lcp)),
          clsUnitless: median(runMetrics.map((m) => m.cls)),
          tbtMs: median(runMetrics.map((m) => m.tbt)),
        },
        runs: runMetrics,
      })
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    lighthouseVersion: results[0]?.runs[0]?.lighthouseVersion,
    userAgent: results[0]?.runs[0]?.userAgent,
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    targets: { performance: 90, accessibility: 95, bestPractices: 95, seo: 90 },
    results,
  }
  writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify(summary, null, 2))

  const lines = [
    '# Resultados Lighthouse (medianas de 3 medições)',
    '',
    `Gerado em: ${summary.generatedAt}`,
    `Lighthouse: ${summary.lighthouseVersion} · Node: ${summary.node} · Plataforma: ${summary.platform}`,
    '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...results.map(
      (r) =>
        `| ${r.page} | ${r.profile} | ${r.medians.performance.toFixed(0)} | ${r.medians.accessibility.toFixed(0)} | ${r.medians.bestPractices.toFixed(0)} | ${r.medians.seo.toFixed(0)} | ${r.medians.lcpMs.toFixed(0)} | ${r.medians.clsUnitless.toFixed(3)} | ${r.medians.tbtMs.toFixed(0)} |`,
    ),
    '',
    '## Metas (item 10 do desafio)',
    '',
    '| Categoria | Meta |',
    '| --- | ---: |',
    '| Performance | ≥ 90 |',
    '| Accessibility | ≥ 95 |',
    '| Best Practices | ≥ 95 |',
    '| SEO | ≥ 90 |',
    '',
  ]
  writeFileSync(`${OUT_DIR}/SUMMARY.md`, lines.join('\n'))

  console.log('\n' + lines.join('\n'))
  console.log(`\nRelatórios completos (HTML/JSON por rodada) em ${OUT_DIR}/`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
