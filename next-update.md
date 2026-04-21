**Current app State is nice**

* Segment Anything Model returns masks
* Manual tools available:

    * Free-form drawing
    * Polygon annotation

---

**Planned Improvements**

### 1. Mask Refinement Mode (Explicit Activation)

Introduce a dedicated **“Refine Mask” mode** that the user must explicitly activate.

* Refinement is **not triggered by simple selection**
* The user explicitly chooses to enter refinement (via a button/tool)

👉 I suggest implementing this as a **dedicated canvas (separate editing context)** for mask refinement.
This keeps the interaction clean and avoids conflicts with other tools.

When **Refine Mode** is active:

* The user selects a mask to refine
* Only the targeted mask is visible (others hidden or dimmed)
* The user is effectively working in an isolated environment

Editing capabilities:

* Convert the mask boundary into editable control points:

    * Similar to polygon vertices
    * Points distributed along the contour
* Allow users to:

    * Move existing points
    * Add new points along the boundary
* Provide an **eraser tool**:

    * Direct pixel-level modification of the binary mask
    * Enables precise edge cleanup

---

### 2. “Hole” Tool

Introduce a new tool (name TBD: *Hole*, *Cutout*, *Subtract*):

* Allows creating holes inside:

    * Polygons
    * Masks
* Functionally subtracts a region from the current shape

---

**Important Clarification (Data Handling)**

* The goal is to generate a **final merged binary mask (RLE)** per object

* Polygons and free-form inputs:

    * **Stored locally** (local storage or in-app state) for editing
    * **Not persisted** to backend/database or file system

An **object** is a composition of:

* SAM-generated masks
* Polygon inputs
* Free-form inputs

All components are merged into a **single unified RLE mask**.

---

### 3. Export Functionality

Add an **Export** feature:

* Export operates at the **object level**
* Each object must:

    * Be merged into a single mask
    * Be encoded in **COCO RLE format**

---

**Next Step**

Please outline how you plan to implement this (architecture, state handling, and interaction flow), or propose an approach.
I’ll review it and we can iterate together to find the best solution.



