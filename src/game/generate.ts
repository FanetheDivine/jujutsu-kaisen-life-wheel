import { gameStore, getState } from '../store/gameStore'
import { extractCompletionText, extractSseText, type ChatCompletionResponse } from './api'

export interface GenerationConfig {
  base: string
  key: string
  model: string
  temperature: string
  stream: boolean
}

export async function generateStory(config: GenerationConfig): Promise<void> {
  const generation = getState().gen
  const base = config.base.trim().replace(/\/+$/, '')
  const key = config.key.trim()
  const model = config.model.trim() || 'gpt-4o-mini'
  const temperature = parseFloat(config.temperature) || 0.9
  localStorage.setItem('jjkwheel', JSON.stringify({ base, model, key }))

  if (!key) {
    gameStore.setState({ apiStatus: '请填 API Key。', apiError: true })
    return
  }

  gameStore.setState({
    generating: true,
    apiStatus: '正在把一生交给模型…',
    apiError: false,
    story: '',
  })
  const previous = getState().ctrl
  if (previous) {
    try {
      previous.abort()
    } catch {
      // 过期请求或不完整数据可以安全忽略。
    }
  }
  const controller = new AbortController()
  gameStore.setState({ ctrl: controller })

  try {
    const response = await fetch(base + '/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        temperature,
        stream: config.stream,
        messages: [
          { role: 'system', content: getState().systemPrompt },
          { role: 'user', content: getState().markdown },
        ],
      }),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error('HTTP ' + response.status + ' — ' + text.slice(0, 300))
    }

    if (!config.stream) {
      const data = (await response.json()) as ChatCompletionResponse
      if (getState().gen !== generation) return
      gameStore.setState({ story: extractCompletionText(data) })
    } else {
      if (!response.body) throw new Error('响应不含可读流')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        if (getState().gen !== generation) {
          try {
            reader.cancel()
          } catch {
            // 过期请求或不完整数据可以安全忽略。
          }
          return
        }
        accumulated += extractSseText(decoder.decode(chunk.value, { stream: true }))
        gameStore.setState({ story: accumulated })
      }
    }

    if (getState().gen !== generation) return
    gameStore.setState({ apiStatus: '完成。', apiError: false })
  } catch (error) {
    if (getState().gen !== generation || (error instanceof Error && error.name === 'AbortError')) {
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    gameStore.setState({
      apiStatus:
        '失败：' +
        message +
        '（若为空或 TypeError，多半是浏览器的 CORS 限制，请换跨域网关或本地代理）',
      apiError: true,
    })
  } finally {
    if (getState().gen === generation) {
      gameStore.setState({ generating: false, ctrl: null })
    }
  }
}
