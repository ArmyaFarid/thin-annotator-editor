# ThinAnnotator: product dossier for motion design

Prepared 2026-10-01 from the `motion-design` branch of the frontend (commit `d273053`), the companion
backend at `../backend/app_test_compile/`, and a live run of both on macOS (Apple Silicon, MPS).
Every claim cites a file, a screenshot in `assets/`, or a link. "UNVERIFIED" means I could not confirm
it. "UNKNOWN" means no source exists that I could find.

**How the app was run for this report.** Backend: `sam2` conda env, SAM 2.1 `base_plus` on MPS, with a
scratch `HOME` so your real `~/.thinAnnotatorData` database was not touched. Frontend: `yarn dev`.
Browser: headless Chrome via Playwright, 1920×1080 CSS px at device scale 2. Two workarounds sit
outside the repo (details in section 10): stubs for 8 scipy extensions that macOS 27 refuses to load,
and a scripted folder picker that replaces the native macOS "choose folder" dialog.

---

## 1. Product identity

| Item | Value | Source |
|---|---|---|
| Official name | **ThinAnnotator** | `README.md:1`, home screen title (`assets/01-home.png`), `src/i18n/index.ts` `appTitle` |
| One-line description | "A web tool for annotating **thin-section petrology images** — the polarized-light micrographs geologists use to identify minerals in rock samples." | `README.md:3-4` |
| Browser tab title | "Lame minces annotator" (French, differs from the product name) | `index.html:7` |
| Version | No product version. `package.json` says `0.0.0`. The saved task file stamps format `"version": "1.0.0"`; the frontend task DTO is `TASK_FORMAT_VERSION = 1`; the Thin-COCO dataset `info.version` is `"1.0"`. | `package.json:4`, `backend/core/task_manager.py`, `src/lib/services/api/task/dto.ts`, `backend/dataset_manager/coco_extractor.py` |
| License | Backend folder: Apache-2.0 `LICENSE` + `NOTICE`. Frontend repo: **no LICENSE file**; README says one should be added. Many frontend files carry Meta's Apache-2.0 header. | `backend/app_test_compile/LICENSE`, `NOTICE`; `README.md:224-228` |
| Credits | NOTICE: "Based on SAM 2 (Segment Anything Model 2) by Meta Platforms, Inc." and "Modifications and additions: Copyright (c) 2025 Armya BAKOUAN." README: "Developed for petrology research at UQAC." SLIC from scikit-image. | `NOTICE`, `README.md:221-233` |
| Credits shown inside the app | **None.** No credits, logos, lab name, supervisor, or funding appear on any screen. | All screens in `assets/` |
| Partner / funding logos | None in the repo. | — |
| Target users | Petrologists annotating mineral grains (implied by mineral list, optical-property form, and the profile levels "Expert / Mid-expert / Trainee / Outside the domain" with hint "Established command of petrography"). ML use is implied by the COCO-style export and the "Generate Thin-COCO dataset" builder. | `src/i18n/index.ts` (profile levels), `launcher.py` |
| Core problem (project's words) | "Drawing mineral grain boundaries by hand is slow and tedious. ThinAnnotator lets you click a grain and have Meta's Segment Anything 2 outline it for you, then correct the result with familiar drawing tools and record what the mineral actually is." | `README.md:6-9` |
| Status (project's words) | "research software, used in an active petrology workflow. Expect rough edges." | `README.md:11` |
| Platform | Browser UI (React) + local Python service on `127.0.0.1:7263`. Packaged as a desktop app with PyInstaller (`ThinAnnotator.app`, `--windowed`) whose Tk "ThinAnnotator Control Panel" starts the server and opens the browser. | `launcher.py`, `ThinAnnotator.spec`, `run.txt` |
| Local-first / cloud | Local. Images are read from local folders, annotations are written next to the images, SQLite DB in `~/.thinAnnotatorData/`. No cloud service in the code. | `main.py`, `system/filesystem.py`, `core/task_manager.py` |
| OS support | macOS and Windows build commands exist (`run.txt`); folder picker has macOS, Windows, and Linux branches. Only macOS was run for this report. | `run.txt`, `system/pickers.py` |
| Offline | Runs without internet once installed: model checkpoints load from `checkpoints/`, no remote calls in the code. UNVERIFIED by a network-off test. | `inference/predictor_images.py` |

## 2. Tech stack & architecture

**Frontend** (`package.json`): React 18 + TypeScript, Vite 5, Tailwind CSS 3 with DaisyUI, StyleX
(inherited layout), Jotai for state, Relay for GraphQL, TanStack Query + axios for REST, sonner toasts,
Radix tooltip, `@heroicons/react`. Routing: `react-router-dom` (`/` and `/annotate/:pairsCode/:sampleId`).

**Rendering engine**: plain **Canvas 2D**, no WebGL, no OpenSeadragon/Konva/Fabric/Pixi. Two
viewport-sized canvases (committed annotations + live drawing/overlays) on top of a CSS-transformed
`<img>`; vector strokes re-rasterized every frame at screen resolution. `src/canvas/CanvasEngine.ts`,
`src/canvas/layers/DataLayer.ts`, `src/canvas/layers/DynamicLayer.ts`, `CLAUDE.md` "Canvas architecture".

**Backend** (`backend/app_test_compile/`): Python, Flask 3 + Strawberry GraphQL (`/graphql`) + REST
blueprints, served by waitress (8 threads). SQLite through Flask-SQLAlchemy (`thinAnnotator.db`, tables
`fov_asset`, `batch`, `task`). It also serves the built frontend from `frontend_payload/`.

**AI / ML**

| Item | Value | Source |
|---|---|---|
| Model | Meta **SAM 2.1** (Hiera backbone), image predictor `SAM2ImagePredictor` | `inference/predictor_images.py` |
| Default size | `base_plus` (env `MODEL_SIZE`; `tiny`, `small`, `large` also mapped) | `app_conf.py`, `predictor_images.py` |
| Checkpoint sizes on disk | tiny 149 MB · small 176 MB · base_plus 309 MB · large 856 MB | `du` on `../checkpoints/` |
| Framework | PyTorch 2.11 | `requirements.txt` |
| Where inference runs | Local server: CUDA if present (bfloat16 autocast), else Apple MPS, else CPU (`SAM2_DEMO_FORCE_CPU_DEVICE=1` forces CPU) | `predictor_images.py` |
| Prompting | Positive/negative points and one box; `multimask_output=True`, the app keeps the **middle** of SAM's three masks | `predictor_images.py` `add_points_image` |
| Embedding cache | Image embedding computed once per image, saved as `.pt` under `~/.thinAnnotatorData/sam-preprocessed/` | `_ensure_embeddings` |
| Superpixels | scikit-image `slic`, `compactness=20`, `n_segments = clamp(20·sqrt(area/1000), 10, 300)` inside the user's box | `predictor_images.py` `__slicOnImage` |
| Training scripts / own model | **None.** No training, fine-tuning, or custom model in either repo. | — |

Measured on this machine (MPS, base_plus): first SAM click on a new image **11.1 s** (includes the
one-time embedding); following clicks **0.73–1.71 s** round trip. Server start-up time was not timed precisely.

**Images**

- Accepted: `.jpg .jpeg .png .tif .tiff .bmp` (`data/loader_image.py`, home screen text). The batch
  scanner also lists `.webp .exr .tga .dpx` (`core/thin_section_fov_folder_scanner.py`) — the two lists
  disagree.
- The server converts each image to lossless PNG for the browser and caches it (24 h TTL, 2 GB cap);
  multi-frame files and modes with no lossless PNG form are refused with HTTP 415
  (`preprocessing/pngconverter.py`, `system/disk_caching/`).
- Maximum size: **no limit in code; UNVERIFIED in practice.** The whole image loads into one `<img>`;
  no tiling or pyramid. Largest image seen in your local DB: 4835×3644 px. Test images: 2448×2048 BMP.
- Multi-image support: one **task** = one field-of-view (FOV) folder holding several acquisitions of
  the same view. File names carry `mod` (PPL, XPL, RL, FL, TR), `comp` (`add` = +λ, `sous` = −λ, `na`),
  and `rot` (stage angle). The toolbar shows one pill per modality, compensator, and rotation; switching
  keeps the annotations in place (`FilterGammaToolbarPanel.tsx`; `assets/16-*.png`).

**Architecture in text**

```
Local folder (FOV images)                       ~/.thinAnnotatorData/ (SQLite, SAM embeddings)
        │ scanned by                                        ▲
        ▼                                                   │
Python service :7263 ── Flask REST /api/task/*, /api/batch/*, /api/annotations/save, /api/annotation-options
        │            ── GraphQL /graphql: addPointsImage (SAM 2.1), computeSlicImage (SLIC)
        │            ── /image/<id>: lossless PNG, disk cache
        ▼
Browser (React) ── Jotai state (masks, prompts, tools) ── Canvas 2D engine (draw, edit, hit-test)
        │  autosave draft → localStorage every 800 ms
        ▼
Writes next to the images: <user>_task.json (editable draft), <image>_annotator-<user>.thinannotation (export)
        ▼
Launcher "Generate Thin-COCO dataset" → dataset_<timestamp>/annotations.json + images/ (+ optional .zip)
```

## 3. Feature inventory

Status key: **Stable** = works in the live run. **Flag** = behind a setting. **Partial** = present with a
limitation. **Absent** = not in the code.

### Project and dataset management

| UI name | What it does | Trigger | Files | Status |
|---|---|---|---|---|
| Create a project | Disabled card, badge "Coming soon" | Home | `pages/home/home-page.tsx` | Absent (placeholder) |
| Create a batch of tasks | Scans a root folder recursively; each FOV folder becomes one task; task order is shuffled | Home → "Choose a root folder" | `home-page.tsx`, `backend/routes/api/batch.py`, `core/batch.py` | Stable (`assets/02-home-with-batch.png`) |
| Your batches | Lists batches with root path and task count; "Start" resumes at the current task | Home | `home-page.tsx` | Stable |
| Batch navigation | "Previous" / "Next", position `1 / 2`, badge "already annotated". Next exports every lighting variant, marks the task done, and jumps to the next unannotated task | Top bar in editor | `pages/annotator/useBatchNavigation.ts`, `batch.py` | Stable (`assets/02b-batch-task-open.png`) |
| Open one task | Picks one FOV folder and opens it | Home → "Choose a folder" | `home-page.tsx`, `routes/api/task.py` | Stable; native picker not captured |
| Expected layout / Prepare your task folder | Collapsible help with folder tree and file-name anatomy diagrams | Home | `pages/home/import-instructions.tsx` | Stable (`assets/02-home-batch-and-import-instructions-fullpage.png`) |
| Annotator profile | Full name, username, level (4 levels). Sent as `X-Annotator` header; files are saved per username | First launch; badge top-right | `annotator-profile/*`, `backend/core/annotator.py` | Stable (`assets/00b-annotator-profile.png`) |
| Save draft | Writes `<username>_task.json` beside the images | Panel footer | `lib/services/api/task/*` | Stable (`assets/13a-save-draft-toast.png`) |
| Autosave + "Draft found" | Local draft every 800 ms; on reopen offers Restore / Discard with object count | Automatic | `app/useAutosaveDraft.ts`, `restore-draft/RestoreDraftBanner.tsx` | Stable (`assets/17-restore-draft-prompt.png`) |
| Finish / Open a new task | Dialog "Save and leave" / "Leave without saving" | Top bar | `AnnotatorPage.tsx` | Stable (`assets/18-finish-task-dialog.png`) |
| Inactivity prompt "Still there?" | After 4 min idle (8 min with an object open) beeps, flashes the tab title, then saves and closes after a 2 min grace | Automatic | `idle-prompt/*`, `telemetry/subscriptions.ts` | Flag: needs telemetry on. Not triggered in this run |

### Image viewing

| UI name | What it does | Trigger | Files | Status |
|---|---|---|---|---|
| Zoom | Wheel (×1.12 per notch), toolbar Zoom in/out, `+`/`−`; range 5 %–2000 % | Wheel, `=`, `-` | `canvas/CanvasStack.tsx` (`zoomAt`) | Stable (`assets/04-deep-zoom-on-grains.png`) |
| Pan | Grab tool or middle mouse | `G`, middle button | `CanvasStack.tsx` | Stable |
| Minimap | Thumbnail bottom-left | `M` | `canvas/Minimap.tsx` | Stable |
| Cursor position HUD | Pixel coordinates top-left; turns red outside the image | `H` | `canvas-theme.ts` `cursorHud` | Stable |
| Zoom locked / Zoom reset | Keep zoom and pan when switching images | Button bottom-right of canvas | `zoom-preference/ZoomPreferenceToggle.tsx` | Stable |
| Modality / compensator / rotation switch | Pills PPL, XPL, γ1, γ-1, γ0, rotation; badges top-right of canvas; annotations stay | Toolbar pills | `annotator-toolbar/FilterGammaToolbarPanel.tsx` | Stable (`assets/16-*.png`, `16b-*.png`) |
| Rotation, brightness/contrast, channels, side-by-side | — | — | — | Absent |

### Annotation tools

| UI name | What it does | Trigger | Files | Status |
|---|---|---|---|---|
| Pointer (no tool) | Click without drawing | `V` | `AppConfig.tsx` `TOOLS` | Stable |
| Add point / Remove point (SAM tools) | SAM positive / negative point; first click creates an object, more clicks refine it | `S` / `X` | `ImageEditor.tsx`, `tools/KeypointTool.ts` | Stable (`assets/06`, `07`, `07b`) |
| Bounding box (SAM tools) | Box prompt to SAM | `B` | `tools/BoundingBoxTool.ts` | Stable (`assets/06b`, `07c`) |
| Polygon lasso | Click vertices, close on the first vertex (15 px snap); `Backspace` removes last vertex | `P` | `tools/PolygonLassoTool.ts` | Stable (`assets/05`, `05b`) |
| Freeform draw | Freehand stroke filled as a region | `F` | `tools/FreeformDrawTool.ts` | Stable in code; not filmed |
| Fill / Erase | Toggles whether strokes add material or cut holes | Panel, edit mode | `MaskEditTools.tsx` | Stable (`assets/08a`) |
| Superpixels (SLIC) | Drag a box; a review window shows superpixels; click to drop ones; Apply adds/removes them from the active object or creates a new one | `L` | `tools/SlicBboxTool.ts`, `slic/SlicOverlay.tsx` | Stable (`assets/16d-slic-superpixel-review.png`) |
| Refine | Modal brush/eraser on the mask, brush 5–100 px, own undo/redo, Borders view | Panel "Refine" | `refine/RefineOverlay.tsx` | Stable (`assets/08-refinement-overlay.png`) |
| Show anchors | Converts the outline into draggable vertices; per-layer delete handles | Panel "Show anchors" | `MaskEditTools.tsx`, `canvas/ObjectEditor.ts` | Partial: simplifies the outline (known lossy, memory note) |
| Delete object | Trash button, `Delete`, or `Backspace` | Panel / keys | `AnnotationPanel.tsx`, `CanvasStack.tsx` | Stable |
| Merge / split objects, magic wand, grain-boundary tool | — | — | — | Absent |

### Labels and classes

| UI name | What it does | Files | Status |
|---|---|---|---|
| Mineral annotation: 1st / 2nd / 3rd hypothesis | Three ranked mineral choices, grouped by mineral family; all three required before **Save**; the 1st hypothesis renames the object | `MineralAnnotationForm.tsx` | Stable (`assets/09-mineral-annotation-form.png`) |
| Mineral list | 24 minerals in 9 groups from the backend (22 in the bundled fallback; backend adds Pyrite, Pyrochlore). Overridable at runtime from `~/.thinAnnotatorData/annotation-options.json` | `backend/data/annotation_options.py`, `src/data/annotation-options.json` | Stable |
| Optical properties | Relief, Birefringence, Cleavage, Pleochroism, Crystal system, Extinction (°), Observed colour, Notes | `MineralAnnotationForm.tsx` | Stable |
| Colors per class | **Absent.** Colors are per object, generated by index (golden-angle hue), not by mineral | `canvas/color.ts` | — |
| Confidence scores | Absent (ranking of three hypotheses is the only uncertainty signal) | — | — |

### AI assistance

Interactive SAM 2.1 point/box segmentation and SLIC superpixels: present. Auto-segment-everything,
suggestions, active learning, retraining loop: **absent**.

### Quality control

| Feature | Status | Source |
|---|---|---|
| Undo / redo | Stable. Snapshot history, 50 steps, labelled tooltips ("Undo : SAM result"). Modal-scoped stacks in SLIC and Refine | `app/history.ts`, `Toolbar.tsx` |
| Per-annotator files | Stable. Each username gets its own `*_task.json` and `*_annotator-<user>.thinannotation`; expertise level saved in the export | `backend/core/task_manager.py`, `routes/api/annotation.py` |
| Annotation timing | Flag (`VITE_TELEMETRY=on` or `localStorage.telemetry="on"`). Per-object and per-task time, event counts, written into `task.json` | `src/telemetry/*`, `assets/exports/sample-task.json` |
| Review/approve, validation rules, inter-annotator comparison, versioning | Absent | — |

### Measurements and analytics

**Absent.** No grain size, area, perimeter, orientation, modal composition, statistics panel, or chart
in the UI. The only measurement is in the offline dataset builder, which computes COCO `area` (pixels)
and `bbox` per annotation with pycocotools (`coco_extractor.py`).

### Export / import

| Format | Content | Trigger | Source | Status |
|---|---|---|---|---|
| `.thinannotation` (COCO-flavoured JSON, one file per image) | `metadata` (modality, gamma, rotation), license, image, `annotations[]` with RLE `segmentation`, `mineralIds`, optical properties, `annotator_profile` | Panel "Export annotation (current image)", or batch "Next" (all variants) | `lib/services/api/annotations/*`, `routes/api/annotation.py` | Stable (`assets/exports/sample-export.thinannotation.json`) |
| `task.json` | Editable layers, colors, mineral data, timing | "Save draft" | `task/*` | Stable |
| Thin-COCO dataset | `annotations.json` (COCO `info/licenses/categories/images/annotations`, `category_id` = 1st hypothesis, `iscrowd: 1`, `area`, `bbox`) + `images/` + `build.log`; folder or `.zip` | Launcher window → "Generate Thin-COCO dataset" | `launcher.py`, `dataset_manager/coco_extractor.py` | Stable when run directly (`assets/exports/sample-thin-coco-annotations.json`); launcher window not captured |
| YOLO, Pascal VOC, PNG masks, GeoJSON, CSV | — | — | — | Absent |
| Import of external annotations | Absent (only re-opening the app's own `task.json`) | — | — | — |

### Collaboration

No accounts, roles, sync, or server-side sharing. Several annotators can work on the same folder
because files are split by username (see Quality control). No conflict handling.

### Settings and localization

| UI name | Content | Source | Status |
|---|---|---|---|
| Language choice (first launch) | "Choose your language" / "Choisissez votre langue" | `language-choice/LanguageChoiceModal.tsx` | Stable (`assets/00a`) |
| Customization | Language (Français / English), Toolbar layout (Separators / Groups / Flyout menus), Mask display (Fill / Borders) | `customize/CustomizeModal.tsx` | Stable (`assets/15`, `15b`) |
| Borders-only toggle | Toolbar button | `Toolbar.tsx` | Stable (`assets/10b`) |
| Themes | Dark only | `App.scss` | — |
| SAM 2 endpoint settings | Small gear on the right edge of every screen (tooltip "Bugnub"), inherited from the SAM 2 demo | `src/settings/`, `layouts/RootLayout.tsx` | Developer leftover |

## 4. Keyboard shortcuts & power-user features

Source: `src/canvas/shortcuts.ts`, `src/canvas/CanvasStack.tsx:180-265`; in-app panel `assets/16c-keyboard-shortcuts-panel.png`.

| Key | Action |
|---|---|
| `V` | Pointer (no tool) |
| `S` | SAM positive point |
| `X` | SAM negative point |
| `B` | SAM bounding box |
| `P` | Polygon lasso |
| `F` | Freeform draw |
| `L` | SLIC superpixels |
| `G` | Pan |
| `=` (shown as `+`) / `-` | Zoom in / out tool |
| `M` | Show / hide minimap |
| `H` | Show / hide cursor position |
| `?` | Show / hide shortcut panel |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Shift+Z`, `Ctrl+Y` | Redo |
| `Esc` | Cancel the drawing in progress |
| `Backspace` | Remove last polygon vertex; if not drawing, delete the selected object |
| `Delete` | Delete the selected object |

Mouse: wheel zooms around the cursor; middle button pans; in SLIC review, click removes a superpixel,
wheel zooms, middle click pans. Advanced/hidden: `localStorage.telemetry = "on"` enables timing on one
machine; `MODEL_SIZE` and `SAM2_DEMO_FORCE_CPU_DEVICE` env vars on the server; editable
`annotation-options.json` in `~/.thinAnnotatorData/`; three toolbar layouts.

## 5. End-to-end workflows

Times are from the scripted run (no human hesitation) plus my estimate for a real user, marked "est.".

### Workflow A — First launch → open a thin-section folder

1. Start "ThinAnnotator" (desktop build) → click **Start Server**, then **Open Annotator**. Result: browser opens `127.0.0.1:7263`. Model loading time UNVERIFIED (launcher allows up to 180 s). *(Control panel not captured.)*
2. Click **English** (or **Français**). Result: "Who is annotating?" dialog. (`assets/00a`)
3. Type **Full name** and **Username**, choose **Level of expertise**, click **Start**. Result: home screen. Est. 20 s. (`assets/00b`, `01`)
4. Optional: expand **Prepare your task folder** to check the naming rule `<prefix>_mod-<MOD>_comp-<COMP>_rot-<deg>.<ext>`.
5. Click **Choose a folder** under **Open one task** and select the FOV folder. Result: editor opens; the PPL image appears in 1.2 s. (`assets/03-image-imported.png`)
   - Alternative: **Choose a root folder** → batch listed with task count → **Start**. (`assets/02`, `02b`)

There is no "create project" step; "Create a project" is marked Coming soon.
**Wow moment:** none strong; the folder-anatomy diagram is the most visual element.

### Workflow B — Manual annotation of grains

1. Press `P` (Polygon lasso). Click around a grain. Result: amber vertices and preview. (`assets/05`)
2. Click the first vertex. Result: new object, panel switches to edit mode. (`assets/05b`)
3. Choose **1st, 2nd, 3rd hypothesis** minerals. Result: object renamed after the 1st choice; **Save** enables. (`assets/09`)
4. Optional: fill Relief, Birefringence, Cleavage, Pleochroism, Crystal system, Extinction, Observed colour, Notes.
5. Click **Save**. Result: object listed as e.g. "Biotite / Biotite › Chlorite › Hornblende". Est. 30–60 s per grain.
6. To cut a hole: select the object, click **Erase**, draw with `P` or `F`.

**Wow moment:** the three ranked hypotheses — the record is a petrographer's judgement, not a single label.

### Workflow C — AI-assisted segmentation → review → correct → accept

1. Press `S`. Click inside a grain. Result: SAM outline appears (0.7–1.7 s; first click on a new image 11 s). (`assets/06` → `07`)
2. If SAM took only part of the grain, click again in the missing part (`S`) or outside it (`X`). Result: outline updates. (`assets/07b`)
3. Or press `B` and drag a box around the grain. Result: whole-crystal outline. (`assets/06b` → `07c`)
4. Click **Refine** to brush or erase pixels; click **Apply**. (`assets/08`)
5. Or press `L`, drag a box, click superpixels to drop, click **Apply (N)**. (`assets/16d`)
6. Choose the three hypotheses, click **Save**. Result: object committed. Est. 15–30 s per grain.
7. Press `XPL` in the toolbar to check the grain under crossed polars; outlines stay. (`assets/16`)

**Wow moment:** one box drag → the full crystal outline (`06b` → `07c`), then the same outlines staying locked while the view flips PPL → XPL (`10` → `16`).

### Workflow D — Measurements and statistics

**Does not exist.** No measurement or statistics UI. Do not film.

### Workflow E — Export

1. With objects saved, click **Save draft**. Result: toast "Draft saved". (`assets/13a`)
2. Click **Export annotation (current image)**. Result: toast "Annotation exported"; file `<image>_annotator-<username>.thinannotation` beside the image. (`assets/13`, `assets/exports/`)
3. In a batch, click **Next**. Result: all lighting variants exported, next task opens.
4. In the launcher, click **Generate Thin-COCO dataset**, choose **Source Folder** and **Destination Folder**, optionally tick "Compress as .zip archive", click **Generate**. Result: `dataset_<timestamp>/annotations.json`, `images/`, `build.log`. *(Window not captured; builder run directly.)*

There is no export dialog in the web UI; export is one button.
**Wow moment:** decoded masks from the export laid over the image (`assets/14b`) — derived image, not an app screen.

### Other workflows

- **Resume:** reopen a task → "Draft found — 6 annotations" → **Restore**. (`assets/17`)
- **Customize:** gear → language, toolbar layout, mask display. (`assets/15`, `15b`)

## 6. What makes it different

### Thin-section-specific capabilities (code evidence)

| Capability | Evidence |
|---|---|
| One annotation shared across lighting modalities (PPL, XPL, RL, FL, TR), compensator (+λ/−λ/none), and stage rotation of one field of view | `FilterGammaToolbarPanel.tsx`; `fov_file_parser.py`; `useExportAllImages` exports the same masks per variant |
| File-name convention that encodes modality, compensator, rotation; folder = thin section / FOV | `thin_section_fov_folder_scanner.py`, `import-instructions.tsx` |
| Mineral vocabulary with 24 minerals in 9 silicate/non-silicate groups, FR + EN | `backend/data/annotation_options.py` |
| Three ranked mineral hypotheses per grain | `MineralAnnotationForm.tsx` |
| Optical-property fields used in petrography | `MineralAnnotationForm.tsx` |
| Annotator expertise level stored with each export | `annotator-profile/*`, `routes/api/annotation.py` |
| SLIC overlay contour color picked per pixel from luminance so it stays visible on bright PPL and dark XPL | `canvas-theme.ts` `slic` |
| Inactivity prompt designed for users looking into a microscope (sound + title flash) | `idle-prompt/useAttention.ts` comment |

Absent: grain-boundary logic, petrographic measurements, extinction-angle tools, modal composition.

### Comparison table

Only ThinAnnotator cells come from this repo. Other cells are from the linked official pages; I did
not install or test the other tools. "Plugin" means available through an official or listed plugin.

| Capability | ThinAnnotator | CVAT | Label Studio | LabelMe | Roboflow Annotate | QuPath | napari | ImageJ/Fiji | JMicroVision |
|---|---|---|---|---|---|---|---|---|---|
| SAM-based click/box segmentation | Yes (SAM 2.1) | Yes [1] | Yes, via ML backend [2] | Yes [3] | Yes [4] | Unknown | Plugin [5] | Plugin (SAMJ) [6] | Unknown |
| SLIC superpixels | Yes | Unknown | Unknown | Unknown | Unknown | Yes [7] | Unknown | Unknown | Unknown |
| Classic petrographic segmentation (threshold, k-means, watershed) | No | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Yes [8] |
| Point counting | No | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Yes [8] |
| Object measurements (size, shape, orientation) | No | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Yes [8] |
| COCO-style export | Partial (COCO-flavoured per image + Thin-COCO builder) | Unknown | Unknown | Unknown | Yes [4] | Unknown | Unknown | Unknown | Unknown |
| One annotation linked to PPL/XPL/compensator/rotation variants | Yes | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown |
| Mineral list + optical-property form built in | Yes | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown |
| Open source | Backend Apache-2.0; frontend no LICENSE file | Yes [9] | Yes [10] | Yes [3] | Unknown | Unknown | Unknown | Unknown | Unknown |

Sources: [1] [CVAT AI tools](https://www.cvat.ai/academy/auto-annotation-tools), [CVAT SAM blog](https://www.cvat.ai/blog/facebook-segment-anything-model-in-cvat) ·
[2] [Label Studio SAM tutorial](https://labelstud.io/guide/ml_tutorials/segment_anything_model), [SAM 2 tutorial](https://labelstud.io/guide/ml_tutorials/segment_anything_2_image) ·
[3] [wkentaro/labelme](https://github.com/wkentaro/labelme) ·
[4] [Roboflow: How to use SAM](https://blog.roboflow.com/how-to-use-segment-anything-model-sam/), [Roboflow formats](https://roboflow.com/formats) ·
[5] [napari-segment-anything](https://github.com/royerlab/napari-segment-anything) ·
[6] [SAMJ for ImageJ/Fiji](https://github.com/segment-anything-models-java/SAMJ-IJ), [paper](https://arxiv.org/abs/2506.02783) ·
[7] [QuPath superpixels](https://qupath.readthedocs.io/en/stable/docs/tutorials/superpixels.html) ·
[8] [JMicroVision brochure](https://jmicrovision.github.io/help/brochure_v1.2.pdf), [user guide](https://jmicrovision.github.io/help/UserGuide.pdf) ·
[9] [cvat-ai/cvat](https://github.com/cvat-ai/cvat) · [10] [label-studio-ml-backend](https://github.com/HumanSignal/label-studio-ml-backend).
Many "Unknown" cells are probably answerable from each tool's docs; I did not check them. Do not claim
"only tool that…" on screen without filling them.

No other petrography-specific annotation tool was verified for this report.

### Strongest provable differentiators

1. Annotations are drawn once and stay aligned across PPL, XPL, compensator, and rotation images of the same field of view (`FilterGammaToolbarPanel.tsx`, `assets/10` vs `16`).
2. Each grain records three ranked mineral hypotheses plus petrographic optical properties, not a single class label (`MineralAnnotationForm.tsx`).
3. SAM 2.1 point/box prompts and SLIC superpixels sit in one editor with brush refinement, polygon, freeform, and hole cutting (`ToolManager.ts`, `RefineOverlay.tsx`, `SlicOverlay.tsx`).
4. Runs locally on a laptop (MPS/CUDA/CPU) with files written next to the images and a one-click Thin-COCO dataset builder (`predictor_images.py`, `coco_extractor.py`).
5. Annotator identity and expertise level travel with each export (`routes/api/annotation.py`).

### Measured results

**None exist.** No IoU, Dice, time-saved figures, dataset sizes, or user tests in either repo. The timing
module collects per-object times but no aggregated results were found. The only numbers I have are this
run's latencies (section 2), which are a single-machine observation, not a benchmark.

## 7. Visual design system

Full values in `design-tokens.json`. Summary:

| Token | Value | Where |
|---|---|---|
| App background | `#2B2B2B` | `RootLayout.tsx` |
| Panel / toolbar / canvas frame | `#3A3A3A` | `tailwind.config.js` `secondary` |
| Modal | `#1C1C1C`, scrim `rgba(0,0,0,0.6)` + blur | modals |
| Borders | white at 10 / 15 / 20 % | Tailwind `border-white/*` |
| Text | white 100 / 90 / 60 / 40 / 35 % | — |
| Tool icon / disabled | `#B8B8B8` / `#5A5A5A` | `Toolbar.tsx` |
| Hover | `#2F2F2F` | `Toolbar.tsx` |
| Accent (active tool, Refine, Apply) | `#4FC3F7` | `Toolbar.tsx`, `canvas-theme.ts` |
| Primary buttons | blue-500 at 20 % bg, blue-400 `#60A5FA` text | `home-page.tsx` |
| Modality / gamma / rotation chips | blue `#60A5FA` / emerald `#34D399` / amber `#FBBF24` | `FilterGammaSelector.tsx` |
| Error / success / warning | `#F87171` / `#34D399` / `#FBBF24` | Tailwind |
| SAM + point / − point | `#22C55E` / `#EF4444` | `canvas-theme.ts` |
| Polygon preview / freeform | `#F59E0B` / `#F97316` | `canvas-theme.ts` |
| Mask fill alpha / stroke | 0.10 / 2.5 px, active mask white glow | `canvas-theme.ts` |
| Object colors | per object, golden-angle hue: `#EA4747 #11A03B #A647EA #A08E11 #47CFEA #A0115F #70EA47 #1711A0` | `canvas/color.ts` |

- **Mineral color palette:** none. Colors identify objects, not classes.
- **Themes:** dark only.
- **Typography:** Inter is declared but **does not load** (wrong file name, see section 10); screens render in the system sans-serif. Sizes: app title 20 px semibold, card title 14 px semibold, body 12 px, labels 10–11 px uppercase. Monospace for task id and paths.
- **Shape:** radius 8 px buttons/cards, 6 px panels, 12 px toolbar rail and modals; `shadow-2xl` on modals.
- **Icons:** Heroicons v2 outline + custom SVGs in `src/assets/icons/`.
- **Layout (1920×1080):** top bar; left tool rail 48 px; canvas flex; right panel 288 px; 8 px gaps. Overlays: chips top-right, HUD top-left, minimap bottom-left, "Zoom locked" bottom-right.
- **Logo / app icon:** none exist.

## 8. Content & sample data

| Item | Location | Public use |
|---|---|---|
| Test thin-section images `GDX-22-PI_*` and `GDX-23-PI_*` (2448×2048 BMP, PPL/XPL/+λ/−λ) used for every screenshot | `backend/app_test_compile/test/testdata/` | **UNKNOWN.** No source, author, or license recorded. Confirm with the lab before any public video. |
| `NW22A-8-C-5_mod-RL_comp-na_rot-0.png`, overlay and annotation JSON for GDX-23 | same folder | UNKNOWN |
| Your local data in `~/UQAC/RESEARCH/ThinAnnotatorData/` (PI-99-3, NW22A-8, …) | not used | UNKNOWN |
| Bundled demo images inside the app | None | — |
| Sample exports from this run | `assets/exports/` | Contain the test image file names; mineral labels are **demo values chosen by me**, not expert IDs |

UI copy worth quoting (exact, English UI; French exists for all):

- "How would you like to start?"
- "Pick a root folder. Every task inside it is gathered into one batch, which you annotate one after another."
- "Who is annotating?" / "This travels with every annotation. No password required."
- "All 3 hypotheses are required before saving."
- "1st hypothesis — most probable" … "3rd hypothesis — least probable"
- "Kept superpixels will form a new mask."
- "Save and export this task, then move on to the next one"
- "Still there?" / "No activity for a while. Without a response the task will be saved and closed."
- "Draft found" / "Unsaved annotations were found. Do you want to restore them or discard them?"
- Empty states: "No annotations", "No batches yet. Create one to annotate several tasks in a row."

## 9. Asset capture checklist

All files are in `assets/`, 3840×2160 PNG (1920×1080 CSS px at 2×) unless noted. Details and
public-use status in `assets/assets-manifest.md`.

| # | Requested | File(s) | Status |
|---|---|---|---|
| 01 | Launch/home | `01-home.png` (+ `00a`, `00b` onboarding) | Captured |
| 02 | Empty project | `01-home.png` (no batches), `02-home-with-batch.png` | Substitute: projects don't exist |
| 03 | Image imported | `03-image-imported.png` | Captured |
| 04 | Deep zoom | `04-deep-zoom-on-grains.png`, `04b` | Captured |
| 05 | Manual polygon in progress | `05-manual-polygon-in-progress.png`, `05b` | Captured |
| 06→07 | AI before → after | `06`, `07`, `07b`; box prompt `06b` → `07c` | Captured |
| 08 | Correction/refinement | `08-refinement-overlay.png`, `08a` | Captured |
| 09 | Class/label panel | `09-mineral-annotation-form.png` | Captured; no color palette exists |
| 10 | Fully annotated, overlay on | `10-fully-annotated-fill.png`, `10b` borders only | Captured |
| 11 | Overlay off | Use `03-image-imported.png` (same framing as `10`) | No hide-all toggle exists |
| 12 | Measurements/statistics | — | **Not possible: feature absent** |
| 13 | Export dialog | `13-export-annotation-toast.png`, `13a` | No dialog exists; toast captured |
| 14 | Exported result | `14a-exported-masks-decoded.png`, `14b-exported-masks-over-image.png` (2448×2048, rendered by me from the export), `exports/*.json` | Derived assets |
| 15 | Settings | `15-customize-settings.png`, `15b` | Captured |
| 16 | Unique features | `16` XPL, `16b` +λ, `16c` shortcuts, `16d` SLIC | Captured |
| extra | Draft restore, finish | `17`, `18` | Captured |
| video | Workflows B, C, D at 60 fps | — | **Not recorded** (section 10) |

## 10. Gaps & honesty log

**Could not verify**
- Native folder picker (`osascript` "choose folder") — replaced by a scripted path in a scratch wrapper; the real dialog is not filmed.
- The Tk launcher window ("ThinAnnotator Control Panel", "Generate Thin-COCO dataset") — not screenshotted; the dataset builder was called directly from Python.
- The packaged `ThinAnnotator.app` — not launched.
- Windows/Linux, offline mode, very large images, the inactivity prompt end-to-end.
- Every "Unknown" in the comparison table.

**Environment problems met (not app bugs, but they will hit a fresh demo machine)**
- On this macOS (Darwin 27) the `sam2` conda env's scipy cannot load 8 Fortran extensions (`__DATA/__thread_bss` dlopen error), so the backend crashes on `import skimage.segmentation`. I stubbed those modules in a scratch wrapper; SLIC never calls them. A clean fix is a rebuilt scipy for this OS.
- Playwright video needs its own ffmpeg and records ~25 fps; no 60 fps clips were produced. Record the workflows with OBS/ScreenFlow on a real 1920×1080 window.

**Things that will show on camera**
- Inter font never loads: `App.scss` points at `/fonts/Inter-VariableFont.ttf`, the file is `Inter-VariableFont_opsz,wght.ttf`. Everything renders in the system font.
- A small white square on the right edge of every screen — the inherited SAM 2 settings button (tooltip "Bugnub"), `layouts/RootLayout.tsx`.
- New objects get French default names: "Lame 1" (SAM, `ImageEditor.tsx`) and "Dessin N" (polygon/freeform, `CanvasStack.tsx`), even in the English UI.
- Color swatches in the object list are almost invisible (they use the 10 % fill alpha).
- SAM keeps the middle of its three masks, so a single click can return a sub-region of a grain (see `07`); a box or a second click fixes it.
- Undo tooltip format "Undo : SAM result" has a French-style space before the colon.
- Browser tab title is "Lame minces annotator"; no favicon.

**Data/format issues**
- Export `metadata.rotation` is hard-coded to `45` regardless of the image (`annotations/mappers.ts`).
- Export license is hard-coded "Attribution-NonCommercial" (CC BY-NC 2.0).
- Mineral lists disagree: backend serves 24 (incl. Pyrite, Pyrochlore), bundled frontend fallback has 22, dataset builder maps 22 — Pyrite/Pyrochlore grains get `category_id: null` in Thin-COCO.
- Dataset builder flags orphan images only for `.bmp`; accepted extensions differ between the single-task loader and the batch scanner.
- SLIC review hint says "max 100 superpixels", but the backend allows up to 300 and the run produced 217.
- Show anchors simplifies outlines and saves the loss (known).

**Half-built / absent**: Create a project (Coming soon), measurements, statistics, other export formats, review/approval, per-mineral colors, logo.

**Assumptions**: mineral names on the demo grains are mine and not geologically checked; time estimates marked "est." are mine; telemetry was on during the run because the local `.env` sets `VITE_TELEMETRY=on` (`.env.example` says off).

## 11. Raw facts for the film writer

- Click a grain; SAM 2.1 outlines it. — `inference/predictor_images.py`
- Prompt with positive points, negative points, or a box. — `ImageEditor.tsx`, `assets/06b`
- Under 2 s per click after the first, on a MacBook (MPS). — this run, section 2
- Runs on your own machine: CUDA, Apple MPS, or CPU. — `predictor_images.py`
- SLIC superpixels for grains with fuzzy edges. — `README.md`, `assets/16d`
- Brush, eraser, polygon, freeform, and hole cutting to correct any outline. — `MaskEditTools.tsx`, `RefineOverlay.tsx`
- Switch PPL ↔ XPL; your outlines stay in place. — `FilterGammaToolbarPanel.tsx`, `assets/16`
- Handles +λ and −λ compensator images and stage rotations. — `fov_file_parser.py`, `assets/16b`
- Three ranked mineral hypotheses per grain. — `MineralAnnotationForm.tsx`
- 24 minerals in 9 groups, editable without code. — `backend/data/annotation_options.py`, `README.md`
- Records relief, birefringence, cleavage, pleochroism, crystal system, extinction angle. — `MineralAnnotationForm.tsx`
- Every export carries the annotator's name and expertise level. — `routes/api/annotation.py`
- Batches: point at a folder, annotate every field of view in turn. — `home-page.tsx`, `assets/02`
- Autosaves a draft as you work. — `useAutosaveDraft.ts`, `assets/17`
- 50-step undo and redo. — `app/history.ts`
- Exports RLE masks in a COCO-style JSON. — `annotations/mappers.ts`
- One click builds a COCO training dataset (folder or .zip). — `launcher.py`, `coco_extractor.py`
- French and English interface. — `src/i18n/index.ts`
- Zoom from 5 % to 2000 % with a minimap. — `CanvasStack.tsx`, `Minimap.tsx`
- Every shortcut on one key; press ? to see them. — `shortcuts.ts`, `assets/16c`
- Built on Meta's Segment Anything 2, Apache-2.0. — `NOTICE`
- Developed for petrology research at UQAC. — `README.md:233`
