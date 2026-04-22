// MOCK — replace with real GraphQL query when backend mineral list is available

export interface Mineral {
    id: string;
    name: string;
    group: string;
}

const MINERALS: Mineral[] = [
    {id: "qtz",  name: "Quartz",         group: "Tectosilicates"},
    {id: "kfs",  name: "Feldspath K",    group: "Tectosilicates"},
    {id: "plag", name: "Plagioclase",    group: "Tectosilicates"},
    {id: "ms",   name: "Muscovite",      group: "Phyllosilicates"},
    {id: "bt",   name: "Biotite",        group: "Phyllosilicates"},
    {id: "chl",  name: "Chlorite",       group: "Phyllosilicates"},
    {id: "srp",  name: "Serpentine",     group: "Phyllosilicates"},
    {id: "hbl",  name: "Hornblende",     group: "Inosilicates"},
    {id: "aug",  name: "Augite",         group: "Inosilicates"},
    {id: "hyp",  name: "Hypersthène",    group: "Inosilicates"},
    {id: "ol",   name: "Olivine",        group: "Nesosilicates"},
    {id: "grt",  name: "Grenat",         group: "Nesosilicates"},
    {id: "zrn",  name: "Zircon",         group: "Nesosilicates"},
    {id: "tur",  name: "Tourmaline",     group: "Cyclosilicates"},
    {id: "ep",   name: "Épidote",        group: "Sorosilicates"},
    {id: "cal",  name: "Calcite",        group: "Carbonates"},
    {id: "dol",  name: "Dolomite",       group: "Carbonates"},
    {id: "mag",  name: "Magnétite",      group: "Oxydes"},
    {id: "ilm",  name: "Ilménite",       group: "Oxydes"},
    {id: "hem",  name: "Hématite",       group: "Oxydes"},
    {id: "ap",   name: "Apatite",        group: "Phosphates"},
    {id: "ttn",  name: "Titanite",       group: "Sorosilicates"},
];

export default function useMineralList(): Mineral[] {
    return MINERALS;
}
