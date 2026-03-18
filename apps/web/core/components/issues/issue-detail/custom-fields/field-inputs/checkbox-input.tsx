'use client';

import { Checkbox } from '@plane/ui';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export const CustomFieldCheckboxInput = ({
  value,
  onChange,
  disabled = false,
}: Props) => (
  <div className='flex h-7.5 items-center px-1.5'>
    <Checkbox
      checked={value}
      onChange={() => onChange(!value)}
      disabled={disabled}
    />
  </div>
);
