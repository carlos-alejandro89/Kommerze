import { Content } from '@/crm/layout/components/content';
import { StoreClientContent } from '.';

export function StoreClientPage() {
  return (
    <div className="container-fluid">
    <Content  className="flex flex-col pt-0 pb-0">
      <StoreClientContent />
    </Content>
    </div>
  );
}
