import { memo, useMemo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
import type { Person } from '@/types';

export interface CoupleNodeData extends Record<string, unknown> {
  person1: Person;
  person2: Person;
  isRoot?: boolean;
  isSelected?: boolean;
  compact?: boolean;
  orientation?: 'horizontal' | 'vertical';
  onPersonClick?: (person: Person) => void;
  onPersonDoubleClick?: (person: Person) => void;
}

export type CoupleNode = Node<CoupleNodeData, 'couple'>;

interface CoupleNodeProps {
  data: CoupleNodeData;
  selected?: boolean;
}

function CoupleNodeComponent({ data, selected }: CoupleNodeProps) {
  const { person1, person2, isRoot, compact, orientation = 'vertical', onPersonClick, onPersonDoubleClick } = data;

  // Create object URLs for photos
  const photo1Url = useMemo(() => {
    if (person1.photoThumbnail) {
      return URL.createObjectURL(person1.photoThumbnail);
    }
    if (person1.photo) {
      return URL.createObjectURL(person1.photo);
    }
    return null;
  }, [person1.photo, person1.photoThumbnail]);

  const photo2Url = useMemo(() => {
    if (person2.photoThumbnail) {
      return URL.createObjectURL(person2.photoThumbnail);
    }
    if (person2.photo) {
      return URL.createObjectURL(person2.photo);
    }
    return null;
  }, [person2.photo, person2.photoThumbnail]);

  // Get initials
  const initials1 = useMemo(() => {
    const first = person1.givenNames?.charAt(0) || '';
    const last = person1.surname?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }, [person1.givenNames, person1.surname]);

  const initials2 = useMemo(() => {
    const first = person2.givenNames?.charAt(0) || '';
    const last = person2.surname?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }, [person2.givenNames, person2.surname]);

  // Format birth year
  const birthYear1 = person1.birth?.date?.match(/\d{4}/)?.[0];
  const birthYear2 = person2.birth?.date?.match(/\d{4}/)?.[0];

  const isHorizontal = orientation === 'horizontal';

  if (compact) {
    // Compact mobile view - stack vertically
    return (
      <div
        className={cn(
          'px-3 py-2 rounded-xl border bg-card shadow-sm min-w-[140px] max-w-[160px]',
          'transition-all duration-200',
          selected && 'ring-2 ring-primary ring-offset-2',
          isRoot && 'border-primary',
          !isRoot && 'border-border'
        )}
      >
        <Handle
          type="target"
          position={isHorizontal ? Position.Left : Position.Top}
          className="!bg-muted-foreground !w-2 !h-2"
        />
        <Handle
          type="source"
          position={isHorizontal ? Position.Right : Position.Bottom}
          className="!bg-muted-foreground !w-2 !h-2"
        />

        <div className="space-y-2">
          {/* Person 1 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPersonClick?.(person1);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onPersonDoubleClick?.(person1);
            }}
            className="flex items-center gap-2 w-full hover:bg-accent/50 rounded p-1 transition-colors"
          >
            <Avatar className="h-7 w-7 flex-shrink-0">
              {photo1Url && <AvatarImage src={photo1Url} alt={person1.givenNames} />}
              <AvatarFallback className="bg-accent text-primary text-xs font-semibold">{initials1}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold truncate">
                {person1.givenNames}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {person1.surname}
              </p>
            </div>
          </button>

          {/* Connector */}
          <div className="text-center text-xs text-muted-foreground font-semibold">&</div>

          {/* Person 2 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPersonClick?.(person2);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onPersonDoubleClick?.(person2);
            }}
            className="flex items-center gap-2 w-full hover:bg-accent/50 rounded p-1 transition-colors"
          >
            <Avatar className="h-7 w-7 flex-shrink-0">
              {photo2Url && <AvatarImage src={photo2Url} alt={person2.givenNames} />}
              <AvatarFallback className="bg-accent text-primary text-xs font-semibold">{initials2}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold truncate">
                {person2.givenNames}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {person2.surname}
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Show both people at equal weight while keeping the couple a single tree node.
  return (
    <div className={cn('w-[300px] rounded-xl border bg-card p-3 shadow-sm', selected && 'ring-2 ring-primary ring-offset-2', isRoot ? 'border-primary' : 'border-border')}>
      <Handle type="target" position={isHorizontal ? Position.Left : Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="source" position={isHorizontal ? Position.Right : Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="grid grid-cols-2 divide-x">
        {[
          { person: person1, photo: photo1Url, initials: initials1, year: birthYear1 },
          { person: person2, photo: photo2Url, initials: initials2, year: birthYear2 },
        ].map(({ person, photo, initials, year }) => (
          <button key={person.id} type="button" onClick={(event) => { event.stopPropagation(); onPersonClick?.(person); }}
            onDoubleClick={(event) => { event.stopPropagation(); onPersonDoubleClick?.(person); }}
            className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-1 text-center transition-colors hover:bg-accent/50">
            <Avatar className="h-10 w-10 shrink-0">
              {photo && <AvatarImage src={photo} alt={person.givenNames} />}
              <AvatarFallback className="bg-accent text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="w-full truncate text-sm font-semibold">{person.givenNames} {person.surname}</span>
            {year && <span className="text-xs text-muted-foreground">b. {year}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export const CoupleNode = memo(CoupleNodeComponent);
