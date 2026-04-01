/**
 * Portfolio Interactive Spatial Graph
 * Canvas 2D visualization of project nodes with connections
 * Features: Particle effects, hover interactions, filtering
 */
(function() {
    var canvas = document.getElementById('portfolio-canvas');
    var wrap = canvas && canvas.parentElement;
    if (!canvas || !wrap) return;
    var ctx = canvas.getContext('2d');
    var tooltip = document.getElementById('pg-tooltip');
    var ttTitle = document.getElementById('pg-tt-title');
    var ttDesc = document.getElementById('pg-tt-desc');
    var ttTags = document.getElementById('pg-tt-tags');
    var filterBtns = document.querySelectorAll('#pg-filters button');

    function mkIcon(paths, color) {
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'
            + '<rect width="120" height="120" fill="#0d1117"/>'
            + '<g transform="translate(60,60)" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            + paths + '</g></svg>';
        return 'data:image/svg+xml;utf8,' + svg.replace(/#/g, '%23');
    }

    var icons = {
        aero: mkIcon(
            '<path d="M-30,-10 L-15,-25 L15,-25 L30,-10 L15,5 L-15,5 Z" stroke-width="1.8"/>'
            + '<path d="M-15,-25 L-15,5 M15,-25 L15,5 M-30,-10 L30,-10" opacity="0.5"/>'
            + '<path d="M-30,15 Q-10,8 0,18 Q10,28 30,12" stroke="#e06090" stroke-width="2" stroke-dasharray="4,3"/>'
            + '<circle cx="-30" cy="15" r="3" fill="#e06090"/><circle cx="0" cy="18" r="3" fill="#e06090"/><circle cx="30" cy="12" r="3" fill="#e06090"/>',
            '#00c4b0'),
        noisy: mkIcon(
            '<circle cx="0" cy="-8" r="22" stroke-width="2"/>'
            + '<circle cx="-10" cy="-14" r="5" fill="#4caf50" stroke="none" opacity="0.7"/>'
            + '<circle cx="6" cy="-18" r="5" fill="#4caf50" stroke="none" opacity="0.7"/>'
            + '<circle cx="-4" cy="-4" r="5" fill="#4caf50" stroke="none" opacity="0.7"/>'
            + '<circle cx="12" cy="-6" r="5" fill="#4caf50" stroke="none" opacity="0.7"/>'
            + '<line x1="6" y1="-22" x2="14" y2="-14" stroke="#f44336" stroke-width="2.5"/>'
            + '<line x1="14" y1="-22" x2="6" y2="-14" stroke="#f44336" stroke-width="2.5"/>'
            + '<text x="0" y="32" text-anchor="middle" font-family="monospace" font-size="12" fill="#00c4b0" stroke="none">96%</text>',
            '#00c4b0'),
        brain: mkIcon(
            '<circle cx="-18" cy="-20" r="6" fill="#2196f3" stroke="none" opacity="0.7"/>'
            + '<circle cx="18" cy="-20" r="6" fill="#2196f3" stroke="none" opacity="0.7"/>'
            + '<circle cx="0" cy="0" r="6" fill="#2196f3" stroke="none" opacity="0.7"/>'
            + '<circle cx="-22" cy="16" r="6" fill="#2196f3" stroke="none" opacity="0.7"/>'
            + '<circle cx="22" cy="16" r="6" fill="#2196f3" stroke="none" opacity="0.7"/>'
            + '<line x1="-18" y1="-20" x2="18" y2="-20"/><line x1="-18" y1="-20" x2="0" y2="0"/>'
            + '<line x1="18" y1="-20" x2="0" y2="0"/><line x1="0" y1="0" x2="-22" y2="16"/>'
            + '<line x1="0" y1="0" x2="22" y2="16"/><line x1="-22" y1="16" x2="22" y2="16"/>',
            '#00c4b0'),
        aki: mkIcon(
            '<rect x="-28" y="-18" width="56" height="42" rx="5" stroke-width="2"/>'
            + '<polyline points="-22,6 -10,6 -4,-14 4,18 10,-6 16,6 24,6" stroke="#4caf50" stroke-width="2.5"/>'
            + '<line x1="-12" y1="-30" x2="-12" y2="-22" stroke="#f44336" stroke-width="2.5"/>'
            + '<line x1="-16" y1="-26" x2="-8" y2="-26" stroke="#f44336" stroke-width="2.5"/>',
            '#00c4b0'),
        optuna: mkIcon(
            '<line x1="-30" y1="0" x2="30" y2="0" stroke-width="3"/>'
            + '<path d="M-10,0 Q-5,-22 10,-22" stroke="#2196f3" stroke-width="2"/>'
            + '<path d="M10,-22 Q25,-22 30,0" stroke="#2196f3" stroke-width="2"/>'
            + '<path d="M-10,0 Q-5,22 10,22" stroke="#ff9800" stroke-width="2"/>'
            + '<path d="M10,22 Q25,22 30,0" stroke="#ff9800" stroke-width="2"/>'
            + '<circle cx="-30" cy="0" r="4" fill="#00c4b0"/><circle cx="-10" cy="0" r="4" fill="#00c4b0"/>'
            + '<circle cx="30" cy="0" r="5" fill="#00c4b0"/>'
            + '<circle cx="10" cy="-22" r="3" fill="#2196f3"/><circle cx="10" cy="22" r="3" fill="#ff9800"/>',
            '#00c4b0')
    };

    var projects = [
        { id:0, title:'Procedural Dungeon Generation', desc:'BSP-tree algorithms for 3D procedural content generation. Playable levels with geometric and topological correctness, presented at Sumo Digital Conference 2023.', tags:['eng','gfx'], modal:'#project1Modal', img:'uploads/dungeon2-bg.png' },
        { id:1, title:'3D Aero Field Prediction', desc:'Spatial AI on high-resolution point-cloud and mesh data — predicting dense physical fields from sparse sensor inputs using geometric deep learning.', tags:['ai','gfx','eng'], modal:'#project7Modal', img:icons.aero },
        { id:2, title:'Noisy-Label Deep Learning', desc:'MSc thesis and ACM CCS 2025 publication. Frameworks for robust deep learning under severe label noise, boosting macro F1 from 74.5% to 96.0% on noisy benchmarks.', tags:['ai','eng'], modal:'#project8Modal', img:icons.noisy },
        { id:3, title:'Brain Graph Super-Resolution', desc:'Graph neural network research with Imperial College — super-resolving brain connectivity graphs using message-passing and fusion strategies.', tags:['ai','gfx'], modal:'#project9Modal', img:icons.brain },
        { id:4, title:'Hospital AKI Detection', desc:'Kubernetes-based real-time acute kidney injury detection from live HL7 lab streams. Fault-tolerant inference with Prometheus/Grafana monitoring, 99.9% F3-score.', tags:['ai','eng','web'], modal:'#project10Modal', img:icons.aki },
        { id:5, title:'Optuna OSS Contribution', desc:'Contributed to Optuna v4.6.0 — modernised type-checking and imports across core hyperparameter optimisation modules. Changes merged and highlighted in the release.', tags:['eng'], modal:'#project11Modal', img:icons.optuna },
    ];

    var edges = [];
    for (var i = 0; i < projects.length; i++) {
        for (var j = i + 1; j < projects.length; j++) {
            var shared = projects[i].tags.filter(function(t) { return projects[j].tags.indexOf(t) !== -1; });
            if (shared.length > 0) edges.push({ a: i, b: j, shared: shared });
        }
    }

    var NODE_RADIUS = window.innerWidth <= 768 ? 36 : 52;
    var pr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 1, H = 1;
    var nodes = [];
    var particles = [];
    var PARTICLE_COUNT = (window.innerWidth <= 768) ? 40 : 90;
    var activeTag = 'all';
    var pointer = { x: -999, y: -999 };
    var hoveredNode = -1;
    var nodeImgs = [];

    projects.forEach(function(p, idx) {
        var img = new Image();
        img.src = p.img;
        nodeImgs[idx] = img;
    });

    function layoutNodes() {
        var isMobileGraph = W < 600;
        var cx = W / 2, cy = isMobileGraph ? H * 0.55 + 40 : H / 2 + 60;
        var rx = isMobileGraph ? Math.min(W * 0.36, 300) : Math.min(W * 0.40, 440);
        var ry = isMobileGraph ? Math.min(H * 0.22, 180) : Math.min(H * 0.30, 260);
        projects.forEach(function(p, i) {
            var angle = (i / projects.length) * Math.PI * 2 - Math.PI / 2;
            var tx = cx + Math.cos(angle) * rx;
            var ty = cy + Math.sin(angle) * ry;
            if (!nodes[i]) {
                nodes[i] = { x: tx, y: ty, tx: tx, ty: ty, vx: 0, vy: 0, r: NODE_RADIUS, pulse: Math.random() * Math.PI * 2 };
            } else {
                nodes[i].tx = tx;
                nodes[i].ty = ty;
            }
        });
    }

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                r: 0.6 + Math.random() * 1.2,
                a: 0.08 + Math.random() * 0.14,
            });
        }
    }

    function syncSize() {
        var rect = wrap.getBoundingClientRect();
        W = Math.max(1, Math.round(rect.width));
        H = Math.max(1, Math.round(rect.height));
        pr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = W * pr;
        canvas.height = H * pr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(pr, 0, 0, pr, 0, 0);
        layoutNodes();
    }

    syncSize();
    initParticles();

    function tagMatch(proj, tag) {
        return tag === 'all' || proj.tags.indexOf(tag) !== -1;
    }

    function draw(t) {
        ctx.clearRect(0, 0, W, H);

        particles.forEach(function(p) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = W;
            if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H;
            if (p.y > H) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,196,176,' + p.a + ')';
            ctx.fill();
        });

        var pConnDist = 100;
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < pConnDist) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = 'rgba(0,196,176,' + (0.04 * (1 - d / pConnDist)) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        edges.forEach(function(e) {
            var na = nodes[e.a], nb = nodes[e.b];
            var matchA = tagMatch(projects[e.a], activeTag);
            var matchB = tagMatch(projects[e.b], activeTag);
            var edgeActive = matchA && matchB;
            var alpha = edgeActive ? 0.35 : 0.07;
            if (hoveredNode === e.a || hoveredNode === e.b) alpha = Math.min(alpha + 0.3, 0.7);
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.strokeStyle = 'rgba(0,196,176,' + alpha + ')';
            ctx.lineWidth = edgeActive ? 1.4 : 0.7;
            ctx.stroke();

            if (edgeActive) {
                var frac = ((t * 0.0004 + e.a * 0.17 + e.b * 0.11) % 1);
                var px = na.x + (nb.x - na.x) * frac;
                var py = na.y + (nb.y - na.y) * frac;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,210,190,0.55)';
                ctx.fill();
            }
        });

        nodes.forEach(function(n, idx) {
            n.x += (n.tx - n.x) * 0.06;
            n.y += (n.ty - n.y) * 0.06;
            n.pulse += 0.025;

            var active = tagMatch(projects[idx], activeTag);
            var hov = hoveredNode === idx;
            var baseR = n.r + Math.sin(n.pulse) * 2;
            var drawR = hov ? baseR + 6 : baseR;
            var nodeAlpha = active ? 1 : 0.22;

            ctx.save();
            ctx.globalAlpha = nodeAlpha;

            if (hov) {
                ctx.shadowColor = 'rgba(0,210,190,0.45)';
                ctx.shadowBlur = 18;
            }

            ctx.beginPath();
            ctx.arc(n.x, n.y, drawR, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            var img = nodeImgs[idx];
            if (img && img.complete && img.naturalWidth > 0) {
                var s = drawR * 2;
                ctx.drawImage(img, n.x - drawR, n.y - drawR, s, s);
                ctx.fillStyle = hov ? 'rgba(0,15,14,0.1)' : 'rgba(0,15,14,0.2)';
                ctx.fillRect(n.x - drawR, n.y - drawR, s, s);
            } else {
                ctx.fillStyle = '#111820';
                ctx.fill();
            }
            ctx.restore();

            ctx.beginPath();
            ctx.arc(n.x, n.y, drawR, 0, Math.PI * 2);
            ctx.strokeStyle = hov ? 'rgba(0,210,190,' + (nodeAlpha * 0.9) + ')' : 'rgba(0,196,176,' + (nodeAlpha * 0.45) + ')';
            ctx.lineWidth = hov ? 2.2 : 1.2;
            ctx.stroke();

            ctx.save();
            ctx.globalAlpha = nodeAlpha;
            ctx.font = '600 ' + (W < 500 ? '9' : '12') + 'px "Roboto Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = hov ? '#00e0ca' : '#c0cdd4';
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 4;
            var label = projects[idx].title;
            if (label.length > 22) label = label.substring(0, 20) + '…';
            ctx.fillText(label, n.x, n.y + drawR + 8);
            ctx.restore();
        });
    }

    function hitTest(mx, my) {
        for (var i = nodes.length - 1; i >= 0; i--) {
            var n = nodes[i];
            var dx = mx - n.x, dy = my - n.y;
            if (dx * dx + dy * dy < (n.r + 10) * (n.r + 10)) return i;
        }
        return -1;
    }

    canvas.addEventListener('mousemove', function(e) {
        var r = canvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        var hit = hitTest(pointer.x, pointer.y);
        if (hit !== hoveredNode) {
            hoveredNode = hit;
            canvas.style.cursor = hit >= 0 ? 'pointer' : 'default';
            if (hit >= 0) {
                var p = projects[hit];
                ttTitle.textContent = p.title;
                ttDesc.textContent = p.desc;
                ttTags.textContent = p.tags.join(' · ');
                tooltip.classList.add('visible');
            } else {
                tooltip.classList.remove('visible');
            }
        }
        if (hoveredNode >= 0) {
            var tx = Math.min(pointer.x + 16, W - 260);
            var ty = Math.max(pointer.y - 80, 10);
            tooltip.style.left = tx + 'px';
            tooltip.style.top = ty + 'px';
        }
    });

    canvas.addEventListener('mouseleave', function() {
        hoveredNode = -1;
        canvas.style.cursor = 'default';
        tooltip.classList.remove('visible');
    });

    canvas.addEventListener('click', function() {
        if (hoveredNode >= 0) {
            var modal = projects[hoveredNode].modal;
            if (modal && typeof $ !== 'undefined') $(modal).modal('show');
        }
    });

    canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        var touch = e.touches[0];
        var r = canvas.getBoundingClientRect();
        var tx = touch.clientX - r.left;
        var ty = touch.clientY - r.top;
        var hit = hitTest(tx, ty);
        if (hit >= 0) {
            e.preventDefault();
            if (hoveredNode === hit) {
                var modal = projects[hit].modal;
                if (modal && typeof $ !== 'undefined') $(modal).modal('show');
                hoveredNode = -1;
                tooltip.classList.remove('visible');
            } else {
                hoveredNode = hit;
                var p = projects[hit];
                ttTitle.textContent = p.title;
                ttDesc.textContent = p.desc;
                ttTags.textContent = p.tags.join(' · ');
                tooltip.classList.add('visible');
                var ttx = Math.min(tx + 16, W - 220);
                var tty = Math.max(ty - 80, 10);
                tooltip.style.left = ttx + 'px';
                tooltip.style.top = tty + 'px';
            }
        } else {
            hoveredNode = -1;
            tooltip.classList.remove('visible');
        }
    }, { passive: false });

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            filterBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            activeTag = btn.getAttribute('data-tag');
        });
    });

    var running = false, rafId = 0;

    function loop(t) {
        if (!running) return;
        rafId = requestAnimationFrame(loop);
        draw(t);
    }

    var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                if (!running) {
                    running = true;
                    syncSize();
                    initParticles();
                    loop(performance.now());
                }
            } else {
                running = false;
                cancelAnimationFrame(rafId);
            }
        });
    }, { rootMargin: '80px', threshold: 0.02 });
    io.observe(wrap);

    window.addEventListener('resize', function() {
        NODE_RADIUS = window.innerWidth <= 768 ? 36 : 52;
        nodes.forEach(function(n) { n.r = NODE_RADIUS; });
        syncSize();
        if (particles.length > 0) {
            particles.forEach(function(p) {
                if (p.x > W) p.x = Math.random() * W;
                if (p.y > H) p.y = Math.random() * H;
            });
        }
    });
})();
