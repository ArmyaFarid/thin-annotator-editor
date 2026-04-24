// Change this to switch the UI language
export const LANG: "fr" | "en" = "fr";

const T = {
    fr: {
        // Draft restore modal
        draftTitle: "Brouillon détecté",
        draftFound: "Des annotations non sauvegardées ont été trouvées. Souhaitez-vous les reprendre ou les ignorer ?",
        draftContinue: "Reprendre",
        draftDiscard: "Ignorer",

        // Top bar
        home: "Accueil",
        loadImage: "Charger une image",
        finish: "Terminer",

        // Annotation panel
        annotationPanel: "Panneau d'annotation",
        startSession: "Commencer la session",
        regionName: "Nom de la région",
        samPoints: "Points SAM",
        save: "Enregistrer",
        noAnnotation: "Aucune annotation",
        unnamed: "Sans nom",
        addRegion: "+ Ajouter une région",
        exportJson: "Exporter JSON",

        // Mask edit tools
        add: "+ Ajout",
        subtract: "− Soustraction",
        freeform: "Forme libre",
        polygon: "Polygone",
        refine: "Raffiner",
        anchors: "Ancres",
        normal: "Normal",

        // Mineral annotation form
        mineralAnnotation: "Annotation minéralogique",
        hypothesis1: "1re hypothèse",
        hypothesis2: "2e hypothèse",
        hypothesis3: "3e hypothèse",
        mostProbable: "la plus probable",
        leastProbable: "la moins probable",
        selectMineral: "— sélectionner —",
        hypothesesRequired: "Les 3 hypothèses sont requises avant d'enregistrer.",
        relief: "Relief",
        birefringence: "Biréfringence",
        cleavage: "Clivage",
        pleochroism: "Pléochroïsme",
        crystalSystem: "Système cristallin",
        extinction: "Extinction (°)",
        extinctionPlaceholder: "ex: 25",
        observedColor: "Couleur observée",
        observedColorPlaceholder: "ex: incolore, brun, vert pâle…",
        notes: "Notes",
        notesPlaceholder: "Observations complémentaires…",

        // Relief options
        reliefLow: "Faible",
        reliefMedium: "Moyen",
        reliefHigh: "Élevé",

        // Birefringence options
        birefLow: "Faible",
        birefMedium: "Moyen",
        birefHigh: "Élevé",
        birefVeryHigh: "Très élevé",

        // Cleavage options
        cleavageNone: "Aucun",
        cleavageIndistinct: "Indistinct",
        cleavageGood: "Bon",
        cleavagePerfect: "Parfait",

        // Pleochroism options
        pleochNone: "Aucun",
        pleochWeak: "Faible",
        pleochStrong: "Fort",

        // Crystal system options
        cubic: "Cubique",
        tetragonal: "Tétragonal",
        orthorhombic: "Orthorhombique",
        monoclinic: "Monoclinique",
        triclinic: "Triclinique",
        hexagonal: "Hexagonal",

        // Zoom preference toggle
        zoomLocked: "Zoom verrouillé",
        zoomReset: "Zoom réinitialisé",
        zoomLockedTitle: "Zoom préservé lors du changement d'image (cliquer pour désactiver)",
        zoomResetTitle: "Zoom réinitialisé lors du changement d'image (cliquer pour activer la préservation)",
    },
    en: {
        // Draft restore modal
        draftTitle: "Draft found",
        draftFound: "Unsaved annotations were found. Do you want to restore them or discard them?",
        draftContinue: "Restore",
        draftDiscard: "Discard",

        // Top bar
        home: "Home",
        loadImage: "Load image",
        finish: "Finish",

        // Annotation panel
        annotationPanel: "Annotation panel",
        startSession: "Start session",
        regionName: "Region name",
        samPoints: "SAM points",
        save: "Save",
        noAnnotation: "No annotations",
        unnamed: "Unnamed",
        addRegion: "+ Add region",
        exportJson: "Export JSON",

        // Mask edit tools
        add: "+ Add",
        subtract: "− Subtract",
        freeform: "Freeform",
        polygon: "Polygon",
        refine: "Refine",
        anchors: "Anchors",
        normal: "Normal",

        // Mineral annotation form
        mineralAnnotation: "Mineral annotation",
        hypothesis1: "1st hypothesis",
        hypothesis2: "2nd hypothesis",
        hypothesis3: "3rd hypothesis",
        mostProbable: "most probable",
        leastProbable: "least probable",
        selectMineral: "— select —",
        hypothesesRequired: "All 3 hypotheses are required before saving.",
        relief: "Relief",
        birefringence: "Birefringence",
        cleavage: "Cleavage",
        pleochroism: "Pleochroism",
        crystalSystem: "Crystal system",
        extinction: "Extinction (°)",
        extinctionPlaceholder: "e.g. 25",
        observedColor: "Observed colour",
        observedColorPlaceholder: "e.g. colourless, brown, pale green…",
        notes: "Notes",
        notesPlaceholder: "Additional observations…",

        // Relief options
        reliefLow: "Low",
        reliefMedium: "Medium",
        reliefHigh: "High",

        // Birefringence options
        birefLow: "Low",
        birefMedium: "Medium",
        birefHigh: "High",
        birefVeryHigh: "Very high",

        // Cleavage options
        cleavageNone: "None",
        cleavageIndistinct: "Indistinct",
        cleavageGood: "Good",
        cleavagePerfect: "Perfect",

        // Pleochroism options
        pleochNone: "None",
        pleochWeak: "Weak",
        pleochStrong: "Strong",

        // Crystal system options
        cubic: "Cubic",
        tetragonal: "Tetragonal",
        orthorhombic: "Orthorhombic",
        monoclinic: "Monoclinic",
        triclinic: "Triclinic",
        hexagonal: "Hexagonal",

        // Zoom preference toggle
        zoomLocked: "Zoom locked",
        zoomReset: "Zoom reset",
        zoomLockedTitle: "Zoom preserved when switching images (click to disable)",
        zoomResetTitle: "Zoom reset when switching images (click to enable preservation)",
    },
} as const;

export type TranslationKey = keyof typeof T.fr;

export function t(key: TranslationKey): string {
    return T[LANG][key];
}
