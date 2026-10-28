import { Header } from './components/Header'
import { Ledger } from './components/Ledger'
import { StagePanel } from './components/StagePanel'
import { StatsPanel } from './components/StatsPanel'
import { Steps } from './components/Steps'
import { Card } from './components/ui/Card'
import { Wheel } from './components/Wheel'

export function App() {
  return (
    <div className="min-h-screen bg-paper font-body text-[15px] leading-[1.65] text-ink antialiased tabular-nums">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] bg-[size:34px_34px]"
      />
      <div className="relative z-1 mx-auto max-w-[1300px] px-[clamp(16px,3vw,32px)] pt-[clamp(18px,3vw,40px)] pb-20">
        <Header />
        <main className="grid grid-cols-1 items-start gap-[clamp(18px,2.4vw,28px)] mid:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          <section>
            <Card>
              <Steps />
              <Wheel />
              <StagePanel />
            </Card>
            <StatsPanel />
          </section>
          <section>
            <Ledger />
          </section>
        </main>
        <p className="mt-9 text-center text-[11.5px] tracking-[0.08em] text-ink-faint">
          本作为《咒术回战》二次创作的同人向玩具 · 版权归原作者芥见下下及集英社所有 ·
          生成结果仅供娱乐
        </p>
      </div>
    </div>
  )
}
