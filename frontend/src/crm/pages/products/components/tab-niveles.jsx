import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Barcode, PlusCircle, Info, Edit2, Trash2, PlusSquare } from 'lucide-react';

import { Button, ButtonArrow } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Form Schema for "Añadir Nivel"
const NivelSchema = z.object({
  tipoEmpaque: z.string().min(1, 'Seleccione un tipo'),
  codigoBarras: z.string().optional(),
  skuNivel: z.string().min(1, 'El SKU es requerido'),
  unidades: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1, 'Debe ser al menos 1')),
});

const mockTiposEmpaque = [
  { value: 'pieza', label: 'Pieza' },
  { value: 'caja', label: 'Caja' },
  { value: 'master', label: 'Master' },
  { value: 'pallet', label: 'Pallet' },
];

export function TabNiveles({ empaques }) {
  console.log("Empaques: ", empaques);
  const form = useForm({
    resolver: zodResolver(NivelSchema),
    defaultValues: {
      tipoEmpaque: '',
      codigoBarras: '',
      skuNivel: '',
      unidades: 1,
    },
  });

  const [openTipo, setOpenTipo] = useState(false);

  const onSubmit = (data) => {
    console.log('Nivel added:', data);
  };

  return (
    <div className="py-4 max-w-6xl mx-auto pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Side: Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-5">Añadir Nivel</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                <FormField
                  control={form.control}
                  name="tipoEmpaque"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de Empaque</FormLabel>
                      <Popover open={openTipo} onOpenChange={setOpenTipo}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                            >
                              <span className="truncate pr-2">
                                {field.value
                                  ? empaques.find((item) => item.Guid === field.value)?.NombreEmpaque
                                  : "Seleccionar tipo..."}
                              </span>
                              <ButtonArrow />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar tipo..." />
                            <CommandList>
                              <CommandEmpty>No se encontró el tipo.</CommandEmpty>
                              <CommandGroup>
                                {empaques.map((item) => (
                                  <CommandItem
                                    value={item.NombreEmpaque}
                                    key={item.Guid}
                                    onSelect={() => {
                                      form.setValue("tipoEmpaque", item.Guid);
                                      setOpenTipo(false);
                                    }}
                                  >
                                    {item.NombreEmpaque}
                                    {item.Guid === field.value && <CommandCheck className="ml-auto" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigoBarras"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Código de Barras</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input placeholder="Ej. 750100012345" className="pr-10" {...field} />
                        </FormControl>
                        <Barcode className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="skuNivel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SKU Nivel</FormLabel>
                        <FormControl>
                          <Input placeholder="ADM-001-PZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unidades"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unidades</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-3">
                  <Button type="submit" className="w-full font-bold h-11 bg-gradient-to-br from-[#002366] to-[#001233] text-white hover:from-[#001233] hover:to-[#00113a] shadow-[0_4px_14px_rgba(0,35,102,0.2)] border-none transition-all active:scale-[0.98]">
                    <PlusCircle className="mr-2 size-4" />
                    Registrar Nivel
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="bg-muted/50 p-5 rounded-xl border flex items-start gap-4">
            <Info className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Jerarquía de Empaque</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Defina los niveles desde la unidad más pequeña (Pieza) hasta el contenedor mayor (Master/Pallet) para una correcta gestión de inventario y picking.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Grid */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Pieza */}
            <div className="w-full rounded-xl border border-primary ring-1 ring-primary/10 bg-background p-2.5 flex flex-col justify-between transition-all hover:shadow-md">
              <div className="mb-1">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded bg-muted flex items-center justify-center overflow-hidden">
                      <div className="bg-primary/10 w-full h-full"></div>
                    </div>
                    <div className="font-semibold text-sm">Pieza Individual</div>
                  </div>
                  <Switch defaultChecked className="scale-75 origin-right" />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full uppercase tracking-tighter">
                    Unidad Base
                  </span>
                </div>

                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50">
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-0.5">EmpaqueID</div>
                    <div className="font-medium text-foreground">EMP-001-PZ</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-0.5">Código Barras</div>
                    <div className="font-medium text-foreground">750102394851</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 mt-auto pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex gap-1">
                  <button className="flex items-center justify-center size-6 rounded hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground hover:border-primary">
                    <Edit2 className="size-3.5" />
                  </button>
                  <button className="flex items-center justify-center size-6 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground hover:border-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <span className="shrink-0 text-xs">Contenido: <strong className="text-foreground">1 u.</strong></span>
              </div>
            </div>

            {/* Caja */}
            <div className="w-full rounded-xl border border-primary ring-1 ring-primary/10 bg-background p-2.5 flex flex-col justify-between transition-all hover:shadow-md">
              <div className="mb-1">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded bg-muted flex items-center justify-center overflow-hidden">
                      <div className="bg-sky-500/10 w-full h-full"></div>
                    </div>
                    <div className="font-semibold text-sm">Caja Display</div>
                  </div>
                  <Switch defaultChecked className="scale-75 origin-right" />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-sky-500 px-2 py-0.5 bg-sky-500/10 rounded-full uppercase tracking-tighter">
                    Nivel Medio
                  </span>
                </div>

                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50">
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-0.5">EmpaqueID</div>
                    <div className="font-medium text-foreground">EMP-001-CJ</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-0.5">Código Barras</div>
                    <div className="font-medium text-foreground">750102394860</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 mt-auto pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex gap-1">
                  <button className="flex items-center justify-center size-6 rounded hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground">
                    <Edit2 className="size-3.5" />
                  </button>
                  <button className="flex items-center justify-center size-6 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <span className="shrink-0 text-xs">Contenido: <strong className="text-foreground">12 u.</strong></span>
              </div>
            </div>

            {/* Master */}
            <div className="w-full rounded-xl border border-dashed border-border bg-background/40 p-2.5 flex flex-col justify-between transition-all opacity-70 hover:opacity-100 group">
              <div className="mb-1">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded bg-muted flex items-center justify-center overflow-hidden">
                      <div className="bg-muted-foreground/10 w-full h-full"></div>
                    </div>
                    <div className="font-semibold text-sm text-muted-foreground">Master Case</div>
                  </div>
                  <Switch className="scale-75 origin-right" />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded-full uppercase tracking-tighter">
                    Inactivo
                  </span>
                </div>

                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50">
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-0.5">EmpaqueID</div>
                    <div className="font-medium text-muted-foreground">EMP-001-MS</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-0.5">Código Barras</div>
                    <div className="font-medium text-muted-foreground">750102394899</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 mt-auto pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex gap-1">
                  <button className="flex items-center justify-center size-6 rounded hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground">
                    <Edit2 className="size-3.5" />
                  </button>
                  <button className="flex items-center justify-center size-6 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <span className="shrink-0 text-xs">Contenido: <strong className="text-muted-foreground">48 u.</strong></span>
              </div>
            </div>

            {/* Add Level Quick Button */}
            <div className="w-full rounded-xl border border-dashed bg-background p-2.5 flex flex-col items-center justify-center min-h-[175px] text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer group">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all mb-2">
                <PlusSquare className="size-4" />
              </div>
              <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Nuevo Nivel de Empaque</p>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mt-1">Configuración Rápida</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}