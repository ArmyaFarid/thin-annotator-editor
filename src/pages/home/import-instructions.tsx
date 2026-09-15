import React from "react";
import {FolderIcon, PhotoIcon} from "@heroicons/react/24/outline";
import {t} from "@/i18n/index.ts";

type ChipTone = "pick" | "task" | "muted";

interface ChipProps {
    label: string;
    tone: ChipTone;
}

const CHIP_TONE: Record<ChipTone, string> = {
    pick: "bg-sky-500/15 text-sky-300/90 border-sky-400/20",
    task: "bg-emerald-500/15 text-emerald-300/90 border-emerald-400/20",
    muted: "bg-white/5 text-white/40 border-white/10",
};

const Chip: React.FC<ChipProps> = ({label, tone}) => (
    <span
        className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-sans leading-4 ${CHIP_TONE[tone]}`}>
        {label}
    </span>
);

interface TreeRowProps {
    glyphs: string;
    name: string;
    kind: "folder" | "image";
    dimmed?: boolean;
    note?: string;
    chip?: ChipProps;
}

const TreeRow: React.FC<TreeRowProps> = ({
    glyphs,
    name,
    kind,
    dimmed,
    note,
    chip,
}) => (
    <div className="flex items-center gap-1.5 py-px">
        <span className="whitespace-pre text-white/25">{glyphs}</span>
        {kind === "folder" ? (
            <FolderIcon
                className={`w-3.5 h-3.5 shrink-0 ${dimmed ? "text-white/25" : "text-sky-300/70"}`}
            />
        ) : (
            <PhotoIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
        )}
        <span className={dimmed ? "text-white/30" : "text-white/80"}>
            {name}
        </span>
        {chip ? <Chip label={chip.label} tone={chip.tone} /> : null}
        {note ? (
            <span className="truncate text-[10px] font-sans text-white/35">
                {note}
            </span>
        ) : null}
    </div>
);

interface FolderTreeProps {
    variant: "batch" | "single";
}

// The elbows are literal box-drawing glyphs rather than CSS borders so the
// indentation can never drift away from the icon column.
const FolderTree: React.FC<FolderTreeProps> = ({variant}) => {
    const batch = variant === "batch";
    const pad = batch ? "" : "    ";
    return (
        <div className="overflow-x-auto rounded bg-black/30 px-3 py-2 text-xs font-mono">
            <div className="min-w-max">
                {batch ? (
                    <TreeRow
                        glyphs=""
                        name="<root>/"
                        kind="folder"
                        chip={{label: t("illusPickHere"), tone: "pick"}}
                    />
                ) : null}
                {batch ? (
                    <TreeRow
                        glyphs="└ "
                        name="site-A/"
                        kind="folder"
                        note={t("illusAnyDepth")}
                    />
                ) : null}
                <TreeRow
                    glyphs={batch ? "  └ " : ""}
                    name="thin-section-01/"
                    kind="folder"
                    note={t("illusThinSection")}
                />
                <TreeRow
                    glyphs={`${pad}  ├ `}
                    name="FOV-3/"
                    kind="folder"
                    chip={
                        batch
                            ? {label: t("illusOneTask"), tone: "task"}
                            : {label: t("illusPickHere"), tone: "pick"}
                    }
                />
                <TreeRow
                    glyphs={`${pad}  │ ├ `}
                    name="sample01_mod-PPL_comp-na_rot-0.png"
                    kind="image"
                />
                <TreeRow
                    glyphs={`${pad}  │ └ `}
                    name="sample01_mod-XPL_comp-add_rot-0.png"
                    kind="image"
                />
                <TreeRow
                    glyphs={`${pad}  └ `}
                    name="notes/"
                    kind="folder"
                    dimmed
                    chip={{label: t("illusIgnored"), tone: "muted"}}
                />
            </div>
        </div>
    );
};

interface SegmentProps {
    text: string;
    caption?: string;
    accent?: boolean;
}

const Segment: React.FC<SegmentProps> = ({text, caption, accent}) => (
    <div className="flex flex-col">
        <code
            className={`whitespace-pre text-xs ${accent ? "text-emerald-300/90" : "text-white/80"}`}>
            {text}
        </code>
        {caption ? (
            <span className="mt-0.5 border-t border-white/15 pt-0.5 text-[10px] text-white/40">
                {caption}
            </span>
        ) : null}
    </div>
);

const FilenameAnatomy: React.FC = () => (
    <div className="space-y-3 rounded bg-black/30 px-3 py-2">
        <div className="flex flex-wrap gap-x-1 gap-y-2">
            <Segment text="sample01" caption={t("illusPrefix")} />
            <Segment text="_mod-XPL" caption={t("illusModality")} accent />
            <Segment text="_comp-add" caption={t("illusCompensator")} accent />
            <Segment text="_rot-45" caption={t("illusRotation")} accent />
            <Segment text=".png" caption={t("illusExtension")} />
        </div>
        <div className="space-y-1">
            <div className="flex flex-wrap gap-x-1">
                <Segment text="sample01" />
                <Segment text="_rot--45" accent />
                <Segment text="_comp-na" accent />
                <Segment text="_mod-PPL" accent />
                <Segment text="_gain-2" />
                <Segment text=".tif" />
            </div>
            <p className="text-[10px] text-white/40">{t("illusFreeOrder")}</p>
        </div>
    </div>
);

export function BatchStructure() {
    return (
        <div className="space-y-2">
            <p className="text-xs text-white/70">{t("batchStructureBody")}</p>
            <FolderTree variant="batch" />
            <p className="text-xs text-white/50">{t("batchStructureNote")}</p>
        </div>
    );
}

export function ImportInstructions() {
    return (
        <div className="space-y-4 text-sm text-white/70">
            <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t("importStructureHeading")}
                </h3>
                <p>{t("importStructureBody")}</p>
                <FolderTree variant="single" />
            </section>

            <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t("importFormatsHeading")}
                </h3>
                <p>{t("importFormatsBody")}</p>
            </section>

            <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t("importNamingHeading")}
                </h3>
                <code className="block text-xs text-white/80 bg-black/30 rounded px-2 py-1">
                    {t("importNamingPattern")}
                </code>
                <FilenameAnatomy />
                <ul className="list-disc list-inside text-xs space-y-0.5 marker:text-white/30">
                    <li>{t("importNamingMod")}</li>
                    <li>{t("importNamingComp")}</li>
                    <li>{t("importNamingRot")}</li>
                    <li>{t("importNamingPrefix")}</li>
                    <li>{t("importNamingOrder")}</li>
                </ul>
            </section>

            {/*<section className="space-y-1 pt-1 border-t border-white/10">*/}
            {/*    <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400/80">*/}
            {/*        {t("importTipHeading")}*/}
            {/*    </h3>*/}
            {/*    <p className="text-xs">{t("importTipBody")}</p>*/}
            {/*</section>*/}
        </div>
    );
}
