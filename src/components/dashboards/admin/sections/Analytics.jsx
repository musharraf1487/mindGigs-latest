import React from 'react';

export function Analytics({ user, adminData }) {
  const bars = adminData?.chartBars || [];
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

  const userGrowth = [
    { label: 'Experts', val: '1,840', pct: 74, color: 'var(--gl)' },
    { label: 'Affiliates', val: '450', pct: 18, color: 'var(--teal)' },
    { label: 'Visitors', val: '1,958', pct: 8, color: 'var(--mu)' },
  ];

  const revMix = [
    { label: 'Session Bookings', pct: 46, color: 'var(--gl)' },
    { label: 'Subscriptions', pct: 35, color: 'var(--teal)' },
    { label: 'Digital Products', pct: 19, color: 'var(--gold)' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fu)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gd)', marginBottom: '4px' }}>
          Platform Analytics
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--mu)' }}>Detailed performance insights</p>
      </div>

      {/* Platform Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {adminData?.platformMetrics?.map((m, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{m.label}</div>
            <div className="stat-val">{m.value}</div>
            <div className="stat-change stat-change-gr">{m.trend}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="stat-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>Monthly Revenue Trend</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--mu)', marginTop: '2px' }}>Last 12 months — MRR</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--mu)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,178,122,0.25)' }} /> Normal
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--mu)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--gl)' }} /> Peak
            </div>
          </div>
        </div>
        <div className="chart-bars" style={{ height: '160px' }}>
          {bars.map((h, i) => (
            <div
              key={i}
              className={`cbar ${h === 100 ? 'cbar-high' : 'cbar-main'}`}
              style={{ height: `${h}%` }}
              title={`${months[i]}: ${h}%`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          {months.map((m, i) => (
            <div key={i} style={{ fontSize: '0.6rem', color: 'var(--mu)', fontFamily: 'var(--fu)', flex: 1, textAlign: 'center' }}>{m}</div>
          ))}
        </div>
      </div>

      {/* Two-column: User Growth + Revenue Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* User Growth */}
        <div className="stat-card">
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '20px' }}>
            User Breakdown
          </div>
          {userGrowth.map((u, i) => (
            <div key={i} style={{ marginBottom: i < userGrowth.length - 1 ? '18px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--sl)' }}>{u.label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: u.color }}>{u.val} ({u.pct}%)</span>
              </div>
              <div style={{ height: '8px', background: 'var(--gmt)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${u.pct}%`, background: u.color, borderRadius: '100px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Mix */}
        <div className="stat-card">
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)', marginBottom: '20px' }}>
            Revenue Breakdown
          </div>
          {revMix.map((r, i) => (
            <div key={i} style={{ marginBottom: i < revMix.length - 1 ? '18px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--sl)' }}>{r.label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: r.color }}>{r.pct}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--gmt)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: '100px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}

          {/* MRR Highlight */}
          <div style={{
            marginTop: '24px', padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(255,178,122,0.08), rgba(191,201,209,0.05))',
            borderRadius: '10px', border: '1px solid rgba(255,178,122,0.12)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--mu)', fontFamily: 'var(--fu)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MRR</span>
            <span style={{ fontFamily: 'var(--fu)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--gl)' }}>{adminData?.keyMetrics?.[3]?.value}</span>
          </div>
        </div>
      </div>

      {/* Top Users Table */}
      <div className="table-wrap">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,155,81,0.07)' }}>
          <div style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gd)' }}>Top Active Users</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {adminData?.users?.slice(0, 5).map((u, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--mu)', fontFamily: 'var(--fu)', fontWeight: 700 }}>#{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>
                  <span style={{
                    padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--fu)', textTransform: 'capitalize',
                    background: u.role === 'expert' ? 'rgba(255,178,122,0.1)' : u.role === 'affiliate' ? 'rgba(191,201,209,0.1)' : 'rgba(138,145,153,0.1)',
                    color: u.role === 'expert' ? 'var(--gl)' : u.role === 'affiliate' ? 'var(--teal)' : 'var(--mu)',
                  }}>{u.role}</span>
                </td>
                <td style={{ color: 'var(--mu)' }}>{u.joined}</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600,
                    background: u.status === 'active' ? 'rgba(255,178,122,0.1)' : 'rgba(232,68,68,0.1)',
                    color: u.status === 'active' ? 'var(--gl)' : 'var(--rd)',
                  }}>
                    {u.status === 'active' ? '●' : '○'} {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
