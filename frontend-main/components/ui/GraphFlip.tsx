function GraphFlip({ flipped, front, back, minHeight = 240 }) {
  return (
    <div className="graph-flip" style={{ minHeight }}>
      <div className={`graph-flip-inner${flipped ? " flipped" : ""}`}>
        <div className="graph-flip-face graph-flip-front">{front}</div>
        <div className="graph-flip-face graph-flip-back">{back}</div>
      </div>
    </div>
  );
}

export default GraphFlip;
