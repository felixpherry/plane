"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [fields, setFields] = useState<ICustomField[]>([]);
  const [values, setValues] = useState<ICustomFieldValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch custom field definitions and values
  const fetchData = useCallback(async () => {
    if (!workspaceSlug || !projectId || !issueId) return;

    try {
      setIsLoading(true);
      const [fieldsRes, valuesRes] = await Promise.all([
        customFieldService.listFields(workspaceSlug, projectId),
        customFieldService.listValues(workspaceSlug, projectId, issueId),
      ]);
      setFields(fieldsRes);
      setValues(valuesRes);
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, projectId, issueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Only show active fields
  const activeFields = fields.filter((f) => f.is_active);

  // Build a lookup: custom_field id -> value object
  const valueMap = new Map<string, ICustomFieldValue>();
  values.forEach((v) => {
    valueMap.set(v.custom_field, v);
  });

  const handleValueChange = useCallback(
    async (fieldId: string, newValue: unknown) => {
      // Optimistic update — update state immediately
      setValues((prev) => {
        const existingIndex = prev.findIndex((v) => v.custom_field === fieldId);
        if (existingIndex >= 0) {
          // Update existing value
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            value: newValue,
          };
          return updated;
        } else {
          // Add new value entry
          return [
            ...prev,
            {
              id: `temp-${fieldId}`,
              custom_field: fieldId,
              value: newValue,
              issue: issueId,
              workspace: "",
              project: "",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
              created_by: "",
              updated_by: null,
            } as ICustomFieldValue,
          ];
        }
      });

      try {
        // Send to API in background
        await customFieldService.setValues(workspaceSlug, projectId, issueId, [
          { custom_field: fieldId, value: newValue },
        ]);
        // Silently sync real data from server
        const updatedValues = await customFieldService.listValues(workspaceSlug, projectId, issueId);
        setValues(updatedValues);
      } catch (error) {
        console.error("Failed to update custom field value:", error);
        // Revert on error — re-fetch original values
        const originalValues = await customFieldService.listValues(workspaceSlug, projectId, issueId);
        setValues(originalValues);
      }
    },
    [workspaceSlug, projectId, issueId]
  );

  // Don't render section if loading or no active custom fields
  if (isLoading) return null;
  if (activeFields.length === 0) return null;

  return (
    <div className="w-full overflow-y-auto">
      <h5 className="mb-2 text-body-sm-medium">Custom Properties</h5>
      <div className="flex flex-col gap-3">
        {activeFields.map((field) => (
          <CustomFieldProperty
            key={field.id}
            field={field}
            value={valueMap.get(field.id)}
            onValueChange={handleValueChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
