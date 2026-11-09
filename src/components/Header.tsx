import { beep } from '../game/audio'
import { VERSION, VERSION_DATE } from '../game/version'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'

export function Header() {
  const sound = useGameStore((state) => state.sound)

  const toggleSound = (): void => {
    const next = !sound
    gameStore.setState({ sound: next })
    if (next) beep(880, 0.16, 0.06)
  }

  return (
    <header className="mb-[clamp(14px,2.4vw,26px)] grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 sm:gap-x-3.5 mid:gap-y-0">
      <div className="col-start-1 row-start-1 grid size-[46px] place-items-center self-center rounded-sm bg-vermillion font-display text-[26px] leading-none text-[#fff3e6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] mid:row-span-2 mid:self-end">
        呪
      </div>
      <h1 className="col-start-2 row-start-1 min-w-0 font-display text-[clamp(20px,3.2vw,32px)] leading-[1.25] font-semibold tracking-[0.02em] sm:tracking-[0.06em]">
        咒术回战 · 抽选人生
      </h1>
      <p className="col-span-2 col-start-1 row-start-2 flex flex-wrap items-center gap-x-2 text-[12.5px] tracking-[0.2em] text-ink-soft mid:col-span-1 mid:col-start-2">
        <span>数十轮因果 · 前轮定后轮 · 一命到底</span>
        <span className="flex items-center gap-0.5 whitespace-nowrap">
          <span
            className="inline-block rounded-full border border-vermillion bg-vermillion px-[7px] py-px text-[10.5px] tracking-[0.06em] text-[#fff4e8] select-all"
            title={`生成器版本（更新：${VERSION_DATE}）`}
          >
            {VERSION}
          </span>
          <button
            type="button"
            aria-label={sound ? '关闭音效' : '开启音效'}
            aria-pressed={sound}
            title={sound ? '音效：开' : '音效：关'}
            onClick={toggleSound}
            className="-m-2 cursor-pointer rounded-sm p-2 text-[15px] leading-none tracking-normal transition duration-200 ease-out-quart hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion"
          >
            {sound ? '🔊' : '🔇'}
          </button>
        </span>
      </p>
    </header>
  )
}
