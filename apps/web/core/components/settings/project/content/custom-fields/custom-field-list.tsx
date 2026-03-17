"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Type,
  Hash,
  List,
  Calendar,
  CheckSquare,
  Link2,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { CustomFieldService } from "@plane/services";
import type { ICustomField } from "@plane/types";
import { CustomFieldInlineForm } from "./custom-field-inline-form";

const customFieldService = new CustomFieldService();

const FIELD_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }> }
> = {
  text: { label: "Single line", icon: Type },
  number: { label: "Number", icon: Hash },
  select: { label: "Single select", icon: List },
  multi_select: { label: "Multi select", icon: List },
  date: { label: "Date", icon: Calendar },
  checkbox: { label: "Checkbox", icon: CheckSquare },
  url: { label: "URL", icon: Link2 },
};

type Props = {
  workspaceSlug: string;
  projectId: string;
};

export const CustomFieldSettingsList = ({
  workspaceSlug,
  projectId,
}: Props) => {
  const [fields, setFields] = useState<ICustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<ICustomField | null>(
    null
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    try {
      const data = await customFieldService.listFields(
        workspaceSlug,
        projectId
      );
      setFields(data);
    } catch (error) {
      console.error("Failed to fetch custom fields", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, projectId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleCreate = async (data: {
    name: string;
    field_type: string;
    description: string;
    options: string[];
    is_required: boolean;
    is_active: boolean;
  }) => {
    await customFieldService.createField(workspaceSlug, projectId, data);
    setShowForm(false);
    await fetchFields();
  };

  const handleUpdate = async (data: {
    name: string;
    field_type: string;
    description: string;
    options: string[];
    is_required: boolean;
    is_active: boolean;
  }) => {
    if (!editingField) return;
    await customFieldService.updateField(
      workspaceSlug,
      projectId,
      editingField.id,
      data
    );
    setEditingField(null);
    await fetchFields();
  };

  const handleDelete = async (fieldId: string) => {
    await customFieldService.deleteField(
      workspaceSlug,
      projectId,
      fieldId
    );
    setOpenMenuId(null);
    await fetchFields();
  };

  const handleEdit = (field: ICustomField) => {
    setEditingField(field);
    setShowForm(false);
    setOpenMenuId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-custom-text-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Field list */}
      {fields.map((field) => {
        const typeConfig = FIELD_TYPE_CONFIG[field.field_type];
        const TypeIcon = typeConfig?.icon || Type;

        // Show inline edit form instead of the row
        if (editingField?.id === field.id) {
          return (
            <CustomFieldInlineForm
              key={field.id}
              onSubmit={handleUpdate}
              onCancel={() => setEditingField(null)}
              initialData={{
                name: field.name,
                field_type: field.field_type,
                description: field.description || "",
                options: field.options || [],
                is_required: field.is_required,
                is_active: field.is_active,
              }}
              isEdit
            />
          );
        }

        return (
          <div
            key={field.id}
            className="group flex items-center justify-between rounded-lg border border-custom-border-200 bg-custom-background-100 px-4 py-3 hover:bg-custom-background-90 transition-colors"
          >
            {/* Left: Icon + Name */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-custom-background-80">
                <TypeIcon className="h-4 w-4 text-custom-text-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-custom-text-100 truncate">
                  {field.name}
                </p>
                {field.description && (
                  <p className="text-xs text-custom-text-400 truncate">
                    {field.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Badges + Menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Type badge */}
              <span className="rounded-full bg-custom-background-80 px-2.5 py-0.5 text-xs font-medium text-custom-text-300">
                {typeConfig?.label || field.field_type}
              </span>

              {/* Mandatory badge */}
              {field.is_required && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                  Mandatory
                </span>
              )}

              {/* Active/Disabled badge */}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  field.is_active
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {field.is_active ? "Active" : "Disabled"}
              </span>

              {/* More menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(
                      openMenuId === field.id ? null : field.id
                    );
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-custom-background-80 transition-all"
                >
                  <MoreHorizontal className="h-4 w-4 text-custom-text-300" />
                </button>
                {openMenuId === field.id && (
                  <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-custom-border-200 bg-custom-background-100 py-1 shadow-custom-shadow-rg">
                    <button
                      type="button"
                      onClick={() => handleEdit(field)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-custom-text-200 hover:bg-custom-background-80 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(field.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-custom-background-80 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Inline create form */}
      {showForm && (
        <CustomFieldInlineForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Add button */}
      {!showForm && !editingField && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-custom-border-200 px-4 py-3 text-sm font-medium text-custom-text-300 hover:border-custom-primary-100 hover:text-custom-primary-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add new custom field
        </button>
      )}

      {/* Empty state */}
      {fields.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-custom-border-200 bg-custom-background-90 py-10">
          <p className="text-sm text-custom-text-400">
            No custom fields yet
          </p>
          <p className="mt-1 text-xs text-custom-text-400">
            Click &quot;Add new custom field&quot; to create your first one
          </p>
        </div>
      )}
    </div>
  );
};
