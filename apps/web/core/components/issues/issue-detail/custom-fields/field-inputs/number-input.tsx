"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
};

export const CustomFieldNumberInput = ({ value, onChange, disabled = false, placeholder = "Enter number..." }: Props) => {
  const [localValue, setLocalValue] = useState(value !== null && value !== undefined ? String(value) : "");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value !== null && value !== undefined ? String(value) : "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const numVal = localValue === "" ? null : Number(localValue);
    if (numVal !== value) {
      onChange(numVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBlur();
    if (e.key === "Escape") {
      setLocalValue(value !== null && value !== undefined ? String(value) : "");
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
        <span className={localValue ? "text-primary" : "text-placeholder"}>
          {localValue || placeholder}
        </span>
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
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
