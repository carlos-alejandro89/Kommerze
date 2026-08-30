import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  BadgeCheck,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  FileCode2,
  FileText,
  FolderOpen,
  Hash,
  History,
  Loader2,
  Mail,
  PackageOpen,
  Paperclip,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePosService } from "@/features/pos/usePosService";

const money = (value) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number(value || 0),
  );
const SelectField = ({ label, value, onChange, children, icon: Icon }) => (
  <label className="block space-y-2 text-xs font-semibold text-foreground">
    <span>{label}</span>
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
      )}
      <select
        value={value}
        onChange={onChange}
        className={`h-11 w-full appearance-none rounded-xl border border-border/70 bg-background/75 ${Icon ? "pl-10" : "pl-3"} pr-9 text-sm font-normal text-foreground outline-none transition hover:border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
        ⌄
      </span>
    </div>
  </label>
);

const FiscalEntityOption = ({ item, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(item)}
    className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-primary/35 bg-primary/[.06]" : "border-border/65 bg-background/65 hover:border-blue-300 hover:bg-blue-50/55 dark:hover:border-blue-400/20 dark:hover:bg-blue-500/[.07]"}`}
  >
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600">
      {String(item.RazonSocial || "EF").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{item.RazonSocial || "Entidad fiscal sin nombre"}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="font-semibold text-foreground/75">RFC: {item.RFC || "—"}</span>
        <span>C.P. {item.CodigoPostal || "—"}</span>
        {item.RegimenClave && <span>{item.RegimenClave} · {item.Regimen}</span>}
      </span>
    </span>
    <span className={`rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 transition dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
      {selected ? "Seleccionada" : "Seleccionar"}
    </span>
  </button>
);

function FacturacionSuccess({ result, sale, entity, navigate, service, historicalView = false }) {
  const uuid = result?.uuid || result?.data?.uuid || "";
  const xmlPath = result?.data?.archivoXML || "";
  const invoicePath = result?.data?.archivoPDF || xmlPath;
  const pdfFileName = result?.pdfFileName || "Factura.pdf";
  const xmlFileName = xmlPath.split(/[\\/]/).pop() || "Factura.xml";
  const pdfURL = useMemo(() => {
    if (!result?.pdfBase64) return "";
    const bytes = Uint8Array.from(atob(result.pdfBase64), (char) =>
      char.charCodeAt(0),
    );
    return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  }, [result?.pdfBase64]);
  const fiscalEmail = String(
    result?.data?.correoReceptor || entity?.Correo || "",
  )
    .trim()
    .toLowerCase();
  const [emailOpen, setEmailOpen] = useState(false);
  const [extraEmails, setExtraEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  useEffect(
    () => () => {
      if (pdfURL) URL.revokeObjectURL(pdfURL);
    },
    [pdfURL],
  );
  const copy = async (value, message) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };
  const openInvoiceLocation = async () => {
    if (!invoicePath) return;
    try {
      await service.abrirUbicacionFactura(invoicePath);
    } catch (error) {
      toast.error(String(error));
    }
  };
  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const addEmail = () => {
    const value = newEmail.trim().toLowerCase();
    if (!validEmail(value)) {
      toast.error("Ingresa un correo electrónico válido");
      return false;
    }
    if (value === fiscalEmail || extraEmails.includes(value)) {
      toast.info("El destinatario ya fue agregado");
      setNewEmail("");
      return true;
    }
    setExtraEmails((current) => [...current, value]);
    setNewEmail("");
    return true;
  };
  const sendEmail = async () => {
    let recipients = [fiscalEmail, ...extraEmails].filter(Boolean);
    const pending = newEmail.trim().toLowerCase();
    if (pending) {
      if (!validEmail(pending)) {
        toast.error("Ingresa un correo electrónico válido");
        return;
      }
      if (!recipients.includes(pending)) recipients = [...recipients, pending];
    }
    if (!recipients.length) {
      toast.error("Agrega al menos un destinatario");
      return;
    }
    setEmailSending(true);
    try {
      await service.enviarFacturaCorreo({
        pedidoGuid: sale.PedidoGuid,
        destinatarios: recipients,
      });
      setNewEmail("");
      setExtraEmails(recipients.filter((email) => email !== fiscalEmail));
      setEmailOpen(false);
      toast.success("Factura enviada por correo con el PDF y XML adjuntos");
    } catch (error) {
      toast.error(String(error));
    } finally {
      setEmailSending(false);
    }
  };
  return (
    <div className="min-h-[calc(100vh-56px)] bg-bg-subtle pb-10">
      <header className="relative overflow-hidden bg-gradient-to-r from-[#001b4d] via-[#003b8f] to-[#0869e8] px-6 py-9 text-white shadow-[0_20px_60px_-38px_rgba(0,35,102,.85)]">
        <div className="absolute -right-16 -top-28 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative mx-auto flex max-w-[1450px] flex-col items-center text-center">
          <div className="mb-3 grid size-14 place-items-center rounded-full border border-white/25 bg-white/15 shadow-inner">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {historicalView ? "Factura timbrada" : "¡Factura timbrada con éxito!"}
          </h1>
          <button
            type="button"
            onClick={() => copy(uuid, "Folio fiscal copiado")}
            className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-black/10 px-4 py-1.5 text-xs text-blue-50 transition hover:bg-black/20"
          >
            <span className="truncate">Folio fiscal: {uuid}</span>
            <ClipboardCopy className="size-3.5 shrink-0" />
          </button>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1450px] gap-6 px-6 py-7 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_16px_45px_-35px_rgba(20,54,110,.55)] backdrop-blur dark:border-white/10 dark:bg-white/[.05]">
            <h2 className="mb-4 text-sm font-bold">Acciones disponibles</h2>
            <div className="space-y-2.5">
              <Button
                className="h-11 w-full justify-start rounded-xl bg-primary text-white"
                onClick={() => setEmailOpen(true)}
              >
                <Mail className="size-4" />
                Enviar por correo
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full justify-start rounded-xl"
                onClick={openInvoiceLocation}
                disabled={!invoicePath}
              >
                <FolderOpen className="size-4" />
                Abrir ubicación de archivos
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full justify-start rounded-xl"
                onClick={() => copy(uuid, "Folio fiscal copiado")}
              >
                <ClipboardCopy className="size-4" />
                Copiar folio fiscal
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full justify-start rounded-xl"
                onClick={() => navigate("/history")}
              >
                <History className="size-4" />
                Volver al historial
              </Button>
              {historicalView && (
                <Button
                  variant="outline"
                  className="h-11 w-full justify-start rounded-xl border-red-500/25 text-red-600 hover:bg-red-500/[.06] hover:text-red-700 dark:text-red-400"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban className="size-4" />
                  Cancelar CFDI
                </Button>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[.055] p-5">
            <div className="flex gap-3">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  CFDI registrado
                </h3>
                <p className="mt-1 text-xs leading-5 text-emerald-800/75 dark:text-emerald-300/70">
                  El XML timbrado fue decodificado, almacenado y vinculado con
                  la venta local.
                </p>
              </div>
            </div>
          </section>
        </aside>
        <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-[0_24px_70px_-45px_rgba(20,54,110,.58)] backdrop-blur dark:border-white/10 dark:bg-white/[.045]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-primary/[.035] px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Eye className="size-4 text-primary" />
              Vista previa del CFDI
            </div>
            <span className="rounded-lg border bg-white/70 px-3 py-1 text-xs font-semibold text-muted-foreground dark:bg-white/5">
              {result?.pdfFileName ||
                `${sale.Serie}-${String(sale.Folio).padStart(6, "0")}.pdf`}
            </span>
          </div>
          {pdfURL ? (
            <iframe
              title="Vista previa del CFDI"
              src={`${pdfURL}#toolbar=1&navpanes=0&view=FitH`}
              className="h-[900px] w-full bg-[#e9edf3]"
            />
          ) : (
            <div className="grid h-[600px] place-items-center text-sm text-muted-foreground">
              No se pudo preparar la vista previa del PDF.
            </div>
          )}
        </section>
      </main>
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0">
          <DialogHeader className="border-b px-6 pb-5 pt-6">
            <div className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <DialogTitle>Enviar factura por correo</DialogTitle>
            <DialogDescription>
              Se adjuntarán el PDF y el XML timbrado. Puedes agregar más
              destinatarios antes de enviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-1">
            {fiscalEmail ? (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Correo fiscal registrado
                </p>
                <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/[.04] px-4 py-3 text-sm">
                  <span className="truncate font-medium">{fiscalEmail}</span>
                  <BadgeCheck className="size-4 shrink-0 text-primary" />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-800">
                La entidad fiscal no tiene un correo registrado. Agrega un
                destinatario para continuar.
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Destinatarios adicionales
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addEmail();
                    }
                  }}
                  placeholder="correo@empresa.com"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="size-11 rounded-xl p-0"
                  onClick={addEmail}
                >
                  <Plus className="size-4" />
                  <span className="sr-only">Agregar destinatario</span>
                </Button>
              </div>
              {extraEmails.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {extraEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setExtraEmails((current) =>
                            current.filter((item) => item !== email),
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-border/50 bg-background/35">
              <div className="flex items-center justify-between border-b border-border/45 px-4 py-2">
                <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[.04em] text-muted-foreground">
                  <Paperclip className="size-3.5 text-primary/65" />
                  Archivos adjuntos
                </div>
                <span className="rounded-full border border-primary/10 bg-primary/[.045] px-2 py-0.5 text-[9px] font-semibold text-primary">
                  2 archivos
                </span>
              </div>
              <div className="divide-y divide-border/40">
                <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/20">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-red-500/10 bg-red-500/[.055] text-red-500">
                    <FileText className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-medium text-foreground"
                      title={pdfFileName}
                    >
                      {pdfFileName}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/75">
                      Representación impresa del CFDI
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-[9px] font-semibold text-red-500/75">
                    PDF
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/20">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-blue-500/10 bg-blue-500/[.055] text-blue-600 dark:text-blue-400">
                    <FileCode2 className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-medium text-foreground"
                      title={xmlFileName}
                    >
                      {xmlFileName}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/75">
                      Comprobante fiscal timbrado
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-[9px] font-semibold text-blue-600/75 dark:text-blue-400">
                    XML
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t px-6 pb-6">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEmailOpen(false)}
              disabled={emailSending}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl"
              onClick={sendEmail}
              disabled={
                emailSending ||
                (!fiscalEmail && !extraEmails.length && !newEmail.trim())
              }
            >
              <Send className="size-4" />
              {emailSending ? "Enviando…" : "Enviar factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mb-3 grid size-11 place-items-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Cancelar CFDI</DialogTitle>
            <DialogDescription>
              La cancelación fiscal requiere seleccionar un motivo SAT y, cuando corresponda, indicar el UUID que sustituye al comprobante.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[.055] p-3 text-xs leading-5 text-amber-800 dark:text-amber-300">
            El acceso quedó preparado. Para ejecutar la cancelación necesitamos definir el endpoint y el formato solicitado por el servicio de facturación.
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCancelOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FacturacionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const service = usePosService();
  const pedidoGuid =
    location.state?.pedidoGuid || localStorage.getItem("pedidoGuid") || "";
  const historicalView = location.state?.mode === "view";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [entityQuery, setEntityQuery] = useState("");
  const [entityResults, setEntityResults] = useState([]);
  const [searchingEntities, setSearchingEntities] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [form, setForm] = useState({
    entidadFiscalID: "",
    usoCFDIID: "",
    formaPagoID: "",
    metodoPagoID: "",
  });
  useEffect(() => {
    if (!pedidoGuid) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const result = await service.prepararFacturacion(pedidoGuid);
        setData(result);
        setSelectedEntity(result.Entidades?.[0] || null);
        setForm({
          entidadFiscalID: String(result.Entidades?.[0]?.ID || ""),
          usoCFDIID: String(
            (result.UsosCFDI || []).find((x) => x.Clave === "G03")?.ID ||
              result.UsosCFDI?.[0]?.ID ||
              "",
          ),
          formaPagoID: String(
            result.FormaPagoPredominanteID || result.FormasPago?.[0]?.ID || "",
          ),
          metodoPagoID: String(
            result.MetodoPagoSugeridoID || result.MetodosPago?.[0]?.ID || "",
          ),
        });
        if (historicalView) {
          const invoice = await service.obtenerFacturaPDF(pedidoGuid);
          setDone(invoice);
          if (invoice?.data?.regenerado) toast.success("El PDF fiscal fue regenerado correctamente");
        }
      } catch (e) {
        toast.error(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pedidoGuid, historicalView]);
  useEffect(() => {
    if (!entityDialogOpen) return undefined;
    let active = true;
    setSearchingEntities(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await service.buscarEntidadesFacturacion(entityQuery.trim());
        if (active) setEntityResults(results || []);
      } catch (error) {
        if (active) setEntityResults([]);
        console.error("No se pudieron consultar las entidades fiscales:", error);
      } finally {
        if (active) setSearchingEntities(false);
      }
    }, entityQuery.trim() ? 280 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [entityDialogOpen, entityQuery]);
  const selectBillingEntity = (selectedEntity) => {
    setSelectedEntity(selectedEntity);
    setForm((current) => ({ ...current, entidadFiscalID: String(selectedEntity.ID) }));
    setEntityDialogOpen(false);
    setEntityQuery("");
  };
  const entity = selectedEntity;
  const additionalEntities = useMemo(() => {
    const linkedIDs = new Set((data?.Entidades || []).map((item) => String(item.ID)));
    return entityResults.filter((item) => !linkedIDs.has(String(item.ID)));
  }, [data?.Entidades, entityResults]);
  const submit = async () => {
    if (Object.values(form).some((x) => !x)) {
      toast.error("Completa todos los datos fiscales");
      return;
    }
    setSending(true);
    try {
      const result = await service.emitirFacturacion({
        pedidoGuid,
        entidadFiscalID: Number(form.entidadFiscalID),
        usoCFDIID: Number(form.usoCFDIID),
        formaPagoID: Number(form.formaPagoID),
        metodoPagoID: Number(form.metodoPagoID),
      });
      setDone(result);
      toast.success("CFDI emitido correctamente");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSending(false);
    }
  };
  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
        Preparando información fiscal…
      </div>
    );
  if (!pedidoGuid || !data)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <p className="font-semibold">No se encontró la venta a facturar.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/history")}
          >
            Ir al historial
          </Button>
        </div>
      </div>
    );
  if (done)
    return (
      <FacturacionSuccess
        result={done}
        sale={data}
        entity={entity}
        navigate={navigate}
        service={service}
        historicalView={historicalView}
      />
    );
  return (
    <div className="min-h-[calc(100vh-56px)] bg-bg-subtle px-5 py-5 pb-28 lg:px-7">
      <div className="mx-auto max-w-[1600px]">
        <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <button
            onClick={() => navigate("/home")}
            className="hover:text-primary"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => navigate("/history")}
            className="hover:text-primary"
          >
            Ventas
          </button>
          <span>/</span>
          <span className="text-foreground">Facturación</span>
        </nav>

        <header className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ReceiptText className="size-6" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[-.025em]">
                Facturar venta
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Revisa la operación y completa los datos fiscales del receptor.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-xl bg-background/70 px-4 text-xs"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="size-4" />
            Regresar
          </Button>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(390px,.65fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/75 bg-white/70 shadow-[0_18px_48px_-38px_rgba(20,54,110,.55)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center justify-between border-b border-border/65 px-6 py-5">
              <div>
                <h2 className="text-sm font-bold">
                  Productos de la venta ({data.Conceptos?.length || 0})
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conceptos que formarán parte del comprobante fiscal.
                </p>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/[.04] px-4 py-2 text-right">
                <p className="text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  Folio de venta
                </p>
                <p className="mt-0.5 text-sm font-bold text-primary">
                  {data.Serie}-{String(data.Folio).padStart(6, "0")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_90px_130px_135px] gap-4 border-b border-border/60 bg-muted/25 px-6 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
              <span>Producto</span>
              <span className="text-center">Cantidad</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Importe</span>
            </div>
            <div className="divide-y divide-border/60">
              {data.Conceptos?.map((item, i) => (
                <div
                  key={`${item.Codigo}-${i}`}
                  className="grid grid-cols-[minmax(0,1fr)_90px_130px_135px] items-center gap-4 px-6 py-4 transition hover:bg-primary/[.025]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[.045] text-primary">
                      <PackageOpen className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        {item.Descripcion}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {item.Codigo} · {item.Unidad}
                      </p>
                    </div>
                  </div>
                  <span className="text-center text-xs font-semibold tabular-nums">
                    {item.Cantidad}
                  </span>
                  <span className="text-right text-xs text-muted-foreground tabular-nums">
                    {money(item.PrecioConIVA)}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums">
                    {money(item.Total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid gap-5 border-t border-border/65 bg-muted/[.12] p-6 lg:grid-cols-[minmax(0,1fr)_410px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Receptor
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold">
                    {data.Cliente || "Público general"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Fecha de venta
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {new Date(data.Fecha).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#062d71] to-[#001b4d] p-5 text-white shadow-[0_18px_34px_-20px_rgba(0,35,102,.85)]">
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-blue-100/75">Subtotal sin IVA</span>
                  <span className="text-right tabular-nums">
                    {money(data.Subtotal)}
                  </span>
                  {data.Descuentos > 0 && (
                    <>
                      <span className="text-blue-100/75">Descuento</span>
                      <span className="text-right tabular-nums">
                        -{money(data.Descuentos)}
                      </span>
                    </>
                  )}
                  <span className="text-blue-100/75">IVA</span>
                  <span className="text-right tabular-nums">
                    {money(data.Impuestos)}
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-white/15 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-100/65">
                      Total a facturar
                    </p>
                    <p className="mt-1 text-[10px] text-blue-100/60">
                      Moneda nacional · MXN
                    </p>
                  </div>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {money(data.Total)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="h-fit overflow-hidden rounded-2xl border border-white/75 bg-white/70 shadow-[0_18px_48px_-38px_rgba(20,54,110,.55)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-3 border-b border-border/65 px-6 py-5">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Datos fiscales del CFDI</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Receptor, uso y condiciones de pago.
                </p>
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Entidad fiscal receptora</p>
                <button
                  type="button"
                  onClick={() => setEntityDialogOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-4 text-left transition hover:border-primary/35 hover:bg-primary/[.06]"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {String(entity?.RazonSocial || "EF")
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">
                      {entity?.RazonSocial || "Seleccionar entidad fiscal"}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {entity ? `RFC: ${entity.RFC} · C.P. ${entity.CodigoPostal}` : "Busca por razón social, RFC o código postal"}
                    </span>
                  </span>
                  <Search className="size-4 shrink-0 text-primary" />
                </button>
              </div>
              {!entity && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/[.07] p-4 text-xs leading-5 text-amber-800 dark:text-amber-300">
                  Selecciona una entidad fiscal receptora para continuar con la factura.
                </div>
              )}
              <div className="h-px bg-border/65" />
              <SelectField
                icon={FileText}
                label="Uso del CFDI"
                value={form.usoCFDIID}
                onChange={(e) =>
                  setForm({ ...form, usoCFDIID: e.target.value })
                }
              >
                <option value="">Selecciona…</option>
                {data.UsosCFDI?.map((x) => (
                  <option key={x.ID} value={x.ID}>
                    {x.Clave} · {x.Descripcion}
                  </option>
                ))}
              </SelectField>
              <SelectField
                icon={WalletCards}
                label="Forma de pago"
                value={form.formaPagoID}
                onChange={(e) =>
                  setForm({ ...form, formaPagoID: e.target.value })
                }
              >
                <option value="">Selecciona…</option>
                {data.FormasPago?.map((x) => (
                  <option key={x.ID} value={x.ID}>
                    {x.Clave} · {x.Descripcion}
                  </option>
                ))}
              </SelectField>
              <SelectField
                icon={CalendarDays}
                label="Método de pago"
                value={form.metodoPagoID}
                onChange={(e) =>
                  setForm({ ...form, metodoPagoID: e.target.value })
                }
              >
                <option value="">Selecciona…</option>
                {data.MetodosPago?.map((x) => (
                  <option key={x.ID} value={x.ID}>
                    {x.Clave} · {x.Descripcion}
                  </option>
                ))}
              </SelectField>
              <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[.045] p-3">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-[10px] leading-4 text-muted-foreground">
                  Verifica que el RFC, régimen fiscal, domicilio y uso del CFDI
                  correspondan a la constancia fiscal del receptor.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
        <DialogContent className="flex max-h-[82vh] w-[min(720px,94vw)] max-w-none flex-col overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-border/70 px-6 py-5 text-left">
            <DialogTitle>Seleccionar entidad fiscal</DialogTitle>
            <DialogDescription>
              Elige una entidad vinculada al cliente de la venta o busca cualquier otra entidad receptora registrada.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pt-4">
            <div className="flex h-11 items-center rounded-2xl border border-[#dce7f6] bg-white/90 px-4 shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065]">
              <Search className="mr-3 size-4 text-[#6481ad]" />
              <input
                autoFocus
                value={entityQuery}
                onChange={(event) => setEntityQuery(event.target.value)}
                placeholder="Razón social, RFC, régimen o código postal…"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#7790b6]"
              />
              {searchingEntities && <Loader2 className="size-4 animate-spin text-blue-600" />}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {searchingEntities && !entityResults.length ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-muted/70" />
                ))}
              </div>
            ) : (data.Entidades?.length || additionalEntities.length) ? (
              <div className="space-y-5">
                {data.Entidades?.length > 0 && (
                  <section>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Ligadas al cliente de la venta</p>
                    <div className="space-y-2">
                      {data.Entidades.map((item) => <FiscalEntityOption key={item.Guid || item.ID} item={item} selected={String(item.ID) === form.entidadFiscalID} onSelect={selectBillingEntity} />)}
                    </div>
                  </section>
                )}
                {additionalEntities.length > 0 && (
                  <section>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Otras entidades fiscales receptoras</p>
                    <div className="space-y-2">
                      {additionalEntities.map((item) => <FiscalEntityOption key={item.Guid || item.ID} item={item} selected={String(item.ID) === form.entidadFiscalID} onSelect={selectBillingEntity} />)}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Search className="size-9 text-muted-foreground/35" />
                <p className="mt-3 text-sm font-semibold">Sin entidades fiscales encontradas</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">Prueba con otro dato o registra primero la entidad fiscal desde Clientes.</p>
              </div>
            )}
          </div>
          <div className="border-t border-border/70 bg-muted/20 px-6 py-3 text-[10px] text-muted-foreground">
            {searchingEntities ? "Consultando entidades fiscales…" : `${(data.Entidades?.length || 0) + additionalEntities.length} entidad${(data.Entidades?.length || 0) + additionalEntities.length === 1 ? "" : "es"} disponible${(data.Entidades?.length || 0) + additionalEntities.length === 1 ? "" : "s"}`}
          </div>
        </DialogContent>
      </Dialog>
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/70 bg-background/90 px-6 py-3.5 shadow-[0_-14px_35px_-30px_rgba(20,54,110,.65)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Hash className="size-3.5" />
            Venta {data.Serie}-{String(data.Folio).padStart(6, "0")}
          </div>
          <div className="ml-auto flex gap-3">
            <Button
              variant="outline"
              className="h-10 rounded-xl px-5 text-xs"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-xl px-7 text-xs shadow-[0_10px_24px_-14px_rgba(0,87,214,.75)]"
              disabled={sending || !entity}
              onClick={submit}
            >
              <FileText className="size-4" />
              {sending ? "Emitiendo CFDI…" : "Emitir CFDI"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
