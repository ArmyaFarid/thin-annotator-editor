export type Lang = "fr" | "en";

export const LANGS: readonly Lang[] = ["fr", "en"];

const LANG_STORAGE_KEY = "lang";

function readStoredLang(): Lang {
    try {
        const v = localStorage.getItem(LANG_STORAGE_KEY);
        return v === "fr" || v === "en" ? v : "en";
    } catch {
        return "en";
    }
}

// The active language. Mutable, so switching it at runtime is picked up by
// every `t()` call made during the next render — which is why translated
// strings must be resolved at render time, never captured in a module-scope
// constant. Definitions that need a label should carry a TranslationKey and
// resolve it in the component (see tool-groups.ts, shortcuts.ts).
let currentLang: Lang = readStoredLang();

export function getLang(): Lang {
    return currentLang;
}

export function setLang(lang: Lang): void {
    currentLang = lang;
    try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
        /* ignore */
    }
}

const T = {
    fr: {
        // Home page
        appTitle: "ThinAnnotator",
        appSubtitle: "Sélectionnez un dossier de lame mince pour commencer",
        openFolder: "Ouvrir un dossier",
        picking: "Chargement...",
        importFailed: "Échec de l'import de la tâche",
        noImagesInFolder:
            "Aucune image dans ce dossier. Sélectionnez un dossier de tâche valide.",

        // Home page — the three ways to start
        homeChoose: "Comment souhaitez-vous commencer ?",
        optionProjectTitle: "Créer un projet",
        optionProjectDesc:
            "Regrouper plusieurs lots et suivre l'avancement de l'équipe.",
        comingSoon: "Bientôt disponible",
        optionBatchTitle: "Créer un lot de tâches",
        optionBatchDesc:
            "Choisissez un dossier racine. Toutes les tâches qu'il contient sont réunies en un lot, que vous annotez l'une après l'autre.",
        optionBatchAction: "Choisir un dossier racine",
        optionBatchHint:
            "À utiliser pour une campagne entière : plusieurs lames, plusieurs champs de vision.",
        optionSingleTitle: "Ouvrir une tâche",
        optionSingleDesc:
            "Choisissez un seul dossier de champ de vision et annotez-le maintenant.",
        optionSingleAction: "Choisir un dossier",
        optionSingleHint: "À utiliser pour un champ de vision isolé.",

        // Batch list + creation
        batchesHeading: "Vos lots",
        batchesEmpty:
            "Aucun lot pour l'instant. Créez-en un pour annoter plusieurs tâches à la suite.",
        batchTaskCount: "tâches",
        batchStart: "Commencer",
        batchResume: "Reprendre",
        batchCreating: "Analyse du dossier...",
        batchCreateError: "Échec de la création du lot",
        batchNoMatchingTask:
            "Aucun dossier de ce dossier racine ne correspond à la structure attendue. Vérifiez l'organisation ci-dessous.",

        // Batch navigation inside the editor
        batchPrev: "Précédente",
        batchNext: "Suivante",
        batchPrevTooltip: "Revenir à la tâche précédente du lot",
        batchNextTooltip:
            "Enregistrer et exporter cette tâche, puis passer à la suivante",
        batchMoving: "Enregistrement...",
        batchStepError:
            "Échec de l'export : vous restez sur cette tâche pour ne rien perdre.",

        // Root folder structure (batch)
        batchStructureTitle: "Organisation attendue du dossier racine",
        batchStructureBody:
            "Sélectionnez le dossier qui contient toutes vos lames. Chaque champ de vision qui respecte la structure ci-dessous devient une tâche du lot ; les autres dossiers sont ignorés.",
        batchStructureExample:
            "<racine> / <lame-mince> / <FOV> / images",
        batchStructureNote:
            "Les images doivent se trouver dans le dossier du champ de vision et suivre la règle de nommage détaillée ci-dessous.",

        // Import instructions (shown on the home page above the picker button)
        importInstructionsTitle: "Préparer le dossier de la tâche",
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
        importNamingMod:
            "mod : PPL (polarisé plan), XPL (polarisé croisé), RL (réfléchi), FL (fluorescence), TR (transmis)",
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
            "Cette tâche contient des annotations sauvegardées. Voulez-vous les restaurer ?",
        restoreYes: "Restaurer",
        restoreNo: "Ignorer",

        // Save task
        saveTask: "Enregistrer le brouillon",
        saveAnnotation: "Exporter l'annotation (image actuelle)",
        saving: "Sauvegarde...",
        saveTaskSuccess: "Brouillon enregistré",
        saveTaskError: "Échec de l'enregistrement du brouillon",
        exportAnnotationSuccess: "Annotation exportée",
        exportAnnotationError: "Échec de l'export de l'annotation",

        // Draft restore modal
        draftTitle: "Brouillon détecté",
        draftFound:
            "Des annotations non sauvegardées ont été trouvées. Souhaitez-vous les reprendre ou les ignorer ?",
        draftContinue: "Reprendre",
        draftDiscard: "Ignorer",

        // Top bar
        openNewTask: "Ouvrir une nouvelle tâche",
        loadImage: "Charger une image",
        finish: "Terminer",
        finishTitle: "Terminer la tâche",
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
        anchors: "Afficher les ancres",

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

        // Annotator profile
        profileTitle: "Qui annote ?",
        profileSubtitle:
            "Ces informations accompagnent chaque annotation. Aucun mot de passe.",
        profileEditTitle: "Modifier le profil",
        profileFullName: "Nom complet",
        profileFullNamePlaceholder: "ex : Béatrice Lefèvre",
        profileUsername: "Nom d'utilisateur",
        profileUsernamePlaceholder: "ex : blefevre",
        profileLevel: "Niveau d'expertise",
        profileRequired: "Le nom complet et le nom d'utilisateur sont requis.",
        profileStart: "Commencer",
        profileSave: "Enregistrer",
        profileBadgeTooltip: "Modifier le profil d'annotateur",
        levelExpert: "Expert",
        levelExpertHint: "Maîtrise confirmée de la pétrographie",
        levelMidExpert: "Expert intermédiaire",
        levelMidExpertHint: "Bonne expérience, encore en progression",
        levelTrainee: "En formation",
        levelTraineeHint: "Apprend le domaine",
        levelOutsideDomain: "Hors domaine",
        levelOutsideDomainHint: "Sans formation en pétrographie",

        // Tool groups + customization
        groupSam: "Outils SAM",
        groupSlic: "Superpixels SLIC",
        customize: "Personnaliser",
        language: "Langue",
        maskDisplay: "Affichage des masques",
        customizeTitle: "Personnalisation",
        toolbarLayout: "Disposition de la barre d'outils",
        layoutSeparators: "Séparateurs",
        layoutSeparatorsHint: "Une ligne fine entre les groupes",
        layoutPods: "Groupes",
        layoutPodsHint: "Chaque groupe sur son propre fond, avec son icône",
        layoutFlyout: "Menus déroulants",
        layoutFlyoutHint:
            "Une seule icône par groupe ; survolez ou cliquez pour choisir",

        // Toolbar tools
        toolIdle: "Pointeur (aucun outil)",
        toolSelectAdd: "Ajouter un point",
        toolSelectRemove: "Retirer un point",
        toolBoundingBox: "Boîte englobante",
        toolFreeformDraw: "Dessin libre",
        toolPolygonLasso: "Lasso polygone",
        toolSlicBbox: "Superpixels (SLIC)",
        toolZoomIn: "Zoom avant",
        toolZoomOut: "Zoom arrière",
        toolGrab: "Déplacer",

        // Undo / redo
        undo: "Annuler",
        redo: "Rétablir",
        undoModalActive: "Annuler (géré par la fenêtre active)",
        redoModalActive: "Rétablir (géré par la fenêtre active)",
        undoEmpty: "Aucune action à annuler",
        redoEmpty: "Aucune action à rétablir",
        undoLastActionTitle: "Annuler la dernière action (Ctrl+Z)",
        undoLastStrokeTitle: "Annuler le dernier trait (Ctrl+Z)",
        redoTitle: "Rétablir (Ctrl+Shift+Z)",

        // History action labels
        historyKeypointAdd: "Ajout de point",
        historyBboxAdd: "Ajout de boîte",
        historySlicBboxSet: "Définition zone SLIC",
        historyPolygonAdd: "Ajout de polygone",
        historyFreeformAdd: "Tracé libre",
        historyLayerDelete: "Suppression de calque",
        historyVertexMove: "Déplacement de sommet",
        historyMaskDelete: "Suppression de masque",
        historyMaskRename: "Renommage",
        historyMaskMerge: "Fusion de masque",
        historyMaskExtractContours: "Extraction de contours",
        historySamResult: "Résultat SAM",
        historySlicResult: "Résultat SLIC",

        // Border-only toggle
        showFill: "Afficher le remplissage",
        showBordersOnly: "Afficher contours seulement",
        borders: "Contours",
        fill: "Remplissage",

        // Keyboard shortcuts panel
        keyboardShortcuts: "Raccourcis clavier",
        shortcutIdleLabel: "Pointeur",
        shortcutIdleHint: "Sélectionner sans dessiner",
        shortcutSelectAddLabel: "Select +",
        shortcutSelectAddHint: "Point positif SAM",
        shortcutSelectRemoveLabel: "Select −",
        shortcutSelectRemoveHint: "Point négatif SAM",
        shortcutBboxLabel: "Bbox SAM",
        shortcutBboxHint: "Boîte englobante",
        shortcutPolygonLabel: "Polygone",
        shortcutPolygonHint: "Lasso polygonal",
        shortcutFreeformLabel: "Dessin",
        shortcutFreeformHint: "Tracé libre",
        shortcutSlicLabel: "SLIC",
        shortcutSlicHint: "Superpixels SLIC",
        shortcutGrabLabel: "Déplacer",
        shortcutGrabHint: "Panoramique (clic molette)",
        shortcutZoomInLabel: "Zoom +",
        shortcutZoomInHint: "Zoom avant",
        shortcutZoomOutLabel: "Zoom −",
        shortcutZoomOutHint: "Zoom arrière",
        shortcutMinimapLabel: "Minimap",
        shortcutMinimapHint: "Afficher / masquer",
        shortcutCursorLabel: "Position",
        shortcutCursorHint: "Afficher / masquer le curseur en pixels",
        shortcutUndoHint: "Annuler la dernière action",
        shortcutRedoHint: "Rétablir l'action annulée",
        shortcutHelpLabel: "Aide",
        shortcutEscapeLabel: "Annuler",
        shortcutEscapeHint: "Annuler le dessin en cours",
        shortcutBackspaceLabel: "Défaire",
        shortcutBackspaceHint: "Dernier point (polygone) / supprimer",
        shortcutDeleteLabel: "Sup.",
        shortcutDeleteHint: "Supprimer l'objet sélectionné",

        // Annotation panel tooltips
        deleteRegion: "Supprimer cette région",
        saveTaskTooltip:
            "Sauvegarde le travail en cours pour le reprendre plus tard",
        exportAnnotationTooltip:
            "Exporte l'annotation finale de l'image actuelle au format COCO",
        addModeTooltip:
            "Mode ajout : les tracés deviennent des zones de la région",
        subtractModeTooltip:
            "Mode soustraction : les tracés creusent des trous dans la région",
        refineTooltip: "Ouvrir l'outil de raffinement (gomme/pinceau)",
        hideAnchorsTooltip: "Masquer les ancres (fusionner les sommets en masque)",
        showAnchorsTooltip: "Afficher les sommets éditables (points d'ancrage)",
        openNewTaskTooltip: "Quitter cette tâche pour en ouvrir une autre",
        finishTooltip: "Terminer la session (avec option de sauvegarde)",

        // Mask list (legacy panel)
        mineralNamePlaceholder: "Nom du minerai",
        anchorsOn: "Ancres",
        anchorsOff: "Pas d'ancres",
        addObject: "Ajouter un objet",

        // Task toasts
        taskSaved: "Tâche sauvegardée",
        taskSaveError: "Échec de la sauvegarde",
        unknownError: "Erreur inconnue",

        // Canvas
        slicAreaTooLarge: "Zone SLIC trop grande",
        slicAreaTooLargeHint: "Réduisez la sélection (max 100 superpixels).",

        // Image editor loading
        slicComputing: "Calcul SLIC...",
        processing: "Traitement...",
        loadingImage: "Chargement de l'image...",

        // SLIC overlay
        slicPreparing: "Préparation des superpixels...",
        slicTitle: "Superpixels SLIC",
        slicKept: "conservés",
        slicAddToMask: "Ajouter au masque",
        slicRemoveFromMask: "Retirer du masque",
        slicAddToMaskTooltip:
            "Les superpixels conservés seront ajoutés au masque actif",
        slicRemoveFromMaskTooltip:
            "Les superpixels conservés seront retirés du masque actif",
        slicHintNewMask: "Les superpixels conservés formeront un nouveau masque.",
        slicHintAddPrefix: "Ajout : les superpixels conservés seront",
        slicHintAddEmphasis: "dessinés",
        slicHintAddSuffix: "dans le masque actif.",
        slicHintRemovePrefix: "Retrait : les superpixels conservés seront",
        slicHintRemoveEmphasis: "effacés",
        slicHintRemoveSuffix: "du masque actif.",
        slicFooterHint:
            "Cliquer pour supprimer un superpixel · Molette: zoom · Clic molette: déplacer",

        // Refine overlay
        refineTitle: "Raffinement",
        refineEraser: "Gomme",
        refineAdd: "Ajouter",
        brushLabel: "Pinceau:",
        zoomLabel: "Zoom:",
        refineFooterHint: "Molette: zoom · Clic molette: déplacer",

        // Shared actions
        reset: "Réinitialiser",
        cancel: "Annuler",
        apply: "Appliquer",

        // Errors and loading
        errorConnection:
            "Veuillez vérifier votre connexion puis réessayer ou signaler l'erreur.",
        retry: "Réessayer",
        reportError: "Signaler l'erreur",
        report: "Signaler",
        close: "Fermer",
        fetchingData: "Chargement des données",
        loadingTitle: "Chargement de la démo...",
        loadingDescription:
            "Cela peut prendre quelques instants, vous y êtes presque !",
        pageNotFoundTitle: "Page introuvable",
        pageNotFoundDescription: "Il semble que vous soyez au mauvais endroit.",
        pageNotFoundLink: "Cliquer ici pour accéder à la démo SAM 2",
        unsupportedDeviceTitle: "Voilà qui est embarrassant...",
        unsupportedDeviceDescription:
            "Cette application n'est pas optimisée pour votre appareil. Réessayez depuis un appareil doté d'un écran plus grand.",
        backToHomepage: "Retour à l'accueil",
    },
    en: {
        // Home page
        appTitle: "ThinAnnotator",
        appSubtitle: "Select a thin section folder to begin",
        openFolder: "Open folder",
        picking: "Loading...",
        importFailed: "Failed to import task",
        noImagesInFolder:
            "No image in this folder. Please select a valid task folder.",

        // Home page — the three ways to start
        homeChoose: "How would you like to start?",
        optionProjectTitle: "Create a project",
        optionProjectDesc:
            "Group several batches together and follow the team's progress.",
        comingSoon: "Coming soon",
        optionBatchTitle: "Create a batch of tasks",
        optionBatchDesc:
            "Pick a root folder. Every task inside it is gathered into one batch, which you annotate one after another.",
        optionBatchAction: "Choose a root folder",
        optionBatchHint:
            "Use this for a whole campaign: several thin sections, several fields of view.",
        optionSingleTitle: "Open one task",
        optionSingleDesc:
            "Pick a single field-of-view folder and annotate it now.",
        optionSingleAction: "Choose a folder",
        optionSingleHint: "Use this for a one-off field of view.",

        // Batch list + creation
        batchesHeading: "Your batches",
        batchesEmpty:
            "No batches yet. Create one to annotate several tasks in a row.",
        batchTaskCount: "tasks",
        batchStart: "Start",
        batchResume: "Resume",
        batchCreating: "Scanning the folder...",
        batchCreateError: "Could not create the batch",
        batchNoMatchingTask:
            "No folder inside that root matches the expected structure. Check the layout below.",

        // Batch navigation inside the editor
        batchPrev: "Previous",
        batchNext: "Next",
        batchPrevTooltip: "Go back to the previous task in the batch",
        batchNextTooltip:
            "Save and export this task, then move on to the next one",
        batchMoving: "Saving...",
        batchStepError:
            "Export failed — you stay on this task so nothing is lost.",

        // Root folder structure (batch)
        batchStructureTitle: "Expected layout of the root folder",
        batchStructureBody:
            "Select the folder that holds all your thin sections. Every field of view following the layout below becomes one task in the batch; any other folder is ignored.",
        batchStructureExample: "<root> / <thin-section> / <FOV> / images",
        batchStructureNote:
            "Images must sit inside the field-of-view folder and follow the naming rule detailed below.",

        // Import instructions (shown on the home page above the picker button)
        importInstructionsTitle: "Prepare your task folder",
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
        importNamingMod:
            "mod : PPL (plane polarized), XPL (cross polarized), RL (reflected), FL (fluorescence), TR (transmitted)",
        importNamingComp: "comp: add (+λ), sous (−λ) or na (no compensator)",
        importNamingRot: "rot: rotation angle in degrees (integer)",
        importNamingPrefix: "prefix: free text (not used by the import)",
        importTipHeading: "Tip",
        importTipBody:
            "Keep the same rotation value across all images of a single FOV folder.",

        // Restore annotations modal
        restoreTitle: "Saved annotations found",
        restoreFound:
            "This task has saved annotations. Do you want to restore them?",
        restoreYes: "Restore",
        restoreNo: "Ignore",

        // Save task
        saveTask: "Save draft",
        saveAnnotation: "Export annotation (current image)",
        saving: "Saving...",
        saveTaskSuccess: "Draft saved",
        saveTaskError: "Failed to save draft",
        exportAnnotationSuccess: "Annotation exported",
        exportAnnotationError: "Failed to export annotation",

        // Draft restore modal
        draftTitle: "Draft found",
        draftFound:
            "Unsaved annotations were found. Do you want to restore them or discard them?",
        draftContinue: "Restore",
        draftDiscard: "Discard",

        // Top bar
        openNewTask: "Open a new task",
        loadImage: "Load image",
        finish: "Finish",
        finishTitle: "Finish task",
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
        anchors: "Show anchors",

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

        // Annotator profile
        profileTitle: "Who is annotating?",
        profileSubtitle:
            "This travels with every annotation. No password required.",
        profileEditTitle: "Edit profile",
        profileFullName: "Full name",
        profileFullNamePlaceholder: "e.g. Béatrice Lefèvre",
        profileUsername: "Username",
        profileUsernamePlaceholder: "e.g. blefevre",
        profileLevel: "Level of expertise",
        profileRequired: "Full name and username are both required.",
        profileStart: "Start",
        profileSave: "Save",
        profileBadgeTooltip: "Edit annotator profile",
        levelExpert: "Expert",
        levelExpertHint: "Established command of petrography",
        levelMidExpert: "Mid-expert",
        levelMidExpertHint: "Solid experience, still developing",
        levelTrainee: "Trainee",
        levelTraineeHint: "Learning the domain",
        levelOutsideDomain: "Outside the domain",
        levelOutsideDomainHint: "No petrography background",

        // Tool groups + customization
        groupSam: "SAM tools",
        groupSlic: "SLIC superpixels",
        customize: "Customize",
        language: "Language",
        maskDisplay: "Mask display",
        customizeTitle: "Customization",
        toolbarLayout: "Toolbar layout",
        layoutSeparators: "Separators",
        layoutSeparatorsHint: "A thin line between groups",
        layoutPods: "Groups",
        layoutPodsHint: "Each group on its own panel, with its icon",
        layoutFlyout: "Flyout menus",
        layoutFlyoutHint:
            "One icon per group; hover or click to pick a tool",

        // Toolbar tools
        toolIdle: "Pointer (no tool)",
        toolSelectAdd: "Add point",
        toolSelectRemove: "Remove point",
        toolBoundingBox: "Bounding box",
        toolFreeformDraw: "Freeform draw",
        toolPolygonLasso: "Polygon lasso",
        toolSlicBbox: "Superpixels (SLIC)",
        toolZoomIn: "Zoom in",
        toolZoomOut: "Zoom out",
        toolGrab: "Pan",

        // Undo / redo
        undo: "Undo",
        redo: "Redo",
        undoModalActive: "Undo (handled by the active window)",
        redoModalActive: "Redo (handled by the active window)",
        undoEmpty: "Nothing to undo",
        redoEmpty: "Nothing to redo",
        undoLastActionTitle: "Undo the last action (Ctrl+Z)",
        undoLastStrokeTitle: "Undo the last stroke (Ctrl+Z)",
        redoTitle: "Redo (Ctrl+Shift+Z)",

        // History action labels
        historyKeypointAdd: "Point added",
        historyBboxAdd: "Box added",
        historySlicBboxSet: "SLIC area set",
        historyPolygonAdd: "Polygon added",
        historyFreeformAdd: "Freeform stroke",
        historyLayerDelete: "Layer deleted",
        historyVertexMove: "Vertex moved",
        historyMaskDelete: "Mask deleted",
        historyMaskRename: "Renamed",
        historyMaskMerge: "Mask merged",
        historyMaskExtractContours: "Contours extracted",
        historySamResult: "SAM result",
        historySlicResult: "SLIC result",

        // Border-only toggle
        showFill: "Show fill",
        showBordersOnly: "Show borders only",
        borders: "Borders",
        fill: "Fill",

        // Keyboard shortcuts panel
        keyboardShortcuts: "Keyboard shortcuts",
        shortcutIdleLabel: "Pointer",
        shortcutIdleHint: "Select without drawing",
        shortcutSelectAddLabel: "Select +",
        shortcutSelectAddHint: "SAM positive point",
        shortcutSelectRemoveLabel: "Select −",
        shortcutSelectRemoveHint: "SAM negative point",
        shortcutBboxLabel: "SAM bbox",
        shortcutBboxHint: "Bounding box",
        shortcutPolygonLabel: "Polygon",
        shortcutPolygonHint: "Polygon lasso",
        shortcutFreeformLabel: "Draw",
        shortcutFreeformHint: "Freeform stroke",
        shortcutSlicLabel: "SLIC",
        shortcutSlicHint: "SLIC superpixels",
        shortcutGrabLabel: "Pan",
        shortcutGrabHint: "Pan (middle click)",
        shortcutZoomInLabel: "Zoom +",
        shortcutZoomInHint: "Zoom in",
        shortcutZoomOutLabel: "Zoom −",
        shortcutZoomOutHint: "Zoom out",
        shortcutMinimapLabel: "Minimap",
        shortcutMinimapHint: "Show / hide",
        shortcutCursorLabel: "Position",
        shortcutCursorHint: "Show / hide the cursor position in pixels",
        shortcutUndoHint: "Undo the last action",
        shortcutRedoHint: "Redo the undone action",
        shortcutHelpLabel: "Help",
        shortcutEscapeLabel: "Cancel",
        shortcutEscapeHint: "Cancel the current drawing",
        shortcutBackspaceLabel: "Undo last",
        shortcutBackspaceHint: "Last vertex (polygon) / delete",
        shortcutDeleteLabel: "Del.",
        shortcutDeleteHint: "Delete the selected object",

        // Annotation panel tooltips
        deleteRegion: "Delete this region",
        saveTaskTooltip: "Save the work in progress to resume it later",
        exportAnnotationTooltip:
            "Export the final annotation of the current image in COCO format",
        addModeTooltip: "Add mode: strokes become areas of the region",
        subtractModeTooltip:
            "Subtract mode: strokes cut holes in the region",
        refineTooltip: "Open the refine tool (eraser/brush)",
        hideAnchorsTooltip: "Hide the anchors (merge the vertices into a mask)",
        showAnchorsTooltip: "Show the editable vertices (anchor points)",
        openNewTaskTooltip: "Leave this task to open another one",
        finishTooltip: "Finish the session (with a save option)",

        // Mask list (legacy panel)
        mineralNamePlaceholder: "Mineral name",
        anchorsOn: "Anchors",
        anchorsOff: "No anchors",
        addObject: "Add object",

        // Task toasts
        taskSaved: "Task saved",
        taskSaveError: "Failed to save",
        unknownError: "Unknown error",

        // Canvas
        slicAreaTooLarge: "SLIC area too large",
        slicAreaTooLargeHint: "Reduce the selection (max 100 superpixels).",

        // Image editor loading
        slicComputing: "Computing SLIC...",
        processing: "Processing...",
        loadingImage: "Loading image...",

        // SLIC overlay
        slicPreparing: "Preparing superpixels...",
        slicTitle: "SLIC superpixels",
        slicKept: "kept",
        slicAddToMask: "Add to mask",
        slicRemoveFromMask: "Remove from mask",
        slicAddToMaskTooltip: "Kept superpixels will be added to the active mask",
        slicRemoveFromMaskTooltip:
            "Kept superpixels will be removed from the active mask",
        slicHintNewMask: "Kept superpixels will form a new mask.",
        slicHintAddPrefix: "Add: kept superpixels will be",
        slicHintAddEmphasis: "drawn",
        slicHintAddSuffix: "into the active mask.",
        slicHintRemovePrefix: "Remove: kept superpixels will be",
        slicHintRemoveEmphasis: "erased",
        slicHintRemoveSuffix: "from the active mask.",
        slicFooterHint:
            "Click to remove a superpixel · Wheel: zoom · Middle click: pan",

        // Refine overlay
        refineTitle: "Refinement",
        refineEraser: "Eraser",
        refineAdd: "Add",
        brushLabel: "Brush:",
        zoomLabel: "Zoom:",
        refineFooterHint: "Wheel: zoom · Middle click: pan",

        // Shared actions
        reset: "Reset",
        cancel: "Cancel",
        apply: "Apply",

        // Errors and loading
        errorConnection:
            "Please check your connection and retry or report error.",
        retry: "Retry",
        reportError: "Report Error",
        report: "Report",
        close: "Close",
        fetchingData: "Fetching data",
        loadingTitle: "Loading demo...",
        loadingDescription:
            "This may take a few moments, you're almost there!",
        pageNotFoundTitle: "Page not found",
        pageNotFoundDescription: "It looks like you might be in the wrong place.",
        pageNotFoundLink: "Click here to access the SAM 2 Demo",
        unsupportedDeviceTitle: "Well, this is embarrassing...",
        unsupportedDeviceDescription:
            "This app is not optimized for your device. Please try again on a different device with a larger screen.",
        backToHomepage: "Back to homepage",
    },
} as const;

export type TranslationKey = keyof typeof T.fr;

export function t(key: TranslationKey): string {
    return T[currentLang][key];
}
