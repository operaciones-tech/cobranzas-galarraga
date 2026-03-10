import { useState, useMemo } from "react";
import { ESTADOS, parseDate, fmtARSFull } from "./constants";

function AlertaVencimientos({ registros, metadata, onClickRegistro }) {
  const [abierta, setAbierta] = useState(true);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en7dias = new Date(hoy);
  en7dias.setDate(hoy.getDate() + 7);

  const isCobradoR = (r) => {
    const m = metadata[r.id] || {};
    const est = ESTADOS.find(
      (e) => e.label === (m.estado || "Sin información")
    );
    return !!(est && est.esCobrado);
  };

  const proximos = useMemo(() => {
    return registros
      .filter((r) => {
        if (isCobradoR(r)) return false;
        const d = parseDate(r.vence);
        if (!d) return false;
        const dc = new Date(d);
        dc.setHours(0, 0, 0, 0);
        return dc >= hoy && dc <= en7dias;
      })
      .map((r) => {
        const d = new Date(parseDate(r.vence));
        d.setHours(0, 0, 0, 0);
        const dias = Math.round((d - hoy) / (1000 * 60 * 60 * 24));
        return { ...r, diasRestantes: dias };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [registros, metadata]);

  if (proximos.length === 0) return null;
  const hayUrgentes = proximos.some((r) => r.diasRestantes <= 1);
  const chipClass = (dias) =>
    dias === 0 ? "hoy" : dias === 1 ? "manana" : "semana";
  const chipLabel = (dias) =>
    dias === 0 ? "HOY" : dias === 1 ? "Mañana" : `${dias}d`;

  return (
    <div className="alerta-venc">
      <div className="alerta-venc-header" onClick={() => setAbierta((p) => !p)}>
        <div className="alerta-venc-title">
          <span>Vencimientos próximos</span>
          <span className={`alerta-venc-badge${hayUrgentes ? " rojo" : ""}`}>
            {proximos.length}
          </span>
        </div>
        <span className="alerta-venc-toggle">
          {abierta ? "▲ ocultar" : "▼ ver"}
        </span>
      </div>
      {abierta && (
        <div className="alerta-venc-body">
          {proximos.map((r) => (
            <div
              key={r.id}
              className={`alerta-chip ${chipClass(r.diasRestantes)}`}
              onClick={() => onClickRegistro(r.id)}
            >
              <span className="alerta-chip-dias">
                {chipLabel(r.diasRestantes)}
              </span>
              <span className="alerta-chip-nombre">
                {r.cuenta || r.descripcion}
              </span>
              <span className="alerta-chip-importe">
                {fmtARSFull(r.importe)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlertaVencimientos;
