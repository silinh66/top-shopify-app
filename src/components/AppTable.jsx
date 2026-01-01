import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import allApps from '../data/topAppsRecent.json';
import { translations, categoryTranslations } from '../translations';

const AppTable = ({ lang = 'vi' }) => {
    const t = translations[lang];
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'reviews', direction: 'desc' });
    const [page, setPage] = useState(1);

    // Filters
    const [minReviews, setMinReviews] = useState('');
    const [minRating, setMinRating] = useState('');
    const [dateRange, setDateRange] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Analysis State
    const [analyzingId, setAnalyzingId] = useState(null);
    const [analysisData, setAnalysisData] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const itemsPerPage = 50;

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const cleanStr = dateStr.split('·')[0].trim();
        return new Date(cleanStr);
    };

    const parseCategory = (catStr) => {
        if (!catStr) return '';
        const baseName = catStr.split('\n')[0].trim();
        return baseName;
    };

    const handleAnalyze = async (app) => {
        const appId = app.name.replace('apps.shopify.com/', '').replace(/\/$/, ''); // Simple ID generation
        setAnalyzingId(appId);

        try {
            // Production URL: https://shopify-backend.vibita.io
            // Local fallback (commented): http://localhost:3000
            const apiUrl = 'https://shopify-backend.vibita.io/api/analyze';

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: app.name,
                    appId: appId,
                    appName: app.name // sending name for prompt context
                })
            });
            const data = await res.json();
            setAnalysisData(data);
            setShowModal(true);
        } catch (err) {
            console.error(err);
            alert("Analysis failed. Make sure server works and API Key is valid.");
        } finally {
            setAnalyzingId(null);
        }
    };

    const filteredData = useMemo(() => {
        let data = [...allApps];
        const now = new Date();

        // 1. Text Search
        if (search) {
            const lowerSearch = search.toLowerCase();
            data = data.filter(app =>
                app.name.toLowerCase().includes(lowerSearch) ||
                (app.launchDate && app.launchDate.toLowerCase().includes(lowerSearch))
            );
        }

        // 2. Min Reviews
        if (minReviews) {
            data = data.filter(app => (app.reviews || 0) >= parseInt(minReviews));
        }

        // 3. Min Rating
        if (minRating) {
            data = data.filter(app => (app.rating || 0) >= parseFloat(minRating));
        }

        // 4. Date Filter
        if (dateRange !== 'all') {
            data = data.filter(app => {
                const appDate = parseDate(app.launchDate);
                if (!appDate || isNaN(appDate.getTime())) return false;

                if (dateRange === 'custom') {
                    const start = customStart ? new Date(customStart) : new Date('1970-01-01');
                    const end = customEnd ? new Date(customEnd) : new Date();
                    return appDate >= start && appDate <= end;
                } else {
                    let monthsToSubtract = 0;
                    if (dateRange === '1m') monthsToSubtract = 1;
                    if (dateRange === '2m') monthsToSubtract = 2;
                    if (dateRange === '3m') monthsToSubtract = 3;
                    if (dateRange === '6m') monthsToSubtract = 6;

                    const cutoffDate = new Date();
                    cutoffDate.setMonth(now.getMonth() - monthsToSubtract);
                    return appDate >= cutoffDate;
                }
            });
        }

        // Sort
        data.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'launchDate') {
                valA = parseDate(valA) || new Date(0);
                valB = parseDate(valB) || new Date(0);
            }

            if (sortConfig.key === 'category') {
                const catA = parseCategory(valA);
                const catB = parseCategory(valB);
                valA = categoryTranslations[catA] || catA;
                valB = categoryTranslations[catB] || catB;
            }

            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return data;
    }, [search, sortConfig, minReviews, minRating, dateRange, customStart, customEnd]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const cleanName = (urlName) => {
        return urlName.replace('apps.shopify.com/', '').replace(/-/g, ' ');
    };

    return (
        <div className="animate-enter">
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    alignItems: 'end'
                }}>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {t.appName} / {t.date}
                        </label>
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            className="search-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.minReviews}</label>
                        <input
                            type="number"
                            placeholder="e.g. 50"
                            className="search-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            value={minReviews}
                            onChange={(e) => { setMinReviews(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.minRating}</label>
                        <input
                            type="number"
                            placeholder="e.g. 4.5"
                            step="0.1"
                            className="search-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            value={minRating}
                            onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.launchDate}</label>
                        <select
                            className="search-input"
                            value={dateRange}
                            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
                            style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                        >
                            <option value="all">{t.anyTime}</option>
                            <option value="1m">{t.last1Month}</option>
                            <option value="2m">{t.last2Months}</option>
                            <option value="3m">{t.last3Months}</option>
                            <option value="6m">{t.last6Months}</option>
                            <option value="custom">{t.customRange}</option>
                        </select>
                    </div>
                    {dateRange === 'custom' && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.from}</label>
                                <input
                                    type="date"
                                    className="search-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={customStart}
                                    onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.to}</label>
                                <input
                                    type="date"
                                    className="search-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={customEnd}
                                    onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
                                />
                            </div>
                        </>
                    )}
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {t.foundApps}: <strong style={{ color: '#fff' }}>{filteredData.length}</strong> apps
                </div>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('name')}>
                                    {t.appName} {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('category')}>
                                    {t.category} {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('reviews')}>
                                    {t.reviews} {sortConfig.key === 'reviews' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('rating')}>
                                    {t.rating} {sortConfig.key === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('launchDate')}>
                                    {t.date} {sortConfig.key === 'launchDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.map((app, index) => {
                                const rawCat = parseCategory(app.category);
                                const displayCat = categoryTranslations[rawCat] || rawCat;
                                const appId = app.name.replace('apps.shopify.com/', '').replace(/\/$/, '');
                                const isAnalyzing = analyzingId === appId;

                                const formatDateVN = (dateStr) => {
                                    if (!dateStr) return <span style={{ opacity: 0.5 }}>-</span>;
                                    const cleanStr = dateStr.split('·')[0].trim();
                                    const date = new Date(cleanStr);

                                    if (!date || isNaN(date.getTime())) return cleanStr;

                                    if (lang === 'vi') {
                                        // Format: 18 tháng 7, 2025
                                        const day = date.getDate();
                                        const month = date.getMonth() + 1;
                                        const year = date.getFullYear();
                                        return `${day} tháng ${month}, ${year}`;
                                    }
                                    return cleanStr;
                                };

                                return (
                                    <tr key={`${app.name}-${index}`}>
                                        <td>
                                            <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{cleanName(app.name)}</div>
                                            <a href={`https://${app.name}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                                                {t.visitApp} ↗
                                            </a>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{displayCat}</span>
                                        </td>
                                        <td>
                                            <span className="tag" style={{ background: 'rgba(255,255,255,0.1)' }}>{app.reviews}</span>
                                        </td>
                                        <td><span style={{ color: '#fbbf24' }}>★</span> {app.rating}</td>
                                        <td>
                                            {formatDateVN(app.launchDate)}
                                            {app.launchDate && (app.launchDate.includes('2025') || app.launchDate.includes('2024')) ? (
                                                <span style={{ marginLeft: '0.5rem' }} className="tag tag-new">New</span>
                                            ) : null}
                                        </td>
                                        <td>
                                            <button
                                                className={`btn ${isAnalyzing ? 'btn-ghost' : 'btn-primary'}`}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    fontSize: '0.8rem',
                                                    background: isAnalyzing ? 'rgba(255,255,255,0.05)' : '',
                                                    border: isAnalyzing ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.5)',
                                                    cursor: isAnalyzing ? 'wait' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}
                                                onClick={() => handleAnalyze(app)}
                                                disabled={isAnalyzing}
                                            >
                                                {isAnalyzing ? (
                                                    <>
                                                        <span className="loading-spinner"></span>
                                                        <span>AI đang phân tích...</span>
                                                    </>
                                                ) : (
                                                    "🔍 " + t.analyze
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {filteredData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
                    <button
                        className="btn btn-ghost"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </button>
                    <span style={{ color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                    <button
                        className="btn btn-ghost"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Analysis Modal - Uses Portal to escape parent transforms */}
            {showModal && analysisData && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-panel" style={{
                        width: '90%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '1.5rem', // Reduced padding
                        boxSizing: 'border-box', // Fix width overflow
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
                        >
                            ×
                        </button>

                        <h2 className="text-gradient" style={{ marginBottom: '1.5rem', paddingRight: '1rem', marginTop: '0.5rem' }}>{t.analysisTitle}</h2>

                        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                            <Section title="⚡ Tính Năng Chính" content={analysisData.main_features} color="cyan" />
                            <Section title="💎 Mô Hình Giá" content={analysisData.pricing_model} color="green" />
                            <Section title="🔥 Điểm Ăn Tiền (Pros)" content={analysisData.pros} color="pink" />
                            <Section title="⚠️ Điểm Yếu (Cons)" content={analysisData.cons} color="red" />
                            <Section title="💰 Cách Kiếm Tiền" content={analysisData.monetization_strategy} color="yellow" />
                            <Section title="🚀 Hướng Triển Khai (Similar App)" content={analysisData.similar_app_strategy} color="purple" />
                            <Section title="🚧 Khó Khăn Triển Khai" content={analysisData.implementation_challenges} color="orange" />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// Simple helper component for Modal Sections
const Section = ({ title, content, color }) => (
    <div style={{ background: `rgba(255,255,255,0.05)`, padding: '1rem', borderRadius: '8px', borderLeft: `3px solid var(--accent-${color === 'red' ? 'pink' : color})` }}>
        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase' }}>{title}</h4>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {content}
        </div>
    </div>
);

export default AppTable;
