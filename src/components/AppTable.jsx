import React, { useState, useMemo } from 'react';
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

    const itemsPerPage = 50;

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const cleanStr = dateStr.split('·')[0].trim();
        return new Date(cleanStr);
    };

    const parseCategory = (catStr) => {
        if (!catStr) return '';
        // Valid categories usually have just the name, but data might have "Category Name\n\n243 apps"
        // We take the first line
        const baseName = catStr.split('\n')[0].trim();
        return baseName;
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

            // Category Sort (Translated)
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
                {/* Responsive Grid Layout for Filters */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    alignItems: 'end'
                }}>

                    {/* Search (Takes full width on small, 2 cols on huge screens if needed, but auto-fit handles it) */}
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {t.appName} / {t.date}
                        </label>
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            className="search-input"
                            style={{ width: '100%', boxSizing: 'border-box' }} // Ensure padding doesn't overflow
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    {/* Reviews Filter */}
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

                    {/* Rating Filter */}
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

                    {/* Date Filter */}
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

                    {/* Custom Date Range */}
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
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.map((app, index) => {
                                const rawCat = parseCategory(app.category);
                                const displayCat = categoryTranslations[rawCat] || rawCat; // Translate or fallback

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
                                            {app.launchDate ? app.launchDate.split('·')[0] : <span style={{ opacity: 0.5 }}>-</span>}
                                            {/* Highlights for 2024/2025 apps */}
                                            {app.launchDate && (app.launchDate.includes('2025') || app.launchDate.includes('2024')) ? (
                                                <span style={{ marginLeft: '0.5rem' }} className="tag tag-new">New</span>
                                            ) : null}
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
        </div>
    );
};

export default AppTable;
