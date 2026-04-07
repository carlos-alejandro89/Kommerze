import { ContentHeader } from "../../layout/components/content-header";
import { Box } from "lucide-react";
export function PageHeader() {
    return (
        <ContentHeader className="space-x-2">
            <h1 className="inline-flex items-center gap-2.5 text-sm font-semibold">
                <Box className="size-4 text-primary" /> Productos
            </h1>


        </ContentHeader>
    );
}