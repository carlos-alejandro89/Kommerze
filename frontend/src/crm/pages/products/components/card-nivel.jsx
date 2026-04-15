import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CardNivel({
  title,
  codigo,
  codigoBarras,
  contenido,
  image = null,
  badgeLabel,
  badgeColorClass = "text-primary",
  isActive = true,
  isDashed = false,
  onImageUpload,
  onEdit,
  onDelete,
  onToggleActive
}) {
  const [activeState, setActiveState] = useState(isActive);

  const handleToggle = (checked) => {
    setActiveState(checked);
    if (onToggleActive) onToggleActive(checked);
  };

  return (
    <div className={cn(
      "w-full rounded-xl flex flex-col overflow-hidden transition-all hover:shadow-md border",
      isDashed
        ? "border-dashed border-border bg-background/40 opacity-70 hover:opacity-100 group/card"
        : "border-primary ring-1 ring-primary/10 bg-background"
    )}>
      {/* Image Area */}
      <div
        className={cn(
          "h-32 w-full flex items-center justify-center relative group border-b border-border",
          image ? "bg-muted" : "cursor-pointer transition-colors",
          !image && !isDashed && "bg-primary/5 hover:bg-primary/10",
          !image && isDashed && "bg-muted/30 group-hover/card:bg-muted/50"
        )}
        onClick={!image ? onImageUpload : undefined}
      >
        {image ? (
          <>
            <img src={image} alt={title} className="h-full object-contain" />
            <div
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={onImageUpload}
            >
              <ImageIcon className="size-6 text-white" />
            </div>
          </>
        ) : (
          <div className={cn(
            "flex flex-col items-center justify-center transition-colors",
            isDashed
              ? "text-muted-foreground/60 group-hover/card:text-muted-foreground"
              : "text-primary/60 group-hover:text-primary"
          )}>
            <ImageIcon className="size-6 mb-1.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Subir</span>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 z-10">
          <span className={cn(
            "text-[9px] font-bold px-2 py-0.5 bg-background shadow-sm rounded-full uppercase tracking-widest",
            badgeColorClass
          )}>
            {badgeLabel}
          </span>
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Switch
            checked={activeState}
            onCheckedChange={handleToggle}
            className="scale-75 origin-top-right"
          />
        </div>
      </div>

      {/* Info Area */}
      <div className="p-3 flex flex-col flex-1">
        <div className={cn("font-bold text-sm mb-3 leading-5", isDashed ? "text-muted-foreground" : "text-foreground")}>
          {title}
        </div>

        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div>
            <div className="text-[9px] font-bold uppercase opacity-80 mb-0.5">SKU NIVEL</div>
            <div className={cn("font-medium", isDashed ? "text-muted-foreground" : "text-foreground")}>{codigo}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase opacity-80 mb-0.5">Código Barras</div>
            <div className={cn("font-medium", isDashed ? "text-muted-foreground" : "text-foreground")}>{codigoBarras}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 mt-3 pt-2 text-xs border-t border-border/50 text-muted-foreground">
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className={cn("flex items-center justify-center size-7 rounded transition-colors text-muted-foreground",
                isDashed ? "hover:bg-primary hover:text-primary-foreground" : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
              )}
            >
              <Edit2 className="size-3.5" />
            </button>
            <button
              onClick={onDelete}
              className={cn("flex items-center justify-center size-7 rounded transition-colors text-muted-foreground",
                isDashed ? "hover:bg-destructive hover:text-destructive-foreground" : "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
              )}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <span className="shrink-0 text-xs">Contenido: <strong className={isDashed ? "text-muted-foreground" : "text-foreground"}>{contenido}</strong></span>
        </div>
      </div>
    </div>
  );
}
