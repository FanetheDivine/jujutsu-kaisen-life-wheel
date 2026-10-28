import type { distribution } from '../game/selectors'

export function Interference({ dist }: { dist: ReturnType<typeof distribution> }) {
  return (
    <div className="mt-3.5 rounded-r-sm border-l-2 border-indigo bg-[color-mix(in_oklab,var(--indigo)_6%,transparent)] px-3.5 py-3">
      <h4 className="mb-1.5 text-[11px] font-semibold tracking-[0.2em] text-indigo">
        前轮因果干涉
      </h4>
      {dist.notes.length ? (
        <ul className="pl-4">
          {dist.notes.map((note, index) => (
            <li key={`${note.rule}-${index}`} className="mb-[3px] text-xs text-ink-soft">
              <b className="font-semibold text-ink">{note.rule}</b> →{' '}
              {note.changes.map((change, changeIndex) => (
                <span key={`${change.label}-${changeIndex}`}>
                  {changeIndex ? ' ／ ' : ''}
                  {change.label}{' '}
                  <span className={change.pp > 0 ? 'text-vermillion' : 'text-indigo'}>
                    {change.pp > 0 ? '↑' : '↓'}
                    {Math.abs(change.pp).toFixed(0)}pp
                  </span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-faint">此轮不受干涉。</p>
      )}
    </div>
  )
}
