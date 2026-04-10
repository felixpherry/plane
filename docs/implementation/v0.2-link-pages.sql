-- v0.2 Link Pages widget schema.
-- Apply on the target Plane database:
-- docker compose exec plane-db psql -U plane -d plane -f /path/to/v0.2-link-pages.sql

CREATE TABLE IF NOT EXISTS work_item_page_links (
    id uuid PRIMARY KEY,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone NULL,
    created_by_id uuid NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
    updated_by_id uuid NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) DEFERRABLE INITIALLY DEFERRED,
    project_id uuid NOT NULL REFERENCES projects(id) DEFERRABLE INITIALLY DEFERRED,
    issue_id uuid NOT NULL REFERENCES issues(id) DEFERRABLE INITIALLY DEFERRED,
    page_id uuid NOT NULL REFERENCES pages(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS work_item_page_links_id_idx ON work_item_page_links(id);
CREATE INDEX IF NOT EXISTS work_item_page_links_workspace_id_idx ON work_item_page_links(workspace_id);
CREATE INDEX IF NOT EXISTS work_item_page_links_project_id_idx ON work_item_page_links(project_id);
CREATE INDEX IF NOT EXISTS work_item_page_links_issue_id_idx ON work_item_page_links(issue_id);
CREATE INDEX IF NOT EXISTS work_item_page_links_page_id_idx ON work_item_page_links(page_id);
CREATE UNIQUE INDEX IF NOT EXISTS work_item_page_link_unique_issue_page_when_not_deleted
    ON work_item_page_links(issue_id, page_id)
    WHERE deleted_at IS NULL;
