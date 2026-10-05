// Netlify Serverless Functions Implementation
// Adapted from Tencent Cloud EdgeOne / Node Functions

let vpnState = {
  connected: false,
  ip: null,
  country: null,
  countryName: null,
  flag: null,
  latencyMs: 0,
  connectedAt: null
};

const countryCodes = {
  "US": { name: "United States", flag: "🇺🇸", detail: "US • VPN Server" },
  "GB": { name: "United Kingdom", flag: "🇬🇧", detail: "UK • VPN Server" },
  "DE": { name: "Germany", flag: "🇩🇪", detail: "DE • VPN Server" },
  "FR": { name: "France", flag: "🇫🇷", detail: "FR • VPN Server" },
  "NL": { name: "Netherlands", flag: "🇳🇱", detail: "NL • VPN Server" },
  "CA": { name: "Canada", flag: "🇨🇦", detail: "CA • VPN Server" },
  "JP": { name: "Japan", flag: "🇯🇵", detail: "JP • VPN Server" },
  "SG": { name: "Singapore", flag: "🇸🇬", detail: "SG • VPN Server" },
  "AU": { name: "Australia", flag: "🇦🇺", detail: "AU • VPN Server" },
  "CH": { name: "Switzerland", flag: "🇨🇭", detail: "CH • VPN Server" }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateVpnIp = () => {
  const second = Math.floor(Math.random() * 255);
  const third = Math.floor(Math.random() * 255);
  const fourth = Math.floor(Math.random() * 254) + 1;
  return `10.${second}.${third}.${fourth}`;
};

const jsonResponse = (data, status = 200) => {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(data)
  };
};

const htmlResponse = (html, status = 200) => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    body: html
  };
};

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WOLF TECH — VPN Control Panel (Netlify)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000;
      color: #00ff00;
      font-family: 'JetBrains Mono', monospace;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    :root {
      --primary: #00ff00;
      --primary-border: rgba(0,255,0,0.2);
      --primary-glow: 0 0 20px rgba(0,255,0,0.3);
      --gray-500: #6b7280;
      --gray-400: #9ca3af;
      --gray-300: #d1d5db;
      --white: #ffffff;
      --card-bg: rgba(0,0,0,0.6);
    }
    .neon-bg {
      position: fixed; inset: 0; z-index: 0;
      background:
        linear-gradient(rgba(0,255,0,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,0,0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
    }
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 50;
      background: rgba(0,0,0,0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--primary-border);
    }
    .nav-inner {
      max-width: 1280px; margin: 0 auto; padding: 0 1.5rem;
      display: flex; align-items: center; justify-content: space-between; height: 64px;
    }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: rgba(0,255,0,0.05); border: 1px solid var(--primary-border);
      display: flex; align-items: center; justify-content: center;
    }
    .logo-text { font-family: 'Orbitron', monospace; font-weight: 900; font-size: 1.2rem; letter-spacing: 0.15em; }
    .logo-wolf { color: var(--primary); }
    .logo-bot  { color: var(--gray-300); }
    .logo-sub  { font-size: 0.65rem; color: var(--gray-500); margin-top: 2px; }
    
    .page {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 6rem 1rem 3rem; position: relative; z-index: 10; gap: 20px;
    }
    .card {
      width: 100%; max-width: 520px; padding: 30px; border-radius: 20px;
      border: 1px solid var(--primary-border); background: var(--card-bg);
      backdrop-filter: blur(12px); text-align: center;
    }
    .badge {
      display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 15px;
    }
    .badge.disconnected { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge.connected { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

    .power-btn {
      width: 90px; height: 90px; border-radius: 50%; margin: 15px auto;
      background: rgba(0,255,0,0.05); border: 2px solid var(--primary);
      color: var(--primary); font-size: 2rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.3s;
      box-shadow: var(--primary-glow);
    }
    .power-btn:hover { background: rgba(0,255,0,0.15); transform: scale(1.05); }
    
    .metrics-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; text-align: left;
    }
    .metric-box { background: rgba(0,0,0,0.4); border: 1px solid var(--primary-border); padding: 10px; border-radius: 8px; }
    .metric-title { font-size: 0.6rem; color: var(--gray-500); text-transform: uppercase; }
    .metric-val { font-size: 0.85rem; color: var(--white); font-weight: bold; margin-top: 4px; word-break: break-all; }

    .btn-group { display: flex; gap: 10px; margin-top: 15px; }
    .btn {
      flex: 1; padding: 12px; border-radius: 8px; font-family: 'Orbitron', monospace;
      font-size: 0.75rem; font-weight: 700; cursor: pointer; border: 1px solid var(--primary-border);
      background: rgba(0,255,0,0.1); color: var(--primary); transition: all 0.2s;
    }
    .btn:hover { background: rgba(0,255,0,0.2); box-shadow: var(--primary-glow); }
    .btn-danger { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.2); }

    .locations-card { width: 100%; max-width: 520px; background: var(--card-bg); border: 1px solid var(--primary-border); border-radius: 20px; padding: 24px; text-align: left; }
    .locations-title { font-family: 'Orbitron', monospace; font-size: 1rem; margin-bottom: 4px; color: var(--white); }
    .locations-sub { font-size: 0.75rem; color: var(--gray-500); margin-bottom: 15px; }
    .location-list { display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding-right: 4px; }
    .loc-item {
      display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
      background: rgba(0,0,0,0.4); border: 1px solid rgba(0,255,0,0.1); border-radius: 8px; cursor: pointer; transition: all 0.2s;
    }
    .loc-item:hover { border-color: var(--primary); background: rgba(0,255,0,0.05); }
    .loc-info { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--white); }
    .loc-flag { font-size: 1.2rem; }
  </style>
</head>
<body>
  <div class="neon-bg"></div>
  <nav>
    <div class="nav-inner">
      <div class="logo">
        <div class="logo-icon">⚡</div>
        <div>
          <div class="logo-text"><span class="logo-wolf">WOLF</span><span class="logo-bot"> TECH</span></div>
          <div class="logo-sub">Netlify Edge Gateway</div>
        </div>
      </div>
    </div>
  </nav>

  <main class="page">
    <div class="card">
      <div id="statusBadge" class="badge disconnected">Disconnected</div>
      <div style="font-size: 0.8rem; color: var(--gray-400);" id="statusDesc">Private & Secure • Tap to Connect</div>
      <button class="power-btn" onclick="toggleVpn()">⏻</button>
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-title">VPN Status</div>
          <div class="metric-val" id="valStatus">Not Protected</div>
        </div>
        <div class="metric-box">
          <div class="metric-title">IP Address</div>
          <div class="metric-val" id="valIp">Not connected</div>
        </div>
        <div class="metric-box">
          <div class="metric-title">Latency</div>
          <div class="metric-val" id="valLatency">0 ms</div>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn" onclick="connectFastest()">Connect Fastest</button>
        <button class="btn btn-danger" onclick="disconnectVpn()">Disconnect</button>
        <button class="btn" onclick="testSleep()">Test Sleep (1s)</button>
      </div>
    </div>

    <div class="locations-card">
      <div class="locations-title">VPN Locations</div>
      <div class="locations-sub">Select a server location (Netlify Function)</div>
      <div class="location-list" id="locationList"></div>
    </div>
  </main>

  <script>
    const locations = ${JSON.stringify(countryCodes)};
    async function fetchStatus() {
      try {
        const res = await fetch('/api/vpn/status');
        const json = await res.json();
        updateUI(json.data);
      } catch (e) { console.error(e); }
    }
    function updateUI(state) {
      const badge = document.getElementById('statusBadge');
      const desc = document.getElementById('statusDesc');
      const valStatus = document.getElementById('valStatus');
      const valIp = document.getElementById('valIp');
      const valLatency = document.getElementById('valLatency');

      if (state.connected) {
        badge.className = 'badge connected';
        badge.innerText = 'Connected: ' + state.countryName;
        desc.innerText = 'Your connection is private and secure.';
        valStatus.innerText = 'Protected';
        valIp.innerText = state.ip;
        valLatency.innerText = state.latencyMs + ' ms';
      } else {
        badge.className = 'badge disconnected';
        badge.innerText = 'Disconnected';
        desc.innerText = 'Private & Secure • Tap to Connect';
        valStatus.innerText = 'Not Protected';
        valIp.innerText = 'Not connected';
        valLatency.innerText = '0 ms';
      }
    }
    async function connectVpn(code) {
      try {
        const res = await fetch('/api/vpn/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country_code: code })
        });
        const json = await res.json();
        updateUI(json.data);
      } catch(e) { console.error(e); }
    }
    async function connectFastest() {
      try {
        const res = await fetch('/api/vpn/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fastest: true })
        });
        const json = await res.json();
        updateUI(json.data);
      } catch(e) { console.error(e); }
    }
    async function disconnectVpn() {
      try {
        const res = await fetch('/api/vpn/disconnect', { method: 'POST' });
        const json = await res.json();
        updateUI(json.data);
      } catch(e) { console.error(e); }
    }
    async function toggleVpn() {
      try {
        const statusRes = await fetch('/api/vpn/status');
        const statusJson = await statusRes.json();
        if (statusJson.data.connected) {
          await disconnectVpn();
        } else {
          await connectFastest();
        }
      } catch(e) { console.error(e); }
    }
    async function testSleep() {
      const start = Date.now();
      await fetch('/api/test?ms=1000');
      const elapsed = Date.now() - start;
      alert('Sleep test completed in ' + elapsed + ' ms');
    }
    function renderLocations() {
      const listEl = document.getElementById('locationList');
      listEl.innerHTML = '';
      for (const [code, info] of Object.entries(locations)) {
        const div = document.createElement('div');
        div.className = 'loc-item';
        div.onclick = () => connectVpn(code);
        div.innerHTML = \`
          <div class="loc-info">
            <span class="loc-flag">\${info.flag}</span>
            <div>
              <div style="font-weight: 600;">\${info.name}</div>
              <div style="font-size: 0.7rem; color: var(--gray-500);">\${info.detail}</div>
            </div>
          </div>
          <span style="color: var(--primary);">Connect ➔</span>
        \`;
        listEl.appendChild(div);
      }
    }
    renderLocations();
    fetchStatus();
  </script>
</body>
</html>
`;

exports.handler = async (event, context) => {
  // Extract path and strip Netlify function prefix or query string contexts if needed
  let rawPath = event.path || '/';
  if (rawPath.startsWith('/.netlify/functions/api')) {
    rawPath = rawPath.replace('/.netlify/functions/api', '');
  }
  const path = rawPath === '' ? '/' : rawPath;
  const method = event.httpMethod;
  
  // Parse query parameters
  const queryParams = event.queryStringParameters || {};

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (path === '/api/healthz' && method === 'GET') {
    return jsonResponse({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
  }

  if (path === '/api/test' && method === 'GET') {
    const ms = parseInt(queryParams.ms) || 500;
    await sleep(ms);
    return jsonResponse({ success: true, slept_ms: ms, timestamp: new Date().toISOString() });
  }

  if ((path === '/api/vpn/countries' || path === '/api/countries') && method === 'GET') {
    const simpleMap = {};
    for (const [code, info] of Object.entries(countryCodes)) {
      simpleMap[code] = info.name;
    }
    return jsonResponse({
      success: true,
      data: {
        success: true,
        country_codes: simpleMap,
        locations: countryCodes
      }
    });
  }

  if (path === '/api/vpn/connect' && method === 'POST') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {}

    const sleepMs = Math.floor(Math.random() * 600) + 600;
    await sleep(sleepMs);

    let selectedCode = body.country_code ? body.country_code.toUpperCase() : null;
    if (body.fastest || !selectedCode || !countryCodes[selectedCode]) {
      const keys = Object.keys(countryCodes);
      selectedCode = keys[Math.floor(Math.random() * keys.length)];
    }

    vpnState = {
      connected: true,
      ip: generateVpnIp(),
      country: selectedCode,
      countryName: countryCodes[selectedCode].name,
      flag: countryCodes[selectedCode].flag,
      latencyMs: Math.floor(Math.random() * 35) + 12,
      connectedAt: new Date().toISOString()
    };

    return jsonResponse({
      success: true,
      message: `Connected successfully to ${vpnState.countryName}`,
      data: vpnState
    });
  }

  if (path === '/api/vpn/disconnect' && method === 'POST') {
    await sleep(350);
    vpnState = {
      connected: false,
      ip: null,
      country: null,
      countryName: null,
      flag: null,
      latencyMs: 0,
      connectedAt: null
    };

    return jsonResponse({
      success: true,
      message: 'VPN disconnected successfully',
      data: vpnState
    });
  }

  if (path === '/api/vpn/status' && method === 'GET') {
    return jsonResponse({ success: true, data: vpnState });
  }

  if (path === '/api/vpn/ip' && method === 'GET') {
    return jsonResponse({
      success: true,
      ip: vpnState.connected ? vpnState.ip : 'Not Connected',
      data: vpnState
    });
  }

  if (path === '/' || path === '') {
    return htmlResponse(htmlContent);
  }

  return htmlResponse(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>404 — Wolf Tech Netlify</title>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=JetBrains+Mono&display=swap" rel="stylesheet">
      <style>
        body { background: #000; color: #00ff00; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
        h1 { font-family: 'Orbitron', sans-serif; font-size: 3rem; color: #ff4d4d; margin: 0; }
        p { color: #9ca3af; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div>
        <h1>404</h1>
        <p>Target Route Not Found on Wolf Tech Netlify Gateway.</p>
      </div>
    </body>
    </html>
  `, 404);
};
