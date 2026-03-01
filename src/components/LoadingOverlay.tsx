import type { LoadingState } from '../types/atmosphere';

interface LoadingOverlayProps {
  loadingState: LoadingState;
}

export function LoadingOverlay({ loadingState }: LoadingOverlayProps) {
  if (!loadingState.visible) return null;

  if (loadingState.tokenRequired) {
    return (
      <div id="loading">
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 380 }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>🔑</div>
          <h2 style={{ marginBottom: 10 }}>Mapbox Token Required</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 18 }}>
            Add your token to <code style={{ color: '#ffcc44' }}>.env</code> as{' '}
            <code style={{ color: '#ffcc44' }}>VITE_MAPBOX_TOKEN</code>.
          </p>
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: '#ffcc44',
              color: '#000',
              fontWeight: 700,
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Get Free Token →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div id="loading">
      <div id="loading-icon">☀️</div>
      <div id="sidebar-title" style={{ fontSize: 28, marginBottom: 8 }}>
        <strong>NYC</strong> <span>Patio Finder</span>
      </div>
      <p style={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
        Loading 3D city · real buildings · live sun
      </p>
      <a
        className="token-hint"
        href="https://account.mapbox.com/access-tokens/"
        target="_blank"
        rel="noreferrer"
      >
        Need a free Mapbox token? Get one here →
      </a>
    </div>
  );
}
