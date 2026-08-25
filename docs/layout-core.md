# AgentRejoin Layout — Core Spec

## Current Layout (from code)

Two-column layout using `expo-router/drawer` with `drawerType: 'permanent'` on tablet/desktop.

### Key files

- `SidebarNavigator.tsx` — Drawer with permanent sidebar
- `SidebarView.tsx` — left column (header + SessionsList + FABWide)
- `SessionView.tsx` — main content wrapper
- `ChatHeaderView.tsx` — abs-positioned header (maxWidth 800 on web)
- `AgentContentView.tsx` — ChatList + AgentInput
- `ChatList.tsx` — inverted FlatList of messages
- `AgentInput.tsx` — composer (maxWidth 800 on web)
- `ActiveSessionsGroupCompact.tsx` — compact session rows (56px, grouped by project)
- `layout.ts` — maxWidth constants (web: 800, mac: 1400)

### Current structure

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ SidebarNavigator (expo-router Drawer, permanent on tablet/desktop)                   │
│                                                                                      │
│ ┌─ SidebarView ────────┐┌─ Stack (main content) ──────────────────────────────────┐  │
│ │ width: 30% window    ││ remaining width (1080px on 1440px window)                │ │
│ │ clamped [250..360]px ││                                                          │ │
│ │                      ││   contentWrapper: alignItems:'center'                    │ │
│ │ ┌ Header 56px ─────┐ ││   ┌─ ChatHeader ─────────────────────────┐               │ │
│ │ │ H  Sessions  ⊕ ≡ │ ││   │ maxWidth: 800px, centered            │               │ │
│ │ └──────────────────┘ ││   │ [←] Title              [Avatar 32px] │               │ │
│ │                      ││   │     subtitle/path                    │               │ │
│ │ ┌ SessionsList ────┐ ││   └──────────────────────────────────────┘               │ │
│ │ │                  │ ││                                                          │ │
│ │ │ Compact mode:    │ ││   ┌─ ChatList (abs, inverted FlatList) ─┐                │ │
│ │ │                  │ ││   │ maxWidth: 800px, centered           │                │ │
│ │ │ [●24] ~/myapp    │ ││   │                                     │                │ │
│ │ │       main +3-2  │ ││   │  agent message                      │                │ │
│ │ │ ┌──────────────┐ │ ││   │                                     │                │ │
│ │ │ │● fix auth    │ │ ││   │  ┌────────────────────┐             │                │ │
│ │ │ │  refactor db │ │ ││   │  │ ✓ Edit auth.ts     │             │                │ │
│ │ │ │  add tests   │ │ ││   │  │ ✓ Edit routes.ts   │             │                │ │
│ │ │ └──────────────┘ │ ││   │  └────────────────────┘             │                │ │
│ │ │                  │ ││   │                                     │                │ │
│ │ │ [●24] ~/other    │ ││   │  user message                       │                │ │
│ │ │       feat/x     │ ││   │                                     │                │ │
│ │ │ ┌──────────────┐ │ ││   └─────────────────────────────────────┘                │ │
│ │ │ │  migrate     │ │ ││                                                          │ │
│ │ │ └──────────────┘ │ ││   ┌─ AgentInput ────────────────────────┐                │ │
│ │ └──────────────────┘ ││   │ maxWidth: 800px, centered            │               │ │
│ │                      ││   │ ┌──────────────────────────────────┐ │               │ │
│ │ ┌─ FABWide ────────┐ ││   │ │ type here...                     │ │               │ │
│ │ │ + New Session    │ ││   │ └──────────────────────────────────┘ │               │ │
│ │ └──────────────────┘ ││   │ [⚙] [⏹] [git±]              [⬆]     │               │ │
│ │                      ││   └──────────────────────────────────────┘               │ │
│ └──────────────────────┘└──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Current widths

| Window   | Sidebar | Main area | Chat content | Dead space each side |
|----------|---------|-----------|--------------|----------------------|
| 1440px   | 360px   | 1080px    | 800px        | ~140px               |
| 1280px   | 360px   | 920px     | 800px        | ~60px                |

The dead space on both sides of the chat is where the context panel goes.

---

## Proposed Layout — Three Columns

Replace `expo-router/drawer` with a custom `flexDirection:'row'` wrapper. Three children: Sidebar | Center | ContextPanel.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Custom flexDirection:'row' wrapper (replaces Drawer)                                 │
│                                                                                      │
│ ┌─ SidebarView ──┐┌─ Center ──────────────────────────────────┐┌─ ContextPanel ─────┐│
│ │ width: ~300px  ││ flex:1 (~840px on 1440)                   ││ width: ~300px      ││
│ │                ││                                           ││                    ││
│ │ ┌Header 56px─┐ ││ ┌─ ChatHeader ──────────────────────────┐ ││ [Changed]    [All] ││
│ │ │H Sessions ⊕│ ││ │ [←] fix auth middleware [●Icon][◎Zen] │ ││                    ││
│ │ └────────────┘ ││ │     ~/myapp                           │ ││ M auth.ts    +3-2  ││
│ │                ││ └───────────────────────────────────────┘ ││ M routes.ts  +1-1  ││
│ │ [●24] ~/myapp  ││                                           ││ A helpers.ts +12   ││
│ │       main+3-2 ││ ┌─ ChatList ────────────────────────────┐ ││                    ││
│ │ ┌────────────┐ ││ │                                       │ ││                    ││
│ │ │● fix auth  │ ││ │ 🤖 I updated the auth middleware      │ ││                    ││
│ │ │  refactor  │ ││ │ to use isExpired() helper instead     │ ││                    ││
│ │ │  add tests │ ││ │ of checking token.expired directly.   │ ││                    ││
│ │ └────────────┘ ││ │                                       │ ││                    ││
│ │                ││ │ ┌────────────────────────┐            │ ││                    ││
│ │ [●24] ~/other  ││ │ │ ✓ Edit auth.ts   +3-2 │             │ ││                    ││
│ │       feat/x   ││ │ │ ✓ Edit routes.ts +1-1 │             │ ││                    ││
│ │ ┌────────────┐ ││ │ │ ✓ Edit helpers.ts +12 │             │ ││                    ││
│ │ │  migrate   │ ││ │ └────────────────────────┘             │ ││                    ││
│ │ └────────────┘ ││ │                                        │ ││                    ││
│ │                ││ │ All 42 tests passing. ✓                │ ││                    ││
│ │                ││ └────────────────────────────────────────┘ ││                    ││
│ │ ┌────────────┐ ││                                            ││                    ││
│ │ │+ NewSession│ ││ ┌─ AgentInput ──────────────────────────┐  ││                    ││
│ │ └────────────┘ ││ │ ┌────────────────────────────────────┐ │ ││                    ││
│ │                ││ │ │ type here...                       │ │ ││                    ││
│ │                ││ │ └────────────────────────────────────┘ │ ││                    ││
│ │                ││ │ [⚙] [⏹] [git±]       [⬆]              │ ││                    ││
│ │                ││ └────────────────────────────────────────┘ ││                    ││
│ └────────────────┘└────────────────────────────────────────────┘└────────────────────┘│
│                    ◁━━━━━━ drag edges to resize ━━━━━━▷                              │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Design decisions

**Both sidebars same width (~300px).** Center stays visually centered. At 1440px the center is ~840px — naturally close to the current 800px maxWidth, making it redundant. Drop maxWidth constraints on chat content and header; let them fill the center column.

**Main content should be resizable.** P1 Drag left edge to widen/shrink center. 
**Side bars should also be resizable** P2

**Context panel is per-worktree.** Switch sessions in the same worktree, right panel stays the same. Changes, files — all scoped to the worktree.

**Zen mode is the only toggle.** Both sidebars always visible on desktop. `Cmd+0` or zen button hides both, center goes full width. No individual panel toggles.
Zen will toggle even more off! it should be like Bear markdown editor - full attention to content - 0 distractions

**Zen button lives in the center header.** Next to the session avatar, top right of the center column — not at the window edge.

### Center header row

```
[←] Session Title                              [●32 avatar] [◎ Zen]
    ~/path/to/project
```

- `[←]` back button (existing)
- Title + subtitle (existing)
- `[●32]` session avatar with popover menu (existing)
- `[◎ Zen]` zen mode toggle (new)

### AgentInput (composer) in active session

```
┌──────────────────────────────────────────────┐
│ type here...                                  │
└──────────────────────────────────────────────┘
[⚙ settings][⏹ abort] [git±]  [⬆]
```

- `[⚙]` opens settings overlay (permission mode, model, effort)
- `[⏹]` abort current operation
- `[git±]` git status badge — opens file viewer
- `[⬆]` send button (32x32, right-aligned)

---

## Context Panel (Right)

### Sub-tabs

Two tabs at the top: **Changed** | **All**

#### Changed (build first)

Git diff file list for the worktree. Modified/added/deleted files with line counts.

```
M src/auth.ts          +3  -2
M src/routes.ts        +1  -1
A src/helpers/token.ts  +12
```

Click a file → Center Column becomes the unified diff viewer, scrolled to that file.

#### All (later)

Full hierarchical file tree browser. ONLY browse - when opening the files - we should be able to edit files tho.
Edit on desktop only!

#### Aspirational (not in v1, not in tabs)

Everyone loves arc ... chrome is bringing vertical tabs ... but conductor is pushing the industry back into horizontal. AgentRejoin to bring you relief!

Below the tab content, future additions:
- **Important tab** — "working set" skeleton of files the agent recently read/wrote
- **Guided Tour** — onboarding walkthrough entry point, inspired by [Graphite Code Tours](https://graphite.com/blog/code-tours)
- **Pipeline / Flow** — ACP loops, custom pipelines, CI status
- **Terminals** — active terminals on the machine, with ports - maybe even can open them


---

## Diff Viewer (Center)

When a file is clicked in the context panel, center replaces the chat with a single scrollable diff surface.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─ SidebarView ──┐┌─ Center (diff mode) ──────────────────────┐┌─ ContextPanel ────┐│
│ │                ││ ← Back to chat          Diff (3 files +16-3)│                    ││
│ │ (unchanged)    ││                                            ││ [Changed]    [All] ││
│ │                ││ ┄┄ src/auth.ts ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  ││                    ││
│ │                ││ (scroll up to see)                         ││  src/auth.ts  +3-2 ││
│ │                ││                                            ││ ▶src/routes.ts+1-1 ││
│ │                ││ ┄┄ src/routes.ts ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  ││  src/helpers  +12  ││
│ │                ││                                            ││                    ││
│ │                ││  51 │ import { newAuth } from './auth'     ││                    ││
│ │                ││  52 │                                      ││                    ││
│ │                ││  53 │-  app.use(oldAuth)                   ││                    ││
│ │                ││     │+  app.use(newAuth)                   ││                    ││
│ │                ││  54 │                                      ││                    ││
│ │                ││                                            ││                    ││
│ │                ││  ──── Unchanged (8 lines) ────             ││                    ││
│ │                ││                                            ││                    ││
│ │                ││ ┄┄ src/helpers.ts (new file) ┄┄┄┄┄┄┄┄┄┄  ││                    ││
│ │                ││                                            ││                    ││
│ │                ││  1 │+ export function isExpired(token) {   ││                    ││
│ │                ││  2 │+   return Date.now() > token.exp      ││                    ││
│ │                ││  3 │+ }                                    ││                    ││
│ │                ││                                            ││                    ││
│ │                ││ ┄┄ end ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  ││                    ││
│ └────────────────┘└────────────────────────────────────────────┘└────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- One continuous scrollable surface for all changed files (like GitHub PR "Files changed")
- File headers as sticky section dividers
- Context panel index highlights current file as you scroll
- Click file in index → smooth scroll to that section
- Collapsed unchanged regions (click to expand)
- `← Back to chat` returns to session at same scroll position

### Zen mode

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Center only — full window width                                                      │
│                                                                                      │
│            [←] fix auth middleware                        [●32 avatar] [◎ Zen]        │
│                ~/myapp                                                                │
│                                                                                      │
│            🤖 I updated the auth middleware to use the new                           │
│            isExpired() helper instead of checking token.expired                       │
│            directly. This fixes the race condition...                                 │
│                                                                                      │
│            ┌────────────────────────────────────────┐                                 │
│            │ ✓ Edit src/auth.ts          +3 -2      │                                 │
│            │ ✓ Edit src/routes.ts        +1 -1      │                                 │
│            │ ✓ Edit src/helpers.ts       +12        │                                 │
│            └────────────────────────────────────────┘                                 │
│                                                                                      │
│            All 42 tests passing. ✓                                                   │
│                                                                                      │
│            ┌────────────────────────────────────────────────┐                         │
│            │ type here...                                    │                        │
│            └────────────────────────────────────────────────┘                         │
│            [⚙] [🤖claude] [⏹] [git±]                  [⬆]                           │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

In zen mode, chat content should not change automatically - less shifting around. We should allow resizing in this mode tho too.

---

## Mobile (later — not v1)

Two-push navigation from session:
1. Push index screen (context panel content, full screen)
2. Tap file → push full diff, auto-scrolled to that file, sticky mini-nav at bottom

---

## Implementation notes

- Replace `expo-router/drawer` in SidebarNavigator with custom three-column flex layout
- Drop `layout.maxWidth` constraint on chat content and header — center column provides the constraint
- Re-apply maxWidth in zen mode so content doesn't stretch
- Context panel state stored per-worktree in zustand
- Persist sidebar widths + zen state per user in settings
- Desktop first, mobile later
- Diff viewer - lets look for a trendy package - we probably just want to show a web view on mobile to avoid dealing with native shit :D. Ideally we need to have file edit ops / code previews similar styled

## Related improvements (not layout-specific)

- Better table rendering in agent messages
- Clickable file paths in agent output
- Richer inline tool output (syntax-highlighted diffs in collapsed tool calls)
- Fix black stripe artifact in file edit rendering
- Fix duplicated plan presentation
- Navigation bugs: back nav broken in logout/restore flows
- Workspaces & Checkouts: see roadmap.md
- Push notification routing: see roadmap.md
