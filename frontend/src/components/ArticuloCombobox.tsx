import React, { useState, useRef, useEffect } from 'react';
import { Search, Package } from 'lucide-react';
import type { ArticuloConRelaciones } from '@hofra/shared';

interface ArticuloComboboxProps {
  articulos: ArticuloConRelaciones[];
  value: string | null;
  onChange: (articulo: ArticuloConRelaciones | null) => void;
  getAvailableStock?: (articuloId: string) => number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowZeroStock?: boolean; // Para Reposiciones: permite seleccionar artículos sin stock
}

export function ArticuloCombobox({
  articulos,
  value,
  onChange,
  getAvailableStock,
  placeholder = 'Buscar por código o nombre...',
  disabled = false,
  className = '',
  allowZeroStock = false,
}: ArticuloComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ordenar artículos alfabéticamente por nombre
  const sortedArticulos = [...articulos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  // Sync input value with selected article
  useEffect(() => {
    if (value) {
      const selectedArticulo = articulos.find(a => a.id === value);
      if (selectedArticulo) {
        setInputValue(`${selectedArticulo.codigo} - ${selectedArticulo.nombre}`);
      }
    } else {
      setInputValue('');
    }
  }, [value, articulos]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset input if no selection
        if (!value) {
          setInputValue('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Filter articles by code or name
  const filteredArticulos = sortedArticulos.filter((articulo) => {
    const searchTerm = inputValue.toLowerCase().trim();
    if (!searchTerm) return true;

    return (
      articulo.codigo.toLowerCase().includes(searchTerm) ||
      articulo.nombre.toLowerCase().includes(searchTerm) ||
      (articulo.sku && articulo.sku.toLowerCase().includes(searchTerm))
    );
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    // Clear selection when typing
    if (value) {
      onChange(null);
    }
  };

  const handleSelect = (articulo: ArticuloConRelaciones) => {
    setInputValue(`${articulo.codigo} - ${articulo.nombre}`);
    onChange(articulo);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Auto-select first matching article (filter by stock only if not allowZeroStock)
      const availableArticulos = filteredArticulos.filter(a => {
        if (allowZeroStock) return true;
        const stock = getAvailableStock ? getAvailableStock(a.id) : a.stock;
        return stock > 0;
      });

      if (availableArticulos.length === 1) {
        handleSelect(availableArticulos[0]);
      } else if (availableArticulos.length > 1) {
        // Try exact match by code
        const exactMatch = availableArticulos.find(
          a => a.codigo.toLowerCase() === inputValue.toLowerCase().trim()
        );
        if (exactMatch) {
          handleSelect(exactMatch);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    // Select all text for easy replacement
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="input w-full pl-10 pr-4"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {isOpen && !disabled && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto">
          {filteredArticulos.length === 0 ? (
            <li className="px-4 py-3 text-gray-500 text-center">
              No se encontraron artículos
            </li>
          ) : (
            filteredArticulos.map((articulo) => {
              const stock = getAvailableStock ? getAvailableStock(articulo.id) : articulo.stock;
              const isDisabled = !allowZeroStock && stock <= 0;
              const isSelected = articulo.id === value;

              return (
                <li
                  key={articulo.id}
                  onClick={() => !isDisabled && handleSelect(articulo)}
                  className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    isDisabled
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : isSelected
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                      {articulo.imagenUrl ? (
                        <img
                          src={articulo.imagenUrl}
                          alt=""
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <Package className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-primary-600">{articulo.codigo}</span>
                        <span className="font-medium truncate">{articulo.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Stock: {stock} {articulo.unidad}</span>
                        {articulo.costoInicialEstimado && (
                          <span>• ${articulo.costoInicialEstimado.toLocaleString('es-AR')}</span>
                        )}
                      </div>
                    </div>
                    {isDisabled && (
                      <span className="text-xs text-red-500 font-medium">Sin stock</span>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
