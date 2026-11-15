import { describe, expect, it } from 'vitest';
import sample from '../../../test-data/sample-family.json';
import type { Family, Person } from '../../types';
import { autoLayoutTree, generateTreeLayout } from './layout';

describe('family tree layout', () => {
  it('shows siblings with no recorded parents as siblings rather than inventing a parent', () => {
    const people = sample.persons.slice(0, 2) as unknown as Person[];
    const group = { ...(sample.families[0] as unknown as Family), id: 'siblings', spouse1Id: undefined, spouse2Id: undefined, childIds: people.map(p => p.id) };
    const result = generateTreeLayout(people, [group], undefined);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toMatch(/^sibling-/);
  });
  it('does not show co-parents as partners', () => {
    const people = sample.persons.slice(0, 3) as unknown as Person[];
    const group = { ...(sample.families[0] as unknown as Family), id: 'coparents', spouse1Id: people[0].id, spouse2Id: people[1].id, childIds: [people[2].id], coParentsOnly: true };
    const result = generateTreeLayout(people, [group], undefined);
    expect(result.nodes.every(node => node.type === 'person')).toBe(true);
    expect(result.edges.some(edge => edge.id.startsWith('partner-'))).toBe(false);
    expect(result.edges.filter(edge => edge.id.startsWith('parent-'))).toHaveLength(2);
  });
  it('shows every relationship when the first person is a child and a parent has multiple partners', () => {
    const people = sample.persons as unknown as Person[];
    const families = sample.families as unknown as Family[];
    const firstParent = families[0].spouse1Id!;
    const extra = { ...people[0], id: 'extra-partner', givenNames: 'Extra' };
    const child = { ...people[0], id: 'extra-child', givenNames: 'Child' };
    const extraFamilies = [
      { ...families[0], id: 'single-parent', spouse1Id: firstParent, spouse2Id: undefined, childIds: ['extra-child'] },
      { ...families[0], id: 'new-partner', spouse1Id: firstParent, spouse2Id: 'extra-partner', childIds: [] },
    ];
    const result = generateTreeLayout([child, extra, ...people], [...families, ...extraFamilies], undefined);
    const nodeFor = (id: string) => result.nodes.find(node => node.type === 'person' ? node.data.person.id === id : node.data.person1.id === id || node.data.person2.id === id)?.id;
    for (const family of [...families, ...extraFamilies]) {
      for (const parent of [family.spouse1Id, family.spouse2Id].filter((id): id is string => !!id)) {
        for (const childId of family.childIds) {
          expect(result.edges.some(edge => edge.source === nodeFor(parent) && edge.target === nodeFor(childId))).toBe(true);
        }
      }
    }
    expect(nodeFor(firstParent)).not.toBe(nodeFor('extra-partner'));
    expect(result.edges.some(edge => edge.source === nodeFor(firstParent) && edge.target === nodeFor('extra-child'))).toBe(true);
    expect(result.edges.some(edge => edge.source === nodeFor('extra-partner') && edge.target === nodeFor('extra-child'))).toBe(false);
  });
  for (const mobile of [true, false]) for (const orientation of ['vertical', 'horizontal'] as const) {
    it(`keeps sample cards apart in ${orientation} ${mobile ? 'mobile' : 'desktop'} layout`, () => {
      const layout = generateTreeLayout(sample.persons as unknown as Person[], sample.families as unknown as Family[], undefined, orientation, mobile);
      const nodes = autoLayoutTree(layout.nodes, layout.edges, orientation, mobile);
      const size = (type: string | undefined) => type === 'couple'
        ? { width: mobile ? 160 : 300, height: mobile ? 170 : 150 }
        : { width: mobile ? 140 : 200, height: mobile ? 100 : 140 };
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], x = size(a.type), y = size(b.type);
        const overlap = a.position.x < b.position.x + y.width && b.position.x < a.position.x + x.width &&
          a.position.y < b.position.y + y.height && b.position.y < a.position.y + x.height;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    });
  }
});
