# Plane Fork — Agent Instructions

> Read this file top to bottom every session. Then read `docs/implementation/v0.1-custom-fields.md` for current progress.

## Role
You are an AI coding agent working on a fork of Plane (makeplane/plane) — an open-source project management tool. The fork adds custom features for an internal HR/payroll team. The fork lives on branch `custom/main`.

## Stack

### Backend (Django/Python)
- **Framework:** Django 5.x + Django REST Framework
- **Database:** PostgreSQL 15 (via Docker)
- **Queue:** RabbitMQ + Celery for background jobs
- **Storage:** MinIO (S3-compatible, self-hosted)
- **Auth:** Session-based cookies (session auth for `/api/`, API key auth for `/api/v1/`)

### Frontend (TypeScript/React)
- **Framework:** React 19 + React Router v7 (NOT Next.js despite file structure naming)
- **Build:** Vite + Turborepo
- **State:** MobX stores in `packages/shared-state`
- **Styling:** Tailwind CSS v4 (NO tailwind.config.ts — uses `@theme` in CSS)
- **UI Library:** `@plane/ui` (internal design system)
- **Icons:** `@plane/propel/icons` (primary), `lucide-react` (secondary)
- **i18n:** `@plane/i18n` with `useTranslation` hook
- **Package Manager:** pnpm with workspaces

## Commands
```bash
pnpm dev --filter web          # Dev server (web only)
pnpm build                     # Build all
pnpm check:lint                # OxLint
pnpm check:types               # TypeScript
pnpm fix                       # Auto-fix format + lint
```

## Package Boundaries — NEVER violate these
- `packages/types/` — TypeScript interfaces only. No runtime code.
- `packages/services/` — API service classes extending `APIService`. No UI code.
- `packages/ui/` — Design system components. No business logic. No API calls.
- `packages/constants/` — Static constants. No side effects.
- `packages/i18n/` — Translation keys only.
- `apps/web/` — Web application. Can import from any package.
- `apps/api/` — Django backend. Completely separate from frontend packages.

## Hard Rules — NEVER break these
1. **No `any` type.** Use `unknown` with type guards or proper types.
2. **Routes must be registered in `apps/web/app/routes/core.ts`.** File-based routing is NOT auto-discovered.
3. **Django API has two layers:** `/api/` (session auth, used by frontend) and `/api/v1/` (API key auth, used externally). Both need views.
4. **Tailwind v4:** No `tailwind.config.ts`. Colors defined in `packages/tailwind-config/index.css` using `@theme inline { }`. Use `rgba()` for `50`/`100` variants for dark mode compatibility.
5. **Dropdowns are case-by-case.** No generic dropdown component. Each dropdown (member, state, priority, custom field) is built from shared building blocks: `ComboDropDown`, `DropdownButton`, `useDropdown`, `usePopper`.
6. **Use Plane's components:** `Input`, `Checkbox`, `Button`, `Badge`, `Card`, `CustomMenu` from `@plane/ui`. Don't build custom form elements.
7. **Django models extend `BaseModel` or `WorkspaceBaseModel`.** UUID primary keys, soft deletes (`deleted_at`), audit fields (`created_by`, `updated_by`).
8. **Imports from `@plane/ui`:** Use named imports. Badge variants that need color must have color scales defined in tailwind-config.
9. **Docker builds cache aggressively.** After code changes, use `docker compose build --no-cache web` and `docker builder prune -af` if route changes don't appear.

## Domain Knowledge — Can't infer from code
- This is a fork for an **HR/payroll company** with multiple sub-companies.
- **Custom fields** is the #1 feature added to this fork. It doesn't exist in Plane Community Edition.
- The fork is self-hosted on an Ubuntu server at `10.110.100.48`.
- **Port mapping:** Plane web `:8082`, Open WebUI `:8080`, Ollama `:11434`, MinIO `:9000`, API `:8000` (exposed for local dev CORS).
- The server has **32GB RAM, no GPU, 500GB SSD on `/data`**. Root partition (`/`) is nearly full — everything must go on `/data`.

## Gotchas — Discovered during implementation
1. **`SameSite=Lax` cookies block local dev.** Use Vite proxy (`server.proxy` in `vite.config.ts`) to avoid cross-origin issues. Proxy `/api` and `/auth` to `http://10.110.100.48:8082`.
2. **Django migrations inside Docker are ephemeral.** Migration files created via `docker compose exec api python manage.py makemigrations` get lost on rebuild. For schema changes, use direct SQL: `docker compose exec plane-db psql -U plane -d plane -c "ALTER TABLE ..."`.
3. **MinIO presigned URLs use `request.get_host()`.** Behind Caddy proxy, this returns the internal hostname. We patched `apps/api/plane/settings/storage.py` to use `MINIO_EXTERNAL_ENDPOINT` env var.
4. **Badge `success`/`destructive` variants need color scales.** Tailwind v4 doesn't include `green-*`, `red-*`, `amber-*` by default. We added them in `packages/tailwind-config/index.css` with `rgba()` for dark mode.
5. **`SWR` is installed** at root level and is usable in web app. But Plane primarily uses MobX stores for data fetching. Both patterns coexist.
6. **`Checkbox` from `@plane/ui` is a native `<input>`.** For controlled toggling, don't re-fetch after API save — use optimistic updates only. Re-fetch on error to revert.
7. **ESLint `jsx-a11y` is strict on new files** but existing Plane files suppress with `eslint-disable`. Follow the same pattern for custom code.

## File Organization for Custom Features
```
# Backend
apps/api/plane/db/models/custom_field.py       # Django models
apps/api/plane/api/serializers/custom_field.py  # API key auth serializers
apps/api/plane/api/views/custom_field.py        # API key auth views (/api/v1/)
apps/api/plane/api/urls/custom_field.py         # API key auth URLs
apps/api/plane/app/views/issue/custom_field.py  # Session auth views (/api/)
apps/api/plane/app/urls/custom_field.py         # Session auth URLs

# Frontend — Types + Services
packages/types/src/custom-field.ts
packages/services/src/custom-field/custom-field.service.ts

# Frontend — Issue sidebar (view + edit values)
apps/web/core/components/issues/issue-detail/custom-fields/
  custom-fields-section.tsx          # Section wrapper, fetches data
  custom-field-property.tsx          # Single property row
  field-inputs/
    select-input.tsx                 # ComboDropDown-based select
    text-input.tsx                   # Input from @plane/ui
    number-input.tsx                 # Input type="number"
    checkbox-input.tsx               # Checkbox from @plane/ui
    url-input.tsx                    # Input type="url" with link display

# Frontend — Settings page (admin CRUD)
apps/web/core/components/settings/project/content/custom-fields/
  custom-field-list.tsx              # List + Card + Badge + CustomMenu
  custom-field-inline-form.tsx       # Inline create/edit form

# Frontend — Issue create modal
apps/web/core/components/issues/issue-modal/components/
  custom-field-properties.tsx        # Custom fields in create modal
```
