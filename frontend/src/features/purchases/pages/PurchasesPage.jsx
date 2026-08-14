import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, Building2, CheckCircle2, ChevronDown, CircleStop, Copy, FileText,
  Loader2, Mail, PackageSearch, Phone, ScanBarcode, Search, ShoppingCart,
  Trash2, UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { QuantityControl } from '@/components/common/quantity-control';
import { usePosService } from '@/features/pos/usePosService';
import { useActivation } from '@/providers/ActivationProvider';

const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const CFDI_TYPES = { I: 'Ingreso', E: 'Egreso', P: 'Pago', N: 'Nómina', T: 'Traslado' };
const CFDI_PAYMENT_METHODS = { PPD: 'Pago en parcialidades o diferido', PUE: 'Pago en una sola exhibición' };
const CFDI_CURRENCIES = { MXN: 'Peso Mexicano', USD: 'Dólar estadounidense', EUR: 'Euro' };

function formatCFDIDate(value, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX', includeTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function attr(node, name) {
  return node?.getAttribute(name) ?? node?.getAttribute(name.toLowerCase()) ?? '';
}

// Algunos emisores expresan en Cantidad el contenido del empaque (por ejemplo,
// 19 litros) y en Unidad la cantidad comercial real (por ejemplo, "1 PZA").
// Las excepciones se mantienen por RFC para no alterar el comportamiento CFDI
// estándar y facilitar la incorporación de nuevos proveedores especiales.
const CFDI_PROVIDER_RULES = {
  SLM8504013R0: { quantitySource: 'unidad' },
};

function numberFromXML(value, fallback = 0) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

function quantityFromUnit(value) {
  const match = String(value || '').trim().match(/^([0-9]+(?:[.,][0-9]+)?)(?:\s|$)/);
  return match ? numberFromXML(match[1], 0) : 0;
}

function parseConcept(concepto, index, providerRule) {
  const standardQuantity = numberFromXML(attr(concepto, 'Cantidad'), 1);
  const unitValue = attr(concepto, 'Unidad');
  const specialQuantity = providerRule?.quantitySource === 'unidad' ? quantityFromUnit(unitValue) : 0;
  const quantity = specialQuantity > 0 ? specialQuantity : standardQuantity;
  const importe = numberFromXML(attr(concepto, 'Importe'));
  const standardCost = numberFromXML(attr(concepto, 'ValorUnitario'));

  return {
    xmlKey: `${attr(concepto, 'NoIdentificacion') || 'concepto'}-${index}`,
    codigo: attr(concepto, 'NoIdentificacion'),
    descripcion: attr(concepto, 'Descripcion'),
    unidad: unitValue || attr(concepto, 'ClaveUnidad'),
    quantity,
    cost: specialQuantity > 0 && importe > 0 ? importe / quantity : standardCost,
    discountAmount: numberFromXML(attr(concepto, 'Descuento')),
    quantitySource: specialQuantity > 0 ? 'unidad' : 'cantidad',
    originalQuantity: standardQuantity,
  };
}

function parseCFDI(text, fileName) {
  const documentXML = new DOMParser().parseFromString(text, 'application/xml');
  if (documentXML.querySelector('parsererror')) throw new Error('El archivo no contiene un XML válido');
  const comprobante = documentXML.documentElement;
  const emisor = documentXML.getElementsByTagNameNS('*', 'Emisor')[0];
  const timbre = documentXML.getElementsByTagNameNS('*', 'TimbreFiscalDigital')[0];
  const conceptos = [...documentXML.getElementsByTagNameNS('*', 'Concepto')];
  if (!emisor || conceptos.length === 0) throw new Error('El archivo no parece ser un CFDI con conceptos');
  const supplierRFC = attr(emisor, 'Rfc').toUpperCase();
  const providerRule = CFDI_PROVIDER_RULES[supplierRFC];
  return {
    fileName,
    version: attr(comprobante, 'Version'),
    uuid: attr(timbre, 'UUID'),
    invoiceNumber: [attr(comprobante, 'Serie'), attr(comprobante, 'Folio')].filter(Boolean).join('-'),
    fecha: attr(comprobante, 'Fecha'),
    certificationDate: attr(timbre, 'FechaTimbrado'),
    currency: attr(comprobante, 'Moneda'),
    documentType: attr(comprobante, 'TipoDeComprobante'),
    paymentMethod: attr(comprobante, 'MetodoPago'),
    subtotal: Number(attr(comprobante, 'SubTotal') || 0),
    descuento: Number(attr(comprobante, 'Descuento') || 0),
    total: Number(attr(comprobante, 'Total') || 0),
    supplier: { RFC: supplierRFC, RazonSocial: attr(emisor, 'Nombre') },
    concepts: conceptos.map((concepto, index) => parseConcept(concepto, index, providerRule)),
    appliedRule: providerRule ? { rfc: supplierRFC, quantitySource: providerRule.quantitySource } : null,
  };
}

export function PurchasesPage() {
  const navigate = useNavigate();
  const posService = usePosService();
  const { store } = useActivation();
  const [items, setItems] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [supplierRFC, setSupplierRFC] = useState('');
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [searchingSupplier, setSearchingSupplier] = useState(false);
  const [xmlInfo, setXmlInfo] = useState(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [loadingXML, setLoadingXML] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showXMLUploader, setShowXMLUploader] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [listRevision, setListRevision] = useState(0);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try { setSuggestions(await posService.buscarProductos(query.trim().toUpperCase()) || []); }
      catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setActiveSuggestion(suggestions.length ? 0 : -1);
  }, [suggestions]);

  useEffect(() => {
    if (activeSuggestion < 0) return;
    suggestionsRef.current
      ?.querySelector(`[data-suggestion-index="${activeSuggestion}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeSuggestion]);

  const addProduct = useCallback(product => {
    setItems(current => {
      const id = product.Guid;
      const existing = current.find(item => item.id === id);
      if (existing) return current.map(item => item.id === id ? { ...item, quantity: Number(item.quantity) + 1 } : item);
      return [...current, {
        id, sku: product.Codigo, name: product.Descripcion, unit: product.Empaque || 'Pieza',
        quantity: 1, cost: Number(product.PrecioCompra || 0), matched: true,
      }];
    });
    setQuery(''); setSuggestions([]); setActiveSuggestion(-1); inputRef.current?.focus();
    toast.success('Artículo agregado a la compra');
  }, []);

  const handleProductSearchKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setQuery('');
      setSuggestions([]);
      setActiveSuggestion(-1);
      return;
    }
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestion(current => current < suggestions.length - 1 ? current + 1 : 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion(current => current > 0 ? current - 1 : suggestions.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      addProduct(suggestions[activeSuggestion >= 0 ? activeSuggestion : 0]);
    }
  };

  const updateItem = (id, changes) => setItems(current => current.map(item => item.id === id ? { ...item, ...changes } : item));
  const removeItem = id => setItems(current => current.filter(item => item.id !== id));

  const lookupSupplier = async () => {
    const rfc = supplierRFC.trim().toUpperCase();
    if (![12, 13].includes(rfc.length)) { toast.error('Ingresa un RFC válido de 12 o 13 caracteres'); return; }
    setSearchingSupplier(true);
    try {
      const result = await posService.buscarProveedorPorRFC(rfc);
      if (!result) { setSupplier(null); toast.error('No se encontró una entidad fiscal con ese RFC'); return; }
      setSupplier(result);
      toast.success(result.EsProveedor ? 'Proveedor seleccionado' : 'Entidad fiscal encontrada; falta asignar el rol de proveedor');
    } catch (error) {
      setSupplier(null); toast.error(error?.message || 'No fue posible consultar el proveedor');
    } finally { setSearchingSupplier(false); }
  };

  const resolveConcept = async concept => {
    if (!concept.codigo) return { ...concept, id: `xml-${concept.xmlKey}`, sku: '', name: concept.descripcion, unit: concept.unidad, matched: false };
    try {
      const products = await posService.buscarProductos(concept.codigo.toUpperCase()) || [];
      const product = products.find(item => String(item.Codigo || '').toUpperCase() === concept.codigo.toUpperCase()) || products[0];
      if (!product) throw new Error('Sin coincidencia');
      return { ...concept, id: product.Guid, sku: product.Codigo, name: product.Descripcion, unit: product.Empaque || concept.unidad, matched: true };
    } catch {
      return { ...concept, id: `xml-${concept.xmlKey}`, sku: concept.codigo, name: concept.descripcion, unit: concept.unidad, matched: false };
    }
  };

  const processXML = async file => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xml')) { toast.error('Selecciona un archivo XML'); return; }
    setLoadingXML(true);
    try {
      const text = await file.text();
      const parsed = parseCFDI(text, file.name);
      const [resolvedItems, foundSupplier] = await Promise.all([
        Promise.all(parsed.concepts.map(resolveConcept)),
        parsed.supplier.RFC ? posService.buscarProveedorPorRFC(parsed.supplier.RFC).catch(() => null) : null,
      ]);
      setItems(resolvedItems);
      setSupplier(foundSupplier || parsed.supplier);
      setSupplierRFC(parsed.supplier.RFC);
      setXmlInfo({ fileName: parsed.fileName, uuid: parsed.uuid, invoiceNumber: parsed.invoiceNumber, fecha: parsed.fecha, certificationDate: parsed.certificationDate, currency: parsed.currency, documentType: parsed.documentType, paymentMethod: parsed.paymentMethod, subtotal: parsed.subtotal, descuento: parsed.descuento, total: parsed.total, appliedRule: parsed.appliedRule });
      setShowXMLUploader(false);
      const pending = resolvedItems.filter(item => !item.matched).length;
      const ruleMessage = parsed.appliedRule ? ' Se aplicó la regla especial de cantidad del proveedor.' : '';
      toast.success((pending ? `XML cargado; ${pending} artículo(s) requieren vinculación.` : 'XML y artículos cargados correctamente.') + ruleMessage);
    } catch (error) {
      toast.error(error?.message || 'No fue posible leer el XML');
    } finally {
      setLoadingXML(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const subtotal = items.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0);
  const discount = items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
  const tax = xmlInfo ? Math.max(0, Number(xmlInfo.total || 0) - Number(xmlInfo.subtotal || 0) + Number(xmlInfo.descuento || 0)) : 0;
  const total = subtotal - discount + tax;
  const unmatched = items.filter(item => !item.matched).length;
  const isXMLMode = Boolean(xmlInfo);
  const isSupplierUnlinked = Boolean(supplier && !(supplier?.Guid || supplier?.guid));
  const supplierInitial = String(supplier?.RazonSocial || 'P').trim().charAt(0).toUpperCase() || 'P';

  const clearDraft = () => {
    setItems([]);
    setSupplier(null);
    setSupplierRFC('');
    setManualInvoiceNumber('');
    setXmlInfo(null);
    setQuery('');
    setSuggestions([]);
    setActiveSuggestion(-1);
    setSummaryExpanded(false);
    setShowXMLUploader(true);
    setListRevision(revision => revision + 1);
    if (fileRef.current) fileRef.current.value = '';
  };

  const savePurchase = async () => {
    const sucursalID = Number(store?.ID ?? store?.id ?? 0);
    const proveedorGuid = supplier?.Guid || supplier?.guid || '';
    if (!sucursalID) { toast.error('No se pudo identificar la sucursal'); return; }
    if (!proveedorGuid) { toast.error('Selecciona un proveedor registrado antes de continuar'); return; }
    if (!items.length || unmatched > 0) { toast.error('Todos los artículos deben estar vinculados al catálogo'); return; }
    if (!isXMLMode && !manualInvoiceNumber.trim()) { toast.error('Ingresa el folio de la factura'); return; }

    setSaving(true);
    try {
      const response = await posService.crearCompra({
        sucursalID,
        proveedorGuid,
        origenCaptura: isXMLMode ? 'XML' : 'MANUAL',
        uuidFiscal: xmlInfo?.uuid || '',
        folioFactura: isXMLMode ? (xmlInfo?.invoiceNumber || '') : manualInvoiceNumber.trim(),
        fechaFactura: xmlInfo?.fecha || '',
        fechaTimbrado: xmlInfo?.certificationDate || '',
        moneda: xmlInfo?.currency || 'MXN',
        tipoComprobante: xmlInfo?.documentType || '',
        metodoPago: xmlInfo?.paymentMethod || '',
        subtotal,
        descuento: discount,
        impuestos: tax,
        total,
        productos: items.map(item => ({
          nivelGuid: item.id,
          cantidad: Number(item.quantity || 0),
          costo: Number(item.cost || 0),
        })),
      });
      if (!response?.success) throw new Error(response?.message || 'No se pudo registrar la compra');
      const folio = response?.data?.folio;
      toast.success(folio ? `Compra #${folio} registrada correctamente` : 'Compra registrada correctamente');
      localStorage.setItem('purchaseCompletion', JSON.stringify({
        pedidoGuid: response?.data?.pedidoGuid,
        compraGuid: response?.data?.compraGuid,
        folio,
        supplier: { razonSocial: supplier?.RazonSocial, rfc: supplier?.RFC },
        itemCount: items.length,
        unitCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        totalCompra: total,
        totalVenta: items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.salePrice || 0), 0),
        origenCaptura: isXMLMode ? 'XML' : 'MANUAL',
        folioFactura: isXMLMode ? (xmlInfo?.invoiceNumber || '') : manualInvoiceNumber.trim(),
      }));
      navigate('/purchases/completed');
    } catch (error) {
      toast.error(error?.message || String(error) || 'No se pudo registrar la compra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[#f5f8fc] dark:bg-background">
      <div className="kommerze-gradient-bg pointer-events-none absolute inset-0" />
      <main className="flex-1 overflow-hidden p-5 lg:p-6">
        <div className="relative z-[var(--z-layer-base)] mx-auto flex h-full w-full max-w-[1320px] flex-col">
          <nav className="mb-3 flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground"><button onClick={() => navigate('/home')} className="hover:text-primary">Home</button><span>/</span><span className="text-foreground">Compras</span></nav>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_376px] xl:gap-0 xl:overflow-hidden">
            <section className="flex min-w-0 flex-col gap-4 xl:min-h-0 xl:pr-4">
              <header className="flex shrink-0 items-center gap-4 px-1 py-1">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600"><ShoppingCart className="size-6" /></div><div><h1 className="text-xl font-bold tracking-[-.025em]">Nueva compra</h1><p className="mt-0.5 text-xs text-muted-foreground">Captura artículos manualmente o cárgalos desde el XML del proveedor.</p></div>
              </header>
              <div className="relative z-[var(--z-layer-dropdown)]">
                {isXMLMode && <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/80 px-3 py-2.5 text-amber-800 shadow-[0_10px_28px_-24px_rgba(217,119,6,.7)] dark:border-amber-400/20 dark:bg-amber-400/[.07] dark:text-amber-200"><AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" /><div><p className="text-xs font-semibold">Captura controlada por XML</p><p className="mt-0.5 text-[10px] opacity-80">Los artículos y el proveedor provienen del CFDI y no pueden agregarse, eliminarse o sustituirse manualmente.</p></div></div>}
                <div className={cn('group relative flex h-11 items-center rounded-2xl border border-[#dce7f6] bg-white/90 px-4 shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065]', isXMLMode && 'cursor-not-allowed bg-slate-50/80 opacity-60 dark:bg-white/[.025]')}>
                  <Search className="mr-3 size-4 text-[#6481ad]" /><input ref={inputRef} disabled={isXMLMode} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={handleProductSearchKeyDown} role="combobox" aria-expanded={!isXMLMode && query.trim().length >= 2} aria-controls="purchase-product-suggestions" aria-activedescendant={activeSuggestion >= 0 ? `purchase-suggestion-${activeSuggestion}` : undefined} placeholder={isXMLMode ? 'Búsqueda desactivada durante la captura por XML' : 'Buscar productos, SKU o código de barras...'} className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#7790b6] disabled:cursor-not-allowed" /><ScanBarcode className="size-4 text-[#7890b2]" />
                  {!isXMLMode && query.trim().length >= 2 && <div ref={suggestionsRef} id="purchase-product-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-[var(--z-layer-dropdown)] mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-background p-1 shadow-xl">
                    {searching ? <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Buscando…</div> : suggestions.length ? suggestions.map((product, index) => <button key={product.Guid} id={`purchase-suggestion-${index}`} data-suggestion-index={index} role="option" aria-selected={activeSuggestion === index} type="button" onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActiveSuggestion(index)} onClick={() => addProduct(product)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', activeSuggestion === index ? 'bg-blue-50 text-blue-950 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-100 dark:ring-blue-400/20' : 'hover:bg-muted')}><div className={cn('flex size-9 items-center justify-center rounded-xl', activeSuggestion === index ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-600')}><PackageSearch className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{product.Descripcion}</p><p className="text-[10px] text-muted-foreground">{product.Codigo} · {product.Empaque}</p></div><div className="text-right"><p className="text-xs font-bold">{money(product.PrecioCompra)}</p><p className="text-[9px] text-muted-foreground">Costo actual</p></div>{activeSuggestion === index && <span className="rounded-md border border-blue-200 bg-white/70 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:border-blue-400/20 dark:bg-white/10 dark:text-blue-300">Enter</span>}</button>) : <p className="p-4 text-center text-xs text-muted-foreground">Sin resultados</p>}
                  </div>}
                </div>
              </div>

              <section key={listRevision} className="flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/75 shadow-none backdrop-blur-sm dark:border-zinc-800 dark:bg-white/[.025] xl:min-h-0">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div><h2 className="text-sm font-semibold">Artículos de la compra</h2><p className="text-[11px] text-muted-foreground">{items.length} productos · {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} unidades</p></div>{items.length > 0 && <button type="button" onClick={clearDraft} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600">{isXMLMode ? <CircleStop className="size-3.5" /> : <Trash2 className="size-3.5" />}{isXMLMode ? 'Cancelar carga XML' : 'Vaciar'}</button>}</div>
                {items.length === 0 ? <div key="purchase-empty-state" className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center"><PackageSearch className="size-10 text-muted-foreground/35" /><h3 className="mt-3 text-sm font-semibold">Agrega el primer artículo</h3><p className="mt-1 text-xs text-muted-foreground">Utiliza el buscador o carga el XML de la factura.</p></div> : <div key="purchase-items-list" className="flex-1 divide-y divide-border/55 overflow-y-auto">{items.map(item => <div key={item.id} className="grid items-center gap-4 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_130px_130px_110px_36px]">
                  <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-xs font-semibold">{item.name}</p>{!item.matched && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-600">Sin vincular</span>}{item.quantitySource === 'unidad' && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-600">Cantidad por unidad</span>}</div><p className="mt-1 text-[10px] text-muted-foreground">{item.sku || 'Sin código'} · {item.unit || 'Unidad'}</p></div>
                  <QuantityControl value={item.quantity} disabled={isXMLMode} onChange={quantity => updateItem(item.id, { quantity })} className="justify-self-start md:justify-self-center" />
                  <label className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span><input type="number" min="0" step="0.01" disabled={isXMLMode} value={item.cost} onChange={event => updateItem(item.id, { cost: Number(event.target.value) })} className="h-9 w-full rounded-xl border border-[#dce7f6] bg-white/90 pl-7 pr-2 text-right text-xs font-semibold outline-none focus:border-blue-300 disabled:cursor-not-allowed disabled:bg-slate-50/80 disabled:text-muted-foreground dark:border-white/10 dark:bg-white/[.06] dark:disabled:bg-white/[.025]" /></label>
                  <p className="text-right text-xs font-bold tabular-nums">{money(Number(item.cost) * Number(item.quantity))}</p>
                  {isXMLMode ? <span className="size-8" aria-hidden="true" /> : <button onClick={() => removeItem(item.id)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button>}
                </div>)}</div>}
              </section>
            </section>

            <aside className="space-y-4 overflow-y-auto bg-gradient-to-b from-white/35 to-blue-50/40 p-4 backdrop-blur-sm dark:from-white/[.025] dark:to-blue-900/10 xl:h-full xl:border-l xl:border-border/50">
              <div className="flex justify-end">
                <button onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold hover:bg-muted"><ArrowLeft className="size-4" />Volver al inicio</button>
              </div>
              <section>
                {supplier ? (
                  <div className="w-full rounded-xl border border-primary bg-primary/5 p-4 text-left shadow-[0_0_0_1px_rgba(var(--primary),.2)] transition-all dark:border-primary/20 dark:bg-primary/10">
                    <div className="flex w-full items-start gap-4">
                      <div className="mt-0.5 flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shadow-sm">
                        {supplierInitial}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                      <div className="mb-1 flex w-full items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proveedor actual</span>
                          {isSupplierUnlinked && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">Entidad fiscal no registrada</span>}
                        </div>
                        {!isXMLMode && <button type="button" onClick={() => { setSupplier(null); setSupplierRFC(''); window.setTimeout(() => document.querySelector('#purchase-supplier-rfc')?.focus(), 20); }} className="h-auto shrink-0 p-0 text-[10px] font-bold uppercase text-primary transition hover:text-primary/80">Cambiar proveedor</button>}
                      </div>
                      <h4 className="mb-1 truncate text-sm font-semibold leading-none text-foreground" title={supplier.RazonSocial}>{supplier.RazonSocial || 'Proveedor sin nombre'}</h4>
                      <div className="mt-1 flex flex-col gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {(supplier.Correo || supplier.Telefono) && <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {supplier.Correo && <div className="flex min-w-0 items-center gap-1.5"><Mail className="size-3.5 shrink-0 opacity-70" /><span className="truncate">{supplier.Correo}</span></div>}
                          {supplier.Correo && supplier.Telefono && <div className="hidden size-1 rounded-full bg-muted-foreground/30 sm:block" />}
                          {supplier.Telefono && <div className="flex items-center gap-1.5"><Phone className="size-3.5 shrink-0 opacity-70" /><span>{supplier.Telefono}</span></div>}
                        </div>}
                        <div className="text-[11px] leading-tight">RFC: <span className="font-semibold text-foreground/80">{supplier.RFC || 'Sin RFC'}</span></div>
                      </div>
                      {supplier.EsProveedor === false && <p className="mt-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">La entidad existe, pero aún no tiene rol de proveedor.</p>}
                      </div>
                    </div>
                    {isSupplierUnlinked && <div className="mt-3 flex w-full items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/80 px-3 py-2.5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/[.07] dark:text-amber-200"><AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-500" /><p className="text-[9px] leading-relaxed">No encontramos una entidad fiscal registrada para el RFC del comprobante. Registra o vincula al proveedor para continuar con la compra.</p></div>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600"><Building2 className="size-5" /></div><div><h2 className="text-sm font-semibold">Seleccionar proveedor</h2><p className="text-[11px] text-muted-foreground">Busca sus datos fiscales mediante RFC</p></div></div>
                    <div className="mt-4 flex gap-2"><input id="purchase-supplier-rfc" value={supplierRFC} disabled={isXMLMode} maxLength={13} onChange={event => { setSupplierRFC(event.target.value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, '')); setSupplier(null); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); lookupSupplier(); } }} placeholder="RFC del proveedor" className="h-10 min-w-0 flex-1 rounded-xl border border-[#dce7f6] bg-white/90 px-3 text-xs font-semibold uppercase outline-none focus:border-blue-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted-foreground dark:border-white/10 dark:bg-white/[.06] dark:disabled:bg-white/[.025]" /><button type="button" onClick={lookupSupplier} disabled={isXMLMode || searchingSupplier} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40">{searchingSupplier ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}</button></div>
                    <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Busca por RFC o carga el proveedor desde el XML.</p>
                  </>
                )}
              </section>

              {!isXMLMode && <section className="border-t border-border/50 pt-4">
                <label htmlFor="purchase-invoice-number" className="mb-2 block text-[11px] font-semibold text-[#334a70] dark:text-slate-300">Folio de la factura <span className="text-red-500">*</span></label>
                <div className="group flex h-11 items-center rounded-2xl border border-[#dce7f6] bg-white/90 px-4 shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] transition-all focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065]">
                  <FileText className="mr-3 size-4 shrink-0 text-[#6481ad] group-focus-within:text-blue-600 dark:text-slate-400" />
                  <input id="purchase-invoice-number" value={manualInvoiceNumber} onChange={event => setManualInvoiceNumber(event.target.value)} maxLength={100} placeholder="Ej. FAC-000123" className="w-full min-w-0 bg-transparent text-sm font-medium uppercase text-[#1b3154] outline-none placeholder:normal-case placeholder:text-[#7790b6] dark:text-slate-100 dark:placeholder:text-slate-500" />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">Identificador proporcionado por el proveedor.</p>
              </section>}

              <section className="border-t border-border/50 pt-4">
                {!xmlInfo || showXMLUploader ? <>
                  <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{xmlInfo ? 'Cambiar XML' : 'Cargar XML'}</h2><p className="mt-1 text-[11px] text-muted-foreground">Autocompleta proveedor, artículos y costos.</p></div>{xmlInfo && <button type="button" onClick={() => setShowXMLUploader(false)} className="text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground">Ocultar</button>}</div>
                  <button type="button" onClick={() => fileRef.current?.click()} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); processXML(event.dataTransfer.files?.[0]); }} className={cn('flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center transition', dragging ? 'border-blue-500 bg-blue-500/10' : 'border-blue-300/70 bg-white/45 hover:border-blue-400 hover:bg-blue-50/55 dark:border-blue-400/20 dark:bg-white/[.025]')}><input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={event => processXML(event.target.files?.[0])} />{loadingXML ? <Loader2 className="size-7 animate-spin text-blue-600" /> : <UploadCloud className="size-7 text-blue-600" />}<p className="mt-2 text-xs font-semibold">{loadingXML ? 'Leyendo CFDI…' : 'Arrastra o selecciona el XML'}</p><p className="mt-1 text-[10px] text-muted-foreground">Archivo .xml</p></button>
                </> : <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/55 p-3 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/[.06] dark:text-emerald-300"><CheckCircle2 className="size-4 shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">XML cargado</p><p className="mt-0.5 truncate text-[9px] opacity-80">{xmlInfo.fileName}</p></div><button type="button" onClick={() => setShowXMLUploader(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase transition hover:bg-emerald-500/10"><UploadCloud className="size-3.5" />Cambiar XML</button></div>}
              </section>

              {xmlInfo && <section className="border-t border-border/50 pt-4">
                <div className="mb-3"><h2 className="text-sm font-semibold">Información fiscal</h2><p className="mt-1 text-[11px] text-muted-foreground">Datos obtenidos directamente del comprobante.</p></div>
                <dl className="divide-y divide-border/45 rounded-xl border border-border/55 bg-white/45 px-3 dark:bg-white/[.025]">
                  <CFDIDataRow label="Folio fiscal (UUID)" value={xmlInfo.uuid || '—'} action={xmlInfo.uuid ? <button type="button" onClick={() => navigator.clipboard.writeText(xmlInfo.uuid).then(() => toast.success('UUID copiado'))} className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-blue-500/10 hover:text-blue-600" title="Copiar UUID"><Copy className="size-3.5" /></button> : null} />
                  <CFDIDataRow label="No. de factura (Folio)" value={xmlInfo.invoiceNumber || '—'} />
                  <CFDIDataRow label="Fecha de factura" value={formatCFDIDate(xmlInfo.fecha)} />
                  <CFDIDataRow label="Fecha de certificación" value={formatCFDIDate(xmlInfo.certificationDate, true)} />
                  <CFDIDataRow label="Moneda" value={xmlInfo.currency ? `${xmlInfo.currency}${CFDI_CURRENCIES[xmlInfo.currency] ? ` - ${CFDI_CURRENCIES[xmlInfo.currency]}` : ''}` : '—'} />
                  <CFDIDataRow label="Tipo de comprobante" value={xmlInfo.documentType ? `${xmlInfo.documentType}${CFDI_TYPES[xmlInfo.documentType] ? ` - ${CFDI_TYPES[xmlInfo.documentType]}` : ''}` : '—'} />
                  <CFDIDataRow label="Método de pago" value={xmlInfo.paymentMethod ? `${xmlInfo.paymentMethod}${CFDI_PAYMENT_METHODS[xmlInfo.paymentMethod] ? ` - ${CFDI_PAYMENT_METHODS[xmlInfo.paymentMethod]}` : ''}` : '—'} />
                </dl>
              </section>}

              <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#002366] to-[#001233] p-4 text-white shadow-2xl transition-all duration-300">
                <div className="pointer-events-none absolute right-0 top-0 -mr-8 -mt-8 size-32 rounded-full bg-white opacity-[.03] blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 -mb-8 -ml-8 size-24 rounded-full bg-blue-400 opacity-[.05] blur-xl" />
                <div className={cn('relative z-[var(--z-layer-raised)] overflow-hidden px-2 transition-all duration-300 ease-out', summaryExpanded ? 'mb-1 max-h-64 opacity-100' : 'mb-0 max-h-0 opacity-0')}>
                  <h4 className="mb-4 text-[10px] font-black uppercase tracking-[.15em] text-blue-200/60">Resumen de la compra</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between"><span className="font-medium text-blue-100/70">Subtotal</span><span className="font-bold text-white">{money(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-blue-100/70">Descuento</span><span className="font-bold text-white">{money(discount)}</span></div>
                    {xmlInfo && <div className="flex justify-between"><span className="font-medium text-blue-100/70">Impuestos CFDI</span><span className="font-bold text-white">{money(tax)}</span></div>}
                    {unmatched > 0 && <div className="flex gap-2 rounded-xl border border-amber-300/25 bg-amber-400/10 p-2.5 text-[10px] text-amber-100"><AlertCircle className="size-3.5 shrink-0" /><span>{unmatched} artículo(s) requieren vinculación.</span></div>}
                  </div>
                  <div className="mt-4 border-t border-white/10" />
                </div>
                <button type="button" onClick={() => setSummaryExpanded(value => !value)} aria-expanded={summaryExpanded} className="relative z-[var(--z-layer-raised)] flex w-full items-end justify-between px-2 text-left">
                  <div className="flex flex-col"><span className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase leading-none tracking-widest text-blue-200/60">Total neto<ChevronDown className={cn('size-4 transition-transform duration-300', summaryExpanded && 'rotate-180')} strokeWidth={2.4} /></span><span className="text-3xl font-black leading-none tracking-tighter text-white drop-shadow-sm tabular-nums">{money(total)}</span></div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-200/80">{items.length} Art.</span>
                </button>
                <button disabled={saving || !items.length || unmatched > 0 || !supplier || isSupplierUnlinked || !(store?.ID ?? store?.id) || (!isXMLMode && !manualInvoiceNumber.trim())} onClick={savePurchase} className="relative z-[var(--z-layer-raised)] mt-4 flex h-11 w-full items-center justify-between rounded-lg border-none bg-white px-4 text-xs font-black uppercase tracking-wide text-[#002366] shadow-[0_4px_14px_rgba(255,255,255,.15)] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><span className="flex items-center gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}{saving ? 'Guardando compra' : 'Registrar compra'}</span><ArrowLeft className="size-4 rotate-180 opacity-70" /></button>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function CFDIDataRow({ label, value, action }) {
  return <div className="grid grid-cols-[118px_minmax(0,1fr)] items-center gap-2 py-2 text-[10px]"><dt className="font-semibold leading-tight text-[#334a70] dark:text-slate-300">{label}</dt><dd className="flex min-w-0 items-center gap-1.5 font-medium text-foreground"><span className="min-w-0 break-words">{value}</span>{action}</dd></div>;
}
