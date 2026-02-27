

## Plan: Redesign Colab Modal to Match macOS Messages Reference

The uploaded screenshots show the native macOS Messages app in both dark and light mode. The current implementation already has the two-column layout, but needs refinement to more closely match the reference images and add the requested features.

### Changes to `src/components/focus/CollabMessagesModal.tsx` (full rewrite)

**1. Modal Chrome & Close Button**
- Single minimalist `X` close icon in the top-right corner of the modal (not macOS traffic lights)
- Remove all duplicate close mechanisms
- Keep `[&>button]:hidden` on DialogContent to suppress Shadcn default close

**2. Glassmorphism Theme Refinement**
- **Dark mode**: Deeper opaque frosted glass (`rgba(28,28,30,0.92)`) with intense `blur(60px) saturate(200%)` matching `#1C1C1E` Apple dark tokens
- **Light mode**: Lighter translucent frosted glass (`rgba(246,246,248,0.85)`) with `blur(40px) saturate(180%)` as in `image_2.png`
- Update all `T` theme tokens to match the screenshots more precisely

**3. Left Sidebar Enhancements**
- **Pinned section**: Large circular avatars in a horizontal row (matching the "Sab ❤️", "William", "Mor" layout in screenshots), with a highlighted selection ring on the active one
- **Pending Invites section**: New UI section at the top of the contact list showing invited-but-not-accepted users with placeholder avatars, name/email, and a "Pending" badge. Data sourced from a new `pendingInvites` state (populated from `team_invites` table joined with team info)
- **Contact list**: Each row shows avatar, name, last message snippet, and timestamp — closely matching the screenshot layout
- **Search bar**: Rounded pill style matching macOS search field

**4. Chat Header**
- Contact avatar centered at top with name below (matching screenshot where "Sab ❤️" avatar is centered)
- Dark/light mode toggle (Sun/Moon icon) placed in the header area
- Info button for details panel

**5. Message Bubbles**
- Blue bubbles for own messages (iMessage blue `#007AFF` light / `#0A84FF` dark)
- Gray bubbles for others (`#E9E9EB` light / `#3A3A3C` dark)
- Tail/clustering logic already exists — refine border radius values to match screenshots
- Time separators between message groups

**6. Message Reactions (Hold-to-React)**
- Keep existing hover-triggered reaction bar
- Add long-press detection (500ms `onMouseDown`/`onTouchStart` timer) that shows the same reaction popover — matching macOS "Tapback" style

**7. Mock Data for Pending Invites**
- Show 1-2 pending invite entries in the sidebar when no real pending invites exist, with placeholder avatars and "Pending" badge — but only as UI demonstration elements that are clearly distinguishable

**8. Input Area**
- Match macOS input: rounded pill field with "iMessage" placeholder, `+` attachment button on left, send arrow on right
- Keep emoji picker and user avatar

### Changes to `src/hooks/useTeamChat.ts`

- Add `pendingInvites` state: query `team_invites` table for active (non-expired) invites for the current team, return token + created_by info for sidebar display
- Expose `pendingInvites` from the hook

### Database

- No schema changes needed — `team_invites` table already exists with the required fields

### Implementation Steps

1. Update theme tokens `T` for both modes to match screenshot colors precisely
2. Rebuild sidebar layout: search → pinned avatars → pending invites section → conversation list
3. Add pending invites data fetching in `useTeamChat.ts`
4. Refine chat header to center avatar + name layout
5. Add long-press reaction handler alongside existing hover
6. Place single `X` close button in top-right corner
7. Polish glassmorphism blur/saturation values for both modes

