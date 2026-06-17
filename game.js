let canvas, ctx;
let player;
let obstacles = [];
let particles = [];
let particlePool = [];
let clouds = [];
let buildings = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('parkourHighScore')) || 0;
let unlockedLevel = parseInt(localStorage.getItem('parkourUnlockedLevel')) || 1;
let gameOver = false;
let gameStarted = false;
let gameSpeed = 5;
let gameLoopRunning = false;
let jumpKeyDown = false;
let jumpStartTime = 0;
let maxJumpTime = 200;
let bgOffset = 0;
let obstacleTimer = 0;

let level = 1;
let levelComplete = false;
let levelPaused = false;
let gamePaused = false;

// Delta time
let lastTime = 0;
const TARGET_FPS = 60;
const TARGET_FRAME_TIME = 1000 / TARGET_FPS;

// 基准尺寸和缩放比例
const BASE_WIDTH = 800;
const BASE_HEIGHT = 400;
let scale = 1;
let canvasWidth, canvasHeight;
let groundY;

const levelConfig = {
    1: { speed: 5, minObstacleInterval: 120, maxObstacleInterval: 180, targetScore: 8, obstacleTypes: ['normal', 'normal', 'small'] },
    2: { speed: 6, minObstacleInterval: 100, maxObstacleInterval: 160, targetScore: 15, obstacleTypes: ['normal', 'normal', 'small', 'tall'] },
    3: { speed: 7, minObstacleInterval: 90, maxObstacleInterval: 140, targetScore: 25, obstacleTypes: ['normal', 'normal', 'small', 'tall', 'double'] },
    4: { speed: 8, minObstacleInterval: 80, maxObstacleInterval: 120, targetScore: 40, obstacleTypes: ['normal', 'small', 'tall', 'double'] },
    5: { speed: 9, minObstacleInterval: 70, maxObstacleInterval: 110, targetScore: 60, obstacleTypes: ['normal', 'small', 'tall', 'double', 'double'] },
    6: { speed: 10, minObstacleInterval: 60, maxObstacleInterval: 100, targetScore: 80, obstacleTypes: ['normal', 'small', 'tall', 'double', 'double'] },
    7: { speed: 11, minObstacleInterval: 55, maxObstacleInterval: 90, targetScore: 100, obstacleTypes: ['small', 'tall', 'double', 'double'] },
    8: { speed: 12, minObstacleInterval: 50, maxObstacleInterval: 80, targetScore: 130, obstacleTypes: ['small', 'tall', 'double', 'double'] },
    9: { speed: 13, minObstacleInterval: 45, maxObstacleInterval: 70, targetScore: 160, obstacleTypes: ['small', 'tall', 'double', 'double', 'tall'] },
    10: { speed: 14, minObstacleInterval: 40, maxObstacleInterval: 60, targetScore: 200, obstacleTypes: ['small', 'tall', 'double', 'double', 'tall'] },
    11: { speed: 15, minObstacleInterval: 38, maxObstacleInterval: 55, targetScore: 250, obstacleTypes: ['small', 'tall', 'double', 'double', 'tall'] },
    12: { speed: 16, minObstacleInterval: 35, maxObstacleInterval: 50, targetScore: 300, obstacleTypes: ['small', 'small', 'tall', 'double', 'double', 'tall'] },
    13: { speed: 17, minObstacleInterval: 32, maxObstacleInterval: 45, targetScore: 360, obstacleTypes: ['small', 'tall', 'double', 'double', 'tall'] },
    14: { speed: 18, minObstacleInterval: 30, maxObstacleInterval: 40, targetScore: 420, obstacleTypes: ['small', 'tall', 'double', 'double', 'tall'] },
    15: { speed: 20, minObstacleInterval: 25, maxObstacleInterval: 35, targetScore: 500, obstacleTypes: ['small', 'tall', 'double', 'double', 'tall'] }
};

let leftKeyDown = false;
let rightKeyDown = false;
const moveSpeed = 6;

// Polyfill roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
        this.lineTo(x + r[3], y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
        this.lineTo(x, y + r[0]);
        this.quadraticCurveTo(x, y, x + r[0], y);
        return this;
    };
}

// 缩放辅助函数
function scaled(val) {
    return val * scale;
}

class Player {
    constructor() {
        this.baseX = 100;
        this.baseY = 300;
        this.baseWidth = 40;
        this.baseHeight = 50;
        this.jumping = false;
        this.gravity = 0.8;
        this.velocity = 0;
        this.legOffset = 0;
        this.legSpeed = 0.3;
        this.minJumpPower = 9;
        this.extraJumpForce = 0.5;
        this.eyeBlink = 0;
    }

    get x() { return scaled(this.baseX); }
    get y() { return scaled(this.baseY); }
    get width() { return scaled(this.baseWidth); }
    get height() { return scaled(this.baseHeight); }

    set x(val) { this.baseX = val / scale; }
    set y(val) { this.baseY = val / scale; }

    draw() {
        const cx = this.x + scaled(20);
        const cy = this.y + scaled(55);

        // Shadow
        const shadowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, scaled(30));
        shadowGradient.addColorStop(0, 'rgba(0,0,0,0.3)');
        shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.ellipse(cx, this.y + scaled(52), scaled(25), scaled(8), 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#5dade2';
        ctx.beginPath();
        ctx.roundRect(this.x + scaled(5), this.y + scaled(10), scaled(30), scaled(35), scaled(8));
        ctx.fill();

        // Body highlight
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.roundRect(this.x + scaled(8), this.y + scaled(12), scaled(10), scaled(20), scaled(5));
        ctx.fill();

        // Head
        ctx.fillStyle = '#85c1e9';
        ctx.beginPath();
        ctx.arc(cx, this.y + scaled(10), scaled(15), 0, Math.PI * 2);
        ctx.fill();

        // Head highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(this.x + scaled(15), this.y + scaled(5), scaled(5), 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        this.eyeBlink += 0.02;
        const eyeOpen = Math.sin(this.eyeBlink) > 0.95 ? 0.5 : 1;
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.ellipse(this.x + scaled(15), this.y + scaled(8), scaled(3), scaled(3) * eyeOpen, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + scaled(25), this.y + scaled(8), scaled(3), scaled(3) * eyeOpen, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + scaled(14), this.y + scaled(7), scaled(1), 0, Math.PI * 2);
        ctx.arc(this.x + scaled(24), this.y + scaled(7), scaled(1), 0, Math.PI * 2);
        ctx.fill();

        // White hat (cap)
        const hatY = this.y + scaled(10) - scaled(15); // top of head
        const hatCenterX = cx;
        
        // Hat top (white dome)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(hatCenterX, hatY - scaled(3), scaled(16), scaled(8), 0, Math.PI, 0);
        ctx.fill();
        
        // Hat brim (visor)
        ctx.fillStyle = '#E8E8E8';
        ctx.beginPath();
        ctx.ellipse(hatCenterX + scaled(2), hatY, scaled(16), scaled(4), 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Hat band (gray stripe)
        ctx.fillStyle = '#D0D0D0';
        ctx.beginPath();
        ctx.ellipse(hatCenterX, hatY, scaled(14), scaled(3), 0, 0, Math.PI);
        ctx.fill();

        // Legs
        const legOffset = Math.sin(this.legOffset) * scaled(5);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(this.x + scaled(10), this.y + scaled(40), scaled(8), scaled(12) + legOffset);
        ctx.fillRect(this.x + scaled(22), this.y + scaled(40), scaled(8), scaled(12) - legOffset);

        ctx.fillStyle = '#2980b9';
        ctx.fillRect(this.x + scaled(8), this.y + scaled(48) + legOffset, scaled(12), scaled(5));
        ctx.fillRect(this.x + scaled(20), this.y + scaled(48) - legOffset, scaled(12), scaled(5));
    }

    update(dt) {
        if (!this.jumping) {
            this.legOffset += this.legSpeed * dt;
        }

        const scaledMoveSpeed = moveSpeed * scale * dt;
        if (leftKeyDown) {
            this.baseX -= moveSpeed * dt;
            if (this.baseX < 0) this.baseX = 0;
        }
        if (rightKeyDown) {
            this.baseX += moveSpeed * dt;
            if (this.baseX + this.baseWidth > BASE_WIDTH) this.baseX = BASE_WIDTH - this.baseWidth;
        }

        if (this.jumping) {
            this.velocity += this.gravity * dt;

            if (jumpKeyDown && this.velocity < 0) {
                const holdTime = Date.now() - jumpStartTime;
                if (holdTime < maxJumpTime) {
                    this.velocity -= this.extraJumpForce * dt;
                }
            }

            this.baseY += this.velocity * dt;

            if (this.baseY >= 300) {
                this.baseY = 300;
                this.jumping = false;
                this.velocity = 0;
                createLandParticles(this.x + scaled(20), this.y + scaled(50));
            }
        }
    }

    startJump() {
        if (!this.jumping) {
            this.jumping = true;
            this.velocity = -this.minJumpPower;
            jumpStartTime = Date.now();
            playJumpSound();
            createJumpParticles(this.x + scaled(20), this.y + scaled(50));
        }
    }
}

class Obstacle {
    constructor(type = 'normal') {
        this.baseX = BASE_WIDTH;
        this.type = type;
        this.speed = gameSpeed;
        this.passed = false;

        switch (type) {
            case 'normal':
                this.baseY = 300; this.baseWidth = 30; this.baseHeight = 50; this.color = '#e74c3c'; break;
            case 'small':
                this.baseY = 320; this.baseWidth = 25; this.baseHeight = 30; this.color = '#f39c12'; break;
            case 'tall':
                this.baseY = 280; this.baseWidth = 25; this.baseHeight = 70; this.color = '#a569bd'; break;
            case 'double':
                this.baseY = 300; this.baseWidth = 60; this.baseHeight = 50; this.color = '#d35400'; break;
        }
    }

    get x() { return scaled(this.baseX); }
    get y() { return scaled(this.baseY); }
    get width() { return scaled(this.baseWidth); }
    get height() { return scaled(this.baseHeight); }

    draw() {
        const hx = this.x + this.width / 2;
        const hy = this.y + this.height + scaled(5);

        // Shadow
        const shadowGradient = ctx.createRadialGradient(hx, hy, 0, hx, hy, this.width);
        shadowGradient.addColorStop(0, 'rgba(0,0,0,0.4)');
        shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.ellipse(hx, this.y + this.height + scaled(3), this.width / 2, scaled(5), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.color;

        if (this.type === 'double') {
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, scaled(25), this.height, scaled(5));
            ctx.roundRect(this.x + scaled(35), this.y, scaled(25), this.height, scaled(5));
            ctx.fill();

            this.drawDetails(this.x, this.y, scaled(25), this.height);
            this.drawDetails(this.x + scaled(35), this.y, scaled(25), this.height);
        } else {
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, scaled(5));
            ctx.fill();
            this.drawDetails(this.x, this.y, this.width, this.height);
        }
    }

    drawDetails(x, y, w, h) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.roundRect(x + scaled(3), y + scaled(5), scaled(8), h - scaled(10), scaled(3));
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x + w - scaled(5), y + scaled(5), scaled(3), h - scaled(10));
    }

    update(dt) {
        this.baseX -= this.speed * dt;
    }
}

class Particle {
    constructor() {
        this.active = false;
        this.x = 0; this.y = 0;
        this.color = '#fff';
        this.velocityX = 0;
        this.velocityY = 0;
        this.size = 0;
        this.life = 0;
        this.maxLife = 0;
        this.gravity = 0.3;
        this.rotation = 0;
        this.rotationSpeed = 0;
    }

    reset(x, y, color, vx, vy, size, life, gravity = 0.3, rotSpeed = 0.2) {
        this.active = true;
        this.x = x; this.y = y; this.color = color;
        this.velocityX = vx; this.velocityY = vy;
        this.size = size; this.life = life; this.maxLife = life;
        this.gravity = gravity;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * rotSpeed;
    }

    draw() {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    update(dt) {
        this.x += this.velocityX * scale * dt;
        this.y += this.velocityY * scale * dt;
        this.velocityY += this.gravity * dt;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;
        this.size *= Math.pow(0.99, dt);
        if (this.life <= 0) this.active = false;
    }
}

function acquireParticle(x, y, color, vx, vy, size, life) {
    const p = particlePool.pop() || new Particle();
    p.reset(x, y, color, vx, vy, size, life);
    particles.push(p);
    return p;
}

function releaseParticle(p) {
    p.active = false;
    if (particlePool.length < 200) particlePool.push(p);
}

class Cloud {
    constructor(initX = null) {
        this.baseX = initX !== null ? initX / scale : canvasWidth + Math.random() * 200;
        this.baseY = 30 + Math.random() * 100;
        this.speed = 0.3 + Math.random() * 0.5;
        this.cloudScale = 0.4 + Math.random() * 0.8;
        this.opacity = 0.7 + Math.random() * 0.25;
    }

    get x() { return scaled(this.baseX); }
    get y() { return scaled(this.baseY); }

    draw() {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = 'white';
        const s = this.cloudScale * scale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 25 * s, 0, Math.PI * 2);
        ctx.arc(this.x + 25 * s, this.y - 10 * s, 20 * s, 0, Math.PI * 2);
        ctx.arc(this.x + 50 * s, this.y, 25 * s, 0, Math.PI * 2);
        ctx.arc(this.x + 25 * s, this.y + 10 * s, 20 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    update(dt) {
        this.baseX -= this.speed * dt;
        if (scaled(this.baseX) + 80 * this.cloudScale * scale < 0) {
            this.baseX = (canvasWidth + 100) / scale;
            this.baseY = 30 + Math.random() * 100;
        }
    }
}

class Building {
    constructor(x, isFactory = false) {
        this.baseX = x;
        this.isFactory = isFactory;
        
        if (isFactory) {
            // 电子加工厂 - 更高更宽的厂房
            this.baseWidth = 50 + Math.random() * 50;
            this.baseHeight = 80 + Math.random() * 120;
            this.color = `hsl(220, 15%, ${35 + Math.random() * 15}%)`; // 金属灰蓝色
            this.accentColor = `hsl(${30 + Math.random() * 20}, 70%, 50%)`; // 橙色工业色
        } else {
            this.baseWidth = 30 + Math.random() * 40;
            this.baseHeight = 50 + Math.random() * 100;
            this.color = `hsl(${200 + Math.random() * 40}, 20%, ${30 + Math.random() * 20}%)`;
        }
        
        this.baseY = 300 + 50 - this.baseHeight;
        this.windowRows = Math.floor(this.baseHeight / 20);
        this.windowCols = Math.floor(this.baseWidth / 15);
        
        // 存储相对偏移量
        this.windows = [];
        for (let row = 0; row < this.windowRows; row++) {
            for (let col = 0; col < this.windowCols; col++) {
                if (isFactory) {
                    // 工厂：规则排列的通风口/窗户
                    if (Math.random() > 0.2) {
                        this.windows.push({
                            ox: 8 + col * 18,
                            oy: 10 + row * 25,
                            type: Math.random() > 0.5 ? 'vent' : 'window'
                        });
                    }
                } else {
                    if (Math.random() > 0.3) {
                        this.windows.push({
                            ox: 5 + col * 15,
                            oy: 8 + row * 20
                        });
                    }
                }
            }
        }
        
        // 工厂特有的装饰
        if (isFactory) {
            // 屋顶通风口
            this.roofVents = [];
            for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
                this.roofVents.push({
                    ox: 10 + i * 30,
                    width: 15 + Math.random() * 10
                });
            }
            // 工业管道
            this.pipes = [];
            for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
                this.pipes.push({
                    ox: 5 + i * 25,
                    height: 30 + Math.random() * 40,
                    color: Math.random() > 0.5 ? '#8B4513' : '#CD853F'
                });
            }
            // 电路板装饰位置
            this.circuitLines = [];
            for (let i = 0; i < 5; i++) {
                this.circuitLines.push({
                    ox: Math.random() * this.baseWidth,
                    oy: 20 + Math.random() * (this.baseHeight - 40)
                });
            }
        }
    }

    get x() { return scaled(this.baseX); }
    get y() { return scaled(this.baseY); }
    get width() { return scaled(this.baseWidth); }
    get height() { return scaled(this.baseHeight); }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        if (this.isFactory) {
            // 金属质感 - 竖条纹
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < this.baseWidth; i += 8) {
                ctx.fillRect(this.x + scaled(i), this.y, scaled(1), this.height);
            }
            
            // 电路板装饰线条
            ctx.strokeStyle = '#00FF41';
            ctx.lineWidth = scaled(1);
            for (let i = 0; i < this.circuitLines.length; i++) {
                const line = this.circuitLines[i];
                ctx.beginPath();
                ctx.moveTo(this.x + scaled(line.ox), this.y + scaled(line.oy));
                ctx.lineTo(this.x + scaled(line.ox + 15), this.y + scaled(line.oy));
                ctx.lineTo(this.x + scaled(line.ox + 15), this.y + scaled(line.oy + 10));
                ctx.stroke();
                // 电路节点
                ctx.fillStyle = '#00FF41';
                ctx.beginPath();
                ctx.arc(this.x + scaled(line.ox), this.y + scaled(line.oy), scaled(2), 0, Math.PI * 2);
                ctx.arc(this.x + scaled(line.ox + 15), this.y + scaled(line.oy + 10), scaled(2), 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = this.color;
            }
            
            // 窗户/通风口
            ctx.fillStyle = 'rgba(100, 150, 200, 0.6)';
            for (let i = 0; i < this.windows.length; i++) {
                const w = this.windows[i];
                if (w.type === 'vent') {
                    // 工业通风口 - 横条纹
                    ctx.fillRect(this.x + scaled(w.ox), this.y + scaled(w.oy), scaled(14), scaled(18));
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x + scaled(w.ox + 2), this.y + scaled(w.oy + 2), scaled(10), scaled(2));
                    ctx.fillRect(this.x + scaled(w.ox + 2), this.y + scaled(w.oy + 7), scaled(10), scaled(2));
                    ctx.fillRect(this.x + scaled(w.ox + 2), this.y + scaled(w.oy + 12), scaled(10), scaled(2));
                    ctx.fillStyle = 'rgba(100, 150, 200, 0.6)';
                } else {
                    ctx.fillRect(this.x + scaled(w.ox), this.y + scaled(w.oy), scaled(12), scaled(18));
                }
            }
            
            // 屋顶装饰
            ctx.fillStyle = '#555';
            for (let i = 0; i < this.roofVents.length; i++) {
                const vent = this.roofVents[i];
                ctx.fillRect(this.x + scaled(vent.ox), this.y - scaled(8), scaled(vent.width), scaled(8));
            }
            
            // 工业管道
            for (let i = 0; i < this.pipes.length; i++) {
                const pipe = this.pipes[i];
                ctx.fillStyle = pipe.color;
                ctx.fillRect(this.x + scaled(pipe.ox), this.y - scaled(pipe.height), scaled(6), scaled(pipe.height));
                // 管道接头
                ctx.fillStyle = '#666';
                ctx.fillRect(this.x + scaled(pipe.ox - 2), this.y - scaled(pipe.height), scaled(10), scaled(4));
            }
            
            // 橙色警示条
            ctx.fillStyle = this.accentColor;
            ctx.fillRect(this.x, this.y + this.height - scaled(6), this.width, scaled(6));
            
        } else {
            // 普通居民楼窗户
            ctx.fillStyle = 'rgba(255, 230, 150, 0.75)';
            for (let i = 0; i < this.windows.length; i++) {
                ctx.fillRect(
                    this.x + scaled(this.windows[i].ox),
                    this.y + scaled(this.windows[i].oy),
                    scaled(8), scaled(12)
                );
            }
        }
    }

    update(dt) {
        this.baseX -= gameSpeed * 0.3 * dt;
        if (scaled(this.baseX) + this.width < 0) {
            this.baseX = (canvasWidth + 50 + Math.random() * 100) / scale;
            
            if (this.isFactory) {
                this.baseWidth = 50 + Math.random() * 50;
                this.baseHeight = 80 + Math.random() * 120;
                this.color = `hsl(220, 15%, ${35 + Math.random() * 15}%)`;
                this.accentColor = `hsl(${30 + Math.random() * 20}, 70%, 50%)`;
            } else {
                this.baseWidth = 30 + Math.random() * 40;
                this.baseHeight = 50 + Math.random() * 100;
                this.color = `hsl(${200 + Math.random() * 40}, 20%, ${30 + Math.random() * 20}%)`;
            }
            
            this.baseY = 300 + 50 - this.baseHeight;
            this.windowRows = Math.floor(this.baseHeight / 20);
            this.windowCols = Math.floor(this.baseWidth / 15);
            
            this.windows = [];
            for (let row = 0; row < this.windowRows; row++) {
                for (let col = 0; col < this.windowCols; col++) {
                    if (this.isFactory) {
                        if (Math.random() > 0.2) {
                            this.windows.push({
                                ox: 8 + col * 18,
                                oy: 10 + row * 25,
                                type: Math.random() > 0.5 ? 'vent' : 'window'
                            });
                        }
                    } else {
                        if (Math.random() > 0.3) {
                            this.windows.push({
                                ox: 5 + col * 15,
                                oy: 8 + row * 20
                            });
                        }
                    }
                }
            }
            
            // 重建工厂装饰
            if (this.isFactory) {
                this.roofVents = [];
                for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
                    this.roofVents.push({
                        ox: 10 + i * 30,
                        width: 15 + Math.random() * 10
                    });
                }
                this.pipes = [];
                for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
                    this.pipes.push({
                        ox: 5 + i * 25,
                        height: 30 + Math.random() * 40,
                        color: Math.random() > 0.5 ? '#8B4513' : '#CD853F'
                    });
                }
                this.circuitLines = [];
                for (let i = 0; i < 5; i++) {
                    this.circuitLines.push({
                        ox: Math.random() * this.baseWidth,
                        oy: 20 + Math.random() * (this.baseHeight - 40)
                    });
                }
            }
        }
    }
}

let audioContext;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playJumpSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
}

function playScoreSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(523, audioContext.currentTime);
    osc.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
}

function playGameOverSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
    gain.gain.setValueAtTime(0.4, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
}

function createJumpParticles(x, y) {
    for (let i = 0; i < 12; i++) {
        acquireParticle(
            x + (Math.random() - 0.5) * scaled(25), y,
            Math.random() > 0.5 ? '#f1c40f' : '#f39c12',
            (Math.random() - 0.5) * 5,
            -Math.random() * 4 - 2,
            Math.random() * 4 + 2,
            35
        );
    }
}

function createLandParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        acquireParticle(
            x + (Math.random() - 0.5) * scaled(35), y,
            Math.random() > 0.5 ? '#95a5a6' : '#7f8c8d',
            (Math.random() - 0.5) * 4,
            -Math.random() * 3,
            Math.random() * 3 + 1,
            25
        );
    }
}

function createExplosionParticles(x, y) {
    const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#9b59b6', '#3498db'];
    for (let i = 0; i < 30; i++) {
        acquireParticle(
            x, y,
            colors[(Math.random() * colors.length) | 0],
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            Math.random() * 5 + 3,
            50
        );
    }
}

function createLevelCompleteParticles() {
    const colors = ['#4CAF50', '#8BC34A', '#FFD700', '#FF69B4', '#00CED1'];
    for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        acquireParticle(
            canvasWidth / 2, canvasHeight / 2,
            colors[(Math.random() * colors.length) | 0],
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            Math.random() * 6 + 2,
            70
        );
    }
}

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const rect = container.getBoundingClientRect();
    
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    
    canvas.width = Math.floor(canvasWidth);
    canvas.height = Math.floor(canvasHeight);
    
    scale = canvasWidth / BASE_WIDTH;
    groundY = scaled(300);
    
    // 重建云和建筑以适应新 scale
    clouds = [];
    buildings = [];
    for (let i = 0; i < 6; i++) {
        clouds.push(new Cloud(Math.random() * canvasWidth));
    }
    for (let i = 0; i < 8; i++) {
        buildings.push(new Building(i * 120, level <= 5));
    }
}

function init() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    
    resizeCanvas();
    
    player = new Player();
    obstacles = [];
    particles = [];
    clouds = [];
    buildings = [];
    score = 0;
    gameOver = false;
    levelComplete = false;
    levelPaused = false;
    obstacleTimer = 0;
    bgOffset = 0;
    leftKeyDown = false;
    rightKeyDown = false;
    jumpKeyDown = false;

    const config = getLevelConfig(level);
    gameSpeed = config.speed;

    for (let i = 0; i < 6; i++) {
        clouds.push(new Cloud(Math.random() * canvasWidth));
    }
    for (let i = 0; i < 8; i++) {
        buildings.push(new Building(i * 120, level <= 5));
    }
    updateUI();

    if (!gameLoopRunning) {
        gameLoopRunning = true;
        lastTime = performance.now();
        gameLoop(lastTime);
    }
}

function getLevelConfig(lvl) {
    return levelConfig[lvl] || levelConfig[10];
}

function updateUI() {
    const config = getLevelConfig(level);
    document.getElementById("score").textContent = "得分: " + score + " / " + config.targetScore;
    document.getElementById("highScore").textContent = "最高分: " + highScore;
    document.getElementById("level").textContent = "第 " + level + " 关";
}

function drawBackground() {
    // 早晨天空 - 粉橙色渐变
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY + scaled(100));
    if (level <= 5) {
        // 早晨 - 粉橙色到淡蓝色
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.3, '#FFDAB9');
        skyGradient.addColorStop(0.7, '#FFA07A');
        skyGradient.addColorStop(1, '#98FB98');
    } else {
        // 白天 - 原有蓝色渐变
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.5, '#B0E0E6');
        skyGradient.addColorStop(1, '#98FB98');
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 早晨太阳 - 更大更柔和
    if (level <= 5) {
        // 早晨太阳 - 位置更低，颜色更暖
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(scaled(680), scaled(80), scaled(40), 0, Math.PI * 2);
        ctx.fill();
        // 太阳光晕
        ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(scaled(680), scaled(80), scaled(60), 0, Math.PI * 2);
        ctx.fill();
        // 地平线光晕
        const horizonGlow = ctx.createLinearGradient(0, groundY, 0, groundY + scaled(50));
        horizonGlow.addColorStop(0, 'rgba(255, 150, 50, 0.3)');
        horizonGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
        ctx.fillStyle = horizonGlow;
        ctx.fillRect(0, groundY, canvasWidth, scaled(50));
    } else {
        // 白天太阳
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(scaled(680), scaled(60), scaled(35), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(scaled(680), scaled(60), scaled(50), 0, Math.PI * 2);
        ctx.fill();
    }

    buildings.forEach(b => b.draw());
    ctx.globalAlpha = 1;
    clouds.forEach(c => c.draw());
    ctx.globalAlpha = 1;
}

function drawGround() {
    const groundGradient = ctx.createLinearGradient(0, groundY + scaled(50), 0, groundY + scaled(100));
    if (level <= 5) {
        // 早晨草地 - 稍微偏黄绿
        groundGradient.addColorStop(0, '#7CB342');
        groundGradient.addColorStop(1, '#558B2F');
    } else {
        groundGradient.addColorStop(0, '#58d68d');
        groundGradient.addColorStop(1, '#2ecc71');
    }
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY + scaled(50), canvasWidth, scaled(50));

    if (level <= 5) {
        // 早晨草地装饰
        ctx.fillStyle = '#8BC34A';
        for (let i = -20 + bgOffset * scale; i < canvasWidth + scaled(20); i += scaled(20)) {
            ctx.beginPath();
            ctx.moveTo(i, groundY + scaled(50));
            ctx.lineTo(i + scaled(10), groundY + scaled(42));
            ctx.lineTo(i + scaled(20), groundY + scaled(50));
            ctx.fill();
        }
    } else {
        ctx.fillStyle = '#2ecc71';
        for (let i = -20 + bgOffset * scale; i < canvasWidth + scaled(20); i += scaled(20)) {
            ctx.beginPath();
            ctx.moveTo(i, groundY + scaled(50));
            ctx.lineTo(i + scaled(10), groundY + scaled(42));
            ctx.lineTo(i + scaled(20), groundY + scaled(50));
            ctx.fill();
        }
    }

    ctx.fillStyle = '#27ae60';
    for (let i = -30 + bgOffset * scale; i < canvasWidth + scaled(30); i += scaled(30)) {
        ctx.beginPath();
        ctx.moveTo(i, groundY + scaled(50));
        ctx.lineTo(i + scaled(5), groundY + scaled(38));
        ctx.lineTo(i + scaled(10), groundY + scaled(50));
        ctx.fill();
    }

    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(0, groundY + scaled(46), canvasWidth, scaled(6));
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(0, groundY + scaled(46), canvasWidth, scaled(3));
}

function gameLoop(timestamp) {
    const rawDt = (timestamp - lastTime) || TARGET_FRAME_TIME;
    lastTime = timestamp;
    const dt = Math.min(rawDt / TARGET_FRAME_TIME, 3);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawBackground();

    buildings.forEach(b => b.update(dt));
    clouds.forEach(c => c.update(dt));

    drawGround();

    const gameActive = gameStarted && !gameOver && !levelPaused && !gamePaused;

    if (gameActive) {
        bgOffset -= gameSpeed * 0.5 * dt;
        if (bgOffset <= -20) bgOffset = 0;

        const config = getLevelConfig(level);

        obstacleTimer += dt;
        const interval = config.minObstacleInterval + Math.random() * (config.maxObstacleInterval - config.minObstacleInterval);
        if (obstacleTimer > interval) {
            obstacleTimer = 0;
            const types = config.obstacleTypes;
            obstacles.push(new Obstacle(types[(Math.random() * types.length) | 0]));
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            o.update(dt);
            if (handleEntityCollision(o)) break;
            handleEntityPass(o, config);
            if (o.x + o.width < 0) obstacles.splice(i, 1);
        }
        obstacles.forEach(o => o.draw());

        player.update(dt);
        player.draw();

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update(dt);
            if (!p.active) {
                releaseParticle(p);
                particles.splice(i, 1);
            }
        }
        ctx.globalAlpha = 1;
        particles.forEach(p => p.draw());
        ctx.globalAlpha = 1;
    } else {
        player.update(dt);
        player.draw();
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update(dt);
            if (!p.active) {
                releaseParticle(p);
                particles.splice(i, 1);
            }
        }
        ctx.globalAlpha = 1;
        particles.forEach(p => p.draw());
        ctx.globalAlpha = 1;
    }

    requestAnimationFrame(gameLoop);
}

function checkCollision(pl, obstacle) {
    const px = pl.x + scaled(5);
    const py = pl.y + scaled(5);
    const pw = pl.width - scaled(10);
    const ph = pl.height - scaled(10);

    return px < obstacle.x + obstacle.width &&
        px + pw > obstacle.x &&
        py < obstacle.y + obstacle.height &&
        py + ph > obstacle.y;
}

function handleEntityCollision(entity) {
    if (checkCollision(player, entity)) {
        gameOver = true;
        createExplosionParticles(player.x + player.width / 2, player.y + player.height / 2);
        playGameOverSound();
        document.getElementById("gameOver").style.display = "flex";
        document.getElementById("finalScore").textContent = score;
        document.getElementById("finalLevel").textContent = level;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('parkourHighScore', highScore);
            document.getElementById("highScore").textContent = "最高分: " + highScore;
        }
        return true;
    }
    return false;
}

function handleEntityPass(entity, config) {
    if (!entity.passed && entity.x + entity.width < player.x) {
        entity.passed = true;
        score++;
        updateUI();
        playScoreSound();

        if (score >= config.targetScore) {
            if (level + 1 > unlockedLevel && level + 1 <= 15) {
                unlockedLevel = level + 1;
                localStorage.setItem('parkourUnlockedLevel', unlockedLevel);
            }
            levelComplete = true;
            levelPaused = true;
            createLevelCompleteParticles();
            document.getElementById("nextLevel").textContent = level + 1;
            document.getElementById("levelComplete").style.display = "flex";
        }
        return true;
    }
    return false;
}

function openLevelSelect() {
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("levelSelectScreen").style.display = "flex";
    renderLevelSelect();
}

function closeLevelSelect() {
    document.getElementById("levelSelectScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "flex";
}

function renderLevelSelect() {
    const grid = document.getElementById("levelGrid");
    grid.innerHTML = '';
    for (let i = 1; i <= 15; i++) {
        const btn = document.createElement("button");
        btn.className = "level-btn " + (i <= unlockedLevel ? "unlocked" : "locked");
        btn.textContent = i <= unlockedLevel ? i : "🔒";
        if (i <= unlockedLevel) {
            btn.addEventListener("click", () => startLevel(i));
        }
        grid.appendChild(btn);
    }
}

function startLevel(selectedLevel) {
    document.getElementById("levelSelectScreen").style.display = "none";
    level = selectedLevel;
    init();
    gameStarted = true;
    initAudio();
}

document.getElementById("startButton").addEventListener("click", () => {
    level = 1;
    init();
    gameStarted = true;
    document.getElementById("startScreen").style.display = "none";
    initAudio();
});

document.getElementById("levelSelectButton").addEventListener("click", () => {
    openLevelSelect();
});

document.getElementById("backButton").addEventListener("click", () => {
    closeLevelSelect();
});

document.getElementById("nextLevelButton").addEventListener("click", () => {
    level++;
    document.getElementById("levelComplete").style.display = "none";
    init();
    gameStarted = true;
});

document.getElementById("restartButton").addEventListener("click", () => {
    document.getElementById("gameOver").style.display = "none";
    level = 1;
    init();
    gameStarted = true;
});

function handleJumpStart() {
    if (!gameOver && gameStarted && !levelPaused && !gamePaused) {
        jumpKeyDown = true;
        player.startJump();
    }
}

function handleJumpEnd() {
    jumpKeyDown = false;
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        handleJumpStart();
    }
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        leftKeyDown = true;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        rightKeyDown = true;
    }
    if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        togglePause();
    }
});

document.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        handleJumpEnd();
    }
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        leftKeyDown = false;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        rightKeyDown = false;
    }
});

function attachMobileButton(el, onDown, onUp) {
    if (!el) return;
    el.addEventListener("touchstart", (e) => { e.preventDefault(); onDown(); }, { passive: false });
    el.addEventListener("touchend", (e) => { e.preventDefault(); onUp(); }, { passive: false });
    el.addEventListener("touchcancel", (e) => { e.preventDefault(); onUp(); }, { passive: false });
    el.addEventListener("mousedown", (e) => { e.preventDefault(); onDown(); });
    el.addEventListener("mouseup", (e) => { e.preventDefault(); onUp(); });
    el.addEventListener("mouseleave", (e) => { e.preventDefault(); onUp(); });
}

attachMobileButton(document.getElementById("jumpButton"), handleJumpStart, handleJumpEnd);
attachMobileButton(document.getElementById("leftButton"), () => leftKeyDown = true, () => leftKeyDown = false);
attachMobileButton(document.getElementById("rightButton"), () => rightKeyDown = true, () => rightKeyDown = false);

function togglePause() {
    if (gameStarted && !gameOver && !levelComplete) {
        gamePaused = !gamePaused;
        document.getElementById("pauseScreen").style.display = gamePaused ? "flex" : "none";
        document.getElementById("pauseButton").textContent = gamePaused ? "▶" : "⏸";
    }
}

document.getElementById("pauseButton").addEventListener("click", togglePause);
document.getElementById("resumeButton").addEventListener("click", togglePause);
document.getElementById("restartFromPauseButton").addEventListener("click", () => {
    document.getElementById("pauseScreen").style.display = "none";
    gamePaused = false;
    document.getElementById("pauseButton").textContent = "⏸";
    level = 1;
    init();
    gameStarted = true;
});
document.getElementById("levelSelectFromPauseButton").addEventListener("click", () => {
    document.getElementById("pauseScreen").style.display = "none";
    gamePaused = false;
    gameStarted = false;
    document.getElementById("pauseButton").textContent = "⏸";
    openLevelSelect();
});
document.getElementById("levelSelectFromGameOverButton").addEventListener("click", () => {
    document.getElementById("gameOver").style.display = "none";
    gameStarted = false;
    openLevelSelect();
});

document.getElementById("highScore").textContent = "最高分: " + highScore;

// 窗口大小变化时重新调整
window.addEventListener("resize", () => {
    resizeCanvas();
});

window.addEventListener("load", init);