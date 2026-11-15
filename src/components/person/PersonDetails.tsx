import { useMemo, useState } from 'react';
import { Edit, Trash2, ChevronRight, CircleDot, UserPlus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Person } from '@/types';
import { FamilyManager } from './FamilyManager';
import { PersonEditor } from './PersonEditor';

interface PersonDetailsProps {
  person: Person;
  parents?: Person[];
  spouses?: Person[];
  children?: Person[];
  siblings?: Person[];
  onEdit?: () => void;
  onDelete?: () => void;
  onPersonClick?: (person: Person) => void;
}

export function PersonDetails({
  person,
  parents = [],
  spouses = [],
  children = [],
  siblings = [],
  onEdit,
  onDelete,
  onPersonClick,
}: PersonDetailsProps) {
  const [relativeType, setRelativeType] = useState<'child' | 'partner' | 'parent' | 'sibling' | null>(null);
  // Create photo URL
  const photoUrl = useMemo(() => {
    if (person.photo) {
      return URL.createObjectURL(person.photo);
    }
    return null;
  }, [person.photo]);

  // Get initials
  const initials = (person.givenNames?.charAt(0) || '') + (person.surname?.charAt(0) || '');

  // Format dates
  const formatDate = (date?: string, place?: string) => {
    if (!date && !place) return null;
    const parts = [date, place].filter(Boolean);
    return parts.join(', ');
  };

  const birthInfo = formatDate(person.birth?.date, person.birth?.place);
  const deathInfo = formatDate(person.death?.date, person.death?.place);

  // Gender icon component
  const GenderIcon = ({ sex, className = "h-3.5 w-3.5" }: { sex?: string; className?: string }) => {
    if (sex === 'M') {
      return (
        <svg className={cn(className, "text-blue-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="14" r="6"/>
          <path d="M20 4l-6 6"/>
          <path d="M15 4h5v5"/>
        </svg>
      );
    }
    if (sex === 'F') {
      return (
        <svg className={cn(className, "text-pink-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="9" r="6"/>
          <path d="M12 15v6"/>
          <path d="M9 18h6"/>
        </svg>
      );
    }
    return <CircleDot className={cn(className, "text-muted-foreground")} />;
  };

  // Render person mini card
  const PersonMiniCard = ({ p, indent = false }: { p: Person; indent?: boolean }) => {
    const pPhotoUrl = p.photo ? URL.createObjectURL(p.photo) : null;
    const pInitials = (p.givenNames?.charAt(0) || '') + (p.surname?.charAt(0) || '');
    
    return (
      <button
        onClick={() => onPersonClick?.(p)}
        className={cn(
          "flex min-h-11 items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left w-full",
          indent && "ml-4"
        )}
      >
        {indent && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        <Avatar className="h-8 w-8">
          {pPhotoUrl && <AvatarImage src={pPhotoUrl} />}
          <AvatarFallback className="text-xs">{pInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{p.givenNames} {p.surname}</p>
          <GenderIcon sex={p.sex} />
        </div>
      </button>
    );
  };

  // Keep related people easy to scan without nesting extra cards.
  const RelationSection = ({ 
    title, 
    children: content,
  }: { 
    title: string; 
    children: React.ReactNode;
  }) => {
    return (
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-1">
          {title}
        </h4>
        {content}
      </div>
    );
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {photoUrl && <AvatarImage src={photoUrl} alt={person.givenNames} />}
            <AvatarFallback className="bg-accent text-primary text-xl font-semibold">{initials || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="font-display text-2xl leading-tight">
              {person.givenNames} {person.surname}
            </CardTitle>
            {person.birthName && person.birthName !== person.surname && (
              <p className="text-sm text-muted-foreground">
                née {person.birthName}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <GenderIcon sex={person.sex} className="h-4 w-4" />
              {person.sex === 'M' ? 'Male' : person.sex === 'F' ? 'Female' : 'Unknown'}
            </p>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit person">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="min-w-0 px-2" onClick={() => setRelativeType('child')}><UserPlus className="h-4 w-4 shrink-0 mr-1" />Add child</Button>
          <Button variant="outline" className="min-w-0 px-2" onClick={() => setRelativeType('partner')}><UserPlus className="h-4 w-4 shrink-0 mr-1" />Add partner</Button>
          <Button variant="outline" className="min-w-0 px-2" onClick={() => setRelativeType('parent')}><UserPlus className="h-4 w-4 shrink-0 mr-1" />Add parent</Button>
          <Button variant="outline" className="min-w-0 px-2" onClick={() => setRelativeType('sibling')}><UserPlus className="h-4 w-4 shrink-0 mr-1" />Add sibling</Button>
        </div>
        {/* Relationships */}
        <div className="space-y-3">
          {/* Show children separately: the aggregated list does not identify each child's other parent. */}
          {spouses.length > 0 && (
            <RelationSection title="Partners">
              <div className="space-y-3">
                {spouses.map((spouse) => (
                  <div key={spouse.id}>
                    <PersonMiniCard p={spouse} />
                  </div>
                ))}
              </div>
            </RelationSection>
          )}

          {children.length > 0 && (
            <RelationSection title="Children">
              {children.map((child) => <PersonMiniCard key={child.id} p={child} />)}
            </RelationSection>
          )}

          {/* Parents */}
          {parents.length > 0 && (
            <RelationSection title="Parents">
              <div className="space-y-2">
                {parents.map((parent) => (
                  <PersonMiniCard key={parent.id} p={parent} />
                ))}
              </div>
            </RelationSection>
          )}

          {/* Siblings */}
          {siblings.length > 0 && (
            <RelationSection title="Siblings">
              <div className="space-y-2">
                {siblings.map((sibling) => (
                  <PersonMiniCard key={sibling.id} p={sibling} />
                ))}
              </div>
            </RelationSection>
          )}
        </div>
        {(birthInfo || deathInfo || person.notes) && <div className="space-y-2 border-t pt-4 text-sm">
          {birthInfo && <p><span className="text-muted-foreground">Born:</span> {birthInfo}</p>}
          {deathInfo && <p><span className="text-muted-foreground">Died:</span> {deathInfo}</p>}
          {person.notes && <div className="pt-1"><h4 className="font-medium text-muted-foreground">Notes</h4><p className="mt-1 whitespace-pre-wrap">{person.notes}</p></div>}
        </div>}
        <FamilyManager person={person} />
      </CardContent>
      {relativeType && <PersonEditor open newRelative={{ person, type: relativeType }} onOpenChange={(open) => { if (!open) setRelativeType(null); }} onSaved={onPersonClick} />}
    </Card>
  );
}
