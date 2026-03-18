'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@plane/i18n';
import type { ICustomField, ICustomFieldValue } from '@plane/types';
import { CustomFieldService } from '@plane/services';
import { CustomFieldProperty } from './custom-field-property';

const customFieldService = new CustomFieldService();

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export const CustomFieldsSection = ({
  workspaceSlug,
  projectId,
  issueId,
  disabled = false,
}: Props) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<ICustomField[]>([]);
  const [values, setValues] = useState<ICustomFieldValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Failed to fetch custom fields:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, projectId, issueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeFields = fields.filter((f) => f.is_active);

  const valueMap = new Map<string, ICustomFieldValue>();
  values.forEach((v) => {
    valueMap.set(v.custom_field, v);
  });

  const handleValueChange = useCallback(
    async (fieldId: string, newValue: unknown) => {
      setValues((prev) => {
        const existingIndex = prev.findIndex((v) => v.custom_field === fieldId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            value: newValue as Record<string, unknown>,
          };

          return updated;
        } else {
          return [
            ...prev,
            {
              id: `temp-${fieldId}`,
              custom_field: fieldId,
              value: newValue,
              issue: issueId,
              workspace: '',
              project: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
              created_by: '',
              updated_by: null,
            } as ICustomFieldValue,
          ];
        }
      });

      try {
        await customFieldService.setValues(workspaceSlug, projectId, issueId, [
          { custom_field: fieldId, value: newValue },
        ]);
        const updatedValues = await customFieldService.listValues(
          workspaceSlug,
          projectId,
          issueId,
        );
        setValues(updatedValues);
      } catch (error) {
        console.error('Failed to update custom field value:', error);
        const originalValues = await customFieldService.listValues(
          workspaceSlug,
          projectId,
          issueId,
        );
        setValues(originalValues);
      }
    },
    [workspaceSlug, projectId, issueId],
  );

  if (isLoading) return null;
  if (activeFields.length === 0) return null;

  return (
    <>
      <h6 className='text-body-xs-medium'>{t('common.custom_properties')}</h6>
      <div className={`mt-3 w-full space-y-3 ${disabled ? 'opacity-60' : ''}`}>
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
