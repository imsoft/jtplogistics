-- Se descarta la "segunda oportunidad" autoservicio: ahora las rutas rojas
-- se desbloquean por solicitud aprobada por JTP (editUnlockRequested/Approved).
ALTER TABLE "carrier_routes"
  DROP COLUMN "red_retry_used";
