// Gera uma imagem placeholder determinística (SVG embutido em data URI) para cada NFT do
// mock. O Figma traz a arte final das ilustrações apenas como captura de tela das telas —
// não há assets individuais exportados por NFT —, então cada card usa este substituto
// gerado localmente em vez de um serviço externo de imagens: nenhuma dependência de rede
// para renderizar o catálogo (importante para Lighthouse e para o app funcionar offline dos
// mocks). Documentado como substituição de asset em ARCHITECTURE.md, conforme pedido pelo
// item 8 do desafio.
const PALETTE = [
  ['#2f1d15', '#d28a4c'],
  ['#241612', '#cfb28c'],
  ['#38220f', '#e89b55'],
  ['#2f1d15', '#59c36a'],
  ['#241612', '#4086f4'],
] as const

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Retorna um data URI de SVG com um degradê determinístico e as iniciais do nome — mesma
 *  seed sempre produz a mesma imagem, então os testes de regressão visual (item 9) e o
 *  Lighthouse (item 10) enxergam sempre o mesmo resultado. */
export function placeholderImage(seed: string, label: string): string {
  const index = hashSeed(seed) % PALETTE.length
  const [from, to] = PALETTE[index]
  const initials = label
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}" />
        <stop offset="100%" stop-color="${to}" />
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)" />
    <text x="300" y="330" font-family="'Roboto Mono', monospace" font-size="160" font-weight="700"
      fill="#f5f1eb" fill-opacity="0.85" text-anchor="middle">${initials}</text>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
