## Hard Rules

- Do NOT stage / commit `./apps/web/vite.config.ts`

## Agent skills

### Issue tracker

Use Plane via `plane` CLI.

Default target:

- workspace: `it-payroll-2026`
- project: `PLANE`

Plane usage model:

- PRDs live as Plane Pages.
- Issues are work items.
- Issues should link to relevant PRD Page(s).
- New implementation issues should use `--blocked-by` when they depend on other work.

Before acting on an issue:

1. Run `plane issues view ISSUE --workspace it-payroll-2026 --project PLANE`.
2. Run `plane issues pages list ISSUE --workspace it-payroll-2026 --project PLANE`.
3. Read linked PRD Page(s) before implementation. Required, not optional.
4. If no PRD Page is linked, or required PRD Page cannot be read, stop and ask user unless user explicitly says issue needs no PRD.

Update issue state explicitly with:

```bash
plane issues state ISSUE --workspace it-payroll-2026 --project PLANE --state "STATE"
```

Do not rely on shorthand completion helpers when explicit state update is expected.

### Triage labels

Canonical agent roles map to Plane states:

- `needs-triage` → `Needs Triage`
- `needs-info` → `Needs Info`
- `ready-for-agent` → `Ready for Agent`
- `ready-for-human` → `Ready for Human`
- `wontfix` → `Cancelled`

Normal work states:

- start/in-progress → `In Progress`
- completed → `Completed`

### Domain docs

Not configured yet. See `docs/agents/domain.md` if later added.
