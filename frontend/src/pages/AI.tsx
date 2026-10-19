import React, { useState } from 'react';
import { aiApi } from '../api/services';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export const AIPage: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: "Namaste Pranav! I am your AgriSense AI Agronomist. I'm connected to your field sensors. Zone A moisture is 38.4%, and current ambient temperature is 28.5°C. What would you like guidance on today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [crop, setCrop] = useState('Tomato');

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const newMsgs: Msg[] = [...messages, { role: 'user', content: query }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(newMsgs, crop);
      setMessages([...newMsgs, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setMessages([
        ...newMsgs,
        { role: 'assistant', content: `Sorry, I encountered an issue: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '16px' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles color="#10b981" size={20} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Crop Focus:</span>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            style={{
              background: '#121915',
              border: '1px solid var(--border-subtle)',
              color: '#f1f5f3',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}
          >
            <option value="Tomato">Tomato (Hybrid Pusa)</option>
            <option value="Wheat">Wheat (HD-2967)</option>
            <option value="Mustard">Mustard (Pusa Bold)</option>
            <option value="Chilli">Chilli / Capsicum</option>
          </select>
        </div>

        <div className="badge badge-success">
          Model: Llama-3.3-70B (AgriSense Fine-Tuned)
        </div>
      </div>

      {/* Chat Messages Log */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '12px',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}
          >
            {m.role === 'assistant' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={18} color="#10b981" />
              </div>
            )}

            <div style={{
              background: m.role === 'user' ? '#10b981' : '#17211b',
              color: m.role === 'user' ? '#041d11' : '#f1f5f3',
              fontWeight: m.role === 'user' ? 600 : 400,
              padding: '12px 16px',
              borderRadius: '12px',
              border: m.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
              lineHeight: 1.5,
              fontSize: '0.92rem',
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>

            {m.role === 'user' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#22362b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <User size={18} color="#f1f5f3" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="#10b981" />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AgriSense AI is analyzing sensor telemetry...</span>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          'Should I irrigate Zone A tonight?',
          'What is the ideal NPK ratio for fruiting tomatoes?',
          'How can I prevent early blight in this humidity?'
        ].map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            className="agri-btn-outline"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        style={{ display: 'flex', gap: '10px' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about irrigation, crop diseases, fertilizer, or harvest..."
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#f1f5f3',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="agri-btn-primary"
          style={{ padding: '0 20px' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
