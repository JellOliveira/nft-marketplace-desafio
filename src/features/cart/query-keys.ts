import { userScope } from '@/features/auth/query-keys'

export function cartKey(userId: string | null | undefined) {
  return ['cart', userScope(userId)] as const
}
