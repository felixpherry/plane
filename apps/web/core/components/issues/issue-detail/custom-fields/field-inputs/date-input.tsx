"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export const CustomFieldDateInput = ({ value, onChange, disabled = false, placeholder = "Select date..." }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = value
    ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.showPicker()}
        className="flex h-7.5 w-full items-center truncate rounded px-2 text-left text-body-xs-regular hover:bg-subtle-2 transition-colors group"
        disabled={disabled}
      >
        <span className={displayValue ? "text-primary" : "text-placeholder"}>
          {displayValue || placeholder}
        </span>
        {value && (
          <svg
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="ml-auto size-3 shrink-0 text-tertiary hidden group-hover:inline cursor-pointer"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value || ""}
        onChange={handleChange}
        disabled={disabled}
        className="invisible absolute inset-0 size-0"
        tabIndex={-1}
      />
    </div>
  );
};
