"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export const CustomFieldUrlInput = ({ value, onChange, disabled = false, placeholder = "Enter URL..." }: Props) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBlur();
    if (e.key === "Escape") {
      setLocalValue(value || "");
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => !disabled && setIsEditing(true)}
        className="flex h-7.5 w-full items-center truncate rounded px-2 text-left text-body-xs-regular hover:bg-subtle-2 transition-colors"
        disabled={disabled}
      >
        {localValue ? (
          <a
            href={localValue}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="truncate text-primary underline"
          >
            {localValue}
          </a>
        ) : (
          <span className="text-placeholder">{placeholder}</span>
        )}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="url"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className="h-7.5 w-full rounded border border-subtle-3 bg-transparent px-2 text-body-xs-regular text-primary outline-none focus:border-primary transition-colors"
    />
  );
};
