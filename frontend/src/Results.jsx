import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import translations from './locales/translations.json';

function Results({ lang, data }) {
    const [viewMode, setViewMode] = useState('farmer'); // 'farmer' or 'developer'
    const navigate = useNavigate();
    const t = translations[lang];

    // SECURITY CHECK: If someone refreshes the page and data is lost, send them back to Home
    if (!data) {
        return <Navigate to="/" />;
    }

    // Dynamic color picker for alerts
    const getAlertColor = (level) => {
        if (level === "Green") return "#00ff00"; // Neon Green
        if (level === "Yellow") return "#ffcc00"; // Warning Yellow
        return "#ff4b4b"; // Tactical Red
    };

    const getActionPlan = (severity) => {
        if (severity.includes("Optimal")) return t.actionMild;
        if (severity.includes("Moderate")) return t.actionModerate;
        return t.actionSevere;
    };

    return (
        <div style={{ marginTop: '20px' }}>

            {/* VIEW TOGGLE & BACK BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#1e2127', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{ backgroundColor: 'transparent', color: '#00ff00', border: '1px solid #00ff00', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    ⇦ New Scan
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setViewMode('farmer')}
                        style={{ backgroundColor: viewMode === 'farmer' ? '#00ff00' : '#262730', color: viewMode === 'farmer' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
                    >
                        {t.farmerMode}
                    </button>
                    <button
                        onClick={() => setViewMode('developer')}
                        style={{ backgroundColor: viewMode === 'developer' ? '#444' : '#262730', color: '#fff', border: '1px solid #555', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
                    >
                        {t.devMode}
                    </button>
                </div>
            </div>

            {/* MAIN LAYOUT GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>

                {/* LEFT PANEL: OPTICS */}
                <div style={{ backgroundColor: '#1e2127', padding: '20px', borderRadius: '12px', border: '1px solid #262730' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#888', letterSpacing: '2px' }}>OPTICS LOCK</h3>
                    <img
                        src={data.processed_image_base64}
                        alt="Analyzed Field"
                        style={{ width: '100%', borderRadius: '8px', border: '1px solid #444' }}
                    />
                </div>

                {/* RIGHT PANEL: METRICS */}
                <div style={{ backgroundColor: '#1e2127', padding: '20px', borderRadius: '12px', border: '1px solid #262730' }}>

                    {viewMode === 'farmer' ? (
                        /* --- FARMER VIEW --- */
                        <div>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#888', letterSpacing: '2px' }}>{t.metricsTitle}</h3>

                            {/* Alert Status Box */}
                            <div style={{ backgroundColor: '#0e1117', borderLeft: `6px solid ${getAlertColor(data.farmer_metrics.alert_level)}`, padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '14px' }}>{t.alertLevel}</p>
                                <h2 style={{ margin: 0, color: getAlertColor(data.farmer_metrics.alert_level), fontSize: '24px' }}>
                                    {data.farmer_metrics.severity}
                                </h2>
                            </div>

                            {/* Quick Stats */}
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, backgroundColor: '#0e1117', padding: '20px', borderRadius: '6px', textAlign: 'center', border: '1px solid #333' }}>
                                    <h2 style={{ margin: 0, color: '#ffffff', fontSize: '32px' }}>{data.farmer_metrics.lodging_percentage}%</h2>
                                    <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>{t.lodging}</p>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#0e1117', padding: '20px', borderRadius: '6px', textAlign: 'center', border: '1px solid #333' }}>
                                    <h2 style={{ margin: 0, color: '#ffffff', fontSize: '32px' }}>{data.farmer_metrics.yield_loss_estimate}%</h2>
                                    <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>{t.yieldLoss}</p>
                                </div>
                            </div>

                            {/* Action Plan */}
                            <div style={{ backgroundColor: 'rgba(255, 75, 75, 0.05)', border: '1px solid #ff4b4b', padding: '20px', borderRadius: '6px' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#ff4b4b', fontSize: '16px' }}>⚡ {t.actionPlan}</h3>
                                <p style={{ margin: 0, color: '#ffffff', lineHeight: '1.5' }}>{getActionPlan(data.farmer_metrics.severity)}</p>
                            </div>
                        </div>
                    ) : (
                        /* --- DEVELOPER VIEW --- */
                        <div>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#888', letterSpacing: '2px' }}>TACTICAL TELEMETRY</h3>

                            {/* Technical Stats */}
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, backgroundColor: '#0e1117', padding: '15px', borderRadius: '6px', border: '1px solid #333' }}>
                                    <h2 style={{ margin: 0, color: '#00ff00', fontSize: '28px' }}>{data.developer_metrics.edge_density}%</h2>
                                    <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Edge Density</p>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#0e1117', padding: '15px', borderRadius: '6px', border: '1px solid #333' }}>
                                    <h2 style={{ margin: 0, color: '#ffcc00', fontSize: '28px' }}>{data.developer_metrics.inclination_vulnerability}°</h2>
                                    <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Inclination Vuln.</p>
                                </div>
                            </div>

                            {/* Core Stack List */}
                            <div style={{ backgroundColor: '#0e1117', padding: '15px', borderRadius: '6px', border: '1px solid #333', marginBottom: '20px' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '14px' }}>⚙️ {t.coreStackTitle}</h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontFamily: 'monospace', color: '#00ff00', fontSize: '13px', lineHeight: '1.8' }}>
                                    {data.developer_metrics.core_stack.map((item, index) => (
                                        <li key={index}>[SYS.OK] {item}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Chart */}
                            <div style={{ backgroundColor: '#0e1117', padding: '15px', borderRadius: '6px', border: '1px solid #333' }}>
                                <h3 style={{ margin: '0 0 15px 0', color: '#888', fontSize: '14px' }}>📊 {t.spatialAnalysis}</h3>
                                <div style={{ width: '100%', height: '200px' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={data.developer_metrics.stem_details}>
                                            <XAxis dataKey="label" stroke="#888" tick={{ fontSize: 12 }} />
                                            <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }} />
                                            <Bar dataKey="tilt" name="Tilt Degree">
                                                {data.developer_metrics.stem_details.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.tilt > 25 ? '#ff4b4b' : '#00ff00'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default Results;