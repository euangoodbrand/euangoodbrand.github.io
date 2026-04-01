/**
 * 3D Bubble Scene + Water Surface
 * Three.js powered hero section animation with interactive bubbles
 * Features: Device capability gating, lazy loading, water wave simulation
 */
(function() {
    var isMobileDev = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    var isLowEnd = isMobileDev && (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isLowEnd || prefersReduced) {
        var c = document.getElementById('bubble-canvas');
        if (c) c.style.display = 'none';
        var cl = document.getElementById('bubble-click-layer');
        if (cl) cl.style.display = 'none';
        if (!isLowEnd) {
            var vid = document.getElementById('background-video');
            if (vid) { vid.preload = 'metadata'; vid.autoplay = true; }
        }
        return;
    }

    function loadThreeAndInit() {
        var s1 = document.createElement('script');
        s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s1.onload = function() {
            var s2 = document.createElement('script');
            s2.src = 'https://cdn.jsdelivr.net/npm/three@0.128/examples/js/loaders/GLTFLoader.js';
            s2.onload = initBubbleScene;
            document.head.appendChild(s2);
        };
        document.head.appendChild(s1);

        if (!isMobileDev) {
            var vid = document.getElementById('background-video');
            if (vid) {
                vid.preload = 'auto';
                var p = vid.play();
                if (p && typeof p.catch === 'function') p.catch(function(){});
            }
        }
    }

    var heroObs = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
            heroObs.disconnect();
            loadThreeAndInit();
        }
    }, { rootMargin: '200px' });

    var home = document.getElementById('home');
    if (home) heroObs.observe(home);
    else loadThreeAndInit();

    function initBubbleScene() {
        var isMobileDev = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        const canvas = document.getElementById('bubble-canvas');
        const clickLayer = document.getElementById('bubble-click-layer');
        if (!canvas) return;

        const homeSection = document.getElementById('home');
        const backgroundVideo = document.getElementById('background-video');

        if (backgroundVideo && !isMobileDev) {
            if ('IntersectionObserver' in window && homeSection) {
                const videoObserver = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            var p = backgroundVideo.play();
                            if (p && typeof p.catch === 'function') p.catch(function() {});
                        } else {
                            backgroundVideo.pause();
                        }
                    });
                }, { threshold: 0.08 });
                videoObserver.observe(homeSection);
            }
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    backgroundVideo.pause();
                } else if (homeSection && window.scrollY < homeSection.offsetHeight) {
                    var p = backgroundVideo.play();
                    if (p && typeof p.catch === 'function') p.catch(function() {});
                }
            });
        }

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobileDev });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDev ? 1.5 : 2));
        renderer.setClearColor(0x000000, 0);
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.z = 30;

        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();
        const planeHit = new THREE.Vector3();
        const _vBubble = new THREE.Vector3();
        const _closestOnRay = new THREE.Vector3();

        function setPointerNdc(clientX, clientY) {
            const rect = canvas.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return false;
            pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            return true;
        }

        let lastCanvasCssW = -1;
        let lastCanvasCssH = -1;
        let lastPixelRatio = -1;
        let layoutResetHook = null;

        function syncCanvasFromLayout() {
            const rect = canvas.getBoundingClientRect();
            const w = Math.max(1, Math.round(rect.width));
            const h = Math.max(1, Math.round(rect.height));
            const pr = Math.min(window.devicePixelRatio || 1, 2);
            if (w === lastCanvasCssW && h === lastCanvasCssH && pr === lastPixelRatio) return;
            lastCanvasCssW = w;
            lastCanvasCssH = h;
            lastPixelRatio = pr;
            renderer.setPixelRatio(pr);
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            syncWaterPlaneToView();
            if (layoutResetHook) layoutResetHook();
        }

        function invalidateCanvasSize() {
            lastCanvasCssW = -1;
            lastCanvasCssH = -1;
            lastPixelRatio = -1;
        }

        scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const dirLight1 = new THREE.DirectionalLight(0x88ccff, 0.8);
        dirLight1.position.set(5, 10, 7);
        scene.add(dirLight1);
        const dirLight2 = new THREE.DirectionalLight(0xff88cc, 0.5);
        dirLight2.position.set(-5, -5, 5);
        scene.add(dirLight2);
        const pointLight = new THREE.PointLight(0x4dd0e1, 1.2, 50);
        pointLight.position.set(0, 0, 15);
        scene.add(pointLight);

        const WATER_SEG_X = isMobileDev ? 60 : 120;
        const WATER_SEG_Y = isMobileDev ? 40 : 80;
        const WATER_WIDTH = 60;
        const WATER_HEIGHT = 40;
        const WATER_Z = -8;

        const waterGeo = new THREE.PlaneGeometry(WATER_WIDTH, WATER_HEIGHT, WATER_SEG_X, WATER_SEG_Y);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x4dd0e1,
            metalness: 0.2,
            roughness: 0.08,
            transparent: true,
            opacity: 0.34,
            side: THREE.DoubleSide,
            flatShading: false,
            envMapIntensity: 1.0,
        });
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.z = WATER_Z;
        scene.add(waterMesh);

        function syncWaterPlaneToView() {
            const d = camera.position.z - WATER_Z;
            const tanHalf = Math.tan((camera.fov * Math.PI / 180) / 2);
            const halfV = d * tanHalf;
            const halfU = halfV * camera.aspect;
            const scaleX = (2 * halfU) / WATER_WIDTH;
            const scaleY = (2 * halfV) / WATER_HEIGHT;
            const s = Math.max(scaleX, scaleY) * 1.04;
            waterMesh.scale.set(s, s, 1);
        }

        const waterPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -WATER_Z);

        const cols = WATER_SEG_X + 1;
        const rows = WATER_SEG_Y + 1;
        const totalVerts = cols * rows;
        const hCurr = new Float32Array(totalVerts);
        const hPrev = new Float32Array(totalVerts);
        const hTemp = new Float32Array(totalVerts);

        const WAVE_SPEED = 0.32;
        const DAMPING = 0.988;
        const STEPS_PER_FRAME = 2;
        const MAX_WAVE_DISPLACEMENT = 1.82;
        const MAX_INJECT_AMPLITUDE = 0.54;
        const MAX_INJECT_RADIUS = 3.85;
        const MAX_INJECTS_PER_FRAME = 8;
        const MAX_MOUSE_WORLD_DELTA = 2.2;
        const MAX_MOUSE_SPEED_WAVE = 2.5;
        const MAX_DIST_ACCUM = 5.5;

        function clampWaveSample(v) {
            if (v > MAX_WAVE_DISPLACEMENT) return MAX_WAVE_DISPLACEMENT;
            if (v < -MAX_WAVE_DISPLACEMENT) return -MAX_WAVE_DISPLACEMENT;
            return v;
        }

        function clampWaveField(arr) {
            for (let i = 0; i < totalVerts; i++) {
                arr[i] = clampWaveSample(arr[i]);
            }
        }

        function waveStep() {
            const c2 = WAVE_SPEED * WAVE_SPEED;
            for (let step = 0; step < STEPS_PER_FRAME; step++) {
                for (let j = 1; j < rows - 1; j++) {
                    for (let i = 1; i < cols - 1; i++) {
                        const idx = j * cols + i;
                        const neighbors = hCurr[idx - 1] + hCurr[idx + 1] + hCurr[idx - cols] + hCurr[idx + cols];
                        hTemp[idx] = (2 * hCurr[idx] - hPrev[idx] + c2 * (neighbors - 4 * hCurr[idx])) * DAMPING;
                    }
                }
                hPrev.set(hCurr);
                hCurr.set(hTemp);
                clampWaveField(hCurr);
                clampWaveField(hPrev);
            }
        }

        function injectWave(worldX, worldY, radius, amplitude) {
            const effW = WATER_WIDTH * waterMesh.scale.x;
            const effH = WATER_HEIGHT * waterMesh.scale.y;
            const gx = (worldX / effW + 0.5) * WATER_SEG_X;
            const gy = (worldY / effH + 0.5) * WATER_SEG_Y;
            const r = Math.min(Math.max(radius, 0.4), MAX_INJECT_RADIUS);
            const amp = Math.max(-MAX_INJECT_AMPLITUDE, Math.min(MAX_INJECT_AMPLITUDE, amplitude));
            if (amp === 0) return;
            const minI = Math.max(1, Math.floor(gx - r));
            const maxI = Math.min(cols - 2, Math.ceil(gx + r));
            const minJ = Math.max(1, Math.floor(gy - r));
            const maxJ = Math.min(rows - 2, Math.ceil(gy + r));
            for (let j = minJ; j <= maxJ; j++) {
                for (let i = minI; i <= maxI; i++) {
                    const dx = i - gx;
                    const dy = j - gy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < r) {
                        const falloff = Math.cos((dist / r) * Math.PI * 0.5);
                        const idx = j * cols + i;
                        hCurr[idx] = clampWaveSample(hCurr[idx] + amp * falloff * falloff);
                    }
                }
            }
        }

        let waterNormalFrame = 0;
        const NORMAL_INTERVAL = isMobileDev ? 4 : 2;

        function applyHeightsToMesh() {
            const pos = waterGeo.attributes.position;
            for (let i = 0; i < totalVerts; i++) {
                pos.setZ(i, hCurr[i]);
            }
            pos.needsUpdate = true;
            waterNormalFrame++;
            if (waterNormalFrame >= NORMAL_INTERVAL) {
                waterNormalFrame = 0;
                waterGeo.computeVertexNormals();
            }
        }

        function createBubbleMaterial() {
            return new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.15,
                roughness: 0.05,
                transparent: true,
                opacity: 0.45 + Math.random() * 0.2,
                side: THREE.DoubleSide,
                envMapIntensity: 1.2,
            });
        }

        function getBubbleFieldBounds() {
            const planeZ = 0;
            const dist = Math.abs(camera.position.z - planeZ);
            const halfH = Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
            const halfW = halfH * camera.aspect;
            const pad = 0.86;
            const cx = camera.position.x;
            const cy = camera.position.y;
            return {
                minX: cx - halfW * pad,
                maxX: cx + halfW * pad,
                minY: cy - halfH * pad,
                maxY: cy + halfH * pad,
            };
        }

        const BUBBLE_COUNT = isMobileDev ? 8 : 20;
        const bubbles = [];
        const bubbleGeo = new THREE.SphereGeometry(1, isMobileDev ? 16 : 32, isMobileDev ? 16 : 32);

        onResize();
        for (let i = 0; i < BUBBLE_COUNT; i++) {
            const scale = 1 + Math.random() * 1;
            const mesh = new THREE.Mesh(bubbleGeo, createBubbleMaterial());
            mesh.scale.setScalar(scale);
            const bf0 = getBubbleFieldBounds();
            mesh.position.set(
                bf0.minX + Math.random() * (bf0.maxX - bf0.minX),
                bf0.minY + Math.random() * (bf0.maxY - bf0.minY),
                (Math.random() - 0.5) * 15
            );
            scene.add(mesh);
            bubbles.push({
                mesh,
                baseScale: scale,
                baseOpacity: mesh.material.opacity,
                vx: (Math.random() - 0.5) * 0.02,
                vy: 0.005 + Math.random() * 0.02,
                vz: (Math.random() - 0.5) * 0.01,
                wobbleSpeed: 0.5 + Math.random() * 1.5,
                wobbleAmp: 0.3 + Math.random() * 0.8,
                wobbleOffset: Math.random() * Math.PI * 2,
                pulseSpeed: 0.3 + Math.random() * 0.7,
                pulseAmp: 0.04 + Math.random() * 0.06,
                popping: false,
                popTime: 0,
                popDuration: 0.3,
            });
        }

        const mouse = { worldX: 0, worldY: 0, clientX: 0, clientY: 0 };
        let mouseActive = false;
        let prevWorldX = 0, prevWorldY = 0;
        let mouseVX = 0, mouseVY = 0, mouseSpeed = 0;

        function updateMouse(clientX, clientY) {
            const rect = canvas.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                mouse.clientX = clientX;
                mouse.clientY = clientY;
                mouseActive = true;
            } else {
                mouseActive = false;
            }
        }

        window.addEventListener('mousemove', function(e) {
            updateMouse(e.clientX, e.clientY);
        });
        window.addEventListener('touchmove', function(e) {
            const t = e.touches[0];
            updateMouse(t.clientX, t.clientY);
        }, { passive: true });

        const POP_POOL_SIZE = isMobileDev ? 18 : 56;
        const popPool = [];
        const popGeo = new THREE.SphereGeometry(0.1, 6, 6);
        for (let i = 0; i < POP_POOL_SIZE; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: 0x80e0d0, transparent: true, opacity: 0 });
            const mesh = new THREE.Mesh(popGeo, mat);
            mesh.visible = false;
            scene.add(mesh);
            popPool.push({ mesh, vx:0, vy:0, vz:0, life:0, age:0, active:false });
        }

        function spawnPopParticles(worldX, worldY, worldZ) {
            const count = isMobileDev ? (3 + Math.floor(Math.random() * 3)) : (8 + Math.floor(Math.random() * 6));
            let spawned = 0;
            for (let i = 0; i < POP_POOL_SIZE && spawned < count; i++) {
                const p = popPool[i];
                if (p.active) continue;
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.15 + Math.random() * 0.3;
                p.mesh.material.color.setHSL(0.5 + Math.random() * 0.2, 0.8, 0.7);
                p.mesh.material.opacity = 0.9;
                p.mesh.scale.setScalar(0.8 + Math.random() * 1.2);
                p.mesh.position.set(worldX, worldY, worldZ);
                p.mesh.visible = true;
                p.vx = Math.cos(angle) * speed * (0.5 + Math.random());
                p.vy = Math.sin(angle) * speed * (0.5 + Math.random());
                p.vz = (Math.random() - 0.5) * speed * 0.5;
                p.life = 0.4 + Math.random() * 0.3;
                p.age = 0;
                p.active = true;
                spawned++;
            }
        }

        function beginPopBubble(idx) {
            const b = bubbles[idx];
            if (b.popping || !b.mesh.visible) return;
            b.popping = true;
            b.popTime = 0;
            spawnPopParticles(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);
            injectWave(b.mesh.position.x, b.mesh.position.y, 4.5, 0.55);
        }

        function tryPopBubbleFromPointer(clientX, clientY) {
            if (!setPointerNdc(clientX, clientY)) return;
            raycaster.setFromCamera(pointerNdc, camera);
            const targets = [];
            for (let i = 0; i < bubbles.length; i++) {
                const b = bubbles[i];
                if (!b.popping && b.mesh.visible) targets.push(b.mesh);
            }
            if (targets.length === 0) return;
            const hits = raycaster.intersectObjects(targets, false);
            if (hits.length === 0) return;
            const mesh = hits[0].object;
            const idx = bubbles.findIndex(function(bub) { return bub.mesh === mesh; });
            if (idx !== -1) beginPopBubble(idx);
        }

        function respawnBubble(idx) {
            const b = bubbles[idx];
            const m = b.mesh;
            b.baseScale = 1 + Math.random() * 1;
            b.baseOpacity = 0.45 + Math.random() * 0.2;
            m.material.opacity = b.baseOpacity;
            m.scale.setScalar(b.baseScale);
            const bf = getBubbleFieldBounds();
            m.position.set(
                bf.minX + Math.random() * (bf.maxX - bf.minX),
                bf.minY - 2 - Math.random() * 5,
                (Math.random() - 0.5) * 15
            );
            m.visible = true;
            b.popping = false;
            b.popTime = 0;
        }

        function handleClick(clientX, clientY) {
            syncCanvasFromLayout();
            const sx = camera.position.x;
            const sy = camera.position.y;
            camera.position.x = 0;
            camera.position.y = 0;
            camera.position.z = 30;
            camera.updateMatrixWorld(true);
            tryPopBubbleFromPointer(clientX, clientY);
            camera.position.x = sx;
            camera.position.y = sy;
            camera.position.z = 30;
            camera.updateMatrixWorld(true);
        }

        clickLayer.addEventListener('click', function(e) {
            handleClick(e.clientX, e.clientY);
        });
        clickLayer.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                handleClick(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        let scrollOpacity = 1;
        window.addEventListener('scroll', function() {
            const rect = homeSection.getBoundingClientRect();
            const sectionH = rect.height;
            const scrolled = -rect.top;
            if (scrolled <= sectionH * 0.2) {
                scrollOpacity = 1;
            } else if (scrolled >= sectionH * 0.7) {
                scrollOpacity = 0;
            } else {
                scrollOpacity = 1 - (scrolled - sectionH * 0.2) / (sectionH * 0.5);
            }
            canvas.style.opacity = scrollOpacity;
        });

        function onResize() {
            invalidateCanvasSize();
            syncCanvasFromLayout();
        }
        window.addEventListener('resize', onResize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onResize);
        }
        onResize();
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(onResize);
            ro.observe(homeSection);
            ro.observe(canvas);
        }

        const clock = new THREE.Clock();
        let animationId;
        let lastTime = performance.now();
        let distAccum = 0;
        let mouseRearmed = true;

        layoutResetHook = function() {
            hCurr.fill(0);
            hPrev.fill(0);
            hTemp.fill(0);
            mouseRearmed = true;
            mouseVX = 0;
            mouseVY = 0;
            mouseSpeed = 0;
            distAccum = 0;
            waterNormalFrame = 0;
            const pos = waterGeo.attributes.position;
            for (let i = 0; i < totalVerts; i++) {
                pos.setZ(i, 0);
            }
            pos.needsUpdate = true;
            waterGeo.computeVertexNormals();
        };

        var mobileFrameSkip = isMobileDev ? 1 : 0;
        var frameCount = 0;

        function animate() {
            animationId = requestAnimationFrame(animate);

            if (mobileFrameSkip) {
                frameCount++;
                if (frameCount % 2 !== 0) return;
            }

            const now = performance.now();
            const dt = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;

            if (scrollOpacity <= 0) return;

            syncCanvasFromLayout();

            const t = clock.getElapsedTime();
            const swayX = Math.sin(t * 0.15) * 0.5;
            const swayY = Math.cos(t * 0.1) * 0.3;

            camera.position.x = 0;
            camera.position.y = 0;
            camera.position.z = 30;
            camera.updateMatrixWorld(true);

            let viewRayReady = false;
            if (mouseActive && setPointerNdc(mouse.clientX, mouse.clientY)) {
                raycaster.setFromCamera(pointerNdc, camera);
                viewRayReady = true;
                const dWater = raycaster.ray.distanceToPlane(waterPlane);
                if (dWater !== null && dWater > 0) {
                    raycaster.ray.at(dWater, planeHit);
                    mouse.worldX = planeHit.x;
                    mouse.worldY = -planeHit.y;
                    if (mouseRearmed) {
                        prevWorldX = mouse.worldX;
                        prevWorldY = mouse.worldY;
                        distAccum = 0;
                        mouseRearmed = false;
                    }
                    let dvx = mouse.worldX - prevWorldX;
                    let dvy = mouse.worldY - prevWorldY;
                    if (dvx > MAX_MOUSE_WORLD_DELTA) dvx = MAX_MOUSE_WORLD_DELTA;
                    if (dvx < -MAX_MOUSE_WORLD_DELTA) dvx = -MAX_MOUSE_WORLD_DELTA;
                    if (dvy > MAX_MOUSE_WORLD_DELTA) dvy = MAX_MOUSE_WORLD_DELTA;
                    if (dvy < -MAX_MOUSE_WORLD_DELTA) dvy = -MAX_MOUSE_WORLD_DELTA;
                    mouseVX += (dvx - mouseVX) * 0.35;
                    mouseVY += (dvy - mouseVY) * 0.35;
                    mouseSpeed = Math.sqrt(mouseVX * mouseVX + mouseVY * mouseVY);
                    if (mouseSpeed > MAX_MOUSE_SPEED_WAVE) {
                        const s = MAX_MOUSE_SPEED_WAVE / mouseSpeed;
                        mouseVX *= s;
                        mouseVY *= s;
                        mouseSpeed = MAX_MOUSE_SPEED_WAVE;
                    }

                    if (mouseSpeed > 0.05) {
                        distAccum += mouseSpeed;
                        if (distAccum > MAX_DIST_ACCUM) distAccum = MAX_DIST_ACCUM;
                        const spacing = Math.max(0.22, 0.92 - mouseSpeed * 0.32);
                        let injects = 0;
                        while (distAccum > spacing && injects < MAX_INJECTS_PER_FRAME) {
                            distAccum -= spacing;
                            const frac = distAccum / (mouseSpeed + 0.01);
                            const ix = mouse.worldX - mouseVX * frac * 0.5;
                            const iy = mouse.worldY - mouseVY * frac * 0.5;
                            const amp = Math.min(mouseSpeed * 0.44, MAX_INJECT_AMPLITUDE);
                            const rad = 2.35 + Math.min(mouseSpeed * 0.62, MAX_INJECT_RADIUS - 0.45);
                            injectWave(ix, iy, rad, amp);
                            injects++;
                        }
                    } else {
                        distAccum = 0;
                    }
                    prevWorldX = mouse.worldX;
                    prevWorldY = mouse.worldY;
                }
            }
            if (!mouseActive) {
                mouseRearmed = true;
                mouseVX *= 0.9;
                mouseVY *= 0.9;
                mouseSpeed *= 0.9;
            }

            camera.position.x = swayX;
            camera.position.y = swayY;
            camera.position.z = 30;
            camera.updateMatrixWorld(true);

            waveStep();
            applyHeightsToMesh();

            for (let i = 0; i < POP_POOL_SIZE; i++) {
                const p = popPool[i];
                if (!p.active) continue;
                p.age += dt;
                if (p.age >= p.life) {
                    p.mesh.visible = false;
                    p.active = false;
                    continue;
                }
                p.mesh.position.x += p.vx * dt * 4;
                p.mesh.position.y += p.vy * dt * 4;
                p.mesh.position.z += p.vz * dt * 4;
                p.mesh.material.opacity = 0.9 * (1 - p.age / p.life);
                p.mesh.scale.setScalar((0.8 + Math.random() * 0.4) * (1 - (p.age / p.life) * 0.6));
            }

            const bubbleBounds = getBubbleFieldBounds();
            for (let i = 0; i < bubbles.length; i++) {
                const b = bubbles[i];
                const m = b.mesh;

                if (b.popping) {
                    b.popTime += dt;
                    const progress = Math.min(b.popTime / b.popDuration, 1);
                    m.scale.setScalar(b.baseScale * (1 + progress * 0.8));
                    m.material.opacity = b.baseOpacity * (1 - progress);
                    if (progress >= 1) {
                        m.visible = false;
                        (function(idx) {
                            setTimeout(function() { respawnBubble(idx); }, 1000 + Math.random() * 1500);
                        })(i);
                        b.popTime = b.popDuration;
                    }
                    continue;
                }

                m.position.x += b.vx + Math.sin(t * b.wobbleSpeed + b.wobbleOffset) * 0.008;
                m.position.y += b.vy;
                m.position.z += b.vz;
                m.position.x += Math.sin(t * b.wobbleSpeed + b.wobbleOffset) * b.wobbleAmp * 0.01;

                const pulse = 1 + Math.sin(t * b.pulseSpeed * 2 + i) * b.pulseAmp;
                m.scale.setScalar(b.baseScale * pulse);

                if (m.position.y > bubbleBounds.maxY) {
                    m.position.y = bubbleBounds.minY - 1 - Math.random() * 3;
                    m.position.x = bubbleBounds.minX + Math.random() * (bubbleBounds.maxX - bubbleBounds.minX);
                }
                if (m.position.x > bubbleBounds.maxX) m.position.x = bubbleBounds.minX;
                if (m.position.x < bubbleBounds.minX) m.position.x = bubbleBounds.maxX;

                if (viewRayReady) {
                    const ray = raycaster.ray;
                    _vBubble.subVectors(m.position, ray.origin);
                    const tRay = Math.max(0, _vBubble.dot(ray.direction));
                    _closestOnRay.copy(ray.origin).addScaledVector(ray.direction, tRay);
                    _vBubble.subVectors(m.position, _closestOnRay);
                    const dist = _vBubble.length();
                    const repulseRadius = 6;
                    if (dist < repulseRadius && dist > 0.08) {
                        const force = (1 - dist / repulseRadius) * 0.12;
                        m.position.x += (_vBubble.x / dist) * force;
                        m.position.y += (_vBubble.y / dist) * force;
                        m.position.z += (_vBubble.z / dist) * force;
                    }
                }

                m.rotation.x += 0.002;
                m.rotation.y += 0.003;
            }

            renderer.render(scene, camera);
        }

        animate();

        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                cancelAnimationFrame(animationId);
            } else {
                lastTime = performance.now();
                distAccum = 0;
                mouseRearmed = true;
                mouseVX = 0;
                mouseVY = 0;
                mouseSpeed = 0;
                animate();
            }
        });
    }
})();
