import * as THREE from 'three'; 

export const FIXED_DT = 1 / 240; 
export const BALL_COUNT = 5; 
export const BALL_RADIUS = 0.5; 
export const DIAMETER = BALL_RADIUS * 2; 
export const PIVOT_Y = 5; 

export const settings = { 
    gravity: 9.81, 
    restitution: 0.995, 
    airDamping: 0.9994, 
    launchAngle: THREE.MathUtils.degToRad(45), 
    launchCount: 1, 
    launchMode: 'single', 
    sound: true, 
}; 

// الإعدادات المؤقتة للكرات
export const pendingBallsSettings = Array.from({ length: BALL_COUNT }, () => ({ 
    stringLength: 5.0, 
    mass: 1.0, 
    wireCount: 2, // القيمة الافتراضية هي خيطين 
    restitution: 0.98 
})); 

const audioContext = new (window.AudioContext || window.webkitAudioContext)(); 

function playCollisionSound(intensity) { 
    if (!settings.sound || intensity < 0.02) return; 
    const oscillator = audioContext.createOscillator(); 
    const gainNode = audioContext.createGain(); 
    oscillator.type = 'triangle'; 
    oscillator.frequency.setValueAtTime(7500, audioContext.currentTime); 
    const volume = Math.min(0.15, intensity * 0.05); 
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime); 
    oscillator.connect(gainNode); 
    gainNode.connect(audioContext.destination); 
    oscillator.start(); 
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.04); 
    oscillator.stop(audioContext.currentTime + 0.05); 
} 

export function applyLaunchConfiguration(pendulums) { 
    for (const p of pendulums) { 
        p.angle = 0; 
        p.angularVelocity = 0; 
        p.angularAcceleration = 0; 
        p.angleZ = 0; 
        p.angularVelocityZ = 0; 
        p.angularAccelerationZ = 0; 
    } 

    const uiAngleZInput = document.getElementById('launchAngleZInput'); 
    const launchAngleZ = uiAngleZInput ? THREE.MathUtils.degToRad(parseFloat(uiAngleZInput.value)) : 0; 

    if (settings.launchMode === 'single') { 
        for (let i = 0; i < settings.launchCount; i++) { 
            pendulums[i].angle = -settings.launchAngle; 
            pendulums[i].angleZ = launchAngleZ; 
        } 
    } else if (settings.launchMode === 'double') { 
        for (let i = 0; i < settings.launchCount; i++) { 
            pendulums[i].angle = -settings.launchAngle; 
            pendulums[i].angleZ = launchAngleZ; 
        } 
        for (let i = 0; i < settings.launchCount; i++) { 
            const index = BALL_COUNT - 1 - i; 
            pendulums[index].angle = settings.launchAngle; 
            pendulums[index].angleZ = -launchAngleZ; 
        } 
    } 

    for (const p of pendulums) { 
        updatePendulumTransform(p); 
    } 
} 

export function updatePendulumPhysics(p) { 
    p.angularAcceleration = -(settings.gravity / p.individualLength) * Math.sin(p.angle); 
    p.angularVelocity += p.angularAcceleration * FIXED_DT; 
    p.angularVelocity *= settings.airDamping; 
    p.angle += p.angularVelocity * FIXED_DT; 

    if (p.angleZ === undefined) p.angleZ = 0; 
    if (p.angularVelocityZ === undefined) p.angularVelocityZ = 0; 

    p.angularAccelerationZ = -(settings.gravity / p.individualLength) * Math.sin(p.angleZ); 
    p.angularVelocityZ += p.angularAccelerationZ * FIXED_DT; 
    p.angularVelocityZ *= settings.airDamping; 
    p.angleZ += p.angularVelocityZ * FIXED_DT; 
} 

/* 🛠️ التعديل الجذري والمنقح لدالة التحديث الهيكلي 🛠️ */
export function updatePendulumTransform(p) { 
    const angleX = p.angle; 
    const angleZ = p.angleZ || 0; 
    const L = p.individualLength; 

    // 1. تصفير دوران المجموعة تماماً لضمان ثبات نقاط التعليق العلوية فوق الجسور الهيكلية 
    p.group.rotation.set(0, 0, 0); 

    // 2. حساب الإسقاط الرياضي الدقيق للموقع المحلي لمركز الكرة داخل المجموعة 
    const sinX = Math.sin(angleX); 
    const cosX = Math.cos(angleX); 
    const sinZ = Math.sin(angleZ); 
    const cosZ = Math.cos(angleZ); 

    const localX = L * sinX * cosZ; 
    const localZ = L * sinZ; 
    const localY = -L * cosX * cosZ; 

    // تحديث موقع الكرة المحلي ثلاثي الأبعاد 
    p.ball.position.set(localX, localY, localZ); 

    // 3. تحديث خيوط التعليق ديناميكياً بناءً على الخاصية الفيزيائية wireCount
    const zOffset = 1.4; 
    const currentWireCount = p.wireCount !== undefined ? p.wireCount : 2;

    if (currentWireCount === 1) { 
        // --- 1️⃣ حالة التعليق بخيط واحد (تثبيت كامل في المنتصف Z = 0) --- 
        const anchorCenter = new THREE.Vector3(0, 0, 0); 
        
        if (p.leftWire) {
            p.leftWire.visible = true;
            p.leftWire.position.copy(anchorCenter); 
            const dirCenter = new THREE.Vector3().subVectors(p.ball.position, anchorCenter); 
            p.leftWire.scale.y = dirCenter.length(); 
            dirCenter.normalize(); 
            p.leftWire.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirCenter); 
        }
        
        // إخفاء الخيط الأيمن تماماً لكي لا يظهر معلقاً في الهواء
        if (p.rightWire) {
            p.rightWire.visible = false; 
        }

    } else { 
        // --- 2️⃣ حالة التعليق بخيطين (V-Shape ممتد للجسور الجانبية) --- 
        const anchorLeft = new THREE.Vector3(0, 0, zOffset); 
        const anchorRight = new THREE.Vector3(0, 0, -zOffset); 

        if (p.leftWire) p.leftWire.visible = true;
        if (p.rightWire) p.rightWire.visible = true;

        // تحديث الخيط الأيسر (الوصول للجسر الأمامي) 
        if (p.leftWire) {
            p.leftWire.position.copy(anchorLeft); 
            const dirLeft = new THREE.Vector3().subVectors(p.ball.position, anchorLeft); 
            p.leftWire.scale.y = dirLeft.length(); 
            dirLeft.normalize(); 
            p.leftWire.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirLeft); 
        }

        // تحديث الخيط الأيمن (الوصول للجسر الخلفي) 
        if (p.rightWire) {
            p.rightWire.position.copy(anchorRight); 
            const dirRight = new THREE.Vector3().subVectors(p.ball.position, anchorRight); 
            p.rightWire.scale.y = dirRight.length(); 
            dirRight.normalize(); 
            p.rightWire.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirRight); 
        }
    } 

    // 4. تحديث المتغير الفيزيائي العالمي المعتمد عليه في التصادمات 
    const x = p.pivotX + localX; 
    const z = 0 + localZ; 
    const y = PIVOT_Y + localY; 
    p.worldPosition.set(x, y, z); 
} 
export function solveCollisions(pendulums) { 
    for (let i = 0; i < BALL_COUNT; i++) { 
        for (let j = i + 1; j < BALL_COUNT; j++) { 
            const p1 = pendulums[i]; 
            const p2 = pendulums[j]; 

            // 1️⃣ حساب المسافة بين مركزي الكرتين
            const diffX = p2.worldPosition.x - p1.worldPosition.x; 
            const diffY = p2.worldPosition.y - p1.worldPosition.y; 
            const diffZ = p2.worldPosition.z - p1.worldPosition.z; 
            const distance = Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ); 

            if (distance < DIAMETER) { 
                const nx = diffX / (distance || 1); 
                const ny = diffY / (distance || 1); 
                const nz = diffZ / (distance || 1); 

                const L1 = p1.individualLength; 
                const angVelX1 = p1.angularVelocity; 
                const angVelZ1 = p1.angularVelocityZ || 0; 
                const cosX1 = Math.cos(p1.angle);
                const cosZ1 = Math.cos(p1.angleZ || 0);

                // حساب مركبات السرعة الخطية ثلاثية الأبعاد
                const v1x = cosX1 * cosZ1 * L1 * angVelX1; 
                const v1y = Math.sin(p1.angle) * L1 * angVelX1; 
                const v1z = cosZ1 * L1 * angVelZ1; 

                const L2 = p2.individualLength; 
                const angVelX2 = p2.angularVelocity; 
                const angVelZ2 = p2.angularVelocityZ || 0; 
                const cosX2 = Math.cos(p2.angle);
                const cosZ2 = Math.cos(p2.angleZ || 0);

                const v2x = cosX2 * cosZ2 * L2 * angVelX2; 
                const v2y = Math.sin(p2.angle) * L2 * angVelX2; 
                const v2z = cosZ2 * L2 * angVelZ2; 

                // حساب السرعة النسبية المتجهة
                const relVelX = v1x - v2x; 
                const relVelY = v1y - v2y; 
                const relVelZ = v1z - v2z; 
                const relativeNormalVelocity = relVelX * nx + relVelY * ny + relVelZ * nz; 

                const m1 = p1.individualMass; 
                const m2 = p2.individualMass; 

                // 2️⃣ حساب نبض الارتداد (Impulse) - يُنفذ فقط إذا كانت الكرات تتحرك فعلياً باتجاه بعضها
                if (relativeNormalVelocity > 0) { 
                    const e = settings.restitution; 
                    const impulse = ((1 + e) * relativeNormalVelocity) / ((1 / m1) + (1 / m2)); 

                    const dv1x = -(impulse / m1) * nx;
                    const dv1z = -(impulse / m1) * nz;
                    const dv2x = (impulse / m2) * nx;
                    const dv2z = (impulse / m2) * nz;

                    p1.angularVelocity += dv1x / (L1 * cosX1 || 1);
                    p1.angularVelocityZ += dv1z / (L1 * cosZ1 || 1);
                    p2.angularVelocity += dv2x / (L2 * cosX2 || 1);
                    p2.angularVelocityZ += dv2z / (L2 * cosZ2 || 1);

                    playCollisionSound(Math.abs(relativeNormalVelocity)); 
                } 

                // 3️⃣ حل مشكلة التداخل المادي (خارج شرط السرعة)
                // هذا الجزء سيجبر الكرات المتداخلة عند الإفلات على الابتعاد فوراً عن بعضها في أول إطار
                const overlap = DIAMETER - distance; 
                const totalMass = m1 + m2;
                const ratio1 = m2 / totalMass; 
                const ratio2 = m1 / totalMass; 

                // تعديل الزوايا للبندولين بناءً على وزن كل منهما
                p1.angle -= (overlap * ratio1 * nx) / L1; 
                p1.angleZ -= (overlap * ratio1 * nz) / L1; 
                p2.angle += (overlap * ratio2 * nx) / L2; 
                p2.angleZ += (overlap * ratio2 * nz) / L2; 

                // تصحيح فوري للمواقع العالمية (World Positions) لمنع الـ Tunneling البصري
                p1.worldPosition.x -= overlap * ratio1 * nx;
                p1.worldPosition.z -= overlap * ratio1 * nz;
                p2.worldPosition.x += overlap * ratio2 * nx;
                p2.worldPosition.z += overlap * ratio2 * nz;

                // تحديث المصفوفات الرسومية مباشرة ليعكس محرك الرندرة (Three.js) التغيير فوراً
                if (typeof updatePendulumTransform === 'function') {
                    updatePendulumTransform(p1);
                    updatePendulumTransform(p2);
                }
            } 
        } 
    } 
}
export function resetPhysicsSimulation(pendulums) { 
    if (!pendulums || !Array.isArray(pendulums)) return; 
    pendulums.forEach((pendulum) => { 
        pendulum.angularVelocity = 0; 
        pendulum.angularAcceleration = 0; 
        if (pendulum.velocity) pendulum.velocity.set(0, 0, 0); 
        if (pendulum.acceleration) pendulum.acceleration.set(0, 0, 0); 
        pendulum.angle = 0; 
        pendulum.angleZ = 0; 
        pendulum.angularVelocityZ = 0; 
        pendulum.angularAccelerationZ = 0; 
        
        // إعادة التعيين الافتراضي لخيطين عند الريسيت
        pendulum.wireCount = 2; 
    }); 
    console.log("🔄 تم تصفير المحرك الفيزيائي وإعادة الكرات إلى وضع السكون العمودي."); 
}