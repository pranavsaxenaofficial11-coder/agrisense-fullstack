import React, { useEffect, useState } from 'react';
import { communityApi } from '../api/services';
import { CommunityPost, DirectMessage } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { ThumbsUp, MessageSquare, Plus, Send, Mail, MapPin } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const [tab, setTab] = useState<'feed' | 'messages'>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [channel, setChannel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Post form
  const [showPostModal, setShowPostModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postChannel, setPostChannel] = useState('irrigation');

  // Direct message input
  const [dmText, setDmText] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await communityApi.getPosts(channel === 'all' ? undefined : channel);
      setPosts(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load community discussions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDMs = async () => {
    try {
      setLoading(true);
      const res = await communityApi.getMessages('pranav@agrisense.io');
      setMessages(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'feed') fetchPosts();
    else fetchDMs();
  }, [tab, channel]);

  const handleUpvote = async (id: number) => {
    try {
      const updated = await communityApi.upvotePost(id);
      setPosts(posts.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await communityApi.createPost({
        author_name: 'Pranav Saxena',
        author_location: 'Samrala, Punjab',
        channel: postChannel,
        title,
        content
      });
      setShowPostModal(false);
      setTitle('');
      setContent('');
      fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to post');
    }
  };

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim()) return;
    try {
      await communityApi.sendMessage({
        sender_email: 'pranav@agrisense.io',
        recipient_email: 'harjeet@punjabfarms.in',
        sender_name: 'Pranav Saxena',
        message: dmText
      });
      setDmText('');
      fetchDMs();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab Switcher & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab('feed')}
            className={tab === 'feed' ? 'agri-btn-primary' : 'agri-btn-outline'}
            style={{ fontSize: '0.85rem' }}
          >
            🌾 Agronomy Community Feed
          </button>
          <button
            onClick={() => setTab('messages')}
            className={tab === 'messages' ? 'agri-btn-primary' : 'agri-btn-outline'}
            style={{ fontSize: '0.85rem' }}
          >
            💬 Direct Messages
          </button>
        </div>

        {tab === 'feed' && (
          <button onClick={() => setShowPostModal(true)} className="agri-btn-primary">
            <Plus size={16} /> New Discussion
          </button>
        )}
      </div>

      {tab === 'feed' ? (
        <>
          {/* Channel Filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'irrigation', label: '💧 Precision Irrigation' },
              { id: 'pest-control', label: '🐛 Crop Protection' },
              { id: 'market-trends', label: '📈 Mandi Updates' },
              { id: 'organic', label: '🌿 Organic Farming' }
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setChannel(c.id)}
                className={channel === c.id ? 'agri-btn-primary' : 'agri-btn-outline'}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading && !posts.length && <LoadingState message="Loading farmer discussions..." />}
          {error && !posts.length && <ErrorState message={error} onRetry={fetchPosts} />}

          {/* Posts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {posts.map((p) => (
              <div key={p.id} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1c2820', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {p.author_name[0]}
                    </div>
                    <div>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p.author_name}</h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#10b981" /> {p.author_location}
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>{p.channel}</span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f3' }}>{p.title}</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.content}</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button
                    onClick={() => handleUpvote(p.id)}
                    className="agri-btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    <ThumbsUp size={14} /> Helpful ({p.upvotes})
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={14} /> {p.replies_count} replies
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Direct Messages */
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Conversations with Local Agronomists & Farmers</h4>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>No messages yet. Message a seller or fellow farmer to start.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender_email === 'pranav@agrisense.io' ? 'flex-end' : 'flex-start',
                    background: m.sender_email === 'pranav@agrisense.io' ? 'rgba(16,185,129,0.18)' : '#18241d',
                    border: '1px solid var(--border-subtle)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    maxWidth: '80%'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'block', marginBottom: '2px', fontWeight: 600 }}>{m.sender_name}</span>
                  <p style={{ fontSize: '0.88rem' }}>{m.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendDM} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Send message to Harjeet Singh (Bathinda)..."
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              style={{ flex: 1, background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px 14px', borderRadius: '8px', color: '#fff' }}
            />
            <button type="submit" className="agri-btn-primary">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* New Post Modal */}
      {showPostModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="agri-card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Start an Agronomy Discussion</h3>
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={postChannel}
                onChange={(e) => setPostChannel(e.target.value)}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              >
                <option value="irrigation">Precision Irrigation</option>
                <option value="pest-control">Crop Protection & Pests</option>
                <option value="market-trends">Mandi & Market Trends</option>
                <option value="organic">Organic Farming</option>
                <option value="general">General Farming</option>
              </select>
              <input
                type="text"
                placeholder="Topic Title (e.g. Managing early blight in tomatoes)"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <textarea
                placeholder="Share your experience, question, or field observations..."
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowPostModal(false)} className="agri-btn-outline">Cancel</button>
                <button type="submit" className="agri-btn-primary">Post to Community</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
