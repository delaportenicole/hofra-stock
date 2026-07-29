import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  ArrowUpFromLine,
  ArrowDownToLine,
  DollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService, type DashboardData } from '../services/dashboard.service';
import { PageLoader } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await dashboardService.getAll();
      setData(result);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!data) return <div>Error cargando datos</div>;

  const { stats, movimientosRecientes, articulosStockBajo, valuacionPorRubro, movimientosPorMes } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ArticulosCard
          activos={stats.totalArticulos}
          total={stats.totalArticulosEnSistema}
        />
        <StatCard
          title="Stock Bajo"
          value={stats.articulosStockBajo}
          icon={AlertTriangle}
          color="yellow"
          alert={stats.articulosStockBajo > 0}
        />
        <ValuacionCard
          title="Valuación del Stock"
          valueARS={stats.valuacionTotalARS}
          valueUSD={stats.valuacionTotalUSD}
        />
      </div>

      {/* Movement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Entregas del Mes"
          value={stats.entregasMes}
          icon={ArrowUpFromLine}
          color="red"
        />
        <StatCard
          title="Reposiciones del Mes"
          value={stats.reposicionesMes}
          icon={ArrowDownToLine}
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movimientos por Mes */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Movimientos por Mes
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={movimientosPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="entregas" name="Entregas" fill="#ef4444" />
              <Bar dataKey="reposiciones" name="Reposiciones" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Valuación por Rubro */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Valuación por Rubro
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(300, valuacionPorRubro.filter(r => r.total > 0).length * 40)}>
            <BarChart
              data={valuacionPorRubro.filter(r => r.total > 0).sort((a, b) => b.total - a.total)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <YAxis
                type="category"
                dataKey="rubro"
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [`$${Math.round(value).toLocaleString('es-AR')}`, 'Valuación']}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Bajo */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Artículos con Stock Bajo
            </h3>
            <Link to="/articulos?stockBajo=true" className="text-sm text-primary-600 hover:text-primary-700">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {articulosStockBajo.length === 0 ? (
              <p className="px-6 py-4 text-gray-500 text-sm">
                No hay artículos con stock bajo
              </p>
            ) : (
              articulosStockBajo.slice(0, 5).map((articulo) => (
                <Link
                  key={articulo.id}
                  to={`/articulos/${articulo.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{articulo.nombre}</p>
                    <p className="text-sm text-gray-500">{articulo.codigo}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={articulo.stock === 0 ? 'danger' : 'warning'}>
                      {articulo.stock} / {articulo.stockMinimo}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{articulo.rubroNombre}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Movimientos Recientes */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Movimientos Recientes
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {movimientosRecientes.length === 0 ? (
              <p className="px-6 py-4 text-gray-500 text-sm">
                No hay movimientos recientes
              </p>
            ) : (
              movimientosRecientes.slice(0, 5).map((mov) => (
                <div key={mov.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    {mov.tipo === 'entrega' ? (
                      <ArrowUpFromLine className="w-5 h-5 text-red-500" />
                    ) : (
                      <ArrowDownToLine className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{mov.articuloNombre}</p>
                      <p className="text-sm text-gray-500">{mov.terceroNombre}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={mov.tipo === 'entrega' ? 'danger' : 'success'}>
                      {mov.tipo === 'entrega' ? '-' : '+'}{mov.cantidad}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(mov.fecha), 'dd/MM HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  alert?: boolean;
  small?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

function StatCard({ title, value, icon: Icon, color, alert, small }: StatCardProps) {
  return (
    <div className={`card p-4 ${alert ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`${small ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 mt-1`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className={small ? 'w-5 h-5' : 'w-6 h-6'} />
        </div>
      </div>
    </div>
  );
}

interface ValuacionCardProps {
  title: string;
  valueARS: number;
  valueUSD: number | null;
}

function ValuacionCard({ title, valueARS, valueUSD }: ValuacionCardProps) {
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(valueARS, 'ARS')}
          </p>
          {valueUSD !== null && (
            <p className="text-sm text-gray-500 mt-1">
              {formatCurrency(valueUSD, 'USD')}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-green-50 text-green-600">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

interface ArticulosCardProps {
  activos: number;
  total: number;
}

function ArticulosCard({ activos, total }: ArticulosCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Artículos Activos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activos}</p>
          <p className="text-sm text-gray-500 mt-1">
            {total} en sistema
          </p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
          <Package className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
