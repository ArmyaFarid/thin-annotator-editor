import {useEffect} from 'react';
import useFilterGamma from '@/common/components/filter-gamma-selector/useFilterGamma.ts';
import useFilterGammaConfig from '@/common/components/image/editor/useFilterGammaConfig.ts';

const PPL_FILTER = 'PPL';

export default function FilterGammaToolbarPanel() {
  const [combination, setCombination] = useFilterGamma();
  const [{filters, gammas}] = useFilterGammaConfig();

  useEffect(() => {
    if (!filters.length) {
      return;
    }
    const firstFilter = filters[0];
    const isPPL = firstFilter === PPL_FILTER;
    setCombination({
      filter: firstFilter,
      gamma: isPPL ? null : gammas[0] ?? null,
    });
  }, [filters, gammas]);

  const setFilter = (filter: string | null) => {
    const isPPL = filter === PPL_FILTER;
    setCombination({
      filter,
      gamma: isPPL ? null : combination.gamma ?? gammas[0] ?? null,
    });
  };

  const setGamma = (gamma: number | null) =>
    setCombination({...combination, gamma});

  const showGamma = combination.filter !== PPL_FILTER;

  const filterPill = (f: string) =>
    `w-full px-1 py-0.5 text-center text-[10px] font-medium rounded transition-all ${
      combination.filter === f
        ? 'bg-blue-500/15 text-blue-400'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
    }`;

  const gammaPill = (g: number) =>
    `w-full px-1 py-0.5 text-center text-[10px] font-medium rounded transition-all ${
      combination.gamma === g
        ? 'bg-emerald-500/15 text-emerald-400'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
    }`;

  return (
    <div className="flex flex-col w-full pt-1.5 border-t border-white/10 gap-1">
      <div className="flex flex-col gap-0.5 px-1">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(combination.filter === f ? null : f)}
            className={filterPill(f)}>
            {f}
          </button>
        ))}
      </div>

      {showGamma && (
        <>
          <div className="w-full h-px bg-white/10" />
          <div className="flex flex-col gap-0.5 px-1">
            {gammas.map(g => (
              <button
                key={g}
                onClick={() => setGamma(combination.gamma === g ? null : g)}
                className={gammaPill(g)}>
                γ{g}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
