import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { saveWeeklyAvailability, ALL_TIME_SLOTS, DEFAULT_WORKDAY_SLOTS } from '../../../../services/availabilityService';

const DAYS = [
  { key: '1', label: 'Monday' },
  { key: '2', label: 'Tuesday' },
  { key: '3', label: 'Wednesday' },
  { key: '4', label: 'Thursday' },
  { key: '5', label: 'Friday' },
  { key: '6', label: 'Saturday' },
  { key: '0', label: 'Sunday' },
];

const WEEKDAY_KEYS = ['1', '2', '3', '4', '5'];

function buildDefaultSlots() {
  return { '0': [], '1': [...DEFAULT_WORKDAY_SLOTS], '2': [...DEFAULT_WORKDAY_SLOTS], '3': [...DEFAULT_WORKDAY_SLOTS], '4': [...DEFAULT_WORKDAY_SLOTS], '5': [...DEFAULT_WORKDAY_SLOTS], '6': [] };
}

export function Availability({ user, notify }) {
  const { currentUser } = useAuth();
  const [slots, setSlots] = useState(() => user?.availability?.weeklySlots || buildDefaultSlots());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.availability?.weeklySlots) setSlots(user.availability.weeklySlots);
  }, [user?.availability?.weeklySlots]);

  const isDayEnabled = (key) => (slots[key] || []).length > 0;

  const toggleDay = (key) => {
    setSlots(prev => ({
      ...prev,
      [key]: isDayEnabled(key) ? [] : [...DEFAULT_WORKDAY_SLOTS],
    }));
  };

  const toggleSlot = (key, time) => {
    setSlots(prev => {
      const current = prev[key] || [];
      const next = current.includes(time)
        ? current.filter(t => t !== time)
        : [...current, time].sort((a, b) => ALL_TIME_SLOTS.indexOf(a) - ALL_TIME_SLOTS.indexOf(b));
      return { ...prev, [key]: next };
    });
  };

  const copyToWeekdays = (sourceKey) => {
    const source = slots[sourceKey] || [];
    setSlots(prev => {
      const updated = { ...prev };
      WEEKDAY_KEYS.forEach(k => { updated[k] = [...source]; });
      return updated;
    });
    notify('Schedule copied to all weekdays!', 'success');
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await saveWeeklyAvailability(currentUser.uid, slots);
      notify('Availability saved. Clients will see your updated schedule.', 'success');
    } catch (err) {
      notify('Failed to save: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalSlots = Object.values(slots).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Availability</h2>
        <p style={{ color: 'var(--sl)', fontSize: '0.9rem' }}>
          Set your weekly schedule. Clients can only book slots you mark available, and booked slots are automatically removed.
        </p>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {DAYS.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: isDayEnabled(key) ? 'rgba(26,184,160,0.1)' : 'rgba(0,0,0,0.04)', border: `1.5px solid ${isDayEnabled(key) ? 'rgba(26,184,160,0.25)' : 'rgba(0,0,0,0.08)'}` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: isDayEnabled(key) ? 'var(--teal)' : '#d4d4d4' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isDayEnabled(key) ? 'var(--teal)' : 'var(--mu)', fontFamily: 'var(--fu)' }}>
              {label.slice(0, 3).toUpperCase()}
              {isDayEnabled(key) && <span style={{ marginLeft: 4, fontWeight: 500, color: 'var(--sl)' }}>{(slots[key] || []).length}</span>}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--mu)', alignSelf: 'center' }}>
          {totalSlots} total slots/week
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        {DAYS.map(({ key, label }, idx) => (
          <div key={key} style={{ marginBottom: idx < DAYS.length - 1 ? 20 : 0, paddingBottom: idx < DAYS.length - 1 ? 20 : 0, borderBottom: idx < DAYS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: isDayEnabled(key) ? 12 : 0 }}>
              {/* Toggle */}
              <div
                onClick={() => toggleDay(key)}
                style={{ width: 44, height: 24, borderRadius: 100, cursor: 'pointer', background: isDayEnabled(key) ? 'var(--teal)' : '#d4d4d4', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: 3, left: isDayEnabled(key) ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
              </div>

              <span style={{ fontFamily: 'var(--fu)', fontWeight: 700, fontSize: '0.88rem', color: isDayEnabled(key) ? 'var(--gd)' : 'var(--mu)', width: 100, flexShrink: 0 }}>
                {label}
              </span>

              {!isDayEnabled(key) && (
                <span style={{ fontSize: '0.75rem', color: 'var(--mu)' }}>Unavailable</span>
              )}

              {isDayEnabled(key) && (
                <>
                  <span style={{ fontSize: '0.75rem', color: 'var(--teal)', fontWeight: 600 }}>
                    {(slots[key] || []).length} slot{(slots[key] || []).length !== 1 ? 's' : ''} available
                  </span>
                  {WEEKDAY_KEYS.includes(key) && (
                    <button
                      onClick={() => copyToWeekdays(key)}
                      style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--gb)', background: 'rgba(255,155,81,0.08)', border: '1px solid rgba(255,155,81,0.2)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--fu)', fontWeight: 600 }}
                    >
                      Copy to Mon–Fri
                    </button>
                  )}
                </>
              )}
            </div>

            {isDayEnabled(key) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 58 }}>
                {ALL_TIME_SLOTS.map(time => {
                  const active = (slots[key] || []).includes(time);
                  return (
                    <button
                      key={time}
                      onClick={() => toggleSlot(key, time)}
                      style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: '0.77rem', fontWeight: 600,
                        border: active ? '1.5px solid var(--teal)' : '1.5px solid rgba(0,0,0,0.08)',
                        background: active ? 'rgba(26,184,160,0.1)' : '#f8f9fa',
                        color: active ? 'var(--teal)' : 'var(--sl)',
                        cursor: 'pointer', fontFamily: 'var(--fu)', transition: 'all 0.15s',
                      }}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-gr" onClick={handleSave} disabled={saving} style={{ padding: '11px 28px' }}>
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--mu)' }}>
          Changes apply immediately to new bookings.
        </span>
      </div>
    </>
  );
}
