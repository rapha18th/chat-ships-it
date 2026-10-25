import { BASE, type Mod } from '../../../packages/core/src/catalog.ts';
type Entity = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  seed: number;
  small?: boolean;
  hp?: number;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
export const COLORS = {
  mint: '#b9f879',
  violet: '#b79aff',
  amber: '#ffd267',
  rose: '#ff819e',
  ice: '#8beaff',
};
export class Game {
  private ctx: CanvasRenderingContext2D;
  private w = 1200;
  private h = 675;
  private ship = { x: 600, y: 350, vx: 0, vy: 0, angle: -Math.PI / 2 };
  private rocks: Entity[] = [];
  private bullets: Entity[] = [];
  private pickups: Entity[] = [];
  private particles: Particle[] = [];
  private keys = new Set<string>();
  private stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * 1200,
    y: Math.random() * 675,
    r: Math.random() * 1.2 + 0.3,
    a: Math.random() * 0.5 + 0.1,
  }));
  private last = 0;
  private clock = 0;
  private spawnClock = 0;
  private fireClock = 0;
  private slow = 0;
  private shield = 3;
  private invincible = 0;
  private score = 0;
  private best = 0;
  private dead = false;
  private mod: Mod = { ...BASE };
  private flash = 0;
  private pointer: { x: number; y: number } | null = null;
  public muted = true;
  public autopilot = true;
  private audio: AudioContext | null = null;
  public frames = 0;
  public frameMs = 0;
  constructor(
    private canvas: HTMLCanvasElement,
    private onStats: (score: number, shield: number, fps: number) => void,
  ) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = this.w;
    canvas.height = this.h;
    const active = () => document.activeElement === canvas;
    window.addEventListener('keydown', (e) => {
      if (!active()) return;
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)
      ) {
        e.preventDefault();
        this.keys.add(e.key.toLowerCase());
      }
      if (e.key.toLowerCase() === 'r') this.restart();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('focus', () => {
      this.autopilot = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      canvas.focus();
      if (this.dead) {
        this.restart();
        return;
      }
      canvas.setPointerCapture(e.pointerId);
      const r = canvas.getBoundingClientRect();
      this.pointer = {
        x: ((e.clientX - r.left) / r.width) * this.w,
        y: ((e.clientY - r.top) / r.height) * this.h,
      };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.buttons) {
        const r = canvas.getBoundingClientRect();
        this.pointer = {
          x: ((e.clientX - r.left) / r.width) * this.w,
          y: ((e.clientY - r.top) / r.height) * this.h,
        };
      }
    });
    const release = () => (this.pointer = null);
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    for (let i = 0; i < 8; i++) this.spawn();
    requestAnimationFrame((t) => this.frame(t));
  }
  setMod(mod: Mod) {
    if (JSON.stringify(this.mod) !== JSON.stringify(mod)) {
      this.mod = mod;
      this.flash = 1;
      this.rocks = this.rocks.slice(0, 40);
    }
  }
  restart() {
    this.best = Math.max(this.best, this.score);
    this.score = 0;
    this.shield = 3;
    this.dead = false;
    this.invincible = 3;
    this.ship = { x: 600, y: 350, vx: 0, vy: 0, angle: -Math.PI / 2 };
    this.rocks = [];
    this.bullets = [];
    for (let i = 0; i < 8; i++) this.spawn();
  }
  private tone(freq: number) {
    if (this.muted) return;
    try {
      this.audio ??= new AudioContext();
      const oscillator = this.audio.createOscillator(),
        gain = this.audio.createGain();
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.025, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.07);
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.start();
      oscillator.stop(this.audio.currentTime + 0.08);
    } catch {}
  }
  private spawn() {
    if (this.rocks.length >= 80) return;
    const a = Math.random() * Math.PI * 2;
    this.rocks.push({
      x: 600 + Math.cos(a) * 660,
      y: 337 + Math.sin(a) * 400,
      vx: -Math.cos(a) * (25 + Math.random() * 35),
      vy: -Math.sin(a) * (25 + Math.random() * 35),
      r: 18 + Math.random() * 23,
      rot: Math.random() * 6,
      seed: Math.random() * 100,
    });
  }
  private burst(x: number, y: number, color: string, count = 14) {
    for (let i = 0; i < count && this.particles.length < 240; i++) {
      const a = Math.random() * Math.PI * 2,
        s = Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.5,
        color,
      });
    }
  }
  private frame(now: number) {
    const started = performance.now(),
      dt = Math.min((now - this.last) / 1000 || 0.016, 0.033);
    this.last = now;
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt * 0.65);
    this.invincible = Math.max(0, this.invincible - dt);
    this.slow = Math.max(0, this.slow - dt);
    if (!document.hidden && !this.dead) this.update(dt);
    this.draw();
    this.frameMs = performance.now() - started;
    this.frames++;
    if (this.frames % 30 === 0)
      this.onStats(Math.floor(this.score), this.shield, Math.min(60, Math.round(1 / dt)));
    requestAnimationFrame((t) => this.frame(t));
  }
  private update(dt: number) {
    const s = this.ship,
      m = this.mod,
      time = dt * (this.slow > 0 ? 0.35 : 1);
    this.spawnClock += time;
    this.fireClock -= dt;
    if (this.spawnClock > 1.7) {
      this.spawn();
      this.spawnClock = 0;
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) s.angle -= 3.8 * dt;
    if (this.keys.has('d') || this.keys.has('arrowright')) s.angle += 3.8 * dt;
    if (this.pointer) s.angle = Math.atan2(this.pointer.y - s.y, this.pointer.x - s.x);
    if (this.autopilot) {
      const target = this.rocks.find((r) => !r.small) || this.rocks[0];
      if (target) s.angle = Math.atan2(target.y - s.y, target.x - s.x);
    }
    const thrust =
      this.keys.has('w') ||
      this.keys.has('arrowup') ||
      this.pointer ||
      (this.autopilot && Math.sin(this.clock * 0.4) > 0.4);
    if (thrust) {
      s.vx += Math.cos(s.angle) * 190 * dt;
      s.vy += Math.sin(s.angle) * 190 * dt;
      if (Math.random() > 0.3) {
        const color =
          m.trail === 'rainbow' ? `hsl(${(this.clock * 130) % 360},90%,70%)` : COLORS[m.palette];
        this.particles.push({
          x: s.x - Math.cos(s.angle) * 15,
          y: s.y - Math.sin(s.angle) * 15,
          vx: -Math.cos(s.angle) * 60 + (Math.random() - 0.5) * 40,
          vy: -Math.sin(s.angle) * 60 + (Math.random() - 0.5) * 40,
          life: 0.35,
          color,
        });
      }
    }
    const sign = m.gravityFlipSeconds && Math.floor(this.clock / m.gravityFlipSeconds) % 2 ? -1 : 1;
    s.vx += (600 - s.x) * m.gravity * sign * 0.016 * dt;
    s.vy += (337 - s.y) * m.gravity * sign * 0.016 * dt;
    s.vx *= 0.997;
    s.vy *= 0.997;
    const speed = Math.hypot(s.vx, s.vy);
    if (speed > 240) {
      s.vx *= 240 / speed;
      s.vy *= 240 / speed;
    }
    s.x = (s.x + s.vx * dt + this.w) % this.w;
    s.y = (s.y + s.vy * dt + this.h) % this.h;
    if ((this.keys.has(' ') || this.pointer || this.autopilot) && this.fireClock <= 0) {
      this.fireClock = 0.16;
      this.bullets.push({
        x: s.x + Math.cos(s.angle) * 18,
        y: s.y + Math.sin(s.angle) * 18,
        vx: Math.cos(s.angle) * 550 + s.vx,
        vy: Math.sin(s.angle) * 550 + s.vy,
        r: 3,
        rot: 0,
        seed: 1.4,
      });
      this.tone(480);
    }
    this.score += dt * 2;
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.seed -= dt;
    }
    this.bullets = this.bullets
      .filter((b) => b.seed > 0 && b.x > -10 && b.y > -10 && b.x < this.w + 10 && b.y < this.h + 10)
      .slice(-80);
    const children: Entity[] = [];
    for (const rock of this.rocks) {
      rock.x += rock.vx * time * m.asteroidSpeed;
      rock.y += rock.vy * time * m.asteroidSpeed;
      rock.rot += time * 0.2;
      if (rock.x < -80) rock.x = this.w + 60;
      if (rock.x > this.w + 80) rock.x = -60;
      if (rock.y < -80) rock.y = this.h + 60;
      if (rock.y > this.h + 80) rock.y = -60;
      const hit = this.bullets.find(
        (b) => b.seed > 0 && Math.hypot(b.x - rock.x, b.y - rock.y) < rock.r + 4,
      );
      if (hit) {
        hit.seed = 0;
        rock.hp = -1;
        this.score += (rock.small ? 35 : 100) * m.scoreMultiplier;
        this.burst(rock.x, rock.y, COLORS[m.palette]);
        this.tone(180);
        if (!rock.small)
          for (let i = 0; i < m.splitCount && children.length + this.rocks.length < 96; i++) {
            const a = (i * 6.28) / m.splitCount;
            children.push({
              ...rock,
              r: 10,
              small: true,
              hp: 1,
              vx: Math.cos(a) * 95,
              vy: Math.sin(a) * 95,
            });
          }
        if (!rock.small && Math.random() < 0.22)
          this.pickups.push({ x: rock.x, y: rock.y, vx: 0, vy: 0, r: 12, rot: 0, seed: 12 });
      }
      if (
        !this.autopilot &&
        this.invincible <= 0 &&
        Math.hypot(s.x - rock.x, s.y - rock.y) < rock.r + 9
      ) {
        this.shield--;
        this.invincible = 2;
        this.burst(s.x, s.y, '#ff819e', 30);
        this.tone(90);
        if (this.shield <= 0) {
          this.dead = true;
          this.best = Math.max(this.best, this.score);
        }
      }
    }
    this.rocks = this.rocks
      .filter((r) => r.hp !== -1)
      .concat(children)
      .slice(0, 96);
    for (const p of this.pickups) {
      p.seed -= time;
      p.rot += dt * 2;
      if (m.pickup === 'magnet') {
        p.x += (s.x - p.x) * dt * 2;
        p.y += (s.y - p.y) * dt * 2;
      }
      if (Math.hypot(s.x - p.x, s.y - p.y) < 28) {
        p.seed = 0;
        if (m.pickup === 'slowmo') this.slow = 5;
        else this.shield = Math.min(5, this.shield + 1);
        this.burst(p.x, p.y, '#8beaff');
        this.tone(740);
      }
    }
    this.pickups = this.pickups.filter((p) => p.seed > 0).slice(-12);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0).slice(-240);
  }
  private draw() {
    const c = this.ctx,
      m = this.mod,
      color = COLORS[m.palette];
    c.fillStyle = '#080d11';
    c.fillRect(0, 0, this.w, this.h);
    const neb = c.createRadialGradient(650, 330, 0, 650, 330, 620);
    neb.addColorStop(0, m.palette === 'violet' ? '#241a3d88' : '#17302855');
    neb.addColorStop(1, '#080d1100');
    c.fillStyle = neb;
    c.fillRect(0, 0, this.w, this.h);
    c.strokeStyle = '#a3c9b010';
    c.lineWidth = 1;
    for (let x = 0; x < this.w; x += 60) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, this.h);
      c.stroke();
    }
    for (let y = 0; y < this.h; y += 60) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(this.w, y);
      c.stroke();
    }
    for (const star of this.stars) {
      c.globalAlpha = star.a + Math.sin(this.clock * 0.6 + star.x) * 0.1;
      c.fillStyle = '#d8e8df';
      c.fillRect(star.x, star.y, star.r, star.r);
    }
    c.globalAlpha = 1;
    c.save();
    c.translate(600, 337);
    c.rotate(this.clock * 0.025);
    c.setLineDash([3, 12]);
    c.strokeStyle = '#b9f87922';
    for (const r of [90, 170, 280]) {
      c.beginPath();
      c.ellipse(0, 0, r, r * 0.55, 0, 0, 6.29);
      c.stroke();
    }
    c.setLineDash([]);
    const core = c.createRadialGradient(0, 0, 0, 0, 0, 60);
    core.addColorStop(0, '#b9f87915');
    core.addColorStop(1, '#b9f87900');
    c.fillStyle = core;
    c.beginPath();
    c.arc(0, 0, 60, 0, 6.29);
    c.fill();
    c.restore();
    for (const r of this.rocks) {
      c.save();
      c.translate(r.x, r.y);
      c.rotate(r.rot);
      if (m.asteroidStyle === 'duck' && r.small) {
        this.duck(c, r.r);
      } else if (m.asteroidStyle === 'heart') {
        c.fillStyle = '#ff819e';
        c.font = `${r.r * 2}px sans-serif`;
        c.textAlign = 'center';
        c.fillText('♥', 0, r.r * 0.7);
      } else {
        c.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * 6.283,
            rad = r.r * (0.8 + 0.2 * Math.sin(i * 7 + r.seed));
          const x = Math.cos(a) * rad,
            y = Math.sin(a) * rad;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
        c.fillStyle =
          m.asteroidStyle === 'disco'
            ? `hsl(${(r.seed * 20 + this.clock * 70) % 360},35%,22%)`
            : '#192326';
        c.fill();
        c.strokeStyle = m.asteroidStyle === 'disco' ? color : '#596c6d';
        c.lineWidth = 1.4;
        c.stroke();
        c.beginPath();
        c.moveTo(-r.r * 0.4, -r.r * 0.1);
        c.lineTo(r.r * 0.1, r.r * 0.3);
        c.lineTo(r.r * 0.6, -r.r * 0.25);
        c.strokeStyle = '#71898a44';
        c.stroke();
      }
      c.restore();
    }
    for (const p of this.pickups) {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.strokeStyle = '#8beaff';
      c.shadowColor = '#8beaff';
      c.shadowBlur = 14;
      c.strokeRect(-8, -8, 16, 16);
      c.restore();
    }
    c.shadowBlur = 12;
    c.shadowColor = color;
    c.fillStyle = color;
    for (const b of this.bullets) {
      c.beginPath();
      c.arc(b.x, b.y, 2.5, 0, 6.29);
      c.fill();
    }
    c.shadowBlur = 0;
    for (const p of this.particles) {
      c.globalAlpha = Math.min(p.life * 2, 1);
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, 3, 3);
    }
    c.globalAlpha = 1;
    if (!this.dead) {
      c.save();
      c.translate(this.ship.x, this.ship.y);
      c.rotate(this.ship.angle);
      c.globalAlpha = this.invincible > 0 ? 0.45 + Math.sin(this.clock * 25) * 0.3 : 1;
      c.shadowColor = color;
      c.shadowBlur = 18;
      c.beginPath();
      c.moveTo(20, 0);
      c.lineTo(-12, -11);
      c.lineTo(-7, 0);
      c.lineTo(-12, 11);
      c.closePath();
      c.fillStyle = '#d7f9df';
      c.fill();
      c.strokeStyle = color;
      c.stroke();
      c.shadowBlur = 0;
      c.restore();
    }
    if (this.slow > 0) {
      c.fillStyle = '#8beaff';
      c.font = '12px monospace';
      c.textAlign = 'center';
      c.fillText(`BULLET TIME  ${this.slow.toFixed(1)}s`, 600, 80);
    }
    if (this.flash > 0) {
      c.fillStyle = `rgba(185,248,121,${this.flash * 0.12})`;
      c.fillRect(0, 0, this.w, this.h);
    }
    if (this.dead) {
      c.fillStyle = '#080d11bb';
      c.fillRect(0, 0, this.w, this.h);
      c.textAlign = 'center';
      c.fillStyle = '#e9efdf';
      c.font = 'bold 52px sans-serif';
      c.fillText('One more run.', 600, 300);
      c.fillStyle = color;
      c.font = '18px monospace';
      c.fillText(
        `${Math.floor(this.score).toLocaleString()} POINTS  /  BEST ${Math.floor(this.best).toLocaleString()}`,
        600,
        347,
      );
      c.fillStyle = '#9eaaa4';
      c.font = '14px monospace';
      c.fillText('PRESS R OR CLICK TO RESTART', 600, 395);
    }
  }
  private duck(c: CanvasRenderingContext2D, r: number) {
    c.fillStyle = '#ffd45f';
    c.beginPath();
    c.ellipse(0, 2, r, r * 0.65, 0, 0, 6.29);
    c.fill();
    c.beginPath();
    c.arc(r * 0.45, -r * 0.6, r * 0.55, 0, 6.29);
    c.fill();
    c.fillStyle = '#ff9547';
    c.fillRect(r * 0.8, -r * 0.6, r * 0.6, 3);
    c.fillStyle = '#202619';
    c.beginPath();
    c.arc(r * 0.6, -r * 0.75, 1.4, 0, 6.29);
    c.fill();
  }
}
