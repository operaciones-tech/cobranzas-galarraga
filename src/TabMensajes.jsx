import { useState, useMemo } from "react";
import { ESTADOS, parseDate, fmtARSFull, todayInputDate } from "./constants";

function TabMensajes({ registros, metadata }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const lunesProximo = useMemo(() => {
    const d = new Date(hoy);
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }, []);

  const domingoProximo = useMemo(() => {
    const d = new Date(lunesProximo);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [lunesProximo]);

  const [seccion, setSeccion] = useState("recordatorio");

  const [p1Desde, setP1Desde] = useState(todayInputDate());
  const [p1Hasta, setP1Hasta] = useState(() => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 60);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [p1Notificados, setP1Notificados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("galarraga_p1_notif") || "{}");
    } catch {
      return {};
    }
  });
  const [p1Copiado, setP1Copiado] = useState(null);

  const [p2Contactados, setP2Contactados] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("galarraga_p2_contactados") || "{}"
      );
    } catch {
      return {};
    }
  });
  const [p2Copiado, setP2Copiado] = useState(null);

  const getMeta = (id) => metadata[id] || {};

  // ── PROCESO 1 ──────────────────────────────────────────
  const p1Registros = useMemo(() => {
    const desde = parseDate(p1Desde);
    const hasta = parseDate(p1Hasta);
    if (!desde || !hasta) return [];
    return registros.filter((r) => {
      const d = parseDate(r.vence);
      if (!d) return false;
      return d >= desde && d <= hasta;
    });
  }, [registros, p1Desde, p1Hasta]);

  const p1PorComisionista = useMemo(() => {
    const mapa = {};
    p1Registros.forEach((r) => {
      const tieneComis = r.comisionista && r.comisionista.trim() !== "";
      if (tieneComis) {
        const key = r.comisionista.trim();
        if (!mapa[key])
          mapa[key] = { key, label: key, registros: [], esPropios: false };
        mapa[key].registros.push(r);
      } else {
        // propios: agrupar por cliente
        const clienteKey = `__cliente__${r.cuenta || r.descripcion || r.id}`;
        const clienteLabel = r.cuenta || r.descripcion || "Sin nombre";
        if (!mapa[clienteKey])
          mapa[clienteKey] = {
            key: clienteKey,
            label: clienteLabel,
            registros: [],
            esPropios: true,
          };
        mapa[clienteKey].registros.push(r);
      }
    });
    return Object.values(mapa).sort((a, b) => a.label.localeCompare(b.label));
  }, [p1Registros]);

  const p1ClaveNotif = (comisKey) => `${comisKey}__${p1Desde}__${p1Hasta}`;

  const marcarP1Notificado = (comisKey) => {
    const clave = p1ClaveNotif(comisKey);
    const next = {
      ...p1Notificados,
      [clave]: new Date().toLocaleDateString("es-AR"),
    };
    setP1Notificados(next);
    localStorage.setItem("galarraga_p1_notif", JSON.stringify(next));
  };

  const desmarcarP1Notificado = (comisKey) => {
    const clave = p1ClaveNotif(comisKey);
    const next = { ...p1Notificados };
    delete next[clave];
    setP1Notificados(next);
    localStorage.setItem("galarraga_p1_notif", JSON.stringify(next));
  };

  const generarMensajeP1 = (comis) => {
    const nombre = comis.esPropios ? comis.label : comis.label;
    const saludo = comis.esPropios ? comis.label : comis.label;
    const lineas = comis.registros
      .sort((a, b) => (parseDate(a.vence) || 0) - (parseDate(b.vence) || 0))
      .map(
        (r) =>
          `• Liq. ${r.numero} — ${r.cuenta || r.descripcion} — ${fmtARSFull(
            r.importe
          )} — vence ${r.vence}`
      )
      .join("\n");
    return `Hola ${saludo}, te paso las liquidaciones enviadas a tus clientes:\n\n${lineas}\n\nAvisanos si necesitás corregir algo. ¡Gracias!`;
  };

  const copiarP1 = async (comis) => {
    const texto = generarMensajeP1(comis);
    await navigator.clipboard.writeText(texto);
    marcarP1Notificado(comis.key);
    setP1Copiado(comis.key);
    setTimeout(() => setP1Copiado(null), 2500);
  };

  // ── PROCESO 2 ──────────────────────────────────────────
  const p2Registros = useMemo(() => {
    return registros.filter((r) => {
      const d = parseDate(r.vence);
      if (!d) return false;
      const dc = new Date(d);
      dc.setHours(0, 0, 0, 0);
      if (dc < lunesProximo || dc > domingoProximo) return false;
      const m = getMeta(r.id);
      const estado = m.estado || "Sin información";
      return estado === "Sin información" || estado === "Pago parcial";
    });
  }, [registros, metadata, lunesProximo, domingoProximo]);

  const p2PorComisionista = useMemo(() => {
    const mapa = {};
    p2Registros.forEach((r) => {
      const tieneComis = r.comisionista && r.comisionista.trim() !== "";
      if (tieneComis) {
        const key = r.comisionista.trim();
        if (!mapa[key])
          mapa[key] = { key, label: key, registros: [], esPropios: false };
        mapa[key].registros.push(r);
      } else {
        // propios: agrupar por cliente
        const clienteKey = `__cliente__${r.cuenta || r.descripcion || r.id}`;
        const clienteLabel = r.cuenta || r.descripcion || "Sin nombre";
        if (!mapa[clienteKey])
          mapa[clienteKey] = {
            key: clienteKey,
            label: clienteLabel,
            registros: [],
            esPropios: true,
          };
        mapa[clienteKey].registros.push(r);
      }
    });
    return Object.values(mapa).sort((a, b) => a.label.localeCompare(b.label));
  }, [p2Registros]);

  const toggleP2Contactado = (id) => {
    const next = { ...p2Contactados, [id]: !p2Contactados[id] };
    if (!next[id]) delete next[id];
    setP2Contactados(next);
    localStorage.setItem("galarraga_p2_contactados", JSON.stringify(next));
  };

  const diasSemana = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  const generarMensajeP2 = (comis) => {
    const nombre = comis.label;
    const noContactados = comis.registros
      .filter((r) => !p2Contactados[r.id])
      .sort((a, b) => (parseDate(a.vence) || 0) - (parseDate(b.vence) || 0));
    if (noContactados.length === 0) return null;
    const lineas = noContactados
      .map((r) => {
        const d = parseDate(r.vence);
        const diaNombre = d ? diasSemana[d.getDay()] : "";
        const m = getMeta(r.id);
        const esParcial = m.estado === "Pago parcial";
        const montoParcialNum = Number(m.montoParcial) || 0;
        if (esParcial && montoParcialNum > 0) {
          const saldo = r.importe - montoParcialNum;
          return `• Liq. ${r.numero} — ${
            r.cuenta || r.descripcion
          } — saldo ${fmtARSFull(saldo)} de ${fmtARSFull(
            r.importe
          )} — vence el ${diaNombre} ${r.vence} _(pago parcial)_`;
        }
        return `• Liq. ${r.numero} — ${
          r.cuenta || r.descripcion
        } — ${fmtARSFull(r.importe)} — vence el ${diaNombre} ${r.vence}`;
      })
      .join("\n");
    return `Hola ${nombre}, te recordamos que los siguientes negocios vencen la semana que viene y todavía no hemos recibido ningún pago ni información al respecto:\n\n${lineas}\n\n¡Quedamos a disposición!`;
  };

  const copiarP2 = async (comis) => {
    const texto = generarMensajeP2(comis);
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setP2Copiado(comis.key);
    setTimeout(() => setP2Copiado(null), 2500);
  };

  const cardStyle = {
    background: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };
  const thS = {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#555",
    borderBottom: "1px solid #eee",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "#F8F9FA",
    whiteSpace: "nowrap",
  };
  const tdS = {
    padding: "9px 12px",
    borderBottom: "1px solid #f5f5f5",
    fontSize: 13,
    verticalAlign: "middle",
  };

  const fmtLunes = lunesProximo.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });
  const fmtDomingo = domingoProximo.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: "#fff",
          borderRadius: 12,
          padding: 4,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          width: "fit-content",
        }}
      >
        <button
          onClick={() => setSeccion("recordatorio")}
          style={{
            padding: "8px 20px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "Montserrat, sans-serif",
            background: seccion === "recordatorio" ? "#1877F2" : "transparent",
            color: seccion === "recordatorio" ? "#fff" : "#888",
            transition: "all 0.15s",
          }}
        >
          📅 Recordatorio de vencimientos
        </button>
        <button
          onClick={() => setSeccion("confirmacion")}
          style={{
            padding: "8px 20px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "Montserrat, sans-serif",
            background: seccion === "confirmacion" ? "#1877F2" : "transparent",
            color: seccion === "confirmacion" ? "#fff" : "#888",
            transition: "all 0.15s",
          }}
        >
          ✅ Confirmación de liquidaciones
        </button>
      </div>

      {seccion === "recordatorio" && (
        <>
          <div
            style={{
              ...cardStyle,
              borderLeft: "4px solid #E8970C",
              padding: "16px 20px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1a1a2e",
                    marginBottom: 2,
                  }}
                >
                  Vencimientos de la semana que viene
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {fmtLunes} al {fmtDomingo} — solo Sin información y Pago
                  parcial
                </div>
              </div>
              <div
                style={{
                  background: "#FFFBF0",
                  border: "1px solid #fde68a",
                  borderRadius: 10,
                  padding: "8px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#888",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 2,
                  }}
                >
                  Comprobantes
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#E8970C" }}
                >
                  {p2Registros.filter((r) => !p2Contactados[r.id]).length}
                </div>
                <div style={{ fontSize: 10, color: "#aaa" }}>sin contactar</div>
              </div>
            </div>
          </div>

          {p2PorComisionista.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                textAlign: "center",
                padding: 48,
                color: "#bbb",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                No hay vencimientos pendientes la semana que viene
              </div>
            </div>
          ) : (
            p2PorComisionista.map((comis) => {
              const noContactados = comis.registros.filter(
                (r) => !p2Contactados[r.id]
              );
              const todosContactados = noContactados.length === 0;
              const msgTexto = generarMensajeP2(comis);

              return (
                <div
                  key={comis.key}
                  style={{
                    ...cardStyle,
                    opacity: todosContactados ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: todosContactados ? "#f0f0f0" : "#EBF3FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                        }}
                      >
                        {todosContactados ? "✓" : "👤"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#1a1a2e",
                          }}
                        >
                          {comis.label}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>
                          {comis.registros.length} comprobantes
                          {todosContactados ? (
                            <span
                              style={{
                                color: "#1DB954",
                                fontWeight: 700,
                                marginLeft: 6,
                              }}
                            >
                              — todos contactados
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "#E8970C",
                                fontWeight: 700,
                                marginLeft: 6,
                              }}
                            >
                              — {noContactados.length} sin contactar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!todosContactados && msgTexto && (
                        <details style={{ position: "relative" }}>
                          <summary
                            style={{
                              padding: "7px 14px",
                              background: "#F0F2F5",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              fontFamily: "Montserrat, sans-serif",
                              color: "#555",
                              cursor: "pointer",
                              listStyle: "none",
                              userSelect: "none",
                            }}
                          >
                            Ver mensaje ▾
                          </summary>
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "calc(100% + 8px)",
                              width: 420,
                              background: "#1a1a2e",
                              borderRadius: 12,
                              padding: 16,
                              zIndex: 50,
                              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                            }}
                          >
                            <pre
                              style={{
                                fontSize: 12,
                                color: "#e0e0e0",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.6,
                                margin: 0,
                                fontFamily: "inherit",
                              }}
                            >
                              {msgTexto}
                            </pre>
                          </div>
                        </details>
                      )}
                      <button
                        onClick={() => copiarP2(comis)}
                        disabled={todosContactados || !msgTexto}
                        style={{
                          padding: "7px 16px",
                          background:
                            p2Copiado === comis.key
                              ? "#1DB954"
                              : todosContactados
                              ? "#f0f0f0"
                              : "#1877F2",
                          color: todosContactados ? "#aaa" : "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "Montserrat, sans-serif",
                          cursor: todosContactados ? "not-allowed" : "pointer",
                          transition: "background 0.2s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p2Copiado === comis.key
                          ? "¡Copiado!"
                          : "📋 Copiar para WhatsApp"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 8,
                      border: "1px solid #f0f0f0",
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ ...thS, width: 40 }}>✓</th>
                          <th style={thS}>Liq.</th>
                          <th style={thS}>Cliente</th>
                          <th style={thS}>Vence</th>
                          <th style={thS}>Estado</th>
                          <th style={{ ...thS, textAlign: "right" }}>
                            Importe
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comis.registros
                          .sort(
                            (a, b) =>
                              (parseDate(a.vence) || 0) -
                              (parseDate(b.vence) || 0)
                          )
                          .map((r) => {
                            const contactado = !!p2Contactados[r.id];
                            const m = getMeta(r.id);
                            const esParcial = m.estado === "Pago parcial";
                            const montoParcialNum = Number(m.montoParcial) || 0;
                            const d = parseDate(r.vence);
                            const diaNombre = d ? diasSemana[d.getDay()] : "";
                            return (
                              <tr
                                key={r.id}
                                style={{
                                  background: contactado
                                    ? "#F6FFF9"
                                    : "transparent",
                                  opacity: contactado ? 0.6 : 1,
                                  transition: "all 0.2s",
                                }}
                              >
                                <td style={{ ...tdS, textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={contactado}
                                    onChange={() => toggleP2Contactado(r.id)}
                                    style={{
                                      width: 15,
                                      height: 15,
                                      accentColor: "#1DB954",
                                      cursor: "pointer",
                                    }}
                                  />
                                </td>
                                <td
                                  style={{
                                    ...tdS,
                                    color: "#888",
                                    fontSize: 12,
                                  }}
                                >
                                  {r.numero}
                                </td>
                                <td style={tdS}>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color: contactado ? "#aaa" : "#1a1a2e",
                                      textDecoration: contactado
                                        ? "line-through"
                                        : "none",
                                    }}
                                  >
                                    {r.cuenta || r.descripcion}
                                  </div>
                                </td>
                                <td style={{ ...tdS, whiteSpace: "nowrap" }}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "#E8970C",
                                    }}
                                  >
                                    {diaNombre}
                                  </span>
                                  <span
                                    style={{ color: "#888", marginLeft: 6 }}
                                  >
                                    {r.vence}
                                  </span>
                                </td>
                                <td style={tdS}>
                                  {esParcial ? (
                                    <div>
                                      <span
                                        style={{
                                          background: "#FFF5EC",
                                          color: "#E8970C",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          padding: "2px 8px",
                                          borderRadius: 8,
                                        }}
                                      >
                                        Pago parcial
                                      </span>
                                      {montoParcialNum > 0 && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: "#888",
                                            marginTop: 2,
                                          }}
                                        >
                                          Saldo:{" "}
                                          {fmtARSFull(
                                            r.importe - montoParcialNum
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span
                                      style={{
                                        background: "#f0f0f0",
                                        color: "#888",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        padding: "2px 8px",
                                        borderRadius: 8,
                                      }}
                                    >
                                      Sin información
                                    </span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    ...tdS,
                                    textAlign: "right",
                                    fontWeight: 700,
                                  }}
                                >
                                  {fmtARSFull(r.importe)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {seccion === "confirmacion" && (
        <>
          <div style={{ ...cardStyle, padding: "16px 20px", marginBottom: 16 }}>
            <div
              style={{
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
                  Rango de vencimientos a consultar
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="date"
                    value={p1Desde}
                    onChange={(e) => setP1Desde(e.target.value)}
                    style={{
                      padding: "7px 10px",
                      border: "1px solid #e0e0e0",
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: "Montserrat, sans-serif",
                      outline: "none",
                      color: "#1a1a2e",
                    }}
                  />
                  <span style={{ color: "#aaa", fontSize: 12 }}>→</span>
                  <input
                    type="date"
                    value={p1Hasta}
                    onChange={(e) => setP1Hasta(e.target.value)}
                    style={{
                      padding: "7px 10px",
                      border: "1px solid #e0e0e0",
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: "Montserrat, sans-serif",
                      outline: "none",
                      color: "#1a1a2e",
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
                  Mostrá las liquidaciones que vencen en este rango para
                  confirmar con los representantes
                </div>
              </div>
              <div
                style={{
                  background: "#F0F2F5",
                  borderRadius: 10,
                  padding: "10px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#aaa",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 2,
                  }}
                >
                  En el rango
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#1877F2" }}
                >
                  {p1Registros.length}
                </div>
                <div style={{ fontSize: 10, color: "#aaa" }}>comprobantes</div>
              </div>
              <div
                style={{
                  background: "#F0F2F5",
                  borderRadius: 10,
                  padding: "10px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#aaa",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 2,
                  }}
                >
                  Notificados
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#1DB954" }}
                >
                  {
                    p1PorComisionista.filter(
                      (c) => p1Notificados[p1ClaveNotif(c.key)]
                    ).length
                  }
                </div>
                <div style={{ fontSize: 10, color: "#aaa" }}>
                  de {p1PorComisionista.length} grupos
                </div>
              </div>
            </div>
          </div>

          {p1PorComisionista.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                textAlign: "center",
                padding: 48,
                color: "#bbb",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                No hay liquidaciones en ese rango de fechas
              </div>
            </div>
          ) : (
            p1PorComisionista.map((comis) => {
              const clave = p1ClaveNotif(comis.key);
              const yaNotificado = !!p1Notificados[clave];
              const fechaNotif = p1Notificados[clave];
              const totalImporte = comis.registros.reduce(
                (s, r) => s + r.importe,
                0
              );

              return (
                <div
                  key={comis.key}
                  style={{
                    ...cardStyle,
                    opacity: yaNotificado ? 0.7 : 1,
                    transition: "opacity 0.2s",
                    borderLeft: `4px solid ${
                      yaNotificado ? "#1DB954" : "#1877F2"
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: yaNotificado ? "#F0FFF6" : "#EBF3FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                        }}
                      >
                        {yaNotificado ? "✓" : "👤"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#1a1a2e",
                          }}
                        >
                          {comis.label}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>
                          {comis.registros.length} liquidaciones —{" "}
                          {fmtARSFull(totalImporte)}
                          {yaNotificado && (
                            <span
                              style={{
                                color: "#1DB954",
                                fontWeight: 700,
                                marginLeft: 8,
                              }}
                            >
                              ✓ Notificado el {fechaNotif}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      {yaNotificado && (
                        <button
                          onClick={() => desmarcarP1Notificado(comis.key)}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            border: "1px solid #e0e0e0",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "Montserrat, sans-serif",
                            color: "#aaa",
                            cursor: "pointer",
                          }}
                        >
                          Desmarcar
                        </button>
                      )}
                      <details style={{ position: "relative" }}>
                        <summary
                          style={{
                            padding: "7px 14px",
                            background: "#F0F2F5",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "Montserrat, sans-serif",
                            color: "#555",
                            cursor: "pointer",
                            listStyle: "none",
                            userSelect: "none",
                          }}
                        >
                          Ver mensaje ▾
                        </summary>
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "calc(100% + 8px)",
                            width: 420,
                            background: "#1a1a2e",
                            borderRadius: 12,
                            padding: 16,
                            zIndex: 50,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                          }}
                        >
                          <pre
                            style={{
                              fontSize: 12,
                              color: "#e0e0e0",
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.6,
                              margin: 0,
                              fontFamily: "inherit",
                            }}
                          >
                            {generarMensajeP1(comis)}
                          </pre>
                        </div>
                      </details>
                      <button
                        onClick={() => copiarP1(comis)}
                        style={{
                          padding: "7px 16px",
                          background:
                            p1Copiado === comis.key ? "#1DB954" : "#1877F2",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "Montserrat, sans-serif",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p1Copiado === comis.key
                          ? "¡Copiado!"
                          : "📋 Copiar para WhatsApp"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 8,
                      border: "1px solid #f0f0f0",
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={thS}>Liq.</th>
                          <th style={thS}>Cliente</th>
                          <th style={thS}>Vence</th>
                          <th style={{ ...thS, textAlign: "right" }}>
                            Importe
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comis.registros
                          .sort(
                            (a, b) =>
                              (parseDate(a.vence) || 0) -
                              (parseDate(b.vence) || 0)
                          )
                          .map((r) => (
                            <tr
                              key={r.id}
                              style={{ borderBottom: "1px solid #f5f5f5" }}
                            >
                              <td
                                style={{
                                  ...tdS,
                                  color: "#888",
                                  fontSize: 12,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.numero}
                              </td>
                              <td style={{ ...tdS, fontWeight: 600 }}>
                                {r.cuenta || r.descripcion}
                              </td>
                              <td
                                style={{
                                  ...tdS,
                                  whiteSpace: "nowrap",
                                  color: "#555",
                                }}
                              >
                                {r.vence}
                              </td>
                              <td
                                style={{
                                  ...tdS,
                                  textAlign: "right",
                                  fontWeight: 700,
                                }}
                              >
                                {fmtARSFull(r.importe)}
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
                          <td colSpan={3} style={{ ...tdS, fontWeight: 700 }}>
                            Total
                          </td>
                          <td
                            style={{
                              ...tdS,
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#1877F2",
                              fontSize: 14,
                            }}
                          >
                            {fmtARSFull(totalImporte)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

export default TabMensajes;
