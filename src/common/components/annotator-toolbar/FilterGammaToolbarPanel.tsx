import useFilterGamma from '@/common/components/filter-gamma-selector/useFilterGamma.ts';
import useFilterGammaConfig from '@/common/components/image/editor/useFilterGammaConfig.ts';

const PPL_FILTER = 'PPL';

export default function FilterGammaToolbarPanel() {
  const [combination, setCombination] = useFilterGamma();
  const [{filters, gammas}] = useFilterGammaConfig();

  const setFilter = (filter: string | null) => {
    const isPPL = filter === PPL_FILTER;
    setCombination({
      filter,
      gamma: isPPL ? null : combination.gamma ?? gammas[0] ?? null,
    });
  };

  const setGamma = (gamma: string | null) =>
    setCombination({...combination, gamma});

  const showGamma = combination.filter !== PPL_FILTER;

  const filterPill = (f: string) =>
    `w-full px-2 py-1 text-left text-xs font-medium rounded transition-all ${
      combination.filter === f
        ? 'bg-blue-500/15 text-blue-400'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
    }`;

  const gammaPill = (g: string) =>
    `w-full px-2 py-1 text-left text-xs font-medium rounded transition-all ${
      combination.gamma === g
        ? 'bg-emerald-500/15 text-emerald-400'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
    }`;

  return (
    <div className="flex flex-col w-full pt-2 border-t border-white/10">
      <div className="flex flex-col gap-1.5 px-2 pb-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground px-0.5">
            Filter
          </span>
          <div className="flex flex-col">
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

        {showGamma && (
          <>
            <div className="w-full h-px bg-white/10 my-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground px-0.5">
                Gamma
              </span>
              <div className="flex flex-col">
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
          </>
        )}
      </div>
    </div>
  );
}
