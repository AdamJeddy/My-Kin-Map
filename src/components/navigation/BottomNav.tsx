import { NavLink } from 'react-router-dom';
import { Network, Search, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav({ onAddClick }: { onAddClick?: () => void }) {
  const items = [{ to: '/', icon: Network, label: 'Tree' }, { to: '/search', icon: Search, label: 'People' }, { to: '/settings', icon: Settings, label: 'Settings' }];
  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-area-inset-bottom">
      <div className="flex h-[68px] items-center justify-around px-2">
        {items.map(({to, icon: Icon, label}, index) => (
          <div key={to} className="contents">
            {index === 2 && <button onClick={onAddClick} aria-label="Add person" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="h-5 w-5" /></button>}
            <NavLink to={to} end={to === '/'} className={({isActive}) => cn('flex min-w-15 flex-col items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-medium text-muted-foreground', isActive && 'text-primary')}><Icon className="h-5 w-5" /><span>{label}</span></NavLink>
          </div>
        ))}
      </div>
    </nav>
  );
}
