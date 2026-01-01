import React, { useState } from 'react';
import AnalysisSection from './components/AnalysisSection';
import AppTable from './components/AppTable';
import { translations } from './translations';

function App() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [lang, setLang] = useState('vi'); // Default Vietnamese

  const t = translations[lang];

  return (
    <div className="container">
      {/* Language Switcher */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100 }}>
        <button
          className={`btn ${lang === 'vi' ? 'btn-active' : 'btn-ghost'}`}
          onClick={() => setLang('vi')}
          style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
        >
          🇻🇳 VI
        </button>
        <button
          className={`btn ${lang === 'en' ? 'btn-active' : 'btn-ghost'}`}
          onClick={() => setLang('en')}
          style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
        >
          🇺🇸 EN
        </button>
      </div>

      {/* Hero Section */}
      <header style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '2rem' }}>
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          background: 'rgba(99, 102, 241, 0.1)',
          color: '#818cf8',
          borderRadius: '999px',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          fontWeight: '500'
        }}>
          Shopify Market Intelligence
        </div>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1.1 }}>
          {lang === 'vi' ? 'Xu Hướng App' : 'Top App Trends'} <span className="text-gradient">2025</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
          {t.subtitle}
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', borderRadius: '12px' }}>
          <button
            className={`btn ${activeTab === 'analysis' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('analysis')}
          >
            📊 {t.marketIntelligence}
          </button>
          <button
            className={`btn ${activeTab === 'data' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('data')}
          >
            💾 {t.rawDataExplorer}
          </button>
        </div>
      </div>

      {/* Content */}
      <main>
        {activeTab === 'analysis' ? <AnalysisSection lang={lang} /> : <AppTable lang={lang} />}
      </main>

      <footer style={{ marginTop: '5rem', textAlign: 'center', color: 'var(--text-secondary)', paddingBottom: '2rem' }}>
        <p>{t.generatedBy}</p>
      </footer>
    </div>
  );
}

export default App;
