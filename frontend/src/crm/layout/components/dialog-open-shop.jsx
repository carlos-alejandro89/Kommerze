import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toAbsoluteUrl, moneyFormat, reverseMoneyFormat } from "@/lib/helpers";
import { ServiceSucursalInicioOperacion } from "../../../../wailsjs/go/main/App";
import {
    Building2,
    IdCard,
    Store,
    Package,
    TrendingUp,
    Wallet,
    Info,
    Check,
    ArrowRight,
    Mail
} from "lucide-react";

import { useAuth } from '@/providers/auth-provider';
import { useActivation } from '@/providers/activation-provider';
import { DialogAlert } from '@/components/common/dialog-alert';

export function DialogOpenShop({ open, onOpenChange }) {
    const { user, logout } = useAuth();
    const { license, store, empresa, operation, valorInventario } = useActivation();
    const isLoading = false;

    const [fondoCaja, setFondoCaja] = useState(moneyFormat(0));
    const [openDialogAlert, setOpenDialogAlert] = useState(false);

    const note = {
        storeName: store.NombreSucursal,
        org: empresa.RazonSocial,
        content: "ID: " + store.Guid,
        logo: "https://images.unsplash.com/photo-1511485977113-f34c92461ad9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
    }

    const IniciarOperacion = async () => {
        try {
            const response = await ServiceSucursalInicioOperacion({
                Usuario: user.ID,
                Sucursal: store.ID,
                FechaInicio: new Date().toISOString(),
                ValorInventarioInicial: valorInventario,
                FondoCaja: reverseMoneyFormat(fondoCaja),
            });

            if (response.success) {
                onOpenChange(false);
                setOpenDialogAlert(true);
            }


        } catch (error) {
            console.log(error)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                {/* The modal is large to mimic the full screen aesthetic of open-shop.html while maintaining Dialog traits */}
                <DialogContent className="max-w-6xl w-[95vw] lg:w-[90vw] max-h-[90vh] p-0 rounded-2xl overflow-hidden flex flex-col gap-0 border-border bg-background">
                    <ScrollArea className="flex-1 overflow-auto w-full">
                        <div className="p-6 md:p-8 lg:p-10 space-y-8">
                            {/* Main Title & Header Blocks */}
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-border/40">
                                <div className="space-y-2">
                                    <span className="text-muted-foreground font-bold tracking-widest text-[10px] uppercase">Protocolo de Apertura</span>
                                    <h1 className="text-3xl font-extrabold text-foreground leading-tight tracking-tight">Apertura de Sucursal</h1>
                                    <p className="text-muted-foreground max-w-md text-sm">Registre el fondo inicial para comenzar a operar. El sistema validará los montos ingresados.</p>
                                </div>

                                {/* Top info cards adapted from the user's snippet */}
                                <div className="flex flex-wrap gap-4 ">
                                    <div className="border bg-background p-2.5 flex flex-col justify-between bg-muted/30 p-4 rounded-md min-w-[140px] border border-slate-200 ">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Terminal</p>
                                        {isLoading ? <Skeleton className="h-4 w-[80px]" /> : <p className="font-bold text-foreground text-sm">TERM-0442</p>}
                                    </div>
                                    <div className="border bg-background p-2.5 flex flex-col justify-between bg-muted/30 p-4 rounded-md min-w-[140px] border border-slate-200">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Fecha</p>
                                        {isLoading ? <Skeleton className="h-4 w-[80px]" /> : <p className="font-bold text-foreground text-sm">{new Date().toLocaleDateString()}</p>}
                                    </div>
                                    <div className="border bg-background p-2.5 flex flex-col justify-between bg-muted/30 p-4 rounded-md min-w-[140px] border border-slate-200">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Sucursal</p>
                                        {isLoading ? <Skeleton className="h-4 w-[120px]" /> : <p className="font-bold text-foreground text-sm">{note.storeName}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Asymmetric Bento Grid Layout from HTML prototype */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* Left Column: Identity & Responsibility */}
                                <div className="lg:col-span-4 space-y-6">
                                    {/* Company Data Card */}
                                    <div className="bg-card text-card-foreground rounded-xl p-6 shadow-sm border border-border border-l-4 border-l-primary">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Building2 className="text-primary size-5" />
                                            <h2 className="font-bold text-lg text-foreground">Datos de la Empresa</h2>
                                        </div>
                                        <div className="space-y-5">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Razón Social</p>
                                                {isLoading ? <Skeleton className="h-4 w-[250px]" /> : <p className="text-foreground font-semibold text-sm">{empresa?.RazonSocial}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">RFC</p>
                                                {isLoading ? <Skeleton className="h-4 w-[150px]" /> : <p className="text-foreground font-medium font-mono text-sm">{empresa?.RFC}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Dirección Fiscal</p>
                                                {isLoading ? <div className="space-y-1 mt-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-[200px]" /></div> : <p className="text-foreground text-xs leading-relaxed">{empresa?.Calle} {empresa?.Exterior} {empresa?.Interior} {empresa?.Colonia} {empresa?.Ciudad} {empresa?.Estado} {empresa?.CodigoPostal}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Responsible Identification */}
                                    <div className="bg-card text-card-foreground rounded-xl p-6 shadow-sm border border-border">
                                        <div className="flex items-center gap-3 mb-6">
                                            <IdCard className="text-primary size-5" />
                                            <h2 className="font-bold text-lg text-foreground">Identificación</h2>
                                        </div>
                                        {/**Responsable */}
                                        <div className="space-y-4">
                                            <div className="space-y-1.5 focus-within:text-primary transition-colors">
                                                {isLoading ? (
                                                    <div className="flex items-center gap-4 w-full">
                                                        <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
                                                        <div className="flex flex-col space-y-2 w-full justify-center mt-1">
                                                            <Skeleton className="h-4 w-[200px]" />
                                                            <Skeleton className="h-3 w-[140px]" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-4 w-full">
                                                        <Avatar className="size-16 rounded-xl shrink-0 bg-transparent">
                                                            <AvatarImage src={toAbsoluteUrl('/media/avatars/300-2.png')} alt="avatar" className="object-cover bg-transparent" />
                                                            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xl font-bold">CM</AvatarFallback>
                                                        </Avatar>

                                                        <div className="flex flex-col w-full justify-center">
                                                            <h4 className="font-semibold text-sm mb-1 text-foreground leading-none">{user?.Nombre}</h4>

                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1 mb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Mail className="size-3.5 opacity-70" />
                                                                    <span>{user?.CorreoElectronico}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {/**ID Sucursal */}
                                            <div className="space-y-1.5 focus-within:text-primary transition-colors">
                                                <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">ID de Sucursal</Label>
                                                <div className="flex items-center bg-muted/50 rounded-lg p-2.5 border border-transparent focus-within:border-primary/50 transition-all">
                                                    <Store className="text-muted-foreground size-4 mr-3" />
                                                    {isLoading ? <Skeleton className="h-5 w-[140px]" /> : <Input className="bg-transparent border-0 h-auto p-0 focus-visible:ring-0 text-foreground font-medium text-sm shadow-none" readOnly value={store.Guid} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Financials & Action */}
                                <div className="lg:col-span-8 space-y-6">
                                    {/* Financial Overview Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Inventory Panel (Now Dark with Resumen.jsx Gradient) */}
                                        <div className="bg-gradient-to-br from-[#002366] to-[#001233] p-6 rounded-xl shadow-[0_8px_30px_rgba(0,35,102,0.2)] border border-[#002366]/50 text-white relative overflow-hidden flex flex-col">
                                            {/* Subtle overlay pattern/glow */}
                                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-[0.03] blur-2xl pointer-events-none" />
                                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-400 opacity-[0.05] blur-xl pointer-events-none" />

                                            <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-white">
                                                <Package className="w-48 h-48" />
                                            </div>

                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <h2 className="font-bold text-lg text-white mb-0.5 drop-shadow-sm">Inventario Inicial</h2>
                                                        <p className="text-[11px] font-medium text-blue-200/80">Consolidado Total</p>
                                                    </div>
                                                    <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-sm border border-white/5">
                                                        <Package className="text-white size-5" />
                                                    </div>
                                                </div>
                                                <div className="mb-6 h-[56px] flex flex-col justify-end">
                                                    {isLoading ? (
                                                        <div className="space-y-2">
                                                            <Skeleton className="h-9 w-[200px] bg-white/20" />
                                                            <Skeleton className="h-3 w-[150px] bg-white/20" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-sm">{moneyFormat(valorInventario)}</p>
                                                            <p className="text-[10px] text-blue-200/70 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                                <TrendingUp className="size-3.5" /> Actualizado hace 2 min
                                                            </p>
                                                        </>
                                                    )}
                                                </div>

                                            </div>
                                        </div>

                                        {/* Cash Fund Panel (Now Light) */}
                                        <div className="bg-card text-card-foreground rounded-xl p-6 shadow-sm border border-border flex flex-col">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h2 className="font-bold text-lg text-foreground mb-0.5">Fondo de Caja</h2>
                                                    <p className="text-[11px] text-muted-foreground">Efectivo para Operación</p>
                                                </div>
                                                <div className="p-2.5 bg-primary/10 rounded-lg">
                                                    <Wallet className="text-primary size-5" />
                                                </div>
                                            </div>
                                            <div className="mb-6 h-[56px] flex flex-col justify-end">
                                                {isLoading ? (
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-9 w-[180px]" />
                                                        <Skeleton className="h-3 w-[120px]" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <input className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight" type="text" value={fondoCaja} onChange={(e) => setFondoCaja(e.target.value)} onFocus={(e) => setFondoCaja(reverseMoneyFormat(e.target.value))} onBlur={(e) => setFondoCaja(moneyFormat(e.target.value || 0))} />
                                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                            <Check className="size-3.5" /> Monto Autorizado
                                                        </p>
                                                    </>
                                                )}
                                            </div>

                                        </div>
                                    </div>

                                    {/* Action Footer Block */}
                                    <div className="bg-card text-card-foreground rounded-xl p-6 lg:p-8 border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="max-w-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="size-2 rounded-full bg-emerald-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Listo para Apertura</span>
                                            </div>
                                            <p className="text-muted-foreground text-xs leading-relaxed">
                                                Al confirmar, se registrará el inicio de la jornada operativa para la sucursal <strong className="text-foreground">{store?.NombreSucursal}</strong> bajo la responsabilidad de <strong className="text-foreground">{user?.Nombre}</strong>.
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                            <DialogClose asChild>
                                                <Button variant="outline" onClick={logout} className="w-full sm:w-auto h-11 px-6 rounded-lg text-xs font-bold tracking-wider uppercase">
                                                    Cancelar
                                                </Button>
                                            </DialogClose>
                                            <Button onClick={IniciarOperacion} className="w-full sm:w-auto h-11 px-6 rounded-lg font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 group transition-colors">
                                                Confirmar Apertura
                                                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <DialogAlert
                open={openDialogAlert}
                onOpenChange={setOpenDialogAlert}
                title="Apertura de Sucursal"
                description="La sucursal se ha abierto correctamente."

                onCancel={onOpenChange}
                type="success"
            />
        </>
    );
}
