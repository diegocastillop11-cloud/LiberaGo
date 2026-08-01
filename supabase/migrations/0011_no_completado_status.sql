-- LiberaGo — nuevo estado "no_completado": el trabajador (o el admin)
-- intento el trabajo pero no se pudo hacer (ej. cliente no estaba, no
-- encontro el repuesto). Distinto de "cancelado" (que hoy solo lo usa el
-- admin, generalmente antes de que alguien empiece). El reembolso del 50%
-- al cliente en este caso es una regla de los Terminos y Condiciones, no
-- una accion automatica del sistema — el MVP no mueve plata dentro de la
-- app (ver CLAUDE.md, pagos coordinados fuera).

alter type request_status add value 'no_completado';

alter table requests add column failure_reason text;
