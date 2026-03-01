export function Legend() {
  return (
    <div id="legend" className="card">
      <div id="legend-title" className="caps">Sun exposure</div>
      <div className="li">
        <div className="ld" style={{ background: '#ffdd22', boxShadow: '0 0 7px #ffdd22' }} />
        <span>Full Sun</span>
      </div>
      <div className="li">
        <div className="ld" style={{ background: '#ff7711' }} />
        <span>High Heat</span>
      </div>
      <div className="li">
        <div className="ld" style={{ background: '#ffaa44' }} />
        <span>Partial</span>
      </div>
      <div className="li">
        <div className="ld" style={{ background: '#4488ff' }} />
        <span>Shaded</span>
      </div>
    </div>
  );
}
