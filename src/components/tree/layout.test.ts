import { describe, expect, it } from 'vitest';
import sample from '../../../test-data/sample-family.json';
import type { Family, Person } from '../../types';
import { autoLayoutTree, generateTreeLayout } from './layout';

describe('family tree layout', () => {
  for (const mobile of [true, false]) for (const orientation of ['vertical', 'horizontal'] as const) {
    it(`keeps sample cards apart in ${orientation} ${mobile ? 'mobile' : 'desktop'} layout`, () => {
      const layout = generateTreeLayout(sample.persons as unknown as Person[], sample.families as unknown as Family[], undefined, orientation, mobile);
      const nodes = autoLayoutTree(layout.nodes, layout.edges, orientation, mobile);
      const size = (type: string | undefined) => type === 'couple'
        ? { width: mobile ? 160 : 300, height: mobile ? 170 : 240 }
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
