import type { Edge } from '@xyflow/react';
import dagre from 'dagre';
import type { Person, Family, TreeLayoutOrientation } from '@/types';
import type { PersonNode } from './PersonNode';
import type { CoupleNode } from './CoupleNode';

type TreeNode = PersonNode | CoupleNode;

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  spouseSpacing: number;
}

const LAYOUT_CONFIG: Record<'desktop' | 'mobile', LayoutConfig> = {
  desktop: {
    nodeWidth: 200, // Increased for couple nodes
    nodeHeight: 140, // Increased for couple nodes
    horizontalSpacing: 10,
    verticalSpacing: 160,
    spouseSpacing: 40,
  },
  mobile: {
    nodeWidth: 140,
    nodeHeight: 100,
    horizontalSpacing: 10, // More compact
    verticalSpacing: 100, // Reduced vertical spacing
    spouseSpacing: 15,
  },
};

interface LayoutResult {
  nodes: TreeNode[];
  edges: Edge[];
}

/**
 * Generate tree layout from persons and families
 * Supports both horizontal and vertical orientations
 */
export function generateTreeLayout(
  persons: Person[],
  families: Family[],
  rootPersonId: string | undefined,
  orientation: TreeLayoutOrientation = 'vertical',
  isMobile: boolean = false
): LayoutResult {
  const personMap = new Map(persons.map(person => [person.id, person]));
  const groupsByPerson = new Map<string, Family[]>();
  for (const family of families) {
    for (const id of [family.spouse1Id, family.spouse2Id]) {
      if (id && personMap.has(id)) groupsByPerson.set(id, [...(groupsByPerson.get(id) ?? []), family]);
    }
  }

  // A couple card is safe only when both people belong to this one group.
  // Otherwise it would incorrectly attribute all children to every partner.
  const coupleByPerson = new Map<string, { id: string; first: Person; second: Person }>();
  for (const family of families) {
    const first = family.spouse1Id && personMap.get(family.spouse1Id);
    const second = family.spouse2Id && personMap.get(family.spouse2Id);
    if (!first || !second || first.id === second.id || !family.childIds.length ||
        groupsByPerson.get(first.id)?.length !== 1 || groupsByPerson.get(second.id)?.length !== 1) continue;
    const couple = { id: `couple-${[first.id, second.id].sort().join('-')}`, first, second };
    coupleByPerson.set(first.id, couple);
    coupleByPerson.set(second.id, couple);
  }

  const nodes: TreeNode[] = [];
  const added = new Set<string>();
  const selectedRoot = rootPersonId && personMap.has(rootPersonId) ? rootPersonId : persons[0]?.id;
  for (const person of persons) {
    const couple = coupleByPerson.get(person.id);
    const nodeId = couple?.id ?? person.id;
    if (added.has(nodeId)) continue;
    added.add(nodeId);
    if (couple) {
      nodes.push({ id: nodeId, type: 'couple', position: { x: 0, y: 0 },
        data: { person1: couple.first, person2: couple.second, isRoot: selectedRoot === couple.first.id || selectedRoot === couple.second.id, compact: isMobile, orientation } });
    } else {
      nodes.push({ id: nodeId, type: 'person', position: { x: 0, y: 0 },
        data: { person, isRoot: person.id === selectedRoot, compact: isMobile, orientation } });
    }
  }

  const edges: Edge[] = [];
  const edgeIds = new Set<string>();
  const addEdge = (source: string, target: string, spouse: boolean) => {
    if (!personMap.has(source) || !personMap.has(target)) return;
    const sourceNode = coupleByPerson.get(source)?.id ?? source;
    const targetNode = coupleByPerson.get(target)?.id ?? target;
    if (sourceNode === targetNode) return;
    const id = `${spouse ? 'partner' : 'parent'}-${sourceNode}-${targetNode}`;
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    edges.push({ id, source: sourceNode, target: targetNode, type: 'smoothstep',
      style: { stroke: spouse ? '#f472b6' : '#94a3b8', strokeWidth: spouse ? 3 : 2, strokeDasharray: spouse ? '5,5' : undefined } });
  };
  // Construct links from every family, independent of which person happens to be first.
  for (const family of families) {
    if (family.spouse1Id && family.spouse2Id) addEdge(family.spouse1Id, family.spouse2Id, true);
    for (const parent of [family.spouse1Id, family.spouse2Id]) {
      if (parent) for (const child of family.childIds) addEdge(parent, child, false);
    }
  }
  return { nodes, edges };
}

/**
 * Auto-layout tree using dagre for hierarchical positioning
 * This provides better spacing and prevents node overlap
 */
export function autoLayoutTree(
  nodes: TreeNode[],
  edges: Edge[],
  orientation: TreeLayoutOrientation = 'vertical',
  isMobile: boolean = false
): TreeNode[] {
  if (nodes.length === 0) return nodes;

  const config = isMobile ? LAYOUT_CONFIG.mobile : LAYOUT_CONFIG.desktop;
  
  // Create a directed graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: orientation === 'vertical' ? 'TB' : 'LR',
    nodesep: config.horizontalSpacing,
    ranksep: config.verticalSpacing,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to graph
  nodes.forEach(node => {
    const isCoupleNode = node.type === 'couple';
    g.setNode(node.id, {
      width: isCoupleNode ? (isMobile ? 160 : 300) : config.nodeWidth,
      height: isCoupleNode ? (isMobile ? 170 : 240) : config.nodeHeight,
    });
  });

  // Add edges to graph
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(g);

  // Update node positions with computed layout
  const layoutedNodes = nodes.map(node => {
    const pos = g.node(node.id);
    const size = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - size.width / 2,
        y: pos.y - size.height / 2,
      },
    };
  });

  return layoutedNodes;
}
