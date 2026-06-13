import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, PackageX, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function ModalDetalleInventario({ items, open, onOpenChange }) {
    if (!items || items.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl overflow-hidden rounded-2xl p-0">
                <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-white/50 dark:bg-zinc-900/50">
                    <DialogTitle className="flex items-center gap-2 text-base tracking-tighter text-foreground mb-1">
                        <AlertCircle className="size-5 text-amber-500" />
                        Validación de Inventario
                    </DialogTitle>
                    <DialogDescription className="text-xs font-normal text-secondary-foreground">
                        Algunos productos exceden la existencia actual en la sucursal.
                        Revisa el comparativo a continuación.
                    </DialogDescription>
                </DialogHeader>

                <div className="no-scrollbar overflow-y-auto max-h-[60vh] p-4">
                    <div className="flex flex-col gap-3">
                        {items.map((item, index) => {
                            const isSufficient = item.Existencia >= item.quantity;

                            return (
                                <div
                                    key={item.id || index}
                                    className="group border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all shadow-none overflow-hidden rounded-xl bg-white dark:bg-zinc-950/50"
                                >
                                    <div className="flex items-center flex-wrap justify-between gap-4 p-3 pe-4 relative">

                                        {!isSufficient && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1  z-10"></div>
                                        )}

                                        {/* Left: Image and Info */}
                                        <div className={`flex items-center gap-4 flex-1 min-w-[300px] ${!isSufficient ? 'pl-2' : ''}`}>
                                            <div className="flex items-center justify-center bg-accent/20 dark:bg-accent/10 h-20 w-24 rounded-xl border border-border/50 pos-image-container shrink-0 shadow-sm relative group-hover:scale-[1.02] transition-transform overflow-hidden">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        className="h-full w-full object-cover transition-transform duration-500"
                                                        alt={item.name}
                                                    />
                                                ) : (
                                                    // Placeholder si no tiene imagen
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800">
                                                        <span className="text-xs font-bold text-slate-400 uppercase">Sin Imag.</span>
                                                    </div>
                                                )}


                                            </div>

                                            <div className="flex flex-col gap-1.5 flex-1 p-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-bold text-foreground leading-tight tracking-tight cursor-default">
                                                        {item.name}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                        SKU: <span className="text-[11px] font-mono text-foreground/80">{item.sku}</span>
                                                    </span>
                                                    <span className="h-3 w-px bg-border/60" />
                                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider rounded-md border-none bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                                                        Empaque: {item.empaque}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Quantity Comparsion */}
                                        <div className="flex items-center gap-8 bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-border/40">
                                            <div className="flex flex-col items-end gap-1 min-w-[70px]">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                                    Solicitado
                                                </span>
                                                <span className="text-sm font-black text-foreground tabular-nums leading-none">
                                                    {item.quantity}
                                                </span>
                                            </div>

                                            <div className="h-6 w-px bg-border/80"></div>

                                            <div className="flex flex-col items-end gap-1 min-w-[70px]">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                                    Existencia
                                                </span>
                                                <span className={`text-sm font-black tabular-nums leading-none ${isSufficient ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-500"}`}>
                                                    {item.Existencia}
                                                </span>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-border/50 bg-white dark:bg-zinc-900/50 flex justify-end">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="px-6 font-bold shadow-none"
                    >
                        Aceptar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}