import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FIXED_DT, BALL_COUNT, BALL_RADIUS, DIAMETER, PIVOT_Y, applyLaunchConfiguration, updatePendulumPhysics, updatePendulumTransform, solveCollisions } from './physics.js';
import { setupUI } from './ui.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 18, 40);

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 14);

// --- Renderer Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// --- Orbit Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 6;
controls.maxDistance = 24;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 2, 0);

// --- Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(6, 10, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.bias = -0.0002;
keyLight.shadow.normalBias = 0.04;
keyLight.shadow.camera.left = -15;
keyLight.shadow.camera.right = 15;
keyLight.shadow.camera.top = 15;
keyLight.shadow.camera.bottom = -15;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 40;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x4488ff, 0.5);
rimLight.position.set(-8, 8, -10);
scene.add(rimLight);

const topLight = new THREE.PointLight(0xffffff, 0.6, 40);
topLight.position.set(0, 10, 0);
scene.add(topLight);

// --- Environment Floor ---
const floorGeometry = new THREE.PlaneGeometry(80, 80);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.05 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.5;
floor.receiveShadow = true;
scene.add(floor);

// --- Materials ---
const chromeMaterial = new THREE.MeshPhysicalMaterial({ color: 0xd9d9d9, metalness: 1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5 });
const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.2 });

// --- إعدادات الخيوط الابتدائية ---
const wireMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6, metalness: 0.1 });
const wireGeometry = new THREE.CylinderGeometry(0.012, 0.012, 1, 8);
wireGeometry.translate(0, -0.5, 0);

const defaultLength = 5.0;
const zOffset = 1.4;
const initialActualLength = Math.sqrt(defaultLength * defaultLength + zOffset * zOffset);
const initialWireAngle = Math.atan2(zOffset, defaultLength);

// --- Support Frame ---
const frame = new THREE.Group();
scene.add(frame);
const width = BALL_COUNT * DIAMETER + 2;
const pillarGeometry = new THREE.CylinderGeometry(0.1, 0.1, 7, 24);
const beamGeometry = new THREE.BoxGeometry(width, 0.15, 0.15);

const pillarPositions = [
    [-width / 2, 2, 1.4], [width / 2, 2, 1.4],
    [-width / 2, 2, -1.4], [width / 2, 2, -1.4]
];
pillarPositions.forEach(pos => {
    const pillar = new THREE.Mesh(pillarGeometry, frameMaterial);
    pillar.position.set(...pos);
    pillar.castShadow = true;
    frame.add(pillar);
});

const beamFront = new THREE.Mesh(beamGeometry, frameMaterial);
beamFront.position.set(0, PIVOT_Y, 1.4);
beamFront.castShadow = true;
frame.add(beamFront);

const beamBack = beamFront.clone();
beamBack.position.z = -1.4;
frame.add(beamBack);

const beamCenter = beamFront.clone();
beamCenter.position.z = 0;
frame.add(beamCenter);

const connectorGeometry = new THREE.BoxGeometry(0.15, 0.15, 2.8);
const leftConnector = new THREE.Mesh(connectorGeometry, frameMaterial);
leftConnector.position.set(-width / 2, PIVOT_Y, 0);
leftConnector.castShadow = true;
frame.add(leftConnector);

const rightConnector = leftConnector.clone();
rightConnector.position.x = width / 2;
frame.add(rightConnector);

// --- Instantiating Pendulums ---
const pendulums = [];
const startX = -((BALL_COUNT - 1) * DIAMETER) / 2;
const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);

for (let i = 0; i < BALL_COUNT; i++) {
    const pivotX = startX + i * DIAMETER;
    const group = new THREE.Group();
    group.position.set(pivotX, PIVOT_Y, 0);
    scene.add(group);

    const leftWire = new THREE.Mesh(wireGeometry, wireMaterial);
    const rightWire = new THREE.Mesh(wireGeometry, wireMaterial);
    leftWire.castShadow = true;
    rightWire.castShadow = true;
    
    // التموضع المبدئي للخيوط
    leftWire.position.set(0, 0, zOffset);
    leftWire.rotation.x = initialWireAngle;
    leftWire.scale.y = initialActualLength;
    
    rightWire.position.set(0, 0, -zOffset);
    rightWire.rotation.x = -initialWireAngle;
    rightWire.scale.y = initialActualLength;
    
    group.add(leftWire);
    group.add(rightWire);

    const ball = new THREE.Mesh(ballGeometry, chromeMaterial);
    ball.position.y = -5.0;
    ball.castShadow = true;
    ball.receiveShadow = true;
    group.add(ball);

    pendulums.push({
        group,
        ball,
        leftWire,
        rightWire,
        pivotX,
        angle: 0,
        angularVelocity: 0,
        angularAcceleration: 0,
        angleZ: 0,
        angularVelocityZ: 0,
        angularAccelerationZ: 0,
        worldPosition: new THREE.Vector3(pivotX, PIVOT_Y - 5.0, 0),
        individualLength: 5.0,
        individualMass: 1.0,
        individualRestitution: 0.98
    });
}

// 🌟 تعديل تنظيم الـ Scope: رفع متغيرات السحب للأعلى ليقرأها تابع التحديث بأمان
let isDragging = false;
let selectedPendulums = [];

// --- Initialize Engine ---
setupUI(pendulums);

// 🌟 التعديل الحرج المضاف: تحديث فوري وهندسي لكل الكرات والخيوط قبل بدء المحرك الفيزيائي 
// لضمان التموضع والالتحام الصحيح بالجسور في أول إطار رسومي للمستخدم
pendulums.forEach(p => {
    updatePendulumTransform(p);
});

// --- Animation Loop ---
const clock = new THREE.Clock();
let accumulator = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1.5;
    accumulator += delta;

    while (accumulator >= FIXED_DT) {
        for (const p of pendulums) {
            if (isDragging && selectedPendulums.includes(p)) {
                p.angularVelocity = 0;
                p.angularVelocityZ = 0;
            } else {
                updatePendulumPhysics(p);
            }
        }
        for (const p of pendulums) {
            updatePendulumTransform(p);
        }
        solveCollisions(pendulums);
        accumulator -= FIXED_DT;
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========================================================
// 🛠️ نظام التحكم وسحب الكرات المطور (يدعم محاور X و Z بالتناوب)
// ========================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const enableZDragCheckbox = document.getElementById('enableZDrag');
const dragPlane = new THREE.Plane();
const intersectionPoint = new THREE.Vector3();

// 1. عند النقر بالماوس (Pointer Down)
window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.launch-panel') || e.target.closest('#controlPanel')) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const ballMeshes = pendulums.map(p => p.ball);
    const intersects = raycaster.intersectObjects(ballMeshes);

    if (intersects.length > 0) {
        isDragging = true;
        controls.enabled = false;

        const clickedBallMesh = intersects[0].object;
        const clickedIdx = pendulums.findIndex(p => p.ball === clickedBallMesh);
        const launchCount = parseInt(document.getElementById('launchCountInput').value);

        selectedPendulums = [];

        if (clickedIdx < BALL_COUNT / 2) {
            for (let i = 0; i < launchCount; i++) {
                if (pendulums[i]) selectedPendulums.push(pendulums[i]);
            }
        } else {
            for (let i = 0; i < launchCount; i++) {
                const idx = BALL_COUNT - 1 - i;
                if (pendulums[idx]) selectedPendulums.push(pendulums[idx]);
            }
        }

        const refBall = selectedPendulums[0];
        if (enableZDragCheckbox && enableZDragCheckbox.checked) {
            dragPlane.setFromNormalAndCoplanarPoint(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, PIVOT_Y - refBall.individualLength, 0)
            );
        } else {
            dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        }
    }
});

// 2. أثناء تحريك الماوس (Pointer Move)
window.addEventListener('pointermove', (e) => {
    if (!isDragging || selectedPendulums.length === 0) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
        const referencePendulum = selectedPendulums[0];
        const maxAngleRad = THREE.MathUtils.degToRad(80);

        if (enableZDragCheckbox && enableZDragCheckbox.checked) {
            const dx = intersectionPoint.x - referencePendulum.pivotX;
            const dz = intersectionPoint.z - 0;
            const dy = referencePendulum.individualLength;

            let targetAngleX = Math.atan2(dx, dy);
            let targetAngleZ = Math.atan2(dz, dy);

            targetAngleX = THREE.MathUtils.clamp(targetAngleX, -maxAngleRad, maxAngleRad);
            targetAngleZ = THREE.MathUtils.clamp(targetAngleZ, -maxAngleRad, maxAngleRad);

            selectedPendulums.forEach(p => {
                p.angle = targetAngleX;
                p.angleZ = targetAngleZ;
                p.angularVelocity = 0;
                p.angularVelocityZ = 0;
            });

            const angleInDegreesX = Math.abs(THREE.MathUtils.radToDeg(targetAngleX));
            const launchAngleInput = document.getElementById('launchAngleInput');
            const launchAngleValue = document.getElementById('launchAngleValue');
            if (launchAngleInput && launchAngleValue) {
                launchAngleInput.value = angleInDegreesX.toFixed(0);
                launchAngleValue.textContent = angleInDegreesX.toFixed(0);
            }

            const angleInDegreesZ = Math.abs(THREE.MathUtils.radToDeg(targetAngleZ));
            const launchAngleZInput = document.getElementById('launchAngleZInput');
            const launchAngleZValue = document.getElementById('launchAngleZValue');
            if (launchAngleZInput && launchAngleZValue) {
                launchAngleZInput.value = angleInDegreesZ.toFixed(0);
                launchAngleZValue.textContent = angleInDegreesZ.toFixed(0) + '°';
            }
        } else {
            const dx = intersectionPoint.x - referencePendulum.pivotX;
            const dy = intersectionPoint.y - PIVOT_Y;
            let targetAngleX = Math.atan2(dx, -dy);
            targetAngleX = THREE.MathUtils.clamp(targetAngleX, -maxAngleRad, maxAngleRad);

            selectedPendulums.forEach(p => {
                p.angle = targetAngleX;
                p.angularVelocity = 0;
            });

            const angleInDegrees = Math.abs(THREE.MathUtils.radToDeg(targetAngleX));
            const launchAngleInput = document.getElementById('launchAngleInput');
            const launchAngleValue = document.getElementById('launchAngleValue');
            if (launchAngleInput && launchAngleValue) {
                launchAngleInput.value = angleInDegrees.toFixed(0);
                launchAngleValue.textContent = angleInDegrees.toFixed(0);
            }
        }
    }
});

// 3. عند إفلات زر الماوس (Pointer Up)
window.addEventListener('pointerup', () => {
    if (isDragging) {
        isDragging = false;
        controls.enabled = true;
        selectedPendulums.forEach(p => {
            p.angularVelocity = 0;
            p.angularVelocityZ = 0;
        });
        selectedPendulums = [];
    }
});