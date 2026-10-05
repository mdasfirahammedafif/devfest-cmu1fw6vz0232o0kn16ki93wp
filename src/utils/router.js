/**
 * Smart Escape - Route Calculator
 * Implements Dijkstra-based pathfinding with strict tie-breaking rules:
 * 1. Minimum total cost
 * 2. On equal cost: Lexicographically smallest exit ID
 * 3. On path ties to that exit: Lexicographically smallest sequence of node IDs
 */

export function calculateEvacuationRoute(data, startNodeId, hazards = {}) {
  const {
    blockedNodes = new Set(), // Set of room / junction IDs
    blockedEdges = new Set(), // Set of edge IDs
    closedExits = new Set()   // Set of exit IDs
  } = hazards;

  // 1. Validate start node
  if (!startNodeId) {
    return {
      status: 'NO_START',
      message: 'No starting location selected.',
      path: [],
      edgeIds: [],
      cost: 0,
      exitId: null
    };
  }

  const nodeMap = new Map((data.nodes || []).map(n => [n.id, n]));
  const startNode = nodeMap.get(startNodeId);

  if (!startNode) {
    return {
      status: 'INVALID_START',
      message: `Selected start node "${startNodeId}" does not exist.`,
      path: [],
      edgeIds: [],
      cost: 0,
      exitId: null
    };
  }

  if (startNode.type !== 'room' && startNode.type !== 'junction') {
    return {
      status: 'INVALID_START_TYPE',
      message: 'Starting location must be an unblocked room or junction.',
      path: [],
      edgeIds: [],
      cost: 0,
      exitId: null
    };
  }

  // Mandatory Requirement: "Starting location blocked if the selected start becomes blocked."
  if (blockedNodes.has(startNodeId)) {
    return {
      status: 'BLOCKED_START',
      message: 'Starting location blocked',
      path: [],
      edgeIds: [],
      cost: 0,
      exitId: null
    };
  }

  // 2. Identify open exits
  const openExits = (data.nodes || []).filter(
    n => n.type === 'exit' && !closedExits.has(n.id)
  );

  if (openExits.length === 0) {
    return {
      status: 'NO_ROUTE',
      message: 'No route available',
      path: [],
      edgeIds: [],
      cost: 0,
      exitId: null
    };
  }

  // 3. Build Adjacency List
  // Rules:
  // - Exclude blocked nodes and their incident edges
  // - Exclude blocked edges
  // - Exclude closed exits (including as intermediate nodes)
  // - Open exits can be destinations. An exit cannot be traversed through as an intermediate node.
  const adj = new Map();
  (data.nodes || []).forEach(n => adj.set(n.id, []));

  (data.edges || []).forEach(edge => {
    if (blockedEdges.has(edge.id)) return;

    const u = edge.from;
    const v = edge.to;
    const nodeU = nodeMap.get(u);
    const nodeV = nodeMap.get(v);

    if (!nodeU || !nodeV) return;
    if (blockedNodes.has(u) || blockedNodes.has(v)) return;
    if (closedExits.has(u) || closedExits.has(v)) return;

    // u -> v is valid if u is not an exit (exits are terminal destinations)
    if (nodeU.type !== 'exit') {
      adj.get(u).push({ to: v, cost: edge.cost, edgeId: edge.id });
    }
    // v -> u is valid if v is not an exit
    if (nodeV.type !== 'exit') {
      adj.get(v).push({ to: u, cost: edge.cost, edgeId: edge.id });
    }
  });

  // Helper Dijkstra forward from source
  function dijkstraFrom(srcId) {
    const dist = new Map();
    (data.nodes || []).forEach(n => dist.set(n.id, Infinity));
    dist.set(srcId, 0);

    const visited = new Set();
    const pq = [{ id: srcId, cost: 0 }];

    while (pq.length > 0) {
      // Find min cost in unvisited
      pq.sort((a, b) => a.cost - b.cost);
      const current = pq.shift();

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const neighbors = adj.get(current.id) || [];
      for (const edge of neighbors) {
        if (visited.has(edge.to)) continue;
        const newCost = current.cost + edge.cost;
        if (newCost < dist.get(edge.to)) {
          dist.set(edge.to, newCost);
          pq.push({ id: edge.to, cost: newCost });
        }
      }
    }
    return dist;
  }

  // Helper Dijkstra backward from target exit
  function dijkstraTo(targetId) {
    // Build reverse adjacency
    const revAdj = new Map();
    (data.nodes || []).forEach(n => revAdj.set(n.id, []));

    for (const [u, edges] of adj.entries()) {
      for (const e of edges) {
        revAdj.get(e.to).push({ to: u, cost: e.cost, edgeId: e.edgeId });
      }
    }

    const dist = new Map();
    (data.nodes || []).forEach(n => dist.set(n.id, Infinity));
    dist.set(targetId, 0);

    const visited = new Set();
    const pq = [{ id: targetId, cost: 0 }];

    while (pq.length > 0) {
      pq.sort((a, b) => a.cost - b.cost);
      const current = pq.shift();

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const neighbors = revAdj.get(current.id) || [];
      for (const edge of neighbors) {
        if (visited.has(edge.to)) continue;
        const newCost = current.cost + edge.cost;
        if (newCost < dist.get(edge.to)) {
          dist.set(edge.to, newCost);
          pq.push({ id: edge.to, cost: newCost });
        }
      }
    }
    return dist;
  }

  const distFromStart = dijkstraFrom(startNodeId);

  // Check reachable open exits
  const reachableExits = openExits.filter(
    e => distFromStart.get(e.id) < Infinity
  );

  if (reachableExits.length === 0) {
    return {
      status: 'NO_ROUTE',
      message: 'No route available',
      path: [],
      edgeIds: [],
      cost: 0,
      exitId: null
    };
  }

  // Find min cost among all reachable open exits
  let minCost = Infinity;
  reachableExits.forEach(e => {
    const c = distFromStart.get(e.id);
    if (c < minCost) minCost = c;
  });

  // Candidate exits with minimum cost
  const candidateExits = reachableExits.filter(
    e => distFromStart.get(e.id) === minCost
  );

  // Tie-breaking Rule 1: Choose the lexicographically smallest exit ID
  candidateExits.sort((a, b) => a.id.localeCompare(b.id));
  const bestExit = candidateExits[0];

  // Tie-breaking Rule 2: If paths to that exit tie, choose the lexicographically smallest sequence of node IDs
  const distFromBestExit = dijkstraTo(bestExit.id);

  // Greedily follow the lexicographically smallest optimal next node from start to target
  const path = [startNodeId];
  const edgeIds = [];
  let curr = startNodeId;

  while (curr !== bestExit.id) {
    const neighbors = adj.get(curr) || [];
    // A neighbor `v` via edge `e` is on an optimal shortest path if:
    // distFromStart(curr) + e.cost + distFromBestExit(v) === minCost
    const optimalNeighbors = neighbors.filter(e => {
      const stepCost = distFromStart.get(curr) + e.cost + distFromBestExit.get(e.to);
      return stepCost === minCost;
    });

    if (optimalNeighbors.length === 0) {
      // Inconsistent DAG (should never happen with positive weights)
      break;
    }

    // Sort by neighbor node ID lexicographically
    optimalNeighbors.sort((a, b) => a.to.localeCompare(b.to));
    const chosenEdge = optimalNeighbors[0];

    path.push(chosenEdge.to);
    edgeIds.push(chosenEdge.edgeId);
    curr = chosenEdge.to;
  }

  // Also collect alternative routes to other reachable exits or distinct sub-optimal paths
  const allRoutes = [];
  reachableExits.forEach(exit => {
    const exitCost = distFromStart.get(exit.id);
    const distToExit = dijkstraTo(exit.id);
    const altPath = [startNodeId];
    const altEdges = [];
    let c = startNodeId;

    while (c !== exit.id) {
      const neighbors = adj.get(c) || [];
      const opts = neighbors.filter(e => {
        return distFromStart.get(c) + e.cost + distToExit.get(e.to) === exitCost;
      });
      if (opts.length === 0) break;
      opts.sort((a, b) => a.to.localeCompare(b.to));
      altPath.push(opts[0].to);
      altEdges.push(opts[0].edgeId);
      c = opts[0].to;
    }

    if (c === exit.id) {
      allRoutes.push({
        exitId: exit.id,
        exitLabel: exit.label,
        cost: exitCost,
        path: altPath,
        edgeIds: altEdges,
        isBest: exit.id === bestExit.id && exitCost === minCost
      });
    }
  });

  allRoutes.sort((a, b) => a.cost - b.cost || a.exitId.localeCompare(b.exitId));

  return {
    status: 'ROUTE_FOUND',
    message: 'Valid route found',
    path,
    edgeIds,
    cost: minCost,
    exitId: bestExit.id,
    exitLabel: bestExit.label,
    alternativeRoutes: allRoutes
  };
}
