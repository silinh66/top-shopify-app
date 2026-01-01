import React from 'react';
import { analysisGroups, finalAdvice } from '../analysisData';
import { translations } from '../translations';

const colorMap = {
    'from-pink-500 to-rose-500': 'bg-gradient-pink',
    'from-blue-400 to-cyan-300': 'bg-gradient-blue',
    'from-amber-400 to-orange-500': 'bg-gradient-amber',
    'from-violet-500 to-purple-600': 'bg-gradient-violet',
    'from-gray-500 to-slate-700': 'bg-gradient-gray',
    'border-pink-500 text-pink-400': 'border-pink',
    'border-amber-500 text-amber-400': 'border-amber'
};

const AnalysisSection = ({ lang = 'vi' }) => {
    const t = translations[lang];
    const groups = analysisGroups[lang];
    const advice = finalAdvice[lang];

    return (
        <div className="animate-enter">
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
                {t.marketIntelTitle.split(' ')[0]} <span className="text-gradient">{t.marketIntelTitle.split(' ').slice(1).join(' ')}</span>
            </h2>

            <div className="analysis-grid">
                {groups.map((group, index) => (
                    <div key={index} className="glass-panel card">
                        <div className={`card-header ${colorMap[group.color] || 'bg-gradient-gray'}`}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{group.title}</h3>
                            <span className="tag" style={{ background: 'rgba(255,255,255,0.1)' }}>{group.launchDate}</span>
                        </div>
                        <p style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', fontSize: '0.9rem' }}>{group.subtitle}</p>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '0.5rem' }}>{t.topApps}</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {group.apps.map(app => (
                                    <span key={app.name} className="tag" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                                        {app.name} <span style={{ opacity: 0.6 }}>({app.reviews})</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t.insights}:</h4>
                        <ul className="insights-list">
                            {group.insights.map((insight, i) => (
                                <li key={i}>{insight}</li>
                            ))}
                        </ul>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.25rem' }}>{t.opportunity}:</strong>
                            <span style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>{group.opportunity}</span>
                        </div>
                    </div>
                ))}
            </div>

            <h2 style={{ fontSize: '1.8rem', margin: '3rem 0 1.5rem' }}>{t.finalAdvice}</h2>
            <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                {advice.map((item, index) => (
                    <div key={index} className="glass-panel card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: item.title.includes('Frontend') || item.title.includes('Video') ? '#ec4899' : '#f59e0b' }}></div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.title}</h3>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '1rem' }}>{item.desc}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{t.examples}:</span>
                            <span style={{ color: '#fff', fontWeight: '500' }}>{item.examples}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnalysisSection;
