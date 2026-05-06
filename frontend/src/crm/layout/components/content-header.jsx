import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function ContentHeader({ children, className }) {
  return (
    <div className="bg-surface flex items-center border-b z-10 shrink-0 h-14 px-4">
      <div className={cn('flex items-center justify-between grow w-full', className)}>
        {children}
      </div>
    </div>
  );
}
