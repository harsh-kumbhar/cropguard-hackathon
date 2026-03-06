import React, { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    AreaChart, Area, ComposedChart, Bar, Line,
    BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend
} from 'recharts';

/* ─────────────────────────────── helpers ─────────────────────────────── */

// Custom OHLC candle shape
const OHLCBar = (props) => {
    const { x, y, width, height, open, close, high, low, index } = props;
    if (open == null) return null;
    const isUp   = close >= open;
    const color  = isUp ? '#377328' : '#e2ff80';
    const cx     = x + width / 2;
    // map data values to pixel coords via the chart's y scale (passed as yScale)
    const yScale = props.yScale;
    if (!yScale) return null;
    const yHigh  = yScale(high);
    const yLow   = yScale(low);
    const yOpen  = yScale(open);
    const yClose = yScale(close);
    return (
        <g>
            <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1.5} />
            <rect x={x + 1} y={Math.min(yOpen, yClose)} width={Math.max(1, width - 2)} height={Math.max(1, Math.abs(yOpen - yClose))} fill={color} rx={1} />
        </g>
    );
};

/* ─────────────────────────────── component ───────────────────────────── */

function Results({ data }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState('farmer');

    if (!data) return <Navigate to="/" />;

    const res   = data.result          || {};
    const veg   = data.vegetation        || {};
    const edges = data.edges             || {};
    const stems = data.stems             || {};
    const fm    = data.farmer_metrics    || {};
    const dm    = data.developer_metrics || {};

    // Base64 image from the backend
    const imgSrc = data.processed_image_base64 || '';

    const riskScore  = res.risk_score    ?? fm.lodging_percentage   ?? 0;
    const avgAngle   = res.avg_angle     ?? dm.inclination_vulnerability ?? 0;
    const confidence = data.confidence   ?? 75;
    const procTime   = data.process_time_ms ?? '—';
    const coverage   = veg.coverage_pct  ?? 0;
    const edgePct    = edges.edge_density_pct ?? dm.edge_density    ?? 0;
    const inclVuln   = dm.inclination_vulnerability ?? 0;
    const lineCount  = stems.line_count  ?? 0;
    const vertPct    = stems.vertical_pct ?? 0;
    const severity   = fm.severity       ?? '';
    const ohlcData   = dm.ohlc           ?? [];
    const coreStack  = dm.core_stack     ?? [];
    const stemDetails = dm.stem_details  ?? [];

    const bannerColor = (() => {
        const lvl = fm.alert_level ?? '';
        if (lvl === 'Red'    || riskScore > 65) return '#ff4757'; // Keep semantic red
        if (lvl === 'Yellow' || riskScore > 35) return '#e2ff80'; // Map yellow to theme yellow-green
        return '#377328'; // Map green to theme dark green
    })();

    const getSeverityLabel = () => {
        if (severity.includes('Optimal'))  return t('severityOptimal');
        if (severity.includes('Moderate')) return t('severityModerate');
        return t('severitySevere');
    };

    const getResultLabel = () => {
        const raw = res.label ?? '';
        if (raw.includes('Healthy'))  return t('resultHealthy');
        if (raw.includes('Moderate')) return t('resultModerate');
        if (raw.includes('Severe'))   return t('resultSevere');
        return getSeverityLabel();
    };

    const getActionPlan = () => {
        if (riskScore > 65) return [
            { num: '01', key: t('emergencySupport'),      val: t('emergencyText') },
            { num: '02', key: t('nutritionIntervention'), val: t('nutritionText') },
            { num: '03', key: t('waterMgmt'),             val: t('waterText') },
        ];
        if (riskScore > 35) return [
            { num: '01', key: t('growthReg'),             val: t('growthText') },
            { num: '02', key: t('potassiumBoost'),        val: t('potassiumText') },
            { num: '03', key: t('observationPhase'),      val: t('observationText') },
        ];
        return [
            { num: '01', key: t('optimalHealth'),         val: t('optimalText') },
            { num: '02', key: t('standardNutrition'),     val: t('nutritionContinue') },
            { num: '03', key: t('preventive'),            val: t('preventiveText') },
        ];
    };

    // Synthetic risk trend (30 points)
    const trendData = useMemo(() => {
        const arr = [];
        let v = riskScore;
        for (let i = 0; i < 30; i++) {
            const s = Math.sin(i * riskScore + i) * 10000;
            arr.unshift({ x: i + 1, risk: Math.max(0, Math.min(100, v)) });
            v += ((s - Math.floor(s)) - 0.5) * 14;
        }
        return arr;
    }, [riskScore]);

    const pieData = [
        { name: t('uprightRatio'), value: Math.max(0, Math.round(100 - riskScore)) },
        { name: t('criticalRisk'), value: Math.round(riskScore) },
    ];

    // Shared card style
    const card = {
        background:    'rgba(12,24,14,0.65)',
        backdropFilter:'blur(14px)',
        border:        '1px solid rgba(55,115,40,0.6)',
        borderRadius:  '14px',
        padding:       '22px',
    };

    const mono = { fontFamily: "'JetBrains Mono', monospace" };
    // Force tooltip text colors for contrast against the dark background
    const tooltipStyle = { background: '#0c180e', border: '1px solid #377328', color: '#ffffff', fontSize: '12px' };
    const tooltipLabelStyle = { color: '#c5e7b0', marginBottom: '4px' };
    const tooltipItemStyle  = { color: '#e2ff80' };

    /* ── TOP BAR (always visible) ── */
    const topBar = (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', ...card }}>
            <button onClick={() => navigate('/')} style={{
                background:'transparent', color:'#e2ff80',
                border:'1px solid rgba(226,255,128,0.5)', padding:'8px 18px', borderRadius:'6px',
                cursor:'pointer', fontWeight:700, ...mono, fontSize:'12px', transition:'all 0.2s'
            }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(226,255,128,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{t('newScan')}</button>

            {/* Mode toggle */}
            <div style={{ display:'flex', gap:'8px' }}>
                {[{ k:'farmer', label: `🌾 ${t('farmerMode')}`, active:'#e2ff80' },
                  { k:'dev',    label: `🔬 ${t('devMode')}`,    active:'#c5e7b0' }
                ].map(btn => (
                    <button key={btn.k} onClick={() => setViewMode(btn.k)} style={{
                        padding:'8px 20px', borderRadius:'6px', cursor:'pointer',
                        fontWeight:700, fontSize:'12px', fontFamily:"'Outfit', sans-serif", transition:'all 0.25s',
                        background: viewMode === btn.k ? btn.active : 'rgba(55,115,40,0.4)',
                        color:      viewMode === btn.k ? '#0c180e' : '#c5e7b0',
                        border:     viewMode === btn.k ? 'none' : '1px solid rgba(55,115,40,0.8)',
                        boxShadow:  viewMode === btn.k ? `0 0 14px ${btn.active}55` : 'none',
                    }}>{btn.label}</button>
                ))}
            </div>

            <div style={{ ...mono, fontSize:'11px', color:'#c5e7b0', opacity: 0.8 }}>
                {t('sysConfidence')}: <span style={{ color:'#e2ff80' }}>{confidence}%</span>
                &nbsp;|&nbsp;{t('latency')}: <span style={{ color:'#e2ff80' }}>{procTime}ms</span>
            </div>
        </div>
    );

    /* ════════════════════════════════════════════════
       FARMER MODE
    ════════════════════════════════════════════════ */
    if (viewMode === 'farmer') {
        return (
            <div style={{ paddingTop:'30px', animation:'fadeInUp 0.6s ease forwards' }}>
                {topBar}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.1fr', gap:'24px', alignItems:'start' }}>

                    {/* ── Processed image ── */}
                    <div style={card}>
                        <div style={{ ...mono, fontSize:'11px', color:'#e2ff80', letterSpacing:'0.12em', marginBottom:'12px' }}>
                            📡 {t('opticsLock')}
                        </div>
                        <div className="radar-scan-container">
                            <img src={imgSrc} 
                                 alt="field" style={{ width:'100%', display:'block' }} />
                        </div>
                    </div>

                    {/* ── Farmer dashboard ── */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

                        {/* Alert banner */}
                        <div style={{
                            background:'rgba(12,24,14,0.8)', borderLeft:`6px solid ${bannerColor}`,
                            borderRadius:'10px', padding:'22px 24px',
                            boxShadow:`0 0 20px ${bannerColor}22`, border:`1px solid ${bannerColor}22`,
                        }}>
                            <div style={{ fontSize:'11px', color:'#c5e7b0', letterSpacing:'0.1em', marginBottom:'8px' }}>
                                {t('alertLevel').toUpperCase()}
                            </div>
                            <div style={{ fontSize:'2rem', fontWeight:800, color:bannerColor, fontFamily:"'Outfit',sans-serif", lineHeight:1.2 }}>
                                {getSeverityLabel()}
                            </div>
                            <div style={{ ...mono, fontSize:'11px', color:'#c5e7b0', opacity: 0.7, marginTop:'8px' }}>
                                {t('sysConfidence')}: {confidence}% &nbsp;|&nbsp; {t('latency')}: {procTime}ms
                            </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                            {[
                                { label: t('lodging'),   value:`${fm.lodging_percentage ?? 0}%`,   color: bannerColor },
                                { label: t('yieldLoss'), value:`${fm.yield_loss_estimate ?? 0}%`,    color:'#e2ff80' },
                            ].map((s,i) => (
                                <div key={i} style={{ ...card, textAlign:'center', padding:'20px' }}>
                                    <div style={{ fontSize:'2.4rem', fontWeight:800, color:s.color, fontFamily:"'Outfit',sans-serif" }}>
                                        {s.value}
                                    </div>
                                    <div style={{ fontSize:'11px', color:'#c5e7b0', opacity:0.8, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:'6px' }}>
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 3-step AI Action Plan */}
                        <div style={{
                            background:'linear-gradient(145deg,rgba(12,24,14,0.9),rgba(18,36,21,0.9))',
                            border:'1px solid rgba(226,255,128,0.3)', borderRadius:'12px',
                            padding:'22px', position:'relative', overflow:'hidden'
                        }}>
                            <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px',
                                background:'linear-gradient(90deg,#377328,#e2ff80)', boxShadow:'0 0 10px #e2ff80' }} />

                            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
                                <span style={{ fontSize:'20px' }}>🤖</span>
                                <span style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700, color:'#ffffff', fontSize:'1rem' }}>
                                    {t('aiPlan')}
                                </span>
                            </div>

                            {getActionPlan().map((action, i) => (
                                <div key={i} className="ai-action">
                                    <div style={{ ...mono, fontSize:'13px', fontWeight:700, color:'#e2ff80', flexShrink:0 }}>
                                        {action.num}.
                                    </div>
                                    <div style={{ fontSize:'13px', color:'#c5e7b0', lineHeight:1.7 }}>
                                        <strong style={{ color:'#ffffff' }}>{action.key}</strong>{' '}{action.val}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* footer */}
                <div style={{ textAlign:'center', ...mono, fontSize:'11px', color:'#c5e7b0', opacity:0.6,
                    paddingTop:'20px', marginTop:'24px', borderTop:'1px solid rgba(55,115,40,0.5)' }}>
                    {t('footerText')} &nbsp;·&nbsp; {t('latency')}: {procTime}ms
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════
       DEVELOPER MODE
    ════════════════════════════════════════════════ */
    return (
        <div style={{ paddingTop:'30px', animation:'fadeInUp 0.6s ease forwards' }}>
            {topBar}

            {/* ── Row 1: 4 CSS Filtered Scans ── */}
            <div style={{ ...card, marginBottom:'22px' }}>
                <div style={{ ...mono, fontSize:'11px', color:'#c5e7b0', letterSpacing:'0.12em', marginBottom:'14px' }}>
                    📷 {t('spatialMatrix')}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', perspective:'1200px' }}>
                    {[
                        { filter: 'hue-rotate(120deg) saturate(3) brightness(0.8)', label: t('hsvFilter'),         color:'#377328' },
                        { filter: 'sepia(1) saturate(5) hue-rotate(-30deg)',        label: t('thermalDensity'),    color:'#e2ff80' },
                        { filter: 'grayscale(1) contrast(4) brightness(0.65)',      label: t('edgeTopology'),      color:'#c5e7b0' },
                        { filter: 'hue-rotate(200deg) saturate(4) invert(0.15)',    label: t('structuralLattice'), color:'#ffffff' },
                    ].map((img, i) => (
                        <div key={i} className="drone-card" style={{ borderRadius:'8px', overflow:'hidden', border:`1px solid ${img.color}55` }}>
                            {imgSrc
                                ? <img src={imgSrc} alt={img.label} style={{ width:'100%', display:'block', filter: img.filter }} />
                                : <div style={{ height:'120px', background:'rgba(55,115,40,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#c5e7b0', fontSize:'11px' }}>N/A</div>
                            }
                            <div style={{ textAlign:'center', fontSize:'9px', color:img.color, padding:'5px', background:'rgba(12,24,14,0.9)', ...mono, letterSpacing:'0.08em' }}>
                                {img.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Row 2: 3 charts ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1fr', gap:'20px', marginBottom:'22px' }}>

                {/* Risk Volatility */}
                <div style={card}>
                    <div style={{ ...mono, fontSize:'11px', color:'#e2ff80', marginBottom:'10px' }}>
                        {t('volatilityTrend')}
                    </div>
                    <div style={{ height:'200px' }}>
                        <ResponsiveContainer>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#e2ff80" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#e2ff80" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="x" hide />
                                <YAxis domain={[0,105]} hide />
                                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={v => [`${v.toFixed(1)}%`, t('criticalRisk')]} />
                                <Area type="monotone" dataKey="risk" stroke="#e2ff80" strokeWidth={2} fill="url(#rg)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sector Health OHLC */}
                <div style={card}>
                    <div style={{ ...mono, fontSize:'11px', color:'#c5e7b0', marginBottom:'10px' }}>
                        📈 SECTOR HEALTH — OHLC
                    </div>
                    <div style={{ height:'200px' }}>
                        <ResponsiveContainer>
                            <ComposedChart data={ohlcData}>
                                <XAxis dataKey="x" hide />
                                <YAxis domain={[0, 110]} hide />
                                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                                    formatter={(v, name) => [`${v}%`, name.toUpperCase()]} />
                                {/* High-Low whisker */}
                                <Bar dataKey="high" fill="transparent" stroke="none" isAnimationActive={false}>
                                    {ohlcData.map((d, i) => (
                                        <Cell key={i} fill="transparent" />
                                    ))}
                                </Bar>
                                {/* Body bars using close vs open */}
                                <Bar dataKey="close" isAnimationActive={false} maxBarSize={10} shape={<OHLCBar />} />
                                <Line type="monotone" dataKey="close" stroke="rgba(226,255,128,0.5)" strokeWidth={1} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Structural Integrity Donut */}
                <div style={card}>
                    <div style={{ ...mono, fontSize:'11px', color:'#c5e7b0', marginBottom:'10px' }}>
                        🥧 STRUCTURAL INTEGRITY
                    </div>
                    <div style={{ height:'200px' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" paddingAngle={3}>
                                    <Cell fill="#377328" />
                                    <Cell fill="#e2ff80" />
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={v => [`${v}%`]} />
                                <Legend wrapperStyle={{ fontSize:'11px', color:'#c5e7b0' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Row 3: metrics + stem tilt chart ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.6fr', gap:'20px', marginBottom:'22px' }}>

                {/* Edge Density */}
                <div style={{ ...card, display:'flex', flexDirection:'column', gap:'8px' }}>
                    <div style={{ ...mono, fontSize:'10px', color:'#c5e7b0', opacity:0.8, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                        {t('edgeDensityLabel')}
                    </div>
                    <div style={{ fontSize:'3.2rem', fontWeight:800, color:'#ffffff', fontFamily:"'Outfit',sans-serif" }}>
                        {edgePct}%
                    </div>
                    <div style={{ height:'6px', background:'#0c180e', borderRadius:'3px', overflow:'hidden' }}>
                        <div style={{ width:`${Math.min(100,edgePct)}%`, height:'100%', background:'linear-gradient(90deg,#377328,#c5e7b0)', borderRadius:'3px' }} />
                    </div>
                </div>

                {/* Inclination Vulnerability */}
                <div style={{ ...card, display:'flex', flexDirection:'column', gap:'8px' }}>
                    <div style={{ ...mono, fontSize:'10px', color:'#c5e7b0', opacity:0.8, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                        {t('structAngle')} / {t('criticalRisk')}
                    </div>
                    <div style={{ fontSize:'3.2rem', fontWeight:800, color: inclVuln > 30 ? '#e2ff80' : '#ffffff', fontFamily:"'Outfit',sans-serif" }}>
                        {inclVuln}°
                    </div>
                    <div style={{ height:'6px', background:'#0c180e', borderRadius:'3px', overflow:'hidden' }}>
                        <div style={{ width:`${Math.min(100,inclVuln)}%`, height:'100%', background:'linear-gradient(90deg,#377328,#e2ff80)', borderRadius:'3px' }} />
                    </div>
                </div>

                {/* Stem Tilt Bar Chart */}
                <div style={card}>
                    <div style={{ ...mono, fontSize:'11px', color:'#e2ff80', marginBottom:'10px' }}>
                        {t('stemVectors')} — {t('tiltDegree')}
                    </div>
                    <div style={{ height:'120px' }}>
                        {stemDetails.length > 0 ? (
                            <ResponsiveContainer>
                                <BarChart data={stemDetails}>
                                    <XAxis dataKey="label" stroke="#c5e7b0" tick={{ fontSize:9 }} />
                                    <YAxis stroke="#c5e7b0" tick={{ fontSize:9 }} />
                                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                                    <Bar dataKey="tilt" name={t('tiltDegree')} maxBarSize={20}>
                                        {stemDetails.map((e, i) => (
                                            <Cell key={i} fill={e.tilt > 25 ? '#e2ff80' : '#377328'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#c5e7b0', opacity:0.6, fontSize:'13px' }}>
                                No stem detections from Roboflow
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Row 4: Core Stack + Report Button ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'20px', marginBottom:'30px', alignItems:'start' }}>
                <div style={card}>
                    <div style={{ ...mono, fontSize:'11px', color:'#c5e7b0', letterSpacing:'0.12em', marginBottom:'14px' }}>
                        ⚙️ {t('coreStackTitle')}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
                        {coreStack.map((item, i) => (
                            <div key={i} style={{
                                background:'rgba(55,115,40,0.2)', border:'1px solid rgba(55,115,40,0.6)',
                                borderRadius:'6px', padding:'6px 14px',
                                ...mono, fontSize:'11px', color:'#c5e7b0'
                            }}>
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => alert('Generating Strategic Compliance Report...\n\nIn a full deployment, this would export a PDF with all metrics, charts, and AI recommendations.')}
                    style={{
                        background:'linear-gradient(135deg,rgba(55,115,40,0.3),rgba(226,255,128,0.2))',
                        border:'1px solid rgba(226,255,128,0.5)', color:'#e2ff80',
                        ...mono, fontWeight:700, letterSpacing:'0.08em', fontSize:'12px',
                        padding:'16px 28px', borderRadius:'8px', cursor:'pointer',
                        textTransform:'uppercase', transition:'all 0.3s', whiteSpace:'nowrap',
                        boxShadow:'0 0 0 rgba(226,255,128,0)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(226,255,128,0.25)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(226,255,128,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(55,115,40,0.3),rgba(226,255,128,0.2))'; e.currentTarget.style.boxShadow = '0 0 0 rgba(226,255,128,0)'; e.currentTarget.style.transform = ''; }}
                >
                    📄 {t('genReport')}
                </button>
            </div>

            {/* footer */}
            <div style={{ textAlign:'center', ...mono, fontSize:'11px', color:'#c5e7b0', opacity:0.6,
                paddingTop:'16px', borderTop:'1px solid rgba(55,115,40,0.5)' }}>
                {t('footerText')} &nbsp;·&nbsp; {t('latency')}: {procTime}ms &nbsp;·&nbsp; {t('modules')}
            </div>
        </div>
    );
}

export default Results;