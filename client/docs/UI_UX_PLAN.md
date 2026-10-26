# FLEXI — UI/UX Plan

| Field | Value |
| --- | --- |
| Product | FLEXI — Student Project Collaboration Studio |
| Design direction | Editorial studio meets campus workshop |
| Phase | Phase 1 — design system and preview implemented; Phase 2 backend/data layer complete; feature pages not started |
| Related plans | `../../server/docs/PROJECT_PLAN.md`, `API_PLAN.md`, `DATABASE_PLAN.md`, `SECURITY_PLAN.md` |

> This document defines the visual system, page map, component inventory, states, and accessibility expectations for later phases. Phase 1 implements the tokens, primitives, states, and a labeled preview page. Phase 2 adds the backend foundation and MongoDB models in `server/` but does not connect the client to feature APIs; feature pages and live data remain future work.

---

## 1. Design principles

1. **Work should look real.** The interface presents actual projects, people, skills, and progress, not generic dashboard filler.
2. **Warm structure, not corporate gray.** A paper-like canvas, ink typography, and confident color make the studio feel human while the grid keeps it organized.
3. **One primary action per surface.** Discovery points to a project; a project points to applying; a workspace points to the next task.
4. **Show the state.** Every list and form has loading, empty, error, success, and disabled behavior designed up front.
5. **Accessible by default.** Keyboard, focus, contrast, labels, and reduced motion are part of the system, not a cleanup pass.
6. **Motion with a job.** Transitions clarify hierarchy and feedback; they never delay a task or run without a reduced-motion alternative.

### 1.1 Inspiration sources

Use **Awwwards** and **Dribbble** as reference *categories*, not as layouts to copy.

| Source | What to study | What to borrow | What not to copy |
| --- | --- | --- | --- |
| Awwwards — editorial/portfolio and creative-studio sites | Oversized display type, asymmetric grids, generous whitespace, tactile paper/ink surfaces, restrained hover motion | Confidence, hierarchy, section rhythm, crafted details | Full-screen experimental navigation, cursor gimmicks, animation that hides content |
| Awwwards — productivity/SaaS sites | Clear product storytelling, UI-as-hero compositions, crisp feature sections | Product screenshots built from real UI, concise copy, strong CTAs | Generic gradient blobs and identical three-column feature grids |
| Dribbble — collaboration and project-management dashboards | Compact stat cards, sidebars, status chips, task rows, empty states | Dashboard density, chips, avatars, progress patterns, friendly empty states | Low-contrast pastel text, icon-only actions, decoration over readability |
| Dribbble — student/portfolio profiles | Skill tags, project cards, personality | Profile hierarchy and project storytelling | Overly decorative cards that reduce scanability |

**Originality rule:** Do not reproduce a specific shot, brand mark, illustration, or page composition. Use the references to calibrate quality and interaction, then design FLEXI's own system.

---

## 2. Brand direction

### 2.1 Brand idea

FLEXI is a **studio**, not a learning-management system. It should feel like a well-designed shared desk: warm, direct, organized, and a little energetic.

- **Name treatment:** `FLEXI` wordmark in the display face, tight tracking, with a small bracket/slash mark that suggests joining parts into one team.
- **Tagline:** "Find your people. Build your proof."
- **Supporting line:** "A student project collaboration studio for ideas, teams, and work worth showing."
- **Voice:** direct, encouraging, specific. Short sentences. No corporate jargon, no empty hype.
- **Personality:** curious, collaborative, candid, craft-focused.

### 2.2 Logo concept (Phase 1)

- A geometric monogram built from two interlocking brackets (`[ ]`) that form an implied `F`.
- Wordmark uses Bricolage Grotesque SemiBold with slightly tightened tracking.
- Monochrome versions: ink on bone, bone on ink, white on cobalt.
- Minimum clear space equal to the height of the `F`; never stretch, outline, or add gradients.
- Favicon: monogram on cobalt or ink square.

No final logo asset is created in Phase 0.

### 2.3 Copy examples

| Context | Copy |
| --- | --- |
| Hero eyebrow | `STUDENT PROJECT COLLABORATION STUDIO` |
| Hero headline | `Find your people. Build your proof.` |
| Hero support | `Publish an idea, meet teammates who fill the gaps, and run the work in one calm place.` |
| Primary CTA | `Explore projects` |
| Secondary CTA | `Start a project` |
| Discovery empty | `No projects match those filters. Try a broader skill or reset the filters.` |
| Application success | `Application sent. The owner's decision will appear in My applications.` |
| Accept confirmation | `Accept this applicant? This uses the last open slot and moves the project to In progress.` |
| Contact success | `Message received. The FLEXI team will get back to you.` |
| 404 | `This page graduated without us.` |

---

## 3. Visual system

### 3.1 Color palette

The palette combines warm paper, near-black ink, a confident cobalt action color, and tangerine highlights. Color is never the only signal for status.

| Token | Hex | Usage | Notes |
| --- | --- | --- | --- |
| `--ink-950` | `#0B0F14` | Primary text, dark sidebar, footer | Near-black, not pure black |
| `--ink-900` | `#121820` | Dark panels | |
| `--ink-700` | `#2B3440` | Secondary dark surfaces | |
| `--slate-600` | `#566170` | Secondary text on light | Verify contrast on bone |
| `--slate-400` | `#8A94A3` | Muted metadata, disabled text | Not for essential body copy |
| `--bone-50` | `#F8F5EE` | Page canvas | Warm paper |
| `--bone-100` | `#F0EBE0` | Subtle section background | |
| `--bone-200` | `#E4DCCB` | Dividers, borders on canvas | |
| `--white` | `#FFFFFF` | Cards, forms, elevated surfaces | |
| `--cobalt-700` | `#1B36B8` | Primary hover/pressed, text links | |
| `--cobalt-600` | `#2447E8` | Primary actions, focus ring | Main brand action color |
| `--cobalt-100` | `#E6EAFF` | Selected filters, info backgrounds | |
| `--tangerine-500` | `#FF6B3D` | Accent highlights, active indicators | Use ink text on tangerine, not white |
| `--tangerine-100` | `#FFE8DF` | Warning/accent backgrounds | |
| `--mint-700` | `#157A5B` | Success text | Dark enough for body-size text |
| `--mint-100` | `#DFF5EC` | Success background | |
| `--amber-700` | `#8A4B08` | Warning text | |
| `--amber-100` | `#FEF3C7` | Warning background | |
| `--rose-700` | `#A3242E` | Error text | |
| `--rose-100` | `#FDE8EA` | Error background | |
| `--focus` | `#2447E8` | Focus ring | 2 px ring with 2 px offset |

**Contrast rules**

- Body text: ink or slate-600 on bone/white, never slate-400.
- Primary button: white text on cobalt-600/cobalt-700.
- Tangerine is an accent, not a text color on white.
- Status badges use a tinted background + dark text + text label.
- Verify every text/background pairing with a contrast checker before Phase 1 sign-off; target WCAG 2.1 AA (4.5:1 body, 3:1 large text).

### 3.2 Typography

| Role | Family | Weight | Usage |
| --- | --- | --- | --- |
| Display | Bricolage Grotesque | 600–700 | Hero, page titles, section headings, stat numbers |
| Body | Manrope | 400–700 | Paragraphs, labels, buttons, navigation |
| Mono/label | JetBrains Mono | 500 | Eyebrows, metadata, ticket-like labels, code/URLs |

**Fallbacks:** `"Bricolage Grotesque", "Arial Black", sans-serif`; `"Manrope", "Helvetica Neue", Arial, sans-serif`; `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace`.

**Type scale (fluid with `clamp`)**

| Token | Desktop | Mobile | Line height | Use |
| --- | --- | --- | --- | --- |
| `--text-display-xl` | 80 px | 48 px | 0.95–1.0 | Home hero only |
| `--text-display-lg` | 64 px | 40 px | 1.0 | Major editorial statements |
| `--text-h1` | 56 px | 36 px | 1.05 | Page title |
| `--text-h2` | 40 px | 30 px | 1.1 | Section headings |
| `--text-h3` | 28 px | 24 px | 1.2 | Card group titles |
| `--text-h4` | 22 px | 20 px | 1.3 | Card titles |
| `--text-body-lg` | 18 px | 17 px | 1.6 | Hero support, lead paragraphs |
| `--text-body` | 16 px | 16 px | 1.65 | Default |
| `--text-sm` | 14 px | 14 px | 1.5 | Helper text, metadata |
| `--text-xs` | 12 px | 12 px | 1.4 | Chips, mono labels |
| `--text-micro` | 11 px | 11 px | 1.3 | Uppercase mono eyebrows |

Avoid decorative scripts, all-caps body copy, and more than three weights in one view.

### 3.3 Spacing, grid, and layout

- Base spacing unit: **4 px**.
- Scale: `4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128`.
- Max content width: **1240 px**; text measure max **68ch**.
- Page gutters: 20 px mobile, 32 px tablet, 48 px desktop.
- 12-column grid on desktop; 8 on tablet; 4 on mobile.
- Section vertical rhythm: 64 px mobile, 96–128 px desktop.
- Use asymmetry deliberately: text column + project-card collage; not every section centered.

### 3.4 Surfaces and shape

| Token | Value | Use |
| --- | --- | --- |
| Radius sm | 6 px | Chips, small controls |
| Radius md | 12 px | Inputs, buttons |
| Radius lg | 20 px | Cards, panels |
| Radius xl | 28 px | Hero panels, feature blocks |
| Radius pill | 999 px | Avatars, filter pills, status pills |
| Border | 1 px solid `rgba(11,15,20,0.10)` | Card and form edges |
| Border strong | 1 px solid `rgba(11,15,20,0.18)` | Focused or selected surfaces |
| Shadow 1 | `0 1px 2px rgba(11,15,20,0.06)` | Inputs, small cards |
| Shadow 2 | `0 8px 24px rgba(11,15,20,0.08)` | Hover cards, dropdowns |
| Shadow 3 | `0 24px 64px rgba(11,15,20,0.14)` | Modals, mobile drawers |

- Cards use borders plus restrained shadows, not glassmorphism.
- A subtle paper/grain texture may be applied to large hero or CTA surfaces at low opacity (2–4%); it must not reduce text contrast.
- Decorative line art uses thin ink strokes and cobalt/tangerine nodes, echoing project connections.

### 3.5 Iconography and imagery

- Icons: 1.5–2 px stroke, rounded joins, 20/24 px sizes, consistent set. Use a small local icon component rather than mixing libraries.
- Avatars: initials on a deterministic accessible background color, with an optional validated image URL. No upload in MVP.
- Project covers: optional validated image URL; otherwise a generated geometric cover using the project category color and title initials.
- No stock photography of generic students. Use real product UI, typography, abstract connection diagrams, and project cards.
- Hero collage: layered HTML/CSS project cards with skills, avatars, and progress, not a static mockup image. This keeps it responsive and real.

### 3.6 Motion

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| `--motion-fast` | 150 ms | ease-out | Button feedback, chip toggle |
| `--motion-base` | 220 ms | cubic-bezier(0.2, 0.8, 0.2, 1) | Hover lift, dropdown, tab change |
| `--motion-slow` | 320 ms | cubic-bezier(0.2, 0.8, 0.2, 1) | Drawer, modal, route fade |
| `--motion-stagger` | 40 ms/item | — | Card entrance, max 6 items |

- Hover lift: `translateY(-2px)` plus shadow change, never layout shift.
- Page transitions: 120–160 ms opacity/translate; do not block interaction.
- Loading: skeletons, not spinners for full pages; button-level spinner for submissions.
- `prefers-reduced-motion: reduce` disables transforms, parallax, staggered entrances, and smooth scrolling; keep immediate state changes.
- No autoplay video, infinite marquee as the only content, or cursor-following effects.

---

## 4. Page map and routes

| Route | Access | Layout | Purpose |
| --- | --- | --- | --- |
| `/` | Public | Public | Landing page |
| `/about` | Public | Public | Mission, principles, how it works |
| `/projects` | Public | Public | Discovery with search/filter/sort |
| `/projects/:projectId` | Public (private statuses restricted) | Public | Project detail and apply/save |
| `/students/:userId` | Public | Public | Public student profile |
| `/showcase` | Public (optional; may redirect to filtered projects) | Public | Completed project showcase |
| `/contact` | Public | Public | Contact form and information |
| `/login` | Guest only | Auth | Sign in |
| `/signup` | Guest only | Auth | Create account |
| `/dashboard` | Auth | Dashboard | Role-aware overview |
| `/dashboard/projects` | Auth | Dashboard | Owned and joined projects |
| `/dashboard/applications` | Student (owners see received) | Dashboard | Applications received / decisions |
| `/dashboard/my-applications` | Student | Dashboard | Applications sent |
| `/dashboard/saved` | Auth | Dashboard | Saved projects |
| `/dashboard/notifications` | Auth | Dashboard | Notification inbox |
| `/dashboard/profile` | Auth | Dashboard | Profile and skills settings |
| `/projects/new` | Student | Dashboard | Create project |
| `/projects/:projectId/edit` | Owner | Dashboard | Edit project |
| `/projects/:projectId/workspace` | Owner/member; admin read-only | Workspace | Project overview |
| `/projects/:projectId/workspace/tasks` | Owner/member | Workspace | Task board/list |
| `/projects/:projectId/workspace/milestones` | Owner/member | Workspace | Milestones timeline |
| `/projects/:projectId/workspace/team` | Owner/member | Workspace | Team roster |
| `/projects/:projectId/workspace/applications` | Owner | Workspace | Application decisions |
| `/admin` | Admin | Admin | Platform overview |
| `/admin/users` | Admin | Admin | User moderation |
| `/admin/projects` | Admin | Admin | Project moderation |
| `/admin/messages` | Admin | Admin | Contact inbox |
| `/admin/reports` | Admin | Admin | Report queue |
| `*` | Public | Public | 404 |

### 4.1 Route guards

- `ProtectedRoute`: waits for `GET /auth/me`; redirects guests to `/login?returnTo=<path>`.
- `GuestOnlyRoute`: redirects authenticated users to `/dashboard`.
- `RoleRoute`: server still enforces roles; the UI renders a friendly 403 for mismatch.
- `ProjectAccessRoute`: loads workspace access; non-members see 404/403 without private data.
- After login, honor a safe internal `returnTo` only; reject external URLs.
- Route transitions scroll to top and update `document.title`; announce the new title for screen readers.

### 4.2 Frontend application architecture (planned)

Keep the architecture small enough to explain in a viva. Use React Router for routing, one auth context, a typed-by-convention API service layer, and page-local state. Do not introduce Redux, React Query, or a design framework unless a concrete problem justifies it.

**Planned full-app structure (Phase 1 creates only the foundation described in section 12):**

```text
client/
  index.html
  vite.config.js
  package.json
  .env.example
  src/
    main.jsx
    App.jsx
    router.jsx
    styles/
      tokens.css
      global.css
      components.css
      preview.css
      pages/
    layouts/
      PublicLayout.jsx
      DashboardLayout.jsx
      WorkspaceLayout.jsx
      AdminLayout.jsx
    pages/
      public/        Home, About, Contact, Projects, ProjectDetail, StudentProfile, Showcase, NotFound
      auth/          Login, Signup
      dashboard/     Overview, MyProjects, ReceivedApplications, MyApplications, Saved, Notifications, Profile
      projects/      ProjectCreate, ProjectEdit
      workspace/     Overview, Tasks, Milestones, Team, Applications
      admin/         Overview, Users, Projects, Messages, Reports
      errors/        Forbidden, ServerError
    components/
      ui/            Button, Input, Badge, Avatar, Card, Modal, Toast, Skeleton, EmptyState...
      layout/        Navbar, SidebarNav, Footer, Tabs, PageHeader, Pagination
      project/       ProjectCard, ProjectGrid, ProjectForm, ApplicationCard, SaveButton
      workspace/     TaskItem, TaskBoard, TaskForm, MilestoneTimeline, ProgressBar, TeamRoster
      admin/         AdminTable, ReportQueue, MessageInbox, ModerationActions
    context/
      AuthContext.jsx
      ToastContext.jsx
    hooks/
      useAuth.js
      useApi.js
      useDebounce.js
      usePagination.js
      useDocumentTitle.js
    services/
      api.js
      auth.service.js
      user.service.js
      project.service.js
      application.service.js
      task.service.js
      milestone.service.js
      notification.service.js
      saved.service.js
      contact.service.js
      report.service.js
      admin.service.js
    utils/
      validators.js
      formatters.js
      constants.js
      permissions.js
      url.js
    tests/
  tests/e2e/
```

**Routing**

- `BrowserRouter` with nested layouts and `Outlet`; route-level `React.lazy` for admin/workspace/heavy pages.
- Literal paths win over params (`/users/me` is handled by the API; frontend routes are explicit).
- Filters and sort live in the URL query string on discovery so links/back-forward work.
- A single `router.jsx` maps public, auth, dashboard, workspace, and admin trees.
- Scroll restoration: top on new page, preserve on back where practical.
- `document.title` and a route announcer update on navigation.

**Authentication state**

- `AuthProvider` calls `GET /auth/me` once on mount.
- State: `{ status: "loading" | "authenticated" | "guest", user }`.
- `login`, `register`, `logout`, and `refreshMe` update the context.
- No token is read by JavaScript; the server cookie is the session.
- A global `401` event clears auth state and redirects to login with a safe `returnTo`.
- Role-aware navigation derives from `user.role`; project-scoped actions derive from the loaded project/workspace (`owner`, `members`, `permissions`), never from a global "owner" role.
- Admin navigation is hidden for non-admins, but server checks remain authoritative.

**API service layer**

- `api.js` is the only place that calls `fetch`:
  - base URL from `VITE_API_URL` or `/api`;
  - `credentials: "include"`;
  - `X-Requested-With: XMLHttpRequest` on writes;
  - JSON serialization and envelope parsing;
  - `ApiError` with `status`, `code`, `message`, `fields`;
  - `AbortSignal` support;
  - centralized `401` handling and network-error normalization.
- Feature services expose small functions (`listProjects(params)`, `applyToProject(id, body)`) so pages do not construct URLs ad hoc.
- `useApi` handles `loading`, `data`, `error`, and `refetch`; abort on unmount; no global cache in MVP.
- Notifications poll every 60 seconds while authenticated, pause when the tab is hidden, and refresh on focus.
- Optimistic updates only for low-risk toggles (save/unsave, notification read) with rollback and toast on failure.

**Form architecture**

- Controlled forms with a `validate(values)` function per form; rules mirror the server.
- Submit flow: validate → set submitting → call service → map `422.fields` → success toast/redirect or error alert.
- Preserve user input on failure; focus the first invalid field; announce the error summary.
- Disable submit while pending; prevent double submission.
- No form library in MVP; if one is added, it must not hide error/accessibility behavior.

**Loading, error, and empty handling**

- Route-level `ErrorBoundary` plus a route skeleton/Suspense fallback.
- `PageState` component standardizes loading/empty/error/success branches.
- Toasts for background actions; inline alerts for form/page failures.
- `OfflineBanner` listens to browser online/offline events and disables writes with an explanation.
- 404/403/500 pages are real routes, not blank screens.
- Images fail gracefully to generated covers/initials.

**Layouts**

- `PublicLayout`: navbar/footer, skip link, max-width content.
- `DashboardLayout`: dark sidebar, topbar with page title, notification bell, user menu; mobile off-canvas drawer.
- `WorkspaceLayout`: project header, progress, tabs, owner/admin context banner, outlet.
- `AdminLayout`: dense nav, table-oriented content, clear "Admin" context.
- Layouts never fetch authorization themselves; they receive or load a verified session/project context and render accordingly.

**Styling approach**

- Plain CSS with design tokens and a consistent BEM-like naming convention; no Tailwind or CSS-in-JS in MVP.
- Mobile-first media queries; component states co-located or grouped by domain.
- Global reset/tokens; page-specific styles kept small.
- Avoid inline styles except for dynamic values (progress width, avatar color index) and document them.

**Frontend performance**

- Lazy-load admin, workspace, and heavy form routes.
- Keep the dependency list small; no icon library if a local icon component works.
- Use `loading="lazy"` and explicit dimensions for remote images.
- Fonts: `display=swap`, preconnect, limited weights.
- Avoid fetching full lists when a dashboard preview only needs counts/five rows.
- Debounce search; cancel stale requests; paginate.

---

## 5. Page-by-page direction

### 5.1 Home `/`

**Goal:** Explain FLEXI in one screen and make discovery irresistible.

1. **Navigation:** wordmark, Projects, About, Contact, Log in, Sign up. Signed-in users see Dashboard and avatar menu instead.
2. **Hero:** two-column editorial layout.
   - Left: mono eyebrow, display headline, support copy, primary "Explore projects" + secondary "Start a project", small social proof ("12 live projects · 48 students · 3 colleges" as demo data).
   - Right: layered project cards with skills, avatar stacks, status chips, slot/progress meters; subtle entrance stagger.
3. **How it works:** four numbered steps (Publish, Match, Build, Showcase) with short copy and a thin connecting line.
4. **Featured projects:** three live project cards from the API (or designed demo placeholders in early phases), each with status, skills, team, and deadline.
5. **Skill constellation:** interactive-looking skill chips grouped by category; clicking navigates to filtered discovery. Include a clear text alternative.
6. **Showcase strip:** completed project cards with outcome, team, and links.
7. **Testimonial/principle band:** one strong quote or three principles; no fake logos.
8. **Final CTA:** "Your next teammate is already on campus." with signup and discovery.
9. **Footer:** navigation, legal/privacy link, contact, college attribution.

**Mobile:** hero stacks; collage becomes a horizontally scrollable card strip with no hidden content; CTAs full-width.

### 5.2 About `/about`

- Editorial headline: "Built for the messy middle of student projects."
- Problem/approach split with large numbers or short facts.
- "What FLEXI is / is not" two-column list.
- How it works, team/college section, principles, CTA.
- No stock team photos; use initials/avatar placeholders unless real images are provided.

### 5.3 Contact `/contact`

- Split layout: left form, right contact information and FAQ.
- Fields: name, email, subject, message; visible labels; character count for message; honeypot hidden from users and assistive tech (`tabindex=-1`, `aria-hidden`).
- Inline validation on blur/submit; submit button shows progress and disables.
- Success replaces the form with a confirmation panel and "Send another message".
- Error preserves input and offers retry.
- Rate-limit message is specific and non-accusatory.

### 5.4 Authentication `/login`, `/signup`

- Split-screen: left brand panel with wordmark, one-line value proposition, a small project-card illustration; right form card.
- Mobile: compact brand strip above the form; no split panel.
- Login: email, password, show/hide password, submit, link to signup.
- Signup: name, email, password, confirm password, terms acknowledgment, submit, link to login.
- Password requirements displayed before submission and updated live.
- Generic login error for invalid credentials; field-specific signup errors.
- `autocomplete`: `name`, `email`, `new-password`, `current-password`.
- Return-to path preserved after login.
- Optional deferred: forgot-password link should not appear until the feature exists.

### 5.5 Discovery `/projects`

- Page header: "Find a project worth joining." + result count.
- Sticky search bar with debounced input (300 ms).
- Desktop: left filter rail (skills, tech, category, status, sort), results grid 2–3 columns.
- Mobile: filter button opens a bottom sheet/drawer with apply/reset; active filters shown as removable chips.
- Project card: cover/initials, status badge, title, summary, owner avatar/name, required skills, team slots meter, deadline, save button.
- Sort: newest, deadline, popular, open slots.
- Pagination: numbered pages or "Load more" with a page count; preserve filters in URL query string.
- Loading: card skeletons matching final dimensions.
- Empty: illustration/line art, explanation, reset filters.
- Error: inline alert with retry, existing filters preserved.
- Save button: optimistic toggle with rollback and toast; unauthenticated click prompts login and returns to the same filtered URL.

### 5.6 Project detail `/projects/:id`

- Hero: title, status, summary, owner card, deadline, team size, skills, and contextual actions: Apply (eligible non-member), Save, Edit (owner), Open workspace (owner or member), and Report.
- Sticky apply panel on desktop: team slots, required skills, application CTA, owner response expectations.
- Sections: about/description, required skills, team roster, milestones (public summary only), repository/demo links, report link.
- Owner/member sees workspace CTA instead of apply.
- Applicant sees application status ("Pending · applied 3 days ago") and withdraw action.
- Archived/draft: banner explaining visibility; archived project not applyable.
- Report link opens a modal with reason and details; confirmation.
- 404 for hidden/private projects without leaking existence.
- Mobile: apply panel becomes a sticky bottom action bar with safe-area padding.

### 5.7 Student profile `/students/:id`

- Header: initials avatar, name, headline, college/course/year, availability, links.
- Skill chips grouped by category.
- Public projects grid with status and role.
- "Member since" and completed project count.
- Owner of the profile sees "Edit profile" instead of a contact action.
- No email, role, admin flags, or private project data.

### 5.8 Dashboard `/dashboard`

**Layout:** dark ink sidebar (desktop), warm canvas, top bar with page title, search shortcut (future), notification bell with unread badge, avatar menu.

- Student overview: greeting, four stat cards (Active applications, Teams, Saved, Completed), "Next up" tasks, application status list, recommended/live projects, recent notifications.
- Owner overview: owned projects, pending applications, projects nearing deadline, upcoming milestones, completed count.
- Empty states teach the next action, e.g. "You have not joined a team yet. Explore projects."
- Sidebar navigation is role-aware:
  - Student: Overview, My projects, My applications, Saved, Notifications, Profile.
  - Owner adds received applications within project flows.
  - Admin sees an "Admin" section only if role is admin.
- Stats use display type and short labels; not giant decorative numbers without meaning.
- Every card links to the full list it summarizes.

### 5.9 My projects / received applications

- My projects: filter by status, card row with role badge, open slots, progress, pending application count, actions.
- Received applications: project selector or grouped by project; applicant card with skills, message, applied date; Accept/Reject controls with confirmation.
- Accept confirmation explicitly states capacity consequence.
- Rejected/accepted rows are visually distinct and show decision time.
- Empty: "No applications yet. Share your project link."

### 5.10 Workspace

**Header:** project title, status, progress, deadline, team avatar stack, owner actions (Edit, Complete, Archive), back to project.
**Tabs:** Overview, Tasks, Milestones, Team, Applications (owner only).

- **Overview:** project summary, progress, next milestone, recent tasks, pending applications count, quick actions.
- **Tasks:** board (To do / In progress / Done) on desktop with list alternative; filters by assignee/milestone/status. Drag-and-drop is optional; every drag action has keyboard-accessible menu alternatives. Task cards show priority, assignee, due date, overdue state.
- **Milestones:** vertical timeline with status, due date, completed date, linked task counts, progress; owner can add/edit/complete/delete.
- **Team:** owner, members, skills, roles; no member removal in MVP.
- **Applications:** pending queue, accepted/rejected history, applicant profile drawer.
- **Read-only admin:** visible amber banner: "Admin view — moderation only"; all write controls hidden/disabled.

### 5.11 Admin

- Denser but same design language; dark sidebar, light tables.
- Overview: counts for active users, live projects, pending applications, open reports, new messages; recent moderation activity.
- Users: search, role/active filters, table with status, last login, actions; confirmation for deactivation/promotion.
- Projects: search/status/hidden filters; owner, team, reports count; hide/restore with reason.
- Messages: inbox list + detail pane; status chips; internal note; no public reply in MVP.
- Reports: queue oldest-first; target context; resolve/dismiss with note; link to hide project/deactivate user.
- Destructive-looking actions require confirmation and explain reversibility.
- Admin tables must be usable at 768 px (card rows or horizontal scroll with sticky first column).

### 5.12 Error and fallback pages

- 404: friendly, search/discovery CTA, no technical stack.
- 403: "You do not have access to this studio." with dashboard link.
- 500/error boundary: "Something broke on our side." retry and contact link.
- Offline/network error: banner, retry, cached content where possible.
- Session expired: modal/toast and redirect to login with return path.

---

## 6. Component inventory

Components are planned for `client/src/components/` (Phase 1+). Every interactive component needs default, hover, focus-visible, active, disabled, and where relevant loading/error states.

### 6.1 Layout and navigation

| Component | Notes |
| --- | --- |
| `AppShell` | Global providers, skip link, outlet |
| `PublicLayout` | Navbar + main + footer |
| `DashboardLayout` | Sidebar, topbar, content outlet, mobile drawer |
| `AdminLayout` | Admin nav variant, dense content width |
| `WorkspaceLayout` | Project header + tabs + outlet |
| `Navbar` | Public/auth states, mobile menu |
| `SidebarNav` | Role-aware links, active indicator, collapse behavior |
| `Footer` | Navigation, attribution, contact |
| `Breadcrumbs` | Project/workspace/admin hierarchy |
| `Tabs` | Keyboard arrow navigation, URL-synced |
| `UserMenu` | Avatar, profile, dashboard, logout |
| `NotificationBell` | Unread count, dropdown preview, link to inbox |

### 6.2 Forms and input

| Component | Notes |
| --- | --- |
| `Button` | Variants: primary, secondary, ghost, danger; sizes sm/md/lg; loading, disabled, icon |
| `IconButton` | Accessible label required; 44 px target |
| `Input` | Label, hint, error, prefix/suffix, character count |
| `Textarea` | Auto-resize, count, error |
| `Select` | Native select styled for reliability; custom menu only if keyboard-tested |
| `Checkbox` / `Radio` | Large target, visible label |
| `PasswordInput` | Show/hide with accessible toggle |
| `SkillInput` | Tag entry with suggestions, deduplication, max count |
| `FormField` | Label + control + hint + error wrapper, `aria-describedby` |
| `FormActions` | Submit/cancel alignment, loading state |
| `SearchBar` | Debounced, clear button, keyboard shortcut optional |
| `FilterPanel` | Desktop rail / mobile drawer, active chips, reset |
| `FileUpload` | Not in MVP; only if the scope changes |
| `DatePicker` | Native date input first; avoid custom calendar unless needed |

### 6.3 Data display

| Component | Notes |
| --- | --- |
| `ProjectCard` | Status, title, summary, owner, skills, slots, deadline, save |
| `ProjectGrid` | Responsive grid + skeletons + empty/error slots |
| `ProjectHeader` | Detail/workspace title, status, actions |
| `StudentCard` | Avatar, name, headline, skills, availability |
| `Avatar` / `AvatarStack` | Initials fallback, deterministic colors, max visible + overflow |
| `Badge` | Status, role, priority; text + color |
| `Chip` / `SkillTag` | Removable variant for filters |
| `StatCard` | Label, value, delta/context, link |
| `ProgressBar` | Segmented or solid; `role=progressbar`, accessible value text |
| `SlotMeter` | Filled/open team capacity, text alternative |
| `TaskItem` / `TaskCard` | Title, assignee, due date, priority, status, menu |
| `TaskBoard` | Columns, keyboard alternative, empty columns |
| `MilestoneTimeline` | Vertical timeline, status, linked tasks |
| `ApplicationCard` | Applicant, skills, message, decision actions |
| `DataTable` | Admin users/projects; sticky header, sortable where documented, mobile card fallback |
| `Pagination` | Page numbers, prev/next, current page, disabled bounds |
| `EmptyState` | Line art/icon, headline, explanation, action |
| `Skeleton` | Text/card/table variants; no layout shift |
| `Tooltip` | Supplemental only; keyboard and touch accessible |

### 6.4 Feedback and overlays

| Component | Notes |
| --- | --- |
| `Toast` / `ToastViewport` | Success, error, info; `aria-live`; auto-dismiss with pause on hover/focus |
| `Alert` | Inline error/info/warning/success; not a replacement for field errors |
| `Modal` / `ConfirmDialog` | Focus trap, Escape, backdrop click policy, return focus, scroll lock |
| `Drawer` | Mobile nav/filter; focus trap and close control |
| `Spinner` | Button-level only; `aria-label` |
| `ErrorBoundary` | Route-level fallback with retry |
| `PageState` | Wraps loading/empty/error/success for consistent pages |
| `RouteAnnouncer` | Announces page changes for assistive tech |
| `OfflineBanner` | Network status and retry |

### 6.5 Workspace and admin domain components

| Component | Notes |
| --- | --- |
| `ProgressOverview` | Overall project progress + task counts |
| `TeamRoster` | Owner/member cards, skills |
| `ApplicationDecisionPanel` | Accept/reject with capacity messaging |
| `MilestoneForm` | Title, due date, description, order |
| `TaskForm` | Assignee restricted to team, milestone selector |
| `ReportModal` | Target type, reason, details |
| `AdminStatGroup` | Platform counts |
| `ModerationTable` | Users/projects with status and actions |
| `MessageInbox` | List + detail, status, internal note |
| `ReportQueue` | Queue + detail + resolution |
| `SaveButton` | Optimistic toggle, login prompt, accessible pressed state |

---

## 7. Forms and validation UX

- Labels are always visible; placeholders are examples, not labels.
- Mark optional fields; required fields are indicated once at the top and per field where useful.
- Validate on blur and on submit; do not show errors while the user is still typing the first value.
- Error text sits directly below the field, is linked with `aria-describedby`, and sets `aria-invalid`.
- Focus the first invalid field on submit and announce a summary.
- Submit button disables and shows progress; prevent double submission.
- Server `422` field errors map to the same field components; non-field errors appear in an alert.
- Destructive actions use a confirmation with the object name and consequence.
- Password fields have show/hide controls with accessible labels and no autofill interference.
- Character counters appear only for fields with tight limits (summary, message, bio).
- Preserve entered data on failure; never clear a form because of a network error.
- Autocomplete hints: name, email, current-password, new-password, organization, url.
- Mobile keyboards use appropriate `inputMode`/`type` (`email`, `url`, `numeric` for year).

### 7.1 Validation copy examples

| Field | Error |
| --- | --- |
| Email | `Enter a valid email address.` |
| Password | `Use at least 8 characters, including a letter and a number.` |
| Confirm password | `Passwords do not match.` |
| Project title | `Give your project a title between 3 and 120 characters.` |
| Team size | `Team size must be between 2 and 12, including you.` |
| Application message | `Write at least 20 characters so the owner can understand your fit.` |
| Report details | `Add enough detail for a moderator to review this report.` |

---

## 8. States and feedback

| State | Pattern |
| --- | --- |
| Initial page loading | Route skeleton matching final layout; no centered spinner for content pages |
| List loading | 3–6 skeleton cards/rows, reserved dimensions |
| Button submitting | Spinner + label change (`Sending…`, `Saving…`), disabled, prevent duplicate |
| Optimistic action | Immediate UI + rollback + toast on failure (save, notification read) |
| Empty (first use) | Helpful explanation + primary action, not "No data" |
| Empty (filters) | Explain filters, show reset action, preserve search context |
| Error (page) | Inline alert with retry; keep filters/input |
| Error (field) | Field-level message + focus management |
| Error (auth) | Generic credentials message; preserve email |
| Error (403/404) | Dedicated page, safe navigation; no private data |
| Success | Toast for background actions; inline confirmation for forms |
| Rate limited | Specific wait guidance; do not blame the user |
| Offline | Banner, retry, disable writes with explanation |
| Read-only | Visible banner + disabled/hidden write controls |
| Archived/hidden | Badge/banner explaining visibility and available actions |

---

## 9. Responsive behavior

| Breakpoint | Width | Behavior |
| --- | --- | --- |
| `xs` | 320–479 | Single column; full-width buttons; compact cards; bottom sheets; 44 px targets |
| `sm` | 480–767 | Single column with wider gutters; two-up chips/cards where useful |
| `md` | 768–1023 | 8-column grid; two-column discovery; sidebar becomes off-canvas; tables become card rows |
| `lg` | 1024–1279 | 12-column grid; dashboard sidebar visible; discovery filter rail |
| `xl` | 1280+ | Max 1240 px content; comfortable whitespace; sticky detail panels |

Specific rules:

- Public navbar: links collapse into a labeled menu button below 1024 px; menu is a focus-trapped drawer.
- Dashboard sidebar: off-canvas below 1024 px, with a visible current-page label in the top bar.
- Discovery: filter rail becomes a filter button + bottom sheet; active filter chips remain visible.
- Project detail: sticky apply panel becomes a bottom action bar on mobile; ensure content has bottom padding.
- Workspace task board: horizontal scroll with snap columns and a "List" toggle; never drag-only.
- Tables: below 768 px use stacked definition rows or a horizontally scrollable table with a sticky first column; do not shrink text below 14 px.
- Modals: full-height bottom sheets on mobile where appropriate; close control always visible.
- Forms: one column; inputs full width; keyboard does not cover the submit button (safe-area padding).
- Typography: fluid clamps; no text below 12 px; body remains 16 px on mobile.

---

## 10. Accessibility requirements

Target **WCAG 2.1 AA** for core journeys.

- Semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`) and one `h1` per page with ordered headings.
- A skip link to main content as the first focusable element.
- Visible `:focus-visible` ring: 2 px cobalt, 2 px offset, on every interactive element.
- All controls reachable and operable by keyboard; no keyboard traps outside modals.
- Modals/drawers: focus trap, Escape to close, restore focus to the trigger, `aria-modal`, labelled by title.
- Buttons use `<button>`; navigation uses `<a>`/`Link`; do not attach click handlers to non-interactive `div`s.
- Form labels are programmatic; errors use `aria-describedby` and `aria-invalid`; required fields use `required`/`aria-required`.
- Errors and toasts use `role="alert"`/`aria-live` appropriately; avoid double announcements.
- Status is never conveyed by color alone: include text labels and icons where useful.
- Progress uses `role="progressbar"` with `aria-valuemin/max/now` and a text equivalent.
- Loading regions use `aria-busy`; skeletons are not focusable; announce when content is ready where needed.
- Images have alt text; decorative art has empty alt; avatar images fall back to initials with a text label.
- Link text is descriptive; avoid "click here".
- Table headers use `<th scope>`; captions describe the table.
- Text contrast meets 4.5:1 body and 3:1 large text; non-text UI boundaries meet 3:1 where required.
- Touch targets are at least 44×44 px; spacing prevents accidental activation.
- Respect `prefers-reduced-motion`; disable non-essential transforms and smooth scrolling.
- Page changes update `document.title` and announce the new page.
- Language is set on `<html lang="en">`; any user-generated content is rendered as text, not HTML.
- Tooltips are supplemental and dismissible; essential info is visible without hover.
- No time-limited interactions except rate-limit guidance; no auto-advancing carousels.

### 10.1 Accessibility verification

- Keyboard-only pass for: signup, login, discovery filters, project create, application decision, task update, admin hide/restore.
- Screen-reader spot check (VoiceOver on macOS/Safari or NVDA on Windows) for forms, modals, notifications, and tables.
- Automated axe checks on every core page, with manual review of false positives.
- Contrast check on all tokens and state combinations.
- Zoom to 200% and 400% reflow check; no loss of content or functionality.
- Reduced-motion check.

---

## 11. Content and tone guidelines

- Use plain, specific language. "Find a project worth joining" beats "Discover synergies".
- Prefer verbs: Publish, Apply, Review, Accept, Complete, Archive.
- Explain consequences before destructive or capacity-changing actions.
- Avoid fake urgency, gamification, and inflated claims.
- Demo numbers or testimonials must be labeled as demo content; never imply real institutional partnerships.
- Empty states teach; error states help; success states point to the next step.
- Dates: relative for recent activity ("2 hours ago"), absolute for deadlines ("Due 14 Nov 2026").
- No lorem ipsum in committed UI.

---

## 12. Design system implementation (Phase 1, implemented)

**Implemented structure:**

```text
client/
  src/
    styles/
      tokens.css          # colors, type scale, spacing, radii, shadows, motion
      global.css          # reset, base elements, focus, skip link
      components.css      # shared primitive and state styles
      preview.css         # preview page layout and responsive behavior
    components/
      ui.jsx              # Button, TextField, Badge, Avatar, Card, Dialog, Toast...
      icons.jsx           # inline icon set
    App.jsx               # labeled design-preview composition
```

Phase 1 intentionally keeps primitives in one `ui.jsx` module so the foundation stays reviewable. Split it into feature folders only when real page boundaries exist.

**Phase 1 deliverables — implemented**

- CSS custom properties for the palette, type scale, spacing, radii, shadows, motion, and z-index.
- Global reset, base typography, focus treatment, selection color, and skip link.
- Primitive components with keyboard, hover, active, disabled, loading, error, empty, success, and responsive behavior.
- A design preview page showing colors, type, actions, cards, badges, avatars, progress, fields, alerts, dialog, toast, and states.
- Fonts loaded with `display=swap` and fallbacks; Google Fonts with preconnect.
- Headless browser contrast and layout checks at 320/360/390/768/1024/1280/1440.
- No feature-specific page implementation beyond the gallery and shared preview shell.

**Verification:** `npm run lint` and `npm run build` pass; browser QA reports no console errors, failed requests, or horizontal overflow. See `../../server/docs/TEST_PLAN.md` for evidence. Phase 2 added backend test tooling only; automated frontend component and E2E tests remain deferred to a later frontend phase.

**Design non-goals for MVP**

- Dark mode (the admin/dashboard sidebar is dark, but no full theme toggle).
- Custom cursor, heavy parallax, scroll-jacking, 3D scenes.
- Glassmorphism, neon gradients, gradient text.
- Photo-heavy hero or stock imagery.
- Animated page transitions that delay navigation.
- A separate native mobile app.

---

## 13. UI acceptance checklist (Phase 1 and per page)

### Design system

- [x] Palette, type, spacing, radius, shadow, and motion tokens are implemented once and reused.
- [x] Buttons, inputs, cards, badges, avatars, dialogs, toasts, and empty/error/loading states exist.
- [x] Focus-visible, hover, active, disabled, and loading states are visually distinct.
- [x] Contrast checks pass for body text, buttons, badges, and form boundaries.
- [x] Reduced-motion behavior is implemented.
- [x] No component relies on color alone to communicate status.

### Public pages

- [ ] Home communicates the product in one screen and has working discovery/signup CTAs.
- [ ] About and Contact are complete and responsive.
- [ ] Login/Signup forms are labeled, validated, and usable on mobile.
- [ ] Discovery filters, sort, pagination, save, and empty/error states work.
- [ ] Project detail shows status, team, skills, and the correct action for guest/student/owner/member.
- [ ] Public profile exposes no private data.

### Authenticated pages

- [ ] Sidebar/topbar navigation is role-aware and keyboard accessible.
- [ ] Dashboard counts match the underlying lists.
- [ ] Applications show capacity consequences and decision results clearly.
- [ ] Workspace tabs are usable on mobile; task board has a non-drag alternative.
- [ ] Milestones and progress are visually consistent with task data.
- [ ] Notifications have unread, read, and empty states.

### Admin pages

- [ ] Admin navigation is visually separated and inaccessible to non-admins.
- [ ] Tables are legible and operable on mobile.
- [ ] Hide/restore, deactivate, and report resolution require confirmation and show outcomes.
- [ ] Admin read-only context is explicit in workspaces.

### Quality

- [ ] Keyboard-only and screen-reader spot checks pass. Keyboard checks pass for the skip link, menu, form, toast, and dialog; screen-reader testing is still pending feature pages.
- [x] No horizontal scroll at 320 px except intentional board/table containers.
- [x] Loading skeletons reserve space and do not cause layout shift.
- [x] Errors preserve user input and offer a next action.
- [x] Copy is specific and free of lorem ipsum.
