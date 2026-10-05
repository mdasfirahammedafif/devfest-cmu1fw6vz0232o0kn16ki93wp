import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateEvacuationRoute } from '../src/utils/router.js';
import { validateBuildingData } from '../src/utils/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawData = fs.readFileSync(path.join(__dirname, '../public/building.json'), 'utf8');
const buildingData = JSON.parse(rawData);

console.log('--- 1. Testing Validation on Sample Building Data ---');
const validation = validateBuildingData(buildingData);
console.log('Validation passed:', validation.valid);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
  process.exit(1);
}

console.log('\n--- 2. Testing 5 Required Competition Scenarios (Section 4.1) ---');

let allPassed = true;

// Scenario 1: Baseline: Select R1 -> R1 - C1 - C2 - E1; cost 7
{
  const res = calculateEvacuationRoute(buildingData, 'R1', {
    blockedNodes: new Set(),
    blockedEdges: new Set(),
    closedExits: new Set()
  });
  const expectedPath = 'R1 - C1 - C2 - E1';
  const expectedCost = 7;
  const actualPath = res.path.join(' - ');
  const passed = actualPath === expectedPath && res.cost === expectedCost && res.status === 'ROUTE_FOUND';
  console.log(`[Scenario 1 - Baseline]: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Expected: ${expectedPath}; cost ${expectedCost}`);
  console.log(`  Actual:   ${actualPath}; cost ${res.cost} (Status: ${res.status})`);
  if (!passed) allPassed = false;
}

// Scenario 2: Blocked junction: Select R1; block C2 -> R1 - C1 - C3 - C4 - E2; cost 11
{
  const res = calculateEvacuationRoute(buildingData, 'R1', {
    blockedNodes: new Set(['C2']),
    blockedEdges: new Set(),
    closedExits: new Set()
  });
  const expectedPath = 'R1 - C1 - C3 - C4 - E2';
  const expectedCost = 11;
  const actualPath = res.path.join(' - ');
  const passed = actualPath === expectedPath && res.cost === expectedCost && res.status === 'ROUTE_FOUND';
  console.log(`[Scenario 2 - Blocked junction C2]: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Expected: ${expectedPath}; cost ${expectedCost}`);
  console.log(`  Actual:   ${actualPath}; cost ${res.cost} (Status: ${res.status})`);
  if (!passed) allPassed = false;
}

// Scenario 3: Exits closed: Select R1; close E1 and E2 -> No route available
{
  const res = calculateEvacuationRoute(buildingData, 'R1', {
    blockedNodes: new Set(),
    blockedEdges: new Set(),
    closedExits: new Set(['E1', 'E2'])
  });
  const expectedMsg = 'No route available';
  const passed = res.message === expectedMsg && res.status === 'NO_ROUTE';
  console.log(`[Scenario 3 - Exits closed E1, E2]: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Expected: ${expectedMsg}`);
  console.log(`  Actual:   ${res.message} (Status: ${res.status})`);
  if (!passed) allPassed = false;
}

// Scenario 4: Different start: Select R2 -> R2 - C3 - C4 - E2; cost 7
{
  const res = calculateEvacuationRoute(buildingData, 'R2', {
    blockedNodes: new Set(),
    blockedEdges: new Set(),
    closedExits: new Set()
  });
  const expectedPath = 'R2 - C3 - C4 - E2';
  const expectedCost = 7;
  const actualPath = res.path.join(' - ');
  const passed = actualPath === expectedPath && res.cost === expectedCost && res.status === 'ROUTE_FOUND';
  console.log(`[Scenario 4 - Different start R2]: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Expected: ${expectedPath}; cost ${expectedCost}`);
  console.log(`  Actual:   ${actualPath}; cost ${res.cost} (Status: ${res.status})`);
  if (!passed) allPassed = false;
}

// Scenario 5: Blocked start: Select R1; then block R1 -> Starting location blocked
{
  const res = calculateEvacuationRoute(buildingData, 'R1', {
    blockedNodes: new Set(['R1']),
    blockedEdges: new Set(),
    closedExits: new Set()
  });
  const expectedMsg = 'Starting location blocked';
  const passed = res.message === expectedMsg && res.status === 'BLOCKED_START';
  console.log(`[Scenario 5 - Blocked start R1]: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Expected: ${expectedMsg}`);
  console.log(`  Actual:   ${res.message} (Status: ${res.status})`);
  if (!passed) allPassed = false;
}

console.log('\n--- Overall Sample Check Result ---');
if (allPassed) {
  console.log('ALL 5 OFFICIAL SCENARIOS PASSED WITH 100% ACCURACY! 🎉');
} else {
  console.error('SOME SCENARIOS FAILED!');
  process.exit(1);
}
