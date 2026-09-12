import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  RefreshCw,
  Play,
  Users,
  DollarSign,
  Banknote,
  CreditCard,
  FileText,
  MoreHorizontal,
  BarChart3,
  Package,
  PackageX,
  ShoppingCart,
  BadgePercent,
  TrendingUp,
  SlidersHorizontal,
  AlertCircle,
  ClipboardCheck,
  CalendarDays,
  Clock3,
  PlayCircle,
  CheckCircle2,
  FileBarChart,
  ExternalLink,
  Info,
  Monitor,
  Pencil,
  Store,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useActivation } from "@/providers/ActivationProvider";
import { DialogAlert } from "@/components/common/dialog-alert";
import { PdfViewer } from "@/components/common/pdf-viewer";
import { usePosService } from "../usePosService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ServiceObtenerOperacionSucursalActiva,
  ServiceObtenerValorInventario,
  ServiceSucursalInicioOperacion,
  ServiceCerrarOperacionSucursal,
  ServiceObtenerOperacionesCajero,
  ServiceObtenerCajaConfigurada,
  ServiceAbrirCaja,
} from "../../../../wailsjs/go/main/App";
import bannerInicioJornada from "@/assets/banner-inicio-jornada.png";

const TABS = [
  { id: "financiero", label: "Financiero", icon: BarChart3 },
  { id: "jornada", label: "Jornada", icon: Building2 },
  { id: "cajas", label: "Turnos", icon: Users },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

export function CortesSucursalPage() {
  const navigate = useNavigate();
  const { generarFacturacionGlobal, obtenerFacturasGlobalesOperacion } =
    usePosService();
  const { user } = useAuth();
  const { store, license, deviceName, isInitialized } = useActivation();

  // SucursalID viene de store (ActivationProvider) — el Usuario no tiene ese campo.
  const sucursalID = store?.ID ?? store?.id ?? 0;
  const userID = user?.ID ?? user?.id ?? 0;

  const [activeTab, setActiveTab] = useState("financiero");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [opSucursal, setOpSucursal] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [inventario, setInventario] = useState(0);

  const [alertAction, setAlertAction] = useState(null);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [cierreCompletado, setCierreCompletado] = useState(false);
  const [cierreSnapshot, setCierreSnapshot] = useState(null);
  const [facturasGlobales, setFacturasGlobales] = useState({});
  const [facturaGlobalVisible, setFacturaGlobalVisible] = useState(null);
  const [modoInicio, setModoInicio] = useState("solo-jornada");
  const [fondoModalOpen, setFondoModalOpen] = useState(false);
  const [fondoCajaInput, setFondoCajaInput] = useState("");
  const [fondoCaja, setFondoCaja] = useState(null);
  const [cajaConfigurada, setCajaConfigurada] = useState(null);

  const cerrarDocumentoCierre = () => {
    if (facturaGlobalVisible?.pdfUrl) {
      URL.revokeObjectURL(facturaGlobalVisible.pdfUrl);
    }
    setFacturaGlobalVisible(null);
  };

  const abrirDocumentoCierre = (documento) => {
    try {
      const contenido = String(documento?.pdfBase64 || "")
        .replace(/^data:application\/pdf;base64,/, "")
        .replace(/\s/g, "");
      if (!contenido) throw new Error("El documento no contiene datos PDF");
      const binario = atob(contenido);
      const bytes = new Uint8Array(binario.length);
      for (let index = 0; index < binario.length; index += 1) {
        bytes[index] = binario.charCodeAt(index);
      }
      const pdfUrl = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      if (facturaGlobalVisible?.pdfUrl) {
        URL.revokeObjectURL(facturaGlobalVisible.pdfUrl);
      }
      setFacturaGlobalVisible({ ...documento, pdfUrl });
    } catch (error) {
      toast.error(`No se pudo abrir el PDF: ${String(error)}`);
    }
  };

  const fetchDatos = useCallback(async () => {
    if (!sucursalID) return; // Esperar a que store esté cargado
    setLoading(true);
    try {
      const res = await ServiceObtenerOperacionSucursalActiva(sucursalID);
      const op = res?.success ? res.data : null;
      console.log(res);
      setOpSucursal(op);

      if (op?.ID || op?.id) {
        const opID = op?.ID || op?.id;
        const resTurnos = await ServiceObtenerOperacionesCajero(opID);
        setTurnos(resTurnos?.success ? resTurnos.data || [] : []);
      } else {
        setTurnos([]);
      }
      const resInv = await ServiceObtenerValorInventario();
      setInventario(resInv?.success ? resInv.data || 0 : 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sucursalID]);

  useEffect(() => {
    if (!isInitialized) {
      setLoading(true);
      return;
    }

    if (sucursalID) {
      fetchDatos();
    } else {
      setLoading(false);
    }
  }, [fetchDatos, sucursalID, isInitialized]);

  // ── Iniciar jornada ───────────────────────────────────────────────────────
  const handleIniciarJornada = async () => {
    if (!sucursalID) {
      toast.error("No se ha detectado una sucursal válida.");
      return;
    }
    setAlertAction("iniciar");
  };

  const seleccionarModoInicio = async (modo) => {
    setModoInicio(modo);
    if (modo !== "jornada-caja") return;
    try {
      const caja = await ServiceObtenerCajaConfigurada();
      if (!caja?.ID && !caja?.id && !caja?.Nombre && !caja?.nombre) {
        toast.error("No se encontró una caja configurada para este equipo.");
        setModoInicio("solo-jornada");
        return;
      }
      setCajaConfigurada(caja || null);
    } catch (error) {
      console.error("No se pudo obtener la caja configurada", error);
      setCajaConfigurada(null);
      setModoInicio("solo-jornada");
      toast.error("No fue posible obtener la caja configurada.");
      return;
    }
    setFondoCajaInput(fondoCaja === null ? "" : String(fondoCaja));
    setFondoModalOpen(true);
  };

  const aplicarFondoCaja = () => {
    const monto = Number(String(fondoCajaInput).replace(/,/g, ""));
    if (!Number.isFinite(monto) || monto < 0) {
      toast.error("Ingresa un fondo de caja válido.");
      return;
    }
    setFondoCaja(monto);
    setFondoModalOpen(false);
  };

  const confirmIniciarJornada = async () => {
    setAlertAction(null);
    setSubmitting(true);
    try {
      const res = await ServiceSucursalInicioOperacion({
        Sucursal: sucursalID,
        Usuario: userID,
        ValorInventarioInicial: inventario,
        FechaInicio: new Date().toISOString(),
      });
      if (res?.success) {
        if (modoInicio === "jornada-caja") {
          const operacionID = res.data?.ID || res.data?.id;
          const cajaID = cajaConfigurada?.ID || cajaConfigurada?.id || 0;
          const cajaNombre = cajaConfigurada?.Nombre || cajaConfigurada?.nombre || "";
          if (!operacionID || !cajaNombre || fondoCaja === null) {
            toast.warning("La jornada inició, pero no fue posible abrir la caja porque faltan datos de configuración.");
          } else {
            const cajaRes = await ServiceAbrirCaja({
              OperacionSucursalID: operacionID,
              ResponsableCajaID: userID,
              CajaID: cajaID,
              CajaNombre: cajaNombre,
              FondoCajaApertura: fondoCaja,
            });
            if (cajaRes?.success) toast.success("Jornada iniciada y caja abierta correctamente");
            else toast.warning(`La jornada inició, pero la caja no pudo abrirse: ${cajaRes?.message || "Error desconocido"}`);
          }
        } else {
          toast.success("Jornada iniciada correctamente");
        }
        await fetchDatos();
      } else {
        toast.error(res?.message || "Error al iniciar jornada");
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cerrar jornada ────────────────────────────────────────────────────────
  const handleCerrarJornada = async () => {
    if (!opSucursal) return;
    const cajasAbiertas = turnos.filter((turno) => {
      const estatusID = turno?.EstatusID ?? turno?.estatusID;
      const fechaFin = turno?.FechaFin ?? turno?.fechaFin;
      return Number(estatusID) === 1 && !fechaFin;
    });
    setCierreCompletado(false);
    const operacionID = opSucursal?.ID || opSucursal?.id;
    try {
      const existentes = await obtenerFacturasGlobalesOperacion(operacionID);
      const documentos = Array.isArray(existentes?.data) ? existentes.data : [];
      setFacturasGlobales(
        Object.fromEntries(
          documentos.map((documento) => [documento.claveFormaPago, documento]),
        ),
      );
    } catch (error) {
      console.error("No se pudieron recuperar las facturas globales", error);
      setFacturasGlobales({});
    }
    setCierreSnapshot({
      sucursal:
        store?.NombreSucursal ||
        store?.nombreSucursal ||
        store?.Nombre ||
        store?.nombre ||
        "Sucursal actual",
      fecha: new Date().toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      turnosCerrados: turnos.length - cajasAbiertas.length,
      turnosAbiertos: cajasAbiertas.length,
      totalIngresos,
      totalCFDI,
      cfdiEfectivo: Number(
        opSucursal?.FacturacionPendienteEfectivo ??
          opSucursal?.facturacionPendienteEfectivo ??
          0,
      ),
      cfdiTarjetaCredito: Number(
        opSucursal?.FacturacionPendienteCredito ??
          opSucursal?.facturacionPendienteCredito ??
          0,
      ),
      cfdiTarjetaDebito: Number(
        opSucursal?.FacturacionPendienteDebito ??
          opSucursal?.facturacionPendienteDebito ??
          0,
      ),
      cfdiTransferenciaElectronica: Number(
        opSucursal?.FacturacionPendienteTransferencia ??
          opSucursal?.facturacionPendienteTransferencia ??
          0,
      ),
      descuentos: Number(
        opSucursal?.DescuentosAplicados || opSucursal?.descuentosAplicados || 0,
      ),
      transferenciasEntrada: Number(
        opSucursal?.TransferenciasEntrantes ||
          opSucursal?.transferenciasEntrantes ||
          0,
      ),
      transferenciasSalida: Number(
        opSucursal?.TransferenciasSalientes ||
          opSucursal?.transferenciasSalientes ||
          0,
      ),
      valorFinalInventario: Number(
        opSucursal?.ValorFinalInventario ||
          opSucursal?.valorFinalInventario ||
          0,
      ),
    });
    setCierreModalOpen(true);
  };

  const solicitarConfirmacionCierre = () => {
    const cajasAbiertas = turnos.filter((turno) => {
      const estatusID = turno?.EstatusID ?? turno?.estatusID;
      const fechaFin = turno?.FechaFin ?? turno?.fechaFin;
      return Number(estatusID) === 1 && !fechaFin;
    });
    if (cajasAbiertas.length > 0) {
      setCierreModalOpen(false);
      setActiveTab("cajas");
      setAlertAction("cajas-abiertas");
      return;
    }
    setAlertAction("confirmar-cierre");
  };

  const confirmCerrarJornada = async () => {
    setAlertAction(null);
    setSubmitting(true);
    try {
      const operacionID = opSucursal?.ID || opSucursal?.id;
      const facturacion = await generarFacturacionGlobal(operacionID);
      if (!facturacion?.success) {
        toast.error(
          facturacion?.message || "No se pudo generar la facturación global",
        );
        return;
      }
      const facturas = Array.isArray(facturacion?.data)
        ? facturacion.data
        : [];
      setFacturasGlobales(
        Object.fromEntries(
          facturas.map((documento) => [
            documento.claveFormaPago || documento.documentKey,
            documento,
          ]),
        ),
      );
      const res = await ServiceCerrarOperacionSucursal({
        OperacionID: operacionID,
        UsuarioCierreID: userID,
      });
      if (res?.success) {
        toast.success("Jornada cerrada correctamente");
        setCierreCompletado(true);
        setOpSucursal(res.data);
        await fetchDatos();
      } else {
        toast.error(res?.message || "Error al cerrar jornada");
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const estatusJornadaID = opSucursal?.EstatusID ?? opSucursal?.estatusID;
  const jornadaActiva = Boolean(opSucursal && Number(estatusJornadaID) === 1);
  const tituloJornada = jornadaActiva ? "Cierre de jornada" : "Iniciar jornada";
  const sucursalNombre =
    store?.NombreSucursal ||
    store?.nombreSucursal ||
    store?.Nombre ||
    store?.nombre ||
    license?.sucursal?.nombreSucursal ||
    "Sucursal sin nombre";
  const responsableNombre =
    user?.Nombre || user?.nombre || user?.Name || user?.name || "Usuario actual";
  const cajaNombre =
    cajaConfigurada?.Nombre || cajaConfigurada?.nombre || "Caja principal";
  const dispositivoNombre = deviceName || cajaNombre;
  const fechaInicioPropuesta = new Date();
  const fechaInicioTexto = fechaInicioPropuesta.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const horaInicioTexto = fechaInicioPropuesta.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const turnosActivos = turnos.filter((turno) => {
    const estatusID = turno?.EstatusID ?? turno?.estatusID;
    const fechaFin = turno?.FechaFin ?? turno?.fechaFin;
    return Number(estatusID) === 1 && !fechaFin;
  });
  const turnosCerrados = turnos.length - turnosActivos.length;
  const ingresosFormaPago = [
    {
      label: "Efectivo",
      value: opSucursal?.IngresoEfectivo || opSucursal?.ingresoEfectivo,
      icon: Banknote,
      tone: "emerald",
    },
    {
      label: "Tarjetas",
      value: opSucursal?.IngresoTarjetas || opSucursal?.ingresoTarjetas,
      icon: CreditCard,
      tone: "blue",
    },
    {
      label: "Cheques",
      value: opSucursal?.IngresoCheques || opSucursal?.ingresoCheques,
      icon: FileText,
      tone: "amber",
    },
    {
      label: "Transferencia",
      value:
        opSucursal?.IngresoTransferencia || opSucursal?.ingresoTransferencia,
      icon: ArrowDownLeft,
      tone: "violet",
    },
    {
      label: "Otros",
      value: opSucursal?.IngresoOtros || opSucursal?.ingresoOtros,
      icon: MoreHorizontal,
      tone: "cyan",
    },
  ];
  const cfdiFormaPago = [
    {
      label: "Efectivo",
      value: opSucursal?.CFDIEfectivo || opSucursal?.cfdiEfectivo,
      icon: Banknote,
      tone: "emerald",
    },
    {
      label: "Tarjetas",
      value: opSucursal?.CFDITarjetas || opSucursal?.cfdiTarjetas,
      icon: CreditCard,
      tone: "blue",
    },
    {
      label: "Cheques",
      value: opSucursal?.CFDICheques || opSucursal?.cfdiCheques,
      icon: FileText,
      tone: "amber",
    },
    {
      label: "Transferencia",
      value: opSucursal?.CFDITransferencia || opSucursal?.cfdiTransferencia,
      icon: ArrowDownLeft,
      tone: "violet",
    },
    {
      label: "Otros",
      value: opSucursal?.CFDIOtros || opSucursal?.cfdiOtros,
      icon: MoreHorizontal,
      tone: "cyan",
    },
  ];
  const totalIngresos = ingresosFormaPago.reduce(
    (total, item) => total + Number(item.value || 0),
    0,
  );
  const totalCFDI = cfdiFormaPago.reduce(
    (total, item) => total + Number(item.value || 0),
    0,
  );
  const cierreReportes = [
    {
      invoiceKey: "01",
      amount: Number(
        cierreSnapshot?.cfdiEfectivo ??
          opSucursal?.FacturacionPendienteEfectivo ??
          opSucursal?.facturacionPendienteEfectivo ??
          0,
      ),
      title: "Factura Ventas Efectivo",
      description: "Genera el CFDI global de las ventas pagadas en efectivo.",
      value: fmt(
        cierreSnapshot?.cfdiEfectivo ??
          opSucursal?.FacturacionPendienteEfectivo ??
          opSucursal?.facturacionPendienteEfectivo,
      ),
      icon: FileText,
      tone: "emerald",
    },
    {
      invoiceKey: "04",
      amount: Number(
        cierreSnapshot?.cfdiTarjetaCredito ??
          opSucursal?.FacturacionPendienteCredito ??
          opSucursal?.facturacionPendienteCredito ??
          0,
      ),
      title: "Factura Ventas Tarjeta Crédito",
      description:
        "Genera el CFDI global de las ventas pagadas con tarjeta de crédito.",
      value: fmt(
        cierreSnapshot?.cfdiTarjetaCredito ??
          opSucursal?.FacturacionPendienteCredito ??
          opSucursal?.facturacionPendienteCredito,
      ),
      icon: CreditCard,
      tone: "blue",
    },
    {
      invoiceKey: "28",
      amount: Number(
        cierreSnapshot?.cfdiTarjetaDebito ??
          opSucursal?.FacturacionPendienteDebito ??
          opSucursal?.facturacionPendienteDebito ??
          0,
      ),
      title: "Factura Ventas Tarjeta Débito",
      description:
        "Genera el CFDI global de las ventas pagadas con tarjeta de débito.",
      value: fmt(
        cierreSnapshot?.cfdiTarjetaDebito ??
          opSucursal?.FacturacionPendienteDebito ??
          opSucursal?.facturacionPendienteDebito,
      ),
      icon: CreditCard,
      tone: "violet",
    },
    {
      invoiceKey: "03",
      amount: Number(
        cierreSnapshot?.cfdiTransferenciaElectronica ??
          opSucursal?.FacturacionPendienteTransferencia ??
          opSucursal?.facturacionPendienteTransferencia ??
          0,
      ),
      title: "Factura Ventas Transferencia Electrónica",
      description:
        "Genera el CFDI global de las ventas pagadas mediante transferencia electrónica.",
      value: fmt(
        cierreSnapshot?.cfdiTransferenciaElectronica ??
          opSucursal?.FacturacionPendienteTransferencia ??
          opSucursal?.facturacionPendienteTransferencia,
      ),
      icon: ArrowDownLeft,
      tone: "cyan",
    },
    {
      documentKey: "descuentos",
      amount: Number(
        cierreSnapshot?.descuentos ??
          opSucursal?.DescuentosAplicados ??
          opSucursal?.descuentosAplicados ??
          0,
      ),
      title: "Reporte de descuentos",
      description:
        "Genera el reporte de descuentos aplicados durante la jornada.",
      value: fmt(
        cierreSnapshot?.descuentos ??
          opSucursal?.DescuentosAplicados ??
          opSucursal?.descuentosAplicados,
      ),
      icon: BarChart3,
      tone: "amber",
    },
    {
      documentKey: "transferenciasEntrada",
      amount: Number(
        cierreSnapshot?.transferenciasEntrada ??
          opSucursal?.TransferenciasEntrantes ??
          opSucursal?.transferenciasEntrantes ??
          0,
      ),
      title: "Transferencias de entrada",
      description:
        "Reporte de transferencias de mercancía recibidas durante la jornada.",
      value: fmt(
        cierreSnapshot?.transferenciasEntrada ??
          opSucursal?.TransferenciasEntrantes ??
          opSucursal?.transferenciasEntrantes,
      ),
      icon: ArrowDownLeft,
      tone: "blue",
    },
    {
      documentKey: "transferenciasSalida",
      amount: Number(
        cierreSnapshot?.transferenciasSalida ??
          opSucursal?.TransferenciasSalientes ??
          opSucursal?.transferenciasSalientes ??
          0,
      ),
      title: "Transferencias de salida",
      description:
        "Reporte de transferencias de mercancía enviadas durante la jornada.",
      value: fmt(
        cierreSnapshot?.transferenciasSalida ??
          opSucursal?.TransferenciasSalientes ??
          opSucursal?.transferenciasSalientes,
      ),
      icon: ArrowUpRight,
      tone: "rose",
    },
    {
      documentKey: "resumenFinanciero",
      title: "Resumen financiero",
      description: "Resumen general de la operación y los acumulados del día.",
      value: null,
      icon: FileBarChart,
      tone: "cyan",
      highlighted: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle">
        <RefreshCw className="size-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden animate-fade-in">
      {/* ── Page Header + Tabs ──────────────────────────────────────────── */}
      {jornadaActiva && <div className="shrink-0 px-5 pt-5 lg:px-6 lg:pt-6">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex justify-end">
              <div
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold sm:flex",
                  jornadaActiva
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    jornadaActiva ? "bg-emerald-500" : "bg-muted-foreground",
                  )}
                />
                {jornadaActiva ? "Jornada activa" : "Sin jornada activa"}
              </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div
              className="flex h-[58px] items-center gap-7 overflow-x-auto border-b border-border/70 px-5"
              role="tablist"
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex h-full shrink-0 items-center gap-1.5 px-1 text-xs font-semibold transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                      isActive
                        ? "text-primary after:bg-primary"
                        : "text-muted-foreground after:bg-transparent hover:text-foreground",
                    )}
                  >
                    <tab.icon className="size-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>}

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="mx-auto max-w-[1320px]">
          {/* ── JORNADA ───────────────────────────────────────────────────── */}
          {(activeTab === "jornada" || !jornadaActiva) && (
            <div className="space-y-4">
              {jornadaActiva && (
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.015em] text-foreground">
                    Estado de la jornada
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Consulta el periodo operativo, el inventario y los turnos asociados.
                  </p>
                </div>
              )}

              {jornadaActiva ? (
                <>
                  <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                    <div className="flex flex-col justify-between gap-5 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.075] via-blue-500/[.025] to-transparent px-5 py-5 dark:border-white/10 dark:from-blue-400/[.09] sm:flex-row sm:items-center">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xl",
                            jornadaActiva
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Building2 className="size-5" strokeWidth={1.8} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              Operación de sucursal
                            </h3>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                jornadaActiva
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              {jornadaActiva ? "Activa" : "Cerrada"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Inició el{" "}
                            {fmtDate(
                              opSucursal?.FechaInicio ||
                                opSucursal?.fechaInicio,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                          Finalización
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {jornadaActiva
                            ? "Operación en curso"
                            : fmtDate(
                                opSucursal?.FechaFin || opSucursal?.fechaFin,
                              )}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-px bg-border/50 sm:grid-cols-2 xl:grid-cols-4">
                      <JornadaMetric
                        icon={Package}
                        label="Inventario inicial"
                        value={fmt(
                          opSucursal?.ValorInicialInventario ||
                            opSucursal?.valorInicialInventario,
                        )}
                        tone="violet"
                      />
                      <JornadaMetric
                        icon={DollarSign}
                        label="Inventario actual"
                        value={fmt(inventario)}
                        tone="blue"
                      />
                      <JornadaMetric
                        icon={Users}
                        label="Turnos registrados"
                        value={turnos.length}
                        tone="cyan"
                      />
                      <JornadaMetric
                        icon={AlertCircle}
                        label="Turnos abiertos"
                        value={turnosActivos.length}
                        tone={turnosActivos.length ? "amber" : "emerald"}
                      />
                    </div>
                  </section>

                  {turnosActivos.length > 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-300/45 bg-amber-50/55 px-4 py-3 text-amber-900 dark:border-amber-400/15 dark:bg-amber-400/[.055] dark:text-amber-200">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-xs font-semibold">
                          Hay {turnosActivos.length}{" "}
                          {turnosActivos.length === 1
                            ? "caja abierta"
                            : "cajas abiertas"}
                        </p>
                        <p className="mt-0.5 text-[11px] opacity-75">
                          Todos los turnos deben cerrarse antes de finalizar la
                          jornada.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <section className="relative min-h-[250px] overflow-hidden rounded-2xl border border-blue-100/70 bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-100/40 px-7 py-10 shadow-[0_20px_50px_-38px_rgba(37,99,235,.55)] dark:border-blue-400/10 dark:from-blue-950/35 dark:via-blue-950/20 dark:to-transparent sm:px-10 sm:py-11">
                    <div className="relative z-20 max-w-[62%]">
                      <p className="text-[10px] font-bold uppercase tracking-[.1em] text-primary/80">
                        {sucursalNombre} · {store?.Tipo || store?.tipo || "Operación"}
                      </p>
                      <h3 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.04em] text-foreground sm:text-[36px]">
                        Todo listo para <span className="text-primary">iniciar operaciones</span>
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Estás iniciando la jornada de hoy, {fechaInicioTexto}, a las {horaInicioTexto}.
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Verifica la información y elige si también deseas abrir una caja.
                      </p>
                    </div>
                    <div className="absolute inset-y-0 right-0 w-[46%]">
                      <div className="absolute inset-0 z-10 bg-gradient-to-r from-blue-50 via-blue-50/20 to-transparent dark:from-blue-950/40" />
                      <img
                        src={bannerInicioJornada}
                        alt="Inicio de operaciones"
                        className="h-full w-full object-cover object-[center_38%]"
                      />
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_20px_55px_-38px_rgba(20,54,110,.55)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                  <div className="space-y-3 p-4 sm:p-5">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <StartInfo icon={Store} label="Sucursal" value={sucursalNombre} detail={store?.Tipo || store?.tipo || "Sucursal"} tone="blue" />
                      <StartInfo icon={Users} label="Responsable de apertura" value={responsableNombre} detail="Usuario del sistema" tone="violet" />
                      <StartInfo icon={Clock3} label="Fecha y hora de inicio" value={fechaInicioTexto} detail={horaInicioTexto} tone="cyan" />
                      <StartInfo icon={Monitor} label="Dispositivo" value={dispositivoNombre} detail="Equipo actual" tone="blue" />
                    </div>

                    <div className="grid gap-3 rounded-xl border border-blue-200/50 bg-blue-50/45 p-3.5 dark:border-blue-400/10 dark:bg-blue-400/[.04] md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_8px_18px_-8px_rgba(16,185,129,.75)]">
                          <Package className="size-5" strokeWidth={1.8} />
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground">Valor actual del inventario</p>
                          <p className="mt-0.5 text-xl font-bold tracking-[-0.025em] text-foreground">{fmt(inventario)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 border-t border-blue-200/50 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0 dark:border-blue-400/10">
                        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold text-foreground">Este será el punto de referencia para el cierre de jornada.</p>
                          <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">El inventario puede variar conforme se registren movimientos durante el día.</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-violet-200/55 bg-gradient-to-r from-violet-50/90 via-violet-50/45 to-blue-50/35 p-3.5 dark:border-violet-400/15 dark:from-violet-500/[.09] dark:via-violet-500/[.045] dark:to-blue-500/[.025]">
                      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
                        <div className="flex gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,.75)]">
                            <WalletCards className="size-5" strokeWidth={1.8} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-foreground">¿También comenzarás a cobrar?</p>
                              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold text-violet-600 dark:text-violet-300">
                                Opcional
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Puedes abrir una caja ahora o hacerlo más tarde desde el módulo Cajas.</p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <StartOption
                            selected={modoInicio === "solo-jornada"}
                            title="Solo iniciar jornada"
                            description="Abre la operación de la sucursal. Podrás abrir una caja más tarde."
                            onClick={() => setModoInicio("solo-jornada")}
                          />
                          <div>
                            <StartOption
                              selected={modoInicio === "jornada-caja"}
                              title="Iniciar jornada y abrir caja"
                              description="Inicia la operación y abre una caja para comenzar a registrar ventas."
                              onClick={() => seleccionarModoInicio("jornada-caja")}
                            />
                            {modoInicio === "jornada-caja" && fondoCaja !== null && (
                              <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 dark:border-emerald-400/15 dark:bg-emerald-400/[.05]">
                                <WalletCards className="size-3.5 shrink-0 text-emerald-600" />
                                <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">Fondo de caja · {cajaNombre}</span>
                                <strong className="text-[11px] text-foreground">{fmt(fondoCaja)}</strong>
                                <button type="button" onClick={() => seleccionarModoInicio("jornada-caja")} className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">
                                  <Pencil className="size-3" /> Cambiar fondo
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                  </section>
                </>
              )}
            </div>
          )}

          {/* ── TURNOS ────────────────────────────────────────────────────── */}
          {activeTab === "cajas" && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.015em] text-foreground">
                    Turnos de caja
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Seguimiento de responsables, horarios y fondos durante la
                    jornada.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                    {turnosActivos.length} abiertos
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    {turnosCerrados} cerrados
                  </span>
                </div>
              </div>

              <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                <div className="flex items-center gap-3 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.065] via-blue-500/[.02] to-transparent px-5 py-4 dark:border-white/10 dark:from-blue-400/[.08]">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Registro de turnos
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {turnos.length}{" "}
                      {turnos.length === 1
                        ? "turno registrado"
                        : "turnos registrados"}
                    </p>
                  </div>
                </div>

                {turnos.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground">
                      <Users className="size-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      Aún no hay turnos registrados
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Los turnos aparecerán aquí cuando una caja inicie
                      operación.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left">
                      <thead className="border-b border-border/60 bg-muted/20 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3">Caja</th>
                          <th className="px-4 py-3">Responsable</th>
                          <th className="px-4 py-3">Inicio</th>
                          <th className="px-4 py-3 text-right">
                            Fondo apertura
                          </th>
                          <th className="px-4 py-3">Cierre</th>
                          <th className="px-5 py-3 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/55">
                        {turnos.map((turno) => {
                          const fechaFin = turno?.FechaFin ?? turno?.fechaFin;
                          const activo =
                            Number(turno?.EstatusID ?? turno?.estatusID) ===
                              1 && !fechaFin;
                          return (
                            <tr
                              key={turno?.ID || turno?.id}
                              className="transition-colors hover:bg-blue-500/[.025]"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={cn(
                                      "size-2 rounded-full",
                                      activo
                                        ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.1)]"
                                        : "bg-slate-300 dark:bg-slate-600",
                                    )}
                                  />
                                  <span className="text-xs font-semibold text-foreground">
                                    {turno?.CajaNombre ||
                                      turno?.cajaNombre ||
                                      "Caja sin nombre"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-foreground">
                                {turno?.ResponsableCaja?.Nombre ||
                                  turno?.responsableCaja?.nombre ||
                                  "—"}
                              </td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">
                                {fmtDate(
                                  turno?.FechaInicio || turno?.fechaInicio,
                                )}
                              </td>
                              <td className="px-4 py-4 text-right text-xs font-semibold text-foreground">
                                {fmt(
                                  turno?.FondoCajaApertura ||
                                    turno?.fondoCajaApertura,
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {fechaFin ? (
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      {fmtDate(fechaFin)}
                                    </p>
                                    <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                                      {fmt(
                                        turno?.FondoCajaCierre ||
                                          turno?.fondoCajaCierre,
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold",
                                    activo
                                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "border-border bg-muted/60 text-muted-foreground",
                                  )}
                                >
                                  {activo ? "Abierto" : "Cerrado"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── FINANCIERO ────────────────────────────────────────────────── */}
          {activeTab === "financiero" && jornadaActiva && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Acumulados financieros de la jornada.
              </p>

              {!opSucursal ? (
                <div className="rounded-2xl border border-white/70 bg-white/65 p-8 text-center shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                  <AlertCircle className="mx-auto size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No hay jornada disponible.
                  </p>
                </div>
              ) : (
                <>
                  <Section
                    title="Ventas e Inventario"
                    icon={Package}
                    iconColor="text-violet-500"
                    contentClassName="p-0"
                  >
                    <div className="grid gap-px bg-border/60 md:grid-cols-2">
                      <FinancialMetric
                        icon={Package}
                        tone="violet"
                        label="Valor inventario inicial"
                        value={fmt(
                          opSucursal?.ValorInicialInventario ||
                            opSucursal?.valorInicialInventario,
                        )}
                      />
                      <FinancialMetric
                        icon={CreditCard}
                        tone="amber"
                        label="Ventas a crédito"
                        value={fmt(
                          opSucursal?.Creditos || opSucursal?.creditos,
                        )}
                      />
                      <FinancialMetric
                        icon={ShoppingCart}
                        tone="blue"
                        label="Valor de las compras"
                        value={fmt(
                          opSucursal?.ValorCompras || opSucursal?.valorCompras,
                        )}
                      />
                      <FinancialMetric
                        icon={ArrowDownLeft}
                        tone="emerald"
                        label="Transferencias entrantes"
                        value={fmt(
                          opSucursal?.TransferenciasEntrantes ||
                            opSucursal?.transferenciasEntrantes,
                        )}
                      />
                      <FinancialMetric
                        icon={BarChart3}
                        tone="blue"
                        label="Valor bruto de las ventas"
                        value={fmt(
                          opSucursal?.ValorBrutoVentas ||
                            opSucursal?.valorBrutoVentas,
                        )}
                      />
                      <FinancialMetric
                        icon={ArrowUpRight}
                        tone="amber"
                        label="Transferencias de salida"
                        value={fmt(
                          opSucursal?.TransferenciasSalientes ||
                            opSucursal?.transferenciasSalientes,
                        )}
                      />
                      <FinancialMetric
                        icon={BadgePercent}
                        tone="amber"
                        label="Descuentos aplicados"
                        value={fmt(
                          opSucursal?.DescuentosAplicados ||
                            opSucursal?.descuentosAplicados,
                        )}
                      />
                      <FinancialMetric
                        icon={PackageX}
                        tone="rose"
                        label="Bajas de mercancía"
                        value={fmt(
                          opSucursal?.BajasMercancia ||
                            opSucursal?.bajasMercancia,
                        )}
                      />
                      <FinancialMetric
                        icon={TrendingUp}
                        tone="emerald"
                        label="Valor real de las ventas"
                        value={fmt(
                          opSucursal?.ValorVentas || opSucursal?.valorVentas,
                        )}
                        highlight
                      />
                      <FinancialMetric
                        icon={SlidersHorizontal}
                        tone="cyan"
                        label="Ajuste de inventario"
                        value={fmt(
                          opSucursal?.AjusteInventario ||
                            opSucursal?.ajusteInventario,
                        )}
                      />
                      <div
                        className="hidden bg-white/75 dark:bg-white/[.025] md:block"
                        aria-hidden="true"
                      />
                      <FinancialMetric
                        icon={DollarSign}
                        tone="blue"
                        label="Valor final inventario"
                        value={fmt(
                          opSucursal?.ValorFinalInventario ||
                            opSucursal?.valorFinalInventario,
                        )}
                        highlight
                      />
                    </div>
                  </Section>

                  <div className="space-y-3">
                    <div
                      className="flex items-center gap-3 px-2"
                      aria-hidden="true"
                    >
                      <span className="h-px flex-1 bg-border/80" />
                      <span className="size-1.5 rounded-full bg-border" />
                      <span className="h-px flex-1 bg-border/80" />
                    </div>
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-white/70 bg-border/60 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 md:grid-cols-2">
                      <FinancialColumn
                        title="Ingresos por forma de pago"
                        icon={DollarSign}
                        iconColor="text-emerald-500"
                      >
                        {ingresosFormaPago.map((item) => (
                          <FinancialMetric
                            key={item.label}
                            icon={item.icon}
                            tone={item.tone}
                            label={item.label}
                            value={fmt(item.value)}
                          />
                        ))}
                        <FinancialMetric
                          icon={DollarSign}
                          tone="emerald"
                          label="Total ingresos"
                          value={fmt(totalIngresos)}
                          highlight
                        />
                      </FinancialColumn>
                      <FinancialColumn
                        title="CFDI por forma de pago"
                        icon={FileText}
                        iconColor="text-amber-500"
                      >
                        {cfdiFormaPago.map((item) => (
                          <FinancialMetric
                            key={item.label}
                            icon={item.icon}
                            tone={item.tone}
                            label={item.label}
                            value={fmt(item.value)}
                          />
                        ))}
                        <FinancialMetric
                          icon={FileText}
                          tone="amber"
                          label="Total facturado"
                          value={fmt(totalCFDI)}
                          highlight
                        />
                      </FinancialColumn>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {(!jornadaActiva || activeTab === "financiero" || activeTab === "jornada") && (
        <footer className="shrink-0 border-t border-white/70 bg-white/78 px-5 py-3.5 shadow-[0_-14px_38px_-32px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-background/85 lg:px-6">
          <div className={cn("mx-auto flex max-w-[1320px] items-center gap-3", !jornadaActiva ? "justify-between" : "justify-end")}>
            {!jornadaActiva && (
              <button type="button" onClick={() => navigate("/")} className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ArrowLeft className="size-3.5" /> Volver
              </button>
            )}
            {!jornadaActiva ? (
              <button
                type="button"
                onClick={handleIniciarJornada}
                disabled={submitting || !sucursalID || (modoInicio === "jornada-caja" && fondoCaja === null)}
                className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(5,150,105,.8)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
                {modoInicio === "jornada-caja" ? "Iniciar operaciones y abrir caja" : "Iniciar operaciones"}
              </button>
            ) : (
            <>
            <button
              onClick={fetchDatos}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
              />{" "}
              Actualizar
            </button>
            {!jornadaActiva && (
              <button
                onClick={handleIniciarJornada}
                disabled={submitting || !sucursalID}
                className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(5,150,105,.8)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}{" "}
                Iniciar jornada
              </button>
            )}
            {jornadaActiva && (
              <button
                onClick={handleCerrarJornada}
                disabled={submitting}
                className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(79,70,229,.7)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="size-4" />
                )}{" "}
                Cerrar jornada
              </button>
            )}
            </>
            )}
          </div>
        </footer>
      )}

      <Dialog open={fondoModalOpen} onOpenChange={setFondoModalOpen}>
        <DialogContent className="w-[min(460px,94vw)] rounded-2xl border-white/80 p-0 shadow-2xl dark:border-white/10">
          <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-5 text-left">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,.75)]">
                <WalletCards className="size-5" strokeWidth={1.8} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-[-0.02em]">Definir fondo de caja</DialogTitle>
                <DialogDescription className="mt-1 text-xs">Indica el efectivo con el que comenzará la caja.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-start gap-2.5 rounded-xl bg-blue-500/[.075] px-3.5 py-3 text-blue-700 dark:text-blue-300">
              <Info className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold">Este monto será registrado como el fondo inicial de la caja.</p>
                <p className="mt-0.5 text-[10px] opacity-75">Puedes modificarlo antes de iniciar las operaciones.</p>
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-foreground">Fondo inicial</span>
              <div className="flex h-11 items-center overflow-hidden rounded-lg border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                <span className="px-3 text-sm font-semibold text-muted-foreground">$</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={fondoCajaInput}
                  onChange={(event) => setFondoCajaInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && aplicarFondoCaja()}
                  placeholder="0.00"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                />
                <span className="px-3 text-[10px] font-semibold text-muted-foreground">MXN</span>
              </div>
              <span className="mt-1.5 block text-[10px] text-muted-foreground">Solo incluye efectivo en moneda nacional.</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4">
            <button type="button" onClick={() => setFondoModalOpen(false)} className="h-10 rounded-lg border border-border bg-background px-4 text-xs font-semibold transition hover:bg-muted">Cancelar</button>
            <button type="button" onClick={aplicarFondoCaja} className="h-10 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">Aplicar fondo</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cierreModalOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setCierreModalOpen(open);
          if (!open) setCierreCompletado(false);
        }}
      >
        <DialogContent className="max-h-[94vh] w-[min(1060px,96vw)] max-w-none overflow-y-auto rounded-3xl border-white/80 p-0 shadow-2xl dark:border-white/10">
          <DialogHeader className="border-b border-border/60 px-7 pb-1 pt-5 text-left">
            <div className="flex items-start gap-4 pr-10">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ClipboardCheck className="size-7" strokeWidth={1.8} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-[-0.03em]">
                  Cierre de jornada
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  Se consolidarán automáticamente los documentos y resúmenes con
                  la información de la jornada actual.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-7 pb-5 pt-[3px]">
            <div className="grid overflow-hidden rounded-xl border border-border/50 bg-muted/25 md:grid-cols-3">
              <CloseSummary
                icon={Building2}
                label="Sucursal"
                value={cierreSnapshot?.sucursal || "Sucursal actual"}
              />
              <CloseSummary
                icon={CalendarDays}
                label="Fecha"
                value={cierreSnapshot?.fecha || "—"}
                bordered
              />
              <CloseSummary
                icon={Clock3}
                label="Turnos"
                value={`${cierreSnapshot?.turnosCerrados ?? turnosCerrados} cerrado${(cierreSnapshot?.turnosCerrados ?? turnosCerrados) === 1 ? "" : "s"} · ${cierreSnapshot?.turnosAbiertos ?? turnosActivos.length} abierto${(cierreSnapshot?.turnosAbiertos ?? turnosActivos.length) === 1 ? "" : "s"}`}
                bordered
              />
            </div>

            <div className="border-t border-border/70 pt-4">
              <h3 className="text-sm font-bold text-foreground">
                Documentos y resúmenes a generar
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {cierreReportes.map((reporte) => (
                  <CloseReportCard
                    key={reporte.title}
                    {...reporte}
                    generating={submitting}
                    completed={cierreCompletado}
                    document={
                      reporte.invoiceKey || reporte.documentKey
                        ? facturasGlobales[
                            reporte.invoiceKey || reporte.documentKey
                          ]
                        : null
                    }
                    onOpenDocument={abrirDocumentoCierre}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-blue-500/[.075] px-4 py-3.5 text-blue-700 dark:text-blue-300">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                i
              </span>
              <div>
                <p className="text-xs font-bold">
                  Este proceso puede tardar unos minutos.
                </p>
                <p className="mt-1 text-[11px] leading-5 opacity-80">
                  Mantén abierta esta ventana hasta recibir la confirmación del
                  cierre.
                </p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 flex justify-end gap-3 border-t border-border/70 bg-background/95 px-7 py-4 shadow-[0_-12px_28px_-22px_rgba(15,23,42,.45)] backdrop-blur-xl">
            {cierreCompletado ? (
              <button
                type="button"
                onClick={() => {
                  setCierreModalOpen(false);
                  setCierreCompletado(false);
                }}
                className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <CheckCircle2 className="size-4" /> Finalizar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCierreModalOpen(false)}
                  disabled={submitting}
                  className="h-11 rounded-xl border border-border bg-background px-6 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={solicitarConfirmacionCierre}
                  disabled={submitting}
                  className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(79,70,229,.75)] transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="relative flex size-3">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
                        <span className="relative inline-flex size-3 rounded-full bg-white" />
                      </span>{" "}
                      Generando reporte…
                    </>
                  ) : (
                    <>
                      <PlayCircle className="size-4" /> Iniciar cierre
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(facturaGlobalVisible)}
        onOpenChange={(open) => !open && cerrarDocumentoCierre()}
      >
        <DialogContent className="h-[92vh] w-[min(1180px,96vw)] max-w-none overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4 text-left">
            <DialogTitle>Documento de cierre</DialogTitle>
            <DialogDescription>
              {facturaGlobalVisible?.pdfFileName || "CFDI global"}
            </DialogDescription>
          </DialogHeader>
          <PdfViewer
            fileUrl={facturaGlobalVisible?.pdfUrl || ""}
            fileName={facturaGlobalVisible?.pdfFileName}
            className="h-[calc(92vh-82px)] rounded-none border-0"
          />
        </DialogContent>
      </Dialog>

      <DialogAlert
        open={alertAction !== null}
        onOpenChange={(open) => !open && setAlertAction(null)}
        title={
          alertAction === "iniciar"
            ? "Iniciar operaciones"
            : alertAction === "cajas-abiertas"
              ? "Hay cajas abiertas"
              : "¿Está seguro?"
        }
        description={
          alertAction === "iniciar"
            ? modoInicio === "jornada-caja"
              ? `¿Confirmas iniciar la jornada y abrir ${cajaNombre} con un fondo de ${fmt(fondoCaja)}?`
              : "¿Confirmas iniciar la jornada de esta sucursal?"
            : alertAction === "cajas-abiertas"
              ? "Debes cerrar todos los turnos de caja antes de cerrar la jornada de la sucursal."
              : "Al iniciar el cierre se consolidarán los acumulados y finalizará la jornada actual. Esta acción no se puede deshacer."
        }
        onConfirm={
          alertAction === "iniciar"
            ? confirmIniciarJornada
            : alertAction === "confirmar-cierre"
              ? confirmCerrarJornada
              : undefined
        }
        onCancel={() => setAlertAction(null)}
        type={alertAction === "iniciar" ? "success" : "warning"}
      />
    </div>
  );
}

function StartInfo({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    blue: "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,.75)]",
    violet: "bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,.75)]",
    cyan: "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-[0_8px_18px_-8px_rgba(8,145,178,.75)]",
  };
  return (
    <div className="flex min-h-[70px] items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tones[tone] || tones.blue)}>
        <Icon className="size-4.5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-foreground" title={value}>{value}</p>
        <p className="mt-0.5 truncate text-[9px] text-muted-foreground" title={detail}>{detail}</p>
      </div>
    </div>
  );
}

function StartOption({ selected, title, description, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition",
        selected
          ? "border-primary/45 bg-primary/[.055] shadow-[0_8px_22px_-18px_rgba(37,99,235,.8)]"
          : "border-border/65 bg-background/65 hover:border-primary/25 hover:bg-muted/35",
      )}
    >
      <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary" : "border-muted-foreground/55")}>
        {selected && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <span>
        <span className="block text-[11px] font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[9px] leading-4 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function CloseSummary({ icon: Icon, label, value, bordered }) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-2.5 px-4 py-2.5",
        bordered && "border-t border-border/45 md:border-l md:border-t-0",
      )}
    >
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.7}
      />
      <div className="min-w-0">
        <p className="text-[9px] font-medium uppercase tracking-[.06em] text-muted-foreground/80">
          {label}
        </p>
        <p
          className="mt-0.5 truncate text-[11px] font-semibold text-foreground/85"
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function CloseReportCard({
  icon: Icon,
  title,
  description,
  value,
  tone,
  generating,
  completed,
  highlighted,
  invoiceKey,
  documentKey,
  document,
  onOpenDocument,
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  };
  const generatedDocument = Boolean(invoiceKey || documentKey);
  const withoutTransactions = generatedDocument && completed && !document;
  const generated = generatedDocument ? Boolean(document) : completed;
  return (
    <div
      className={cn(
        "flex min-h-28 items-center gap-4 rounded-2xl border bg-background/70 p-4 transition",
        highlighted
          ? "border-slate-300/90 bg-slate-50/80 shadow-sm ring-1 ring-inset ring-slate-200/60 dark:border-slate-600/70 dark:bg-white/[.045] dark:ring-white/[.06]"
          : "border-border/70",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          tones[tone] || tones.blue,
        )}
      >
        <Icon className="size-5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-bold text-foreground",
            highlighted && "font-extrabold tracking-[-0.01em]",
          )}
        >
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 border-l border-border/60 pl-4">
        {value != null && value !== "" && (
          <span
            className={cn(
              "text-sm font-bold tabular-nums text-foreground",
              highlighted && "text-base font-extrabold",
            )}
          >
            {value}
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold",
            withoutTransactions
              ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
              : generated
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : generating
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {withoutTransactions ? (
            <span className="size-2 rounded-full bg-slate-400" />
          ) : generated ? (
            <CheckCircle2 className="size-3" />
          ) : generating ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-500/70" />
              <span className="relative inline-flex size-2 rounded-full bg-indigo-600" />
            </span>
          ) : (
            <span className="size-2 rounded-full bg-slate-400" />
          )}
          {withoutTransactions
            ? "Sin transacciones"
            : generated
              ? "Generado"
              : generating
                ? "Generando…"
                : "Pendiente"}
        </span>
      </div>
      {document ? (
        <button
          type="button"
          onClick={() => onOpenDocument(document)}
          className="flex h-10 w-9 shrink-0 items-center justify-center border-l border-border/60 pl-3 text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
          title="Abrir documento"
          aria-label={`Abrir ${title}`}
        >
          <ExternalLink className="size-4" strokeWidth={1.8} />
        </button>
      ) : !generatedDocument ? (
        <span
          className="flex h-10 w-9 shrink-0 items-center justify-center border-l border-border/60 pl-3 text-indigo-600 opacity-40 dark:text-indigo-400"
          title="Abrir reporte (próximamente)"
          aria-label={`Abrir ${title} (próximamente)`}
        >
          <ExternalLink className="size-4" strokeWidth={1.8} />
        </span>
      ) : null}
    </div>
  );
}

function JornadaMetric({ icon: Icon, label, value, tone }) {
  const tones = {
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="flex items-center gap-3 bg-white/75 px-5 py-5 dark:bg-white/[.025]">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tones[tone] || tones.blue,
        )}
      >
        <Icon className="size-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-bold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, contentClassName, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
      <div className="flex items-center gap-2 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.065] via-blue-500/[.025] to-transparent px-5 py-3.5 dark:border-white/10 dark:from-blue-400/[.09] dark:via-blue-400/[.025]">
        <Icon className={cn("size-4", iconColor)} />
        <h2 className="text-[11px] font-semibold uppercase tracking-[.08em] text-foreground">
          {title}
        </h2>
      </div>
      <div className={cn("px-5 py-1", contentClassName)}>{children}</div>
    </div>
  );
}

function FinancialColumn({ title, icon: Icon, iconColor, children }) {
  return (
    <section className="grid content-start gap-px bg-border/60">
      <div className="flex items-center gap-2 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.065] via-blue-500/[.025] to-transparent px-5 py-3.5 dark:border-white/10 dark:from-blue-400/[.09] dark:via-blue-400/[.025]">
        <Icon className={cn("size-4", iconColor)} strokeWidth={1.8} />
        <h2 className="text-[11px] font-semibold uppercase tracking-[.08em] text-foreground">
          {title}
        </h2>
      </div>
      <div className="grid gap-px bg-border/60">{children}</div>
    </section>
  );
}

function FinancialMetric({ icon: Icon, tone, label, value, highlight }) {
  const tones = {
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="flex min-h-[76px] items-center gap-3 bg-white/75 px-4 py-3 dark:bg-white/[.025]">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tones[tone] || tones.blue,
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-[.09em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-base font-semibold tracking-[-0.015em]",
            highlight ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
