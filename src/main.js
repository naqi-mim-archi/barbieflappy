const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const MENU = 0, PLAYING = 1, GAMEOVER = 2;
let gameState = MENU;
let difficulty = 'fashionista';
let score = 0;
let highScore = localStorage.getItem('glamHighScore') || 0;

const config = {
    fashionista: { speed: 3.5, gap: 260, gravity: 0.22, jump: -6.5, moving: false },
    icon: { speed: 5, gap: 220, gravity: 0.28, jump: -7.5, moving: true },
    superstar: { speed: 7, gap: 180, gravity: 0.38, jump: -9, moving: true, sparkleOverload: true }
};

let activeConfig = config.fashionista;
let shakeTime = 0;
let flashTime = 0;

let player, obstacles, particles, powerUps, backgrounds;

class BackgroundLayer {
    constructor(color, speed, heightFactor, yOffset = 0, isSun = false) {
        this.color = color;
        this.speed = speed;
        this.heightFactor = heightFactor;
        this.x = 0;
        this.yOffset = yOffset;
        this.isSun = isSun;
    }

    update() {
        this.x -= this.speed * activeConfig.speed * 0.2;
        if (this.x <= -canvas.width) this.x = 0;
    }

    draw() {
        if (this.isSun) {
            // Dreamy Heart Sun
            ctx.save();
            ctx.translate(canvas.width * 0.8, 120);
            ctx.fillStyle = '#fffad1';
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        ctx.fillStyle = this.color;
        for (let i = 0; i < 3; i++) {
            let drawX = this.x + i * canvas.width;
            ctx.beginPath();
            ctx.moveTo(drawX, canvas.height);
            for (let j = 0; j < canvas.width; j += 60) {
                // Stylized Palm Trees and Dreamhouses
                let h = Math.sin(j * 0.005 + i) * 80 * this.heightFactor + (this.heightFactor * 180);
                ctx.lineTo(drawX + j, canvas.height - h - this.yOffset);
                if (j % 180 === 0) {
                    // Cute Spire/Tower
                    ctx.lineTo(drawX + j, canvas.height - h - 120 - this.yOffset);
                    ctx.lineTo(drawX + j + 30, canvas.height - h - this.yOffset);
                }
            }
            ctx.lineTo(drawX + canvas.width, canvas.height);
            ctx.fill();
        }
    }
}

class GlamourIcon {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 150;
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.radius = 20;
        this.rotation = 0;
        this.invincible = 0;
        this.trail = [];
    }

    jump() {
        this.velocity = activeConfig.jump;
        createGlitterBurst(this.x, this.y, '#fff', 8);
    }

    update() {
        this.velocity += activeConfig.gravity;
        this.y += this.velocity;
        this.rotation = Math.min(Math.PI / 6, Math.max(-Math.PI / 6, this.velocity * 0.08));

        if (this.invincible > 0) {
            this.invincible--;
            this.trail.push({x: this.x, y: this.y, alpha: 0.8});
        }
        if (this.trail.length > 12) this.trail.shift();
        this.trail.forEach(t => t.alpha -= 0.06);

        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
            gameOver();
        }
    }

    draw() {
        this.trail.forEach(t => {
            ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Heart Shape Player
        ctx.fillStyle = this.invincible > 0 ? '#fff' : '#ff1493';
        ctx.shadowBlur = this.invincible > 0 ? 30 : 10;
        ctx.shadowColor = '#ff69b4';
        
        ctx.beginPath();
        const topCurveHeight = this.radius * 0.7;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -this.radius * 1.5, 0, -this.radius * 1.5, topCurveHeight);
        ctx.bezierCurveTo(-this.radius * 1.5, this.radius * 1.8, 0, this.radius * 2.2, 0, this.radius * 3);
        ctx.bezierCurveTo(0, this.radius * 2.2, this.radius * 1.5, this.radius * 1.8, this.radius * 1.5, topCurveHeight);
        ctx.bezierCurveTo(this.radius * 1.5, 0, 0, 0, 0, topCurveHeight);
        ctx.fill();

        // Cute bow or sparkle
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, topCurveHeight + 5, 4, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }
}

class FashionPillar {
    constructor(x) {
        this.x = x;
        this.width = 80;
        this.gap = activeConfig.gap;
        this.topHeight = Math.random() * (canvas.height - this.gap - 250) + 125;
        this.passed = false;
        this.moveDir = 1;
        this.moveOffset = 0;
        this.color = ['#ff69b4', '#ff1493', '#da70d6', '#ba55d3'][Math.floor(Math.random()*4)];
    }

    update() {
        this.x -= activeConfig.speed;
        if (activeConfig.moving) {
            this.moveOffset += 0.03 * this.moveDir * (activeConfig.speed * 0.5);
            if (Math.abs(this.moveOffset) > 60) this.moveDir *= -1;
        }
    }

    draw() {
        const topY = this.topHeight + this.moveOffset;
        const bottomY = topY + this.gap;

        ctx.lineWidth = 6;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = this.color;

        // Top Pillar (Lipstick/Perfume look)
        this.drawStyledPillar(this.x, 0, this.width, topY, true);
        
        // Bottom Pillar
        this.drawStyledPillar(this.x, bottomY, this.width, canvas.height - bottomY, false);
    }

    drawStyledPillar(x, y, w, h, isTop) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255,105,180,0.4)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        
        // Detail lines
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y);
        ctx.lineTo(x + w * 0.3, y + h);
        ctx.stroke();

        // Cap
        ctx.fillStyle = '#ffd700';
        if (isTop) {
            ctx.fillRect(x - 5, y + h - 20, w + 10, 20);
        } else {
            ctx.fillRect(x - 5, y, w + 10, 20);
        }
        ctx.restore();
    }

    collides(r) {
        if (r.invincible > 0) return false;
        const topY = this.topHeight + this.moveOffset;
        const bottomY = topY + this.gap;

        if (r.x + r.radius > this.x && r.x - r.radius < this.x + this.width) {
            if (r.y < topY || r.y + r.radius*2 > bottomY) {
                return true;
            }
        }
        return false;
    }
}

class GlitterStar {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        this.angle = 0;
    }

    update() {
        this.x -= activeConfig.speed;
        this.angle += 0.05;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffd700';
        
        // Draw Star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.radius,
                       Math.sin((18 + i * 72) * Math.PI / 180) * this.radius);
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.radius/2),
                       Math.sin((54 + i * 72) * Math.PI / 180) * (this.radius/2));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, size, vx, vy, life, type = 'square') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.type = type;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // gravity for sparkles
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        if (this.type === 'heart') {
            ctx.font = `${this.size * 2}px serif`;
            ctx.fillText('❤', this.x, this.y);
        } else {
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
        ctx.restore();
    }
}

function init() {
    resize();
    player = new GlamourIcon();
    obstacles = [];
    particles = [];
    powerUps = [];
    backgrounds = [
        new BackgroundLayer('', 0, 0, 0, true),
        new BackgroundLayer('#ffc0cb', 0.1, 1.2, 0),
        new BackgroundLayer('#ffb6c1', 0.3, 0.8, 40),
        new BackgroundLayer('#ffa2bc', 0.6, 0.4, 80)
    ];
    window.addEventListener('keydown', e => {
        if (e.code === 'Space') handleInput();
    });
    canvas.addEventListener('mousedown', handleInput);
    requestAnimationFrame(gameLoop);
}

function handleInput() {
    if (gameState === PLAYING) {
        player.jump();
    }
}

function startGame(diff) {
    difficulty = diff;
    activeConfig = config[diff];
    gameState = PLAYING;
    score = 0;
    player.reset();
    obstacles = [];
    powerUps = [];
    particles = [];
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
}

function gameOver() {
    if (gameState === GAMEOVER) return;
    gameState = GAMEOVER;
    shakeTime = 15;
    flashTime = 10;
    createGlitterBurst(player.x, player.y, '#ff1493', 40, 'heart');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('glamHighScore', highScore);
    }

    document.getElementById('final-score').innerText = `Score: ${score}`;
    document.getElementById('high-score').innerText = `High Score: ${highScore}`;
    
    let rank = "Fashion Novice";
    if (score > 10) rank = "Trendsetter";
    if (score > 30) rank = "Style Icon";
    if (score > 60) rank = "Runway Queen";
    if (score > 100) rank = "Ultimate Superstar";
    document.getElementById('global-rank').innerText = `Rank: ${rank}`;
    
    document.getElementById('gameover-screen').classList.remove('hidden');
}

function resetGame() {
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    gameState = MENU;
}

function createGlitterBurst(x, y, color, count, type = 'square') {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(
            x, y, color, Math.random() * 6 + 2,
            (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8,
            40 + Math.random() * 20, type
        ));
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);

function gameLoop() {
    ctx.fillStyle = '#ffdeeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    if (shakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        shakeTime--;
    }

    backgrounds.forEach(bg => {
        if (gameState === PLAYING) bg.update();
        bg.draw();
    });

    if (gameState === PLAYING) {
        player.update();

        if (activeConfig.sparkleOverload && Math.random() < 0.1) {
             createGlitterBurst(Math.random() * canvas.width, Math.random() * canvas.height, '#fff', 1);
        }

        if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 450) {
            obstacles.push(new FashionPillar(canvas.width));
            if (Math.random() < 0.15) {
                powerUps.push(new GlitterStar(canvas.width + 250, Math.random() * (canvas.height - 300) + 150));
            }
        }

        obstacles.forEach((p, index) => {
            p.update();
            p.draw();
            if (p.collides(player)) gameOver();
            if (!p.passed && p.x + p.width < player.x) {
                p.passed = true;
                score++;
                createGlitterBurst(player.x + 50, player.y, '#ffd700', 5);
            }
        });
        obstacles = obstacles.filter(p => p.x + p.width > -100);

        powerUps.forEach((pu, index) => {
            pu.update();
            pu.draw();
            let dx = pu.x - player.x;
            let dy = pu.y - player.y;
            if (Math.sqrt(dx*dx + dy*dy) < pu.radius + player.radius) {
                player.invincible = 300;
                powerUps.splice(index, 1);
                createGlitterBurst(player.x, player.y, '#fff', 20);
            }
        });
        powerUps = powerUps.filter(pu => pu.x > -50);

        // Score UI
        ctx.fillStyle = '#ff1493';
        ctx.font = '700 50px Montserrat';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillText(score, canvas.width / 2, 80);
        ctx.shadowBlur = 0;

        if (player.invincible > 0) {
            ctx.fillStyle = '#ff69b4';
            ctx.font = '700 20px Montserrat';
            ctx.fillText(`GLAMOUR POWER: ${(player.invincible/60).toFixed(1)}s`, canvas.width / 2, 120);
        }
    }

    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(index, 1);
    });

    player.draw();

    if (flashTime > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashTime/10})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashTime--;
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Glam Error:', msg, 'at', lineNo, ':', columnNo);
    return false;
};

init();