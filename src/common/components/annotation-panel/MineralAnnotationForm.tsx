import React from "react";
import {useAtom} from "jotai";
import {masksAtom, type MineralAnnotation} from "@/app/atom.ts";
import useMineralList from "@/common/components/annotation-panel/useMineralList.ts";

const EMPTY_ANNOTATION: MineralAnnotation = {
    mineralIds: [null, null, null],
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

const HYPOTHESES = [
    {label: "1re hypothèse", sublabel: "la plus probable"},
    {label: "2e hypothèse", sublabel: ""},
    {label: "3e hypothèse", sublabel: "la moins probable"},
] as const;

export const MineralAnnotationForm: React.FC<MineralAnnotationFormProps> = ({maskId}) => {
    const [masks, setMasks] = useAtom(masksAtom);
    const minerals = useMineralList();
    const groups = Array.from(new Set(minerals.map((m) => m.group)));

    const mask = masks.find((m) => m.id === maskId);
    const ann: MineralAnnotation = mask?.annotation ?? EMPTY_ANNOTATION;

    function update(patch: Partial<MineralAnnotation>) {
        setMasks((prev) =>
            prev.map((m) =>
                m.id === maskId
                    ? {...m, annotation: {...(m.annotation ?? EMPTY_ANNOTATION), ...patch}}
                    : m,
            ),
        );
    }

    function setMineralId(index: 0 | 1 | 2, value: string | null) {
        const next: [string | null, string | null, string | null] = [...ann.mineralIds] as [string | null, string | null, string | null];
        next[index] = value;
        update({mineralIds: next});
    }

    const allFilled = ann.mineralIds.every((id) => id !== null);
    const selectCls = "w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30";
    const labelCls = "text-[10px] text-white/40 uppercase tracking-wide";

    const mineralOptions = (
        <>
            <option value="">— sélectionner —</option>
            {groups.map((g) => (
                <optgroup key={g} label={g}>
                    {minerals.filter((m) => m.group === g).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </optgroup>
            ))}
        </>
    );

    return (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
            <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                Annotation minéralogique
            </span>

            {/* 3 ordered mineral hypotheses */}
            <div className="flex flex-col gap-1.5">
                {HYPOTHESES.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="flex flex-col items-center shrink-0 w-5">
                            <span className={`text-sm font-bold ${ann.mineralIds[i] ? "text-white/70" : "text-white/20"}`}>
                                {i + 1}
                            </span>
                        </div>
                        <div className="flex-1 flex flex-col gap-0.5">
                            <span className="text-[10px] text-white/30">{h.label}{h.sublabel ? ` — ${h.sublabel}` : ""}</span>
                            <select
                                value={ann.mineralIds[i] ?? ""}
                                onChange={(e) => setMineralId(i as 0 | 1 | 2, e.target.value || null)}
                                className={`${selectCls} ${!ann.mineralIds[i] ? "border-white/25 text-white/40" : ""}`}>
                                {mineralOptions}
                            </select>
                        </div>
                    </div>
                ))}
                {!allFilled ? (
                    <p className="text-[10px] text-yellow-500/70 px-1">
                        Les 3 hypothèses sont requises avant d'enregistrer.
                    </p>
                ) : null}
            </div>

            {/* Optical properties */}
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
                    <span className={labelCls}>Extinction (°)</span>
                    <input
                        type="text"
                        value={ann.extinctionAngle}
                        onChange={(e) => update({extinctionAngle: e.target.value})}
                        placeholder="ex: 25"
                        className="w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30 placeholder:text-white/20"
                    />
                </div>
            </div>

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
