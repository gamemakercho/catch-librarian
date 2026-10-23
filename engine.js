import { CONFIG } from './config.js';
export const WORLD = Object.freeze({ width: 960, height: 500, floor: 415, catX: 240, librarianX: 780 });
export const normalizeAnswer = value => value.normalize('NFC').replace(/[\s!.！。．]/gu, '');
const acceptedAnswer = String.fromCodePoint(44256,50577,51060,50752,32,49324,49436,44032,32,46028,50500,50772,45796);
export const isCorrectAnswer = value => normalizeAnswer(value) === normalizeAnswer(acceptedAnswer);
export class Chase {
 constructor(config = CONFIG) { this.config = config; this.reset(); }
 reset() { this.state = 'ready'; this.elapsed = 0; this.health = this.config.health; this.y = 0; this.vy = 0; this.jumps = 2; this.invincible = 0; this.obstacles = []; this.spawnAt = this.config.warmup; this.serial = 0; this.distance = 0; this.recoil = 0; this.hits = 0; }
 start() { this.reset(); this.state = 'playing'; }
 jump() { if (this.state !== 'playing' || this.jumps === 0) return false; this.vy = this.jumps === 2 ? this.config.jumpForce : this.config.doubleJumpForce; this.jumps--; return true; }
 spawn() {
  const kinds = ['stack', 'high', 'basket', 'low', 'stack', 'basket', 'high'];
  const kind = kinds[this.serial % kinds.length];
  this.obstacles.push({ id: this.serial++, kind, x: WORLD.librarianX - 50, w: kind === 'basket' ? 62 : 48, h: kind === 'high' || kind === 'low' ? 25 : kind === 'basket' ? 45 : 53, lift: kind === 'high' ? 128 : kind === 'low' ? 32 : 0, hit: false });
  this.recoil = .25;
 }
 hit(obstacle) { if (this.state !== 'playing' || this.invincible > 0 || obstacle.hit) return false; obstacle.hit = true; this.health--; this.hits++; this.invincible = this.config.invincibility; if (this.health <= 0) this.state = 'failed'; return true; }
 update(dt) {
  if (this.state !== 'playing') return;
  let left = Math.min(dt, .1);
  while (left > 0 && this.state === 'playing') { const step = Math.min(left, 1 / 120); this.step(step); left -= step; }
 }
 step(dt) {
  this.elapsed = Math.min(this.config.duration, this.elapsed + dt);
  this.invincible = Math.max(0, this.invincible - dt); this.recoil = Math.max(0, this.recoil - dt);
  const speed = this.config.runSpeed + this.config.speedIncrease * (this.elapsed / this.config.duration);
  this.distance += speed * dt;
  this.vy -= this.config.gravity * dt; this.y += this.vy * dt;
  if (this.y <= 0) { this.y = 0; this.vy = 0; this.jumps = 2; }
  if (this.elapsed >= this.config.duration) { this.state = 'comic'; return; }
  if (this.elapsed >= this.spawnAt) {
   this.spawn();
   // Gap exceeds a full double-jump flight + recovery. All hazards share speed.
   this.spawnAt = this.elapsed + Math.max(this.config.minimumInterval, this.config.obstacleInterval - .4 * this.elapsed / this.config.duration);
  }
  const cat = { x: WORLD.catX - 24, y: WORLD.floor - this.y - this.config.catHeight * .72, w: 48, h: this.config.catHeight * .54 };
  for (const o of this.obstacles) {
   o.x -= speed * dt;
   const box = { x: o.x + 6, y: WORLD.floor - o.lift - o.h + 5, w: o.w - 12, h: o.h - 8 };
   if (cat.x < box.x + box.w && cat.x + cat.w > box.x && cat.y < box.y + box.h && cat.y + cat.h > box.y) this.hit(o);
  }
  this.obstacles = this.obstacles.filter(o => o.x + o.w > -30);
 }
}
