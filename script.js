class CelestialBody {
    constructor(x, y, type, vx = 0, vy = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.trail = [];
        this.maxTrailLength = 150;
        
        // Set properties based on type
        const properties = {
            'planet-small': {
                mass: 1,
                radius: 12,
                color: '#4169e1',
                glowColor: '#4169e140',
                name: 'Rocky Planet'
            },
            'planet-medium': {
                mass: 5,
                radius: 18,
                color: '#ff6347',
                glowColor: '#ff634740',
                name: 'Gas Giant'
            },
            'planet-large': {
                mass: 10,
                radius: 24,
                color: '#daa520',
                glowColor: '#daa52040',
                name: 'Super Giant'
            },
            'star': {
                mass: 1000,
                radius: 35,
                color: '#ffd700',
                glowColor: '#ffd70080',
                name: 'Star',
                glow: true
            },
            'black-hole': {
                mass: 5000,
                radius: 30,
                color: '#000',
                glowColor: '#8b00ff80',
                name: 'Black Hole',
                glow: true,
                specialRender: true
            }
        };
        
        const props = properties[type];
        Object.assign(this, props);
    }
    
    update(bodies, gravityMultiplier, dt) {
        let ax = 0;
        let ay = 0;
        
        bodies.forEach(other => {
            if (other === this) return;
            
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distanceSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSquared);
            
            // Skip if too close (prevents extreme forces)
            if (distance < (this.radius + other.radius) * 1.5) return;
            
            // Gravitational acceleration with softening factor
            const G = 20 * gravityMultiplier;
            const softening = 10;
            const acceleration = (G * other.mass) / (distanceSquared + softening * softening);
            
            ax += acceleration * (dx / distance);
            ay += acceleration * (dy / distance);
        });
        
        // Update velocity and position
        this.vx += ax * dt;
        this.vy += ay * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Add to trail
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
    }
    
    draw(ctx, showTrails, camera) {
        const screenX = (this.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
        const screenY = (this.y - camera.y) * camera.zoom + ctx.canvas.height / 2;
        const screenRadius = this.radius * camera.zoom;
        
        // Culling - skip if off screen
        const padding = 100;
        if (screenX + screenRadius + padding < 0 || 
            screenX - screenRadius - padding > ctx.canvas.width ||
            screenY + screenRadius + padding < 0 || 
            screenY - screenRadius - padding > ctx.canvas.height) {
            return;
        }
        
        // Draw trail
        if (showTrails && this.trail.length > 1) {
            ctx.strokeStyle = this.glowColor || this.color + '40';
            ctx.lineWidth = Math.max(1, 2 * camera.zoom);
            ctx.lineCap = 'round';
            ctx.beginPath();
            
            for (let i = 0; i < this.trail.length - 1; i++) {
                const alpha = i / this.trail.length;
                ctx.globalAlpha = alpha * 0.5;
                
                const p1 = this.trail[i];
                const p2 = this.trail[i + 1];
                const x1 = (p1.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
                const y1 = (p1.y - camera.y) * camera.zoom + ctx.canvas.height / 2;
                const x2 = (p2.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
                const y2 = (p2.y - camera.y) * camera.zoom + ctx.canvas.height / 2;
                
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Draw glow
        if (this.glow) {
            const glowSize = screenRadius * (this.type === 'star' ? 3 : 2);
            const gradient = ctx.createRadialGradient(screenX, screenY, screenRadius * 0.5, screenX, screenY, glowSize);
            gradient.addColorStop(0, this.glowColor);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(screenX - glowSize, screenY - glowSize, glowSize * 2, glowSize * 2);
        }
        
        // Special render for black hole
        if (this.specialRender && this.type === 'black-hole') {
            // Event horizon
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Accretion disk
            ctx.strokeStyle = '#8b00ff';
            ctx.lineWidth = 2 * camera.zoom;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, screenRadius * 1.5, screenRadius * 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Regular body
            const gradient = ctx.createRadialGradient(
                screenX - screenRadius * 0.3,
                screenY - screenRadius * 0.3,
                0,
                screenX,
                screenY,
                screenRadius
            );
            
            gradient.addColorStop(0, this.type === 'star' ? '#ffffff' : this.lightenColor(this.color));
            gradient.addColorStop(0.7, this.color);
            gradient.addColorStop(1, this.darkenColor(this.color));
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw name for large objects
        if (screenRadius > 20 && camera.zoom > 0.5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = `${Math.max(10, 12 * camera.zoom)}px Inter`;
            ctx.textAlign = 'center';
            ctx.fillText(this.name, screenX, screenY + screenRadius + 15 * camera.zoom);
        }
    }
    
    lightenColor(color) {
        const num = parseInt(color.slice(1), 16);
        const amt = 40;
        const r = Math.min(255, (num >> 16) + amt);
        const g = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const b = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }
    
    darkenColor(color) {
        const num = parseInt(color.slice(1), 16);
        const amt = -60;
        const r = Math.max(0, (num >> 16) + amt);
        const g = Math.max(0, (num >> 8 & 0x00FF) + amt);
        const b = Math.max(0, (num & 0x0000FF) + amt);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }
    
    getOrbitalVelocity(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const G = 20;
        const orbitalSpeed = Math.sqrt(G * target.mass / distance);
        
        // Perpendicular direction (90 degrees counter-clockwise)
        const perpX = -dy / distance;
        const perpY = dx / distance;
        
        return {
            vx: perpX * orbitalSpeed,
            vy: perpY * orbitalSpeed
        };
    }
}

class Simulator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.bodies = [];
        this.isRunning = false;
        this.showTrails = false;
        this.speedMultiplier = 1;
        this.gravityMultiplier = 1;
        this.draggedType = null;
        this.placingBody = null;
        this.isDragging = false;
        this.dragStart = null;
        this.currentMousePos = null;
        
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            minZoom: 0.1,
            maxZoom: 5
        };
        
        this.isPanning = false;
        this.panStart = null;
        
        this.stars = this.generateStarfield(200);
        
        this.velocityIndicator = document.getElementById('velocityIndicator');
        
        this.setupCanvas();
        this.setupControls();
        this.setupDragAndDrop();
        this.setupPresets();
        this.animate();
    }
    
    generateStarfield(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
        return stars;
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Set up canvas interactions
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.camera.x = this.canvas.width / 2;
        this.camera.y = this.canvas.height / 2;
    }
    
    setupControls() {
        // Play/Pause
        const playPauseBtn = document.getElementById('playPause');
        playPauseBtn.addEventListener('click', () => {
            this.isRunning = !this.isRunning;
            playPauseBtn.innerHTML = this.isRunning ? 
                '<span class="icon">⏸</span><span class="label">Pause</span>' : 
                '<span class="icon">▶</span><span class="label">Play</span>';
            playPauseBtn.classList.toggle('primary', !this.isRunning);
        });
        
        // Reset
        document.getElementById('reset').addEventListener('click', () => {
            this.bodies = [];
            this.placingBody = null;
            this.isDragging = false;
            this.dragStart = null;
            this.velocityIndicator.classList.add('hidden');
            this.camera = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                zoom: 1,
                minZoom: 0.1,
                maxZoom: 5
            };
            this.updateUI();
        });
        
        // Trails
        const trailsBtn = document.getElementById('trails');
        trailsBtn.addEventListener('click', () => {
            this.showTrails = !this.showTrails;
            trailsBtn.classList.toggle('active', this.showTrails);
            if (!this.showTrails) {
                this.bodies.forEach(body => body.trail = []);
            }
        });
        
        // Center View
        document.getElementById('centerView').addEventListener('click', () => {
            if (this.bodies.length > 0) {
                let cx = 0, cy = 0;
                this.bodies.forEach(body => {
                    cx += body.x;
                    cy += body.y;
                });
                this.camera.x = cx / this.bodies.length;
                this.camera.y = cy / this.bodies.length;
                this.camera.zoom = 1;
                this.updateUI();
            }
        });
        
        // Speed slider
        document.getElementById('speed').addEventListener('input', (e) => {
            this.speedMultiplier = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = `${this.speedMultiplier.toFixed(1)}x`;
        });
        
        // Gravity slider
        document.getElementById('gravity').addEventListener('input', (e) => {
            this.gravityMultiplier = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = `${this.gravityMultiplier.toFixed(1)}x`;
        });
        
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const worldX = (mouseX - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
            const worldY = (mouseY - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
            
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, this.camera.zoom * zoomFactor));
            
            this.camera.x = worldX - (mouseX - this.canvas.width / 2) / this.camera.zoom;
            this.camera.y = worldY - (mouseY - this.canvas.height / 2) / this.camera.zoom;
            
            this.updateUI();
        });
        
        // Right click pan
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.isPanning = true;
                this.panStart = { x: e.clientX, y: e.clientY };
                this.canvas.style.cursor = 'move';
            }
        });
        
        // Track mouse position globally
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.currentMousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            if (this.isPanning && this.panStart) {
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                
                this.camera.x -= dx / this.camera.zoom;
                this.camera.y -= dy / this.camera.zoom;
                
                this.panStart = { x: e.clientX, y: e.clientY };
            }
        });
        
        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.isPanning = false;
                this.panStart = null;
                this.canvas.style.cursor = 'crosshair';
            }
        });
    }
    
    setupDragAndDrop() {
        // Object cards drag start
        document.querySelectorAll('.object-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedType = card.dataset.type;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'copy';
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedType = null;
            });
        });
        
        // Canvas drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedType) {
                const rect = this.canvas.getBoundingClientRect();
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                const worldPos = this.screenToWorld(screenX, screenY);
                
                this.placingBody = new CelestialBody(worldPos.x, worldPos.y, this.draggedType);
            }
        });
        
        // Velocity setting
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.placingBody && !this.isPanning) {
                e.preventDefault();
                this.isDragging = true;
                const rect = this.canvas.getBoundingClientRect();
                this.dragStart = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.placingBody && this.dragStart) {
                const rect = this.canvas.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                const dx = this.dragStart.x - currentX;
                const dy = this.dragStart.y - currentY;
                const velocity = Math.sqrt(dx * dx + dy * dy) * 0.5;
                
                // Update velocity indicator
                this.velocityIndicator.style.left = currentX + 'px';
                this.velocityIndicator.style.top = currentY + 'px';
                this.velocityIndicator.querySelector('.velocity-value').textContent = `${Math.round(velocity)} px/s`;
                this.velocityIndicator.classList.remove('hidden');
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0 && this.isDragging && this.placingBody) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                const dx = (this.dragStart.x - currentX) / this.camera.zoom;
                const dy = (this.dragStart.y - currentY) / this.camera.zoom;
                
                this.placingBody.vx = dx * 0.5;
                this.placingBody.vy = dy * 0.5;
                
                this.bodies.push(this.placingBody);
                this.updateUI();
                
                this.placingBody = null;
                this.isDragging = false;
                this.dragStart = null;
                this.velocityIndicator.classList.add('hidden');
            }
        });
        
        // Cancel placement on escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.placingBody) {
                this.placingBody = null;
                this.isDragging = false;
                this.dragStart = null;
                this.velocityIndicator.classList.add('hidden');
            }
        });
    }
    
    setupPresets() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.loadPreset(preset);
            });
        });
    }
    
    loadPreset(preset) {
        this.bodies = [];
        this.placingBody = null;
        this.isDragging = false;
        this.velocityIndicator.classList.add('hidden');
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        switch(preset) {
            case 'binary':
                // Binary star system
                const star1 = new CelestialBody(centerX - 100, centerY, 'star');
                const star2 = new CelestialBody(centerX + 100, centerY, 'star');
                
                // Set them to orbit each other
                star1.vx = 0;
                star1.vy = -30;
                star2.vx = 0;
                star2.vy = 30;
                
                this.bodies.push(star1, star2);
                
                // Add some planets
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2;
                    const distance = 300 + i * 50;
                    const planet = new CelestialBody(
                        centerX + Math.cos(angle) * distance,
                        centerY + Math.sin(angle) * distance,
                        'planet-small'
                    );
                    const speed = Math.sqrt(2000 * 20 / distance) * 0.7;
                    planet.vx = -Math.sin(angle) * speed;
                    planet.vy = Math.cos(angle) * speed;
                    this.bodies.push(planet);
                }
                break;
                
            case 'solar':
                // Solar system
                const sun = new CelestialBody(centerX, centerY, 'star');
                this.bodies.push(sun);
                
                // Add planets at different distances
                const planetTypes = ['planet-small', 'planet-small', 'planet-medium', 'planet-medium', 'planet-large'];
                const distances = [150, 220, 320, 450, 600];
                
                planetTypes.forEach((type, i) => {
                    const planet = new CelestialBody(centerX + distances[i], centerY, type);
                    const orbital = planet.getOrbitalVelocity(sun);
                    planet.vx = orbital.vx;
                    planet.vy = orbital.vy;
                    this.bodies.push(planet);
                });
                break;
                
            case 'chaos':
                // Chaotic system
                for (let i = 0; i < 10; i++) {
                    const angle = (i / 10) * Math.PI * 2;
                    const distance = 200 + Math.random() * 200;
                    const types = ['planet-small', 'planet-medium', 'planet-large'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    
                    const body = new CelestialBody(
                        centerX + Math.cos(angle) * distance,
                        centerY + Math.sin(angle) * distance,
                        type
                    );
                    
                    // Random velocities
                    body.vx = (Math.random() - 0.5) * 50;
                    body.vy = (Math.random() - 0.5) * 50;
                    
                    this.bodies.push(body);
                }
                break;
        }
        
        this.updateUI();
        this.isRunning = true;
        document.getElementById('playPause').innerHTML = '<span class="icon">⏸</span><span class="label">Pause</span>';
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
            y: (screenY - this.canvas.height / 2) / this.camera.zoom + this.camera.y
        };
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
            y: (worldY - this.camera.y) * this.camera.zoom + this.canvas.height / 2
        };
    }
    
    updateUI() {
        document.getElementById('objectCount').textContent = this.bodies.length;
        document.getElementById('zoomLevel').textContent = `${this.camera.zoom.toFixed(2)}x`;
    }
    
    drawStarfield() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.stars.forEach(star => {
            const screenPos = this.worldToScreen(star.x, star.y);
            const size = star.size * this.camera.zoom * 0.5;
            
            if (screenPos.x >= -10 && screenPos.x <= this.canvas.width + 10 &&
                screenPos.y >= -10 && screenPos.y <= this.canvas.height + 10) {
                this.ctx.globalAlpha = star.brightness;
                this.ctx.beginPath();
                this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawGrid() {
        const gridSize = 100 * this.camera.zoom;
        const offsetX = (this.camera.x * this.camera.zoom) % gridSize;
        const offsetY = (this.camera.y * this.camera.zoom) % gridSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = -offsetX; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = -offsetY; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    animate() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fpsTime = 0;
        
        const loop = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            // FPS counter
            frameCount++;
            fpsTime += deltaTime;
            if (fpsTime >= 1000) {
                document.getElementById('fps').textContent = frameCount;
                frameCount = 0;
                fpsTime = 0;
            }
            
            // Clear canvas
            this.ctx.fillStyle = '#0a0a0f';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw background elements
            this.drawStarfield();
            this.drawGrid();
            
            // Update physics
            if (this.isRunning && this.bodies.length > 0) {
                const dt = Math.min(deltaTime / 1000, 0.1) * this.speedMultiplier;
                
                // Collision detection
                for (let i = this.bodies.length - 1; i >= 0; i--) {
                    for (let j = i - 1; j >= 0; j--) {
                        const body1 = this.bodies[i];
                        const body2 = this.bodies[j];
                        const dx = body1.x - body2.x;
                        const dy = body1.y - body2.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < body1.radius + body2.radius) {
                            // Merge bodies
                            if (body1.mass >= body2.mass) {
                                body1.vx = (body1.mass * body1.vx + body2.mass * body2.vx) / (body1.mass + body2.mass);
                                body1.vy = (body1.mass * body1.vy + body2.mass * body2.vy) / (body1.mass + body2.mass);
                                body1.mass += body2.mass;
                                body1.radius = Math.sqrt(body1.radius * body1.radius + body2.radius * body2.radius);
                                this.bodies.splice(j, 1);
                                i--;
                            } else {
                                body2.vx = (body1.mass * body1.vx + body2.mass * body2.vx) / (body1.mass + body2.mass);
                                body2.vy = (body1.mass * body1.vy + body2.mass * body2.vy) / (body1.mass + body2.mass);
                                body2.mass += body1.mass;
                                body2.radius = Math.sqrt(body1.radius * body1.radius + body2.radius * body2.radius);
                                this.bodies.splice(i, 1);
                                break;
                            }
                            this.updateUI();
                        }
                    }
                }
                
                // Update positions
                this.bodies.forEach(body => {
                    body.update(this.bodies, this.gravityMultiplier, dt);
                });
            }
            
            // Draw bodies
            this.bodies.forEach(body => {
                body.draw(this.ctx, this.showTrails, this.camera);
            });
            
            // Draw placing body
            if (this.placingBody) {
                this.placingBody.draw(this.ctx, false, this.camera);
                
                // Draw velocity vector
                if (this.isDragging && this.dragStart && this.currentMousePos) {
                    const startPos = this.worldToScreen(this.placingBody.x, this.placingBody.y);
                    
                    this.ctx.strokeStyle = '#4a9eff';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(startPos.x, startPos.y);
                    this.ctx.lineTo(this.dragStart.x, this.dragStart.y);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    
                    // Arrow head
                    const angle = Math.atan2(
                        this.dragStart.y - startPos.y,
                        this.dragStart.x - startPos.x
                    );
                    const arrowSize = 15;
                    
                    this.ctx.fillStyle = '#4a9eff';
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
                    this.ctx.lineTo(
                        this.dragStart.x - arrowSize * Math.cos(angle - Math.PI / 6),
                        this.dragStart.y - arrowSize * Math.sin(angle - Math.PI / 6)
                    );
                    this.ctx.lineTo(
                        this.dragStart.x - arrowSize * Math.cos(angle + Math.PI / 6),
                        this.dragStart.y - arrowSize * Math.sin(angle + Math.PI / 6)
                    );
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
            
            requestAnimationFrame(loop);
        };
        
        requestAnimationFrame(loop);
    }
}

// Initialize simulator
document.addEventListener('DOMContentLoaded', () => {
    new Simulator();
});
