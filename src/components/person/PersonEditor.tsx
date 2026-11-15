import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui';
import { PersonForm } from './PersonForm';
import { useIsMobile } from '@/hooks';
import { createPerson, updatePerson, updatePersonPhoto, usePersons, useFamilies, getPersonWithRelations, db } from '@/db';
import { useToast } from '@/hooks/useToast';
import { reconcileRelationships } from '@/db/relationships';
import type { Person, PersonFormData } from '@/types';

interface PersonEditorProps {
  person?: Person;
  newRelative?: { person: Person; type: 'child' | 'partner' };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (person: Person) => void;
}

export function PersonEditor({ person, newRelative, open, onOpenChange, onSaved }: PersonEditorProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relationsReady, setRelationsReady] = useState(false);
  const persons = usePersons();
  const families = useFamilies();
  const { addToast } = useToast();
  const relativePersonId = newRelative?.person.id;
  const relativeType = newRelative?.type;
  const [relationSelections, setRelationSelections] = useState<{ parentIds: string[]; spouseId?: string; childIds: string[] }>({
    parentIds: [],
    spouseId: undefined,
    childIds: [],
  });

  // Load existing relations when editing a person
  useEffect(() => {
    let cancelled = false;
    setRelationsReady(false);
    if (!person) {
      setRelationSelections({
        parentIds: relativeType === 'child' && relativePersonId ? [relativePersonId] : [],
        spouseId: relativeType === 'partner' ? relativePersonId : undefined,
        childIds: [],
      });
      setRelationsReady(true);
      return () => { cancelled = true; };
    }

    getPersonWithRelations(person.id).then((relations) => {
      if (!relations || cancelled) return;
      setRelationSelections({
        parentIds: relations.parents.map((p) => p.id).slice(0, 2),
        spouseId: relations.spouses[0]?.id,
        childIds: relations.children.map((c) => c.id),
      });
      setRelationsReady(true);
    }).catch(() => {
      if (!cancelled) addToast({ type: 'error', title: 'Could not load relationships', description: 'Close and reopen this person to try again.' });
    });
    return () => { cancelled = true; };
  }, [person, relativePersonId, relativeType, addToast]);

  const handleSubmit = useCallback(async (data: PersonFormData, photo: File | undefined, relations: { parentIds: string[]; spouseId?: string; childIds: string[] }) => {
    setIsSubmitting(true);
    try {
      const photoBlob = photo ? new Blob([await photo.arrayBuffer()], { type: photo.type }) : undefined;
      const savedPerson = await db.transaction('rw', db.persons, db.families, async () => {
        const saved = person ? (await updatePerson(person.id, data), { ...person, ...data }) : await createPerson(data);
        if (photoBlob) await updatePersonPhoto(saved.id, photoBlob, photoBlob);
        await reconcileRelationships(saved.id, relations);
        return saved;
      });

      onOpenChange(false);
      addToast({
        type: 'success',
        title: 'Saved',
        description: `${savedPerson.givenNames} ${savedPerson.surname} ${person ? 'updated' : 'added'}.`,
        duration: 1500,
      });
      if (onSaved) {
        onSaved(savedPerson);
      }
    } catch (error) {
      console.error('Failed to save person:', error);
      addToast({
        type: 'error',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not update this person. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [person, onOpenChange, onSaved, addToast]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const title = person ? 'Edit Person' : newRelative ? `Add ${newRelative.type}` : 'Add Person';
  const description = person 
    ? `Update details for ${person.givenNames} ${person.surname}`
    : newRelative?.type === 'child'
      ? `${newRelative.person.givenNames} is preselected as a parent. You can select another parent below.`
      : newRelative?.type === 'partner'
        ? `Add a partner for ${newRelative.person.givenNames}.`
        : 'Add a new person to your family tree';

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <PersonForm
              person={person}
              persons={persons ?? []}
              families={families ?? []}
              relations={relationSelections}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting || !relationsReady}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <PersonForm
          person={person}
          persons={persons ?? []}
          families={families ?? []}
          relations={relationSelections}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting || !relationsReady}
        />
      </DialogContent>
    </Dialog>
  );
}
