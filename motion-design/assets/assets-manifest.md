# Assets manifest

Captured 2026-10-01 from a live run (frontend `yarn dev`, backend SAM 2.1 base_plus on MPS), headless
Chrome, 1920×1080 CSS px at device scale 2 → **3840×2160 PNG** unless noted.

**Public-use rule for every image below:** all screens show the test images `GDX-22-PI_*` from
`backend/app_test_compile/test/testdata/`. Their source and license are **UNKNOWN**. Treat every file as
**not cleared for public use** until the lab confirms the micrograph rights. UI chrome alone has no
third-party content. Mineral names on the grains were set by me for the demo and are not expert IDs.

Known on-screen defects in every editor screenshot: system font instead of Inter; small white square
(SAM 2 settings button) at the right edge.

| File | Shows | Public use |
|---|---|---|
| `00a-language-choice.png` | First-launch language dialog over the home screen | Yes (no micrograph) |
| `00b-annotator-profile.png` | "Who is annotating?" profile dialog, 4 expertise levels | Yes |
| `01-home.png` | Home: three start options, empty batch list | Yes |
| `02-home-with-batch.png` | Home with one batch listed (2 tasks) | Yes, but shows a long scratch `/private/tmp/...` path — blur or crop |
| `02-home-batch-and-import-instructions-fullpage.png` | Full-page home with both help sections expanded (folder trees, file-name anatomy). Taller than 2160 px | Yes, same path caveat |
| `02b-batch-task-open.png` | Editor in batch mode: Previous / `1 / 2` / Next | Image unknown |
| `03-image-imported.png` | Freshly opened task, PPL, fit to view, no annotations. Use as the "overlay off" frame for `10` | Image unknown |
| `04-deep-zoom-on-grains.png` | Deep zoom on grain edges, minimap, cursor HUD, hover highlight | Image unknown |
| `04b-deep-zoom-cursor-hud-hidden.png` | Same, HUD toggled with `H` | Image unknown |
| `05-manual-polygon-in-progress.png` | Polygon lasso with six amber vertices, not closed | Image unknown |
| `05b-manual-polygon-closed.png` | Polygon closed, new object in edit mode | Image unknown |
| `06-ai-segmentation-before.png` | Cursor over a crystal, SAM positive-point tool active, no annotations | Image unknown |
| `07-ai-segmentation-after.png` | One click → SAM outline (selected a sub-region of the crystal) | Image unknown |
| `07b-ai-segmentation-refined-second-point.png` | After a second positive point | Image unknown |
| `06b-box-prompt-drawing.png` | Dashed cyan box being dragged around the crystal | Image unknown |
| `07c-box-prompt-result.png` | Box prompt result: full crystal outline. **Best before/after pair with `06b`** | Image unknown |
| `08a-edit-mode-selected-grain.png` | Object selected: Fill/Erase, Refine, Show anchors, filled mineral form | Image unknown |
| `08-refinement-overlay.png` | Refine modal: Eraser/Add, brush 20 px, zoom, green mask | Image unknown |
| `09-mineral-annotation-form.png` | Mineral annotation form filled (3 hypotheses + optical properties) | Image unknown; demo values |
| `10-fully-annotated-fill.png` | Six annotated grains, fill mode, object list | Image unknown |
| `10b-fully-annotated-borders-only.png` | Seven grains, borders-only display | Image unknown |
| `13a-save-draft-toast.png` | "Draft saved" toast | Image unknown |
| `13-export-annotation-toast.png` | "Annotation exported" toast (no export dialog exists) | Image unknown |
| `14a-exported-masks-decoded.png` | **2448×2048.** Masks decoded from the exported `.thinannotation` RLE, flat colors on black. Rendered by me with pycocotools — not an app screen | Yes (no micrograph pixels) |
| `14b-exported-masks-over-image.png` | **2448×2048.** Same masks blended over the PPL image. Not an app screen | Image unknown |
| `15-customize-settings.png` | Customization modal: language, toolbar layout, mask display | Image unknown (blurred behind modal) |
| `15b-toolbar-layout-groups.png` | Toolbar in "Groups" layout | Image unknown |
| `16-polarization-switch-xpl.png` | Same annotations over the XPL image. **Pair with `10` for the PPL→XPL moment** | Image unknown |
| `16b-xpl-compensator-plus-lambda.png` | XPL with +λ compensator (γ1) | Image unknown |
| `16c-keyboard-shortcuts-panel.png` | Keyboard shortcuts panel | Image unknown |
| `16d-slic-superpixel-review.png` | SLIC review window, 217 superpixels | Image unknown |
| `17-restore-draft-prompt.png` | "Draft found — 6 annotations" on reopening | Image unknown |
| `18-finish-task-dialog.png` | Finish task dialog | Image unknown |

## Not captured

| Item | Reason |
|---|---|
| 12 measurements/statistics | Feature does not exist |
| Native folder picker | Replaced by a scripted path for automation |
| Launcher control panel and "Generate Thin-COCO dataset" window | Tk window outside the browser; not captured |
| 60 fps clips of workflows B, C, D | Not recorded; record manually with OBS/ScreenFlow |

## `exports/`

| File | Content | Public use |
|---|---|---|
| `sample-export.thinannotation.json` | Per-image export written by "Export annotation (current image)" | Contains test file names and a demo annotator profile |
| `sample-task.json` | Draft file written by "Save draft", including timing data | Same |
| `sample-thin-coco-annotations.json` | Output of the Thin-COCO dataset builder | Same |
| `sample-thin-coco-build.log` | Builder log; contains scratch paths | Internal only |
