import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card1, Card2 } from '../special-offers';

export function SpecialOffers() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-lg font-medium text-mono">Ofertas especiales</span>

        <Button mode="link" asChild>
          <Link to="/account/home/get-started" className="text-xs">
            Ver todo <ChevronRight />
          </Link>
        </Button>
      </div>

      <div className="grid xl:grid-cols-2 gap-5 mb-2">
        <div className="lg:col-span-1">
          <Card1 />
        </div>

        <div className="lg:col-span-1">
          <div className="grid sm:grid-cols-2 gap-5 items-stretch">
            <Card2
              logo="https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg"
              title="Nike Dunk Low"
              total="$110.00"
              bgColor="bg-green-50 dark:bg-green-950/30"
              borderColor="border-green-200 dark:border-green-950"
            />

            <Card2
              logo="https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg"
              title="Nike Air Force 1"
              total="$96.99"
              bgColor="bg-primary/10"
              borderColor="border-primary/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
