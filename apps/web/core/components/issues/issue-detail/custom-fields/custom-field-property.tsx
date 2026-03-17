"use client";

import { useCallback } from "react";
import type { ICustomField, ICustomFieldValue, ECustomFieldType } from "@plane/types";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import {
  CustomFieldTextInput,
  CustomFieldNumberInput,
  CustomFieldSelectInput,
  CustomFieldDateInput,
  CustomFieldCheckboxInput,
  CustomFieldUrlInput,
} from "./field-inputs";

// Icon components for each field type
const TextFieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <path d="M3 4H13M5 4V12M11 4V12M4 12H6M10 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NumberFieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <path d="M5.5 3L4 13M12 3L10.5 13M3 6H13.5M2.5 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SelectFieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const DateFieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 7H14M5 1V4M11 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CheckboxFieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UrlFieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <path d="M6.5 9.5L9.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 11L7.5 12.5C6.4 13.6 4.6 13.6 3.5 12.5C2.4 11.4 2.4 9.6 3.5 8.5L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 5L8.5 3.5C9.6 2.4 11.4 2.4 12.5 3.5C13.6 4.6 13.6 6.4 12.5 7.5L11 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FIELD_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  text: TextFieldIcon,
  number: NumberFieldIcon,
  select: SelectFieldIcon,
  multi_select: SelectFieldIcon,
  date: DateFieldIcon,
  checkbox: CheckboxFieldIcon,
  url: UrlFieldIcon,
};

type Props = {
  field: ICustomField;
  value: ICustomFieldValue | undefined;
  onValueChange: (fieldId: string, value: unknown) => void;
  disabled?: boolean;
};

export const CustomFieldProperty = ({ field, value, onValueChange, disabled = false }: Props) => {
  const Icon = FIELD_TYPE_ICONS[field.field_type] || TextFieldIcon;
  const currentValue = value?.value;

  const handleChange = useCallback(
    (newValue: unknown) => {
      onValueChange(field.id, newValue);
    },
    [field.id, onValueChange]
  );

  const renderInput = () => {
    switch (field.field_type) {
      case "text":
        return (
          <CustomFieldTextInput
            value={(currentValue as string) || ""}
            onChange={handleChange as (v: string) => void}
            disabled={disabled}
          />
        );
      case "number":
        return (
          <CustomFieldNumberInput
            value={(currentValue as number) ?? null}
            onChange={handleChange as (v: number | null) => void}
            disabled={disabled}
          />
        );
      case "select":
      case "multi_select":
        return (
          <CustomFieldSelectInput
            value={(currentValue as string) || ""}
            options={field.options || []}
            onChange={handleChange as (v: string) => void}
            disabled={disabled}
          />
        );
      case "date":
        return (
          <CustomFieldDateInput
            value={(currentValue as string) || ""}
            onChange={handleChange as (v: string) => void}
            disabled={disabled}
          />
        );
      case "checkbox":
        return (
          <CustomFieldCheckboxInput
            value={Boolean(currentValue)}
            onChange={handleChange as (v: boolean) => void}
            disabled={disabled}
          />
        );
      case "url":
        return (
          <CustomFieldUrlInput
            value={(currentValue as string) || ""}
            onChange={handleChange as (v: string) => void}
            disabled={disabled}
          />
        );
      default:
        return (
          <CustomFieldTextInput
            value={(currentValue as string) || ""}
            onChange={handleChange as (v: string) => void}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <SidebarPropertyListItem icon={Icon} label={field.name}>
      {renderInput()}
    </SidebarPropertyListItem>
  );
};
