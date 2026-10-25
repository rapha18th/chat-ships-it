import { BASE, type Mod } from '../../../packages/core/src/catalog.ts';
import { ORIGINAL, outcome, type GameDefinition } from '../../../packages/core/src/blueprint.ts';
import { canvasPoint } from '../../../packages/core/src/controls.ts';
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
  private treasures: Entity[] = [];
  private definition: GameDefinition = { ...ORIGINAL };
  private revision = -1;
  private elapsed = 0;
  private won = false;
  private lootClock = 0;
  private pickupClock = 0;
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
      if (this.dead || this.won) {
        this.restart();
        return;
      }
      canvas.setPointerCapture(e.pointerId);
      const r = canvas.getBoundingClientRect();
      this.pointer = canvasPoint(e.clientX, e.clientY, r, this.w, this.h);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.buttons) {
        const r = canvas.getBoundingClientRect();
        this.pointer = canvasPoint(e.clientX, e.clientY, r, this.w, this.h);
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
  setDefinition(definition: GameDefinition | null, revision: number) {
    if (this.revision === revision) return;
    this.definition = definition || { ...ORIGINAL };
    this.revision = revision;
    this.restart();
  }
  restart() {
    this.best = Math.max(this.best, this.score);
    this.score = 0;
    this.shield = this.definition.startingHull;
    this.dead = false;
    this.won = false;
    this.elapsed = 0;
    this.spawnClock = 0;
    this.lootClock = 0;
    this.pickupClock = 0;
    this.slow = 0;
    this.pointer = null;
    this.keys.clear();
    this.pickups = [];
    this.treasures = [];
    this.particles = [];
    this.invincible = 3;
    this.ship = { x: 600, y: 350, vx: 0, vy: 0, angle: -Math.PI / 2 };
    this.rocks = [];
    this.bullets = [];
    for (let i = 0; i < (this.definition.genre === 'collector' ? 4 : 8); i++) this.spawn();
    if (this.definition.genre === 'collector') for (let i = 0; i < 8; i++) this.spawnTreasure();
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
  private spawnTreasure() {
    if (this.treasures.length < 24)
      this.treasures.push({
        x: 60 + Math.random() * 1080,
        y: 80 + Math.random() * 500,
        vx: 0,
        vy: 0,
        r: 9,
        rot: 0,
        seed: 0,
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
    if (this.canvas.getClientRects().length === 0) {
      this.last = now;
      requestAnimationFrame((t) => this.frame(t));
      return;
    }
    const started = performance.now(),
      dt = Math.min((now - this.last) / 1000 || 0.016, 0.033);
    this.last = now;
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt * 0.65);
    this.invincible = Math.max(0, this.invincible - dt);
    this.slow = Math.max(0, this.slow - dt);
    if (!document.hidden && !this.dead && !this.won) this.update(dt);
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
    this.elapsed += dt;
    this.spawnClock += time;
    this.lootClock += time;
    this.pickupClock += time;
    this.fireClock -= dt;
    if (this.spawnClock > this.definition.spawnInterval) {
      this.spawn();
      this.spawnClock = 0;
    }
    if (this.definition.genre === 'collector' && this.lootClock > 0.8) {
      this.spawnTreasure();
      this.lootClock = 0;
    }
    if (this.definition.genre !== 'shooter' && this.pickupClock > 6) {
      this.pickups.push({
        x: 60 + Math.random() * 1080,
        y: 80 + Math.random() * 500,
        vx: 0,
        vy: 0,
        r: 12,
        rot: 0,
        seed: 15,
      });
      this.pickupClock = 0;
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) s.angle -= 3.8 * dt;
    if (this.keys.has('d') || this.keys.has('arrowright')) s.angle += 3.8 * dt;
    if (this.pointer) s.angle = Math.atan2(this.pointer.y - s.y, this.pointer.x - s.x);
    if (this.autopilot) {
      const target =
        this.definition.genre === 'collector'
          ? this.treasures.reduce<Entity | undefined>(
              (best, token) =>
                !best ||
                Math.hypot(token.x - s.x, token.y - s.y) < Math.hypot(best.x - s.x, best.y - s.y)
                  ? token
                  : best,
              undefined,
            )
          : this.rocks.find((r) => !r.small) || this.rocks[0];
      if (target) s.angle = Math.atan2(target.y - s.y, target.x - s.x);
      if (this.definition.genre === 'dodger') s.angle = this.clock * 0.5;
    }
    const thrust =
      this.keys.has('w') ||
      this.keys.has('arrowup') ||
      this.pointer ||
      (this.autopilot && (this.definition.genre !== 'shooter' || Math.sin(this.clock * 0.4) > 0.4));
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
    if (speed > this.definition.playerSpeed) {
      s.vx *= this.definition.playerSpeed / speed;
      s.vy *= this.definition.playerSpeed / speed;
    }
    s.x = (s.x + s.vx * dt + this.w) % this.w;
    s.y = (s.y + s.vy * dt + this.h) % this.h;
    if (
      this.definition.genre === 'shooter' &&
      (this.keys.has(' ') || this.pointer || this.autopilot) &&
      this.fireClock <= 0
    ) {
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
    if (this.definition.genre === 'dodger') this.score += dt * 10;
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
    for (const token of this.treasures) {
      token.rot += dt * 2;
      if (m.pickup === 'magnet' && Math.hypot(token.x - s.x, token.y - s.y) < 150) {
        token.x += (s.x - token.x) * dt * 2;
        token.y += (s.y - token.y) * dt * 2;
      }
      if (Math.hypot(token.x - s.x, token.y - s.y) < 28) {
        token.hp = -1;
        this.score += 100 * m.scoreMultiplier;
        this.burst(token.x, token.y, COLORS[m.palette]);
        this.tone(740);
      }
    }
    this.treasures = this.treasures.filter((t) => t.hp !== -1);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0).slice(-240);
    const result = outcome(this.definition, this.score, this.elapsed, this.shield);
    this.won = result === 'won';
    this.dead = result === 'lost';
  }
  private draw() {
    const c = this.ctx,
      m = this.mod,
      color = COLORS[m.palette];
    c.fillStyle = { space: '#080d11', ocean: '#061f30', garden: '#10271b', neon: '#130b25' }[
      this.definition.theme
    ];
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
    if (this.definition.theme === 'ocean') {
      c.strokeStyle = '#7ddfff33';
      for (let i = 0; i < 24; i++) {
        const x = (i * 167 + Math.sin(this.clock * 0.3 + i) * 20) % 1200,
          y = 675 - ((this.clock * 15 + i * 57) % 700);
        c.beginPath();
        c.arc(x, y, 3 + (i % 5), 0, 6.29);
        c.stroke();
      }
      c.strokeStyle = '#2b8a8277';
      c.lineWidth = 3;
      for (let i = 0; i < 16; i++) {
        c.beginPath();
        c.moveTo(i * 80, 675);
        c.quadraticCurveTo(
          i * 80 + Math.sin(this.clock + i) * 25,
          620,
          i * 80 + Math.sin(this.clock * 0.6 + i) * 12,
          570 + (i % 4) * 15,
        );
        c.stroke();
      }
      c.lineWidth = 1;
    }
    if (this.definition.theme === 'garden') {
      for (let i = 0; i < 20; i++) {
        const x = i * 65,
          y = 650 + Math.sin(i) * 15;
        c.fillStyle = i % 2 ? '#ffcf6755' : '#ff91b655';
        c.beginPath();
        c.arc(x, y, 7, 0, 6.29);
        c.fill();
        c.strokeStyle = '#75b16c66';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, 675);
        c.stroke();
      }
    }
    for (const r of this.rocks) {
      c.save();
      c.translate(r.x, r.y);
      c.rotate(r.rot);
      if (m.asteroidStyle === 'duck' && r.small) {
        this.duck(c, r.r);
      } else if (
        m.asteroidStyle === 'jellyfish' ||
        (this.definition.theme === 'ocean' && m.asteroidStyle === 'rock')
      ) {
        c.fillStyle = '#8c91e34d';
        c.strokeStyle = '#b2c4ff';
        c.beginPath();
        c.arc(0, 0, r.r, Math.PI, 0);
        c.lineTo(r.r, r.r * 0.2);
        c.lineTo(-r.r, r.r * 0.2);
        c.closePath();
        c.fill();
        c.stroke();
        for (let i = -1; i <= 1; i++) {
          c.beginPath();
          c.moveTo(i * r.r * 0.6, 0);
          c.quadraticCurveTo(
            i * r.r * 0.6 + Math.sin(this.clock * 2 + r.seed) * 12,
            r.r,
            i * r.r * 0.6,
            r.r * 1.6,
          );
          c.stroke();
        }
      } else if (
        m.asteroidStyle === 'thorn' ||
        (this.definition.theme === 'garden' && m.asteroidStyle === 'rock')
      ) {
        c.fillStyle = '#5d783c';
        c.strokeStyle = '#9db461';
        c.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * 6.29,
            rad = r.r * (i % 2 ? 0.4 : 1.15);
          i
            ? c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
            : c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        c.closePath();
        c.fill();
        c.stroke();
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
    for (const token of this.treasures) {
      c.save();
      c.translate(token.x, token.y);
      c.rotate(token.rot);
      c.fillStyle = '#ffd267';
      c.shadowColor = '#ffd267';
      c.shadowBlur = 18;
      c.beginPath();
      c.moveTo(0, -11);
      c.lineTo(8, 0);
      c.lineTo(0, 11);
      c.lineTo(-8, 0);
      c.closePath();
      c.fill();
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
      if (this.definition.avatar !== 'ship') {
        this.drawAvatar(c, color);
      } else {
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
      }
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
    c.fillStyle = '#b8d0bc';
    c.font = '12px monospace';
    c.textAlign = 'center';
    c.fillText(
      `${this.definition.genre.toUpperCase()}  /  ${Math.max(0, Math.ceil(this.definition.roundSeconds - this.elapsed))}s  /  ${this.definition.genre === 'dodger' ? 'SURVIVE' : `${Math.floor(this.score)} / ${this.definition.targetScore}`}`,
      600,
      35,
    );
    if (this.dead || this.won) {
      c.fillStyle = '#080d11bb';
      c.fillRect(0, 0, this.w, this.h);
      c.textAlign = 'center';
      c.fillStyle = '#e9efdf';
      c.font = 'bold 52px sans-serif';
      c.fillText(this.won ? 'You shipped a win.' : 'One more run.', 600, 300);
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
  private drawAvatar(c: CanvasRenderingContext2D, color: string) {
    if (this.definition.avatar === 'bee') {
      c.fillStyle = '#dff8eaaa';
      for (const y of [-9, 9]) {
        c.beginPath();
        c.ellipse(-2, y, 10, 6, Math.sin(this.clock * 35) * 0.5, 0, 6.29);
        c.fill();
      }
      c.fillStyle = '#ffd267';
      c.beginPath();
      c.ellipse(0, 0, 17, 10, 0, 0, 6.29);
      c.fill();
      c.fillStyle = '#302c20';
      c.fillRect(-7, -9, 4, 18);
      c.fillRect(1, -9, 4, 18);
      c.beginPath();
      c.arc(11, -3, 2, 0, 6.29);
      c.fill();
    } else if (this.definition.avatar === 'submarine') {
      c.fillStyle = '#f7c96d';
      c.beginPath();
      c.ellipse(0, 0, 23, 12, 0, 0, 6.29);
      c.fill();
      c.fillRect(-9, -18, 12, 8);
      c.fillStyle = '#7fd9ed';
      c.beginPath();
      c.arc(8, 0, 6, 0, 6.29);
      c.fill();
      c.strokeStyle = '#e9efc2';
      c.stroke();
      c.fillStyle = '#88ac9a';
      c.fillRect(-29, -7, 6, 14);
    } else {
      c.fillStyle = color;
      c.beginPath();
      c.arc(0, 0, 14, 0, 6.29);
      c.fill();
      c.strokeStyle = '#fff';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(21, 0);
      c.stroke();
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
