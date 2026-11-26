import { sinonimoColumnaExcelRepository } from '../repositories/sinonimoColumnaExcel.repository.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import type { SinonimoColumnaExcel, CreateSinonimoColumnaExcelDto } from '@hofra/shared';

export class SinonimoColumnaExcelService {
  async findAll(): Promise<SinonimoColumnaExcel[]> {
    return sinonimoColumnaExcelRepository.findAllActivos();
  }

  async create(data: CreateSinonimoColumnaExcelDto, userId?: string): Promise<SinonimoColumnaExcel> {
    const existing = await sinonimoColumnaExcelRepository.findByCampoYSinonimo(data.campo, data.sinonimo);
    if (existing) {
      throw new ConflictError('Ese sinónimo ya está cargado para este campo');
    }

    return sinonimoColumnaExcelRepository.create({
      campo: data.campo,
      sinonimo: data.sinonimo,
      createdBy: userId,
    });
  }

  async delete(id: string, userId?: string): Promise<void> {
    const deleted = await sinonimoColumnaExcelRepository.softDelete(id, userId);
    if (!deleted) {
      throw new NotFoundError('Sinónimo');
    }
  }
}

export const sinonimoColumnaExcelService = new SinonimoColumnaExcelService();
