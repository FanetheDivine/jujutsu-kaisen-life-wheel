export interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>
}

export function extractCompletionText(response: ChatCompletionResponse): string {
  const message = response.choices?.[0]?.message
  return message ? (message.content ?? '') : JSON.stringify(response).slice(0, 2000)
}

export function extractSseText(chunk: string): string {
  let text = ''
  for (const line of chunk.split('\n')) {
    if (line.indexOf('data:') !== 0) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') continue
    try {
      const response = JSON.parse(data) as ChatCompletionResponse
      const choice = response.choices?.[0]
      text += choice?.delta?.content || choice?.message?.content || ''
    } catch {
      // 与旧实现一致：忽略不完整或损坏的 SSE 数据行。
    }
  }
  return text
}
