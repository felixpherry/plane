/**
 * Custom Field Service for Plane Community Edition
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// plane imports
import { API_BASE_URL } from "@plane/constants";
import type {
  ICustomField,
  ICustomFieldCreatePayload,
  ICustomFieldUpdatePayload,
  ICustomFieldValue,
  ICustomFieldValuePayload,
  ICustomFieldValueBulkResponse,
} from "@plane/types";
// api service
import { APIService } from "../api.service";

/**
 * Service class for managing custom fields.
 * Extends APIService to handle HTTP requests to custom field endpoints.
 * @extends {APIService}
 */
export class CustomFieldService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  // ========================
  // Custom Field Definitions
  // ========================

  /**
   * List all custom fields for a project.
   */
  async listFields(
    workspaceSlug: string,
    projectId: string
  ): Promise<ICustomField[]> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/custom-fields/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Create a new custom field for a project.
   */
  async createField(
    workspaceSlug: string,
    projectId: string,
    data: ICustomFieldCreatePayload
  ): Promise<ICustomField> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/custom-fields/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Retrieve a single custom field.
   */
  async getField(
    workspaceSlug: string,
    projectId: string,
    fieldId: string
  ): Promise<ICustomField> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/custom-fields/${fieldId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Update a custom field.
   */
  async updateField(
    workspaceSlug: string,
    projectId: string,
    fieldId: string,
    data: ICustomFieldUpdatePayload
  ): Promise<ICustomField> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/custom-fields/${fieldId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Delete a custom field.
   */
  async deleteField(
    workspaceSlug: string,
    projectId: string,
    fieldId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/custom-fields/${fieldId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // ========================
  // Custom Field Values
  // ========================

  /**
   * List all custom field values for an issue.
   */
  async listValues(
    workspaceSlug: string,
    projectId: string,
    issueId: string
  ): Promise<ICustomFieldValue[]> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/custom-values/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Set/update custom field values for an issue.
   * Supports bulk upsert — pass an array of { custom_field, value } objects.
   */
  async setValues(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: ICustomFieldValuePayload | ICustomFieldValuePayload[]
  ): Promise<ICustomFieldValueBulkResponse> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/custom-values/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Update a single custom field value.
   */
  async updateValue(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    valueId: string,
    data: Partial<ICustomFieldValuePayload>
  ): Promise<ICustomFieldValue> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/custom-values/${valueId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Delete a custom field value.
   */
  async deleteValue(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    valueId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/custom-values/${valueId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
