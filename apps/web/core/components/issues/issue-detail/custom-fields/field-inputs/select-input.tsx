"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export const CustomFieldSelectInput = ({ value, options, onChange, disabled = false, placeholder = "Select..." }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="flex h-7.5 w-full items-center justify-between truncate rounded px-2 text-left text-body-xs-regular hover:bg-subtle-2 transition-colors group"
        disabled={disabled}
      >
        <span className={value ? "text-primary" : "text-placeholder"}>
          {value || placeholder}
        </span>
        <svg className="size-3.5 shrink-0 text-tertiary hidden group-hover:inline" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-subtle-3 bg-surface-1 py-1 shadow-lg">
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setIsOpen(false); }}
              className="flex w-full items-center px-3 py-1.5 text-body-xs-regular text-placeholder hover:bg-subtle-2"
            >
              Clear
            </button>
          )}
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { onChange(option); setIsOpen(false); }}
              className={`flex w-full items-center px-3 py-1.5 text-body-xs-regular hover:bg-subtle-2 ${
                value === option ? "text-primary font-medium" : "text-primary"
              }`}
            >
              {value === option && (
                <svg className="mr-2 size-3" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
