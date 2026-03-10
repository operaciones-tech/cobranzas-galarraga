import { useState, useMemo } from "react";
import {
  ESTADOS,
  SOCIOS,
  fmtARSFull,
  fmtARS,
  parseDate,
  calcDelay,
  lastFridayInputDate,
  currentWeekNumber,
  weekNumberFromDate,
  todayInputDate,
  esExcluido,
  SALDOS_KEY,
  USER_KEY,
} from "./constants";

function TabReporting({ registros, metadata }) {
  const [fechaCorte, setFechaCorte] = useState(lastFridayInputDate);
  const [notas, setNotas] = useState("");
  const [copiado, setCopiado] = useState(false);

  const [saldosSocios, setSaldosSocios] = useState(() => {
    try {
      const saved = localStorage.getItem(SALDOS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SOCIOS.map((nombre) => ({
      nombre,
      monto: "",
      tipo: "Saldo Deudor",
    }));
  });

  const actualizarSaldo = (idx, campo, valor) => {
    setSaldosSocios((prev) => {
      const next = prev.map((s, i) =>
        i === idx ? { ...s, [campo]: valor } : s
      );
      localStorage.setItem(SALDOS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saldosCompletos = saldosSocios.every((s) => s.monto.trim() !== "");
  const numSemana = weekNumberFromDate(fechaCorte);
  const getMeta = (id) => metadata[id] || {};

  const fechaCorteDate = useMemo(() => {
    const d = parseDate(fechaCorte);
    if (d) {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  }, [fechaCorte]);

  const registrosSinExcluidos = useMemo(
    () => registros.filter((r) => !esExcluido(getMeta(r.id).estado)),
    [registros, metadata]
  );

  const registrosPeriodo = useMemo(() => {
    if (!fechaCorteDate) return [];
    return registrosSinExcluidos.filter((r) => {
      const d = parseDate(r.vence);
      return d && d <= fechaCorteDate;
    });
  }, [registrosSinExcluidos, fechaCorteDate]);

  const isCobradoR = (r) => {
    const m = getMeta(r.id);
    const est = ESTADOS.find(
      (e) => e.label === (m.estado || "Sin información")
    );
    return !!(est && est.esCobrado);
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const totalGeneral = registrosPeriodo.reduce((s, r) => s + r.importe, 0);
  const totalPendiente = registrosPeriodo
    .filter((r) => !isCobradoR(r))
    .reduce((s, r) => s + r.importe, 0);
  const totalCobrado = registrosPeriodo
    .filter((r) => isCobradoR(r))
    .reduce((s, r) => s + r.importe, 0);
  const pctPendiente =
    totalGeneral > 0 ? Math.round((totalPendiente / totalGeneral) * 100) : 0;
  const pctCobrado =
    totalGeneral > 0 ? Math.round((totalCobrado / totalGeneral) * 100) : 0;

  const sinInfoVencidos = registrosPeriodo.filter((r) => {
    const m = getMeta(r.id);
    if ((m.estado || "Sin información") !== "Sin información") return false;
    const d = parseDate(r.vence);
    if (!d) return false;
    const dc = new Date(d);
    dc.setHours(0, 0, 0, 0);
    return dc < hoy;
  });
  const sinInfoNoVencidos = registrosPeriodo.filter((r) => {
    const m = getMeta(r.id);
    if ((m.estado || "Sin información") !== "Sin información") return false;
    const d = parseDate(r.vence);
    if (!d) return true;
    const dc = new Date(d);
    dc.setHours(0, 0, 0, 0);
    return dc >= hoy;
  });

  const resumenEstado = useMemo(() => {
    const mapa = {};
    registrosPeriodo.forEach((r) => {
      const m = getMeta(r.id);
      const estado = m.estado || "Sin información";
      if (!mapa[estado]) mapa[estado] = { importe: 0, count: 0 };
      mapa[estado].importe += r.importe;
      mapa[estado].count += 1;
    });
    const filas = ESTADOS.filter((e) => e.label !== "Sin información")
      .map((e) => ({
        ...e,
        importe: mapa[e.label]?.importe || 0,
        count: mapa[e.label]?.count || 0,
      }))
      .filter((e) => e.importe > 0);
    if (sinInfoVencidos.length > 0) {
      filas.push({
        label: "Sin información — Vencido",
        bg: "#FFF5F7",
        color: "#E8335A",
        esCobrado: false,
        importe: sinInfoVencidos.reduce((s, r) => s + r.importe, 0),
        count: sinInfoVencidos.length,
      });
    }
    if (sinInfoNoVencidos.length > 0) {
      filas.push({
        label: "Sin información — No vencido",
        bg: "#f0f0f0",
        color: "#888",
        esCobrado: false,
        importe: sinInfoNoVencidos.reduce((s, r) => s + r.importe, 0),
        count: sinInfoNoVencidos.length,
      });
    }
    return filas;
  }, [registrosPeriodo, metadata, sinInfoVencidos, sinInfoNoVencidos]);

  const pivotMora = useMemo(() => {
    if (!fechaCorteDate) return [];
    const pendientes = registrosPeriodo.filter((r) => !isCobradoR(r));
    const mapa = {};
    pendientes.forEach((r) => {
      const key = r.cuenta || r.descripcion || "-";
      const dv = parseDate(r.vence);
      const mora = dv
        ? Math.round(
            (fechaCorteDate.getTime() - dv.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
      if (!mapa[key])
        mapa[key] = { nombre: key, m30: 0, m60: 0, m60plus: 0, total: 0 };
      if (mora <= 30) mapa[key].m30 += r.importe;
      else if (mora <= 60) mapa[key].m60 += r.importe;
      else mapa[key].m60plus += r.importe;
      mapa[key].total += r.importe;
    });
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [registrosPeriodo, fechaCorteDate, metadata]);

  const totalMora = {
    m30: pivotMora.reduce((s, r) => s + r.m30, 0),
    m60: pivotMora.reduce((s, r) => s + r.m60, 0),
    m60plus: pivotMora.reduce((s, r) => s + r.m60plus, 0),
    total: pivotMora.reduce((s, r) => s + r.total, 0),
  };

  const fechaCorteDisplay = fechaCorteDate
    ? fechaCorteDate.toLocaleDateString("es-AR")
    : "-";

  const generarHTML = () => {
    const tdS = `style="padding:8px 12px;border:1px solid #ddd;font-size:13px;"`;
    const tdR = `style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:right;"`;
    const thS = `style="padding:8px 12px;border:1px solid #ddd;font-size:11px;background:#F8F9FA;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;"`;
    const thR = `style="padding:8px 12px;border:1px solid #ddd;font-size:11px;background:#F8F9FA;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;text-align:right;"`;

    const bloqueTexto = `
<p style="font-family:Arial,sans-serif;font-size:14px;color:#222;margin-bottom:16px;">
  Buenas tardes, en el presente mail se informa la situación de cobranzas al <strong>${fechaCorteDisplay}</strong>.
</p>
<p style="font-family:Arial,sans-serif;font-size:14px;color:#222;margin-bottom:8px;">
  - El total de negocios a cobrar en el período fue de <strong>${fmtARSFull(
    totalGeneral
  )}</strong> — al día de este informe tenemos sin cobrar <strong>${fmtARSFull(
      totalPendiente
    )}</strong> — lo que representa un <strong>${pctPendiente}%</strong>.
</p>
<p style="font-family:Arial,sans-serif;font-size:14px;color:#222;margin-bottom:24px;">
  - La tasa de cobros en el mismo período fue de <strong>${fmtARSFull(
    totalCobrado
  )}</strong> — lo que representa un <strong>${pctCobrado}%</strong>.
</p>`;

    const filasEstado = resumenEstado
      .filter((e) => e.importe > 0)
      .map((e) => {
        const pct =
          totalGeneral > 0 ? Math.round((e.importe / totalGeneral) * 100) : 0;
        return `<tr><td ${tdS}>${e.label}</td><td ${tdR}>${fmtARSFull(
          e.importe
        )}</td><td ${tdR}>${pct}%</td></tr>`;
      })
      .join("");

    const bloqueResumen = `
<p style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:12px;">RESUMEN DE LA SEMANA ${numSemana}:</p>
<table style="border-collapse:collapse;width:420px;margin-bottom:24px;">
  <thead><tr><th ${thS}>Categoría</th><th ${thR}>Monto</th><th ${thR}>%</th></tr></thead>
  <tbody>${filasEstado}</tbody>
  <tfoot><tr>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;">Total a cobrar</td>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;text-align:right;">${fmtARSFull(
      totalGeneral
    )}</td>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;text-align:right;">100%</td>
  </tr></tfoot>
</table>`;

    const filasMora = pivotMora
      .map(
        (r) => `<tr>
      <td ${tdS}>${r.nombre}</td>
      <td ${tdR}>${r.m30 > 0 ? fmtARSFull(r.m30) : ""}</td>
      <td ${tdR}>${r.m60 > 0 ? fmtARSFull(r.m60) : ""}</td>
      <td ${tdR}>${r.m60plus > 0 ? fmtARSFull(r.m60plus) : ""}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:right;font-weight:700;">${fmtARSFull(
        r.total
      )}</td>
    </tr>`
      )
      .join("");

    const bloqueMora =
      pivotMora.length > 0
        ? `
<p style="font-family:Arial,sans-serif;font-size:14px;color:#222;margin-bottom:12px;">A continuación se detalla:</p>
<table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
  <thead><tr>
    <th ${thS}>Cuenta Corriente</th><th ${thR}>&lt;30 días</th>
    <th ${thR}>30 y &lt;60 días</th><th ${thR}>&gt;60 días</th><th ${thR}>Suma total</th>
  </tr></thead>
  <tbody>${filasMora}</tbody>
  <tfoot><tr>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;">Suma total</td>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;text-align:right;">${fmtARSFull(
      totalMora.m30
    )}</td>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;text-align:right;">${fmtARSFull(
      totalMora.m60
    )}</td>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;text-align:right;">${fmtARSFull(
      totalMora.m60plus
    )}</td>
    <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;font-weight:700;text-align:right;">${fmtARSFull(
      totalMora.total
    )}</td>
  </tr></tfoot>
</table>`
        : "";

    const bloqueNotas = notas.trim()
      ? `
<p style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#222;margin-bottom:8px;">Seguimiento Cobranzas:</p>
<p style="font-family:Arial,sans-serif;font-size:14px;color:#222;white-space:pre-line;margin-bottom:24px;">${notas.trim()}</p>`
      : "";

    const filasSaldos = saldosSocios
      .map(
        (s) =>
          `<tr><td ${tdS}><strong>${s.nombre}</strong></td><td ${tdR}>${
            s.monto
              ? fmtARSFull(Number(String(s.monto).replace(/\D/g, "")))
              : "-"
          } - ${s.tipo}</td></tr>`
      )
      .join("");

    const bloqueSaldos = `
<p style="font-family:Arial,sans-serif;font-size:14px;color:#222;margin-bottom:12px;">Por último, detalle de los saldos de las cuentas <strong>SOCIOS</strong> al día de la fecha:</p>
<table style="border-collapse:collapse;width:420px;margin-bottom:24px;">
  <tbody>${filasSaldos}</tbody>
</table>`;

    return `<div style="font-family:Arial,sans-serif;max-width:900px;">
${bloqueTexto}${bloqueMora}${bloqueResumen}${bloqueNotas}${bloqueSaldos}
<p style="font-family:Arial,sans-serif;font-size:14px;color:#222;margin-top:24px;">Saludos,<br/><strong>${
      localStorage.getItem(USER_KEY) || "Galarraga"
    }</strong></p>
</div>`;
  };

  const copiarAlPortapapeles = async () => {
    if (!saldosCompletos) return;
    const html = generarHTML();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      await navigator.clipboard.writeText(html);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  const inputStyle = {
    padding: "8px 12px",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "Montserrat, sans-serif",
    outline: "none",
    color: "#1a1a2e",
    background: "#fff",
  };
  const thStyle = {
    padding: "9px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#555",
    borderBottom: "1px solid #eee",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
    background: "#F8F9FA",
  };
  const tdStyle = {
    padding: "9px 14px",
    borderBottom: "1px solid #f5f5f5",
    fontSize: 13,
  };

  return (
    <div>
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Fecha de corte
          </div>
          <input
            type="date"
            value={fechaCorte}
            onChange={(e) => setFechaCorte(e.target.value)}
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
            Semana {numSemana} — Los datos se calculan hasta esta fecha
          </div>
        </div>
        <div
          style={{ width: 1, background: "#f0f0f0", alignSelf: "stretch" }}
        />
        <div
          style={{
            background: "#F0F2F5",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 12,
            color: "#555",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#aaa",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Período
          </div>
          <div>{registrosPeriodo.length} comprobantes</div>
          <div style={{ color: "#1877F2", fontWeight: 700 }}>
            {fmtARSFull(totalGeneral)}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={copiarAlPortapapeles}
            disabled={!saldosCompletos}
            style={{
              padding: "10px 24px",
              background: !saldosCompletos
                ? "#ccc"
                : copiado
                ? "#1DB954"
                : "#1877F2",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Montserrat, sans-serif",
              cursor: !saldosCompletos ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {copiado
              ? "¡Copiado!"
              : !saldosCompletos
              ? "Completá los saldos para copiar"
              : "Copiar reporte"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "2px solid #f0f0f0",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
            Vista previa del reporte
          </div>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>
            Semana {numSemana} — al {fechaCorteDisplay}
          </div>
        </div>

        <p
          style={{
            fontSize: 14,
            color: "#222",
            marginBottom: 10,
            lineHeight: 1.7,
          }}
        >
          Buenas tardes, en el presente mail se informa la situación de
          cobranzas al <strong>{fechaCorteDisplay}</strong>.
        </p>
        <p
          style={{
            fontSize: 14,
            color: "#222",
            marginBottom: 8,
            lineHeight: 1.7,
          }}
        >
          - El total de negocios a cobrar en el período fue de{" "}
          <strong>{fmtARSFull(totalGeneral)}</strong> — al día de este informe
          tenemos sin cobrar <strong>{fmtARSFull(totalPendiente)}</strong> — lo
          que representa un <strong>{pctPendiente}%</strong>.
        </p>
        <p
          style={{
            fontSize: 14,
            color: "#222",
            marginBottom: 24,
            lineHeight: 1.7,
          }}
        >
          - La tasa de cobros en el mismo período fue de{" "}
          <strong>{fmtARSFull(totalCobrado)}</strong> — lo que representa un{" "}
          <strong>{pctCobrado}%</strong>.
        </p>

        {pivotMora.length > 0 && (
          <>
            <p style={{ fontSize: 14, color: "#222", marginBottom: 8 }}>
              A continuación se detalla:
            </p>
            <div style={{ overflowX: "auto", marginBottom: 28 }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Cuenta Corriente</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      &lt;30 días
                    </th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      30 y &lt;60 días
                    </th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      &gt;60 días
                    </th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      Suma total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pivotMora.map((r) => (
                    <tr
                      key={r.nombre}
                      style={{ borderBottom: "1px solid #f5f5f5" }}
                    >
                      <td style={tdStyle}>{r.nombre}</td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: r.m30 > 0 ? "#1a1a2e" : "#ddd",
                        }}
                      >
                        {r.m30 > 0 ? fmtARSFull(r.m30) : "—"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: r.m60 > 0 ? "#E8970C" : "#ddd",
                        }}
                      >
                        {r.m60 > 0 ? fmtARSFull(r.m60) : "—"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: r.m60plus > 0 ? "#E8335A" : "#ddd",
                        }}
                      >
                        {r.m60plus > 0 ? fmtARSFull(r.m60plus) : "—"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        {fmtARSFull(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      background: "#F8F9FA",
                      borderTop: "2px solid #eee",
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 700 }}>Suma total</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      {fmtARSFull(totalMora.m30)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#E8970C",
                      }}
                    >
                      {fmtARSFull(totalMora.m60)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#E8335A",
                      }}
                    >
                      {fmtARSFull(totalMora.m60plus)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#1877F2",
                        fontSize: 14,
                      }}
                    >
                      {fmtARSFull(totalMora.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: 12,
          }}
        >
          RESUMEN DE LA SEMANA {numSemana}:
        </p>
        <table
          style={{
            borderCollapse: "collapse",
            width: 420,
            marginBottom: 28,
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Categoría</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Monto</th>
              <th style={{ ...thStyle, textAlign: "right" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {resumenEstado.map((e) => {
              const pct =
                totalGeneral > 0
                  ? Math.round((e.importe / totalGeneral) * 100)
                  : 0;
              return (
                <tr key={e.label} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: e.bg,
                        color: e.color,
                      }}
                    >
                      {e.label}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: e.importe > 0 ? 700 : 400,
                      color: e.importe > 0 ? "#1a1a2e" : "#ccc",
                    }}
                  >
                    {fmtARSFull(e.importe)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#555" }}>
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "#F8F9FA", borderTop: "2px solid #eee" }}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Total a cobrar</td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  fontWeight: 700,
                  color: "#1877F2",
                  fontSize: 14,
                }}
              >
                {fmtARSFull(totalGeneral)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                100%
              </td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Seguimiento Cobranzas (notas manuales)
          </div>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder={
              "- Agro Holanda, manda usd la semana que viene.\n- Kubransky paga el lunes.\n..."
            }
            style={{
              width: "100%",
              minHeight: 100,
              padding: "10px 14px",
              border: "1px dashed #d0d5dd",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: "Arial, sans-serif",
              color: "#222",
              outline: "none",
              resize: "vertical",
              background: "#FFFBF0",
              lineHeight: 1.7,
            }}
          />
        </div>

        <div
          style={{
            marginBottom: 24,
            background: !saldosCompletos ? "#FFF5F7" : "#F6FFF9",
            borderRadius: 12,
            padding: 20,
            border: `1px solid ${!saldosCompletos ? "#ffd0d8" : "#b8f0cc"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1a1a2e",
                  marginBottom: 2,
                }}
              >
                Saldos cuentas corrientes SOCIOS
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#E8335A",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 8,
                  }}
                >
                  OBLIGATORIO
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>
                Estos datos son obligatorios para poder copiar el reporte
              </div>
            </div>
            {saldosCompletos && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1DB954" }}>
                ✓ Completo
              </span>
            )}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                <th
                  style={{ ...thStyle, background: "transparent", width: 200 }}
                >
                  Socio
                </th>
                <th style={{ ...thStyle, background: "transparent" }}>Monto</th>
                <th
                  style={{ ...thStyle, background: "transparent", width: 200 }}
                >
                  Tipo de saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {saldosSocios.map((s, i) => (
                <tr
                  key={s.nombre}
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <td
                    style={{
                      padding: "8px 14px",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {s.nombre}
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{ fontSize: 13, fontWeight: 600, color: "#888" }}
                      >
                        $
                      </span>
                      <input
                        type="text"
                        placeholder="Ej: 378000000"
                        value={s.monto}
                        onChange={(e) =>
                          actualizarSaldo(i, "monto", e.target.value)
                        }
                        style={{
                          padding: "6px 10px",
                          border: `1px solid ${
                            !s.monto.trim() ? "#E8335A" : "#e0e0e0"
                          }`,
                          borderRadius: 8,
                          fontSize: 13,
                          fontFamily: "Montserrat, sans-serif",
                          outline: "none",
                          width: 180,
                          background: !s.monto.trim() ? "#FFF5F7" : "#fff",
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <select
                      value={s.tipo}
                      onChange={(e) =>
                        actualizarSaldo(i, "tipo", e.target.value)
                      }
                      style={{
                        padding: "6px 10px",
                        border: "1px solid #e0e0e0",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "Montserrat, sans-serif",
                        outline: "none",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <option value="Saldo Deudor">Saldo Deudor</option>
                      <option value="Saldo a Favor">Saldo a Favor</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
          Saludos,
          <br />
          <strong style={{ color: "#1a1a2e" }}>
            {localStorage.getItem(USER_KEY) || "Galarraga"}
          </strong>
        </p>

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={copiarAlPortapapeles}
            disabled={!saldosCompletos}
            style={{
              padding: "10px 28px",
              background: !saldosCompletos
                ? "#ccc"
                : copiado
                ? "#1DB954"
                : "#1877F2",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Montserrat, sans-serif",
              cursor: !saldosCompletos ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {copiado
              ? "¡Copiado al portapapeles!"
              : !saldosCompletos
              ? "Completá los saldos para copiar"
              : "Copiar reporte listo para pegar en Gmail"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────

export default TabReporting;
