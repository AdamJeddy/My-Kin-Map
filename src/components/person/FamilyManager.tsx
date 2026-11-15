import { useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { useFamilies, usePersons } from '@/db';
import { saveFamilyGroup } from '@/db/family-editor';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import type { Family, Person } from '@/types';

export function FamilyManager({ person }: { person: Person }) {
  const loadedPeople = usePersons();
  const loadedFamilies = useFamilies();
  const people = useMemo(() => loadedPeople ?? [], [loadedPeople]);
  const families = useMemo(() => (loadedFamilies ?? []).filter(f => f.spouse1Id === person.id || f.spouse2Id === person.id), [loadedFamilies, person.id]);
  const [open, setOpen] = useState(false);
  const [familyId, setFamilyId] = useState('new');
  const [expectedRevision, setExpectedRevision] = useState<string>();
  const [partnerId, setPartnerId] = useState('none');
  const [childIds, setChildIds] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const partnerOf = (family: Family) => family.spouse1Id === person.id ? family.spouse2Id : family.spouse1Id;
  const nameOf = (id?: string) => {
    const found = people.find(p => p.id === id);
    return found ? `${found.givenNames} ${found.surname}` : 'No partner';
  };
  const selectFamily = (id: string) => {
    const family = families.find(f => f.id === id);
    setFamilyId(id);
    setExpectedRevision(family?._rev);
    setPartnerId(family ? partnerOf(family) ?? 'none' : 'none');
    setChildIds(family?.childIds ?? []);
    setAcknowledged(false);
    setError('');
  };
  const selectedFamily = families.find(f => f.id === familyId);
  const partnerChanged = !!selectedFamily && (partnerOf(selectedFamily) ?? 'none') !== partnerId && childIds.length > 0;

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await saveFamilyGroup(person.id, { familyId: familyId === 'new' ? undefined : familyId, expectedRevision, partnerId: partnerId === 'none' ? undefined : partnerId, childIds });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this family group.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) selectFamily(families[0]?.id ?? 'new'); }}>
      <Button type="button" variant="outline" className="w-full justify-center" disabled={!loadedPeople || !loadedFamilies} onClick={() => { selectFamily(families[0]?.id ?? 'new'); setOpen(true); }}>
        <UsersRound className="mr-2 h-4 w-4" /> Manage family groups
      </Button>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage family groups</DialogTitle>
          <DialogDescription>Choose a partner and the children they share with {person.givenNames}. Each group is edited separately.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="family-group">Family group</label>
            <Select value={familyId} onValueChange={selectFamily}>
              <SelectTrigger id="family-group"><SelectValue /></SelectTrigger>
              <SelectContent>
                {families.map(f => <SelectItem key={f.id} value={f.id}>{nameOf(partnerOf(f))} · {f.childIds.length} {f.childIds.length === 1 ? 'child' : 'children'}</SelectItem>)}
                <SelectItem value="new">Add a family group</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="family-partner">Partner</label>
            <Select value={partnerId} onValueChange={(value) => { setPartnerId(value); setAcknowledged(false); }}>
              <SelectTrigger id="family-partner"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No partner recorded</SelectItem>
                {people.filter(p => p.id !== person.id).map(p => <SelectItem key={p.id} value={p.id}>{p.givenNames} {p.surname}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Children in this family group</legend>
            <p className="text-sm text-muted-foreground">Select only the children of the people shown above.</p>
            <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
              {people.filter(p => p.id !== person.id && (p.id !== partnerId || childIds.includes(p.id))).map(p => (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={childIds.includes(p.id)} onChange={(e) => { setChildIds(current => e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id)); setAcknowledged(false); }} />
                  <span>{p.givenNames} {p.surname}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {partnerChanged && <label className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"><input className="mt-1" type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>I understand this changes the recorded parent for the selected children in this group.</span></label>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" className="flex-1" onClick={handleSave} disabled={saving || (partnerChanged && !acknowledged)}>{saving ? 'Saving…' : 'Save group'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
