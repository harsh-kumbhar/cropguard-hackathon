/**
 * CropGuardAI - PDF Report Generator v3
 *
 * FARMER:    White background, plain English, simple numbers, clear actions.
 *            A farmer who has never seen a PDF report can understand it.
 *
 * DEVELOPER: Dark theme, all technical metrics, formulas, images in a
 *            STRICT fixed grid (no overlaps, no broken layouts).
 */

/* ─── Load jsPDF from CDN ──────────────────────────────────────────────── */
let _jsPDF = null;
async function loadJsPDF() {
    if (_jsPDF) return _jsPDF;
    return new Promise((resolve, reject) => {
        if (window.jspdf) { _jsPDF = window.jspdf.jsPDF; return resolve(_jsPDF); }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = () => { _jsPDF = window.jspdf.jsPDF; resolve(_jsPDF); };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

/* ─── Colours ───────────────────────────────────────────────────────────── */
const FARMER_COLORS = {
    white: [255, 255, 255],
    offWhite: [248, 250, 246],
    pageGray: [242, 245, 240],
    darkGreen: [30, 90, 20],
    midGreen: [55, 140, 40],
    limeGreen: [100, 180, 50],
    orange: [210, 120, 20],
    red: [195, 50, 50],
    yellow: [200, 155, 0],
    black: [25, 30, 20],
    darkGray: [85, 95, 80],
    midGray: [150, 160, 145],
    lightGray: [210, 218, 205],
    panelBg: [230, 242, 222],
    redLight: [255, 240, 240],
    yelLight: [255, 252, 225],
    grnLight: [232, 252, 225],
};

const DEV_COLORS = {
    pageBg: [13, 26, 15],
    panel: [17, 29, 19],
    panel2: [22, 38, 24],
    border: [40, 80, 35],
    lime: [226, 255, 128],
    green: [55, 115, 40],
    greenLt: [197, 231, 176],
    teal: [96, 200, 208],
    purple: [176, 144, 224],
    orange: [224, 160, 80],
    red: [224, 82, 82],
    muted: [122, 154, 122],
    white: [240, 244, 236],
    ok: [82, 192, 122],
};

/* ─── Core PDF class ────────────────────────────────────────────────────── */
class PDF {
    constructor() {
        this.M = 15;    // margin
        this.W = 210;   // A4 width mm
        this.H = 297;   // A4 height mm
        this.y = 0;
        this.pg = 1;
        this.doc = null;
        this.bgColor = [255, 255, 255];
    }

    async init(bgColor) {
        const JsPDF = await loadJsPDF();
        this.bgColor = bgColor || [255, 255, 255];
        this.doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        this._bg();
        return this;
    }

    _bg() {
        this.doc.setFillColor(...this.bgColor);
        this.doc.rect(0, 0, this.W, this.H, 'F');
    }

    /* Start new page - fills background, resets y to margin */
    newPage() {
        this.doc.addPage();
        this.pg++;
        this._bg();
        this.y = this.M;
    }

    /* Auto page-break: if content of height h won't fit, start new page */
    guard(h) {
        if (this.y + h > this.H - this.M - 16) {
            this.newPage();
            return true;
        }
        return false;
    }

    /* ── Drawing primitives ── */
    font(sz, style, color) {
        this.doc.setFontSize(sz);
        this.doc.setFont('helvetica', style || 'normal');
        if (color) this.doc.setTextColor(...color);
    }

    text(str, x, y, opts) {
        this.doc.text(String(str ?? ''), x, y, opts || {});
    }

    fillRect(x, y, w, h, color) {
        this.doc.setFillColor(...color);
        this.doc.rect(x, y, w, h, 'F');
    }

    strokeRect(x, y, w, h, color, lw, r) {
        this.doc.setDrawColor(...color);
        this.doc.setLineWidth(lw || 0.4);
        if (r) this.doc.roundedRect(x, y, w, h, r, r, 'S');
        else this.doc.rect(x, y, w, h, 'S');
    }

    filledRoundRect(x, y, w, h, r, fillColor, strokeColor, lw) {
        this.doc.setFillColor(...fillColor);
        if (strokeColor) {
            this.doc.setDrawColor(...strokeColor);
            this.doc.setLineWidth(lw || 0.5);
            this.doc.roundedRect(x, y, w, h, r, r, 'FD');
        } else {
            this.doc.roundedRect(x, y, w, h, r, r, 'F');
        }
    }

    hLine(y, color, lw) {
        this.doc.setDrawColor(...(color || [200, 200, 200]));
        this.doc.setLineWidth(lw || 0.3);
        this.doc.line(this.M, y, this.W - this.M, y);
    }

    wrapLines(str, maxW) {
        return this.doc.splitTextToSize(String(str ?? ''), maxW);
    }

    /* Draw image from base64 src; draws placeholder if missing */
    image(src, x, y, w, h) {
        if (!src) {
            this.fillRect(x, y, w, h, [40, 60, 42]);
            return;
        }
        try {
            const d = src.includes(',') ? src.split(',')[1] : src;
            this.doc.addImage(d, 'JPEG', x, y, w, h, undefined, 'FAST');
        } catch (e) { // eslint-disable-line no-unused-vars
            this.fillRect(x, y, w, h, [40, 60, 42]);
        }
    }

    save(name) {
        this.doc.save(name);
    }

    get pageNum() { return this.doc.internal.getCurrentPageInfo().pageNumber; }
}

/* ══════════════════════════════════════════════════════════════════════════
   FARMER REPORT
   ─ White background, simple English, no jargon, clear actions
══════════════════════════════════════════════════════════════════════════ */
export async function generateFarmerReport(data) {
    const C = FARMER_COLORS;

    /* Pull values - every access is null-safe */
    const safe = data || {};
    const fm = safe.farmer_metrics || {};
    const dm = safe.developer_metrics || {};
    const lodging = Number(fm.lodging_percentage ?? 0);
    const yieldLoss = Number(fm.yield_loss_estimate ?? 0);
    const totalStems = Number(fm.total_stems ?? 0);
    const lodged = Math.round(totalStems * lodging / 100);
    const healthy = totalStems - lodged;
    const alertLevel = fm.alert_level || 'Green';
    const severity = fm.severity || 'Crop is Healthy';
    const confidence = Number(safe.confidence ?? 75);
    const imgSrc = safe.processed_image_base64 || '';
    const stemList = dm.stem_details || [];

    /* Colours based on severity */
    const statusColor =
        alertLevel === 'Red' ? C.red :
            alertLevel === 'Yellow' ? C.yellow : C.midGreen;
    const statusBg =
        alertLevel === 'Red' ? C.redLight :
            alertLevel === 'Yellow' ? C.yelLight : C.grnLight;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const fileName = `CropGuardAI_Field_Report_${now.toISOString().slice(0, 10)}.pdf`;

    /* ── Helpers scoped to this report ── */
    const p = await new PDF().init(C.white);

    /* Page header: green top bar */
    const pageHeader = () => {
        p.fillRect(0, 0, p.W, 14, C.darkGreen);
        p.font(9, 'bold', C.white);
        p.text('CropGuardAI  |  Field Health Report', p.M, 9);
        p.font(7, 'normal', [160, 220, 140]);
        p.text(`Page ${p.pageNum}`, p.W - p.M, 9, { align: 'right' });
        p.y = 20;
    };

    /* Page footer */
    const pageFooter = () => {
        p.hLine(p.H - 12, C.lightGray, 0.4);
        p.font(7, 'normal', C.midGray);
        p.text('CropGuardAI  |  Corn / Maize Lodging Detection  |  CESA x VIT Hackathon',
            p.W / 2, p.H - 7, { align: 'center' });
    };

    /* Section heading */
    const sectionHead = (label, color) => {
        p.guard(14);
        p.y += 4;
        p.font(11, 'bold', color || C.darkGreen);
        p.text(label, p.M, p.y);
        p.hLine(p.y + 2, color || C.limeGreen, 0.8);
        p.y += 9;
    };

    /* Simple two-column info row */
    const infoRow = (question, answer, ansColor, isEven) => {
        p.guard(13);
        p.fillRect(p.M, p.y - 3, p.W - p.M * 2, 12, isEven ? C.offWhite : C.white);
        p.font(9, 'normal', C.black);
        p.text(question, p.M + 3, p.y + 5);
        p.font(9, 'bold', ansColor || C.darkGreen);
        p.text(String(answer), p.W - p.M - 3, p.y + 5, { align: 'right' });
        p.hLine(p.y + 9, C.lightGray, 0.25);
        p.y += 12;
    };

    /* Action step card */
    const actionStep = (num, title, desc) => {
        const lines = p.wrapLines(desc, p.W - p.M * 2 - 13);
        const cardH = 8 + lines.length * 5.5 + 4;
        p.guard(cardH);

        /* Dot with number */
        p.doc.setFillColor(...C.midGreen);
        p.doc.circle(p.M + 4.5, p.y + 4, 4.5, 'F');
        p.font(8, 'bold', C.white);
        p.text(String(num), p.M + 4.5, p.y + 5.8, { align: 'center' });

        p.font(10, 'bold', C.black);
        p.text(title, p.M + 13, p.y + 5.5);
        p.y += 10;

        p.font(9, 'normal', C.darkGray);
        lines.forEach(l => {
            p.guard(6);
            p.text(l, p.M + 13, p.y);
            p.y += 5.5;
        });
        p.y += 6;
    };

    /* ════ PAGE 1: STATUS + IMAGE ═════════════════════════════════════════ */
    /* Cover-style top bar */
    p.fillRect(0, 0, p.W, 50, C.darkGreen);

    /* App name */
    p.font(28, 'bold', C.white);
    p.text('CropGuardAI', p.W / 2, 22, { align: 'center' });
    p.font(9, 'normal', [180, 230, 155]);
    p.text('FIELD HEALTH REPORT  -  Corn / Maize Lodging Detection', p.W / 2, 32, { align: 'center' });
    p.font(8, 'normal', [150, 205, 130]);
    p.text(`Generated: ${dateStr}`, p.W / 2, 41, { align: 'center' });

    p.y = 58;

    /* ── Status box ── */
    p.filledRoundRect(p.M, p.y, p.W - p.M * 2, 36, 4, statusBg, statusColor, 1.2);
    p.font(8, 'normal', C.darkGray);
    p.text('CURRENT FIELD STATUS', p.W / 2, p.y + 10, { align: 'center' });
    p.font(18, 'bold', statusColor);
    p.text(severity, p.W / 2, p.y + 24, { align: 'center' });
    p.font(9, 'normal', C.darkGray);
    p.text(`Alert Level: ${alertLevel}   |   Analysis Confidence: ${confidence}%`, p.W / 2, p.y + 33, { align: 'center' });
    p.y += 43;

    /* ── 3 big metric tiles ── */
    const tileW = (p.W - p.M * 2 - 8) / 3;
    const tileH = 30;
    const tileGap = 4;

    const tiles = [
        { label: 'Crop Lodged', value: `${lodging}%`, sub: 'of your field', col: statusColor, bg: statusBg },
        { label: 'Yield at Risk', value: `${yieldLoss}%`, sub: 'estimated harvest loss', col: C.orange, bg: [255, 248, 232] },
        { label: 'Plants Scanned', value: totalStems, sub: `${lodged} fallen, ${healthy} standing`, col: [70, 130, 200], bg: [232, 242, 255] },
    ];

    tiles.forEach((tile, i) => {
        const tx = p.M + i * (tileW + tileGap);
        p.filledRoundRect(tx, p.y, tileW, tileH, 3, tile.bg, tile.col, 0.8);
        p.font(20, 'bold', tile.col);
        p.text(String(tile.value), tx + tileW / 2, p.y + 14, { align: 'center' });
        p.font(8, 'bold', C.black);
        p.text(tile.label, tx + tileW / 2, p.y + 21, { align: 'center' });
        p.font(7, 'normal', C.darkGray);
        p.text(tile.sub, tx + tileW / 2, p.y + 27, { align: 'center' });
    });
    p.y += tileH + 10;

    /* ── Field image ── */
    p.font(10, 'bold', C.darkGreen);
    p.text('YOUR FIELD - ANALYSIS IMAGE', p.M, p.y);
    p.y += 4;

    const imgW = p.W - p.M * 2;
    const imgH = imgW * 0.58;
    p.image(imgSrc, p.M, p.y, imgW, imgH);
    p.y += imgH + 4;

    p.font(7, 'normal', C.midGray);
    p.text('Boxes = detected corn stems.  Red label = fallen/leaning stem.  Green label = healthy standing stem.', p.M, p.y);
    p.y += 3;

    pageFooter();

    /* ════ PAGE 2: WHAT IT MEANS + WHAT TO DO ════════════════════════════ */
    p.newPage();
    pageHeader();

    /* ── Section: Plain English Explanation ── */
    sectionHead('WHAT DOES THIS MEAN?');

    let explanation = '';
    if (alertLevel === 'Green') {
        explanation = 'Good news - your field is healthy. Most of your corn plants are standing upright and growing normally. There is no immediate danger of crop loss due to lodging. Continue your normal farm routine.';
    } else if (alertLevel === 'Yellow') {
        explanation = 'Your field has moderate lodging. This means some corn plants have started to lean or fall over. Plants that fall cannot absorb sunlight properly and their roots get damaged. If you do not act soon, your harvest could reduce noticeably. Take action in the next few days.';
    } else {
        explanation = 'URGENT - your field has severe lodging. A large number of corn plants have fallen over. This is serious and will significantly reduce your harvest if not addressed immediately. Some plants may not recover. Please take action today and consult an agricultural expert.';
    }

    const expLines = p.wrapLines(explanation, p.W - p.M * 2);
    p.font(10, 'normal', C.black);
    expLines.forEach(l => { p.guard(7); p.text(l, p.M, p.y); p.y += 6.5; });
    p.y += 5;

    /* ── Section: Simple Numbers ── */
    sectionHead('YOUR FIELD IN SIMPLE NUMBERS');

    const rows = [
        ['How many plants were checked?', `${totalStems} corn stems`],
        ['How many plants are fallen or leaning?', `${lodged} plants  (${lodging}% of field)`, statusColor],
        ['How many plants are standing healthy?', `${healthy} plants  (${100 - lodging}% of field)`, C.midGreen],
        ['How much of your harvest could be lost?', `About ${yieldLoss}%`, C.orange],
        ['How serious is the situation?', severity, statusColor],
        ['How sure is the system about this?', `${confidence}% confident`],
    ];

    rows.forEach(([q, a, ac], i) => infoRow(q, a, ac, i % 2 === 0));
    p.y += 4;

    /* ── Section: What To Do ── */
    sectionHead('WHAT SHOULD YOU DO?');

    let actions = [];
    if (alertLevel === 'Green') {
        actions = [
            ['1', 'Continue your normal routine',
                'Your crop is doing well. Keep your regular watering, weeding, and fertiliser schedule. No urgent changes needed.'],
            ['2', 'Scan your field again in 7 to 10 days',
                'Check again before and after heavy rain or strong winds. Catching problems early saves your harvest.'],
            ['3', 'Keep drainage clear',
                'Make sure water does not collect around plant roots. Waterlogged soil weakens roots and makes plants fall later.'],
        ];
    } else if (alertLevel === 'Yellow') {
        actions = [
            ['1', 'Support leaning plants now',
                'Use bamboo poles or stakes to prop up plants that are leaning badly. Tie nearby plants together in small groups so they support each other.'],
            ['2', 'Stop adding nitrogen fertiliser',
                'Too much nitrogen makes stems grow fast but weak. Stop nitrogen applications immediately until the situation improves.'],
            ['3', 'Add potassium to the soil',
                'Potassium (like Muriate of Potash / MOP) strengthens stems and roots. Apply as per recommended dosage for your crop stage.'],
            ['4', 'Check water drainage',
                'Ensure water is draining properly from your field. Wet soil around roots makes lodging worse. Open any blocked drainage channels.'],
            ['5', 'Scan again in 3 to 5 days',
                'After taking action, run another CropGuardAI scan to see if the situation is getting better or worse.'],
        ];
    } else {
        actions = [
            ['1', 'Act today - every day matters',
                'For plants that are severely fallen, use bamboo stakes or tie them to ropes stretched between posts. The longer you wait, the greater your losses.'],
            ['2', 'Stop all nitrogen fertiliser immediately',
                'Do not apply any more nitrogen. Excess nitrogen is a leading cause of lodging. Switch your focus to potassium and calcium inputs only.'],
            ['3', 'Drain waterlogged areas urgently',
                'If any part of your field has standing water, drain it today using channels or a pump. Wet roots cannot hold plants upright.'],
            ['4', 'Consider bringing forward your harvest',
                'If more than half your field is severely lodged, it may be better to harvest earlier than planned to reduce losses before more plants fall.'],
            ['5', 'Consult an expert today',
                'This level of damage needs professional assessment. Contact your nearest Krishi Vigyan Kendra (KVK), agricultural extension officer, or call the Kisan Call Centre: 1800-180-1551.'],
        ];
    }

    actions.forEach(([num, title, desc]) => actionStep(num, title, desc));

    pageFooter();

    /* ════ PAGE 3: PLANT-BY-PLANT RESULTS + DISCLAIMER ══════════════════ */
    p.newPage();
    pageHeader();

    sectionHead('PLANT-BY-PLANT RESULTS');

    p.font(9, 'normal', C.darkGray);
    p.text(`The system checked ${totalStems} plants one by one. Here is what was found:`, p.M, p.y);
    p.y += 8;

    if (stemList.length === 0) {
        p.font(10, 'normal', C.midGray);
        p.text('Detailed plant-by-plant data is not available for this scan.', p.M, p.y);
        p.y += 10;
    } else {
        /* Table */
        const cols = [
            { label: 'Plant #', w: 22 },
            { label: 'Condition', w: 50 },
            { label: 'Lean Angle', w: 40 },
            { label: 'Health', w: 36 },
            { label: 'Action', w: 32 },
        ];
        const rH = 8;
        const totalW = p.W - p.M * 2;

        /* Header row */
        p.guard(rH + 2);
        p.fillRect(p.M, p.y, totalW, rH, C.darkGreen);
        let cx = p.M;
        cols.forEach(col => {
            p.font(7, 'bold', C.white);
            p.text(col.label, cx + col.w / 2, p.y + 5.5, { align: 'center' });
            cx += col.w;
        });
        p.y += rH;

        stemList.forEach((s, i) => {
            p.guard(rH);
            const isL = s.label === 'Lodged';
            p.fillRect(p.M, p.y, totalW, rH, isL
                ? (i % 2 === 0 ? [255, 242, 242] : [255, 236, 236])
                : (i % 2 === 0 ? C.offWhite : C.white));

            cx = p.M;
            const cells = [
                { v: `#${i + 1}`, c: C.darkGray },
                { v: isL ? 'FALLEN / LEANING' : 'STANDING', c: isL ? C.red : C.midGreen },
                { v: `${s.tilt} degrees`, c: isL ? C.red : C.midGreen },
                { v: `${s.health}%`, c: s.health > 70 ? C.midGreen : s.health > 40 ? C.orange : C.red },
                { v: isL ? 'Needs support' : 'All good', c: isL ? C.red : C.midGreen },
            ];
            cols.forEach((col, ci) => {
                p.font(7.5, ci === 1 ? 'bold' : 'normal', cells[ci].c);
                p.text(cells[ci].v, cx + col.w / 2, p.y + 5.5, { align: 'center' });
                cx += col.w;
            });
            p.hLine(p.y + rH, C.lightGray, 0.2);
            p.y += rH;
        });
    }

    p.y += 10;
    sectionHead('IMPORTANT NOTES', C.darkGray);

    const notes = [
        '• This report is generated by an AI system (CropGuardAI) and is meant to assist you, not replace expert advice.',
        `• A plant leaning more than 25 degrees from straight upright is counted as "fallen / leaning" in this report.`,
        `• The yield loss estimate (${yieldLoss}%) is an approximation. Actual losses depend on your crop variety, how quickly you act, and weather conditions.`,
        '• For serious crop problems, always contact your local Krishi Vigyan Kendra (KVK) or an agricultural officer.',
        '• Kisan Call Centre (free helpline): 1800-180-1551',
        `• Analysis confidence for this scan: ${confidence}%   |   Report date: ${dateStr}`,
    ];

    notes.forEach(n => {
        const ls = p.wrapLines(n, p.W - p.M * 2);
        p.font(8, 'normal', C.darkGray);
        ls.forEach(l => { p.guard(6); p.text(l, p.M, p.y); p.y += 5.5; });
        p.y += 2;
    });

    pageFooter();
    p.save(fileName);
}

/* ══════════════════════════════════════════════════════════════════════════
   DEVELOPER REPORT
   ─ Dark theme. Every image placed with ABSOLUTE Y coordinates so nothing
     overlaps. All sections strictly sequential.
══════════════════════════════════════════════════════════════════════════ */
export async function generateDeveloperReport(data) {
    const C = DEV_COLORS;

    const safe = data || {};
    const fm = safe.farmer_metrics || {};
    const dm = safe.developer_metrics || {};
    const res = safe.result || {};
    const veg = safe.vegetation || {};
    const edgesData = safe.edges || {};
    const stmsData = safe.stems || {};
    const imgs = safe.processed_images || {};
    const img0 = safe.processed_image_base64 || '';

    const lodging = Number(fm.lodging_percentage ?? 0);
    const yieldLoss = Number(fm.yield_loss_estimate ?? 0);
    const total = Number(fm.total_stems ?? 0);
    const lodged = Math.round(total * lodging / 100);
    const alertLevel = fm.alert_level || 'Green';
    const severity = fm.severity || 'Optimal';
    const riskScore = Number(res.risk_score ?? lodging);
    const avgAngle = Number(res.avg_angle ?? dm.inclination_vulnerability ?? 0);
    const confidence = Number(safe.confidence ?? 75);
    const procTime = safe.process_time_ms ?? safe.latency ?? 'N/A';
    const coverage = Number(veg.coverage_pct ?? 0);
    const edgePct = Number(edgesData.edge_density_pct ?? dm.edge_density ?? 0);
    const inclVuln = Number(dm.inclination_vulnerability ?? 0);
    const lineCount = Number(stmsData.line_count ?? 0);
    const vertPct = Number(stmsData.vertical_pct ?? 0);
    const stemList = dm.stem_details || [];
    const coreStack = dm.core_stack || [];
    const angleDev = parseFloat(Math.max(0, 90 - avgAngle).toFixed(1));

    const alertCol = alertLevel === 'Red' ? C.red : alertLevel === 'Yellow' ? C.lime : C.ok;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const fileName = `Crop_Dev_Report_${now.toISOString().slice(0, 10)}.pdf`;

    const p = await new PDF().init(C.pageBg);

    /* ── Shared helpers ── */
    const hdr = (title) => {
        p.fillRect(0, 0, p.W, 14, C.panel);
        p.fillRect(0, 13.5, p.W, 0.8, C.lime);
        p.font(9, 'bold', C.lime); p.text('CropGuardAI', p.M, 9.5);
        p.font(7, 'normal', C.muted); p.text(title || 'Developer Analytics Report', p.M + 21, 9.5);
        p.font(7, 'normal', C.muted); p.text(`Page ${p.pageNum}`, p.W - p.M, 9.5, { align: 'right' });
        p.y = 21;
    };

    const ftr = () => {
        p.fillRect(0, p.H - 11, p.W, 11, C.panel);
        p.font(7, 'normal', C.muted);
        p.text(
            `CropGuardAI  |  Latency: ${procTime}ms  |  Lodging threshold >25 deg  |  stem-project-7z7kd/v4  |  CESA x VIT`,
            p.W / 2, p.H - 4.5, { align: 'center' }
        );
    };

    const sec = (label, color) => {
        p.y += 4;
        p.guard(14);
        p.font(10, 'bold', color || C.lime);
        p.text(label, p.M, p.y);
        p.doc.setDrawColor(...(color || C.lime));
        p.doc.setLineWidth(0.5);
        p.doc.line(p.M, p.y + 2.5, p.W - p.M, p.y + 2.5);
        p.y += 9;
    };

    const kv = (label, value, vCol) => {
        p.guard(8);
        p.font(8.5, 'normal', C.muted); p.text(label, p.M + 2, p.y);
        p.font(8.5, 'bold', vCol || C.white); p.text(String(value ?? '-'), p.W - p.M, p.y, { align: 'right' });
        p.doc.setDrawColor(35, 60, 35); p.doc.setLineWidth(0.2);
        p.doc.line(p.M, p.y + 1.8, p.W - p.M, p.y + 1.8);
        p.y += 7.5;
    };

    /* Metric card - drawn at absolute (x,y), does NOT touch p.y */
    const metCard = (x, y, w, h, value, label, col) => {
        p.filledRoundRect(x, y, w, h, 2, C.panel2, col, 0.5);
        p.font(16, 'bold', col);
        p.text(String(value), x + w / 2, y + h * 0.54, { align: 'center' });
        p.font(6.5, 'normal', C.muted);
        p.text(label.toUpperCase(), x + w / 2, y + h * 0.84, { align: 'center' });
    };

    /* Formula block */
    const formulaBlock = (num, title, form, sub, result, rCol) => {
        p.guard(34);
        /* number badge */
        p.filledRoundRect(p.M, p.y, 7, 7, 1, C.teal);
        p.font(7, 'bold', C.pageBg); p.text(String(num), p.M + 3.5, p.y + 5.2, { align: 'center' });
        p.font(8.5, 'bold', C.teal); p.text(title, p.M + 10, p.y + 5.2);
        p.y += 10;

        /* formula line */
        p.fillRect(p.M, p.y, p.W - p.M * 2, 8, [18, 36, 20]);
        p.doc.setDrawColor(...C.green); p.doc.setLineWidth(0.3);
        p.doc.rect(p.M, p.y, p.W - p.M * 2, 8, 'S');
        p.font(8, 'normal', C.greenLt); p.text(form, p.M + 3, p.y + 5.5);
        p.y += 10;

        /* substituted values */
        p.font(8, 'normal', C.muted); p.text('  ->  ' + sub, p.M + 3, p.y);
        p.y += 6;

        /* result */
        p.font(10, 'bold', rCol || C.lime); p.text('  =  ' + result, p.M + 3, p.y);
        p.y += 10;
    };

    /* Code block */
    const codeBlock = (lines, borderCol) => {
        const h = lines.length * 5.5 + 6;
        p.guard(h + 4);
        p.fillRect(p.M, p.y, p.W - p.M * 2, h, [16, 14, 28]);
        p.doc.setDrawColor(...(borderCol || C.purple)); p.doc.setLineWidth(0.3);
        p.doc.rect(p.M, p.y, p.W - p.M * 2, h, 'S');
        p.font(8, 'normal', C.greenLt);
        lines.forEach(line => {
            p.text(line, p.M + 4, p.y + 5.5);
            p.y += 5.5;
        });
        p.y += 6;
    };

    /* ════ PAGE 1: COVER ══════════════════════════════════════════════════ */
    p.fillRect(0, 0, p.W, 3, C.lime);   // top lime stripe

    p.font(32, 'bold', C.white); p.text('CropGuardAI', p.W / 2, 50, { align: 'center' });
    p.font(9, 'normal', C.lime); p.text('AUTONOMOUS FIELD SURVEILLANCE & DAMAGE ASSESSMENT', p.W / 2, 61, { align: 'center' });
    p.doc.setDrawColor(...C.green); p.doc.setLineWidth(0.6);
    p.doc.line(p.M, 67, p.W - p.M, 67);

    p.filledRoundRect(p.W / 2 - 44, 74, 88, 13, 3, C.teal);
    p.font(10, 'bold', C.pageBg); p.text('DEVELOPER ANALYTICS REPORT', p.W / 2, 82.5, { align: 'center' });

    p.filledRoundRect(p.W / 2 - 50, 95, 100, 20, 4, alertCol);
    p.font(14, 'bold', C.pageBg); p.text(severity, p.W / 2, 107, { align: 'center' });

    p.font(8, 'normal', C.muted);
    p.text(`Alert Level: ${alertLevel}`, p.W / 2, 124, { align: 'center' });
    p.text(`Generated: ${dateStr}`, p.W / 2, 131, { align: 'center' });
    p.text('Model: stem-project-7z7kd / v4  |  YOLOv8  |  FastAPI Backend', p.W / 2, 138, { align: 'center' });

    p.doc.setDrawColor(...C.green); p.doc.setLineWidth(0.3);
    p.doc.line(p.M, p.H - 18, p.W - p.M, p.H - 18);
    p.font(7, 'normal', C.muted);
    p.text('CropGuardAI  |  Corn/Maize Lodging Detection  |  CESA x VIT Hackathon', p.W / 2, p.H - 12, { align: 'center' });

    /* ════ PAGE 2: METRICS OVERVIEW ══════════════════════════════════════ */
    p.newPage(); hdr('Developer Analytics Report');

    sec('1.  SYSTEM METRICS OVERVIEW', C.teal);

    /* 6 metric cards - 2 rows of 3 - using absolute coordinates */
    const mets = [
        { v: `${riskScore}%`, l: 'Risk Score', c: riskScore > 65 ? C.red : riskScore > 35 ? C.lime : C.ok },
        { v: `${lodging}%`, l: 'Lodging %', c: C.lime },
        { v: `${edgePct}%`, l: 'Edge Density', c: C.teal },
        { v: `${coverage}%`, l: 'Veg Coverage', c: C.ok },
        { v: `${avgAngle} deg`, l: 'Avg Hough Ang', c: C.orange },
        { v: `${confidence}%`, l: 'Confidence', c: C.greenLt },
    ];

    const mW = (p.W - p.M * 2 - 10) / 3;
    const mH = 22;
    const mGap = 5;

    const rowY1 = p.y;
    mets.slice(0, 3).forEach((m, i) => metCard(p.M + i * (mW + mGap), rowY1, mW, mH, m.v, m.l, m.c));
    const rowY2 = rowY1 + mH + 5;
    mets.slice(3, 6).forEach((m, i) => metCard(p.M + i * (mW + mGap), rowY2, mW, mH, m.v, m.l, m.c));
    p.y = rowY2 + mH + 10;

    sec('DETAILED PARAMETERS', C.greenLt);
    kv('Total Stems Detected', total, C.white);
    kv('Lodged Stems', `${lodged}  (${lodging}%)`, C.red);
    kv('Healthy Stems', `${total - lodged}`, C.ok);
    kv('Inclination Vulnerability', `${inclVuln} deg`, C.orange);
    kv('Hough Line Count', lineCount, C.muted);
    kv('Vertical Lines %', `${vertPct}%`, C.muted);
    kv('Yield Loss Estimate', `${yieldLoss}%`, C.orange);
    kv('Angle Deviation', `${angleDev} deg`, C.teal);
    kv('Processing Latency', `${procTime} ms`, C.lime);

    ftr();

    /* ════ PAGE 3: FORMULA ENGINE ════════════════════════════════════════ */
    p.newPage(); hdr('Formula Engine');

    sec('2.  FORMULA ENGINE - ALL CALCULATIONS', C.teal);

    formulaBlock(1, 'LODGING PERCENTAGE',
        'Lodging % = ( Lodged Stems / Total Stems ) x 100',
        `( ${lodged} / ${total} ) x 100`,
        `${lodging}%`, alertCol);

    formulaBlock(2, 'YIELD LOSS ESTIMATE',
        'Yield Loss = Lodging % x 0.6',
        `${lodging} x 0.6`,
        `${yieldLoss}%`, C.orange);

    formulaBlock(3, 'ANGLE DEVIATION FROM VERTICAL',
        'Angle Deviation = max( 0,  90 - Avg Hough Angle )',
        `max( 0,  90 - ${avgAngle} )`,
        `${angleDev} deg`, C.teal);

    formulaBlock(4, 'COMPOSITE RISK SCORE',
        'Risk Score = min( 100,  Lodging% x 0.6  +  AngleDev x 0.4 )',
        `min( 100,  ${lodging}x0.6  +  ${angleDev}x0.4 )`,
        `${riskScore} / 100`,
        riskScore > 65 ? C.red : riskScore > 35 ? C.lime : C.ok);

    formulaBlock(5, 'DETECTION CONFIDENCE',
        'Confidence = clamp( 50 + (Stemsx3) - (EdgeDensityx0.5),  40, 99 )',
        `clamp( 50 + (${total}x3) - (${edgePct}x0.5),  40, 99 )`,
        `${confidence}%`, C.greenLt);

    formulaBlock(6, 'INCLINATION VULNERABILITY',
        'Incl.Vuln = Sum( lodged stem tilts ) / Count( lodged stems )',
        `average tilt across ${lodged} lodged stem(s)`,
        `${inclVuln} deg`, C.orange);

    ftr();

    /* ════ PAGE 4: ALGORITHM ═════════════════════════════════════════════ */
    p.newPage(); hdr('Per-Stem Tilt Algorithm');

    sec('3.  PER-STEM TILT DETECTION ALGORITHM', C.purple);

    const steps = [
        {
            title: 'Step 1 - Crop Stem ROI from Roboflow Bounding Box',
            code: ['stem_crop = image[y1:y2, x1:x2]',
                'gray      = cv2.cvtColor(stem_crop, cv2.COLOR_BGR2GRAY)',
                'gray      = cv2.GaussianBlur(gray, (5,5), sigmaX=0)']
        },
        {
            title: 'Step 2 - Canny Edge Detection',
            code: ['edges = cv2.Canny(gray, threshold1=40, threshold2=120)']
        },
        {
            title: 'Step 3 - Probabilistic Hough Transform',
            code: ['lines = cv2.HoughLinesP(edges,  rho=1,  theta=pi/180,',
                '          threshold=20,  minLineLength=20,  maxLineGap=5)']
        },
        {
            title: 'Step 4 - Select Dominant Line (max length)',
            code: ['length    = sqrt( (x2-x1)^2 + (y2-y1)^2 )',
                'best_line = line with  max(length)']
        },
        {
            title: 'Step 5 - Compute Tilt from Vertical',
            code: ['angle = degrees( arctan2( y2-y1,  x2-x1 ) )',
                'tilt  = abs( 90 - abs(angle) )']
        },
        {
            title: 'Step 6 - Classify',
            code: ['if tilt > 25:   label = "Lodged"   -> RED',
                'else:           label = "Healthy"  -> GREEN']
        },
    ];

    steps.forEach(s => {
        p.guard(10 + s.code.length * 5.5 + 10);
        p.font(8.5, 'bold', C.purple); p.text(s.title, p.M, p.y); p.y += 5;
        codeBlock(s.code, C.purple);
    });

    ftr();

    /* ════ PAGES 5–6: VISION LAYERS - strict 1 image per row ════════════
       Each image gets its own row. Left col = label + image. No overlaps.
    ════════════════════════════════════════════════════════════════════════ */
    p.newPage(); hdr('Computer Vision Layers');
    sec('4.  COMPUTER VISION PROCESSING LAYERS', C.greenLt);

    const layers = [
        { src: img0, label: 'ANNOTATED OUTPUT', desc: 'Roboflow bounding boxes + per-stem tilt angle labels' },
        { src: imgs.mask, label: 'HSV VEGETATION MASK', desc: 'inRange( [30,40,40] -> [90,255,255] ) - isolates green crop' },
        { src: imgs.density, label: 'THERMAL DENSITY MAP', desc: 'GaussianBlur(21x21) + COLORMAP_INFERNO - heat distribution' },
        { src: imgs.edges, label: 'CANNY EDGE TOPOLOGY', desc: 'Canny(low=40, high=120) - structural edge map' },
        { src: imgs.stem, label: 'HOUGH STRUCTURAL MESH', desc: 'HoughLinesP(thr=40, minLen=30) - stem line skeleton' },
        { src: imgs.tactical, label: 'TACTICAL GRID A1–D4', desc: '4x4 sector coordinate overlay for field mapping' },
    ];

    /* Each image: label bar (10mm) + image (55mm) + gap (6mm) = 71mm per image */
    /* 2 images fit per page (2 x 71 = 142mm, leaving room for header/footer) */
    /* We use strict fixed math - NO automatic y management inside this loop */

    const LBL_H = 10;   // label bar height mm
    const IMG_W = p.W - p.M * 2;   // full width
    const IMG_H = Math.round(IMG_W * 0.52);  // ~92mm
    const GAP = 8;    // gap between images
    const BLOCK = LBL_H + IMG_H + GAP;  // total height per image block

    layers.forEach((layer, i) => {
        /* New page every 2 images */
        if (i > 0 && i % 2 === 0) {
            p.newPage();
            hdr('Computer Vision Layers');
            p.y = 21;
        }

        /* Also guard: if even 1 block won't fit on current page, new page */
        if (p.y + BLOCK > p.H - p.M - 16) {
            p.newPage();
            hdr('Computer Vision Layers');
            p.y = 21;
        }

        const blockY = p.y;

        /* Label bar */
        p.fillRect(p.M, blockY, IMG_W, LBL_H, C.panel2);
        p.doc.setDrawColor(...C.greenLt); p.doc.setLineWidth(0.4);
        p.doc.rect(p.M, blockY, IMG_W, LBL_H, 'S');
        p.font(8, 'bold', C.greenLt);
        p.text(layer.label, p.M + 4, blockY + 6.5);
        p.font(7, 'normal', C.muted);
        p.text(layer.desc, p.W - p.M - 3, blockY + 6.5, { align: 'right' });

        /* Image - starts exactly at blockY + LBL_H */
        const imgY = blockY + LBL_H;
        p.image(layer.src, p.M, imgY, IMG_W, IMG_H);

        /* Border around image */
        p.doc.setDrawColor(...C.green); p.doc.setLineWidth(0.3);
        p.doc.rect(p.M, imgY, IMG_W, IMG_H, 'S');

        /* Advance y to next block */
        p.y = blockY + BLOCK;
    });

    ftr();

    /* ════ NEXT PAGE: STEM TABLE ══════════════════════════════════════════ */
    p.newPage(); hdr('Stem Detection Log');

    sec('5.  STEM DETECTION LOG', C.orange);

    p.font(8, 'normal', C.muted);
    p.text(
        `${stemList.length} stems detected  |  ${lodged} lodged  |  ${total - lodged} healthy  |  Threshold: tilt > 25 deg`,
        p.M, p.y
    );
    p.y += 8;

    if (stemList.length === 0) {
        p.font(9, 'normal', C.muted);
        p.text('No Roboflow detections for this image.', p.M, p.y);
        p.y += 10;
    } else {
        const tCols = [
            { lbl: '#', w: 14 },
            { lbl: 'CLASS', w: 40 },
            { lbl: 'TILT', w: 28 },
            { lbl: 'HEALTH %', w: 28 },
            { lbl: 'STATUS', w: 30 },
            { lbl: 'HEALTH BAR', w: 40 },
        ];
        const rH = 7;
        const tW = p.W - p.M * 2;

        /* Header */
        p.guard(rH + 2);
        p.fillRect(p.M, p.y, tW, rH, C.green);
        let cx = p.M;
        tCols.forEach(col => {
            p.font(7, 'bold', C.lime);
            p.text(col.lbl, cx + col.w / 2, p.y + 5, { align: 'center' });
            cx += col.w;
        });
        p.y += rH;

        stemList.forEach((s, i) => {
            p.guard(rH);
            const isL = s.label === 'Lodged';
            p.fillRect(p.M, p.y, tW, rH, i % 2 === 0 ? C.panel : C.panel2);
            cx = p.M;

            const cells = [
                { v: `S${String(i + 1).padStart(2, '0')}`, c: C.muted },
                { v: s.label, c: isL ? C.red : C.ok },
                { v: `${s.tilt} deg`, c: isL ? C.red : C.ok },
                { v: `${s.health}%`, c: s.health > 70 ? C.ok : s.health > 40 ? C.lime : C.red },
                { v: isL ? 'LODGED' : 'HEALTHY', c: isL ? C.red : C.ok },
            ];
            cells.forEach((cell, ci) => {
                p.font(7, ci === 1 ? 'bold' : 'normal', cell.c);
                p.text(cell.v, cx + tCols[ci].w / 2, p.y + 5, { align: 'center' });
                cx += tCols[ci].w;
            });

            /* Health progress bar */
            const barX = cx; const barW = 36; const barY = p.y + 2; const barH = 3;
            p.fillRect(barX, barY, barW, barH, [30, 55, 32]);
            p.fillRect(barX, barY, Math.max(1, barW * s.health / 100), barH,
                s.health > 70 ? C.ok : s.health > 40 ? C.lime : C.red);

            p.doc.setDrawColor(30, 55, 32); p.doc.setLineWidth(0.2);
            p.doc.line(p.M, p.y + rH, p.W - p.M, p.y + rH);
            p.y += rH;
        });
    }

    ftr();

    /* ════ LAST PAGE: CV PARAMS + MODEL INFO + STACK ══════════════════════ */
    p.newPage(); hdr('CV Parameters & Model Info');

    sec('6.  COMPUTER VISION PARAMETERS', C.teal);
    kv('Canny Thresholds', '40 (low) / 120 (high)', C.teal);
    kv('GaussianBlur - per-stem', '(5 x 5) kernel', C.muted);
    kv('GaussianBlur - thermal map', '(21 x 21) kernel', C.muted);
    kv('HSV Lower Bound', '[H=30, S=40, V=40]', C.ok);
    kv('HSV Upper Bound', '[H=90, S=255, V=255]', C.ok);
    kv('Hough - rho / theta', '1 px  /  pi/180 rad', C.muted);
    kv('HoughLinesP threshold', '20 votes (per-stem)', C.muted);
    kv('Min Line Length', '20 px  (per-stem)', C.muted);
    kv('Max Line Gap', '5 px   (per-stem)', C.muted);
    kv('Lodging Threshold', '> 25 deg tilt from vertical', C.lime);
    kv('Yield Loss Coefficient', '0.6  (empirical agronomic value)', C.orange);
    kv('Image Resize Max Width', '800 px', C.muted);

    sec('7.  MODEL & BACKEND INFO', C.purple);
    kv('Roboflow Model ID', 'stem-project-7z7kd', C.teal);
    kv('Model Version', 'v4', C.lime);
    kv('Architecture', 'YOLOv8', C.greenLt);
    kv('Detection Class', '"Stem"', C.lime);
    kv('Backend Framework', 'FastAPI (Python)', C.purple);
    kv('API Endpoint', 'POST /analyze', C.lime);
    kv('Input Format', 'multipart/form-data (image)', C.muted);
    kv('Output Format', 'JSON (metrics + base64 imgs)', C.muted);
    kv('Training Dataset', 'corn-stem-biye (Roboflow)', C.ok);
    kv('Image Tiling Strategy', '640 x 640 px patches', C.muted);
    kv('Frontend Stack', 'React + Vite + Recharts', C.muted);

    sec('8.  CORE PROCESSING STACK', C.lime);

    const fullStack = [
        ...coreStack,
        'YOLOv8 Object Detection',
        'NumPy Array Processing',
        'Pillow Image I/O',
        'Base64 Encoding/Decoding',
        'React + Vite (Frontend)',
        'Recharts (Data Visualisation)',
    ];

    fullStack.forEach(item => {
        p.guard(7.5);
        p.fillRect(p.M, p.y - 3.5, p.W - p.M * 2, 7, C.panel2);
        p.font(8, 'normal', C.ok); p.text('[OK]', p.M + 3, p.y + 0.5);
        p.font(8, 'normal', C.greenLt); p.text(item, p.M + 16, p.y + 0.5);
        p.y += 8;
    });

    ftr();
    p.save(fileName);
}