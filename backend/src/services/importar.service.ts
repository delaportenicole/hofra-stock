import { rubroRepository } from '../repositories/rubro.repository.js';
import { marcaRepository } from '../repositories/marca.repository.js';
import { proveedorRepository } from '../repositories/proveedor.repository.js';
import { articuloRepository } from '../repositories/articulo.repository.js';
import { articuloService } from './articulo.service.js';
import type { Rubro, Marca, Proveedor } from '@hofra/shared';

export interface ImportArticuloRow {
  nombre: string;
  marca: string | null;
  codigo: string | null;
  sku: string | null;
  etm: string | null;
  presentacion: string | null;
  stockActual: number;
  stockMinimo: number;
  costoInicial: number | null;
  costoInicialUsd: number | null;
  proveedor: string | null;
  url: string | null;
  rubro: string;
  ubicacion: string | null;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  rubrosCreated: string[];
  marcasCreated: string[];
  proveedoresCreated: string[];
}

export interface PreviewResult {
  rows: ImportArticuloRow[];
  rubrosToCreate: string[];
  marcasToCreate: string[];
  proveedoresToCreate: string[];
  existingRubros: string[];
  existingMarcas: string[];
  existingProveedores: string[];
}

class ImportarService {
  async preview(rows: ImportArticuloRow[]): Promise<PreviewResult> {
    // Get existing rubros, marcas and proveedores
    const existingRubros = await rubroRepository.findActive();
    const existingMarcas = await marcaRepository.getActive();
    const existingProveedores = await proveedorRepository.findActive();

    const existingRubroNames = new Set(existingRubros.map((r: Rubro) => r.nombre.toLowerCase()));
    const existingMarcaNames = new Set(existingMarcas.map((m: Marca) => m.nombre.toLowerCase()));
    const existingProveedorNames = new Set(existingProveedores.map((p: Proveedor) => p.razonSocial.toLowerCase()));

    // Find which rubros, marcas and proveedores need to be created
    const rubrosToCreate = new Set<string>();
    const marcasToCreate = new Set<string>();
    const proveedoresToCreate = new Set<string>();

    for (const row of rows) {
      if (row.rubro && !existingRubroNames.has(row.rubro.toLowerCase())) {
        rubrosToCreate.add(row.rubro);
      }
      if (row.marca && !existingMarcaNames.has(row.marca.toLowerCase())) {
        marcasToCreate.add(row.marca);
      }
      if (row.proveedor && !existingProveedorNames.has(row.proveedor.toLowerCase())) {
        proveedoresToCreate.add(row.proveedor);
      }
    }

    return {
      rows,
      rubrosToCreate: Array.from(rubrosToCreate),
      marcasToCreate: Array.from(marcasToCreate),
      proveedoresToCreate: Array.from(proveedoresToCreate),
      existingRubros: existingRubros.map(r => r.nombre),
      existingMarcas: existingMarcas.map(m => m.nombre),
      existingProveedores: existingProveedores.map(p => p.razonSocial),
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
      proveedoresCreated: [],
    };

    // Cache for rubros, marcas and proveedores
    const rubroCache = new Map<string, Rubro>();
    const marcaCache = new Map<string, Marca>();
    const proveedorCache = new Map<string, Proveedor>();

    // Load existing rubros, marcas and proveedores
    const existingRubros = await rubroRepository.findActive();
    const existingMarcas = await marcaRepository.getActive();
    const existingProveedores = await proveedorRepository.findActive();

    for (const rubro of existingRubros) {
      rubroCache.set(rubro.nombre.toLowerCase(), rubro);
    }
    for (const marca of existingMarcas) {
      marcaCache.set(marca.nombre.toLowerCase(), marca);
    }
    for (const proveedor of existingProveedores) {
      proveedorCache.set(proveedor.razonSocial.toLowerCase(), proveedor);
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

        if (!row.rubro || row.rubro.trim() === '') {
          result.errors.push({ row: rowNum, error: 'Rubro vacío' });
          result.skipped++;
          continue;
        }

        // Get or create rubro
        let rubro = rubroCache.get(row.rubro.toLowerCase());
        if (!rubro) {
          // Create new rubro with auto-generated prefix
          const prefix = this.generatePrefix(row.rubro);
          rubro = await rubroRepository.create({
            nombre: row.rubro,
            prefijo: prefix,
            descripcion: null,
            createdBy: userId,
          });
          rubroCache.set(row.rubro.toLowerCase(), rubro);
          result.rubrosCreated.push(row.rubro);
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

        // Get or create proveedor if provided
        let proveedorId: string | null = null;
        if (row.proveedor && row.proveedor.trim() !== '') {
          let proveedor = proveedorCache.get(row.proveedor.toLowerCase());
          if (!proveedor) {
            proveedor = await proveedorRepository.create({
              razonSocial: row.proveedor.trim(),
              createdBy: userId,
            });
            proveedorCache.set(row.proveedor.toLowerCase(), proveedor);
            result.proveedoresCreated.push(row.proveedor);
          }
          proveedorId = proveedor.id;
        }

        // Use provided code or generate one if not provided
        let codigo = row.codigo?.trim() || null;
        if (!codigo) {
          codigo = await articuloService.generateCodigo(rubro.id);
        }

        // Sanitize stock values (negative to 0)
        const stockActual = Math.max(0, row.stockActual || 0);
        const stockMinimo = Math.max(0, row.stockMinimo || 0);

        // Create article
        const articulo = await articuloRepository.create({
          codigo,
          nombre: row.nombre.trim(),
          rubroId: rubro.id,
          proveedorId,
          stockMinimo,
          presentacion: row.presentacion?.trim() || null,
          marca: marcaNombre,
          sku: row.sku?.trim() || null,
          etm: row.etm?.trim() || null,
          stockActual,
          ubicacion: row.ubicacion?.trim() || null,
          url: row.url?.trim() || null,
          costoInicialEstimado: row.costoInicial || null,
          costoInicialEstimadoUsd: row.costoInicialUsd || null,
          valorDolarCostoInicial: null,
          createdBy: userId,
        });

        // If stockMinimo = 0, set article as inactive
        if (stockMinimo === 0) {
          await articuloRepository.update(articulo.id, { activo: false }, userId);
        }

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
