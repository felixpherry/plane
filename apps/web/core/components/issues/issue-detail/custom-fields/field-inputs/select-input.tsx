"use client";

import { useRef, useState } from "react";
import { Combobox } from "@headlessui/react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
// plane imports
import { CheckIcon, SearchIcon } from "@plane/propel/icons";
import { cn } from "@plane/utils";
// hooks
import { useDropdown } from "@/hooks/use-dropdown";
import { usePlatformOS } from "@/hooks/use-platform-os";
// components
import { DropdownButton } from "@/components/dropdowns/buttons";

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
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // states
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // popper refs
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // hooks
  const { isMobile } = usePlatformOS();
  // popper-js
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "bottom-start",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 12,
        },
      },
    ],
  });

  const { handleClose, handleKeyDown, handleOnClick } = useDropdown({
    dropdownRef,
    isOpen,
    onClose: () => {
      setQuery("");
    },
    setIsOpen,
  });

  const placeholder = fieldName ? `Add ${fieldName}` : "Add value";

  const filteredOptions =
    query === ""
      ? options
      : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (val: string) => {
    // Toggle: clicking selected item deselects it
    if (value === val) {
      onChange("");
    } else {
      onChange(val);
    }
  };

  const searchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (query !== "" && e.key === "Escape") {
      e.stopPropagation();
      setQuery("");
    }
  };

  return (
    <Combobox
      as="div"
      ref={dropdownRef}
      value={value}
      onChange={handleSelect}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      className="h-full w-full grow"
    >
      <Combobox.Button as="div">
        <button
          ref={setReferenceElement}
          type="button"
          className={cn(
            "clickable flex h-7.5 w-full items-center rounded-sm px-2 outline-none hover:bg-custom-background-80 transition-colors",
            {
              "cursor-not-allowed text-secondary": disabled,
              "cursor-pointer": !disabled,
            }
          )}
          onClick={handleOnClick}
          disabled={disabled}
        >
          <span
            className={cn(
              "flex-grow truncate text-left text-body-xs-medium leading-5",
              value ? "text-secondary" : "text-placeholder"
            )}
          >
            {value || placeholder}
          </span>
        </button>
      </Combobox.Button>

      {isOpen &&
        createPortal(
          <Combobox.Options data-prevent-outside-click static>
            <div
              className={cn(
                "z-30 my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none"
              )}
              ref={setPopperElement}
              style={{ ...styles.popper }}
              {...attributes.popper}
            >
              <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
                <SearchIcon className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
                <Combobox.Input
                  as="input"
                  ref={inputRef}
                  className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  onKeyDown={searchInputKeyDown}
                  autoFocus={!isMobile}
                />
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-scroll">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <Combobox.Option
                      key={option}
                      value={option}
                      className={({ active }) =>
                        cn(
                          "flex w-full items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 cursor-pointer select-none",
                          active && "bg-layer-transparent-hover",
                          value === option ? "text-primary" : "text-secondary"
                        )
                      }
                    >
                      <span className="flex-grow truncate">{option}</span>
                      {value === option && (
                        <CheckIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                    </Combobox.Option>
                  ))
                ) : (
                  <p className="px-1.5 py-1 text-placeholder italic">
                    No matching results
                  </p>
                )}
              </div>
            </div>
          </Combobox.Options>,
          document.body
        )}
    </Combobox>
  );
};
