"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

type Vec = { x: number; y: number };
type EnemyType = "basic" | "fast" | "tank" | "shooter";
type Phase = "playing" | "paused" | "leveling" | "gameover";
type SpriteKey =
  | "player"
  | "player_hao"
  | "enemy_basic"
  | "enemy_fast"
  | "enemy_tank"
  | "enemy_shooter"
  | "bullet"
  | "enemy_bullet"
  | "exp"
  | "hao_pickup";
type SkillKey =
  | "bulletSpeed"
  | "attackRate"
  | "moveSpeed"
  | "maxHp"
  | "pickupRange"
  | "bulletCount"
  | "bigBullet"
  | "spreadBullet"
  | "splashBullet"
  | "orbitBullet"
  | "haoDuration"
  | "haoDamage"
  | "haoShockwave"
  | "haoMusic"
  | "haoPickup";
type MusicTrack = "bgm1" | "bgm2" | "bgm3" | "bgm4" | "bgm5" | "bgm6" | "bgm7" | "bgm8" | "bgm9" | "bgm10";

type Skill = { key: SkillKey; title: string; desc: string; maxLevel: number };
type SpriteAsset = { src: string; image: HTMLImageElement; processed?: HTMLCanvasElement; ready: boolean; failed: boolean };
type AudioState = {
  bgm: Partial<Record<MusicTrack, HTMLAudioElement>>;
  haoBgm?: HTMLAudioElement;
  attack?: HTMLAudioElement;
  hit?: HTMLAudioElement;
  context?: AudioContext;
  currentTrack?: MusicTrack;
  pausedTrack?: MusicTrack;
  haoBgmTime: number;
  haoBgmActive: boolean;
  fadeTimers: number[];
};

type Player = Vec & {
  hitbox: number;
  renderSize: number;
  speed: number;
  hp: number;
  maxHp: number;
  invincible: number;
  level: number;
  exp: number;
  nextExp: number;
  bulletSpeed: number;
  bulletDamage: number;
  fireCooldown: number;
  fireTimer: number;
  bulletCount: number;
  bulletScale: number;
  splashLevel: number;
  spreadLevel: number;
  orbitLevel: number;
  pickupRange: number;
  skillLevels: Partial<Record<SkillKey, number>>;
  haoModeActive: boolean;
  haoModeTimer: number;
  haoModeDuration: number;
  haoModeDamageMultiplier: number;
  haoModeSpeedMultiplier: number;
  haoModePickupMultiplier: number;
  haoShockwaveLevel: number;
  haoMusicLevel: number;
  haoPickupLevel: number;
};

type Enemy = Vec & {
  id: number;
  type: EnemyType;
  hitbox: number;
  renderSize: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  expValue: number;
  flash: number;
  shootTimer: number;
};

type Bullet = Vec & {
  id: number;
  vx: number;
  vy: number;
  angle: number;
  hitbox: number;
  renderRadius: number;
  damage: number;
  splashRadius: number;
  splashDamage: number;
  golden: boolean;
  life: number;
};

type EnemyBullet = Vec & {
  id: number;
  vx: number;
  vy: number;
  angle: number;
  hitbox: number;
  renderRadius: number;
  damage: number;
  life: number;
};

type Orb = Vec & {
  id: number;
  hitbox: number;
  renderRadius: number;
  value: number;
  pull: boolean;
};

type HaoPickup = Vec & {
  id: number;
  hitbox: number;
  renderSize: number;
  life: number;
  maxLife: number;
};

type Shockwave = Vec & {
  id: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  damage: number;
  push: number;
  hitEnemyIds: Set<number>;
};

type Particle = Vec & {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
};

type DamageText = Vec & {
  id: number;
  value: string;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

type Game = {
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  cameraX: number;
  cameraY: number;
  time: number;
  kills: number;
  enemyTimer: number;
  enemyEvery: number;
  haoPickupTimer: number;
  haoPickupEvery: number;
  screenShake: number;
  musicTier: number;
  id: number;
  phase: Phase;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  orbs: Orb[];
  haoPickups: HaoPickup[];
  shockwaves: Shockwave[];
  particles: Particle[];
  damageTexts: DamageText[];
};

type Hud = {
  level: number;
  exp: number;
  nextExp: number;
  hp: number;
  maxHp: number;
  kills: number;
  time: number;
  phase: Phase;
};

const SPRITE_SOURCES: Record<SpriteKey, string> = {
  player: "/sprites/player.png",
  player_hao: "/sprites/player_hao.png",
  enemy_basic: "/sprites/enemy_basic.png",
  enemy_fast: "/sprites/enemy_fast.png",
  enemy_tank: "/sprites/enemy_tank.png",
  enemy_shooter: "/sprites/enemy_shooter.png",
  bullet: "/sprites/bullet.png",
  enemy_bullet: "/sprites/enemy_bullet.png",
  exp: "/sprites/exp.png",
  hao_pickup: "/sprites/hao_pickup.png"
};

const AUDIO_SOURCES = {
  bgm1: ["/audio/bgm-1.wav", "/audio/bgm-1.m4a", "/audio/bgm-1.mp3"],
  bgm2: ["/audio/bgm-2.wav", "/audio/bgm-2..wav", "/audio/bgm-2.m4a", "/audio/bgm-2.mp3"],
  bgm3: ["/audio/bgm-3.wav", "/audio/bgm-3.m4a", "/audio/bgm-3.mp3"],
  bgm4: ["/audio/bgm-4.wav", "/audio/bgm-4.m4a", "/audio/bgm-4.mp3"],
  bgm5: ["/audio/bgm-5.wav", "/audio/bgm-5.m4a", "/audio/bgm-5.mp3"],
  bgm6: ["/audio/bgm-6.wav", "/audio/bgm-6.m4a", "/audio/bgm-6.mp3"],
  bgm7: ["/audio/bgm-7.wav", "/audio/bgm-7.m4a", "/audio/bgm-7.mp3"],
  bgm8: ["/audio/bgm-8.wav", "/audio/bgm-8.m4a", "/audio/bgm-8.mp3"],
  bgm9: ["/audio/bgm-9.wav", "/audio/bgm-9.m4a", "/audio/bgm-9.mp3"],
  bgm10: ["/audio/bgm-10.wav", "/audio/bgm-10.m4a", "/audio/bgm-10.mp3"],
  haoBgm: ["/audio/hao-bgm.wav", "/audio/hao-bgm.m4a", "/audio/hao-bgm.mp3"],
  attack: "/audio/attack.wav",
  hit: "/audio/hit.wav"
};

const MUSIC_ORDER: MusicTrack[] = ["bgm1", "bgm2", "bgm3", "bgm4", "bgm5", "bgm6", "bgm7", "bgm8", "bgm9", "bgm10"];

const SKILLS: Skill[] = [
  { key: "bulletSpeed", title: "快点乐啊", desc: "子弹速度提高，更快命中远处敌人。", maxLevel: 5 },
  { key: "attackRate", title: "哈基米连打", desc: "攻击间隔降低，发射“乐”的频率提高。", maxLevel: 6 },
  { key: "moveSpeed", title: "哈基米不舒服会自己离开", desc: "移动速度提高，拾取范围小幅增加。", maxLevel: 5 },
  { key: "maxHp", title: "基米这个抗揍", desc: "最大生命值提高，并立即回复一定生命。", maxLevel: 5 },
  { key: "pickupRange", title: "基米这个护食", desc: "拾取范围提高，经验球更快被吸过来。", maxLevel: 5 },
  { key: "bulletCount", title: "乐子加倍", desc: "每次攻击额外发射一枚“乐”，最多形成稳定多发。", maxLevel: 5 },
  { key: "bigBullet", title: "乐大无穷", desc: "子弹变大，伤害和碰撞范围提升。", maxLevel: 4 },
  { key: "spreadBullet", title: "乐开花", desc: "向目标方向扇形发射额外低伤害“乐”字弹。", maxLevel: 3 },
  { key: "splashBullet", title: "乐炸了", desc: "子弹命中敌人后产生范围爆炸，对附近敌人造成溅射伤害。", maxLevel: 3 },
  { key: "orbitBullet", title: "乐子人环绕", desc: "获得围绕玩家旋转的“乐”字护体，接触敌人造成伤害。", maxLevel: 4 },
  { key: "haoDuration", title: "豪意无穷", desc: "自在极意豪形态持续时间增加。", maxLevel: 3 },
  { key: "haoDamage", title: "嘉豪附体", desc: "自在极意豪形态期间造成更高伤害。", maxLevel: 3 },
  { key: "haoShockwave", title: "豪气冲天", desc: "进入自在极意豪形态时释放冲击波，伤害并击退附近敌人。", maxLevel: 3 },
  { key: "haoMusic", title: "音乐嘉豪", desc: "自在极意豪形态期间额外发射“乐”字弹。", maxLevel: 3 },
  { key: "haoPickup", title: "金融嘉豪", desc: "自在极意豪形态期间拾取范围大幅提高，经验球吸附更强。", maxLevel: 3 }
];

const initialHud: Hud = {
  level: 1,
  exp: 0,
  nextExp: 7,
  hp: 120,
  maxHp: 120,
  kills: 0,
  time: 0,
  phase: "playing"
};

function createGame(width = 960, height = 540): Game {
  const worldWidth = 2800;
  const worldHeight = 1800;
  return {
    width,
    height,
    worldWidth,
    worldHeight,
    cameraX: Math.max(0, worldWidth / 2 - width / 2),
    cameraY: Math.max(0, worldHeight / 2 - height / 2),
    time: 0,
    kills: 0,
    enemyTimer: 1.2,
    enemyEvery: 1.2,
    haoPickupTimer: 35,
    haoPickupEvery: 45,
    screenShake: 0,
    musicTier: 0,
    id: 1,
    phase: "playing",
    player: {
      x: worldWidth / 2,
      y: worldHeight / 2,
      hitbox: 13,
      renderSize: 46,
      speed: 255,
      hp: 120,
      maxHp: 120,
      invincible: 0,
      level: 1,
      exp: 0,
      nextExp: 7,
      bulletSpeed: 620,
      bulletDamage: 16,
      fireCooldown: 0.43,
      fireTimer: 0.05,
      bulletCount: 1,
      bulletScale: 1,
      splashLevel: 0,
      spreadLevel: 0,
      orbitLevel: 0,
      pickupRange: 170,
      skillLevels: {},
      haoModeActive: false,
      haoModeTimer: 0,
      haoModeDuration: 8,
      haoModeDamageMultiplier: 1.4,
      haoModeSpeedMultiplier: 1.15,
      haoModePickupMultiplier: 1.4,
      haoShockwaveLevel: 0,
      haoMusicLevel: 0,
      haoPickupLevel: 0
    },
    enemies: [],
    bullets: [],
    enemyBullets: [],
    orbs: [],
    haoPickups: [],
    shockwaves: [],
    particles: [],
    damageTexts: []
  };
}

function distSq(a: Vec, b: Vec) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function randomSkills(): Skill[] {
  return [...SKILLS].sort(() => Math.random() - 0.5).slice(0, 3);
}

function randomSkillsForPlayer(player: Player): Skill[] {
  const available = SKILLS.filter((skill) => (player.skillLevels[skill.key] || 0) < skill.maxLevel);
  const pool = available.length >= 3 ? available : [...available, ...SKILLS.filter((skill) => !available.includes(skill))];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
}

function bulletOffsets(count: number) {
  if (count <= 1) return [0];
  const step = 0.07;
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * step);
}

function getSpawnPlan(time: number) {
  if (time < 30) {
    return { every: lerp(1.08, 0.82, time / 30), batch: 1, maxEnemies: 28 };
  }
  if (time < 60) {
    return { every: lerp(0.82, 0.62, (time - 30) / 30), batch: 1, maxEnemies: 38 };
  }
  if (time < 120) {
    return { every: lerp(0.62, 0.44, (time - 60) / 60), batch: time > 95 ? 2 : 1, maxEnemies: 52 };
  }
  return { every: lerp(0.44, 0.32, (time - 120) / 120), batch: 2 + Math.floor((time - 120) / 95), maxEnemies: 68 };
}

function pickEnemyType(time: number): EnemyType {
  const roll = Math.random();
  if (time < 22) return "basic";
  if (time < 60) return roll < 0.78 ? "basic" : "fast";
  if (time < 90) return roll < 0.62 ? "basic" : roll < 0.82 ? "fast" : roll < 0.94 ? "tank" : "shooter";
  if (time < 120) return roll < 0.58 ? "basic" : roll < 0.76 ? "fast" : roll < 0.9 ? "tank" : "shooter";
  return roll < 0.52 ? "basic" : roll < 0.68 ? "fast" : roll < 0.86 ? "tank" : "shooter";
}

function enemyStats(type: EnemyType, time: number) {
  const growth = time < 60 ? 0.88 + time * 0.007 : time < 120 ? 1.3 + (time - 60) * 0.006 : 1.66 + (time - 120) * 0.006;
  const scale = growth;
  if (type === "shooter") {
    return { hitbox: 14, renderSize: 62, hp: 30 * scale, speed: 48 + time * 0.05, contactDamage: 8, expValue: 8 };
  }
  if (type === "fast") {
    return { hitbox: 11, renderSize: 58, hp: 18 * scale, speed: 108 + time * 0.18, contactDamage: 10, expValue: 4 };
  }
  if (type === "tank") {
    return { hitbox: 20, renderSize: 76, hp: 64 * scale, speed: 56 + time * 0.1, contactDamage: 16, expValue: 10 };
  }
  return { hitbox: 13, renderSize: 82, hp: 22 * scale, speed: 72 + time * 0.14, contactDamage: 11, expValue: 5 };
}

function spriteForEnemy(type: EnemyType): SpriteKey {
  return type === "fast" ? "enemy_fast" : type === "tank" ? "enemy_tank" : type === "shooter" ? "enemy_shooter" : "enemy_basic";
}

function musicTierForEnemy(type: EnemyType) {
  return type === "shooter" ? 4 : type === "tank" ? 3 : type === "fast" ? 2 : 1;
}

function musicTrackForTier(tier: number): MusicTrack {
  return tier >= 4 ? "bgm4" : tier >= 3 ? "bgm3" : tier >= 2 ? "bgm2" : "bgm1";
}

function isEnemyInView(game: Game, enemy: Enemy) {
  const padding = enemy.renderSize * 0.5;
  return (
    enemy.x >= game.cameraX - padding &&
    enemy.x <= game.cameraX + game.width + padding &&
    enemy.y >= game.cameraY - padding &&
    enemy.y <= game.cameraY + game.height + padding
  );
}

function createProcessedSprite(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) return undefined;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const visited = new Uint8Array(canvas.width * canvas.height);
  const queue: number[] = [];
  const isBackgroundMatte = (index: number) => {
    const offset = index * 4;
    const alpha = data[offset + 3];
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    return alpha > 0 && (alpha < 24 || (max > 224 && max - min < 42) || (max > 198 && max - min < 18));
  };
  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    const index = y * canvas.width + x;
    if (visited[index] || !isBackgroundMatte(index)) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < canvas.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, canvas.height - 1);
  }
  for (let y = 0; y < canvas.height; y += 1) {
    enqueue(0, y);
    enqueue(canvas.width - 1, y);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    const x = index % canvas.width;
    const y = Math.floor(index / canvas.width);
    data[index * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  const removeMask = new Uint8Array(visited);
  for (let pass = 0; pass < 2; pass += 1) {
    const nextMask = new Uint8Array(removeMask);
    for (let y = 1; y < canvas.height - 1; y += 1) {
      for (let x = 1; x < canvas.width - 1; x += 1) {
        const index = y * canvas.width + x;
        if (removeMask[index] || !isBackgroundMatte(index)) continue;
        if (removeMask[index - 1] || removeMask[index + 1] || removeMask[index - canvas.width] || removeMask[index + canvas.width]) {
          nextMask[index] = 1;
        }
      }
    }
    removeMask.set(nextMask);
  }

  for (let index = 0; index < removeMask.length; index += 1) {
    if (removeMask[index]) data[index * 4 + 3] = 0;
  }

  for (let index = 0; index < canvas.width * canvas.height; index += 1) {
    const offset = index * 4;
    const alpha = data[offset + 3];
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    if (alpha < 180 && max > 210 && max - min < 55) {
      data[offset + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const bounds = { minX: canvas.width, minY: canvas.height, maxX: -1, maxY: -1 };
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 18) {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
    }
  }

  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return canvas;
  const padding = 2;
  const cropX = clamp(bounds.minX - padding, 0, canvas.width - 1);
  const cropY = clamp(bounds.minY - padding, 0, canvas.height - 1);
  const cropRight = clamp(bounds.maxX + padding, 0, canvas.width - 1);
  const cropBottom = clamp(bounds.maxY + padding, 0, canvas.height - 1);
  const cropped = document.createElement("canvas");
  cropped.width = cropRight - cropX + 1;
  cropped.height = cropBottom - cropY + 1;
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) return canvas;
  croppedCtx.drawImage(canvas, cropX, cropY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}

function drawSprite(ctx: CanvasRenderingContext2D, sprite: SpriteAsset | undefined, x: number, y: number, size: number, rotation = 0) {
  if (!sprite?.ready) return false;
  const source = sprite.processed || sprite.image;
  const width = "width" in source ? source.width : sprite.image.naturalWidth;
  const height = "height" in source ? source.height : sprite.image.naturalHeight;
  const aspect = width > 0 && height > 0 ? width / height : 1;
  const drawWidth = aspect >= 1 ? size : size * aspect;
  const drawHeight = aspect >= 1 ? size / aspect : size;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
  return true;
}

function createAudioWithFallback(sources: string[]) {
  const audio = document.createElement("audio");
  for (const src of sources) {
    const source = document.createElement("source");
    source.src = src;
    source.type = src.endsWith(".wav") ? "audio/wav" : src.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
    audio.appendChild(source);
  }
  return audio;
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(createGame());
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<Vec>({ x: 0, y: 0 });
  const spritesRef = useRef<Partial<Record<SpriteKey, SpriteAsset>>>({});
  const audioRef = useRef<AudioState>({ bgm: {}, haoBgmTime: 0, haoBgmActive: false, fadeTimers: [] });
  const musicEnabledRef = useRef(true);
  const sfxEnabledRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const [hud, setHud] = useState<Hud>(initialHud);
  const [choices, setChoices] = useState<Skill[]>([]);
  const [selectedChoice, setSelectedChoice] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickKnob, setJoystickKnob] = useState<Vec>({ x: 0, y: 0 });

  const syncHud = useCallback(() => {
    const game = gameRef.current;
    setHud({
      level: game.player.level,
      exp: Math.floor(game.player.exp),
      nextExp: game.player.nextExp,
      hp: Math.ceil(game.player.hp),
      maxHp: game.player.maxHp,
      kills: game.kills,
      time: game.time,
      phase: game.phase
    });
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const game = gameRef.current;
    game.width = rect.width;
    game.height = rect.height;
    game.player.x = clamp(game.player.x, game.player.hitbox, game.worldWidth - game.player.hitbox);
    game.player.y = clamp(game.player.y, game.player.hitbox, game.worldHeight - game.player.hitbox);
    game.cameraX = clamp(game.player.x - game.width / 2, 0, Math.max(0, game.worldWidth - game.width));
    game.cameraY = clamp(game.player.y - game.height / 2, 0, Math.max(0, game.worldHeight - game.height));
  }, []);

  const switchMusic = useCallback((track: MusicTrack) => {
    const audio = audioRef.current;
    if (audio.currentTrack === track) return;
    if (audio.haoBgmActive) {
      audio.pausedTrack = track;
      return;
    }
    if (!musicEnabledRef.current) {
      audio.currentTrack = track;
      return;
    }

    const previousTrack = audio.currentTrack;
    const previous = previousTrack ? audio.bgm[previousTrack] : undefined;
    const next = audio.bgm[track];
    for (const timer of audio.fadeTimers) window.clearInterval(timer);
    audio.fadeTimers = [];

    if (!next) return;

    next.volume = 0;
    const fadeToNext = () => {
      audio.currentTrack = track;

      if (previous && previous !== next) {
        const startVolume = previous.volume;
        const startedAt = performance.now();
        const timer = window.setInterval(() => {
          const progress = clamp((performance.now() - startedAt) / 900, 0, 1);
          previous.volume = startVolume * (1 - progress);
          if (progress >= 1) {
            previous.pause();
            previous.currentTime = 0;
            window.clearInterval(timer);
          }
        }, 50);
        audio.fadeTimers.push(timer);
      }

      const startedAt = performance.now();
      const timer = window.setInterval(() => {
        const progress = clamp((performance.now() - startedAt) / 900, 0, 1);
        next.volume = 0.42 * progress;
        if (progress >= 1) window.clearInterval(timer);
      }, 50);
      audio.fadeTimers.push(timer);
    };

    next
      .play()
      .then(fadeToNext)
      .catch(() => {
        if (previous) {
          previous.currentTime = 0;
          previous.volume = 0.42;
          previous.play().catch(() => undefined);
          audio.currentTrack = previousTrack;
        }
      });
  }, []);

  const startHaoMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!musicEnabledRef.current || !audio.haoBgm || audio.haoBgmActive) return;
    const currentTrack = audio.currentTrack;
    audio.pausedTrack = currentTrack;
    for (const timer of audio.fadeTimers) window.clearInterval(timer);
    audio.fadeTimers = [];
    for (const track of Object.values(audio.bgm)) {
      if (!track) continue;
      track.pause();
      track.volume = 0;
    }
    audio.haoBgmActive = true;
    audio.haoBgm.volume = 0.48;
    const haoDuration = audio.haoBgm.duration;
    audio.haoBgm.currentTime = Number.isFinite(haoDuration) ? Math.min(audio.haoBgmTime, Math.max(0, haoDuration - 0.25)) : audio.haoBgmTime;
    audio.haoBgm.play().catch(() => {
      audio.haoBgmActive = false;
      const resumeAudio = currentTrack ? audio.bgm[currentTrack] : undefined;
      if (resumeAudio) {
        resumeAudio.volume = 0.42;
        resumeAudio.play().catch(() => undefined);
      }
    });
  }, []);

  const stopHaoMusic = useCallback(() => {
    const audio = audioRef.current;
    const haoBgm = audio.haoBgm;
    if (!haoBgm || !audio.haoBgmActive) return;
    audio.haoBgmTime = Number.isFinite(haoBgm.currentTime) ? haoBgm.currentTime : audio.haoBgmTime;
    haoBgm.pause();
    audio.haoBgmActive = false;
    if (!musicEnabledRef.current) return;
    const resumeTrack = audio.pausedTrack || audio.currentTrack || musicTrackForTier(gameRef.current.musicTier || 1);
    const resumeAudio = audio.bgm[resumeTrack];
    if (resumeAudio) {
      resumeAudio.volume = 0.42;
      resumeAudio.play().catch(() => undefined);
      audio.currentTrack = resumeTrack;
    }
  }, []);

  const stopMusic = useCallback(() => {
    const audio = audioRef.current;
    for (const timer of audio.fadeTimers) window.clearInterval(timer);
    audio.fadeTimers = [];
    for (const track of Object.values(audio.bgm)) {
      if (!track) continue;
      track.pause();
      track.currentTime = 0;
      track.volume = 0;
    }
    if (audio.haoBgm) {
      audio.haoBgmTime = Number.isFinite(audio.haoBgm.currentTime) ? audio.haoBgm.currentTime : audio.haoBgmTime;
      audio.haoBgm.pause();
      audio.haoBgm.volume = 0;
    }
    audio.haoBgmActive = false;
    audio.currentTrack = undefined;
  }, []);

  const playAttackSound = useCallback(() => {
    if (!sfxEnabledRef.current) return;
    const attack = audioRef.current.attack;
    if (attack && attack.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const sound = attack.cloneNode(true) as HTMLAudioElement;
      sound.volume = 0.5;
      sound.play().catch(() => undefined);
      return;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioRef.current.context || new AudioContextClass();
    audioRef.current.context = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(620, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
  }, []);

  const playHitSound = useCallback(() => {
    if (!sfxEnabledRef.current) return;
    const hit = audioRef.current.hit;
    if (!hit) return;
    const sound = hit.cloneNode(true) as HTMLAudioElement;
    sound.volume = 0.62;
    sound.play().catch(() => undefined);
  }, []);

  const restart = useCallback(() => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    gameRef.current = createGame(rect?.width || 960, rect?.height || 540);
    lastRef.current = performance.now();
    setChoices([]);
    setSelectedChoice(0);
    setSettingsOpen(false);
    stopHaoMusic();
    switchMusic("bgm1");
    syncHud();
  }, [stopHaoMusic, switchMusic, syncHud]);

  const addParticles = useCallback((game: Game, x: number, y: number, color: string, count: number, power = 1) => {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (70 + Math.random() * 190) * power;
      game.particles.push({
        id: game.id++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3.5,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        color
      });
    }
  }, []);

  const addDamageText = useCallback((game: Game, x: number, y: number, value: string, color = "#fde68a") => {
    game.damageTexts.push({
      id: game.id++,
      x,
      y,
      value,
      vy: -34 - Math.random() * 20,
      life: 0.65,
      maxLife: 0.65,
      color
    });
  }, []);

  const activateHaoMode = useCallback(
    (game: Game) => {
      const player = game.player;
      player.haoModeActive = true;
      player.haoModeTimer = player.haoModeDuration;
      startHaoMusic();
      player.invincible = Math.max(player.invincible, 0.8);
      game.screenShake = Math.max(game.screenShake, 0.16);
      game.shockwaves.push({
        id: game.id++,
        x: player.x,
        y: player.y,
        radius: 0,
        maxRadius: 170 + player.haoShockwaveLevel * 36,
        life: 0.5,
        maxLife: 0.5,
        damage: player.haoShockwaveLevel > 0 ? 26 + player.haoShockwaveLevel * 14 : 0,
        push: player.haoShockwaveLevel > 0 ? 110 + player.haoShockwaveLevel * 50 : 0,
        hitEnemyIds: new Set<number>()
      });
      addParticles(game, player.x, player.y, "#fde047", 38, 1.3);
      addDamageText(game, player.x, player.y - 42, "自在极意豪形态！", "#fef08a");
    },
    [addDamageText, addParticles, startHaoMusic]
  );

  const spawnHaoPickup = useCallback((game: Game) => {
    if (game.haoPickups.length > 0) return;
    const margin = 120;
    const x = clamp(game.cameraX + margin + Math.random() * Math.max(80, game.width - margin * 2), margin, game.worldWidth - margin);
    const y = clamp(game.cameraY + margin + Math.random() * Math.max(80, game.height - margin * 2), margin, game.worldHeight - margin);
    game.haoPickups.push({
      id: game.id++,
      x,
      y,
      hitbox: 36,
      renderSize: 82,
      life: 14,
      maxLife: 14
    });
    addDamageText(game, x, y - 58, "豪字补给出现！", "#fef08a");
  }, [addDamageText]);

  const spawnEnemy = useCallback((game: Game) => {
    const plan = getSpawnPlan(game.time);
    if (game.enemies.length >= plan.maxEnemies) return;
    const side = Math.floor(Math.random() * 4);
    const margin = 38;
    const pos =
      side === 0
        ? { x: game.cameraX + Math.random() * game.width, y: game.cameraY - margin }
        : side === 1
          ? { x: game.cameraX + game.width + margin, y: game.cameraY + Math.random() * game.height }
          : side === 2
            ? { x: game.cameraX + Math.random() * game.width, y: game.cameraY + game.height + margin }
            : { x: game.cameraX - margin, y: game.cameraY + Math.random() * game.height };
    const type = pickEnemyType(game.time);
    const stats = enemyStats(type, game.time);
    game.enemies.push({
      id: game.id++,
      type,
      x: clamp(pos.x, -margin, game.worldWidth + margin),
      y: clamp(pos.y, -margin, game.worldHeight + margin),
      hitbox: stats.hitbox,
      renderSize: stats.renderSize,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      contactDamage: stats.contactDamage,
      expValue: stats.expValue,
      flash: 0,
      shootTimer: type === "shooter" ? 1.2 + Math.random() * 1.2 : Number.POSITIVE_INFINITY
    });
  }, []);

  const fireBullets = useCallback((game: Game) => {
    if (game.enemies.length === 0) return;
    const player = game.player;
    let target = game.enemies[0];
    let nearest = distSq(player, target);
    for (const enemy of game.enemies) {
      const d = distSq(player, enemy);
      if (d < nearest) {
        nearest = d;
        target = enemy;
      }
    }

    const base = Math.atan2(target.y - player.y, target.x - player.x);
    const baseOffsets = bulletOffsets(Math.min(player.bulletCount, 6));
    const spreadLevel = player.spreadLevel;
    const spreadOffsets = spreadLevel > 0 ? Array.from({ length: spreadLevel * 2 }, (_, index) => (index < spreadLevel ? -1 : 1) * (0.18 + (index % spreadLevel) * 0.1)) : [];
    const haoOffsets = player.haoModeActive && player.haoMusicLevel > 0 ? bulletOffsets(player.haoMusicLevel + 1).map((offset) => offset + 0.11) : [];
    const shots = [
      ...baseOffsets.map((offset) => ({ offset, damageScale: 1 })),
      ...spreadOffsets.map((offset) => ({ offset, damageScale: 0.58 })),
      ...haoOffsets.map((offset) => ({ offset, damageScale: 0.72 }))
    ].slice(0, player.haoModeActive ? 14 : 11);
    const damageMultiplier = player.haoModeActive ? player.haoModeDamageMultiplier : 1;
    const bulletScale = player.bulletScale * (player.haoModeActive ? 1.22 : 1);
    for (const shot of shots) {
      const angle = base + shot.offset;
      game.bullets.push({
        id: game.id++,
        x: player.x + Math.cos(angle) * 18,
        y: player.y + Math.sin(angle) * 18,
        vx: Math.cos(angle) * player.bulletSpeed,
        vy: Math.sin(angle) * player.bulletSpeed,
        angle,
        hitbox: 12 * bulletScale,
        renderRadius: 6.5 * bulletScale,
        damage: player.bulletDamage * shot.damageScale * damageMultiplier,
        splashRadius: player.splashLevel > 0 ? 46 + player.splashLevel * 18 : 0,
        splashDamage: player.splashLevel > 0 ? player.bulletDamage * (0.22 + player.splashLevel * 0.1) * damageMultiplier : 0,
        golden: player.haoModeActive,
        life: 1.7
      });
    }
    playAttackSound();
  }, [playAttackSound]);

  const gainExp = useCallback((game: Game, value: number) => {
    const player = game.player;
      player.exp += value;
      while (player.exp >= player.nextExp) {
      player.exp -= player.nextExp;
      player.level += 1;
      player.nextExp = Math.floor(player.nextExp * 1.18 + 4 + player.level * 0.8);
      player.hp = Math.min(player.maxHp, player.hp + 8);
      game.phase = "leveling";
      const nextChoices = randomSkillsForPlayer(player);
      setChoices(nextChoices);
      setSelectedChoice(0);
      break;
    }
  }, []);

  const updateGame = useCallback(
    (dt: number) => {
      const game = gameRef.current;
      if (game.phase !== "playing") return;
      const player = game.player;
      game.time += dt;
      game.screenShake = Math.max(0, game.screenShake - dt);
      if (player.haoModeActive) {
        player.haoModeTimer = Math.max(0, player.haoModeTimer - dt);
        if (player.haoModeTimer <= 0) {
          player.haoModeActive = false;
          stopHaoMusic();
        }
      }

      const keys = keysRef.current;
      const input = {
        x:
          Number(keys.has("KeyD") || keys.has("ArrowRight")) -
          Number(keys.has("KeyA") || keys.has("ArrowLeft")) +
          joystickRef.current.x,
        y:
          Number(keys.has("KeyS") || keys.has("ArrowDown")) -
          Number(keys.has("KeyW") || keys.has("ArrowUp")) +
          joystickRef.current.y
      };
      const len = Math.hypot(input.x, input.y) || 1;
      const speedMultiplier = player.haoModeActive ? player.haoModeSpeedMultiplier : 1;
      player.x = clamp(player.x + (input.x / len) * player.speed * speedMultiplier * dt, player.hitbox, game.worldWidth - player.hitbox);
      player.y = clamp(player.y + (input.y / len) * player.speed * speedMultiplier * dt, player.hitbox, game.worldHeight - player.hitbox);
      game.cameraX = clamp(player.x - game.width / 2, 0, Math.max(0, game.worldWidth - game.width));
      game.cameraY = clamp(player.y - game.height / 2, 0, Math.max(0, game.worldHeight - game.height));
      player.invincible = Math.max(0, player.invincible - dt);

      const plan = getSpawnPlan(game.time);
      game.enemyEvery = plan.every;
      game.enemyTimer -= dt;
      if (game.enemyTimer <= 0) {
        const room = Math.max(0, plan.maxEnemies - game.enemies.length);
        const count = Math.min(plan.batch, room);
        for (let i = 0; i < count; i += 1) spawnEnemy(game);
        game.enemyTimer = game.enemyEvery;
      }

      game.haoPickupTimer -= dt;
      if (game.haoPickupTimer <= 0) {
        spawnHaoPickup(game);
        game.haoPickupTimer = game.haoPickupEvery;
      }

      player.fireTimer -= dt;
      if (player.fireTimer <= 0) {
        fireBullets(game);
        player.fireTimer = player.fireCooldown * (player.haoModeActive ? 0.75 : 1);
      }

      for (const enemy of game.enemies) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const distanceToPlayer = Math.sqrt(distSq(enemy, player));
        if (enemy.type === "shooter" && distanceToPlayer < 300) {
          enemy.x -= Math.cos(angle) * enemy.speed * 0.7 * dt;
          enemy.y -= Math.sin(angle) * enemy.speed * 0.7 * dt;
        } else if (enemy.type === "shooter" && distanceToPlayer < 430) {
          enemy.x += Math.cos(angle) * enemy.speed * 0.18 * dt;
          enemy.y += Math.sin(angle) * enemy.speed * 0.18 * dt;
        } else {
          enemy.x += Math.cos(angle) * enemy.speed * dt;
          enemy.y += Math.sin(angle) * enemy.speed * dt;
        }
        enemy.flash = Math.max(0, enemy.flash - dt);
        if (enemy.type === "shooter") {
          enemy.shootTimer -= dt;
          if (enemy.shootTimer <= 0) {
            const bulletSpeed = 125 + Math.min(game.time, 180) * 0.25;
            game.enemyBullets.push({
              id: game.id++,
              x: enemy.x + Math.cos(angle) * enemy.hitbox,
              y: enemy.y + Math.sin(angle) * enemy.hitbox,
              vx: Math.cos(angle) * bulletSpeed,
              vy: Math.sin(angle) * bulletSpeed,
              angle,
              hitbox: 8,
              renderRadius: 10,
              damage: 8,
              life: 4.2
            });
            addParticles(game, enemy.x, enemy.y, "#fb923c", 8, 0.65);
            enemy.shootTimer = 2.2 + Math.random() * 1.1;
          }
        }
        if (distSq(enemy, player) < (enemy.hitbox + player.hitbox) ** 2 && player.invincible <= 0) {
          player.hp = Math.max(0, player.hp - enemy.contactDamage);
          player.invincible = 1;
          addParticles(game, player.x, player.y, "#60a5fa", 16, 0.9);
          addDamageText(game, player.x, player.y - 18, `-${enemy.contactDamage}`, "#fca5a5");
          if (player.hp <= 0) {
            game.phase = "gameover";
            stopMusic();
          }
        }
      }

      for (const bullet of game.bullets) {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
      }

      const deadEnemyBulletIds = new Set<number>();
      for (const bullet of game.enemyBullets) {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        if (distSq(bullet, player) < (bullet.hitbox + player.hitbox) ** 2 && player.invincible <= 0) {
          deadEnemyBulletIds.add(bullet.id);
          player.hp = Math.max(0, player.hp - bullet.damage);
          player.invincible = 0.8;
          addParticles(game, player.x, player.y, "#fbbf24", 14, 0.85);
          addDamageText(game, player.x, player.y - 18, `-${bullet.damage}`, "#fca5a5");
          if (player.hp <= 0) {
            game.phase = "gameover";
            stopMusic();
          }
        }
      }

      const deadEnemyIds = new Set<number>();
      const deadBulletIds = new Set<number>();
      const rewardedEnemyIds = new Set<number>();
      if (player.orbitLevel > 0) {
        const orbitCount = Math.min(6, player.orbitLevel + 1);
        const orbitRadius = 44 + player.orbitLevel * 9;
        const orbitDamage = (8 + player.orbitLevel * 4) * (player.haoModeActive ? player.haoModeDamageMultiplier : 1) * dt * 3.5;
        for (let i = 0; i < orbitCount; i += 1) {
          const angle = game.time * (2.2 + player.orbitLevel * 0.2) + (Math.PI * 2 * i) / orbitCount;
          const orbit = { x: player.x + Math.cos(angle) * orbitRadius, y: player.y + Math.sin(angle) * orbitRadius };
          for (const enemy of game.enemies) {
            if (deadEnemyIds.has(enemy.id)) continue;
            if (distSq(orbit, enemy) < (18 + enemy.hitbox) ** 2) {
              enemy.hp -= orbitDamage;
              enemy.flash = 0.05;
              if (Math.random() < 0.18) addParticles(game, orbit.x, orbit.y, "#fef08a", 2, 0.35);
              if (enemy.hp <= 0) deadEnemyIds.add(enemy.id);
            }
          }
        }
      }
      for (const bullet of game.bullets) {
        for (const enemy of game.enemies) {
          if (deadEnemyIds.has(enemy.id) || deadBulletIds.has(bullet.id)) continue;
          if (distSq(bullet, enemy) < (bullet.hitbox + enemy.hitbox) ** 2) {
            enemy.hp -= bullet.damage;
            enemy.flash = 0.08;
            deadBulletIds.add(bullet.id);
            playHitSound();
            addParticles(game, bullet.x, bullet.y, "#facc15", 6, 0.75);
            addDamageText(game, enemy.x, enemy.y - enemy.renderSize * 0.45, Math.round(bullet.damage).toString());
            if (bullet.splashRadius > 0 && bullet.splashDamage > 0) {
              game.shockwaves.push({
                id: game.id++,
                x: bullet.x,
                y: bullet.y,
                radius: 0,
                maxRadius: bullet.splashRadius,
                life: 0.28,
                maxLife: 0.28,
                damage: 0,
                push: 0,
                hitEnemyIds: new Set<number>()
              });
              addParticles(game, bullet.x, bullet.y, bullet.golden ? "#fde047" : "#facc15", 14 + player.splashLevel * 4, 0.9);
              for (const other of game.enemies) {
                if (other.id === enemy.id || deadEnemyIds.has(other.id)) continue;
                if (distSq(bullet, other) < (bullet.splashRadius + other.hitbox) ** 2) {
                  other.hp -= bullet.splashDamage;
                  other.flash = 0.08;
                  addDamageText(game, other.x, other.y - other.renderSize * 0.42, Math.round(bullet.splashDamage).toString(), "#fde68a");
                  if (other.hp <= 0) deadEnemyIds.add(other.id);
                }
              }
            }
            if (enemy.hp <= 0) {
              deadEnemyIds.add(enemy.id);
              rewardedEnemyIds.add(enemy.id);
              game.kills += 1;
              game.orbs.push({
                id: game.id++,
                x: enemy.x,
                y: enemy.y,
                hitbox: 12,
                renderRadius: enemy.type === "tank" ? 8 : 6,
                value: enemy.expValue,
                pull: false
              });
              addParticles(game, enemy.x, enemy.y, enemy.type === "tank" ? "#fb7185" : "#f43f5e", enemy.type === "tank" ? 34 : 22, 1.15);
            }
          }
        }
      }

      for (const enemy of game.enemies) {
        if (!deadEnemyIds.has(enemy.id) || rewardedEnemyIds.has(enemy.id)) continue;
        rewardedEnemyIds.add(enemy.id);
        game.kills += 1;
        game.orbs.push({
          id: game.id++,
          x: enemy.x,
          y: enemy.y,
          hitbox: 12,
          renderRadius: enemy.type === "tank" ? 8 : 6,
          value: enemy.expValue,
          pull: false
        });
        addParticles(game, enemy.x, enemy.y, enemy.type === "tank" ? "#fb7185" : "#f43f5e", enemy.type === "tank" ? 34 : 22, 1.15);
      }

      game.bullets = game.bullets.filter(
        (bullet) =>
          bullet.life > 0 &&
          !deadBulletIds.has(bullet.id) &&
          bullet.x > -90 &&
          bullet.x < game.worldWidth + 90 &&
          bullet.y > -90 &&
          bullet.y < game.worldHeight + 90
      );
      game.enemyBullets = game.enemyBullets.filter(
        (bullet) =>
          bullet.life > 0 &&
          !deadEnemyBulletIds.has(bullet.id) &&
          bullet.x > -120 &&
          bullet.x < game.worldWidth + 120 &&
          bullet.y > -120 &&
          bullet.y < game.worldHeight + 120
      );
      game.enemies = game.enemies.filter((enemy) => !deadEnemyIds.has(enemy.id));

      const collectedOrbs = new Set<number>();
      for (const orb of game.orbs) {
        const d = Math.sqrt(distSq(orb, player));
        const pickupMultiplier = player.haoModeActive ? player.haoModePickupMultiplier + player.haoPickupLevel * 0.25 : 1;
        const effectivePickupRange = player.pickupRange * pickupMultiplier;
        if (d < effectivePickupRange) orb.pull = true;
        if (orb.pull) {
          const angle = Math.atan2(player.y - orb.y, player.x - orb.x);
          const speed = (320 + Math.max(0, effectivePickupRange - d) * 5.5) * (player.haoModeActive ? 1.2 + player.haoPickupLevel * 0.18 : 1);
          orb.x += Math.cos(angle) * speed * dt;
          orb.y += Math.sin(angle) * speed * dt;
        }
        if (d < player.hitbox + orb.hitbox) {
          collectedOrbs.add(orb.id);
          gainExp(game, orb.value);
          addParticles(game, orb.x, orb.y, "#22d3ee", 10, 0.8);
        }
      }
      game.orbs = game.orbs.filter((orb) => !collectedOrbs.has(orb.id));

      const pickedHaoIds = new Set<number>();
      for (const pickup of game.haoPickups) {
        pickup.life -= dt;
        if (distSq(pickup, player) < (pickup.hitbox + player.hitbox) ** 2) {
          pickedHaoIds.add(pickup.id);
          activateHaoMode(game);
        }
      }
      game.haoPickups = game.haoPickups.filter((pickup) => pickup.life > 0 && !pickedHaoIds.has(pickup.id));

      for (const shockwave of game.shockwaves) {
        shockwave.life -= dt;
        const progress = 1 - shockwave.life / shockwave.maxLife;
        shockwave.radius = shockwave.maxRadius * clamp(progress, 0, 1);
        if (shockwave.damage > 0) {
          for (const enemy of game.enemies) {
            if (shockwave.hitEnemyIds.has(enemy.id)) continue;
            if (distSq(shockwave, enemy) < (shockwave.radius + enemy.hitbox) ** 2) {
              shockwave.hitEnemyIds.add(enemy.id);
              enemy.hp -= shockwave.damage;
              enemy.flash = 0.12;
              const angle = Math.atan2(enemy.y - shockwave.y, enemy.x - shockwave.x);
              enemy.x = clamp(enemy.x + Math.cos(angle) * shockwave.push, 0, game.worldWidth);
              enemy.y = clamp(enemy.y + Math.sin(angle) * shockwave.push, 0, game.worldHeight);
              addDamageText(game, enemy.x, enemy.y - enemy.renderSize * 0.45, Math.round(shockwave.damage).toString(), "#fef08a");
              if (enemy.hp <= 0) {
                enemy.hp = 0;
              }
            }
          }
        }
      }
      game.shockwaves = game.shockwaves.filter((shockwave) => shockwave.life > 0);
      const shockwaveDeadIds = new Set(game.enemies.filter((enemy) => enemy.hp <= 0).map((enemy) => enemy.id));
      if (shockwaveDeadIds.size > 0) {
        for (const enemy of game.enemies) {
          if (!shockwaveDeadIds.has(enemy.id)) continue;
          game.kills += 1;
          game.orbs.push({
            id: game.id++,
            x: enemy.x,
            y: enemy.y,
            hitbox: 12,
            renderRadius: enemy.type === "tank" ? 8 : 6,
            value: enemy.expValue,
            pull: false
          });
          addParticles(game, enemy.x, enemy.y, "#facc15", enemy.type === "tank" ? 34 : 22, 1.1);
        }
        game.enemies = game.enemies.filter((enemy) => !shockwaveDeadIds.has(enemy.id));
      }

      for (const particle of game.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.96;
        particle.vy *= 0.96;
        particle.life -= dt;
      }
      game.particles = game.particles.filter((particle) => particle.life > 0);

      for (const text of game.damageTexts) {
        text.y += text.vy * dt;
        text.life -= dt;
      }
      game.damageTexts = game.damageTexts.filter((text) => text.life > 0);
    },
    [activateHaoMode, addDamageText, addParticles, fireBullets, gainExp, playHitSound, spawnEnemy, spawnHaoPickup, stopHaoMusic, stopMusic]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const game = gameRef.current;
    const sprites = spritesRef.current;
    const dpr = canvas.width / Math.max(game.width, 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, game.width, game.height);

    const gradient = ctx.createRadialGradient(game.width / 2, game.height / 2, 30, game.width / 2, game.height / 2, game.width * 0.7);
    gradient.addColorStop(0, "#0b1431");
    gradient.addColorStop(1, "#050712");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.strokeStyle = "rgba(34,211,238,0.08)";
    ctx.lineWidth = 1;
    const grid = 42;
    const offsetX = (game.cameraX + game.time * 8) % grid;
    const offsetY = (game.cameraY + game.time * 8) % grid;
    for (let x = -offsetX; x < game.width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, game.height);
      ctx.stroke();
    }
    for (let y = -offsetY; y < game.height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(game.width, y);
      ctx.stroke();
    }

    ctx.save();
    const shake = game.screenShake > 0 ? game.screenShake * 18 : 0;
    const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
    const shakeY = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(-game.cameraX + shakeX, -game.cameraY + shakeY);

    for (const shockwave of game.shockwaves) {
      const alpha = clamp(shockwave.life / shockwave.maxLife, 0, 1);
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = shockwave.damage > 0 ? "#fef08a" : "#fde68a";
      ctx.lineWidth = shockwave.damage > 0 ? 8 : 5;
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    for (const pickup of game.haoPickups) {
      const pulse = 1 + Math.sin(game.time * 8) * 0.08;
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 28;
      if (!drawSprite(ctx, sprites.hao_pickup, pickup.x, pickup.y, pickup.renderSize * pulse)) {
        ctx.fillStyle = "rgba(250,204,21,0.18)";
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, pickup.renderSize * 0.48 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = `bold ${Math.floor(pickup.renderSize * 0.62 * pulse)}px Courier New, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#713f12";
        ctx.strokeText("豪", pickup.x, pickup.y + 2);
        ctx.fillStyle = "#fef08a";
        ctx.fillText("豪", pickup.x, pickup.y);
      }
      ctx.shadowBlur = 0;
    }

    for (const orb of game.orbs) {
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 14;
      if (!drawSprite(ctx, sprites.exp, orb.x, orb.y, orb.renderRadius * 2.8)) {
        ctx.fillStyle = "#2dd4bf";
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.renderRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    for (const bullet of game.bullets) {
      ctx.shadowColor = bullet.golden ? "#fef08a" : "#fde047";
      ctx.shadowBlur = bullet.golden ? 24 : 12;
      if (!drawSprite(ctx, sprites.bullet, bullet.x, bullet.y, bullet.renderRadius * 3.2, bullet.angle)) {
        ctx.shadowColor = bullet.golden ? "#fef08a" : "#fde047";
        ctx.shadowBlur = bullet.golden ? 24 : 14;
        ctx.fillStyle = bullet.golden ? "#fef08a" : "#facc15";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.renderRadius + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = bullet.golden ? "#ffffff" : "#fff7ad";
        ctx.lineWidth = bullet.golden ? 3 : 2;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.renderRadius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = bullet.golden ? "#fde047" : "#facc15";
        ctx.font = `bold ${Math.max(20, bullet.renderRadius * 4)}px Courier New, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#3f2500";
        ctx.lineWidth = 3;
        ctx.strokeText("乐", bullet.x, bullet.y + 1);
        ctx.fillStyle = "#fff7ad";
        ctx.fillText("乐", bullet.x, bullet.y);
      }
    }
    ctx.shadowBlur = 0;

    for (const bullet of game.enemyBullets) {
      ctx.shadowColor = "#fb923c";
      ctx.shadowBlur = 16;
      if (!drawSprite(ctx, sprites.enemy_bullet, bullet.x, bullet.y, bullet.renderRadius * 2.7, bullet.angle)) {
        ctx.fillStyle = "#fb923c";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.renderRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff7ed";
        ctx.font = "bold 14px Courier New, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("哈", bullet.x, bullet.y);
      }
    }
    ctx.shadowBlur = 0;

    for (const enemy of game.enemies) {
      ctx.shadowColor = enemy.type === "fast" ? "#fb7185" : enemy.type === "tank" ? "#f97316" : enemy.type === "shooter" ? "#a78bfa" : "#ef4444";
      ctx.shadowBlur = enemy.flash > 0 ? 22 : 10;
      const spriteKey = spriteForEnemy(enemy.type);
      const enemySprite = sprites[spriteKey];
      if (enemySprite?.ready) {
        ctx.shadowBlur = 0;
        drawSprite(ctx, enemySprite, enemy.x, enemy.y, enemy.renderSize);
      } else {
        ctx.fillStyle = enemy.flash > 0 ? "#fecdd3" : enemy.type === "fast" ? "#fb7185" : enemy.type === "tank" ? "#f97316" : enemy.type === "shooter" ? "#8b5cf6" : "#ef4444";
        ctx.fillRect(enemy.x - enemy.renderSize / 2, enemy.y - enemy.renderSize / 2, enemy.renderSize, enemy.renderSize);
      }
      const hpWidth = enemy.renderSize;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(15,23,42,0.8)";
      ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.renderSize / 2 - 8, hpWidth, 3);
      ctx.fillStyle = enemy.type === "tank" ? "#fed7aa" : enemy.type === "shooter" ? "#ddd6fe" : "#fca5a5";
      ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.renderSize / 2 - 8, hpWidth * clamp(enemy.hp / enemy.maxHp, 0, 1), 3);
    }

    for (const particle of game.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.radius / 2, particle.y - particle.radius / 2, particle.radius, particle.radius);
    }
    ctx.globalAlpha = 1;

    const player = game.player;
    if (player.orbitLevel > 0) {
      const orbitCount = Math.min(6, player.orbitLevel + 1);
      const orbitRadius = 44 + player.orbitLevel * 9;
      for (let i = 0; i < orbitCount; i += 1) {
        const angle = game.time * (2.2 + player.orbitLevel * 0.2) + (Math.PI * 2 * i) / orbitCount;
        const ox = player.x + Math.cos(angle) * orbitRadius;
        const oy = player.y + Math.sin(angle) * orbitRadius;
        ctx.shadowColor = "#fde047";
        ctx.shadowBlur = 18;
        ctx.font = "bold 24px Courier New, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#3f2500";
        ctx.lineWidth = 4;
        ctx.strokeText("乐", ox, oy);
        ctx.fillStyle = "#fef08a";
        ctx.fillText("乐", ox, oy);
      }
    }

    if (player.haoModeActive) {
      const pulse = 1 + Math.sin(game.time * 10) * 0.08;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 38 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.shadowColor = player.haoModeActive ? "#fde047" : "#38bdf8";
    ctx.shadowBlur = player.haoModeActive ? 32 : player.invincible > 0 ? 26 : 16;
    const playerSprite = player.haoModeActive && sprites.player_hao?.ready ? sprites.player_hao : sprites.player;
    if (playerSprite?.ready) {
      ctx.shadowBlur = 0;
      drawSprite(ctx, playerSprite, player.x, player.y, player.renderSize * (player.haoModeActive ? 1.12 : 1));
    } else {
      ctx.fillStyle = player.haoModeActive ? "#fde047" : player.invincible > 0 && Math.floor(game.time * 18) % 2 === 0 ? "#bfdbfe" : "#38bdf8";
      ctx.fillRect(player.x - player.renderSize / 2, player.y - player.renderSize / 2, player.renderSize, player.renderSize);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.strokeRect(player.x - player.renderSize / 2 - 2, player.y - player.renderSize / 2 - 2, player.renderSize + 4, player.renderSize + 4);
    }
    ctx.shadowBlur = 0;

    ctx.font = "bold 13px Courier New, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const text of game.damageTexts) {
      ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.fillStyle = text.color;
      ctx.fillText(text.value, text.x, text.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }, []);

  const chooseSkill = useCallback(
    (skill: Skill) => {
      const game = gameRef.current;
      const player = game.player;
      const currentLevel = player.skillLevels[skill.key] || 0;
      if (currentLevel >= skill.maxLevel) return;
      player.skillLevels[skill.key] = currentLevel + 1;
      if (skill.key === "bulletSpeed") player.bulletSpeed *= 1.25;
      if (skill.key === "attackRate") player.fireCooldown = Math.max(0.14, player.fireCooldown * 0.8);
      if (skill.key === "moveSpeed") {
        player.speed *= 1.16;
        player.pickupRange += 10;
      }
      if (skill.key === "pickupRange") player.pickupRange += 38;
      if (skill.key === "maxHp") {
        player.maxHp += 30;
        player.hp = Math.min(player.maxHp, player.hp + 35);
      }
      if (skill.key === "bulletCount") player.bulletCount = Math.min(6, player.bulletCount + 1);
      if (skill.key === "bigBullet") {
        player.bulletScale += 0.18;
        player.bulletDamage += 3;
      }
      if (skill.key === "spreadBullet") player.spreadLevel += 1;
      if (skill.key === "splashBullet") player.splashLevel += 1;
      if (skill.key === "orbitBullet") player.orbitLevel += 1;
      if (skill.key === "haoDuration") player.haoModeDuration += 2.5;
      if (skill.key === "haoDamage") player.haoModeDamageMultiplier += 0.18;
      if (skill.key === "haoShockwave") player.haoShockwaveLevel += 1;
      if (skill.key === "haoMusic") player.haoMusicLevel += 1;
      if (skill.key === "haoPickup") {
        player.haoPickupLevel += 1;
        player.haoModePickupMultiplier += 0.18;
      }
      player.bulletDamage += 1.5;
      game.phase = "playing";
      setChoices([]);
      setSelectedChoice(0);
      syncHud();
    },
    [syncHud]
  );

  const toggleMusic = useCallback(() => {
    setMusicEnabled((enabled) => {
      const nextEnabled = !enabled;
      musicEnabledRef.current = nextEnabled;
      const audio = audioRef.current;
      for (const track of Object.values(audio.bgm)) {
        if (!track) continue;
        track.muted = !nextEnabled;
        if (!nextEnabled) track.pause();
      }
      if (audio.haoBgm) {
        audio.haoBgm.muted = !nextEnabled;
        if (!nextEnabled) {
          audio.haoBgmTime = Number.isFinite(audio.haoBgm.currentTime) ? audio.haoBgm.currentTime : audio.haoBgmTime;
          audio.haoBgm.pause();
        }
      }
      if (nextEnabled) {
        if (audio.haoBgmActive) {
          audio.haoBgm?.play().catch(() => undefined);
          return nextEnabled;
        }
        const trackKey = audio.currentTrack || musicTrackForTier(gameRef.current.musicTier || 1);
        audio.currentTrack = undefined;
        switchMusic(trackKey);
      }
      return nextEnabled;
    });
  }, [switchMusic]);

  const toggleSfx = useCallback(() => {
    setSfxEnabled((enabled) => {
      const nextEnabled = !enabled;
      sfxEnabledRef.current = nextEnabled;
      return nextEnabled;
    });
  }, []);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (game.phase === "playing") {
      game.phase = "paused";
      syncHud();
      return;
    }
    if (game.phase === "paused") {
      game.phase = "playing";
      lastRef.current = performance.now();
      syncHud();
    }
  }, [syncHud]);

  useEffect(() => {
    const bgmTracks = Object.fromEntries(
      MUSIC_ORDER.map((track) => [track, createAudioWithFallback(AUDIO_SOURCES[track])])
    ) as Record<MusicTrack, HTMLAudioElement>;
    const haoBgm = createAudioWithFallback(AUDIO_SOURCES.haoBgm);
    const attack = new Audio(AUDIO_SOURCES.attack);
    const hit = new Audio(AUDIO_SOURCES.hit);
    MUSIC_ORDER.forEach((trackKey, index) => {
      const track = bgmTracks[trackKey];
      track.loop = false;
      track.preload = "auto";
      track.volume = 0;
      track.muted = !musicEnabledRef.current;
      track.addEventListener("ended", () => {
        if (!musicEnabledRef.current) return;
        const nextTrack = MUSIC_ORDER[index + 1] || "bgm1";
        switchMusic(nextTrack);
      });
    });
    haoBgm.loop = true;
    haoBgm.preload = "auto";
    haoBgm.volume = 0.48;
    haoBgm.muted = !musicEnabledRef.current;
    attack.preload = "auto";
    hit.preload = "auto";
    audioRef.current.bgm = bgmTracks;
    audioRef.current.haoBgm = haoBgm;
    audioRef.current.attack = attack;
    audioRef.current.hit = hit;
    switchMusic("bgm1");
    return stopMusic;
  }, [stopMusic, switchMusic]);

  useEffect(() => {
    const entries = Object.entries(SPRITE_SOURCES) as [SpriteKey, string][];
    for (const [key, src] of entries) {
      const image = new Image();
      const asset: SpriteAsset = { src, image, ready: false, failed: false };
      image.onload = () => {
        asset.processed = createProcessedSprite(image);
        asset.ready = true;
      };
      image.onerror = () => {
        asset.failed = true;
      };
      image.src = src;
      spritesRef.current[key] = asset;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    const down = (event: KeyboardEvent) => {
      const game = gameRef.current;
      const currentTrack = audioRef.current.currentTrack;
      const currentAudio = currentTrack ? audioRef.current.bgm[currentTrack] : undefined;
      if (currentAudio?.paused) currentAudio.play().catch(() => undefined);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "Escape"].includes(event.code)) event.preventDefault();
      if (event.code === "Escape" && (game.phase === "playing" || game.phase === "paused")) {
        togglePause();
        return;
      }
      if (game.phase === "leveling") {
        if (event.code === "KeyA" || event.code === "ArrowLeft") {
          event.preventDefault();
          setSelectedChoice((value) => (choices.length ? (value - 1 + choices.length) % choices.length : 0));
          return;
        }
        if (event.code === "KeyD" || event.code === "ArrowRight") {
          event.preventDefault();
          setSelectedChoice((value) => (choices.length ? (value + 1) % choices.length : 0));
          return;
        }
        if (event.code === "Space" || event.code === "Enter") {
          event.preventDefault();
          const skill = choices[selectedChoice];
          if (skill) chooseSkill(skill);
          return;
        }
      }
      keysRef.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [choices, chooseSkill, resizeCanvas, selectedChoice, togglePause]);

  useEffect(() => {
    const loop = (now: number) => {
      const last = lastRef.current || now;
      lastRef.current = now;
      const dt = Math.min(0.033, (now - last) / 1000);
      updateGame(dt);
      draw();
      if (Math.floor(now / 100) !== Math.floor(last / 100)) syncHud();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, syncHud, updateGame]);

  const updateJoystick = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const max = rect.width * 0.34;
    const distance = Math.hypot(dx, dy);
    const scale = distance > max ? max / distance : 1;
    const knob = { x: dx * scale, y: dy * scale };
    setJoystickKnob(knob);
    joystickRef.current = {
      x: clamp(dx / max, -1, 1),
      y: clamp(dy / max, -1, 1)
    };
  }, []);

  const resetJoystick = useCallback(() => {
    joystickRef.current = { x: 0, y: 0 };
    setJoystickKnob({ x: 0, y: 0 });
    setJoystickActive(false);
  }, []);

  const expPercent = useMemo(() => clamp((hud.exp / hud.nextExp) * 100, 0, 100), [hud.exp, hud.nextExp]);
  const hpPercent = useMemo(() => clamp((hud.hp / hud.maxHp) * 100, 0, 100), [hud.hp, hud.maxHp]);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#050712] font-mono text-white">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />

      <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 text-center sm:top-4">
        <h1 className="text-lg font-bold tracking-[0.18em] text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)] sm:text-2xl">
          基米幸存者
        </h1>
      </div>

      <div className="absolute right-3 top-3 z-20 flex items-start gap-2 sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={togglePause}
          className="h-10 border border-cyan-300/40 bg-slate-950/70 px-3 text-sm font-bold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.18)] backdrop-blur transition hover:border-yellow-200 hover:text-yellow-100"
        >
          {hud.phase === "paused" ? "继续" : "暂停"}
        </button>
        <button
          type="button"
          aria-label="设置"
          onClick={() => setSettingsOpen((open) => !open)}
          className="grid h-10 w-10 place-items-center rounded border border-cyan-300/40 bg-slate-950/70 text-lg text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.18)] backdrop-blur transition hover:border-yellow-200 hover:text-yellow-100"
        >
          ⚙
        </button>
        {settingsOpen && (
          <div className="absolute right-0 top-12 w-52 border border-cyan-300/35 bg-slate-950/85 p-2 text-sm text-cyan-50 shadow-[0_0_30px_rgba(14,165,233,0.2)] backdrop-blur">
            <button
              type="button"
              onClick={toggleMusic}
              className="block w-full border border-transparent px-3 py-2 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
            >
              {musicEnabled ? "关闭美妙音乐" : "开启美妙音乐"}
            </button>
            <button
              type="button"
              onClick={toggleSfx}
              className="mt-1 block w-full border border-transparent px-3 py-2 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
            >
              {sfxEnabled ? "关闭私人音效" : "开启私人音效"}
            </button>
            <button
              type="button"
              onClick={restart}
              className="mt-1 block w-full border border-transparent px-3 py-2 text-left text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-300/10"
            >
              重新开始
            </button>
          </div>
        )}
      </div>

      <section className="pointer-events-none absolute left-0 top-0 w-full p-3 sm:p-4">
        <div className="grid gap-3 text-xs text-cyan-50 sm:grid-cols-[minmax(260px,520px)_auto] sm:items-start">
          <div className="space-y-2 rounded border border-cyan-300/15 bg-slate-950/35 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="min-w-16 text-cyan-200">等级 {hud.level}</span>
              <div className="h-3 flex-1 border border-cyan-300/50 bg-slate-950/70">
                <div className="h-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" style={{ width: `${expPercent}%` }} />
              </div>
              <span className="min-w-20 text-right text-cyan-100">
                {hud.exp}/{hud.nextExp}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="min-w-16 text-rose-200">生命</span>
              <div className="h-3 flex-1 border border-rose-300/50 bg-slate-950/70">
                <div className="h-full bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.8)]" style={{ width: `${hpPercent}%` }} />
              </div>
              <span className="min-w-20 text-right text-rose-100">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">WASD / 方向键移动，武器会自动攻击最近敌人</div>
            {gameRef.current.player.haoModeActive && (
              <div className="text-[11px] font-bold text-yellow-100">
                自在极意豪形态 {gameRef.current.player.haoModeTimer.toFixed(1)}s
              </div>
            )}
          </div>
          <div className="grid w-fit grid-cols-2 gap-x-6 gap-y-1 rounded border border-cyan-300/20 bg-slate-950/55 p-3 text-right shadow-[0_0_24px_rgba(14,165,233,0.12)] backdrop-blur">
            <span className="text-slate-300">击杀</span>
            <span className="text-yellow-100">{hud.kills}</span>
            <span className="text-slate-300">存活</span>
            <span className="text-yellow-100">{formatTime(hud.time)}</span>
          </div>
        </div>
      </section>

      <div className="absolute bottom-5 left-5 z-20 h-32 w-32 touch-none select-none sm:bottom-7 sm:left-7 landscape:h-36 landscape:w-36 [@media(pointer:fine)]:hidden">
        <div
          role="presentation"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setJoystickActive(true);
            updateJoystick(event);
          }}
          onPointerMove={(event) => {
            if (joystickActive) updateJoystick(event);
          }}
          onPointerUp={resetJoystick}
          onPointerCancel={resetJoystick}
          className={`relative h-full w-full rounded-full border border-cyan-300/35 bg-slate-950/45 shadow-[0_0_24px_rgba(34,211,238,0.18)] backdrop-blur transition ${
            joystickActive ? "opacity-95" : "opacity-70"
          }`}
        >
          <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/35" />
          <div
            className="absolute left-1/2 top-1/2 grid h-14 w-14 place-items-center rounded-full border border-yellow-100/70 bg-cyan-300/20 text-sm font-bold text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.24)]"
            style={{ transform: `translate(calc(-50% + ${joystickKnob.x}px), calc(-50% + ${joystickKnob.y}px))` }}
          >
            移
          </div>
        </div>
      </div>

      {hud.phase === "leveling" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/74 p-5 backdrop-blur-sm">
          <section className="w-full max-w-3xl border border-cyan-300/60 bg-[#07111f] p-6 shadow-[0_0_52px_rgba(34,211,238,0.28)]">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-[0.18em] text-cyan-100">升级</h1>
              <p className="mt-2 text-sm text-slate-300">A / D 左右选择，空格或 Enter 确定</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {choices.map((skill, index) => (
                <button
                  key={skill.key}
                  type="button"
                  onClick={() => chooseSkill(skill)}
                  onMouseEnter={() => setSelectedChoice(index)}
                  className={`min-h-36 border p-5 text-left transition hover:-translate-y-1 hover:border-yellow-200 hover:bg-yellow-200/10 hover:shadow-[0_0_30px_rgba(250,204,21,0.28)] ${
                    selectedChoice === index
                      ? "border-yellow-200 bg-yellow-200/10 shadow-[0_0_30px_rgba(250,204,21,0.28)]"
                      : "border-cyan-300/45 bg-cyan-300/10"
                  }`}
                >
                  <span className="block text-lg font-bold text-cyan-100">{skill.title}</span>
                  <span className="mt-4 block text-sm leading-6 text-slate-300">{skill.desc}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {hud.phase === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-[2px]">
          <section className="border border-cyan-300/50 bg-slate-950/80 px-8 py-6 text-center shadow-[0_0_36px_rgba(34,211,238,0.22)]">
            <h2 className="text-2xl font-bold tracking-[0.16em] text-cyan-100">已暂停</h2>
            <button
              type="button"
              onClick={togglePause}
              className="mt-5 border border-cyan-300/60 bg-cyan-300/10 px-6 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              继续游戏
            </button>
          </section>
        </div>
      )}

      {hud.phase === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/78 p-5 backdrop-blur-sm">
          <section className="w-full max-w-md border border-rose-300/50 bg-[#120812] p-7 text-center shadow-[0_0_44px_rgba(244,63,94,0.24)]">
            <h1 className="text-3xl font-bold tracking-[0.16em] text-rose-100">游戏结束</h1>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="border border-white/10 bg-white/5 p-3">
                <div className="text-slate-400">存活时间</div>
                <div className="mt-1 text-xl text-yellow-100">{formatTime(hud.time)}</div>
              </div>
              <div className="border border-white/10 bg-white/5 p-3">
                <div className="text-slate-400">击杀数</div>
                <div className="mt-1 text-xl text-yellow-100">{hud.kills}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-7 border border-cyan-300/60 bg-cyan-300/10 px-7 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 hover:shadow-[0_0_24px_rgba(34,211,238,0.24)]"
            >
              重新开始
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
