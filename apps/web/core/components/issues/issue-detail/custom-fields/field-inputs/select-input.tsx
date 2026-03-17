"use client";

import { useState, useRef } from "react";
import { Popover } from "@headlessui/react";
import { Check, Search } from "lucide-react";

type Props = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  fieldName?: string;
};

export const CustomFieldSelectInput = ({
  value,
  options,
  onChange,
  disabled = false,
  fieldName = "",
}: Props) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (option: string) => {
    // Toggle: clicking selected item deselects it
    if (value === option) {
      onChange("");
    } else {
      onChange(option);
    }
    // Keep popover open — don't close
  };

  const placeholder = fieldName ? `Add ${fieldName}` : "Add value";

  return (
    <Popover className="relative w-full grow">
      {({ open }) => (
        <>
          <Popover.Button
            disabled={disabled}
            className="flex h-7.5 w-full items-center text-left text-body-xs-regular outline-none px-2 rounded-sm hover:bg-custom-background-80 transition-colors"
          >
            <span className={value ? "" : "text-placeholder"}>
              {value || placeholder}
            </span>
          </Popover.Button>

          <Popover.Panel
            className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-custom-border-200 bg-custom-background-100 shadow-custom-shadow-rg p-1"
          >
            <div className="flex items-center gap-1.5 rounded-sm border border-custom-border-200 bg-custom-background-90 px-2 py-1 mb-1">
              <Search className="h-3 w-3 text-custom-text-300" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent text-xs text-custom-text-200 placeholder-custom-text-400 outline-none"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="text-xs text-custom-text-400 px-2 py-1.5">
                  No matches
                </p>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-xs text-custom-text-200 hover:bg-custom-background-80 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                  >
                    <span>{option}</span>
                    {value === option && (
                      <Check className="h-3 w-3 text-custom-primary-100 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
};
