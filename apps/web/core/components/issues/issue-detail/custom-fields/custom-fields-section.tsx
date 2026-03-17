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
      try {
        await customFieldService.setValues(workspaceSlug, projectId, issueId, [
          { custom_field: fieldId, value: newValue },
        ]);
        // Re-fetch values after update
        const updatedValues = await customFieldService.listValues(workspaceSlug, projectId, issueId);
        setValues(updatedValues);
      } catch (error) {
        console.error("Failed to update custom field value:", error);
      }
    },
    [workspaceSlug, projectId, issueId]
  );

  // Don't render section if loading or no active custom fields
  if (isLoading) return null;
  if (activeFields.length === 0) return null;

  return (
    <>
      <h5 className="mt-5 mb-2 text-body-xs-medium text-tertiary">Custom Properties</h5>
      <div className="space-y-2.5">
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
    </>
  );
};
