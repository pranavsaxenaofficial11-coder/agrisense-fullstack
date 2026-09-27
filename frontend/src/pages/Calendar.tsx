import React, { useEffect, useState } from 'react';
import { calendarApi } from '../api/services';
import { CalendarEvent } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { Calendar, Plus, CheckCircle, Clock } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    crop_name: 'Tomato',
    stage: 'Fruiting',
    title: '',
    action_type: 'Irrigation',
    target_date: new Date().toISOString().split('T')[0]
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await calendarApi.getEvents();
      setEvents(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load crop calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleToggle = async (id: number) => {
    try {
      const updated = await calendarApi.toggleEvent(id);
      setEvents(events.map((e) => (e.id === id ? updated : e)));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await calendarApi.addEvent(form);
      setShowModal(false);
      setForm({ ...form, title: '' });
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to add event');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Crop Phenology & Field Task Calendar</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Automated timeline for irrigation cycles, fertilization, and harvest picking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="agri-btn-primary">
          <Plus size={16} /> Add Field Task
        </button>
      </div>

      {loading && !events.length && <LoadingState message="Loading crop schedule..." />}
      {error && !events.length && <ErrorState message={error} onRetry={fetchEvents} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.map((evt) => (
          <div
            key={evt.id}
            className="agri-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              opacity: evt.is_completed ? 0.6 : 1,
              borderLeft: evt.is_completed ? '4px solid #64746d' : '4px solid #10b981'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => handleToggle(evt.id)}
                style={{
                  background: evt.is_completed ? '#10b981' : 'transparent',
                  border: '2px solid #10b981',
                  borderRadius: '6px',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#090d0b'
                }}
              >
                {evt.is_completed && <CheckCircle size={16} />}
              </button>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>{evt.crop_name}</span>
                  <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>{evt.stage}</span>
                  <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>{evt.action_type}</span>
                </div>
                <h4 style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textDecoration: evt.is_completed ? 'line-through' : 'none'
                }}>
                  {evt.title}
                </h4>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Clock size={14} />
              <span className="mono-val">{evt.target_date}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="agri-card" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Field Schedule Task</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Crop (e.g. Tomato, Wheat)"
                required
                value={form.crop_name}
                onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="Sowing">Sowing</option>
                  <option value="Vegetative">Vegetative</option>
                  <option value="Flowering">Flowering</option>
                  <option value="Fruiting">Fruiting</option>
                  <option value="Harvesting">Harvesting</option>
                </select>
                <select
                  value={form.action_type}
                  onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="Irrigation">Irrigation</option>
                  <option value="Fertilization">Fertilization</option>
                  <option value="Spraying">Pesticide Spray</option>
                  <option value="Weeding">Weeding</option>
                  <option value="Harvest">Harvesting</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Task Description (e.g. Apply Calcium Nitrate)"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <input
                type="date"
                required
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="agri-btn-outline">Cancel</button>
                <button type="submit" className="agri-btn-primary">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
