import * as THREE from 'three'; 
import { settings, pendingBallsSettings, applyLaunchConfiguration, resetPhysicsSimulation } from './physics.js'; 

export function setupUI(pendulums) { 
    const visualMaterials = { 
        0.98: new THREE.MeshPhysicalMaterial({ color: 0xd9d9d9, metalness: 1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5 }), 
        0.92: new THREE.MeshStandardMaterial({ color: 0xe0f7fa, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.6 }), 
        0.80: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.0, roughness: 0.9 }), 
        0.50: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, metalness: 0.0, roughness: 0.7 }), 
        'custom': new THREE.MeshStandardMaterial({ color: 0x3498db, metalness: 0.4, roughness: 0.4 }) 
    }; 

    const gravityInput = document.getElementById('gravityInput'); 
    const gravityValue = document.getElementById('gravityValue'); 
    const planetSelect = document.getElementById('planet-select'); 
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
    const launchBtn = document.getElementById('launchBtn'); 
    const launchAngleZInput = document.getElementById('launchAngleZInput'); 
    const launchAngleZValue = document.getElementById('launchAngleZValue'); 
    const materialSelect = document.getElementById('materialSelect'); 
    const customRestitutionGroup = document.getElementById('customRestitutionGroup'); 

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

    function updateSlidersFromSelection() { 
        const selectedIdx = parseInt(ballSelect.value); 
        const currentBallSettings = pendingBallsSettings[selectedIdx]; 
        lengthInput.value = currentBallSettings.stringLength; 
        lengthValue.textContent = currentBallSettings.stringLength.toFixed(1); 
        massInput.value = currentBallSettings.mass; 
        massValue.textContent = currentBallSettings.mass.toFixed(1); 
        wireSelect.value = currentBallSettings.wireCount; 

        const ballRestitution = currentBallSettings.restitution ?? 0.98; 
        const formattedRestitution = ballRestitution.toFixed(2); 

        if (formattedRestitution === "0.98" || formattedRestitution === "0.92" || formattedRestitution === "0.80" || formattedRestitution === "0.50") { 
            materialSelect.value = formattedRestitution; 
            customRestitutionGroup.style.display = 'none'; 
        } else { 
            materialSelect.value = 'custom'; 
            customRestitutionGroup.style.display = 'block'; 
            restitutionInput.value = ballRestitution; 
            restitutionValue.textContent = ballRestitution.toFixed(3); 
        } 
    } 

    function saveRestitutionToSettings(val) { 
        if (controlMode === 'all') { 
            pendingBallsSettings.forEach(b => b.restitution = val); 
        } else { 
            const selectedIdx = parseInt(ballSelect.value); 
            pendingBallsSettings[selectedIdx].restitution = val; 
        } 
    } 

    const planetPresets = { 
        earth: { gravity: 9.81, damping: 0.0006 }, 
        moon: { gravity: 1.62, damping: 0.0000 }, 
        mars: { gravity: 3.71, damping: 0.0001 }, 
        jupiter: { gravity: 24.79, damping: 0.0150 }, 
        mercury: { gravity: 3.70, damping: 0.0000 }, 
        venus: { gravity: 8.87, damping: 0.0450 }, 
        saturn: { gravity: 10.44, damping: 0.0100 }, 
        uranus: { gravity: 8.69, damping: 0.0070 }, 
        neptune: { gravity: 11.15, damping: 0.0080 } 
    }; 

    function checkPresetMatch() { 
        const currentG = parseFloat(gravityInput.value); 
        const currentD = parseFloat(dampingInput.value); 
        const matchingPlanet = Object.keys(planetPresets).find(key => { 
            const preset = planetPresets[key]; 
            return Math.abs(preset.gravity - currentG) < 0.01 && Math.abs(preset.damping - currentD) < 0.0001; 
        }); 
        if (planetSelect) { 
            planetSelect.value = matchingPlanet || 'custom'; 
        } 
    } 

    gravityInput.addEventListener('input', () => { 
        gravityValue.textContent = parseFloat(gravityInput.value).toFixed(2); 
        checkPresetMatch(); 
    }); 

    if (planetSelect) { 
        planetSelect.addEventListener('change', () => { 
            const planet = planetSelect.value; 
            if (planet !== 'custom' && planetPresets[planet]) { 
                const preset = planetPresets[planet]; 
                gravityInput.value = preset.gravity; 
                gravityValue.textContent = preset.gravity.toFixed(2); 
                dampingInput.value = preset.damping; 
                dampingValue.textContent = preset.damping.toFixed(4); 
            } 
        }); 
    } 

    restitutionInput.addEventListener('input', () => { 
        const val = parseFloat(restitutionInput.value); 
        restitutionValue.textContent = val.toFixed(3); 
        saveRestitutionToSettings(val); 
    }); 

    materialSelect.addEventListener('change', (e) => { 
        if (e.target.value === 'custom') { 
            customRestitutionGroup.style.display = 'block'; 
            const val = parseFloat(restitutionInput.value); 
            saveRestitutionToSettings(val); 
        } else { 
            customRestitutionGroup.style.display = 'none'; 
            const val = parseFloat(e.target.value); 
            restitutionInput.value = val; 
            restitutionValue.textContent = val.toFixed(2); 
            saveRestitutionToSettings(val); 
        } 
    }); 

    dampingInput.addEventListener('input', () => { 
        dampingValue.textContent = parseFloat(dampingInput.value).toFixed(4); 
        checkPresetMatch(); 
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
        singleSideBtn.classList.add('active'); 
        doubleSideBtn.classList.remove('active'); 
    }); 

    doubleSideBtn.addEventListener('click', () => { 
        doubleSideBtn.classList.add('active'); 
        singleSideBtn.classList.remove('active'); 
    }); 

    soundToggle.addEventListener('change', () => { 
        settings.sound = soundToggle.checked; 
    }); 

    if (launchAngleZInput) { 
        launchAngleZInput.addEventListener('input', (event) => { 
            const degrees = parseFloat(event.target.value); 
            if (launchAngleZValue) { 
                launchAngleZValue.textContent = degrees.toFixed(0) + '°'; 
            } 
            if (typeof settings !== 'undefined') { 
                settings.launchAngleZ = THREE.MathUtils.degToRad(degrees); 
            } 
        }); 
    } 

    applyBtn.addEventListener('click', () => { 
        settings.gravity = parseFloat(gravityInput.value); 
        settings.airDamping = 1.0 - parseFloat(dampingInput.value); 
        settings.restitution = parseFloat(restitutionInput.value); 
        settings.launchCount = parseInt(launchCountInput.value); 
        settings.launchAngle = THREE.MathUtils.degToRad(parseFloat(launchAngleInput.value)); 
        settings.launchMode = singleSideBtn.classList.contains('active') ? 'single' : 'double'; 
        settings.sound = soundToggle.checked; 

        pendulums.forEach((p, index) => { 
            const ballSettings = pendingBallsSettings[index]; 
            p.individualLength = ballSettings.stringLength; 
            p.individualMass = ballSettings.mass; 
            p.individualRestitution = ballSettings.restitution ?? 0.98; 
            
            // 🌟 [السطر الحاسم الأول]: مزامنة قيمة wireCount مع كائن البندول الفيزيائي الفعلي 🌟
            p.wireCount = ballSettings.wireCount; 

            p.ball.position.y = -ballSettings.stringLength; 

            const currentRest = ballSettings.restitution; 
            if (visualMaterials[currentRest]) { 
                p.ball.material = visualMaterials[currentRest]; 
            } else { 
                p.ball.material = visualMaterials['custom']; 
            } 

            // 🌟 [السطر الحاسم الثاني]: ضبط الرؤية والمظهر الأولي قبل الانطلاق مباشرة 🌟
            const wireCount = ballSettings.wireCount; 
            if (wireCount === 1) { 
                p.leftWire.position.set(0, 0, 0); 
                p.leftWire.rotation.x = 0; 
                p.leftWire.scale.y = ballSettings.stringLength; 
                p.leftWire.visible = true;
                p.rightWire.visible = false; // إخفاء تماماً
            } else { 
                const actualWireLength = Math.sqrt(ballSettings.stringLength * ballSettings.stringLength + 1.4 * 1.4); 
                const angle = Math.atan2(1.4, ballSettings.stringLength); 
                p.leftWire.position.set(0, 0, 1.4); 
                p.leftWire.rotation.x = angle; 
                p.leftWire.scale.y = actualWireLength; 
                p.leftWire.visible = true;

                p.rightWire.position.set(0, 0, -1.4); 
                p.rightWire.rotation.x = -angle; 
                p.rightWire.scale.y = actualWireLength; 
                p.rightWire.visible = true; 
            } 
        }); 

        applyLaunchConfiguration(pendulums); 
    }); 

    resetBtn.addEventListener('click', () => { 
        document.getElementById('launchCountInput').value = 1; 
        document.getElementById('launchCountValue').textContent = '1'; 
        document.getElementById('launchAngleInput').value = 45; 
        document.getElementById('launchAngleValue').textContent = '45'; 

        const launchAngleZInput = document.getElementById('launchAngleZInput'); 
        const launchAngleZValue = document.getElementById('launchAngleZValue'); 
        const enableZDragCheckbox = document.getElementById('enableZDrag'); 
        if (launchAngleZInput) launchAngleZInput.value = 0; 
        if (launchAngleZValue) launchAngleZValue.textContent = '0°'; 
        if (enableZDragCheckbox) enableZDragCheckbox.checked = false; 

        document.getElementById('singleSideBtn').classList.add('active'); 
        document.getElementById('doubleSideBtn').classList.remove('active'); 

        document.getElementById('planet-select').value = 'earth'; 
        document.getElementById('gravityInput').value = 9.81; 
        document.getElementById('gravityValue').textContent = '9.81'; 
        document.getElementById('dampingInput').value = 0.0006; 
        document.getElementById('dampingValue').textContent = '0.0006'; 

        materialSelect.value = "0.98"; 
        customRestitutionGroup.style.display = 'none'; 
        restitutionInput.value = 0.98; 
        restitutionValue.textContent = '0.980'; 

        pendingBallsSettings.forEach(b => { 
            b.stringLength = 5.0; 
            b.mass = 1.0; 
            b.wireCount = 2; 
            b.restitution = 0.98; 
        }); 

        document.getElementById('allBallsModeBtn').classList.add('active'); 
        document.getElementById('singleBallModeBtn').classList.remove('active'); 
        controlMode = 'all'; 
        if (ballSelectGroup) { 
            ballSelectGroup.style.opacity = '0.5'; 
            ballSelectGroup.style.pointerEvents = 'none'; 
        } 
        document.getElementById('ballSelect').value = '0'; 
        document.getElementById('lengthInput').value = 5; 
        document.getElementById('lengthValue').textContent = '5.0'; 
        document.getElementById('massInput').value = 1; 
        document.getElementById('massValue').textContent = '1.0'; 
        document.getElementById('wireSelect').value = '2'; 
        document.getElementById('soundToggle').checked = true; 

        if (typeof settings !== 'undefined') { 
            settings.gravity = 9.81; 
            settings.airDamping = 0.9994; 
            settings.restitution = 0.98; 
            settings.launchCount = 1; 
            settings.launchAngle = THREE.MathUtils.degToRad(45); 
            settings.launchAngleZ = 0; 
            settings.launchMode = 'single'; 
            settings.sound = true; 
        } 

        pendulums.forEach(p => { 
            p.ball.material = visualMaterials[0.98];
            p.wireCount = 2; // إعادة الخاصية الفيزيائية لوضع خيطين الافتراضي عند التصفير
        }); 

        if (typeof resetPhysicsSimulation === 'function') { 
            resetPhysicsSimulation(pendulums); 
        } 
    }); 

    launchBtn.addEventListener('click', () => { 
        settings.launchCount = parseInt(launchCountInput.value); 
        settings.launchAngle = THREE.MathUtils.degToRad(parseFloat(launchAngleInput.value)); 
        settings.launchMode = singleSideBtn.classList.contains('active') ? 'single' : 'double'; 
        applyLaunchConfiguration(pendulums); 
    }); 
}