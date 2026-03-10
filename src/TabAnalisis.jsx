import { useState, useMemo, useEffect } from "react";
import {
  ESTADOS,
  RANGOS,
  TNA_KEY,
  esExcluido,
  fmtARS,
  fmtARSFull,
  parseDate,
  calcDelay,
  defaultFechaInicio,
  todayInputDate,
} from "./constants";

function TabAnalisis({ registros, metadata }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [fechaFin, setFechaFin] = useState(todayInputDate);
  const [fechaInicio, setFechaInicio] = useState(() =>
    defaultFechaInicio(todayInputDate())
  );
  const [filtroDim, setFiltroDim] = useState("todos");
  const [filtroValor, setFiltroValor] = useState("");
  const [tna, setTna] = useState(() => localStorage.getItem(TNA_KEY) || "");

  useEffect(() => {
    setFechaInicio(defaultFechaInicio(fechaFin));
  }, [fechaFin]);

  const handleTnaChange = (val) => {
    setTna(val);
    if (val) localStorage.setItem(TNA_KEY, val);
    else localStorage.removeItem(TNA_KEY);
  };

  const getMeta = (id) => metadata[id] || {};
  const dFin = parseDate(fechaFin);
  const dInicio = parseDate(fechaInicio);
  const tasaDiaria = tna ? Number(tna) / 100 / 365 : null;

  const registrosSinExcluidos = useMemo(
    () => registros.filter((r) => !esExcluido(getMeta(r.id).estado)),
    [registros, metadata]
  );

  const enPeriodo = (r) => {
    const d = parseDate(r.vence);
    if (!d) return false;
    if (dInicio && d < dInicio) return false;
    if (dFin && d > dFin) return false;
    return true;
  };

  const opcionesCliente = useMemo(() => {
    const set = new Set(
      registrosSinExcluidos
        .map((r) => r.cuenta || r.descripcion)
        .filter(Boolean)
    );
    return [...set].sort();
  }, [registrosSinExcluidos]);

  const opcionesComisionista = useMemo(() => {
    const set = new Set(
      registrosSinExcluidos.map((r) => r.comisionista).filter(Boolean)
    );
    return [...set].sort();
  }, [registrosSinExcluidos]);

  const registrosFiltrados = useMemo(() => {
    let lista = registrosSinExcluidos.filter(enPeriodo);
    if (filtroDim === "cliente" && filtroValor)
      lista = lista.filter((r) => (r.cuenta || r.descripcion) === filtroValor);
    if (filtroDim === "comisionista" && filtroValor) {
      if (filtroValor === "__propios__")
        lista = lista.filter(
          (r) => !r.comisionista || r.comisionista.trim() === ""
        );
      else lista = lista.filter((r) => r.comisionista === filtroValor);
    }
    return lista;
  }, [registrosSinExcluidos, fechaInicio, fechaFin, filtroDim, filtroValor]);

  const sinInfoVencidos = registrosFiltrados.filter((r) => {
    const m = getMeta(r.id);
    if ((m.estado || "Sin información") !== "Sin información") return false;
    const d = parseDate(r.vence);
    if (!d) return false;
    const dc = new Date(d);
    dc.setHours(0, 0, 0, 0);
    return dc < hoy;
  });
  const sinInfoNoVencidos = registrosFiltrados.filter((r) => {
    const m = getMeta(r.id);
    if ((m.estado || "Sin información") !== "Sin información") return false;
    const d = parseDate(r.vence);
    if (!d) return true;
    const dc = new Date(d);
    dc.setHours(0, 0, 0, 0);
    return dc >= hoy;
  });

  const detalleComisionista = useMemo(() => {
    if (filtroDim !== "comisionista" || !filtroValor) return [];
    const mapa = {};
    registrosFiltrados.forEach((r) => {
      const key = r.cuenta || r.descripcion || "-";
      const m = getMeta(r.id);
      const estado = m.estado || "Sin información";
      const d = parseDate(r.vence);
      const dc = d ? new Date(d) : null;
      if (dc) dc.setHours(0, 0, 0, 0);
      const vencido = dc && dc < hoy && estado === "Sin información";
      if (!mapa[key])
        mapa[key] = {
          nombre: key,
          importe: 0,
          count: 0,
          sinInfoVenc: 0,
          sinInfoOk: 0,
        };
      mapa[key].importe += r.importe;
      mapa[key].count += 1;
      if (estado === "Sin información") {
        if (vencido) mapa[key].sinInfoVenc += 1;
        else mapa[key].sinInfoOk += 1;
      }
    });
    return Object.values(mapa).sort((a, b) => b.importe - a.importe);
  }, [registrosFiltrados, filtroDim, filtroValor, metadata]);

  const detalleCliente = useMemo(() => {
    if (filtroDim !== "cliente" || !filtroValor) return [];
    return registrosFiltrados
      .map((r) => {
        const m = getMeta(r.id);
        const estado = m.estado || "Sin información";
        const d = parseDate(r.vence);
        const dc = d ? new Date(d) : null;
        if (dc) dc.setHours(0, 0, 0, 0);
        const vencido = dc && dc < hoy && estado === "Sin información";
        return {
          ...r,
          estado,
          metodologia: m.metodologia || "Sin información",
          vencido,
        };
      })
      .sort((a, b) => (parseDate(b.vence) || 0) - (parseDate(a.vence) || 0));
  }, [registrosFiltrados, filtroDim, filtroValor, metadata]);

  const delays = useMemo(() => {
    return registrosFiltrados
      .filter((r) => {
        const m = getMeta(r.id);
        return (
          (m.estado === "Pagó" || m.estado === "Pago parcial") && m.fechaCobro
        );
      })
      .map((r) => ({
        ...r,
        delay: calcDelay(r.vence, getMeta(r.id).fechaCobro),
      }))
      .filter((r) => r.delay !== null && r.delay > 0);
  }, [registrosFiltrados, metadata]);

  const delaysTodos = useMemo(() => {
    return registrosFiltrados
      .filter((r) => {
        const m = getMeta(r.id);
        return (
          (m.estado === "Pagó" || m.estado === "Pago parcial") && m.fechaCobro
        );
      })
      .map((r) => ({
        ...r,
        delay: calcDelay(r.vence, getMeta(r.id).fechaCobro),
      }))
      .filter((r) => r.delay !== null);
  }, [registrosFiltrados, metadata]);

  const delayPonderado = useMemo(() => {
    const totalPeso = delays.reduce((s, r) => s + r.importe * r.delay, 0);
    const totalImporte = delays.reduce((s, r) => s + r.importe, 0);
    return totalImporte > 0 ? Math.round(totalPeso / totalImporte) : null;
  }, [delays]);

  const enTermino = delaysTodos.filter((r) => r.delay <= 0).length;
  const conDelay = delaysTodos.filter((r) => r.delay > 0).length;
  const pctTermino =
    delaysTodos.length > 0
      ? Math.round((enTermino / delaysTodos.length) * 100)
      : null;
  const pctDelay =
    delaysTodos.length > 0
      ? Math.round((conDelay / delaysTodos.length) * 100)
      : null;

  const costoFinanciero = useMemo(() => {
    if (!tasaDiaria) return null;
    return delays.reduce((s, r) => s + r.importe * r.delay * tasaDiaria, 0);
  }, [delays, tasaDiaria]);

  const rollingPorEstado = useMemo(() => {
    const totalGeneral = registrosFiltrados.reduce((s, r) => s + r.importe, 0);
    const mapa = {};
    registrosFiltrados.forEach((r) => {
      const m = getMeta(r.id);
      const estado = m.estado || "Sin información";
      if (!mapa[estado]) mapa[estado] = { importe: 0, count: 0 };
      mapa[estado].importe += r.importe;
      mapa[estado].count += 1;
    });
    const filas = [];
    ESTADOS.filter((e) => e.label !== "Sin información").forEach((e) => {
      if (mapa[e.label]?.importe > 0) {
        const pct =
          totalGeneral > 0 ? (mapa[e.label].importe / totalGeneral) * 100 : 0;
        filas.push({
          label: e.label,
          bg: e.bg,
          color: e.color,
          esCobrado: e.esCobrado,
          importe: mapa[e.label].importe,
          count: mapa[e.label].count,
          pct,
        });
      }
    });
    if (sinInfoVencidos.length > 0) {
      const imp = sinInfoVencidos.reduce((s, r) => s + r.importe, 0);
      filas.push({
        label: "Sin información — Vencido",
        bg: "#FFF5F7",
        color: "#E8335A",
        esCobrado: false,
        importe: imp,
        count: sinInfoVencidos.length,
        pct: totalGeneral > 0 ? (imp / totalGeneral) * 100 : 0,
      });
    }
    if (sinInfoNoVencidos.length > 0) {
      const imp = sinInfoNoVencidos.reduce((s, r) => s + r.importe, 0);
      filas.push({
        label: "Sin información — No vencido",
        bg: "#f0f0f0",
        color: "#888",
        esCobrado: false,
        importe: imp,
        count: sinInfoNoVencidos.length,
        pct: totalGeneral > 0 ? (imp / totalGeneral) * 100 : 0,
      });
    }
    const totalCobrado = filas
      .filter((f) => f.esCobrado)
      .reduce((s, f) => s + f.importe, 0);
    const totalPendiente = filas
      .filter((f) => !f.esCobrado)
      .reduce((s, f) => s + f.importe, 0);
    return { filas, totalGeneral, totalCobrado, totalPendiente };
  }, [registrosFiltrados, metadata, sinInfoVencidos, sinInfoNoVencidos]);

  const pivotMora = useMemo(() => {
    const totalImporte = delaysTodos.reduce((s, r) => s + r.importe, 0);
    return RANGOS.map((rango) => {
      const filas = delaysTodos.filter(
        (r) => r.delay >= rango.min && r.delay <= rango.max
      );
      const importe = filas.reduce((s, r) => s + r.importe, 0);
      const count = filas.length;
      const delayProm =
        count > 0
          ? Math.round(
              filas.reduce((s, r) => s + r.delay * r.importe, 0) / importe
            )
          : null;
      const costo = tasaDiaria
        ? filas
            .filter((r) => r.delay > 0)
            .reduce((s, r) => s + r.importe * r.delay * tasaDiaria, 0)
        : null;
      const pct = totalImporte > 0 ? (importe / totalImporte) * 100 : 0;
      return { ...rango, count, importe, pct, delayProm, costo };
    }).filter((r) => r.count > 0);
  }, [delaysTodos, tasaDiaria]);

  const porMetodo = useMemo(() => {
    const mapa = {};
    registrosFiltrados.forEach((r) => {
      const m = getMeta(r.id);
      if (!m.metodologia || m.metodologia === "Sin información") return;
      mapa[m.metodologia] = (mapa[m.metodologia] || 0) + 1;
    });
    const total = Object.values(mapa).reduce((s, v) => s + v, 0);
    return Object.entries(mapa)
      .map(([label, count]) => ({
        label,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [registrosFiltrados, metadata]);

  const rankingClientes = useMemo(() => {
    const mapa = {};
    delays.forEach((r) => {
      const key = r.cuenta || r.descripcion || r.id;
      if (!mapa[key])
        mapa[key] = {
          nombre: key,
          totalPeso: 0,
          totalImporte: 0,
          count: 0,
          costoFin: 0,
        };
      mapa[key].totalPeso += r.importe * r.delay;
      mapa[key].totalImporte += r.importe;
      mapa[key].count += 1;
      if (tasaDiaria) mapa[key].costoFin += r.importe * r.delay * tasaDiaria;
    });
    return Object.values(mapa)
      .map((c) => ({
        ...c,
        promedio: Math.round(c.totalPeso / c.totalImporte),
      }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 10);
  }, [delays, tasaDiaria]);

  const delayPorMetodo = useMemo(() => {
    const mapa = {};
    delaysTodos.forEach((r) => {
      const m = getMeta(r.id);
      const metodo = m.metodologia || "Sin información";
      if (metodo === "Sin información") return;
      if (!mapa[metodo])
        mapa[metodo] = {
          totalPeso: 0,
          totalImporte: 0,
          enTermino: 0,
          conMora: 0,
        };
      mapa[metodo].totalPeso += r.importe * r.delay;
      mapa[metodo].totalImporte += r.importe;
      if (r.delay <= 0) mapa[metodo].enTermino += 1;
      else mapa[metodo].conMora += 1;
    });
    return Object.entries(mapa)
      .map(([metodo, d]) => ({
        metodo,
        delayProm:
          d.totalImporte > 0 ? Math.round(d.totalPeso / d.totalImporte) : 0,
        total: d.enTermino + d.conMora,
        enTermino: d.enTermino,
        conMora: d.conMora,
        pctTermino:
          d.enTermino + d.conMora > 0
            ? Math.round((d.enTermino / (d.enTermino + d.conMora)) * 100)
            : 0,
        pctMora:
          d.enTermino + d.conMora > 0
            ? Math.round((d.conMora / (d.enTermino + d.conMora)) * 100)
            : 0,
      }))
      .sort((a, b) => b.delayProm - a.delayProm);
  }, [delaysTodos, metadata]);

  const [reporteCopiado, setReporteCopiado] = useState(false);

  const isCobradoEstado = (estado) => {
    const est = ESTADOS.find((e) => e.label === estado);
    return !!(est && est.esCobrado);
  };

  const nombreSinCodigo = (nombre) =>
    String(nombre || "")
      .replace(/^\d+\s+/, "")
      .trim();

  const periodoStr = `${fechaInicio
    .split("-")
    .reverse()
    .join("/")} al ${fechaFin.split("-").reverse().join("/")}`;

  const generarReporteComisionista = () => {
    const nombre = filtroValor === "__propios__" ? "equipo" : filtroValor;
    const total = registrosFiltrados.reduce((s, r) => s + r.importe, 0);
    const cobrados = registrosFiltrados.filter((r) =>
      isCobradoEstado(getMeta(r.id).estado)
    );
    const pendientes = registrosFiltrados.filter(
      (r) => !isCobradoEstado(getMeta(r.id).estado)
    );
    const totalCobrado = cobrados.reduce((s, r) => s + r.importe, 0);
    const totalPendiente = pendientes.reduce((s, r) => s + r.importe, 0);
    const pctCob = total > 0 ? Math.round((totalCobrado / total) * 100) : 0;
    const pctPend = total > 0 ? Math.round((totalPendiente / total) * 100) : 0;

    // Agrupar cobrados por cliente
    const mapaC = {};
    cobrados.forEach((r) => {
      const key = r.cuenta || r.descripcion || "-";
      if (!mapaC[key]) mapaC[key] = { nombre: key, importe: 0, count: 0 };
      mapaC[key].importe += r.importe;
      mapaC[key].count += 1;
    });
    // Agrupar pendientes por cliente
    const mapaP = {};
    pendientes.forEach((r) => {
      const key = r.cuenta || r.descripcion || "-";
      if (!mapaP[key]) mapaP[key] = { nombre: key, importe: 0, count: 0 };
      mapaP[key].importe += r.importe;
      mapaP[key].count += 1;
    });

    let msg = `Hola ${nombre}, te enviamos el reporte de tus negocios del ${periodoStr}:\n\n`;
    msg += `📊 RESUMEN\n`;
    msg += `• Total liquidado: ${fmtARSFull(total)}\n`;
    msg += `• Cobrado: ${fmtARSFull(totalCobrado)} (${pctCob}%)\n`;
    msg += `• Pendiente: ${fmtARSFull(totalPendiente)} (${pctPend}%)\n`;
    if (delayPonderado !== null)
      msg += `• Delay promedio: +${delayPonderado} días\n`;

    if (Object.keys(mapaC).length > 0) {
      msg += `\n✅ COBRADOS\n`;
      Object.values(mapaC)
        .sort((a, b) => b.importe - a.importe)
        .forEach((c) => {
          msg += `• ${c.nombre} — ${c.count} negocio${
            c.count !== 1 ? "s" : ""
          } — ${fmtARSFull(c.importe)}\n`;
        });
    }

    if (Object.keys(mapaP).length > 0) {
      msg += `\n⏳ PENDIENTES\n`;
      Object.values(mapaP)
        .sort((a, b) => b.importe - a.importe)
        .forEach((c) => {
          msg += `• ${c.nombre} — ${c.count} negocio${
            c.count !== 1 ? "s" : ""
          } — ${fmtARSFull(c.importe)}\n`;
        });
    }

    msg += `\n¡Quedamos a disposición!`;
    return msg;
  };

  const generarReporteCliente = () => {
    const nombre = filtroValor;
    const saludo = nombreSinCodigo(nombre);
    const total = registrosFiltrados.reduce((s, r) => s + r.importe, 0);
    const cobrados = registrosFiltrados.filter((r) =>
      isCobradoEstado(getMeta(r.id).estado)
    );
    const pendientes = registrosFiltrados.filter(
      (r) => !isCobradoEstado(getMeta(r.id).estado)
    );
    const totalCobrado = cobrados.reduce((s, r) => s + r.importe, 0);
    const totalPendiente = pendientes.reduce((s, r) => s + r.importe, 0);
    const pctCob = total > 0 ? Math.round((totalCobrado / total) * 100) : 0;
    const pctPend = total > 0 ? Math.round((totalPendiente / total) * 100) : 0;

    const hoyD = new Date();
    hoyD.setHours(0, 0, 0, 0);

    let msg = `Estimado/a ${saludo},\n\n`;
    msg += `Le informamos el estado de cuenta del período ${periodoStr}:\n\n`;
    msg += `RESUMEN\n`;
    msg += `• Total operado: ${fmtARSFull(total)}\n`;
    msg += `• Cancelado: ${fmtARSFull(totalCobrado)} (${pctCob}%)\n`;
    msg += `• Pendiente de pago: ${fmtARSFull(totalPendiente)} (${pctPend}%)\n`;

    const sorted = [...registrosFiltrados].sort(
      (a, b) => (parseDate(a.vence) || 0) - (parseDate(b.vence) || 0)
    );

    if (cobrados.length > 0) {
      msg += `\nDETALLE DE COMPROBANTES\n\n✅ CANCELADOS\n`;
      sorted
        .filter((r) => isCobradoEstado(getMeta(r.id).estado))
        .forEach((r) => {
          msg += `• Liq. ${r.numero} — ${fmtARSFull(r.importe)} — venció ${
            r.vence
          }\n`;
        });
    }

    if (pendientes.length > 0) {
      msg += `\n⏳ PENDIENTES\n`;
      sorted
        .filter((r) => !isCobradoEstado(getMeta(r.id).estado))
        .forEach((r) => {
          const dv = parseDate(r.vence);
          const dvN = dv ? new Date(dv) : null;
          if (dvN) dvN.setHours(0, 0, 0, 0);
          const vencido = dvN && dvN < hoyD;
          const m = getMeta(r.id);
          const esParcial = m.estado === "Pago parcial";
          const montoParcialNum = Number(m.montoParcial) || 0;
          let linea = `• Liq. ${r.numero} — `;
          if (esParcial && montoParcialNum > 0) {
            linea += `saldo ${fmtARSFull(
              r.importe - montoParcialNum
            )} de ${fmtARSFull(r.importe)}`;
          } else {
            linea += fmtARSFull(r.importe);
          }
          linea += ` — vence ${r.vence}`;
          if (vencido) linea += ` ⚠️ VENCIDO`;
          msg += linea + "\n";
        });
    }

    msg += `\nAnte cualquier consulta, no dude en comunicarse.\nConsignataria Galarraga`;
    return msg;
  };

  const copiarReporte = async () => {
    const texto =
      filtroDim === "comisionista"
        ? generarReporteComisionista()
        : generarReporteCliente();
    await navigator.clipboard.writeText(texto);
    setReporteCopiado(true);
    setTimeout(() => setReporteCopiado(false), 2500);
  };

  const delayColor = (d) =>
    d <= 0 ? "delay-ok" : d <= 7 ? "delay-warn" : "delay-bad";
  const delayLabel = (d) =>
    d < 0 ? `${Math.abs(d)}d antes` : d === 0 ? "En término" : `+${d}d`;
  const estadoObjFn = (label) => ESTADOS.find((e) => e.label === label);
  const inputStyle = {
    padding: "7px 10px",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "Montserrat, sans-serif",
    outline: "none",
    color: "#1a1a2e",
  };
  const dimBtnStyle = (active) => ({
    padding: "5px 14px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "Montserrat, sans-serif",
    background: active ? "#1a1a2e" : "#F0F2F5",
    color: active ? "#fff" : "#555",
    transition: "all 0.15s",
  });
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
    padding: "10px 14px",
    borderBottom: "1px solid #f5f5f5",
    fontSize: 13,
  };
  const chequeo =
    Math.abs(
      rollingPorEstado.totalCobrado +
        rollingPorEstado.totalPendiente -
        rollingPorEstado.totalGeneral
    ) < 1;

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
            Período de análisis
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={inputStyle}
            />
            <span style={{ color: "#aaa", fontSize: 12 }}>→</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
            La fecha inicio se ajusta automáticamente a 45 días antes
          </div>
        </div>
        <div
          style={{ width: 1, background: "#f0f0f0", alignSelf: "stretch" }}
        />
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
            TNA del período
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              placeholder="Ej: 120"
              value={tna}
              onChange={(e) => handleTnaChange(e.target.value)}
              style={{ ...inputStyle, width: 90, textAlign: "right" }}
            />
            <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>
              %
            </span>
          </div>
          {tasaDiaria && (
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 5 }}>
              Tasa diaria: {(tasaDiaria * 100).toFixed(4)}%
            </div>
          )}
        </div>
        <div
          style={{ width: 1, background: "#f0f0f0", alignSelf: "stretch" }}
        />
        <div style={{ flex: 1, minWidth: 260 }}>
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
            Filtrar por
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[
              { k: "todos", label: "Todos" },
              { k: "cliente", label: "Cliente" },
              { k: "comisionista", label: "Comisionista" },
            ].map((d) => (
              <button
                key={d.k}
                onClick={() => {
                  setFiltroDim(d.k);
                  setFiltroValor("");
                }}
                style={dimBtnStyle(filtroDim === d.k)}
              >
                {d.label}
              </button>
            ))}
          </div>
          {filtroDim !== "todos" && (
            <select
              value={filtroValor}
              onChange={(e) => setFiltroValor(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "Montserrat, sans-serif",
                outline: "none",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="">
                — Seleccioná{" "}
                {filtroDim === "cliente" ? "un cliente" : "un comisionista"} —
              </option>
              {filtroDim === "comisionista" && (
                <option value="__propios__">Propios</option>
              )}
              {(filtroDim === "cliente"
                ? opcionesCliente
                : opcionesComisionista
              ).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}
        </div>
        <div
          style={{
            background: "#F0F2F5",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 12,
            color: "#555",
            fontWeight: 600,
            whiteSpace: "nowrap",
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
            Mostrando
          </div>
          <div>{registrosFiltrados.length} comprobantes</div>
          <div style={{ color: "#1877F2", fontWeight: 700 }}>
            {fmtARS(registrosFiltrados.reduce((s, r) => s + r.importe, 0))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            costoFinanciero !== null ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div className="analisis-card delay">
          <div className="analisis-label">Delay ponderado</div>
          <div className="analisis-value">
            {delayPonderado !== null ? `${delayPonderado}d` : "-"}
          </div>
          <div className="analisis-sub">{delays.length} cobros con mora</div>
        </div>
        <div className="analisis-card termino">
          <div className="analisis-label">Cobrado en término</div>
          <div className="analisis-value">
            {pctTermino !== null ? `${pctTermino}%` : "-"}
          </div>
          <div className="analisis-sub">{enTermino} comprobantes sin delay</div>
        </div>
        <div className="analisis-card tarde">
          <div className="analisis-label">Cobrado con delay</div>
          <div className="analisis-value">
            {pctDelay !== null ? `${pctDelay}%` : "-"}
          </div>
          <div className="analisis-sub">
            {conDelay} comprobantes fuera de término
          </div>
        </div>
        {costoFinanciero !== null && (
          <div className="analisis-card" style={{ borderTopColor: "#E8335A" }}>
            <div className="analisis-label">Costo financiero del delay</div>
            <div
              className="analisis-value"
              style={{ color: "#E8335A", fontSize: 26 }}
            >
              {fmtARS(costoFinanciero)}
            </div>
            <div className="analisis-sub">
              TNA {tna}% — {delays.length} cobros con mora
            </div>
          </div>
        )}
      </div>

      {!tna && (
        <div
          style={{
            background: "#FFFBF0",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: 20,
            fontSize: 12,
            color: "#92400e",
            fontWeight: 600,
          }}
        >
          Ingresá la TNA del período para ver el costo financiero del delay
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1a1a2e",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Distribución por estado
          </div>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>
            {fechaInicio.split("-").reverse().join("/")} →{" "}
            {fechaFin.split("-").reverse().join("/")}
          </div>
        </div>
        {rollingPorEstado.filas.length === 0 ? (
          <div
            style={{
              color: "#bbb",
              fontSize: 13,
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            Sin datos para el período
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F9FA" }}>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Comprobantes</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Importe</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% del total</th>
              </tr>
            </thead>
            <tbody>
              {rollingPorEstado.filas.map((f) => (
                <tr key={f.label}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        background: f.bg,
                        color: f.color,
                      }}
                    >
                      {f.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>
                    {f.count}
                  </td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}
                  >
                    {fmtARSFull(f.importe)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          background: "#f0f0f0",
                          borderRadius: 4,
                          height: 6,
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(f.pct, 100)}%`,
                            background: f.bg === "#f0f0f0" ? "#aaa" : f.bg,
                            borderRadius: 4,
                            height: 6,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#555",
                          minWidth: 36,
                          textAlign: "right",
                        }}
                      >
                        {f.pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{ background: "#F8F9FA", borderTop: "2px solid #eee" }}
              >
                <td style={{ ...tdStyle, fontWeight: 700 }}>Suma total</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#888",
                  }}
                >
                  {rollingPorEstado.filas.reduce((s, f) => s + f.count, 0)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#1877F2",
                    fontSize: 15,
                  }}
                >
                  {fmtARSFull(rollingPorEstado.totalGeneral)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                  100%
                </td>
              </tr>
              <tr>
                <td colSpan={4} style={{ padding: "10px 14px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      borderRadius: 8,
                      background: chequeo ? "#F0FFF6" : "#FFF5F7",
                      border: `1px solid ${chequeo ? "#b8f0cc" : "#ffd0d8"}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: chequeo ? "#1DB954" : "#E8335A",
                      }}
                    >
                      Chequeo:{" "}
                      {chequeo
                        ? "OK — cuadra"
                        : `Diferencia de ${fmtARSFull(
                            Math.abs(
                              rollingPorEstado.totalCobrado +
                                rollingPorEstado.totalPendiente -
                                rollingPorEstado.totalGeneral
                            )
                          )}`}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#aaa", marginLeft: 12 }}>
                    Cobrado {fmtARSFull(rollingPorEstado.totalCobrado)} +
                    Pendiente {fmtARSFull(rollingPorEstado.totalPendiente)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {pivotMora.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#1a1a2e",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Mora por rangos
            </div>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>
              {delaysTodos.length} cobros con fecha
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F9FA" }}>
                <th style={thStyle}>Rango</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cobros</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Importe</th>
                <th style={{ ...thStyle, textAlign: "right" }}>%</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Delay prom.</th>
                {tasaDiaria && (
                  <th style={{ ...thStyle, textAlign: "right" }}>Costo fin.</th>
                )}
              </tr>
            </thead>
            <tbody>
              {pivotMora.map((r) => (
                <tr key={r.label} style={{ background: r.bg }}>
                  <td
                    style={{
                      ...tdStyle,
                      borderBottom: `1px solid ${r.border}`,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: r.color }}>
                      {r.label}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      borderBottom: `1px solid ${r.border}`,
                      color: "#555",
                    }}
                  >
                    {r.count}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      borderBottom: `1px solid ${r.border}`,
                      fontWeight: 700,
                    }}
                  >
                    {fmtARSFull(r.importe)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      borderBottom: `1px solid ${r.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          background: "rgba(0,0,0,0.06)",
                          borderRadius: 4,
                          height: 6,
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(r.pct, 100)}%`,
                            background: r.color,
                            borderRadius: 4,
                            height: 6,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: r.color,
                          minWidth: 36,
                          textAlign: "right",
                        }}
                      >
                        {r.pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      borderBottom: `1px solid ${r.border}`,
                    }}
                  >
                    {r.delayProm !== null ? (
                      <span style={{ fontWeight: 600, color: r.color }}>
                        {r.delayProm <= 0 ? "En término" : `+${r.delayProm}d`}
                      </span>
                    ) : (
                      <span style={{ color: "#ddd" }}>—</span>
                    )}
                  </td>
                  {tasaDiaria && (
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        borderBottom: `1px solid ${r.border}`,
                        fontWeight: 700,
                        color: r.costo > 0 ? "#E8335A" : "#1DB954",
                      }}
                    >
                      {r.costo !== null && r.costo > 0 ? (
                        fmtARSFull(r.costo)
                      ) : (
                        <span style={{ color: "#1DB954" }}>$0</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{ background: "#F8F9FA", borderTop: "2px solid #eee" }}
              >
                <td style={{ ...tdStyle, fontWeight: 700 }}>Total</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#888",
                  }}
                >
                  {delaysTodos.length}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#1877F2",
                    fontSize: 15,
                  }}
                >
                  {fmtARSFull(delaysTodos.reduce((s, r) => s + r.importe, 0))}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                  100%
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    color: "#aaa",
                    fontSize: 11,
                  }}
                >
                  —
                </td>
                {tasaDiaria && (
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#E8335A",
                    }}
                  >
                    {fmtARSFull(
                      pivotMora.reduce((s, r) => s + (r.costo || 0), 0)
                    )}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {filtroDim === "comisionista" &&
        filtroValor &&
        detalleComisionista.length > 0 && (
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#1a1a2e",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Clientes de{" "}
                  {filtroValor === "__propios__" ? "Propios" : filtroValor}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#aaa",
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {detalleComisionista.length} clientes — período {periodoStr}
                </div>
              </div>
              <button
                onClick={copiarReporte}
                style={{
                  padding: "8px 18px",
                  background: reporteCopiado ? "#1DB954" : "#1877F2",
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
                {reporteCopiado
                  ? "¡Copiado!"
                  : `📋 Copiar reporte para ${
                      filtroValor === "__propios__" ? "Propios" : filtroValor
                    }`}
              </button>
            </div>
            <div
              style={{
                maxHeight: 240,
                overflowY: "auto",
                borderRadius: 8,
                border: "1px solid #f0f0f0",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#F8F9FA",
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={thStyle}>Cliente</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      Comprobantes
                    </th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Importe</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Sin info</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleComisionista.map((c) => (
                    <tr
                      key={c.nombre}
                      style={{ borderBottom: "1px solid #f5f5f5" }}
                    >
                      <td style={{ padding: "9px 14px", fontWeight: 600 }}>
                        {c.nombre}
                      </td>
                      <td
                        style={{
                          padding: "9px 14px",
                          textAlign: "right",
                          color: "#888",
                        }}
                      >
                        {c.count}
                      </td>
                      <td
                        style={{
                          padding: "9px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#1877F2",
                        }}
                      >
                        {fmtARSFull(c.importe)}
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "right" }}>
                        {c.sinInfoVenc > 0 && (
                          <span
                            style={{
                              background: "#FFF5F7",
                              color: "#E8335A",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 8,
                              marginRight: 4,
                            }}
                          >
                            {c.sinInfoVenc} venc.
                          </span>
                        )}
                        {c.sinInfoOk > 0 && (
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
                            {c.sinInfoOk} ok
                          </span>
                        )}
                        {c.sinInfoVenc === 0 && c.sinInfoOk === 0 && (
                          <span style={{ color: "#ddd" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {filtroDim === "cliente" && filtroValor && detalleCliente.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1a1a2e",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Negocios de {filtroValor}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#aaa",
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                {detalleCliente.length} comprobantes — período {periodoStr}
              </div>
            </div>
            <button
              onClick={copiarReporte}
              style={{
                padding: "8px 18px",
                background: reporteCopiado ? "#1DB954" : "#1a1a2e",
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
              {reporteCopiado
                ? "¡Copiado!"
                : `📋 Copiar reporte para ${nombreSinCodigo(filtroValor)}`}
            </button>
          </div>
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              borderRadius: 8,
              border: "1px solid #f0f0f0",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#F8F9FA",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th style={thStyle}>Número</th>
                  <th style={thStyle}>Vence</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Metodología</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {detalleCliente.map((r) => {
                  const est = estadoObjFn(r.estado);
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid #f5f5f5" }}
                    >
                      <td
                        style={{
                          padding: "9px 14px",
                          color: "#888",
                          fontSize: 12,
                        }}
                      >
                        {r.numero}
                      </td>
                      <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                        {r.vence}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        {r.estado === "Sin información" ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 700,
                              background: r.vencido ? "#FFF5F7" : "#f0f0f0",
                              color: r.vencido ? "#E8335A" : "#888",
                            }}
                          >
                            {r.vencido
                              ? "Sin info — Vencido"
                              : "Sin info — No vencido"}
                          </span>
                        ) : est ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 700,
                              background: est.bg,
                              color: est.color,
                            }}
                          >
                            {r.estado}
                          </span>
                        ) : (
                          <span style={{ color: "#ddd", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "9px 14px",
                          fontSize: 12,
                          color: "#666",
                        }}
                      >
                        {r.metodologia !== "Sin información"
                          ? r.metodologia
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: "9px 14px",
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
      )}

      <div className="analisis-row">
        <div className="analisis-panel">
          <div className="analisis-panel-title">
            Distribución por metodología
          </div>
          {porMetodo.length === 0 ? (
            <div style={{ color: "#bbb", fontSize: 13 }}>
              Sin datos para el período
            </div>
          ) : (
            porMetodo.map((m) => (
              <div className="metodo-bar-row" key={m.label}>
                <div className="metodo-bar-label">{m.label}</div>
                <div className="metodo-bar-track">
                  <div
                    className="metodo-bar-fill"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
                <div className="metodo-bar-pct">{m.pct}%</div>
              </div>
            ))
          )}
        </div>
        <div className="analisis-panel">
          <div className="analisis-panel-title">
            Ranking — clientes que más tardan
            {tasaDiaria && (
              <span
                style={{
                  fontSize: 10,
                  color: "#aaa",
                  fontWeight: 400,
                  marginLeft: 8,
                }}
              >
                con costo financiero
              </span>
            )}
          </div>
          {rankingClientes.length === 0 ? (
            <div style={{ color: "#bbb", fontSize: 13 }}>
              Sin datos de delay para el período
            </div>
          ) : (
            <table className="ranking-table">
              <thead>
                <tr>
                  <th style={{ width: 24 }}>#</th>
                  <th>Cliente</th>
                  <th className="right">Delay pond.</th>
                  <th className="right">Cobros</th>
                  {tasaDiaria && <th className="right">Costo fin.</th>}
                </tr>
              </thead>
              <tbody>
                {rankingClientes.map((c, i) => (
                  <tr key={c.nombre}>
                    <td className="ranking-num">{i + 1}</td>
                    <td>
                      <div
                        className="ranking-name"
                        style={{
                          maxWidth: 130,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.nombre}
                      </div>
                    </td>
                    <td className="right">
                      <span className={`delay-chip ${delayColor(c.promedio)}`}>
                        {delayLabel(c.promedio)}
                      </span>
                    </td>
                    <td
                      className="right"
                      style={{ color: "#aaa", fontSize: 12 }}
                    >
                      {c.count}
                    </td>
                    {tasaDiaria && (
                      <td
                        className="right"
                        style={{
                          color: "#E8335A",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {fmtARSFull(c.costoFin)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {delayPorMetodo.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 20,
            marginTop: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#1a1a2e",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Delay promedio por metodología
            </div>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>
              {delaysTodos.length} cobros con fecha
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F9FA" }}>
                <th style={thStyle}>Metodología</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cobros</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Delay prom.</th>
                <th style={{ ...thStyle, textAlign: "right" }}>En término</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Con mora</th>
                <th style={thStyle}>Distribución</th>
              </tr>
            </thead>
            <tbody>
              {delayPorMetodo.map((m) => (
                <tr
                  key={m.metodo}
                  style={{ borderBottom: "1px solid #f5f5f5" }}
                >
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#EBF3FF",
                        color: "#1877F2",
                      }}
                    >
                      {m.metodo}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>
                    {m.total}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <span className={`delay-chip ${delayColor(m.delayProm)}`}>
                      {delayLabel(m.delayProm)}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: "#1DB954",
                      fontWeight: 700,
                    }}
                  >
                    {m.enTermino}{" "}
                    <span
                      style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}
                    >
                      ({m.pctTermino}%)
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: m.conMora > 0 ? "#E8335A" : "#aaa",
                      fontWeight: m.conMora > 0 ? 700 : 400,
                    }}
                  >
                    {m.conMora}{" "}
                    <span
                      style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}
                    >
                      ({m.pctMora}%)
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        height: 8,
                        borderRadius: 4,
                        overflow: "hidden",
                        minWidth: 80,
                      }}
                    >
                      <div
                        style={{
                          width: `${m.pctTermino}%`,
                          background: "#1DB954",
                        }}
                      />
                      <div
                        style={{
                          width: `${m.pctMora}%`,
                          background: "#E8335A",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 16,
              fontSize: 11,
              color: "#888",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "#1DB954",
                  display: "inline-block",
                }}
              />{" "}
              En término
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "#E8335A",
                  display: "inline-block",
                }}
              />{" "}
              Con mora
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TabAnalisis;
