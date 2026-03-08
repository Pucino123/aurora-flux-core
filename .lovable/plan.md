
## Complete Map of "New Document" Triggers

### All locations that bypass the Template Chooser:

1. **`FocusDashboardView.tsx` (Canvas right-click context menu)** — "New Document" shows a sub-picker with "Text Document" / "Spreadsheet" / "From Template…". The first two bypass the chooser. Fix: make "New Document" directly call `setShowTemplateChooser(true)` and remove the `showDocPicker` sub-picker entirely.

2. **`ExpandedFolderOverlay.tsx` (header icon button + empty state button)** — two places call `createDocument("Untitled Document", "text", folderId)` directly. Fix: both open a folder-scoped `TemplateChooserModal`.

3. **`FolderModal.tsx` (toolbar: "Doc" + "Sheet" buttons)** — `handleCreateDocument("text")` / `handleCreateDocument("spreadsheet")` bypass chooser. Fix: add `showTemplateChooser` state, replace "Doc"/"Sheet" buttons with a single "New…" button that opens `TemplateChooserModal`. The existing `FolderTemplateSelector` (`showTemplates`) stays untouched — it's a separate "Templates" workflow.

4. **`DocumentsView.tsx` (header "+ Doc" + "+ Sheet" buttons)** — both `createDocument` calls bypass chooser. Fix: replace both with a single "New Document" button that opens `TemplateChooserModal` inline (using local state since `DocumentsView` doesn't have `openWindow`). On create, it calls `createDocument` then `openInWorkspace`.

5. **`FolderContents.tsx` (empty-state "Document"/"Spreadsheet" buttons)** — these are triggered via `onCreateDocument` prop passed from `FolderModal`. Since `FolderModal` will be fixed at the source, these remain as-is (they're controlled by the parent).

### What stays untouched:
- `DocumentView`, `SheetsToolbar`, `WordsToolbar`, all editor components
- `FolderTemplateSelector` (separate "Templates" panel in `FolderModal`)
- `TemplateChooserModal` internal code — only the `onCreateDocument` callback logic in callers changes
- `ProjectBoard.tsx` — its "New Document" buttons are inside a folder board view scoped to a project; they're contextual and not primary "new document" flows. Leave them as-is per the spirit of the task (these are already inside a specific project context).

### Key insight on `ExpandedFolderOverlay` and `FolderModal` usage:
These are **folder-scoped** document creation. The `TemplateChooserModal` already accepts an `onCreateDocument` callback — so we pass a folder-scoped version: `createDocument(title, type, folderId)`. This preserves `folder_id` correctly.

---

## Files to Modify

```
MODIFY  src/components/focus/FocusDashboardView.tsx
  - Remove showDocPicker sub-picker
  - "New Document" click → setShowTemplateChooser(true) directly

MODIFY  src/components/focus/ExpandedFolderOverlay.tsx
  - Add showTemplateChooser local state
  - Header FileText button → open TemplateChooserModal
  - Empty state "New Document" button → open TemplateChooserModal
  - TemplateChooserModal's onCreateDocument creates doc with folderId

MODIFY  src/components/focus/FolderModal.tsx
  - Add showInlineTemplateChooser local state
  - Replace "Doc" + "Sheet" toolbar buttons with single "New…" button
  - Mount <TemplateChooserModal> when state is true
  - onCreateDocument: createDocument(title, type, currentFolderId) + optional content update

MODIFY  src/components/DocumentsView.tsx
  - Add showTemplateChooser local state
  - Replace "+ Doc" and "+ Sheet" buttons with single "New Document" button
  - Mount <TemplateChooserModal> when state is true
  - onCreateDocument: createDocument(title, type) + openInWorkspace + setActiveView
```

## Execution Steps

1. **`FocusDashboardView.tsx`**: Remove `showDocPicker` state and its entire sub-picker JSX block (lines ~1629–1655). Change the "New Document" button's onClick to `() => { setContextMenu(null); setShowTemplateChooser(true); }`.

2. **`ExpandedFolderOverlay.tsx`**: Import `TemplateChooserModal`. Add `const [showTemplateChooser, setShowTemplateChooser] = useState(false)`. Wire both the header icon button and the empty-state button to `setShowTemplateChooser(true)`. Mount `<TemplateChooserModal>` with `onCreateDocument` that calls `createDocument(title, type, folderId)` then `refetch()`.

3. **`FolderModal.tsx`**: Import `TemplateChooserModal`. Add `const [showInlineTemplate, setShowInlineTemplate] = useState(false)`. Replace "Doc" and "Sheet" buttons in the toolbar with one "New…" button. Mount `<TemplateChooserModal>` with `onCreateDocument = handleCreateFromTemplate` (already exists).

4. **`DocumentsView.tsx`**: Import `TemplateChooserModal`. Add `const [showTemplateChooser, setShowTemplateChooser] = useState(false)`. Replace both header buttons with one "New Document" button. Mount `<TemplateChooserModal>` with `onCreateDocument` that calls `createDocument` then `openInWorkspace`.
