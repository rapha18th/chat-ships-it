import { randomUUID } from 'node:crypto';
import type { GameDefinition } from '../../../packages/core/src/blueprint.ts';
import { BASE, type Mod } from '../../../packages/core/src/catalog.ts';
import type { HiveState, HivePlayer, HiveEntity } from '../../../packages/core/src/hive.ts';

type Pilot = HivePlayer & {
  dx: number;
  dy: number;
  inputAt: number;
  invincible: number;
  revive: number;
  magnet: number;
  lastSequence: number;
};
type Hazard = HiveEntity & { vx: number; vy: number };
const colors = ['#ffd267', '#b79aff', '#8beaff', '#ff819e', '#b9f879', '#ffac76'];
export class Hive {
  readonly room = randomUUID().slice(0, 8);
  private pilots = new Map<string, Pilot>();
  private game: GameDefinition | null = null;
  private revision = -1;
  private rules: Mod = { ...BASE };
  private nectar: HiveEntity[] = [];
  private hazards: Hazard[] = [];
  private pickups: (HiveEntity & { kind: string })[] = [];
  private phase: HiveState['phase'] = 'waiting';
  private score = 0;
  private elapsed = 0;
  private target = 1200;
  private round = 0;
  private tick = 0;
  private entityId = 0;
  private spawnClock = 0;
  private pickupClock = 0;
  private slow = 0;
  constructor(private random = Math.random) {}
  private enabled() {
    return (
      this.game?.genre === 'collector' && this.game.theme === 'garden' && this.game.avatar === 'bee'
    );
  }
  sync(game: GameDefinition | null, revision: number, rules: Mod) {
    const changed = this.revision !== revision;
    this.game = game;
    this.rules = { ...rules };
    if (changed) {
      this.revision = revision;
      this.reset();
    }
  }
  join(name: string) {
    name = name.trim();
    if (!this.enabled())
      throw new Error('The owner must publish a garden collection game with a bee first.');
    if (this.pilots.size >= 24)
      throw new Error('The garden is full. Watch this round and join the next one.');
    if (!/^[A-Za-z0-9 _-]{2,18}$/.test(name))
      throw new Error('Use 2 to 18 letters, numbers, spaces, underscores or hyphens.');
    const id = randomUUID(),
      n = this.pilots.size;
    this.pilots.set(id, {
      id,
      name: name.trim(),
      x: 600 + ((n * 25) % 250),
      y: 337,
      vx: 0,
      vy: 0,
      hull: this.game!.startingHull,
      points: 0,
      color: colors[n % colors.length],
      protected: true,
      dx: 0,
      dy: 0,
      inputAt: -100,
      invincible: 3,
      revive: 0,
      magnet: 0,
      lastSequence: -1,
    });
    return id;
  }
  leave(id: string) {
    this.pilots.delete(id);
  }
  pause() {
    this.phase = 'waiting';
  }
  input(id: string, dx: number, dy: number, sequence: number) {
    const p = this.pilots.get(id);
    if (
      !p ||
      !Number.isFinite(dx) ||
      !Number.isFinite(dy) ||
      !Number.isSafeInteger(sequence) ||
      sequence <= p.lastSequence
    )
      return;
    const length = Math.max(1, Math.hypot(dx, dy));
    p.dx = dx / length;
    p.dy = dy / length;
    p.inputAt = this.elapsed;
    p.lastSequence = sequence;
  }
  start() {
    if (!this.enabled())
      throw new Error('Publish a garden collection game with a bee to open the shared garden.');
    if (!this.pilots.size) throw new Error('Invite at least one bee before starting.');
    this.reset();
    this.phase = 'playing';
    this.round++;
    this.target = this.game!.targetScore * this.pilots.size;
  }
  private reset() {
    this.phase = 'waiting';
    this.score = 0;
    this.elapsed = 0;
    this.spawnClock = 0;
    this.pickupClock = 0;
    this.slow = 0;
    this.nectar = [];
    this.hazards = [];
    this.pickups = [];
    this.target = this.game?.targetScore || 1200;
    for (const p of this.pilots.values()) {
      p.points = 0;
      p.hull = this.game?.startingHull || 3;
      p.invincible = 3;
      p.revive = 0;
      p.magnet = 0;
      p.dx = 0;
      p.dy = 0;
      p.vx = 0;
      p.vy = 0;
    }
    for (let i = 0; i < 18; i++) this.spawnNectar();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      this.hazards.push({
        id: ++this.entityId,
        x: 600 + Math.cos(a) * 480,
        y: 337 + Math.sin(a) * 250,
        r: 19 + this.random() * 12,
        vx: -Math.sin(a) * 40,
        vy: Math.cos(a) * 35,
      });
    }
  }
  private spawnNectar() {
    if (this.nectar.length < 36)
      this.nectar.push({
        id: ++this.entityId,
        x: 45 + this.random() * 1110,
        y: 65 + this.random() * 545,
        r: 9,
      });
  }
  step(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    const dt = Math.min(delta, 0.05);
    this.tick++;
    if (this.phase !== 'playing') return;
    // Empty gardens pause. A lost connection cannot silently consume the round.
    if (!this.pilots.size) return;
    this.elapsed += dt;
    this.spawnClock += dt;
    this.pickupClock += dt;
    this.slow = Math.max(0, this.slow - dt);
    if (this.spawnClock > 0.6) {
      this.spawnClock = 0;
      this.spawnNectar();
    }
    if (this.pickupClock > 7 && this.pickups.length < 5) {
      this.pickupClock = 0;
      this.pickups.push({
        id: ++this.entityId,
        x: 80 + this.random() * 1040,
        y: 90 + this.random() * 495,
        r: 14,
        kind: this.rules.pickup,
      });
    }
    const speed = this.rules.asteroidSpeed * (this.slow > 0 ? 0.35 : 1);
    for (const h of this.hazards) {
      h.x = (h.x + h.vx * speed * dt + 1200) % 1200;
      h.y = (h.y + h.vy * speed * dt + 675) % 675;
    }
    for (const p of this.pilots.values()) {
      p.invincible = Math.max(0, p.invincible - dt);
      p.magnet = Math.max(0, p.magnet - dt);
      if (p.revive > 0) {
        p.revive -= dt;
        if (p.revive <= 0) {
          p.hull = this.game!.startingHull;
          p.x = 600;
          p.y = 337;
          p.invincible = 3;
        }
        continue;
      }
      const moving = this.elapsed - p.inputAt < 0.35;
      const flip =
        this.rules.gravityFlipSeconds &&
        Math.floor(this.elapsed / this.rules.gravityFlipSeconds) % 2
          ? -1
          : 1;
      const gravity = this.rules.gravity * flip;
      p.vx = (moving ? p.dx : 0) * this.game!.playerSpeed + (600 - p.x) * gravity * 0.016;
      p.vy = (moving ? p.dy : 0) * this.game!.playerSpeed + (337 - p.y) * gravity * 0.016;
      const cap = Math.max(1, Math.hypot(p.vx, p.vy) / this.game!.playerSpeed);
      p.vx /= cap;
      p.vy /= cap;
      p.x = Math.max(18, Math.min(1182, p.x + p.vx * dt));
      p.y = Math.max(45, Math.min(650, p.y + p.vy * dt));
      for (let i = this.nectar.length - 1; i >= 0; i--) {
        const n = this.nectar[i],
          dist = Math.hypot(n.x - p.x, n.y - p.y);
        if (dist < (p.magnet > 0 ? 110 : 25)) {
          const points = 100 * this.rules.scoreMultiplier;
          p.points += points;
          this.score += points;
          this.nectar.splice(i, 1);
        }
      }
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const n = this.pickups[i];
        if (Math.hypot(n.x - p.x, n.y - p.y) < 29) {
          if (n.kind === 'shield') p.invincible = 6;
          if (n.kind === 'magnet') p.magnet = 7;
          if (n.kind === 'slow') this.slow = 5;
          this.pickups.splice(i, 1);
        }
      }
      if (
        p.invincible <= 0 &&
        this.hazards.some((h) => Math.hypot(h.x - p.x, h.y - p.y) < h.r + 13)
      ) {
        p.hull--;
        p.invincible = 2;
        if (p.hull <= 0) {
          p.revive = 3;
          p.vx = 0;
          p.vy = 0;
        }
      }
      p.protected = p.invincible > 0;
    }
    if (this.score >= this.target) this.phase = 'won';
    else if (this.elapsed >= this.game!.roundSeconds) this.phase = 'lost';
  }
  snapshot(): HiveState {
    return {
      enabled: this.enabled(),
      room: this.room,
      round: this.round,
      tick: this.tick,
      phase: this.phase,
      remaining: Math.max(0, (this.game?.roundSeconds || 60) - this.elapsed),
      score: this.score,
      target: this.target,
      title: this.game?.title || 'Community garden',
      players: [...this.pilots.values()].map(
        ({ id, name, x, y, vx, vy, hull, points, color, protected: shield }) => ({
          id,
          name,
          x,
          y,
          vx,
          vy,
          hull,
          points,
          color,
          protected: shield,
        }),
      ),
      nectar: this.nectar.map((n) => ({ ...n })),
      hazards: this.hazards.map(({ id, x, y, r }) => ({ id, x, y, r })),
      pickups: this.pickups.map((n) => ({ ...n })),
      rules: { ...this.rules },
    };
  }
}
