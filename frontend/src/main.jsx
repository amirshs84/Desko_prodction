import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { PWAProvider } from './hooks/PWAContext.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { queryClient } from './lib/queryClient.js'
import { initAndroidPush } from './plugins/androidPush.js'

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'desko-query-cache-v2',
  throttleTime: 1000,
})

initAndroidPush()

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // داده پنل مدیر از سوپرادمین/نقش‌های دیگر عوض می‌شود؛ persist باعث داده کهنه می‌شود
      if (query.queryKey?.[0] === 'manager') return false
      return query.state.status === 'success'
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PWAProvider>
        <App />
      </PWAProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
