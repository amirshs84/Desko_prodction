import { QueryClient } from '@tanstack/react-query'

/**
 * Instance مشترک QueryClient — import این فایل در هر جایی که
 * نیاز به queryClient خارج از React tree باشد (auth, logout, ...).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
  },
})
