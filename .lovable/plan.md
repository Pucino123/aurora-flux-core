
## Understanding the Current Architecture

**Key findings:**
- `FocusDashboardView.tsx` is the main canvas (~2271 lines). It owns: context menu, page state, `openWindow`, folder/doc rendering, all drag logic.
- `openWindow` comes from `useWindowManager()` — it takes `{ type, contentId, title, layout, position }`. It already handles routing to either a document editor or widget.
- `DesktopFolder` uses a custom pointer-based drag system (not framer-motion drag). `FolderModal` is the current folder-open UI — a standard modal portal.
- The context menu in `FocusDashboardView` already has "New Document" with a sub-picker (Text / Spreadsheet). The Template Chooser will replace/extend this picker.
- `FolderContents.tsx` renders items inside `FolderModal` using HTML drag (`dataTransfer`), not framer-motion drag.
- `FolderModal` has `setOpenDocument` for inline document viewing inside the modal.
- `createDocument` is available from `useDocuments`, used both at the desktop level and inside `FolderModal`.

---

## What Gets Built

### 1. Template Chooser Modal (`src/components/focus/TemplateChooserModal.tsx`)
A new standalone component. Self-contained, receives `onCreateDocument(title, type, content?)` and `onClose`. No state changes to any existing editor or document component.

**Template catalog** (5 templates):
- Blank Document (`type: "text"`)
- Blank Spreadsheet (`type: "spreadsheet"`)
- Modern Invoice (`type: "spreadsheet"`, content: invoice rows)
- Project Proposal (`type: "text"`, content: HTML structure)
- Meeting Minutes (`type: "text"`, content: HTML structure)

**Layout:** Apple Pages-style — `fixed inset-0 z-[9990]` overlay, centered `w-[860px] h-[580px]` glass modal. Left sidebar with category filters, right grid of template cards with CSS-drawn thumbnails. Bottom bar with Cancel and Create buttons.

**Thumbnail CSS art** (pure Tailwind/inline styles, no images):
- *Blank Doc*: white bg, single faint line
- *Blank Spreadsheet*: grid pattern via `bg-[linear-gradient(...)]`
- *Invoice*: dark header bar + horizontal rule lines + small price block bottom-right
- *Proposal*: large colored hero block top half + two columns of gray lines below
- *Meeting Minutes*: bold title line + 3 bullet-circle rows

### 2. Wire Template Chooser into the existing Context Menu
In `FocusDashboardView`, add `showTemplateChooser` state. The existing "New Document" menu item gains a new "From Template..." sub-option alongside the existing Text / Spreadsheet quick-picks. Clicking "From Template..." sets `showTemplateChooser = true`. 

`onCreateDocument` in `TemplateChooserModal` calls the same `handleCreateDocument`-style logic already in `FocusDashboardView` — creates a doc at the right-click canvas coords, adds it to the page's `visibleDocIds`, then calls `openWindow(...)` to open it immediately. Strictly uses existing `createDocument` + `openWindow` — no editor code touched.

### 3. Apple-style Folder Expansion UI (replaces FolderModal trigger)
**New component:** `src/components/focus/ExpandedFolderOverlay.tsx`

- State: `openFolderId` already exists in `FocusDashboardView`. When set, this new component renders instead of `<FolderModal>`.
- **Backdrop:** `fixed inset-0 z-[8000] bg-black/20 backdrop-blur-sm` — click closes.
- **Expanded panel:** `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] min-h-[420px] max-h-[80vh]` with full glass treatment.
- **Framer Motion `layoutId`:** The `DesktopFolder` icon gets `layoutId={"folder-expand-"+folder.id}` on its outer `motion.div`. The expanded overlay wrapper also gets the same `layoutId`. Spring: `{ type:"spring", bounce:0.2, duration:0.5 }`.
- **Inside the overlay:** Folder name (editable on click, preserving existing `updateFolder`), grid of contents (subfolders + docs from `useDocuments` scoped to that folder), each item clickable to fire `openWindow`. Existing color/icon customization is untouched (lives in `DesktopFolder`'s context menu, separate from the open-state UI).
- **CRITICAL PRESERVATION:** The `DesktopFolder` component itself is not modified structurally — only the outer `motion.div` wrapping gains the `layoutId` prop, which requires adding a new optional `layoutId` prop. All existing folder data (color, icon, opacity, position, bgColor, etc.) stays in `FocusContext` and `DesktopFolder` unchanged.

### 4. Drag-out-of-folder to desktop
Inside `ExpandedFolderOverlay`, each grid item is wrapped in a `<motion.div drag dragMomentum={false} whileDrag={{ scale:1.05, zIndex:9999 }}>`.

- `useRef` on the `w-[620px]` container.
- `onDragEnd={(e, info)` checks if `info.point.x/y` is outside `containerRef.current.getBoundingClientRect()`.
- If outside: for docs — call `supabase.from("documents").update({ folder_id: null })` + `refetchDesktopDocs()` + add to current page's `visibleDocIds`; for subfolders — call `moveFolder(id, null)` + add to `visibleFolderIds`. Then compute canvas-relative drop coords via `toCanvasCoords` (passed as prop) and call `updatePageDocPosition` / `updatePageFolderPosition`. Show `toast.success`.
- The `moveItemToDesktop` logic is encapsulated inside `ExpandedFolderOverlay` via callbacks passed from `FocusDashboardView` — no new Zustand state needed.

---

## Files to Create/Modify

```
CREATE  src/components/focus/TemplateChooserModal.tsx   (new — template chooser)
CREATE  src/components/focus/ExpandedFolderOverlay.tsx  (new — Apple folder expand)
MODIFY  src/components/focus/FocusDashboardView.tsx     (wire both, add layoutId passthrough, add showTemplateChooser state, replace FolderModal with ExpandedFolderOverlay)
MODIFY  src/components/focus/DesktopFolder.tsx          (add optional layoutId prop to outer motion.div, ~3 lines)
```

**DO NOT TOUCH:** `DocumentView`, `SheetsToolbar`, `WordsToolbar`, any toolbar component, `WindowManagerContext`, `FolderModal` (kept as-is, just no longer triggered from the canvas — only from inside `ExpandedFolderOverlay`), `FocusContext`, `FluxContext`.

---

## Execution Sequence

1. Create `TemplateChooserModal.tsx` with all 5 templates + CSS thumbnails + sidebar categories + bottom action bar
2. Create `ExpandedFolderOverlay.tsx` with framer-motion layoutId expansion + drag-out logic
3. Modify `DesktopFolder.tsx` to accept + forward optional `layoutId` prop
4. Modify `FocusDashboardView.tsx` to:
   - Add `showTemplateChooser` state
   - Extend context menu "New Document" with "From Template..." option
   - Render `<TemplateChooserModal>` when open
   - Replace `<FolderModal>` render with `<ExpandedFolderOverlay>`
   - Pass `layoutId`, `toCanvasCoords`, `updatePageFolderPosition`, `updatePageDocPosition`, `setPages`, `activePageIndex`, `refetchDesktopDocs` to the overlay
