import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CircleCheckBig, AlertTriangle, XCircle } from 'lucide-react';

const typeConfig = {
    success: {
        icon: CircleCheckBig,
        headerClass: 'bg-emerald-500/[.04]',
        bgClass: 'bg-emerald-500/10',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        confirmClass: 'bg-emerald-600 text-white hover:bg-emerald-700'
    },
    error: {
        icon: XCircle,
        bgClass: 'bg-red-500/10 dark:bg-red-500/20',
        headerClass: 'bg-red-500/[.04]',
        textClass: 'text-red-500 dark:text-red-400',
        confirmClass: 'bg-red-600 text-white hover:bg-red-700'
    },
    warning: {
        icon: AlertTriangle,
        bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
        headerClass: 'bg-amber-500/[.04]',
        textClass: 'text-amber-500 dark:text-amber-400',
        confirmClass: ''
    }
};

export function DialogAlert({ open, onOpenChange, title, description, onConfirm, onCancel, type = 'warning' }) {
    const config = typeConfig[type] || typeConfig.warning;
    const Icon = config.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl sm:max-w-md">
                <DialogHeader className={`border-b border-border/70 px-6 py-5 text-left ${config.headerClass}`}>
                    <div className="flex items-start gap-4">
                        <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${config.bgClass} ${config.textClass}`}>
                            <Icon strokeWidth={2} className="size-5" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <DialogTitle className="text-base font-bold tracking-tight">{title}</DialogTitle>
                            <DialogDescription className="mt-1.5 p-0 text-xs font-normal leading-5 text-muted-foreground">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <DialogFooter className="gap-2 bg-muted/20 px-6 py-4 sm:justify-end">
                    {onCancel && (
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl px-5 text-xs font-semibold"
                                onClick={onCancel}
                            >
                                {onConfirm ? 'Cancelar' : 'Entendido'}
                            </Button>
                        </DialogClose>
                    )}
                    {onConfirm && (
                        <Button
                            className={`h-10 rounded-xl px-5 text-xs font-semibold ${config.confirmClass}`}
                            onClick={onConfirm}
                        >
                            Confirmar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
