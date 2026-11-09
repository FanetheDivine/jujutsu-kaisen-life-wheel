import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { resetFlow } from './game/registry'
import './index.css'

resetFlow()

const container = document.getElementById('root')
if (!container) throw new Error('缺少 React 挂载节点 #root')
createRoot(container).render(<App />)

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Service Worker 注册失败：', error)
  },
})
