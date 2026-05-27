// Change this to switch the UI language
export const LANG: "fr" | "en" = "fr";

const T = {
    fr: {
        // Home page
        appTitle: "ThinAnnotator",
        appSubtitle: "Sélectionnez un dossier de lame mince pour commencer",
        openFolder: "Ouvrir un dossier",
        picking: "Chargement...",
        importFailed: "Échec de l'import du projet",
        noImagesInFolder:
            "Aucune image dans ce dossier. Sélectionnez un dossier de projet valide.",

        // Import instructions (shown on the home page above the picker button)
        importInstructionsTitle: "Préparer le dossier de projet",
        importStructureHeading: "Structure du dossier",
        importStructureBody:
            "Sélectionnez le dossier FOV (champ de vision). Son dossier parent doit être nommé d'après la lame mince.",
        importStructureExample: "<lame-mince> / <FOV> / images",
        importFormatsHeading: "Formats acceptés",
        importFormatsBody: ".jpg, .jpeg, .png, .tif, .tiff, .bmp",
        importNamingHeading: "Nom des fichiers",
        importNamingPattern: "<préfixe>_mod-<MOD>_comp-<COMP>_rot-<deg>.<ext>",
        importNamingExampleLabel: "Exemple :",
        importNamingExample: "echantillon01_mod-XPL_comp-add_rot-45.png",
        importNamingMod: "mod : XPL ou PPL",
        importNamingComp:
            "comp : add (+λ), sous (−λ) ou na (sans compensateur)",
        importNamingRot: "rot : angle de rotation en degrés (entier)",
        importNamingPrefix: "préfixe : texte libre (non utilisé par l'import)",
        importTipHeading: "Conseil",
        importTipBody:
            "Conservez la même valeur de rotation pour toutes les images d'un même dossier FOV.",

        // Restore annotations modal
        restoreTitle: "Annotations sauvegardées trouvées",
        restoreFound:
            "Ce projet contient des annotations sauvegardées. Voulez-vous les restaurer ?",
        restoreYes: "Restaurer",
        restoreNo: "Ignorer",

        // Save project
        saveProject: "Enregistrer le brouillon",
        saveAnnotation: "Exporter l'annotation (image actuelle)",
        saving: "Sauvegarde...",

        // Draft restore modal
        draftTitle: "Brouillon détecté",
        draftFound:
            "Des annotations non sauvegardées ont été trouvées. Souhaitez-vous les reprendre ou les ignorer ?",
        draftContinue: "Reprendre",
        draftDiscard: "Ignorer",

        // Top bar
        openNewProject: "Ouvrir un nouveau projet",
        loadImage: "Charger une image",
        finish: "Terminer",
        finishTitle: "Terminer le projet",
        finishConfirm:
            "Voulez-vous enregistrer les modifications avant de quitter ?",
        finishSave: "Enregistrer et quitter",
        finishDiscard: "Quitter sans enregistrer",

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
        hypothesesRequired:
            "Les 3 hypothèses sont requises avant d'enregistrer.",
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
        zoomLockedTitle:
            "Zoom préservé lors du changement d'image (cliquer pour désactiver)",
        zoomResetTitle:
            "Zoom réinitialisé lors du changement d'image (cliquer pour activer la préservation)",
    },
    en: {
        // Home page
        appTitle: "ThinAnnotator",
        appSubtitle: "Select a thin section folder to begin",
        openFolder: "Open folder",
        picking: "Loading...",
        importFailed: "Failed to import project",
        noImagesInFolder:
            "No image in this folder. Please select a valid project folder.",

        // Import instructions (shown on the home page above the picker button)
        importInstructionsTitle: "Prepare your project folder",
        importStructureHeading: "Folder structure",
        importStructureBody:
            "Select the FOV (field of view) folder. Its parent folder must be named after the thin section.",
        importStructureExample: "<thin-section> / <FOV> / images",
        importFormatsHeading: "Accepted formats",
        importFormatsBody: ".jpg, .jpeg, .png, .tif, .tiff, .bmp",
        importNamingHeading: "File naming",
        importNamingPattern: "<prefix>_mod-<MOD>_comp-<COMP>_rot-<deg>.<ext>",
        importNamingExampleLabel: "Example:",
        importNamingExample: "sample01_mod-XPL_comp-add_rot-45.png",
        importNamingMod: "mod: XPL or PPL",
        importNamingComp: "comp: add (+λ), sous (−λ) or na (no compensator)",
        importNamingRot: "rot: rotation angle in degrees (integer)",
        importNamingPrefix: "prefix: free text (not used by the import)",
        importTipHeading: "Tip",
        importTipBody:
            "Keep the same rotation value across all images of a single FOV folder.",

        // Restore annotations modal
        restoreTitle: "Saved annotations found",
        restoreFound:
            "This project has saved annotations. Do you want to restore them?",
        restoreYes: "Restore",
        restoreNo: "Ignore",

        // Save project
        saveProject: "Save draft",
        saveAnnotation: "Export annotation (current image)",
        saving: "Saving...",

        // Draft restore modal
        draftTitle: "Draft found",
        draftFound:
            "Unsaved annotations were found. Do you want to restore them or discard them?",
        draftContinue: "Restore",
        draftDiscard: "Discard",

        // Top bar
        openNewProject: "Open a new project",
        loadImage: "Load image",
        finish: "Finish",
        finishTitle: "Finish project",
        finishConfirm: "Do you want to save your changes before leaving?",
        finishSave: "Save and leave",
        finishDiscard: "Leave without saving",

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
        zoomLockedTitle:
            "Zoom preserved when switching images (click to disable)",
        zoomResetTitle:
            "Zoom reset when switching images (click to enable preservation)",
    },
} as const;

export type TranslationKey = keyof typeof T.fr;

export function t(key: TranslationKey): string {
    return T[LANG][key];
}
