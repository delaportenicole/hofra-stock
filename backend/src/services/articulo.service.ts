import { articuloRepository } from '../repositories/articulo.repository.js';
import { reposicionRepository } from '../repositories/reposicion.repository.js';
import { entregaRepository } from '../repositories/entrega.repository.js';
import { rubroRepository } from '../repositories/rubro.repository.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type {
  Articulo,
  ArticuloConRelaciones,
  CreateArticuloDto,
  UpdateArticuloDto,
  ArticuloFiltros,
  ReposicionConRelaciones,
  EntregaConRelaciones,
  ValuacionStock,
  CapaStock,
} from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export interface ArticuloHistorial {
  reposiciones: ReposicionConRelaciones[];
  entregas: EntregaConRelaciones[];
}

export class ArticuloService {
  async findAll(options: FindOptions = {}): Promise<PaginatedResult<Articulo>> {
    return articuloRepository.findAll(options);
  }

  async search(
    filtros: ArticuloFiltros,
    options: FindOptions = {}
  ): Promise<PaginatedResult<ArticuloConRelaciones>> {
    return articuloRepository.search(filtros, options);
  }

  async findById(id: string): Promise<ArticuloConRelaciones> {
    const articulo = await articuloRepository.findByIdWithRelations(id);

    if (!articulo) {
      throw new NotFoundError('Artículo');
    }

    return articulo;
  }

  async findStockBajo(limit: number = 10): Promise<ArticuloConRelaciones[]> {
    return articuloRepository.findStockBajo(limit);
  }

  async getHistorial(id: string, limit: number = 20): Promise<ArticuloHistorial> {
    const articulo = await articuloRepository.findById(id);
    if (!articulo) {
      throw new NotFoundError('Artículo');
    }

    const [reposiciones, entregas] = await Promise.all([
      reposicionRepository.findByArticulo(id, limit),
      entregaRepository.findByArticulo(id, limit),
    ]);

    return { reposiciones, entregas };
  }

  async create(data: CreateArticuloDto, createdBy?: string): Promise<Articulo> {
    const existing = await articuloRepository.findByCodigo(data.codigo);
    if (existing) {
      throw new ConflictError('Ya existe un artículo con ese código');
    }

    return articuloRepository.create({
      codigo: data.codigo,
      nombre: data.nombre,
      descripcion: data.descripcion,
      rubroId: data.rubroId,
      proveedorId: data.proveedorId,
      stockMinimo: data.stockMinimo,
      unidad: data.unidad,
      presentacion: data.presentacion,
      marca: data.marca,
      sku: data.sku,
      etm: data.etm,
      stockActual: 0, // Stock inicial siempre es 0, se actualiza via reposiciones/entregas
      ubicacion: data.ubicacion,
      costoInicialEstimado: data.costoInicialEstimado,
      valorDolarCostoInicial: data.valorDolarCostoInicial,
      createdBy,
    });
  }

  async update(id: string, data: UpdateArticuloDto, updatedBy?: string): Promise<Articulo> {
    const existing = await articuloRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Artículo');
    }

    if (data.codigo && data.codigo !== existing.codigo) {
      const codigoExists = await articuloRepository.findByCodigo(data.codigo);
      if (codigoExists) {
        throw new ConflictError('Ya existe un artículo con ese código');
      }
    }

    const updated = await articuloRepository.update(id, data, updatedBy);

    if (!updated) {
      throw new NotFoundError('Artículo');
    }

    return updated;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const articulo = await articuloRepository.findById(id);
    if (!articulo) {
      throw new NotFoundError('Artículo');
    }

    // Delete image from Cloudinary if exists
    if (articulo.imagenPublicId) {
      try {
        await deleteImage(articulo.imagenPublicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    const deleted = await articuloRepository.softDelete(id, deletedBy);

    if (!deleted) {
      throw new NotFoundError('Artículo');
    }
  }

  async uploadImage(id: string, imageBuffer: Buffer, updatedBy?: string): Promise<string> {
    const articulo = await articuloRepository.findById(id);
    if (!articulo) {
      throw new NotFoundError('Artículo');
    }

    // Delete old image if exists
    if (articulo.imagenPublicId) {
      try {
        await deleteImage(articulo.imagenPublicId);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }

    // Upload new image
    const result = await uploadImage(imageBuffer);

    await articuloRepository.updateImage(id, result.url, result.publicId, updatedBy);

    return result.url;
  }

  async deleteImage(id: string, updatedBy?: string): Promise<void> {
    const articulo = await articuloRepository.findById(id);
    if (!articulo) {
      throw new NotFoundError('Artículo');
    }

    if (articulo.imagenPublicId) {
      await deleteImage(articulo.imagenPublicId);
      await articuloRepository.updateImage(id, null, null, updatedBy);
    }
  }

  async generateCodigo(rubroId: string): Promise<string> {
    // Obtener el rubro seleccionado
    const rubro = await rubroRepository.findById(rubroId);
    if (!rubro) {
      throw new NotFoundError('Rubro');
    }

    // Usar el prefijo definido en el rubro (ya está en mayúsculas por la validación)
    const prefijo = rubro.prefijo;

    // Obtener el número máximo actual para este prefijo
    const maxNum = await articuloRepository.getMaxCodigoByPrefix(prefijo);
    const siguienteNum = maxNum + 1;

    return `${prefijo}${siguienteNum}`;
  }

  async getValuacion(id: string): Promise<ValuacionStock> {
    const articulo = await articuloRepository.findById(id);
    if (!articulo) {
      throw new NotFoundError('Artículo');
    }

    // Obtener capas de stock (reposiciones con stock disponible)
    const capasRaw = await reposicionRepository.getCapasStock(id);

    // Calcular stock en reposiciones
    const stockConCosto = capasRaw.reduce((sum, c) => sum + c.stockDisponible, 0);

    // Stock sin reposición = stock total - stock en reposiciones
    const stockSinCosto = Math.max(0, articulo.stock - stockConCosto);

    // Construir capas con valores calculados
    const capas: CapaStock[] = capasRaw.map((c) => ({
      reposicionId: c.reposicionId,
      fechaReposicion: c.fechaReposicion,
      stockDisponible: c.stockDisponible,
      costoUnitario: c.costoUnitario,
      costoUnitarioDolares: c.costoUnitarioDolares,
      valorCapa: c.stockDisponible * c.costoUnitario,
      valorCapaDolares: c.costoUnitarioDolares ? c.stockDisponible * c.costoUnitarioDolares : null,
      lotePartida: c.lotePartida,
      proveedorNombre: c.proveedorNombre,
    }));

    // Calcular valor total de las capas
    const valorCapasARS = capas.reduce((sum, c) => sum + c.valorCapa, 0);
    const valorCapasUSD = capas.reduce((sum, c) => sum + (c.valorCapaDolares || 0), 0);

    // Calcular valor del stock inicial (sin reposición)
    const valorStockInicial = stockSinCosto * (articulo.costoInicialEstimado || 0);

    // Valor total
    const valorTotalARS = valorCapasARS + valorStockInicial;
    const valorTotalUSD = valorCapasUSD > 0 ? valorCapasUSD : null;

    // Costo promedio
    const costoPromedioARS = articulo.stock > 0 ? valorTotalARS / articulo.stock : null;
    const costoPromedioUSD = articulo.stock > 0 && valorTotalUSD ? valorTotalUSD / articulo.stock : null;

    return {
      articuloId: id,
      stockTotal: articulo.stock,
      stockConCosto,
      stockSinCosto,
      valorTotalARS,
      valorTotalUSD,
      costoPromedioARS,
      costoPromedioUSD,
      capas,
      costoInicialEstimado: articulo.costoInicialEstimado,
      stockInicialSinReposicion: stockSinCosto,
      valorStockInicial,
    };
  }
}

export const articuloService = new ArticuloService();
