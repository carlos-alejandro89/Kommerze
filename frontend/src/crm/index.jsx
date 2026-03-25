import { Navigate, Route, Routes } from 'react-router-dom';
import { DefaultLayout } from './layout';
import { CompanyPage } from './pages/companies/company/page';
import { CompaniesListPage } from './pages/companies/page';
import ContactsPage from './pages/contacts/page';
import { Dashboard } from './pages/dashboard/page';
import { DealsPage } from './pages/deals/page';
import { NotesPage } from './pages/notes/page';
import { TasksPage } from './pages/tasks/page';
import { StoreClientPage } from './pages/store-client/home/store-client-page'
import { LoginPage } from './pages/auth/login-page'
import { SyncPage } from './pages/sync/page'
import POSPage from './pages/pos/index'
import { CartStepTwo } from './pages/pos/cart-step-two'
import { CartStepThree } from './pages/pos/cart-step-three'
import { AuthGuard } from '@/components/auth-guard';
import { CartOrderPlaced } from './pages/pos/cart-order-placed';
import { HistoryPage } from './pages/history/page';

export default function CrmModule() {
  return (

    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AuthGuard><DefaultLayout /></AuthGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<StoreClientPage />} />
        <Route path="tasks/" element={<TasksPage />} />
        <Route path="notes/" element={<NotesPage />} />
        <Route path="companies/" element={<CompaniesListPage />} />
        <Route path="company/" element={<CompanyPage />} />
        <Route path="companies/:companyId" element={<CompanyPage />} />
        <Route path="contacts/" element={<ContactsPage />} />
        <Route path="contacts/:contactId" element={<CompanyPage />} />
        <Route path="deals/" element={<DealsPage />} />
        <Route path="sync/" element={<SyncPage />} />
        <Route path="pos/" element={<POSPage />} />
        <Route path="pos/transaction" element={<CartStepTwo />} />
        <Route path="pos/payment" element={<CartStepThree />} />
        <Route path="pos/order-placed" element={<CartOrderPlaced />} />
        <Route path="history/" element={<HistoryPage />} />
      </Route>

    </Routes>
  );
}
