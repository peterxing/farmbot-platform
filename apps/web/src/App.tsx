import { useEffect, useMemo, useState } from 'react';
import { SiweMessage } from 'siwe';
import { apiGet, apiPost } from './api';

type Address = `0x${string}`;

type Plot = {
  id: string;
  name: string;
  areaSqm: number;
  enabled?: boolean;
  polygonImage?: Array<[number, number]>;
};

type Boundary = { polygonImage: Array<[number, number]> };

export function App() {
  const [address, setAddress] = useState<Address | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<any>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [boundary, setBoundary] = useState<Boundary | null>(null);

  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [plotIds, setPlotIds] = useState<string>('plot_001');
  const [prompt, setPrompt] = useState<string>('Create an irrigation plan for the next 7 days.');
  const [type, setType] = useState<string>('irrigation_plan');
  const [lastResult, setLastResult] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const connected = useMemo(() => Boolean(address && sessionToken), [address, sessionToken]);
  const enabledPlots = useMemo(() => plots.filter((p) => p.enabled !== false), [plots]);
  const enabledArea = useMemo(() => enabledPlots.reduce((a, p) => a + (p.areaSqm || 0), 0), [enabledPlots]);

  async function loadStaticDemoData() {
    try {
      const [ps, b] = await Promise.all([
        fetch('/data/plots.json').then((r) => r.json()),
        fetch('/data/boundary.json').then((r) => r.json())
      ]);
      // boundary.json is the raw polygon array
      setPlots(ps as Plot[]);
      setBoundary({ polygonImage: b as Array<[number, number]> });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // Ensure the public demo works even without the API.
    loadStaticDemoData();
  }, []);

  async function connectWallet() {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('No wallet found (install MetaMask)');
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
    setAddress(accounts[0] as Address);
  }

  async function signIn() {
    if (!address) throw new Error('Connect wallet first');

    const { nonce } = await apiPost<{ nonce: string }>('/auth/nonce', { address });

    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in to FarmBot Platform (MVP, testnet).',
      uri: window.location.origin,
      version: '1',
      chainId: 1,
      nonce
    });

    const msg = message.prepareMessage();
    const eth = (window as any).ethereum;
    const signature: string = await eth.request({
      method: 'personal_sign',
      params: [msg, address]
    });

    const verify = await apiPost<{ sessionToken: string; address: Address }>('/auth/verify', { message: msg, signature });
    setSessionToken(verify.sessionToken);
  }

  async function refresh() {
    if (!sessionToken) {
      // still allow a visual demo
      await loadStaticDemoData();
      setStatus('Demo mode: connect + SIWE to view entitlement (API required).');
      return;
    }

    setStatus('Refreshing…');
    try {
      const [ent, ps, b] = await Promise.all([
        apiGet('/me/entitlement', sessionToken),
        apiGet<Plot[]>('/plots', sessionToken),
        apiGet<Boundary>('/boundary', sessionToken)
      ]);
      setEntitlement(ent);
      setPlots(ps);
      setBoundary(b);
      setStatus('');
    } catch (e: any) {
      await loadStaticDemoData();
      setEntitlement(null);
      setStatus('Demo mode: API unreachable; showing static map + plots.');
    }
  }

  async function submitWork() {
    if (!sessionToken) throw new Error('Sign in first');
    const plotIdList = plotIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await apiPost<any>('/work-requests', { plotIds: plotIdList, type, prompt }, sessionToken);
    setLastResult(res.artifacts?.[0]?.content ?? JSON.stringify(res, null, 2));
  }

  const boundaryPoints = useMemo(() => {
    if (!boundary?.polygonImage?.length) return '';
    return boundary.polygonImage.map(([x, y]) => `${x},${y}`).join(' ');
  }, [boundary]);

  return (
    <div
      style={{
        minHeight: '100vh',
        color: '#0b1220',
        background:
          'radial-gradient(1200px 600px at 20% 10%, rgba(90, 180, 140, 0.35), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(70, 120, 210, 0.25), transparent 60%), #f7f8fb'
      }}
    >
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(247,248,251,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(10,20,40,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #1f6feb, #2ea043)',
                boxShadow: '0 10px 30px rgba(31,111,235,0.18)'
              }}
              title="Mascot"
            >
              <video
                src="/mascot.mp4"
                muted
                playsInline
                autoPlay
                loop
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 750, letterSpacing: -0.2 }}>FarmBot Platform</div>
              <div style={{ fontSize: 12, color: '#4b5563' }}>Private acquisition pending • Base testnet MVP</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => connectWallet().catch((e) => setStatus(String(e.message ?? e)))} style={btn()}>
              Connect wallet
            </button>
            <button onClick={() => signIn().catch((e) => setStatus(String(e.message ?? e)))} disabled={!address} style={btn(!address)}>
              SIWE sign-in
            </button>
            <button onClick={() => refresh().catch((e) => setStatus(String(e.message ?? e)))} disabled={!connected} style={btn(!connected)}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '22px 16px 60px' }}>
        {/* Hero */}
        <div
          style={{
            position: 'relative',
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(10,20,40,0.10)',
            boxShadow: '0 24px 70px rgba(10,20,40,0.12)',
            background: '#0b1220'
          }}
        >
          <div
            style={{
              height: 240,
              background:
                'radial-gradient(900px 300px at 15% 35%, rgba(46, 160, 67, 0.55), transparent 60%), radial-gradient(700px 260px at 75% 30%, rgba(31, 111, 235, 0.45), transparent 60%), linear-gradient(135deg, #0b1220, #0f2a1f)',
              filter: 'saturate(1.05)'
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,18,32,0.15), rgba(11,18,32,0.82))' }} />
          <div style={{ position: 'absolute', inset: 0, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
            <div style={{ color: 'white', fontSize: 28, fontWeight: 800, letterSpacing: -0.6 }}>Distributed, token-gated farm automation</div>
            <div style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 800, fontSize: 14, lineHeight: 1.45 }}>
              Token balance → pro‑rata <b>ops credits/week</b> → plot allocation → work requests → agent plans (MVP). Physical actuation is disabled until edge safety + approvals.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={pill()}>Base testnet only</span>
              <span style={pill()}>Not investment / no yield</span>
              <span style={pill()}>Access via platform scheduling (licence required)</span>
            </div>
          </div>
        </div>

        {/* Status */}
        {status ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid rgba(10,20,40,0.10)', background: 'rgba(255,255,255,0.75)' }}>
            <b>Status:</b> {status}
          </div>
        ) : null}

        {/* Overview cards */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <Card title="Wallet">
            <div style={kv()}>
              <div>Address</div>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}>
                {address ?? '(not connected)'}
              </div>
            </div>
            <div style={kv()}>
              <div>Session</div>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}>
                {sessionToken ? sessionToken.slice(0, 10) + '…' : '(none)'}
              </div>
            </div>
          </Card>

          <Card title="Entitlement (MVP)">
            {entitlement ? (
              <>
                <div style={kv()}>
                  <div>Ops credits/week</div>
                  <div style={{ fontWeight: 700 }}>{Math.round(entitlement.opsCreditsEntitled ?? 0)}</div>
                </div>
                <div style={kv()}>
                  <div>Virtual area</div>
                  <div style={{ fontWeight: 700 }}>{(entitlement.virtualAreaSqm ?? 0).toFixed?.(2) ?? entitlement.virtualAreaSqm} m²</div>
                </div>
                <div style={{ fontSize: 12, color: '#4b5563', marginTop: 6 }}>
                  This is a platform allocation metric. Real-world access and actions are governed by operator policy and safety.
                </div>
              </>
            ) : (
              <div style={{ color: '#4b5563' }}>Sign in and hit Refresh.</div>
            )}
          </Card>

          <Card title="Plots">
            <div style={kv()}>
              <div>Total plots</div>
              <div style={{ fontWeight: 700 }}>{plots.length}</div>
            </div>
            <div style={kv()}>
              <div>Inside boundary</div>
              <div style={{ fontWeight: 700 }}>{enabledPlots.length}</div>
            </div>
            <div style={kv()}>
              <div>Area accounted</div>
              <div style={{ fontWeight: 700 }}>{enabledArea.toLocaleString()} m²</div>
            </div>
          </Card>
        </div>

        {/* Gallery */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(10,20,40,0.10)', background: '#0b1220' }}>
            <div style={{ height: 260, background: 'linear-gradient(135deg, rgba(31,111,235,0.45), rgba(46,160,67,0.35))' }} />
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(10,20,40,0.10)', background: '#0b1220' }}>
            <div style={{ height: 260, background: 'linear-gradient(135deg, rgba(46,160,67,0.45), rgba(31,111,235,0.35))' }} />
          </div>
        </div>

        {/* Map + plots */}
        {plots.length > 0 && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 18, border: '1px solid rgba(10,20,40,0.10)', background: 'rgba(255,255,255,0.80)', boxShadow: '0 18px 40px rgba(10,20,40,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Farm map + plot allocation (clipped to boundary)</h3>
              <div style={{ fontSize: 13, color: '#4b5563' }}>
                Click a plot to select it → auto-fills work request
                {selectedPlotId ? (
                  <>
                    {' '}
                    • Selected: <b>{selectedPlotId}</b>
                  </>
                ) : null}
              </div>
            </div>

            <div style={{ marginTop: 10, position: 'relative', width: '100%', maxWidth: 980 }}>
              <img src="/map_placeholder.svg" alt="Farm map placeholder" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }} />

              <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <defs>
                  {boundaryPoints ? (
                    <clipPath id="farmBoundary">
                      <polygon points={boundaryPoints} />
                    </clipPath>
                  ) : null}
                </defs>

                {/* boundary */}
                {boundaryPoints ? (
                  <polygon points={boundaryPoints} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.85)" strokeWidth={0.004} />
                ) : null}

                {/* plots (clipped to boundary) */}
                <g clipPath={boundaryPoints ? 'url(#farmBoundary)' : undefined}>
                  {enabledPlots.map((p) => {
                    const poly = p.polygonImage;
                    if (!poly || poly.length < 3) return null;
                    const points = poly.map(([x, y]) => `${x},${y}`).join(' ');
                    const active = p.id === selectedPlotId;
                    return (
                      <polygon
                        key={p.id}
                        points={points}
                        fill={active ? 'rgba(255, 64, 64, 0.22)' : 'rgba(64, 128, 255, 0.10)'}
                        stroke={active ? 'rgba(255, 64, 64, 0.95)' : 'rgba(64, 128, 255, 0.30)'}
                        strokeWidth={0.0012}
                        onClick={() => {
                          setSelectedPlotId(p.id);
                          setPlotIds(p.id);
                        }}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* Work request */}
        <div style={{ marginTop: 18, padding: 14, borderRadius: 18, border: '1px solid rgba(10,20,40,0.10)', background: 'rgba(255,255,255,0.80)' }}>
          <h3 style={{ marginTop: 0 }}>Work request (MVP: plan generation)</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#334155' }}>Plot IDs (comma-separated)</div>
              <input value={plotIds} onChange={(e) => setPlotIds(e.target.value)} style={input()} />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#334155' }}>Type</div>
              <select value={type} onChange={(e) => setType(e.target.value)} style={input()}>
                <option value="irrigation_plan">irrigation_plan</option>
                <option value="harvest_plan">harvest_plan</option>
                <option value="scouting_plan">scouting_plan</option>
                <option value="maintenance_checklist">maintenance_checklist</option>
                <option value="generic">generic</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div style={{ fontSize: 13, color: '#334155' }}>Prompt</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ ...input(), height: 96, resize: 'vertical' }} />
          </label>

          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => submitWork().catch((e) => setStatus(String(e.message ?? e)))} disabled={!connected} style={btn(!connected)}>
              Submit request
            </button>
            <div style={{ fontSize: 12, color: '#4b5563', alignSelf: 'center' }}>
              Note: this generates a placeholder plan. Next step is wiring to Clawdbot agent workers + edge state APIs.
            </div>
          </div>

          {lastResult && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: '10px 0 8px' }}>Latest artifact</h4>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#0b1220', color: 'rgba(255,255,255,0.88)', padding: 12, borderRadius: 12, overflowX: 'auto' }}>{lastResult}</pre>
            </div>
          )}
        </div>

        {/* Compliance footer */}
        <div style={{ marginTop: 18, fontSize: 12, color: '#6b7280' }}>
          MVP compliance stance: testnet-only; token is platform entitlement (ops credits), not ownership, not profit share. Any real-world land access is via a separate licence/terms; any physical actuation must pass edge safety policy and operator approval.
        </div>
      </div>
    </div>
  );
}

function btn(disabled?: boolean) {
  return {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(10,20,40,0.12)',
    background: disabled ? 'rgba(255,255,255,0.6)' : 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 12px 30px rgba(10,20,40,0.10)',
    fontWeight: 650
  } as const;
}

function input() {
  return {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(10,20,40,0.12)',
    background: 'rgba(255,255,255,0.85)',
    outline: 'none'
  } as const;
}

function pill() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)'
  } as const;
}

function kv() {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    padding: '6px 0',
    borderBottom: '1px dashed rgba(10,20,40,0.12)',
    fontSize: 13
  } as const;
}

function Card(props: { title: string; children: any }) {
  return (
    <div style={{ borderRadius: 18, border: '1px solid rgba(10,20,40,0.10)', background: 'rgba(255,255,255,0.80)', padding: 14, boxShadow: '0 18px 40px rgba(10,20,40,0.08)' }}>
      <div style={{ fontWeight: 750, marginBottom: 6 }}>{props.title}</div>
      {props.children}
    </div>
  );
}
