import { ShoppingCart, Star } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';


export function Card2({ badge, logo, title, total, star, label }) {


  return (
    <Card>
      <CardContent className="flex flex-col justify-between p-2.5 gap-4">
        <div className="mb-2.5">
          <Card className="flex items-center justify-center relative bg-accent/50 w-full h-[180px] mb-4  shadow-none">
            {badge && (
              <Badge
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 uppercase shrink-0"
              >
                save 40%
              </Badge>
            )}

            <img
             
              src={toAbsoluteUrl(`${logo}`)}
              className="h-[180px] shrink-0 cursor-pointer"
              alt="image"
            />
          </Card>

          <div
          
            className="hover:text-primary text-sm font-medium text-mono px-2.5 leading-5.5 block cursor-pointer"
          >
            {title}
          </div>
        </div>

        <div className="flex items-center flex-wrap justify-between gap-5 px-2.5 pb-1">
          <Badge
            size="sm"
            variant="warning"
            shape="circle"
            className="rounded-full gap-1"
          >
            <Star
              className="text-white -mt-0.5"
              style={{ fill: 'currentColor' }}
            />{' '}
            {star}
          </Badge>

          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-normal text-secondary-foreground line-through pt-[1px]">
              {label}
            </span>
            <span className="text-sm font-medium text-mono">${total}</span>

            <Button
              size="sm"
              variant="outline"
              className="ms-1"
             
            >
              <ShoppingCart /> Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
