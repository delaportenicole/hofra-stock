// Prueba manual de la Fase 1: busca artículos reales del catálogo de Hofra Stock usando la
// API key (ai-agent/.env). No interpreta nada con IA todavía, solo confirma que el cliente
// HTTP autenticado trae datos reales.
// Uso: npm run cli:buscar --workspace=ai-agent -- "cafetera"
import { buscarArticulos } from '../hofra-client/articulosClient.js';

async function main() {
  const termino = process.argv[2];

  if (!termino) {
    console.error('Uso: npm run cli:buscar --workspace=ai-agent -- "término de búsqueda"');
    process.exit(1);
  }

  const articulos = await buscarArticulos(termino);

  if (articulos.length === 0) {
    console.log(`Sin resultados para "${termino}".`);
    return;
  }

  console.log(`${articulos.length} resultado(s) para "${termino}":\n`);
  for (const articulo of articulos) {
    console.log(`- [${articulo.codigo}] ${articulo.nombre} (stock: ${articulo.stock}, rubro: ${articulo.rubro.nombre})`);
  }
}

main().catch((error) => {
  console.error('Error buscando artículos:', error.message);
  process.exit(1);
});
