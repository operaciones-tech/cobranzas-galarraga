import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { ref, onValue, update, remove } from "firebase/database";
import { db } from "./firebase";
import {
  ESTADOS,
  REQUIERE_METODO,
  REQUIERE_FECHA_COBRO,
  DB_PASSWORD,
  USER_KEY,
  SALDOS_KEY,
  esExcluido,
  fmtARS,
  fmtARSFull,
  parseDate,
  toInputDate,
  todayInputDate,
  normalize,
  generarId,
  fmtDateTime,
} from "./constants";
import styles from "./styles";
import AlertaVencimientos from "./AlertaVencimientos";
import TabAnalisis from "./TabAnalisis";
import TabMensajes from "./TabMensajes";
import TabReporting from "./TabReporting";

export default function App() {
  const [registros, setRegistros] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [filtro, setFiltro] = useState("todos");
  const [filtroComisionista, setFiltroComisionista] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [iniciando, setIniciando] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [syncStatus, setSyncStatus] = useState("online");
  const [toast, setToast] = useState(null);
  const [lastUpload, setLastUpload] = useState(null);
  const [activeTab, setActiveTab] = useState("cobranzas");
  const [usuario, setUsuario] = useState(
    () => localStorage.getItem(USER_KEY) || ""
  );
  const [modalNombre, setModalNombre] = useState("");
  const [showModal, setShowModal] = useState(!localStorage.getItem(USER_KEY));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [bulkEstado, setBulkEstado] = useState("Sin información");
  const [bulkMetodo, setBulkMetodo] = useState("Sin información");
  const [bulkFecha, setBulkFecha] = useState("");
  const [bulkComentario, setBulkComentario] = useState("");
  const [bulkMontoParcial, setBulkMontoParcial] = useState("");

  const showToast = (msg, type = "green") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getMeta = (id) =>
    metadata[id] || {
      estado: "Sin información",
      metodologia: "Sin información",
      comentario: "",
      montoParcial: "",
      fechaCobro: "",
      ultimoEditor: "",
      ultimaEdicion: "",
    };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const registrosParaKPIs = useMemo(
    () => registros.filter((r) => !esExcluido(getMeta(r.id).estado)),
    [registros, metadata]
  );

  const isCobrado = (r) => {
    const est = ESTADOS.find((e) => e.label === getMeta(r.id).estado);
    return !!(est && est.esCobrado);
  };
  const isVencido = (r) => {
    const d = parseDate(r.vence);
    return d && d < hoy && !isCobrado(r);
  };
  const isHoy = (r) => {
    const d = parseDate(r.vence);
    if (!d) return false;
    const dc = new Date(d);
    dc.setHours(0, 0, 0, 0);
    return dc.getTime() === hoy.getTime() && !isCobrado(r);
  };

  useEffect(() => {
    const unsubReg = onValue(
      ref(db, "registros"),
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lista = Object.values(data).sort((a, b) => {
            const da = parseDate(a.vence),
              db2 = parseDate(b.vence);
            if (!da && !db2) return 0;
            if (!da) return 1;
            if (!db2) return -1;
            return da.getTime() - db2.getTime();
          });
          setRegistros(lista);
        } else setRegistros([]);
        setIniciando(false);
      },
      () => {
        setSyncStatus("offline");
        setIniciando(false);
      }
    );

    const unsubMeta = onValue(
      ref(db, "metadata"),
      (snapshot) => {
        setMetadata(snapshot.val() || {});
        setSyncStatus("online");
      },
      () => setSyncStatus("offline")
    );

    onValue(ref(db, "info"), (snapshot) => {
      const data = snapshot.val();
      if (data) setLastUpload(data);
    });

    return () => {
      unsubReg();
      unsubMeta();
    };
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCargando(true);
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, {
        type: "array",
        cellDates: true,
        codepage: 1252,
      });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i].map((c) => normalize(c));
        if (
          row.some(
            (c) =>
              c.includes("comprobante") ||
              c.includes("vence") ||
              c.includes("importe")
          )
        ) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        setError("No se encontraron las columnas esperadas.");
        setCargando(false);
        return;
      }
      const headers = rows[headerIdx].map((c) => normalize(c));
      const col = (name) => headers.findIndex((h) => h.includes(name));
      const iComp = col("comprobante"),
        iNum = col("numero"),
        iDesc = col("descripcion"),
        iCuenta = col("cuenta"),
        iVence = col("vence"),
        iImporte = col("importe"),
        iComis = col("comisionista");
      const nuevos = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.every((c) => c === null || c === "")) continue;
        const fechaD = parseDate(r[iVence]);
        if (fechaD && fechaD.getFullYear() >= 2050) continue;
        const importe = parseFloat(r[iImporte]);
        if (isNaN(importe) || importe <= 0) continue;
        const descNorm = normalize(String(r[iDesc] || "")).replace(/\s+/g, "");
        const cuentaNorm = normalize(String(r[iCuenta] || "")).replace(
          /\s+/g,
          ""
        );
        const compNorm = normalize(String(r[iComp] || "")).replace(/\s+/g, "");
        if (
          descNorm.includes("total") ||
          cuentaNorm.includes("total") ||
          compNorm.includes("total")
        )
          continue;
        const comp = String(r[iComp] || "").trim();
        if (!comp || comp === "0") continue;
        const num = String(r[iNum] || "").trim();
        const id = generarId(comp, num, r[iVence], importe);
        nuevos.push({
          id,
          comprobante: comp,
          numero: num,
          descripcion: String(r[iDesc] || "").trim(),
          cuenta: String(r[iCuenta] || "").trim(),
          vence: fmtFecha(r[iVence]),
          importe,
          comisionista: String(r[iComis] || "").trim(),
        });
      }
      const idsExistentes = new Set(registros.map((r) => r.id));
      const soloNuevos = nuevos.filter((r) => !idsExistentes.has(r.id));
      if (soloNuevos.length === 0) {
        showToast(
          "No hay comprobantes nuevos — todo ya estaba cargado",
          "blue"
        );
        setCargando(false);
        return;
      }
      setSyncStatus("syncing");
      const updates = {};
      soloNuevos.forEach((r) => {
        updates[`registros/${r.id}`] = r;
      });
      updates["info"] = {
        ultimaCarga: fmtDateTime(),
        archivo: file.name,
        nuevos: soloNuevos.length,
        total: nuevos.length,
      };
      await update(ref(db), updates);
      setSyncStatus("online");
      showToast(
        `${soloNuevos.length} comprobantes nuevos agregados (${
          nuevos.length - soloNuevos.length
        } ya existían)`,
        "green"
      );
    } catch (err) {
      setError("Error al leer el archivo: " + err.message);
    }
    setCargando(false);
  };

  const updateMeta = async (id, field, value) => {
    setSyncStatus("syncing");
    const updatedFields = {
      [field]: value,
      ultimoEditor: usuario,
      ultimaEdicion: fmtDateTime(),
    };
    setMetadata((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updatedFields },
    }));
    try {
      await update(ref(db, `metadata/${id}`), updatedFields);
      setSyncStatus("online");
    } catch {
      setSyncStatus("offline");
    }
  };

  const confirmarUsuario = () => {
    const nombre = modalNombre.trim();
    if (!nombre) return;
    localStorage.setItem(USER_KEY, nombre);
    setUsuario(nombre);
    setShowModal(false);
  };

  const handleDeleteDB = async () => {
    if (deletePassword !== DB_PASSWORD) {
      setDeleteError(true);
      return;
    }
    setDeleting(true);
    try {
      await remove(ref(db, "registros"));
      await remove(ref(db, "metadata"));
      await remove(ref(db, "info"));
      setRegistros([]);
      setMetadata({});
      setLastUpload(null);
      setShowDeleteModal(false);
      setDeletePassword("");
      setDeleteError(false);
      showToast("Base de datos borrada correctamente", "green");
    } catch (e) {
      showToast("Error al borrar: " + e.message, "red");
    }
    setDeleting(false);
  };

  const toggleModoSeleccion = () => {
    setModoSeleccion((prev) => !prev);
    setSeleccionados(new Set());
    setSelectedId(null);
    setBulkEstado("Sin información");
    setBulkMetodo("Sin información");
    setBulkFecha("");
    setBulkComentario("");
    setBulkMontoParcial("");
  };

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const aplicarEnBloque = async () => {
    if (seleccionados.size === 0) return;
    if (bulkEstado === "Pago parcial" && !bulkMontoParcial) return;
    setSyncStatus("syncing");
    const ts = fmtDateTime();
    const updates = {};
    seleccionados.forEach((id) => {
      const campos = {
        ...(metadata[id] || {}),
        ultimoEditor: usuario,
        ultimaEdicion: ts,
      };
      if (bulkEstado !== "Sin información") campos.estado = bulkEstado;
      if (bulkEstado === "Pago parcial" && bulkMontoParcial)
        campos.montoParcial = bulkMontoParcial;
      if (bulkMetodo !== "Sin información") campos.metodologia = bulkMetodo;
      if (bulkFecha) campos.fechaCobro = bulkFecha;
      if (bulkComentario.trim()) campos.comentario = bulkComentario.trim();
      updates[`metadata/${id}`] = campos;
    });
    setMetadata((prev) => {
      const next = { ...prev };
      Object.entries(updates).forEach(([path, val]) => {
        next[path.replace("metadata/", "")] = val;
      });
      return next;
    });
    try {
      await update(ref(db), updates);
      setSyncStatus("online");
      showToast(`${seleccionados.size} comprobantes actualizados`, "green");
      toggleModoSeleccion();
    } catch (e) {
      setSyncStatus("offline");
      showToast("Error al guardar: " + e.message, "red");
    }
  };

  const opcionesComisionista = useMemo(() => {
    const set = new Set(
      registros.map((r) => r.comisionista).filter((c) => c && c.trim() !== "")
    );
    return [...set].sort();
  }, [registros]);

  const hayPropios = useMemo(
    () =>
      registros.some((r) => !r.comisionista || r.comisionista.trim() === ""),
    [registros]
  );

  const registrosFiltrados = useMemo(() => {
    let lista = registros;
    if (filtro === "pendientes") lista = lista.filter((r) => !isCobrado(r));
    else if (filtro === "cobrados") lista = lista.filter((r) => isCobrado(r));
    else if (filtro === "vencidos") lista = lista.filter((r) => isVencido(r));
    if (filtroComisionista === "__propios__")
      lista = lista.filter(
        (r) => !r.comisionista || r.comisionista.trim() === ""
      );
    else if (filtroComisionista)
      lista = lista.filter((r) => r.comisionista === filtroComisionista);
    if (busqueda.trim()) {
      const b = normalize(busqueda);
      lista = lista.filter(
        (r) =>
          normalize(r.cuenta).includes(b) ||
          normalize(r.descripcion).includes(b) ||
          normalize(r.comprobante).includes(b) ||
          normalize(r.comisionista).includes(b)
      );
    }
    return lista;
  }, [registros, metadata, filtro, filtroComisionista, busqueda]);

  const totalPendiente = registrosParaKPIs
    .filter((r) => !isCobrado(r))
    .reduce((s, r) => s + r.importe, 0);
  const totalCobrado = registrosParaKPIs
    .filter((r) => isCobrado(r))
    .reduce((s, r) => s + r.importe, 0);
  const totalVencido = registrosParaKPIs
    .filter((r) => isVencido(r))
    .reduce((s, r) => s + r.importe, 0);
  const totalParcial = registrosParaKPIs
    .filter((r) => getMeta(r.id).estado === "Pago parcial")
    .reduce((s, r) => s + r.importe, 0);

  const selectedReg = !modoSeleccion
    ? registros.find((r) => r.id === selectedId)
    : null;
  const selectedMeta = selectedReg ? getMeta(selectedId) : null;
  const selectedEstadoObj = selectedMeta
    ? ESTADOS.find((e) => e.label === selectedMeta.estado)
    : null;
  const montoParcialNum = selectedMeta ? Number(selectedMeta.montoParcial) : 0;
  const requiereMetodo =
    selectedMeta && REQUIERE_METODO.includes(selectedMeta.estado);
  const metodoFaltante =
    requiereMetodo &&
    (!selectedMeta.metodologia ||
      selectedMeta.metodologia === "Sin información");
  const fechaFaltante =
    selectedMeta &&
    REQUIERE_FECHA_COBRO.includes(selectedMeta.estado) &&
    !selectedMeta.fechaCobro;
  const campoFaltante = metodoFaltante || fechaFaltante;
  const delayCobro =
    selectedReg && selectedMeta?.fechaCobro
      ? calcDelay(selectedReg.vence, selectedMeta.fechaCobro)
      : null;
  const bulkApplyDisabled =
    seleccionados.size === 0 ||
    (bulkEstado === "Pago parcial" && !bulkMontoParcial);

  const handleRowClick = (id) => {
    if (modoSeleccion) {
      toggleSeleccion(id);
      return;
    }
    if (campoFaltante) {
      showToast("Completá los campos obligatorios antes de continuar", "red");
      return;
    }
    setSelectedId(selectedId === id ? null : id);
  };

  const irARegistro = (id) => {
    if (campoFaltante) {
      showToast("Completá los campos obligatorios antes de continuar", "red");
      return;
    }
    setActiveTab("cobranzas");
    setFiltro("todos");
    setFiltroComisionista("");
    setBusqueda("");
    setSelectedId(id);
    setTimeout(() => {
      const el = document.querySelector(`tr[data-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  if (iniciando)
    return (
      <div
        style={{
          fontFamily: "Montserrat, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#F0F2F5",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: "#1877F2",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>
            G
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>
          Cargando datos...
        </div>
      </div>
    );

  return (
    <>
      <style>{styles}</style>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {selectedId && !modoSeleccion && (
        <div
          className="panel-backdrop"
          onClick={() => {
            if (!campoFaltante) setSelectedId(null);
          }}
        />
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-logo">
              <span>G</span>
            </div>
            <div className="modal-title">¿Quién sos?</div>
            <div className="modal-sub">
              Escribí tu nombre para identificar tus cambios en el sistema.
            </div>
            <input
              className="modal-input"
              placeholder="Tu nombre..."
              value={modalNombre}
              onChange={(e) => setModalNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmarUsuario()}
              autoFocus
            />
            <button
              className="modal-btn"
              onClick={confirmarUsuario}
              disabled={!modalNombre.trim()}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-logo danger">
              <span style={{ fontSize: 22 }}>!</span>
            </div>
            <div className="modal-title">Borrar base de datos</div>
            <div className="modal-sub">
              Esta acción eliminará{" "}
              <strong>todos los registros y estados</strong>. No se puede
              deshacer.
              <br />
              <br />
              Ingresá la contraseña para confirmar.
            </div>
            <input
              className={`modal-input${deleteError ? " error" : ""}`}
              type="password"
              placeholder="Contraseña..."
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleDeleteDB()}
              autoFocus
            />
            {deleteError && (
              <div className="modal-error-msg">Contraseña incorrecta</div>
            )}
            <button
              className="modal-btn danger"
              onClick={handleDeleteDB}
              disabled={deleting || !deletePassword}
            >
              {deleting ? "Borrando..." : "Borrar todo"}
            </button>
            <button
              className="modal-btn-cancel"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword("");
                setDeleteError(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="header">
          <div className="header-left">
            <div className="header-logo">
              <span>G</span>
            </div>
            <div>
              <div className="header-title">Seguimiento de Cobranzas</div>
              <div className="header-sub">
                Consignataria Galarraga
                {lastUpload
                  ? ` — Última carga: ${lastUpload.ultimaCarga} (${lastUpload.archivo})`
                  : ""}
              </div>
            </div>
          </div>
          <div className="header-right">
            {usuario && (
              <div className="user-chip">
                <div className="user-dot" />
                <span className="user-name">{usuario}</span>
                <span
                  className="user-change"
                  onClick={() => {
                    setModalNombre(usuario);
                    setShowModal(true);
                  }}
                >
                  cambiar
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className={`sync-dot ${syncStatus}`}></span>
              <span className="sync-label">
                {syncStatus === "online"
                  ? "Sincronizado"
                  : syncStatus === "syncing"
                  ? "Guardando..."
                  : "Sin conexión"}
              </span>
            </div>
            <label className="btn-change" style={{ cursor: "pointer" }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                style={{ display: "none" }}
              />
              {registros.length > 0 ? "Agregar archivo" : "Cargar archivo"}
            </label>
            <button
              className="btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Borrar DB
            </button>
          </div>
        </div>

        {registros.length === 0 ? (
          <div className="upload-area">
            <div style={{ fontSize: 36, marginBottom: 16 }}>📂</div>
            <div className="upload-title">Cargar liquidaciones</div>
            <div className="upload-desc">
              Archivo Excel con comprobantes (.xlsx o .xls)
            </div>
            <label className="btn-upload">
              Seleccionar archivo
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                style={{ display: "none" }}
              />
            </label>
            {cargando && (
              <p style={{ color: "#1877F2", marginTop: 14, fontSize: 12 }}>
                Procesando...
              </p>
            )}
            {error && (
              <p style={{ color: "#E8335A", marginTop: 14, fontSize: 12 }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="tabs">
              <button
                className={`tab-btn${
                  activeTab === "cobranzas" ? " active" : ""
                }`}
                onClick={() => setActiveTab("cobranzas")}
              >
                Cobranzas
              </button>
              <button
                className={`tab-btn${
                  activeTab === "analisis" ? " active" : ""
                }`}
                onClick={() => setActiveTab("analisis")}
              >
                Análisis
              </button>
              <button
                className={`tab-btn${
                  activeTab === "reporting" ? " active" : ""
                }`}
                onClick={() => setActiveTab("reporting")}
              >
                Reporting
              </button>
              <button
                className={`tab-btn${
                  activeTab === "mensajes" ? " active" : ""
                }`}
                onClick={() => setActiveTab("mensajes")}
              >
                Mensajes
              </button>
            </div>

            {activeTab === "analisis" ? (
              <TabAnalisis registros={registros} metadata={metadata} />
            ) : activeTab === "reporting" ? (
              <TabReporting registros={registros} metadata={metadata} />
            ) : activeTab === "mensajes" ? (
              <TabMensajes registros={registros} metadata={metadata} />
            ) : (
              <>
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    background: "#F0F2F5",
                    paddingBottom: 8,
                  }}
                >
                  <div className="stats-grid">
                    <div className="stat-card pending">
                      <div className="stat-label">Para cobrar</div>
                      <div className="stat-value">{fmtARS(totalPendiente)}</div>
                      <div className="stat-sub">
                        {registrosParaKPIs.filter((r) => !isCobrado(r)).length}{" "}
                        comprobantes
                      </div>
                    </div>
                    <div className="stat-card overdue">
                      <div className="stat-label">Vencido sin cobrar</div>
                      <div className="stat-value">{fmtARS(totalVencido)}</div>
                      <div className="stat-sub">
                        {registrosParaKPIs.filter((r) => isVencido(r)).length}{" "}
                        comprobantes
                      </div>
                    </div>
                    <div className="stat-card paid">
                      <div className="stat-label">Cobrado</div>
                      <div className="stat-value">{fmtARS(totalCobrado)}</div>
                      <div className="stat-sub">
                        {registrosParaKPIs.filter((r) => isCobrado(r)).length}{" "}
                        comprobantes
                      </div>
                    </div>
                    <div className="stat-card partial">
                      <div className="stat-label">Pago parcial</div>
                      <div className="stat-value">{fmtARS(totalParcial)}</div>
                      <div className="stat-sub">
                        {
                          registrosParaKPIs.filter(
                            (r) => getMeta(r.id).estado === "Pago parcial"
                          ).length
                        }{" "}
                        comprobantes
                      </div>
                    </div>
                  </div>

                  <AlertaVencimientos
                    registros={registros}
                    metadata={metadata}
                    onClickRegistro={irARegistro}
                  />

                  <div className="toolbar">
                    <div className="filter-group">
                      {[
                        { k: "todos", label: "Todos" },
                        { k: "pendientes", label: "Pendientes" },
                        { k: "vencidos", label: "Vencidos" },
                        { k: "cobrados", label: "Cobrados" },
                      ].map((f) => (
                        <button
                          key={f.k}
                          className={`filter-btn${
                            filtro === f.k ? " active" : ""
                          }`}
                          onClick={() => {
                            if (campoFaltante) {
                              showToast(
                                "Completá los campos obligatorios antes de continuar",
                                "red"
                              );
                              return;
                            }
                            setFiltro(f.k);
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {(opcionesComisionista.length > 0 || hayPropios) && (
                      <select
                        className={`comis-select${
                          filtroComisionista ? " active" : ""
                        }`}
                        value={filtroComisionista}
                        onChange={(e) => {
                          if (campoFaltante) {
                            showToast(
                              "Completá los campos obligatorios antes de continuar",
                              "red"
                            );
                            return;
                          }
                          setFiltroComisionista(e.target.value);
                        }}
                      >
                        <option value="">Todos los comisionistas</option>
                        {hayPropios && (
                          <option value="__propios__">Propios</option>
                        )}
                        {opcionesComisionista.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

                    <input
                      type="text"
                      className="search-input"
                      placeholder="Buscar por cliente, comprobante, comisionista..."
                      value={busqueda}
                      onChange={(e) => {
                        if (campoFaltante) {
                          showToast(
                            "Completá los campos obligatorios antes de continuar",
                            "red"
                          );
                          return;
                        }
                        setBusqueda(e.target.value);
                      }}
                    />
                    <button
                      className={`filter-btn${
                        modoSeleccion ? " selection-mode" : ""
                      }`}
                      onClick={toggleModoSeleccion}
                    >
                      {modoSeleccion
                        ? "Cancelar selección"
                        : "Selección múltiple"}
                    </button>
                  </div>

                  {modoSeleccion && (
                    <div className="bulk-panel">
                      <div
                        style={{
                          width: "100%",
                          marginBottom: 8,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <span className="bulk-panel-title">
                          Editar en bloque
                        </span>
                        {seleccionados.size > 0 ? (
                          <span className="bulk-count">
                            {seleccionados.size} seleccionados
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#666",
                              marginLeft: 12,
                            }}
                          >
                            Seleccioná comprobantes en la tabla
                          </span>
                        )}
                      </div>
                      <div className="bulk-field">
                        <div className="bulk-label">Estado</div>
                        <select
                          className="bulk-select"
                          value={bulkEstado}
                          onChange={(e) => {
                            setBulkEstado(e.target.value);
                            if (e.target.value !== "Pago parcial")
                              setBulkMontoParcial("");
                          }}
                        >
                          <option value="Sin información">
                            — No cambiar —
                          </option>
                          {ESTADOS.filter(
                            (e) => e.label !== "Sin información"
                          ).map((est) => (
                            <option key={est.label} value={est.label}>
                              {est.label}
                            </option>
                          ))}
                        </select>
                        {bulkEstado === "Pago parcial" && (
                          <div style={{ marginTop: 8 }}>
                            <div
                              className="bulk-label"
                              style={{ color: "#E8970C" }}
                            >
                              Monto cobrado{" "}
                              <span style={{ color: "#E8335A" }}>*</span>
                            </div>
                            <input
                              type="number"
                              className={`bulk-input${
                                bulkMontoParcial
                                  ? " required-ok"
                                  : " required-empty"
                              }`}
                              placeholder="Monto..."
                              value={bulkMontoParcial}
                              onChange={(e) =>
                                setBulkMontoParcial(e.target.value)
                              }
                            />
                            {!bulkMontoParcial && (
                              <div className="bulk-required-msg">
                                Campo obligatorio para Pago parcial
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bulk-field">
                        <div className="bulk-label">Metodología</div>
                        <select
                          className="bulk-select"
                          value={bulkMetodo}
                          onChange={(e) => setBulkMetodo(e.target.value)}
                        >
                          <option value="Sin información">
                            — No cambiar —
                          </option>
                          {METODOLOGIAS.filter(
                            (m) => m !== "Sin información"
                          ).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="bulk-field">
                        <div className="bulk-label">Fecha de cobro</div>
                        <input
                          type="date"
                          className="bulk-input"
                          value={bulkFecha}
                          onChange={(e) => setBulkFecha(e.target.value)}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            color: "#aaa",
                            cursor: "pointer",
                            textDecoration: "underline",
                            display: "block",
                            marginTop: 4,
                          }}
                          onClick={() => setBulkFecha(todayInputDate())}
                        >
                          Usar hoy
                        </span>
                      </div>
                      <div className="bulk-field">
                        <div className="bulk-label">Comentario</div>
                        <textarea
                          className="bulk-textarea"
                          placeholder="Comentario para todos..."
                          value={bulkComentario}
                          onChange={(e) => setBulkComentario(e.target.value)}
                        />
                      </div>
                      <div className="bulk-actions">
                        <button
                          className="bulk-apply"
                          onClick={aplicarEnBloque}
                          disabled={bulkApplyDisabled}
                        >
                          Aplicar a {seleccionados.size} comprobante
                          {seleccionados.size !== 1 ? "s" : ""}
                        </button>
                        <button
                          className="bulk-cancel"
                          onClick={toggleModoSeleccion}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="main-layout">
                  <div className="main-content">
                    {campoFaltante && !modoSeleccion && (
                      <div className="table-overlay">
                        <div className="table-overlay-msg">
                          <div className="table-overlay-icon">🔒</div>
                          <div className="table-overlay-title">
                            Campo obligatorio pendiente
                          </div>
                          <div className="table-overlay-sub">
                            {metodoFaltante &&
                              "Seleccioná la metodología de cobro en el panel derecho"}
                            {metodoFaltante && fechaFaltante && <br />}
                            {fechaFaltante &&
                              "Ingresá la fecha de cobro en el panel derecho"}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="table-wrapper">
                      <div className="table-meta">
                        <span>
                          {registrosFiltrados.length} de {registros.length}{" "}
                          comprobantes
                          {filtroComisionista && (
                            <span
                              style={{
                                marginLeft: 8,
                                background: "#EBF3FF",
                                color: "#1877F2",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 10px",
                                borderRadius: 20,
                              }}
                            >
                              {filtroComisionista === "__propios__"
                                ? "Propios"
                                : filtroComisionista}
                            </span>
                          )}
                          {modoSeleccion && seleccionados.size > 0 && (
                            <span className="bulk-count">
                              {seleccionados.size} seleccionados
                            </span>
                          )}
                        </span>
                        {cargando && (
                          <span style={{ color: "#1877F2", fontWeight: 600 }}>
                            Procesando archivo...
                          </span>
                        )}
                        {error && (
                          <span style={{ color: "#E8335A" }}>{error}</span>
                        )}
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              {modoSeleccion && <th className="col-check"></th>}
                              <th className="col-vence">Vence</th>
                              <th className="col-cliente">
                                Cliente / Descripción
                              </th>
                              <th className="col-comp">N° Liq.</th>
                              <th className="col-estado">Estado</th>
                              <th className="col-metodo">Metodología</th>
                              <th className="col-importe right">Importe</th>
                              <th className="col-editor">Último editor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosFiltrados.map((r) => {
                              const vencido = isVencido(r),
                                hoyVence = isHoy(r),
                                cobrado = isCobrado(r);
                              const meta = getMeta(r.id);
                              const estadoObj = ESTADOS.find(
                                (e) => e.label === meta.estado
                              );
                              const esExcluidoR = esExcluido(meta.estado);
                              const isSelected =
                                !modoSeleccion && selectedId === r.id;
                              const isChecked =
                                modoSeleccion && seleccionados.has(r.id);
                              return (
                                <tr
                                  key={r.id}
                                  data-id={r.id}
                                  className={
                                    isSelected
                                      ? "row-selected"
                                      : isChecked
                                      ? "row-checked"
                                      : cobrado && !esExcluidoR
                                      ? "row-paid"
                                      : vencido
                                      ? "row-overdue"
                                      : hoyVence
                                      ? "row-today"
                                      : ""
                                  }
                                  onClick={() => handleRowClick(r.id)}
                                >
                                  {modoSeleccion && (
                                    <td onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        className="cb"
                                        checked={isChecked}
                                        onChange={() => toggleSeleccion(r.id)}
                                      />
                                    </td>
                                  )}
                                  <td className="nowrap">
                                    <span
                                      className={
                                        cobrado && !esExcluidoR
                                          ? "date-paid"
                                          : vencido
                                          ? "date-overdue"
                                          : hoyVence
                                          ? "date-today"
                                          : "date-normal"
                                      }
                                    >
                                      {r.vence}
                                    </span>
                                    {vencido && (
                                      <span className="badge-vencido">
                                        Vencido
                                      </span>
                                    )}
                                    {hoyVence && (
                                      <span className="badge-hoy">Hoy</span>
                                    )}
                                  </td>
                                  <td className="col-cliente">
                                    <div
                                      className={`client-name${
                                        cobrado && !esExcluidoR ? " paid" : ""
                                      }`}
                                    >
                                      {r.cuenta || r.descripcion || "-"}
                                    </div>
                                    {r.cuenta && r.descripcion && (
                                      <div className="client-sub">
                                        {r.descripcion}
                                      </div>
                                    )}
                                  </td>
                                  <td className="nowrap">
                                    <span className="comp-text">
                                      {r.numero}
                                    </span>
                                  </td>
                                  <td className="nowrap">
                                    {estadoObj &&
                                    meta.estado !== "Sin información" ? (
                                      <>
                                        <span
                                          className="estado-badge"
                                          style={{
                                            background: estadoObj.bg,
                                            color: estadoObj.color,
                                          }}
                                        >
                                          {meta.estado}
                                        </span>
                                        {esExcluidoR && (
                                          <span className="excluido-badge">
                                            No incluido en cálculos
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span
                                        style={{ color: "#ddd", fontSize: 11 }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="nowrap">
                                    {meta.metodologia &&
                                    meta.metodologia !== "Sin información" ? (
                                      <span className="metodo-badge">
                                        {meta.metodologia}
                                      </span>
                                    ) : (
                                      <span
                                        style={{ color: "#ddd", fontSize: 11 }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="right">
                                    <span
                                      className={
                                        cobrado && !esExcluidoR
                                          ? "amount-paid"
                                          : "amount-text"
                                      }
                                    >
                                      {fmtARSFull(r.importe)}
                                    </span>
                                  </td>
                                  <td className="nowrap">
                                    {meta.ultimoEditor ? (
                                      <>
                                        <div className="editor-name">
                                          {meta.ultimoEditor}
                                        </div>
                                        <div className="editor-time">
                                          {meta.ultimaEdicion}
                                        </div>
                                      </>
                                    ) : (
                                      <span
                                        style={{ color: "#ddd", fontSize: 11 }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {registrosFiltrados.length === 0 && (
                              <tr>
                                <td
                                  colSpan={modoSeleccion ? 8 : 7}
                                  className="empty-cell"
                                >
                                  No hay comprobantes para mostrar
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {!modoSeleccion && selectedReg && (
                  <div className="side-panel">
                    <div className="panel-header">
                      <div className="panel-title">Detalle</div>
                      <button
                        className={`panel-close${
                          campoFaltante ? " blocked" : ""
                        }`}
                        onClick={() => {
                          if (campoFaltante) {
                            showToast(
                              "Completá los campos obligatorios antes de continuar",
                              "red"
                            );
                            return;
                          }
                          setSelectedId(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="panel-body">
                      <div className="panel-client">
                        {selectedReg.cuenta || selectedReg.descripcion || "-"}
                      </div>
                      {selectedReg.cuenta && selectedReg.descripcion && (
                        <div className="panel-meta">
                          {selectedReg.descripcion}
                        </div>
                      )}
                      <div className="panel-amount">
                        {fmtARSFull(selectedReg.importe)}
                      </div>
                      <div className="panel-vence">
                        Liq. {selectedReg.numero} — Vence el {selectedReg.vence}
                      </div>
                      {selectedEstadoObj &&
                        selectedMeta.estado !== "Sin información" && (
                          <div style={{ marginBottom: 14 }}>
                            <span
                              className="estado-preview"
                              style={{
                                background: selectedEstadoObj.bg,
                                color: selectedEstadoObj.color,
                              }}
                            >
                              {selectedMeta.estado}
                            </span>
                            {esExcluido(selectedMeta.estado) && (
                              <span
                                className="excluido-badge"
                                style={{ marginLeft: 6 }}
                              >
                                No incluido en cálculos
                              </span>
                            )}
                          </div>
                        )}
                      <div className="panel-divider" />
                      <div className="panel-field">
                        <div className="panel-field-label">Estado de cobro</div>
                        <select
                          className="panel-select"
                          value={selectedMeta.estado}
                          onChange={(e) =>
                            updateMeta(selectedId, "estado", e.target.value)
                          }
                        >
                          {ESTADOS.map((est) => (
                            <option key={est.label} value={est.label}>
                              {est.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedMeta.estado === "Pago parcial" && (
                        <div className="panel-field">
                          <div className="panel-field-label">
                            Monto cobrado hasta ahora
                          </div>
                          <input
                            type="number"
                            className="panel-input"
                            placeholder="Ingresá el monto cobrado"
                            value={selectedMeta.montoParcial || ""}
                            onChange={(e) =>
                              updateMeta(
                                selectedId,
                                "montoParcial",
                                e.target.value
                              )
                            }
                          />
                          {montoParcialNum > 0 && (
                            <>
                              <div className="cobrado-box">
                                <div className="cobrado-box-label">Cobrado</div>
                                <div className="cobrado-box-value">
                                  {fmtARSFull(montoParcialNum)}
                                </div>
                              </div>
                              <div className="saldo-box">
                                <div className="saldo-box-label">
                                  Saldo a reclamar
                                </div>
                                <div className="saldo-box-value">
                                  {fmtARSFull(
                                    selectedReg.importe - montoParcialNum
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <div className="panel-field">
                        <div className="panel-field-label">
                          Metodología de cobro
                          {requiereMetodo && (
                            <span className="required-star">OBLIGATORIO</span>
                          )}
                        </div>
                        <select
                          className={`panel-select${
                            metodoFaltante ? " required-error" : ""
                          }`}
                          value={selectedMeta.metodologia}
                          onChange={(e) =>
                            updateMeta(
                              selectedId,
                              "metodologia",
                              e.target.value
                            )
                          }
                        >
                          {METODOLOGIAS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        {metodoFaltante && (
                          <div className="required-msg">
                            Seleccioná cómo pagó para poder continuar
                          </div>
                        )}
                      </div>
                      {REQUIERE_FECHA_COBRO.includes(selectedMeta.estado) && (
                        <div className="panel-field">
                          <div className="panel-field-label">
                            Fecha de cobro
                            <span className="required-star">OBLIGATORIO</span>
                          </div>
                          <input
                            type="date"
                            className={`panel-input${
                              fechaFaltante ? " required-error" : ""
                            }`}
                            value={toInputDate(selectedMeta.fechaCobro) || ""}
                            onChange={(e) =>
                              updateMeta(
                                selectedId,
                                "fechaCobro",
                                e.target.value
                              )
                            }
                          />
                          {fechaFaltante && (
                            <div className="required-msg">
                              Ingresá la fecha de cobro para poder continuar
                            </div>
                          )}
                          {delayCobro !== null && (
                            <div
                              className={`delay-chip ${
                                delayCobro <= 0
                                  ? "delay-ok"
                                  : delayCobro <= 7
                                  ? "delay-warn"
                                  : "delay-bad"
                              }`}
                              style={{
                                marginTop: 8,
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {delayCobro < 0
                                ? `Pagó ${Math.abs(delayCobro)} días antes`
                                : delayCobro === 0
                                ? "Pagó en término"
                                : `Pagó ${delayCobro} días después`}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="panel-field">
                        <div className="panel-field-label">Comentarios</div>
                        <textarea
                          className="panel-textarea"
                          placeholder="Notas sobre este comprobante..."
                          value={selectedMeta.comentario}
                          onChange={(e) =>
                            updateMeta(selectedId, "comentario", e.target.value)
                          }
                        />
                      </div>
                      <div className="panel-divider" />
                      <div
                        style={{ fontSize: 10, color: "#ccc", lineHeight: 1.8 }}
                      >
                        {selectedReg.comisionista && (
                          <div>Comisionista: {selectedReg.comisionista}</div>
                        )}
                        {selectedMeta.ultimoEditor && (
                          <div>
                            Editado por: {selectedMeta.ultimoEditor} —{" "}
                            {selectedMeta.ultimaEdicion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
