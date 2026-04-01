import {useState} from 'react';
import useFilterGamma from '@/common/components/filter-gamma-selector/useFilterGamma.ts';
import useFilterGammaConfig from '@/common/components/image/editor/useFilterGammaConfig.ts';

type ViewMode = 'select' | 'press';

export default function FilterGammaSelector() {
  const [combination, setCombination] = useFilterGamma();
  const [{filters, gammas}] = useFilterGammaConfig();
  const [mode, setMode] = useState<ViewMode>('select');

  const setFilter = (filter: string | null) =>
    setCombination({...combination, filter});

  const setGamma = (gamma: number | null) =>
    setCombination({...combination, gamma});

  const clearAll = () => setCombination({filter: null, gamma: null});

  const hasActive = combination.filter || combination.gamma;

  const modeBtn = (m: ViewMode) =>
    `w-7 h-7 flex items-center justify-center rounded transition-all ${
      mode === m
        ? 'bg-background text-foreground border border-white/20'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const filterPill = (f: string) =>
    `px-2.5 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${
      combination.filter === f
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        : 'bg-transparent text-muted-foreground border-white/15 hover:border-white/30 hover:text-foreground'
    }`;

  const gammaPill = (g: number) =>
    `px-2.5 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${
      combination.gamma === g
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-transparent text-muted-foreground border-white/15 hover:border-white/30 hover:text-foreground'
    }`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 w-full border-b border-white/10">
      {/* Mode toggle — icons only */}
      <div className="flex gap-0.5 p-0.5 bg-secondary rounded-md border border-white/10 shrink-0">
        <button
          onClick={() => setMode('select')}
          className={modeBtn('select')}
          title="Select mode">
          <SelectIcon />
        </button>
        <button
          onClick={() => setMode('press')}
          className={modeBtn('press')}
          title="Button mode">
          <PressIcon />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Controls */}
      {mode === 'select' && (
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
              Filter
            </label>
            <select
              value={combination.filter ?? ''}
              onChange={e => setFilter(e.target.value || null)}
              className="px-2 py-1 text-xs bg-background border border-white/20 rounded-md text-foreground focus:outline-none">
              <option value="">— none —</option>
              {filters.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
              Gamma
            </label>
            <select
              value={combination.gamma ?? ''}
              onChange={e => setGamma(Number(e.target.value) || null)}
              className="px-2 py-1 text-xs bg-background border border-white/20 rounded-md text-foreground focus:outline-none">
              <option value="">— none —</option>
              {gammas.map(g => (
                <option key={g} value={g}>
                  γ {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {mode === 'press' && (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-muted-foreground shrink-0">
              Filter
            </span>
            <div className="flex gap-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(combination.filter === f ? null : f)}
                  className={filterPill(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-white/10 shrink-0" />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-muted-foreground shrink-0">
              γ
            </span>
            <div className="flex gap-1">
              {gammas.map(g => (
                <button
                  key={g}
                  onClick={() => setGamma(combination.gamma === g ? null : g)}
                  className={gammaPill(g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active badges + clear */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        {combination.filter && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
            <FilterIcon /> {combination.filter}
          </span>
        )}
        {combination.gamma && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            γ {combination.gamma}
          </span>
        )}
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground border border-white/10 rounded px-2 py-0.5 transition-colors">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function SelectIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect
        x="1"
        y="1"
        width="11"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <rect
        x="1"
        y="7.5"
        width="11"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M9 3.25l1.5 0"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M9 9.75l1.5 0"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PressIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect
        x="1"
        y="1"
        width="4.5"
        height="4.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <rect
        x="7.5"
        y="1"
        width="4.5"
        height="4.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <rect
        x="1"
        y="7.5"
        width="4.5"
        height="4.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <rect
        x="7.5"
        y="7.5"
        width="4.5"
        height="4.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M5 1v8M1 5h8"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".5"
      />
    </svg>
  );
}
