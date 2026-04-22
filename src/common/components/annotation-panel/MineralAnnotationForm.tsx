import React from "react";
import {useAtom} from "jotai";
import {masksAtom, type ConfidenceLevel, type MineralAnnotation} from "@/app/atom.ts";
import useMineralList from "@/common/components/annotation-panel/useMineralList.ts";

const EMPTY_ANNOTATION: MineralAnnotation = {
    mineralId: null,
    confidence: null,
    observedColor: "",
    relief: null,
    birefringence: null,
    cleavage: null,
    crystalSystem: null,
    pleochroism: null,
    extinctionAngle: "",
    notes: "",
};

interface MineralAnnotationFormProps {
    maskId: number;
}

export const MineralAnnotationForm: React.FC<MineralAnnotationFormProps> = ({maskId}) => {
    const [masks, setMasks] = useAtom(masksAtom);
    const minerals = useMineralList();

    const mask = masks.find((m) => m.id === maskId);
    const ann: MineralAnnotation = mask?.annotation ?? EMPTY_ANNOTATION;

    function update(patch: Partial<MineralAnnotation>) {
        setMasks((prev) =>
            prev.map((m) =>
                m.id === maskId ? {...m, annotation: {...(m.annotation ?? EMPTY_ANNOTATION), ...patch}} : m,
            ),
        );
    }

    const confidenceLevels: {value: ConfidenceLevel; label: string; color: string}[] = [
        {value: 1, label: "Incertain", color: ann.confidence === 1 ? "bg-yellow-500/20 text-yellow-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"},
        {value: 2, label: "Probable",  color: ann.confidence === 2 ? "bg-blue-500/20 text-blue-400"   : "text-white/40 hover:text-white/70 hover:bg-white/5"},
        {value: 3, label: "Certain",   color: ann.confidence === 3 ? "bg-emerald-500/20 text-emerald-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"},
    ];

    const selectCls = "w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30";
    const labelCls = "text-[10px] text-white/40 uppercase tracking-wide";

    // Group minerals for optgroup
    const groups = Array.from(new Set(minerals.map((m) => m.group)));

    return (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
            <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Annotation minéralogique</span>

            {/* Mineral name */}
            <div className="flex flex-col gap-0.5">
                <span className={labelCls}>Minéral</span>
                <select
                    value={ann.mineralId ?? ""}
                    onChange={(e) => update({mineralId: e.target.value || null})}
                    className={selectCls}>
                    <option value="">— sélectionner —</option>
                    {groups.map((g) => (
                        <optgroup key={g} label={g}>
                            {minerals.filter((m) => m.group === g).map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* Confidence */}
            <div className="flex flex-col gap-0.5">
                <span className={labelCls}>Confiance</span>
                <div className="flex rounded overflow-hidden border border-white/15">
                    {confidenceLevels.map((c, i) => (
                        <React.Fragment key={c.value}>
                            {i > 0 ? <div className="w-px bg-white/15" /> : null}
                            <button
                                onClick={() => update({confidence: ann.confidence === c.value ? null : c.value})}
                                className={`flex-1 py-1 text-[10px] font-medium transition-colors ${c.color}`}>
                                {c.label}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Optical properties row 1 */}
            <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>Relief</span>
                    <select value={ann.relief ?? ""} onChange={(e) => update({relief: (e.target.value as MineralAnnotation["relief"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="faible">Faible</option>
                        <option value="moyen">Moyen</option>
                        <option value="élevé">Élevé</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>Biréfringence</span>
                    <select value={ann.birefringence ?? ""} onChange={(e) => update({birefringence: (e.target.value as MineralAnnotation["birefringence"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="faible">Faible</option>
                        <option value="moyen">Moyen</option>
                        <option value="élevé">Élevé</option>
                        <option value="très élevé">Très élevé</option>
                    </select>
                </div>
            </div>

            {/* Optical properties row 2 */}
            <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>Clivage</span>
                    <select value={ann.cleavage ?? ""} onChange={(e) => update({cleavage: (e.target.value as MineralAnnotation["cleavage"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="aucun">Aucun</option>
                        <option value="indistinct">Indistinct</option>
                        <option value="bon">Bon</option>
                        <option value="parfait">Parfait</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>Pléochroïsme</span>
                    <select value={ann.pleochroism ?? ""} onChange={(e) => update({pleochroism: (e.target.value as MineralAnnotation["pleochroism"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="aucun">Aucun</option>
                        <option value="faible">Faible</option>
                        <option value="fort">Fort</option>
                    </select>
                </div>
            </div>

            {/* Optical properties row 3 */}
            <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>Système cristallin</span>
                    <select value={ann.crystalSystem ?? ""} onChange={(e) => update({crystalSystem: (e.target.value as MineralAnnotation["crystalSystem"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="cubique">Cubique</option>
                        <option value="tétragonal">Tétragonal</option>
                        <option value="orthorhombique">Orthorhombique</option>
                        <option value="monoclinique">Monoclinique</option>
                        <option value="triclinique">Triclinique</option>
                        <option value="hexagonal">Hexagonal</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>Angle d'extinction (°)</span>
                    <input
                        type="text"
                        value={ann.extinctionAngle}
                        onChange={(e) => update({extinctionAngle: e.target.value})}
                        placeholder="ex: 25"
                        className="w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30 placeholder:text-white/20"
                    />
                </div>
            </div>

            {/* Observed color */}
            <div className="flex flex-col gap-0.5">
                <span className={labelCls}>Couleur observée</span>
                <input
                    type="text"
                    value={ann.observedColor}
                    onChange={(e) => update({observedColor: e.target.value})}
                    placeholder="ex: incolore, brun, vert pâle…"
                    className="w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30 placeholder:text-white/20"
                />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-0.5">
                <span className={labelCls}>Notes</span>
                <textarea
                    value={ann.notes}
                    onChange={(e) => update({notes: e.target.value})}
                    placeholder="Observations complémentaires…"
                    rows={2}
                    className="w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground resize-none focus:outline-none focus:border-white/30 placeholder:text-white/20"
                />
            </div>
        </div>
    );
};
