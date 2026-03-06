import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Home from './Home';
import Results from './Results';
import './App.css';

function AppContent() {
    const [analysisData, setAnalysisData] = useState(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    return (
        <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 15% 0%, rgba(55,115,40,0.12) 0%, transparent 40%), radial-gradient(circle at 85% 100%, rgba(197,231,176,0.1) 0%, transparent 40%), #061008', color: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>

            {/* Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

            {/* GLOBAL HEADER */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 40px',
                background: 'rgba(12,24,14,0.7)',
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(55,115,40,0.3)',
                position: 'sticky', top: 0, zIndex: 100,
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
            }}>
                {/* Logo */}
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }} onClick={() => navigate('/')}>
                    <div style={{ fontSize: '28px' }}>🌾</div>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                            Crop<span style={{ color: '#e2ff80' }}>Guard</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                background: '#e2ff80', boxShadow: '0 0 8px #e2ff80',
                                display: 'inline-block',
                                animation: 'pulse 2s infinite'
                            }} />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#e2ff80', fontWeight: 700, letterSpacing: '0.12em' }}>
                                {t('oversightActive')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: modules + language */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#c5e7b0', opacity: 0.8 }}>
                        {t('modules')}
                    </span>
                    <select
                        value={i18n.language}
                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                        style={{
                            background: 'rgba(55,115,40,0.15)', color: '#ffffff',
                            border: '1px solid rgba(55,115,40,0.5)', padding: '7px 14px',
                            borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
                            fontSize: '13px', outline: 'none', fontFamily: "'Outfit', sans-serif"
                        }}
                    >
                        <option value="en">English</option>
                        <option value="mr">मराठी</option>
                        <option value="hi">हिंदी</option>
                    </select>
                </div>
            </header>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.25)} }
                @keyframes scan  { 0%{top:-5%} 100%{top:105%} }
                @keyframes fadeInUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
                
                .radar-scan-container { position:relative; overflow:hidden; border-radius:10px; border:1px solid rgba(226,255,128,0.3); box-shadow:0 0 25px rgba(226,255,128,0.1); }
                .radar-scan-container::after { content:''; position:absolute; top:-10%; left:0; width:100%; height:8px; background:linear-gradient(to bottom,transparent,rgba(226,255,128,0.6),#e2ff80); box-shadow:0 4px 16px #e2ff80; animation:scan 3s linear infinite; pointer-events:none; z-index:10; }
                
                .drone-card { transition:transform 0.4s cubic-bezier(0.2,0.8,0.2,1); box-shadow:-8px 12px 24px rgba(0,0,0,0.5); border-radius:8px; overflow:hidden; }
                .drone-card:hover { transform: translateY(-4px) translateZ(16px); box-shadow:0 0 20px rgba(197,231,176,0.3); }
                
                .metric-card { background:rgba(12,24,14,0.6); border:1px solid rgba(55,115,40,0.4); border-radius:12px; padding:1.2rem; position:relative; overflow:hidden; transition:all 0.3s; }
                .metric-card:hover { border-color:rgba(197,231,176,0.5); transform:translateY(-3px); box-shadow:0 10px 20px rgba(0,0,0,0.4),0 0 16px rgba(197,231,176,0.15); }
                .metric-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#c5e7b0,transparent); }
                .metric-card.warn::before { background:linear-gradient(90deg,#facc15,transparent); }
                .metric-card.danger::before { background:linear-gradient(90deg,#ff4757,transparent); }
                .metric-card.info::before { background:linear-gradient(90deg,#e2ff80,transparent); }
                
                .ai-action { display:flex; gap:1rem; margin-bottom:1rem; background:rgba(0,0,0,0.45); padding:0.9rem 1.2rem; border-radius:6px; border-left:3px solid #e2ff80; transition:all 0.2s; }
                .ai-action:hover { transform:translateX(4px); background:rgba(226,255,128,0.08); box-shadow:0 0 12px rgba(226,255,128,0.15); }
                
                .progress-bar-bg { height:6px; background:#0c180e; border-radius:3px; overflow:hidden; box-shadow:inset 0 2px 4px rgba(0,0,0,0.6); }
                .progress-bar-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#377328,#e2ff80); }
                
                .glass-panel { background:rgba(12,24,14,0.55); backdrop-filter:blur(12px); border:1px solid rgba(55,115,40,0.3); border-radius:14px; }

                /* Fix for dropdown options contrast */
                option { background-color: #0c180e; color: #c5e7b0; }
            `}</style>

            {/* PAGE CONTENT */}
            <div style={{ padding: '0 40px 60px', maxWidth: '1400px', margin: '0 auto' }}>
                <Routes>
                    <Route path="/" element={<Home setAnalysisData={setAnalysisData} />} />
                    <Route path="/results" element={<Results data={analysisData} />} />
                </Routes>
            </div>

        </div>
    );
}

function App() {
    return <Router><AppContent /></Router>;
}

export default App;