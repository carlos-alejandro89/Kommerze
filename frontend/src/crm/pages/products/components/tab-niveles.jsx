import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Barcode, PlusCircle, Info, Edit2, Trash2, PlusSquare, Image as ImageIcon } from 'lucide-react';
import { CardNivel } from './card-nivel';

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
  unidades: z.coerce.number().min(1, 'Debe ser al menos 1'),
});

export function TabNiveles({ empaques }) {

  const [itemNiveles, setItemNiveles] = useState(() =>
    localStorage.getItem("niveles") ? JSON.parse(localStorage.getItem("niveles")) : []
  );

  const form = useForm({
    resolver: zodResolver(NivelSchema),
    defaultValues: {
      tipoEmpaque: '',
      codigoBarras: '',
      skuNivel: '',
      unidades: 1,
    },
  });

  useEffect(() => {
    localStorage.setItem("niveles", JSON.stringify(itemNiveles));
  }, [itemNiveles]);

  const [openTipo, setOpenTipo] = useState(false);

  const onSubmit = (data) => {
    // console.log('Nivel added:', data);
    const empaque = empaques.find(item => item.Guid === data.tipoEmpaque);
    const nuevoItem = {
      EmpaqueGuid: data.tipoEmpaque,
      title: empaque.NombreEmpaque,
      codigo: data.skuNivel,
      codigoBarras: data.codigoBarras,
      contenido: data.unidades,
      badgeLabel: "Unidad Base",
      badgeColorClass: "text-success",
      isActive: true
    }

    setItemNiveles(prev => {
      const item = prev.find(item => item.EmpaqueGuid === data.tipoEmpaque)
      if (item) {
        return prev.map(item => item.EmpaqueGuid === data.tipoEmpaque ? nuevoItem : item);
      }
      return [...prev, nuevoItem];
    });

    //localStorage.setItem("niveles", JSON.stringify(itemNiveles));

    form.reset();
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
          {itemNiveles && itemNiveles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itemNiveles.map((item, index) => (
                <CardNivel
                  key={index}
                  id={item.Guid}
                  title={item.title}
                  codigo={item.codigo}
                  codigoBarras={item.codigoBarras}
                  contenido={item.contenido}
                  badgeLabel={item.badgeLabel}
                  badgeColorClass={item.badgeColorClass}
                  image="https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg"
                  isActive={item.isActive}
                  onImageUpload={() => console.log('Upload Pieza')}
                  onEdit={() => console.log('Edit Pieza')}
                  onDelete={() => console.log('Delete Pieza')}
                  onToggleActive={() => console.log('Toggle Pieza')}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 h-full min-h-[350px] border-2 border-dashed border-border/60 rounded-xl bg-muted/20">
              <div className="size-16 rounded-full bg-background border shadow-sm flex items-center justify-center mb-5 text-muted-foreground">
                <PlusSquare className="size-6 opacity-70" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">No se han agregado niveles</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                Añade unidades, cajas o pallets usando el formulario lateral para configurar la jerarquía de tus productos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}