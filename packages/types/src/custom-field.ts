/**
 * Custom Field types for Plane Community Edition
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Field type enum matching the Django backend
export enum ECustomFieldType {
  TEXT = "text",
  NUMBER = "number",
  SELECT = "select",
  MULTI_SELECT = "multi_select",
  DATE = "date",
  CHECKBOX = "checkbox",
  URL = "url",
}

// Display labels for field types
export const CUSTOM_FIELD_TYPE_LABELS: Record<ECustomFieldType, string> = {
  [ECustomFieldType.TEXT]: "Single line",
  [ECustomFieldType.NUMBER]: "Number",
  [ECustomFieldType.SELECT]: "Single select",
  [ECustomFieldType.MULTI_SELECT]: "Multi select",
  [ECustomFieldType.DATE]: "Date",
  [ECustomFieldType.CHECKBOX]: "Checkbox",
  [ECustomFieldType.URL]: "URL",
};

// Custom field definition (project-level)
export interface ICustomField {
  id: string;
  name: string;
  description: string;
  field_type: ECustomFieldType;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  workspace: string;
  project: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Lightweight version used when embedded in value responses
export interface ICustomFieldLite {
  id: string;
  name: string;
  field_type: ECustomFieldType;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

// Custom field value (issue-level)
export interface ICustomFieldValue {
  id: string;
  custom_field: string;
  custom_field_detail: ICustomFieldLite;
  issue: string;
  value: unknown;
  workspace: string;
  project: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Create/update payloads
export interface ICustomFieldCreatePayload {
  name: string;
  description?: string;
  field_type: ECustomFieldType;
  options?: string[];
  is_required?: boolean;
  is_active?: boolean;
}

export interface ICustomFieldUpdatePayload {
  name?: string;
  description?: string;
  field_type?: ECustomFieldType;
  options?: string[];
  is_required?: boolean;
  is_active?: boolean;
}

export interface ICustomFieldValuePayload {
  custom_field: string;
  value: unknown;
}

export interface ICustomFieldValueBulkResponse {
  results: ICustomFieldValuePayload[];
  errors: Array<Record<string, unknown>>;
}
