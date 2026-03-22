# Codebase Map

> Directory → Feature mapping for fast agent navigation.

## Apps

### `apps/web/` — Main Web Application (React + React Router v7 + Vite)
| Directory | Feature |
|-----------|---------|
| `app/routes/core.ts` | **ALL route registration** — routes are NOT auto-discovered |
| `app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/` | Issue list page |
| `app/(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/` | Project settings pages |
| `app/(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/features/custom-fields/` | Custom fields settings route |
| `core/components/issues/issue-detail/` | Issue detail view (full page) |
| `core/components/issues/issue-detail/sidebar.tsx` | Issue detail sidebar (State, Assignees, Priority, Labels, **Custom Properties**) |
| `core/components/issues/issue-detail/custom-fields/` | **[CUSTOM]** Custom field value display + editing in issue sidebar |
| `core/components/issues/peek-overview/properties.tsx` | Issue peek panel properties (slide-out on issue click) |
| `core/components/issues/issue-modal/form.tsx` | Issue create/edit modal form |
| `core/components/issues/issue-modal/components/default-properties.tsx` | Default properties bar in create modal (Status, Assignees, Labels, Dates, **Custom Fields**) |
| `core/components/issues/issue-modal/components/custom-field-properties.tsx` | **[CUSTOM]** Custom fields in create modal |
| `core/components/settings/project/content/custom-fields/` | **[CUSTOM]** Custom fields settings page (admin CRUD) |
| `core/components/settings/project/sidebar/` | Project settings sidebar navigation |
| `core/components/settings/project/sidebar/item-icon.tsx` | Icons for settings sidebar items |
| `core/components/dropdowns/` | All dropdown components (case-by-case, not generic) |
| `core/components/dropdowns/member/` | Member/Assignee dropdown (reference for building new dropdowns) |
| `core/components/dropdowns/buttons.tsx` | Shared `DropdownButton` component |
| `core/components/dropdowns/constants.ts` | `BUTTON_VARIANTS_WITH_TEXT` and other shared constants |
| `core/components/common/layout/sidebar/property-list-item.tsx` | `SidebarPropertyListItem` — reusable row layout for issue properties |
| `hooks/use-dropdown.ts` | Shared dropdown open/close/keyboard logic |

### `apps/api/` — Django Backend (Python)
| Directory | Feature |
|-----------|---------|
| `plane/db/models/` | All Django models (extend `BaseModel` or `WorkspaceBaseModel`) |
| `plane/db/models/custom_field.py` | **[CUSTOM]** `CustomField` + `CustomFieldValue` models |
| `plane/db/models/__init__.py` | Model registration — must import new models here |
| `plane/api/` | API key auth layer (`/api/v1/`) — for external integrations, curl |
| `plane/api/serializers/custom_field.py` | **[CUSTOM]** Custom field serializers (API key auth) |
| `plane/api/views/custom_field.py` | **[CUSTOM]** Custom field views (API key auth) |
| `plane/api/urls/custom_field.py` | **[CUSTOM]** Custom field URL routes (API key auth) |
| `plane/app/` | Session auth layer (`/api/`) — for frontend web app |
| `plane/app/views/issue/custom_field.py` | **[CUSTOM]** Custom field views (session auth) |
| `plane/app/urls/custom_field.py` | **[CUSTOM]** Custom field URL routes (session auth) |
| `plane/app/views/__init__.py` | View registration — must import new views here |
| `plane/app/urls/__init__.py` | URL registration — must add URL patterns here |
| `plane/settings/storage.py` | S3/MinIO storage configuration (patched for external endpoint) |
| `plane/settings/common.py` | Django common settings (CORS, cookies, auth) |

### `apps/admin/` — Admin Dashboard
God-mode panel for instance configuration (SMTP, OAuth, features).

### `apps/space/` — Public Project Pages
Public-facing project pages for sharing.

### `apps/live/` — Real-time Collaboration (Node.js)
WebSocket server for live collaboration. Reads from separate `.env`.

### `apps/proxy/` — Caddy Reverse Proxy
Routes traffic: `/api/*` → Django, `/live/*` → Live server, `/*` → Web app, `/uploads/*` → MinIO.

## Packages

| Package | Purpose | Key Files |
|---------|---------|-----------|
| `packages/types/` | TypeScript interfaces | `src/custom-field.ts` **[CUSTOM]**, `src/settings.ts` (project settings tabs), `src/index.ts` (barrel exports) |
| `packages/services/` | API service classes | `src/custom-field/custom-field.service.ts` **[CUSTOM]**, each service extends `APIService` |
| `packages/ui/` | Design system | `src/button/`, `src/form-fields/` (Input, Checkbox, TextArea), `src/badge/`, `src/card/`, `src/dropdowns/custom-menu.tsx` |
| `packages/propel/` | Icons + low-level components | `src/icons/` (SearchIcon, ChevronDownIcon, CheckIcon), `src/skeleton/` |
| `packages/constants/` | Static constants | `src/settings/project.ts` (project settings tabs + sidebar config) |
| `packages/i18n/` | Translations | `src/locales/en/translations.ts` (add new keys here) |
| `packages/shared-state/` | MobX stores | Global state management |
| `packages/hooks/` | Shared React hooks | |
| `packages/utils/` | Utility functions | `cn()` for classnames, `renderFormattedPayloadDate()` |
| `packages/editor/` | Rich text editor | Tiptap-based editor |
| `packages/tailwind-config/` | Tailwind v4 config | `index.css` (imports + `@theme`), `variables.css` (62KB of CSS variables) |

## Docker Services

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `web` | `plane-web` | 3000 (internal) | Next.js frontend |
| `api` | `plane-api` | 8000 (exposed) | Django REST API |
| `proxy` | `plane-proxy` | 8082 (exposed) | Caddy reverse proxy |
| `plane-db` | `postgres:15.7-alpine` | 5432 (internal) | PostgreSQL database |
| `plane-redis` | `valkey:7.2.11-alpine` | 6379 (internal) | Redis/Valkey cache |
| `plane-mq` | `rabbitmq:3.13.6` | 5672 (internal) | RabbitMQ message queue |
| `plane-minio` | `minio/minio` | 9000 (exposed) | File storage |
| `plane-live` | `plane-live` | 3000 (internal) | WebSocket server |
| `admin` | `plane-admin` | 3000 (internal) | Admin panel |
| `space` | `plane-space` | 3000 (internal) | Public pages |
| `bgworker` | `plane-worker` | - | Celery background worker |
| `beatworker` | `plane-beat-worker` | - | Celery scheduled tasks |
| `plane-migrator` | `plane-migrator` | - | Database migrations (run once) |
| `ollama` | `ollama/ollama` | 11434 (exposed) | LLM inference |
| `open-webui` | `open-webui` | 8080 (exposed) | LLM chat UI |
