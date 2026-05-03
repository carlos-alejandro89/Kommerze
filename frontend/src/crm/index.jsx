import { Navigate, Route, Routes } from 'react-router-dom';
import { DefaultLayout } from './layout';

import { ProductsPage } from './pages/products/page';
import { CreateProductPage } from './pages/products/create-page';
import { StoreClientPage } from './pages/store-client/home/store-client-page'
import { LoginPage } from './pages/auth/login-page'
import { SyncPage } from './pages/sync/page'
import POSPage from './pages/pos/index'
import { CartStepTwo } from './pages/pos/cart-step-two'
import { CartStepThree } from './pages/pos/cart-step-three'
import { AuthGuard } from '@/components/auth-guard';
import { CartOrderPlaced } from './pages/pos/cart-order-placed';
import { HistoryPage } from './pages/history/page';
import { LicenseActivationPage } from './pages/license-activation/license-activation-page';
import { SettingsPage } from './pages/settings/page';


export default function CrmModule() {
  return (

    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="license/activate" element={<LicenseActivationPage />} />

      <Route element={<AuthGuard><DefaultLayout /></AuthGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<StoreClientPage />} />
        <Route path="products/" element={<ProductsPage />} />
        <Route path="products/new" element={<CreateProductPage />} />

        <Route path="sync/" element={<SyncPage />} />
        <Route path="pos/" element={<POSPage />} />
        <Route path="pos/transaction" element={<CartStepTwo />} />
        <Route path="pos/payment" element={<CartStepThree />} />
        <Route path="pos/order-placed" element={<CartOrderPlaced />} />
        <Route path="history/" element={<HistoryPage />} />
        <Route path="settings/" element={<SettingsPage />} />
      </Route>

    </Routes>
  );
}
