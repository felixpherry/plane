"use client";

import { useEffect, useRef, useState } from "react";
import {
  Type,
  Hash,
  List,
  Calendar,
  CheckSquare,
  Link2,
  X,
  Plus,
} from "lucide-react";

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
    field_type: string;
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
  isEdit?: boolean;
};

export const CustomFieldInlineForm = ({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
}: Props) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [fieldType, setFieldType] = useState(
    initialData?.field_type || "text"
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [options, setOptions] = useState<string[]>(
    initialData?.options || []
  );
  const [newOption, setNewOption] = useState("");
  const [isRequired, setIsRequired] = useState(
    initialData?.is_required || false
  );
  const [isActive, setIsActive] = useState(
    initialData?.is_active !== undefined ? initialData.is_active : true
  );

  const isSelectType =
    fieldType === "select" || fieldType === "multi_select";

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

  const selectedType = FIELD_TYPES.find((t) => t.value === fieldType);

  return (
    <div
      ref={formRef}
      className="rounded-lg border border-custom-border-200 bg-custom-background-100 p-4"
    >
      <div className="flex flex-col gap-4">
        {/* Row 1: Name + Type */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-custom-text-300">
              Title
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Field name"
              className="w-full rounded-md border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-sm text-custom-text-200 placeholder-custom-text-400 outline-none focus:border-custom-primary-100"
            />
          </div>
          <div className="w-48">
            <label className="mb-1.5 block text-xs font-medium text-custom-text-300">
              Property type
            </label>
            <div className="relative">
              <select
                value={fieldType}
                onChange={(e) => {
                  setFieldType(e.target.value);
                  if (
                    e.target.value !== "select" &&
                    e.target.value !== "multi_select"
                  ) {
                    setOptions([]);
                  }
                }}
                className="w-full appearance-none rounded-md border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-sm text-custom-text-200 outline-none focus:border-custom-primary-100"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Description */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-custom-text-300">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-md border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-sm text-custom-text-200 placeholder-custom-text-400 outline-none focus:border-custom-primary-100"
          />
        </div>

        {/* Row 3: Options (only for select types) */}
        {isSelectType && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-custom-text-300">
              Options
            </label>
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-custom-border-200 bg-custom-background-90 px-3 py-1.5 text-sm text-custom-text-200"
                >
                  <span className="flex-1">{option}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="text-custom-text-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add an option"
                  className="flex-1 rounded-md border border-custom-border-200 bg-custom-background-100 px-3 py-1.5 text-sm text-custom-text-200 placeholder-custom-text-400 outline-none focus:border-custom-primary-100"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-custom-primary-100 hover:bg-custom-primary-100/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Row 4: Toggles + Actions */}
        <div className="flex items-center justify-between border-t border-custom-border-200 pt-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-custom-text-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-custom-border-300 accent-custom-primary-100"
              />
              Mandatory property
            </label>
            <label className="flex items-center gap-2 text-sm text-custom-text-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-custom-border-300 accent-custom-primary-100"
              />
              Active
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-custom-text-300 hover:bg-custom-background-80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || (isSelectType && options.length === 0)}
              className="rounded-md bg-custom-primary-100 px-3 py-1.5 text-sm font-medium text-white hover:bg-custom-primary-200 disabled:opacity-50 transition-colors"
            >
              {isSubmitting
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
