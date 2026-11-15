import { NavLink } from 'react-router-dom';
import { Network, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav({ onAddClick }: { onAddClick?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-area-inset-bottom">
      <div className="grid h-[68px] grid-cols-3 items-center px-2">
        <NavLink to="/" end className={({isActive}) => cn('mx-auto flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-3 text-[11px] font-medium text-muted-foreground', isActive && 'text-primary')}><Network className="h-5 w-5" /><span>Tree</span></NavLink>
        <button type="button" onClick={onAddClick} aria-label="Add person" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="h-5 w-5" /></button>
        <NavLink to="/settings" className={({isActive}) => cn('mx-auto flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-3 text-[11px] font-medium text-muted-foreground', isActive && 'text-primary')}><Settings className="h-5 w-5" /><span>Settings</span></NavLink>
      </div>
    </nav>
  );
}
