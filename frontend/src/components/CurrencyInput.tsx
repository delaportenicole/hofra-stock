import { forwardRef, useState, useEffect, type ChangeEvent } from 'react';

interface CurrencyInputProps {
  value?: number | null;
  onChange?: (value: number | undefined) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

// Format number to Argentine locale (1.500.000,43)
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Parse formatted string back to number
function parseFormattedNumber(formatted: string): number | undefined {
  if (!formatted || formatted.trim() === '') return undefined;

  // Remove thousand separators (dots) and replace decimal comma with dot
  const cleaned = formatted
    .replace(/\./g, '')  // Remove dots (thousand separators)
    .replace(',', '.');  // Replace comma with dot (decimal separator)

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onBlur, name, placeholder = '0,00', error, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('');

    // Sync display value when external value changes
    useEffect(() => {
      if (value !== undefined && value !== null) {
        setDisplayValue(formatNumber(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;

      // Allow only digits, dots, and commas
      const sanitized = input.replace(/[^\d.,]/g, '');

      // Prevent multiple commas
      const commaCount = (sanitized.match(/,/g) || []).length;
      if (commaCount > 1) return;

      // Limit decimal places to 2
      const parts = sanitized.split(',');
      if (parts[1] && parts[1].length > 2) return;

      setDisplayValue(sanitized);

      // Parse and notify parent
      const numericValue = parseFormattedNumber(sanitized);
      onChange?.(numericValue);
    };

    const handleBlur = () => {
      // Re-format on blur to add thousand separators
      const numericValue = parseFormattedNumber(displayValue);
      if (numericValue !== undefined) {
        setDisplayValue(formatNumber(numericValue));
      }
      onBlur?.();
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        name={name}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`input ${error ? 'input-error' : ''}`}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
