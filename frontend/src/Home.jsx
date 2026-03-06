import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import translations from './locales/translations.json';

function Home({ lang, setAnalysisData }) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const t = translations[lang];

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Send image to our Python microservice
            const response = await axios.post("http://localhost:8000/analyze", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            // Save the returned JSON data to our global state
            setAnalysisData(response.data);

            // Jump to the Results page!
            navigate('/results');
        } catch (error) {
            console.error("API Error:", error);
            alert("System Error: Unable to establish uplink with AI Core.");
            setLoading(false);
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '60px' }}>

            {/* Tactical Sub-header */}
            <h2 style={{ color: '#ffffff', marginBottom: '10px', fontWeight: '600', letterSpacing: '1px' }}>
                {t.subtitle}
            </h2>
            <p style={{ color: '#888', marginBottom: '50px', fontFamily: 'monospace' }}>
                Uplink: Satellite | Drone | Ground-Sensor
            </p>

            {/* Upload Console */}
            <div style={{
                maxWidth: '600px',
                margin: '0 auto',
                backgroundColor: '#1e2127',
                padding: '50px',
                borderRadius: '12px',
                border: '2px dashed #444',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease'
            }}>
                {loading ? (
                    <div style={{ padding: '30px 0' }}>
                        <div style={{ fontSize: '50px', marginBottom: '20px' }}>📡</div>
                        <h3 style={{ color: '#ffcc00', letterSpacing: '2px', margin: 0 }}>{t.analyzing}</h3>
                    </div>
                ) : (
                    <label style={{ display: 'block', cursor: 'pointer' }}>
                        <div style={{ fontSize: '50px', color: '#00ff00', marginBottom: '20px' }}>⇪</div>
                        <h3 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '22px' }}>
                            {t.uploadPrompt}
                        </h3>
                        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                            Limit 200MB per file JPG, JPEG, PNG
                        </p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </label>
                )}
            </div>

        </div>
    );
}

export default Home;