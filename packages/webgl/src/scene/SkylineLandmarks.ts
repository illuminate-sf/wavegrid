import * as THREE from 'three';

const FT = 0.3048;

/**
 * Iconic SF skyline landmarks as simplified procedural silhouettes.
 * Positioned on correct compass bearings from Civic Center Plaza.
 *
 * Distances are compressed (~1:3) so landmarks are visible from
 * the drone/skyline camera presets while maintaining relative positions.
 */
export function createSkylineLandmarks(timeOfDay: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SkylineLandmarks';

  const windowEmissive = timeOfDay === 'day' ? 0 : timeOfDay === 'dusk' ? 0.1 : 0.25;

  // ── TRANSAMERICA PYRAMID ──
  // NE of Civic Center, ~1 mile. Iconic tapered obelisk, 853ft.
  {
    const tx = 1200 * FT;
    const tz = -800 * FT;
    const baseW = 120 * FT;
    const h = 853 * FT;

    const pyramidMat = new THREE.MeshStandardMaterial({
      color: 0xd8d0c0,
      roughness: 0.6,
      metalness: 0.15
    });

    // Main tapered body (cone)
    const pyramidGeo = new THREE.ConeGeometry(baseW / 2, h * 0.85, 4);
    const pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    pyramid.position.set(tx, h * 0.85 / 2, tz);
    pyramid.rotation.y = Math.PI / 4; // rotate 45° so faces align to grid
    pyramid.castShadow = true;
    group.add(pyramid);

    // Spire top
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(baseW * 0.04, h * 0.15, 6),
      pyramidMat
    );
    spire.position.set(tx, h * 0.85 + h * 0.075, tz);
    group.add(spire);

    // "Wings" (the two side wings of the real building)
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(baseW * 0.12, h * 0.35, baseW * 0.08),
        pyramidMat
      );
      wing.position.set(tx + side * baseW * 0.35, h * 0.2, tz);
      group.add(wing);
    }

    addWindowDots(group, tx, tz, baseW * 0.6, h * 0.7, windowEmissive, 6, 12);
  }

  // ── SALESFORCE TOWER ──
  // E/SE of Civic Center, ~0.8 mile. Tallest building in SF, 1070ft.
  {
    const sx = 1400 * FT;
    const sz = -200 * FT;
    const w = 100 * FT;
    const d = 90 * FT;
    const h = 1070 * FT;

    const sfTowerMat = new THREE.MeshStandardMaterial({
      color: 0xb8c8d8,
      roughness: 0.3,
      metalness: 0.4
    });

    // Main rectangular tower with rounded top
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.9, d),
      sfTowerMat
    );
    tower.position.set(sx, h * 0.9 / 2, sz);
    tower.castShadow = true;
    group.add(tower);

    // Rounded crown (hemisphere)
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(w / 2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      sfTowerMat
    );
    crown.position.set(sx, h * 0.9, sz);
    crown.scale.set(1, 0.3, d / w);
    group.add(crown);

    addWindowDots(group, sx, sz, w * 0.8, h * 0.85, windowEmissive, 5, 18);
  }

  // ── COIT TOWER ──
  // NE on Telegraph Hill, ~1.5 miles. 210ft tower on ~275ft hill.
  {
    const cx = 1800 * FT;
    const cz = -1200 * FT;
    const hillH = 180 * FT; // compressed hill height
    const towerH = 210 * FT;
    const towerR = 20 * FT;

    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x4a5a3a,
      roughness: 0.9,
      metalness: 0
    });
    const coitMat = new THREE.MeshStandardMaterial({
      color: 0xd0c8b8,
      roughness: 0.5,
      metalness: 0.1
    });

    // Telegraph Hill (cone)
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(200 * FT, hillH, 8),
      hillMat
    );
    hill.position.set(cx, hillH / 2, cz);
    group.add(hill);

    // Coit Tower (fluted column — cylinder)
    const coitBody = new THREE.Mesh(
      new THREE.CylinderGeometry(towerR, towerR * 1.1, towerH, 12),
      coitMat
    );
    coitBody.position.set(cx, hillH + towerH / 2, cz);
    group.add(coitBody);

    // Observation deck ring
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(towerR * 1.3, towerR * 1.3, towerH * 0.06, 12),
      coitMat
    );
    deck.position.set(cx, hillH + towerH * 0.9, cz);
    group.add(deck);

    // Arched top
    const coitTop = new THREE.Mesh(
      new THREE.SphereGeometry(towerR, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      coitMat
    );
    coitTop.position.set(cx, hillH + towerH, cz);
    group.add(coitTop);
  }

  // ── GENERIC FINANCIAL DISTRICT TOWERS ──
  // Cluster NE of Civic Center, various heights
  const fiDiTowers: Array<{ x: number; z: number; w: number; d: number; h: number }> = [
    { x: 1000, z: -500, w: 80, d: 70, h: 500 },
    { x: 1100, z: -600, w: 70, d: 60, h: 420 },
    { x: 950,  z: -700, w: 90, d: 80, h: 380 },
    { x: 1300, z: -500, w: 60, d: 55, h: 350 },
    { x: 1150, z: -350, w: 75, d: 65, h: 460 },
    { x: 1500, z: -600, w: 65, d: 60, h: 320 },
    { x: 800,  z: -400, w: 85, d: 75, h: 280 },
    { x: 1050, z: -250, w: 70, d: 60, h: 300 },
  ];

  const towerMats = [
    new THREE.MeshStandardMaterial({ color: 0x99a0a8, roughness: 0.4, metalness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: 0xa8a098, roughness: 0.5, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0x8898a8, roughness: 0.35, metalness: 0.35 }),
  ];

  for (const t of fiDiTowers) {
    const tx = t.x * FT;
    const tz = t.z * FT;
    const tw = t.w * FT;
    const td = t.d * FT;
    const th = t.h * FT;
    const mat = towerMats[Math.floor(Math.random() * towerMats.length)];

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(tw, th, td),
      mat
    );
    tower.position.set(tx, th / 2, tz);
    tower.castShadow = true;
    group.add(tower);

    addWindowDots(group, tx, tz, tw * 0.7, th * 0.9, windowEmissive, 3, 8);
  }

  // ── 555 CALIFORNIA (formerly Bank of America Center) ──
  // Dark granite tower NE, 779ft
  {
    const bx = 1050 * FT;
    const bz = -900 * FT;
    const bw = 90 * FT;
    const bh = 779 * FT;

    const darkGranite = new THREE.MeshStandardMaterial({
      color: 0x5a4a42,
      roughness: 0.7,
      metalness: 0.1
    });

    const bofa = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bw * 0.85),
      darkGranite
    );
    bofa.position.set(bx, bh / 2, bz);
    bofa.castShadow = true;
    group.add(bofa);

    // Stepped crown
    const crownStep = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.7, bh * 0.04, bw * 0.6),
      darkGranite
    );
    crownStep.position.set(bx, bh * 0.98, bz);
    group.add(crownStep);

    addWindowDots(group, bx, bz, bw * 0.7, bh * 0.9, windowEmissive, 4, 14);
  }

  return group;
}

/**
 * Scatter warm window dots on the front face of a tower for night/dusk lighting.
 */
function addWindowDots(
  group: THREE.Group,
  x: number, z: number,
  width: number, height: number,
  emissiveIntensity: number,
  cols: number, rows: number
): void {
  if (emissiveIntensity <= 0) return;

  const winMat = new THREE.MeshBasicMaterial({
    color: 0xffe8a0,
    transparent: true,
    opacity: emissiveIntensity * 2
  });

  const winSize = Math.min(width / (cols * 2.5), height / (rows * 3));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.6) continue; // ~60% lit
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(winSize, winSize * 1.4),
        winMat
      );
      const wx = x + (c - (cols - 1) / 2) * (width / cols);
      const wy = height * 0.1 + r * (height * 0.85 / rows);
      win.position.set(wx, wy, z - 1);
      group.add(win);
    }
  }
}
