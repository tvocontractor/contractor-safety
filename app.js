/**
 * Contractor Management Application Controller
 * -------------------------------------------------------------
 * จัดการสเตตัสข้อมูลของทั้งระบบ รองรับทั้งการทำงานแบบออฟไลน์ด้วย LocalStorage
 * และออนไลน์ด้วยการซิงค์ข้อมูลกับ Google Sheets (Google Apps Script Web App)
 */

// --- ระบบตรวจจับข้อผิดพลาดทั่วโลก (Global Error Handlers for Diagnostics) ---
window.addEventListener('error', function(event) {
  // กรองข้อผิดพลาดข้ามโดเมน (เช่น บราวเซอร์ส่วนขยาย) ที่ระบุตำแหน่งไม่ได้
  if (event.message === 'Script error.' || !event.filename || (event.lineno === 0 && event.colno === 0)) {
    console.warn('Muted browser extension/cross-origin error:', event);
    return;
  }
  showGlobalErrorOverlay(event.message, event.filename, event.lineno, event.colno, event.error);
});
window.addEventListener('unhandledrejection', function(event) {
  const reasonMsg = event.reason ? event.reason.message || event.reason : 'Unhandled Promise Rejection';
  // กรองรีเจกต์ที่ไม่มีตำแหน่งไฟล์หรือข้อความเตือนของระบบ
  if (typeof reasonMsg === 'string' && (reasonMsg.includes('Script error') || reasonMsg.includes('Extension'))) {
    console.warn('Muted browser extension promise rejection:', event.reason);
    return;
  }
  showGlobalErrorOverlay(reasonMsg, '', 0, 0, event.reason);
});

function showGlobalErrorOverlay(message, source, lineno, colno, error) {
  let overlay = document.getElementById('global-error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'global-error-overlay';
    overlay.style.cssText = 'position: fixed; bottom: 20px; right: 20px; max-width: 450px; background: #ffebee; border-left: 5px solid #d32f2f; color: #c62828; padding: 16px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); z-index: 999999; font-family: sans-serif; font-size: 13px; line-height: 1.5;';
    document.body.appendChild(overlay);
  }
  
  const file = source ? source.substring(source.lastIndexOf('/') + 1) : 'ไม่ระบุไฟล์';
  overlay.innerHTML = `
    <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
      <span>⚠️ ตรวจพบข้อผิดพลาดในระบบ (JS Error)</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #c62828; font-size: 16px; cursor: pointer; font-weight: bold; padding: 0 4px;">&times;</button>
    </div>
    <div style="margin-bottom: 8px; word-break: break-all;"><strong>ข้อความ:</strong> ${message}</div>
    <div style="margin-bottom: 10px;"><strong>ตำแหน่ง:</strong> ${file} (บรรทัดที่ ${lineno}:${colno})</div>
    <div style="display: flex; gap: 8px;">
      <button onclick="navigator.clipboard.writeText('Error: ${message.replace(/'/g, "\\'")} in ${file} at ${lineno}:${colno}').then(() => alert('คัดลอกข้อผิดพลาดแล้วครับ'))" style="background: #d32f2f; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 11px;">คัดลอกรายละเอียด</button>
      <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: #c62828; border: 1px solid #c62828; padding: 4px 9px; border-radius: 4px; cursor: pointer; font-size: 11px;">ปิด</button>
    </div>
  `;
}

// 1. ใส่ลิงก์ Web App URL ที่ได้จากการ Deploy Apps Script ลงในเครื่องหมายคำพูดด้านล่างนี้
// หากยังไม่ใส่ ระบบจะทำงานแบบประมวลผลออฟไลน์ภายในเครื่อง (LocalStorage) โดยอัตโนมัติเพื่อให้ทดลองเล่นได้ทันที
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAiI7pMarFlTqmNCbtDGlv0ld2lTJOPIpY0SMLwfCAGWscIfdpotD9fEZ1KB36N0A_/exec'; 

// 2. ข้อมูลสีกำหนด 12 เดือนความปลอดภัย
const MONTHLY_COLORS = {
  0: { name: 'สีแดง (Red)', color: '#f44336' },
  1: { name: 'สีน้ำเงิน (Blue)', color: '#2196f3' },
  2: { name: 'สีเขียว (Green)', color: '#4caf50' },
  3: { name: 'สีเหลือง (Yellow)', color: '#ffeb3b' },
  4: { name: 'สีแสด/ส้ม (Orange)', color: '#ff9800' },
  5: { name: 'สีม่วง (Purple)', color: '#9c27b0' },
  6: { name: 'สีน้ำตาล (Brown)', color: '#795548' },
  7: { name: 'สีชมพู (Pink)', color: '#e91e63' },
  8: { name: 'สีเขียวมะนาว (Lime Green)', color: '#8bc34a' },
  9: { name: 'สีฟ้าอ่อน (Sky Blue)', color: '#00bcd4' },
  10: { name: 'สีเขียวหัวเป็ด (Teal)', color: '#009688' },
  11: { name: 'สีเทา (Gray)', color: '#9e9e9e' }
};

// 3. ข้อมูลตัวเลือกเริ่มต้นของ ชื่ออุปกรณ์ (Dropdown List)
const DEFAULT_EQ_TYPES = ['สว่าน', 'เครื่องเจียร์มือถือ (ลูกหมู)', 'เลื่อยจิ๊กซอว์', 'เลื่อยวงเดือน', 'เครื่องเชื่อม (ยกเว้นเครื่องเชื่อมแก๊ส LPG)', 'บล็อกไฟฟ้า', 'ตู้ควบคุมไฟฟ้าชั่วคราว', 'สายไฟปลั๊กพ่วง', 'เครื่องตัดเหล็กไฟเบอร์'];

// 4. รายชื่อข้อบกพร่องด้านความปลอดภัยหลัก
// 4. รายชื่อข้อบกพร่องด้านความปลอดภัยหลัก
const DEFAULT_DEFECT_TYPES = [
  'อุปกรณ์ชำรุด / ไม่ปลอดภัยในการใช้งาน',
  'ไม่มีป้าย Tag หรือ Tag หมดอายุการตรวจ',
  'การใช้งานอุปกรณ์ผิดประเภท',
  'ถอดอุปกรณ์ป้องกันความปลอดภัยออก (Bypass guard)',
  'ไม่สวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล (PPE)',
  'ไม่เกี่ยวสายเข็มขัดนิรภัยขณะทำงานบนที่สูง (มากกว่า 2 เมตร)',
  'ปฏิบัติงานโดยไม่มีใบอนุญาตทำงาน (Work Permit)',
  'ไม่มีผู้เฝ้าระวังไฟ (Fire Watcher) หรือไม่มีถังดับเพลิง',
  'ทำงานในที่อับอากาศโดยไม่ได้รับอนุญาต',
  'การจัดเก็บพื้นที่หน้างานไม่เป็นระเบียบเรียบร้อย (Housekeeping)',
  'จัดเก็บสารเคมีหรือแก๊สไวไฟไม่ถูกต้อง',
  'ฝ่าฝืนใช้อุปกรณ์ชำรุด / ไม่ผ่านการตรวจ (ฝ่าฝืนข้อห้ามความปลอดภัย)'
];

// 4.1 ตารางผูกผันระดับความรุนแรง (A, B, C) และแต้มหักคะแนนโดยอัตโนมัติ (รองรับการอัปเดตจาก Config Sheet)
const DEFECT_SEVERITY_MAP = {
  'อุปกรณ์ชำรุด / ไม่ปลอดภัยในการใช้งาน': 'B',
  'ไม่มีป้าย Tag หรือ Tag หมดอายุการตรวจ': 'B',
  'การใช้งานอุปกรณ์ผิดประเภท': 'B',
  'ถอดอุปกรณ์ป้องกันความปลอดภัยออก (Bypass guard)': 'A',
  'ไม่สวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล (PPE)': 'C',
  'ไม่เกี่ยวสายเข็มขัดนิรภัยขณะทำงานบนที่สูง (มากกว่า 2 เมตร)': 'A',
  'ปฏิบัติงานโดยไม่มีใบอนุญาตทำงาน (Work Permit)': 'A',
  'ไม่มีผู้เฝ้าระวังไฟ (Fire Watcher) หรือไม่มีถังดับเพลิง': 'B',
  'ไม่มีผู้เฝ้าระวังไฟ (Fire Watcher) หรือไม่มีถังดับเพลิงประจำจุดเชื่อม': 'B',
  'ทำงานในที่อับอากาศโดยไม่ได้รับอนุญาต': 'A',
  'การจัดเก็บพื้นที่หน้างานไม่เป็นระเบียบเรียบร้อย (Housekeeping)': 'C',
  'จัดเก็บสารเคมีหรือแก๊สไวไฟไม่ถูกต้อง': 'B',
  'ฝ่าฝืนใช้อุปกรณ์ชำรุด / ไม่ผ่านการตรวจ (ฝ่าฝืนข้อห้ามความปลอดภัย)': 'A',
  'แอบใช้อุปกรณ์ชำรุด / ไม่ผ่านการตรวจ (ฝ่าฝืนข้อห้ามความปลอดภัย)': 'A'
};

const DEFECT_POINTS_MAP = {
  'A': 10,
  'B': 5,
  'C': 2
};

function autoSelectSeverityByDefect() {
  const defectSelect = document.getElementById('p-defect');
  const severitySelect = document.getElementById('p-severity');
  if (!defectSelect || !severitySelect) return;

  const defectVal = defectSelect.value;
  const targetLevel = DEFECT_SEVERITY_MAP[defectVal] || 'B';

  for (let i = 0; i < severitySelect.options.length; i++) {
    const optVal = severitySelect.options[i].value;
    if (optVal === targetLevel || optVal === (targetLevel === 'A' ? 'สูง' : (targetLevel === 'B' ? 'กลาง' : 'ต่ำ'))) {
      severitySelect.selectedIndex = i;
      break;
    }
  }
}

// 4.2 ระบบคำนวณ Safety Scorecard แบบเป็นธรรม (Normalized Compliance Rate %)
function calculateContractorSafetyScore(companyName) {
  const compEq = (appState.equipment || []).filter(eq => eq['บริษัทผู้รับเหมา'] === companyName);
  const compPatrols = (appState.patrolLogs || []).filter(log => log['ผู้รับเหมา'] === companyName);

  let passedEq = 0;
  let defectiveEq = 0;
  let activeEqCount = 0;

  compEq.forEach(eq => {
    const statusVal = String(eq['สถานะอุปกรณ์'] || eq['สถานะ'] || '').trim();
    const isDeactivated = statusVal.indexOf('ปิดการใช้งาน') > -1 || statusVal.indexOf('จบโครงการ') > -1 || statusVal.indexOf('ปลดระวาง') > -1;
    if (isDeactivated) return; // ไม่นำอุปกรณ์ที่ปิดการใช้งาน (จบโครงการ) มาคิดคะแนนหักหมดอายุ Tag!

    activeEqCount++;
    if (checkEquipmentExpired(eq['วันหมดอายุ Tag']) || checkEquipmentDefective(eq['หมายเลขซีเรียล'])) {
      defectiveEq++;
    } else {
      passedEq++;
    }
  });

  let rawPatrolDeductions = 0;
  let capaBonus = 0;

  compPatrols.forEach(log => {
    const defectType = String(log['ข้อบกพร่อง'] || log['ประเภทข้อบกพร่องความปลอดภัย'] || '').trim();
    const severity = String(log['ระดับความรุนแรง'] || DEFECT_SEVERITY_MAP[defectType] || 'C').trim().toUpperCase();
    const isClosed = log['สถานะ CAPA'] === 'ปิดเคสแล้ว';
    
    let baseDeduct = DEFECT_POINTS_MAP[defectType] || DEFECT_POINTS_MAP[severity] || (severity === 'A' || severity === 'สูง' ? 10 : (severity === 'B' || severity === 'กลาง' ? 5 : 2));
    
    rawPatrolDeductions += baseDeduct;
    if (isClosed) {
      capaBonus += Math.round(baseDeduct * 0.5);
    }
  });

  const eqDeductions = defectiveEq * 5;
  const netPatrolDeductions = rawPatrolDeductions - capaBonus;
  const totalPointsDeducted = Math.max(0, netPatrolDeductions + eqDeductions);

  // คำนวณปริมาณงานทั้งหมด (Total Volume of Activity) เพื่อปรับคะแนนให้เป็นธรรมกับผู้รับเหมาที่มีกิจกรรมเยอะ
  const totalVolume = activeEqCount + compPatrols.length;
  const effectiveVolume = Math.max(1, totalVolume);

  // Compliance Rate % Formula = 100 - ((แต้มหักรวม / จำนวนการตรวจและอุปกรณ์) * 10)
  const violationDensity = totalPointsDeducted / effectiveVolume;
  const finalScore = Math.max(0, Math.min(100, Math.round(100 - (violationDensity * 10))));

  const totalDefects = compPatrols.length;
  const closedDefects = compPatrols.filter(l => l['สถานะ CAPA'] === 'ปิดเคสแล้ว').length;
  const capaRate = totalDefects > 0 ? Math.round((closedDefects / totalDefects) * 100) : 100;
  const passRate = activeEqCount > 0 ? Math.round((passedEq / activeEqCount) * 100) : 100;

  let gradeText = 'เกณฑ์ดีเยี่ยม (Grade A)';
  let badgeClass = 'active';
  if (finalScore < 60) {
    gradeText = 'ไม่ผ่านเกณฑ์ (Grade F)';
    badgeClass = 'inactive';
  } else if (finalScore < 75) {
    gradeText = 'ต้องเฝ้าระวัง (Grade C)';
    badgeClass = 'pending';
  } else if (finalScore < 90) {
    gradeText = 'ผ่านเกณฑ์ (Grade B)';
    badgeClass = 'active';
  }

  return {
    companyName: companyName,
    finalScore: finalScore,
    pointsDeducted: totalPointsDeducted,
    rawPatrolDeductions: rawPatrolDeductions,
    capaBonus: capaBonus,
    eqDeductions: eqDeductions,
    totalDefects: totalDefects,
    closedDefects: closedDefects,
    capaRate: capaRate,
    passRate: passRate,
    passedEq: passedEq,
    defectiveEq: defectiveEq,
    totalEq: compEq.length,
    gradeText: gradeText,
    badgeClass: badgeClass,
    effectiveVolume: effectiveVolume,
    violationDensity: violationDensity
  };
}

function openScoreFormulaModal(companyName) {
  if (!companyName) {
    companyName = window.activeContractorProfileName;
  }
  if (!companyName && appState.contractors && appState.contractors.length > 0) {
    companyName = appState.contractors[0]['ชื่อบริษัท'];
  }
  if (!companyName) return;

  window.activeContractorProfileName = companyName;
  const sc = calculateContractorSafetyScore(companyName);

  document.getElementById('sf-company-name').innerText = `บริษัทผู้รับเหมา: ${sc.companyName}`;
  document.getElementById('sf-grade-summary').innerText = `เกรดประเมินสรุป: ${sc.gradeText} (${sc.finalScore}/100 คะแนน)`;

  const detailsContainer = document.getElementById('sf-breakdown-details');
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <span>1. คะแนนตั้งต้น (Base Score)</span>
        <strong style="color: #2563eb;">100.0 คะแนน</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <span>2. แต้มหักจากเคสเดินตรวจ (${sc.totalDefects} เคส)</span>
        <strong style="color: var(--danger-color);">-${sc.rawPatrolDeductions} แต้ม</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <span>3. แต้มได้รับคืนจากการปิดเคส CAPA (${sc.closedDefects} เคส)</span>
        <strong style="color: var(--success-color);">+${sc.capaBonus} แต้ม (โบนัสคืน 50%)</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <span>4. แต้มหักอุปกรณ์ชำรุด/หมดอายุ Tag 30 วัน (${sc.defectiveEq} ชิ้น)</span>
        <strong style="color: var(--danger-color);">-${sc.eqDeductions} แต้ม</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 6px;">
        <span>5. แต้มหักสุทธิรวมทั้งหมด (Total Deductions)</span>
        <strong style="color: #c62828;">-${sc.pointsDeducted} แต้ม</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px;">
        <span>6. ปริมาณงานทั้งหมด (${sc.totalEq} อุปกรณ์ + ${sc.totalDefects} เคสตรวจ)</span>
        <strong style="color: var(--primary-color);">${sc.effectiveVolume} หน่วยงาน</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
        <span>7. อัตราความผิดต่อหน่วยงาน (${sc.pointsDeducted} ÷ ${sc.effectiveVolume})</span>
        <strong>${sc.violationDensity.toFixed(3)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 6px; margin-top: 4px;">
        <span style="font-weight: bold; color: #2e7d32;">คะแนนคงเหลือสุทธิ = 100 - (${sc.violationDensity.toFixed(3)} × 10)</span>
        <strong style="font-size: 16px; color: #2e7d32;">${sc.finalScore} คะแนน</strong>
      </div>
    `;
  }

  openModal('score-formula-modal');
}


// 5. ข้อมูลจำลองผู้รับผิดชอบแต่ละพื้นที่ (สำหรับโหมดออฟไลน์ / ค่าเริ่มต้น)
const DEFAULT_AREA_MAPPING = [
  { 'พื้นที่ปฏิบัติงาน': 'โรงกลั่น 1', 'แผนกที่รับผิดชอบ': 'แผนกผลิตโรงกลั่น', 'เจ้าของพื้นที่': 'นายสมชาย (เจ้าของพื้นที่)', 'อีเมลเจ้าของพื้นที่': 'somchai@tvo.co.th', 'ผู้ควบคุมงานโครงการ': 'แผนกโครงการ', 'อีเมลผู้ควบคุมโครงการ': 'project@tvo.co.th' },
  { 'พื้นที่ปฏิบัติงาน': 'โรงกลั่น 2', 'แผนกที่รับผิดชอบ': 'แผนกผลิตโรงกลั่น', 'เจ้าของพื้นที่': 'นายสมชาย (เจ้าของพื้นที่)', 'อีเมลเจ้าของพื้นที่': 'somchai@tvo.co.th', 'ผู้ควบคุมงานโครงการ': 'แผนกโครงการ', 'อีเมลผู้ควบคุมโครงการ': 'project@tvo.co.th' },
  { 'พื้นที่ปฏิบัติงาน': 'โรงสกัด 1', 'แผนกที่รับผิดชอบ': 'แผนกผลิตโรงสกัด', 'เจ้าของพื้นที่': 'นายวิชัย (เจ้าของพื้นที่)', 'อีเมลเจ้าของพื้นที่': 'wichai@tvo.co.th', 'ผู้ควบคุมงานโครงการ': 'แผนกพัฒนากระบวนการผลิต', 'อีเมลผู้ควบคุมโครงการ': 'process@tvo.co.th' },
  { 'พื้นที่ปฏิบัติงาน': 'คลังสินค้า A', 'แผนกที่รับผิดชอบ': 'แผนกคลังสินค้า', 'เจ้าของพื้นที่': 'นายก้าวหน้า (เจ้าของพื้นที่)', 'อีเมลเจ้าของพื้นที่': 'kaowna@tvo.co.th', 'ผู้ควบคุมงานโครงการ': 'แผนกโครงการ', 'อีเมลผู้ควบคุมโครงการ': 'project@tvo.co.th' }
];

// โครงสร้างตัวแปรเก็บสถานะแอพ (Application State)
let appState = {
  contractors: [],
  equipment: [],
  patrolLogs: [],
  eqTypes: [],
  defectTypes: [],
  areaMapping: [],
  inspectionLogs: []
};

// ตัวแปรเก็บกราฟของ ChartJS เพื่อใช้ทำลายทิ้งก่อนเขียนทับใหม่ป้องกันภาพทับซ้อน
let charts = {
  contractors: null,
  severity: null,
  zones: null
};

// --- จุดเริ่มต้นการรันระบบ (App Setup) ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupMobileToggle();
  setupThemeToggle();
  initLocalStorageSetup();
  loadData();
});

// จัดการหน้าจอย้ายแถบเมนู (Sidebar Navigation)
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-target');
      switchPanel(targetPanel);
    });
  });
}

function switchPanel(targetPanelId) {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.module-panel');
  
  navItems.forEach(nav => {
    if (nav.getAttribute('data-target') === targetPanelId) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  panels.forEach(panel => {
    if (panel.id === targetPanelId) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  updateHeaderTitle(targetPanelId);

  if (targetPanelId === 'dashboard-panel') {
    renderDashboardCharts();
  }

  if (window.innerWidth <= 900) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

function updateHeaderTitle(panelId) {
  const titleMap = {
    'dashboard-panel': { title: 'แดชบอร์ดภาพรวม', sub: 'สรุปสถิติความปลอดภัยและข้อมูลผู้รับเหมา' },
    'contractor-panel': { title: 'จัดการข้อมูลผู้รับเหมา', sub: 'ขึ้นทะเบียน เพิ่ม ลบ แก้ไข รายชื่อบริษัทและสิทธิ์ผู้รับเหมา' },
    'equipment-panel': { title: 'ขึ้นทะเบียนและตรวจสอบอุปกรณ์', sub: 'พิมพ์ป้าย QR Code ตรวจสอบอุปกรณ์อิงตามรหัสสีประจำเดือน' },
    'patrol-panel': { title: 'ระบบเดินตรวจความปลอดภัยและ CAPA', sub: 'บันทึก Unsafe Act / Condition ติดตามเคสที่คงค้างสะสม' },
    'training-panel': { title: 'สถานะอบรมและอนุมัติบัตร JUST ID', sub: 'รายงานการเข้าอบรมความปลอดภัยและระบบบัตรประจำตัวผู้รับเหมา' },
    'reports-panel': { title: 'รายงานและส่งออกสถิติ', sub: 'กรองข้อมูลและส่งออกตารางข้อมูลเป็น Excel / PDF' }
  };
  
  const header = titleMap[panelId] || { title: 'ระบบจัดการผู้รับเหมา', sub: '' };
  document.getElementById('panel-title').innerText = header.title;
  document.getElementById('panel-subtitle').innerText = header.sub;
}

// ควบคุมการเปิดปิดเมนูในมือถือ
function setupMobileToggle() {
  const btn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  
  btn.addEventListener('click', (e) => {
    sidebar.classList.toggle('open');
    e.stopPropagation();
  });
  
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btn) {
      sidebar.classList.remove('open');
    }
  });
}

// ควบคุมการเปลี่ยนธีม มืด/สว่าง
function setupThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
  
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    if (isDark) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    // รีเรนเดอร์ชาร์ตเพื่ออัปเดตสีตัวหนังสือ
    renderDashboardCharts();
    if (document.getElementById('training-panel') && document.getElementById('training-panel').classList.contains('active')) {
      renderTrainingCharts();
    }
  });
}

// ตั้งค่าข้อมูลเริ่มต้นในเครื่องเพื่อความพร้อมใช้งานแบบออฟไลน์
function initLocalStorageSetup() {
  if (!localStorage.getItem('eqTypes')) {
    localStorage.setItem('eqTypes', JSON.stringify(DEFAULT_EQ_TYPES));
  }
  if (!localStorage.getItem('defectTypes')) {
    localStorage.setItem('defectTypes', JSON.stringify(DEFAULT_DEFECT_TYPES));
  }
  
  appState.eqTypes = JSON.parse(localStorage.getItem('eqTypes'));
  appState.defectTypes = JSON.parse(localStorage.getItem('defectTypes'));
  
  // นำข้อมูลเข้าตัวเลือก Dropdown
  renderFormDropdowns();
}

function renderFormDropdowns() {
  // ดึงค่า config แบบไดนามิกถ้าข้อมูลจาก Sheets เข้ามาแล้ว
  if (appState.areaMapping && appState.areaMapping.length > 0) {
    const configEqTypes = [...new Set(appState.areaMapping.map(item => item['ประเภทเครื่องมือช่าง']).filter(Boolean))];
    if (configEqTypes.length > 0) appState.eqTypes = configEqTypes;

    const configDefectTypes = [...new Set(appState.areaMapping.map(item => item['ประเภทข้อบกพร่องความปลอดภัย']).filter(Boolean))];
    if (configDefectTypes.length > 0) appState.defectTypes = configDefectTypes;

    // สกัดระดับความรุนแรงและคะแนนหักแบบไดนามิกจาก Config Sheet (รองรับทั้งแมปเป็นรายข้อบกพร่อง และตารางแมปเกรด A/B/C ใน Column N & O)
    appState.areaMapping.forEach(item => {
      const defectName = item['ประเภทข้อบกพร่องความปลอดภัย'];
      const sev = item['ระดับความรุนแรงข้อบกพร่อง'] || item['ระดับความรุนแรง'] || item['ระดับ (A/B/C)'] || item['ระดับ'];
      const pts = item['คะแนนหักข้อบกพร่อง'] || item['คะแนนหัก'] || item['แต้มหัก'];
      
      // แมปเกรด (เช่น A, B, C, D...) กับคะแนนหักจาก Column N & O แบบไดนามิก 100%
      if (sev && pts && !isNaN(parseInt(pts))) {
        const cleanGrade = String(sev).trim().toUpperCase();
        if (cleanGrade && cleanGrade.length <= 5) {
          const mappedKey = (cleanGrade === 'สูง' ? 'A' : (cleanGrade === 'กลาง' ? 'B' : (cleanGrade === 'ต่ำ' ? 'C' : cleanGrade)));
          DEFECT_POINTS_MAP[mappedKey] = parseInt(pts);
        }
      }

      // แมปรายข้อบกพร่องกับระดับความรุนแรง
      if (defectName && String(defectName).trim()) {
        const cleanName = String(defectName).trim();
        if (sev && String(sev).trim() && String(sev).trim().length <= 3) {
          DEFECT_SEVERITY_MAP[cleanName] = String(sev).trim().toUpperCase();
        }
        if (pts && !isNaN(parseInt(pts)) && defectName) {
          DEFECT_POINTS_MAP[cleanName] = parseInt(pts);
        }
      }
    });

    // สกัด PIN จป. แต่ละคน และ Admin PIN จาก Config
    appState.inspectorPins = {};
    appState.areaMapping.forEach(item => {
      const name = item['รายชื่อ จป.ผู้ตรวจ'] || item['รายชื่อ จป. ผู้ตรวจ'];
      const pin = item['รหัส PIN'] || item['PIN'];
      if (name && pin) {
        appState.inspectorPins[String(name).trim()] = String(pin).trim();
      }
      if (item['Admin PIN']) {
        appState.adminPin = String(item['Admin PIN']).trim();
      }
    });

    // สกัด Site โรงงานจาก Column L
    const sites = [...new Set(appState.areaMapping.map(item => item['Site โรงงาน'] || item['Site'] || item['โรงงาน']).filter(Boolean))];
    if (sites.length > 0) {
      appState.sites = sites;
    } else {
      appState.sites = ['โรงงาน 1', 'โรงงาน 2', 'โรงงาน 3'];
    }
  } else {
    appState.sites = ['โรงงาน 1', 'โรงงาน 2', 'โรงงาน 3'];
  }

  // 1. Dropdown ชื่ออุปกรณ์
  const eqSelect = document.getElementById('eq-name');
  if (eqSelect) {
    eqSelect.innerHTML = appState.eqTypes.map(type => `<option value="${type}">${type}</option>`).join('');
  }
  
  // 2. Dropdown ประเภทข้อบกพร่อง
  const defectSelect = document.getElementById('p-defect');
  if (defectSelect) {
    defectSelect.innerHTML = '<option value="">-- เลือกข้อบกพร่องความปลอดภัย --</option>' + 
      appState.defectTypes.map(type => `<option value="${type}">${type}</option>`).join('');
  }

  // 3. Dropdown จป. ผู้ตรวจ
  const inspectorSelect = document.getElementById('p-inspector');
  if (inspectorSelect && appState.areaMapping && appState.areaMapping.length > 0) {
    const inspectors = [...new Set(appState.areaMapping.map(item => item['รายชื่อ จป.ผู้ตรวจ'] || item['รายชื่อ จป. ผู้ตรวจ']).filter(Boolean))];
    inspectorSelect.innerHTML = '<option value="">-- เลือก จป. ผู้ตรวจ --</option>' + 
      inspectors.map(name => `<option value="${name}">${name}</option>`).join('');
  }

  // 4. Dropdown แผนกที่รับผิดชอบ
  const deptSelect = document.getElementById('p-dept');
  if (deptSelect && appState.areaMapping && appState.areaMapping.length > 0) {
    const depts = [...new Set(appState.areaMapping.map(item => item['แผนกที่รับผิดชอบ']).filter(Boolean))];
    deptSelect.innerHTML = '<option value="">-- เลือกแผนกที่รับผิดชอบ --</option>' + 
      depts.map(name => `<option value="${name}">${name}</option>`).join('');
  }

  // 5. Dropdown ประเภทอุปกรณ์ PPE ที่ส่งตรวจ
  const ppeSelect = document.getElementById('ppe-type');
  if (ppeSelect && appState.areaMapping && appState.areaMapping.length > 0) {
    const ppeTypes = [...new Set(appState.areaMapping.map(item => item['ประเภทอุปกรณ์ PPE']).filter(Boolean))];
    ppeSelect.innerHTML = '<option value="">-- เลือกประเภทอุปกรณ์ PPE --</option>' + 
      ppeTypes.map(name => `<option value="${name}">${name}</option>`).join('');
  }

  // 6. Dropdown Site โรงงาน (Dashboard Filter & Equipment Registration)
  const siteFilterSelect = document.getElementById('dashboard-site-filter');
  if (siteFilterSelect && appState.sites) {
    const currentVal = siteFilterSelect.value || 'ALL';
    siteFilterSelect.innerHTML = '<option value="ALL">-- แสดงทุก Site / โรงงาน --</option>' +
      appState.sites.map(s => `<option value="${s}">${s}</option>`).join('');
    siteFilterSelect.value = currentVal;
  }

  const eqSiteSelect = document.getElementById('eq-site');
  if (eqSiteSelect && appState.sites) {
    eqSiteSelect.innerHTML = appState.sites.map(s => `<option value="${s}">${s}</option>`).join('');
  }

  // 7. Dropdown ผู้ดำเนินการ PIN Modal
  const pinInspectorSelect = document.getElementById('pin-inspector-select');
  if (pinInspectorSelect && appState.areaMapping) {
    const inspectors = [...new Set(appState.areaMapping.map(item => item['รายชื่อ จป.ผู้ตรวจ'] || item['รายชื่อ จป. ผู้ตรวจ']).filter(Boolean))];
    pinInspectorSelect.innerHTML = '<option value="">-- เลือก จป. ผู้ตรวจ หรือ Admin --</option>' +
      '<option value="ADMIN">🔐 Admin System</option>' +
      inspectors.map(name => `<option value="${name}">${name}</option>`).join('');
  }
}

// --- ดึงข้อมูลจากเซิร์ฟเวอร์หรือเครื่องโลคอล (Cache-First Instant Load) ---
async function loadData() {
  // 1. โหลดแคชจากเครื่องแสดงผลทันทีภายใน 0.05 วินาที (ไม่ต้องรอมือถือดาวน์โหลดเสร็จ)
  loadLocalCache();
  const hasCache = appState.contractors.length > 0 || appState.equipment.length > 0 || appState.patrolLogs.length > 0;
  if (hasCache) {
    updateUiAfterLoad();
    showConnectionStatus('loading');
  } else {
    showConnectionStatus('loading');
  }

  // 2. ดึงข้อมูลอัปเดตล่าสุดจาก Google Sheets เบื้องหลัง (Background Sync)
  if (SCRIPT_URL) {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getData`);
      const resData = await response.json();
      
      if (resData.status === 'success') {
        appState.contractors = resData.data.contractors || [];
        appState.equipment = resData.data.equipment || [];
        appState.patrolLogs = resData.data.patrolLogs || [];
        appState.areaMapping = resData.data.areaMapping || [];
        appState.inspectionLogs = resData.data.inspectionLogs || [];
        
        // บันทึกแคชในเครื่องอัปเดตเวอร์ชันล่าสุด
        localStorage.setItem('cached_contractors', JSON.stringify(appState.contractors));
        localStorage.setItem('cached_equipment', JSON.stringify(appState.equipment));
        localStorage.setItem('cached_patrolLogs', JSON.stringify(appState.patrolLogs));
        localStorage.setItem('cached_areaMapping', JSON.stringify(appState.areaMapping));
        localStorage.setItem('cached_inspectionLogs', JSON.stringify(appState.inspectionLogs));
        
        showConnectionStatus('success');
        updateUiAfterLoad();
      } else {
        throw new Error('Server returned failed status');
      }
    } catch (error) {
      console.error('Error fetching online data, maintaining cache:', error);
      if (!hasCache) loadLocalCache();
      showConnectionStatus('warning');
      updateUiAfterLoad();
    }
  } else {
    // โหลดออฟไลน์เพียวๆ
    if (!hasCache) loadLocalCache();
    showConnectionStatus('local');
    updateUiAfterLoad();
  }
}

function loadLocalCache() {
  appState.contractors = JSON.parse(localStorage.getItem('cached_contractors')) || [];
  appState.equipment = JSON.parse(localStorage.getItem('cached_equipment')) || [];
  appState.patrolLogs = JSON.parse(localStorage.getItem('cached_patrolLogs')) || [];
  appState.areaMapping = JSON.parse(localStorage.getItem('cached_areaMapping')) || DEFAULT_AREA_MAPPING;
  appState.inspectionLogs = JSON.parse(localStorage.getItem('cached_inspectionLogs')) || [];
}

function showConnectionStatus(state) {
  const statusContainer = document.getElementById('connection-status');
  if (!statusContainer) return;
  
  if (state === 'loading') {
    statusContainer.innerHTML = '<span style="color: #78909c;"><i class="fa-solid fa-circle-notch fa-spin"></i> กำลังเชื่อมต่อระบบชีต...</span>';
  } else if (state === 'success') {
    statusContainer.innerHTML = '<span style="color: var(--success-color);"><i class="fa-solid fa-cloud-arrow-up"></i> เชื่อมต่อ Google Sheets แล้ว</span>';
  } else if (state === 'warning') {
    statusContainer.innerHTML = '<span style="color: var(--warning-color);"><i class="fa-solid fa-triangle-exclamation"></i> เน็ตมีปัญหา (รันโหมดแคชออฟไลน์)</span>';
  } else if (state === 'local') {
    statusContainer.innerHTML = '<span style="color: #546e7a;"><i class="fa-solid fa-database"></i> รันโหมดตัวจำลอง (ไม่มีลิงก์ Web App)</span>';
  }
}

function updateUiAfterLoad() {
  renderFormDropdowns();
  updateDashboardKpis();
  renderDashboardCharts();
  renderContractorsTable();
  renderEquipmentTable();
  renderAuditLogsTable();
  renderPpeLogsTable();
  renderPatrolLogsTable();
  setupSearchFilters();
  
  // อัปเดตตัวกรองหน้าของรายงานสถิติด้วย
  renderReportFilterOptions();
  generateReportPreview(); // พรีวิวตารางเบื้องต้น
  
  // ตรวจจับพารามิเตอร์ซีเรียลใน URL เพื่อทำการตรวจสอบสถานะด่วนอัตโนมัติ
  checkUrlParamsForLookup();
}

// จัดเก็บข้อมูลไปยัง Sheets (หรือเซฟลง LocalStorage)
async function sendActionToServer(action, payload) {
  showConnectionStatus('loading');
  const requestBody = { action: action, ...payload };
  
  if (SCRIPT_URL) {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // โหมดไม่รับข้อมูลตอบกลับกรณีแอปสคริปต์บล็อก CORS
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      // การกด no-cors จะรับผลไม่ค่อยได้ เราจะสั่งรีโหลดข้อมูลหลังบันทึก 1 วินาที
      setTimeout(() => {
        loadData();
      }, 1500);
      
      return true;
    } catch (error) {
      console.error('Server sync error:', error);
      // ทำการบันทึกโลคอลทดแทนกรณีเน็ตมีปัญหา
      saveLocalAction(action, payload);
      return false;
    }
  } else {
    // เซฟจำลองในเครื่อง
    saveLocalAction(action, payload);
    setTimeout(() => { loadData(); }, 300);
    return true;
  }
}

// ระบบบันทึกสำรองในเครื่อง (Local Storage Emulator)
function saveLocalAction(action, payload) {
  let cacheName = '';
  if (action === 'addContractor') {
    const list = JSON.parse(localStorage.getItem('cached_contractors')) || [];
    // เช็กทับซ้ำ
    const index = list.findIndex(c => c['ชื่อบริษัท'] === payload.companyName);
    if (index > -1) {
      list[index]['ทำงานพื้นที่'] = payload.area;
      list[index]['ผู้ควบคุมงาน'] = payload.supervisor;
      list[index]['Email'] = payload.email;
      list[index]['สถานะ'] = payload.status || 'ใช้งานอยู่';
    } else {
      list.push({
        'ชื่อบริษัท': payload.companyName,
        'ทำงานพื้นที่': payload.area,
        'ผู้ควบคุมงาน': payload.supervisor,
        'Email': payload.email,
        'สถานะ': payload.status || 'ใช้งานอยู่'
      });
    }
    localStorage.setItem('cached_contractors', JSON.stringify(list));
    
  } else if (action === 'updateContractor') {
    const list = JSON.parse(localStorage.getItem('cached_contractors')) || [];
    const index = list.findIndex(c => c['ชื่อบริษัท'] === payload.companyName);
    if (index > -1) {
      list[index]['ทำงานพื้นที่'] = payload.area;
      list[index]['ผู้ควบคุมงาน'] = payload.supervisor;
      list[index]['Email'] = payload.email;
      list[index]['สถานะ'] = payload.status;
      localStorage.setItem('cached_contractors', JSON.stringify(list));
    }
    
  } else if (action === 'addEquipment') {
    const list = JSON.parse(localStorage.getItem('cached_equipment')) || [];
    list.push({
      'ID': 'EQ-' + Math.floor(Math.random()*100000),
      'ชื่ออุปกรณ์': payload.equipmentName,
      'หมายเลขซีเรียล': payload.serialNumber,
      'บริษัทผู้รับเหมา': payload.contractor,
      'พื้นที่ใช้งาน': payload.area,
      'วันที่ตรวจสอบ': payload.inspectionDate,
      'วันหมดอายุ Tag': payload.expiryDate,
      'สีป้ายประจำเดือน': payload.monthlyColor,
      'รูปภาพอุปกรณ์': payload.equipmentImage || payload['รูปภาพอุปกรณ์'] || ''
    });
    localStorage.setItem('cached_equipment', JSON.stringify(list));
    
  } else if (action === 'addInspectionLog') {
    const list = JSON.parse(localStorage.getItem('cached_inspectionLogs')) || [];
    list.push({
      'ID': 'AUD-' + Math.floor(Math.random()*100000),
      'วันที่': payload.date,
      'บริษัทผู้รับเหมา': payload.contractor,
      'จำนวนส่งตรวจทั้งหมด': payload.totalCount,
      'ผ่านการตรวจ': payload.passCount,
      'ไม่ผ่าน': payload.failCount,
      'สาเหตุที่ไม่ผ่าน/หมายเหตุ': payload.notes || '-',
      'ประเภทอุปกรณ์ PPE': payload.type || '-',
      'หมวดหมู่': payload.category || 'เครื่องมือช่าง'
    });
    localStorage.setItem('cached_inspectionLogs', JSON.stringify(list));
    
  } else if (action === 'addPatrolLog') {
    const list = JSON.parse(localStorage.getItem('cached_patrolLogs')) || [];
    list.push({
      'ID': 'PAT-' + Math.floor(Math.random()*100000),
      'วันที่': payload.date,
      'ผู้รับเหมา': payload.contractor,
      'พื้นที่': payload.area,
      'ข้อบกพร่อง': payload.defectType,
      'ระดับความรุนแรง': payload.severity,
      'ภาพ Before': payload.beforeImage || '',
      'ภาพ After': '',
      'สถานะ CAPA': payload.capaStatus,
      'รายละเอียด': payload.details || '',
      'ผู้ตรวจสอบ': payload.inspector || '-',
      'สถานะการส่งอีเมล': 'ยังไม่ได้ส่ง',
      'แผนกที่รับผิดชอบ': payload.department || '-'
    });
    localStorage.setItem('cached_patrolLogs', JSON.stringify(list));
    
  } else if (action === 'updatePatrolLog') {
    const list = JSON.parse(localStorage.getItem('cached_patrolLogs')) || [];
    const index = list.findIndex(l => l['ID'] === payload.id);
    if (index > -1) {
      list[index]['สถานะ CAPA'] = payload.capaStatus;
      if (payload.afterImage) {
        list[index]['ภาพ After'] = payload.afterImage;
      }
      localStorage.setItem('cached_patrolLogs', JSON.stringify(list));
    }
  } else if (action === 'deleteContractor') {
    let list = JSON.parse(localStorage.getItem('cached_contractors')) || [];
    list = list.filter(c => c['ชื่อบริษัท'] !== payload.targetId && c['ชื่อบริษัท'] !== payload.companyName);
    localStorage.setItem('cached_contractors', JSON.stringify(list));
  } else if (action === 'deleteEquipment') {
    let list = JSON.parse(localStorage.getItem('cached_equipment')) || [];
    list = list.filter(e => e['ID'] !== payload.targetId && e['ID'] !== payload.id);
    localStorage.setItem('cached_equipment', JSON.stringify(list));
  } else if (action === 'bulkDeleteEquipment') {
    let list = JSON.parse(localStorage.getItem('cached_equipment')) || [];
    const ids = (payload.targetId || '').split(',');
    list = list.filter(e => !ids.includes(e['ID']));
    localStorage.setItem('cached_equipment', JSON.stringify(list));
  } else if (action === 'deletePatrolLog') {
    let list = JSON.parse(localStorage.getItem('cached_patrolLogs')) || [];
    list = list.filter(l => l['ID'] !== payload.targetId && l['ID'] !== payload.id);
    localStorage.setItem('cached_patrolLogs', JSON.stringify(list));
  } else if (action === 'deleteInspectionLog') {
    let list = JSON.parse(localStorage.getItem('cached_inspectionLogs')) || [];
    list = list.filter(l => l['ID'] !== payload.targetId && l['ID'] !== payload.id);
    localStorage.setItem('cached_inspectionLogs', JSON.stringify(list));
  }
}

function openModal(id) {
  document.getElementById(id).style.display = 'flex';
  
  // ตั้งค่าค่าเริ่มต้นสำหรับแบบฟอร์มหากเปิดเพิ่มอุปกรณ์/ตรวจความปลอดภัย
  if (id === 'add-equipment-modal') {
    // ปรับ Dropdown ผู้รับเหมา เฉพาะรายที่ใช้งานอยู่
    const activeContractors = appState.contractors.filter(c => c['สถานะ'] === 'ใช้งานอยู่');
    document.getElementById('eq-contractor').innerHTML = activeContractors.length > 0 
      ? activeContractors.map(c => `<option value="${c['ชื่อบริษัท']}">${c['ชื่อบริษัท']}</option>`).join('')
      : '<option value="">-- ไม่มีผู้รับเหมาเปิดใช้ --</option>';
    
    // ตั้งค่าฟังก์ชันคำนวณวันเวลากลางและพื้นที่อัตโนมัติ
    document.getElementById('eq-date').valueAsDate = new Date();
    calculateExpiry();
    updateEquipmentAreas();
    
    // รีเซ็ตรูปภาพของอุปกรณ์
    const eqPreview = document.getElementById('eq-preview');
    if (eqPreview) {
      eqPreview.style.display = 'none';
      eqPreview.src = '';
    }
    const eqBase64 = document.getElementById('eq-base64');
    if (eqBase64) {
      eqBase64.value = '';
    }
  }
  
  if (id === 'add-patrol-modal') {
    document.getElementById('p-date').valueAsDate = new Date();
    
    // อัปเดต Dropdown Site โรงงาน
    const pSiteSelect = document.getElementById('p-site');
    if (pSiteSelect && appState.sites) {
      pSiteSelect.innerHTML = appState.sites.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // อัปเดตDropdownผู้รับเหมาในเดินตรวจ
    const activeContractors = appState.contractors.filter(c => c['สถานะ'] === 'ใช้งานอยู่');
    document.getElementById('p-contractor').innerHTML = '<option value="">-- เลือกบริษัทผู้รับเหมา --</option>' +
      activeContractors.map(c => `<option value="${c['ชื่อบริษัท']}">${c['ชื่อบริษัท']}</option>`).join('');
    
    // อัปเดตDropdownพื้นที่ตรวจด้วย
    updatePatrolAreas();
    
    // เติม Dropdown ผู้ควบคุมงานโครงการ (Project Supervisor) จาก Config Column E
    const supervisors = [...new Set(appState.areaMapping.map(item => 
      item['ผู้ควบคุมงานโครงการ'] || item['ชื่อ-นามสกุล ผู้ควบคุมงาน'] || item['ผู้ควบคุมงาน'] || item['ชื่อผู้ควบคุมงาน'] || item['Project Supervisor'] || item['Supervisor']
    ).filter(Boolean))];
    document.getElementById('p-project-supervisor').innerHTML = '<option value="">-- เลือกผู้ควบคุมงานโครงการ --</option>' +
      supervisors.map(name => `<option value="${name}">${name}</option>`).join('');
    
    // ล้างค่าฟิลด์แผนกอัตโนมัติ
    document.getElementById('p-dept').value = '';
    
    // รีเซ็ตตัวแสดงผลข้อมูลผู้รับผิดชอบในฟอร์ม
    const infoDiv = document.getElementById('p-responsible-info');
    if (infoDiv) infoDiv.style.display = 'none';
    
    // รีเซ็ตแบบฟอร์มรูปภาพ
    document.getElementById('p-before-preview').style.display = 'none';
    document.getElementById('p-before-preview').src = '';
    document.getElementById('p-before-base64').value = '';
    document.getElementById('p-details').value = '';
    document.getElementById('p-qr-scan').value = '';
  }
  
  if (id === 'add-daily-audit-modal') {
    document.getElementById('audit-date').valueAsDate = new Date();
    
    // อัปเดต Dropdown ผู้รับเหมา
    const activeContractors = appState.contractors.filter(c => c['สถานะ'] === 'ใช้งานอยู่');
    document.getElementById('audit-contractor').innerHTML = activeContractors.length > 0 
      ? activeContractors.map(c => `<option value="${c['ชื่อบริษัท']}">${c['ชื่อบริษัท']}</option>`).join('')
      : '<option value="">-- ไม่มีผู้รับเหมาเปิดใช้ --</option>';
      
    document.getElementById('audit-total').value = '';
    document.getElementById('audit-pass').value = '';
    document.getElementById('audit-fail-label').innerText = '0';
    document.getElementById('audit-fail').value = '0';
    document.getElementById('audit-notes').value = '';
  }
  
  if (id === 'add-ppe-audit-modal') {
    document.getElementById('ppe-date').valueAsDate = new Date();
    
    // อัปเดต Dropdown ผู้รับเหมา
    const activeContractors = appState.contractors.filter(c => c['สถานะ'] === 'ใช้งานอยู่');
    document.getElementById('ppe-contractor').innerHTML = activeContractors.length > 0 
      ? activeContractors.map(c => `<option value="${c['ชื่อบริษัท']}">${c['ชื่อบริษัท']}</option>`).join('')
      : '<option value="">-- ไม่มีผู้รับเหมาเปิดใช้ --</option>';
      
    document.getElementById('ppe-total').value = '';
    document.getElementById('ppe-pass').value = '';
    document.getElementById('ppe-fail-label').innerText = '0';
    document.getElementById('ppe-fail').value = '0';
    document.getElementById('ppe-notes').value = '';
  }
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// อัปเดตพื้นที่ปฏิบัติงานสำหรับลงทะเบียนเครื่องมือจากแผนผัง AreaMapping
function updateEquipmentAreas() {
  const selectArea = document.getElementById('eq-area');
  if (appState.areaMapping && appState.areaMapping.length > 0) {
    selectArea.innerHTML = appState.areaMapping.map(item => {
      const area = item['พื้นที่ปฏิบัติงาน'];
      return `<option value="${area}">${area}</option>`;
    }).join('');
  } else {
    selectArea.innerHTML = '<option value="">-- ทั่วไป --</option>';
  }
}

// อัปเดตพื้นที่ปฏิบัติงานสำหรับบันทึกความปลอดภัยจากแผนผัง AreaMapping
function updatePatrolAreas() {
  const selectArea = document.getElementById('p-area');
  if (appState.areaMapping && appState.areaMapping.length > 0) {
    selectArea.innerHTML = '<option value="">-- เลือกพื้นที่ปฏิบัติงาน --</option>' +
      appState.areaMapping.map(item => {
        const area = item['พื้นที่ปฏิบัติงาน'];
        return `<option value="${area}">${area}</option>`;
      }).join('');
  } else {
    selectArea.innerHTML = '<option value="">-- ทั่วไป --</option>';
  }
}

// --- ระบบประมวลผลคำนวณวันหมดอายุและสีประจำเดือน ---
function calculateExpiry() {
  const dateInput = document.getElementById('eq-date').value;
  if (!dateInput) return;
  
  const inspDate = new Date(dateInput);
  
  // 1. วันหมดอายุสะสม 30 วัน
  const expiryDate = new Date(inspDate);
  expiryDate.setDate(inspDate.getDate() + 30);
  
  // แสดงผลใส่วันที่
  document.getElementById('eq-expiry').value = expiryDate.toISOString().split('T')[0];
  
  // 2. คำนวณสีป้ายสติกเกอร์ประจำเดือนจากเดือนที่ตรวจ (0-11)
  const month = inspDate.getMonth();
  const colorObj = MONTHLY_COLORS[month];
  
  const textLabel = document.getElementById('eq-color-name');
  const dot = document.getElementById('eq-color-dot');
  
  if (textLabel && dot && colorObj) {
    textLabel.innerText = colorObj.name;
    dot.style.backgroundColor = colorObj.color;
  }
}

// --- บันทึกแบบฟอร์มต่าง ๆ ---

// 1. บันทึกเพิ่ม/แก้ไข ผู้รับเหมา
async function saveContractor(e) {
  e.preventDefault();
  const company = document.getElementById('c-company-name').value.trim();
  const area = document.getElementById('c-area').value.trim();
  const supervisor = document.getElementById('c-supervisor').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const status = document.getElementById('c-status').value;
  
  // ตรวจเช็กว่าเป็นเคสอัปเดตหรือเพิ่มใหม่
  const isEdit = document.getElementById('contractor-modal-title').innerText === 'แก้ไขข้อมูลผู้รับเหมา';
  const action = isEdit ? 'updateContractor' : 'addContractor';
  
  const payload = {
    companyName: company,
    area: area,
    supervisor: supervisor,
    email: email,
    status: status
  };
  
  closeModal('add-contractor-modal');
  const success = await sendActionToServer(action, payload);
  if (success) {
    document.getElementById('contractor-form').reset();
  }
}

// 1.5 เปิด Modal ขึ้นทะเบียนใหม่อัตโนมัติ (Pre-fill สำหรับอุปกรณ์ที่หมดอายุ)
function quickReRegisterEquipment(serial, name, contractor, site, area) {
  openModal('add-equipment-modal');
  
  if (name && document.getElementById('eq-name')) document.getElementById('eq-name').value = name;
  if (serial && document.getElementById('eq-serial')) document.getElementById('eq-serial').value = serial;
  if (contractor && document.getElementById('eq-contractor')) document.getElementById('eq-contractor').value = contractor;
  if (site && document.getElementById('eq-site')) document.getElementById('eq-site').value = site;
  if (area && document.getElementById('eq-area')) document.getElementById('eq-area').value = area;

  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + 30);
  const expiryIso = expiryDate.toISOString().split('T')[0];

  if (document.getElementById('eq-date')) document.getElementById('eq-date').value = todayIso;
  if (document.getElementById('eq-expiry')) document.getElementById('eq-expiry').value = expiryIso;
  
  const monthColorObj = MONTHLY_COLORS[today.getMonth()];
  const colorName = monthColorObj ? monthColorObj.name : '-';
  if (document.getElementById('eq-color-name')) document.getElementById('eq-color-name').innerText = colorName;
  if (document.getElementById('eq-color-badge')) {
    document.getElementById('eq-color-badge').style.backgroundColor = monthColorObj ? monthColorObj.color : '#666';
  }
}

// 2. บันทึกเพิ่มอุปกรณ์
async function saveEquipment(e) {
  e.preventDefault();
  const name = document.getElementById('eq-name').value;
  const serial = document.getElementById('eq-serial').value.trim();
  const contractor = document.getElementById('eq-contractor').value;
  const site = document.getElementById('eq-site') ? document.getElementById('eq-site').value : '';
  const area = document.getElementById('eq-area').value;
  const date = document.getElementById('eq-date').value;
  const expiry = document.getElementById('eq-expiry').value;
  const color = document.getElementById('eq-color-name').innerText;
  const imgBase64 = document.getElementById('eq-base64').value;

  // บล็อกไม่ให้ขึ้นทะเบียนใหม่หากหมายเลขซีเรียลนี้ยังมีเคส CAPA ค้างอยู่
  const isPendingCapa = checkEquipmentDefective(serial);
  if (isPendingCapa) {
    alert(`❌ ไม่สามารถขึ้นทะเบียนอุปกรณ์ชิ้นนี้ได้!
----------------------------------
หมายเลขซีเรียล: "${serial}"
สาเหตุ: อุปกรณ์หมายเลขซีเรียลนี้ยังมีประวัติข้อบกพร่องความปลอดภัยคงค้างอยู่ (รอดำเนินการ CAPA)

💡 กรุณาติดตามการแนบรูป After เพื่อปิดเคส CAPA ในเมนูเดินตรวจความปลอดภัยก่อนนำอุปกรณ์กลับมาขึ้นทะเบียนใหม่ครับ`);
    return;
  }
  
  const payload = {
    equipmentName: name,
    serialNumber: serial,
    contractor: contractor,
    site: site,
    'Site โรงงาน': site,
    area: area,
    inspectionDate: date,
    expiryDate: expiry,
    monthlyColor: color,
    equipmentImage: imgBase64,
    'รูปภาพอุปกรณ์': imgBase64
  };
  
  closeModal('add-equipment-modal');
  const success = await sendActionToServer('addEquipment', payload);
  if (success) {
    document.getElementById('equipment-form').reset();
    const eqPreview = document.getElementById('eq-preview');
    if (eqPreview) {
      eqPreview.style.display = 'none';
      eqPreview.src = '';
    }
    document.getElementById('eq-base64').value = '';
  }
}

// 3. บันทึกการเดินตรวจความปลอดภัย
async function savePatrol(e) {
  e.preventDefault();
  const date = document.getElementById('p-date').value;
  const inspector = document.getElementById('p-inspector').value;
  const contractor = document.getElementById('p-contractor').value;
  const site = document.getElementById('p-site') ? document.getElementById('p-site').value : '';
  const area = document.getElementById('p-area').value;
  const projectSupervisor = document.getElementById('p-project-supervisor').value;
  const defect = document.getElementById('p-defect').value;
  const severity = document.getElementById('p-severity').value;
  const beforeImage = document.getElementById('p-before-base64').value;
  const capaToggle = document.getElementById('p-capa-toggle').checked;
  const details = document.getElementById('p-details').value.trim();
  const qrRef = document.getElementById('p-qr-scan').value.trim();
  
  if (!contractor || !defect) {
    alert('กรุณากรอกข้อมูลผู้รับเหมาและหัวข้อความผิด');
    return;
  }
  
  const capaStatus = capaToggle ? 'รอดำเนินการ CAPA' : 'บันทึกข้อมูล';
  
  const payload = {
    date: date,
    inspector: inspector,
    contractor: contractor,
    site: site,
    'Site โรงงาน': site,
    area: area,
    projectSupervisor: projectSupervisor,
    defectType: defect + (qrRef ? ` (สแกนซีเรียลอุปกรณ์: ${qrRef})` : ''),
    severity: severity,
    beforeImage: beforeImage,
    capaStatus: capaStatus,
    details: details,
    department: document.getElementById('p-dept').value,
    qrRef: qrRef,
    equipmentId: qrRef,
    serialNumber: qrRef
  };

  if (qrRef) {
    const targetEq = (appState.equipment || []).find(e => 
      e['ID'] === qrRef || e['หมายเลขซีเรียล'] === qrRef || (e['ID'] && e['ID'].indexOf(qrRef) !== -1)
    );
    if (targetEq) {
      targetEq['สถานะอุปกรณ์'] = 'ชำรุด';
    }
  }
  
  closeModal('add-patrol-modal');
  const success = await sendActionToServer('addPatrolLog', payload);
  if (success) {
    document.getElementById('patrol-form').reset();
  }
}



// --- ฟังก์ชั่นเสริมช่วยแปลงรูปภาพเป็นข้อมูล Base64 เพื่อยิงขึ้นชีต/เซฟลงเครื่อง ---
function triggerFileInput(fileInputId) {
  document.getElementById(fileInputId).click();
}

function triggerPhotoUpload(baseId) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    const useCamera = confirm("📷 ต้องการถ่ายรูปใหม่ด้วยกล้อง หรือเลือกจากคลังภาพ (Gallery)?\n\n- กด [ ตกลง / OK ] เพื่อเปิดกล้องถ่ายรูปใหม่\n- กด [ ยกเลิก / Cancel ] เพื่อเลือกจากคลังภาพ/แกลเลอรี");
    if (useCamera) {
      const camInput = document.getElementById(baseId + '-camera');
      if (camInput) camInput.click();
    } else {
      const galInput = document.getElementById(baseId + '-gallery');
      if (galInput) galInput.click();
    }
  } else {
    // ในคอมพิวเตอร์ให้เปิดกล่องหาไฟล์ปกติจากเครื่อง
    const galInput = document.getElementById(baseId + '-gallery');
    if (galInput) galInput.click();
  }
}

function handleImageUpload(event, previewId, base64HiddenId) {
  const file = event.target.files[0];
  if (!file) return;
  
  compressImage(file, 1024, 0.75, function(compressedBase64) {
    const preview = document.getElementById(previewId);
    if (preview) {
      preview.src = compressedBase64;
      preview.style.display = 'block';
    }
    const hiddenInput = document.getElementById(base64HiddenId);
    if (hiddenInput) {
      hiddenInput.value = compressedBase64;
    }
  });
}

// --- บันทึกส่งใบงานแก้ไข CAPA ปิดเคส ---
async function submitCapaResolution(e) {
  e.preventDefault();
  const id = document.getElementById('capa-log-id').value;
  const afterImage = document.getElementById('p-after-base64').value;
  
  if (!afterImage) {
    alert('กรุณาอัปโหลดรูปหลักฐานการแก้ไขความปลอดภัย (After Image) ก่อนยืนยันปิดเคส');
    return;
  }
  
  closeModal('capa-action-modal');
  const success = await sendActionToServer('updatePatrolLog', {
    id: id,
    capaStatus: 'ปิดเคสแล้ว',
    afterImage: afterImage
  });
  
  if (success) {
    document.getElementById('capa-form').reset();
    document.getElementById('p-after-preview').style.display = 'none';
  }
}

// --- การเรนเดอร์ตารางข้อมูล (Table Rendering) ---

// 1. เรนเดอร์ตารางผู้รับเหมา (2.1)
function renderContractorsTable() {
  const tbody = document.getElementById('contractor-table-body');
  const mobileCards = document.getElementById('contractor-mobile-cards');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  mobileCards.innerHTML = '';
  
  if (appState.contractors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #78909c;">ไม่มีข้อมูลผู้รับเหมาในขณะนี้</td></tr>';
    return;
  }
  
  appState.contractors.forEach(c => {
    const isInactive = c['สถานะ'] === 'ปิดใช้งาน' || c['สถานะ'] === 'ปิดการใช้งาน';
    const statusClass = isInactive ? 'inactive' : 'active';
    
    // HTML ตารางสำหรับ PC (ซ่อนพื้นที่, ผู้ควบคุม, อีเมล)
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><a href="#" class="company-link" onclick="openContractorProfile('${c['ชื่อบริษัท']}'); event.preventDefault();" style="font-weight: 600; color: var(--primary-color); text-decoration: none;">${c['ชื่อบริษัท']}</a></td>
      <td><span class="status-badge ${statusClass}">${c['สถานะ']}</span></td>
      <td>
        <i class="fa-solid fa-pen-to-square action-icon" onclick="openEditContractor('${c['ชื่อบริษัท']}')" title="แก้ไข"></i>
      </td>
    `;
    tbody.appendChild(tr);
    
    // HTML การ์ดสำหรับจอมือถือ
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.innerHTML = `
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 8px; color: var(--primary-color);" onclick="openContractorProfile('${c['ชื่อบริษัท']}')">${c['ชื่อบริษัท']}</div>
      <div style="font-size: 13px; margin-bottom: 8px;"><strong>สถานะ:</strong> <span class="status-badge ${statusClass}">${c['สถานะ']}</span></div>
      <div style="text-align: right; border-top: 1px solid #eee; padding-top: 8px;">
        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="openEditContractor('${c['ชื่อบริษัท']}')">แก้ไขข้อมูล</button>
      </div>
    `;
    mobileCards.appendChild(card);
  });
}

function openAddContractorModal() {
  document.getElementById('contractor-modal-title').innerText = 'เพิ่มผู้รับเหมาใหม่';
  document.getElementById('c-company-name').value = '';
  document.getElementById('c-company-name').removeAttribute('readonly');
  document.getElementById('c-area').value = '-';
  document.getElementById('c-supervisor').value = '-';
  document.getElementById('c-email').value = 'info@company.com';
  document.getElementById('c-status').value = 'ใช้งานอยู่';
  document.getElementById('c-status-group').style.display = 'block'; // แสดงช่องสถานะให้เลือก
  openModal('add-contractor-modal');
}

function openEditContractor(name) {
  const c = appState.contractors.find(item => item['ชื่อบริษัท'] === name);
  if (!c) return;
  
  document.getElementById('contractor-modal-title').innerText = 'แก้ไขข้อมูลผู้รับเหมา';
  document.getElementById('c-company-name').value = c['ชื่อบริษัท'];
  document.getElementById('c-company-name').setAttribute('readonly', 'true'); // ไม่ให้แก้ไขคีย์หลักเพื่อความคงตัว
  document.getElementById('c-area').value = c['ทำงานพื้นที่'];
  document.getElementById('c-supervisor').value = c['ผู้ควบคุมงาน'];
  document.getElementById('c-email').value = c['Email'];
  document.getElementById('c-status').value = c['สถานะ'];
  
  document.getElementById('c-status-group').style.display = 'block';
  openModal('add-contractor-modal');
}

// 2. เรนเดอร์ตารางอุปกรณ์ (2.2)
function renderEquipmentTable() {
  const tbody = document.getElementById('equipment-table-body');
  const mobileCards = document.getElementById('equipment-mobile-cards');
  if (!tbody) return;
  
  const selectAllCheckbox = document.getElementById('check-all-eq');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  updateEqBulkPrintButtonVisibility();
  
  tbody.innerHTML = '';
  mobileCards.innerHTML = '';

  const statusFilter = document.getElementById('eq-status-filter')?.value || 'ปกติ';
  const siteFilter = document.getElementById('dashboard-site-filter')?.value || 'ALL';

  let list = appState.equipment || [];

  // กรองตาม Site หากมีการเลือก
  if (siteFilter !== 'ALL') {
    list = list.filter(e => e['Site โรงงาน'] === siteFilter || e['Site'] === siteFilter || e['โรงงาน'] === siteFilter);
  }

  // กรองตามสถานะอุปกรณ์ (ปกติ, ชำรุด, หมดอายุ, ปิดการใช้งาน, ทั้งหมด)
  if (statusFilter !== 'ALL') {
    list = list.filter(e => {
      const statusVal = String(e['สถานะอุปกรณ์'] || e['สถานะ'] || '').trim();
      const isDeactivated = statusVal.indexOf('ปิดการใช้งาน') > -1 || statusVal.indexOf('จบโครงการ') > -1 || statusVal.indexOf('ปลดระวาง') > -1;
      const isExpired = checkEquipmentExpired(e['วันหมดอายุ Tag']);
      const isDefective = checkEquipmentDefective(e['หมายเลขซีเรียล']);
      
      if (statusFilter === 'ปกติ') return !isDeactivated && !isExpired && !isDefective;
      if (statusFilter === 'ปิดการใช้งาน' || statusFilter === 'ปิดใช้งาน') return isDeactivated;
      if (statusFilter === 'ชำรุด') return isDefective && !isDeactivated;
      if (statusFilter === 'หมดอายุ') return isExpired && !isDeactivated;
      return true;
    });
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #78909c;">ไม่พบข้อมูลอุปกรณ์ตามเงื่อนไขการกรอง</td></tr>';
    return;
  }
  
  list.forEach(e => {
    // หาสีเพื่อใส่จุดสี
    const inspDate = new Date(e['วันที่ตรวจสอบ']);
    const month = inspDate.getMonth();
    const colorHex = MONTHLY_COLORS[month] ? MONTHLY_COLORS[month].color : '#ccc';
    
    // เช็กสถานะการชำรุดจากการสแกน การหมดอายุ 30 วัน หรือการปิดใช้งาน/จบโครงการ
    const statusVal = String(e['สถานะอุปกรณ์'] || e['สถานะ'] || '').trim();
    const isDeactivated = statusVal.indexOf('ปิดการใช้งาน') > -1 || statusVal.indexOf('จบโครงการ') > -1 || statusVal.indexOf('ปลดระวาง') > -1;
    const isExpired = checkEquipmentExpired(e['วันหมดอายุ Tag']);
    const isDefective = checkEquipmentDefective(e['หมายเลขซีเรียล']);
    let statusText = 'ปกติ';
    let labelClass = 'active';

    if (isDeactivated) {
      statusText = 'ปิดใช้งาน (จบโครงการ)';
      labelClass = 'inactive';
    } else if (isDefective) {
      statusText = 'อุปกรณ์ชำรุด';
      labelClass = 'inactive';
    } else if (isExpired) {
      statusText = 'หมดอายุ Tag';
      labelClass = 'pending';
    }
    
    const tr = document.createElement('tr');
    const hasPhoto = (e['รูปภาพอุปกรณ์'] && e['รูปภาพอุปกรณ์'] !== '-') ? true : false;
    const imgHtml = hasPhoto 
      ? `<img src="${getDirectDriveImageUrl(e['รูปภาพอุปกรณ์'])}" style="width: 36px; height: 27px; object-fit: cover; border-radius: 4px; vertical-align: middle; margin-right: 8px; cursor: pointer;" onclick="showLightbox('${getDirectDriveImageUrl(e['รูปภาพอุปกรณ์'])}')">` 
      : `<i class="fa-solid fa-screwdriver-wrench" style="color: #78909c; margin-right: 8px; font-size: 14px; vertical-align: middle;"></i>`;
      
    const siteVal = e['Site โรงงาน'] || e['Site'] || e['โรงงาน'] || 'โรงงาน 1';

    let renewBtnHtml = '';
    let mobileRenewBtnHtml = '';
    
    if (isExpired) {
      renewBtnHtml = `<button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; border-color: #16a34a; color: #16a34a; background-color: #f0fdf4;" onclick="quickReRegisterEquipment('${(e['หมายเลขซีเรียล']||'').replace(/'/g, "\\'")}', '${(e['ชื่ออุปกรณ์']||'').replace(/'/g, "\\'")}', '${(e['บริษัทผู้รับเหมา']||'').replace(/'/g, "\\'")}', '${siteVal.replace(/'/g, "\\'")}', '${(e['สถานที่ใช้งาน / พื้นที่'] || e['สถานที่ใช้งาน'] || '').replace(/'/g, "\\'")}')" title="🔴 Tag หมดอายุการตรวจแล้ว (คลิกเพื่อขึ้นทะเบียนใหม่)">
            <i class="fa-solid fa-file-signature"></i>
          </button>`;
      mobileRenewBtnHtml = `<button class="btn btn-outline" style="padding: 6px 10px; font-size: 11px; border-color: #16a34a; color: #16a34a; background-color: #f0fdf4;" onclick="quickReRegisterEquipment('${(e['หมายเลขซีเรียล']||'').replace(/'/g, "\\'")}', '${(e['ชื่ออุปกรณ์']||'').replace(/'/g, "\\'")}', '${(e['บริษัทผู้รับเหมา']||'').replace(/'/g, "\\'")}', '${siteVal.replace(/'/g, "\\'")}', '${(e['สถานที่ใช้งาน / พื้นที่'] || e['สถานที่ใช้งาน'] || '').replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-file-signature"></i> ขึ้นทะเบียนใหม่
        </button>`;
    } else {
      renewBtnHtml = `<button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; border-color: var(--primary-color); color: var(--primary-color);" onclick="renewEquipmentTag('${e['ID'] || e['หมายเลขซีเรียล']}')" title="ต่ออายุป้าย Tag 30 วัน (สำหรับ จป.)">
            <i class="fa-solid fa-arrows-rotate"></i>
          </button>`;
      mobileRenewBtnHtml = `<button class="btn btn-outline" style="padding: 6px 10px; font-size: 11px; border-color: var(--primary-color); color: var(--primary-color);" onclick="renewEquipmentTag('${e['ID'] || e['หมายเลขซีเรียล']}')">
          <i class="fa-solid fa-arrows-rotate"></i> ต่ออายุ
        </button>`;
    }

    tr.innerHTML = `
      <td style="text-align: center;"><input type="checkbox" class="eq-row-checkbox" value="${e['ID']}" onchange="updateEqBulkPrintButtonVisibility()"></td>
      <td style="font-weight: 600;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${imgHtml}
          <span>${e['ชื่ออุปกรณ์']}</span>
        </div>
      </td>
      <td>${e['หมายเลขซีเรียล']}</td>
      <td><span class="status-badge active" style="background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 600;"><i class="fa-solid fa-industry"></i> ${siteVal}</span></td>
      <td>${e['บริษัทผู้รับเหมา']}</td>
      <td>${formatThaiDate(e['วันที่ตรวจสอบ'])}</td>
      <td>
        <span class="status-badge ${labelClass}">${formatThaiDate(e['วันหมดอายุ Tag'])} (${statusText})</span>
      </td>
      <td>
        <span class="color-dot" style="background-color: ${colorHex};"></span>
        ${e['สีป้ายประจำเดือน'] || 'ไม่ได้ระบุ'}
      </td>
      <td>
        <div style="display: flex; gap: 4px;">
          ${renewBtnHtml}
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; border-color: #64748b; color: #64748b;" onclick="deactivateEquipmentStatus('${e['ID'] || e['หมายเลขซีเรียล']}')" title="ปิดการใช้งาน / จบโครงการ">
            <i class="fa-solid fa-power-off"></i>
          </button>
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="printStickerTag('${e['ID'] || e['หมายเลขซีเรียล']}')" title="พิมพ์ป้าย">
            <i class="fa-solid fa-print"></i>
          </button>
          <button class="btn btn-outline-danger" style="padding: 4px 8px; font-size: 11px; border-color: var(--danger-color); color: var(--danger-color);" onclick="openPinModal('deleteEquipment', '${e['ID'] || e['หมายเลขซีเรียล']}')" title="ลบอุปกรณ์">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
    
    // การ์ดมือถือ
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.innerHTML = `
      ${hasPhoto ? `<div style="text-align: center; margin-bottom: 10px;"><img src="${getDirectDriveImageUrl(e['รูปภาพอุปกรณ์'])}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px;" onclick="showLightbox('${getDirectDriveImageUrl(e['รูปภาพอุปกรณ์'])}')"></div>` : ''}
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 8px;">${e['ชื่ออุปกรณ์']} (${e['หมายเลขซีเรียล']})</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>Site / โรงงาน:</strong> <span class="status-badge active" style="background-color: #e0f2fe; color: #0369a1; font-weight: 600;">${siteVal}</span></div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>ผู้รับเหมา:</strong> ${e['บริษัทผู้รับเหมา']}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>สถานะ / หมดอายุ:</strong> <span class="status-badge ${labelClass}">${formatThaiDate(e['วันหมดอายุ Tag'])} (${statusText})</span></div>
      <div style="font-size: 13px; margin-bottom: 8px;">
        <strong>ป้ายสี:</strong> <span class="color-dot" style="background-color: ${colorHex};"></span> ${e['สีป้ายประจำเดือน']}
      </div>
      <div style="display: flex; justify-content: space-between; gap: 4px; border-top: 1px solid #eee; padding-top: 8px; flex-wrap: wrap;">
        ${mobileRenewBtnHtml}
        <button class="btn btn-outline" style="padding: 6px 10px; font-size: 11px; border-color: #64748b; color: #64748b;" onclick="deactivateEquipmentStatus('${e['ID'] || e['หมายเลขซีเรียล']}')">
          <i class="fa-solid fa-power-off"></i> ปิดใช้งาน
        </button>
        <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 11px;" onclick="printStickerTag('${e['ID']}')">
          <i class="fa-solid fa-print"></i> พิมพ์ป้าย
        </button>
        <button class="btn btn-outline-danger" style="padding: 6px 10px; font-size: 11px; border-color: var(--danger-color); color: var(--danger-color);" onclick="openPinModal('deleteEquipment', '${e['ID'] || e['หมายเลขซีเรียล']}')">
          <i class="fa-solid fa-trash"></i> ลบ
        </button>
      </div>
    `;
    mobileCards.appendChild(card);
  });
}

function checkEquipmentExpired(expiryDateStr) {
  const expiry = new Date(expiryDateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  return today > expiry;
}

function checkEquipmentDefective(serialOrId) {
  if (!serialOrId) return false;
  const target = String(serialOrId).trim();
  
  // 1. ตรวจดูในตาราง Equipment ว่าคอลัมน์สถานะเป็น ชำรุด หรือ ห้ามใช้งาน หรือไม่
  const eqItem = (appState.equipment || []).find(e => 
    (e['ID'] && String(e['ID']).trim() === target) || 
    (e['หมายเลขซีเรียล'] && String(e['หมายเลขซีเรียล']).trim() === target)
  );
  if (eqItem) {
    const statusVal = String(eqItem['สถานะอุปกรณ์'] || eqItem['สถานะ'] || '').trim();
    if (statusVal.indexOf('ชำรุด') !== -1 || statusVal.indexOf('ห้ามใช้') !== -1 || statusVal.indexOf('ไม่ผ่าน') !== -1) {
      return true;
    }
  }

  // 2. กรองดูจากตารางบันทึกความผิด (Patrol Logs) ว่ามีอุปกรณ์นี้ชำรุดและยังไม่ได้แก้ (Pending CAPA) หรือไม่
  return (appState.patrolLogs || []).some(log => 
    ((log['ข้อบกพร่อง'] && log['ข้อบกพร่อง'].indexOf(target) > -1) ||
     (log['รายละเอียด'] && log['รายละเอียด'].indexOf(target) > -1) ||
     (log['ID'] && String(log['ID']).trim() === target)) && 
    log['สถานะ CAPA'] === 'รอดำเนินการ CAPA'
  );
}

// 3. เรนเดอร์ตารางประวัติความปลอดภัยและการจัดการเคส CAPA (Menu 3)
function renderPatrolLogsTable() {
  const tbody = document.getElementById('patrol-table-body');
  const mobileCards = document.getElementById('patrol-mobile-cards');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  mobileCards.innerHTML = '';
  
  if (appState.patrolLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #78909c;">ไม่มีประวัติการเดินตรวจในบันทึกขณะนี้</td></tr>';
    return;
  }
  
  appState.patrolLogs.forEach(log => {
    // กำหนดสีระดับความรุนแรง
    let severityHtml = '';
    if (log['ระดับความรุนแรง'] === 'สูง') {
      severityHtml = '<span style="color: var(--danger-color); font-weight: 700;">🔴 สูง</span>';
    } else if (log['ระดับความรุนแรง'] === 'กลาง') {
      severityHtml = '<span style="color: var(--warning-color); font-weight: 600;">🟡 กลาง</span>';
    } else {
      severityHtml = '<span style="color: var(--success-color);">🟢 ต่ำ</span>';
    }
    
    // กำหนดสีของป้ายสถานะ CAPA
    let statusClass = 'active';
    if (log['สถานะ CAPA'] === 'รอดำเนินการ CAPA') {
      statusClass = 'pending';
    } else if (log['สถานะ CAPA'] === 'ปิดเคสแล้ว') {
      statusClass = 'completed';
    } else {
      statusClass = 'inactive';
    }
    
    // แสดงปุ่มดำเนินการปิดเคส CAPA (สำหรับ Safety)
    let actionButtonHtml = '';
    if (log['สถานะ CAPA'] === 'รอดำเนินการ CAPA') {
      actionButtonHtml = `
        <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; border-color: var(--warning-color); color: var(--warning-color);" onclick="openCapaActionModal('${log['ID']}')">
          <i class="fa-solid fa-wrench"></i> ติดตามเคสคงค้าง
        </button>
      `;
    } else {
      actionButtonHtml = '<span style="color: #78909c; font-size: 12px;"><i class="fa-solid fa-circle-check"></i> เคสยุติแล้ว</span>';
    }
    
    // ภาพ Before & After
    let imagesHtml = '';
    if (log['ภาพ Before'] && log['ภาพ Before'] !== '-') {
      const beforeUrl = getDirectDriveImageUrl(log['ภาพ Before']);
      imagesHtml += `<img src="${beforeUrl}" class="ba-img" onclick="showLightbox('${beforeUrl}')" title="ก่อนแก้ไข">`;
    } else {
      imagesHtml += '<span style="font-size: 11px; color:#aaa;">ไม่มีภาพ</span>';
    }
    if (log['ภาพ After'] && log['ภาพ After'] !== '-') {
      const afterUrl = getDirectDriveImageUrl(log['ภาพ After']);
      imagesHtml += ` <img src="${afterUrl}" class="ba-img" onclick="showLightbox('${afterUrl}')" title="หลังแก้ไข">`;
    }
    
    const inspectorName = log['ผู้ตรวจบันทึก'] || log['ผู้ตรวจสอบ'] || log['inspector'] || '-';
    const siteName = log['Site โรงงาน'] || log['Site'] || log['โรงงาน'] || 'โรงงาน 1';
    const areaName = log['พื้นที่'] || '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatThaiDate(log['วันที่'])}</td>
      <td><a href="#" onclick="openContractorProfile('${log['ผู้รับเหมา']}'); event.preventDefault();" style="font-weight: 600; color: var(--primary-color); text-decoration: none;">${log['ผู้รับเหมา']}</a></td>
      <td>${areaName}</td>
      <td><span class="status-badge active" style="background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 600;"><i class="fa-solid fa-industry"></i> ${siteName}</span></td>
      <td><span class="status-badge active" style="background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-weight: 600;"><i class="fa-solid fa-user-shield"></i> ${inspectorName}</span></td>
      <td>${log['ข้อบกพร่อง']}</td>
      <td>${severityHtml}</td>
      <td>
        <div class="before-after-container">
          ${imagesHtml}
        </div>
      </td>
      <td>
        <span class="status-badge ${statusClass}" style="cursor: pointer;" onclick="if('${log['สถานะ CAPA']}'==='รอดำเนินการ CAPA') openCapaActionModal('${log['ID']}')">
          ${log['สถานะ CAPA']}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center;">
          ${actionButtonHtml}
          <button class="btn btn-outline-danger" style="padding: 4px 8px; font-size: 11px; border-color: var(--danger-color); color: var(--danger-color);" onclick="openPinModal('deletePatrolLog', '${log['ID']}')" title="ลบเคสเดินตรวจ (Admin Only)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
    
    // การ์ดหน้าจอมือถือ
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #78909c; margin-bottom: 8px;">
        <span>${formatThaiDate(log['วันที่'])}</span>
        <span>พื้นที่: ${areaName}</span>
      </div>
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${log['ข้อบกพร่อง']}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>ผู้รับเหมา:</strong> ${log['ผู้รับเหมา']}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>Site / โรงงาน:</strong> <span class="status-badge active" style="background-color: #e0f2fe; color: #0369a1; font-weight: 600;">${siteName}</span></div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>จป. ผู้ตรวจบันทึก:</strong> <span style="font-weight: 600; color: #475569;"><i class="fa-solid fa-user-shield"></i> ${inspectorName}</span></div>
      <div style="font-size: 13px; margin-bottom: 6px;">
        <strong>ความรุนแรง:</strong> ${severityHtml} | 
        <strong>สถานะ:</strong> <span class="status-badge ${statusClass}">${log['สถานะ CAPA']}</span>
      </div>
      <div style="margin-bottom: 8px; display: flex; gap: 8px;">
        ${log['ภาพ Before'] && log['ภาพ Before'] !== '-' ? `<div><span style="font-size:10px; display:block; color:#777;">Before:</span><img src="${getDirectDriveImageUrl(log['ภาพ Before'])}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px;" onclick="showLightbox('${getDirectDriveImageUrl(log['ภาพ Before'])}')"></div>` : ''}
        ${log['ภาพ After'] && log['ภาพ After'] !== '-' ? `<div><span style="font-size:10px; display:block; color:#777;">After:</span><img src="${getDirectDriveImageUrl(log['ภาพ After'])}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px;" onclick="showLightbox('${getDirectDriveImageUrl(log['ภาพ After'])}')"></div>` : ''}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 8px;">
        <button class="btn btn-outline-danger" style="padding: 6px 12px; font-size: 12px; border-color: var(--danger-color); color: var(--danger-color);" onclick="openPinModal('deletePatrolLog', '${log['ID']}')">
          <i class="fa-solid fa-trash"></i> ลบเคส
        </button>
        ${log['สถานะ CAPA'] === 'รอดำเนินการ CAPA' ? `
          <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px; background-color: var(--warning-color); color: #fff;" onclick="openCapaActionModal('${log['ID']}')">
            <i class="fa-solid fa-wrench"></i> ติดตามเคสคงค้าง
          </button>
        ` : ''}
      </div>
    `;
    mobileCards.appendChild(card);
  });
}

// เปิดโมดอลแก้ไขเพื่อปิดใบงาน CAPA (Safety อัปโหลดภาพ After)
function openCapaActionModal(id) {
  const log = appState.patrolLogs.find(item => item['ID'] === id);
  if (!log) return;
  
  document.getElementById('capa-log-id').value = log['ID'];
  document.getElementById('capa-info-contractor').innerText = log['ผู้รับเหมา'];
  document.getElementById('capa-info-area').innerText = log['พื้นที่'];
  document.getElementById('capa-info-defect').innerText = log['ข้อบกพร่อง'];
  
  const beforeThumb = document.getElementById('capa-before-thumb');
  if (log['ภาพ Before']) {
    beforeThumb.src = log['ภาพ Before'];
    document.getElementById('capa-before-img-container').style.display = 'block';
    beforeThumb.onclick = () => showLightbox(log['ภาพ Before']);
  } else {
    document.getElementById('capa-before-img-container').style.display = 'none';
  }
  
  // ล้างการอัปโหลดของเดิม
  document.getElementById('p-after-preview').style.display = 'none';
  document.getElementById('p-after-preview').src = '';
  document.getElementById('p-after-base64').value = '';
  
  openModal('capa-action-modal');
}

// ดูกรอบรูปขยายขนาดใหญ่ (Lightbox)
function showLightbox(src) {
  const modal = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  modal.style.display = 'flex';
}

// --- ฟังก์ชั่นเปิดโปรไฟล์สรุปประวัติผู้รับเหมาสะสมย้อนหลัง (เมื่อคลิกที่ชื่อบริษัท) ---
function openContractorProfile(companyName) {
  window.activeContractorProfileName = companyName;
  const c = appState.contractors.find(item => item['ชื่อบริษัท'] === companyName);
  if (!c) return;
  
  document.getElementById('vc-company-name').innerText = `ประวัติความปลอดภัย: ${c['ชื่อบริษัท']}`;
  document.getElementById('vc-supervisor').innerText = c['ผู้ควบคุมงาน'];
  document.getElementById('vc-email').innerText = c['Email'];
  document.getElementById('vc-allowed-areas').innerText = c['ทำงานพื้นที่'];
  
  const statusBadge = document.getElementById('vc-status');
  statusBadge.innerText = c['สถานะ'];
  statusBadge.className = 'status-badge ' + (c['สถานะ'] === 'ใช้งานอยู่' ? 'active' : 'inactive');
  
  // 1. คำนวณ Safety Scorecard สำหรับผู้รับเหมา (Normalized Compliance Rate %)
  const scorecard = calculateContractorSafetyScore(companyName);

  const gradeBadge = document.getElementById('vc-procurement-grade');
  if (gradeBadge) {
    gradeBadge.innerText = `${scorecard.gradeText} (${scorecard.finalScore}/100)`;
    gradeBadge.className = `status-badge ${scorecard.badgeClass}`;
    gradeBadge.onclick = function() { openScoreFormulaModal(companyName); };
  }

  const elPassRate = document.getElementById('vc-pass-rate');
  if (elPassRate) elPassRate.innerText = `${scorecard.passRate}%`;
  const elTotalDefects = document.getElementById('vc-total-defects');
  if (elTotalDefects) elTotalDefects.innerText = `${scorecard.totalDefects} เคส (-${scorecard.pointsDeducted} แต้ม)`;
  const elCapaRate = document.getElementById('vc-capa-rate');
  if (elCapaRate) elCapaRate.innerText = `${scorecard.capaRate}%`;
  const elDefectiveEq = document.getElementById('vc-defective-eq');
  if (elDefectiveEq) elDefectiveEq.innerText = `${scorecard.defectiveEq} ชิ้น`;

  // 2. ดึงรายการอุปกรณ์ผ่านตรวจของเจ้านี้
  const eqList = appState.equipment.filter(eq => eq['บริษัทผู้รับเหมา'] === companyName);
  const eqTbody = document.getElementById('vc-equipment-list');
  eqTbody.innerHTML = eqList.length > 0 
    ? eqList.map(eq => {
        const isExpired = checkEquipmentExpired(eq['วันหมดอายุ Tag']);
        return `
          <tr>
            <td>${eq['ชื่ออุปกรณ์']}</td>
            <td>${eq['หมายเลขซีเรียล']}</td>
            <td><span class="status-badge ${isExpired ? 'pending' : 'active'}">${formatThaiDate(eq['วันหมดอายุ Tag'])}</span></td>
            <td>${eq['สีป้ายประจำเดือน']}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="4" style="text-align: center; color: #aaa;">ไม่มีอุปกรณ์ลงทะเบียนอยู่ในปัจจุบัน</td></tr>';
    
  // 3. ดึงประวัติทำผิดทั้งหมดสะสมย้อนหลัง
  const violationsTbody = document.getElementById('vc-patrol-list');
  violationsTbody.innerHTML = violations.length > 0
    ? violations.map(log => {
        const statusClass = log['สถานะ CAPA'] === 'รอดำเนินการ CAPA' ? 'pending' : (log['สถานะ CAPA'] === 'ปิดเคสแล้ว' ? 'completed' : 'inactive');
        return `
          <tr>
            <td>${formatThaiDate(log['วันที่'])}</td>
            <td>${log['พื้นที่']}</td>
            <td>${log['ข้อบกพร่อง']}</td>
            <td>${log['ระดับความรุนแรง']}</td>
            <td><span class="status-badge ${statusClass}">${log['สถานะ CAPA']}</span></td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="5" style="text-align: center; color: #aaa;">ไม่พบประวัติการทำผิดข้อบกพร่อง</td></tr>';
    
  openModal('view-contractor-modal');
}

// --- ฟังก์ชั่นการค้นหาแบบ Live Search ในตาราง ---
function setupSearchFilters() {
  // ค้นหาผู้รับเหมา
  document.getElementById('contractor-search').onkeyup = function() {
    const term = this.value.toLowerCase();
    filterTableRows('contractor-table-body', 'contractor-mobile-cards', [0, 1, 2], term);
  };
  
  // ค้นหาอุปกรณ์
  document.getElementById('equipment-search').onkeyup = function() {
    const term = this.value.toLowerCase();
    filterTableRows('equipment-table-body', 'equipment-mobile-cards', [0, 1, 2, 3], term);
  };
  
  // ค้นหาประวัติการเดินตรวจ
  document.getElementById('patrol-search').onkeyup = function() {
    const term = this.value.toLowerCase();
    filterTableRows('patrol-table-body', 'patrol-mobile-cards', [1, 2, 3], term);
  };
}

function filterTableRows(tableBodyId, mobileCardsId, textIndexes, searchTerm) {
  // 1. กรองแถว PC
  const tbody = document.getElementById(tableBodyId);
  const trs = tbody.getElementsByTagName('tr');
  
  for (let i = 0; i < trs.length; i++) {
    const tr = trs[i];
    if (tr.getElementsByTagName('td').length <= 1) continue; // ข้ามแถวที่ระบุว่าไม่มีข้อมูล
    
    let match = false;
    for (let j = 0; j < textIndexes.length; j++) {
      const td = tr.getElementsByTagName('td')[textIndexes[j]];
      if (td && td.innerText.toLowerCase().indexOf(searchTerm) > -1) {
        match = true;
        break;
      }
    }
    tr.style.display = match ? '' : 'none';
  }
  
  // 2. กรองการ์ดมือถือ
  const mobileContainer = document.getElementById(mobileCardsId);
  const cards = mobileContainer.getElementsByClassName('mobile-card');
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (card.innerText.toLowerCase().indexOf(searchTerm) > -1) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  }
}

// --- ฟังก์ชั่นจัดระบบการ์ดสติกเกอร์และพิมพ์ QR CODE (Print Sticker) ---
function printStickerTag(eqId) {
  const eq = appState.equipment.find(item => item['ID'] === eqId);
  if (!eq) return;
  
  // กำหนดสเปกในหน้าพิมพ์
  document.getElementById('print-eq-name').innerText = eq['ชื่ออุปกรณ์'];
  document.getElementById('print-eq-serial').innerText = eq['หมายเลขซีเรียล'];
  document.getElementById('print-eq-contractor').innerText = eq['บริษัทผู้รับเหมา'];
  document.getElementById('print-eq-expiry').innerText = formatThaiDate(eq['วันหมดอายุ Tag']);
  
  // กำหนดสีกำกับเดือนแบบย่อภาษาไทย
  const inspDate = new Date(eq['วันที่ตรวจสอบ']);
  const month = isNaN(inspDate.getTime()) ? 0 : inspDate.getMonth();
  const THAI_MONTH_SHORTS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthShort = THAI_MONTH_SHORTS[month];
  
  // สกัดเอาชื่อสีภาษาไทย (เช่น "สีแดง" จาก "สีแดง (Red)")
  const rawColorName = eq['สีป้ายประจำเดือน'] || '';
  const colorNameThai = rawColorName.split(' ')[0] || rawColorName;
  
  // ตั้งตัวย่อเดือนแบบตัวหนาดำทับแถบสี
  document.getElementById('print-eq-month-color-name').innerText = monthShort;
  
  // เปลี่ยนสีพื้นหลังแถบสีประจำเดือน
  const colorHex = MONTHLY_COLORS[month] ? MONTHLY_COLORS[month].color : '#2e7d32';
  document.getElementById('sticker-footer-color').style.backgroundColor = colorHex;
  
  // ตั้งค่าสีขอบและสีหัวข้อสติกเกอร์ตามรหัสสีประจำเดือนให้เข้าชุดกันอย่างสวยงาม
  const stickerWrapper = document.querySelector('.sticker-wrapper');
  if (stickerWrapper) {
    stickerWrapper.style.borderColor = colorHex;
  }
  const stickerHeader = document.querySelector('.sticker-header');
  if (stickerHeader) {
    stickerHeader.style.borderBottomColor = colorHex;
  }
  const stickerTitle = document.querySelector('.sticker-title');
  if (stickerTitle) {
    stickerTitle.style.color = colorHex;
  }
  
  // สร้าง QR Code ใหม่ทับลงไป
  const qrContainer = document.getElementById('sticker-qrcode');
  qrContainer.innerHTML = ''; // ล้างของเก่า
  
  // สร้าง URL ของอุปกรณ์ชิ้นนี้เพื่อให้สแกนแล้วเปิดดูประวัติได้เลย (หากรันออนไลน์)
  const PUBLIC_URL = 'https://tvocontractor.github.io/contractor-safety/';
  const isLocal = window.location.protocol === 'file:';
  const qrUrl = isLocal 
    ? `${PUBLIC_URL}?serial=${encodeURIComponent(eq['หมายเลขซีเรียล'])}`
    : `${window.location.origin}${window.location.pathname}?serial=${encodeURIComponent(eq['หมายเลขซีเรียล'])}`;
    
  new QRCode(qrContainer, {
    text: qrUrl,
    width: 72,
    height: 72,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.M
  });
  
  // สั่งพิมพ์หน้าจอ (เฉพาะส่วน print-tag-container จะมี visibility แสดงใน css)
  window.print();
}

// --- แผนกสรุปตัวเลขและวาดกราฟสถิติหน้าแรก (Dashboard Charts & KPIs) ---
function renderDashboard() {
  updateDashboardKpis();
  renderDashboardCharts();
}

function updateDashboardKpis() {
  const selectedSite = document.getElementById('dashboard-site-filter')?.value || 'ALL';
  
  let filteredEquipment = appState.equipment || [];
  let filteredPatrols = appState.patrolLogs || [];

  if (selectedSite !== 'ALL') {
    filteredEquipment = filteredEquipment.filter(e => e['Site โรงงาน'] === selectedSite || e['Site'] === selectedSite || e['โรงงาน'] === selectedSite);
    filteredPatrols = filteredPatrols.filter(p => p['Site โรงงาน'] === selectedSite || p['Site'] === selectedSite || p['โรงงาน'] === selectedSite || p['พื้นที่']?.includes(selectedSite));
  }

  document.getElementById('kpi-contractors').innerText = appState.contractors.filter(c => c['สถานะ'] === 'ใช้งานอยู่').length;
  
  // คำนวณอุปกรณ์ที่ปกติ (ป้ายเขียว) และหมดอายุ/ชำรุด (ป้ายแดง/เหลือง)
  let passedCount = 0;
  let defectiveOrExpiredCount = 0;
  
  filteredEquipment.forEach(e => {
    const isExpired = checkEquipmentExpired(e['วันหมดอายุ Tag']);
    const isDefective = checkEquipmentDefective(e['หมายเลขซีเรียล']);
    if (isExpired || isDefective) {
      defectiveOrExpiredCount++;
    } else {
      passedCount++;
    }
  });
  
  document.getElementById('kpi-passed-eq').innerText = passedCount;
  document.getElementById('kpi-defective-eq').innerText = defectiveOrExpiredCount;
  
  // บันทึกข้อบกพร่องจากการเดินตรวจสะสม
  document.getElementById('kpi-total-findings').innerText = filteredPatrols.length;
  
  // เคสรอดำเนินการ (Pending CAPA)
  document.getElementById('kpi-pending-capa').innerText = filteredPatrols.filter(l => l['สถานะ CAPA'] === 'รอดำเนินการ CAPA').length;
}

function renderDashboardCharts() {
  const ctxContractors = document.getElementById('chart-contractors');
  const ctxSeverity = document.getElementById('chart-severity');
  const ctxZones = document.getElementById('chart-zones');
  
  if (!ctxContractors) return; // เช็กหากอยู่หน้าโมดูลอื่นยังไม่โหลดกราฟ

  const selectedSite = document.getElementById('dashboard-site-filter')?.value || 'ALL';
  let filteredPatrols = appState.patrolLogs || [];

  if (selectedSite !== 'ALL') {
    filteredPatrols = filteredPatrols.filter(p => p['Site โรงงาน'] === selectedSite || p['Site'] === selectedSite || p['โรงงาน'] === selectedSite || p['พื้นที่']?.includes(selectedSite));
  }
  
  // กำหนดสีกราฟตามโหมดสว่าง/มืด
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#b0bec5' : '#546e7a';
  const gridColor = isDark ? '#333333' : '#eceff1';
  
  // ทำลายชาร์ตเก่าก่อนสร้างใหม่ป้องกันการทับซ้อน
  if (charts.contractors) charts.contractors.destroy();
  if (charts.severity) charts.severity.destroy();
  if (charts.zones) charts.zones.destroy();
  
  // 1. ข้อมูลข้อบกพร่องสะสมแยกตามบริษัทผู้รับเหมา
  const contractorCounts = {};
  filteredPatrols.forEach(log => {
    contractorCounts[log['ผู้รับเหมา']] = (contractorCounts[log['ผู้รับเหมา']] || 0) + 1;
  });
  
  const contLabels = Object.keys(contractorCounts);
  const contValues = Object.values(contractorCounts);
  
  charts.contractors = new Chart(ctxContractors, {
    type: 'bar',
    data: {
      labels: contLabels.length > 0 ? contLabels : ['ไม่มีข้อมูล'],
      datasets: [{
        label: 'จำนวนเคสทำผิดสะสม',
        data: contValues.length > 0 ? contValues : [0],
        backgroundColor: 'rgba(46, 125, 50, 0.7)',
        borderColor: 'rgba(46, 125, 50, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, stepSize: 1 },
          beginAtZero: true
        }
      }
    }
  });
  
  // 2. ข้อมูลสัดส่วนระดับความรุนแรง (สูง-กลาง-ต่ำ)
  let highCount = 0, medCount = 0, lowCount = 0;
  filteredPatrols.forEach(log => {
    if (log['ระดับความรุนแรง'] === 'สูง') highCount++;
    else if (log['ระดับความรุนแรง'] === 'กลาง') medCount++;
    else lowCount++;
  });
  
  charts.severity = new Chart(ctxSeverity, {
    type: 'pie',
    data: {
      labels: ['สูง (High)', 'กลาง (Medium)', 'ต่ำ (Low)'],
      datasets: [{
        data: [highCount, medCount, lowCount],
        backgroundColor: ['#f44336', '#ff9800', '#4caf50'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor }
        }
      }
    }
  });
  
  // 3. ข้อมูลข้อบกพร่องตามพื้นที่ปฏิบัติงาน
  const zoneCounts = {};
  filteredPatrols.forEach(log => {
    zoneCounts[log['พื้นที่']] = (zoneCounts[log['พื้นที่']] || 0) + 1;
  });
  
  const zoneLabels = Object.keys(zoneCounts);
  const zoneValues = Object.values(zoneCounts);
  
  charts.zones = new Chart(ctxZones, {
    type: 'bar',
    data: {
      labels: zoneLabels.length > 0 ? zoneLabels : ['ไม่มีข้อมูล'],
      datasets: [{
        label: 'จำนวนข้อบกพร่องแยกตามจุดงาน',
        data: zoneValues.length > 0 ? zoneValues : [0],
        backgroundColor: 'rgba(251, 192, 45, 0.7)',
        borderColor: 'rgba(251, 192, 45, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, stepSize: 1 },
          beginAtZero: true
        }
      }
    }
  });

  // 4. สถิติผลตรวจผ่านเกณฑ์อุปกรณ์ & PPE แยกตามบริษัทผู้รับเหมา (ชิ้น)
  const auditDataByContractor = {};
  (appState.inspectionLogs || []).forEach(log => {
    const contractor = log['บริษัทผู้รับเหมา'];
    const pass = parseInt(log['ผ่านการตรวจ']) || 0;
    const fail = parseInt(log['ไม่ผ่าน']) || 0;
    if (!auditDataByContractor[contractor]) {
      auditDataByContractor[contractor] = { pass: 0, fail: 0 };
    }
    auditDataByContractor[contractor].pass += pass;
    auditDataByContractor[contractor].fail += fail;
  });
  
  const auditLabels = Object.keys(auditDataByContractor);
  const passValues = auditLabels.map(c => auditDataByContractor[c].pass);
  const failValues = auditLabels.map(c => auditDataByContractor[c].fail);

  const ctxAudits = document.getElementById('chart-audits');
  if (ctxAudits) {
    if (charts.audits) charts.audits.destroy();
    charts.audits = new Chart(ctxAudits, {
      type: 'bar',
      data: {
        labels: auditLabels.length > 0 ? auditLabels : ['ไม่มีข้อมูล'],
        datasets: [
          {
            label: 'ผ่านการตรวจ (Pass)',
            data: passValues.length > 0 ? passValues : [0],
            backgroundColor: 'rgba(46, 125, 50, 0.8)',
            borderColor: 'rgba(46, 125, 50, 1)',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'ไม่ผ่าน/ตกเกณฑ์ (Fail)',
            data: failValues.length > 0 ? failValues : [0],
            backgroundColor: 'rgba(244, 63, 94, 0.8)',
            borderColor: 'rgba(244, 63, 94, 1)',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor } }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, stepSize: 5 },
            beginAtZero: true
          }
        }
      }
    });
  }
}

// --- แผนกจัดทำหน้ารายงานและตัวกรองรายงานสถิติ (Reports Generation) ---
function renderReportFilterOptions() {
  const contractorFilter = document.getElementById('filter-contractor');
  const deptFilter = document.getElementById('filter-dept');
  if (!contractorFilter) return;
  
  // เก็บรายชื่อผู้รับเหมาทั้งหมด
  contractorFilter.innerHTML = '<option value="">-- ทั้งหมด --</option>' +
    appState.contractors.map(c => `<option value="${c['ชื่อบริษัท']}">${c['ชื่อบริษัท']}</option>`).join('');
    
  // รวบรวมแผนกที่รับผิดชอบทั้งหมดที่ไม่ซ้ำจาก Config
  const allDepts = new Set();
  if (appState.areaMapping && appState.areaMapping.length > 0) {
    appState.areaMapping.forEach(item => {
      if (item['แผนกที่รับผิดชอบ']) allDepts.add(item['แผนกที่รับผิดชอบ'].trim());
    });
  }
  
  deptFilter.innerHTML = '<option value="">-- ทั้งหมด --</option>' +
    Array.from(allDepts).map(d => `<option value="${d}">${d}</option>`).join('');
}

// กรองข้อมูลและเขียนพรีวิวตารางรายงาน (Report Preview)
function generateReportPreview() {
  const reportType = document.getElementById('filter-report-type').value;
  const dateStart = document.getElementById('filter-date-start').value;
  const dateEnd = document.getElementById('filter-date-end').value;
  const contractor = document.getElementById('filter-contractor').value;
  const dept = document.getElementById('filter-dept').value;
  
  const thead = document.getElementById('report-preview-thead');
  const tbody = document.getElementById('report-preview-tbody');
  const title = document.getElementById('report-title-preview');
  
  thead.innerHTML = '';
  tbody.innerHTML = '';
  
  // 1. ฟิลเตอร์กรองตามวันที่
  const start = dateStart ? new Date(dateStart) : null;
  const end = dateEnd ? new Date(dateEnd) : null;
  if (end) end.setHours(23,59,59,999); // ปรับหมดเวลาวันสุดท้าย
  
  // --- แบบรายงานที่ B: รายงานสรุปคะแนนประเมินผู้รับเหมา (Safety Scorecard) ---
  if (reportType === 'evaluation') {
    title.innerText = 'รายงานสรุปคะแนนประเมินผู้รับเหมา (Safety Scorecard)';
    thead.innerHTML = `
      <tr>
        <th>ชื่อบริษัทผู้รับเหมา</th>
        <th>คะแนนคงเหลือ (เต็ม 100)</th>
        <th>หักคะแนนสะสม (แต้ม)</th>
        <th>ข้อบกพร่องสะสม (เคส)</th>
        <th>อัตราปิดเคส CAPA (%)</th>
        <th>อุปกรณ์ผ่านตรวจ (ชิ้น)</th>
        <th>อุปกรณ์ชำรุด/ไม่ผ่าน (ชิ้น)</th>
        <th>เกรดประเมินสรุป</th>
      </tr>
    `;
    
    // คำนวณทีละบริษัทผู้รับเหมา
    const listToRender = contractor ? appState.contractors.filter(c => c['ชื่อบริษัท'] === contractor) : appState.contractors;
    
    if (listToRender.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #aaa;">ไม่พบข้อมูลบริษัท</td></tr>';
      return;
    }
    
    listToRender.forEach(c => {
      const name = c['ชื่อบริษัท'];
      const scorecard = calculateContractorSafetyScore(name);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${name}</td>
        <td><strong style="font-size: 15px; color: ${scorecard.finalScore >= 80 ? 'var(--success-color)' : (scorecard.finalScore >= 60 ? 'var(--warning-color)' : 'var(--danger-color)')}">${scorecard.finalScore} คะแนน</strong></td>
        <td><span style="color: var(--danger-color); font-weight:600;">-${scorecard.pointsDeducted}</span></td>
        <td>${scorecard.totalDefects} เคส</td>
        <td><strong style="color: ${scorecard.capaRate === 100 ? 'var(--success-color)' : 'var(--warning-color)'}">${scorecard.capaRate}%</strong></td>
        <td><span style="color: var(--success-color); font-weight:600;">${scorecard.passedEq}</span></td>
        <td><span style="color: ${scorecard.defectiveEq > 0 ? 'var(--danger-color)' : '#999'}; font-weight:600;">${scorecard.defectiveEq}</span></td>
        <td><span class="status-badge ${scorecard.badgeClass}" onclick="openScoreFormulaModal('${name}')" style="cursor: pointer;" title="คลิกเพื่อดูรายละเอียดและสูตรคำนวณคะแนนฉบับเต็ม">${scorecard.gradeText} <i class="fa-solid fa-calculator" style="font-size: 10px; margin-left: 2px;"></i></span></td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // --- แบบรายงานที่ C: รายการตรวจสอบอุปกรณ์ทั้งหมด ---
  else if (reportType === 'equipment') {
    title.innerText = 'รายงานตรวจสอบอุปกรณ์ผู้รับเหมาทั้งหมด';
    thead.innerHTML = `
      <tr>
        <th>ชื่ออุปกรณ์</th>
        <th>หมายเลขซีเรียล</th>
        <th>บริษัทผู้รับเหมา</th>
        <th>แผนก/พื้นที่ใช้งาน</th>
        <th>วันที่ตรวจสอบ</th>
        <th>วันหมดอายุ Tag</th>
        <th>ป้ายสีประจำเดือน</th>
        <th>สถานะป้าย</th>
      </tr>
    `;
    
    let filteredEq = appState.equipment.filter(eq => {
      const eqDate = new Date(eq['วันที่ตรวจสอบ']);
      const matchDate = (!start || eqDate >= start) && (!end || eqDate <= end);
      const matchCont = !contractor || eq['บริษัทผู้รับเหมา'] === contractor;
      
      // ค้นหาแผนกของอุปกรณ์ผ่านพื้นที่ปฏิบัติงาน
      const configItem = appState.areaMapping.find(item => item['พื้นที่ปฏิบัติงาน'] === eq['พื้นที่ใช้งาน']);
      const eqDept = configItem ? configItem['แผนกที่รับผิดชอบ'] : '-';
      const matchDept = !dept || eqDept === dept;
      
      return matchDate && matchCont && matchDept;
    });
    
    if (filteredEq.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #aaa;">ไม่พบรายการตรวจสอบอุปกรณ์ในช่วงเวลานี้</td></tr>';
      return;
    }
    
    filteredEq.forEach(eq => {
      const isExpired = checkEquipmentExpired(eq['วันหมดอายุ Tag']);
      const isDefective = checkEquipmentDefective(eq['หมายเลขซีเรียล']);
      let statusHtml = '<span class="status-badge active">ปกติ</span>';
      if (isExpired) statusHtml = '<span class="status-badge pending">หมดอายุ</span>';
      if (isDefective) statusHtml = '<span class="status-badge inactive">ชำรุด</span>';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${eq['ชื่ออุปกรณ์']}</td>
        <td>${eq['หมายเลขซีเรียล']}</td>
        <td>${eq['บริษัทผู้รับเหมา']}</td>
        <td>${eq['พื้นที่ใช้งาน']}</td>
        <td>${formatThaiDate(eq['วันที่ตรวจสอบ'])}</td>
        <td>${formatThaiDate(eq['วันหมดอายุ Tag'])}</td>
        <td>${eq['สีป้ายประจำเดือน']}</td>
        <td>${statusHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // --- แบบรายงานที่ A: รายละเอียดการเดินตรวจความปลอดภัย ---
  else if (reportType === 'patrol') {
    title.innerText = 'รายงานรายละเอียดการเดินตรวจความปลอดภัยและใบงาน CAPA';
    thead.innerHTML = `
      <tr>
        <th>วันที่ตรวจ</th>
        <th>บริษัทผู้รับเหมา</th>
        <th>พื้นที่เกิดเหตุ</th>
        <th>หัวข้อข้อบกพร่อง</th>
        <th>ความรุนแรง</th>
        <th>สถานะ CAPA</th>
        <th>มีรูปแนบ</th>
      </tr>
    `;
    
    let filteredPatrol = appState.patrolLogs.filter(log => {
      const logDate = new Date(log['วันที่']);
      const matchDate = (!start || logDate >= start) && (!end || logDate <= end);
      const matchCont = !contractor || log['ผู้รับเหมา'] === contractor;
      const matchDept = !dept || log['แผนกที่รับผิดชอบ'] === dept;
      return matchDate && matchCont && matchDept;
    });
    
    if (filteredPatrol.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #aaa;">ไม่พบประวัติเดินตรวจความปลอดภัยในช่วงนี้</td></tr>';
      return;
    }
    
    filteredPatrol.forEach(log => {
      const hasImages = (log['ภาพ Before'] || log['ภาพ After']) ? '🟢 มีรูปถ่าย' : '⚪ ไม่มีรูป';
      const statusClass = log['สถานะ CAPA'] === 'รอดำเนินการ CAPA' ? 'pending' : (log['สถานะ CAPA'] === 'ปิดเคสแล้ว' ? 'completed' : 'inactive');
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatThaiDate(log['วันที่'])}</td>
        <td style="font-weight:600;">${log['ผู้รับเหมา']}</td>
        <td>${log['พื้นที่']}</td>
        <td>${log['ข้อบกพร่อง']}</td>
        <td>${log['ระดับความรุนแรง']}</td>
        <td><span class="status-badge ${statusClass}">${log['สถานะ CAPA']}</span></td>
        <td>${hasImages}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // --- แบบรายงานที่ D: ยอดตรวจสอบอุปกรณ์เครื่องมือประจำวัน ---
  else if (reportType === 'audit') {
    title.innerText = 'รายงานสถิติยอดส่งตรวจอุปกรณ์ช่างประจำวัน (Daily Audit Logs)';
    thead.innerHTML = `
      <tr>
        <th>วันที่ตรวจ</th>
        <th>บริษัทผู้รับเหมา</th>
        <th>จำนวนส่งตรวจทั้งหมด</th>
        <th>ผ่านการตรวจ (ชิ้น)</th>
        <th>ไม่ผ่าน (ชิ้น)</th>
        <th>อัตราการผ่าน (%)</th>
        <th>สาเหตุที่ไม่ผ่าน / หมายเหตุ</th>
      </tr>
    `;
    
    const toolLogs = (appState.inspectionLogs || []).filter(log => log['หมวดหมู่'] === 'เครื่องมือช่าง' || !log['ประเภทอุปกรณ์ PPE'] || log['ประเภทอุปกรณ์ PPE'] === '-');
    let filteredAudit = toolLogs.filter(log => {
      const logDate = new Date(log['วันที่']);
      const matchDate = (!start || logDate >= start) && (!end || logDate <= end);
      const matchCont = !contractor || log['บริษัทผู้รับเหมา'] === contractor;
      return matchDate && matchCont;
    });
    
    if (filteredAudit.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #aaa;">ไม่พบประวัติส่งตรวจอุปกรณ์ช่างในช่วงนี้</td></tr>';
      return;
    }
    
    filteredAudit.forEach(log => {
      const total = parseInt(log['จำนวนส่งตรวจทั้งหมด']) || 0;
      const pass = parseInt(log['ผ่านการตรวจ']) || 0;
      const fail = parseInt(log['ไม่ผ่าน']) || 0;
      const rate = total > 0 ? ((pass / total) * 100).toFixed(1) + '%' : '0%';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatThaiDate(log['วันที่'])}</td>
        <td style="font-weight:600;">${log['บริษัทผู้รับเหมา']}</td>
        <td>${total} ชิ้น</td>
        <td>${pass} ชิ้น</td>
        <td style="color: var(--danger-color); font-weight:600;">${fail} ชิ้น</td>
        <td><strong>${rate}</strong></td>
        <td>${log['สาเหตุที่ไม่ผ่าน/หมายเหตุ'] || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // --- แบบรายงานที่ E: ยอดตรวจสอบและขึ้นทะเบียน PPE สะสม ---
  else if (reportType === 'ppe') {
    title.innerText = 'รายงานตรวจสอบและขึ้นทะเบียนอุปกรณ์ป้องกันภัยส่วนบุคคล (PPE Inspection Logs)';
    thead.innerHTML = `
      <tr>
        <th>วันที่ตรวจ</th>
        <th>บริษัทผู้รับเหมา</th>
        <th>ประเภทอุปกรณ์ PPE</th>
        <th>จำนวนนำตรวจทั้งหมด</th>
        <th>ผ่านเกณฑ์ขึ้นทะเบียน (ชิ้น)</th>
        <th>ตกเกณฑ์ตรวจ (ชิ้น)</th>
        <th>อัตราผ่านเกณฑ์ (%)</th>
        <th>สาเหตุที่ไม่ผ่าน / หมายเหตุ</th>
      </tr>
    `;
    
    const ppeLogs = (appState.inspectionLogs || []).filter(log => log['หมวดหมู่'] === 'PPE' || (log['ประเภทอุปกรณ์ PPE'] && log['ประเภทอุปกรณ์ PPE'] !== '-'));
    let filteredPpe = ppeLogs.filter(log => {
      const logDate = new Date(log['วันที่']);
      const matchDate = (!start || logDate >= start) && (!end || logDate <= end);
      const matchCont = !contractor || log['บริษัทผู้รับเหมา'] === contractor;
      return matchDate && matchCont;
    });
    
    if (filteredPpe.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #aaa;">ไม่พบประวัติส่งตรวจและขึ้นทะเบียน PPE ในช่วงนี้</td></tr>';
      return;
    }
    
    filteredPpe.forEach(log => {
      const total = parseInt(log['จำนวนส่งตรวจทั้งหมด']) || 0;
      const pass = parseInt(log['ผ่านการตรวจ']) || 0;
      const fail = parseInt(log['ไม่ผ่าน']) || 0;
      const rate = total > 0 ? ((pass / total) * 100).toFixed(1) + '%' : '0%';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatThaiDate(log['วันที่'])}</td>
        <td style="font-weight:600;">${log['บริษัทผู้รับเหมา']}</td>
        <td style="font-weight:600; color: var(--primary-color);">${log['ประเภทอุปกรณ์ PPE'] || '-'}</td>
        <td>${total} ชิ้น</td>
        <td>${pass} ชิ้น</td>
        <td style="color: var(--danger-color); font-weight:600;">${fail} ชิ้น</td>
        <td><strong>${rate}</strong></td>
        <td>${log['สาเหตุที่ไม่ผ่าน/หมายเหตุ'] || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// ส่งออกตารางพรีวิวปัจจุบันเป็นไฟล์ Excel (.xlsx) ด้วยไลบรารี SheetJS (XLSX)
function exportReportToExcel() {
  const table = document.getElementById('report-preview-table');
  const reportType = document.getElementById('filter-report-type').value;
  
  let filename = 'Safety_Report';
  if (reportType === 'evaluation') filename = 'Contractor_Safety_Evaluation_Summary';
  else if (reportType === 'equipment') filename = 'Equipment_Inspection_Report';
  else if (reportType === 'patrol') filename = 'Safety_Patrol_and_CAPA_Report';
  
  // บันทึกช่วงเวลา
  const dateStart = document.getElementById('filter-date-start').value;
  const dateEnd = document.getElementById('filter-date-end').value;
  if (dateStart || dateEnd) {
    filename += `_(${dateStart || 'อดีต'}_to_${dateEnd || 'ปัจจุบัน'})`;
  }
  
  const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// --- ฟังก์ชั่นเสริมจัดข้อมูลวันที่แบบภาษาไทยเข้าใจง่าย ---
function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // แปลงพุทธศักราช
  
  return `${day} ${month} ${year}`;
}

// แปลงลิงก์ Google Drive Viewer ให้เป็นลิงก์รูปภาพโดยตรงเพื่อให้แสดงผลในแท็ก img ได้
function getDirectDriveImageUrl(url) {
  if (!url || url === '-' || url === '') return '';
  if (url.indexOf('drive.google.com') !== -1) {
    var fileId = '';
    if (url.indexOf('/file/d/') !== -1) {
      fileId = url.split('/file/d/')[1].split('/')[0];
    } else if (url.indexOf('?id=') !== -1) {
      fileId = url.split('?id=')[1].split('&')[0];
    }
    if (fileId) {
      return 'https://lh3.googleusercontent.com/d/' + fileId;
    }
  }
  return url;
}

// =========================================================================
// ==================== TRAINING & JUST ID SYSTEM SCRIPT ====================
// =========================================================================

// --- ส่วนข้อมูลและสถิติอบรม JUST ID ---
let trainingState = {
  rawData: [],
  filteredData: [],
  currentPage: 1,
  pageSize: 10,
  activeFilter: 'all',
  searchQuery: '',
  sortColumn: 'justIdNo',
  sortDirection: 'desc',
  courseChartInstance: null
};

const TRAINING_API_URL = 'https://script.google.com/macros/s/AKfycbxMgWT0JzDdFxMA-60gTdk4Il9HwgvGFWZAKN8k0kQbQ323pWaE-FXq1ghe9y98qKU_/exec';

const TRAINING_MOCK_DATA = [
  { timestamp: "2569-06-17T08:30:00.000Z", idCard: "1100201452684", name: "นายสมชาย ใจดี", company: "บริษัท เอ็นจิเนียริ่ง จำกัด", course: "หลักสูตรความปลอดภัยทั่วไป", scoreStatus: "ไม่ผ่าน", docStatus: "reject", justIdStatus: "", justIdNo: "", note: "ลงทะเบียนซ้ำซ้อน" },
  { timestamp: "2569-06-18T08:30:00.000Z", idCard: "1100201452684", name: "นายสมชาย ใจดี", company: "บริษัท เอ็นจิเนียริ่ง จำกัด", course: "หลักสูตรความปลอดภัยทั่วไป", scoreStatus: "ผ่าน", docStatus: "approve", justIdStatus: "approve", justIdNo: "JID-2569-001", note: "" },
  { timestamp: "2569-06-18T09:15:00.000Z", idCard: "3101200547896", name: "นางสาวสมศรี สุขสบาย", company: "บริษัท ก่อสร้างไทย จำกัด", course: "หลักสูตรการทำงานในที่สูง", scoreStatus: "ผ่าน", docStatus: "approve", justIdStatus: "", justIdNo: "", note: "" },
  { timestamp: "2569-06-18T10:00:00.000Z", idCard: "5100400874521", name: "นายสมศักดิ์ รักดี", company: "บริษัท เอ็นจิเนียริ่ง จำกัด", course: "หลักสูตรความปลอดภัยทั่วไป", scoreStatus: "", docStatus: "", justIdStatus: "", justIdNo: "", note: "" },
  { timestamp: "2569-06-18T11:30:00.000Z", idCard: "1209900458712", name: "นายวีระ ชัยชนะ", company: "บริษัท ซ่อมบำรุง ดีพีเอ็ม", course: "หลักสูตรความปลอดภัยทั่วไป", scoreStatus: "ไม่ผ่าน", docStatus: "reject", justIdStatus: "", justIdNo: "", note: "เอกสารไม่ชัดเจน ลายเซ็นไม่ครบถ้วน" },
  { timestamp: "2569-06-18T13:45:00.000Z", idCard: "3201400985214", name: "นายมานะ ขยันงาน", company: "บริษัท ไฟฟ้าอุตสาหกรรม", course: "หลักสูตรการทำงานเกี่ยวกับไฟฟ้า", scoreStatus: "ผ่าน", docStatus: "approve", justIdStatus: "approve", justIdNo: "JID-2569-002", note: "" },
  { timestamp: "2569-06-18T14:20:00.000Z", idCard: "1509901423658", name: "นายประวิทย์ รักชาติ", company: "บริษัท ก่อสร้างไทย จำกัด", course: "หลักสูตรการทำงานในที่อับอากาศ", scoreStatus: "", docStatus: "รอตรวจสอบ", justIdStatus: "", justIdNo: "", note: "รอเอกสารรับรองสุขภาพฉบับจริง" },
  { timestamp: "2569-06-19T08:00:00.000Z", idCard: "3100901245876", name: "นายอานนท์ รุ่งเรือง", company: "บริษัท ซ่อมบำรุง ดีพีเอ็ม", course: "หลักสูตรการทำงานเกี่ยวกับไฟฟ้า", scoreStatus: "ผ่าน", docStatus: "approve", justIdStatus: "approve", justIdNo: "JID-2569-003", note: "" },
  { timestamp: "2569-06-19T09:00:00.000Z", idCard: "1101402365987", name: "นางสาวปรียา นามสมมุติ", company: "บริษัท ไฟฟ้าอุตสาหกรรม", scoreStatus: "ไม่ผ่าน", docStatus: "reject", justIdStatus: "reject", justIdNo: "", note: "สอบไม่ผ่านเกณฑ์คะแนนขั้นต่ำ (60%)" },
  { timestamp: "2569-06-19T09:30:00.000Z", idCard: "3100201487562", name: "นายเกรียงไกร แข็งขัน", company: "บริษัท เอ็นจิเนียริ่ง จำกัด", course: "หลักสูตรการทำงานในที่สูง", scoreStatus: "ผ่าน", docStatus: "approve", justIdStatus: "approve", justIdNo: "JID-2569-004", note: "" },
  { timestamp: "2569-06-19T10:15:00.000Z", idCard: "1100501247854", name: "นายปิยะพงษ์ ผิวดี", company: "บริษัท ก่อสร้างไทย จำกัด", course: "หลักสูตรความปลอดภัยทั่วไป", scoreStatus: "", docStatus: "", justIdStatus: "", justIdNo: "", note: "" },
  { timestamp: "2569-06-19T11:00:00.000Z", idCard: "1100901584723", name: "นายธนพล มีทรัพย์", company: "บริษัท โลจิสติกส์ พลัส", course: "หลักสูตรความปลอดภัยทั่วไป", scoreStatus: "ผ่าน", docStatus: "approve", justIdStatus: "approve", justIdNo: "JID-2569-005", note: "" },
  { timestamp: "2569-06-19T11:20:00.000Z", idCard: "3101502478951", name: "นายอภิชาติ ปานแก้ว", company: "บริษัท โลจิสติกส์ พลัส", course: "หลักสูตรการขับขี่รถฟอร์คลิฟต์", scoreStatus: "ผ่าน", docStatus: "approve", justIdStatus: "approve", justIdNo: "JID-2569-006", note: "" },
  { timestamp: "2569-06-19T11:45:00.000Z", idCard: "1409902587412", name: "นายชลิต นามดี", company: "บริษัท โลจิสติกส์ พลัส", course: "หลักสูตรการขับขี่รถฟอร์คลิฟต์", scoreStatus: "", docStatus: "แก้รูป", justIdStatus: "", justIdNo: "", note: "ภาพถ่ายหน้าไม่ตรงกับบัตรประชาชน" }
];

// --- ส่วนของฟังก์ชั่นจัดการงานอบรมและอนุมัติบัตร JUST ID ---
function switchTrainingTab(tab) {
  const execView = document.getElementById('training-exec-view');
  const operView = document.getElementById('training-oper-view');
  const tabs = document.querySelectorAll('#training-panel .tab-button');
  
  tabs.forEach(btn => btn.classList.remove('active'));
  
  if (tab === 'executive') {
    if (execView) execView.style.display = 'block';
    if (operView) operView.style.display = 'none';
    if (tabs[0]) tabs[0].classList.add('active');
    renderTrainingCharts();
  } else {
    if (execView) execView.style.display = 'none';
    if (operView) operView.style.display = 'block';
    if (tabs[1]) tabs[1].classList.add('active');
    applyTrainingFiltersAndSearch();
  }
}

async function loadTrainingData() {
  const statusEl = document.getElementById('connection-status');
  if (statusEl) {
    statusEl.innerHTML = '<span style="color: var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปเดตข้อมูลอบรม...</span>';
  }

  try {
    const response = await fetch(TRAINING_API_URL);
    if (!response.ok) throw new Error('API Response not OK');
    const data = await response.json();
    
    let parsedData = [];
    if (Array.isArray(data)) {
      parsedData = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      parsedData = data.data;
    } else {
      throw new Error('Invalid JSON structure');
    }
    
    trainingState.rawData = deduplicateTrainingData(parsedData);
    if (statusEl) {
      statusEl.innerHTML = '<span style="color: var(--success-color);"><i class="fa-solid fa-circle-check"></i> เชื่อมต่อ Live API (อบรม)</span>';
    }
  } catch (error) {
    console.warn("API Error, falling back to mock training data:", error);
    trainingState.rawData = deduplicateTrainingData(TRAINING_MOCK_DATA);
    if (statusEl) {
      statusEl.innerHTML = '<span style="color: var(--warning-color);"><i class="fa-solid fa-circle-check"></i> ข้อมูลจำลอง (อบรม)</span>';
    }
  }
  
  processAndRenderTraining();
}

function deduplicateTrainingData(data) {
  if (!Array.isArray(data)) return [];
  const latestEntries = {};
  data.forEach(item => {
    const idCard = item.idCard ? item.idCard.toString().trim() : '';
    if (!idCard) return;
    
    const currentDate = parseTrainingTimestamp(item.timestamp);
    const currentTime = currentDate ? currentDate.getTime() : 0;
    
    if (!latestEntries[idCard]) {
      latestEntries[idCard] = item;
    } else {
      const existingDate = parseTrainingTimestamp(latestEntries[idCard].timestamp);
      const existingTime = existingDate ? existingDate.getTime() : 0;
      if (currentTime > existingTime) {
        latestEntries[idCard] = item;
      }
    }
  });
  return Object.values(latestEntries);
}

function parseTrainingTimestamp(timestampStr) {
  if (!timestampStr) return null;
  let date = new Date(timestampStr);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    if (year >= 2400) date.setFullYear(year - 543);
    return date;
  }
  if (typeof timestampStr === 'string') {
    const parts = timestampStr.match(/(\d+)/g);
    if (parts && parts.length >= 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      let hour = parts[3] ? parseInt(parts[3], 10) : 0;
      let minute = parts[4] ? parseInt(parts[4], 10) : 0;
      let second = parts[5] ? parseInt(parts[5], 10) : 0;
      if (year < 100) year += 2000;
      if (year >= 2400) year -= 543;
      date = new Date(year, month, day, hour, minute, second);
    }
  }
  return isNaN(date.getTime()) ? null : date;
}

function processAndRenderTraining() {
  calculateTrainingKPIs();
  renderTrainingCharts();
  renderTrainingTopCompanies();
  applyTrainingFiltersAndSearch();
}

function calculateTrainingKPIs() {
  const total = trainingState.rawData.length;
  let approved = 0;
  let pending = 0;
  let rejected = 0;

  trainingState.rawData.forEach(item => {
    const doc = (item.docStatus || '').toString().toLowerCase().trim();
    const just = (item.justIdStatus || '').toString().toLowerCase().trim();

    if (doc === 'approve' || doc === 'ผ่าน' || just === 'approve' || just === 'ผ่าน') {
      approved++;
    } else if (doc === 'reject' || doc === 'ไม่ผ่าน' || just === 'reject' || just === 'ไม่ผ่าน') {
      rejected++;
    } else {
      pending++;
    }
  });

  const totalEl = document.getElementById('t-kpi-total');
  const approvedEl = document.getElementById('t-kpi-approved');
  const pendingEl = document.getElementById('t-kpi-pending');
  const rejectedEl = document.getElementById('t-kpi-rejected');

  if (totalEl) totalEl.innerText = total.toLocaleString();
  if (approvedEl) approvedEl.innerText = approved.toLocaleString();
  if (pendingEl) pendingEl.innerText = pending.toLocaleString();
  if (rejectedEl) rejectedEl.innerText = rejected.toLocaleString();

  const calcPct = (val) => total > 0 ? Math.round((val / total) * 100) : 0;
  
  const approvedPctEl = document.getElementById('t-kpi-approved-pct');
  const pendingPctEl = document.getElementById('t-kpi-pending-pct');
  const rejectedPctEl = document.getElementById('t-kpi-rejected-pct');

  if (approvedPctEl) approvedPctEl.innerText = `${calcPct(approved)}% ของทั้งหมด`;
  if (pendingPctEl) pendingPctEl.innerText = `${calcPct(pending)}% ของทั้งหมด`;
  if (rejectedPctEl) rejectedPctEl.innerText = `${calcPct(rejected)}% ของทั้งหมด`;
}

function renderTrainingCharts() {
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#b0bec5' : '#546e7a';

  const courses = {};
  trainingState.rawData.forEach(item => {
    const c = (item.course || 'ไม่ระบุหลักสูตร').trim();
    courses[c] = (courses[c] || 0) + 1;
  });

  const sortedCourses = Object.keys(courses)
    .map(key => ({ name: key, value: courses[key] }))
    .sort((a, b) => b.value - a.value);

  const labels = sortedCourses.map(item => item.name);
  const data = sortedCourses.map(item => item.value);

  const chartColors = [
    'rgba(46, 125, 50, 0.8)',   // Green
    'rgba(99, 102, 241, 0.8)',  // Indigo
    'rgba(245, 158, 11, 0.8)',  // Amber
    'rgba(244, 63, 94, 0.8)',   // Rose
    'rgba(168, 85, 247, 0.8)',  // Purple
    'rgba(6, 182, 212, 0.8)',   // Cyan
  ];

  if (trainingState.courseChartInstance) {
    trainingState.courseChartInstance.destroy();
    trainingState.courseChartInstance = null;
  }

  const canvas = document.getElementById('training-course-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  trainingState.courseChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['ไม่มีข้อมูล'],
      datasets: [{
        data: data.length > 0 ? data : [0],
        backgroundColor: chartColors.slice(0, labels.length),
        borderColor: isDark ? '#1e1e1e' : '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'Sarabun', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
              const val = context.raw;
              const pct = Math.round((val / total) * 100);
              return ` ผู้รับเหมา: ${val} คน (${pct}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

function renderTrainingTopCompanies() {
  const companies = {};
  trainingState.rawData.forEach(item => {
    const comp = (item.company || 'ไม่ระบุบริษัท').trim();
    companies[comp] = (companies[comp] || 0) + 1;
  });

  const sortedComps = Object.keys(companies)
    .map(key => ({ name: key, count: companies[key] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxCount = sortedComps.length > 0 ? sortedComps[0].count : 1;
  const listContainer = document.getElementById('training-top-companies');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';

  if (sortedComps.length === 0) {
    listContainer.innerHTML = '<p style="text-align: center; color: #78909c; padding: 24px;">ไม่มีข้อมูลผู้รับเหมา</p>';
    return;
  }

  sortedComps.forEach((item, index) => {
    const pct = Math.round((item.count / maxCount) * 100);
    const barColors = ['var(--primary-color)', '#3f51b5', '#00bcd4', '#9c27b0', '#607d8b'];
    const color = barColors[index] || '#607d8b';
    
    const row = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">${index + 1}. ${item.name}</span>
          <span>${item.count} คน</span>
        </div>
        <div style="width: 100%; height: 8px; background-color: var(--light-bg); border-radius: 4px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background-color: ${color}; border-radius: 4px; transition: width 0.5s ease;"></div>
        </div>
      </div>
    `;
    listContainer.innerHTML += row;
  });
}

function setTrainingQuickFilter(filter) {
  trainingState.activeFilter = filter;
  trainingState.currentPage = 1;
  
  const buttons = {
    all: document.getElementById('btn-t-filter-all'),
    pending: document.getElementById('btn-t-filter-pending'),
    rejected: document.getElementById('btn-t-filter-rejected')
  };
  
  Object.keys(buttons).forEach(key => {
    if (buttons[key]) {
      buttons[key].className = 'btn btn-outline';
    }
  });
  
  if (buttons[filter]) {
    buttons[filter].className = 'btn btn-primary';
  }
  
  applyTrainingFiltersAndSearch();
}

function handleTrainingSearch() {
  const input = document.getElementById('training-search-input');
  trainingState.searchQuery = input ? input.value.toLowerCase().trim() : '';
  trainingState.currentPage = 1;
  applyTrainingFiltersAndSearch();
}

function applyTrainingFiltersAndSearch() {
  let temp = trainingState.rawData.filter(item => {
    const idVal = (item.idCard || '').toString().toLowerCase();
    const nameVal = (item.name || '').toString().toLowerCase();
    const justIdVal = (item.justIdNo || '').toString().toLowerCase();
    const compVal = (item.company || '').toString().toLowerCase();
    
    const matchesSearch = trainingState.searchQuery === '' || 
      idVal.includes(trainingState.searchQuery) || 
      nameVal.includes(trainingState.searchQuery) || 
      justIdVal.includes(trainingState.searchQuery) || 
      compVal.includes(trainingState.searchQuery);
      
    if (!matchesSearch) return false;

    const doc = (item.docStatus || '').toString().toLowerCase().trim();
    const just = (item.justIdStatus || '').toString().toLowerCase().trim();

    if (trainingState.activeFilter === 'pending') {
      return doc === '' || doc === 'รอตรวจสอบ' || doc === 'pending';
    } else if (trainingState.activeFilter === 'rejected') {
      return doc === 'reject' || doc === 'ไม่ผ่าน' || just === 'reject' || just === 'ไม่ผ่าน';
    }
    
    return true;
  });

  // Apply Sorting
  temp.sort((a, b) => {
    const dateA = parseTrainingTimestamp(a.timestamp);
    const dateB = parseTrainingTimestamp(b.timestamp);
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;

    if (trainingState.sortColumn === 'timestamp') {
      return trainingState.sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    }

    if (trainingState.sortColumn === 'justIdNo') {
      const valA = (a.justIdNo || '').toString().trim();
      const valB = (b.justIdNo || '').toString().trim();

      if (valA === '' && valB === '') return timeB - timeA;
      if (valA === '') return 1;
      if (valB === '') return -1;

      if (valA !== valB) {
        return trainingState.sortDirection === 'desc' 
          ? valB.localeCompare(valA, 'th') 
          : valA.localeCompare(valB, 'th');
      }
      return timeB - timeA;
    }

    let valA = (a[trainingState.sortColumn] || '').toString().toLowerCase().trim();
    let valB = (b[trainingState.sortColumn] || '').toString().toLowerCase().trim();

    if (valA !== valB) {
      if (valA < valB) return trainingState.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return trainingState.sortDirection === 'asc' ? 1 : -1;
    }
    return timeB - timeA;
  });

  trainingState.filteredData = temp;
  updateTrainingSortIcons();
  renderTrainingTable();
}

function handleTrainingSort(column) {
  if (trainingState.sortColumn === column) {
    trainingState.sortDirection = trainingState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    trainingState.sortColumn = column;
    trainingState.sortDirection = 'asc';
  }
  trainingState.currentPage = 1;
  applyTrainingFiltersAndSearch();
}

function updateTrainingSortIcons() {
  const columns = ['timestamp', 'idCard', 'name', 'company', 'course', 'scoreStatus', 'docStatus', 'justIdStatus', 'justIdNo'];
  columns.forEach(col => {
    const icon = document.getElementById(`sort-t-icon-${col}`);
    if (!icon) return;
    
    if (trainingState.sortColumn === col) {
      icon.innerHTML = trainingState.sortDirection === 'asc' 
        ? '<i class="fa-solid fa-sort-up"></i>' 
        : '<i class="fa-solid fa-sort-down"></i>';
      icon.style.color = 'var(--primary-color)';
    } else {
      icon.innerHTML = '<i class="fa-solid fa-sort"></i>';
      icon.style.color = '#ccc';
    }
  });
}

function renderTrainingTable() {
  const tbody = document.getElementById('training-table-body');
  const mobileContainer = document.getElementById('training-mobile-cards');
  const emptyEl = document.getElementById('training-table-empty');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (mobileContainer) mobileContainer.innerHTML = '';
  
  const total = trainingState.filteredData.length;
  if (total === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    const infoEl = document.getElementById('training-pagination-info');
    if (infoEl) infoEl.innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
    const ctrlEl = document.getElementById('training-pagination-controls');
    if (ctrlEl) ctrlEl.innerHTML = '';
    return;
  }
  
  if (emptyEl) emptyEl.style.display = 'none';
  
  const startIdx = (trainingState.currentPage - 1) * trainingState.pageSize;
  const endIdx = Math.min(startIdx + trainingState.pageSize, total);
  
  const pageData = trainingState.filteredData.slice(startIdx, endIdx);
  
  pageData.forEach(item => {
    const scoreVal = (item.scoreStatus || '').toString().trim();
    let scoreBadge = '<span class="status-badge pending">รอผลสอบ</span>';
    if (scoreVal === 'ผ่าน' || scoreVal.toLowerCase() === 'pass') {
      scoreBadge = '<span class="status-badge active">ผ่าน</span>';
    } else if (scoreVal === 'ไม่ผ่าน' || scoreVal.toLowerCase() === 'fail') {
      scoreBadge = '<span class="status-badge inactive">ไม่ผ่าน</span>';
    } else if (scoreVal) {
      scoreBadge = `<span class="status-badge pending">${scoreVal}</span>`;
    }
      
    const docVal = (item.docStatus || '').toString().toLowerCase().trim();
    let docBadge = '<span class="status-badge pending">รอตรวจ</span>';
    if (docVal === 'approve' || docVal === 'ผ่าน' || docVal === 'อนุมัติ') {
      docBadge = '<span class="status-badge active">ผ่าน</span>';
    } else if (docVal === 'reject' || docVal === 'ไม่ผ่าน' || docVal === 'ไม่อนุมัติ') {
      docBadge = '<span class="status-badge inactive">ไม่ผ่าน</span>';
    } else if (docVal.includes('แก้รูป') || docVal === 'edit' || docVal.includes('แก้ไขรูป')) {
      docBadge = '<span class="status-badge pending" style="background-color: #fff3e0; color: #ff9800; border-color: #ffe0b2;">แก้รูป</span>';
    } else if (item.docStatus) {
      docBadge = `<span class="status-badge pending">${item.docStatus}</span>`;
    }
    
    const justVal = (item.justIdStatus || '').toString().toLowerCase().trim();
    let justBadge = '<span class="status-badge pending">-</span>';
    if (justVal === 'approve' || justVal === 'ผ่าน' || justVal === 'อนุมัติ') {
      justBadge = '<span class="status-badge active">อนุมัติ</span>';
    } else if (justVal === 'reject' || justVal === 'ไม่ผ่าน' || justVal === 'ไม่อนุมัติ') {
      justBadge = '<span class="status-badge inactive">ไม่อนุมัติ</span>';
    } else if (item.justIdStatus) {
      justBadge = `<span class="status-badge pending">${item.justIdStatus}</span>`;
    }

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => openTrainingDetailsModal(item);
    tr.innerHTML = `
      <td>${formatTrainingDate(item.timestamp)}</td>
      <td><strong>${item.idCard || '-'}</strong></td>
      <td>${item.name || '-'}</td>
      <td>${item.company || '-'}</td>
      <td>${item.course || '-'}</td>
      <td style="text-align: center;">${scoreBadge}</td>
      <td style="text-align: center;">${docBadge}</td>
      <td style="text-align: center;">${justBadge}</td>
      <td><strong style="color: var(--primary-color);">${item.justIdNo || '-'}</strong></td>
    `;
    tbody.appendChild(tr);

    // Mobile view card
    if (mobileContainer) {
      const card = document.createElement('div');
      card.className = 'mobile-card';
      card.style.cursor = 'pointer';
      card.onclick = () => openTrainingDetailsModal(item);
      card.innerHTML = `
        <div class="mobile-card-row">
          <strong>ชื่อ-นามสกุล:</strong>
          <span>${item.name || '-'}</span>
        </div>
        <div class="mobile-card-row">
          <strong>บริษัท:</strong>
          <span>${item.company || '-'}</span>
        </div>
        <div class="mobile-card-row">
          <strong>หลักสูตร:</strong>
          <span>${item.course || '-'}</span>
        </div>
        <div class="mobile-card-row">
          <strong>สถานะตรวจเอกสาร:</strong>
          <span>${docBadge}</span>
        </div>
        <div class="mobile-card-row">
          <strong>เลข JUST ID:</strong>
          <span style="color: var(--primary-color); font-weight: 700;">${item.justIdNo || '-'}</span>
        </div>
      `;
      mobileContainer.appendChild(card);
    }
  });

  // Update pagination info
  const infoEl = document.getElementById('training-pagination-info');
  if (infoEl) infoEl.innerText = `แสดง ${startIdx + 1} ถึง ${endIdx} จาก ${total} รายการ`;
  
  // Render pagination controls
  const totalPages = Math.ceil(total / trainingState.pageSize);
  const controls = document.getElementById('training-pagination-controls');
  if (!controls) return;
  controls.innerHTML = '';
  
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = `btn btn-outline ${trainingState.currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.style.padding = '4px 8px';
  prevBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
  prevBtn.disabled = trainingState.currentPage === 1;
  prevBtn.onclick = () => {
    if (trainingState.currentPage > 1) {
      trainingState.currentPage--;
      applyTrainingFiltersAndSearch();
    }
  };
  controls.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= trainingState.currentPage - 1 && i <= trainingState.currentPage + 1)) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `btn ${trainingState.currentPage === i ? 'btn-primary' : 'btn-outline'}`;
      pageBtn.style.padding = '4px 10px';
      pageBtn.innerText = i;
      pageBtn.onclick = () => {
        trainingState.currentPage = i;
        applyTrainingFiltersAndSearch();
      };
      controls.appendChild(pageBtn);
    } else if (i === 2 || i === totalPages - 1) {
      const dots = document.createElement('span');
      dots.innerText = '...';
      dots.style.padding = '0 4px';
      controls.appendChild(dots);
    }
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = `btn btn-outline ${trainingState.currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.style.padding = '4px 8px';
  nextBtn.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
  nextBtn.disabled = trainingState.currentPage === totalPages;
  nextBtn.onclick = () => {
    if (trainingState.currentPage < totalPages) {
      trainingState.currentPage++;
      applyTrainingFiltersAndSearch();
    }
  };
  controls.appendChild(nextBtn);
}

function changeTrainingPageSize() {
  const selector = document.getElementById('training-page-size');
  if (selector) {
    trainingState.pageSize = parseInt(selector.value, 10);
    trainingState.currentPage = 1;
    applyTrainingFiltersAndSearch();
  }
}

function formatTrainingDate(dateStr) {
  if (!dateStr) return '-';
  const date = parseTrainingTimestamp(dateStr);
  if (!date) return dateStr;
  
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear() + 543;
  return `${d}/${m}/${y}`;
}

function exportTrainingToCSV() {
  const headers = ['วันที่/เวลาอบรม', 'เลขบัตรประชาชน', 'ชื่อ-นามสกุล', 'บริษัท', 'หลักสูตร', 'สถานะคะแนน', 'สถานะตรวจเอกสาร', 'สถานะ JUST ID', 'เลข JUST ID', 'หมายเหตุ'];
  const rows = trainingState.filteredData.map(item => [
    formatTrainingDate(item.timestamp),
    item.idCard || '',
    item.name || '',
    item.company || '',
    item.course || '',
    item.scoreStatus || '',
    item.docStatus || '',
    item.justIdStatus || '',
    item.justIdNo || '',
    item.note || ''
  ]);

  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += headers.join(",") + "\n";
  rows.forEach(row => {
    const escapedRow = row.map(val => `"${val.toString().replace(/"/g, '""')}"`);
    csvContent += escapedRow.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `รายงานผู้รับเหมา_อบรมและJUSTID_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- ส่วนช่วยเปิดรายละเอียดผู้รับเหมาในการอบรม ---
function getTrainingScoreBadge(scoreVal) {
  const cleanVal = (scoreVal || '').toString().toLowerCase().trim();
  if (cleanVal === 'ผ่าน' || cleanVal === 'pass') {
    return '<span class="status-badge active">ผ่าน</span>';
  } else if (cleanVal === 'ไม่ผ่าน' || cleanVal === 'fail') {
    return '<span class="status-badge inactive">ไม่ผ่าน</span>';
  } else if (scoreVal) {
    return `<span class="status-badge pending">${scoreVal}</span>`;
  } else {
    return '<span class="status-badge pending">รอผลสอบ</span>';
  }
}

function getTrainingStatusBadge(val) {
  const cleanVal = (val || '').toString().toLowerCase().trim();
  if (cleanVal === 'approve' || cleanVal === 'ผ่าน' || cleanVal === 'อนุมัติ') {
    return '<span class="status-badge active">อนุมัติ</span>';
  } else if (cleanVal === 'reject' || cleanVal === 'ไม่ผ่าน' || cleanVal === 'ไม่อนุมัติ') {
    return '<span class="status-badge inactive">ไม่อนุมัติ</span>';
  } else if (cleanVal.includes('แก้รูป') || cleanVal === 'edit' || cleanVal.includes('แก้ไขรูป')) {
    return '<span class="status-badge pending" style="background-color: #fff3e0; color: #ff9800; border-color: #ffe0b2;">แก้รูป</span>';
  } else if (val) {
    return `<span class="status-badge pending">${val}</span>`;
  } else {
    return '<span class="status-badge pending">รอตรวจ</span>';
  }
}

function openTrainingDetailsModal(item) {
  document.getElementById('t-modal-name').innerText = item.name || 'ไม่ระบุชื่อ';
  document.getElementById('t-modal-company').innerText = item.company || 'ไม่ระบุบริษัท';
  document.getElementById('t-modal-idcard').innerText = item.idCard || '-';
  document.getElementById('t-modal-course').innerText = item.course || '-';
  document.getElementById('t-modal-date').innerText = formatTrainingDate(item.timestamp);
  document.getElementById('t-modal-justidno').innerText = item.justIdNo || 'ไม่มีข้อมูล';

  const scoreVal = (item.scoreStatus || '').toString().trim();
  document.getElementById('t-modal-status-score').innerHTML = getTrainingScoreBadge(scoreVal);
  document.getElementById('t-modal-status-doc').innerHTML = getTrainingStatusBadge(item.docStatus);
  document.getElementById('t-modal-status-justid').innerHTML = getTrainingStatusBadge(item.justIdStatus);

  // ตรวจสอบข้อมูล Note/Remark ไม่อนุมัติ
  const rejectBox = document.getElementById('t-modal-alert-box');
  const rejectTitle = document.getElementById('t-modal-alert-title');
  const rejectDesc = document.getElementById('t-modal-alert-desc');
  
  const docVal = (item.docStatus || '').toString().toLowerCase().trim();
  const justVal = (item.justIdStatus || '').toString().toLowerCase().trim();
  const noteVal = (item.note || '').toString().trim();

  const isReject = docVal.includes('reject') || docVal.includes('ไม่ผ่าน') || justVal.includes('reject') || justVal.includes('ไม่ผ่าน');
  const isPhotoEdit = docVal.includes('แก้รูป') || docVal.includes('edit') || justVal.includes('แก้รูป') || justVal.includes('edit');

  if (isReject) {
    rejectBox.style.display = 'block';
    rejectBox.style.backgroundColor = '#ffebee';
    rejectBox.style.color = 'var(--danger-color)';
    rejectBox.style.borderColor = '#ffcdd2';
    rejectTitle.innerText = 'ไม่ผ่านการอนุมัติ (Rejected)';
    rejectDesc.innerText = noteVal || 'เอกสารไม่สมบูรณ์หรือข้อมูลไม่ถูกต้อง กรุณาติดต่อฝ่ายความปลอดภัย';
  } else if (isPhotoEdit) {
    rejectBox.style.display = 'block';
    rejectBox.style.backgroundColor = '#fff3e0';
    rejectBox.style.color = '#e65100';
    rejectBox.style.borderColor = '#ffe0b2';
    rejectTitle.innerText = 'ติดสถานะแก้ไขรูปภาพ (Photo Edit Required)';
    rejectDesc.innerText = noteVal || 'รูปถ่ายหน้าไม่ชัดเจน หรือไม่ตรงกับบัตรประชาชน กรุณาอัปโหลดรูปภาพใหม่';
  } else {
    rejectBox.style.display = 'none';
  }

  const remarkSection = document.getElementById('t-modal-remark-section');
  if (noteVal && !isReject && !isPhotoEdit) {
    document.getElementById('t-modal-remark').innerText = noteVal;
    remarkSection.style.display = 'flex';
  } else {
    remarkSection.style.display = 'none';
  }

  openModal('training-details-modal');
}

// --- แสดงผลข้อมูลแผนกและผู้รับผิดชอบเมื่อมีการเลือกพื้นที่ปฏิบัติงาน ---
function updatePatrolResponsibleInfo() {
  const dept = document.getElementById('p-dept').value;
  const infoDiv = document.getElementById('p-responsible-info');
  
  if (!dept) {
    if (infoDiv) infoDiv.style.display = 'none';
    return;
  }
  
  const mapping = appState.areaMapping.find(item => item['แผนกที่รับผิดชอบ'] === dept);
  if (mapping) {
    document.getElementById('p-info-dept').innerText = mapping['แผนกที่รับผิดชอบ'] || '-';
    document.getElementById('p-info-owner').innerText = mapping['เจ้าของพื้นที่'] || '-';
    document.getElementById('p-info-owner-email').innerText = mapping['อีเมลเจ้าของพื้นที่'] || '-';
    document.getElementById('p-info-proj').innerText = mapping['ผู้ควบคุมงานโครงการ'] || '-';
    document.getElementById('p-info-proj-email').innerText = mapping['อีเมลผู้ควบคุมโครงการ'] || '-';
    if (infoDiv) infoDiv.style.display = 'block';
  } else {
    if (infoDiv) infoDiv.style.display = 'none';
  }
}

// สลับแท็บย่อยฝั่งลงทะเบียนและตรวจอุปกรณ์
function switchEqTab(tabId) {
  // ซ่อนทุกแท็บวิว
  document.querySelectorAll('.eq-tab-view').forEach(view => {
    view.style.display = 'none';
  });
  // แสดงแท็บที่เลือก
  document.getElementById(tabId).style.display = 'block';
  
  // จัดคลาส active ที่ปุ่มแท็บ
  document.querySelectorAll('.tab-container .tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (tabId === 'eq-registered-view') {
    document.getElementById('btn-eq-registered').classList.add('active');
    renderEquipmentTable();
  } else if (tabId === 'eq-daily-audit-view') {
    document.getElementById('btn-eq-audit').classList.add('active');
    renderAuditLogsTable();
  } else if (tabId === 'eq-ppe-view') {
    document.getElementById('btn-eq-ppe').classList.add('active');
    renderPpeLogsTable();
  }
}

// เรนเดอร์ตารางสถิติส่งตรวจอุปกรณ์รายวัน (Daily Audit Logs)
function renderAuditLogsTable() {
  const tbody = document.getElementById('audit-table-body');
  const mobileCards = document.getElementById('audit-mobile-cards');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  mobileCards.innerHTML = '';
  
  if (!appState.inspectionLogs || appState.inspectionLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #78909c;">ไม่มีข้อมูลสถิติส่งตรวจในขณะนี้</td></tr>';
    return;
  }
  
  // กรองเอาเฉพาะข้อมูลหมวดเครื่องมือช่าง
  const toolLogs = (appState.inspectionLogs || []).filter(log => log['หมวดหมู่'] === 'เครื่องมือช่าง' || !log['ประเภทอุปกรณ์ PPE'] || log['ประเภทอุปกรณ์ PPE'] === '-');
  // เรียงลำดับจากใหม่สุดไปเก่าสุด
  const sortedLogs = [...toolLogs].sort((a, b) => new Date(b['วันที่']) - new Date(a['วันที่']));
  
  sortedLogs.forEach(log => {
    const total = parseInt(log['จำนวนส่งตรวจทั้งหมด']) || 0;
    const pass = parseInt(log['ผ่านการตรวจ']) || 0;
    const fail = parseInt(log['ไม่ผ่าน']) || 0;
    const rate = total > 0 ? ((pass / total) * 100).toFixed(1) + '%' : '0%';
    
    // ใส่สีสเตตัสอัตราความใส่ใจ
    let rateClass = 'active'; // เขียว
    if (parseFloat(rate) < 80) {
      rateClass = 'pending'; // ส้ม
    }
    if (parseFloat(rate) < 60) {
      rateClass = 'inactive'; // แดง
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatThaiDate(log['วันที่'])}</td>
      <td style="font-weight: 600; color: var(--primary-color);">${log['บริษัทผู้รับเหมา']}</td>
      <td>${total} ชิ้น</td>
      <td>${pass} ชิ้น</td>
      <td><span style="color: var(--danger-color); font-weight: 600;">${fail}</span></td>
      <td><span class="status-badge ${rateClass}">${rate}</span></td>
      <td style="font-size: 12px; color: #546e7a;">${log['สาเหตุที่ไม่ผ่าน/หมายเหตุ'] || '-'}</td>
    `;
    tbody.appendChild(tr);
    
    // แบบย่อสำหรับมือถือ
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: var(--primary-color);">${log['บริษัทผู้รับเหมา']}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>วันที่:</strong> ${formatThaiDate(log['วันที่'])}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>ยอดนำมาส่งตรวจ:</strong> ${total} ชิ้น (ผ่าน ${pass} / ไม่ผ่าน <span style="color: var(--danger-color);">${fail}</span>)</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>อัตราส่วนผ่าน:</strong> <span class="status-badge ${rateClass}">${rate}</span></div>
      <div style="font-size: 12px; color: #78909c; border-top: 1px dashed #eee; padding-top: 6px; margin-top: 6px;"><strong>เหตุผล:</strong> ${log['สาเหตุที่ไม่ผ่าน/หมายเหตุ'] || '-'}</div>
    `;
    mobileCards.appendChild(card);
  });
}

// คำนวณหาจำนวนอุปกรณ์ตกเกณฑ์ตรวจสอบอัตโนมัติ
function calculateAuditFailCount() {
  const total = parseInt(document.getElementById('audit-total').value) || 0;
  const pass = parseInt(document.getElementById('audit-pass').value) || 0;
  
  const fail = Math.max(0, total - pass);
  
  document.getElementById('audit-fail-label').innerText = fail;
  document.getElementById('audit-fail').value = fail;
}

// บันทึกรายงานยอดเครื่องมือส่งตรวจประจำวัน
async function saveDailyAudit(e) {
  e.preventDefault();
  const date = document.getElementById('audit-date').value;
  const contractor = document.getElementById('audit-contractor').value;
  const total = parseInt(document.getElementById('audit-total').value) || 0;
  const pass = parseInt(document.getElementById('audit-pass').value) || 0;
  const fail = parseInt(document.getElementById('audit-fail').value) || 0;
  const notes = document.getElementById('audit-notes').value.trim();
  
  if (pass > total) {
    alert('จำนวนอุปกรณ์ที่ผ่านไม่สามารถมากกว่าจำนวนที่ส่งตรวจทั้งหมดได้ครับ');
    return;
  }
  
  const payload = {
    date: date,
    contractor: contractor,
    totalCount: total,
    passCount: pass,
    failCount: fail,
    notes: notes,
    category: 'เครื่องมือช่าง',
    type: '-'
  };
  
  closeModal('add-daily-audit-modal');
  const success = await sendActionToServer('addInspectionLog', payload);
  if (success) {
    document.getElementById('audit-form').reset();
  }
}

// ส่งรายงานรวมแบบสะสม (Digest Email) และแจ้งเตือน Telegram
async function sendPatrolDigest() {
  // กรองหาข้อบกพร่องที่ค้างส่งในแคชหน้าเว็บ เพื่อแจ้งเตือนยืนยันผู้ใช้งาน
  const unsentLogs = appState.patrolLogs.filter(log => log['สถานะการส่งอีเมล'] !== 'ส่งแล้ว');
  const unsentCount = unsentLogs.length;
  
  if (unsentCount === 0) {
    alert('ไม่มีรายงานความปลอดภัยใหม่ที่ยังไม่ได้ส่งในรอบนี้ครับ');
    return;
  }
  
  // ค้นหาชื่อ จป. ที่มีรายงานค้างส่ง
  const inspectorsWithUnsent = [...new Set(unsentLogs.map(log => log['ผู้ตรวจสอบ'] || log['ผู้ตรวจบันทึก']).filter(Boolean))];
  
  let targetInspector = 'ทั้งหมด';
  if (inspectorsWithUnsent.length > 1) {
    const choices = inspectorsWithUnsent.join(', ');
    const input = prompt(`พบลายเซ็น จป. ที่มีงานค้างส่งดังนี้: ${choices}\n\nกรุณาพิมพ์ชื่อ จป. ที่ต้องการส่งรายงานสรุป (หรือพิมพ์ "ทั้งหมด" เพื่อส่งของทุกคนพร้อมกัน):`, 'ทั้งหมด');
    if (input === null) return; // กดยกเลิก
    if (input.trim()) {
      targetInspector = input.trim();
    }
  } else if (inspectorsWithUnsent.length === 1) {
    const confirmSend = confirm(`พบรายงานความปลอดภัยของ จป. "${inspectorsWithUnsent[0]}" ค้างอยู่จำนวน ${unsentCount} รายการ\nต้องการจัดส่งอีเมลและส่งข้อมูลเข้ากลุ่ม Telegram ตอนนี้เลยใช่หรือไม่?`);
    if (!confirmSend) return;
    targetInspector = inspectorsWithUnsent[0];
  } else {
    if (!confirm(`มีข้อมูลข้อบกพร่องความปลอดภัยใหม่สะสมรอจัดส่งอยู่ทั้งหมด ${unsentCount} รายการ\nต้องการส่งจดหมายสรุปรายงานแยกตามแผนกเจ้าของพื้นที่ และยิงแจ้งเตือนแผนกความปลอดภัยผ่าน Telegram ตอนนี้เลยใช่หรือไม่?`)) {
      return;
    }
  }
  
  showConnectionStatus('loading');
  
  if (SCRIPT_URL) {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'sendPatrolDigest',
          inspector: targetInspector
        })
      });
      
      alert('ส่งรายงานสรุปแจ้งเตือนแบบ Digest และยิงแจ้งเตือนผ่าน Telegram สำเร็จแล้วครับ!');
      setTimeout(() => { loadData(); }, 1500);
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์เพื่อจัดส่งอีเมล: ' + e.message);
    }
  } else {
    // โหมดจำลองออฟไลน์
    appState.patrolLogs.forEach(log => {
      log['สถานะการส่งอีเมล'] = 'ส่งแล้ว';
    });
    localStorage.setItem('cached_patrolLogs', JSON.stringify(appState.patrolLogs));
    alert('[โหมดจำลอง] ทำการเคลียร์และทำเครื่องหมายส่งรายงานเสร็จสิ้นแล้ว');
    loadData();
  }
}

// ล้างข้อมูลทดสอบในเครื่องบราวเซอร์ (Reset Local Cache)
function resetAppCache() {
  if (!confirm('คุณต้องการรีเซ็ตข้อมูลและล้างข้อมูลทดสอบทั้งหมดเฉพาะที่แคชในเครื่องคอมพิวเตอร์ของคุณเพื่อกลับสู่การโหลดเริ่มต้นใช่หรือไม่? (ไม่มีผลต่อข้อมูลบน Google Sheets จริง)')) {
    return;
  }
  
  localStorage.removeItem('cached_contractors');
  localStorage.removeItem('cached_equipment');
  localStorage.removeItem('cached_patrolLogs');
  localStorage.removeItem('cached_inspectionLogs');
  
  alert('ทำการล้างข้อมูลแคชออฟไลน์เรียบร้อยแล้ว ระบบจะทำการรีโหลดหน้าจอใหม่ครับ');
  window.location.reload();
}

// --- ตัวแปรควบคุมการทำงานของกล้องสแกนคิวอาร์โค้ด ---
let html5QrcodeScanner = null;

function startQrScan(targetInputId) {
  openModal('qr-scanner-modal');
  
  // หน่วงเวลารอให้โมดอลเปิดขึ้นมาแสดงผลก่อนเรนเดอร์กล้อง
  setTimeout(() => {
    try {
      html5QrcodeScanner = new Html5Qrcode("qr-reader");
      
      const config = { fps: 15, qrbox: { width: 250, height: 250 } };
      
      html5QrcodeScanner.start(
        { facingMode: "environment" }, // บังคับใช้กล้องหลังมือถือ
        config,
        (decodedText) => {
          // เมื่อสแกนคิวอาร์สำเร็จ
          let serial = decodedText;
          
          // ตรวจสอบหากลิงก์มีพารามิเตอร์รหัสต่อท้าย ให้ถอดเอาเฉพาะซีเรียลอุปกรณ์
          if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
            try {
              const url = new URL(decodedText);
              // 1. ลองดึงจาก ?serial=
              let val = url.searchParams.get('serial');
              if (val) {
                serial = val;
              } else {
                // 2. ลองดึงจาก ?id=
                val = url.searchParams.get('id');
                if (val) {
                  const eq = appState.equipment.find(item => item['ID'] === val);
                  if (eq) {
                    serial = eq['หมายเลขซีเรียล'];
                  } else {
                    serial = val;
                  }
                } else {
                  // 3. ดึงค่าสุดท้ายของ path เผื่อเป็นลิงก์ตรงที่ไม่มี param
                  serial = decodedText.substring(decodedText.lastIndexOf('/') + 1);
                }
              }
            } catch (e) {
              console.error('URL parse error:', e);
              if (decodedText.indexOf('/') > -1) {
                serial = decodedText.substring(decodedText.lastIndexOf('/') + 1);
              }
            }
          } else if (decodedText.indexOf('/') > -1) {
            // ดึงค่าสุดท้ายของ URL เผื่อเป็นการสแกนลิงก์ตรงที่ไม่มีโปรโตคอล
            serial = decodedText.substring(decodedText.lastIndexOf('/') + 1);
          }
          
          document.getElementById(targetInputId).value = serial;
          
          // สั่นสั้นๆ บนมือถือถ้าเครื่องรองรับ
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          
          stopQrScan();
          
          if (targetInputId === 'dashboard-lookup-serial') {
            lookupEquipmentStatus(serial);
          } else if (targetInputId === 'renew-search-input') {
            searchEquipmentForRenewal();
          } else {
            alert('สแกนพบคิวอาร์ซีเรียลอุปกรณ์: ' + serial);
          }
        },
        (errorMessage) => {
          // ปล่อยผ่านเป็นความผิดพลาดปกติในการสแกนเฟรม
        }
      ).catch(err => {
        console.error('กล้องมีปัญหา:', err);
        alert('ไม่สามารถเปิดใช้งานกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องบนเบราว์เซอร์ของคุณ');
        stopQrScan();
      });
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการโหลดไลบรารีสแกนคิวอาร์');
      stopQrScan();
    }
  }, 300);
}

function stopQrScan() {
  closeModal('qr-scanner-modal');
  if (html5QrcodeScanner) {
    try {
      html5QrcodeScanner.stop().then(() => {
        html5QrcodeScanner = null;
      }).catch(err => {
        console.error('Stop error:', err);
        html5QrcodeScanner = null;
      });
    } catch (e) {
      html5QrcodeScanner = null;
    }
  }
}

// =========================================================================
// ==================== PPE REGISTRATION & AUDIT LOGIC =====================
// =========================================================================

// ฟังก์ชันเปิด/ปิด Checkbox หน้าอุปกรณ์ทั้งหมด
function toggleAllEqCheckboxes(master) {
  const checkboxes = document.querySelectorAll('.eq-row-checkbox');
  checkboxes.forEach(cb => cb.checked = master.checked);
  updateEqBulkPrintButtonVisibility();
}

// ฟังก์ชันเปิด/ปิด Checkbox หน้า PPE ทั้งหมด
function toggleAllPpeCheckboxes(master) {
  const checkboxes = document.querySelectorAll('.ppe-row-checkbox');
  checkboxes.forEach(cb => cb.checked = master.checked);
}

// คำนวณจำนวน PPE ตกเกณฑ์ตรวจสอบอัตโนมัติ
function calculatePpeFailCount() {
  const total = parseInt(document.getElementById('ppe-total').value) || 0;
  const pass = parseInt(document.getElementById('ppe-pass').value) || 0;
  const fail = Math.max(0, total - pass);
  document.getElementById('ppe-fail-label').innerText = fail;
  document.getElementById('ppe-fail').value = fail;
}

// บันทึกรายงานยอด PPE ส่งตรวจและขึ้นทะเบียน
async function savePpeAudit(e) {
  e.preventDefault();
  const date = document.getElementById('ppe-date').value;
  const contractor = document.getElementById('ppe-contractor').value;
  const ppeType = document.getElementById('ppe-type').value;
  const total = parseInt(document.getElementById('ppe-total').value) || 0;
  const pass = parseInt(document.getElementById('ppe-pass').value) || 0;
  const fail = parseInt(document.getElementById('ppe-fail').value) || 0;
  const notes = document.getElementById('ppe-notes').value.trim();
  
  if (pass > total) {
    alert('จำนวนอุปกรณ์ที่ผ่านไม่สามารถมากกว่าจำนวนที่ส่งตรวจทั้งหมดได้ครับ');
    return;
  }
  
  const payload = {
    date: date,
    contractor: contractor,
    totalCount: total,
    passCount: pass,
    failCount: fail,
    notes: notes,
    category: 'PPE',
    type: ppeType
  };
  
  closeModal('add-ppe-audit-modal');
  const success = await sendActionToServer('addInspectionLog', payload);
  if (success) {
    document.getElementById('ppe-form').reset();
  }
}

// เรนเดอร์ตารางประวัติตรวจสอบและขึ้นทะเบียน PPE
function renderPpeLogsTable() {
  const tbody = document.getElementById('ppe-table-body');
  const mobileCards = document.getElementById('ppe-mobile-cards');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  mobileCards.innerHTML = '';
  
  // กรองเอาเฉพาะข้อมูลหมวด PPE
  const ppeLogs = (appState.inspectionLogs || []).filter(log => log['หมวดหมู่'] === 'PPE' || (log['ประเภทอุปกรณ์ PPE'] && log['ประเภทอุปกรณ์ PPE'] !== '-'));
  
  if (ppeLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #78909c;">ไม่มีข้อมูลตรวจสอบ PPE ในขณะนี้</td></tr>';
    return;
  }
  
  // เรียงลำดับจากใหม่สุดไปเก่าสุด
  const sortedLogs = [...ppeLogs].sort((a, b) => new Date(b['วันที่']) - new Date(a['วันที่']));
  
  sortedLogs.forEach(log => {
    const total = parseInt(log['จำนวนส่งตรวจทั้งหมด']) || 0;
    const pass = parseInt(log['ผ่านการตรวจ']) || 0;
    const fail = parseInt(log['ไม่ผ่าน']) || 0;
    const rate = total > 0 ? ((pass / total) * 100).toFixed(1) + '%' : '0%';
    
    let rateClass = 'active'; // เขียว
    if (parseFloat(rate) < 80) rateClass = 'pending'; // ส้ม
    if (parseFloat(rate) < 60) rateClass = 'inactive'; // แดง
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;"><input type="checkbox" class="ppe-row-checkbox" value="${log['ID']}"></td>
      <td>${formatThaiDate(log['วันที่'])}</td>
      <td style="font-weight: 600; color: var(--primary-color);">${log['บริษัทผู้รับเหมา']}</td>
      <td style="font-weight: 600;">${log['ประเภทอุปกรณ์ PPE'] || '-'}</td>
      <td>${total} ชิ้น</td>
      <td><span style="color: var(--success-color); font-weight: 600;">${pass}</span></td>
      <td><span style="color: var(--danger-color); font-weight: 600;">${fail}</span></td>
      <td><span class="status-badge ${rateClass}">${rate}</span></td>
      <td style="font-size: 12px; color: #546e7a;">${log['สาเหตุที่ไม่ผ่าน/หมายเหตุ'] || '-'}</td>
      <td>
        <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="printPpeTags('${log['ID']}')">
          <i class="fa-solid fa-print"></i> พิมพ์ป้าย
        </button>
      </td>
    `;
    tbody.appendChild(tr);
    
    // การ์ดสำหรับมือถือ
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: var(--primary-color);">${log['บริษัทผู้รับเหมา']}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>ประเภท PPE:</strong> ${log['ประเภทอุปกรณ์ PPE'] || '-'}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>วันที่ตรวจ:</strong> ${formatThaiDate(log['วันที่'])}</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>ยอดนำตรวจ:</strong> ${total} ชิ้น (ผ่าน ${pass} / ไม่ผ่าน <span style="color: var(--danger-color);">${fail}</span>)</div>
      <div style="font-size: 13px; margin-bottom: 4px;"><strong>อัตราผ่าน:</strong> <span class="status-badge ${rateClass}">${rate}</span></div>
      <div style="font-size: 12px; color: #78909c; border-top: 1px dashed #eee; padding-top: 6px; margin-top: 6px;"><strong>หมายเหตุ:</strong> ${log['สาเหตุที่ไม่ผ่าน/หมายเหตุ'] || '-'}</div>
      <div style="text-align: right; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="printPpeTags('${log['ID']}')">
          <i class="fa-solid fa-print"></i> พิมพ์ป้ายสติกเกอร์
        </button>
      </div>
    `;
    mobileCards.appendChild(card);
  });
}

// พิมพ์ป้ายความปลอดภัยของ PPE ตาม ID บันทึก
function printPpeTags(logId) {
  const log = appState.inspectionLogs.find(item => item['ID'] === logId);
  if (!log) return;
  
  const countPrompt = prompt("ระบุจำนวนแผ่นสติกเกอร์ที่ต้องการพิมพ์สำหรับรายการนี้:", log['ผ่านการตรวจ'] || 1);
  if (countPrompt === null) return;
  const count = parseInt(countPrompt) || 0;
  if (count <= 0) return;
  
  const ppeItem = {
    'ID': log['ID'],
    'ชื่ออุปกรณ์': log['ประเภทอุปกรณ์ PPE'] || 'PPE',
    'หมายเลขซีเรียล': log['ID'],
    'บริษัทผู้รับเหมา': log['บริษัทผู้รับเหมา'],
    'วันที่ตรวจสอบ': log['วันที่'],
    'วันหมดอายุ Tag': calculatePpeExpiryDate(log['วันที่']),
    'สีป้ายประจำเดือน': getMonthlyColorNameForDate(log['วันที่']),
    'category': 'PPE'
  };
  
  const ppeItems = Array(count).fill(ppeItem);
  bulkPrintTags(ppeItems);
}

function calculatePpeExpiryDate(dateStr) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

function getMonthlyColorNameForDate(dateStr) {
  const date = new Date(dateStr);
  const month = isNaN(date.getTime()) ? 0 : date.getMonth();
  return MONTHLY_COLORS[month] ? MONTHLY_COLORS[month].name : 'ไม่ได้ระบุ';
}

// ----------------- BULK AND SINGLE TAG PRINTING SYSTEM -----------------

// พิมพ์ป้ายแบบเดี่ยว (เรียกใช้ผ่านระบบเดิม)
function printStickerTag(eqId) {
  const eq = appState.equipment.find(item => item['ID'] === eqId);
  if (!eq) return;
  bulkPrintTags([eq]);
}

// พิมพ์ป้ายแบบกลุ่มตามปุ่มที่เลือก (Bulk Print สำหรับตารางอุปกรณ์เครื่องมือช่าง)
function bulkPrintSelectedTags() {
  const checkedBoxes = document.querySelectorAll('.eq-row-checkbox:checked');
  if (checkedBoxes.length === 0) {
    alert('กรุณาเลือกอุปกรณ์เครื่องมือช่างที่ต้องการพิมพ์ป้ายอย่างน้อย 1 รายการครับ');
    return;
  }
  
  const ids = Array.from(checkedBoxes).map(cb => cb.value);
  const selectedEq = appState.equipment.filter(e => ids.includes(e['ID']));
  
  bulkPrintTags(selectedEq);
}

// อัปเดตการแสดงผลปุ่มพิมพ์กลุ่ม (Bulk Print) ตามจำนวนการติ๊กเลือก Checkbox
function updateEqBulkPrintButtonVisibility() {
  const btn = document.getElementById('btn-bulk-print');
  if (!btn) return;
  const checkedCount = document.querySelectorAll('.eq-row-checkbox:checked').length;
  btn.style.display = checkedCount > 0 ? 'inline-block' : 'none';
}

// พิมพ์ป้ายแบบกลุ่มตามปุ่มที่เลือก (Bulk Print สำหรับตาราง PPE)
function bulkPrintSelectedPpeTags() {
  const checkedBoxes = document.querySelectorAll('.ppe-row-checkbox:checked');
  if (checkedBoxes.length === 0) {
    alert('กรุณาเลือกบันทึก PPE ที่ต้องการพิมพ์ป้ายอย่างน้อย 1 รายการครับ');
    return;
  }
  
  const ids = Array.from(checkedBoxes).map(cb => cb.value);
  const selectedLogs = appState.inspectionLogs.filter(log => ids.includes(log['ID']));
  
  // แปลงและพิมพ์
  const itemsToPrint = [];
  selectedLogs.forEach(log => {
    const pass = parseInt(log['ผ่านการตรวจ']) || 1;
    const ppeItem = {
      'ID': log['ID'],
      'ชื่ออุปกรณ์': log['ประเภทอุปกรณ์ PPE'] || 'PPE',
      'หมายเลขซีเรียล': log['ID'],
      'บริษัทผู้รับเหมา': log['บริษัทผู้รับเหมา'],
      'วันที่ตรวจสอบ': log['วันที่'],
      'วันหมดอายุ Tag': calculatePpeExpiryDate(log['วันที่']),
      'สีป้ายประจำเดือน': getMonthlyColorNameForDate(log['วันที่']),
      'category': 'PPE'
    };
    for (let i = 0; i < pass; i++) {
      itemsToPrint.push(ppeItem);
    }
  });
  
  bulkPrintTags(itemsToPrint);
}

// ฟังก์ชันหลักสร้างและแสดงพื้นที่พิมพ์สติกเกอร์ (Grid Layout)
function bulkPrintTags(items) {
  const container = document.getElementById('print-tag-container');
  if (!container) return;
  
  container.innerHTML = ''; // ล้างของเดิม
  
  let cardsHtml = '';
  items.forEach((item, idx) => {
    const isPpe = item.category === 'PPE' || (item['ID'] && item['ID'].startsWith('PPE-')) || (item['ID'] && item['ID'].startsWith('AUD-'));
    const stickerTitle = isPpe ? 'ป้ายผ่านการตรวจความปลอดภัย PPE' : 'ป้ายผ่านการตรวจความปลอดภัยอุปกรณ์';
    const stickerSubtitle = isPpe ? 'CONTRACTOR PPE TAG (APPROVED)' : 'CONTRACTOR EQUIPMENT TAG (APPROVED)';
    const idLabel = isPpe ? 'ประเภท PPE:' : 'ชื่ออุปกรณ์:';
    
    // คำนวณข้อมูลเดือน
    const inspDate = new Date(item['วันที่ตรวจสอบ'] || item['วันที่']);
    const month = isNaN(inspDate.getTime()) ? 0 : inspDate.getMonth();
    const THAI_MONTH_SHORTS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthShort = THAI_MONTH_SHORTS[month];
    const colorHex = MONTHLY_COLORS[month] ? MONTHLY_COLORS[month].color : '#2e7d32';
    
    // บัตรการ์ดแบบ Grid
    cardsHtml += `
      <div class="sticker-print-card" style="display: inline-block; width: 90mm; height: 50mm; padding: 1.5mm; border: 0.2mm dashed #000; box-sizing: border-box; vertical-align: top; page-break-inside: avoid; background-color: #fff; margin-bottom: 2mm; margin-right: 2mm;">
        <div class="sticker-wrapper" style="display: flex; flex-direction: column; height: 100%; border: 1mm solid #000000; padding: 2mm; box-sizing: border-box; position: relative;">
          <div style="position: absolute; top: 1mm; right: 2mm; font-size: 7.5px; font-weight: 700; color: #555;">${item['ID'] || 'EQ-XXXXX'}</div>
          <div class="sticker-header" style="display: flex; align-items: center; justify-content: center; border-bottom: 0.5mm solid ${colorHex}; padding-bottom: 1mm; margin-bottom: 1.5mm; text-align: center;">
            <img src="รูป mascot/mascot_safety.png" alt="Mascot" class="sticker-mascot" style="width: 8mm; height: 8mm; object-fit: contain; margin-right: 2mm;">
            <div class="sticker-header-text" style="display: flex; flex-direction: column; align-items: center;">
              <div class="sticker-title" style="font-size: 9.5px; font-weight: 800; color: #000000; line-height: 1.1;">${stickerTitle}</div>
              <div class="sticker-subtitle" style="font-size: 7px; color: #333; font-weight: 600;">${stickerSubtitle}</div>
            </div>
          </div>
          <div class="sticker-body" style="display: flex; flex-grow: 1; align-items: flex-end;">
            <div class="sticker-fields" style="flex-grow: 1; font-size: 8px; line-height: 1.45; color: #333; font-weight: 500; min-width: 0;">
              <div class="sticker-field" style="margin-bottom: 0.5mm;">${idLabel} <span style="font-weight: 700; color: #000;">${item['ชื่ออุปกรณ์']}</span></div>
              <div class="sticker-field">หมายเลขซีเรียล: <span style="font-weight: 700; color: #000;">${item['หมายเลขซีเรียล']}</span></div>
              <div class="sticker-field" style="margin-bottom: 0.5mm;">บริษัทผู้รับเหมา: <span style="font-weight: 700; color: #000;">${item['บริษัทผู้รับเหมา']}</span></div>
              <div class="sticker-field" style="margin-top: 0.5mm;">วันหมดอายุ: <span style="color: var(--danger-color); font-weight: bold;">${formatThaiDate(item['วันหมดอายุ Tag'])}</span></div>
              
              <div class="sticker-month-bar" style="margin-top: 1.5mm; height: 5.5mm; border-radius: 0.6mm; text-align: center; line-height: 5.5mm; display: flex; align-items: center; justify-content: center; border: 0.4mm solid #000000; background-color: ${colorHex}; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                <span style="color: #000000; font-weight: 900; font-size: 11px; display: block; width: 100%; font-family: sans-serif;">${monthShort}</span>
              </div>
            </div>
            
            <!-- รูปถ่ายอุปกรณ์ (ไม่แสดงถ้าเป็น PPE) -->
            ${isPpe ? '' : `
            <div class="sticker-image-container" style="width: 20mm; height: 20mm; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 0.3mm solid #000000; margin-left: 2mm; overflow: hidden; border-radius: 0.6mm; background: #fafafa; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
              ${item['รูปภาพอุปกรณ์'] && item['รูปภาพอุปกรณ์'] !== '-' ? `<img src="${getDirectDriveImageUrl(item['รูปภาพอุปกรณ์'])}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fa-solid fa-camera" style="font-size: 12px; color: #bbb; margin-bottom: 2px;"></i><span style="font-size: 5px; color: #bbb; text-align: center; transform: scale(0.9);">ไม่มีรูป</span>`}
            </div>
            `}

            <div class="sticker-qrcode-container" style="width: 20mm; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-left: 2mm;">
              <div class="sticker-qrcode" id="bulk-qr-${idx}" style="width: 18mm; height: 18mm;"></div>
              <div class="sticker-qrcode-label" style="font-size: 5px; color: #777; margin-top: 1mm; text-align: center; white-space: nowrap;">สแกนเพื่อตรวจสถานะ</div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = cardsHtml;
  
  items.forEach((item, idx) => {
    const PUBLIC_URL = 'https://tvocontractor.github.io/contractor-safety/';
    const isLocal = window.location.protocol === 'file:';
    const qrUrl = isLocal 
      ? `${PUBLIC_URL}?serial=${encodeURIComponent(item['หมายเลขซีเรียล'])}`
      : `${window.location.origin}${window.location.pathname}?serial=${encodeURIComponent(item['หมายเลขซีเรียล'])}`;
    
    new QRCode(document.getElementById(`bulk-qr-${idx}`), {
      text: qrUrl,
      width: 68,
      height: 68,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.M
    });
  });
  
  // สั่งพิมพ์หน้าต่างเบราว์เซอร์
  window.print();
}

// ----------------- QUICK STATUS LOOKUP SYSTEM -----------------

function lookupEquipmentStatus(serial) {
  if (!serial) {
    alert('กรุณาป้อนหมายเลขซีเรียลอุปกรณ์ก่อนค้นหาครับ');
    return;
  }
  
  serial = serial.trim();
  // ค้นหาแบบตรงตัวหรือมีหมายเลข ID ตรงกัน (แปลงเป็น string เพื่อเทียบแบบปลอดภัย)
  const eq = appState.equipment.find(item => 
    (item['หมายเลขซีเรียล'] !== undefined && String(item['หมายเลขซีเรียล']).trim() === String(serial)) || 
    (item['ID'] !== undefined && String(item['ID']).trim().toLowerCase() === String(serial).toLowerCase())
  );
  
  const badgeContainer = document.getElementById('lookup-status-badge-container');
  const photoContainer = document.getElementById('lookup-photo-container');
  const nameSpan = document.getElementById('lookup-eq-name');
  const serialSpan = document.getElementById('lookup-eq-serial');
  const contractorSpan = document.getElementById('lookup-eq-contractor');
  const dateSpan = document.getElementById('lookup-eq-date');
  const expirySpan = document.getElementById('lookup-eq-expiry');
  const colorSpan = document.getElementById('lookup-eq-color');
  
  const historyDiv = document.getElementById('lookup-patrol-history');
  const tbody = document.getElementById('lookup-patrol-list');
  
  if (!eq) {
    // กรณีไม่พบอุปกรณ์ขึ้นทะเบียนในระบบ
    badgeContainer.style.backgroundColor = '#ffebee';
    badgeContainer.style.color = '#c62828';
    badgeContainer.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ไม่พบข้อมูลการขึ้นทะเบียนอุปกรณ์ในระบบ / NOT REGISTERED';
    
    photoContainer.innerHTML = `
      <div style="padding: 24px; background: #fafafa; border: 1px dashed #ccc; border-radius: 8px; color: #999;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; color: var(--danger-color); margin-bottom: 8px;"></i>
        <br>ไม่พบรูปภาพเนื่องจากอุปกรณ์ชิ้นนี้ยังไม่ได้ขึ้นทะเบียน
      </div>
    `;
    
    nameSpan.innerText = '-';
    serialSpan.innerText = serial;
    contractorSpan.innerText = '-';
    dateSpan.innerText = '-';
    expirySpan.innerText = '-';
    colorSpan.innerText = '-';
    
    // ค้นหาว่าเคยโดนเดินตรวจบันทึกความปลอดภัยและระบุซีเรียลนี้ไว้หรือไม่
    renderPatrolHistoryForLookup(serial, historyDiv, tbody);
    
    openModal('equipment-lookup-modal');
    alert(`❌ ไม่พบข้อมูลการขึ้นทะเบียน:\n---------------------------\nไม่พบข้อมูลการขึ้นทะเบียนเครื่องมือช่าง หมายเลขซีเรียล "${serial}" ในระบบครับ`);
    return;
  }
  
  // ตรวจสอบสถานะการปิดใช้งาน, หมดอายุ 30 วัน หรือชำรุด (มี CAPA)
  const statusVal = String(eq['สถานะอุปกรณ์'] || eq['สถานะ'] || '').trim();
  const isDeactivated = statusVal.indexOf('ปิดการใช้งาน') > -1 || statusVal.indexOf('จบโครงการ') > -1 || statusVal.indexOf('ปลดระวาง') > -1;
  const isExpired = checkEquipmentExpired(eq['วันหมดอายุ Tag']);
  const isDefective = checkEquipmentDefective(eq['หมายเลขซีเรียล']);
  
  if (isDeactivated) {
    badgeContainer.style.backgroundColor = '#f1f5f9';
    badgeContainer.style.color = '#475569';
    badgeContainer.innerHTML = '<i class="fa-solid fa-power-off"></i> ปิดการใช้งานอุปกรณ์ (จบโครงการ) / DEACTIVATED';
  } else if (isDefective) {
    badgeContainer.style.backgroundColor = '#fff3e0';
    badgeContainer.style.color = '#e65100';
    badgeContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ตรวจพบข้อบกพร่องหน้างาน (อุปกรณ์ชำรุด) / DEFECTIVE';
  } else if (isExpired) {
    badgeContainer.style.backgroundColor = '#ffebee';
    badgeContainer.style.color = '#c62828';
    badgeContainer.innerHTML = '<i class="fa-solid fa-clock"></i> ป้ายหมดอายุการตรวจ / EXPIRED';
  } else {
    badgeContainer.style.backgroundColor = '#e8f5e9';
    badgeContainer.style.color = '#2e7d32';
    badgeContainer.innerHTML = '<i class="fa-solid fa-circle-check"></i> อุปกรณ์สถานะปกติ / APPROVED';
  }
  
  // การแสดงผลรูปภาพ
  if (eq['รูปภาพอุปกรณ์'] && eq['รูปภาพอุปกรณ์'] !== '-') {
    const directUrl = getDirectDriveImageUrl(eq['รูปภาพอุปกรณ์']);
    photoContainer.innerHTML = `<img src="${directUrl}" style="width: 100%; max-height: 220px; border-radius: 8px; border: 1px solid #ddd; object-fit: cover; cursor: pointer;" onclick="showLightbox('${directUrl}')" title="คลิกเพื่อขยายภาพ">`;
  } else {
    photoContainer.innerHTML = `
      <div style="padding: 24px; background: #fafafa; border: 1px dashed #ccc; border-radius: 8px; color: #999;">
        <i class="fa-solid fa-camera" style="font-size: 32px; color: #ccc; margin-bottom: 8px;"></i>
        <br>ไม่มีรูปถ่ายอุปกรณ์ตอนตรวจสอบผ่านในระบบ
      </div>
    `;
  }
  
  nameSpan.innerText = eq['ชื่ออุปกรณ์'];
  serialSpan.innerText = eq['หมายเลขซีเรียล'];
  contractorSpan.innerText = eq['บริษัทผู้รับเหมา'];
  dateSpan.innerText = formatThaiDate(eq['วันที่ตรวจสอบ']);
  
  const statusText = isDeactivated ? ' (ปิดการใช้งาน - จบโครงการ)' : (isExpired ? ' (หมดอายุแล้ว)' : (isDefective ? ' (อุปกรณ์ชำรุด)' : ' (ปกติ)'));
  expirySpan.innerHTML = `<span style="color: ${isDeactivated ? '#64748b' : (isExpired || isDefective ? 'var(--danger-color)' : 'var(--success-color)')}; font-weight: bold;">${formatThaiDate(eq['วันหมดอายุ Tag'])}${statusText}</span>`;
  
  const colorHex = getColorHexFromMonthName(eq['สีป้ายประจำเดือน']) || '#ccc';
  colorSpan.innerHTML = `<span class="color-dot" style="background-color: ${colorHex}; display: inline-block; vertical-align: middle; margin-right: 4px;"></span> ${eq['สีป้ายประจำเดือน'] || 'ไม่ได้ระบุ'}`;
  
  // ค้นหาประวัติบันทึกการเดินตรวจความปลอดภัยสะสม
  renderPatrolHistoryForLookup(eq['หมายเลขซีเรียล'], historyDiv, tbody);
  
  openModal('equipment-lookup-modal');
  
  // แจ้งเตือนสถานะทันทีทาง Pop-up
  const statusStr = isDeactivated ? '🛑 ปิดการใช้งาน (จบโครงการ / นำออกจากพื้นที่แล้ว)' : (isDefective ? '❌ อุปกรณ์ชำรุด (มีเคสความปลอดภัยคงค้าง)' : (isExpired ? '⚠️ หมดอายุการตรวจแล้ว' : '✅ ปกติ (ใช้งานปลอดภัย)'));
  alert(`📢 ตรวจสอบสถานะอุปกรณ์:\n---------------------------\nชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']}\nหมายเลขซีเรียล: ${eq['หมายเลขซีเรียล']}\nบริษัทผู้รับเหมา: ${eq['บริษัทผู้รับเหมา']}\nสถานะ: ${statusStr}\nวันหมดอายุ Tag: ${formatThaiDate(eq['วันหมดอายุ Tag'])}`);
}

function getColorHexFromMonthName(monthName) {
  if (!monthName) return '';
  for (let key in MONTHLY_COLORS) {
    if (MONTHLY_COLORS[key].name === monthName) {
      return MONTHLY_COLORS[key].color;
    }
  }
  return '';
}

function renderPatrolHistoryForLookup(serial, historyDiv, tbody) {
  const violations = appState.patrolLogs.filter(log => {
    const defectVal = log['ข้อบกพร่อง'] || '';
    const detailsVal = log['รายละเอียด'] || '';
    return defectVal.includes(serial) || detailsVal.includes(serial);
  });
  
  if (violations.length > 0) {
    historyDiv.style.display = 'block';
    tbody.innerHTML = violations.map(log => {
      const capaBadge = log['สถานะ CAPA'] === 'ปิดเคสแล้ว' 
        ? `<span class="status-badge active">แก้ไขเสร็จสิ้น</span>` 
        : `<span class="status-badge inactive">ยังไม่แก้ไข (Pending)</span>`;
      return `
        <tr>
          <td>${formatThaiDate(log['วันที่'] || log['วันที่เกิดเหตุ'])}</td>
          <td style="word-break: break-word;">${log['ข้อบกพร่อง']}</td>
          <td>${capaBadge}</td>
        </tr>
      `;
    }).join('');
  } else {
    historyDiv.style.display = 'none';
    tbody.innerHTML = '';
  }
}

function checkUrlParamsForLookup() {
  const urlParams = new URLSearchParams(window.location.search);
  const serialParam = urlParams.get('serial');
  if (serialParam) {
    // ป้องกันหน้าต่างบราวเซอร์สลับไปมา ให้ล้างตัวแปร parameter ทิ้งแบบเงียบๆ
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: newUrl }, '', newUrl);
    
    // ทำการค้นหาทันที
    setTimeout(() => {
      lookupEquipmentStatus(serialParam);
    }, 400);
  }
}

// --- ระบบการบีบอัดรูปภาพก่อนอัปโหลดด้วย HTML5 Canvas ---
function compressImage(file, maxWidth = 1024, quality = 0.75, callback) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsDataURL(file);
    return;
  }
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function(event) {
    const img = new Image();
    img.src = event.target.result;
    img.onload = function() {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      callback(compressedDataUrl);
    };
    img.onerror = function() {
      callback(event.target.result);
    };
  };
}

// --- ระบบการจัดการลบข้อมูลด้วย PIN และศูนย์ควบคุม Admin ---
function openAdminDeleteModal() {
  openModal('admin-delete-modal');
}

function openPinModal(actionType, targetId) {
  document.getElementById('pin-action-type').value = actionType;
  document.getElementById('pin-target-id').value = targetId;
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-reason').value = '';
  
  const inspectorSelect = document.getElementById('pin-inspector-select');
  if (inspectorSelect) {
    if (actionType === 'deletePatrolLog') {
      inspectorSelect.value = 'ADMIN';
      Array.from(inspectorSelect.options).forEach(opt => {
        if (opt.value !== 'ADMIN' && opt.value !== '') {
          opt.disabled = true;
        } else {
          opt.disabled = false;
        }
      });
    } else {
      inspectorSelect.value = '';
      Array.from(inspectorSelect.options).forEach(opt => {
        opt.disabled = false;
      });
    }
  }
  
  onPinUserSelectChange();
  openModal('pin-modal');
}

function onPinUserSelectChange() {
  const selected = document.getElementById('pin-inspector-select').value;
  const pinInput = document.getElementById('pin-input');
  if (pinInput) {
    pinInput.placeholder = selected === 'ADMIN' ? 'ป้อนรหัส Admin PIN' : 'ป้อนรหัส PIN 4 หลัก';
    pinInput.focus();
  }
}

async function submitPinDelete(e) {
  e.preventDefault();
  const actionType = document.getElementById('pin-action-type').value;
  const targetId = document.getElementById('pin-target-id').value;
  const inspector = document.getElementById('pin-inspector-select').value;
  const typedPin = document.getElementById('pin-input').value.trim();
  const reason = document.getElementById('pin-reason').value.trim();

  if (!inspector) {
    alert('กรุณาเลือก จป. ผู้ตรวจ หรือ Admin ผู้ดำเนินการ');
    return;
  }
  if (!typedPin) {
    alert('กรุณากรอกรหัส PIN');
    return;
  }

  // กำหนดสิทธิ์: หากเป็นการลบข้อมูลการเดินตรวจ (deletePatrolLog) บังคับสิทธิ์ ADMIN PIN เท่านั้น
  if (actionType === 'deletePatrolLog' && inspector !== 'ADMIN') {
    alert('⛔ การลบประวัติการเดินตรวจความปลอดภัย อนุญาตเฉพาะสิทธิ์ ADMIN PIN เท่านั้นครับ');
    return;
  }

  // ยืนยันตรวจสอบรหัส PIN
  let isPinValid = false;
  if (inspector === 'ADMIN') {
    const adminPin = appState.adminPin || '9999';
    isPinValid = (typedPin === adminPin);
  } else {
    const expectedPin = appState.inspectorPins ? appState.inspectorPins[inspector] : null;
    if (expectedPin) {
      isPinValid = (typedPin === expectedPin);
    } else {
      isPinValid = (typedPin === '9999' || typedPin === '1234');
    }
  }

  if (!isPinValid) {
    alert('❌ รหัส PIN ไม่ถูกต้อง! กรุณาตรวจสอบรหัส PIN ของท่านอีกครั้ง');
    return;
  }

  closeModal('pin-modal');
  showConnectionStatus('loading');

  const payload = {
    targetId: targetId,
    inspector: inspector,
    reason: reason || 'ลบผ่านระบบ PIN (Admin Control)',
    pin: typedPin
  };

  const success = await sendActionToServer(actionType, payload);
  if (success) {
    alert('✅ ลบข้อมูลประวัติการเดินตรวจและรูปภาพถาวรเรียบร้อยแล้ว (บันทึก AuditLogs สำเร็จ)');
  } else {
    alert('⚠️ ทำการลบในระบบเครื่องเรียบร้อย (ออฟไลน์)');
  }
}

function triggerBulkDelete(type) {
  if (type === 'equipment') {
    const checkboxes = document.querySelectorAll('.eq-row-checkbox:checked');
    if (checkboxes.length === 0) {
      alert('กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการเพื่อทำการลบ');
      return;
    }
    const ids = Array.from(checkboxes).map(cb => cb.value).join(',');
    openPinModal('bulkDeleteEquipment', ids);
  }
}

// ----------------- DEDICATED JORPOR TAG RENEWAL SYSTEM -----------------
let currentRenewalEquipment = null;

function openRenewTagModal() {
  const input = document.getElementById('renew-search-input');
  const card = document.getElementById('renew-target-card');
  const select = document.getElementById('renew-select-equipment');

  if (input) input.value = '';
  if (card) card.style.display = 'none';
  currentRenewalEquipment = null;

  // เติม รายชื่ออุปกรณ์ลง Dropdown สำหรับผู้ใช้ PC / Notebook (ยกเว้นอุปกรณ์ที่ปิดการใช้งานไปแล้ว)
  if (select) {
    select.innerHTML = '<option value="">-- เลือกอุปกรณ์ในระบบ หรือป้อนซีเรียลค้นหาด้านล่าง --</option>';
    (appState.equipment || []).forEach(eq => {
      const statusVal = String(eq['สถานะอุปกรณ์'] || eq['สถานะ'] || '').trim();
      const isDeactivated = statusVal.indexOf('ปิดการใช้งาน') > -1 || statusVal.indexOf('จบโครงการ') > -1 || statusVal.indexOf('ปลดระวาง') > -1;
      if (isDeactivated) return; // ไม่นำอุปกรณ์ที่ปิดการใช้งาน (จบโครงการ) มาแสดงใน Dropdown ต่ออายุ

      const isDefective = checkEquipmentDefective(eq['หมายเลขซีเรียล']);
      const isExpired = checkEquipmentExpired(eq['วันหมดอายุ Tag']);
      const statusLabel = isDefective ? ' [ชำรุด]' : (isExpired ? ' [หมดอายุ]' : ' [ปกติ]');
      
      const opt = document.createElement('option');
      opt.value = eq['ID'] || eq['หมายเลขซีเรียล'];
      opt.text = `${eq['ชื่ออุปกรณ์']} (ซีเรียล: ${eq['หมายเลขซีเรียล']}) - ${eq['บริษัทผู้รับเหมา']}${statusLabel}`;
      select.appendChild(opt);
    });
  }

  openModal('renew-tag-modal');
}

function onRenewSelectChange() {
  const selectVal = document.getElementById('renew-select-equipment')?.value;
  if (!selectVal) {
    document.getElementById('renew-target-card').style.display = 'none';
    currentRenewalEquipment = null;
    return;
  }
  displayEquipmentInRenewalCard(selectVal);
}

function searchEquipmentForRenewal() {
  const query = (document.getElementById('renew-search-input')?.value || '').trim();
  if (!query) {
    alert('กรุณาป้อนหมายเลขซีเรียล หรือรหัส ID อุปกรณ์ก่อนค้นหาครับ');
    return;
  }
  displayEquipmentInRenewalCard(query);
}

function displayEquipmentInRenewalCard(queryOrId) {
  const eq = (appState.equipment || []).find(item => 
    (item['หมายเลขซีเรียล'] !== undefined && String(item['หมายเลขซีเรียล']).trim() === String(queryOrId).trim()) || 
    (item['ID'] !== undefined && String(item['ID']).trim().toLowerCase() === String(queryOrId).trim().toLowerCase())
  );

  if (!eq) {
    alert(`❌ ไม่พบข้อมูลการขึ้นทะเบียนอุปกรณ์สำหรับ "${queryOrId}" ในระบบครับ`);
    const card = document.getElementById('renew-target-card');
    if (card) card.style.display = 'none';
    currentRenewalEquipment = null;
    return;
  }

  currentRenewalEquipment = eq;

  const statusVal = String(eq['สถานะอุปกรณ์'] || eq['สถานะ'] || '').trim();
  const isDeactivated = statusVal.indexOf('ปิดการใช้งาน') > -1 || statusVal.indexOf('จบโครงการ') > -1 || statusVal.indexOf('ปลดระวาง') > -1;
  const isExpired = checkEquipmentExpired(eq['วันหมดอายุ Tag']);
  const isDefective = checkEquipmentDefective(eq['หมายเลขซีเรียล']);

  const statusSpan = document.getElementById('renew-current-status');
  const btnConfirmRenew = document.getElementById('btn-confirm-renew');

  if (statusSpan) {
    if (isDeactivated) {
      statusSpan.className = 'status-badge inactive';
      statusSpan.innerText = 'ปิดการใช้งาน (จบโครงการ) - ห้ามต่ออายุ';
      if (btnConfirmRenew) {
        btnConfirmRenew.disabled = true;
        btnConfirmRenew.style.opacity = '0.5';
        btnConfirmRenew.title = 'อุปกรณ์ถูกปิดการใช้งานแล้ว ไม่สามารถกดต่ออายุได้ ต้องขึ้นทะเบียนใหม่เท่านั้น';
      }
    } else if (isDefective) {
      statusSpan.className = 'status-badge inactive';
      statusSpan.innerText = 'อุปกรณ์ชำรุด / ห้ามใช้งาน';
      if (btnConfirmRenew) {
        btnConfirmRenew.disabled = false;
        btnConfirmRenew.style.opacity = '1';
        btnConfirmRenew.title = '';
      }
    } else if (isExpired) {
      statusSpan.className = 'status-badge inactive';
      statusSpan.innerText = '🔴 หมดอายุ Tag เกินกำหนด (ห้ามต่ออายุ - ต้องขึ้นทะเบียนใหม่)';
      if (btnConfirmRenew) {
        btnConfirmRenew.disabled = true;
        btnConfirmRenew.style.opacity = '0.5';
        btnConfirmRenew.title = 'อุปกรณ์ปล่อยให้ Tag หมดอายุแล้ว ไม่อนุญาตให้กดต่ออายุย้อนหลังได้ ต้องขึ้นทะเบียนใหม่เพื่อออกป้ายใหม่เท่านั้น';
      }
    } else {
      statusSpan.className = 'status-badge active';
      statusSpan.innerText = 'ปกติ (ใช้งานปลอดภัย)';
      if (btnConfirmRenew) {
        btnConfirmRenew.disabled = false;
        btnConfirmRenew.style.opacity = '1';
        btnConfirmRenew.title = '';
      }
    }
  }

  const today = new Date();
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + 30);
  
  const expiryIso = expiryDate.toISOString().split('T')[0];
  const monthColorObj = MONTHLY_COLORS[today.getMonth()];
  const colorName = monthColorObj ? monthColorObj.name : '-';

  document.getElementById('renew-eq-name').innerText = eq['ชื่ออุปกรณ์'] || '-';
  document.getElementById('renew-eq-serial').innerText = eq['หมายเลขซีเรียล'] || '-';
  document.getElementById('renew-eq-contractor').innerText = eq['บริษัทผู้รับเหมา'] || '-';
  document.getElementById('renew-old-expiry').innerText = formatThaiDate(eq['วันหมดอายุ Tag']);
  document.getElementById('renew-new-expiry').innerText = formatThaiDate(expiryIso);
  document.getElementById('renew-new-color').innerText = colorName;

  const card = document.getElementById('renew-target-card');
  if (card) card.style.display = 'flex';
}

async function executeEquipmentRenewal() {
  if (!currentRenewalEquipment) return;
  await renewEquipmentTag(currentRenewalEquipment['ID'] || currentRenewalEquipment['หมายเลขซีเรียล']);
  closeModal('renew-tag-modal');
}

function reportEquipmentDefectFromRenewal() {
  if (!currentRenewalEquipment) return;
  const serial = currentRenewalEquipment['หมายเลขซีเรียล'] || currentRenewalEquipment['ID'];
  const contractor = currentRenewalEquipment['บริษัทผู้รับเหมา'];
  closeModal('renew-tag-modal');
  openMarkDefectiveModal(serial, contractor);
}

function openMarkDefectiveModal(serial, contractorName) {
  openModal('add-patrol-modal');
  
  const contractorSelect = document.getElementById('p-contractor');
  const qrInput = document.getElementById('p-qr-scan');

  if (contractorName && contractorSelect) {
    contractorSelect.value = contractorName;
  }
  if (serial && qrInput) {
    qrInput.value = serial;
  }
}

async function renewEquipmentTag(idOrSerial) {
  if (!idOrSerial) return;

  const eq = (appState.equipment || []).find(item => 
    String(item['ID'] || '').trim() === String(idOrSerial).trim() || 
    String(item['หมายเลขซีเรียล'] || '').trim() === String(idOrSerial).trim()
  );

  if (!eq) {
    alert(`❌ ไม่พบข้อมูลอุปกรณ์รหัส/ซีเรียล "${idOrSerial}" ในระบบครับ`);
    return;
  }

  // 1. บล็อกการต่ออายุหากอุปกรณ์มีสถานะเป็น 'ปิดการใช้งาน (จบโครงการ)'
  const statusVal = String(eq['สถานะอุปกรณ์'] || eq['สถานะ'] || '').trim();
  const isDeactivated = statusVal.indexOf('ปิดการใช้งาน') > -1 || statusVal.indexOf('จบโครงการ') > -1 || statusVal.indexOf('ปลดระวาง') > -1;

  if (isDeactivated) {
    alert(`⛔ ไม่สามารถต่ออายุป้าย Tag ได้!
----------------------------------
ชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']} (ซีเรียล: ${eq['หมายเลขซีเรียล']})
สถานะปัจจุบัน: ปิดการใช้งาน (จบโครงการ)

💡 อุปกรณ์ที่ถูกปิดการใช้งาน (จบโครงการ) ไปแล้ว ไม่อนุญาตให้กดต่ออายุได้ครับ
หากต้องการนำอุปกรณ์ชิ้นนี้กลับมาปฏิบัติงานใหม่ กรุณาไปที่เมนู "ขึ้นทะเบียนอุปกรณ์" เพื่อสร้างทะเบียนสติกเกอร์ใบใหม่ครับ`);
    return;
  }

  // 2. บล็อกการต่ออายุหากอุปกรณ์ชิ้นนี้ยังมีเคส CAPA ความปลอดภัยค้างอยู่
  const targetSerial = eq['หมายเลขซีเรียล'] || eq['ID'];
  const hasPendingCapa = checkEquipmentDefective(targetSerial);

  if (hasPendingCapa) {
    alert(`⚠️ ไม่สามารถต่ออายุป้าย Tag ได้!
----------------------------------
ชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']} (ซีเรียล: ${eq['หมายเลขซีเรียล']})
สาเหตุ: อุปกรณ์ชิ้นนี้ยังมีเคสข้อบกพร่องความปลอดภัยคงค้างอยู่ (รอดำเนินการ CAPA)

💡 กรุณาติดตามการแนบรูปแก้ไข (After) เพื่อปิดเคส CAPA ในเมนูเดินตรวจความปลอดภัยก่อนทำการต่ออายุครับ`);
    return;
  }

  // 3. บล็อกการต่ออายุหากป้าย Tag หมดอายุเกินกำหนดแล้ว (Overdue Renewal Blocking)
  const isExpired = checkEquipmentExpired(eq['วันหมดอายุ Tag']);
  if (isExpired) {
    alert(`⛔ ไม่สามารถต่ออายุป้าย Tag ได้! (หมดอายุเกินกำหนด)
----------------------------------
ชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']} (ซีเรียล: ${eq['หมายเลขซีเรียล']})
วันหมดอายุเดิม: ${formatThaiDate(eq['วันหมดอายุ Tag'])}
สถานะปัจจุบัน: 🔴 หมดอายุการตรวจ

💡 ป้าย Tag ของอุปกรณ์ชิ้นนี้หมดอายุแล้ว ไม่อนุญาตให้กดต่ออายุย้อนหลังได้ครับ
เพื่อรักษาประวัติการหักคะแนนประเมินด้านความปลอดภัยประจำปี (-5 คะแนน)

📌 สิ่งที่ต้องทำ:
1. ให้ปิดการใช้งานรายการอุปกรณ์เดิม
2. นำอุปกรณ์ไปกด "ขึ้นทะเบียนอุปกรณ์" ใหม่ เพื่อออกสติกเกอร์และรหัส Tag ใบใหม่สำหรับนำกลับมาใช้งานครับ`);
    return;
  }

  const confirmRenew = confirm(`🔄 ยืนยันการต่ออายุป้าย Tag 30 วันสำหรับอุปกรณ์:\n----------------------------------\n• ชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']}\n• หมายเลขซีเรียล: ${eq['หมายเลขซีเรียล']}\n• บริษัทผู้รับเหมา: ${eq['บริษัทผู้รับเหมา']}\n\nระบบจะทำการอัปเดตวันที่ตรวจเป็นวันนี้ และขยายวันหมดอายุไปอีก 30 วันโดยใช้รหัส ID (${eq['ID']}) เดิมครับ`);
  if (!confirmRenew) return;

  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + 30);
  const expiryIso = expiryDate.toISOString().split('T')[0];

  const monthColorObj = MONTHLY_COLORS[today.getMonth()];
  const colorName = monthColorObj ? monthColorObj.name : 'ไม่ได้ระบุ';

  eq['วันที่ตรวจสอบ'] = todayIso;
  eq['วันหมดอายุ Tag'] = expiryIso;
  eq['สีป้ายประจำเดือน'] = colorName;
  eq['สถานะอุปกรณ์'] = 'ปกติ';

  const payload = {
    id: eq['ID'],
    serialNumber: eq['หมายเลขซีเรียล'],
    equipmentName: eq['ชื่ออุปกรณ์'],
    contractor: eq['บริษัทผู้รับเหมา'],
    site: eq['Site โรงงาน'] || eq['Site'] || eq['โรงงาน'] || '',
    inspectionDate: todayIso,
    expiryDate: expiryIso,
    monthlyColor: colorName,
    status: 'ปกติ'
  };

  showConnectionStatus('loading');
  await sendActionToServer('updateEquipmentExpiry', payload);
  
  renderEquipmentTable();
  if (appState.equipment) renderDashboard();

  alert(`✅ ต่ออายุป้าย Tag เรียบร้อยแล้ว!\n---------------------------\nชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']}\nหมายเลขซีเรียล: ${eq['หมายเลขซีเรียล']}\nสถานะใหม่: อุปกรณ์ปกติ (APPROVED)\nวันหมดอายุใหม่: ${formatThaiDate(expiryIso)}\nสีป้ายประจำเดือนใหม่: ${colorName}`);
}

async function deactivateEquipmentStatus(idOrSerial) {
  if (!idOrSerial) return;

  const eq = (appState.equipment || []).find(item => 
    String(item['ID'] || '').trim() === String(idOrSerial).trim() || 
    String(item['หมายเลขซีเรียล'] || '').trim() === String(idOrSerial).trim()
  );

  if (!eq) {
    alert(`❌ ไม่พบข้อมูลอุปกรณ์รหัส/ซีเรียล "${idOrSerial}" ในระบบครับ`);
    return;
  }

  const targetSerial = eq['หมายเลขซีเรียล'] || eq['ID'];
  const hasPendingCapa = checkEquipmentDefective(targetSerial);

  let warningNote = '';
  if (hasPendingCapa) {
    warningNote = `\n\n⚠️ คำเตือนสำคัญ: อุปกรณ์ชิ้นนี้ยังมีเคสข้อบกพร่องความปลอดภัยคงค้างอยู่ (รอดำเนินการ CAPA)\nระบบจะบันทึกสถานะเป็น "ปิดการใช้งาน (จบโครงการ)" เพื่อหยุดการหักคะแนน Tag Expired แต่ประวัติ CAPA จะยังคงล็อคซีเรียล (${targetSerial}) นี้ไว้ จนกว่าจะมีการอัปโหลดภาพ After ปิดเคส CAPA จริงก่อนจะนำกลับมาขึ้นทะเบียนใหม่ได้ในอนาคตครับ`;
  }

  const confirmDeactivate = confirm(`🛑 ยืนยันการปิดการใช้งานอุปกรณ์ (จบโครงการ / ปลดระวาง):\n----------------------------------\n• ชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']}\n• หมายเลขซีเรียล: ${eq['หมายเลขซีเรียล']}\n• บริษัทผู้รับเหมา: ${eq['บริษัทผู้รับเหมา']}${warningNote}\n\nต้องการเปลี่ยนสถานะเป็น "ปิดการใช้งาน (จบโครงการ)" หรือไม่?`);
  if (!confirmDeactivate) return;

  eq['สถานะอุปกรณ์'] = 'ปิดการใช้งาน (จบโครงการ)';

  const payload = {
    id: eq['ID'],
    targetId: eq['ID'],
    serialNumber: eq['หมายเลขซีเรียล'],
    equipmentName: eq['ชื่ออุปกรณ์'],
    contractor: eq['บริษัทผู้รับเหมา'],
    status: 'ปิดการใช้งาน (จบโครงการ)'
  };

  showConnectionStatus('loading');
  await sendActionToServer('deactivateEquipment', payload);

  renderEquipmentTable();
  if (appState.equipment) renderDashboard();

  if (hasPendingCapa) {
    alert(`⚠️ เปลี่ยนสถานะเป็น "ปิดการใช้งาน (จบโครงการ)" เรียบร้อยแล้ว!\n---------------------------\nชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']}\nหมายเลขซีเรียล: ${eq['หมายเลขซีเรียล']}\n\n📌 หมายเหตุ: อุปกรณ์นี้ยังมีเคส CAPA คงค้างอยู่ หากผู้รับเหมานำซีเรียลนี้กลับมาขึ้นทะเบียนใหม่ในอนาคต ระบบจะบล็อกและบังคับให้ปิดเคส CAPA เดิมก่อนครับ`);
  } else {
    alert(`✅ เปลี่ยนสถานะเป็น "ปิดการใช้งาน (จบโครงการ)" เรียบร้อยแล้ว!\n---------------------------\nชื่ออุปกรณ์: ${eq['ชื่ออุปกรณ์']}\nหมายเลขซีเรียล: ${eq['หมายเลขซีเรียล']}\n\nคะแนนประเมิน Safety Scorecard ของผู้รับเหมาจะได้รับการยกเว้นการหักคะแนน Tag หมดอายุสำหรับอุปกรณ์ชิ้นนี้แล้วครับ`);
  }
}




