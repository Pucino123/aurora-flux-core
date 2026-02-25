
# Plan: Studio Mode Fix, Reset-knap og Dokument AI-chat

## 1. Fix Studio Mode drag-clipping

**Problem:** Studio Mode-toolbaren er `fixed` positioneret med `z-[200]`, men det overordnede dokument-container har ikke `overflow: visible` hele vejen op. Elementer bliver klippet af parent-containere.

**Losning:**
- I `DocumentView.tsx`: Nar `studioMode` er aktiv, tilfojes `overflow-visible` pa ALLE parent-containere (den ydre `div` wrapper).
- Undersog og tilret eventuelle parent-elementer i `FluxSidebar` eller layout-containere der kan klippe.
- Saet `dragConstraints={{ top: -9999, left: -9999, right: 9999, bottom: 9999 }}` i stedet for `dragConstraints={false}` pa bade `WordsToolbar` og `SheetsToolbar` studio-mode containeren for at sikre framer-motion ikke begrenser drag.

**Filer:** `DocumentView.tsx`, `WordsToolbar.tsx`, `SheetsToolbar.tsx`

## 2. Reset-knap til standard toolbar-position

**Losning:**
- Tilfojes i `ToolboxPopover.tsx` som en ekstra knap: "Reset to default" / "Nulstil" der kalder `showAll()` (allerede eksisterende) og ogsa rydder eventuelle gemte positioner.
- Knappen vises altid i toolbox-popoveren (ogsa nar ingen segmenter er skjulte), sa brugeren altid kan nulstille.
- Opdater `useToolbarVisibility.ts` sa `showAll` ogsa fjerner gemt position-data fra localStorage.

**Filer:** `ToolboxPopover.tsx`, `useToolbarVisibility.ts`

## 3. AI Document Chat i bunden af hvert dokument

En chatbar i bunden af dokumentet der kan laese dokumentindholdet og give feedback, forslag og fremhaevninger.

**Backend:**
- Tilfojes en ny `type: "document-chat"` handler i `supabase/functions/flux-ai/index.ts`
- System-prompten instruerer AI'en til at analysere dokumentet og komme med feedback, ideer, fremhaevninger og forslag til aendringer
- Bruger streaming (SSE) for real-time svar
- Modtager `documentContent` (HTML/text) sammen med brugerens besked

**Frontend:**
- Ny komponent `src/components/documents/DocumentAiChat.tsx`
  - Fast chatbar i bunden af dokumentet med input-felt og send-knap
  - Kan kollapses/ekspanderes
  - Viser AI-svar med markdown-rendering (react-markdown allerede installeret)
  - Streamer tokens live mens AI svarer
  - Sender dokumentets indhold med hver besked sa AI'en har kontekst
- Integreres i `DocumentView.tsx` - tilfojes under editoren og over `StatusBar` i bade TextEditor og SpreadsheetEditor

**Filer:**
- `supabase/functions/flux-ai/index.ts` (tilfoej document-chat handler)
- `supabase/config.toml` (verificer function config)
- `src/components/documents/DocumentAiChat.tsx` (ny)
- `src/components/documents/DocumentView.tsx` (integrer chat)

## Teknisk oversigt

```text
DocumentView
+-- WordsToolbar (studio: fixed, overflow-visible, unconstrained drag)
+-- Editor (contentEditable)
+-- DocumentAiChat (kollapserbar chatbar)
    +-- Input + Send
    +-- Streaming AI svar (react-markdown)
+-- StatusBar
```

**Edge function flow:**
```text
Client -> flux-ai (type: "document-chat")
       -> System prompt + document content + user message
       -> Streaming SSE response
       -> Client renders tokens live
```
