import { useState } from 'react'
import { restart } from '../game/actions'
import { VERSION, VERSION_DATE } from '../game/version'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'
import { Button } from './ui/Button'

export function Header() {
  const sound = useGameStore((state) => state.sound)
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')

  const toggleTheme = (): void => {
    const next = !dark
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    setDark(next)
  }

  return (
    <header className="mb-[clamp(18px,3vw,30px)] flex flex-wrap items-end justify-between gap-5">
      <div className="flex items-center gap-3.5">
        <div className="grid size-[46px] flex-none place-items-center rounded-sm bg-vermillion font-display text-[26px] leading-none text-[#fff3e6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
          呪
        </div>
        <div>
          <h1 className="font-display text-[clamp(22px,3.2vw,32px)] leading-[1.15] font-semibold tracking-[0.06em]">
            咒术回战 · 人生转盘
          </h1>
          <p className="mt-0.5 text-[12.5px] tracking-[0.2em] text-ink-soft">
            数十轮因果 · 前轮定后轮 · 一命到底
            <span
              className="ml-2 inline-block rounded-full border border-vermillion bg-vermillion px-[7px] py-px align-middle text-[10.5px] tracking-[0.06em] whitespace-nowrap text-[#fff4e8] select-all"
              title={`生成器版本（更新：${VERSION_DATE}）`}
            >
              {VERSION}
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          aria-pressed={sound}
          onClick={() => gameStore.setState({ sound: !sound })}
        >
          音效：{sound ? '开' : '关'}
        </Button>
        <Button size="sm" onClick={toggleTheme}>
          夜行性：{dark ? '开' : '关'}
        </Button>
        <Button size="sm" variant="ghost" onClick={restart}>
          重抽一生
        </Button>
      </div>
    </header>
  )
}
