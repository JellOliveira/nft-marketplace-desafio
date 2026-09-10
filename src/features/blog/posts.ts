// Conteúdo do "Diário da Cunhagem" (design-refs/Desktop/Início.png). Conteúdo editorial
// estático — não é dado transacional do desafio (não há CRUD de posts no enunciado) — por
// isso vive como uma constante local, sem passar por um handler MSW: seria simular uma API
// que não existe para um conteúdo puramente decorativo. As datas usam o mesmo dia da
// captura do Figma (2026-09-10..15) só como referência textual.
import blog1 from '@/assets/blog/blog-1.webp'
import blog2 from '@/assets/blog/blog-2.webp'
import blog3 from '@/assets/blog/blog-3.webp'
import blog4 from '@/assets/blog/blog-4.webp'

export interface BlogPost {
  id: string
  image: string
  date: string
  readingTime: string
  title: string
  excerpt: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'propriedade-de-nfts',
    image: blog1,
    date: '12 de setembro',
    readingTime: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    id: 'artistas-para-acompanhar',
    image: blog2,
    date: '13 de setembro',
    readingTime: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    id: 'raridade-atributos-procedencia',
    image: blog3,
    date: '15 de setembro',
    readingTime: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    id: 'proteger-sua-carteira',
    image: blog4,
    date: '15 de setembro',
    readingTime: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, suas chaves e sua identidade.',
  },
]
