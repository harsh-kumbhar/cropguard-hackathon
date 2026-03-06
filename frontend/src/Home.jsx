import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

function Home({ setAnalysisData }) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('http://localhost:8000/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAnalysisData(response.data);
            navigate('/results');
        } catch (err) {
            console.error('API Error:', err);
            alert('System Error: Unable to reach AI Core.');
            setLoading(false);
        }
    };

    return (
        <div style={{ animation: 'fadeInUp 0.7s ease forwards' }}>

            {/* ── Hero ── */}
            <div style={{ textAlign: 'center', padding: '60px 0 50px' }}>
                <div style={{
                    display: 'inline-block',
                    border: '1px solid #c5e7b0',
                    color: '#c5e7b0',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px', fontWeight: 600,
                    letterSpacing: '0.18em', padding: '5px 14px',
                    borderRadius: '20px', marginBottom: '20px',
                    boxShadow: '0 0 12px rgba(197,231,176,0.2)',
                    textTransform: 'uppercase'
                }}>
                    {t('heroBadge')}
                </div>
                <div style={{
                    fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 800,
                    color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1.1,
                    marginBottom: '14px', textShadow: '0 0 60px rgba(226,255,128,0.3)'
                }}>
                    Crop<span style={{ color: '#e2ff80', textShadow: '0 0 15px rgba(226,255,128,0.4)' }}>Guard</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 300, color: '#c5e7b0', marginBottom: '8px', opacity: 0.8 }}>
                    {t('heroSubtitle')}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#377328', opacity: 0.9 }}>
                    {t('modules')}
                </div>
            </div>

            {/* ── Upload Box ── */}
            <div style={{ maxWidth: '620px', margin: '0 auto 60px' }}>
                <label style={{ display: 'block', cursor: loading ? 'wait' : 'pointer' }}>
                    <div style={{
                        background: 'rgba(12,24,14,0.6)', backdropFilter: 'blur(12px)',
                        border: '2px dashed rgba(226,255,128,0.4)', borderRadius: '16px',
                        padding: '60px 40px', textAlign: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        transition: 'all 0.3s',
                        position: 'relative', overflow: 'hidden'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(226,255,128,0.8)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.6),0 0 30px rgba(226,255,128,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(226,255,128,0.4)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)'; }}
                    >
                        {loading ? (
                            <>
                                <div style={{ fontSize: '52px', marginBottom: '16px', filter: 'hue-rotate(90deg)' }}>📡</div>
                                <div style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: '#e2ff80', fontSize: '14px', letterSpacing: '0.15em',
                                    fontWeight: 700, textTransform: 'uppercase'
                                }}>{t('analyzing')}</div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '52px', color: '#e2ff80', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(226,255,128,0.4))' }}>⇪</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                                    {t('uploadPrompt')}
                                </div>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#c5e7b0', opacity: 0.6 }}>
                                    {t('fileLimit')}
                                </div>
                            </>
                        )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
            </div>

            {/* ── Info Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px' }}>
                {[
                    {
                        title: t('techStack'),
                        icon: '⚙️',
                        color: '#377328', // Dark green
                        items: ['OpenCV · Hough Lines', 'Canny Edge Detection', 'HSV Masking', 'Roboflow Inference']
                    },
                    {
                        title: t('detectionModes'),
                        icon: '👁',
                        color: '#c5e7b0', // Light green
                        items: [t('resultHealthy'), t('resultModerate'), t('resultSevere')]
                    },
                    {
                        title: t('outputMetrics'),
                        icon: '📊',
                        color: '#e2ff80', // Lime
                        items: [t('structAngle'), t('criticalRisk'), t('bioCoverage'), t('aiConfidence')]
                    }
                ].map((card, i) => (
                    <div key={i} style={{
                        background: 'rgba(12,24,14,0.55)', backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(55,115,40,0.4)', borderRadius: '14px', padding: '24px',
                        transition: 'all 0.3s',
                        borderTop: `3px solid ${card.color}`
                    }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 28px rgba(0,0,0,0.4),0 0 16px ${card.color}33`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>{card.icon}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: card.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                            {card.title}
                        </div>
                        {card.items.map((item, j) => (
                            <div key={j} style={{ fontSize: '13px', color: '#c5e7b0', opacity: 0.8, lineHeight: 2, fontFamily: "'Outfit', sans-serif" }}>
                                · {item}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

        </div>
    );
}

export default Home;