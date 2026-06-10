const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

const css_old = `  :root {
    --bg-canvas: #1E232A;
    --bg-panel: #252B35;
    --bg-panel-alt: #2D3540;
    --border-color: #3F4A5C;
    --border: 1px solid var(--border-color);
    
    --text-nominal: #F1F5F9;
    --text-muted: #64748B;
    
    --accent-success: #10B981;
    --accent-warning: #F59E0B;
    --accent-alert: #EF4444;
    
    --font: 'JetBrains Mono', monospace;
  }`;

const css_new = `  :root {
    --bg-canvas: #000000;
    --bg-panel: #0A0D14;
    --bg-panel-alt: #121620;
    --border-color: #1E293B;
    --border: 1px solid var(--border-color);
    
    --text-nominal: #F8FAFC;
    --text-muted: #64748B;
    
    --accent-success: #00FF66;
    --accent-warning: #F59E0B;
    --accent-alert: #FF3366;
    --accent-computing: #00E5FF;
    
    --font: 'JetBrains Mono', monospace;
  }`;
content = content.replace(css_old, css_new);

content = content.replace(/font-size:\s*12px/g, 'font-size: 14px');
content = content.replace(/font-size:\s*13px/g, 'font-size: 15px');
content = content.replace(/font-size:\s*14px/g, 'font-size: 16px');
content = content.replace(/font = '12px/g, "font = '14px");
content = content.replace(/font = '700 13px/g, "font = '700 15px");
content = content.replace(/font-size:12px/g, 'font-size:14px');
content = content.replace(/font-size:13px/g, 'font-size:15px');
content = content.replace(/font-size:14px/g, 'font-size:16px');

const agents_old = `const AGENTS = [
  { id: 'orchestrator', label: 'Orchestrator', x: 0.15, y: 0.5 },
  { id: 'historical', label: 'Historical', x: 0.4, y: 0.2 },
  { id: 'learning', label: 'Learning', x: 0.4, y: 0.8 },
  { id: 'planning', label: 'Planning', x: 0.65, y: 0.5 },
  { id: 'reflection', label: 'Reflection', x: 0.85, y: 0.5 },
  { id: 'counterfactual', label: 'Counterfactual', x: 0.85, y: 0.85 },
];

const EDGES = [
  ['orchestrator','historical', 'retrievalFinished', 'retrievalStarted'],
  ['orchestrator','learning', '', ''],
  ['orchestrator','planning', 'planningStarted', 'retrievalFinished'],
  ['planning','reflection', 'reflectionFinished', 'planningStarted'],
  ['reflection','counterfactual', '', '']
];`;

const agents_new = `const AGENTS = [
  { id: 'orchestrator', label: 'Orchestrator', x: 0.5, y: 0.1 },
  { id: 'historical', label: 'Historical', x: 0.5, y: 0.26 },
  { id: 'learning', label: 'Learning', x: 0.5, y: 0.42 },
  { id: 'planning', label: 'Planning', x: 0.5, y: 0.58 },
  { id: 'reflection', label: 'Reflection', x: 0.5, y: 0.74 },
  { id: 'counterfactual', label: 'Counterfactual', x: 0.5, y: 0.9 },
];

const EDGES = [
  ['orchestrator','historical', 'retrievalFinished', 'retrievalStarted'],
  ['historical','learning', '', ''],
  ['learning','planning', 'planningStarted', 'retrievalFinished'],
  ['planning','reflection', 'reflectionFinished', 'planningStarted'],
  ['reflection','counterfactual', '', '']
];`;
content = content.replace(agents_old, agents_new);

const colors_old = `function getStateColor(state) {
  const colors = { idle: '#4B5563', computing: '#38BDF8', success: '#10B981', warning: '#EF4444' };
  return colors[state] || '#4B5563';
}`;
const colors_new = `function getStateColor(state) {
  const colors = { idle: '#4B5563', computing: '#00E5FF', success: '#00FF66', warning: '#FF3366' };
  return colors[state] || '#4B5563';
}`;
content = content.replace(colors_old, colors_new);

content = content.replace("animFrame % 20 < 10 ? '#38BDF8' : '#4B5563'", "animFrame % 20 < 10 ? '#00E5FF' : '#4B5563'");
content = content.replace("active ? '#10B981' : '#3F4A5C'", "active ? '#00FF66' : '#1E293B'");
content = content.replace("strokeStyle = '#38BDF8';", "strokeStyle = '#00E5FF';");
content = content.replace("active ? 2 : 1;", "active ? 2 : 1; if(computing) { ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 12; } else if(active) { ctx.shadowColor = '#00FF66'; ctx.shadowBlur = 12; }");
content = content.replace("ctx.stroke();\\n\\n    // Latency text", "ctx.stroke();\\n    ctx.shadowBlur = 0;\\n\\n    // Latency text");
content = content.replace("ctx.stroke();\n\n    // Latency text", "ctx.stroke();\n    ctx.shadowBlur = 0;\n\n    // Latency text");

content = content.replace("ctx.arc(pos.x, pos.y, R, 0, Math.PI * 2);\n    ctx.fill();\n    ctx.stroke();", "ctx.arc(pos.x, pos.y, R, 0, Math.PI * 2);\n    if(state !== 'idle') { ctx.shadowColor = color; ctx.shadowBlur = 12; }\n    ctx.fill();\n    ctx.stroke();\n    ctx.shadowBlur = 0;");

const run_old = `async function runAgent(endpointType) {
  const banner = document.getElementById('running-banner');`;
const run_new = `async function runAgent(endpointType) {
  document.querySelectorAll('.terminal-input, .terminal-select, input[type=range]').forEach(el => el.disabled = true);
  const banner = document.getElementById('running-banner');`;
content = content.replace(run_old, run_new);

const run_end_old = `  }
  banner.classList.remove('active');
}`;
const run_end_new = `  }
  document.querySelectorAll('.terminal-input, .terminal-select, input[type=range]').forEach(el => el.disabled = false);
  banner.classList.remove('active');
}`;
content = content.replace(run_end_old, run_end_new);

const cf_old = `async function runCounterfactual() {`;
const cf_new = `async function runCounterfactual() {
  document.querySelectorAll('.terminal-input, .terminal-select, input[type=range]').forEach(el => el.disabled = true);`;
content = content.replace(cf_old, cf_new);

const cf_end_old = `  if((cfResult.confidenceRanking || cfResult.estimatedImpactScore || cfResult.confidence || 0) < 0.6) {
    gateWarn.classList.add('active');
    agentStates['counterfactual'] = 'warning';
  }
}`;
const cf_end_new = `  if((cfResult.confidenceRanking || cfResult.estimatedImpactScore || cfResult.confidence || 0) < 0.6) {
    gateWarn.classList.add('active');
    agentStates['counterfactual'] = 'warning';
  }
  document.querySelectorAll('.terminal-input, .terminal-select, input[type=range]').forEach(el => el.disabled = false);
}`;
content = content.replace(cf_end_old, cf_end_new);

fs.writeFileSync('index.html', content);
console.log('Modification complete.');
