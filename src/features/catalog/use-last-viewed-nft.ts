// Guarda o id do último NFT visitado (localStorage) para que o link "Mercado" do header
// — sem tela própria nesta entrega — possa levar a algum lugar real (o último produto
// visto) em vez de ficar decorativo o tempo todo. Enquanto nenhum produto foi visitado,
// "Mercado" continua não-interativo (ver site-header.tsx), preservando o princípio de não
// fingir uma funcionalidade que não existe.
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kurio:last-viewed-nft'
// O evento nativo `storage` só dispara em OUTRAS abas, nunca na mesma aba que fez a escrita
// — por isso o header não veria a mudança ao visitar um NFT sem um evento próprio in-tab.
const IN_TAB_EVENT = 'kurio:last-viewed-nft-changed'

export function getLastViewedNftId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setLastViewedNftId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
    window.dispatchEvent(new CustomEvent(IN_TAB_EVENT, { detail: id }))
  } catch {
    // Sem acesso a storage (modo privado, etc.) — degrada para "Mercado" ficar inativo.
  }
}

/** Lê o último NFT visitado e mantém em sync tanto entre abas (`storage`) quanto dentro da
 *  mesma aba (evento customizado disparado por `setLastViewedNftId`). */
export function useLastViewedNftId(): string | null {
  const [id, setId] = useState<string | null>(() => getLastViewedNftId())

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setId(event.newValue)
    }
    function onInTabChange(event: Event) {
      setId((event as CustomEvent<string>).detail)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(IN_TAB_EVENT, onInTabChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(IN_TAB_EVENT, onInTabChange)
    }
  }, [])

  return id
}
