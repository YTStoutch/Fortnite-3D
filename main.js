// ===== INIT =====
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,1.7,5);

// ===== LIGHT =====
const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,10,10);
scene.add(light);

// ===== PLAYER =====
const player = { 
    pos: new THREE.Vector3(0,1.7,5), 
    speed:5, 
    hp:100, 
    inventory:[], 
    selectedSlot:0,
    points: localStorage.getItem('points')?parseInt(localStorage.getItem('points')):0
};
const keys = {};
document.addEventListener('keydown', e=>keys[e.code]=true);
document.addEventListener('keyup', e=>keys[e.code]=false);

// ===== CAMERA FPS =====
let yaw=0, pitch=0;
canvas.addEventListener('click',()=>canvas.requestPointerLock());
document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement===canvas) document.addEventListener('mousemove',onMouseMove);
    else document.removeEventListener('mousemove',onMouseMove);
});
function onMouseMove(e){ 
    yaw -= e.movementX*0.002; 
    pitch -= e.movementY*0.002; 
    pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch)); 
    camera.rotation.set(pitch,yaw,0); 
}

// ===== HUD & INVENTAIRE =====
const invContainer=document.getElementById('inv');
for(let i=0;i<6;i++){ 
    const slot=document.createElement('div'); 
    slot.className='slot'; 
    slot.id='slot'+i; 
    invContainer.appendChild(slot); 
}
document.addEventListener('keydown', e=>{
    if(e.code.startsWith('Digit')){
        const n = parseInt(e.code.replace('Digit',''))-1;
        if(n>=0 && n<6) player.selectedSlot=n;
    }
});
function updateHUD(){
    document.getElementById('hp').innerText = player.hp;
    document.getElementById('points').innerText = player.points;
    const weapon = player.inventory[player.selectedSlot];
    document.getElementById('ammo').innerText = weapon ? weapon.ammo : 0;
    for(let i=0;i<6;i++){
        const slot=document.getElementById('slot'+i);
        slot.innerText = player.inventory[i] ? player.inventory[i].name : '';
        slot.classList.toggle('selected', i===player.selectedSlot);
    }
}

// ===== LOADING MANAGER AVEC PROGRESSION =====
const manager = new THREE.LoadingManager(
  () => { // onLoad
      document.getElementById('loading').style.display = 'none';
      animate();
  },
  (url, itemsLoaded, itemsTotal) => { // onProgress
      const percent = Math.floor((itemsLoaded/itemsTotal)*100);
      document.getElementById('loading').innerText = `Chargement ${percent}%`;
  },
  (url) => console.error('Erreur de chargement : ' + url) // onError
);

// ===== ASSETS HD =====
const loader = new THREE.TextureLoader(manager);
const gltfLoader = new THREE.GLTFLoader(manager);

const assets = {
    textures:{
        ground: loader.load('assets/textures/ground.png'),
        chest: loader.load('assets/textures/chest.png'),
        wood: loader.load('assets/textures/wood.png')
    },
    sounds:{
        shoot: new Audio('assets/sounds/shoot.wav'),
        reload: new Audio('assets/sounds/reload.wav'),
        chest: new Audio('assets/sounds/chest_open.wav'),
        build: new Audio('assets/sounds/build.wav')
    }
};

const models = {};
['rifle','shotgun','sniper','bot','chest'].forEach(name=>{
    gltfLoader.load(`assets/models/${name}.glb`, gltf=>{ models[name]=gltf.scene; });
});

// ===== SOL =====
const geo = new THREE.PlaneGeometry(500,500);
const mat = new THREE.MeshStandardMaterial({map:assets.textures.ground});
const sol = new THREE.Mesh(geo,mat);
sol.rotation.x = -Math.PI/2;
scene.add(sol);

// ===== BOTS =====
const bots=[];
function spawnBot(x,z){ 
    const bot=models.bot?models.bot.clone():new THREE.Mesh(new THREE.CapsuleGeometry(0.4,1.4,4,8), new THREE.MeshStandardMaterial({color:0xff0000})); 
    bot.position.set(x,0.9,z); 
    scene.add(bot); 
    bots.push({mesh:bot,hp:100,cooldown:0}); 
}
spawnBot(5,5); spawnBot(-5,10);

// ===== COFFRES =====
const chests=[];
function spawnChest(x,z){ 
    const chest=models.chest?models.chest.clone():new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({map:assets.textures.chest})); 
    chest.position.set(x,0.5,z); 
    scene.add(chest); 
    chests.push({mesh:chest,loot:randomLoot()}); 
}
function randomLoot(){
    const options = [
        {name:'Pistolet',ammo:15,type:'pistol'},
        {name:'Fusil',ammo:30,type:'rifle'},
        {name:'Shotgun',ammo:8,type:'shotgun'},
        {name:'Sniper',ammo:5,type:'sniper'}
    ];
    return options[Math.floor(Math.random()*options.length)];
}
spawnChest(3,3); spawnChest(-4,7);

// ===== TIR =====
let shootCooldown = 0;
function shoot(){
    if(shootCooldown>0) return;
    const weapon = player.inventory[player.selectedSlot];
    if(!weapon || weapon.ammo<=0) return;
    weapon.ammo--;
    shootCooldown=0.3;
    assets.sounds.shoot.cloneNode().play();

    const raycaster = new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),0,50);
    const intersects = raycaster.intersectObjects(bots.map(b=>b.mesh));
    intersects.forEach(i=>{
        const bot = bots.find(b=>b.mesh===i.object);
        if(bot){ 
            bot.hp-=20; 
            if(bot.hp<=0){ 
                scene.remove(bot.mesh); 
                bots.splice(bots.indexOf(bot),1); 
                player.points+=10;
                localStorage.setItem('points',player.points);
            } 
        }
    });
}
document.addEventListener('mousedown', shoot);

// ===== CONSTRUCTION =====
const buildSize=2;
document.addEventListener('keydown', e=>{
    let geom, mesh;
    if(e.code==='F1'){ // mur
        geom = new THREE.PlaneGeometry(buildSize, buildSize);
        mesh = new THREE.Mesh(geom,new THREE.MeshStandardMaterial({map:assets.textures.wood}));
        mesh.rotation.y = yaw;
    } else if(e.code==='F2'){ // sol
        geom = new THREE.PlaneGeometry(buildSize, buildSize);
        mesh = new THREE.Mesh(geom,new THREE.MeshStandardMaterial({map:assets.textures.wood}));
        mesh.rotation.x = -Math.PI/2;
    } else if(e.code==='F3'){ // rampe
        geom = new THREE.PlaneGeometry(buildSize, buildSize);
        mesh = new THREE.Mesh(geom,new THREE.MeshStandardMaterial({map:assets.textures.wood}));
        mesh.rotation.x = -Math.PI/4;
        mesh.rotation.y = yaw;
    } else return;
    const pos = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
    pos.x = Math.round(pos.x/buildSize)*buildSize;
    pos.y = Math.round(pos.y/buildSize)*buildSize;
    pos.z = Math.round(pos.z/buildSize)*buildSize;
    mesh.position.copy(pos);
    scene.add(mesh);
    assets.sounds.build.cloneNode().play();
});

// ===== UPDATE PLAYER =====
function updatePlayer(delta){
    let forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    let right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    let dir=new THREE.Vector3();
    if(keys['KeyW']) dir.add(forward);
    if(keys['KeyS']) dir.sub(forward);
    if(keys['KeyA']) dir.sub(right);
    if(keys['KeyD']) dir.add(right);
    dir.normalize().multiplyScalar(player.speed*delta);
    camera.position.add(dir);

    if(camera.positi
