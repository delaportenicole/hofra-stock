import { sugerenciaRepository } from '../repositories/sugerencia.repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { Sugerencia, SugerenciaConUsuario, CreateSugerenciaDto, UpdateSugerenciaDto } from '@hofra/shared';

export class SugerenciaService {
  async findAll(options: {
    page?: number;
    limit?: number;
    estado?: string;
    prioridad?: string;
  } = {}): Promise<{ data: SugerenciaConUsuario[]; total: number }> {
    return sugerenciaRepository.findAllWithUsuario(options);
  }

  async findById(id: string): Promise<SugerenciaConUsuario> {
    const sugerencia = await sugerenciaRepository.findByIdWithUsuario(id);

    if (!sugerencia) {
      throw new NotFoundError('Sugerencia');
    }

    return sugerencia;
  }

  async create(data: CreateSugerenciaDto, createdBy?: string): Promise<Sugerencia> {
    return sugerenciaRepository.create({
      titulo: data.titulo,
      descripcion: data.descripcion,
      prioridad: data.prioridad || 'media',
      createdBy,
    });
  }

  async update(id: string, data: UpdateSugerenciaDto, updatedBy?: string): Promise<Sugerencia> {
    const existing = await sugerenciaRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Sugerencia');
    }

    const updated = await sugerenciaRepository.update(id, data, updatedBy);

    if (!updated) {
      throw new NotFoundError('Sugerencia');
    }

    return updated;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const deleted = await sugerenciaRepository.softDelete(id, deletedBy);

    if (!deleted) {
      throw new NotFoundError('Sugerencia');
    }
  }
}

export const sugerenciaService = new SugerenciaService();
