'use client';

import { useState, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { Input } from '@plane/ui';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const CustomFieldUrlInput = ({
  value,
  onChange,
  disabled = false,
}: Props) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  if (!isEditing) {
    return (
      <button
        type='button'
        className='flex h-7.5 w-full items-center gap-1.5 truncate rounded-sm px-1.5 text-body-xs-medium hover:bg-custom-background-80 transition-colors'
        onClick={() => {
          if (!disabled) {
            setIsEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        disabled={disabled}
      >
        {value ? (
          <>
            <span className='truncate text-custom-primary-100'>{value}</span>
            <a
              href={value}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-shrink-0 text-custom-text-300 hover:text-custom-text-200'
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className='h-3 w-3' />
            </a>
          </>
        ) : (
          <span className='text-placeholder'>Add URL</span>
        )}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      type='url'
      mode='transparent'
      inputSize='xs'
      className='w-full text-body-xs-medium'
      placeholder='https://'
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') {
          setLocalValue(value);
          setIsEditing(false);
        }
      }}
      autoFocus
      disabled={disabled}
    />
  );
};
