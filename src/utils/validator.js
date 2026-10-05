/**
 * Smart Escape - Input Validator
 * Validates building JSON schema and consistency strictly according to Section 3.1:
 * - 2 to 60 nodes
 * - 1 to 150 undirected edges
 * - At least one room/junction and at least one exit
 * - Unique IDs, case-sensitive
 * - No self-loops or repeated node pairs
 * - initial_state IDs must exist and match category
 * - Disconnected graphs are valid
 */

export function validateBuildingData(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Input must be a valid JSON object.'] };
  }

  // 1. building name
  if (typeof data.building !== 'string' || data.building.trim().length === 0) {
    errors.push('Field "building" must be a non-empty string.');
  }

  // 2. nodes array
  if (!Array.isArray(data.nodes)) {
    errors.push('Field "nodes" must be an array.');
  } else {
    if (data.nodes.length < 2 || data.nodes.length > 60) {
      errors.push(`Total nodes count must be between 2 and 60 (found ${data.nodes.length}).`);
    }

    const nodeIds = new Set();
    let roomOrJunctionCount = 0;
    let exitCount = 0;

    data.nodes.forEach((node, index) => {
      const prefix = `Node [${index}]`;
      if (!node || typeof node !== 'object') {
        errors.push(`${prefix} is not a valid object.`);
        return;
      }

      // id
      if (typeof node.id !== 'string' || node.id.trim() === '') {
        errors.push(`${prefix} must have a non-empty string "id".`);
      } else {
        if (nodeIds.has(node.id)) {
          errors.push(`Duplicate node id "${node.id}". Node IDs must be unique.`);
        }
        nodeIds.add(node.id);
      }

      // label
      if (typeof node.label !== 'string' || node.label.trim() === '') {
        errors.push(`${prefix} (id: ${node.id || 'unknown'}) must have a non-empty string "label".`);
      }

      // type
      if (!['room', 'junction', 'exit'].includes(node.type)) {
        errors.push(`${prefix} (id: ${node.id || 'unknown'}) type must be 'room', 'junction', or 'exit' (got '${node.type}').`);
      } else {
        if (node.type === 'room' || node.type === 'junction') {
          roomOrJunctionCount++;
        } else if (node.type === 'exit') {
          exitCount++;
        }
      }

      // coordinates
      if (typeof node.x !== 'number' || !Number.isFinite(node.x)) {
        errors.push(`${prefix} (id: ${node.id || 'unknown'}) coordinate "x" must be a finite number.`);
      }
      if (typeof node.y !== 'number' || !Number.isFinite(node.y)) {
        errors.push(`${prefix} (id: ${node.id || 'unknown'}) coordinate "y" must be a finite number.`);
      }
    });

    if (roomOrJunctionCount < 1) {
      errors.push('Graph must contain at least one room or junction.');
    }
    if (exitCount < 1) {
      errors.push('Graph must contain at least one exit.');
    }
  }

  // 3. edges array
  if (!Array.isArray(data.edges)) {
    errors.push('Field "edges" must be an array.');
  } else {
    if (data.edges.length < 1 || data.edges.length > 150) {
      errors.push(`Total edges count must be between 1 and 150 (found ${data.edges.length}).`);
    }

    const edgeIds = new Set();
    const nodePairs = new Set();
    const validNodeIds = Array.isArray(data.nodes)
      ? new Set(data.nodes.map(n => n?.id).filter(Boolean))
      : new Set();

    data.edges.forEach((edge, index) => {
      const prefix = `Edge [${index}]`;
      if (!edge || typeof edge !== 'object') {
        errors.push(`${prefix} is not a valid object.`);
        return;
      }

      // id
      if (typeof edge.id !== 'string' || edge.id.trim() === '') {
        errors.push(`${prefix} must have a non-empty string "id".`);
      } else {
        if (edgeIds.has(edge.id)) {
          errors.push(`Duplicate edge id "${edge.id}". Edge IDs must be unique.`);
        }
        edgeIds.add(edge.id);
      }

      // from & to
      if (typeof edge.from !== 'string' || !validNodeIds.has(edge.from)) {
        errors.push(`${prefix} "from" reference "${edge.from}" does not exist in nodes.`);
      }
      if (typeof edge.to !== 'string' || !validNodeIds.has(edge.to)) {
        errors.push(`${prefix} "to" reference "${edge.to}" does not exist in nodes.`);
      }

      // no self loops
      if (edge.from && edge.to && edge.from === edge.to) {
        errors.push(`${prefix} has a self-loop on node "${edge.from}". Self-loops are not allowed.`);
      }

      // no repeated node pairs (undirected)
      if (edge.from && edge.to && edge.from !== edge.to) {
        const pairKey = [edge.from, edge.to].sort().join('---');
        if (nodePairs.has(pairKey)) {
          errors.push(`Repeated edge pair between "${edge.from}" and "${edge.to}". Multiple corridors between the same node pair are not allowed.`);
        }
        nodePairs.add(pairKey);
      }

      // cost: positive integer
      if (typeof edge.cost !== 'number' || !Number.isInteger(edge.cost) || edge.cost <= 0) {
        errors.push(`${prefix} "cost" must be a positive integer (got ${edge.cost}).`);
      }
    });
  }

  // 4. initial_state
  if (!data.initial_state || typeof data.initial_state !== 'object' || Array.isArray(data.initial_state)) {
    errors.push('Field "initial_state" must be an object.');
  } else {
    const { blocked_nodes, blocked_edges, closed_exits } = data.initial_state;

    const nodeMap = new Map();
    if (Array.isArray(data.nodes)) {
      data.nodes.forEach(n => {
        if (n && n.id) nodeMap.set(n.id, n);
      });
    }

    const edgeMap = new Map();
    if (Array.isArray(data.edges)) {
      data.edges.forEach(e => {
        if (e && e.id) edgeMap.set(e.id, e);
      });
    }

    // blocked_nodes: rooms and junctions only
    if (!Array.isArray(blocked_nodes)) {
      errors.push('initial_state.blocked_nodes must be an array.');
    } else {
      blocked_nodes.forEach(nodeId => {
        if (!nodeMap.has(nodeId)) {
          errors.push(`initial_state.blocked_nodes contains non-existent node "${nodeId}".`);
        } else {
          const nodeType = nodeMap.get(nodeId).type;
          if (nodeType !== 'room' && nodeType !== 'junction') {
            errors.push(`initial_state.blocked_nodes id "${nodeId}" has type "${nodeType}". Only rooms and junctions can be in blocked_nodes.`);
          }
        }
      });
    }

    // closed_exits: exits only
    if (!Array.isArray(closed_exits)) {
      errors.push('initial_state.closed_exits must be an array.');
    } else {
      closed_exits.forEach(exitId => {
        if (!nodeMap.has(exitId)) {
          errors.push(`initial_state.closed_exits contains non-existent node "${exitId}".`);
        } else {
          const nodeType = nodeMap.get(exitId).type;
          if (nodeType !== 'exit') {
            errors.push(`initial_state.closed_exits id "${exitId}" has type "${nodeType}". Only exits can be in closed_exits.`);
          }
        }
      });
    }

    // blocked_edges: edges only
    if (!Array.isArray(blocked_edges)) {
      errors.push('initial_state.blocked_edges must be an array.');
    } else {
      blocked_edges.forEach(edgeId => {
        if (!edgeMap.has(edgeId)) {
          errors.push(`initial_state.blocked_edges contains non-existent edge "${edgeId}".`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
