import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// =====================
// CONSTANTS & CONFIG
// =====================
const BACKEND = 'https://disastersimulation.onrender.com';

const ES_INDICES = [
  'disaster-reports',
  'disaster-outcomes',
  'disaster-plans',
  'strategy-memory',
  'counterfactual-memory',
  'dependency-memory',
  'knowledge-gap-memory',
  'causal-memory',
  'novel-event-memory',
  'recommendation-memory',
  'evidence-reliability-memory',
  'memory-conflict-resolution',
  'decision-lineage-memory',
  'emerging-risks'
];

const AGENTS = [
  { id: 'orchestrator', label: 'Orchestrator', x: 0.5, y: 0.15, color: '#00e5ff' },
  { id: 'historical', label: 'Historical', x: 0.18, y: 0.42, color: '#ffb000' },
  { id: 'learning', label: 'Learning', x: 0.38, y: 0.58, color: '#ffb000' },
  { id: 'planning', label: 'Planning', x: 0.62, y: 0.58, color: '#ffb000' },
  { id: 'reflection', label: 'Reflection', x: 0.82, y: 0.42, color: '#ffb000' },
  { id: 'counterfactual', label: 'Counterfactual', x: 0.5, y: 0.85, color: '#ffb000' },
];

const EDGES = [
  ['orchestrator', 'historical'],
  ['orchestrator', 'learning'],
  ['orchestrator', 'planning'],
  ['orchestrator', 'reflection'],
  ['historical', 'learning'],
  ['learning', 'planning'],
  ['planning', 'reflection'],
  ['reflection', 'counterfactual'],
];

// =====================
// STATE
// =====================
let mockEnabled = true;
let simulationRunning = false;
let currentResult = null;
let agentStates = {};
let selectedIndex = null;

let rainfall = 50;
let riverFlow = 20;
let drainage = 10;
let waterLevel = 10;
let floodDirection = 1;
let lastUpdate = Date.now();

// Reset all agents to idle state
AGENTS.forEach(ag => agentStates[ag.id] = 'idle');

// Asset structures
const assets = [
  { id: 'hospital', name: "Hospital", floodLevel: 25, population: 500, flooded: false },
  { id: 'powerGrid', name: "Electric Power Grid", floodLevel: 30, population: 400, flooded: false },
  { id: 'school', name: "School", floodLevel: 35, population: 300, flooded: false },
  { id: 'bridge', name: "Bridge", floodLevel: 45, population: 200, flooded: false }
];

// =====================
// CESIUM MAP SETUP
// =====================
const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  timeline: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  navigationHelpButton: false,
  baseLayerPicker: true,
  creditsDisplay: false // Clean credentials banner
});

// Configure camera focused on Dehradun flood zone
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(78.0322, 30.3165, 3500),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-60.0),
    roll: 0.0
  }
});

// Create Flood Zone Entity (Blue Extruded Polygon)
const floodPolygon = viewer.entities.add({
  polygon: {
    hierarchy: Cesium.Cartesian3.fromDegreesArray([
      78.028, 30.314,
      78.035, 30.314,
      78.035, 30.320,
      78.028, 30.320
    ]),
    material: Cesium.Color.BLUE.withAlpha(0.4),
    extrudedHeight: waterLevel,
    height: 0
  }
});

// Create 3D buildings as boxes representing infrastructure assets
const hospitalEntity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(78.031, 30.317, 25),
  box: {
    dimensions: new Cesium.Cartesian3(120, 120, 50),
    material: Cesium.Color.GREEN.withAlpha(0.7),
    outline: true,
    outlineColor: Cesium.Color.BLACK
  },
  label: {
    text: "HOSPITAL",
    font: "bold 10px monospace",
    fillColor: Cesium.Color.WHITE,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -30)
  }
});

const schoolEntity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(78.033, 30.318, 25),
  box: {
    dimensions: new Cesium.Cartesian3(100, 100, 50),
    material: Cesium.Color.GREEN.withAlpha(0.7),
    outline: true,
    outlineColor: Cesium.Color.BLACK
  },
  label: {
    text: "SCHOOL",
    font: "bold 10px monospace",
    fillColor: Cesium.Color.WHITE,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -30)
  }
});

const bridgeEntity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(78.034, 30.316, 15),
  box: {
    dimensions: new Cesium.Cartesian3(150, 45, 30),
    material: Cesium.Color.GREEN.withAlpha(0.7),
    outline: true,
    outlineColor: Cesium.Color.BLACK
  },
  label: {
    text: "RIVER BRIDGE",
    font: "bold 10px monospace",
    fillColor: Cesium.Color.WHITE,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20)
  }
});

const powerGridEntity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(78.0325, 30.319, 20),
  box: {
    dimensions: new Cesium.Cartesian3(180, 60, 40),
    material: Cesium.Color.ORANGE.withAlpha(0.7),
    outline: true,
    outlineColor: Cesium.Color.BLACK
  },
  label: {
    text: "POWER GRID",
    font: "bold 10px monospace",
    fillColor: Cesium.Color.WHITE,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -25)
  }
});

const assetEntities = {
  hospital: hospitalEntity,
  powerGrid: powerGridEntity,
  school: schoolEntity,
  bridge: bridgeEntity
};

// =====================
// MOCK DATA PACKET
// =====================
const MOCK_RESULT = {
  historicalMatches: [
    { id: 'EVT-2021-DEH-003', type: 'FLOOD', location: 'Dehradun Lower Basin', year: 2021, similarity: 0.94, ageYears: 4.8, outcome: 'Controlled Evacuation, bridge intact' },
    { id: 'EVT-2019-DEH-012', type: 'FLOOD', location: 'Rajpur Road Slopes', year: 2019, similarity: 0.81, ageYears: 6.9, outcome: 'School flooded, evacuations completed' },
    { id: 'EVT-2022-DEH-007', type: 'FLOOD', location: 'Bindal River Overflow', year: 2022, similarity: 0.74, ageYears: 3.5, outcome: 'Hospital pre-emptively sandbagged' },
    { id: 'EVT-2018-OUT-021', type: 'FLOOD', location: 'Haridwar Plain Catchment', year: 2018, similarity: 0.61, ageYears: 7.9, outcome: 'Relief channels active' }
  ],
  responsePlan: {
    summary: 'Mobilize emergency response nodes. Direct drainage channels, deploy containment vectors, pre-position medical assets at safe coordinates.',
    phases: [
      { phase: 'PHASE-1 // Initial Response (0-4h)', actions: ['Deploy Dehradun NDRF Battalion #4', 'Activate flood sirens at Bindal/Rispana basin', 'Redirect city runoff channels to secondary reservoirs'] },
      { phase: 'PHASE-2 // Mitigation Operations (4-24h)', actions: ['Pre-position emergency school shelter beds', 'Deploy sandbags around Hospital perimeter', 'Route rescue boats to low-lying areas'] },
      { phase: 'PHASE-3 // Stabilisation (24h+)', actions: ['Establish road drainage pipelines', 'Audit bridge structurally before reopening', 'Initiate disease vector controls'] }
    ],
    risks: [
      { label: 'Hospital Perimeter Breach', severity: 'high' },
      { label: 'Bridge Structural Fatigue', severity: 'high' },
      { label: 'Drainage Pipe Blockage', severity: 'med' },
      { label: 'Communication Blackout', severity: 'med' },
      { label: 'Sub-Basin Silt Accumulation', severity: 'low' }
    ],
    approved: true
  },
  counterfactual: {
    actual: 'Observation: Telemetry shows standard response latency (6h post-incident). Hospital floor submerged at WL > 25m. Bridge closed.',
    alternativeActions: ['Activate early pumping station gates at WL=15m', 'Sandbag hospital perimeter 12h prior', 'Pre-emptively route traffic away from Bridge'],
    estimatedImpact: { populationSafetyIndex: '+24%', infrastructureDebris: '-35%', rescueLatency: '-1.8h' },
    reasoning: 'Implementing preventive sandbagging and early pumping reduces building saturation by ~35% and decreases critical response delays.',
    confidence: 0.84
  },
  intelligence: {
    noveltyScore: 0.28,
    emergingRiskProbability: 0.72,
    contradictionScore: 0.18,
    overallConfidence: 0.79,
    confidenceBreakdown: { strategyMemory: 0.82, evidenceReliability: 0.74, dependencySupport: 0.81 },
    confidencePenalty: 0.05,
    emergingRisks: [
      { risk: 'Silt deposits reducing Bindal river capacity by 40%', probability: 0.84, severity: 'HIGH' },
      { risk: 'Secondary landslide on Mussoorie foothills blocking highway', probability: 0.68, severity: 'HIGH' },
      { risk: 'Runoff channel saturation at Raipur sector', probability: 0.51, severity: 'MEDIUM' }
    ],
    causalChains: [
      { cause: 'Rainfall Spike', effect: 'Water Level Surge', confidence: 0.96 },
      { cause: 'Water Level Surge', effect: 'Hospital Inundation', confidence: 0.89 },
      { cause: 'Hospital Inundation', effect: 'Emergency Grid Power Fault', confidence: 0.78 },
      { cause: 'Emergency Grid Power Fault', effect: 'Critical Life Support Interruption', confidence: 0.71 }
    ],
    dependencyChains: [
      { source: 'Drainage Pumping', target: 'Grid Power', confidence: 0.88 },
      { source: 'Grid Power', target: 'Hospital ICU Backup', confidence: 0.84 },
      { source: 'Bridge Network', target: 'Evacuation Routes', confidence: 0.76 }
    ],
    conflicts: [{ description: 'Local IMD water level sensors (23m) contradict satellite GIS synthetic aperture radar readings (18m)', severity: 0.18 }]
  },
  agentTraces: {
    orchestrator: { status: 'finished', delegatedTo: '5 agents', latency: 34 },
    historical: { status: 'finished', matchesFound: 4, retrievalQuality: 0.94, latency: 142 },
    learning: { status: 'finished', bayesianSmoothing: true, successRate: 0.82, latency: 89 },
    planning: { status: 'finished', strategiesConsidered: 9, approved: true, latency: 1980 },
    reflection: { status: 'finished', risksIdentified: 5, approved: true, latency: 1240 },
    counterfactual: { status: 'finished', alternativesEvaluated: 3, qualityGatePassed: true, confidence: 0.84, latency: 1100 }
  }
};

const MOCK_INDEX_COUNTS = {
  'disaster-reports': 312, 'disaster-outcomes': 245, 'disaster-plans': 214,
  'strategy-memory': 489, 'counterfactual-memory': 102, 'dependency-memory': 187,
  'knowledge-gap-memory': 81, 'causal-memory': 296, 'novel-event-memory': 42,
  'recommendation-memory': 213, 'evidence-reliability-memory': 118,
  'memory-conflict-resolution': 58, 'decision-lineage-memory': 345, 'emerging-risks': 79
};

// =====================
// SYSTEM CLOCK
// =====================
function updateClock() {
  const now = new Date();
  const istOptions = {
    hour12: false,
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const istTime = now.toLocaleTimeString('en-GB', istOptions);
  document.getElementById('clock').textContent = `${istTime} IST`;
}
setInterval(updateClock, 1000);
updateClock();

// =====================
// CANVAS: COGNITIVE GRAPH
// =====================
let graphCanvas, graphCtx;
let graphAnimFrame = 0;

function initGraphCanvas() {
  graphCanvas = document.getElementById('agent-canvas');
  graphCtx = graphCanvas.getContext('2d');
  resizeGraphCanvas();
  window.addEventListener('resize', resizeGraphCanvas);
  graphCanvas.addEventListener('mousemove', handleGraphHover);
  graphCanvas.addEventListener('click', handleGraphClick);
  drawAgentGraph();
}

function resizeGraphCanvas() {
  if (!graphCanvas) return;
  graphCanvas.width = graphCanvas.offsetWidth;
  graphCanvas.height = graphCanvas.offsetHeight;
}

function getNodeCoordinates(agent) {
  return {
    x: agent.x * graphCanvas.width,
    y: agent.y * graphCanvas.height
  };
}

function getStateColor(state) {
  const colors = {
    idle: '#393f4d',
    computing: '#00e5ff',
    finished: '#00e676',
    failed: '#ff2a5f'
  };
  return colors[state] || '#393f4d';
}

function drawAgentGraph() {
  if (!graphCanvas || !graphCtx) return;
  graphAnimFrame++;
  const ctx = graphCtx;
  const W = graphCanvas.width;
  const H = graphCanvas.height;
  
  ctx.clearRect(0, 0, W, H);

  // Background Grid Lines
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  const gridSpace = 25;
  for (let x = 0; x < W; x += gridSpace) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSpace) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Draw Edge Connections
  EDGES.forEach(([fromId, toId]) => {
    const fromAgent = AGENTS.find(a => a.id === fromId);
    const toAgent = AGENTS.find(a => a.id === toId);
    if (!fromAgent || !toAgent) return;

    const pA = getNodeCoordinates(fromAgent);
    const pB = getNodeCoordinates(toAgent);

    const sA = agentStates[fromId] || 'idle';
    const sB = agentStates[toId] || 'idle';
    const active = sA === 'computing' || sB === 'computing';
    const complete = sA === 'finished' && sB === 'finished';

    ctx.strokeStyle = complete ? 'rgba(0, 230, 118, 0.25)' : active ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = complete ? 2 : 1;
    ctx.setLineDash(complete ? [] : [3, 4]);
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated packet on active link
    if (active) {
      const progress = (graphAnimFrame % 45) / 45;
      const px = pA.x + (pB.x - pA.x) * progress;
      const py = pA.y + (pB.y - pA.y) * progress;
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Draw Agent Nodes
  AGENTS.forEach(agent => {
    const coords = getNodeCoordinates(agent);
    const state = agentStates[agent.id] || 'idle';
    const color = getStateColor(state);
    const radius = 15;

    // Glowing Outer Halo
    if (state !== 'idle') {
      const pulseRate = state === 'computing' ? 0.08 : 0.03;
      const pulse = 1.0 + 0.2 * Math.sin(graphAnimFrame * pulseRate);
      const grad = ctx.createRadialGradient(coords.x, coords.y, radius * 0.4, coords.x, coords.y, radius * 2.2 * pulse);
      grad.addColorStop(0, color + '55');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, radius * 2.2 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Node Border & Fill
    ctx.strokeStyle = color;
    ctx.lineWidth = state === 'computing' ? 2 + Math.sin(graphAnimFrame * 0.1) * 0.5 : 1.5;
    ctx.fillStyle = '#090a0f';
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Central Core Dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label Text
    ctx.fillStyle = state === 'idle' ? varColor('--text-muted') : '#fff';
    ctx.font = 'bold 9px var(--font-ui)';
    ctx.textAlign = 'center';
    ctx.fillText(agent.label.toUpperCase(), coords.x, coords.y + radius + 11);
  });

  requestAnimationFrame(drawAgentGraph);
}

function handleGraphHover(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const hit = AGENTS.find(agent => {
    const coords = getNodeCoordinates(agent);
    return Math.hypot(coords.x - mx, coords.y - my) < 22;
  });

  graphCanvas.style.cursor = hit ? 'pointer' : 'default';

  const tooltip = document.getElementById('tooltip');
  if (hit && currentResult?.agentTraces?.[hit.id]) {
    const trace = currentResult.agentTraces[hit.id];
    let html = `<div style="font-weight:700; margin-bottom:4px; color:var(--primary)">${hit.label.toUpperCase()} AGENT</div>`;
    Object.entries(trace).forEach(([k, v]) => {
      html += `<div style="display:flex; justify-content:space-between; gap:12px">
        <span style="color:var(--text-secondary)">${k}:</span>
        <span style="color:#fff; font-weight:500">${v}</span>
      </div>`;
    });
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top = (e.clientY - 14) + 'px';
  } else {
    tooltip.style.display = 'none';
  }
}

function handleGraphClick(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const hit = AGENTS.find(agent => {
    const coords = getNodeCoordinates(agent);
    return Math.hypot(coords.x - mx, coords.y - my) < 22;
  });

  if (hit) {
    expandTrace(hit.id);
  }
}

function varColor(cssVar) {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}

// =====================
// CANVAS: CONFIDENCE RADAR
// =====================
function drawConfidenceRadar(data) {
  const canvas = document.getElementById('confidence-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2 + 5;
  const R = 55;

  ctx.clearRect(0, 0, W, H);

  const segments = [
    { label: 'STRATEGY MEM', value: data.strategyMemory ?? 0.5, color: '#ffb000', weight: 0.4 },
    { label: 'EVIDENCE REL', value: data.evidenceReliability ?? 0.5, color: '#00e5ff', weight: 0.3 },
    { label: 'DEP SUPPORT', value: data.dependencySupport ?? 0.5, color: '#00e676', weight: 0.3 },
  ];

  // Grid Concentric Rings
  [0.25, 0.5, 0.75, 1.0].forEach(factor => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R * factor, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Render segments
  let startAngle = -Math.PI / 2;
  segments.forEach(seg => {
    const angleSpan = Math.PI * 2 * seg.weight;
    const outerRadius = R * seg.value;
    const innerRadius = R * 0.25;

    // Outer Background Arc Arc
    ctx.strokeStyle = seg.color + '18';
    ctx.lineWidth = R - innerRadius;
    ctx.beginPath();
    ctx.arc(cx, cy, (R + innerRadius) / 2, startAngle, startAngle + angleSpan);
    ctx.stroke();

    // Value Arc
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = outerRadius - innerRadius;
    ctx.beginPath();
    ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, startAngle, startAngle + angleSpan);
    ctx.stroke();

    // Label Placement
    const midAngle = startAngle + angleSpan / 2;
    const lx = cx + Math.cos(midAngle) * (R + 15);
    const ly = cy + Math.sin(midAngle) * (R + 15);
    
    ctx.fillStyle = seg.color;
    ctx.font = '500 8px var(--font-ui)';
    ctx.textAlign = lx < cx ? 'right' : 'left';
    ctx.fillText(seg.label, lx, ly - 3);
    ctx.font = 'bold 9px var(--font-mono)';
    ctx.fillText(Math.round(seg.value * 100) + '%', lx, ly + 6);

    startAngle += angleSpan;
  });

  // Center composite index value
  const overall = segments.reduce((sum, seg) => sum + seg.value * seg.weight, 0);
  ctx.fillStyle = '#ffb000';
  ctx.font = 'bold 16px var(--font-mono)';
  ctx.textAlign = 'center';
  ctx.fillText(overall.toFixed(2), cx, cy + 3);
  ctx.fillStyle = varColor('--text-muted');
  ctx.font = '600 7px var(--font-ui)';
  ctx.fillText('CONFIDENCE', cx, cy + 12);
}

// =====================
// PHYSICAL FLOOD SIMULATION LOOP
// =====================
function runSimulationTick() {
  if (!simulationRunning) return;

  const now = Date.now();
  if (now - lastUpdate < 1000) return;
  lastUpdate = now;

  // Read current parameters
  rainfall = parseFloat(document.getElementById('rainfall').value);
  riverFlow = parseFloat(document.getElementById('riverflow').value);
  drainage = parseFloat(document.getElementById('drainage').value);

  // Compute water level change
  const inputFactor = (rainfall * 0.08) + (riverFlow * 0.04) - (drainage * 0.06);
  waterLevel += inputFactor * floodDirection;

  // Boundary conditions & direction flip
  if (waterLevel >= 200) {
    waterLevel = 200;
    floodDirection = -1; // Recede
  } else if (waterLevel <= 0) {
    waterLevel = 0;
    floodDirection = 1; // Rise again
  }

  // Update slider displays
  document.getElementById('water-level').value = waterLevel.toFixed(1);
  document.getElementById('water-level-val').textContent = waterLevel.toFixed(1) + ' m';

  // Evaluate assets flood status
  let totalAffectedPopulation = 0;
  let activeMask = 0;

  assets.forEach((asset, idx) => {
    const entity = assetEntities[asset.id];
    
    if (waterLevel >= asset.floodLevel) {
      asset.flooded = true;
      totalAffectedPopulation += asset.population;
      activeMask |= (1 << idx);

      // Color flooded box Red
      if (entity && entity.box) {
        entity.box.material = Cesium.Color.RED.withAlpha(0.6);
      }
    } else {
      asset.flooded = false;

      // Color nominal box Green or Yellow if close to flood height
      if (entity && entity.box) {
        const delta = asset.floodLevel - waterLevel;
        if (delta < 5) {
          entity.box.material = Cesium.Color.YELLOW.withAlpha(0.6);
        } else {
          entity.box.material = Cesium.Color.GREEN.withAlpha(0.6);
        }
      }
    }
  });

  // Update affected metrics
  document.getElementById('pop-aff').value = totalAffectedPopulation;
  document.getElementById('pop-aff-val').textContent = totalAffectedPopulation.toLocaleString();
  document.getElementById('infra-mask').value = activeMask;
  document.getElementById('infra-mask-val').textContent = '0b' + activeMask.toString(2).padStart(8, '0');

  // Dynamically update Cesium water height
  floodPolygon.polygon.extrudedHeight = waterLevel;

  // Update UI indicators
  updateInfrastructureCascade();
  syncPayload();
}

function updateInfrastructureCascade() {
  const container = document.getElementById('cascade-container');
  let html = '';
  assets.forEach(asset => {
    const statusClass = asset.flooded ? 'active' : (asset.floodLevel - waterLevel < 5) ? 'warning' : 'ok';
    const statusText = asset.flooded ? 'FLOODED' : (asset.floodLevel - waterLevel < 5) ? 'WARNING' : 'NOMINAL';
    html += `<div class="cascade-node ${statusClass}">
      <span style="flex:1">${asset.name} Infrastructure</span>
      <span style="font-size:10px; font-weight:600">${statusText}</span>
    </div>`;
  });
  container.innerHTML = html;
}

// =====================
// FRONTEND RENDERING LOGIC
// =====================
function renderResults(data) {
  if (!data) return;

  // Clean wrapper check
  const r = mockEnabled ? MOCK_RESULT : (data.data ?? data);

  // Render Sub-Views
  renderHistoricalList(r.historicalMatches || r.matches || []);
  renderResponsePlan(r.responsePlan || r.plan || r.generatedPlan);
  renderCounterfactual(r.counterfactual || {});
  renderAgentTraces(r.agentTraces || r.workflowTrace || {});

  // Render Intelligence Metrics
  const intel = r.intelligence || r.learningInsights?.operationalIntelligence || {};
  renderContradictionBeam(intel.contradictionScore ?? 0.0);
  renderIntelligenceTab(r);
  
  document.getElementById('trace-badge').textContent = 'NOMINAL';
  document.getElementById('trace-badge').className = 'panel-badge badge-emerald';
}

function renderHistoricalList(matches) {
  const container = document.getElementById('historical-list');
  const fallback = document.getElementById('fallback-historical');

  if (!matches || matches.length === 0) {
    fallback.classList.add('active');
    fallback.style.display = 'block';
    container.innerHTML = '';
    return;
  }
  fallback.classList.remove('active');
  fallback.style.display = 'none';

  container.innerHTML = matches.map(m => {
    // Check if m has .source wrapper (like API output) or flat structure (mock)
    const data = m.source ?? m;
    const name = m.id ?? data.eventId ?? 'EVT-UNKNOWN';
    const year = m.year ?? (data.metadata?.timestamp ? new Date(data.metadata.timestamp).getFullYear() : 'N/A');
    const location = m.location ?? (data.location?.region ?? 'Dehradun Region');
    const outcome = m.outcome ?? data.outcome?.outcome ?? 'No outcomes archived';
    const similarity = m.similarity ?? 0.5;
    const ageYears = m.ageYears ?? (m.score ? (10 - m.score) : 4.0);

    const decay = Math.exp(-0.6 * ageYears / 5.0);
    const decayPct = Math.round(decay * 100);
    const aged = ageYears > 5;

    return `
      <div class="match-card flash">
        <div class="match-header">
          <span class="match-title">${name}</span>
          <span class="match-score">${(similarity * 100).toFixed(1)}% match</span>
        </div>
        <div style="font-size:10px; color:var(--text-secondary); margin-bottom:6px">
          ${data.disaster?.type ?? 'FLOOD'} // ${location} // ${year}
        </div>
        <div class="decay-bar-container">
          <div class="decay-bar-label">
            <span>TEMPORAL DECAY (λ=0.6)</span>
            <span style="color:${aged ? 'var(--crimson)' : 'var(--amber)'}">${decayPct}%</span>
          </div>
          <div class="decay-bar">
            <div class="decay-fill ${aged ? 'aged' : ''}" style="width:${decayPct}%"></div>
          </div>
        </div>
        <div style="font-size:10px; color:var(--text-secondary)">Outcome: <span style="color:#fff">${outcome}</span></div>
      </div>`;
  }).join('');
}

function renderResponsePlan(plan) {
  const container = document.getElementById('plan-content');
  const fallback = document.getElementById('fallback-plan');

  if (!plan) {
    fallback.classList.add('active');
    fallback.style.display = 'block';
    container.innerHTML = '';
    return;
  }
  fallback.classList.remove('active');
  fallback.style.display = 'none';

  const summary = plan.summary ?? 'No summary compiled.';
  const phases = plan.phases ?? plan.recommendedActions ?? [];
  const risks = plan.risks ?? [];
  const approved = plan.approved ?? true;

  let html = `
    <div class="plan-block">
      <div class="plan-block-title">▸ Executive Summary</div>
      <div class="plan-block-content">${summary}</div>
    </div>`;

  phases.forEach(p => {
    // Map both flat and nested properties
    const title = p.phase ?? `Priority: ${p.priority ?? 'ACTION'}`;
    const actions = p.actions ?? [p.action].filter(Boolean);
    const details = actions.map(a => `• ${a}`).join('<br>');
    html += `
      <div class="plan-block" style="border-left-color: var(--primary)">
        <div class="plan-block-title" style="color:var(--primary)">▸ ${title}</div>
        <div class="plan-block-content">${details}</div>
      </div>`;
  });

  if (risks.length > 0) {
    html += `
      <div class="plan-block" style="border-left-color: var(--crimson)">
        <div class="plan-block-title" style="color:var(--crimson)">▸ Identified Vulnerabilities</div>
        <div class="plan-block-content" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px">
          ${risks.map(r => {
            const sev = r.severity ?? 'med';
            const label = r.label ?? r.risk ?? 'Unknown Risk';
            return `<span class="risk-tag risk-${sev}">${label}</span>`;
          }).join('')}
        </div>
      </div>`;
  }

  html += `
    <div class="plan-block" style="border-left-color: ${approved ? 'var(--emerald)' : 'var(--crimson)'}">
      <div class="plan-block-title" style="color:${approved ? 'var(--emerald)' : 'var(--crimson)'}">
        ${approved ? '✓ SECURITY REFLECTION VERIFIED & APPROVED' : '✗ REFLECTION CRITIQUE REJECTED'}
      </div>
    </div>`;

  container.innerHTML = html;
}

function renderCounterfactual(cf) {
  document.getElementById('cf-actual').textContent = cf.actual ?? 'No historical actual path recorded.';
  
  const alternateEl = document.getElementById('cf-alternate');
  const reasoning = cf.reasoning ?? 'No alternate path evaluated.';
  const alternatives = cf.alternativeActions ?? [];
  const impact = cf.estimatedImpact ?? {};
  
  let html = `<div style="color:var(--text-secondary); margin-bottom:8px">${reasoning}</div>`;
  
  if (alternatives.length > 0) {
    html += `<div style="margin-bottom:10px">
      ${alternatives.map(a => `<div style="margin-bottom:4px; color:#fff">→ ${a}</div>`).join('')}
    </div>`;
  }

  if (Object.keys(impact).length > 0) {
    html += `<div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:8px">`;
    Object.entries(impact).forEach(([k, v]) => {
      html += `<div class="metric-row" style="padding:4px 0">
        <span class="metric-key">${k.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
        <span class="metric-val" style="color:var(--emerald)">${v}</span>
      </div>`;
    });
    html += `</div>`;
  }

  alternateEl.innerHTML = html;

  const warning = document.getElementById('cf-gate-warn');
  warning.style.display = (cf.confidence !== undefined && cf.confidence < 0.6) ? 'block' : 'none';
}

function renderContradictionBeam(score) {
  const marker = document.getElementById('beam-marker');
  const valEl = document.getElementById('contra-val');
  const statusEl = document.getElementById('contra-status');

  const percent = Math.min(Math.max(score * 100, 0), 100);
  marker.style.left = percent + '%';
  valEl.textContent = score.toFixed(2);

  if (score >= 0.5) {
    statusEl.textContent = 'CRITICAL CONTRADICTION ALERT';
    statusEl.style.color = 'var(--crimson)';
  } else if (score >= 0.2) {
    statusEl.textContent = 'CONFLICT INGESTION CAUTION';
    statusEl.style.color = 'var(--amber)';
  } else {
    statusEl.textContent = 'NOMINAL SYSTEM HARMONY';
    statusEl.style.color = 'var(--emerald)';
  }
}

function renderAgentTraces(traces) {
  const container = document.getElementById('agent-traces-container');
  
  // Parse trace keys. If traces is the backend's workflowTrace, reconstruct details
  const parsedTraces = {};
  if (traces.timestamps) {
    // Reconstruct latency and completion details from raw backend data
    AGENTS.forEach(ag => {
      let duration = 0;
      let status = 'finished';
      if (ag.id === 'orchestrator') {
        duration = 42;
      } else if (ag.id === 'historical') {
        duration = computeDuration(traces.timestamps.retrievalStarted, traces.timestamps.retrievalFinished);
      } else if (ag.id === 'learning') {
        duration = computeDuration(traces.timestamps.learningStarted, traces.timestamps.learningFinished);
      } else if (ag.id === 'planning') {
        duration = computeDuration(traces.timestamps.planningStarted, traces.timestamps.planningFinished);
      } else if (ag.id === 'reflection') {
        duration = computeDuration(traces.timestamps.reflectionStarted, traces.timestamps.reflectionFinished);
      } else if (ag.id === 'counterfactual') {
        duration = 1100;
      }
      parsedTraces[ag.id] = {
        status,
        latency: duration,
        ...getDefaultTraceParams(ag.id)
      };
    });
  } else {
    // Use directly as key-value pairs (like mock or formatted results)
    AGENTS.forEach(ag => {
      if (traces[ag.id]) parsedTraces[ag.id] = traces[ag.id];
    });
  }

  if (Object.keys(parsedTraces).length === 0) {
    container.innerHTML = `<div style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono); text-align:center; padding:12px">
      No active thought traces. Run agent to observe handoff sequence.
    </div>`;
    return;
  }

  container.innerHTML = AGENTS.map(ag => {
    const trace = parsedTraces[ag.id];
    if (!trace) return '';
    const state = trace.status ?? 'finished';
    const latency = trace.latency ? `${trace.latency}ms` : '';
    const colorClass = state === 'finished' ? 'ok' : state === 'computing' ? 'warn' : 'fail';
    
    return `
      <div class="agent-trace" id="trace-${ag.id}">
        <div class="agent-trace-header" onclick="expandTrace('${ag.id}')">
          <span class="agent-trace-name" style="color:${getStateColor(state)}">${ag.label.toUpperCase()}</span>
          <span style="font-size:9px; color:${getStateColor(state)}">${state.toUpperCase()} ${latency}</span>
        </div>
        <div class="agent-trace-body">
          ${Object.entries(trace).filter(([k]) => k !== 'status').map(([k, v]) => `
            <div class="trace-row">
              <span class="trace-key">${k}</span>
              <span class="trace-val ${typeof v === 'boolean' ? (v ? 'ok' : 'fail') : ''}">${JSON.stringify(v)}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

function computeDuration(start, end) {
  if (!start || !end) return 150;
  return Math.max(1, new Date(end) - new Date(start));
}

function getDefaultTraceParams(agentId) {
  const defaults = {
    historical: { matchesFound: 4, queryBoosts: 'disasterType:3.0, severity:2.5' },
    learning: { strategyGapsSolved: 2, operationalInsightsChecked: true },
    planning: { alternativePlansConsidered: 5, targetVulnerabilitiesScanned: 3 },
    reflection: { criteriaMatches: true, safetyMargin: '0.85' },
    counterfactual: { scenariosTested: 3, alternateImpactScore: '0.84' }
  };
  return defaults[agentId] ?? { info: 'Pipeline execution nominal' };
}

window.expandTrace = function(id) {
  const element = document.querySelector(`#trace-${id}`);
  if (element) {
    element.classList.toggle('open');
  }
};

function renderIntelligenceTab(data) {
  const r = mockEnabled ? MOCK_RESULT : (data.data ?? data);
  const intel = r.intelligence ?? r.learningInsights?.operationalIntelligence ?? {};
  
  const novelty = intel.noveltyScore ?? 0.0;
  const penalty = intel.confidencePenalty ?? 0.0;
  const overall = r.overallConfidence ?? intel.overallConfidence ?? 0.0;
  
  const stratVal = r.learningInsights?.strategyMemory?.[0]?.averageEffectiveness ?? intel.confidenceBreakdown?.strategyMemory ?? 0.0;
  const evVal = intel.confidenceBreakdown?.evidenceReliability ?? 0.0;

  // Sync displays
  document.getElementById('intel-novelty').textContent = novelty.toFixed(2);
  document.getElementById('intel-novelty-bar').style.width = (novelty * 100) + '%';

  document.getElementById('intel-penalty').textContent = '-' + Math.abs(penalty).toFixed(2);

  document.getElementById('intel-strat').textContent = stratVal.toFixed(2);
  document.getElementById('intel-strat-bar').style.width = (stratVal * 100) + '%';

  document.getElementById('intel-ev').textContent = evVal.toFixed(2);
  document.getElementById('intel-ev-bar').style.width = (evVal * 100) + '%';

  const overallEl = document.getElementById('intel-overall');
  overallEl.textContent = overall.toFixed(2);
  overallEl.style.color = overall >= 0.7 ? 'var(--emerald)' : overall >= 0.5 ? 'var(--amber)' : 'var(--crimson)';

  // Renders emerging risks list
  const risksPanel = document.getElementById('emerging-risks-panel');
  const emergingRisks = intel.emergingRisks || r.responsePlan?.risks || [];
  if (emergingRisks.length === 0) {
    risksPanel.innerHTML = `<div class="fallback-banner active">NO ANOMALOUS RISKS DETECTED — PIPELINE RUN REQUIRED</div>`;
  } else {
    risksPanel.innerHTML = emergingRisks.map(r => {
      const riskText = r.risk ?? r.label ?? 'Perimeter threat';
      const prob = r.probability ?? (r.severity === 'high' ? 0.85 : 0.5);
      const severity = r.severity?.toUpperCase() ?? 'HIGH';
      const badgeClass = severity === 'HIGH' ? 'risk-high' : 'risk-med';
      
      return `
        <div class="plan-block" style="border-left-color: ${severity === 'HIGH' ? 'var(--crimson)' : 'var(--amber)'}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
            <span class="risk-tag ${badgeClass}" style="margin:0">${severity}</span>
            <span style="font-family:var(--font-mono); color:var(--primary); font-size:10px">${Math.round(prob * 100)}% prob</span>
          </div>
          <div style="font-size:10.5px; color:#fff; line-height:1.4">${riskText}</div>
        </div>`;
    }).join('');
  }

  // Renders causal dependency chains list
  const causalPanel = document.getElementById('causal-chains-panel');
  const chains = intel.causalChains || intel.dependencyChains || [];
  if (chains.length === 0) {
    causalPanel.innerHTML = `<div class="fallback-banner active">NO CAUSAL INFERENCES COMPILED — PIPELINE RUN REQUIRED</div>`;
  } else {
    causalPanel.innerHTML = chains.map(c => {
      const src = c.cause ?? c.source ?? 'Rainfall';
      const dest = c.effect ?? c.target ?? 'Flood';
      const conf = c.confidence ?? 0.75;
      
      return `
        <div class="metric-row" style="padding:6px 0">
          <span style="flex:1; color:#fff">${src}</span>
          <span style="font-size:9px; color:var(--text-muted); padding:0 8px">→ [${Math.round(conf * 100)}%] →</span>
          <span style="flex:1; text-align:right; color:var(--primary)">${dest}</span>
        </div>`;
    }).join('');
  }

  // Redraw Radar Confidence Attributions
  drawConfidenceRadar(intel.confidenceBreakdown ?? { strategyMemory: stratVal, evidenceReliability: evVal, dependencySupport: 0.75 });
}

// =====================
// RUN WORKFLOW HANDLERS
// =====================
async function runAgentWorkflow(mode) {
  const banner = document.getElementById('running-banner');
  const bannerText = document.getElementById('running-text');
  const loadingOverlay = document.getElementById('loading-overlay');
  const traceContainer = document.getElementById('agent-traces-container');
  const tracePlaceholder = `<div style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono); text-align:center; padding:18px">
      Refreshing Live Thought Traces...<br>Awaiting workflow results.</div>`;
  const minLoadDelay = delay(3000);
  
  loadingOverlay.classList.add('active');
  traceContainer.innerHTML = tracePlaceholder;
  banner.classList.add('active');
  document.getElementById('trace-badge').textContent = 'COMPUTING';
  document.getElementById('trace-badge').className = 'panel-badge badge-cyan';

  const sequence = ['orchestrator', 'historical', 'learning', 'planning', 'reflection', 'counterfactual'];
  
  // Set all computing in graph
  sequence.forEach(id => agentStates[id] = 'idle');
  drawAgentGraph();

  if (mockEnabled) {
    bannerText.textContent = 'EXECUTING PIPELINE (MOCK MODE ACTIVE)...';
    
    for (let i = 0; i < sequence.length; i++) {
      agentStates[sequence[i]] = 'computing';
      await delay(400 + Math.random() * 400);
      agentStates[sequence[i]] = 'finished';
    }
    
    currentResult = MOCK_RESULT;
    renderResults(currentResult);
    await minLoadDelay;
    loadingOverlay.classList.remove('active');
    banner.classList.remove('active');
    return;
  }

  bannerText.textContent = mode === 'full' ? 'RUNNING FULL COGNITIVE PIPELINE...' : 'RUNNING BASIC WORKFLOW...';
  agentStates['orchestrator'] = 'computing';

  try {
    let payload;
    try {
      payload = JSON.parse(document.getElementById('payload-editor').value);
    } catch {
      payload = buildPayload();
    }

    const endpoint = mode === 'full' ? '/run-full-workflow' : '/run-agent';
    const res = await fetch(BACKEND + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observationReport: payload }) // Expects { observationReport } wrapper
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    // Set all nodes computing as we wait for response
    sequence.forEach(id => agentStates[id] = 'computing');
    
    const data = await res.json();
    
    // Set all complete
    sequence.forEach(id => agentStates[id] = 'finished');
    
    currentResult = data;
    renderResults(data);
    await minLoadDelay;
  } catch (err) {
    console.error('[workflow-error]', err);
    sequence.forEach(id => agentStates[id] = 'failed');
    
    document.getElementById('plan-content').innerHTML = `
      <div class="fallback-banner active" style="border-color:var(--crimson-border); color:var(--crimson)">
        [PIPELINE EXCEPTION OCCURRED // BACKEND OFFLINE]<br>
        Error: ${err.message}. Ensure backend is running on port 3000.
      </div>`;
    
    document.getElementById('trace-badge').textContent = 'FAILED';
    document.getElementById('trace-badge').className = 'panel-badge badge-crimson';
  }

  loadingOverlay.classList.remove('active');
}

function buildPayload() {
  return {
    eventId: 'EVT-' + Date.now().toString(36).toUpperCase(),
    disaster: {
      type: document.getElementById('disaster-type').value,
      severity: document.getElementById('severity').value,
    },
    environment: {
      waterLevel: parseFloat(document.getElementById('water-level').value),
      rainfall: parseFloat(document.getElementById('rainfall').value),
      trend: floodDirection > 0 ? 'rising' : 'falling',
    },
    population: {
      affectedPopulation: parseInt(document.getElementById('pop-aff').value),
    },
    infrastructure: {
      roadsAffected: 3,
      damageBitmask: parseInt(document.getElementById('infra-mask').value),
    },
    observations: [
      document.getElementById('src-news').value,
      document.getElementById('src-gov').value,
    ],
    metadata: { submittedAt: new Date().toISOString(), source: 'DRIS-CMD' },
  };
}

function syncPayload() {
  const payload = buildPayload();
  document.getElementById('payload-editor').value = JSON.stringify(payload, null, 2);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================
// MEMORY AUDIT: INDEX registry
// =====================
function renderIndexGrid() {
  const grid = document.getElementById('index-grid');
  grid.innerHTML = ES_INDICES.map(idx => {
    const count = MOCK_INDEX_COUNTS[idx] ?? 0;
    return `
      <div class="index-cell" onclick="selectMemoryIndex('${idx}')" id="idx-${idx}">
        <span class="index-name">${idx}</span>
        <span class="index-count">docs: <span>${count}</span></span>
      </div>`;
  }).join('');
}

window.selectMemoryIndex = function(name) {
  selectedIndex = name;
  document.querySelectorAll('.index-cell').forEach(c => c.classList.remove('selected'));
  document.getElementById(`idx-${name}`)?.classList.add('selected');
  document.getElementById('inspector-idx-label').textContent = name.toUpperCase();

  const container = document.getElementById('index-docs-container');

  if (mockEnabled) {
    const docs = generateMockDocs(name, 4);
    container.innerHTML = `<div class="json-viewer">${docs}</div>`;
    return;
  }

  container.innerHTML = '<div style="font-size:11px; color:var(--text-secondary); padding:12px">Querying index payloads...</div>';
  fetch(`${BACKEND}/debug/docs/${name}`)
    .then(res => res.json())
    .then(data => {
      // Check response wrapper
      const docs = data.docs ?? data;
      container.innerHTML = `<div class="json-viewer">${syntaxHighlight(JSON.stringify(docs, null, 2))}</div>`;
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = `
        <div class="fallback-banner active" style="border-color:var(--crimson-border); color:var(--crimson)">
          [BACKEND SERVER CONNECTION TIMEOUT]<br>
          Enable MOCK DATA toggle in header to view synthetic documents.
        </div>`;
    });
};

function generateMockDocs(indexName, count) {
  const templates = {
    'disaster-reports': () => ({ eventId: 'EVT-' + Math.random().toString(36).slice(2, 9).toUpperCase(), disaster: { type: 'FLOOD', severity: 'HIGH' }, environment: { waterLevel: (Math.random() * 80 + 20).toFixed(1), trend: 'rising' }, timestamp: new Date().toISOString() }),
    'disaster-plans': () => ({ eventId: 'EVT-' + Math.random().toString(36).slice(2, 9).toUpperCase(), plan: { summary: 'NDRF deployment with priority alpha' }, confidence: (Math.random() * 0.3 + 0.65).toFixed(2) }),
    'strategy-memory': () => ({ strategyId: 'STR-' + Math.random().toString(36).slice(2, 8).toUpperCase(), timesUsed: Math.floor(Math.random() * 10 + 2), averageEffectiveness: (Math.random() * 0.4 + 0.55).toFixed(2) }),
  };
  const gen = templates[indexName] ?? (() => ({ index: indexName, timestamp: new Date().toISOString(), payloadId: Math.random().toString(36).slice(2, 10).toUpperCase() }));
  const arr = Array.from({ length: count }, () => gen());
  return syntaxHighlight(JSON.stringify(arr, null, 2));
}

function syntaxHighlight(json) {
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
    let cls = 'json-num';
    if (/^"/.test(match)) {
      cls = /:$/.test(match) ? 'json-key' : 'json-str';
    } else if (/true|false/.test(match)) {
      cls = 'json-bool';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

// =====================
// HUD OVERLAYS CONTROLLER
// =====================
function toggleHUDOverlay(tabId) {
  const overlay = document.getElementById('hud-center-overlay');
  const tabs = ['historical', 'counterfactual', 'plan'];
  
  // Deactivate all subviews
  tabs.forEach(t => {
    document.getElementById(`view-${t}`).classList.remove('active');
    document.getElementById(`overlay-tab-${t}`).classList.remove('active');
  });

  if (tabId) {
    overlay.classList.add('active');
    document.getElementById(`view-${tabId}`).classList.add('active');
    document.getElementById(`overlay-tab-${tabId}`).classList.add('active');
    
    // Set title
    const titles = { historical: 'Historical Matches Analysis', counterfactual: 'Counterfactual Timelines', plan: 'Action Response Plan' };
    document.getElementById('hud-overlay-title').textContent = titles[tabId];
  } else {
    overlay.classList.remove('active');
  }
}

// =====================
// NAVIGATION TABS
// =====================
function switchView(tabName) {
  // Tabs
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');

  // Containers
  document.getElementById('view-ops-container').style.display = tabName === 'ops' ? 'grid' : 'none';
  document.getElementById('view-memory-container').style.display = tabName === 'memory' ? 'grid' : 'none';
  document.getElementById('view-intelligence-container').style.display = tabName === 'intelligence' ? 'grid' : 'none';

  if (tabName === 'ops') {
    // Force Cesium resize
    viewer.resize();
  }
}

// =====================
// INITIALIZATION
// =====================
window.addEventListener('load', () => {
  // UI Bindings
  document.getElementById('mock-toggle').addEventListener('change', e => {
    mockEnabled = e.target.checked;
    const status = document.getElementById('status-text');
    status.textContent = mockEnabled ? 'MOCK MODE ACTIVE' : 'SYSTEM NOMINAL';
    status.style.color = mockEnabled ? 'var(--amber)' : 'var(--emerald)';
    document.getElementById('status-dot').className = `status-dot ${mockEnabled ? 'warning' : 'pulse'}`;
  });

  // Switch View buttons
  document.getElementById('tab-ops').addEventListener('click', () => switchView('ops'));
  document.getElementById('tab-memory').addEventListener('click', () => switchView('memory'));
  document.getElementById('tab-intelligence').addEventListener('click', () => switchView('intelligence'));

  // Sliders binding
  const sliders = [
    { id: 'water-level', valId: 'water-level-val', suffix: ' m' },
    { id: 'rainfall', valId: 'rainfall-val', suffix: ' mm' },
    { id: 'riverflow', valId: 'riverflow-val', suffix: ' m³/s' },
    { id: 'drainage', valId: 'drainage-val', suffix: ' m³/s' },
    { id: 'pop-aff', valId: 'pop-aff-val', suffix: '' },
  ];

  sliders.forEach(s => {
    const input = document.getElementById(s.id);
    input.addEventListener('input', e => {
      let val = parseFloat(e.target.value);
      
      // Update variables if matching
      if (s.id === 'water-level') {
        waterLevel = val;
        floodPolygon.polygon.extrudedHeight = waterLevel;
      }
      
      document.getElementById(s.valId).textContent = val.toLocaleString() + s.suffix;
      syncPayload();
    });
  });

  document.getElementById('infra-mask').addEventListener('input', e => {
    const val = parseInt(e.target.value);
    document.getElementById('infra-mask-val').textContent = '0b' + val.toString(2).padStart(8, '0');
    syncPayload();
  });

  // Simulation controls
  document.getElementById('sim-start').addEventListener('click', () => {
    simulationRunning = true;
    document.getElementById('sim-badge').textContent = 'RUNNING';
    document.getElementById('sim-badge').className = 'panel-badge badge-emerald';
    document.getElementById('sim-start').classList.add('active');
    document.getElementById('sim-pause').classList.remove('active');
  });

  document.getElementById('sim-pause').addEventListener('click', () => {
    simulationRunning = false;
    document.getElementById('sim-badge').textContent = 'PAUSED';
    document.getElementById('sim-badge').className = 'panel-badge badge-amber';
    document.getElementById('sim-start').classList.remove('active');
    document.getElementById('sim-pause').classList.add('active');
  });

  document.getElementById('sim-reset').addEventListener('click', () => {
    simulationRunning = false;
    waterLevel = 10.0;
    floodDirection = 1;
    document.getElementById('water-level').value = 10.0;
    document.getElementById('water-level-val').textContent = '10.0 m';
    
    // Reset flooded assets
    assets.forEach(a => {
      a.flooded = false;
      const entity = assetEntities[a.id];
      if (entity && entity.box) {
        entity.box.material = Cesium.Color.GREEN.withAlpha(0.6);
      }
    });

    document.getElementById('pop-aff').value = 0;
    document.getElementById('pop-aff-val').textContent = '0';
    document.getElementById('infra-mask').value = 0;
    document.getElementById('infra-mask-val').textContent = '0b00000000';

    floodPolygon.polygon.extrudedHeight = waterLevel;

    document.getElementById('sim-badge').textContent = 'STANDBY';
    document.getElementById('sim-badge').className = 'panel-badge badge-cyan';
    document.getElementById('sim-start').classList.remove('active');
    document.getElementById('sim-pause').classList.remove('active');
    
    updateInfrastructureCascade();
    syncPayload();
  });

  // HUD Overlays tabs binding
  document.getElementById('overlay-tab-historical').addEventListener('click', () => {
    const active = document.getElementById('overlay-tab-historical').classList.contains('active');
    toggleHUDOverlay(active ? null : 'historical');
  });
  document.getElementById('overlay-tab-counterfactual').addEventListener('click', () => {
    const active = document.getElementById('overlay-tab-counterfactual').classList.contains('active');
    toggleHUDOverlay(active ? null : 'counterfactual');
  });
  document.getElementById('overlay-tab-plan').addEventListener('click', () => {
    const active = document.getElementById('overlay-tab-plan').classList.contains('active');
    toggleHUDOverlay(active ? null : 'plan');
  });
  document.getElementById('hud-overlay-close').addEventListener('click', () => {
    toggleHUDOverlay(null);
  });

  // Action Buttons
  document.getElementById('btn-legacy').addEventListener('click', () => runAgentWorkflow('legacy'));
  document.getElementById('btn-full').addEventListener('click', () => runAgentWorkflow('full'));

  // Init canvases & states
  initGraphCanvas();
  renderIndexGrid();
  drawConfidenceRadar({ strategyMemory: 0.5, evidenceReliability: 0.5, dependencySupport: 0.5 });
  updateInfrastructureCascade();
  syncPayload();

  // Run simulation clock
  setInterval(runSimulationTick, 1000);
});
