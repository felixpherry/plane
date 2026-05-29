# Gantt assignee grouping prototype notes

Question: what row model + UI makes Gantt `group_by = assignees` feel right?

Run:

```bash
pnpm dev --filter web
# open /prototype/gantt-assignee-grouping?variant=compact
```

Variants:

- `compact`
- `swimlane`
- `timeline-first`

Current observed answer:

- Use existing Gantt stack, copied from modules/issues Gantt: `GanttChartRoot`, `GanttChartSidebar`, `GanttChartRowList`, `GanttChartBlocksList`, `GanttDnDHOC`, `RenderIfVisible`, timeline store block shape.
- Group headers can be synthetic Gantt blocks with no dates; existing row list renders blank timeline row when `showAllBlocks` is true.
- Use separate row id and issue id.
- Row id: `issue_{issueId}_{groupId}`.
- Selection/active state should stay keyed by issue id so duplicate rows sync.
- Timeline/sidebar rendering should key by row id so duplicated issue rows can coexist.
- Group header row should own blank timeline row.
- Collapsed group keeps header + blank timeline row, hides issue rows.
- Per-group load-more can be its own blank timeline row under group.

Verdict placeholder: fill after review, then delete prototype or fold into production Gantt.
