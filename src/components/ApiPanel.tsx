import { useState, type FormEvent } from 'react'
import { generateStory } from '../game/generate'
import { cn } from '../lib/cn'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'
import { Button } from './ui/Button'
import { Field } from './ui/Field'

interface SavedConfig {
  base: string
  model: string
  key: string
}

const inputClass =
  'min-h-11 w-full min-w-0 rounded-r-sm border border-line bg-paper px-2.5 py-2 font-body text-base text-ink mid:min-h-0 mid:text-[13px] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-faint focus:border-vermillion focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--vermillion)_12%,transparent)]'

function loadConfig(): SavedConfig {
  const fallback = { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', key: '' }
  try {
    const config: unknown = JSON.parse(localStorage.getItem('jjkwheel') || '{}')
    if (!config || typeof config !== 'object') return fallback
    const values = config as Record<string, unknown>
    return {
      base: typeof values.base === 'string' ? values.base : fallback.base,
      model: typeof values.model === 'string' ? values.model : fallback.model,
      key: typeof values.key === 'string' ? values.key : fallback.key,
    }
  } catch {
    return fallback
  }
}

export function ApiPanel() {
  const [initial] = useState(loadConfig)
  const [base, setBase] = useState(initial.base)
  const [model, setModel] = useState(initial.model)
  const [key, setKey] = useState(initial.key)
  const [temperature, setTemperature] = useState('0.9')
  const [stream, setStream] = useState(true)
  const generating = useGameStore((state) => state.generating)
  const status = useGameStore((state) => state.apiStatus)
  const error = useGameStore((state) => state.apiError)
  const systemPrompt = useGameStore((state) => state.systemPrompt)

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault()
    void generateStory({ base, model, key, temperature, stream })
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="mb-2.5 font-display text-[17px]">接上你的 API，让 AI 写这个故事</h3>
      <p className="mb-2.5 text-xs leading-[1.7] text-ink-soft">
        本页会把<b>系统提示词＋上方 Markdown 档案</b>
        发给你指定的任意 OpenAI 兼容接口（OpenAI / DeepSeek / Moonshot / 本地网关均可）。Key
        只保存在你自己的浏览器 localStorage，不经过任何第三方服务器。
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2.5 mid:grid-cols-2">
        <Field label="API Base" className="mid:col-span-full">
          <input
            id="api-base"
            name="base"
            className={inputClass}
            value={base}
            onChange={(event) => setBase(event.target.value)}
          />
        </Field>
        <Field label="Model">
          <input
            id="api-model"
            name="model"
            className={inputClass}
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
        </Field>
        <Field label="Temperature">
          <input
            id="api-temperature"
            name="temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            className={inputClass}
            value={temperature}
            onChange={(event) => setTemperature(event.target.value)}
          />
        </Field>
        <Field label="API Key" className="mid:col-span-full">
          <input
            id="api-key"
            name="key"
            type="password"
            autoComplete="off"
            placeholder="sk-…"
            className={inputClass}
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </Field>
        <Field label="系统提示词（可编辑）" className="mid:col-span-full">
          <textarea
            id="system-prompt"
            name="systemPrompt"
            rows={5}
            className={cn(inputClass, 'resize-y leading-[1.6]')}
            value={systemPrompt}
            onChange={(event) => gameStore.setState({ systemPrompt: event.target.value })}
          />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button type="submit" variant="primary" disabled={generating}>
          {generating ? '咒力输送中…' : '生成此生的故事'}
        </Button>
        <label className="inline-flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={stream}
            onChange={(event) => setStream(event.target.checked)}
          />
          <span className="text-xs">流式输出</span>
        </label>
      </div>
      <p
        role="status"
        className={cn(
          'mt-2.5 min-h-[1.4em] text-xs leading-[1.6] text-indigo',
          error && 'text-vermillion',
        )}
      >
        {status}
      </p>
      <p className="text-[11.5px] leading-[1.7] text-ink-faint">
        隐私提示：点击生成后，档案与 Key 会直接从你的浏览器发往上方 Base
        对应的服务商；本工具不保存、不转发。若浏览器报 CORS，请改用支持跨域的网关或本地代理。
      </p>
    </form>
  )
}
