import React from 'react';
import { BookOpen, ExternalLink, Calendar, User } from 'lucide-react';

export const BlogPage: React.FC = () => {
  const articles = [
    {
      id: 1,
      title: 'Precision Drip Irrigation in Tomato: Yield Maximization Guide',
      category: 'Irrigation Technology',
      author: 'Dr. Gurmeet Singh (PAU)',
      date: '24 Sep 2026',
      readTime: '6 min read',
      excerpt: 'Learn how automated sensor-based micro-irrigation reduces blossom end rot and fungal blight while slashing groundwater pumping by 42%.'
    },
    {
      id: 2,
      title: 'Soil Organic Carbon & Bio-NPK Dynamics in North Indian Soils',
      category: 'Soil Science',
      author: 'Krishi Vigyan Kendra',
      date: '18 Sep 2026',
      readTime: '8 min read',
      excerpt: 'Restoring native mycorrhizal fungi and nitrogen-fixing bacteria through fermented vermiwash and reduced tillage.'
    },
    {
      id: 3,
      title: 'Managing Early Blight & Whitefly in Humid Monsoons',
      category: 'Pest & Disease Control',
      author: 'AgriSense Agronomy Team',
      date: '12 Sep 2026',
      readTime: '5 min read',
      excerpt: 'A complete schedule of preventive neem oil foliar applications and timely fungicide sprays aligned with hyper-local weather alerts.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Krishi Knowledge Base & Agronomy Guides</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Research-backed agricultural tutorials, crop advisories, and smart farming practices</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {articles.map((a) => (
          <div key={a.id} className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="badge badge-success" style={{ alignSelf: 'flex-start' }}>{a.category}</span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f3', lineHeight: 1.4 }}>{a.title}</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.excerpt}</p>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              <span>{a.author}</span>
              <span>{a.readTime}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
