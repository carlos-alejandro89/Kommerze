import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Store, MapPin, Check } from "lucide-react";

export function DialogSucursales({ sucursales = [], handleSelectSucursal }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);


    const filteredSucursales = useMemo(() => {
        if (!Array.isArray(sucursales)) return [];
        return sucursales.filter(s => {
            const nombre = s.NombreSucursal || "";
            const direccionCompleta = `${s.Calle || ""} ${s.Exterior || ""} ${s.Colonia || ""} ${s.Ciudad || ""} ${s.Estado || ""}`;
            return nombre.toLowerCase().includes(search.toLowerCase()) ||
                direccionCompleta.toLowerCase().includes(search.toLowerCase());
        });
    }, [search, sucursales]);

    const handleSelect = () => {
        const selected = filteredSucursales.find(s => s.ID === selectedId);
        if (selected && handleSelectSucursal) {
            handleSelectSucursal(selected);
        }
        setOpen(false);
    };

    const getDireccion = (s) => {
        const parts = [
            s.Calle,
            s.Exterior ? `#${s.Exterior}` : "",
            s.Colonia ? `Col. ${s.Colonia}` : "",
            s.Ciudad,
            s.Estado
        ].filter(Boolean);
        return parts.join(", ") || "Sin dirección";
    };

    return (
        <div className="flex items-center justify-center -my-1">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="link"
                        className="h-auto p-0 text-[10px] font-bold uppercase text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 shrink-0"
                    >
                        Cambiar sucursal
                    </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false} className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-background">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Store className="size-5 text-emerald-500" />
                            Seleccionar Sucursal Destino
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">Busca y elige la sucursal a la que se destinará esta operación.</p>
                    </DialogHeader>

                    <div className="p-4 border-b bg-muted/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o dirección..."
                                className="pl-9 bg-background h-10 w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="h-[320px]">
                        <div className="p-4 flex flex-col gap-2">
                            {filteredSucursales.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center gap-3">
                                    <Store className="size-8 opacity-20" />
                                    No se encontraron sucursales
                                </div>
                            ) : (
                                filteredSucursales.map(sucursal => (
                                    <div
                                        key={sucursal.ID}
                                        onClick={() => setSelectedId(sucursal.ID)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-muted/50 ${selectedId === sucursal.ID ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-border'}`}
                                    >
                                        <div className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${selectedId === sucursal.ID ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Store className="size-5 stroke-[1.5]" />
                                        </div>
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-bold text-sm text-foreground truncate mr-2">{sucursal.NombreSucursal}</span>
                                                {selectedId === sucursal.ID && <Check className="size-4 text-emerald-500 shrink-0" />}
                                            </div>
                                            <div className="flex items-start gap-1.5 mt-1 text-xs text-muted-foreground">
                                                <MapPin className="size-3.5 shrink-0 opacity-70 mt-0.5" />
                                                <span className="leading-tight line-clamp-2">{getDireccion(sucursal)}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground/80">
                                                <span>{sucursal.Correo === "<nil>" || !sucursal.Correo ? "Sin correo" : sucursal.Correo}</span>
                                                <span className="size-1 rounded-full bg-muted-foreground/30 block" />
                                                <span>{sucursal.Telefono || "Sin teléfono"}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-4 border-t bg-muted/10 flex sm:justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSelect} disabled={!selectedId}>Seleccionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}