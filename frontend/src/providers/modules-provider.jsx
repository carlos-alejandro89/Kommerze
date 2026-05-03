import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ScreenLoader } from '@/components/screen-loader';

const LazyCrmModule = lazy(() => import('@/crm'));

export function ModulesProvider() {
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <Suspense fallback={<ScreenLoader />}>
            <LazyCrmModule />
          </Suspense>
        }
      />
    </Routes>
  );
}
