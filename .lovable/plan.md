

# Editor Parity and iOS-Style Toolbar Physics

## Current State Analysis

After thorough code review, both editors are already **functional** (not placeholders):

- **Word Editor**: Uses `contentEditable` + `document.execCommand()` -- Bold, Italic, Headers, Lists, Links, Tables, Checklists all work when clicked
- **Sheet Editor**: Custom grid with real cell input, formatting (bold/italic/color/alignment), Tab/Enter navigation, column/row resize, context menus, CSV export
- **Toolbar DnD**: Already uses `@dnd-kit/sortable` with localStorage persistence via `useToolbarOrder` hook

## What Needs Improvement

### 1. Word Editor -- Formula Bar and Missing Features
- Add a **formula/address bar** showing current block type (like Word's style dropdown)
- Add **Undo/Redo** buttons to the toolbar (currently only keyboard shortcuts)
- Add **Print/Export** capability
- Fix: `execCommand` is deprecated but still functional in all browsers -- adding a comment noting this

### 2. Sheet Editor -- Formula Support
- Add basic formula evaluation (`=SUM`, `=AVG`, `=COUNT`, `=MIN`, `=MAX`) for cell values
- Display formula in an **address bar** above the grid when cell is focused
- Add arrow key navigation between cells

### 3. iOS-Style Toolbar Physics (Enhanced DnD)

Currently DnD uses `@dnd-kit` with basic CSS transitions. Upgrade to **spring-based physics**:

- Replace `ToolbarSegment`'s static CSS transition with framer-motion `layout` animations using `type: "spring"` (stiffness: 400, damping: 30)
- Add **scale bounce** on drag start (1.05x) and **drop settle** animation
- Add subtle **rotation** during drag (like iOS wiggle)
- Make the toolbar container width animate smoothly when segments reorder
- Individual **tool buttons** within segments become sortable (not just segment groups)

## Implementation Plan

### File Changes

**`src/components/documents/toolbar/ToolbarSegment.tsx`**
- Enhance `SortableSegment` with improved spring physics
- Add drag scale, rotation tilt, and bounce-settle animations
- Add haptic-like visual feedback (brief color pulse on drop)

**`src/components/documents/toolbar/WordsToolbar.tsx`**
- Add Undo/Redo buttons to the file segment
- Add individual tool-level reordering within segments (optional, phase 2)
- Wrap toolbar container in `motion.div` with `layout` for smooth width transitions

**`src/components/documents/toolbar/SheetsToolbar.tsx`**
- Same spring physics upgrade as WordsToolbar
- Add formula bar component above grid

**`src/components/documents/DocumentView.tsx`**
- **Sheet**: Add formula evaluation engine (basic arithmetic + SUM/AVG/COUNT/MIN/MAX)
- **Sheet**: Add formula bar showing active cell address + content
- **Sheet**: Add arrow key navigation between cells
- **Word**: Add undo/redo toolbar buttons

**`src/hooks/useToolbarOrder.ts`**
- No changes needed (already handles persistence correctly)

### Formula Engine (Sheet)

```text
User types "=SUM(A1:A3)" in cell B1
  --> Parse formula, extract range A1:A3
  --> Resolve cell references to values
  --> Compute result (display value, store formula)
  --> Re-evaluate dependent cells on change
```

Supported functions: `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`, basic arithmetic (`+`, `-`, `*`, `/`)

### Spring Physics Parameters

```text
Drag start:  scale 1.05, rotate +/-2deg, shadow elevation increase
During drag: spring { stiffness: 400, damping: 28 }
Swap:        neighbors slide with spring { stiffness: 500, damping: 35 }
Drop settle: spring { stiffness: 300, damping: 22, bounce: 0.15 }
```

### Estimated Scope
- 5 files modified
- No new dependencies needed (framer-motion + @dnd-kit already installed)
- All changes are additive -- no breaking changes to existing functionality

