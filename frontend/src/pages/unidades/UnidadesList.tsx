import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Ruler, Package, Tags, Award } from 'lucide-react';
import { unidadesMedidaService } from '../../services/unidadesMedida.service';
import { presentacionesService } from '../../services/presentaciones.service';
import { rubrosService } from '../../services/rubros.service';
import { marcasService } from '../../services/marcas.service';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { usePagination } from '../../hooks/usePagination';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { UnidadMedida, Presentacion, Rubro, Marca } from '@hofra/shared';
import { UnidadMedidaModal } from './UnidadMedidaModal';
import { PresentacionModal } from './PresentacionModal';
import { RubroModal } from './RubroModal';
import { MarcaModal } from './MarcaModal';

type TabType = 'unidades' | 'presentaciones' | 'rubros' | 'marcas';

export function UnidadesListPage() {
  const [activeTab, setActiveTab] = useState<TabType>('unidades');

  // Unidades de Medida state
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [totalUnidades, setTotalUnidades] = useState(0);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState(true);
  const { page: pageUnidades, limit: limitUnidades, setPage: setPageUnidades, setLimit: setLimitUnidades } = usePagination();

  // Presentaciones state
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [totalPresentaciones, setTotalPresentaciones] = useState(0);
  const [isLoadingPresentaciones, setIsLoadingPresentaciones] = useState(true);
  const { page: pagePresentaciones, limit: limitPresentaciones, setPage: setPagePresentaciones, setLimit: setLimitPresentaciones } = usePagination();

  // Rubros state
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [totalRubros, setTotalRubros] = useState(0);
  const [isLoadingRubros, setIsLoadingRubros] = useState(true);
  const { page: pageRubros, limit: limitRubros, setPage: setPageRubros, setLimit: setLimitRubros } = usePagination();

  // Marcas state
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [totalMarcas, setTotalMarcas] = useState(0);
  const [isLoadingMarcas, setIsLoadingMarcas] = useState(true);
  const { page: pageMarcas, limit: limitMarcas, setPage: setPageMarcas, setLimit: setLimitMarcas } = usePagination();

  // Modal states
  const [unidadModalOpen, setUnidadModalOpen] = useState(false);
  const [presentacionModalOpen, setPresentacionModalOpen] = useState(false);
  const [rubroModalOpen, setRubroModalOpen] = useState(false);
  const [marcaModalOpen, setMarcaModalOpen] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<UnidadMedida | null>(null);
  const [editingPresentacion, setEditingPresentacion] = useState<Presentacion | null>(null);
  const [editingRubro, setEditingRubro] = useState<Rubro | null>(null);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);

  useEffect(() => {
    loadUnidades();
  }, [pageUnidades, limitUnidades]);

  useEffect(() => {
    loadPresentaciones();
  }, [pagePresentaciones, limitPresentaciones]);

  useEffect(() => {
    loadRubros();
  }, [pageRubros, limitRubros]);

  useEffect(() => {
    loadMarcas();
  }, [pageMarcas, limitMarcas]);

  const loadUnidades = async () => {
    setIsLoadingUnidades(true);
    try {
      const result = await unidadesMedidaService.getAll({ page: pageUnidades, limit: limitUnidades, sortBy: 'nombre', sortOrder: 'asc' });
      setUnidades(result.data);
      setTotalUnidades(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingUnidades(false);
    }
  };

  const loadPresentaciones = async () => {
    setIsLoadingPresentaciones(true);
    try {
      const result = await presentacionesService.getAll({ page: pagePresentaciones, limit: limitPresentaciones, sortBy: 'nombre', sortOrder: 'asc' });
      setPresentaciones(result.data);
      setTotalPresentaciones(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingPresentaciones(false);
    }
  };

  const loadRubros = async () => {
    setIsLoadingRubros(true);
    try {
      const result = await rubrosService.getAll({ page: pageRubros, limit: limitRubros, sortBy: 'nombre', sortOrder: 'asc' });
      setRubros(result.data);
      setTotalRubros(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingRubros(false);
    }
  };

  const loadMarcas = async () => {
    setIsLoadingMarcas(true);
    try {
      const result = await marcasService.getAll({ page: pageMarcas, limit: limitMarcas, sortBy: 'nombre', sortOrder: 'asc' });
      setMarcas(result.data);
      setTotalMarcas(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingMarcas(false);
    }
  };

  const handleDeleteUnidad = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta unidad de medida?')) return;
    try {
      await unidadesMedidaService.delete(id);
      toast.success('Unidad de medida eliminada');
      loadUnidades();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeletePresentacion = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta presentación?')) return;
    try {
      await presentacionesService.delete(id);
      toast.success('Presentación eliminada');
      loadPresentaciones();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteRubro = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este rubro?')) return;
    try {
      await rubrosService.delete(id);
      toast.success('Rubro eliminado');
      loadRubros();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteMarca = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta marca?')) return;
    try {
      await marcasService.delete(id);
      toast.success('Marca eliminada');
      loadMarcas();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const unidadesColumns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: UnidadMedida) => <span className="font-medium">{item.nombre}</span>,
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: UnidadMedida) => (
        <Badge variant={item.activo ? 'success' : 'secondary'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (item: UnidadMedida) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingUnidad(item);
              setUnidadModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteUnidad(item.id);
            }}
            className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const presentacionesColumns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: Presentacion) => <span className="font-medium">{item.nombre}</span>,
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (item: Presentacion) => (
        <span className="text-gray-500">{item.descripcion || '-'}</span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: Presentacion) => (
        <Badge variant={item.activo ? 'success' : 'secondary'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (item: Presentacion) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingPresentacion(item);
              setPresentacionModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePresentacion(item.id);
            }}
            className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const rubrosColumns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: Rubro) => <span className="font-medium">{item.nombre}</span>,
    },
    {
      key: 'prefijo',
      header: 'Prefijo',
      render: (item: Rubro) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{item.prefijo}</span>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (item: Rubro) => (
        <span className="text-gray-500">{item.descripcion || '-'}</span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: Rubro) => (
        <Badge variant={item.activo ? 'success' : 'secondary'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (item: Rubro) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingRubro(item);
              setRubroModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRubro(item.id);
            }}
            className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const marcasColumns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: Marca) => <span className="font-medium">{item.nombre}</span>,
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (item: Marca) => (
        <span className="text-gray-500">{item.descripcion || '-'}</span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: Marca) => (
        <Badge variant={item.activo ? 'success' : 'secondary'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (item: Marca) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingMarca(item);
              setMarcaModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteMarca(item.id);
            }}
            className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('unidades')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'unidades'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Ruler className="w-4 h-4" />
            Unidades de Medida
          </button>
          <button
            onClick={() => setActiveTab('presentaciones')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'presentaciones'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Presentaciones
          </button>
          <button
            onClick={() => setActiveTab('rubros')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'rubros'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tags className="w-4 h-4" />
            Rubros
          </button>
          <button
            onClick={() => setActiveTab('marcas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'marcas'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Award className="w-4 h-4" />
            Marcas
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'unidades' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingUnidad(null);
                setUnidadModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Unidad
            </button>
          </div>

          <DataTable
            columns={unidadesColumns}
            data={unidades}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingUnidades}
            pagination={{
              page: pageUnidades,
              limit: limitUnidades,
              total: totalUnidades,
              totalPages: Math.ceil(totalUnidades / limitUnidades),
            }}
            onPageChange={setPageUnidades}
            onLimitChange={setLimitUnidades}
            emptyMessage="No hay unidades de medida registradas"
          />
        </div>
      )}

      {activeTab === 'presentaciones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingPresentacion(null);
                setPresentacionModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Presentación
            </button>
          </div>

          <DataTable
            columns={presentacionesColumns}
            data={presentaciones}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingPresentaciones}
            pagination={{
              page: pagePresentaciones,
              limit: limitPresentaciones,
              total: totalPresentaciones,
              totalPages: Math.ceil(totalPresentaciones / limitPresentaciones),
            }}
            onPageChange={setPagePresentaciones}
            onLimitChange={setLimitPresentaciones}
            emptyMessage="No hay presentaciones registradas"
          />
        </div>
      )}

      {activeTab === 'rubros' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingRubro(null);
                setRubroModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Rubro
            </button>
          </div>

          <DataTable
            columns={rubrosColumns}
            data={rubros}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingRubros}
            pagination={{
              page: pageRubros,
              limit: limitRubros,
              total: totalRubros,
              totalPages: Math.ceil(totalRubros / limitRubros),
            }}
            onPageChange={setPageRubros}
            onLimitChange={setLimitRubros}
            emptyMessage="No hay rubros registrados"
          />
        </div>
      )}

      {activeTab === 'marcas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingMarca(null);
                setMarcaModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Marca
            </button>
          </div>

          <DataTable
            columns={marcasColumns}
            data={marcas}
            keyExtractor={(item) => item.id}
            isLoading={isLoadingMarcas}
            pagination={{
              page: pageMarcas,
              limit: limitMarcas,
              total: totalMarcas,
              totalPages: Math.ceil(totalMarcas / limitMarcas),
            }}
            onPageChange={setPageMarcas}
            onLimitChange={setLimitMarcas}
            emptyMessage="No hay marcas registradas"
          />
        </div>
      )}

      {/* Modals */}
      <UnidadMedidaModal
        isOpen={unidadModalOpen}
        onClose={() => {
          setUnidadModalOpen(false);
          setEditingUnidad(null);
        }}
        onSuccess={() => {
          loadUnidades();
          setUnidadModalOpen(false);
          setEditingUnidad(null);
        }}
        unidad={editingUnidad}
      />

      <PresentacionModal
        isOpen={presentacionModalOpen}
        onClose={() => {
          setPresentacionModalOpen(false);
          setEditingPresentacion(null);
        }}
        onSuccess={() => {
          loadPresentaciones();
          setPresentacionModalOpen(false);
          setEditingPresentacion(null);
        }}
        presentacion={editingPresentacion}
      />

      <RubroModal
        isOpen={rubroModalOpen}
        onClose={() => {
          setRubroModalOpen(false);
          setEditingRubro(null);
        }}
        onSuccess={() => {
          loadRubros();
          setRubroModalOpen(false);
          setEditingRubro(null);
        }}
        rubro={editingRubro}
      />

      <MarcaModal
        isOpen={marcaModalOpen}
        onClose={() => {
          setMarcaModalOpen(false);
          setEditingMarca(null);
        }}
        onSuccess={() => {
          loadMarcas();
          setMarcaModalOpen(false);
          setEditingMarca(null);
        }}
        marca={editingMarca}
      />
    </div>
  );
}
