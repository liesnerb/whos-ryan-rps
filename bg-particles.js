const canvas = document.getElementById("bg");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 8;

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/* ===============================
   PARTICLES
   =============================== */
const particleCount = 500;
const geometry = new THREE.BufferGeometry();

const colors = [
  new THREE.Color("#C5B4E2"),
  new THREE.Color("#7BA4DD"),
  new THREE.Color("#FF6B00"),
  new THREE.Color("#FED925"),
  new THREE.Color("#70D44B"),
  new THREE.Color("#F32735"),
  new THREE.Color("#FA7598"),
];

const positions = new Float32Array(particleCount * 3);
const colorArray = new Float32Array(particleCount * 3);
const velocities = [];

for (let i = 0; i < particleCount; i++) {
  const i3 = i * 3;

  positions[i3] = (Math.random() - 0.5) * 12;
  positions[i3 + 1] = (Math.random() - 0.5) * 12;
  positions[i3 + 2] = (Math.random() - 0.5) * 12;

  const color = colors[Math.floor(Math.random() * colors.length)];
  colorArray[i3] = color.r;
  colorArray[i3 + 1] = color.g;
  colorArray[i3 + 2] = color.b;

  velocities.push({
    x: (Math.random() - 0.5) * 0.01,
    y: (Math.random() - 0.5) * 0.01,
    z: (Math.random() - 0.5) * 0.01,
  });
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

const material = new THREE.PointsMaterial({
  size: 0.04,
  vertexColors: true,
  transparent: true,
  opacity: 0.65,
  depthWrite: false,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

/* ===============================
   ANIMATE
   =============================== */
function animate() {
  requestAnimationFrame(animate);

  const pos = geometry.attributes.position.array;

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    pos[i3] += velocities[i].x;
    pos[i3 + 1] += velocities[i].y;
    pos[i3 + 2] += velocities[i].z;

    // soft wrap
    if (pos[i3] > 6 || pos[i3] < -6) velocities[i].x *= -1;
    if (pos[i3 + 1] > 6 || pos[i3 + 1] < -6) velocities[i].y *= -1;
    if (pos[i3 + 2] > 6 || pos[i3 + 2] < -6) velocities[i].z *= -1;
  }

  geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

animate();

/* ===============================
   RESIZE
   =============================== */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
