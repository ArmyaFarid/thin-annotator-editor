import {useEffect, useMemo} from 'react';
import useFilterGamma from '@/common/components/filter-gamma-selector/useFilterGamma.ts';
import useFilterGammaConfig from '@/common/components/image/editor/useFilterGammaConfig.ts';
import {AcquisitionVariant} from '@/app/atom.ts';

// The unpolarized view is the reference one: it leads the list and is the
// default selection whenever the task provides it.
const PPL_FILTER = 'PPL';

const uniq = <T,>(values: T[]) => [...new Set(values)];

// Closest acquisition that actually exists: the exact one, then one that keeps
// as much of the current selection as possible. Guarantees a selectable image.
function closestVariant(
  variants: AcquisitionVariant[],
  filter: string,
  gamma: number | null,
  rotation: number | null,
): AcquisitionVariant | null {
  return (
    variants.find(
      v => v.filter === filter && v.gamma === gamma && v.rotation === rotation,
    ) ??
    variants.find(v => v.filter === filter && v.gamma === gamma) ??
    variants.find(v => v.filter === filter && v.rotation === rotation) ??
    variants.find(v => v.filter === filter) ??
    null
  );
}

export default function FilterGammaToolbarPanel() {
  const [combination, setCombination] = useFilterGamma();
  const [{variants}] = useFilterGammaConfig();

  const filters = useMemo(
    () =>
      // Stable sort: PPL first, everything else in acquisition order.
      uniq(variants.map(v => v.filter)).sort(
        (a, b) => Number(b === PPL_FILTER) - Number(a === PPL_FILTER),
      ),
    [variants],
  );

  const gammas = useMemo(
    () =>
      uniq(
        variants
          .filter(v => v.filter === combination.filter)
          .map(v => v.gamma),
      ).filter((g): g is number => g != null),
    [variants, combination.filter],
  );

  const rotations = useMemo(
    () =>
      uniq(
        variants
          .filter(
            v =>
              v.filter === combination.filter && v.gamma === combination.gamma,
          )
          .map(v => v.rotation),
      ).filter((r): r is number => r != null),
    [variants, combination.filter, combination.gamma],
  );

  useEffect(() => {
    if (variants.length === 0) {
      return;
    }
    setCombination(
      variants.find(v => v.filter === PPL_FILTER) ?? variants[0],
    );
  }, [variants]);

  const select = (
    filter: string,
    gamma: number | null,
    rotation: number | null,
  ) => {
    const next = closestVariant(variants, filter, gamma, rotation);
    if (next) {
      setCombination(next);
    }
  };

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

  const rotationPill = (r: number) =>
    `w-full px-1 py-0.5 text-center text-[10px] font-medium rounded transition-all ${
      combination.rotation === r
        ? 'bg-amber-500/15 text-amber-400'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
    }`;

  return (
    <div className="flex flex-col w-full pt-1.5 border-t border-white/10 gap-1">
      <div className="flex flex-col gap-0.5 px-1">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => select(f, combination.gamma, combination.rotation)}
            className={filterPill(f)}>
            {f}
          </button>
        ))}
      </div>

      {gammas.length > 1 ? (
        <>
          <div className="w-full h-px bg-white/10" />
          <div className="flex flex-col gap-0.5 px-1">
            {gammas.map(g => (
              <button
                key={g}
                onClick={() =>
                  select(combination.filter!, g, combination.rotation)
                }
                className={gammaPill(g)}>
                γ{g}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {rotations.length > 1 ? (
        <>
          <div className="w-full h-px bg-white/10" />
          <div className="flex flex-col gap-0.5 px-1">
            {rotations.map(r => (
              <button
                key={r}
                onClick={() =>
                  select(combination.filter!, combination.gamma, r)
                }
                className={rotationPill(r)}>
                {r}°
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
