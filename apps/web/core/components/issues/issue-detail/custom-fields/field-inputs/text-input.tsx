"use client";

import { useState, useRef } from "react";
import { Input } from "@plane/ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const CustomFieldTextInput = ({ value, onChange, disabled = false }: Props) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        className="hover:bg-custom-background-80 flex h-7.5 w-full items-center truncate rounded-sm px-1.5 text-body-xs-medium transition-colors"
        onClick={() => {
          if (!disabled) {
            setIsEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        disabled={disabled}
      >
        <span className={value ? "" : "text-placeholder"}>{value || "Add text"}</span>
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      mode="transparent"
      inputSize="xs"
      className="w-full text-body-xs-medium"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSubmit();
        if (e.key === "Escape") {
          setLocalValue(value);
          setIsEditing(false);
        }
      }}
      disabled={disabled}
    />
  );
};
