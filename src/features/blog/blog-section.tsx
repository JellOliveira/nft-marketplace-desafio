// Seção "Diário da Cunhagem" (design-refs/Desktop/Início.png). Não existe tela de post
// individual nesta entrega, então "Ler mais" segue o mesmo padrão de link fora do escopo já
// usado no header/rodapé: não-interativo e com indicação explícita, em vez de simular
// navegação para um destino que não existe.
import { BLOG_POSTS } from './posts'

export function BlogSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-14 lg:px-[120px]">
      <h2 className="text-center text-2xl font-bold text-brand-text">Diário da Cunhagem</h2>
      <p className="mx-auto mt-2 max-w-md text-center text-sm text-brand-muted">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade
        digital.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {BLOG_POSTS.map((post) => (
          <article key={post.id} className="overflow-hidden rounded-xl bg-brand-card">
            <img
              src={post.image}
              alt=""
              aria-hidden
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            <div className="p-4">
              <p className="text-xs text-brand-gold">
                {post.date} <span aria-hidden> | </span> {post.readingTime}
              </p>
              <h3 className="mt-1 text-base font-bold text-brand-text">{post.title}</h3>
              <p className="mt-1 text-sm text-brand-gold">{post.excerpt}</p>
              <span
                aria-disabled="true"
                title="Fora do escopo desta entrega"
                className="mt-2 inline-block cursor-not-allowed text-sm font-bold text-brand-accent-alt/60"
              >
                Ler mais →
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
