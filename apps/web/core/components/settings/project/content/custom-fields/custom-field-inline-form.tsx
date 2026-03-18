"use client";

import { useEffect, useRef, useState } from "react";
import { Type, Hash, List, Calendar, CheckSquare, Link2, X, Plus } from "lucide-react";
import { Button, Input, Checkbox, Card, ECardVariant, ECardSpacing } from "@plane/ui";
import { ECustomFieldType } from "@plane/types";

const FIELD_TYPES = [
  { value: "text", label: "Single line", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "select", label: "Single select", icon: List },
  { value: "multi_select", label: "Multi select", icon: List },
  { value: "date", label: "Date", icon: Calendar },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "url", label: "URL", icon: Link2 },
] as const;

type Props = {
  onSubmit: (data: {
    name: string;
    field_type: ECustomFieldType;
    description: string;
    options: string[];
    is_required: boolean;
    is_active: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    name: string;
    field_type: string;
    description: string;
    options: string[];
    is_required: boolean;
    is_active: boolean;
  };
  mode?: "create" | "edit";
};

export const CustomFieldInlineForm = ({ onSubmit, onCancel, initialData, mode = "create" }: Props) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [fieldType, setFieldType] = useState<ECustomFieldType>(
    (initialData?.field_type as ECustomFieldType) || ECustomFieldType.TEXT
  );

  const [description, setDescription] = useState(initialData?.description || "");
  const [options, setOptions] = useState<string[]>(initialData?.options || []);
  const [newOption, setNewOption] = useState("");
  const [isRequired, setIsRequired] = useState(initialData?.is_required || false);
  const [isActive, setIsActive] = useState(initialData?.is_active !== undefined ? initialData.is_active : true);

  const isEdit = mode === "edit";
  const isSelectType = fieldType === "select" || fieldType === "multi_select";

  useEffect(() => {
    nameInputRef.current?.focus();
    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (isSelectType && options.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        field_type: fieldType,
        description: description.trim(),
        options: isSelectType ? options : [],
        is_required: isRequired,
        is_active: isActive,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card ref={formRef} variant={ECardVariant.WITHOUT_SHADOW} spacing={ECardSpacing.SM}>
      <div className="flex flex-col gap-4">
        {/* Row 1: Name + Type */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <label htmlFor="title" className="text-custom-text-300 mb-1.5 block text-12 font-medium">
              Title
            </label>
            <Input
              id="title"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Field name"
              mode="primary"
              inputSize="sm"
              className="w-full"
            />
          </div>
          <div className="w-48">
            <label htmlFor="propertyType" className="text-custom-text-300 mb-1.5 block text-12 font-medium">
              Property type
            </label>
            <select
              id="propertyType"
              value={fieldType}
              onChange={(e) => {
                setFieldType(e.target.value as ECustomFieldType);
                if (e.target.value !== "select" && e.target.value !== "multi_select") {
                  setOptions([]);
                }
              }}
              className="placeholder-tertiary block w-full rounded-md border-[0.5px] border-subtle-1 bg-layer-2 px-3 py-2 text-13 focus:outline-none"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Description */}
        <div>
          <label htmlFor="description" className="text-custom-text-300 mb-1.5 block text-12 font-medium">
            Description
          </label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            mode="primary"
            inputSize="sm"
            className="w-full"
          />
        </div>

        {/* Row 3: Options (only for select types) */}
        {isSelectType && (
          <div>
            <span className="text-custom-text-300 mb-1.5 block text-12 font-medium">Options</span>
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div
                  key={option}
                  className="flex items-center gap-2 rounded-md border-[0.5px] border-subtle-1 bg-layer-2 px-3 py-1.5 text-13"
                >
                  <span className="flex-1">{option}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="text-custom-text-400 transition-colors hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add an option"
                  mode="primary"
                  inputSize="sm"
                  className="flex-1"
                />
                <Button
                  variant="link-primary"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                  prependIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Row 4: Toggles + Actions */}
        <div className="flex items-center justify-between border-t border-subtle pt-4">
          <div className="flex items-center gap-6">
            <label
              htmlFor="mandatoryProperty"
              className="text-custom-text-300 flex cursor-pointer items-center gap-2 text-12"
            >
              <Checkbox id="mandatoryProperty" checked={isRequired} onChange={() => setIsRequired(!isRequired)} />
              Mandatory property
            </label>
            <label
              htmlFor="checkbox__active"
              className="text-custom-text-300 flex cursor-pointer items-center gap-2 text-12"
            >
              <Checkbox id="checkbox__active" checked={isActive} onChange={() => setIsActive(!isActive)} />
              Active
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="neutral-primary" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || (isSelectType && options.length === 0)}
              loading={isSubmitting}
            >
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
