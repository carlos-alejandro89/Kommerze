import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLayout } from './layout-context';
import { Sidebar } from './sidebar';
import { Footer } from './footer';
import { DialogOpenShop } from './dialog-open-shop';

import { useActivation } from '@/providers/ActivationProvider';

export function Layout() {
  const navigate = useNavigate();
  const { sidebarCollapse } = useLayout();
  const isMobile = useIsMobile();
  const { isStoreOpen, store } = useActivation();
  const [open, setOpen] = useState(() => {
    if (store == null) {
      return false
    }

    return !isStoreOpen
  });

  const handleOpenChange = (value) => {
    setOpen(value);
  };


  useEffect(() => {

    if (store == null) {
      navigate("/sync")
    }
  }, []);

  const rootProps = {
    className: cn(
      'flex grow h-screen flex-col',
      '[--header-height:0px]',
      '[--content-header-height:54px]',
      '[--footer-height:40px]',
      '[--sidebar-width:250px] [--sidebar-width-collapsed:52px] [--sidebar-header-height:54px] [--sidebar-footer-height:45px] [--sidebar-footer-collapsed-height:90px]',
    ),
    ...(sidebarCollapse === true && { 'data-sidebar-collapsed': true }),
  };

  return (
    <>
      <div {...rootProps}>
        <div className="flex flex-1 overflow-hidden">
          {!isMobile && <Sidebar />}
          <main className="flex-1 flex flex-col mt-(--header-height) lg:mt-[calc(var(--header-height)+var(--content-header-height))] lg:ms-(--sidebar-width) lg:in-data-[sidebar-collapsed]:ms-(--sidebar-width-collapsed) transition-[margin,inset] duration-200 ease-in-out relative">
            <div className="flex-1 overflow-y-auto pb-(--footer-height)">
              <Outlet />
            </div>
            <Footer className="fixed bottom-0 start-0 lg:start-(--sidebar-width) lg:in-data-[sidebar-collapsed]:start-(--sidebar-width-collapsed) end-0 z-10 transition-[margin,inset] duration-200 ease-in-out" />
          </main>
        </div>
      </div>
      {store !== null && <DialogOpenShop open={open} onOpenChange={() => { setOpen(false) }} />}
    </>
  );
}
