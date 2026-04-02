import type { ICustomField, ICustomFieldValuePayload } from "@plane/types";
import { CustomFieldService } from "@plane/services";

export type TCustomFieldPersistenceResult = {
  hasErrors: boolean;
  errorCount: number;
};

const normalizeCustomFieldValue = (field: ICustomField, value: unknown): unknown => {
  switch (field.field_type) {
    case "select":
      if (Array.isArray(value)) {
        return value[0] ?? "";
      }
      return value;

    case "multi_select":
      if (Array.isArray(value)) {
        return value;
      }
      if (value === undefined || value === null || value === "") {
        return [];
      }
      return [value];

    case "number":
      if (typeof value === "string") {
        return value === "" ? null : Number(value);
      }
      return value;

    default:
      return value;
  }
};

export const buildCustomFieldValuePayloads = (
  customFields: ICustomField[],
  customFieldValues: Record<string, unknown>
): ICustomFieldValuePayload[] => {
  const fieldMap = new Map(customFields.map((field) => [field.id, field] as const));

  return Object.entries(customFieldValues).flatMap(([fieldId, value]) => {
    if (value === undefined) {
      return [];
    }

    const field = fieldMap.get(fieldId);
    if (!field) {
      return [];
    }

    return [
      {
        custom_field: fieldId,
        value: normalizeCustomFieldValue(field, value),
      },
    ];
  });
};

export const persistCustomFieldValues = async (props: {
  customFieldService: CustomFieldService;
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  customFields: ICustomField[];
  customFieldValues: Record<string, unknown>;
}): Promise<TCustomFieldPersistenceResult> => {
  const payload = buildCustomFieldValuePayloads(props.customFields, props.customFieldValues);
  if (payload.length === 0) {
    return { hasErrors: false, errorCount: 0 };
  }

  try {
    const response = await props.customFieldService.setValues(
      props.workspaceSlug,
      props.projectId,
      props.issueId,
      payload
    );

    const errorCount = Array.isArray(response?.errors) ? response.errors.length : 0;
    return {
      hasErrors: errorCount > 0,
      errorCount,
    };
  } catch {
    return {
      hasErrors: true,
      errorCount: payload.length,
    };
  }
};
