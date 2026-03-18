/* eslint-disable */
"use client";

import { useRef, useState } from "react";
import { usePopper } from "react-popper";
import { Combobox } from "@headlessui/react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { SearchIcon, ChevronDownIcon, CheckIcon } from "@plane/propel/icons";
import { Badge, ComboDropDown } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { DropdownButton } from "@/components/dropdowns/buttons";
import { BUTTON_VARIANTS_WITH_TEXT } from "@/components/dropdowns/constants";
// hooks
import { useDropdown } from "@/hooks/use-dropdown";

type Props = {
  value: string | string[];
  options: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  fieldName?: string;
  multiple?: boolean;
  buttonVariant?: "transparent-with-text" | "border-with-text" | "background-with-text";
  className?: string;
  buttonContainerClassName?: string;
  buttonClassName?: string;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  showTooltip?: boolean;
  tabIndex?: number;
  prependIcon?: React.ReactNode;
};

const BADGE_COLORS = [
  "bg-blue-100 text-blue-600 border-blue-200",
  "bg-purple-100 text-purple-600 border-purple-200",
  "bg-teal-100 text-teal-600 border-teal-200",
  "bg-pink-100 text-pink-600 border-pink-200",
  "bg-orange-100 text-orange-600 border-orange-200",
  "bg-indigo-100 text-indigo-600 border-indigo-200",
  "bg-emerald-100 text-emerald-600 border-emerald-200",
  "bg-rose-100 text-rose-600 border-rose-200",
] as const;

const getColorIndex = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % BADGE_COLORS.length;
};

export const CustomFieldSelectInput = ({
  value,
  options,
  onChange,
  disabled = false,
  fieldName = "",
  multiple = false,
  buttonVariant = "transparent-with-text",
  className = "",
  buttonContainerClassName = "",
  buttonClassName = "",
  dropdownArrow = false,
  dropdownArrowClassName = "",
  placement,
  showTooltip = false,
  tabIndex,
  prependIcon,
}: Props) => {
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // popper-js refs
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // states
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  // i18n
  const { t } = useTranslation();

  // popper-js init
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "bottom-start",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 12,
        },
      },
    ],
  });

  // dropdown init
  const { handleClose, handleKeyDown, handleOnClick, searchInputKeyDown } = useDropdown({
    dropdownRef,
    inputRef,
    isOpen,
    onClose: undefined,
    query,
    setIsOpen,
    setQuery,
  });

  // derived values
  const filteredOptions = query === "" ? options : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  const placeholder = fieldName ? `Add ${fieldName}` : "Select";

  const dropdownOnChange = (val: string) => {
    if (multiple) {
      const currentArr = Array.isArray(value) ? value : value ? [value] : [];
      const newArr = currentArr.includes(val) ? currentArr.filter((v) => v !== val) : [...currentArr, val];
      onChange(newArr);
      // Don't close — keep open for multi-select
    } else {
      // Single select toggle
      if (val === value) {
        onChange([]);
      } else {
        onChange([val]);
      }
      handleClose();
    }
  };
  const displayValue = multiple ? (Array.isArray(value) ? value : []).join(", ") : (value as string);

  const comboButton = (
    <button
      tabIndex={tabIndex}
      ref={setReferenceElement}
      type="button"
      className={cn(
        "clickable block h-full max-w-full outline-none",
        {
          "cursor-not-allowed text-secondary": disabled,
          "cursor-pointer": !disabled,
        },
        buttonContainerClassName
      )}
      onClick={handleOnClick}
      disabled={disabled}
    >
      <DropdownButton
        className={buttonClassName}
        isActive={isOpen}
        tooltipHeading={fieldName}
        tooltipContent={value || placeholder}
        showTooltip={showTooltip}
        variant={buttonVariant}
      >
        {prependIcon && <span className="shrink-0">{prependIcon}</span>}
        {BUTTON_VARIANTS_WITH_TEXT.includes(buttonVariant) && (
          <>
            {multiple && Array.isArray(value) && value.length > 0 ? (
              <div className="flex grow items-center gap-1 overflow-hidden">
                {(value as string[]).slice(0, 3).map((v) => (
                  <span
                    key={v}
                    className={cn(
                      "inline-flex items-center rounded border px-1.5 py-0.5 text-12 font-medium",
                      BADGE_COLORS[getColorIndex(v)]
                    )}
                  >
                    {v}
                  </span>
                ))}
                {(value as string[]).length > 3 && (
                  <Badge variant="outline-neutral" size="sm">
                    +{(value as string[]).length - 3} more
                  </Badge>
                )}
              </div>
            ) : (
              <span className={cn("grow truncate text-left text-body-xs-medium")}>{displayValue || placeholder}</span>
            )}
          </>
        )}

        {dropdownArrow && (
          <ChevronDownIcon className={cn("h-2.5 w-2.5 shrink-0", dropdownArrowClassName)} aria-hidden="true" />
        )}
      </DropdownButton>
    </button>
  );

  return (
    <ComboDropDown
      as="div"
      ref={dropdownRef}
      className={cn("h-full", className)}
      value={value}
      onChange={dropdownOnChange}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      button={comboButton}
    >
      {isOpen && (
        <Combobox.Options className="fixed z-10" static>
          <div
            className="my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none"
            ref={setPopperElement}
            style={styles.popper}
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
                placeholder={t("common.search.label")}
                onKeyDown={searchInputKeyDown}
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
                        "flex w-full cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 select-none",
                        active && "bg-layer-transparent-hover"
                      )
                    }
                  >
                    <span className="grow truncate text-left">{option}</span>
                    {(multiple ? (Array.isArray(value) ? value : []).includes(option) : value === option) && (
                      <CheckIcon className="text-custom-primary-100 h-3 w-3 shrink-0" />
                    )}
                  </Combobox.Option>
                ))
              ) : (
                <p className="px-1.5 py-1 text-placeholder italic">{t("no_matching_results")}</p>
              )}
            </div>
          </div>
        </Combobox.Options>
      )}
    </ComboDropDown>
  );
};
