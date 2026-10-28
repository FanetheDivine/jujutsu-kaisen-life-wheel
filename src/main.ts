import { registerSW } from 'virtual:pwa-register'
import './styles.css'
import './app'

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Service Worker 注册失败：', error)
  },
})
