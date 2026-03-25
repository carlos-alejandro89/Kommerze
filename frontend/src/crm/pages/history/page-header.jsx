import { ContentHeader } from "../../layout/components/content-header";
import { History } from "lucide-react";

export function PageHeader() {
    return (
        <ContentHeader className="flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="inline-flex items-center gap-2.5 text-sm font-semibold">
                <History className="size-4 text-primary" /> Historial
            </h1>
        </ContentHeader>
    );
}