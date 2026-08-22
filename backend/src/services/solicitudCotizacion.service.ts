import { solicitudCotizacionRepository, type SolicitudCotizacionFiltros } from '../repositories/solicitudCotizacion.repository.js';
import { articuloRepository } from '../repositories/articulo.repository.js';
import type { FindOptions } from '../repositories/base.repository.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import type {
  SolicitudCotizacionConRelaciones,
  CreateSolicitudCotizacionItemDto,
  UpdateSolicitudCotizacionItemDto,
  MatchConfianza,
  ArticuloConRelaciones,
} from '@hofra/shared';

const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'por', 'una', 'uno',
  'unos', 'unas', 'y', 'en', 'al', 'sin', 'sobre', 'the', 'and', 'for',
]);

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenizar(descripcion: string): string[] {
  const palabras = normalizar(descripcion).split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set(palabras.filter((p) => p.length >= 3 && !STOPWORDS.has(p)))];
}

interface MatchResult {
  articuloId: string | null;
  matchConfianza: MatchConfianza;
}

class SolicitudCotizacionService {
  /**
   * Heurístico simple: ETM exacto primero, si no hay match busca por overlap de
   * palabras de la descripción (+ bonus si la marca coincide). Es corregible a
   * mano en la pantalla de revisión, no pretende ser perfecto.
   */
  private async matchArticulo(row: {
    etmSolicitado: string | null;
    descripcionSolicitada: string;
    marcaSolicitada: string | null;
  }): Promise<MatchResult> {
    if (row.etmSolicitado && row.etmSolicitado.trim()) {
      const porEtm = await articuloRepository.findByEtm(row.etmSolicitado.trim());
      if (porEtm) {
        return { articuloId: porEtm.id, matchConfianza: 'etm' };
      }
    }

    const tokens = tokenizar(row.descripcionSolicitada);
    if (tokens.length === 0) {
      return { articuloId: null, matchConfianza: 'sin_match' };
    }

    const candidatos = new Map<string, ArticuloConRelaciones>();
    for (const token of tokens.slice(0, 5)) {
      const resultado = await articuloRepository.search({ busqueda: token, activo: true }, { limit: 20 });
      for (const candidato of resultado.data) {
        candidatos.set(candidato.id, candidato);
      }
    }

    let mejor: { articulo: ArticuloConRelaciones; wordScore: number; marcaCoincide: boolean } | null = null;
    for (const candidato of candidatos.values()) {
      const nombreNormalizado = normalizar(candidato.nombre);
      const wordScore = tokens.filter((token) => nombreNormalizado.includes(token)).length;
      const marcaCoincide = !!(
        row.marcaSolicitada &&
        candidato.marca &&
        normalizar(candidato.marca) === normalizar(row.marcaSolicitada)
      );
      const scoreTotal = wordScore + (marcaCoincide ? 1 : 0);
      const mejorScoreTotal = mejor ? mejor.wordScore + (mejor.marcaCoincide ? 1 : 0) : -1;
      if (scoreTotal > mejorScoreTotal) {
        mejor = { articulo: candidato, wordScore, marcaCoincide };
      }
    }

    if (mejor && (mejor.wordScore >= 2 || (mejor.wordScore >= 1 && mejor.marcaCoincide))) {
      return { articuloId: mejor.articulo.id, matchConfianza: 'nombre' };
    }

    return { articuloId: null, matchConfianza: 'sin_match' };
  }

  async create(
    data: {
      clienteId: string;
      numeroReferenciaCliente?: string | null;
      nombreArchivo?: string | null;
      observaciones?: string | null;
      items: CreateSolicitudCotizacionItemDto[];
    },
    userId?: string
  ): Promise<SolicitudCotizacionConRelaciones> {
    const itemsConMatch = [];
    for (const item of data.items) {
      const match = await this.matchArticulo({
        etmSolicitado: item.etmSolicitado ?? null,
        descripcionSolicitada: item.descripcionSolicitada,
        marcaSolicitada: item.marcaSolicitada ?? null,
      });
      itemsConMatch.push({
        orden: item.orden,
        etmSolicitado: item.etmSolicitado ?? null,
        descripcionSolicitada: item.descripcionSolicitada,
        marcaSolicitada: item.marcaSolicitada ?? null,
        cantidadSolicitada: item.cantidadSolicitada,
        articuloId: match.articuloId,
        matchConfianza: match.matchConfianza,
      });
    }

    const solicitud = await solicitudCotizacionRepository.create({
      clienteId: data.clienteId,
      numeroReferenciaCliente: data.numeroReferenciaCliente,
      nombreArchivo: data.nombreArchivo,
      observaciones: data.observaciones,
      items: itemsConMatch,
      createdBy: userId,
    });

    return this.findById(solicitud.id);
  }

  async findById(id: string): Promise<SolicitudCotizacionConRelaciones> {
    const solicitud = await solicitudCotizacionRepository.findByIdWithRelations(id);
    if (!solicitud) throw new NotFoundError('Solicitud de cotización');
    return solicitud;
  }

  async findAll(filtros: SolicitudCotizacionFiltros, options: FindOptions) {
    return solicitudCotizacionRepository.findAllWithRelations(filtros, options);
  }

  async updateHeader(
    id: string,
    data: { numeroReferenciaCliente?: string | null; observaciones?: string | null },
    userId?: string
  ): Promise<SolicitudCotizacionConRelaciones> {
    const updated = await solicitudCotizacionRepository.updateHeader(id, data, userId);
    if (!updated) throw new NotFoundError('Solicitud de cotización');
    return this.findById(id);
  }

  async updateItem(
    solicitudId: string,
    itemId: string,
    data: UpdateSolicitudCotizacionItemDto
  ): Promise<SolicitudCotizacionConRelaciones> {
    const solicitud = await solicitudCotizacionRepository.findByIdWithRelations(solicitudId);
    if (!solicitud) throw new NotFoundError('Solicitud de cotización');
    if (solicitud.estado !== 'en_revision') {
      throw new AppError(400, 'Solo se pueden modificar ítems de solicitudes en revisión');
    }

    const item = solicitud.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundError('Ítem de la solicitud');

    // Un ítem marcado "a comprar" no tiene un artículo interno asociado
    const payload = { ...data };
    if (payload.estadoItem === 'a_comprar') {
      payload.articuloId = null;
    }

    await solicitudCotizacionRepository.updateItem(itemId, payload);
    return this.findById(solicitudId);
  }

  async marcarCotizada(id: string, userId?: string): Promise<SolicitudCotizacionConRelaciones> {
    const solicitud = await solicitudCotizacionRepository.findByIdWithRelations(id);
    if (!solicitud) throw new NotFoundError('Solicitud de cotización');
    if (solicitud.estado !== 'en_revision') {
      throw new AppError(400, 'La solicitud ya fue cotizada o está cancelada');
    }
    if (solicitud.items.some((item) => item.estadoItem === 'pendiente')) {
      throw new AppError(400, 'Hay ítems sin decisión: aceptá la sugerencia o marcalos para comprar');
    }
    if (solicitud.items.some((item) => item.precioUnitario === null || item.precioUnitario === undefined)) {
      throw new AppError(400, 'Todos los ítems deben tener un precio unitario cargado');
    }

    await solicitudCotizacionRepository.updateEstado(id, 'cotizada', userId);
    return this.findById(id);
  }

  async cancelar(id: string, userId?: string): Promise<SolicitudCotizacionConRelaciones> {
    const solicitud = await solicitudCotizacionRepository.findByIdWithRelations(id);
    if (!solicitud) throw new NotFoundError('Solicitud de cotización');
    if (solicitud.estado === 'cancelada') {
      throw new AppError(400, 'La solicitud ya está cancelada');
    }

    await solicitudCotizacionRepository.updateEstado(id, 'cancelada', userId);
    return this.findById(id);
  }
}

export const solicitudCotizacionService = new SolicitudCotizacionService();
