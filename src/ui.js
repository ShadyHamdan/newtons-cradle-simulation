import * as THREE from 'three';
import { settings, pendingBallsSettings, applyLaunchConfiguration } from './physics.js';

export function setupUI(pendulums) {
    const gravityInput = document.getElementById('gravityInput');
    const gravityValue = document.getElementById('gravityValue');
    const restitutionInput = document.getElementById('restitutionInput');
    const restitutionValue = document.getElementById('restitutionValue');
    const dampingInput = document.getElementById('dampingInput');
    const dampingValue = document.getElementById('dampingValue');

    const allBallsModeBtn = document.getElementById('allBallsModeBtn');
    const singleBallModeBtn = document.getElementById('singleBallModeBtn');
    const ballSelectGroup = document.getElementById('ballSelectGroup');
    const ballSelect = document.getElementById('ballSelect');
    const lengthInput = document.getElementById('lengthInput');
    const lengthValue = document.getElementById('lengthValue');
    const massInput = document.getElementById('massInput');
    const massValue = document.getElementById('massValue');
    
    // التعديل الجديد: جلب عنصر اختيار طريقة التعليق من الـ HTML
    const wireSelect = document.getElementById('wireSelect');

    const launchCountInput = document.getElementById('launchCountInput');
    const launchCountValue = document.getElementById('launchCountValue');
    const launchAngleInput = document.getElementById('launchAngleInput');
    const launchAngleValue = document.getElementById('launchAngleValue');
    const singleSideBtn = document.getElementById('singleSideBtn');
    const doubleSideBtn = document.getElementById('doubleSideBtn');
    const soundToggle = document.getElementById('soundToggle');
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');

    let controlMode = 'all'; 

    allBallsModeBtn.addEventListener('click', () => {
        controlMode = 'all';
        allBallsModeBtn.classList.add('active');
        singleBallModeBtn.classList.remove('active');
        ballSelectGroup.style.opacity = '0.5';
        ballSelectGroup.style.pointerEvents = 'none';
    });

    singleBallModeBtn.addEventListener('click', () => {
        controlMode = 'single';
        singleBallModeBtn.classList.add('active');
        allBallsModeBtn.classList.remove('active');
        ballSelectGroup.style.opacity = '1';
        ballSelectGroup.style.pointerEvents = 'auto';
        updateSlidersFromSelection();
    });

    // التعديل الجديد: تحديث قيمة القائمة المنسدلة للأسلاك بناءً على الكرة المحددة
    function updateSlidersFromSelection() {
        const selectedIdx = parseInt(ballSelect.value);
        const currentBallSettings = pendingBallsSettings[selectedIdx];
        lengthInput.value = currentBallSettings.stringLength;
        lengthValue.textContent = currentBallSettings.stringLength.toFixed(1);
        massInput.value = currentBallSettings.mass;
        massValue.textContent = currentBallSettings.mass.toFixed(1);
        wireSelect.value = currentBallSettings.wireCount; 
    }

    gravityInput.addEventListener('input', () => {
        settings.gravity = parseFloat(gravityInput.value);
        gravityValue.textContent = settings.gravity.toFixed(2);
    });

    restitutionInput.addEventListener('input', () => {
        settings.restitution = parseFloat(restitutionInput.value);
        restitutionValue.textContent = settings.restitution.toFixed(3);
    });

    dampingInput.addEventListener('input', () => {
        settings.airDamping = parseFloat(dampingInput.value);
        dampingValue.textContent = settings.airDamping.toFixed(4);
    });

    ballSelect.addEventListener('change', updateSlidersFromSelection);

    lengthInput.addEventListener('input', () => {
        const val = parseFloat(lengthInput.value);
        lengthValue.textContent = val.toFixed(1);
        if (controlMode === 'all') {
            pendingBallsSettings.forEach(b => b.stringLength = val);
        } else {
            const selectedIdx = parseInt(ballSelect.value);
            pendingBallsSettings[selectedIdx].stringLength = val;
        }
    });

    massInput.addEventListener('input', () => {
        const val = parseFloat(massInput.value);
        massValue.textContent = val.toFixed(1);
        if (controlMode === 'all') {
            pendingBallsSettings.forEach(b => b.mass = val);
        } else {
            const selectedIdx = parseInt(ballSelect.value);
            pendingBallsSettings[selectedIdx].mass = val;
        }
    });

    // التعديل الجديد: مستمع الأحداث لتحديث مصفوفة الإعدادات المؤقتة عند تغيير طريقة التعليق
    wireSelect.addEventListener('change', () => {
        const val = parseInt(wireSelect.value);
        if (controlMode === 'all') {
            pendingBallsSettings.forEach(b => b.wireCount = val);
        } else {
            const selectedIdx = parseInt(ballSelect.value);
            pendingBallsSettings[selectedIdx].wireCount = val;
        }
    });

    launchCountInput.addEventListener('input', () => {
        settings.launchCount = parseInt(launchCountInput.value);
        launchCountValue.textContent = settings.launchCount;
    });

    launchAngleInput.addEventListener('input', () => {
        const degrees = parseFloat(launchAngleInput.value);
        settings.launchAngle = THREE.MathUtils.degToRad(degrees);
        launchAngleValue.textContent = degrees.toFixed(0);
    });

    singleSideBtn.addEventListener('click', () => {
        settings.launchMode = 'single';
        singleSideBtn.classList.add('active');
        doubleSideBtn.classList.remove('active');
    });

    doubleSideBtn.addEventListener('click', () => {
        settings.launchMode = 'double';
        doubleSideBtn.classList.add('active');
        singleSideBtn.classList.remove('active');
    });

    soundToggle.addEventListener('change', () => {
        settings.sound = soundToggle.checked;
    });

    // هنا تم استبدال دالة التطبيق بالكود الشامل والذكي بالكامل للتحكم بالأسلاك هندسياً وبصرياً
    applyBtn.addEventListener('click', () => {
        pendulums.forEach((p, index) => {
            p.individualLength = pendingBallsSettings[index].stringLength;
            p.individualMass = pendingBallsSettings[index].mass;
            p.ball.position.y = -p.individualLength;

            const wireCount = pendingBallsSettings[index].wireCount;

            // مصفوفات نقاط الأسلاك
            const leftPositions = p.leftWire.geometry.attributes.position.array;
            const rightPositions = p.rightWire.geometry.attributes.position.array;

            // تحديث إحداثيات Y السفلية للأسلاك لتتطابق مع طول الخيط الجديد (الرقم 4 هو المحور Y السفلي)
            leftPositions[4] = -p.individualLength;
            rightPositions[4] = -p.individualLength;

            // تعديل المحور Z العلوي للأسلاك بناءً على عدد الخيوط (الرقم 2 هو المحور Z العلوي)
            if (wireCount === 1) {
                leftPositions[2] = 0; // نقل الخيط الأيسر ليتصل بالجسر الوسطي
                p.rightWire.visible = false; // إخفاء الخيط الأيمن تماماً
            } else {
                leftPositions[2] = 1.4; // إعادة الخيط الأيسر للجسر الأمامي
                p.rightWire.visible = true; // إظهار الخيط الأيمن
            }

            // إعلام Three.js بأن المصفوفات قد تغيرت ليتم رسمها من جديد
            p.leftWire.geometry.attributes.position.needsUpdate = true;
            p.rightWire.geometry.attributes.position.needsUpdate = true;
        });
        
        applyLaunchConfiguration(pendulums);
    });

    resetBtn.addEventListener('click', () => applyLaunchConfiguration(pendulums));
}