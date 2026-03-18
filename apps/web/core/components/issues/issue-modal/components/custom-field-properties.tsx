/* eslint-disable */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Popover } from "@headlessui/react";
import { Type, Hash, List, CheckSquare, Link2, Check } from "lucide-react";
import { Input } from "@plane/ui";
import { renderFormattedPayloadDate } from "@plane/utils";
import type { ICustomField } from "@plane/types";
import { CustomFieldService } from "@plane/services";
import { CustomFieldSelectInput } from "@/components/issues/issue-detail/custom-fields/field-inputs";
import { DateDropdown } from "@/components/dropdowns/date";

const customFieldService = new CustomFieldService();

type Props = {
  workspaceSlug: string;
  projectId: string | null;
  customFieldValues: Record<string, unknown>;
  onCustomFieldChange: (fieldId: string, value: unknown) => void;
};

// Popover input for text/number/url fields
const InlineFieldInput = ({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: "text" | "number" | "url";
  placeholder?: string;
}) => (
  <Popover className="relative h-full">
    {({ close }) => (
      <>
        <Popover.Button className="text-custom-text-100 flex h-full cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-caption-sm-regular hover:bg-layer-1">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="text-body-xs-medium whitespace-nowrap">
            {value ? <span className="max-w-24 truncate">{value}</span> : `Add ${label}`}
          </span>
        </Popover.Button>

        <Popover.Panel className="absolute left-0 z-20 mt-1 min-w-56 rounded-md border-[0.5px] border-strong bg-surface-1 p-2 shadow-raised-200">
          <Input
            type={type}
            mode="primary"
            inputSize="sm"
            className="w-full"
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
            autoFocus
          />
        </Popover.Panel>
      </>
    )}
  </Popover>
);

export const CustomFieldProperties = ({ workspaceSlug, projectId, customFieldValues, onCustomFieldChange }: Props) => {
  const [fields, setFields] = useState<ICustomField[]>([]);

  const fetchFields = useCallback(async () => {
    if (!workspaceSlug || !projectId) return;
    try {
      const data = await customFieldService.listFields(workspaceSlug, projectId);
      setFields(data.filter((f) => f.is_active));
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
    }
  }, [workspaceSlug, projectId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  if (fields.length === 0) return null;

  return (
    <>
      {fields.map((field) => {
        const value = customFieldValues[field.id];

        switch (field.field_type) {
          case "select":
            return (
              <div key={field.id} className="h-7">
                <CustomFieldSelectInput
                  value={(value as string) || ""}
                  options={field.options || []}
                  onChange={(val) => onCustomFieldChange(field.id, val)}
                  fieldName={field.name}
                  buttonVariant="border-with-text"
                  buttonClassName="text-caption-sm-regular text-custom-text-100"
                  prependIcon={<List className="h-3 w-3" />}
                />
              </div>
            );

          case "multi_select":
            return (
              <div key={field.id} className="h-7">
                <CustomFieldSelectInput
                  value={(value as string[]) || []}
                  options={field.options || []}
                  onChange={(val) => onCustomFieldChange(field.id, val)}
                  fieldName={field.name}
                  multiple
                  buttonVariant="border-with-text"
                  buttonClassName="text-caption-sm-regular text-custom-text-100"
                  prependIcon={<List className="h-3 w-3" />}
                />
              </div>
            );

          case "date":
            return (
              <div key={field.id} className="h-7">
                <DateDropdown
                  value={value ? new Date(value as string) : null}
                  onChange={(date) => {
                    onCustomFieldChange(field.id, date ? renderFormattedPayloadDate(date) : null);
                  }}
                  buttonVariant="border-with-text"
                  placeholder={`Add ${field.name}`}
                />
              </div>
            );

          case "checkbox":
            return (
              <div key={field.id} className="h-7">
                <button
                  type="button"
                  className="text-custom-text-100 flex h-full cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-caption-sm-regular hover:bg-layer-1"
                  onClick={() => onCustomFieldChange(field.id, !value)}
                >
                  <CheckSquare className="h-3 w-3 shrink-0" />
                  <span className="text-body-xs-medium whitespace-nowrap">{field.name}</span>
                  {!!value && <Check className="text-custom-primary-100 h-3 w-3 shrink-0" />}
                </button>
              </div>
            );

          case "text":
            return (
              <div key={field.id} className="h-7">
                <InlineFieldInput
                  icon={Type}
                  label={field.name}
                  value={(value as string) || ""}
                  onChange={(val) => onCustomFieldChange(field.id, val)}
                  type="text"
                />
              </div>
            );

          case "number":
            return (
              <div key={field.id} className="h-7">
                <InlineFieldInput
                  icon={Hash}
                  label={field.name}
                  value={value !== undefined && value !== null ? String(value) : ""}
                  onChange={(val) => onCustomFieldChange(field.id, val ? Number(val) : null)}
                  type="number"
                />
              </div>
            );

          case "url":
            return (
              <div key={field.id} className="h-7">
                <InlineFieldInput
                  icon={Link2}
                  label={field.name}
                  value={(value as string) || ""}
                  onChange={(val) => onCustomFieldChange(field.id, val)}
                  type="url"
                  placeholder="https://"
                />
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
};
