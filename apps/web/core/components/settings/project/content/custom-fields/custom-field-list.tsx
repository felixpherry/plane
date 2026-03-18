"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Type, Hash, List, Calendar, CheckSquare, Link2, Pencil, Trash2 } from "lucide-react";
import { Card, ECardVariant, ECardSpacing, Badge, CustomMenu } from "@plane/ui";
import type { ICustomField, ICustomFieldCreatePayload } from "@plane/types";
import { CustomFieldService } from "@plane/services";
import { CustomFieldInlineForm } from "./custom-field-inline-form";

const customFieldService = new CustomFieldService();

const FIELD_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  text: Type,
  number: Hash,
  select: List,
  multi_select: List,
  date: Calendar,
  checkbox: CheckSquare,
  url: Link2,
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Single line",
  number: "Number",
  select: "Single select",
  multi_select: "Multi select",
  date: "Date",
  checkbox: "Checkbox",
  url: "URL",
};

export const CustomFieldSettings = () => {
  const { workspaceSlug, projectId } = useParams();
  const [fields, setFields] = useState<ICustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const slug = workspaceSlug as string;
  const project = projectId as string;

  const fetchFields = useCallback(async () => {
    if (!slug || !project) return;
    try {
      setIsLoading(true);
      const data = await customFieldService.listFields(slug, project);
      setFields(data);
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
    } finally {
      setIsLoading(false);
    }
  }, [slug, project]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleCreate = async (data: ICustomFieldCreatePayload) => {
    try {
      await customFieldService.createField(slug, project, data);
      await fetchFields();
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create custom field:", error);
    }
  };

  const handleUpdate = async (fieldId: string, data: Partial<ICustomField>) => {
    try {
      await customFieldService.updateField(slug, project, fieldId, data);
      await fetchFields();
      setEditingFieldId(null);
    } catch (error) {
      console.error("Failed to update custom field:", error);
    }
  };

  const handleDelete = async (fieldId: string) => {
    try {
      await customFieldService.deleteField(slug, project, fieldId);
      await fetchFields();
    } catch (error) {
      console.error("Failed to delete custom field:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-10">
        <span className="text-sm text-custom-text-300">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-3">
        {fields.map((field) => {
          if (editingFieldId === field.id) {
            return (
              <CustomFieldInlineForm
                key={field.id}
                mode="edit"
                initialData={field}
                onSubmit={(data) => handleUpdate(field.id, data)}
                onCancel={() => setEditingFieldId(null)}
              />
            );
          }

          const Icon = FIELD_TYPE_ICONS[field.field_type] || Type;

          return (
            <Card
              key={field.id}
              variant={ECardVariant.WITHOUT_SHADOW}
              spacing={ECardSpacing.SM}
              className="group flex flex-row items-center justify-between"
            >
              {/* Left: Icon + Name + Description */}
              <div className="m-0 flex min-w-0 items-center gap-3">
                <div className="text-custom-text-300 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm text-custom-text-100 truncate font-medium">{field.name}</span>
                  {field.description && <p className="text-xs text-custom-text-300 truncate">{field.description}</p>}
                </div>
              </div>

              {/* Right: Type badge + Mandatory badge + Active/Disabled badge + Menu */}
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="accent-neutral" size="sm">
                  {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                </Badge>

                {field.is_required && (
                  <Badge variant="accent-neutral" size="sm">
                    Mandatory
                  </Badge>
                )}

                <Badge variant={field.is_active ? "accent-success" : "accent-destructive"} size="sm">
                  {field.is_active ? "Active" : "Disabled"}
                </Badge>

                <CustomMenu ellipsis placement="bottom-end" closeOnSelect>
                  <CustomMenu.MenuItem
                    onClick={() => {
                      setEditingFieldId(field.id);
                      setShowCreateForm(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </CustomMenu.MenuItem>
                  <CustomMenu.MenuItem
                    onClick={() => handleDelete(field.id)}
                    className="flex items-center gap-2 text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </CustomMenu.MenuItem>
                </CustomMenu>
              </div>
            </Card>
          );
        })}

        {/* Inline create form */}
        {showCreateForm && (
          <CustomFieldInlineForm mode="create" onSubmit={handleCreate} onCancel={() => setShowCreateForm(false)} />
        )}
      </div>

      {/* Add button */}
      {!showCreateForm && !editingFieldId && (
        <button
          type="button"
          className="text-sm text-custom-primary-100 hover:text-custom-primary-200 mt-4 flex items-center gap-1.5 font-medium transition-colors"
          onClick={() => setShowCreateForm(true)}
        >
          <span>+</span>
          <span>Add new custom field</span>
        </button>
      )}
    </div>
  );
};
