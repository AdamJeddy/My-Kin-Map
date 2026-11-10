import { memo, useMemo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
import type { Person } from '@/types';

export interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  isRoot?: boolean;
  isSelected?: boolean;
  compact?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export type PersonNode = Node<PersonNodeData, 'person'>;

interface PersonNodeProps {
  data: PersonNodeData;
  selected?: boolean;
}

function PersonNodeComponent({ data, selected }: PersonNodeProps) {
  const { person, isRoot, compact, orientation = 'vertical' } = data;

  // Create object URL for photo if available
  const photoUrl = useMemo(() => {
    if (person.photoThumbnail) {
      return URL.createObjectURL(person.photoThumbnail);
    }
    if (person.photo) {
      return URL.createObjectURL(person.photo);
    }
    return null;
  }, [person.photo, person.photoThumbnail]);

  // Get initials for avatar fallback
  const initials = useMemo(() => {
    const first = person.givenNames?.charAt(0) || '';
    const last = person.surname?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }, [person.givenNames, person.surname]);

  // Format birth year
  const birthYear = person.birth?.date?.match(/\d{4}/)?.[0];
  const deathYear = person.death?.date?.match(/\d{4}/)?.[0];
  const lifespan = birthYear 
    ? deathYear 
      ? `${birthYear}–${deathYear}`
      : `b. ${birthYear}`
    : null;

  // Determine handle positions based on orientation
  const isHorizontal = orientation === 'horizontal';

  if (compact) {
    // Compact mobile view
    return (
      <div
        className={cn(
          'px-3 py-2 rounded-xl border bg-card shadow-sm min-w-[120px] max-w-[140px]',
          'transition-all duration-200',
          selected && 'ring-2 ring-primary ring-offset-2',
          isRoot && 'border-primary',
          !isRoot && 'border-border'
        )}
      >
        {/* Handles for connections */}
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

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            {photoUrl && <AvatarImage src={photoUrl} alt={person.givenNames} />}
            <AvatarFallback className="bg-accent text-primary text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {person.givenNames}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {person.surname}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full desktop view
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl border bg-card shadow-sm min-w-[180px] max-w-[200px]',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-lg',
        selected && 'ring-2 ring-primary ring-offset-2',
        isRoot && 'border-primary',
        !isRoot && 'border-border'
      )}
    >
      {/* Handles for connections */}
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-muted-foreground !w-3 !h-3"
      />
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-muted-foreground !w-3 !h-3"
      />

      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          {photoUrl && <AvatarImage src={photoUrl} alt={person.givenNames} />}
          <AvatarFallback className="bg-accent text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold truncate">
            {person.givenNames}
          </p>
          <p className="text-base text-muted-foreground truncate">
            {person.surname}
            {person.birthName && person.birthName !== person.surname && (
              <span className="text-xs"> (née {person.birthName})</span>
            )}
          </p>
          {lifespan && (
            <p className="text-xs text-muted-foreground mt-1">
              {lifespan}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const PersonNode = memo(PersonNodeComponent);
