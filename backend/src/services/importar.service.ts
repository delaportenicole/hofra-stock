import { rubroRepository } from '../repositories/rubro.repository.js';
import { marcaRepository } from '../repositories/marca.repository.js';
import { articuloRepository } from '../repositories/articulo.repository.js';
import { articuloService } from './articulo.service.js';
import type { Rubro, Marca } from '@hofra/shared';

export interface ImportArticuloRow {
  nombre: string;
  sku: string | null;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  marca: string | null;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  rubrosCreated: string[];
  marcasCreated: string[];
}

export interface PreviewResult {
  rows: ImportArticuloRow[];
  rubrosToCreate: string[];
  marcasToCreate: string[];
  existingRubros: string[];
  existingMarcas: string[];
}

class ImportarService {
  async preview(rows: ImportArticuloRow[]): Promise<PreviewResult> {
    // Get existing rubros and marcas
    const existingRubros = await rubroRepository.findActive();
    const existingMarcas = await marcaRepository.getActive();

    const existingRubroNames = new Set(existingRubros.map((r: Rubro) => r.nombre.toLowerCase()));
    const existingMarcaNames = new Set(existingMarcas.map((m: Marca) => m.nombre.toLowerCase()));

    // Find which rubros and marcas need to be created
    const rubrosToCreate = new Set<string>();
    const marcasToCreate = new Set<string>();

    for (const row of rows) {
      if (row.categoria && !existingRubroNames.has(row.categoria.toLowerCase())) {
        rubrosToCreate.add(row.categoria);
      }
      if (row.marca && !existingMarcaNames.has(row.marca.toLowerCase())) {
        marcasToCreate.add(row.marca);
      }
    }

    return {
      rows,
      rubrosToCreate: Array.from(rubrosToCreate),
      marcasToCreate: Array.from(marcasToCreate),
      existingRubros: existingRubros.map(r => r.nombre),
      existingMarcas: existingMarcas.map(m => m.nombre),
    };
  }

  async import(rows: ImportArticuloRow[], userId?: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
      rubrosCreated: [],
      marcasCreated: [],
    };

    // Cache for rubros and marcas
    const rubroCache = new Map<string, Rubro>();
    const marcaCache = new Map<string, Marca>();

    // Load existing rubros and marcas
    const existingRubros = await rubroRepository.findActive();
    const existingMarcas = await marcaRepository.getActive();

    for (const rubro of existingRubros) {
      rubroCache.set(rubro.nombre.toLowerCase(), rubro);
    }
    for (const marca of existingMarcas) {
      marcaCache.set(marca.nombre.toLowerCase(), marca);
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because Excel rows start at 1 and we skip header

      try {
        // Validate required fields
        if (!row.nombre || row.nombre.trim() === '') {
          result.errors.push({ row: rowNum, error: 'Nombre vacío' });
          result.skipped++;
          continue;
        }

        if (!row.categoria || row.categoria.trim() === '') {
          result.errors.push({ row: rowNum, error: 'Categoría vacía' });
          result.skipped++;
          continue;
        }

        // Get or create rubro
        let rubro = rubroCache.get(row.categoria.toLowerCase());
        if (!rubro) {
          // Create new rubro with auto-generated prefix
          const prefix = this.generatePrefix(row.categoria);
          rubro = await rubroRepository.create({
            nombre: row.categoria,
            prefijo: prefix,
            descripcion: null,
            createdBy: userId,
          });
          rubroCache.set(row.categoria.toLowerCase(), rubro);
          result.rubrosCreated.push(row.categoria);
        }

        // Get or create marca if provided
        let marcaNombre: string | null = null;
        if (row.marca && row.marca.trim() !== '') {
          let marca = marcaCache.get(row.marca.toLowerCase());
          if (!marca) {
            marca = await marcaRepository.create({
              nombre: row.marca.trim(),
              descripcion: null,
              createdBy: userId,
            });
            marcaCache.set(row.marca.toLowerCase(), marca);
            result.marcasCreated.push(row.marca);
          }
          marcaNombre = marca.nombre;
        }

        // Generate article code
        const codigo = await articuloService.generateCodigo(rubro.id);

        // Sanitize stock values (negative to 0)
        const stockActual = Math.max(0, row.stockActual || 0);
        const stockMinimo = Math.max(0, row.stockMinimo || 0);

        // Create article
        await articuloRepository.create({
          codigo,
          nombre: row.nombre.trim(),
          rubroId: rubro.id,
          proveedorId: null,
          stockMinimo,
          presentacion: null,
          marca: marcaNombre,
          sku: row.sku?.trim() || null,
          etm: null,
          stockActual,
          ubicacion: null,
          costoInicialEstimado: null,
          valorDolarCostoInicial: null,
          createdBy: userId,
        });

        result.imported++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        result.errors.push({ row: rowNum, error: errorMessage });
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private generatePrefix(categoria: string): string {
    // Generate a 3-letter prefix from the category name
    const cleaned = categoria
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z]/g, '') // Keep only letters
      .toUpperCase();

    if (cleaned.length >= 3) {
      return cleaned.substring(0, 3);
    }
    // Pad with X if too short
    return cleaned.padEnd(3, 'X');
  }
}

export const importarService = new ImportarService();
