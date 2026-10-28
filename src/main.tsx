import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { SYSTEM_PROMPT } from './game/markdown'
import { resetFlow } from './game/registry'
import { gameStore } from './store/gameStore'
import './index.css'

resetFlow()
gameStore.setState({ systemPrompt: SYSTEM_PROMPT })

const container = document.getElementById('root')
if (!container) throw new Error('缺少 React 挂载节点 #root')
createRoot(container).render(<App />)

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Service Worker 注册失败：', error)
  },
})
