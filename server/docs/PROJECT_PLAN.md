# FLEXI — Project Plan

| Field | Value |
| --- | --- |
| Product | FLEXI — Student Project Collaboration Studio |
| Phase | Phase 2 — Backend foundation and data layer |
| Status | Phase 1 committed; Phase 2 backend/data-layer foundation implemented and locally verified; authentication and feature APIs not started |
| Date | 2026-10-26 |
| Repository state | Local repository with Phases 0, 1, and 2 committed; no personal remote configured |
| Related plans | `DATABASE_PLAN.md`, `API_PLAN.md`, `SECURITY_PLAN.md`, `TEST_PLAN.md`, `../../client/docs/UI_UX_PLAN.md` |

> Feature and API behavior in this document remains **planned**. Phase 1 implements the frontend design foundation and a labeled preview page. Phase 2 adds the backend shell, health/error handling, MongoDB connection, nine Mongoose models with indexes, and backend tests; authentication, seed data, and feature workflows are not connected yet.

---

## 1. Executive summary

FLEXI is a full-stack MERN web application where college students publish project ideas, discover work worth joining, find teammates with complementary skills, apply to teams, coordinate tasks and milestones, and present completed work as evidence of their abilities.

The reference project proves a basic React + Express + MongoDB setup, but it is a teaching scaffold rather than a product: it has placeholder pages, a single `student` collection, no authorization middleware, hard-coded secrets, no validation, and no tests. FLEXI preserves the two-part `client` / `server` architecture and the approachable JavaScript stack, while replacing the weak parts with a documented, testable design.

The realistic MVP is a complete collaboration loop:

1. A student creates an account and a skill-rich profile.
2. They publish or discover a project.
3. They apply, and the owner accepts or rejects the application.
4. Accepted members enter a private workspace with tasks and milestones.
5. Progress and notifications keep the team aligned.
6. Completed work appears in the public showcase.
7. An administrator can moderate content, users, messages, and reports.

Real-time chat, file uploads, social login, email infrastructure, recommendation algorithms, and other high-cost features are explicitly deferred.

---

## 2. Problem statement

College students often have project ideas but struggle to find reliable teammates with the right mix of skills. Coordination then happens across scattered WhatsApp groups, shared drives, and verbal agreements. As a result:

- Students with good ideas cannot find collaborators outside their immediate friend circle.
- Students who want experience cannot easily discover projects that need their skills.
- Team roles, applications, and decisions are undocumented.
- Tasks, deadlines, and milestones are tracked inconsistently.
- Completed work is difficult to showcase credibly to peers, faculty, and recruiters.
- Faculty or administrators have no lightweight way to review reported or inappropriate content.

FLEXI solves this by providing one structured studio: discovery, team formation, application decisions, project execution, progress tracking, and a public showcase, with role-based permissions and moderation.

**Problem statement in one sentence:** Students need a trustworthy, skill-aware place to turn isolated project ideas into organized teams and visible, completed work.

---

## 3. Objectives and expected outcomes

### 3.1 Product objectives

| ID | Objective | Expected outcome |
| --- | --- | --- |
| O1 | Make project discovery useful | Students can find projects by keyword, skill, category, and availability |
| O2 | Make team formation explicit | Applications and decisions are recorded, capacity is enforced, and duplicate applications are impossible |
| O3 | Make collaboration organized | Each team has a private workspace with tasks, milestones, assignees, and computed progress |
| O4 | Make skills visible | Profiles expose skills, interests, links, and completed projects |
| O5 | Make completed work credible | Completed projects are publicly browsable with team and outcome details |
| O6 | Keep the platform safe | Authentication, authorization, validation, rate limits, and moderation are enforced server-side |
| O7 | Produce a defensible college submission | Clear architecture, documentation, test evidence, seeded demo data, and a live deployment |

### 3.2 Learning outcomes

- Design and explain a normalized MongoDB schema with references and indexes.
- Build a REST API with layered routing, controllers, services, models, and middleware.
- Implement secure authentication and role-based authorization.
- Handle a concurrency-sensitive workflow (accepting the last team slot) correctly.
- Build a responsive React SPA with protected routes and reusable components.
- Test critical backend and frontend flows and deploy with environment-managed secrets.

### 3.3 Success measures

- All mandatory pages and MVP acceptance criteria pass.
- The end-to-end collaboration journey works on desktop and mobile.
- Unauthorized and cross-user access attempts return `401` or `403`, never data.
- The last-slot acceptance race produces exactly one accepted member.
- No secret, credential, or `node_modules` directory is committed.
- A new evaluator can run the project from the README and environment examples.

---

## 4. Target users and needs

### 4.1 Personas

| Persona | Context | Primary needs | Frustrations |
| --- | --- | --- | --- |
| Aarav, 3rd-year CSE student | Has a hackathon idea, needs a designer and a backend partner | Publish a clear idea, state required skills, review applicants | Friends are busy; group chats lose decisions |
| Meera, 2nd-year design student | Wants real project experience outside her course | Discover projects needing UI/UX, assess commitment, apply | Cannot tell which projects are active or serious |
| Rohan, final-year project lead | Owns a capstone team of four | Manage tasks, milestones, deadlines, and progress | Work is scattered; no single source of truth |
| Prof. Nair, faculty coordinator | Oversees student activity and reports | Review reported projects, deactivate abusive accounts, read contact messages | No visibility into student project content |
| Guest visitor | Evaluating the platform or a shared project | Browse public projects and profiles without an account | Forced signup before seeing value |

### 4.2 User needs summary

- **Trust:** real profiles, clear project status, documented decisions.
- **Speed:** search, filters, sorting, and saved projects.
- **Clarity:** one workspace with owners, members, tasks, and milestones.
- **Proof:** a shareable showcase of completed work.
- **Safety:** reporting and moderation.

---

## 5. Roles and permission boundaries

FLEXI has two **global roles** (`student`, `admin`) and two **project-scoped relationships** (`owner`, `member`). Project ownership is not a global role and must never be stored as one.

| Capability | Guest | Student | Project owner | Project member | Admin |
| --- | --- | --- | --- | --- | --- |
| View Home, About, public project list/detail, public profiles | Yes | Yes | Yes | Yes | Yes |
| Submit contact form | Yes | Yes | Yes | Yes | Yes |
| Register, log in | Yes | Yes | Yes | Yes | Yes |
| Edit own profile | No | Yes | Yes | Yes | Yes |
| Create project | No | Yes | Yes | Yes | No (moderation only) |
| Edit/archive own project | No | No | Yes | No | Hide/restore only |
| Apply to another project | No | Yes | Yes, to others | Yes, to others | No |
| Decide applications | No | No | Yes, own project | No | No |
| View private workspace | No | No | Yes | Yes | Read-only for moderation |
| Create/assign tasks | No | No | Yes | Create; assign self only | No |
| Update tasks | No | No | Yes | Assigned/created tasks only | No |
| Manage milestones | No | No | Yes | View only | No |
| Save projects | No | Yes | Yes | Yes | No |
| Receive notifications | No | Yes | Yes | Yes | Yes |
| Submit report | No | Yes | Yes | Yes | Yes |
| Admin dashboard, users, messages, reports | No | No | No | No | Yes |
| Deactivate users, hide projects | No | No | No | No | Yes |
| Impersonate users | No | No | No | No | No |

### 5.1 Permission rules

- The server is the source of truth. Hiding a button is a UX convenience, not security.
- `owner` is the user referenced by `project.owner`; `member` means the user's ID is in `project.members`.
- A user cannot apply to, accept themselves into, or review an application for their own project.
- An admin may read private content for moderation but may not submit applications, decide applications, complete projects, or impersonate users.
- A deactivated user cannot authenticate or perform writes; their public profile may display as unavailable.
- The last active admin cannot be deactivated or demoted.

---

## 6. Functional requirements

Priority uses MoSCoW: **M** = must for MVP, **S** = should, **C** = could, **W** = won't in this release.

### 6.1 Public website

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-01 | Home page explains FLEXI and links to discovery and signup | M |
| FR-02 | About page explains purpose, audience, and team | M |
| FR-03 | Contact page submits a validated message to the backend | M |
| FR-04 | Responsive navigation, footer, and skip link | M |
| FR-05 | Public project discovery with search, filters, sort, pagination | M |
| FR-06 | Public project detail page with owner, skills, team, and status | M |
| FR-07 | Public student profile with skills and public projects | M |
| FR-08 | Public showcase of completed projects | S |
| FR-09 | 404 and generic error pages | M |

### 6.2 Accounts and profiles

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-10 | Sign up with name, email, password; unique normalized email | M |
| FR-11 | Log in and log out with secure session handling | M |
| FR-12 | Persistent session across refresh via server-verified cookie | M |
| FR-13 | Edit name, headline, bio, college, course, year, skills, links, availability | M |
| FR-14 | Avatar via initials or validated image URL; no file upload in MVP | S |
| FR-15 | Change password with current-password verification | S |
| FR-16 | Email verification and password reset by email | W (deferred) |
| FR-17 | OAuth / social login | W (deferred) |

### 6.3 Projects

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-18 | Create a project with title, summary, description, category, tech stack, required skills, team size, deadline | M |
| FR-19 | Save as draft or publish as recruiting | M |
| FR-20 | Edit own project with server-side field whitelist | M |
| FR-21 | Archive own project; hard-delete only an untouched draft | M |
| FR-22 | Enforce team size between 2 and 12, including the owner | M |
| FR-23 | Search and filter by text, skill, tech, category, status, and open slots | M |
| FR-24 | Sort by newest, deadline, popularity, or open slots | M |
| FR-25 | Save and unsave projects | M |
| FR-26 | Private/invite-only projects | W (deferred) |
| FR-27 | Cover-image upload | W (deferred) |

### 6.4 Applications and team formation

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-28 | Apply to a recruiting project with a message and relevant skills | M |
| FR-29 | Block self-application, duplicate application, closed project, and full team | M |
| FR-30 | Owner views applications with applicant profiles | M |
| FR-31 | Owner accepts or rejects a pending application | M |
| FR-32 | Acceptance atomically checks capacity and adds the member | M |
| FR-33 | Auto-close recruiting when the team becomes full | M |
| FR-34 | Applicant withdraws a pending application | M |
| FR-35 | Notify applicant and owner of relevant application events | M |
| FR-36 | Member removal, ownership transfer, invitations | W (deferred) |

### 6.5 Workspace, tasks, and milestones

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-37 | Private workspace for owner, members, and read-only admin moderation | M |
| FR-38 | Create, edit, assign, complete, and delete tasks | M |
| FR-39 | Task fields: title, description, status, priority, assignee, due date, milestone | M |
| FR-40 | Task statuses: `todo`, `in_progress`, `done`; overdue is derived | M |
| FR-41 | Create, edit, reorder, complete, and delete milestones | M |
| FR-42 | Project progress computed from completed tasks, not manually entered | M |
| FR-43 | Milestone deletion blocked while tasks reference it | M |
| FR-44 | Board/list view and filters by status, assignee, milestone | S |
| FR-45 | Comments, attachments, activity feed, time tracking | W (deferred) |

### 6.6 Dashboards and notifications

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-46 | Student dashboard: applications, teams, saved projects, upcoming tasks, unread notifications | M |
| FR-47 | Owner dashboard: owned projects, pending applications, deadlines, completed projects | M |
| FR-48 | Notifications for application, decision, assignment, milestone due, project completion | M |
| FR-49 | Notification list, unread count, mark one/all read | M |
| FR-50 | Polling refresh; real-time WebSocket delivery | S / W (deferred) |
| FR-51 | Project completion by owner, with completed timestamp and showcase eligibility | M |

### 6.7 Administration and moderation

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-52 | Admin dashboard with platform counts | M |
| FR-53 | Admin user list, role change, deactivate/reactivate | M |
| FR-54 | Admin project list and hide/restore | M |
| FR-55 | Contact-message inbox with status and internal note | M |
| FR-56 | Report project or user, admin report queue and resolution | M |
| FR-57 | Prevent last-admin deactivation and self-demotion | M |
| FR-58 | Admin audit log of moderation actions | S |
| FR-59 | Bulk moderation, CSV export, advanced analytics | W (deferred) |

### 6.8 Platform requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-60 | Health endpoint and structured API error envelope | M |
| FR-61 | Seed script with demo students, projects, applications, tasks, and admin | M |
| FR-62 | Environment examples, run instructions, and API documentation | M |
| FR-63 | CI checks for lint, tests, and build | S |
| FR-64 | Real-time chat, file storage, payments, AI matching, mobile app | W (deferred) |

---

## 7. Non-functional requirements

| ID | Requirement | Acceptance signal |
| --- | --- | --- |
| NFR-01 | Responsive from 320 px to 1440 px+ | No horizontal scroll; usable navigation and forms at 320, 768, 1024, 1440 |
| NFR-02 | WCAG 2.1 AA for core journeys | Keyboard-only flow, visible focus, labeled fields, 4.5:1 body-text contrast, no color-only status |
| NFR-03 | Performance | Landing LCP under 2.5 s on a typical campus connection; API p95 under 500 ms for MVP data sizes |
| NFR-04 | Security | No IDOR, no role escalation, hashed passwords, validated input, rate-limited auth/contact |
| NFR-05 | Reliability | API errors return a consistent envelope; no unhandled promise crashes; health endpoint |
| NFR-06 | Maintainability | Layered backend, reusable frontend components, no duplicated authorization logic |
| NFR-07 | Testability | Backend integration tests with an isolated database; frontend component tests; critical E2E |
| NFR-08 | Compatibility | Current Chrome, Firefox, Safari, Edge; mobile Chrome and Safari |
| NFR-09 | Privacy | Public APIs never expose password hashes, emails, tokens, or private application notes |
| NFR-10 | Operability | `.env.example`, README, seed script, deployment checklist, no secrets in Git |
| NFR-11 | Accessibility of states | Loading, empty, error, success, and disabled states are designed, not improvised |
| NFR-12 | Scalability | Pagination on all lists; indexes for documented query paths; no unbounded collection scans for core screens |
| NFR-13 | Data integrity | Unique constraints and transactions protect applications and capacity |
| NFR-14 | Time handling | Store UTC; display in the viewer's local timezone; deadlines are dates with explicit interpretation |

---

## 8. Scope

### 8.1 MVP (must ship)

- Mandatory public pages: Home, Sign Up, Login, About, Contact.
- Student authentication, session persistence, logout, profile and skill tags.
- Project creation, draft/publish, editing, archiving, discovery with search/filter/sort/pagination.
- Applications with owner decisions, duplicate prevention, capacity enforcement, and a transaction-safe last-slot flow.
- Private workspace with tasks, milestones, assignees, due dates, and computed progress.
- Saved projects.
- Event-driven in-app notifications with polling.
- Student and owner dashboards.
- Contact-message persistence and admin inbox.
- Minimal admin moderation: users, project hide/restore, reports, message status.
- Responsive and accessible UI, backend/frontend tests, deployment, documentation.

### 8.2 Should ship if time allows

- Public student directory with skill filters.
- Showcase as a dedicated curated route.
- Task board drag-and-drop (keyboard-accessible alternative required).
- Admin audit log.
- CI pipeline with lint, unit, integration, and build checks.
- Notification preferences.

### 8.3 Deliberately deferred (scope creep control)

| Deferred feature | Why it is deferred | Revisit phase |
| --- | --- | --- |
| Real-time chat / WebSockets | High infrastructure and moderation cost; not needed to prove collaboration | After Phase 12 |
| File uploads / cloud storage | Security, storage, and cleanup complexity; initials avatars are sufficient | After Phase 12 |
| OAuth, email verification, password-reset email | Requires external providers and deliverability; local auth proves the concept | After Phase 12 |
| Recommendation / AI teammate matching | Needs data and evaluation; simple skill filters are enough for MVP | Future |
| Calendar sync, time tracking, comments, activity feed | Multiplies workspace scope without proving the core loop | Future |
| Team invitations, member removal, ownership transfer | Adds many edge cases; applications are the primary formation path | Phase 8+ if justified |
| Payments, subscriptions, mobile app, i18n, dark mode | Outside a college project's core value | Future |
| Admin bulk actions, exports, advanced analytics | Nice-to-have after moderation basics | Future |
| Project version history, templates | Low MVP value | Future |

### 8.4 Scope-creep guardrails

- No new collection without updating `DATABASE_PLAN.md` and `API_PLAN.md`.
- No endpoint without authentication, authorization, validation, and an error contract.
- No phase starts before its dependency phase meets its definition of done.
- A deferred feature can enter the MVP only by removing or delaying an equal-sized MVP item.
- UI polish must not outrank a failing critical-flow test.

---

## 9. Main user journeys

### Journey 1 — Visitor to applicant

1. Visitor lands on Home, understands the value, and selects "Explore projects".
2. Discovery shows published projects with skill and category filters.
3. Visitor opens a project and sees the owner, required skills, team size, and status.
4. To apply, they sign up, then complete their profile and skills.
5. They return to the project, write an application, and submit.
6. They see a pending application in "My applications" and receive notifications on decisions.

**Success:** application stored once; applicant cannot apply twice; owner sees the profile and message.

### Journey 2 — Owner publishes and forms a team

1. Student creates a project as a draft with title, summary, description, skills, and team size.
2. They preview and publish it as recruiting.
3. They share the public project link.
4. Applications arrive; the owner filters pending applications and opens applicant profiles.
5. The owner accepts the strongest applicant and rejects another.
6. The accepted applicant becomes a member; capacity is enforced; when the last slot is filled the project leaves recruiting and enters progress.

**Success:** no over-capacity; applicant notified; public page reflects membership safely (without private application data).

### Journey 3 — Team executes work

1. Owner and members open the workspace.
2. Owner creates milestones and tasks; members create tasks and can assign themselves.
3. Members move assigned tasks from `todo` to `in_progress` to `done`.
4. Progress and milestone timelines update from task state.
5. Overdue tasks and upcoming milestones appear on the dashboard and trigger notifications.

**Success:** only owner/members can read or write workspace data; progress is computed consistently.

### Journey 4 — Project completion and showcase

1. Owner reviews progress, closes or completes remaining tasks, and marks the project completed.
2. Members receive a completion notification.
3. The project appears in the public showcase with team, skills, repo, demo, and completed date.
4. Visitors can browse the proof of work without accessing private tasks or applications.

**Success:** completed projects are public; private workspace remains private.

### Journey 5 — Moderation

1. A student reports a project or user with a reason and details.
2. Admin sees the report queue and reviews the target.
3. Admin hides the project or deactivates the user, and records a resolution note.
4. The reporter receives a notification that the report was reviewed.
5. Contact messages are triaged separately in the admin inbox.

**Success:** admin actions are server-authorized; at least one active admin remains; no silent destructive deletes.

### Journey 6 — Saved projects

1. A signed-in student saves a project from discovery or detail.
2. The saved item appears in the dashboard with its current status.
3. Unsaving removes it; archived projects display an archived badge rather than disappearing unexpectedly.

**Success:** one saved record per user/project; toggling is idempotent.

---

## 10. Edge cases and failure handling

| Area | Edge case | Expected behavior |
| --- | --- | --- |
| Auth | Duplicate email with different casing | Normalize to lowercase; return `409 EMAIL_IN_USE` |
| Auth | Wrong email or password | Generic `401 INVALID_CREDENTIALS`; no user enumeration |
| Auth | Deactivated account | `403 ACCOUNT_DISABLED`; cookie cleared |
| Auth | Expired/invalid cookie | `401 UNAUTHENTICATED`; frontend redirects to login with return path |
| Auth | Password over bcrypt's 72-byte limit | Reject at validation with a clear message |
| Profiles | Invalid skill or link URL | Validation error; only `http`/`https` URLs |
| Projects | `teamSize` below current team | `409 TEAM_SIZE_BELOW_CURRENT` |
| Projects | Publish without required fields | `422 VALIDATION_ERROR` field map |
| Projects | Owner deletes published project | Archive instead of destructive delete; keep history |
| Projects | Owner deletes untouched draft | Hard delete; cascade saved records/notifications if any |
| Discovery | Invalid ObjectId | `400 INVALID_ID`, not a 500 |
| Discovery | Out-of-range page | Empty page with correct meta, not an error |
| Discovery | Invalid sort key | `400 INVALID_SORT`; whitelist only |
| Applications | Self-application | `403 CANNOT_APPLY_TO_OWN_PROJECT` |
| Applications | Duplicate application | `409 APPLICATION_ALREADY_EXISTS` |
| Applications | Apply to full/closed/archived project | `409 PROJECT_NOT_RECRUITING` |
| Applications | Two accepts for the last slot | Exactly one succeeds; other gets `409 TEAM_FULL` |
| Applications | Applicant withdraws after decision | `409 APPLICATION_ALREADY_DECIDED` |
| Applications | Owner decides twice | `409 APPLICATION_ALREADY_DECIDED` |
| Tasks | Assignee is not a team member | `422 INVALID_ASSIGNEE` |
| Tasks | Member edits another member's task | `403 FORBIDDEN` |
| Tasks | Reopen completed task | `completedAt` cleared |
| Milestones | Delete milestone with tasks | `409 MILESTONE_HAS_TASKS` |
| Milestones | Complete milestone with open tasks | Allowed; progress still reflects open tasks; warning in UI |
| Project completion | Open tasks remain | Owner sees confirmation warning; completion allowed |
| Visibility | Draft/archived project requested by guest | `404` or `403` without leaking private fields |
| Notifications | Entity was archived/deleted | Notification remains readable with fallback text |
| Saved | Save twice / unsave missing | Idempotent success |
| Contact | Spam/honeypot filled | Accept-looking generic success but do not persist (or mark spam) |
| Admin | Admin tries to deactivate self or last admin | `409 LAST_ACTIVE_ADMIN` / `409 CANNOT_MODIFY_SELF` |
| Admin | Admin tries to apply or decide | `403 ADMIN_READ_ONLY` |
| Network | API unreachable | Retry affordance and error state, no blank screen |
| Time | Deadline date vs timezone | Store UTC date; display local date; document date-only deadline semantics |

---

## 11. Feature acceptance checklist

### Public and accounts

- [ ] Home, About, Contact, Sign Up, and Login are reachable and responsive.
- [ ] The contact form validates, rate-limits, and stores a message visible to admins.
- [ ] Signup rejects duplicate emails and weak passwords.
- [ ] Login sets a server-verified session; refresh keeps the user signed in.
- [ ] Logout clears the session and protected routes redirect to login.
- [ ] A guest can browse published projects and public profiles but cannot use write actions.

### Profiles and discovery

- [ ] A student can edit profile fields and skill tags; invalid URLs are rejected.
- [ ] Public profiles show skills and public projects but not email or password data.
- [ ] Search, skill/category/status filters, sorting, and pagination work together.
- [ ] Each project card shows title, owner, skills, team slots, status, and deadline.
- [ ] Empty search results show a designed empty state with a reset action.

### Projects and applications

- [ ] A student can create a draft, publish it, edit it, and archive it.
- [ ] Only the owner (or admin moderation action) can change a project.
- [ ] A student cannot apply to their own project, twice, or to a closed/full project.
- [ ] Owner sees pending applications with applicant profiles and messages.
- [ ] Accepting an applicant adds exactly one member and notifies them.
- [ ] Rejecting notifies the applicant and changes only that application.
- [ ] Accepting the last slot moves the project out of recruiting and blocks further accepts.
- [ ] Two simultaneous accepts for the last slot produce one success and one safe conflict.

### Workspace

- [ ] Owner and members can open the workspace; guests cannot.
- [ ] Tasks can be created, assigned to team members only, updated, completed, and deleted by allowed roles.
- [ ] Milestones can be created, edited, completed, and deleted; deletion with tasks is blocked.
- [ ] Progress updates correctly after task status changes.
- [ ] Overdue tasks are visually distinct and derived, not manually stored.

### Dashboards and notifications

- [ ] Student and owner dashboards show accurate counts and actionable lists.
- [ ] Notifications are created for application, decision, assignment, milestone due, and completion events.
- [ ] Unread count, mark-one-read, and mark-all-read work and are recipient-scoped.
- [ ] Saved projects can be added/removed and appear on the dashboard.
- [ ] Completed projects appear in the public showcase.

### Admin and security

- [ ] Admin-only routes return `403` for students, including direct API calls.
- [ ] Admin can list users, deactivate/reactivate, hide/restore a project, triage messages, and resolve reports.
- [ ] Last-admin and self-demotion protections hold.
- [ ] Every protected endpoint is covered by an authorization test.
- [ ] No secrets, `.env` files, or `node_modules` are tracked by Git.

### Quality and delivery

- [ ] Lint, tests, and production builds pass from a clean install.
- [ ] Keyboard-only and mobile checks pass for core journeys.
- [ ] Seed data creates a usable demo (students, owner, project, pending application, admin).
- [ ] Deployment smoke test succeeds with production environment variables.
- [ ] README and planning documents match the implemented behavior.

---

## 12. Phase roadmap

The order follows hard dependencies. Public static pages can begin early, but authentication-dependent navigation and API-backed discovery wait for their dependencies.

### Phase 0 — Requirements and planning

| Item | Detail |
| --- | --- |
| Objective | Inspect the reference, define scope, architecture, security, testing, and Git process |
| Dependencies | None |
| Planned file changes | This document set; per-app `.gitignore` files; the `client/` and `server/` folders |
| Deliverables | Six planning documents; reference audit; local Phase 0 commit |
| Acceptance criteria | Documents exist, are internally consistent, and contain no secrets or application code |
| Required tests | Document/link review; folder-structure check; secret scan; `git diff` review |
| Risks and mitigation | Assumptions may change; record open questions and re-baseline before each phase |
| Definition of done | Plan reviewed, committed locally, push blocked until a personal remote is confirmed |

**Phase 0 status (2026-10-26):** Complete and committed as `6b6b724`. Planning files were originally created under `Frontend-client/` and `Backend-server/`; Phase 1 renamed those top-level folders to `client/` and `server/` without adding a third root folder. Current implementation status: Phase 1 (`d934731`) provides the design-preview client, and Phase 2 (`a2cf72f`) provides the backend foundation and data layer. Authentication, seed data, transactions, and feature APIs remain pending.

### Phase 1 — UI/UX design system

| Item | Detail |
| --- | --- |
| Objective | Turn the visual direction into tokens and reusable primitives before feature pages |
| Dependencies | Phase 0 |
| Implemented files | `client/src/styles/tokens.css`, `global.css`, `components.css`, `preview.css`; `client/src/components/ui.jsx`, `icons.jsx`; `client/src/App.jsx` preview |
| Deliverables | Color/type/spacing tokens, buttons, inputs, cards, badges, avatars, dialog, toast, empty/error/loading states, responsive preview |
| Acceptance criteria | Components render all states; contrast and focus are verified; mobile and desktop shells match the plan |
| Required tests | `npm run lint`; `npm run build`; browser QA at 320/360/390/768/1024/1280/1440; keyboard, contrast, and reduced-motion checks |
| Risks and mitigation | Over-designing before features; timebox and limit to primitives used by Phase 5+ |
| Definition of done | Design tokens and primitives are implemented, locally verified, and documented enough to reuse without rework |

**Phase 1 status (2026-10-26):** Implemented in `client/` as a labeled design-preview page. The preview currently lives at `/`; feature routes, backend integration, and test-suite tooling remain future work. Verification evidence is recorded in `TEST_PLAN.md`.

### Phase 2 — Project scaffolding and environment

| Item | Detail |
| --- | --- |
| Objective | Complete runnable frontend and backend skeletons with safe configuration |
| Dependencies | Phase 0; Phase 1 frontend scaffold |
| Planned file changes | Extend `client/package.json`, Vite config, `src/main.jsx`, `App.jsx`; create `server/package.json`, `src/server.js`, `src/app.js`, config files, `.env.example`, README files |
| Deliverables | Validated Vite setup, Express API, `/api/health`, dev proxy, lint/format/test scripts, environment validation |
| Acceptance criteria | Clean install starts both apps; health returns `200`; missing required env fails fast with a clear message |
| Required tests | Frontend build; backend health smoke test; lint; env-schema unit test |
| Risks and mitigation | Dependency drift; pin compatible major versions and commit lockfiles |
| Definition of done | A new machine can install, configure from `.env.example`, and run both apps |

**Adjusted after Phase 1:** the client scaffold, lockfile, Vite config, and preview already exist. Phase 2 validates and extends them rather than recreating them, and adds the missing backend skeleton, environment validation, data layer, and test tooling.

**Phase 2 status (2026-10-26):** Implemented in `server/`: Express app/server lifecycle, validated environment, MongoDB connection, `/api/health`, JSON errors, 404 handling, CORS, Helmet, body limit, rate limiting, request IDs, graceful shutdown, all nine models and indexes, index-sync script, and 32 automated tests. The data-model portion of Phase 3 was completed early; seed data, transactions, auth, and feature APIs remain pending.

### Phase 3 — MongoDB and data models

| Item | Detail |
| --- | --- |
| Objective | Implement schemas, indexes, references, and a repeatable seed |
| Dependencies | Phase 2; running MongoDB (local/Docker/Atlas) |
| Planned file changes | `server/src/models/*`, `src/config/db.js`, `src/scripts/seed.js`, model tests |
| Deliverables | User, Project, Application, Task, Milestone, Notification, SavedProject, ContactMessage, Report models; indexes; seed data |
| Acceptance criteria | Unique constraints fire; invalid enums/enums are rejected; indexes exist in Compass; seed is idempotent or safely resettable |
| Required tests | Model validation tests; unique index tests; seed integration test; index inspection |
| Risks and mitigation | No local MongoDB running (observed); use Atlas or start Docker Desktop; document both paths |
| Definition of done | Models match `DATABASE_PLAN.md`; indexes verified; seed creates demo accounts and projects |

### Phase 4 — Authentication and authorization

| Item | Detail |
| --- | --- |
| Objective | Implement register, login, logout, session hydration, and reusable guards |
| Dependencies | Phases 2, 3 |
| Planned file changes | `server/src/routes/auth.*`, `controllers/auth.*`, `middleware/auth.*`, `validators/auth.*`; `client/src/context/AuthContext.jsx`, `pages/auth/*`, `components/ProtectedRoute.jsx`, API client |
| Deliverables | Hashed passwords, JWT cookie, `GET /auth/me`, rate-limited auth, inactive-user handling, login/signup screens, protected routing |
| Acceptance criteria | Valid signup/login works; duplicate/invalid credentials fail safely; cookie is `httpOnly`; role guards work server-side |
| Required tests | Auth integration suite; cookie attributes; 401/403 matrix; rate-limit test; frontend route-guard tests |
| Risks and mitigation | Cookie/CORS misconfiguration; use a dev proxy and explicitly test cross-origin production settings |
| Definition of done | Authentication is secure, tested, and usable from the frontend |

### Phase 5 — Public website

| Item | Detail |
| --- | --- |
| Objective | Deliver the marketing surface and contact flow that every user sees first |
| Dependencies | Phases 1, 2; contact persistence requires Phase 3; auth nav requires Phase 4 |
| Planned file changes | `client/src/pages/{Home,About,Contact,NotFound}.jsx`, layouts, Navbar/Footer, supporting styles; `server` contact route/controller |
| Deliverables | Home, About, Contact, 404, responsive navigation, public footer, contact admin-ready storage |
| Acceptance criteria | Mandatory public pages are complete, accessible, and responsive; contact submission persists and gives feedback |
| Required tests | Route render tests; form validation; contact API integration; keyboard/mobile pass |
| Risks and mitigation | Marketing polish consuming phase time; cap visual iteration and reuse the design system |
| Definition of done | Public site is demo-ready and the contact message appears in the database |

### Phase 6 — Profiles and project discovery

| Item | Detail |
| --- | --- |
| Objective | Make students and projects discoverable and let students manage their own projects |
| Dependencies | Phases 3, 4, 5 |
| Planned file changes | Profile pages/settings; public profile; project list/detail/create/edit; backend project/profile routes, controllers, services, validators; search indexes |
| Deliverables | Skill-rich profiles, project CRUD, discovery filters/sort/pagination, ownership checks, project detail |
| Acceptance criteria | Search/filter/sort work together; only owners can edit; drafts are private; invalid IDs and sorts fail cleanly |
| Required tests | Project CRUD integration; IDOR tests; search/filter/sort tests; public/private visibility tests; form tests |
| Risks and mitigation | Search complexity and index limits; use one text index plus equality filters and document ranking |
| Definition of done | A student can publish a project and another student can find it |

### Phase 7 — Team formation and applications

| Item | Detail |
| --- | --- |
| Objective | Implement the core application decision loop with safe capacity handling |
| Dependencies | Phases 3, 4, 6; notifications can start here |
| Planned file changes | Backend application routes/controllers/services/validators; notification model/service; frontend project applications tab, applicant cards, my applications, decision modals |
| Deliverables | Apply, withdraw, list, accept/reject; duplicate/self/closed guards; transactional acceptance; auto-close when full; notifications |
| Acceptance criteria | Capacity can never be exceeded; duplicate applications are impossible; decisions are idempotent-safe; both parties are notified |
| Required tests | Application integration; unique constraint; last-slot race with `Promise.all`; unauthorized decision tests; notification assertions |
| Risks and mitigation | Race conditions and partial writes; use a MongoDB transaction and conditional filters; test with concurrent requests |
| Definition of done | The full owner/applicant loop works end to end with no capacity drift |

### Phase 8 — Tasks and milestones

| Item | Detail |
| --- | --- |
| Objective | Give accepted teams a private place to plan and track work |
| Dependencies | Phase 7 (membership exists) |
| Planned file changes | Backend task/milestone routes, controllers, services, validators; workspace layout and tabs; task list/board; milestone timeline; progress component |
| Deliverables | Workspace access control; task CRUD/assignment/status; milestone CRUD; computed progress; overdue indicators |
| Acceptance criteria | Non-members cannot read/write; assignees must be team members; milestone deletion rules hold; progress matches task data |
| Required tests | Workspace IDOR tests; task permission matrix; milestone conflict; progress calculation; UI state tests |
| Risks and mitigation | Permission complexity; centralize project access middleware and test every role |
| Definition of done | A team can run a project from tasks and milestones without external tools |

### Phase 9 — Dashboards, notifications, and showcase

| Item | Detail |
| --- | --- |
| Objective | Connect daily work into role-aware dashboards and public proof |
| Dependencies | Phases 6, 7, 8 |
| Planned file changes | Dashboard layouts/pages; notification center and polling; saved projects; completed showcase; dashboard aggregation endpoints |
| Deliverables | Student/owner dashboards, saved list, notification center, unread badge, milestone-due reminder job (or documented lazy dedupe fallback), completed showcase, project completion flow |
| Acceptance criteria | Counts are accurate; notifications are recipient-scoped; saved toggles are idempotent; completed projects are public |
| Required tests | Dashboard aggregation tests; notification authorization; saved idempotency; completion workflow; empty/loading/error states |
| Risks and mitigation | Dashboard queries becoming slow or divergent; reuse service-level queries and index by owner/member/recipient |
| Definition of done | Signing in gives each role a clear next action and a credible showcase |

### Phase 10 — Admin panel and moderation

| Item | Detail |
| --- | --- |
| Objective | Operate the platform safely without direct database edits |
| Dependencies | Phases 4, 6, 7, 9 |
| Planned file changes | Backend admin routes/controllers/validators/guards; audit log optional; frontend admin layout, stats, users, projects, messages, reports |
| Deliverables | Admin stats; user activation/roles; project hide/restore; contact inbox; report queue; last-admin protection |
| Acceptance criteria | All admin endpoints reject non-admins; admin cannot apply/decide/impersonate; destructive actions are reversible or blocked |
| Required tests | Admin RBAC matrix; last-admin test; self-demotion test; hide/restore visibility; message/report transitions; audit assertions if implemented |
| Risks and mitigation | Privilege misuse; least privilege, confirmations, server-side checks, and audit trail |
| Definition of done | Moderation can be demonstrated entirely through the UI |

### Phase 11 — Testing, security, and bug fixing

| Item | Detail |
| --- | --- |
| Objective | Prove quality, close security gaps, and stabilize the MVP |
| Dependencies | Phases 4–10 |
| Planned file changes | Backend/frontend test suites, CI config, accessibility fixes, performance fixes, bug fixes, README updates |
| Deliverables | Passing test suite, security checklist evidence, a11y report, bug log, release candidate |
| Acceptance criteria | No open critical/high defects; critical backend coverage threshold met; no high-severity audit findings; core journeys pass E2E |
| Required tests | Full regression, security abuse cases, accessibility, responsive, performance smoke, clean-install build |
| Risks and mitigation | Late discovery of systemic issues; run security tests continuously from Phase 4, not only here |
| Definition of done | Release candidate passes the `TEST_PLAN.md` exit criteria |

### Phase 12 — Deployment and submission

| Item | Detail |
| --- | --- |
| Objective | Ship a stable public demo and a defensible college submission |
| Dependencies | Phase 11; personal GitHub remote; hosting accounts; Atlas database |
| Planned file changes | Deployment config, production env examples, README, seed/demo instructions, submission notes inside the two app folders |
| Deliverables | Live frontend and API, Atlas database, demo accounts, smoke-test evidence, final report |
| Acceptance criteria | HTTPS works; cookies/CORS work in production; seed/demo accounts work; no secrets in Git; no broken core routes |
| Required tests | Production smoke test, auth/cookie test, key E2E journey, rollback check, secret scan |
| Risks and mitigation | Cross-site cookie/CORS failure; use a documented same-site proxy or explicit Secure/SameSite/CORS settings and test before submission |
| Definition of done | Evaluator can use the live app and reproduce the demo from the README |

### Roadmap dependency notes

- Phase 5 depends on Phase 4 for authenticated navigation, but static Home/About work can begin after Phase 2 without violating the phase gate.
- Phase 7 is the first phase with a true data-consistency risk; it must not start before indexes and models are verified in Phase 3.
- Phase 9 intentionally follows workspace work so dashboards can aggregate real data rather than placeholders.
- Phase 10 is last among feature phases because moderation needs projects, applications, and reports to exist.
- Phase 11 overlaps every phase through tests, but the dedicated hardening phase is not optional.

---

## 13. Git and GitHub workflow

### 13.1 Current state

- The working directory was empty and **was not a Git repository**.
- No personal FLEXI remote exists.
- The reference repository (`https://github.com/somesh-chutel/25070521060-CA-03.git`) is **reference only** and must never receive FLEXI pushes.
- Reference branch: `main`; one commit (`4a1fd13`); clean working tree.
- Reference remote: `origin` pointing at the reference owner's repository.
- Reference tracks 1,633 `server/node_modules` files; FLEXI must not repeat this.

### 13.2 Rules for every phase

1. Inspect `git status`, `git diff`, branch, and remotes before any Git operation.
2. Never add, rename, or push to the reference repository.
3. Never force-push, delete remote branches, rewrite shared history, or discard unrelated changes.
4. Ignore `node_modules`, `.env*`, build output, logs, coverage, and local database data. Only `.env.example` may be committed.
5. Review the full diff and run lint/tests/build before committing.
6. Use a `phase/<number>-<short-name>` branch for implementation work; merge into `main` only after verification.
7. Use Conventional Commits, for example `docs(phase-0): add FLEXI planning documents`.
8. Never commit a secret. If one is exposed, rotate it; deleting the file is not enough.
9. Push only after confirming the personal repository URL and branch.

### 13.3 Phase 0 commit and push

- A local Phase 0 planning commit may be created after document review.
- Push is **blocked** until the user supplies their own GitHub repository URL and authorizes the push.
- Required action: provide `https://github.com/<your-account>/<your-flexi-repo>.git`.
- After confirmation: add it as `origin`, push `main`, verify the remote branch, and report the commit hash and PR/compare URL if applicable.

---

## 14. Assumptions and constraints

### Assumptions

- The app serves one college community; no multi-tenant institutions in MVP.
- Every user is a student by default; admin accounts are seeded or promoted by an existing admin.
- MongoDB is available locally via Docker/Compass or remotely via Atlas during implementation.
- The frontend and backend can be deployed separately; production cookie/CORS behavior will be tested explicitly.
- Users have modern browsers and reasonable campus internet.
- The college evaluation values a working core loop, clear code, and documentation over feature count.

### Constraints

- Exactly two top-level application folders: `client/` and `server/`.
- Planning documents live inside one of those folders, not a third root folder.
- No copied `node_modules`; install from committed manifests and lockfiles.
- No real-time, upload, payment, or email-provider integration in MVP.
- No destructive admin action without a reversible or explicitly confirmed path.
- No claim of completion without observed test/deployment evidence.

---

## 15. Risks and mitigations

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Scope exceeds college timeline | Incomplete submission | High | MVP gates, deferred list, phase acceptance criteria |
| MongoDB not running locally (observed port 27017 closed, Docker daemon off) | Seed/Compass/transaction verification blocked; model tests use in-memory MongoDB | Medium | Start Docker Desktop or use Atlas; document both |
| Cross-site cookie/CORS failure in production | Login fails after deploy | Medium | Test deployed cookie attributes; prefer same-site proxy; explicit CORS allowlist |
| Application capacity race | Overfilled teams / inconsistent data | Medium | Transaction plus conditional updates; concurrent test |
| Authorization gaps | Data leak / IDOR | Medium | Central middleware, role matrix, negative tests |
| Admin misuse | Harm to users | Low | Least privilege, confirmations, audit log, no destructive hard deletes |
| Frontend state complexity | Bugs and confusing code | Medium | Small AuthContext, service layer, per-page fetch hooks, no premature global store |
| Poor mobile layout | Usability failure | Medium | Mobile-first CSS, test at 320/768, no hover-only actions |
| Search/filter performance | Slow discovery | Low at MVP scale | Text index, equality indexes, pagination, capped limits |
| Time spent on visual polish | Core features unfinished | Medium | Design system first, then fixed refinement passes |
| Secret leakage | Security incident | Low/High impact | `.gitignore`, `.env.example`, secret scan, rotation plan |
| No personal remote | Cannot submit via GitHub | High until resolved | Request URL now; local commit preserves work |

---

## 16. Open questions (require user input)

1. What is the authorized personal GitHub repository URL for FLEXI?
2. Should production use MongoDB Atlas, a college-hosted MongoDB, or local MongoDB for the demo?
3. Are frontend and backend expected to be deployed on the same domain, or on separate hosts (affects cookie/CORS configuration)?
4. Is a faculty/admin demo account required, and who should own it?
5. Are there college-specific branding, logo, or submission-format requirements not covered here?
6. Is email verification/password reset required by the rubric? It is currently deferred.

---

## 17. Phase 0 definition of done

- Reference repository and supplied ZIP inspected; findings recorded.
- Working directory and Git state recorded; no user work overwritten.
- Scope, roles, journeys, edge cases, and acceptance checklist defined.
- Database, API, UI/UX, security, and test plans created and mutually consistent.
- Exactly two top-level application folders exist.
- No application feature code, dependency directory, or secret is committed.
- Local planning commit reviewed; push intentionally not attempted without a personal remote.
- Approval requested before Phase 1.
