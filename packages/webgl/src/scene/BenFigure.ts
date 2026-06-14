import * as THREE from 'three';
import type { InstallationConfig } from '../installation/BeamState';

const FT = 0.3048;

/**
 * "Ben" — a LEGO-style minifigure standing in front of the rig holding an iPad
 * with a live 7×7 grid visualizer on the screen. Easter egg: he's "controlling" it.
 *
 * LEGO proportions: blocky torso, cylindrical legs, C-shaped claw hands,
 * cylindrical head with a stud on top, blond hair piece, yellow scarf.
 */
export function createBenFigure(config: InstallationConfig): {
  group: THREE.Group;
  ipadScreen: THREE.Mesh;
  position: THREE.Vector3;
} {
  const group = new THREE.Group();
  group.name = 'Ben';

  const half = (config.footprintFt / 2) * FT;
  const benX = half * 0.3;
  const benZ = half + 12 * FT;

  // LEGO scale: ~6ft tall total
  const totalH = 5.8 * FT;
  const legH = totalH * 0.32;
  const torsoH = totalH * 0.3;
  const headH = totalH * 0.22;
  const legTop = legH;
  const torsoTop = legTop + torsoH;

  // Materials
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xe8b800,
    roughness: 0.4,
    metalness: 0.05
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf5c77e,
    roughness: 0.5,
    metalness: 0
  });
  const blondHairMat = new THREE.MeshStandardMaterial({
    color: 0xc8a86e,
    roughness: 0.6,
    metalness: 0
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0xdaa520,
    roughness: 0.5,
    metalness: 0
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.3,
    metalness: 0.8
  });

  // ── LEGS (two blocky cylinders with a hip connector) ──
  const legW = 0.09;
  const legGap = 0.04;
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(legW * 2, legH, legW * 2),
      yellowMat
    );
    leg.position.set(benX + side * (legW + legGap / 2), legH / 2, benZ);
    leg.castShadow = true;
    group.add(leg);

    // Feet
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(legW * 2.2, legH * 0.12, legW * 2.8),
      yellowMat
    );
    foot.position.set(benX + side * (legW + legGap / 2), legH * 0.06, benZ - legW * 0.4);
    group.add(foot);
  }

  // Hip connector
  const hip = new THREE.Mesh(
    new THREE.BoxGeometry((legW + legGap / 2) * 2 + legW * 2, legH * 0.15, legW * 2),
    yellowMat
  );
  hip.position.set(benX, legTop, benZ);
  group.add(hip);

  // ── TORSO (blocky box, wider at shoulders) ──
  const torsoW = 0.3;
  const torsoD = 0.15;
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(torsoW, torsoH, torsoD),
    yellowMat
  );
  torso.position.set(benX, legTop + torsoH / 2, benZ);
  torso.castShadow = true;
  group.add(torso);

  // ── SCARF (torus around neck + hanging tail) ──
  const neckY = torsoTop;
  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.03, 6, 12),
    scarfMat
  );
  scarf.position.set(benX, neckY, benZ);
  scarf.rotation.x = Math.PI / 2;
  group.add(scarf);

  const scarfTail = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, totalH * 0.1, 0.02),
    scarfMat
  );
  scarfTail.position.set(benX + 0.06, neckY - totalH * 0.04, benZ + torsoD / 2 + 0.01);
  scarfTail.rotation.z = 0.15;
  group.add(scarfTail);

  // ── HEAD (LEGO cylinder) ──
  const headR = headH * 0.45;
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(headR, headR, headH, 16),
    skinMat
  );
  head.position.set(benX, torsoTop + headH / 2, benZ);
  head.castShadow = true;
  group.add(head);

  // Stud on top
  const stud = new THREE.Mesh(
    new THREE.CylinderGeometry(headR * 0.45, headR * 0.45, headH * 0.15, 12),
    skinMat
  );
  stud.position.set(benX, torsoTop + headH + headH * 0.07, benZ);
  group.add(stud);

  // ── HAIR (LEGO hair piece — sits on top of head like a cap) ──
  const hairPiece = new THREE.Mesh(
    new THREE.CylinderGeometry(headR * 1.08, headR * 1.05, headH * 0.45, 16),
    blondHairMat
  );
  hairPiece.position.set(benX, torsoTop + headH * 0.85, benZ);
  group.add(hairPiece);

  // Hair swoosh / side bangs
  const hairFront = new THREE.Mesh(
    new THREE.BoxGeometry(headR * 1.6, headH * 0.12, headR * 0.3),
    blondHairMat
  );
  hairFront.position.set(benX, torsoTop + headH * 0.7, benZ - headR * 0.85);
  group.add(hairFront);

  // Longer hair in back
  const hairBack = new THREE.Mesh(
    new THREE.BoxGeometry(headR * 1.8, headH * 0.35, headR * 0.2),
    blondHairMat
  );
  hairBack.position.set(benX, torsoTop + headH * 0.5, benZ + headR * 0.9);
  group.add(hairBack);

  // ── ARMS (LEGO-style: shoulder stud + angled arm, no hands) ──
  const armLen = torsoH * 0.85;
  const armR = 0.035;

  for (const side of [-1, 1]) {
    const shoulderX = benX + side * (torsoW / 2 + armR);
    const shoulderY = torsoTop - 0.02;

    // Shoulder stud
    const shoulder = new THREE.Mesh(
      new THREE.CylinderGeometry(armR * 1.5, armR * 1.5, 0.03, 8),
      yellowMat
    );
    shoulder.position.set(shoulderX, shoulderY, benZ);
    shoulder.rotation.z = Math.PI / 2;
    group.add(shoulder);

    // Arm — angled forward/down to hold iPad
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(armR, armR, armLen, 6),
      yellowMat
    );
    arm.position.set(
      shoulderX,
      shoulderY - armLen * 0.35,
      benZ - 0.1
    );
    arm.rotation.x = -0.5;
    arm.rotation.z = side * -0.2;
    group.add(arm);
  }

  // ── iPAD ──
  const ipadWidth = 0.22;
  const ipadHeight = 0.16;
  const ipadDepth = 0.008;
  const ipadY = torsoTop - torsoH * 0.55;
  const ipadZ = benZ - 0.26;

  const ipadBody = new THREE.Mesh(
    new THREE.BoxGeometry(ipadWidth, ipadHeight, ipadDepth),
    darkMat
  );
  ipadBody.position.set(benX, ipadY, ipadZ);
  ipadBody.rotation.x = -0.3;
  group.add(ipadBody);

  // Rounded iPad bezel (thin frame)
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(ipadWidth + 0.006, ipadHeight + 0.006, ipadDepth * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.1 })
  );
  bezel.position.set(benX, ipadY, ipadZ - ipadDepth * 0.3);
  bezel.rotation.x = -0.3;
  group.add(bezel);

  // ── iPAD SCREEN (canvas texture with 7×7 visualizer) ──
  const screenW = ipadWidth * 0.9;
  const screenH = ipadHeight * 0.9;
  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);

  const canvas = document.createElement('canvas');
  canvas.width = 210;
  canvas.height = 210;
  const ctx = canvas.getContext('2d')!;

  // Draw initial idle grid pattern
  drawIdleGrid(ctx, 210);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const screenMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide
  });
  const ipadScreen = new THREE.Mesh(screenGeo, screenMat);
  // Front screen (facing outward, negative Z)
  const screenOffset = ipadDepth / 2 + 0.002;
  ipadScreen.position.set(benX, ipadY, ipadZ - screenOffset);
  ipadScreen.rotation.x = -0.3;
  ipadScreen.userData.canvas = canvas;
  ipadScreen.userData.ctx = ctx;
  ipadScreen.userData.texture = texture;
  group.add(ipadScreen);

  // Back screen (facing Ben / positive Z) — dual-sided display
  const backScreen = new THREE.Mesh(screenGeo, screenMat);
  backScreen.position.set(benX, ipadY, ipadZ + screenOffset);
  backScreen.rotation.x = -0.3;
  backScreen.rotation.y = Math.PI; // flip to face the other way
  group.add(backScreen);

  // iPad screen glow
  const screenGlow = new THREE.PointLight(0x4488ff, 0.4, 2.5);
  screenGlow.position.set(benX, ipadY, ipadZ - 0.05);
  group.add(screenGlow);

  return {
    group,
    ipadScreen,
    position: new THREE.Vector3(benX, 0, benZ)
  };
}

/** Draw a static idle grid when no beam data is available */
function drawIdleGrid(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#060612';
  ctx.fillRect(0, 0, size, size);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(40, 50, 80, 0.3)';
  ctx.lineWidth = 0.5;
  const cell = size / 7;
  for (let i = 1; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(size, i * cell);
    ctx.stroke();
  }

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const cx = c * cell + cell / 2;
      const cy = r * cell + cell / 2;
      const radius = cell * 0.38;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(80, 120, 255, 0.7)');
      grad.addColorStop(0.5, 'rgba(40, 70, 180, 0.25)');
      grad.addColorStop(1, 'rgba(10, 20, 50, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Update the iPad screen to mirror the current beam colors.
 * Draws glowing orbs on a dark grid background.
 */
export function updateBenIPad(
  ipadScreen: THREE.Mesh,
  beamColors: Array<{ color: [number, number, number]; intensity: number; enabled: boolean }>
): void {
  const canvas = ipadScreen.userData.canvas as HTMLCanvasElement;
  const ctx = ipadScreen.userData.ctx as CanvasRenderingContext2D;
  const texture = ipadScreen.userData.texture as THREE.CanvasTexture;
  if (!canvas || !ctx || !texture) return;

  const size = canvas.width; // 210
  const cell = size / 7;

  // Dark background
  ctx.fillStyle = '#060612';
  ctx.fillRect(0, 0, size, size);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(40, 50, 80, 0.3)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(size, i * cell);
    ctx.stroke();
  }

  // Draw each beam as a glowing orb
  for (let i = 0; i < Math.min(49, beamColors.length); i++) {
    const beam = beamColors[i];
    const r = Math.floor(i / 7);
    const c = i % 7;
    const cx = c * cell + cell / 2;
    const cy = r * cell + cell / 2;
    const radius = cell * 0.42;

    const red = Math.round(beam.color[0] * 255);
    const green = Math.round(beam.color[1] * 255);
    const blue = Math.round(beam.color[2] * 255);
    const intensity = beam.enabled ? beam.intensity : 0;

    if (intensity < 0.01) {
      // Dim dot for inactive beams
      const dimGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.5);
      dimGrad.addColorStop(0, 'rgba(30, 40, 60, 0.4)');
      dimGrad.addColorStop(1, 'rgba(10, 15, 30, 0)');
      ctx.fillStyle = dimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // Outer glow
    const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.3);
    outerGrad.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${intensity * 0.3})`);
    outerGrad.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Main orb
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const bright = Math.min(1, intensity * 1.2);
    grad.addColorStop(0, `rgba(${Math.min(255, red + 80)}, ${Math.min(255, green + 80)}, ${Math.min(255, blue + 80)}, ${bright})`);
    grad.addColorStop(0.4, `rgba(${red}, ${green}, ${blue}, ${bright * 0.7})`);
    grad.addColorStop(0.8, `rgba(${Math.round(red * 0.5)}, ${Math.round(green * 0.5)}, ${Math.round(blue * 0.5)}, ${bright * 0.2})`);
    grad.addColorStop(1, `rgba(${Math.round(red * 0.2)}, ${Math.round(green * 0.2)}, ${Math.round(blue * 0.2)}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight (small white dot at center)
    if (intensity > 0.3) {
      const specGrad = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.15, 0, cx, cy, radius * 0.3);
      specGrad.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.4})`);
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(cx - radius * 0.1, cy - radius * 0.1, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  texture.needsUpdate = true;
}
