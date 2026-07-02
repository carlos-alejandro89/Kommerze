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
    Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';

import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { useAuditoriaService } from '../useAuditoriaService';

export function AuditoriaPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { store } = useActivation();

    const [guidAuditoria, setGuidAuditoria] = useState(null);
    const { obtenerResumenInventario, iniciarAuditoria } = useAuditoriaService();
    const [resumenInventario, setResumenInventario] = useState(null);
    const [productosAuditoria, setProductosAuditoria] = useState([]);
    const productosAuditoriaRef = useRef([]);

    // status: 'setup' | 'active' | 'reconciliation'
    const [status, setStatus] = useState('setup');
    const [managerImgError, setManagerImgError] = useState(false);

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
        const unsub = EventsOn('auditoria_conteo_actualizado', (data) => {
            console.log('[AuditoriaWS] auditoria_conteo_actualizado', data);

            handleScan(data.Producto.Guid, data.Conteo);
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
                    const productos = res.data?.productos ?? [];
                    productosAuditoriaRef.current = productos;
                    setProductosAuditoria(productos);
                    setGuidAuditoria(res.data.auditoria.Guid);
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

    return (
        <div className="container mx-auto px-6 py-8 max-w-[1200px] animate-fade-in space-y-6">

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

            {/* ========================================================================= */}
            {/* 1. SETUP VIEW */}
            {/* ========================================================================= */}
            {status === 'setup' && (
                <div className="space-y-6 animate-slide-up">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-primary tracking-tight">Nueva Auditoría de Inventario</h1>
                            <p className="text-sm text-text-secondary mt-1">Configure los parámetros iniciales para la validación de existencias.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl px-5 py-2"
                                onClick={() => navigate('/home')}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="rounded-xl px-5 py-2 shadow-sm font-semibold"
                                onClick={handleStartAudit}
                            >
                                Iniciar Auditoría
                            </Button>
                        </div>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-12 gap-6">
                        {/* Left Side (General Data & Assignment) */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            {/* General Data Card */}
                            <Card className="glass shadow-sm">
                                <CardHeader className="border-b-0 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="text-primary size-5" />
                                        <CardTitle className="text-lg font-bold">Datos Generales</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ítems Totales</span>
                                            <div className="text-3xl font-extrabold text-primary mt-1">{resumenInventario?.TotalItems}</div>
                                            <span className="text-[11px] text-text-muted mt-1 block">Productos</span>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Valor del Inventario</span>
                                            <div className="text-3xl font-extrabold text-primary mt-1">{resumenInventario?.ValorInventario}</div>
                                            <span className="text-[11px] text-text-muted mt-1 block">Monto total</span>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Último Conteo</span>
                                            <div className="text-xl font-bold text-primary mt-2">12 Oct 2023</div>
                                            <span className="text-[11px] text-text-muted mt-1 block">Hace 24 días</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Staff Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Branch Manager Card */}
                                <Card className="glass shadow-sm flex flex-row items-center gap-4 p-5">
                                    <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container overflow-hidden shrink-0">
                                        {!managerImgError ? (
                                            <img
                                                className="w-full h-full object-cover"
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCha07r_v4bVyvKIDD1TfmuOry5lK5-53419kUGCjCum5JHeH5-KF8kfU95Xn_13KnFiJ6Uo1iqeJrVeWHzpSbj7BBFpd_xwsVvertytDC_vlMJZPsELRFSJhDcA7PJNIvn3lCzL3DBGdRzgAQ3pExCB96_0VDXaHG5vMGEZaYMEphIHxbxClJ43k0rt6qOf1VKbV8hBx7LstCLXck0tXRKI0JpWmZ2x49rLU2hxAMPoEHNOs6oWPEKfwYHFL4CYAkL3SK0N0kB8HE"
                                                alt="Manager Profile"
                                                onError={() => setManagerImgError(true)}
                                            />
                                        ) : (
                                            <User className="size-8 text-text-secondary" />
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-secondary block font-medium">Responsable de Sucursal</span>
                                        <p className="text-lg font-bold text-foreground">{user?.Nombre}</p>
                                        <Badge variant="success" appearance="light" size="xs" shape="circle" className="mt-1">
                                            Autenticado
                                        </Badge>
                                    </div>
                                </Card>

                            </div>
                        </div>

                        {/* Right Side (Instructions Check) */}
                        <div className="col-span-12 lg:col-span-4">
                            <Card className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-xl h-full flex flex-col justify-between border-0 shadow-md">
                                <CardHeader className="border-b-0 pb-4">
                                    <div className="flex items-center gap-2">
                                        <ClipboardCheck className="text-brand-300 size-5" />
                                        <CardTitle className="text-lg font-bold text-white">Instrucciones</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                                    {/* Checklist */}
                                    <ul className="space-y-4">
                                        {checklist.map((item) => (
                                            <li
                                                key={item.id}
                                                onClick={() => toggleCheck(item.id)}
                                                className="flex items-start gap-3 cursor-pointer group select-none"
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${item.checked
                                                        ? 'bg-brand-500 border-brand-500 text-white'
                                                        : 'border-white/30 hover:border-white/60'
                                                        }`}
                                                >
                                                    {item.checked && <Check className="size-3.5 stroke-[3]" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold transition-colors ${item.checked ? 'text-white/60 line-through' : 'text-white'}`}>
                                                        {item.title}
                                                    </p>
                                                    <p className={`text-xs mt-0.5 transition-colors ${item.checked ? 'text-white/40' : 'text-white/70'}`}>
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Important Alert box */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-2 text-brand-300 mb-1">
                                            <Info className="size-4 shrink-0" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Importante</span>
                                        </div>
                                        <p className="text-xs text-white/80 leading-relaxed">
                                            Al iniciar, el sistema bloqueará temporalmente los ajustes manuales de stock y las transacciones de venta hasta completar la conciliación.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Decorative System Status */}
                    <Card className="glass shadow-sm overflow-hidden relative group">
                        <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-primary">
                                    <Activity className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Estado de Conectividad</h3>
                                    <p className="text-xs text-text-secondary">Sincronización en tiempo real activa.</p>
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
                        <Card className="glass border border-border/80 rounded-2xl p-8 shadow-lg flex flex-col items-center text-center">

                            {/* Pulsing Lock Icon */}
                            <div className="w-20 h-20 rounded-full bg-muted/80 flex items-center justify-center mb-6 relative border border-border shadow-inner">
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
                            <p className="text-sm text-text-secondary max-w-[420px] mb-6">
                                El terminal se encuentra bloqueado temporalmente para garantizar la integridad del inventario. Por favor, espere a que el proceso finalice.
                            </p>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 w-full mb-6 text-left">
                                <div className="bg-muted/40 p-4 rounded-xl flex flex-col items-start border border-border/50">
                                    <span className="text-[11px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">Auditor Asignado</span>
                                    <div className="flex items-center gap-1.5">
                                        <User className="size-4 text-primary shrink-0" />
                                        <span className="text-sm font-bold text-foreground">Auditor</span>
                                    </div>
                                </div>
                                <div className="bg-muted/40 p-4 rounded-xl flex flex-col items-start border border-border/50">
                                    <span className="text-[11px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">Hora de Inicio</span>
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

                            {/* Main Actions Container */}
                            <div className="w-full space-y-3 pt-2">
                                <Button
                                    variant="primary"
                                    onClick={() => setStatus('reconciliation')}
                                    className="w-full flex items-center justify-center gap-2 h-11 text-sm font-bold bg-success hover:bg-success/90 text-white rounded-xl shadow-md transition-all active:scale-95 shrink-0"
                                >
                                    <Check className="size-4.5 stroke-[3]" /> Finalizar y Conciliar
                                </Button>



                                <div className="flex justify-between items-center pt-3 mt-1 border-t border-border/50 text-[10px] text-text-muted">
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Desea pausar la auditoría y regresar al panel de configuración? El conteo no se perderá.')) {
                                                setStatus('setup');
                                            }
                                        }}
                                        className="hover:underline hover:text-foreground font-medium"
                                    >
                                        Pausar Conteo
                                    </button>
                                    <span className="font-medium">{guidAuditoria}</span>
                                </div>
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
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-primary tracking-tight">Conciliación de Ajustes</h1>
                            <p className="text-sm text-text-secondary mt-1">
                                Revise las diferencias y autorice la actualización de inventarios del sistema.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl px-5 py-2"
                                onClick={() => setStatus('active')}
                            >
                                Volver a Conteo
                            </Button>
                            <Button
                                variant="primary"
                                className="rounded-xl px-5 py-2 shadow-sm font-semibold bg-success hover:bg-success/90 text-white"
                                onClick={() => {
                                    alert(`Ajustes aplicados correctamente. Auditoría cerrada y finalizada.\n\nResponsable: Nombre del auditor\nImpacto financiero estimado: ${financialImpact >= 0 ? '+' : ''}$${financialImpact.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
                                    setCountedItems([
                                        { id: 1, name: 'Refresco Cola 600ml', sku: '750105530001', expected: 50, counted: 48, diff: -2, status: 'Faltante' },
                                        { id: 2, name: 'Papas Fritas Sal 100g', sku: '750100012345', expected: 30, counted: 30, diff: 0, status: 'Completo' },
                                        { id: 3, name: 'Aceite de Cocina 1L', sku: '750200098765', expected: 15, counted: 17, diff: 2, status: 'Sobrante' }
                                    ]);
                                    setChecklist(prev => prev.map(item => ({ ...item, checked: false })));
                                    setStatus('setup');
                                }}
                            >
                                Autorizar y Cerrar Auditoría
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        {/* Left side (Summary Table of discrepancies only) */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            <Card className="glass shadow-sm">
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
                                                <tr className="bg-muted/30 text-text-secondary text-xs uppercase font-bold border-b border-border">
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
                                                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
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
                            <Card className="glass shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold">Resumen de Conciliación</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
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
                                        <div className="p-3 border border-dashed border-border bg-muted/10 rounded-lg flex items-center gap-2">
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
                                        <div className="p-3 border border-dashed border-border bg-muted/10 rounded-lg flex items-center gap-2">
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
    );
}
