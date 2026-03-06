import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import translations from './locales/translations.json';
import Home from './Home';
import Results from './Results';
import './App.css';

// We wrap the main content in a component so we can use the `useNavigate` hook safely
function AppContent() {
    const [lang, setLang] = useState('en');
    const [analysisData, setAnalysisData] = useState(null);
    const navigate = useNavigate();

    const t = translations[lang];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0e1117', color: '#fafafa', fontFamily: 'Inter, sans-serif' }}>

            {/* GLOBAL TOP NAVIGATION */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#1e2127', borderBottom: '2px solid #262730' }}>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#ffffff' }}>🌐 {t.appTitle}</h1>
                    <p style={{ margin: 0, fontSize: '12px', color: '#00ff00', letterSpacing: '1px' }}>OVERSIGHT ACTIVE</p>
                </div>

                <div>
                    <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value)}
                        style={{ backgroundColor: '#262730', color: 'white', border: '1px solid #444', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <option value="en">English</option>
                        <option value="mr">मराठी</option>
                        <option value="hi">हिंदी</option>
                    </select>
                </div>
            </header>

            {/* PAGE ROUTING */}
            <div style={{ padding: '20px', width: '100%' }}>
                <Routes>
                    <Route
                        path="/"
                        element={<Home lang={lang} setAnalysisData={setAnalysisData} />}
                    />
                    <Route
                        path="/results"
                        element={<Results lang={lang} data={analysisData} />}
                    />
                </Routes>
            </div>

        </div>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;