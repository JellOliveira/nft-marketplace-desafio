// Reage a um 401 recebido em QUALQUER chamada Axios (não só na checagem de sessão) — ver o
// evento disparado em src/lib/http.ts. Sem isso, uma sessão que expira no meio da navegação
// (ex.: token invalidado enquanto o carrinho estava aberto) só seria percebida na próxima
// vez que a query de sessão rodasse, deixando dados privados no cache por mais tempo do que
// deveria. Monta uma vez na raiz da aplicação (ver src/routes/__root.tsx).
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { SESSION_EXPIRED_EVENT } from '@/lib/http'
import { authKeys } from './query-keys'

export function SessionExpiryListener() {
  const queryClient = useQueryClient()

  useEffect(() => {
    function handleExpired() {
      queryClient.clear()
      queryClient.setQueryData(authKeys.session, null)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [queryClient])

  return null
}
