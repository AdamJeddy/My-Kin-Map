import { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPersonWithRelations } from '@/db';
import type { Family, Person } from '@/types';
import { PersonDetails } from './PersonDetails';

/** A readable, person-by-person alternative to the tree canvas. */
export function FamilyExplorer({ persons, families, onEdit }: {
  persons: Person[];
  families: Family[];
  onEdit: (person: Person) => void;
}) {
  const [personId, setPersonId] = useState(persons[0]?.id);
  const [history, setHistory] = useState<string[]>([]);
  const [relations, setRelations] = useState<Awaited<ReturnType<typeof getPersonWithRelations>>>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const person = persons.find(item => item.id === personId) ?? persons[0];

  useEffect(() => {
    if (!person) return;
    let cancelled = false;
    setLoadError(false);
    getPersonWithRelations(person.id).then(result => {
      if (!cancelled) setRelations(result);
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    });
    return () => { cancelled = true; };
  }, [person, families, attempt]);

  const visit = (next: Person) => {
    if (next.id === person?.id) return;
    setHistory(current => person ? [...current, person.id] : current);
    setRelations(null);
    setPersonId(next.id);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(current => current.slice(0, -1));
    setRelations(null);
    setPersonId(previous);
  };

  if (!person) return null;
  const currentRelations = relations?.person.id === person.id ? relations : null;

  return (
    <div className="h-full overflow-y-auto bg-secondary/30">
      <div className="mx-auto max-w-xl px-4 pb-8 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl leading-tight">Explore your family</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Choose a person to see the people connected to them.</p>
          </div>
          <Link to="/search" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border bg-card text-foreground" aria-label="Find a person"><Search className="h-5 w-5" /></Link>
        </div>
        <div className="mt-5 flex items-end gap-2">
          {history.length > 0 && <button type="button" onClick={goBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card" aria-label="Back to previous person"><ArrowLeft className="h-5 w-5" /></button>}
          <label className="min-w-0 flex-1 text-sm font-medium">Viewing
            <select value={person.id} onChange={event => { const next = persons.find(item => item.id === event.target.value); if (next) visit(next); }} className="mt-1.5 h-11 w-full rounded-xl border bg-card px-3 text-base text-foreground">
              {persons.map(item => <option key={item.id} value={item.id}>{item.givenNames} {item.surname}</option>)}
            </select>
          </label>
        </div>
        {persons.length === 1 && <p className="mt-5 rounded-xl bg-accent px-4 py-3 text-sm leading-5 text-accent-foreground">A family starts with a connection. Add a child or partner below, or use the add button to create another person.</p>}
        <div className="mt-5 overflow-hidden rounded-2xl border bg-card">
          <PersonDetails key={person.id} person={person} parents={currentRelations?.parents} spouses={currentRelations?.spouses}
            children={currentRelations?.children} siblings={currentRelations?.siblings} onEdit={() => onEdit(person)} onPersonClick={visit} />
          {!currentRelations && (loadError
            ? <p role="alert" className="px-6 pb-5 text-sm text-destructive">Could not load connections. <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>Try again</button></p>
            : <p role="status" className="px-6 pb-5 text-sm text-muted-foreground">Loading connections…</p>)}
        </div>
      </div>
    </div>
  );
}
