import React, { useState, useMemo } from 'react';
import allApps from '../data/topAppsRecent.json';

const AppTable = () => {
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'reviews', direction: 'desc' });
    const [page, setPage] = useState(1);
    const itemsPerPage = 50;

    const filteredData = useMemo(() => {
        let data = [...allApps];

        // Filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            data = data.filter(app =>
                app.name.toLowerCase().includes(lowerSearch) ||
                (app.launchDate && app.launchDate.toLowerCase().includes(lowerSearch))
            );
        }

        // Sort
        data.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return data;
    }, [search, sortConfig]);

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
            <div className="controls-bar">
                <input
                    type="text"
                    placeholder="Search apps by name or date..."
                    className="search-input"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
                <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
                    Showing {filteredData.length} apps
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
                                <th>Launch Date</th>
                                <th>Review Velocity</th> {/* Calculated on the fly if needed, or just visual filler for now */}
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
                </div>
            </div>

            {/* Pagination */}
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
        </div>
    );
};

export default AppTable;
