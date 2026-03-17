"use client";

import { CustomSearchSelect } from "@plane/ui";

type Props = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export const CustomFieldSelectInput = ({ value, options, onChange, disabled = false, placeholder = "Select..." }: Props) => {
  const selectOptions = options.map((option) => ({
    value: option,
    query: option,
    content: option,
  }));

  return (
    <CustomSearchSelect
      value={value || null}
      onChange={(val: string) => onChange(val)}
      options={selectOptions}
      label={
        <span className={value ? "text-body-xs-medium" : "text-body-xs-medium text-placeholder"}>
          {value || placeholder}
        </span>
      }
      buttonClassName="text-body-xs-medium"
      className="group w-full grow"
      noChevron
      disabled={disabled}
      optionsClassName="min-w-48"
    />
  );
};
