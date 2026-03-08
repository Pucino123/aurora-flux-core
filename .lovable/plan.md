
## Current State Analysis

The `DashboardPage` type currently has:
- `visibleFolderIds?: string[]` — which folders appear on each page (opt-in list)
- `visibleDocIds?: string[]` — which docs appear on each page (opt-in list)
- `folderPositions` / `docPositions` — per-page coordinates

**Problems with the current approach:**
1. The filter logic is: `!currentPage?.visibleFolderIds || currentPage.visibleFolderIds.includes(folder.id)`. This means **if no `visibleFolderIds` exists yet, ALL folders show on every page** (legacy fallback). This is what causes items to bleed across pages.
2. Newly created pages (`{ id, label }`) have no `visibleFolderIds`/`visibleDocIds` — so ALL items appear on them too.
3. "Move to page…" context menu option is missing entirely from both `DesktopFolder` and `DesktopDocument`.
4. There's no `AnimatePresence`-driven slide animation wrapping ONLY the desktop content layer (folders/docs) separate from widgets — they share the page transition but need to be visually isolated.

**What the user wants:**
1. Strict page isolation — new pages start completely empty.
2. "Move to page…" in right-click context menus on folders and documents.
3. `AnimatePresence` slide for the entire content container.
4. Sidebar, header bells/sparks unaffected — only the canvas content slides.

---

## Implementation Plan

### 1. Fix strict page isolation in `FocusDashboardView.tsx`

Change the filter logic from opt-in to **always enforce** the list:

```ts
// BEFORE (bleeds all items if no list defined):
.filter(folder => !currentPage?.visibleFolderIds || currentPage.visibleFolderIds.includes(folder.id))

// AFTER (always enforces — empty page = empty list):
.filter(folder => (currentPage?.visibleFolderIds ?? []).includes(folder.id))
```

Same for documents.

For `addPage` and `duplicatePage`, new pages already have structure — just ensure `visibleFolderIds: []` and `visibleDocIds: []` are explicitly set on new pages.

For **existing pages** that have no `visibleFolderIds` (legacy data), we preserve the old behavior during a one-time migration step: on load, if a page has no `visibleFolderIds`, we populate it with all currently known folder IDs (backwards compat). This way existing users don't lose their folders.

### 2. Add "Move to page…" context menu — `DesktopFolder.tsx`

Add props to `DesktopFolder`:
- `allPages: { id: string; label: string; index: number }[]`
- `currentPageIndex: number`  
- `onMoveToPage: (folderId: string, targetPageIndex: number) => void`

In the existing context menu (Column 1 — Actions section), add a "Move to page…" button that expands inline showing the list of other pages. Clicking a page calls `onMoveToPage`.

### 3. Add "Move to page…" context menu — `DesktopDocument.tsx`

Same props pattern:
- `allPages`, `currentPageIndex`, `onMoveToPage`

Add "Move to page…" button next to the existing "Move to Folder" button in Column 1.

### 4. Wire `onMoveToPage` in `FocusDashboardView.tsx`

```ts
const handleMoveToPage = useCallback((itemId: string, type: 'folder' | 'doc', targetPageIndex: number) => {
  setPages(prev => prev.map((p, i) => {
    if (i === activePageIndex) {
      // Remove from current page
      if (type === 'folder') {
        return { ...p, visibleFolderIds: (p.visibleFolderIds ?? []).filter(id => id !== itemId) };
      } else {
        return { ...p, visibleDocIds: (p.visibleDocIds ?? []).filter(id => id !== itemId) };
      }
    }
    if (i === targetPageIndex) {
      // Add to target page
      if (type === 'folder') {
        return { ...p, visibleFolderIds: [...(p.visibleFolderIds ?? []), itemId] };
      } else {
        return { ...p, visibleDocIds: [...(p.visibleDocIds ?? []), itemId] };
      }
    }
    return p;
  }));
  toast.success(`Moved to ${dashboardPages[targetPageIndex]?.label || `Page ${targetPageIndex + 1}`}`);
}, [activePageIndex, setPages, dashboardPages]);
```

### 5. AnimatePresence slide for desktop items layer

The folders and documents are currently rendered **outside** the `AnimatePresence mode="wait"` page transition block (they render in the outer `pointer-events-auto` container, not inside the animated `motion.div` keyed by `activePageIndex`). 

Move the folder and document rendering **inside** the existing page `AnimatePresence` block (the `motion.div key={activePageIndex}`), so they slide in/out together with widgets on page switch.

---

## Files to Edit

| File | Change |
|---|---|
| `src/components/focus/FocusDashboardView.tsx` | Fix filter logic, strict empty new pages, legacy migration, `onMoveToPage` handler, move folders/docs inside page `AnimatePresence` |
| `src/components/focus/DesktopFolder.tsx` | Add `allPages`/`currentPageIndex`/`onMoveToPage` props; add "Move to page…" menu item |
| `src/components/focus/DesktopDocument.tsx` | Same as above for documents |

No database changes required — all state is in `dashboardPages` in localStorage / cloud dashboard_state.

---

## Technical Detail (for implementation)

**Legacy migration** (in the `useState` initializer and cloud load `useEffect`):
```ts
// When loading pages, if a page has no visibleFolderIds, 
// do NOT default to showing all — instead initialize to []
// But only after we know what the current folderTree is.
// Strategy: Run a one-time effect after folderTree is loaded
// that populates page 0's visibleFolderIds with all existing folder IDs
// if and only if it's undefined (first-time migration).
```

This is the safest migration: page 0 gets all existing folders/docs assigned (so the user's main page isn't wiped), and all other pages with `undefined` lists get `[]` (empty).

**Slide animation** — The outer `motion.div key={activePageIndex}` already handles widget slides. Folders and docs just need to move inside it (they're currently rendered after `</AnimatePresence>` closing tag for the widgets block, in the parent `div`).
