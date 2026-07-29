import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardCheck,
    UserCheck,
    User,
    Info,
    Activity,
    Check,
    X,
    TrendingDown,
    TrendingUp,
    RotateCcw,
    Clock,
    Lock,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';

import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { useAuditoria } from '@/providers/AuditoriaProvider';
import { useAuditoriaService } from '../useAuditoriaService';

export function AuditoriaPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { store } = useActivation();

    const { obtenerResumenInventario } = useAuditoriaService();
    const {
        auditoriaActiva,
        productosAuditoria,
        iniciarAuditoria,
    } = useAuditoria();
    const [resumenInventario, setResumenInventario] = useState(null);
    const productosAuditoriaRef = useRef([]);

    // status: 'setup' | 'active' | 'reconciliation'
    const [status, setStatus] = useState('setup');
    const [managerImgError, setManagerImgError] = useState(false);

    const formatCurrency = (value) => {
        const numericValue = Number(value ?? 0);
        return numericValue.toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    // --- Setup View States ---
    const [checklist, setChecklist] = useState([
        { id: 1, title: 'Asegurar visibilidad de productos', desc: 'Despeje pasillos y estanterías para una lectura clara de códigos.', checked: false },
        { id: 2, title: 'Verificar sincronización de terminales', desc: 'Confirme que el Terminal #04 tiene conexión estable a la red central.', checked: false },
        { id: 3, title: 'Congelar movimientos de inventario', desc: 'No procese nuevas ventas o devoluciones durante el conteo.', checked: false }
    ]);

    // Obtener el resumen del inventario
    useEffect(() => {
        obtenerResumenInventario()
            .then((res) => {
                if (res.success) {
                    setResumenInventario(res.data);
                }
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    useEffect(() => {
        setStatus(auditoriaActiva ? 'active' : 'setup');
    }, [auditoriaActiva]);

    useEffect(() => {
        const unsub = EventsOn('auditoria_conteo_actualizado', (data) => {
            console.log('[AuditoriaWS] auditoria_conteo_actualizado', data);

            const guidProducto = data?.Producto?.Guid ?? data?.producto?.guid ?? data?.guidNivel;
            const conteo = data?.Conteo ?? data?.conteo ?? 0;
            handleScan(guidProducto, conteo);
        });

        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, []);

    useEffect(() => {
        productosAuditoriaRef.current = productosAuditoria;
    }, [productosAuditoria]);

    //Operaciones de la auditoria
    const handleStartAudit = () => {
        //Iniciar auditoria
        iniciarAuditoria(store.Guid, user.Guid)
            .then((res) => {
                toast.success(res.message);

                if (res.success) {
                    setStatus('active');
                }
            })
            .catch((err) => {
                console.error(err);
            });

        /*  setStatus('active');
         const now = new Date();
         const hrs = String(now.getHours()).padStart(2, '0');
         const mins = String(now.getMinutes()).padStart(2, '0');
         setStartTime(`${hrs}:${mins}`);

        const timeStr = now.toTimeString().split(' ')[0];
        setScanLogs([{ time: timeStr, message: `Auditoría iniciada oficialmente por ${auditorName}.` }]); */
    };

    const handleScan = (guidProducto, conteo) => {
        const catalogo = productosAuditoriaRef.current;

        const producto = catalogo.find(item => (item.nivelGuid ?? item.Guid ?? item.guid) === guidProducto);
        if (!producto) {
            console.warn('[AuditoriaWS] Producto no encontrado en catalogo de auditoria', guidProducto);
            return;
        }

        const productoGuid = producto.nivelGuid ?? producto.Guid ?? producto.guid;
        const descripcion = producto.Descripcion ?? producto.descripcion;
        const codigo = producto.Codigo ?? producto.codigo;
        const existencia = Number(producto.Existencia ?? producto.existencia ?? 0);
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        setCountedItems(prev => {
            const existing = prev.find(item => item.guid === productoGuid);
            const newCount = conteo;
            let newStatus = 'Completo';
            const newDiff = newCount - existencia;

            if (newDiff < 0) newStatus = 'Faltante';
            if (newDiff > 0) newStatus = 'Sobrante';

            setScanLogs(logs => [
                { time: timeStr, message: `Escaneado: ${codigo} - ${descripcion}. Conteo: ${newCount}` },
                ...logs
            ]);

            if (existing) {
                return prev.map(item => item.guid === productoGuid
                    ? { ...item, counted: newCount, diff: newDiff, status: newStatus }
                    : item
                );
            } else {
                return [
                    ...prev,
                    {
                        id: prev.length + 1,
                        name: descripcion,
                        guid: productoGuid,
                        expected: existencia,
                        counted: newCount,
                        diff: newDiff,
                        status: newStatus
                    }
                ];
            }
        });
    };


    // --- Core States ---


    const [startTime, setStartTime] = useState('18:46');

    // --- Active View States ---
    const [countedItems, setCountedItems] = useState([]);
    const [scanSearch, setScanSearch] = useState('');
    const [scanLogs, setScanLogs] = useState([
        { time: '18:46:12', message: 'Sistema de terminal bloqueado de forma segura.' }
    ]);

    // Catalog for simulating scans
    const SIMULATION_CATALOG = [];

    // Helper actions
    const toggleCheck = (id) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    };







    const handleManualAdd = (e) => {
        e.preventDefault();
        if (!scanSearch.trim()) return;

        const matched = SIMULATION_CATALOG.find(
            p => p.sku === scanSearch || p.name.toLowerCase().includes(scanSearch.toLowerCase())
        );

        const targetProduct = matched || {
            name: scanSearch,
            sku: `MOCK-${Math.floor(100000 + Math.random() * 900000)}`,
            expected: 10
        };

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        setCountedItems(prev => {
            const existing = prev.find(item => item.sku === targetProduct.sku || item.name.toLowerCase() === targetProduct.name.toLowerCase());
            if (existing) {
                const newCount = existing.counted + 1;
                const newDiff = newCount - existing.expected;
                let newStatus = 'Completo';
                if (newDiff < 0) newStatus = 'Faltante';
                if (newDiff > 0) newStatus = 'Sobrante';

                setScanLogs(logs => [
                    { time: timeStr, message: `Búsqueda manual: ${targetProduct.name} (+1). Conteo actual: ${newCount}` },
                    ...logs
                ]);

                return prev.map(item => item.sku === existing.sku
                    ? { ...item, counted: newCount, diff: newDiff, status: newStatus }
                    : item
                );
            } else {
                const newCount = 1;
                const newDiff = newCount - targetProduct.expected;
                let newStatus = 'Completo';
                if (newDiff < 0) newStatus = 'Faltante';
                if (newDiff > 0) newStatus = 'Sobrante';

                setScanLogs(logs => [
                    { time: timeStr, message: `Registro manual de: ${targetProduct.name} (Conteo: 1)` },
                    ...logs
                ]);

                return [
                    ...prev,
                    {
                        id: prev.length + 1,
                        name: targetProduct.name,
                        sku: targetProduct.sku,
                        expected: targetProduct.expected,
                        counted: newCount,
                        diff: newDiff,
                        status: newStatus
                    }
                ];
            }
        });

        setScanSearch('');
    };

    const totalExpected = productosAuditoria.length;
    const totalCounted = countedItems.length;
    const totalDiscrepancies = countedItems.filter(item => item.diff !== 0).length;
    const progressPercent = Math.round((totalCounted * 100) / totalExpected);
    const financialImpact = countedItems.reduce((sum, item) => sum + (item.diff * 25), 0);

    const handleAuthorizeAudit = () => {
        alert(`Ajustes aplicados correctamente. Auditoría cerrada y finalizada.\n\nResponsable: Nombre del auditor\nImpacto financiero estimado: ${financialImpact >= 0 ? '+' : ''}$${financialImpact.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        setCountedItems([
            { id: 1, name: 'Refresco Cola 600ml', sku: '750105530001', expected: 50, counted: 48, diff: -2, status: 'Faltante' },
            { id: 2, name: 'Papas Fritas Sal 100g', sku: '750100012345', expected: 30, counted: 30, diff: 0, status: 'Completo' },
            { id: 3, name: 'Aceite de Cocina 1L', sku: '750200098765', expected: 15, counted: 17, diff: 2, status: 'Sobrante' }
        ]);
        setChecklist(prev => prev.map(item => ({ ...item, checked: false })));
        setStatus('setup');
    };

    return (
        <div className="relative flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[#f5f8fc] dark:bg-background">
            <div className="kommerze-gradient-bg pointer-events-none absolute inset-0" />
            <div className="relative z-[var(--z-layer-base)] flex min-h-0 flex-1 flex-col animate-fade-in">

            {/* CSS Shimmer Keyframe definition */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .progress-shimmer {
          background: linear-gradient(90deg, var(--primary) 30%, #a5b4fc 50%, var(--primary) 70%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
      `}} />

            <div className="mx-auto w-full max-w-[1320px] shrink-0 px-6 pt-5">
                <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
                    <span>/</span>
                    <span className="text-foreground">Auditoría</span>
                </nav>
                <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <ClipboardCheck className="size-6" strokeWidth={1.8} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
                                {status === 'setup' ? 'Auditoría de inventario' : status === 'active' ? 'Auditoría en curso' : 'Conciliación de auditoría'}
                            </h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {status === 'setup' ? 'Prepara y valida las condiciones antes de iniciar el conteo.' : status === 'active' ? 'Conteo físico y validación de existencias en proceso.' : 'Revisa las diferencias antes de actualizar el inventario.'}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
                        <ArrowLeft className="size-4" />
                        Volver al inicio
                    </button>
                </header>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-[1320px] space-y-5">

            {/* ========================================================================= */}
            {/* 1. SETUP VIEW */}
            {/* ========================================================================= */}
            {status === 'setup' && (
                <div className="space-y-5 animate-slide-up">
                    {/* Bento Grid */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Left Side (General Data & Assignment) */}
                        <div className="col-span-12 lg:col-span-8 space-y-4">
                            {/* General Data Card */}
                            <Card className="overflow-hidden rounded-[1.35rem] border-white/65 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]">
                                <CardHeader className="border-b-0 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="text-primary size-5" />
                                        <CardTitle className="text-base font-semibold">Datos Generales</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="rounded-[1.15rem] border border-white/65 bg-white/50 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">Ítems Totales</span>
                                            <div className="mt-1 text-2xl font-semibold text-foreground">{resumenInventario?.TotalItems ?? '...'}</div>
                                            <span className="text-[11px] text-muted-foreground mt-1 block">Productos</span>
                                        </div>
                                        <div className="rounded-[1.15rem] border border-white/65 bg-white/50 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">Valor del Inventario</span>
                                            <div className="mt-1 text-2xl font-semibold text-foreground">{resumenInventario ? formatCurrency(resumenInventario?.ValorInventario) : '...'}</div>
                                            <span className="text-[11px] text-muted-foreground mt-1 block">Monto total</span>
                                        </div>
                                        <div className="rounded-[1.15rem] border border-white/65 bg-white/50 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">Último Conteo</span>
                                            <div className="mt-2 text-lg font-semibold text-foreground">12 Oct 2023</div>
                                            <span className="text-[11px] text-muted-foreground mt-1 block">Hace 24 días</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Staff Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Branch Manager Card */}
                                <Card className="flex flex-row items-center gap-4 rounded-[1.35rem] border-white/65 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden shrink-0">
                                        {!managerImgError ? (
                                            <img
                                                className="w-full h-full object-cover"
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCha07r_v4bVyvKIDD1TfmuOry5lK5-53419kUGCjCum5JHeH5-KF8kfU95Xn_13KnFiJ6Uo1iqeJrVeWHzpSbj7BBFpd_xwsVvertytDC_vlMJZPsELRFSJhDcA7PJNIvn3lCzL3DBGdRzgAQ3pExCB96_0VDXaHG5vMGEZaYMEphIHxbxClJ43k0rt6qOf1VKbV8hBx7LstCLXck0tXRKI0JpWmZ2x49rLU2hxAMPoEHNOs6oWPEKfwYHFL4CYAkL3SK0N0kB8HE"
                                                alt="Manager Profile"
                                                onError={() => setManagerImgError(true)}
                                            />
                                        ) : (
                                            <User className="size-7 text-primary" />
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block font-medium">Responsable de Sucursal</span>
                                        <p className="text-base font-semibold text-foreground">{user?.Nombre}</p>
                                        <Badge variant="success" appearance="light" size="xs" shape="circle" className="mt-1 font-medium">
                                            Autenticado
                                        </Badge>
                                    </div>
                                </Card>

                            </div>
                        </div>

                        {/* Right Side (Instructions Check) */}
                        <div className="col-span-12 lg:col-span-4">
                            <Card className="h-full rounded-[1.35rem] border-white/65 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]">
                                <CardHeader className="border-b-0 pb-4">
                                    <div className="flex items-center gap-2">
                                        <ClipboardCheck className="text-primary size-5" />
                                        <CardTitle className="text-base font-semibold text-foreground">Instrucciones</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                                    {/* Checklist */}
                                    <ul className="space-y-4">
                                        {checklist.map((item) => (
                                            <li
                                                key={item.id}
                                                onClick={() => toggleCheck(item.id)}
                                                className="flex items-start gap-3 cursor-pointer group select-none rounded-xl p-2 transition-colors hover:bg-white/55 dark:hover:bg-white/[0.045]"
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${item.checked
                                                        ? 'bg-primary border-primary text-primary-foreground'
                                                        : 'border-muted-foreground/25 bg-white/60 group-hover:border-primary/45 dark:bg-white/[0.04]'
                                                        }`}
                                                >
                                                    {item.checked && <Check className="size-3.5 stroke-[3]" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold transition-colors ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                        {item.title}
                                                    </p>
                                                    <p className={`text-xs mt-0.5 leading-5 transition-colors ${item.checked ? 'text-muted-foreground/65' : 'text-muted-foreground'}`}>
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Important Alert box */}
                                    <div className="p-4 bg-primary/5 rounded-[1.15rem] border border-primary/10">
                                        <div className="flex items-center gap-2 text-primary mb-1">
                                            <Info className="size-4 shrink-0" />
                                            <span className="text-xs font-semibold uppercase tracking-[0.14em]">Importante</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Al iniciar, el sistema bloqueará temporalmente los ajustes manuales de stock y las transacciones de venta hasta completar la conciliación.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Decorative System Status */}
                    <Card className="overflow-hidden relative rounded-[1.35rem] border-white/65 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]">
                        <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Activity className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">Estado de Conectividad</h3>
                                    <p className="text-xs text-muted-foreground">Sincronización en tiempo real activa.</p>
                                </div>
                            </div>

                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. ACTIVE VIEW (COUNT IN PROGRESS - LOCK CARD DESIGN) */}
            {/* ========================================================================= */}
            {status === 'active' && (
                <div
                    className="min-h-[calc(100vh-160px)] w-full flex items-center justify-center relative py-6 animate-slide-up"

                >

                    <div className="z-10 w-full max-w-[560px] px-4">
                        <Card className="flex flex-col items-center rounded-2xl border border-white/70 bg-white/65 p-8 text-center shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">

                            {/* Pulsing Lock Icon */}
                            <div className="relative mb-6 flex size-20 items-center justify-center rounded-full border border-blue-200/70 bg-blue-500/10 text-blue-600 shadow-inner dark:border-blue-400/15 dark:text-blue-400">
                                <Lock className="size-10 text-primary fill-primary/10" />
                                <span className="absolute top-1 right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
                                </span>
                            </div>

                            {/* Title & Subtext */}
                            <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">
                                Auditoría en Curso
                            </h1>
                            <p className="mb-6 max-w-[420px] text-sm text-muted-foreground">
                                El terminal se encuentra bloqueado temporalmente para garantizar la integridad del inventario. Por favor, espere a que el proceso finalice.
                            </p>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 w-full mb-6 text-left">
                                <div className="flex flex-col items-start rounded-2xl border border-[#e3ebf7]/90 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[.035]">
                                    <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Auditor Asignado</span>
                                    <div className="flex items-center gap-1.5">
                                        <User className="size-4 text-primary shrink-0" />
                                        <span className="text-sm font-bold text-foreground">Auditor</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start rounded-2xl border border-[#e3ebf7]/90 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[.035]">
                                    <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hora de Inicio</span>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="size-4 text-primary shrink-0" />
                                        <span className="text-sm font-bold text-foreground font-mono">{startTime}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Indicator */}
                            <div className="w-full mb-6 text-left">
                                <div className="flex justify-between items-center mb-1.5 text-xs">
                                    <span className="font-bold text-primary">Progreso de Conteo</span>
                                    <span className="font-bold text-foreground font-mono">{progressPercent}%</span>
                                </div>
                                <div className="h-3 w-full bg-muted rounded-full overflow-hidden relative border border-border/50">
                                    <div
                                        className="h-full rounded-full progress-shimmer transition-all duration-500 ease-in-out"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-text-secondary mt-3 flex items-center justify-center gap-1.5 font-mono">
                                    <RotateCcw className="size-3.5 animate-spin-slow text-primary" />
                                    {scanLogs[0]?.message || 'Verificando existencias físicas de la sucursal'}
                                </p>
                            </div>

                            <div className="w-full border-t border-border/50 pt-3 text-center text-[10px] font-medium text-muted-foreground">
                                Auditoría: {auditoriaActiva?.Guid ?? auditoriaActiva?.guid}
                            </div>

                        </Card>

                        {/* Footer Branding */}
                        <div className="mt-8 flex flex-col items-center opacity-40 text-center">
                            <span className="text-lg font-black tracking-widest text-foreground uppercase">Kommerze</span>
                            <span className="text-[10px] text-text-muted mt-0.5">Powered by Softi Digital</span>
                        </div>
                    </div>
                </div>
            )}


            {/* ========================================================================= */}
            {/* 3. RECONCILIATION VIEW */}
            {/* ========================================================================= */}
            {status === 'reconciliation' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="grid grid-cols-12 gap-6">
                        {/* Left side (Summary Table of discrepancies only) */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                                <CardHeader className="pb-3 border-b border-border">
                                    <CardTitle className="text-base font-bold text-danger-600">Discrepancias a Conciliar</CardTitle>
                                    <CardDescription className="text-xs">
                                        Solo se listan los productos que requieren un ajuste de stock física vs lógica
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-border/70 bg-slate-50/90 text-xs font-bold uppercase text-muted-foreground dark:bg-white/[.055]">
                                                    <th className="px-5 py-3">Producto</th>
                                                    <th className="px-5 py-3 font-mono">SKU</th>
                                                    <th className="px-5 py-3 text-right">Teórico</th>
                                                    <th className="px-5 py-3 text-right">Físico</th>
                                                    <th className="px-5 py-3 text-right">Ajuste</th>
                                                    <th className="px-5 py-3 text-center">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60">
                                                {countedItems.filter(item => item.diff !== 0).map((item) => (
                                                    <tr key={item.id} className="transition-colors hover:bg-blue-50/40 dark:hover:bg-white/[.035]">
                                                        <td className="px-5 py-3 font-semibold text-foreground">{item.name}</td>
                                                        <td className="px-5 py-3 font-mono text-xs text-text-secondary">{item.sku}</td>
                                                        <td className="px-5 py-3 text-right text-text-secondary">{item.expected}</td>
                                                        <td className="px-5 py-3 text-right font-bold">{item.counted}</td>
                                                        <td className={`px-5 py-3 text-right font-bold ${item.diff > 0 ? 'text-warning-600' : 'text-danger-600'}`}>
                                                            {item.diff > 0 ? `+${item.diff}` : item.diff}
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <Badge
                                                                variant={item.diff > 0 ? 'warning' : 'destructive'}
                                                                appearance="outline"
                                                                size="xs"
                                                                className="font-bold rounded-md"
                                                            >
                                                                {item.diff > 0 ? 'Incrementar Stock' : 'Disminuir Stock'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {countedItems.filter(item => item.diff !== 0).length === 0 && (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-8 text-text-muted italic">
                                                            No se detectaron discrepancias. ¡Inventario 100% conciliado!
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right side (Financial impact & Signoff) */}
                        <div className="col-span-12 lg:col-span-4 space-y-6">
                            {/* Financial Impact Card */}
                            <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold">Resumen de Conciliación</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3 rounded-2xl border border-[#e3ebf7]/90 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[.035]">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-text-secondary">Diferencias Totales:</span>
                                            <span className="font-bold font-mono text-foreground">{totalDiscrepancies} productos</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-text-secondary">Unidades Faltantes:</span>
                                            <span className="font-bold font-mono text-danger-600">
                                                {countedItems.filter(item => item.diff < 0).reduce((sum, item) => sum + Math.abs(item.diff), 0)} u
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-text-secondary">Unidades Sobrantes:</span>
                                            <span className="font-bold font-mono text-warning-600">
                                                {countedItems.filter(item => item.diff > 0).reduce((sum, item) => sum + item.diff, 0)} u
                                            </span>
                                        </div>
                                        <div className="border-t border-border pt-2.5 flex justify-between items-center">
                                            <span className="text-sm font-bold text-foreground">Impacto Financiero Est.:</span>
                                            <div className="flex items-center gap-1 text-base font-extrabold">
                                                {financialImpact >= 0 ? (
                                                    <TrendingUp className="size-4 text-success" />
                                                ) : (
                                                    <TrendingDown className="size-4 text-danger animate-pulse" />
                                                )}
                                                <span className={financialImpact >= 0 ? 'text-success' : 'text-danger'}>
                                                    {financialImpact >= 0 ? '+' : ''}${financialImpact.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sign-off signatures */}
                                    <div className="space-y-3 pt-2">
                                        <label className="text-xs font-bold text-text-secondary block">Autorización del Auditor</label>
                                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-blue-200/80 bg-blue-50/35 p-3 dark:border-blue-400/20 dark:bg-blue-400/[.035]">
                                            <UserCheck className="size-4 text-success" />
                                            <div className="text-xs">
                                                <p className="font-bold text-foreground">Auditor</p>
                                                <p className="text-[10px] text-text-muted font-mono">0000005825</p>
                                            </div>
                                            <Badge variant="success" size="xs" className="ml-auto text-[10px] font-bold">
                                                Firmado
                                            </Badge>
                                        </div>

                                        <label className="text-xs font-bold text-text-secondary block">Autorización del Gerente</label>
                                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-blue-200/80 bg-blue-50/35 p-3 dark:border-blue-400/20 dark:bg-blue-400/[.035]">
                                            <UserCheck className="size-4 text-success" />
                                            <div className="text-xs">
                                                <p className="font-bold text-foreground">Roberto Mendez</p>
                                                <p className="text-[10px] text-text-muted font-mono">#MGR-0023</p>
                                            </div>
                                            <Badge variant="success" size="xs" className="ml-auto text-[10px] font-bold">
                                                Firmado
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
            </div>
            </div>

            {(status === 'setup' || status === 'active' || status === 'reconciliation') && (
                <footer className="z-[var(--z-layer-raised)] shrink-0 border-t border-border/70 bg-background/90 px-6 py-3 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-[1320px] justify-end gap-2">
                        {status === 'setup' ? (
                            <>
                                <button type="button" onClick={() => navigate('/home')} className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted">
                                    Cancelar
                                </button>
                                <button type="button" onClick={handleStartAudit} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105">
                                    <ClipboardCheck className="size-4" />
                                    Iniciar auditoría
                                </button>
                            </>
                        ) : status === 'active' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm('¿Desea pausar la auditoría y regresar al panel de configuración? El conteo no se perderá.')) {
                                            setStatus('setup');
                                        }
                                    }}
                                    className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted"
                                >
                                    Pausar conteo
                                </button>
                                <button type="button" onClick={() => setStatus('reconciliation')} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105">
                                    <Check className="size-4" />
                                    Finalizar y conciliar
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => setStatus('active')} className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted">
                                    Volver al conteo
                                </button>
                                <button type="button" onClick={handleAuthorizeAudit} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105">
                                    <Check className="size-4" />
                                    Autorizar y cerrar auditoría
                                </button>
                            </>
                        )}
                    </div>
                </footer>
            )}
            </div>
        </div>
    );
}
