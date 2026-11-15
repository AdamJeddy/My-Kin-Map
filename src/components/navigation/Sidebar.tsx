import { NavLink } from 'react-router-dom';
import { Network, Search, Settings, Plus, ChevronLeft, ChevronRight, Sprout, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps { onAddClick?: () => void }

export function Sidebar({ onAddClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const items = [
    { to: '/', icon: Network, label: 'Family tree' },
    { to: '/search', icon: Search, label: 'People' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];
  return (
    <aside className={cn('h-screen shrink-0 bg-[#193c2d] text-[#f5f5e9] flex flex-col transition-[width] duration-200', collapsed ? 'w-16' : 'w-56')}>
      <div className={cn('flex items-center gap-2.5 px-4 pt-6 pb-6', collapsed && 'px-3 justify-center')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dbe8cb] text-[#234d36]"><Sprout className="h-[18px] w-[18px]" /></span>
        {!collapsed && <div><div className="font-display text-lg leading-none">My Kin Map</div><p className="mt-1 text-[11px] text-[#c1d2c3]">Your family, connected</p></div>}
      </div>
      <div className="px-3">
        <button onClick={onAddClick} aria-label="Add person" className={cn('flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#dfebd3] px-3 text-sm font-semibold text-[#1b412d] hover:bg-white transition-colors', collapsed && 'px-0')}>
          <Plus className="h-4 w-4" />{!collapsed && 'Add a person'}
        </button>
      </div>
      <nav aria-label="Main navigation" className="flex-1 px-3 pt-6 space-y-1">
        {!collapsed && <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#b2c8b7]">EXPLORE</p>}
        {items.map(({to, icon: Icon, label}) => <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined} className={({isActive}) => cn('flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors text-[#d0ded1] hover:bg-white/10 hover:text-white', isActive && 'bg-white/14 text-white font-semibold', collapsed && 'justify-center')}><Icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && label}</NavLink>)}
      </nav>
      <div className="mx-3 border-t border-white/15 py-4">
        {!collapsed && <div className="flex items-center gap-2 px-3 pb-4 text-xs text-[#c0d1c3]"><LockKeyhole className="h-3.5 w-3.5" /> Stored on this device</div>}
        <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} className={cn('flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-[#d0ded1] hover:bg-white/10', collapsed && 'mx-auto')}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> Collapse sidebar</>}
        </button>
      </div>
    </aside>
  );
}
