# Issue Tracker

This repo uses Plane through the `plane` CLI.

Default target:

- workspace: `it-payroll-2026`
- project: `PLANE`

Use these defaults unless the user explicitly says otherwise.

## Usage model

- PRDs live as Plane Pages.
- Issues are work items.
- Issues should link to relevant PRD Page(s).
- New implementation issues should use `--blocked-by` when they depend on other work.

## First commands for any issue

```bash
plane issues view ISSUE --workspace it-payroll-2026 --project PLANE
plane issues pages list ISSUE --workspace it-payroll-2026 --project PLANE
```

Always read linked PRD Page(s) before doing an issue. Linked PRD Pages are required context, not optional.

If no PRD Page is linked, or a linked PRD Page cannot be read, stop and ask the user unless the user explicitly says the issue needs no PRD.

Read page:

```bash
plane pages view PAGE_ID --workspace it-payroll-2026 --project PLANE
```

## Pages

Create standalone PRD Page:

```bash
plane pages create --workspace it-payroll-2026 --project PLANE --title "TITLE" --body-file FILE.md
```

Create issue-linked PRD Page:

```bash
plane issues pages create ISSUE --workspace it-payroll-2026 --project PLANE --title "TITLE" --body-file FILE.md
```

Link existing PRD Page:

```bash
plane issues pages link ISSUE --workspace it-payroll-2026 --project PLANE --page PAGE_ID
```

Unlink wrong page:

```bash
plane issues pages unlink ISSUE --workspace it-payroll-2026 --project PLANE --page PAGE_ID
```

## Issues

Create work item:

```bash
plane issues create --workspace it-payroll-2026 --project PLANE --title "TITLE" --body-file FILE.md
```

Create work item linked to PRD Page:

```bash
plane issues create --workspace it-payroll-2026 --project PLANE --title "TITLE" --body-file FILE.md --link-page PAGE_ID
```

Create work item with blocker:

```bash
plane issues create --workspace it-payroll-2026 --project PLANE --title "TITLE" --body-file FILE.md --blocked-by ISSUE
```

Create work item linked to PRD Page and blocked by dependency:

```bash
plane issues create --workspace it-payroll-2026 --project PLANE --title "TITLE" --body-file FILE.md --link-page PAGE_ID --blocked-by ISSUE
```

Use `--blocked-by` when creating an issue that depends on another issue. `--link-page` and `--blocked-by` may repeat.

## State updates

Update status explicitly during work transitions:

```bash
plane issues state ISSUE --workspace it-payroll-2026 --project PLANE --state "STATE"
```

Do not use shorthand completion helper if explicit state command is preferred.

Use `man plane` for full command set.
