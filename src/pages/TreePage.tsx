import { useState, useCallback, useEffect } from 'react';
import { FamilyTreeView } from '@/components/tree';
import { PersonEditor } from '@/components/person';
import { PersonDetails } from '@/components/person';
import { FamilyExplorer } from '@/components/person/FamilyExplorer';
import { MobileHeader } from '@/components/navigation';
import { useIsMobile } from '@/hooks';
import { useToast } from '@/hooks/useToast';
import { usePersons, useFamilies, getPersonWithRelations, initializeSettings, requestPersistentStorage, loadSampleData } from '@/db';
import type { Person } from '@/types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Button,
} from '@/components/ui';
import { Zap, Plus, Sprout, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TreePageProps {
  onAddPerson?: () => void;
}

export function TreePage({ onAddPerson: _onAddPerson }: TreePageProps) {
  const isMobile = useIsMobile();
  const { addToast } = useToast();
  const persons = usePersons();
  const families = useFamilies();
  
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personRelations, setPersonRelations] = useState<{
    parents: Person[];
    spouses: Person[];
    children: Person[];
    siblings: Person[];
  } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [mobileView, setMobileView] = useState<'family' | 'tree'>('family');
  const displayedPerson = persons?.find(person => person.id === selectedPerson?.id) ?? selectedPerson;

  // Initialize settings and request persistent storage on mount
  useEffect(() => {
    initializeSettings();
    requestPersistentStorage();
  }, []);

  // Load relations when person is selected
  const loadPersonRelations = useCallback(async (person: Person) => {
    const relations = await getPersonWithRelations(person.id);
    if (relations) {
      setPersonRelations({
        parents: relations.parents,
        spouses: relations.spouses,
        children: relations.children,
        siblings: relations.siblings,
      });
    }
  }, []);

  useEffect(() => {
    if (selectedPerson && isDetailsOpen) loadPersonRelations(selectedPerson);
  }, [families, selectedPerson, isDetailsOpen, loadPersonRelations]);

  const handlePersonClick = useCallback((person: Person) => {
    setSelectedPerson(person);
    loadPersonRelations(person);
    setIsDetailsOpen(true);
  }, [loadPersonRelations]);

  const handlePersonDoubleClick = useCallback((person: Person) => {
    setSelectedPerson(person);
    setIsEditing(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedPerson(null);
    setPersonRelations(null);
  }, []);

  const handleEditPerson = useCallback(() => {
    setIsDetailsOpen(false);
    setIsEditing(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setIsEditing(false);
    if (selectedPerson && (!isMobile || mobileView === 'tree')) {
      loadPersonRelations(selectedPerson);
      setIsDetailsOpen(true);
    }
  }, [selectedPerson, loadPersonRelations, isMobile, mobileView]);

  const handleLoadSampleData = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      await loadSampleData();
      addToast({
        type: 'success',
        title: 'Success',
        description: 'Sample data loaded successfully! Reloading...',
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to load sample data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load sample data. Please try again.',
      });
      setIsLoadingSample(false);
    }
  }, [addToast]);

  return (
    <div className="flex flex-col h-full">
      {isMobile && <MobileHeader title="Family Tree" />}
      {!isMobile && <header className="flex min-h-24 items-center justify-between border-b bg-card px-8"><div><h1 className="font-display text-[30px] leading-tight">Your family tree</h1><p className="mt-1 text-sm text-muted-foreground">Every connection has a story.</p></div>{persons && persons.length > 0 && <span className="rounded-full bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground">{persons.length} {persons.length === 1 ? 'person' : 'people'} in your tree</span>}</header>}
      
      <div className="flex-1 relative">
        {!persons ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading your family tree…</div>
        ) : persons.length === 0 ? (
          // Empty state
          <div className="flex h-full items-center justify-center bg-secondary/35 p-6">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary"><Sprout className="h-8 w-8" /></div>
              <h2 className="font-display text-4xl leading-tight">Every family has a story.</h2>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Start with one person, then bring the people and connections that matter together.</p>
              <div className="mt-7 space-y-3">
                <Button
                  onClick={() => _onAddPerson?.()}
                  className="w-full justify-center rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first person
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLoadSampleData}
                  disabled={isLoadingSample}
                  className="w-full justify-center rounded-xl"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isLoadingSample ? 'Loading...' : 'Explore a sample family'}
                </Button>
                <p className="pt-2 text-xs leading-5 text-muted-foreground">Your family information is currently stored on this device.</p>
              </div>
            </div>
          </div>
        ) : (
          // Family tree view
          <div className="flex h-full flex-col">
            {isMobile && <div className="flex gap-1 border-b bg-card p-1.5" role="group" aria-label="Family view">
              <button type="button" aria-pressed={mobileView === 'family'} onClick={() => setMobileView('family')} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${mobileView === 'family' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Family</button>
              <button type="button" aria-pressed={mobileView === 'tree'} onClick={() => setMobileView('tree')} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${mobileView === 'tree' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Tree</button>
            </div>}
            {isMobile && <div className={mobileView === 'family' ? 'min-h-0 flex-1' : 'hidden'}><FamilyExplorer persons={persons} families={families ?? []} onEdit={person => { setSelectedPerson(person); setIsEditing(true); }} /></div>}
            {(!isMobile || mobileView === 'tree') && <div className="relative min-h-0 flex-1"><FamilyTreeView
              persons={persons ?? []}
              families={families ?? []}
              onPersonClick={handlePersonClick}
              onPersonDoubleClick={handlePersonDoubleClick}
              onBackgroundClick={handleCloseDetails}
            />
            {isMobile && <Button asChild variant="outline" size="sm" className="absolute top-4 left-4 z-10 rounded-full shadow-sm"><Link to="/search"><Search className="h-4 w-4" /> Find a person</Link></Button>}
            {!isMobile && persons.length === 1 && <div className="absolute top-5 left-5 max-w-xs rounded-xl border bg-card p-4 shadow-sm"><p className="font-medium">Your first person is in place.</p><p className="mt-1 text-sm text-muted-foreground">Open their profile to add a child or partner.</p><Button size="sm" className="mt-3" onClick={() => handlePersonClick(persons[0])}>Add a connection</Button></div>}
            </div>}
          </div>
        )}
      </div>

      {/* Person Details Drawer (mobile) */}
      {isMobile && displayedPerson && (
        <Drawer open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>Person Details</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <PersonDetails
                person={displayedPerson}
                parents={personRelations?.parents}
                spouses={personRelations?.spouses}
                children={personRelations?.children}
                siblings={personRelations?.siblings}
                onEdit={handleEditPerson}
                onPersonClick={(p) => {
                  setSelectedPerson(p);
                  loadPersonRelations(p);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Person Details Panel (desktop) */}
      {!isMobile && displayedPerson && isDetailsOpen && (
        <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] overflow-y-auto bg-card/95 backdrop-blur-sm rounded-lg shadow-xl border border-border/80">
          <div className="flex items-center justify-between border-b px-5 py-3"><span className="text-sm font-semibold">Family member</span><button type="button" onClick={handleCloseDetails} aria-label="Close person details" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button></div>
          <PersonDetails
            person={displayedPerson}
            parents={personRelations?.parents}
            spouses={personRelations?.spouses}
            children={personRelations?.children}
            siblings={personRelations?.siblings}
            onEdit={handleEditPerson}
            onPersonClick={(p) => {
              setSelectedPerson(p);
              loadPersonRelations(p);
            }}
          />
        </div>
      )}

      {/* Person Editor */}
      <PersonEditor
        person={displayedPerson ?? undefined}
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) handleEditClose();
        }}
        onSaved={() => {
          setIsEditing(false);
          if (selectedPerson && (!isMobile || mobileView === 'tree')) {
            loadPersonRelations(selectedPerson);
            setIsDetailsOpen(true);
          }
        }}
      />
    </div>
  );
}
