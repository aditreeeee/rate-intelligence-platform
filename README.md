# RateBuzz — Rate Intelligence Platform

Frontend-only enterprise hotel revenue management app: Properties → Rooms → Rate Plans,
with role-based access control. No backend, no build step — pure React run
in-browser via a service worker (Babel transform at request time).

See **[HELP.pdf](./HELP.pdf)** for the full guide (installation, folder organization, mock
data architecture, user roles, module overview, and the .NET/SQL Server integration roadmap).

## Run locally

**Windows PowerShell prerequisite:** if running `serve.ps1` directly gives a
"not digitally signed" error, temporarily bypass the execution policy for the
current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

This only affects the current PowerShell session/process — nothing is
changed system-wide.

Double-click `start.bat` (does this automatically), or run manually:

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:5173/.
## Target architecture (planned backend)

This app is frontend-only today, but is deliberately structured for a straightforward
migration to a real backend — no frontend redesign, just swapping `DataContext`'s in-memory
reducer for HTTP calls:

- **Database:** `NEW DATABASE: RATEBUZZ` (SQL Server 2022)
- **Backend target:** .NET Core 8.0 (C#)
- **Framework:** ASP.NET MVC
- **Views:** kept **uncompiled** — every `.jsx` page in `src/pages/` is served as-is by the
  dev service worker (no bundler, no build artifacts), so it stays easy to port into MVC
  Views/View Components without reconciling against hashed bundler output.

## Stack

- React 18 + react-router-dom, loaded via `<script type="importmap">` in `index.html` — no npm install, no bundler.
- Plain CSS design system in `src/styles/` (`tokens.css` for design tokens, rest split by concern).
- All data is mock/in-memory (`src/mocks/*.js`), managed through `DataContext` — structured so real API calls can replace the dispatch actions later.
- Master data (Room Types, Amenities, Room Templates) lives in `src/mocks/masterData.js` and supports frontend CRUD (`addMasterItem` / `updateMasterItem` / `deleteMasterItem`, keyed by table name) via `DataContext`, architected to map 1:1 onto future SQL Server master tables and MVC controllers.

## Structure

- `src/pages/{properties,rooms,ratePlans}/` — List page, Form, Detail/Profile view per entity.
- `src/pages/settings/` — General, Defaults (Properties/Rooms/Rate Plans), Appearance, Integrations.
- `src/components/layout/` — Sidebar, Topbar, PortalLayout, AuthGuard.
- `src/components/ui/` — shared design-system components (Table, Modal, Badge, BulkActionBar, Breadcrumbs, ExportMenu, ImportWizard, etc.).
- `src/context/` — `AuthContext` (mock login/roles), `DataContext` (CRUD + scoping), `ToastContext`.
- `src/lib/permissions.js` + `src/hooks/usePermissions.js` — RBAC flag model (see below).

## Roles (mock RBAC)

Two demo accounts, switchable from the login page or the Topbar dropdown:

- **Super Admin** (`admin@ratebuzz.com` / `Admin@123`) — full access to all properties, rooms, rate plans, and integrations.
- **Property Owner** (`owner@ratebuzz.com` / `Owner@123`) — scoped to their own properties only; can't see Integrations; Property ID is locked after creation; can archive but not permanently delete Rooms/Rate Plans.

Permissions are exposed as flat capability flags via `usePermissions()`, derived from `role` in
`src/lib/permissions.js` — the single seam meant to be swapped for real ASP.NET Identity/JWT
claims later without touching any consuming component.

## Notable features

- Property Profile with tabbed sections (Overview, Contact, Address, Operational, Rooms, Rate Plans, Notes, Settings).
- Archive/Restore workflow across all three entities, with permanent delete gated by role.
- CSV export (Excel/PDF are labeled placeholders) and a placeholder Import Wizard (CSV parse → validate → preview).
- Unsaved-changes guard on all create/edit forms.
- Breadcrumb navigation throughout.
