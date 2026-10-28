import { DeliverPanel } from './components/DeliverPanel'
import { Header } from './components/Header'
import { Ledger } from './components/Ledger'
import { MobileNav } from './components/MobileNav'
import { StagePanel } from './components/StagePanel'
import { StatsPanel } from './components/StatsPanel'
import { Steps } from './components/Steps'
import { Card } from './components/ui/Card'
import { Wheel } from './components/Wheel'
import { cn } from './lib/cn'
import { useGameStore } from './store/useGameStore'

export function App() {
  const panel = useGameStore((state) => state.mobilePanel)

  return (
    <div className="min-h-screen bg-paper font-body text-[15px] leading-[1.65] text-ink antialiased tabular-nums [overflow-wrap:anywhere]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] bg-[size:34px_34px]"
      />
      <div className="relative z-1 mx-auto max-w-[1300px] px-3 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] sm:px-[clamp(16px,3vw,32px)] mid:pt-[clamp(18px,3vw,40px)] mid:pb-20">
        <Header />
        <MobileNav />
        <main className="grid grid-cols-1 items-start gap-[clamp(14px,2.4vw,28px)] mid:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          <div className="contents mid:block mid:min-w-0">
            <section
              id="panel-draw"
              aria-label="抽选人生"
              className={cn('min-w-0', panel !== 'draw' && 'hidden mid:block')}
            >
              <Card>
                <Steps />
                <Wheel />
                <StagePanel />
              </Card>
            </section>
            <section
              id="panel-stats"
              aria-label="咒力检定"
              className={cn(
                'min-w-0 mid:mt-[clamp(14px,2vw,20px)]',
                panel !== 'stats' && 'hidden mid:block',
              )}
            >
              <StatsPanel />
            </section>
          </div>
          <section
            id="panel-ledger"
            aria-label="命运帖"
            className={cn('min-w-0', panel !== 'ledger' && 'hidden mid:block')}
          >
            <Ledger />
          </section>
        </main>
        <DeliverPanel />
        <p className="mt-9 text-center text-[11.5px] tracking-[0.08em] text-ink-faint">
          本作为《咒术回战》二次创作的同人向玩具 · 版权归原作者芥见下下及集英社所有 ·
          生成结果仅供娱乐
        </p>
      </div>
    </div>
  )
}
