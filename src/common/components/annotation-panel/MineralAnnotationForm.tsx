import React from "react";
import {useAtom} from "jotai";
import {masksAtom, type MineralAnnotation} from "@/app/atom.ts";
import useMineralList from "@/common/components/annotation-panel/useMineralList.ts";
import {t} from "@/i18n/index.ts";

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
    {label: () => t("hypothesis1"), sublabel: () => t("mostProbable")},
    {label: () => t("hypothesis2"), sublabel: () => ""},
    {label: () => t("hypothesis3"), sublabel: () => t("leastProbable")},
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
        setMasks((prev) =>
            prev.map((m) => {
                if (m.id !== maskId) return m;
                const annotation = {...(m.annotation ?? EMPTY_ANNOTATION), mineralIds: next};
                // First hypothesis always names the mask
                if (index === 0 && value) {
                    const name = minerals.find((mi) => mi.id === value)?.name;
                    if (name) return {...m, annotation, label: name};
                }
                return {...m, annotation};
            }),
        );
    }

    const allFilled = ann.mineralIds.every((id) => id !== null);
    const selectCls = "w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30";
    const labelCls = "text-[10px] text-white/40 uppercase tracking-wide";

    const mineralOptions = (
        <>
            <option value="">{t("selectMineral")}</option>
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
                {t("mineralAnnotation")}
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
                            <span className="text-[10px] text-white/30">{h.label()}{h.sublabel() ? ` — ${h.sublabel()}` : ""}</span>
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
                    <p className="text-[10px] text-yellow-500/70 px-1">{t("hypothesesRequired")}</p>
                ) : null}
            </div>

            {/* Optical properties */}
            <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("relief")}</span>
                    <select value={ann.relief ?? ""} onChange={(e) => update({relief: (e.target.value as MineralAnnotation["relief"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="faible">{t("reliefLow")}</option>
                        <option value="moyen">{t("reliefMedium")}</option>
                        <option value="élevé">{t("reliefHigh")}</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("birefringence")}</span>
                    <select value={ann.birefringence ?? ""} onChange={(e) => update({birefringence: (e.target.value as MineralAnnotation["birefringence"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="faible">{t("birefLow")}</option>
                        <option value="moyen">{t("birefMedium")}</option>
                        <option value="élevé">{t("birefHigh")}</option>
                        <option value="très élevé">{t("birefVeryHigh")}</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("cleavage")}</span>
                    <select value={ann.cleavage ?? ""} onChange={(e) => update({cleavage: (e.target.value as MineralAnnotation["cleavage"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="aucun">{t("cleavageNone")}</option>
                        <option value="indistinct">{t("cleavageIndistinct")}</option>
                        <option value="bon">{t("cleavageGood")}</option>
                        <option value="parfait">{t("cleavagePerfect")}</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("pleochroism")}</span>
                    <select value={ann.pleochroism ?? ""} onChange={(e) => update({pleochroism: (e.target.value as MineralAnnotation["pleochroism"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="aucun">{t("pleochNone")}</option>
                        <option value="faible">{t("pleochWeak")}</option>
                        <option value="fort">{t("pleochStrong")}</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("crystalSystem")}</span>
                    <select value={ann.crystalSystem ?? ""} onChange={(e) => update({crystalSystem: (e.target.value as MineralAnnotation["crystalSystem"]) || null})} className={selectCls}>
                        <option value="">—</option>
                        <option value="cubique">{t("cubic")}</option>
                        <option value="tétragonal">{t("tetragonal")}</option>
                        <option value="orthorhombique">{t("orthorhombic")}</option>
                        <option value="monoclinique">{t("monoclinic")}</option>
                        <option value="triclinique">{t("triclinic")}</option>
                        <option value="hexagonal">{t("hexagonal")}</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("extinction")}</span>
                    <input
                        type="text"
                        value={ann.extinctionAngle}
                        onChange={(e) => update({extinctionAngle: e.target.value})}
                        placeholder={t("extinctionPlaceholder")}
                        className="w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30 placeholder:text-white/20"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-0.5">
                <span className={labelCls}>{t("observedColor")}</span>
                <input
                    type="text"
                    value={ann.observedColor}
                    onChange={(e) => update({observedColor: e.target.value})}
                    placeholder={t("observedColorPlaceholder")}
                    className="w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30 placeholder:text-white/20"
                />
            </div>

            <div className="flex flex-col gap-0.5">
                <span className={labelCls}>{t("notes")}</span>
                <textarea
                    value={ann.notes}
                    onChange={(e) => update({notes: e.target.value})}
                    placeholder={t("notesPlaceholder")}
                    rows={2}
                    className="w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground resize-none focus:outline-none focus:border-white/30 placeholder:text-white/20"
                />
            </div>
        </div>
    );
};
