import Phaser from 'phaser';
import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = '<div id="game-shell"></div>';

const W = 1280;
const H = 720;
const INK = 0x0b0908;
const PAPER = '#ead9b8';
const RED = 0xb92f2f;

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  create() {
    this.cameras.main.setBackgroundColor('#090807');
    const g = this.add.graphics();
    g.fillStyle(0x120f0c).fillRect(0, 0, W, H);
    for (let i = 0; i < 120; i++) {
      g.fillStyle(0x7b6650, Phaser.Math.FloatBetween(.02, .07));
      g.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Phaser.Math.Between(1, 3));
    }
    g.lineStyle(2, 0x4c1515, .65).strokeRect(52, 44, W - 104, H - 88);
    g.lineStyle(1, 0x8b6b47, .25).strokeRect(62, 54, W - 124, H - 108);

    this.add.text(W / 2, 126, '鬼 殺 場', {
      fontFamily: 'Noto Serif KR', fontSize: '74px', color: '#d7b98b', fontStyle: 'bold'
    }).setOrigin(.5).setLetterSpacing(18);
    this.add.text(W / 2, 214, '귀 살 장', {
      fontFamily: 'Noto Serif KR', fontSize: '32px', color: PAPER, fontStyle: 'bold'
    }).setOrigin(.5).setLetterSpacing(16);

    this.add.text(W / 2, 300,
      '죽은 자의 혼을 베어 길을 연다.\n그러나 네가 찾는 마지막 혼은… 아직 저 아래에 있다.', {
        fontFamily: 'Noto Serif KR', fontSize: '22px', color: '#bba98d', align: 'center', lineSpacing: 13
      }).setOrigin(.5);

    const start = this.add.text(W / 2, 445, '첫 번째 밤을 시작한다', {
      fontFamily: 'Noto Serif KR', fontSize: '28px', color: '#f2dfb8', backgroundColor: '#5f1717',
      padding: { x: 34, y: 15 }
    }).setOrigin(.5).setInteractive({ useHandCursor: true });

    this.add.text(W / 2, 510, 'SPACE / 클릭', {
      fontFamily: 'Noto Serif KR', fontSize: '16px', color: '#786d5e'
    }).setOrigin(.5);

    this.tweens.add({ targets: start, alpha: .62, duration: 900, yoyo: true, repeat: -1 });
    const go = () => this.scene.start('game');
    start.on('pointerdown', go);
    this.input.keyboard?.once('keydown-SPACE', go);
  }
}

type EnemyState = 'approach' | 'telegraph' | 'strike' | 'dead';

class GameScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Container;
  enemy!: Phaser.GameObjects.Container;
  enemyAura!: Phaser.GameObjects.Arc;
  enemyState: EnemyState = 'approach';
  enemyTimer = 0;
  enemyHp = 3;
  playerHp = 5;
  combo = 0;
  multiplier = 1;
  souls = 0;
  kills = 0;
  attackStart = 0;
  perfectWindow = false;
  counterCooldown = false;
  ended = false;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  hpText!: Phaser.GameObjects.Text;
  soulText!: Phaser.GameObjects.Text;
  comboText!: Phaser.GameObjects.Text;
  hintText!: Phaser.GameObjects.Text;
  rankText!: Phaser.GameObjects.Text;
  storyText!: Phaser.GameObjects.Text;

  constructor() { super('game'); }

  create() {
    this.cameras.main.setBackgroundColor('#0b0908');
    this.drawArena();
    this.player = this.makePlayer(300, 470);
    this.enemy = this.makeEnemy(980, 455);
    this.enemyAura = this.add.circle(980, 455, 74, RED, 0).setStrokeStyle(3, RED, 0);
    this.enemyAura.setDepth(2);
    this.enemy.setDepth(3);
    this.player.setDepth(4);
    this.createHud();

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Z') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-SPACE', () => this.counter());
    kb.on('keydown-Z', () => this.counter());
    this.input.on('pointerdown', () => this.counter());

    this.time.delayedCall(400, () => this.spawnEnemy());
    this.showStory('첫째 밤 · 삼도천 입구', '“누이의 혼은 이 아래에 있다.”');
  }

  drawArena() {
    const g = this.add.graphics();
    g.fillStyle(0x0d0b09).fillRect(0, 0, W, H);
    g.fillStyle(0x14100c).fillRect(0, 420, W, 300);
    g.lineStyle(2, 0x3f3429, .55);
    for (let x = -120; x < W + 160; x += 110) {
      g.beginPath().moveTo(x, H).lineTo(x + 370, 410).strokePath();
    }
    for (let y = 450; y < H; y += 55) g.lineBetween(0, y, W, y);

    g.fillStyle(0x070605, .9).fillRect(0, 0, W, 110);
    for (let i = 0; i < 8; i++) {
      const x = i * 190 - 50;
      g.fillStyle(0x17100c).fillRect(x, 180, 120, 230);
      g.fillTriangle(x - 38, 184, x + 60, 125, x + 158, 184);
    }
    const moon = this.add.circle(1040, 155, 70, 0xb99c73, .12);
    moon.setStrokeStyle(2, 0x8e7250, .18);
    this.add.rectangle(W / 2, H / 2, W, H, 0x2c0000, .04).setBlendMode(Phaser.BlendModes.ADD);
  }

  makePlayer(x: number, y: number) {
    const c = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 52, 92, 24, 0x000000, .55);
    const robe = this.add.polygon(0, 15, [-30, 45, -20, -20, 0, -52, 22, -18, 33, 47], 0x24211d);
    robe.setStrokeStyle(2, 0x8f826c, .5);
    const head = this.add.circle(0, -58, 16, 0xc6aa86);
    const hat = this.add.rectangle(0, -76, 64, 6, 0x171411);
    const blade = this.add.rectangle(42, 0, 7, 102, 0xc8b88f).setRotation(.45).setOrigin(.5, .9);
    const talisman = this.add.rectangle(-22, -3, 13, 30, 0xd7b15f).setRotation(-.15);
    c.add([shadow, blade, robe, head, hat, talisman]);
    return c;
  }

  makeEnemy(x: number, y: number) {
    const c = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 57, 95, 25, 0x000000, .7);
    const body = this.add.ellipse(0, 5, 66, 112, 0x181518);
    body.setStrokeStyle(2, 0x6e2429, .7);
    const face = this.add.circle(0, -47, 29, 0xd0c2a6);
    const eyeL = this.add.circle(-10, -50, 4, RED);
    const eyeR = this.add.circle(10, -50, 4, RED);
    const mouth = this.add.rectangle(0, -34, 20, 3, 0x4a1116);
    const clawL = this.add.rectangle(-39, 5, 10, 70, 0x2a2020).setRotation(.55);
    const clawR = this.add.rectangle(39, 5, 10, 70, 0x2a2020).setRotation(-.55);
    c.add([shadow, clawL, clawR, body, face, eyeL, eyeR, mouth]);
    return c;
  }

  createHud() {
    this.add.text(38, 26, '귀살장', { fontFamily: 'Noto Serif KR', fontSize: '26px', color: PAPER, fontStyle: 'bold' });
    this.hpText = this.add.text(38, 70, '', { fontFamily: 'Noto Serif KR', fontSize: '17px', color: '#cdbb9e' });
    this.soulText = this.add.text(W - 38, 28, '', { fontFamily: 'Noto Serif KR', fontSize: '21px', color: '#d7b98b' }).setOrigin(1, 0);
    this.comboText = this.add.text(W / 2, 37, '', { fontFamily: 'Noto Serif KR', fontSize: '34px', color: '#e0c18c', fontStyle: 'bold' }).setOrigin(.5);
    this.rankText = this.add.text(W / 2, 100, '', { fontFamily: 'Noto Serif KR', fontSize: '72px', color: '#e9d8b6', fontStyle: 'bold' }).setOrigin(.5).setDepth(20).setAlpha(0);
    this.hintText = this.add.text(W / 2, H - 35, '이동 WASD / 방향키   ·   반격 SPACE / Z / 화면 터치', {
      fontFamily: 'Noto Serif KR', fontSize: '16px', color: '#877765'
    }).setOrigin(.5).setDepth(20);
    this.storyText = this.add.text(W / 2, 155, '', {
      fontFamily: 'Noto Serif KR', fontSize: '18px', color: '#9e8d75', align: 'center', lineSpacing: 8
    }).setOrigin(.5).setDepth(20);
    this.refreshHud();
  }

  refreshHud() {
    this.hpText.setText(`생명  ${'◆'.repeat(Math.max(0, this.playerHp))}${'◇'.repeat(Math.max(0, 5 - this.playerHp))}`);
    this.soulText.setText(`혼 ${this.souls.toLocaleString()}  ·  처치 ${this.kills}`);
    this.comboText.setText(this.combo > 0 ? `×${this.multiplier}  ${this.combo} 연격` : '×1');
  }

  showStory(title: string, line: string) {
    this.storyText.setText(`${title}\n${line}`).setAlpha(0);
    this.tweens.add({ targets: this.storyText, alpha: 1, duration: 500, hold: 1800, yoyo: true, onComplete: () => this.storyText.setText('') });
  }

  spawnEnemy() {
    this.enemyState = 'approach';
    this.enemyHp = 2 + Math.min(3, Math.floor(this.kills / 3));
    this.enemy.x = 980;
    this.enemy.y = Phaser.Math.Between(400, 500);
    this.enemy.setAlpha(1).setScale(1);
    this.enemyAura.setPosition(this.enemy.x, this.enemy.y).setAlpha(0);
    this.enemyTimer = this.time.now + Phaser.Math.Between(900, 1500);
  }

  update(_: number, delta: number) {
    if (this.ended) return;
    const speed = 260 * (delta / 1000);
    const left = this.keys.A.isDown || this.keys.LEFT.isDown;
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown;
    const up = this.keys.W.isDown || this.keys.UP.isDown;
    const down = this.keys.S.isDown || this.keys.DOWN.isDown;
    if (left) this.player.x -= speed;
    if (right) this.player.x += speed;
    if (up) this.player.y -= speed;
    if (down) this.player.y += speed;
    this.player.x = Phaser.Math.Clamp(this.player.x, 120, 600);
    this.player.y = Phaser.Math.Clamp(this.player.y, 360, 570);

    if (this.enemyState === 'approach' && this.time.now >= this.enemyTimer) this.beginTelegraph();
    if (this.enemyState === 'telegraph') {
      const t = this.time.now - this.attackStart;
      const alpha = Phaser.Math.Clamp(t / 750, .1, .95);
      this.enemyAura.setPosition(this.enemy.x, this.enemy.y).setAlpha(alpha).setScale(.75 + alpha * .45);
      this.perfectWindow = t >= 540 && t <= 760;
      if (t > 840) this.enemyStrike();
    }
  }

  beginTelegraph() {
    this.enemyState = 'telegraph';
    this.attackStart = this.time.now;
    this.perfectWindow = false;
    this.enemyAura.setAlpha(.15).setScale(.7);
    this.tweens.add({ targets: this.enemy, x: this.enemy.x - 18, duration: 170, yoyo: true, repeat: 2 });
  }

  counter() {
    if (this.ended || this.counterCooldown) return;
    this.counterCooldown = true;
    this.time.delayedCall(260, () => this.counterCooldown = false);

    if (this.enemyState !== 'telegraph') {
      this.feedback('MISS', '#766b61', .75);
      return;
    }

    const timing = this.time.now - this.attackStart;
    if (this.perfectWindow) {
      this.resolveCounter('PERFECT', 2);
    } else if (timing >= 410 && timing <= 815) {
      this.resolveCounter('GREAT', 1);
    } else {
      this.resolveCounter('EARLY', 0);
    }
  }

  resolveCounter(rank: string, damage: number) {
    if (damage === 0) {
      this.feedback(rank, '#a68b6d', .85);
      return;
    }

    this.enemyState = 'approach';
    this.enemyAura.setAlpha(0);
    this.enemyHp -= damage;
    this.combo++;
    this.multiplier = Math.min(32, Math.pow(2, Math.min(5, Math.floor((this.combo + 1) / 2))));
    this.souls += 10 * this.multiplier;
    this.refreshHud();

    this.cameras.main.shake(rank === 'PERFECT' ? 115 : 70, rank === 'PERFECT' ? .012 : .006);
    this.cameras.main.flash(75, 170, 35, 35, true);
    this.time.timeScale = .45;
    this.time.delayedCall(65, () => this.time.timeScale = 1);
    this.feedback(rank, rank === 'PERFECT' ? '#f2dfb8' : '#d3b482', rank === 'PERFECT' ? 1.25 : 1);
    this.slashEffect();
    this.tweens.add({ targets: this.enemy, x: this.enemy.x + 48, angle: 5, duration: 70, yoyo: true });

    if (this.enemyHp <= 0) {
      this.killEnemy();
    } else {
      this.enemyTimer = this.time.now + Phaser.Math.Between(700, 1200);
    }
  }

  enemyStrike() {
    this.enemyState = 'strike';
    this.enemyAura.setAlpha(0);
    this.perfectWindow = false;
    this.tweens.add({
      targets: this.enemy, x: this.player.x + 85, y: this.player.y, duration: 115, ease: 'Quad.easeIn',
      onComplete: () => {
        this.playerHp--;
        this.combo = 0;
        this.multiplier = 1;
        this.refreshHud();
        this.feedback('피격', '#c84444', 1);
        this.cameras.main.shake(170, .018);
        this.cameras.main.flash(90, 120, 0, 0, true);
        if (this.playerHp <= 0) return this.gameOver();
        this.tweens.add({ targets: this.enemy, x: 980, duration: 230, onComplete: () => { this.enemyState = 'approach'; this.enemyTimer = this.time.now + 900; } });
      }
    });
  }

  killEnemy() {
    this.enemyState = 'dead';
    this.kills++;
    this.souls += 40 * this.multiplier;
    this.refreshHud();
    this.feedback(`혼 +${40 * this.multiplier}`, '#d8b466', .75);
    this.tweens.add({
      targets: this.enemy, alpha: 0, scaleX: 1.35, scaleY: .15, angle: 16, duration: 240,
      onComplete: () => {
        if (this.kills === 3) this.showStory('기억의 파편', '“오라버니, 너무 깊이 내려오지 마.”');
        if (this.kills === 6) this.showStory('금기의 징조', '흡수한 혼이 많아질수록 네 그림자가 짙어진다.');
        this.time.delayedCall(450, () => this.spawnEnemy());
      }
    });
  }

  slashEffect() {
    const slash = this.add.rectangle((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2 - 5, 260, 7, 0xf1dfb9, .92)
      .setRotation(-.22).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    const redSlash = this.add.rectangle(slash.x, slash.y + 10, 210, 3, RED, .8).setRotation(-.22).setDepth(14);
    this.tweens.add({ targets: [slash, redSlash], alpha: 0, scaleX: 1.5, duration: 150, onComplete: () => { slash.destroy(); redSlash.destroy(); } });
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(this.enemy.x, this.enemy.y, Phaser.Math.Between(2, 5), 0xb73131, .9).setDepth(12);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-80, 80), y: p.y + Phaser.Math.Between(-70, 40), alpha: 0, duration: 320, onComplete: () => p.destroy() });
    }
  }

  feedback(text: string, color: string, scale: number) {
    this.rankText.setText(text).setColor(color).setAlpha(1).setScale(scale);
    this.tweens.killTweensOf(this.rankText);
    this.tweens.add({ targets: this.rankText, y: 120, alpha: 0, scale: scale + .2, duration: 520, ease: 'Cubic.easeOut', onComplete: () => this.rankText.setY(100) });
  }

  gameOver() {
    this.ended = true;
    this.enemyState = 'dead';
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x050404, .86).setDepth(50);
    const title = this.add.text(W / 2, 225, '혼이 끊어졌다', { fontFamily: 'Noto Serif KR', fontSize: '52px', color: '#be4747', fontStyle: 'bold' }).setOrigin(.5).setDepth(51);
    const stat = this.add.text(W / 2, 315, `처치 ${this.kills}   ·   회수한 혼 ${this.souls.toLocaleString()}`, { fontFamily: 'Noto Serif KR', fontSize: '21px', color: '#c7b69b' }).setOrigin(.5).setDepth(51);
    const retry = this.add.text(W / 2, 405, '다시 내려간다', { fontFamily: 'Noto Serif KR', fontSize: '25px', color: PAPER, backgroundColor: '#5f1717', padding: { x: 30, y: 13 } }).setOrigin(.5).setDepth(51).setInteractive({ useHandCursor: true });
    retry.on('pointerdown', () => this.scene.restart());
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.restart());
    void shade; void title; void stat;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-shell',
  width: W,
  height: H,
  backgroundColor: INK,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
