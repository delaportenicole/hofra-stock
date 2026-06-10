import { auditLogRepository } from '../repositories/auditLog.repository.js';
import type { AuditLogConUsuario, AuditLogFiltros } from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export class AuditLogService {
  async findAll(
    filtros: AuditLogFiltros = {},
    options: FindOptions = {}
  ): Promise<PaginatedResult<AuditLogConUsuario>> {
    return auditLogRepository.findAllWithUsuario(filtros, options);
  }

  async getDistinctEntidades(): Promise<string[]> {
    return auditLogRepository.getDistinctEntidades();
  }

  async getDistinctAcciones(): Promise<string[]> {
    return auditLogRepository.getDistinctAcciones();
  }

  async getFilters(): Promise<{
    entidades: string[];
    acciones: string[];
  }> {
    const [entidades, acciones] = await Promise.all([
      this.getDistinctEntidades(),
      this.getDistinctAcciones(),
    ]);

    return { entidades, acciones };
  }

  async findByEntidadId(entidad: string, entidadId: string): Promise<AuditLogConUsuario[]> {
    return auditLogRepository.findByEntidadId(entidad, entidadId);
  }
}

export const auditLogService = new AuditLogService();
