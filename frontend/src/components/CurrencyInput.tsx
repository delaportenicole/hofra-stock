import { forwardRef, useState, useEffect, useRef, type ChangeEvent } from 'react';

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

// Format input with thousand separators while typing
function formatWithThousands(input: string): string {
  // Split by comma (decimal separator)
  const parts = input.split(',');
  const integerPart = parts[0].replace(/\./g, ''); // Remove existing dots
  const decimalPart = parts[1];

  // Add thousand separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimalPart !== undefined) {
    return `${formattedInteger},${decimalPart}`;
  }
  return formattedInteger;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onBlur, name, placeholder = '0,00', error, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement | null>(null);
    const cursorPositionRef = useRef<number | null>(null);

    // Combine refs
    const setRefs = (element: HTMLInputElement | null) => {
      inputRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    // Sync display value when external value changes
    useEffect(() => {
      if (value !== undefined && value !== null) {
        setDisplayValue(formatNumber(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    // Restore cursor position after formatting
    useEffect(() => {
      if (cursorPositionRef.current !== null && inputRef.current) {
        inputRef.current.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
        cursorPositionRef.current = null;
      }
    }, [displayValue]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      // Allow only digits, dots, and commas
      const sanitized = input.replace(/[^\d.,]/g, '');

      // Prevent multiple commas
      const commaCount = (sanitized.match(/,/g) || []).length;
      if (commaCount > 1) return;

      // Limit decimal places to 2
      const parts = sanitized.split(',');
      if (parts[1] && parts[1].length > 2) return;

      // Format with thousand separators
      const formatted = formatWithThousands(sanitized);

      // Calculate new cursor position (adjust for added/removed dots)
      const oldDots = (displayValue.slice(0, cursorPos).match(/\./g) || []).length;
      const newDots = (formatted.slice(0, cursorPos + 1).match(/\./g) || []).length;
      cursorPositionRef.current = cursorPos + (newDots - oldDots);

      setDisplayValue(formatted);

      // Parse and notify parent
      const numericValue = parseFormattedNumber(formatted);
      onChange?.(numericValue);
    };

    const handleBlur = () => {
      // Re-format on blur to ensure correct format
      const numericValue = parseFormattedNumber(displayValue);
      if (numericValue !== undefined) {
        setDisplayValue(formatNumber(numericValue));
      }
      onBlur?.();
    };

    return (
      <input
        ref={setRefs}
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
