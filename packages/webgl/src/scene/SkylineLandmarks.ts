import * as THREE from 'three';

const FT = 0.3048;

/**
 * Iconic SF skyline landmarks as simplified procedural silhouettes.
 * Spread around the scene on correct compass bearings from Civic Center:
 *   - NE: FiDi cluster (Transamerica, Salesforce, 555 California)
 *   - N:  Coit Tower on Telegraph Hill
 *   - S:  SoMa mid-rises
 *   - W:  Western Addition / Alamo Square Victorians
 *   - SE: Mission district mid-rises
 *
 * Distances compressed so landmarks are visible but surround the plaza.
 */
export function createSkylineLandmarks(timeOfDay: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SkylineLandmarks';

  const windowEmissive = timeOfDay === 'day' ? 0 : timeOfDay === 'dusk' ? 0.1 : 0.25;

  // ── NE: TRANSAMERICA PYRAMID ──
  {
    const tx = 900 * FT;
    const tz = -700 * FT;
    const baseW = 100 * FT;
    const h = 853 * FT;

    const pyramidMat = new THREE.MeshStandardMaterial({
      color: 0xd8d0c0, roughness: 0.6, metalness: 0.15
    });

    const pyramid = new THREE.Mesh(
      new THREE.ConeGeometry(baseW / 2, h * 0.85, 4),
      pyramidMat
    );
    pyramid.position.set(tx, h * 0.85 / 2, tz);
    pyramid.rotation.y = Math.PI / 4;
    pyramid.castShadow = true;
    group.add(pyramid);

    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(baseW * 0.04, h * 0.15, 6),
      pyramidMat
    );
    spire.position.set(tx, h * 0.85 + h * 0.075, tz);
    group.add(spire);

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

  // ── E: SALESFORCE TOWER ──
  {
    const sx = 1100 * FT;
    const sz = 200 * FT;
    const w = 90 * FT;
    const d = 80 * FT;
    const h = 1070 * FT;

    const sfMat = new THREE.MeshStandardMaterial({
      color: 0xb8c8d8, roughness: 0.3, metalness: 0.4
    });

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.9, d), sfMat
    );
    tower.position.set(sx, h * 0.9 / 2, sz);
    tower.castShadow = true;
    group.add(tower);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(w / 2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      sfMat
    );
    crown.position.set(sx, h * 0.9, sz);
    crown.scale.set(1, 0.3, d / w);
    group.add(crown);

    addWindowDots(group, sx, sz, w * 0.8, h * 0.85, windowEmissive, 5, 18);
  }

  // ── N: COIT TOWER on Telegraph Hill ──
  {
    const cx = 400 * FT;
    const cz = -1400 * FT;
    const hillH = 160 * FT;
    const towerH = 180 * FT;
    const towerR = 18 * FT;

    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x4a5a3a, roughness: 0.9, metalness: 0
    });
    const coitMat = new THREE.MeshStandardMaterial({
      color: 0xd0c8b8, roughness: 0.5, metalness: 0.1
    });

    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(180 * FT, hillH, 8), hillMat
    );
    hill.position.set(cx, hillH / 2, cz);
    group.add(hill);

    const coitBody = new THREE.Mesh(
      new THREE.CylinderGeometry(towerR, towerR * 1.1, towerH, 12), coitMat
    );
    coitBody.position.set(cx, hillH + towerH / 2, cz);
    group.add(coitBody);

    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(towerR * 1.3, towerR * 1.3, towerH * 0.06, 12), coitMat
    );
    deck.position.set(cx, hillH + towerH * 0.9, cz);
    group.add(deck);

    const coitTop = new THREE.Mesh(
      new THREE.SphereGeometry(towerR, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), coitMat
    );
    coitTop.position.set(cx, hillH + towerH, cz);
    group.add(coitTop);
  }

  // ── NE: 555 CALIFORNIA ──
  {
    const bx = 800 * FT;
    const bz = -900 * FT;
    const bw = 80 * FT;
    const bh = 700 * FT;

    const darkGranite = new THREE.MeshStandardMaterial({
      color: 0x5a4a42, roughness: 0.7, metalness: 0.1
    });

    const bofa = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bw * 0.85), darkGranite
    );
    bofa.position.set(bx, bh / 2, bz);
    bofa.castShadow = true;
    group.add(bofa);

    const crownStep = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.7, bh * 0.04, bw * 0.6), darkGranite
    );
    crownStep.position.set(bx, bh * 0.98, bz);
    group.add(crownStep);

    addWindowDots(group, bx, bz, bw * 0.7, bh * 0.9, windowEmissive, 4, 14);
  }

  // ── NE: FiDi cluster (near Transamerica / Salesforce) ──
  const fiDiTowers: Array<{ x: number; z: number; w: number; d: number; h: number }> = [
    { x: 1000, z: -500, w: 75, d: 65, h: 450 },
    { x: 850,  z: -550, w: 65, d: 55, h: 380 },
    { x: 1100, z: -400, w: 70, d: 60, h: 350 },
    { x: 950,  z: -350, w: 60, d: 55, h: 300 },
  ];

  // ── S: SoMa mid-rises ──
  const somaTowers: Array<{ x: number; z: number; w: number; d: number; h: number }> = [
    { x: 300,  z: 900,  w: 90, d: 70, h: 250 },
    { x: 500,  z: 1000, w: 80, d: 65, h: 200 },
    { x: 100,  z: 1100, w: 100, d: 80, h: 180 },
    { x: -200, z: 950,  w: 85, d: 70, h: 220 },
    { x: 700,  z: 850,  w: 70, d: 60, h: 280 },
  ];

  // ── W: Western Addition / behind City Hall ──
  const westTowers: Array<{ x: number; z: number; w: number; d: number; h: number }> = [
    { x: -800, z: -300, w: 100, d: 80, h: 150 },
    { x: -900, z: -600, w: 80, d: 70, h: 120 },
    { x: -700, z: -800, w: 90, d: 75, h: 140 },
    { x: -1000, z: -100, w: 110, d: 85, h: 130 },
    { x: -850, z: 100,  w: 75, d: 65, h: 110 },
  ];

  // ── SE: Mission district ──
  const missionTowers: Array<{ x: number; z: number; w: number; d: number; h: number }> = [
    { x: 800,  z: 700,  w: 70, d: 60, h: 200 },
    { x: 650,  z: 850,  w: 80, d: 65, h: 170 },
    { x: 950,  z: 600,  w: 65, d: 55, h: 230 },
  ];

  // ── NW: Pacific Heights / Japantown ──
  const nwTowers: Array<{ x: number; z: number; w: number; d: number; h: number }> = [
    { x: -600, z: -1000, w: 80, d: 70, h: 130 },
    { x: -750, z: -1200, w: 90, d: 75, h: 110 },
    { x: -400, z: -1100, w: 70, d: 60, h: 100 },
  ];

  const allGeneric = [...fiDiTowers, ...somaTowers, ...westTowers, ...missionTowers, ...nwTowers];

  const towerMats = [
    new THREE.MeshStandardMaterial({ color: 0x99a0a8, roughness: 0.4, metalness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: 0xa8a098, roughness: 0.5, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0x8898a8, roughness: 0.35, metalness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0x9a9080, roughness: 0.6, metalness: 0.15 }),
  ];

  // Seed-based pseudo-random for consistent material assignment
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (const t of allGeneric) {
    const tx = t.x * FT;
    const tz = t.z * FT;
    const tw = t.w * FT;
    const td = t.d * FT;
    const th = t.h * FT;
    const mat = towerMats[Math.floor(seededRandom() * towerMats.length)];

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(tw, th, td), mat
    );
    tower.position.set(tx, th / 2, tz);
    tower.castShadow = true;
    group.add(tower);

    // Only add window dots to taller buildings
    if (th > 40 * FT) {
      addWindowDots(group, tx, tz, tw * 0.7, th * 0.9, windowEmissive,
        Math.max(2, Math.floor(tw / (20 * FT))),
        Math.max(3, Math.floor(th / (25 * FT)))
      );
    }
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

  // Seed for consistent window patterns
  let seed = Math.floor(x * 100 + z * 7);
  const seededRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (seededRandom() > 0.6) continue;
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
