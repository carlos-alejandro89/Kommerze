import { Content } from "@/crm/layout/components/content";
import { PageHeader } from "./page-header";
export function ProductsPage() {
    return (
        <>
            <PageHeader />
            <Content className="flex flex-col pt-4 pb-0">
                <h1>Productos</h1>
            </Content>
        </>
    );
}