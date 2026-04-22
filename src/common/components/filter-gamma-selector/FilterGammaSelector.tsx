import useFilterGamma from "@/common/components/filter-gamma-selector/useFilterGamma.ts";

export default function FilterGammaSelector() {
    const [combination] = useFilterGamma();

    if (!combination.filter && combination.gamma == null) return null;

    return (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
            {combination.filter ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap backdrop-blur-sm">
                    <FilterIcon /> {combination.filter}
                </span>
            ) : null}
            {combination.gamma != null ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap backdrop-blur-sm">
                    γ {combination.gamma}
                </span>
            ) : null}
        </div>
    );
}

function FilterIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1" opacity=".5" />
        </svg>
    );
}
