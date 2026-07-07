'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import promoTerminal from '@/assets/promotion.png';
import promoRetail from '@/assets/promotion2.png';
import promoStore from '@/assets/promotion3.png';

const PROMOTION_SLIDES = [
    {
        title: 'Promoción del día',
        description: 'Impulsa los productos con mayor rotación en caja.',
        image: promoTerminal,
        tag: 'POS',
    },
    {
        title: 'Combo destacado',
        description: 'Agrupa artículos frecuentes para vender más rápido.',
        image: promoRetail,
        tag: 'Retail',
    },
    {
        title: 'Oferta vigente',
        description: 'Mantén visibles tus campañas al momento de vender.',
        image: promoStore,
        tag: 'Promo',
    },
];

export function PromotionsCarousel() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const activePromotion = PROMOTION_SLIDES[activeIndex];

    const goToPrevious = React.useCallback(() => {
        setActiveIndex((index) => (index === 0 ? PROMOTION_SLIDES.length - 1 : index - 1));
    }, []);

    const goToNext = React.useCallback(() => {
        setActiveIndex((index) => (index + 1) % PROMOTION_SLIDES.length);
    }, []);

    React.useEffect(() => {
        const interval = setInterval(goToNext, 4800);
        return () => clearInterval(interval);
    }, [goToNext]);

    return (
        <section className="flex h-full w-full flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                        Promociones
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                        Campañas activas
                    </h2>
                </div>
                <Badge
                    variant="secondary"
                    className="rounded-full border-none bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-none dark:bg-white/10 dark:text-slate-300"
                >
                    {activeIndex + 1}/{PROMOTION_SLIDES.length}
                </Badge>
            </div>

            <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-[22px] border border-white/70 bg-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.10)] dark:border-white/10">
                {PROMOTION_SLIDES.map((promotion, index) => (
                    <div
                        key={promotion.title}
                        className={cn(
                            'absolute inset-0 transition-opacity duration-500',
                            index === activeIndex ? 'opacity-100' : 'opacity-0'
                        )}
                    >
                        <img
                            src={promotion.image}
                            alt={promotion.title}
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
                    </div>
                ))}

                <div className="absolute inset-x-0 bottom-0 p-5">
                    <Badge className="mb-3 rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white shadow-none backdrop-blur">
                        {activePromotion.tag}
                    </Badge>
                    <h3 className="text-xl font-semibold leading-tight text-white">
                        {activePromotion.title}
                    </h3>
                    <p className="mt-2 max-w-[240px] text-xs leading-5 text-white/78">
                        {activePromotion.description}
                    </p>
                </div>

                <div className="absolute right-4 top-4 flex gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={goToPrevious}
                        className="size-8 rounded-full border border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/25 hover:text-white"
                        aria-label="Promoción anterior"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={goToNext}
                        className="size-8 rounded-full border border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/25 hover:text-white"
                        aria-label="Siguiente promoción"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="flex justify-center gap-1.5">
                {PROMOTION_SLIDES.map((promotion, index) => (
                    <button
                        key={promotion.title}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                            'h-1.5 rounded-full transition-all',
                            index === activeIndex
                                ? 'w-6 bg-primary'
                                : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                        )}
                        aria-label={`Ver ${promotion.title}`}
                    />
                ))}
            </div>
        </section>
    );
}
