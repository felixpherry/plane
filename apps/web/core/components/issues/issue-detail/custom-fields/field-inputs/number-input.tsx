'use client';

import { useState, useRef } from 'react';
import { Input } from '@plane/ui';

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
};

export const CustomFieldNumberInput = ({
  value,
  onChange,
  disabled = false,
}: Props) => {
  const [localValue, setLocalValue] = useState(value?.toString() ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    setIsEditing(false);
    const numValue = localValue === '' ? null : Number(localValue);
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  if (!isEditing) {
    return (
      <button
        type='button'
        className='flex h-7.5 w-full items-center truncate rounded-sm px-1.5 text-body-xs-medium hover:bg-custom-background-80 transition-colors'
        onClick={() => {
          if (!disabled) {
            setIsEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        disabled={disabled}
      >
        <span className={value !== null ? '' : 'text-placeholder'}>
          {value !== null ? value : 'Add number'}
        </span>
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      type='number'
      mode='transparent'
      inputSize='xs'
      className='w-full text-body-xs-medium'
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') {
          setLocalValue(value?.toString() ?? '');
          setIsEditing(false);
        }
      }}
      autoFocus
      disabled={disabled}
    />
  );
};
