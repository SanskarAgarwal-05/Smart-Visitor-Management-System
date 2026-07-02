import React, { useState } from 'react';

const AnalyticsCharts = ({ visitors = [] }) => {
  const [hoveredDot, setHoveredDot] = useState(null);
  const [hoveredPie, setHoveredPie] = useState(null);

  // 1. DATA PROCESSING FOR WEEKLY TREND (Last 7 Days)
  const getWeeklyTrend = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = {};
    const last7Days = [];
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toDateString(); // exact date key e.g. "Thu Jun 24 2026"
      const dateLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' }); // e.g. "Jun 24"
      
      counts[dateStr] = {
        label: dayName,
        dateLabel: dateLabel,
        count: 0
      };
      last7Days.push(dateStr);
    }

    visitors.forEach(v => {
      if (v.checkInTime) {
        const checkInDateStr = new Date(v.checkInTime).toDateString();
        if (counts[checkInDateStr] !== undefined) {
          counts[checkInDateStr].count += 1;
        }
      }
    });

    return last7Days.map(dateStr => ({
      label: counts[dateStr].label,
      value: counts[dateStr].count,
      date: counts[dateStr].dateLabel
    }));
  };

  const trendData = getWeeklyTrend();
  const maxTrendVal = Math.max(...trendData.map(d => d.value), 4);

  // 2. DATA PROCESSING FOR STATUS DISTRIBUTION
  const getStatusData = () => {
    const pending = visitors.filter(v => v.status === 'pending').length;
    const approved = visitors.filter(v => v.status === 'approved').length;
    const checkedOut = visitors.filter(v => v.status === 'checked-out').length;
    const rejected = visitors.filter(v => v.status === 'rejected').length;

    return [
      { label: 'Pending', count: pending, color: 'var(--accent-orange)' },
      { label: 'Approved', count: approved, color: 'var(--primary)' },
      { label: 'Checked Out', count: checkedOut, color: 'var(--color-success)' },
      { label: 'Rejected', count: rejected, color: 'var(--color-danger)' }
    ];
  };

  const statusData = getStatusData();
  const totalStatusCount = visitors.length || 1;

  // 3. SVG COORDINATES FOR LINE CHART
  const width = 500;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  
  const points = trendData.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX) / (trendData.length - 1));
    const y = height - paddingY - (d.value * (height - 2 * paddingY) / maxTrendVal);
    return { x, y, ...d };
  });

  const linePath = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  // 4. DONUT SEGMENTS
  let accumulatedPercent = 0;
  const pieSegments = statusData.map((d) => {
    const percentage = d.count / totalStatusCount;
    const strokeDash = percentage * 100;
    const strokeOffset = 100 - accumulatedPercent;
    accumulatedPercent += strokeDash;
    return {
      ...d,
      percentage: Math.round(percentage * 100),
      dashArray: `${strokeDash} ${100 - strokeDash}`,
      dashOffset: strokeOffset
    };
  });

  return (
    <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
      {/* LINE CHART: WEEKLY TRAFFIC */}
      <div className="card chart-card">
        <div className="chart-header">
          <span className="chart-title">Weekly Traffic (Daily Trend)</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily check-ins</span>
        </div>
        <div className="chart-container">
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingY + ratio * (height - 2 * paddingY);
              const labelVal = Math.round(maxTrendVal * (1 - ratio));
              return (
                <g key={idx}>
                  <line 
                    x1={paddingX} 
                    y1={y} 
                    x2={width - paddingX} 
                    y2={y} 
                    stroke="var(--border-secondary)" 
                    strokeWidth="1" 
                    strokeDasharray="4, 4"
                  />
                  <text 
                    x={paddingX - 10} 
                    y={y + 4} 
                    fill="var(--text-muted)" 
                    fontSize="9.5" 
                    textAnchor="end"
                  >
                    {labelVal}
                  </text>
                </g>
              );
            })}

            {/* Gradient Fill */}
            {points.length > 0 && <path d={areaPath} fill="url(#chartGradient)" />}

            {/* Line path */}
            {points.length > 0 && (
              <path 
                d={linePath} 
                fill="none" 
                stroke="var(--primary)" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            )}

            {/* Interactive Circles */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={hoveredDot === idx ? 6 : 4} 
                  fill="var(--bg-card)" 
                  stroke="var(--primary)" 
                  strokeWidth={hoveredDot === idx ? 3 : 2} 
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease, stroke-width 0.15s ease' }}
                  onMouseEnter={() => setHoveredDot(idx)}
                  onMouseLeave={() => setHoveredDot(null)}
                />
                
                {/* Labels */}
                <text 
                  x={p.x} 
                  y={height - 10} 
                  fill="var(--text-secondary)" 
                  fontSize="10" 
                  fontWeight="semibold"
                  textAnchor="middle"
                >
                  {p.label}
                </text>

                {/* Tooltip */}
                {hoveredDot === idx && (
                  <g>
                    <rect 
                      x={p.x - 45} 
                      y={p.y - 36} 
                      width="90" 
                      height="26" 
                      rx="4" 
                      fill="var(--bg-sidebar)" 
                      stroke="var(--border-primary)" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={p.x} 
                      y={p.y - 20} 
                      fill="var(--text-primary)" 
                      fontSize="9.5" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {p.date}: {p.value}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* DONUT CHART: STATUS DISTRIBUTION */}
      <div className="card chart-card">
        <div className="chart-header">
          <span className="chart-title">Status Distribution</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time ratios</span>
        </div>
        <div className="chart-container" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '130px', height: '130px' }}>
            <svg viewBox="0 0 36 36" width="100%" height="100%">
              <circle 
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke="var(--border-secondary)" 
                strokeWidth="3.5" 
              />
              
              {pieSegments.map((seg, idx) => (
                <circle 
                  key={idx}
                  cx="18" 
                  cy="18" 
                  r="15.915" 
                  fill="none" 
                  stroke={seg.color} 
                  strokeWidth={hoveredPie === idx ? '4.8' : '3.5'} 
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                  strokeLinecap="round"
                  style={{ 
                    cursor: 'pointer', 
                    transition: 'stroke-width 0.15s ease', 
                    transform: 'rotate(-90deg)', 
                    transformOrigin: '50% 50%' 
                  }}
                  onMouseEnter={() => setHoveredPie(idx)}
                  onMouseLeave={() => setHoveredPie(null)}
                />
              ))}
            </svg>
            
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              textAlign: 'center' 
            }}>
              {hoveredPie !== null ? (
                <>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {pieSegments[hoveredPie].percentage}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {pieSegments[hoveredPie].label}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {visitors.length}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Total Logs
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Legends */}
          <div className="chart-legend" style={{ marginTop: '15px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {pieSegments.map((seg, idx) => (
              <div 
                key={idx} 
                className="legend-item" 
                style={{ 
                  opacity: hoveredPie === null || hoveredPie === idx ? 1 : 0.4, 
                  transition: 'opacity 0.15s',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span className="legend-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: seg.color }} />
                <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{seg.label}: {seg.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
