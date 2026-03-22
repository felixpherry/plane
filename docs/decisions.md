# Decisions Log

> Append-only. Records implementation-level decisions — "how" not "what."

---

### 2026-03-16 — Custom fields stored as JSONField values
**Context:** Custom fields need to store text, numbers, dates, booleans, arrays. Could use separate columns per type, EAV pattern, or single JSON column.
**Decision:** Single `JSONField` column (`value`) on `CustomFieldValue`. Type validation happens in the serializer, not the database.
**Rationale:** Simplest schema. One table, one column, works for all 7 field types. Django's JSONField supports querying. No schema migrations needed when adding new field types.

### 2026-03-16 — Two API layers: /api/ and /api/v1/
**Context:** Plane has session-based auth for the frontend (`/api/`) and API key auth for external access (`/api/v1/`). Custom fields need both.
**Decision:** Created separate view files for each layer — `plane.app.views.issue.custom_field` (session) and `plane.api.views.custom_field` (API key).
**Rationale:** Follows Plane's existing pattern exactly. Labels, states, and cycles all have dual view layers. Mixing auth methods in one view would break Plane's permission architecture.

### 2026-03-16 — Direct SQL for schema changes instead of Django migrations
**Context:** Django migrations created inside Docker containers are ephemeral — lost on rebuild. Running `makemigrations` only works if you commit the migration file.
**Decision:** Use direct SQL via `docker compose exec plane-db psql` for schema changes (e.g., `ALTER TABLE custom_fields ADD COLUMN is_active`).
**Rationale:** Faster iteration. The migration file inside the container gets wiped on `docker compose build`. Direct SQL modifies the database permanently. For production, we should commit proper migration files.

### 2026-03-17 — Patched storage.py for MinIO presigned URLs
**Context:** MinIO presigned URLs used `request.get_host()` which returned the Docker-internal hostname behind Caddy proxy. Browser couldn't reach `plane-minio:9000`.
**Decision:** Added `MINIO_EXTERNAL_ENDPOINT` env var. Patched `storage.py` to use it instead of `request.get_host()` when `USE_MINIO=1`.
**Rationale:** Minimal change to upstream code. Only one line modified. Easy to maintain when syncing with upstream Plane releases.

### 2026-03-17 — Case-by-case dropdowns, not generic component
**Context:** Could build a `<GenericCombobox>` for custom field selects, or follow Plane's pattern of specialized dropdowns.
**Decision:** Built `CustomFieldSelectInput` following the `MemberDropdownBase` pattern — uses `ComboDropDown`, `DropdownButton`, `useDropdown`, `usePopper` from shared building blocks.
**Rationale:** Consistency with codebase. Plane has 13+ dropdown types, all case-by-case. A generic component would become a god component with 25+ props. The shared building blocks provide enough reuse.

### 2026-03-17 — Optimistic updates only, no re-fetch on success
**Context:** Checkbox toggle was flickering — optimistic update set value to false, but re-fetch from API returned the old value before the save completed.
**Decision:** Removed `listValues` re-fetch after successful `setValues` API call. Only re-fetch on error to revert.
**Rationale:** Eliminates race condition. The optimistic value is always correct on success. Re-fetching is only needed to revert on failure.

### 2026-03-18 — Inline validation instead of toast for mandatory fields
**Context:** Mandatory custom fields need validation on issue creation. Could use toast notification or inline visual feedback.
**Decision:** Track `invalidCustomFields: Set<string>` in form state. On submit, check mandatory fields. Invalid fields get red border + red text (`border-red-500 text-red-500`). Clears when user fills in the value.
**Rationale:** Better UX than toast — user sees exactly which button is red. No reading a toast and hunting for the field. Clears automatically on interaction.

### 2026-03-18 — rgba() for Tailwind v4 color scales (dark mode)
**Context:** Badge `success`/`destructive` variants need `green-50`, `red-50` etc. Tailwind v4 doesn't include these by default. Hardcoded hex values were invisible on dark backgrounds.
**Decision:** Use `rgba(r, g, b, 0.1)` for `-50` variants and `rgba(r, g, b, 0.2)` for `-100` variants. Solid hex for `-300`/`-500`/`-600`.
**Rationale:** rgba with opacity renders correctly on both light and dark backgrounds — light mode gets subtle tint, dark mode gets subtle glow. No need for separate dark mode overrides.

### 2026-03-18 — Multi-select badges with deterministic color hashing
**Context:** Multi-select custom field values displayed as badges all had the same color, making them hard to distinguish.
**Decision:** Hash the option string to deterministically assign one of 8 colors (blue, purple, teal, pink, orange, indigo, emerald, rose). Show max 3 badges + "+N more" pattern.
**Rationale:** Deterministic means same option always gets same color across page loads. Hash-based means no storage needed. 8 colors is enough variety without being garish.
