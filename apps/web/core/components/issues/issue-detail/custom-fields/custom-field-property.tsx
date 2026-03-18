"use client";

import { useCallback } from "react";
import { Type, Hash, List, Calendar, CheckSquare, Link2 } from "lucide-react";
import type { ICustomField, ICustomFieldValue } from "@plane/types";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import {
  CustomFieldTextInput,
  CustomFieldNumberInput,
  CustomFieldSelectInput,
  CustomFieldCheckboxInput,
  CustomFieldUrlInput,
} from "./field-inputs";
import { DateDropdown } from "@/components/dropdowns/date";
import { renderFormattedPayloadDate } from "@plane/utils";

const FIELD_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  text: Type,
  number: Hash,
  select: List,
  multi_select: List,
  date: Calendar,
  checkbox: CheckSquare,
  url: Link2,
};

type Props = {
  field: ICustomField;
  value: ICustomFieldValue | undefined;
  onValueChange: (fieldId: string, value: unknown) => void;
  disabled?: boolean;
};

export const CustomFieldProperty = ({ field, value, onValueChange, disabled = false }: Props) => {
  const Icon = FIELD_TYPE_ICONS[field.field_type] || Type;
  const currentValue = value?.value as unknown;

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
            fieldName={field.name}
            buttonVariant="transparent-with-text"
            className="group w-full grow"
            buttonContainerClassName="w-full text-left h-7.5"
            buttonClassName={`text-body-xs-medium ${currentValue ? "" : "text-placeholder"}`}
            dropdownArrow
            dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
          />
        );

      case "date":
        return (
          <DateDropdown
            value={currentValue ? new Date(currentValue as string) : null}
            onChange={(val) => {
              handleChange(val ? renderFormattedPayloadDate(val) : null);
            }}
            placeholder={`Add ${field.name}`}
            buttonVariant="transparent-with-text"
            disabled={disabled}
            className="group w-full grow"
            buttonContainerClassName="w-full text-left h-7.5"
            buttonClassName={`text-body-xs-medium ${currentValue ? "" : "text-placeholder"}`}
            hideIcon
            clearIconClassName="h-3 w-3 hidden group-hover:inline"
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
