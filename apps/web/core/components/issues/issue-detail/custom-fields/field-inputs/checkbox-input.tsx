"use client";

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export const CustomFieldCheckboxInput = ({ value, onChange, disabled = false }: Props) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!value)}
    className="flex h-7.5 items-center px-2"
    disabled={disabled}
  >
    <div
      className={`flex size-4 items-center justify-center rounded border transition-colors ${
        value
          ? "border-primary bg-primary text-white"
          : "border-subtle-3 bg-transparent hover:border-primary"
      }`}
    >
      {value && (
        <svg className="size-3" viewBox="0 0 16 16" fill="none">
          <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  </button>
);
