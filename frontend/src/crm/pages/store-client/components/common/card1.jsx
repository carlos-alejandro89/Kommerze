import { Fragment } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';


export function Card1() {


  const items = [
    { logo: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg', brand: 'Madera' },
    { logo: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg', brand: 'X-Trong' },
    { logo: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg', brand: 'Magicolor' },
    { logo: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg', brand: 'Facilita' },
    { logo: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg', brand: 'Industrial' },
    { logo: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg', brand: 'Automotivo' },
    { logo: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg', brand: 'Arquitectonico' },
  ];

  const renderItem = (item, index) => (
    <Card key={index}>
      <CardContent className="flex flex-col items-center justify-center pb-0">
        <div
          onClick={() => showProductDetailsSheet('productid')}
          className="hover:text-primary text-sm font-medium text-mono cursor-pointer"
        >
          {item.brand}
        </div>

        <img
          onClick={() => showProductDetailsSheet('productid')}
          src={toAbsoluteUrl(`${item.logo}`)}
          className="cursor-pointer h-[100px] shrink-0"
          alt="image"
        />
      </CardContent>
    </Card>
  );

  return (
    <Fragment>
      {items.map((item, index) => {
        return renderItem(item, index);
      })}
    </Fragment>
  );
}
