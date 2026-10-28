import { describe, expect, it } from 'vitest'
import { extractCompletionText, extractSseText } from '../src/game/api'

describe('OpenAI 兼容响应解析', () => {
  it('读取非流式消息，并为异常结构保留 JSON 摘要', () => {
    expect(extractCompletionText({ choices: [{ message: { content: '此生。' } }] })).toBe('此生。')
    expect(() => extractCompletionText({ choices: [] })).toThrow('接口返回结构异常')
  })

  it('拼接 SSE 增量，忽略完成标记、注释和损坏数据', () => {
    const chunk = [
      ': keep-alive',
      'data: {"choices":[{"delta":{"content":"你"}}]}',
      'data: {"choices":[{"delta":{"content":"活过。"}}]}',
      'data: [DONE]',
      'data: not-json',
    ].join('\n')

    expect(extractSseText(chunk)).toBe('你活过。')
  })
})
