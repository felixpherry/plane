# Triage Labels

Agents use canonical roles. Plane uses workflow states. Use this mapping.

| Canonical role    | Plane state       |
| ----------------- | ----------------- |
| `needs-triage`    | `Needs Triage`    |
| `needs-info`      | `Needs Info`      |
| `ready-for-agent` | `Ready for Agent` |
| `ready-for-human` | `Ready for Human` |
| `wontfix`         | `Cancelled`       |

Normal work states:

| Work role         | Plane state   |
| ----------------- | ------------- |
| start/in-progress | `In Progress` |
| completed         | `Completed`   |

Agents must update status explicitly during work transitions:

```bash
plane issues state ISSUE --workspace it-payroll-2026 --project PLANE --state "STATE"
```
