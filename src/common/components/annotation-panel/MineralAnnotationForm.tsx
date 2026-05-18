import React from "react";
import {useAtom} from "jotai";
import {
    masksAtom,
    type MineralAnnotation,
    type AnnotationOption,
    type MineralOption,
} from "@/app/atom.ts";
import useAnnotationOptions from "@/common/components/annotation-panel/useAnnotationOptions.ts";
import {t, LANG} from "@/i18n/index.ts";

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

const HYPOTHESES = [
    {label: () => t("hypothesis1"), sublabel: () => t("mostProbable")},
    {label: () => t("hypothesis2"), sublabel: () => ""},
    {label: () => t("hypothesis3"), sublabel: () => t("leastProbable")},
] as const;

const selectCls =
    "w-full bg-transparent border border-white/15 rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:border-white/30";

// A stored value with no matching option still shows — as its raw value.
function isOrphan(value: string | null, options: AnnotationOption[]): boolean {
    return value != null && value !== "" && !options.some((o) => o.value === value);
}

interface PropertySelectProps {
    value: string | null;
    options: AnnotationOption[];
    onChange: (value: string | null) => void;
}

const PropertySelect: React.FC<PropertySelectProps> = ({value, options, onChange}) => (
    <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={selectCls}>
        <option value="">—</option>
        {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label[LANG]}</option>
        ))}
        {isOrphan(value, options) ? <option value={value!}>{value}</option> : null}
    </select>
);

interface MineralSelectProps {
    value: string | null;
    groups: AnnotationOption[];
    minerals: MineralOption[];
    onChange: (value: string | null) => void;
}

const MineralSelect: React.FC<MineralSelectProps> = ({value, groups, minerals, onChange}) => (
    <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`${selectCls} ${!value ? "border-white/25 text-white/40" : ""}`}>
        <option value="">{t("selectMineral")}</option>
        {groups.map((g) => (
            <optgroup key={g.value} label={g.label[LANG]}>
                {minerals
                    .filter((m) => m.group === g.value)
                    .map((m) => (
                        <option key={m.value} value={m.value}>{m.label[LANG]}</option>
                    ))}
            </optgroup>
        ))}
        {isOrphan(value, minerals) ? <option value={value!}>{value}</option> : null}
    </select>
);

interface MineralAnnotationFormProps {
    maskId: number;
}

export const MineralAnnotationForm: React.FC<MineralAnnotationFormProps> = ({maskId}) => {
    const [masks, setMasks] = useAtom(masksAtom);
    const options = useAnnotationOptions();

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
                    const name = options.minerals.find((mi) => mi.value === value)?.label[LANG];
                    if (name) return {...m, annotation, label: name};
                }
                return {...m, annotation};
            }),
        );
    }

    const allFilled = ann.mineralIds.every((id) => id !== null);
    const labelCls = "text-[10px] text-white/40 uppercase tracking-wide";

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
                            <MineralSelect
                                value={ann.mineralIds[i]}
                                groups={options.mineralGroups}
                                minerals={options.minerals}
                                onChange={(v) => setMineralId(i as 0 | 1 | 2, v)}
                            />
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
                    <PropertySelect value={ann.relief} options={options.properties.relief} onChange={(v) => update({relief: v})} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("birefringence")}</span>
                    <PropertySelect value={ann.birefringence} options={options.properties.birefringence} onChange={(v) => update({birefringence: v})} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("cleavage")}</span>
                    <PropertySelect value={ann.cleavage} options={options.properties.cleavage} onChange={(v) => update({cleavage: v})} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("pleochroism")}</span>
                    <PropertySelect value={ann.pleochroism} options={options.properties.pleochroism} onChange={(v) => update({pleochroism: v})} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>{t("crystalSystem")}</span>
                    <PropertySelect value={ann.crystalSystem} options={options.properties.crystalSystem} onChange={(v) => update({crystalSystem: v})} />
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
