import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CircleCheckBig, AlertTriangle, XCircle } from 'lucide-react';

const typeConfig = {
    success: {
        icon: CircleCheckBig,
        bgClass: 'bg-[#0BC33F]/10',
        pingBgClass: 'bg-[#0BC33F]/25',
        borderClass: 'border-[#0BC33F]/30',
        textClass: 'text-[#0BC33F]',
        shadowClass: 'shadow-[0_0_40px_rgba(11,195,63,0.3)]'
    },
    error: {
        icon: XCircle,
        bgClass: 'bg-red-500/10 dark:bg-red-500/20',
        pingBgClass: 'bg-red-500/25',
        borderClass: 'border-red-500/30',
        textClass: 'text-red-500 dark:text-red-400',
        shadowClass: 'shadow-[0_0_40px_rgba(239,68,68,0.3)] dark:shadow-[0_0_40px_rgba(239,68,68,0.2)]'
    },
    warning: {
        icon: AlertTriangle,
        bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
        pingBgClass: 'bg-amber-500/25',
        borderClass: 'border-amber-500/30',
        textClass: 'text-amber-500 dark:text-amber-400',
        shadowClass: 'shadow-[0_0_40px_rgba(245,158,11,0.3)] dark:shadow-[0_0_40px_rgba(245,158,11,0.2)]'
    }
};

export function DialogAlert({ open, onOpenChange, title, description, onConfirm, onCancel, type = 'warning' }) {
    const [isPulsing, setIsPulsing] = useState(true);

    useEffect(() => {
        if (open) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [open]);

    const config = typeConfig[type] || typeConfig.warning;
    const Icon = config.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md flex flex-col items-center text-center p-8 gap-0 border-border/60">
                <div className="relative flex items-center justify-center mb-6 mt-2">
                    <div className={`absolute inset-0 ${config.pingBgClass} rounded-full transition-opacity duration-500 ease-out ${isPulsing ? 'animate-ping opacity-75' : 'opacity-0'}`}></div>
                    <div className={`relative w-24 h-24 ${config.bgClass} border ${config.borderClass} rounded-full flex items-center justify-center z-10 ${config.shadowClass}`}>
                        <Icon strokeWidth={2.5} className={`size-12 ${config.textClass} animate-[popScale_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]`} />
                    </div>
                </div>

                <DialogHeader className="flex flex-col items-center text-center space-y-2 mb-8 w-full">
                    <DialogTitle className="text-2xl font-bold tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground font-medium px-4 leading-relaxed">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="flex w-full gap-3 sm:justify-center">
                    {onCancel && (
                        <DialogClose asChild>
                            <Button variant="outline" onClick={onCancel}>
                                De acuerdo
                            </Button>
                        </DialogClose>
                    )}
                    {onConfirm && (
                        <Button className="flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold active:scale-[0.98] transition-transform" onClick={onConfirm}>
                            Continuar
                        </Button>
                    )}
                </DialogFooter>

                <style jsx>{`
                    @keyframes popScale {
                        0% { transform: scale(0.5); opacity: 0; }
                        70% { transform: scale(1.15); opacity: 1; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    )
}