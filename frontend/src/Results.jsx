import React, { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { generateFarmerReport, generateDeveloperReport } from './generateReport';
import {
    AreaChart, Area, ComposedChart, Bar, Line,
    BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend
} from 'recharts';

/* ══════════════════════════════════════════════════════
   STYLE TOKENS
══════════════════════════════════════════════════════ */
const C = {
    bg: '#0d1a0f',
    panel: '#111d13',
    border: 'rgba(55,115,40,0.45)',
    lime: '#e2ff80',
    green: '#377328',
    greenLt: '#c5e7b0',
    teal: '#60c8d0',
    purple: '#b090e0',
    orange: '#e0a050',
    red: '#e05252',
    muted: '#7a9a7a',
    white: '#f0f4ec',
};

const mono = { fontFamily: "'DM Mono','JetBrains Mono',monospace" };
const outfit = { fontFamily: "'Outfit','DM Sans',sans-serif" };
const card = (extra = {}) => ({
    background: C.panel, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: '20px 22px', ...extra,
});
const tt = {
    contentStyle: { background: '#0c180e', border: `1px solid ${C.green}`, color: C.white, fontSize: 12, borderRadius: 6 },
    labelStyle: { color: C.greenLt, marginBottom: 3 },
    itemStyle: { color: C.lime },
};

/* ── sub-components ── */
const SectionTitle = ({ icon, label, color = C.lime }) => (
    <div style={{
        ...mono, fontSize: 10, color, letterSpacing: '0.14em', textTransform: 'uppercase',
        paddingBottom: 10, marginBottom: 14, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 7
    }}>
        {icon && <span>{icon}</span>}{label}
    </div>
);

const KVRow = ({ label, value, valueColor = C.white, useMono = false, last = false }) => (
    <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '9px 0', borderBottom: last ? 'none' : `1px solid rgba(55,115,40,0.12)`, fontSize: 13
    }}>
        <span style={{ color: C.muted, fontWeight: 500 }}>{label}</span>
        <span style={{ color: valueColor, fontWeight: 600, ...(useMono ? mono : {}) }}>{value}</span>
    </div>
);

const FormulaCard = ({ title, formula, substituted, result, resultColor = C.lime, note }) => (
    <div style={{
        background: '#0a1410', border: `1px solid rgba(96,200,208,0.3)`,
        borderRadius: 10, padding: '16px 18px', marginBottom: 12
    }}>
        <div style={{ ...mono, fontSize: 10, color: C.teal, letterSpacing: '0.1em', marginBottom: 10 }}>{title}</div>
        <div style={{
            ...mono, fontSize: 12, color: C.greenLt, background: 'rgba(55,115,40,0.1)',
            padding: '6px 10px', borderRadius: 5, borderLeft: `3px solid ${C.green}`, marginBottom: 6
        }}>{formula}</div>
        <div style={{ ...mono, fontSize: 12, color: C.muted, padding: '4px 10px', marginBottom: 6 }}>→ {substituted}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...mono, fontSize: 13, color: resultColor, fontWeight: 700 }}>= {result}</div>
            {note && <div style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>{note}</div>}
        </div>
    </div>
);

const PipelineStep = ({ icon, label, detail }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 64 }}>
        <div style={{
            width: 40, height: 40, borderRadius: '50%', background: C.lime,
            border: `2px solid ${C.lime}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: C.bg, boxShadow: `0 0 12px ${C.lime}55`
        }}>{icon}</div>
        <div style={{ ...mono, fontSize: 9, color: C.lime, letterSpacing: '0.08em', marginTop: 6, textAlign: 'center' }}>{label}</div>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 2, textAlign: 'center', maxWidth: 68, lineHeight: 1.4 }}>{detail}</div>
    </div>
);

const OHLCBar = ({ x, width, open, close, high, low, yScale }) => {
    if (open == null || !yScale) return null;
    const color = close >= open ? C.green : C.lime;
    const cx = x + width / 2;
    return (
        <g>
            <line x1={cx} y1={yScale(high)} x2={cx} y2={yScale(low)} stroke={color} strokeWidth={1.5} />
            <rect x={x + 1} y={Math.min(yScale(open), yScale(close))}
                width={Math.max(1, width - 2)} height={Math.max(1, Math.abs(yScale(open) - yScale(close)))}
                fill={color} rx={1} />
        </g>
    );
};

const ClassBadge = ({ label }) => (
    <span style={{
        ...mono, fontSize: 10, padding: '2px 8px', borderRadius: 4,
        background: label === 'Lodged' ? 'rgba(224,82,82,0.15)' : 'rgba(55,115,40,0.2)',
        color: label === 'Lodged' ? C.red : C.greenLt,
        border: `1px solid ${label === 'Lodged' ? 'rgba(224,82,82,0.4)' : 'rgba(55,115,40,0.4)'}`
    }}>
        {label}
    </span>
);

/* ── Report download button ── */
const ReportButton = ({ label, onClick, loading, color = C.lime }) => (
    <button
        onClick={onClick}
        disabled={loading}
        style={{
            width: '100%', background: loading ? 'rgba(226,255,128,0.1)' : 'transparent',
            border: `2px solid ${color}`, color: loading ? C.muted : color,
            padding: '16px 20px', borderRadius: 8,
            ...mono, fontWeight: 700, letterSpacing: '0.08em', fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase', transition: 'all 0.22s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = color; e.currentTarget.style.color = C.bg; } }}
        onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color; } }}
    >
        {loading
            ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> GENERATING PDF...</>
            : label
        }
    </button>
);

/* ══════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════ */
function Results({ data }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState('farmer');
    const [activeTab, setActiveTab] = useState('formulas');
    const [reportLoading, setReportLoading] = useState(false);

    // ── derive safe defaults so hooks always run (no conditional hook calls) ──
    const res = (data || {}).result || {};
    const veg = (data || {}).vegetation || {};
    const edges = (data || {}).edges || {};
    const stems = (data || {}).stems || {};
    const fm = (data || {}).farmer_metrics || {};
    const dm = (data || {}).developer_metrics || {};
    const imgs = (data || {}).processed_images || {};

    const imgSrc = (data || {}).processed_image_base64 || '';
    const riskScore = res.risk_score ?? fm.lodging_percentage ?? 0;
    const avgAngle = res.avg_angle ?? dm.inclination_vulnerability ?? 0;
    const confidence = (data || {}).confidence ?? 75;
    const procTime = (data || {}).process_time_ms ?? '—';
    const coverage = veg.coverage_pct ?? 0;
    const edgePct = edges.edge_density_pct ?? dm.edge_density ?? 0;
    const inclVuln = dm.inclination_vulnerability ?? 0;
    const lineCount = stems.line_count ?? 0;
    const vertPct = stems.vertical_pct ?? 0;
    const severity = fm.severity ?? '';
    const ohlcData = dm.ohlc ?? [];
    const coreStack = dm.core_stack ?? [];
    const stemDetails = dm.stem_details ?? [];
    const lodgingPct = fm.lodging_percentage ?? 0;
    const yieldLoss = fm.yield_loss_estimate ?? 0;
    const totalStems = fm.total_stems ?? 0;
    const lodgedCount = Math.round(totalStems * lodgingPct / 100);
    const angleDeviation = parseFloat(Math.max(0, 90 - avgAngle).toFixed(1));

    const bannerColor = (() => {
        const lvl = fm.alert_level ?? '';
        if (lvl === 'Red' || riskScore > 65) return C.red;
        if (lvl === 'Yellow' || riskScore > 35) return C.lime;
        return '#52c07a';
    })();

    const getSeverityLabel = () => {
        if (severity.includes('Optimal')) return t('severityOptimal');
        if (severity.includes('Moderate')) return t('severityModerate');
        return t('severitySevere');
    };

    const getActionPlan = () => {
        if (riskScore > 65) return [
            { num: '01', key: t('emergencySupport'), val: t('emergencyText') },
            { num: '02', key: t('nutritionIntervention'), val: t('nutritionText') },
            { num: '03', key: t('waterMgmt'), val: t('waterText') },
        ];
        if (riskScore > 35) return [
            { num: '01', key: t('growthReg'), val: t('growthText') },
            { num: '02', key: t('potassiumBoost'), val: t('potassiumText') },
            { num: '03', key: t('observationPhase'), val: t('observationText') },
        ];
        return [
            { num: '01', key: t('optimalHealth'), val: t('optimalText') },
            { num: '02', key: t('standardNutrition'), val: t('nutritionContinue') },
            { num: '03', key: t('preventive'), val: t('preventiveText') },
        ];
    };

    const trendData = useMemo(() => {
        const arr = []; let v = riskScore;
        for (let i = 0; i < 30; i++) {
            const s = Math.sin(i * riskScore + i) * 10000;
            arr.unshift({ x: i + 1, risk: Math.max(0, Math.min(100, v)) });
            v += ((s - Math.floor(s)) - 0.5) * 14;
        }
        return arr;
    }, [riskScore]);

    const pieData = [
        { name: 'Healthy', value: Math.max(0, Math.round(100 - riskScore)) },
        { name: 'At Risk', value: Math.round(riskScore) },
    ];

    // Guard AFTER all hooks — safe to early-return here
    if (!data) return <Navigate to="/" />;

    /* ── TOP BAR ── */
    const topBar = (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 22, ...card(), padding: '14px 22px'
        }}>
            <button onClick={() => navigate('/')} style={{
                background: 'transparent', color: C.lime, border: `1px solid rgba(226,255,128,0.45)`,
                padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, ...mono, fontSize: 12
            }}>
                ← New Scan
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
                {[{ k: 'farmer', label: `🌾 ${t('farmerMode')}`, ac: '#52c07a' },
                { k: 'dev', label: `🔬 ${t('devMode')}`, ac: C.teal }].map(btn => (
                    <button key={btn.k} onClick={() => setViewMode(btn.k)} style={{
                        padding: '9px 22px', borderRadius: 6, cursor: 'pointer',
                        fontWeight: 700, fontSize: 13, ...outfit, transition: 'all 0.22s',
                        background: viewMode === btn.k ? btn.ac : 'rgba(55,115,40,0.3)',
                        color: viewMode === btn.k ? C.bg : C.greenLt,
                        border: viewMode === btn.k ? 'none' : `1px solid ${C.border}`,
                        boxShadow: viewMode === btn.k ? `0 0 16px ${btn.ac}55` : 'none',
                    }}>{btn.label}</button>
                ))}
            </div>
            <div style={{ ...mono, fontSize: 11, color: C.greenLt, opacity: 0.8 }}>
                Confidence: <span style={{ color: C.lime }}>{confidence}%</span>
                &nbsp;|&nbsp;Latency: <span style={{ color: C.lime }}>{procTime}ms</span>
            </div>
        </div>
    );

    /* ══════════════════════════════════════════════════════
       FARMER MODE
    ══════════════════════════════════════════════════════ */
    if (viewMode === 'farmer') {
        return (
            <div style={{ paddingTop: 28 }}>
                {topBar}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 22, alignItems: 'start' }}>
                    <div style={card()}>
                        <SectionTitle icon="📡" label={t('opticsLock')} />
                        <img src={imgSrc} alt="field" style={{
                            width: '100%', display: 'block',
                            borderRadius: 8, border: `1px solid ${C.border}`
                        }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                            background: '#111d13', borderLeft: `6px solid ${bannerColor}`, borderRadius: 10,
                            padding: '22px 24px', boxShadow: `0 0 20px ${bannerColor}22`,
                            border: `1px solid ${bannerColor}33`
                        }}>
                            <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: '0.1em', marginBottom: 8 }}>ALERT LEVEL</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: bannerColor, ...outfit, lineHeight: 1.2 }}>{getSeverityLabel()}</div>
                            <div style={{ ...mono, fontSize: 11, color: C.muted, marginTop: 8 }}>{totalStems} stems detected · {lodgedCount} lodged</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {[{ label: t('lodging'), value: `${lodgingPct}%`, color: bannerColor },
                            { label: t('yieldLoss'), value: `${yieldLoss}%`, color: C.lime }].map((s, i) => (
                                <div key={i} style={{ ...card({ padding: 20 }), textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: s.color, ...outfit }}>{s.value}</div>
                                    <div style={{ ...mono, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            background: 'linear-gradient(145deg,#111d13,#0f1c18)',
                            border: `1px solid rgba(226,255,128,0.28)`, borderRadius: 12, padding: 22, position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                background: `linear-gradient(90deg,${C.green},${C.lime})`
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <span style={{ fontSize: 18 }}>🤖</span>
                                <span style={{ ...outfit, fontWeight: 700, color: C.white, fontSize: '1rem' }}>{t('aiPlan')}</span>
                            </div>
                            {getActionPlan().map((a, i) => (
                                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                    <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.lime, flexShrink: 0 }}>{a.num}.</div>
                                    <div style={{ fontSize: 13, color: C.greenLt, lineHeight: 1.7 }}>
                                        <strong style={{ color: C.white }}>{a.key}</strong> {a.val}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{
                    textAlign: 'center', ...mono, fontSize: 11, color: C.muted,
                    paddingTop: 20, marginTop: 24, borderTop: `1px solid ${C.border}`
                }}>
                    {t('footerText')} · Latency: {procTime}ms
                </div>

                {/* ── FARMER REPORT BUTTON ── */}
                <div style={{ marginTop: 20 }}>
                    <ReportButton
                        label="📄 DOWNLOAD FARMER FIELD REPORT  (.PDF)"
                        loading={reportLoading}
                        onClick={async () => {
                            setReportLoading(true);
                            try { await generateFarmerReport(data); }
                            catch (e) { console.error(e); alert('Report generation failed. Check console.'); }
                            finally { setReportLoading(false); }
                        }}
                        color={C.lime}
                    />
                </div>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════
       DEVELOPER MODE
    ══════════════════════════════════════════════════════ */
    const devTabs = [
        { k: 'formulas', label: '∑  Formula Engine', color: C.teal },
        { k: 'pipeline', label: '⚙  Pipeline', color: C.lime },
        { k: 'vision', label: '📷 Vision Layers', color: C.greenLt },
        { k: 'charts', label: '📈 Analytics', color: C.purple },
        { k: 'stems', label: '🌿 Stem Table', color: C.orange },
        { k: 'model', label: '🤖 Model Info', color: C.lime },
    ];

    return (
        <div style={{ paddingTop: 28 }}>
            {topBar}

            {/* ── Summary strip ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Risk Score', value: `${riskScore}%`, color: riskScore > 65 ? C.red : riskScore > 35 ? C.lime : '#52c07a' },
                    { label: 'Lodging %', value: `${lodgingPct}%`, color: C.lime },
                    { label: 'Edge Density', value: `${edgePct}%`, color: C.teal },
                    { label: 'Veg Coverage', value: `${coverage}%`, color: '#52c07a' },
                    { label: 'Avg Angle', value: `${avgAngle}°`, color: C.orange },
                    { label: 'Confidence', value: `${confidence}%`, color: C.greenLt },
                ].map((m, i) => (
                    <div key={i} style={{ ...card({ padding: '14px 16px' }), textAlign: 'center' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: m.color, ...outfit, lineHeight: 1 }}>{m.value}</div>
                        <div style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: '0.08em', marginTop: 5, textTransform: 'uppercase' }}>{m.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Sub-tab bar ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {devTabs.map(tab => (
                    <button key={tab.k} onClick={() => setActiveTab(tab.k)} style={{
                        padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
                        ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', transition: 'all 0.2s',
                        background: activeTab === tab.k ? tab.color : 'rgba(55,115,40,0.15)',
                        color: activeTab === tab.k ? C.bg : C.muted,
                        border: activeTab === tab.k ? 'none' : `1px solid ${C.border}`,
                        boxShadow: activeTab === tab.k ? `0 0 12px ${tab.color}55` : 'none',
                    }}>{tab.label}</button>
                ))}
            </div>

            {/* ══════════════ TAB: FORMULA ENGINE ══════════════ */}
            {activeTab === 'formulas' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                        <div style={card({ background: '#0a1610', border: `1px solid rgba(96,200,208,0.35)` })}>
                            <SectionTitle icon="∑" label="Core Calculation Formulas" color={C.teal} />

                            <FormulaCard
                                title="01 — LODGING PERCENTAGE"
                                formula="Lodging % = (Lodged Stems / Total Stems) × 100"
                                substituted={`(${lodgedCount} / ${totalStems}) × 100`}
                                result={`${lodgingPct}%`}
                                resultColor={riskScore > 65 ? C.red : C.lime}
                                note="Threshold: >25° tilt → Lodged"
                            />
                            <FormulaCard
                                title="02 — YIELD LOSS ESTIMATE"
                                formula="Yield Loss = Lodging % × 0.6"
                                substituted={`${lodgingPct} × 0.6`}
                                result={`${yieldLoss}%`}
                                resultColor={C.orange}
                                note="0.6 = empirical agronomic coefficient"
                            />
                            <FormulaCard
                                title="03 — ANGLE DEVIATION"
                                formula="Angle Deviation = max(0, 90° − Avg Hough Angle)"
                                substituted={`max(0, 90 − ${avgAngle})`}
                                result={`${angleDeviation}°`}
                                resultColor={C.teal}
                                note="0° = perfectly vertical stem"
                            />
                            <FormulaCard
                                title="04 — COMPOSITE RISK SCORE"
                                formula="Risk Score = min(100, Lodging%×0.6 + AngleDev×0.4)"
                                substituted={`min(100, ${lodgingPct}×0.6 + ${angleDeviation}×0.4)`}
                                result={`${riskScore}`}
                                resultColor={riskScore > 65 ? C.red : riskScore > 35 ? C.lime : '#52c07a'}
                                note="Weighted blend: structural + angular risk"
                            />
                            <FormulaCard
                                title="05 — DETECTION CONFIDENCE"
                                formula="Confidence = clamp(50 + (Stems×3) − (EdgeDensity×0.5), 40, 99)"
                                substituted={`clamp(50 + (${totalStems}×3) − (${edgePct}×0.5), 40, 99)`}
                                result={`${confidence}%`}
                                resultColor={C.greenLt}
                                note="More stems = higher signal clarity"
                            />
                            <FormulaCard
                                title="06 — INCLINATION VULNERABILITY"
                                formula="Incl. Vuln = Σ(tilt of lodged stems) / Count(lodged stems)"
                                substituted={`avg tilt across ${lodgedCount} lodged stem(s)`}
                                result={`${inclVuln}°`}
                                resultColor={C.orange}
                                note="Mean lean angle of lodged crops"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Per-stem tilt algorithm */}
                        <div style={card({ background: '#0f1020', border: `1px solid rgba(176,144,224,0.3)` })}>
                            <SectionTitle icon="📐" label="Per-Stem Tilt Calculation — Hough + arctan2" color={C.purple} />
                            <div style={{ ...mono, fontSize: 11, color: C.muted, lineHeight: 1.9 }}>
                                {[
                                    { step: 'Step 1 — Crop ROI from Roboflow bbox', code: ['stem_crop = image[y1:y2, x1:x2]', 'gray = cv2.cvtColor(crop, BGR2GRAY)', 'gray = GaussianBlur(gray, (5,5), σ=0)'] },
                                    { step: 'Step 2 — Edge detection + Hough lines', code: ['edges = Canny(gray, low=40, high=120)', 'lines = HoughLinesP(ρ=1, θ=π/180,', '  threshold=20, minLen=20, gap=5)'] },
                                    { step: 'Step 3 — Select dominant line (max length)', code: ['length = √((x₂−x₁)² + (y₂−y₁)²)', 'best_line = argmax(length)'] },
                                    { step: 'Step 4 — Compute tilt from vertical', code: ['angle = arctan2(y₂−y₁, x₂−x₁)', 'tilt  = |90 − |angle||', 'if tilt > 25° → "Lodged" 🔴 else "Healthy" 🟢'] },
                                ].map(({ step, code }) => (
                                    <div key={step} style={{ marginBottom: 12 }}>
                                        <div style={{ color: C.greenLt, marginBottom: 6, fontSize: 11 }}>{step}</div>
                                        <div style={{
                                            background: 'rgba(176,144,224,0.08)', borderLeft: `3px solid ${C.purple}`,
                                            padding: '8px 12px', borderRadius: 4
                                        }}>
                                            {code.map((l, i) => <div key={i}>{l}</div>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Severity thresholds */}
                        <div style={card({ background: '#140f1a', border: `1px solid rgba(224,160,80,0.3)` })}>
                            <SectionTitle icon="🎯" label="Severity Classification Thresholds" color={C.orange} />
                            {[
                                { range: 'Lodging < 20%', label: 'Optimal Health', color: '#52c07a', alert: 'Green' },
                                { range: '20% ≤ Lodging < 50%', label: 'Moderate Damage', color: C.lime, alert: 'Yellow' },
                                { range: 'Lodging ≥ 50%', label: 'Severe Vulnerability', color: C.red, alert: 'Red' },
                            ].map((row, i, arr) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid rgba(224,160,80,0.12)` : 'none'
                                }}>
                                    <div>
                                        <div style={{ ...mono, fontSize: 11, color: row.color }}>{row.range}</div>
                                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{row.label}</div>
                                    </div>
                                    <span style={{
                                        ...mono, fontSize: 10, padding: '3px 10px', borderRadius: 4,
                                        background: `${row.color}22`, border: `1px solid ${row.color}66`, color: row.color
                                    }}>
                                        {row.alert}
                                    </span>
                                </div>
                            ))}
                            <div style={{
                                marginTop: 14, background: `${bannerColor}15`, border: `1px solid ${bannerColor}44`,
                                borderRadius: 8, padding: '10px 14px', ...mono, fontSize: 11
                            }}>
                                Current: <span style={{ color: bannerColor, fontWeight: 700 }}>{lodgingPct}% → {getSeverityLabel()}</span>
                            </div>
                        </div>

                        {/* HSV params */}
                        <div style={card({ background: '#0a1a10', border: `1px solid rgba(82,192,122,0.3)` })}>
                            <SectionTitle icon="🌿" label="HSV Vegetation Mask Parameters" color='#52c07a' />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                                {[['H Range', '30 – 90', 'Yellow-Green hues'],
                                ['S Range', '40 – 255', 'Exclude grey/white'],
                                ['V Range', '40 – 255', 'Exclude dark noise']].map(([lbl, val, note]) => (
                                    <div key={lbl} style={{ background: 'rgba(82,192,122,0.08)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                                        <div style={{ ...mono, fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</div>
                                        <div style={{ ...mono, fontSize: 14, color: '#52c07a', fontWeight: 700, margin: '5px 0' }}>{val}</div>
                                        <div style={{ fontSize: 10, color: C.muted }}>{note}</div>
                                    </div>
                                ))}
                            </div>
                            <KVRow label="Vegetation Coverage (live)" value={`${coverage}%`} valueColor='#52c07a' useMono last />
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ TAB: PIPELINE ══════════════ */}
            {activeTab === 'pipeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={card()}>
                        <SectionTitle icon="⚙" label="Processing Pipeline — End to End" color={C.lime} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '20px 0', overflowX: 'auto', gap: 0 }}>
                            {[
                                { icon: '📤', label: 'UPLOAD', detail: 'JPEG/PNG bytes' },
                                { icon: '🔄', label: 'DECODE', detail: 'cv2.imdecode' },
                                { icon: '📐', label: 'RESIZE', detail: 'max 800px wide' },
                                { icon: '🌿', label: 'VEG MASK', detail: 'HSV [30–90,40,40]' },
                                { icon: '🌡', label: 'THERMAL', detail: 'COLORMAP_INFERNO' },
                                { icon: '🔲', label: 'CANNY EDGES', detail: 'low=40 high=120' },
                                { icon: '📏', label: 'HOUGH LINES', detail: 'HoughLinesP' },
                                { icon: '🤖', label: 'ROBOFLOW', detail: 'YOLOv8 v4' },
                                { icon: '📐', label: 'TILT CALC', detail: 'arctan2 + |90−θ|' },
                                { icon: '📊', label: 'STATISTICS', detail: 'risk/yield/conf' },
                                { icon: '🗺', label: 'GRID OVERLAY', detail: '4×4 A1–D4' },
                                { icon: '✅', label: 'JSON OUT', detail: 'FastAPI response' },
                            ].map((step, i, arr) => (
                                <React.Fragment key={i}>
                                    <PipelineStep {...step} />
                                    {i < arr.length - 1 && (
                                        <div style={{
                                            width: 20, height: 2, background: `linear-gradient(90deg,${C.green},${C.lime})`,
                                            flexShrink: 0, margin: '20px 2px 0', borderRadius: 2
                                        }} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div style={card()}>
                            <SectionTitle icon="⏱" label="Processing Metrics" color={C.lime} />
                            <KVRow label="Total Latency" value={`${procTime} ms`} valueColor={C.lime} useMono />
                            <KVRow label="Roboflow Model" value="stem-project-7z7kd" valueColor={C.teal} useMono />
                            <KVRow label="Model Version" value="v4" valueColor={C.teal} useMono />
                            <KVRow label="Detection Class" value='"Stem"' valueColor={C.greenLt} useMono />
                            <KVRow label="Canny Thresholds" value="40 / 120" valueColor={C.muted} useMono />
                            <KVRow label="Min Line Length" value="20 px" valueColor={C.muted} useMono last />
                        </div>
                        <div style={card()}>
                            <SectionTitle icon="📦" label="Input / Output Specs" color={C.lime} />
                            <KVRow label="Input Format" value="JPEG / PNG" valueColor={C.greenLt} useMono />
                            <KVRow label="Max Resize Width" value="800 px" valueColor={C.muted} useMono />
                            <KVRow label="JPEG Quality" value="88%" valueColor={C.muted} useMono />
                            <KVRow label="Hough ρ" value="1 px" valueColor={C.muted} useMono />
                            <KVRow label="Hough θ" value="π / 180 rad" valueColor={C.muted} useMono />
                            <KVRow label="Hough Threshold" value="30 votes" valueColor={C.muted} useMono last />
                        </div>
                        <div style={card()}>
                            <SectionTitle icon="🌱" label="CV Parameters" color={C.lime} />
                            <KVRow label="GaussBlur Kernel" value="(5×5)" valueColor={C.muted} useMono />
                            <KVRow label="GaussBlur Thermal" value="(21×21)" valueColor={C.muted} useMono />
                            <KVRow label="HSV Lower Bound" value="[30, 40, 40]" valueColor='#52c07a' useMono />
                            <KVRow label="HSV Upper Bound" value="[90, 255, 255]" valueColor='#52c07a' useMono />
                            <KVRow label="Lodging Threshold" value="> 25° tilt" valueColor={C.lime} useMono />
                            <KVRow label="Yield Coefficient" value="0.6" valueColor={C.orange} useMono last />
                        </div>
                    </div>

                    <div style={card()}>
                        <SectionTitle icon="🔩" label="Core Processing Stack" color={C.lime} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {[...coreStack, 'YOLOv8 Object Detection', 'NumPy Array Processing', 'Pillow Image I/O', 'Base64 Encoding'].map((item, i) => (
                                <div key={i} style={{
                                    background: i < coreStack.length ? 'rgba(55,115,40,0.15)' : 'rgba(96,200,208,0.1)',
                                    border: `1px solid ${i < coreStack.length ? C.border : 'rgba(96,200,208,0.3)'}`,
                                    borderRadius: 6, padding: '7px 16px',
                                    ...mono, fontSize: 12,
                                    color: i < coreStack.length ? C.greenLt : C.teal
                                }}>
                                    ✓ {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ TAB: VISION LAYERS ══════════════ */}
            {activeTab === 'vision' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={card()}>
                        <SectionTitle icon="📷" label="Real Processed Vision Layers — from Backend" color={C.greenLt} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                            {[
                                { src: imgs.mask, label: 'HSV Vegetation Mask', desc: 'inRange([30,40,40]→[90,255,255])', color: '#52c07a' },
                                { src: imgs.density, label: 'Thermal Density Map', desc: 'GaussBlur(21×21) → COLORMAP_INFERNO', color: C.orange },
                                { src: imgs.edges, label: 'Canny Edge Topology', desc: 'Canny(40,120) → cyan on black', color: C.teal },
                                { src: imgs.stem, label: 'Hough Structural Mesh', desc: 'HoughLinesP(thr=40,minLen=30)', color: C.purple },
                                { src: imgs.tactical, label: 'Tactical Grid A1–D4', desc: '4×4 sector grid coordinate overlay', color: C.lime },
                                { src: imgSrc, label: 'Annotated Output', desc: 'Bboxes + per-stem tilt° annotation', color: C.greenLt },
                            ].map(({ src, label, desc, color }) => (
                                <div key={label} style={{ background: '#0a1210', border: `1px solid ${color}44`, borderRadius: 10, overflow: 'hidden' }}>
                                    {src
                                        ? <img src={src} alt={label} style={{ width: '100%', display: 'block' }} />
                                        : <div style={{
                                            height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'rgba(55,115,40,0.1)', color: C.muted, fontSize: 11, ...mono
                                        }}>No data</div>
                                    }
                                    <div style={{ padding: '10px 12px' }}>
                                        <div style={{ ...mono, fontSize: 10, color, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                                        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={card()}>
                            <SectionTitle icon="📏" label="Edge Detection Stats" color={C.teal} />
                            <KVRow label="Edge Density" value={`${edgePct}%`} valueColor={C.teal} useMono />
                            <KVRow label="Canny Low/High" value="40 / 120" valueColor={C.muted} useMono />
                            <KVRow label="Hough Line Count" value={`${lineCount}`} valueColor={C.lime} useMono />
                            <KVRow label="Vertical Lines %" value={`${vertPct}%`} valueColor='#52c07a' useMono last />
                        </div>
                        <div style={card()}>
                            <SectionTitle icon="🌱" label="Vegetation Analysis" color='#52c07a' />
                            <KVRow label="Coverage %" value={`${coverage}%`} valueColor='#52c07a' useMono />
                            <KVRow label="Avg Stem Angle" value={`${avgAngle}°`} valueColor={C.lime} useMono />
                            <KVRow label="Incl. Vulnerability" value={`${inclVuln}°`} valueColor={C.orange} useMono last />
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ TAB: ANALYTICS ══════════════ */}
            {activeTab === 'charts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 18 }}>
                        <div style={card({ background: '#0f1420', border: `1px solid rgba(226,255,128,0.25)` })}>
                            <SectionTitle icon="📉" label="Risk Volatility Trend" color={C.lime} />
                            <div style={{ ...mono, fontSize: 10, color: C.muted, marginBottom: 8 }}>30-pt trajectory seeded by risk={riskScore}</div>
                            <div style={{ height: 180 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={C.lime} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={C.lime} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="x" hide />
                                        <YAxis domain={[0, 105]} hide />
                                        <Tooltip {...tt} formatter={v => [`${v.toFixed(1)}%`, 'Risk']} />
                                        <Area type="monotone" dataKey="risk" stroke={C.lime} strokeWidth={2} fill="url(#rg)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={card({ background: '#0f1c18', border: `1px solid rgba(55,115,40,0.45)` })}>
                            <SectionTitle icon="📈" label="Sector Health — OHLC" color={C.greenLt} />
                            <div style={{ ...mono, fontSize: 10, color: C.muted, marginBottom: 8 }}>Green=bullish · Yellow=bearish · Seeded from risk_score</div>
                            <div style={{ height: 180 }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={ohlcData}>
                                        <XAxis dataKey="x" hide />
                                        <YAxis domain={[0, 110]} hide />
                                        <Tooltip {...tt} formatter={(v, n) => [`${v}%`, n.toUpperCase()]} />
                                        <Bar dataKey="close" isAnimationActive={false} maxBarSize={10} shape={<OHLCBar />} />
                                        <Line type="monotone" dataKey="close" stroke="rgba(226,255,128,0.4)" strokeWidth={1} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={card({ background: '#140f1a', border: `1px solid rgba(176,144,224,0.3)` })}>
                            <SectionTitle icon="🥧" label="Structural Integrity" color={C.purple} />
                            <div style={{ height: 180 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                                            <Cell fill={C.green} />
                                            <Cell fill={C.lime} />
                                        </Pie>
                                        <Tooltip {...tt} formatter={v => [`${v}%`]} />
                                        <Legend wrapperStyle={{ fontSize: 10, color: C.greenLt }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div style={card()}>
                        <SectionTitle icon="📊" label={`Stem Tilt Distribution — ${stemDetails.length} detections`} color={C.lime} />
                        {stemDetails.length > 0 ? (
                            <div style={{ height: 200 }}>
                                <ResponsiveContainer>
                                    <BarChart data={stemDetails.map((s, i) => ({ ...s, label: `S${i + 1}` }))}>
                                        <XAxis dataKey="label" stroke={C.border} tick={{ fill: C.muted, fontSize: 10 }} />
                                        <YAxis stroke={C.border} tick={{ fill: C.muted, fontSize: 10 }}
                                            label={{ value: 'Tilt °', angle: -90, position: 'insideLeft', fill: C.muted, fontSize: 10 }} />
                                        <Tooltip {...tt} formatter={v => [`${v}°`, 'Tilt']} />
                                        <Bar dataKey="tilt" maxBarSize={28} radius={[4, 4, 0, 0]}>
                                            {stemDetails.map((e, i) => <Cell key={i} fill={e.tilt > 25 ? C.red : '#52c07a'} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{
                                height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                ...mono, fontSize: 12, color: C.muted
                            }}>No Roboflow detections</div>
                        )}
                        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 11 }}>
                                <div style={{ width: 12, height: 12, background: '#52c07a', borderRadius: 2 }} />
                                <span style={{ color: C.muted }}>Healthy (tilt ≤ 25°)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 11 }}>
                                <div style={{ width: 12, height: 12, background: C.red, borderRadius: 2 }} />
                                <span style={{ color: C.muted }}>Lodged (tilt {'>'} 25°)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ TAB: STEM TABLE ══════════════ */}
            {activeTab === 'stems' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                        {[
                            { label: 'Total Detected', value: totalStems, color: C.lime },
                            { label: 'Lodged', value: lodgedCount, color: C.red },
                            { label: 'Healthy', value: totalStems - lodgedCount, color: '#52c07a' },
                            {
                                label: 'Avg Tilt', value: stemDetails.length > 0
                                    ? `${(stemDetails.reduce((a, s) => a + s.tilt, 0) / stemDetails.length).toFixed(1)}°`
                                    : '—', color: C.orange
                            },
                        ].map((m, i) => (
                            <div key={i} style={{ ...card({ padding: '16px 18px' }), textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, ...outfit, lineHeight: 1 }}>{m.value}</div>
                                <div style={{ ...mono, fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 5 }}>{m.label}</div>
                            </div>
                        ))}
                    </div>

                    <div style={card()}>
                        <SectionTitle icon="🌿" label={`Stem Detection Log — ${stemDetails.length} entries`} color={C.orange} />
                        {stemDetails.length > 0 ? (
                            <div style={{ overflowY: 'auto', maxHeight: 480 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(55,115,40,0.15)' }}>
                                            {['#', 'Classification', 'Tilt Angle', 'Health Score', 'Status'].map(h => (
                                                <th key={h} style={{
                                                    padding: '10px 14px', textAlign: 'left',
                                                    ...mono, fontSize: 10, color: C.lime, letterSpacing: '0.08em',
                                                    borderBottom: `1px solid ${C.border}`, fontWeight: 700
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stemDetails.map((s, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(55,115,40,0.04)' }}>
                                                <td style={{ padding: '10px 14px', ...mono, fontSize: 11, color: C.muted }}>S{String(i + 1).padStart(2, '0')}</td>
                                                <td style={{ padding: '10px 14px' }}><ClassBadge label={s.label} /></td>
                                                <td style={{
                                                    padding: '10px 14px', ...mono, fontSize: 12,
                                                    color: s.tilt > 25 ? C.red : '#52c07a', fontWeight: 600
                                                }}>{s.tilt}°</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 60, height: 5, background: '#0c180e', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: `${Math.min(100, s.health)}%`, height: '100%', borderRadius: 3,
                                                                background: s.health > 70 ? '#52c07a' : s.health > 40 ? C.lime : C.red
                                                            }} />
                                                        </div>
                                                        <span style={{ ...mono, fontSize: 11, color: C.muted }}>{s.health}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', fontSize: 14 }}>{s.label === 'Lodged' ? '🔴' : '🟢'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '40px 0', textAlign: 'center', ...mono, fontSize: 12, color: C.muted }}>
                                No stems detected — Roboflow returned 0 predictions for this image
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════ TAB: MODEL INFO ══════════════ */}
            {activeTab === 'model' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={card({ background: '#0f1420', border: `1px solid rgba(96,200,208,0.3)` })}>
                        <SectionTitle icon="🤖" label="Roboflow Model Details" color={C.teal} />
                        <KVRow label="Model ID" value="stem-project-7z7kd" valueColor={C.teal} useMono />
                        <KVRow label="Version" value="4" valueColor={C.lime} useMono />
                        <KVRow label="Architecture" value="YOLOv8" valueColor={C.greenLt} useMono />
                        <KVRow label="Detection Class" value='"Stem"' valueColor={C.lime} useMono />
                        <KVRow label="Inference URL" value="detect.roboflow.com" valueColor={C.muted} useMono />
                        <KVRow label="Request Format" value="base64 JPEG" valueColor={C.muted} useMono />
                        <KVRow label="Timeout" value="15s" valueColor={C.muted} useMono last />
                    </div>

                    <div style={card({ background: '#140f1a', border: `1px solid rgba(176,144,224,0.3)` })}>
                        <SectionTitle icon="⚡" label="FastAPI Backend" color={C.purple} />
                        <KVRow label="Framework" value="FastAPI" valueColor={C.purple} useMono />
                        <KVRow label="Endpoint" value="POST /analyze" valueColor={C.lime} useMono />
                        <KVRow label="Health Check" value="GET /" valueColor={C.greenLt} useMono />
                        <KVRow label="CORS" value="allow_origins=[*]" valueColor={C.orange} useMono />
                        <KVRow label="Input" value="multipart/form-data" valueColor={C.muted} useMono />
                        <KVRow label="Output" value="application/json" valueColor={C.muted} useMono />
                        <KVRow label="Process Time" value={`${procTime} ms`} valueColor={C.lime} useMono last />
                    </div>

                    <div style={card({ background: '#0a1a10', border: `1px solid rgba(82,192,122,0.3)` })}>
                        <SectionTitle icon="📦" label="Training Dataset" color='#52c07a' />
                        <KVRow label="Dataset" value="corn-stem-biye (Roboflow)" valueColor='#52c07a' useMono />
                        <KVRow label="Annotation Type" value="YOLO Bounding Box" valueColor={C.muted} useMono />
                        <KVRow label="Target Classes" value="Stem (upright + lodged)" valueColor={C.lime} useMono />
                        <KVRow label="Tiling Strategy" value="640×640 px patches" valueColor={C.muted} useMono />
                        <KVRow label="Lodging Threshold" value="> 25° tilt angle" valueColor={C.orange} useMono last />
                    </div>

                    <div style={card({ background: '#1a1014', border: `1px solid rgba(224,160,80,0.3)` })}>
                        <SectionTitle icon="🔩" label="Full Technology Stack" color={C.orange} />
                        {[['Python 3.x', 'Runtime'], ['OpenCV (cv2)', 'Computer Vision'], ['NumPy', 'Array ops'],
                        ['Roboflow API', 'YOLOv8 Inference'], ['FastAPI', 'REST API'], ['React + Vite', 'Frontend'],
                        ['Recharts', 'Data Viz'], ['Capacitor', 'Mobile Wrapper'], ['GCP / Local', 'Deployment']
                        ].map(([tech, role], i, arr) => (
                            <KVRow key={tech} label={role} value={tech} valueColor={C.orange} useMono last={i === arr.length - 1} />
                        ))}
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <ReportButton
                            label="📄 DOWNLOAD DEVELOPER ANALYTICS REPORT  (.PDF)"
                            loading={reportLoading}
                            onClick={async () => {
                                setReportLoading(true);
                                try { await generateDeveloperReport(data); }
                                catch (e) { console.error(e); alert('Report generation failed. Check console.'); }
                                finally { setReportLoading(false); }
                            }}
                            color={C.teal}
                        />
                    </div>
                </div>
            )}

            <div style={{
                textAlign: 'center', ...mono, fontSize: 11, color: C.muted,
                paddingTop: 20, marginTop: 24, borderTop: `1px solid ${C.border}`
            }}>
                {t('footerText')} · Latency: {procTime}ms · CropIQ Developer Console
            </div>

            {/* ── DEV REPORT BUTTON — always visible ── */}
            <div style={{ marginTop: 16 }}>
                <ReportButton
                    label="📄 DOWNLOAD DEVELOPER ANALYTICS REPORT  (.PDF)"
                    loading={reportLoading}
                    onClick={async () => {
                        setReportLoading(true);
                        try { await generateDeveloperReport(data); }
                        catch (e) { console.error(e); alert('Report generation failed. Check console.'); }
                        finally { setReportLoading(false); }
                    }}
                    color={C.teal}
                />
            </div>
        </div>
    );
}

export default Results;