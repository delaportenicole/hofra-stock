import { transaction } from '../config/database.js';
import { articuloRepository } from '../repositories/articulo.repository.js';
import { reposicionRepository } from '../repositories/reposicion.repository.js';
import { entregaRepository } from '../repositories/entrega.repository.js';
import { NotFoundError, InsufficientStockError } from '../utils/errors.js';
import type {
  Reposicion,
  ReposicionConRelaciones,
  Entrega,
  EntregaConRelaciones,
  CreateReposicionDto,
  UpdateReposicionDto,
  CreateEntregaDto,
} from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export class StockService {
  // ============================================
  // REPOSICIONES
  // ============================================

  async findAllReposiciones(options: FindOptions & { busqueda?: string } = {}): Promise<PaginatedResult<ReposicionConRelaciones>> {
    return reposicionRepository.findAllWithRelations(options);
  }

  async findReposicionById(id: string): Promise<ReposicionConRelaciones> {
    const reposicion = await reposicionRepository.findByIdWithRelations(id);

    if (!reposicion) {
      throw new NotFoundError('Reposición');
    }

    return reposicion;
  }

  async findReposicionesByProveedor(
    proveedorId: string,
    options: FindOptions = {}
  ): Promise<PaginatedResult<ReposicionConRelaciones>> {
    return reposicionRepository.findByProveedor(proveedorId, options);
  }

  async createReposicion(data: CreateReposicionDto, createdBy?: string): Promise<Reposicion> {
    // Verify articulo exists
    const articulo = await articuloRepository.findById(data.articuloId);
    if (!articulo) {
      throw new NotFoundError('Artículo');
    }

    // Create reposicion in estado "en_curso" - stock is NOT updated yet
    const reposicion = await reposicionRepository.create({
      articuloId: data.articuloId,
      proveedorId: data.proveedorId,
      cantidad: data.cantidad,
      observaciones: data.observaciones,
      fechaReposicion: data.fechaReposicion,
      costoReposicion: data.costoReposicion,
      valorDolarOficial: data.valorDolarOficial,
      fechaVencimiento: data.fechaVencimiento,
      lotePartida: data.lotePartida,
      linkCompra: data.linkCompra,
      lugarCompra: data.lugarCompra,
      createdBy,
    });

    // Stock is NOT updated - it will be updated when the reposicion is confirmed

    return reposicion;
  }

  async updateReposicion(id: string, data: UpdateReposicionDto, updatedBy?: string): Promise<Reposicion> {
    // Verify reposicion exists and is en_curso
    const reposicion = await reposicionRepository.findByIdWithRelations(id);
    if (!reposicion) {
      throw new NotFoundError('Reposicion');
    }

    if (reposicion.estado !== 'en_curso') {
      throw new Error('Solo se pueden editar reposiciones en curso');
    }

    return reposicionRepository.update(id, data, updatedBy);
  }

  async cancelReposicion(id: string, updatedBy?: string): Promise<Reposicion> {
    const reposicion = await reposicionRepository.findByIdWithRelations(id);
    if (!reposicion) {
      throw new NotFoundError('Reposicion');
    }

    if (reposicion.estado === 'cancelada') {
      throw new Error('La reposicion ya esta cancelada');
    }

    const estadoAnterior = reposicion.estado;

    // Cancel reposicion
    const cancelled = await reposicionRepository.cancel(id, updatedBy);

    // Only decrement stock if it was confirmed (stock was already incremented)
    if (estadoAnterior === 'confirmada') {
      await articuloRepository.updateStock(reposicion.articuloId, -reposicion.cantidad, updatedBy);
    }
    // If it was en_curso, stock was never incremented, so no need to decrement

    return cancelled;
  }

  async confirmReposicion(id: string, updatedBy?: string): Promise<Reposicion> {
    const reposicion = await reposicionRepository.findByIdWithRelations(id);
    if (!reposicion) {
      throw new NotFoundError('Reposicion');
    }

    if (reposicion.estado !== 'en_curso') {
      throw new Error('Solo se pueden confirmar reposiciones en curso');
    }

    // Confirm reposicion
    const confirmed = await reposicionRepository.confirm(id, updatedBy);

    // NOW increment stock
    await articuloRepository.updateStock(reposicion.articuloId, reposicion.cantidad, updatedBy);

    return confirmed;
  }

  // ============================================
  // ENTREGAS
  // ============================================

  async findAllEntregas(options: FindOptions = {}): Promise<PaginatedResult<EntregaConRelaciones>> {
    return entregaRepository.findAllWithRelations(options);
  }

  async findEntregaById(id: string): Promise<EntregaConRelaciones> {
    const entrega = await entregaRepository.findByIdWithRelations(id);

    if (!entrega) {
      throw new NotFoundError('Entrega');
    }

    return entrega;
  }

  async findEntregasByCliente(
    clienteId: string,
    options: FindOptions = {}
  ): Promise<PaginatedResult<EntregaConRelaciones>> {
    return entregaRepository.findByCliente(clienteId, options);
  }

  async createEntrega(data: CreateEntregaDto, createdBy?: string): Promise<Entrega> {
    // Verify all articulos exist and have sufficient stock
    for (const item of data.items) {
      const articulo = await articuloRepository.findById(item.articuloId);
      if (!articulo) {
        throw new NotFoundError(`Artículo ${item.articuloId}`);
      }

      const currentStock = await articuloRepository.getStock(item.articuloId);
      if (currentStock < item.cantidad) {
        throw new InsufficientStockError(currentStock, item.cantidad);
      }
    }

    // Create entrega in estado "en_curso" - stock is NOT updated yet
    const entrega = await entregaRepository.create({
      clienteId: data.clienteId,
      numeroCotizacionInterna: data.numeroCotizacionInterna,
      purchaseOrder: data.purchaseOrder,
      items: data.items,
      observaciones: data.observaciones,
      fechaEntrega: data.fechaEntrega,
      createdBy,
    });

    // Stock is NOT updated - it will be updated when the entrega is confirmed

    return entrega;
  }

  async updateEntrega(id: string, data: Partial<CreateEntregaDto>, updatedBy?: string): Promise<Entrega> {
    // Verify entrega exists and is en_curso
    const entrega = await entregaRepository.findByIdWithRelations(id);
    if (!entrega) {
      throw new NotFoundError('Entrega');
    }

    if (entrega.estado !== 'en_curso') {
      throw new Error('Solo se pueden editar entregas en curso');
    }

    // If items are being updated, verify stock for new items
    if (data.items) {
      for (const item of data.items) {
        const articulo = await articuloRepository.findById(item.articuloId);
        if (!articulo) {
          throw new NotFoundError(`Artículo ${item.articuloId}`);
        }

        const currentStock = await articuloRepository.getStock(item.articuloId);
        if (currentStock < item.cantidad) {
          throw new InsufficientStockError(currentStock, item.cantidad);
        }
      }
    }

    return entregaRepository.update(id, data, updatedBy);
  }

  async confirmEntrega(id: string, updatedBy?: string): Promise<Entrega> {
    const entrega = await entregaRepository.findByIdWithRelations(id);
    if (!entrega) {
      throw new NotFoundError('Entrega');
    }

    if (entrega.estado !== 'en_curso') {
      throw new Error('Solo se pueden confirmar entregas en curso');
    }

    // Verify all items have sufficient stock
    for (const item of entrega.items) {
      const currentStock = await articuloRepository.getStock(item.articuloId);
      if (currentStock < item.cantidad) {
        throw new InsufficientStockError(currentStock, item.cantidad);
      }
    }

    // Confirm entrega
    const confirmed = await entregaRepository.confirm(id, updatedBy);

    // NOW decrement stock for each item
    for (const item of entrega.items) {
      // Decrement stock from reposiciones using FIFO
      await reposicionRepository.descontarStockFIFO(item.articuloId, item.cantidad, updatedBy);

      // Decrement total stock
      await articuloRepository.updateStock(item.articuloId, -item.cantidad, updatedBy);
    }

    return confirmed;
  }

  async cancelEntrega(id: string, updatedBy?: string): Promise<Entrega> {
    const entrega = await entregaRepository.findByIdWithRelations(id);
    if (!entrega) {
      throw new NotFoundError('Entrega');
    }

    if (entrega.estado === 'cancelada') {
      throw new Error('La entrega ya esta cancelada');
    }

    const estadoAnterior = entrega.estado;

    // Cancel entrega
    const cancelled = await entregaRepository.cancel(id, updatedBy);

    // Only restore stock if it was confirmed (stock was already decremented)
    if (estadoAnterior === 'confirmada') {
      for (const item of entrega.items) {
        // Restore total stock
        await articuloRepository.updateStock(item.articuloId, item.cantidad, updatedBy);
      }
    }
    // If it was en_curso, stock was never decremented, so no need to restore

    return cancelled;
  }

  // ============================================
  // STATS
  // ============================================

  async getStats(): Promise<{
    reposicionesHoy: number;
    entregasHoy: number;
    reposicionesMes: number;
    entregasMes: number;
  }> {
    const [reposicionesHoy, entregasHoy, reposicionesMes, entregasMes] = await Promise.all([
      reposicionRepository.countToday(),
      entregaRepository.countToday(),
      reposicionRepository.countThisMonth(),
      entregaRepository.countThisMonth(),
    ]);

    return {
      reposicionesHoy,
      entregasHoy,
      reposicionesMes,
      entregasMes,
    };
  }
}

export const stockService = new StockService();
