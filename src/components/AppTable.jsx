import React, { useState, useMemo } from 'react';
import allApps from '../data/topAppsRecent.json';

const AppTable = () => {
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'reviews', direction: 'desc' });
    const [page, setPage] = useState(1);

    // New Filters
    const [minReviews, setMinReviews] = useState('');
    const [minRating, setMinRating] = useState('');
    const [dateRange, setDateRange] = useState('all'); // all, 1m, 2m, 3m, 6m, custom
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const itemsPerPage = 50;

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        // Remove "· Changelog" or other artifacts if present
        const cleanStr = dateStr.split('·')[0].trim();
        return new Date(cleanStr);
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

            // Handle dates for sorting
            if (sortConfig.key === 'launchDate') {
                valA = parseDate(valA) || new Date(0);
                valB = parseDate(valB) || new Date(0);
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
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'end' }}>

                    {/* Search */}
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Search</label>
                        <input
                            type="text"
                            placeholder="App name..."
                            className="search-input"
                            style={{ width: '100%' }}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    {/* Reviews Filter */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Min Reviews</label>
                        <input
                            type="number"
                            placeholder="e.g. 50"
                            className="search-input"
                            style={{ width: '120px' }}
                            value={minReviews}
                            onChange={(e) => { setMinReviews(e.target.value); setPage(1); }}
                        />
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Min Rating</label>
                        <input
                            type="number"
                            placeholder="e.g. 4.5"
                            step="0.1"
                            className="search-input"
                            style={{ width: '100px' }}
                            value={minRating}
                            onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                        />
                    </div>

                    {/* Date Filter */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Launch Date</label>
                        <select
                            className="search-input"
                            value={dateRange}
                            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="all">Any Time</option>
                            <option value="1m">Last 1 Month</option>
                            <option value="2m">Last 2 Months</option>
                            <option value="3m">Last 3 Months</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {/* Custom Date Range */}
                    {dateRange === 'custom' && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From</label>
                                <input
                                    type="date"
                                    className="search-input"
                                    value={customStart}
                                    onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To</label>
                                <input
                                    type="date"
                                    className="search-input"
                                    value={customEnd}
                                    onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
                                />
                            </div>
                        </>
                    )}

                    <div style={{ marginLeft: 'auto', paddingBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        Found: <strong style={{ color: '#fff' }}>{filteredData.length}</strong> apps
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('name')}>App Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('reviews')}>Reviews {sortConfig.key === 'reviews' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('rating')}>Rating {sortConfig.key === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('launchDate')}>Launch Date {sortConfig.key === 'launchDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th>Velocity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.map((app, index) => (
                                <tr key={`${app.name}-${index}`}>
                                    <td>
                                        <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{cleanName(app.name)}</div>
                                        <a href={`https://${app.name}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                                            Visit App ↗
                                        </a>
                                    </td>
                                    <td>
                                        <span className="tag" style={{ background: 'rgba(255,255,255,0.1)' }}>{app.reviews}</span>
                                    </td>
                                    <td><span style={{ color: '#fbbf24' }}>★</span> {app.rating}</td>
                                    <td>{app.launchDate || <span style={{ opacity: 0.5 }}>Unknown</span>}</td>
                                    <td>
                                        {/* Highlights for 2024/2025 apps */}
                                        {app.launchDate && (app.launchDate.includes('2025') || app.launchDate.includes('2024')) ? (
                                            <span className="tag tag-new">Recent</span>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No apps match your filters.
                        </div>
                    )}
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
