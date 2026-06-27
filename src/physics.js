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

// التعديل الجديد: تم استبدال الكود القديم وإضافة خاصية wireCount هنا
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
    }

    if (settings.launchMode === 'single') {
        for (let i = 0; i < settings.launchCount; i++) {
            pendulums[i].angle = -settings.launchAngle;
        }
    } else if (settings.launchMode === 'double') {
        for (let i = 0; i < settings.launchCount; i++) {
            pendulums[i].angle = -settings.launchAngle;
        }
        for (let i = 0; i < settings.launchCount; i++) {
            const index = BALL_COUNT - 1 - i;
            pendulums[index].angle = settings.launchAngle;
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
}

export function updatePendulumTransform(p) {
    p.group.rotation.z = p.angle;
    const x = p.pivotX + Math.sin(p.angle) * p.individualLength;
    const y = PIVOT_Y - Math.cos(p.angle) * p.individualLength;
    p.worldPosition.set(x, y, 0);
}

export function solveCollisions(pendulums) {
    for (let i = 0; i < BALL_COUNT; i++) {
        for (let j = i + 1; j < BALL_COUNT; j++) {
            const p1 = pendulums[i];
            const p2 = pendulums[j];

            const diffX = p2.worldPosition.x - p1.worldPosition.x;
            const diffY = p2.worldPosition.y - p1.worldPosition.y;
            const distance = Math.sqrt(diffX * diffX + diffY * diffY);

            if (distance < DIAMETER) {
                const nx = diffX / (distance || 1);
                const ny = diffY / (distance || 1);

                const v1x = Math.cos(p1.angle) * p1.individualLength * p1.angularVelocity;
                const v1y = Math.sin(p1.angle) * p1.individualLength * p1.angularVelocity;
                
                const v2x = Math.cos(p2.angle) * p2.individualLength * p2.angularVelocity;
                const v2y = Math.sin(p2.angle) * p2.individualLength * p2.angularVelocity;

                const relVelX = v1x - v2x;
                const relVelY = v1y - v2y;
                const relativeNormalVelocity = relVelX * nx + relVelY * ny;

                if (relativeNormalVelocity > 0) {
                    const m1 = p1.individualMass;
                    const m2 = p2.individualMass;
                    const e = settings.restitution;

                    const impulse = ((1 + e) * relativeNormalVelocity) / ((1 / m1) + (1 / m2));

                    const newV1x = v1x - (impulse / m1) * nx;
                    
                    p1.angularVelocity = newV1x / (p1.individualLength * Math.cos(p1.angle) || 1);
                    p2.angularVelocity = (v2x + (impulse / m2) * nx) / (p2.individualLength * Math.cos(p2.angle) || 1);

                    const overlap = DIAMETER - distance;
                    p1.angle -= (overlap * 0.5 * nx) / p1.individualLength;
                    p2.angle += (overlap * 0.5 * nx) / p2.individualLength;

                    playCollisionSound(Math.abs(relativeNormalVelocity));
                }
            }
        }
    }
}

export function resetPhysicsSimulation(pendulums) {
    if (!pendulums || !Array.isArray(pendulums)) return;

    pendulums.forEach((pendulum) => {
        // 1. تصفير السرعة الزاوية والتسارع الزاوي (Angular State)
        pendulum.angularVelocity = 0;
        pendulum.angularAcceleration = 0;

        // 2. تصفير السرعات والتسارعات الخطية ثلاثية الأبعاد (Linear State) إن وجدت
        if (pendulum.velocity) pendulum.velocity.set(0, 0, 0);
        if (pendulum.acceleration) pendulum.acceleration.set(0, 0, 0);

        // 3. إعادة زاوية التأرجح إلى الصفر (الوضع العمودي تماماً)
        pendulum.angle = 0;

        // 4. تحديث المصفوفة البصرية (Three.js Mesh) بشكل فوري لإجبار المتصفح على رسمها في وضع السكون
        // إذا كان كائن البندول لديك يحتوي على دالة تحديث داخلية تقوم بحساب الموضع بناءً على الزاوية:
        if (typeof pendulum.update === 'function') {
            pendulum.update(0); // تمرير زمن delta = 0 للتحديث الموضعي فقط
        } else {
            // إذا كنت تحسب المواقع يدوياً خارج الكائن، بمجرد تصفير الـ angle، 
            // سيتولى حبل التحديث (Loop) في الإطار القادم (Next Frame) إعادة الكرات لمكانها تلقائياً.
        }
    });

    console.log("🔄 تم تصفير المحرك الفيزيائي وإعادة الكرات إلى وضع السكون العمودي.");
}