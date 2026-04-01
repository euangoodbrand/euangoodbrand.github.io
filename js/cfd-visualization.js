/**
 * CFD Aerofoil Visualization
 * Three.js powered computational fluid dynamics simulation
 * Features: Multiple shapes (aerofoil, F1 car, cat), flow field, control panel
 */
(function() {
    const wrap = document.querySelector('.f1-ml-wrap');
    const canvas = document.getElementById('f1-telemetry-canvas');
    if (!wrap || !canvas) return;

    function initCFD() {
        if (typeof THREE === 'undefined') return;

        function checkMobile() { return window.innerWidth <= 768; }
        var isMobile = checkMobile();

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isMobile });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
        camera.position.set(0, 0.8, 9);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0x607080, 0.6));
        var dirLight = new THREE.DirectionalLight(0x88ccbb, 0.5);
        dirLight.position.set(2, 4, 5);
        scene.add(dirLight);

        var sceneRoot = new THREE.Group();
        if (isMobile) {
            sceneRoot.rotation.z = -Math.PI / 2;
        }
        scene.add(sceneRoot);

        const grid = new THREE.GridHelper(40, 32, 0x00b8a8, 0x1a2228);
        if (grid.material) {
            var gMats = Array.isArray(grid.material) ? grid.material : [grid.material];
            gMats.forEach(function(m) { m.transparent = true; m.opacity = 0.28; });
        }
        grid.position.y = -3.5;
        sceneRoot.add(grid);

        var cfg = {
            angle: 0,
            pCount: isMobile ? 1000 : 5000,
            speed: 0.06,
            opacity: 0.55,
            chord: isMobile ? 2 : 8,
            thick: 0.12,
            shape: 'aerofoil',
        };
        var foilPos = { x: 0, y: 0 };

        function nacaY(xc) {
            return 5 * cfg.thick * (0.2969 * Math.sqrt(xc) - 0.1260 * xc - 0.3516 * xc * xc + 0.2843 * xc * xc * xc - 0.1015 * xc * xc * xc * xc);
        }

        function nacaDY(xc) {
            if (xc < 0.003) xc = 0.003;
            return 5 * cfg.thick * (0.14845 / Math.sqrt(xc) - 0.1260 - 0.7032 * xc + 0.8529 * xc * xc - 0.4060 * xc * xc * xc);
        }

        function shapeFromPoly(pts) {
            var s = new THREE.Shape();
            s.moveTo(pts[0].x, pts[0].y);
            for (var i = 1; i < pts.length; i++) s.lineTo(pts[i].x, pts[i].y);
            s.closePath();
            return s;
        }

        function catProfile(chord) {
            var c = chord;
            var raw = [
                {x: -0.50, y: 0.00}, {x: -0.48, y: 0.03}, {x: -0.44, y: 0.06}, {x: -0.40, y: 0.10},
                {x: -0.37, y: 0.15}, {x: -0.35, y: 0.22}, {x: -0.33, y: 0.30}, {x: -0.30, y: 0.28},
                {x: -0.27, y: 0.20}, {x: -0.23, y: 0.18}, {x: -0.21, y: 0.28}, {x: -0.18, y: 0.31},
                {x: -0.16, y: 0.26}, {x: -0.15, y: 0.18}, {x: -0.10, y: 0.14}, {x: -0.04, y: 0.16},
                {x: 0.04, y: 0.18}, {x: 0.12, y: 0.20}, {x: 0.20, y: 0.19}, {x: 0.28, y: 0.16},
                {x: 0.34, y: 0.12}, {x: 0.38, y: 0.14}, {x: 0.42, y: 0.20}, {x: 0.46, y: 0.26},
                {x: 0.50, y: 0.28}, {x: 0.50, y: 0.24}, {x: 0.47, y: 0.18}, {x: 0.44, y: 0.12},
                {x: 0.40, y: 0.08}, {x: 0.38, y: -0.02}, {x: 0.40, y: -0.12}, {x: 0.41, y: -0.18},
                {x: 0.38, y: -0.20}, {x: 0.35, y: -0.18}, {x: 0.34, y: -0.10}, {x: 0.32, y: -0.04},
                {x: 0.24, y: -0.06}, {x: 0.14, y: -0.08}, {x: 0.04, y: -0.07}, {x: -0.06, y: -0.06},
                {x: -0.12, y: -0.06}, {x: -0.14, y: -0.14}, {x: -0.15, y: -0.18}, {x: -0.18, y: -0.20},
                {x: -0.21, y: -0.18}, {x: -0.20, y: -0.10}, {x: -0.19, y: -0.04}, {x: -0.24, y: -0.02},
                {x: -0.32, y: -0.04}, {x: -0.40, y: -0.04}, {x: -0.46, y: -0.03},
            ];
            var pts = raw.map(function(p) { return { x: p.x * c, y: p.y * c }; });
            return shapeFromPoly(pts);
        }

        function currentShape() {
            if (cfg.shape === 'cat') return catProfile(cfg.chord);
            var shape = new THREE.Shape();
            var steps = 48;
            for (var i = 0; i <= steps; i++) {
                var xc = i / steps, yt = nacaY(xc) * cfg.chord, xp = xc * cfg.chord - cfg.chord * 0.5;
                if (i === 0) shape.moveTo(xp, yt); else shape.lineTo(xp, yt);
            }
            for (var i = steps; i >= 0; i--) {
                var xc = i / steps, yt = nacaY(xc) * cfg.chord, xp = xc * cfg.chord - cfg.chord * 0.5;
                shape.lineTo(xp, -yt);
            }
            return shape;
        }

        var foilMat = new THREE.MeshPhongMaterial({
            color: 0x16222a, transparent: true, opacity: 0.82,
            shininess: 100, specular: 0x44bbaa, side: THREE.DoubleSide,
        });
        var foilWireMat = new THREE.LineBasicMaterial({ color: 0x00c4b0, transparent: true, opacity: 0.5 });
        var foilMesh = null, foilWire = null;

        var f1Group = null;
        var f1Loaded = false;
        var f1Loading = false;
        var F1_MODEL_URL = 'https://raw.githubusercontent.com/markste-in/c42/main/c42.glb';

        var bodyPoly = [];
        var bodyNormals = [];

        function computeNormals() {
            bodyNormals = [];
            for (var i = 0; i < bodyPoly.length; i++) {
                var a = bodyPoly[i], b = bodyPoly[(i + 1) % bodyPoly.length];
                var ex = b.x - a.x, ey = b.y - a.y;
                var len = Math.sqrt(ex * ex + ey * ey) || 1;
                bodyNormals.push({ x: ey / len, y: -ex / len });
            }
        }

        function convexHull2D(points) {
            var pts = points.slice().sort(function(a, b) { return a.x - b.x || a.y - b.y; });
            if (pts.length <= 1) return pts;
            function cross(O, A, B) { return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x); }
            var lower = [];
            for (var i = 0; i < pts.length; i++) {
                while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], pts[i]) <= 0) lower.pop();
                lower.push(pts[i]);
            }
            var upper = [];
            for (var i = pts.length - 1; i >= 0; i--) {
                while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], pts[i]) <= 0) upper.pop();
                upper.push(pts[i]);
            }
            upper.pop(); lower.pop();
            return lower.concat(upper);
        }

        function extractSilhouette(group, targetChord) {
            var pts2d = [];
            group.traverse(function(child) {
                if (child.isMesh && child.geometry) {
                    var pos = child.geometry.attributes.position;
                    if (!pos) return;
                    child.updateMatrixWorld(true);
                    var v = new THREE.Vector3();
                    var step = Math.max(1, Math.floor(pos.count / 600));
                    for (var i = 0; i < pos.count; i += step) {
                        v.fromBufferAttribute(pos, i);
                        child.localToWorld(v);
                        pts2d.push({ x: v.x, y: v.y });
                    }
                }
            });
            if (pts2d.length < 3) return [];
            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            pts2d.forEach(function(p) {
                if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
            });
            var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
            var w = maxX - minX || 1;
            var scale = targetChord / w;
            var normalised = pts2d.map(function(p) {
                return { x: (p.x - cx) * scale, y: (p.y - cy) * scale };
            });
            return convexHull2D(normalised);
        }

        function loadF1Model(cb) {
            if (f1Loaded && f1Group) { cb(); return; }
            if (f1Loading) return;
            f1Loading = true;
            var loader = new THREE.GLTFLoader();
            loader.load(F1_MODEL_URL, function(gltf) {
                f1Group = gltf.scene;
                f1Group.rotation.y = Math.PI / 2;
                f1Group.traverse(function(child) {
                    if (child.isMesh) {
                        child.material = new THREE.MeshPhongMaterial({
                            color: 0x16222a, transparent: true, opacity: 0.82,
                            shininess: 100, specular: 0x44bbaa, side: THREE.DoubleSide,
                        });
                    }
                });
                f1Loaded = true;
                f1Loading = false;
                cb();
            }, undefined, function(err) {
                console.warn('F1 GLB load failed:', err);
                f1Loading = false;
            });
        }

        function clearBody() {
            if (foilMesh) { sceneRoot.remove(foilMesh); foilMesh.geometry.dispose(); foilMesh = null; }
            if (foilWire) { sceneRoot.remove(foilWire); foilWire.geometry.dispose(); foilWire = null; }
            if (f1Group && f1Group.parent) { sceneRoot.remove(f1Group); }
        }

        function buildFoil() {
            clearBody();

            if (cfg.shape === 'f1car') {
                loadF1Model(function() {
                    clearBody();
                    f1Group.scale.setScalar(1);
                    f1Group.position.set(0, 0, 0);
                    f1Group.updateMatrixWorld(true);
                    var box = new THREE.Box3().setFromObject(f1Group);
                    var size = new THREE.Vector3(); box.getSize(size);
                    var maxDim = Math.max(size.x, size.y, size.z) || 1;
                    var s = cfg.chord / maxDim;
                    f1Group.scale.setScalar(s);
                    f1Group.updateMatrixWorld(true);
                    box.setFromObject(f1Group);
                    var center = new THREE.Vector3(); box.getCenter(center);
                    f1Group.position.set(
                        foilPos.x - center.x,
                        foilPos.y - center.y,
                        -center.z
                    );
                    f1Group.rotation.z = cfg.angle;
                    sceneRoot.add(f1Group);
                    bodyPoly = extractSilhouette(f1Group, cfg.chord);
                    computeNormals();
                });
                if (!f1Loaded) {
                    var hw = cfg.chord * 0.5, hh = cfg.chord * 0.15;
                    bodyPoly = [
                        {x:-hw,y:-hh},{x:hw,y:-hh},{x:hw,y:hh},{x:-hw,y:hh}
                    ];
                    computeNormals();
                }
                return;
            }

            var shape = currentShape();
            var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
            foilMesh = new THREE.Mesh(geo, foilMat);
            foilMesh.rotation.z = cfg.angle;
            foilMesh.position.set(foilPos.x, foilPos.y, -0.3);
            sceneRoot.add(foilMesh);
            var eg = new THREE.EdgesGeometry(geo, 12);
            foilWire = new THREE.LineSegments(eg, foilWireMat);
            foilWire.rotation.copy(foilMesh.rotation);
            foilWire.position.copy(foilMesh.position);
            sceneRoot.add(foilWire);

            var shPts = shape.getPoints(64);
            bodyPoly = shPts.map(function(p) { return { x: p.x, y: p.y }; });
            computeNormals();
        }
        buildFoil();

        var xMin = -14, xMax = 14, yMin = -5, yMax = 5;
        var posArr, colArr, alpArr, baseSpeed, pGeo, pMat, pPoints;
        var MAX_P = 10000;

        function spawnY() {
            var r = Math.random();
            r = r * r;
            return (Math.random() < 0.5 ? r : -r) * (yMax - yMin) * 0.5;
        }

        function buildParticles() {
            if (pPoints) { sceneRoot.remove(pPoints); pGeo.dispose(); }
            var n = cfg.pCount;
            posArr = new Float32Array(n * 3);
            colArr = new Float32Array(n * 3);
            alpArr = new Float32Array(n);
            baseSpeed = new Float32Array(n);
            for (var i = 0; i < n; i++) {
                posArr[i*3]   = xMin + Math.random() * (xMax - xMin);
                posArr[i*3+1] = spawnY();
                posArr[i*3+2] = (Math.random() - 0.5) * 0.8;
                colArr[i*3] = 1; colArr[i*3+1] = 1; colArr[i*3+2] = 1;
                baseSpeed[i] = 0.7 + Math.random() * 0.6;
            }
            pGeo = new THREE.BufferGeometry();
            pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
            pGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
            pMat = new THREE.PointsMaterial({
                size: 0.07, transparent: true, opacity: cfg.opacity,
                vertexColors: true, blending: THREE.AdditiveBlending,
                depthWrite: false, sizeAttenuation: true,
            });
            pPoints = new THREE.Points(pGeo, pMat);
            sceneRoot.add(pPoints);
        }
        buildParticles();

        function flowAt(px, py, U) {
            var _ca = Math.cos(cfg.angle), _sa = Math.sin(cfg.angle);
            var dx = px - foilPos.x, dy = py - foilPos.y;
            var lx = dx * _ca + dy * _sa;
            var ly = -dx * _sa + dy * _ca;

            var halfC = cfg.chord * 0.5 + 0.6;
            if (Math.abs(lx) > halfC || Math.abs(ly) > halfC) return null;

            var minDist = 1e9, closestNx = 0, closestNy = 0;
            var inside = false;
            var nPts = bodyPoly.length;
            if (nPts < 3) return null;
            for (var i = 0, j = nPts - 1; i < nPts; j = i++) {
                var ai = bodyPoly[i], aj = bodyPoly[j];
                if (((ai.y > ly) !== (aj.y > ly)) &&
                    (lx < (aj.x - ai.x) * (ly - ai.y) / (aj.y - ai.y) + ai.x)) {
                    inside = !inside;
                }
                var ex = aj.x - ai.x, ey = aj.y - ai.y;
                var segLen2 = ex * ex + ey * ey;
                var t = segLen2 > 0 ? Math.max(0, Math.min(1, ((lx - ai.x) * ex + (ly - ai.y) * ey) / segLen2)) : 0;
                var cx = ai.x + t * ex, cy = ai.y + t * ey;
                var d2 = (lx - cx) * (lx - cx) + (ly - cy) * (ly - cy);
                if (d2 < minDist) {
                    minDist = d2;
                    var toX = lx - cx, toY = ly - cy;
                    var toLen = Math.sqrt(toX * toX + toY * toY) || 1;
                    closestNx = toX / toLen;
                    closestNy = toY / toLen;
                }
            }
            var dist = Math.sqrt(minDist);

            var rawTx = -closestNy, rawTy = closestNx;
            if (rawTx < 0) { rawTx = -rawTx; rawTy = -rawTy; }

            if (inside) {
                var pushX = lx + closestNx * (dist + 0.05);
                var pushY = ly + closestNy * (dist + 0.05);
                var wx = pushX * _ca - pushY * _sa + foilPos.x;
                var wy = pushX * _sa + pushY * _ca + foilPos.y;
                var su = U * 1.15;
                var localVx = rawTx * su * 0.5 + U * 0.5;
                var localVy = rawTy * su * 0.5;
                return {
                    vx: localVx * _ca - localVy * _sa,
                    vy: localVx * _sa + localVy * _ca,
                    wx: wx, wy: wy, snap: true, prox: 1.0
                };
            }

            var boundary = 0.55;
            if (dist > boundary) return null;

            var blend = dist / boundary;
            blend = blend * blend;
            var surfWeight = 1 - blend;
            var su = U * (1 + surfWeight * 0.25);
            var localVx = U * blend + rawTx * su * surfWeight;
            var localVy = rawTy * su * surfWeight;
            return {
                vx: localVx * _ca - localVy * _sa,
                vy: localVx * _sa + localVy * _ca,
                snap: false,
                prox: 1 - dist / boundary,
            };
        }

        cfg.colorMode = 'proximity';
        cfg.trails = false;
        cfg.gridOn = true;

        var TRAIL_LEN = 4;
        var trailBuf = null, trailGeo = null, trailLines = null;
        function buildTrails() {
            if (trailLines) { sceneRoot.remove(trailLines); trailGeo.dispose(); }
            if (!cfg.trails) return;
            var n = cfg.pCount;
            trailBuf = new Float32Array(n * TRAIL_LEN * 3);
            for (var i = 0; i < n; i++) {
                for (var s = 0; s < TRAIL_LEN; s++) {
                    var off = (i * TRAIL_LEN + s) * 3;
                    trailBuf[off] = posArr[i*3]; trailBuf[off+1] = posArr[i*3+1]; trailBuf[off+2] = posArr[i*3+2];
                }
            }
            trailGeo = new THREE.BufferGeometry();
            trailGeo.setAttribute('position', new THREE.BufferAttribute(trailBuf, 3));
            var indices = [];
            for (var i = 0; i < n; i++) {
                for (var s = 0; s < TRAIL_LEN - 1; s++) {
                    indices.push(i * TRAIL_LEN + s, i * TRAIL_LEN + s + 1);
                }
            }
            trailGeo.setIndex(indices);
            trailLines = new THREE.LineSegments(trailGeo, new THREE.LineBasicMaterial({
                color: 0x00c4b0, transparent: true, opacity: 0.12,
                blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            sceneRoot.add(trailLines);
        }

        var panelHTML = '<summary>Simulation</summary>'
            + '<div class="cfd-readout"><span>AoA <strong id="cfd-aoa-r">'+(cfg.angle*180/Math.PI).toFixed(1)+'°</strong></span><span>C<sub>L</sub> ≈ <strong id="cfd-cl-r">'+(2*Math.PI*cfg.angle).toFixed(2)+'</strong></span></div>'
            + '<hr class="cfd-sep">'
            + '<div class="cfd-row"><span>Shape</span><select id="cfd-shape"><option value="aerofoil">Aerofoil</option><option value="f1car">F1 Car</option><option value="cat">Aero Cat 🐱</option></select></div>'
            + '<div class="cfd-row"><span>Angle</span><input type="range" id="cfd-angle" min="-0.35" max="0.35" step="0.01" value="'+cfg.angle+'"><span class="cfd-v" id="cfd-angle-v">'+cfg.angle.toFixed(2)+'</span></div>'
            + '<div class="cfd-row"><span>Count</span><input type="range" id="cfd-pcount" min="500" max="'+MAX_P+'" step="500" value="'+cfg.pCount+'"><span class="cfd-v" id="cfd-pcount-v">'+cfg.pCount+'</span></div>'
            + '<div class="cfd-row"><span>Speed</span><input type="range" id="cfd-speed" min="0.01" max="0.20" step="0.01" value="'+cfg.speed+'"><span class="cfd-v" id="cfd-speed-v">'+cfg.speed.toFixed(2)+'</span></div>'
            + '<div class="cfd-row"><span>Opacity</span><input type="range" id="cfd-opacity" min="0.1" max="1.0" step="0.05" value="'+cfg.opacity+'"><span class="cfd-v" id="cfd-opacity-v">'+cfg.opacity.toFixed(2)+'</span></div>'
            + '<div class="cfd-row" id="cfd-profile-row"><span>Profile</span><input type="range" id="cfd-thick" min="0.04" max="0.24" step="0.01" value="'+cfg.thick+'"><span class="cfd-v" id="cfd-thick-v">'+cfg.thick.toFixed(2)+'</span></div>'
            + '<hr class="cfd-sep">'
            + '<div class="cfd-toggles">'
            + '<button class="cfd-btn active" id="cfd-col-prox">Proximity</button>'
            + '<button class="cfd-btn" id="cfd-col-vel">Velocity</button>'
            + '<button class="cfd-btn" id="cfd-trails">Trails</button>'
            + '<button class="cfd-btn active" id="cfd-grid">Grid</button>'
            + '</div>';

        var panel = document.createElement('details');
        panel.open = true;
        panel.className = 'cfd-panel';
        wrap.appendChild(panel);
        panel.innerHTML = panelHTML;

        var joystick = document.createElement('div');
        joystick.className = 'cfd-joystick';
        joystick.setAttribute('aria-hidden', 'true');
        joystick.innerHTML = '<div class="cfd-joystick-thumb"></div><div class="cfd-joystick-label">camera</div>';
        wrap.appendChild(joystick);
        var joystickThumb = joystick.querySelector('.cfd-joystick-thumb');
        var joyState = { active: false, x: 0, y: 0, r: 28, id: null };

        function setJoyThumb() {
            if (joystickThumb) joystickThumb.style.transform = 'translate3d(' + (joyState.x * joyState.r) + 'px,' + (joyState.y * joyState.r) + 'px,0)';
        }
        function updateJoyFromClient(clientX, clientY) {
            var rect = joystick.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var dx = (clientX - cx) / joyState.r;
            var dy = (clientY - cy) / joyState.r;
            var mag = Math.sqrt(dx * dx + dy * dy);
            if (mag > 1) {
                dx /= mag;
                dy /= mag;
            }
            joyState.x = dx;
            joyState.y = dy;
            setJoyThumb();
        }
        function resetJoystick() {
            joyState.active = false;
            joyState.id = null;
            joyState.x = 0;
            joyState.y = 0;
            setJoyThumb();
        }
        function placeJoystickBelowPanel() {
            var wrapRect = wrap.getBoundingClientRect();
            var panelRect = panel.getBoundingClientRect();
            var joyH = isMobile ? 82 : 86;
            var gap = isMobile ? 10 : 12;
            var minTop = 8;
            var maxTop = Math.max(minTop, wrap.clientHeight - joyH - 10);
            var topBelow = (panelRect.bottom - wrapRect.top) + gap;
            var topAbove = (panelRect.top - wrapRect.top) - joyH - gap;
            var top;

            if (isMobile) {
                if (topBelow <= maxTop) {
                    top = topBelow;
                } else {
                    top = topAbove;
                }
            } else {
                top = topBelow;
            }

            joystick.style.top = Math.max(minTop, Math.min(top, maxTop)) + 'px';
        }

        joystick.addEventListener('pointerdown', function(e) {
            joyState.active = true;
            joyState.id = e.pointerId;
            if (joystick.setPointerCapture) joystick.setPointerCapture(e.pointerId);
            updateJoyFromClient(e.clientX, e.clientY);
            e.preventDefault();
        });
        window.addEventListener('pointermove', function(e) {
            if (!joyState.active || joyState.id !== e.pointerId) return;
            updateJoyFromClient(e.clientX, e.clientY);
        }, { passive: true });
        window.addEventListener('pointerup', function(e) {
            if (joyState.id === e.pointerId) resetJoystick();
        }, { passive: true });
        window.addEventListener('pointercancel', function(e) {
            if (joyState.id === e.pointerId) resetJoystick();
        }, { passive: true });
        panel.addEventListener('toggle', function() {
            requestAnimationFrame(placeJoystickBelowPanel);
        });

        function bindSlider(id, key, cb) {
            var el = document.getElementById(id), vEl = document.getElementById(id + '-v');
            el.addEventListener('input', function() {
                var v = parseFloat(el.value); cfg[key] = v;
                vEl.textContent = v % 1 === 0 ? v : v.toFixed(2);
                if (cb) cb();
            });
        }
        function updateCL() {
            var deg = (cfg.angle * 180 / Math.PI).toFixed(1);
            var cl = (2 * Math.PI * cfg.angle).toFixed(2);
            var aoaEl = document.getElementById('cfd-aoa-r');
            var clEl = document.getElementById('cfd-cl-r');
            if (aoaEl) aoaEl.textContent = deg + '\u00B0';
            if (clEl) clEl.textContent = cl;
        }
        updateCL();
        bindSlider('cfd-angle', 'angle', function() {
            if (foilMesh) foilMesh.rotation.z = cfg.angle;
            if (foilWire) foilWire.rotation.z = cfg.angle;
            if (f1Group && f1Group.parent) f1Group.rotation.z = cfg.angle;
            updateCL();
        });
        bindSlider('cfd-pcount', 'pCount', function() { buildParticles(); if (cfg.trails) buildTrails(); });
        bindSlider('cfd-speed', 'speed');
        bindSlider('cfd-opacity', 'opacity', function() { pMat.opacity = cfg.opacity; });
        bindSlider('cfd-thick', 'thick', buildFoil);

        document.getElementById('cfd-shape').addEventListener('change', function() {
            cfg.shape = this.value;
            var profileRow = document.getElementById('cfd-profile-row');
            if (profileRow) profileRow.style.display = cfg.shape === 'aerofoil' ? 'flex' : 'none';
            buildFoil();
            buildParticles();
            if (cfg.trails) buildTrails();
        });

        document.getElementById('cfd-col-prox').addEventListener('click', function() {
            cfg.colorMode = 'proximity'; this.classList.add('active');
            document.getElementById('cfd-col-vel').classList.remove('active');
        });
        document.getElementById('cfd-col-vel').addEventListener('click', function() {
            cfg.colorMode = 'velocity'; this.classList.add('active');
            document.getElementById('cfd-col-prox').classList.remove('active');
        });
        document.getElementById('cfd-trails').addEventListener('click', function() {
            cfg.trails = !cfg.trails; this.classList.toggle('active', cfg.trails);
            if (cfg.trails) buildTrails(); else if (trailLines) { sceneRoot.remove(trailLines); trailLines = null; }
        });
        document.getElementById('cfd-grid').addEventListener('click', function() {
            cfg.gridOn = !cfg.gridOn; this.classList.toggle('active', cfg.gridOn);
            grid.visible = cfg.gridOn;
        });

        var t = 0;
        var pointer = { x: 0, y: 0 };
        wrap.addEventListener('mousemove', function(e) {
            var r = wrap.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
            pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
        }, { passive: true });

        function syncSize() {
            isMobile = checkMobile();
            var r = wrap.getBoundingClientRect();
            var w = Math.max(1, Math.round(r.width));
            var h = Math.max(1, Math.round(r.height));
            renderer.setSize(w, h, false);
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            camera.aspect = w / h;
            camera.fov = isMobile ? 62 : 42;
            camera.updateProjectionMatrix();
            sceneRoot.rotation.z = isMobile ? -Math.PI / 2 : 0;
            placeJoystickBelowPanel();
        }

        var running = false, rafId = 0;

        function tick() {
            if (!running) return;
            rafId = requestAnimationFrame(tick);
            t += 0.018;

            var n = cfg.pCount;
            var boost = 1 + pointer.x * 0.4;
            var hasTrails = cfg.trails && trailBuf && trailLines;

            for (var i = 0; i < n; i++) {
                var ix = i * 3, iy = ix + 1, iz = ix + 2;
                var U = baseSpeed[i] * cfg.speed * boost;
                var vx = U, vy = 0, prox = 0;

                var fl = flowAt(posArr[ix], posArr[iy], U);
                if (fl) {
                    vx = fl.vx; vy = fl.vy; prox = fl.prox;
                    if (fl.snap) { posArr[ix] = fl.wx; posArr[iy] = fl.wy; }
                }

                posArr[ix] += vx;
                posArr[iy] += vy;

                var respawn = false;
                if (posArr[ix] > xMax) { posArr[ix] = xMin; posArr[iy] = spawnY(); respawn = true; }
                if (posArr[ix] < xMin) { posArr[ix] = xMax; respawn = true; }
                if (posArr[iy] > yMax) posArr[iy] = yMax;
                if (posArr[iy] < yMin) posArr[iy] = yMin;

                if (cfg.colorMode === 'velocity') {
                    var spd = Math.sqrt(vx*vx + vy*vy);
                    var norm = Math.min(spd / (cfg.speed * 1.8), 1);
                    colArr[ix]   = 0.15 + norm * 0.85;
                    colArr[iy]   = 0.4 + (1 - Math.abs(norm - 0.5) * 2) * 0.6;
                    colArr[iz]   = 1.0 - norm * 0.75;
                } else {
                    colArr[ix]   = 1.0;
                    colArr[iy]   = 1.0 - prox * 0.85;
                    colArr[iz]   = 1.0 - prox * 0.9;
                }

                if (hasTrails) {
                    var base = i * TRAIL_LEN;
                    for (var s = TRAIL_LEN - 1; s > 0; s--) {
                        var tOff = (base + s) * 3, tPrev = (base + s - 1) * 3;
                        trailBuf[tOff] = trailBuf[tPrev]; trailBuf[tOff+1] = trailBuf[tPrev+1]; trailBuf[tOff+2] = trailBuf[tPrev+2];
                    }
                    var t0 = base * 3;
                    trailBuf[t0] = posArr[ix]; trailBuf[t0+1] = posArr[iy]; trailBuf[t0+2] = posArr[iz];
                    if (respawn) {
                        for (var s = 1; s < TRAIL_LEN; s++) {
                            var tOff = (base + s) * 3;
                            trailBuf[tOff] = posArr[ix]; trailBuf[tOff+1] = posArr[iy]; trailBuf[tOff+2] = posArr[iz];
                        }
                    }
                }
            }
            pGeo.attributes.position.needsUpdate = true;
            pGeo.attributes.color.needsUpdate = true;
            if (hasTrails) trailGeo.attributes.position.needsUpdate = true;

            if (isMobile) {
                camera.position.x = Math.sin(t * 0.25) * 0.15 + joyState.x * 2.8;
                camera.position.y = 0.8 - joyState.y * 2.2;
            } else {
                camera.position.x = pointer.x * 1.4 + Math.sin(t * 0.25) * 0.2 + joyState.x * 2.2;
                camera.position.y = 0.8 + pointer.y * 0.5 - joyState.y * 2.0;
            }
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        }

        var io = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    if (!running) {
                        running = true;
                        syncSize();
                        tick();
                    } else {
                        syncSize();
                    }
                } else {
                    running = false;
                    cancelAnimationFrame(rafId);
                }
            });
        }, { root: null, rootMargin: '80px', threshold: 0.04 });
        io.observe(wrap);

        window.addEventListener('resize', function() {
            if (running) syncSize();
        });
    }

    var cfdObs = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
            cfdObs.disconnect();
            if (typeof THREE !== 'undefined') {
                initCFD();
            } else {
                var poll = setInterval(function() {
                    if (typeof THREE !== 'undefined') {
                        clearInterval(poll);
                        initCFD();
                    }
                }, 150);
                setTimeout(function() { clearInterval(poll); }, 15000);
            }
        }
    }, { rootMargin: '300px', threshold: 0.01 });
    cfdObs.observe(wrap);
})();
