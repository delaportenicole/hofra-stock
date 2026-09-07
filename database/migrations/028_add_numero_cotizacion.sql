-- Número de Cotización: contador interno secuencial, independiente de la referencia
-- que trae el cliente. Las solicitudes existentes quedan sin número (NULL); el contador
-- arranca en 250 recién con la próxima solicitud que se cree.
CREATE SEQUENCE solicitudes_cotizacion_numero_seq START WITH 250;

ALTER TABLE solicitudes_cotizacion
  ADD COLUMN numero_cotizacion INTEGER UNIQUE;

ALTER TABLE solicitudes_cotizacion
  ALTER COLUMN numero_cotizacion SET DEFAULT nextval('solicitudes_cotizacion_numero_seq');

ALTER SEQUENCE solicitudes_cotizacion_numero_seq OWNED BY solicitudes_cotizacion.numero_cotizacion;
