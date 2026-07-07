/*=====================================================
    ZNW PLATFORM
    HERO ENGINE v1.0 (полный)
=====================================================*/

const canvas = document.getElementById("heroCanvas");
const ctx = canvas.getContext("2d");
let width, height;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/*=====================================================
DATA LINES
=====================================================*/

class DataLine {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.length = 80 + Math.random() * 220;
        this.speed = 0.5 + Math.random() * 2;
        this.alpha = 0.15 + Math.random() * 0.4;
        this.size = 1 + Math.random() * 2;
        this.angle = Math.random() * Math.PI * 2;
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x > width + 100 || this.x < -100 || this.y > height + 100 || this.y < -100) {
            this.reset();
        }
    }
    draw() {
        const x2 = this.x + Math.cos(this.angle) * this.length;
        const y2 = this.y + Math.sin(this.angle) * this.length;
        const g = ctx.createLinearGradient(this.x, this.y, x2, y2);
        g.addColorStop(0, `rgba(0,212,255,0)`);
        g.addColorStop(0.5, `rgba(0,212,255,${this.alpha})`);
        g.addColorStop(1, `rgba(0,255,170,0)`);
        ctx.beginPath();
        ctx.strokeStyle = g;
        ctx.lineWidth = this.size;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

const lines = [];
for (let i = 0; i < 120; i++) {
    lines.push(new DataLine());
}

/*=====================================================
DIGITAL NODES
=====================================================*/

class Node {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = 2 + Math.random() * 3;
        this.speed = 0.2 + Math.random();
        this.dir = Math.random() * 6.28;
    }
    update() {
        this.x += Math.cos(this.dir) * this.speed;
        this.y += Math.sin(this.dir) * this.speed;
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,212,255,.75)";
        ctx.fill();
    }
}

const nodes = [];
for (let i = 0; i < 180; i++) {
    nodes.push(new Node());
}

/*=====================================================
CONNECTIONS
=====================================================*/

function connectNodes() {
    for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
            const dx = nodes[a].x - nodes[b].x;
            const dy = nodes[a].y - nodes[b].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.beginPath();
                ctx.strokeStyle = "rgba(0,212,255," + (1 - dist / 120) * 0.15 + ")";
                ctx.lineWidth = 1;
                ctx.moveTo(nodes[a].x, nodes[a].y);
                ctx.lineTo(nodes[b].x, nodes[b].y);
                ctx.stroke();
            }
        }
    }
}

/*=====================================================
BACKGROUND
=====================================================*/

function drawBackground() {
    ctx.fillStyle = "rgba(5,12,22,.08)";
    ctx.fillRect(0, 0, width, height);
}

/*=====================================================
MOUSE PARALLAX
=====================================================*/

let mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
};

window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

/*=====================================================
ENERGY PULSE
=====================================================*/

class Pulse {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = 5;
        this.max = 120 + Math.random() * 180;
        this.speed = 1.2 + Math.random();
        this.alpha = .45;
    }
    update() {
        this.radius += this.speed;
        this.alpha -= 0.003;
        if (this.alpha <= 0) {
            this.reset();
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,212,255," + this.alpha + ")";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

const pulses = [];
for (let i = 0; i < 10; i++) {
    pulses.push(new Pulse());
}

/*=====================================================
CURSOR LIGHT
=====================================================*/

function drawCursor() {
    const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
    gradient.addColorStop(0, "rgba(0,212,255,.25)");
    gradient.addColorStop(.4, "rgba(0,212,255,.08)");
    gradient.addColorStop(1, "rgba(0,212,255,0)");
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(mouse.x, mouse.y, 220, 0, Math.PI * 2);
    ctx.fill();
}

/*=====================================================
HOLOGRAM RINGS
=====================================================*/

let hologramAngle = 0;

function drawHologram() {
    hologramAngle += 0.01;
    ctx.save();
    ctx.translate(width * 0.75, height * 0.5);
    ctx.rotate(hologramAngle);
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,255,255," + (0.08 + i * 0.03) + ")";
        ctx.lineWidth = 2;
        ctx.arc(0, 0, 80 + i * 40, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

/*=====================================================
LIGHT BEAMS
=====================================================*/

class Beam {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.speed = 2 + Math.random() * 4;
        this.alpha = .05 + Math.random() * 0.08;
        this.width = 1 + Math.random() * 3;
    }
    update() {
        this.x += this.speed;
        if (this.x > width + 300) {
            this.x = -300;
        }
    }
    draw() {
        const g = ctx.createLinearGradient(this.x, 0, this.x + 300, 0);
        g.addColorStop(0, "rgba(0,212,255,0)");
        g.addColorStop(.5, "rgba(0,212,255," + this.alpha + ")");
        g.addColorStop(1, "rgba(0,212,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(this.x, 0, 300, height);
    }
}

const beams = [];
for (let i = 0; i < 8; i++) {
    beams.push(new Beam());
}

/*=====================================================
MAIN LOOP
=====================================================*/

function animate() {
    requestAnimationFrame(animate);
    drawBackground();

    beams.forEach(b => {
        b.update();
        b.draw();
    });

    lines.forEach(line => {
        line.update();
        line.draw();
    });

    nodes.forEach(node => {
        node.update();
        node.draw();
    });

    connectNodes();

    pulses.forEach(p => {
        p.update();
        p.draw();
    });

    drawHologram();
    drawCursor();
}

animate();

console.log("ZNW HERO ENGINE INITIALIZED");