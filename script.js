// ===== PLAYER & CAMERA =====
const player = {
    velocity: new THREE.Vector3(),
    speed: 5,
    height: 1.7,
    canJump: false,
    hp: 100
};

// Ajoute la caméra à la scène
camera.position.set(0, player.height, 5);

// Controle clavier
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// Pointer lock pour la souris
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', lockChange, false);
function lockChange() {
    if(document.pointerLockElement === canvas){
        document.addEventListener('mousemove', onMouseMove, false);
    } else {
        document.removeEventListener('mousemove', onMouseMove, false);
    }
}

let yaw = 0, pitch = 0;
function onMouseMove(e){
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    camera.rotation.set(pitch, yaw, 0);
}

// ===== UPDATE PLAYER =====
function updatePlayer(delta){
    let forward = new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    let right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    let dir = new THREE.Vector3();
    
    if(keys['KeyW']) dir.add(forward);
    if(keys['KeyS']) dir.sub(forward);
    if(keys['KeyA']) dir.sub(right);
    if(keys['KeyD']) dir.add(right);

    dir.normalize();
    dir.multiplyScalar(player.speed * delta);
    camera.position.add(dir);
}

// ===== MAIN LOOP =====
let lastTime = performance.now();
function animate(){
    requestAnimationFrame(animate);
    let now = performance.now();
    let delta = (now - lastTime)/1000;
    lastTime = now;

    updatePlayer(delta);

    renderer.render(scene,camera);
}

animate();
