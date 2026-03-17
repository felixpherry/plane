"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import type { ICustomField, ICustomFieldValue } from "@plane/types";
import { CustomFieldService } from "@plane/services";
import { CustomFieldProperty } from "./custom-field-property";

const customFieldService = new CustomFieldService();

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export const CustomFieldsSection = ({ workspaceSlug, projectId, issueId, disabled = false }: Props) => {
  // Fetch custom field definitions for this project
  const { data: fields, isLoading: fieldsLoading } = useSWR(
    workspaceSlug && projectId ? `CUSTOM_FIELDS_${workspaceSlug}_${projectId}` : null,
    () => customFieldService.listFields(workspaceSlug, projectId)
  );

  // Fetch custom field values for this issue
  const { data: values, mutate: mutateValues, isLoading: valuesLoading } = useSWR(
    workspaceSlug && projectId && issueId ? `CUSTOM_FIELD_VALUES_${workspaceSlug}_${projectId}_${issueId}` : null,
    () => customFieldService.listValues(workspaceSlug, projectId, issueId)
  );

  // Only show active fields
  const activeFields = fields?.filter((f: ICustomField) => f.is_active) || [];

  // Build a lookup: custom_field id -> value object
  const valueMap = new Map<string, ICustomFieldValue>();
  if (values) {
    values.forEach((v: ICustomFieldValue) => {
      valueMap.set(v.custom_field, v);
    });
  }

  const handleValueChange = useCallback(
    async (fieldId: string, newValue: unknown) => {
      try {
        await customFieldService.setValues(workspaceSlug, projectId, issueId, [
          { custom_field: fieldId, value: newValue },
        ]);
        mutateValues();
      } catch (error) {
        console.error("Failed to update custom field value:", error);
      }
    },
    [workspaceSlug, projectId, issueId, mutateValues]
  );

  // Don't render section if no active custom fields
  if (fieldsLoading || valuesLoading) return null;
  if (activeFields.length === 0) return null;

  return (
    <>
      <h5 className="mt-5 mb-2 text-body-xs-medium text-tertiary">Custom Properties</h5>
      <div className="space-y-2.5">
        {activeFields.map((field: ICustomField) => (
          <CustomFieldProperty
            key={field.id}
            field={field}
            value={valueMap.get(field.id)}
            onValueChange={handleValueChange}
            disabled={disabled}
          />
        ))}
      </div>
    </>
  );
};
