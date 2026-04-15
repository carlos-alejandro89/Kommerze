import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info, PlusCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Validation schema for a dynamic Key-Value structure
const CaracteristicasSchema = z.object({
  atributos: z.array(
    z.object({
      clave: z.string().min(1, 'Requerido'),
      valor: z.string().min(1, 'Requerido'),
    })
  ),
});

export function TabCaracteristicas({ onValid }) {
  const form = useForm({
    resolver: zodResolver(CaracteristicasSchema),
    defaultValues: {
      atributos: [
        { clave: 'Material', valor: 'Acero Inoxidable 316L' },
        { clave: 'Acabado', valor: 'Cepillado Mate' },
        { clave: 'Origen', valor: 'Alemania' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "atributos",
  });

  const onSubmit = (data) => {
    localStorage.setItem("caracteristicas", JSON.stringify(data));
    var nivelesEmpaque = JSON.parse(localStorage.getItem("niveles"));
    var product = JSON.parse(localStorage.getItem("product"));

    var nivelesRequest = nivelesEmpaque.map(i => {
      const r = { EmpaqueGuid: i.EmpaqueGuid, Codigo: i.codigo, CodigoBarras: i.codigoBarras, imagen: "" }
      return r;
    })

    /**
     *{
  "marcaGuid": "string",
  "lineaGuid": "string",
  "productoSatGuid": "string",
  "prefijo": "string",
  "descripcion": "string",
  "objetoImpuesto": "string",
  "fraccionable": true,
  "nivelesEmpaque": [
    {
      
      "empaqueGuid": "string",
      "codigo": "string",
      "codigoBarras": "string",
      "imagen": "string"
    }
  ]
}
     */

    var request = {
      MarcaGuid: product.marca,
      LineaGuid: product.linea,
      ProductoSatGuid: product.productoSAT,
      Prefijo: product.prefijo,
      Descripcion: product.descripcion,
      ObjetoImpuesto: product.objetoImpuesto,
      Fraccionable: product.fraccionable,
      NivelesEmpaque: nivelesRequest,
      Atributos: data.atributos,
    }


    console.log(request);

    if (onValid) onValid(request);
  };

  return (
    <div className="py-4 max-w-4xl mx-auto pb-12">
      <section className="bg-card rounded-xl p-8 border shadow-sm">
        <Form {...form}>
          <form id="form-caracteristicas" onSubmit={form.handleSubmit(onSubmit)}>

            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Info className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-foreground font-headline">Información Producto</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-primary hover:text-primary hover:bg-primary/10 font-bold"
                onClick={() => append({ clave: '', valor: '' })}
              >
                <PlusCircle className="mr-2 size-4" />
                Agregar campo
              </Button>
            </div>

            {/* Campos Dinámicos JSON */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-start group">

                  {/* Clave */}
                  <div className="col-span-12 sm:col-span-4">
                    <FormField
                      control={form.control}
                      name={`atributos.${index}.clave`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && (
                            <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Clave</FormLabel>
                          )}
                          <FormControl>
                            <Input placeholder="Ej. Material" className="font-medium" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Valor */}
                  <div className="col-span-12 sm:col-span-7">
                    <FormField
                      control={form.control}
                      name={`atributos.${index}.valor`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && (
                            <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Valor</FormLabel>
                          )}
                          <FormControl>
                            <Input placeholder="Ej. Plástico ABS" className="font-medium" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Acciones por fila */}
                  <div className={`col-span-12 sm:col-span-1 flex sm:justify-end ${index === 0 ? 'sm:pt-6' : 'sm:pt-0'}`}>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground opacity-50 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Eliminar campo</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                </div>
              ))}

              {/* Vacío visual */}
              {fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p className="text-sm">No existen atributos personalizados.</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => append({ clave: '', valor: '' })}
                  >
                    Agregar el primer campo
                  </Button>
                </div>
              )}
            </div>

          </form>
        </Form>
      </section>
    </div>
  );
}