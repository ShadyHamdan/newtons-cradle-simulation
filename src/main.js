import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
    FIXED_DT, BALL_COUNT, BALL_RADIUS, DIAMETER, PIVOT_Y,
    applyLaunchConfiguration, updatePendulumPhysics, updatePendulumTransform, solveCollisions 
} from './physics.js';
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
const chromeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9d9d9, metalness: 1, roughness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5
});
const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.2 });

// --- تعديل الخيوط: تحويل المادة إلى MeshStandardMaterial وتوليد أسطوانة نحيفة ---
const wireMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6, metalness: 0.1 });
const wireGeometry = new THREE.CylinderGeometry(0.012, 0.012, 1, 8);
wireGeometry.translate(0, -0.5, 0); // نقل مركز الأسطوانة لأعلاها لتسهيل التمديد

// حسابات الأبعاد والزوايا الابتدائية للخيوط (طول 5.0 وعرض الجسر 1.4)
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

// الجسور الأفقية الأساسية
const beamFront = new THREE.Mesh(beamGeometry, frameMaterial);
beamFront.position.set(0, PIVOT_Y, 1.4);
beamFront.castShadow = true;
frame.add(beamFront);

const beamBack = beamFront.clone();
beamBack.position.z = -1.4;
frame.add(beamBack);

// الجسر الأفقي الأوسط
const beamCenter = beamFront.clone();
beamCenter.position.z = 0; 
frame.add(beamCenter);

// --- التعديل الجديد: إضافة العوارض الرابطة الأفقية لتوصيل الجسر الأوسط بالجسور الجانبية ---
const connectorGeometry = new THREE.BoxGeometry(0.15, 0.15, 2.8); // يمتد من Z=-1.4 إلى Z=1.4

const leftConnector = new THREE.Mesh(connectorGeometry, frameMaterial);
leftConnector.position.set(-width / 2, PIVOT_Y, 0); // عند الطرف الأيسر للهيكل
leftConnector.castShadow = true;
frame.add(leftConnector);

const rightConnector = leftConnector.clone();
rightConnector.position.x = width / 2; // عند الطرف الأيمن للهيكل
frame.add(rightConnector);


// --- Instantiating Pendulums ---
const pendulums = [];
const startX = -((BALL_COUNT - 1) * DIAMETER) / 2;

const ballGeometry = new THREE.SphereGeometry(
    BALL_RADIUS,
    64,
    64
);
for (let i = 0; i < BALL_COUNT; i++) {
    const pivotX = startX + i * DIAMETER;
    const group = new THREE.Group();
    group.position.set(pivotX, PIVOT_Y, 0);
    scene.add(group);

 const leftWire = new THREE.Mesh(wireGeometry, wireMaterial);
    const rightWire = new THREE.Mesh(wireGeometry, wireMaterial);
    
    leftWire.castShadow = true;
    rightWire.castShadow = true;

    // ضبط مكان وزاوية الخيط الأيسر الابتدائي
    leftWire.position.set(0, 0, zOffset);
    leftWire.rotation.x = initialWireAngle;
    leftWire.scale.y = initialActualLength;

    // ضبط مكان وزاوية الخيط الأيمن الابتدائي
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
        group, ball, leftWire, rightWire, pivotX,
        angle: 0,
        angularVelocity: 0,
        angularAcceleration: 0,
        worldPosition: new THREE.Vector3(pivotX, PIVOT_Y - 5.0, 0),
        individualLength: 5.0,
        individualMass: 1.0
    });
}

// --- Initialize Engine ---

// applyLaunchConfiguration(pendulums);
setupUI(pendulums);

// --- Animation Loop ---
const clock = new THREE.Clock();
let accumulator = 0;

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta() * 1.5; 
    accumulator += delta;

    while (accumulator >= FIXED_DT) {
        for (const p of pendulums) {
            updatePendulumPhysics(p);
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