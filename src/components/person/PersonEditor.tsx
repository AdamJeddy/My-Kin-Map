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
  Button,
} from '@/components/ui';
import { PersonForm } from './PersonForm';
import { useIsMobile } from '@/hooks';
import { createPerson, updatePerson, updatePersonPhoto, usePersons, useFamilies, getPersonWithRelations, db } from '@/db';
import { useToast } from '@/hooks/useToast';
import { reconcileRelationships } from '@/db/relationships';
import { getBirthGroupSnapshot, linkNewRelative, type BirthGroupSnapshot } from '@/db/relative-creation';
import type { Person, PersonFormData } from '@/types';

interface PersonEditorProps {
  person?: Person;
  newRelative?: { person: Person; type: 'child' | 'partner' | 'parent' | 'sibling' };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (person: Person) => void;
}

export function PersonEditor({ person, newRelative, open, onOpenChange, onSaved }: PersonEditorProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relationsReady, setRelationsReady] = useState(false);
  const [birthGroup, setBirthGroup] = useState<BirthGroupSnapshot | null>(null);
  const [relationError, setRelationError] = useState('');
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
    setRelationError('');
    if (!person) {
      setRelationSelections({
        parentIds: relativeType === 'child' && relativePersonId ? [relativePersonId] : [],
        spouseId: relativeType === 'partner' ? relativePersonId : undefined,
        childIds: [],
      });
      if (relativePersonId && (relativeType === 'parent' || relativeType === 'sibling')) {
        getBirthGroupSnapshot(relativePersonId).then(snapshot => {
          if (cancelled) return;
          setBirthGroup(snapshot);
          if (relativeType === 'parent' && snapshot && snapshot.parentCount >= 2) {
            setRelationError('This family group already has two parents.');
          } else if (relativeType === 'parent' && snapshot?.hasPartnershipDetails) {
            setRelationError('This group has recorded partnership details. Review the family group before adding a parent.');
          } else setRelationsReady(true);
        }).catch(error => { if (!cancelled) setRelationError(error instanceof Error ? error.message : 'Could not load this family group.'); });
      } else setRelationsReady(true);
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
        if (relativePersonId && (relativeType === 'parent' || relativeType === 'sibling')) {
          await linkNewRelative(relativePersonId, saved.id, relativeType, birthGroup);
        } else await reconcileRelationships(saved.id, relations);
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
  }, [person, onOpenChange, onSaved, addToast, relativePersonId, relativeType, birthGroup]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const title = person ? 'Edit Person' : newRelative ? `Add ${newRelative.type}` : 'Add Person';
  const description = relationError || (person
    ? `Update details for ${person.givenNames} ${person.surname}`
    : newRelative?.type === 'child'
      ? `${newRelative.person.givenNames} is preselected as a parent. You can select another parent below.`
      : newRelative?.type === 'partner'
        ? `Add a partner for ${newRelative.person.givenNames}.`
        : newRelative?.type === 'parent'
          ? `This parent will be added to ${newRelative.person.givenNames}'s family group${birthGroup && birthGroup.childCount > 1 ? ` and linked to ${birthGroup.childCount === 2 ? 'both children' : `all ${birthGroup.childCount} children`} in it` : ''}.`
          : newRelative?.type === 'sibling'
            ? birthGroup?.parentCount ? `This sibling will share ${newRelative.person.givenNames}'s recorded parents.` : `This sibling will be connected to ${newRelative.person.givenNames}. You can add their parents later.`
            : 'Add a new person to your family tree');

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
            {relationError ? <Button type="button" variant="outline" className="w-full" onClick={handleCancel}>Close</Button> : <PersonForm
              person={person}
              persons={persons ?? []}
              families={families ?? []}
              relations={relationSelections}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              submitDisabled={!relationsReady}
              hideRelationships={relativeType === 'parent' || relativeType === 'sibling'}
            />}
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
        {relationError ? <Button type="button" variant="outline" className="w-full" onClick={handleCancel}>Close</Button> : <PersonForm
          person={person}
          persons={persons ?? []}
          families={families ?? []}
          relations={relationSelections}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitDisabled={!relationsReady}
          hideRelationships={relativeType === 'parent' || relativeType === 'sibling'}
        />}
      </DialogContent>
    </Dialog>
  );
}
