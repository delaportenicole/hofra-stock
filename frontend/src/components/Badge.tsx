interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'primary' | 'gray' | 'secondary';
  className?: string;
}

const variantClasses = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  primary: 'badge-primary',
  gray: 'badge bg-gray-100 text-gray-600',
  secondary: 'badge bg-gray-200 text-gray-500 line-through',
};

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return <span className={`${variantClasses[variant]} ${className}`}>{children}</span>;
}

export function StatusBadge({ activo }: { activo: boolean }) {
  return (
    <Badge variant={activo ? 'success' : 'gray'}>
      {activo ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}

export function StockBadge({ stock, stockMinimo }: { stock: number; stockMinimo: number }) {
  const isLow = stock <= stockMinimo;
  const isZero = stock === 0;

  return (
    <Badge variant={isZero ? 'danger' : isLow ? 'warning' : 'success'}>
      {stock} {isLow && !isZero && '(Bajo)'} {isZero && '(Sin stock)'}
    </Badge>
  );
}
