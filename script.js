// ===== INIT =====
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
document.addEventListener('click',()=>canvas.requestPointerLock());
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

// ===== HUD =====
function updateHUD(){ 
    document.getElementById('hp').innerText=player.hp; 
    document.getElementById('points').innerText=player.points;
    for(let i=0;i<6;i++){
        const slot=document.getElementById('slot'+i);
        slot.innerText = player.inventory[i] ? player.inventory[i].name : '';
        slot.style.borderColor = (i===player.selectedSlot)?'yellow':'white';
    }
}

// ===== INVENTAIRE =====
const invContainer=document.getElementById('inv');
for(let i=0;i<6;i++){ 
    const slot=document.createElement('div'); 
    slot.className='slot'; 
    slot.id='slot'+i; 
    invContainer.appendChild(slot); 
}

// Changer d’arme avec touches 1-6
document.addEventListener('keydown', e=>{
    if(e.code.startsWith('Digit')){
        const n = parseInt(e.code.replace('Digit',''))-1;
        if(n>=0 && n<6) player.selectedSlot=n;
    }
});

// ===== ASSETS HD =====
const loader=new THREE.TextureLoader();
const assets={
    textures:{
        ground:loader.load('assets/textures/ground.png'),
        chest:loader.load('assets/textures/chest.png'),
        wood:loader.load('assets/textures/wood.png')
    },
    sounds:{
        shoot:new Audio('assets/sounds/shoot.wav'),
        reload:new Audio('assets/sounds/reload.wav'),
        chest:new Audio('assets/sounds/chest_open.wav'),
        build:new Audio('assets/sounds/build.wav')
    }
};
const gltfLoader=new THREE.GLTFLoader();
const models={};
['rifle','shotgun','sniper','bot','chest'].forEach(name=>{
    gltfLoader.load(`assets/models/${name}.glb`,gltf=>{ models[name]=gltf.scene; });
});

// ===== BOTS IA =====
const bots=[];
function spawnBot(x,z){ 
    const bot=models.bot?models.bot.clone():new THREE.Mesh(new THREE.CapsuleGeometry(0.4,1.4,4,8), new THREE.MeshStandardMaterial({color:0xff0000})); 
    bot.position.set(x,0.9,z); 
    scene.add(bot); 
    bots.push({mesh:bot,hp:100, cooldown:0}); 
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
function shoot(){
    const weapon = player.inventory[player.selectedSlot];
    if(!weapon) return;
    if(!weapon.ammo || weapon.ammo<=0) return;

    weapon.ammo--;
    assets.sounds.shoot.cloneNode().play();

    // Raycast simple pour toucher bot
    const raycaster = new THREE.Raycaster(camera.position, camera.getWorldDirection(new THREE.Vector3()),0,50);
    const intersects = raycaster.intersectObjects(bots.map(b=>b.mesh));
    intersects.forEach(i=>{
        const bot = bots.find(b=>b.mesh===i.object);
        if(bot){ 
            bot.hp -= 20; 
            if(bot.hp<=0){ 
                scene.remove(bot.mesh); 
                bots.splice(bots.indexOf(bot),1); 
                player.points +=10;
                localStorage.setItem('points',player.points);
            } 
        }
    });
}
document.addEventListener('mousedown', shoot);

// ===== CONSTRUCTION =====
const buildSize = 2;
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

// ===== PLAYER UPDATE =====
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

    // Vérifier collision avec coffres
    chests.forEach(c=>{
        if(camera.position.distanceTo(c.mesh.position)<1.5){
            if(keys['KeyE']){
                player.inventory.push(c.loot);
                assets.sounds.chest.cloneNode().play();
                scene.remove(c.mesh);
                chests.splice(chests.indexOf(c),1);
            }
        }
    });

    // Update bots IA
    bots.forEach(bot=>{
        const distance = bot.mesh.position.distanceTo(camera.position);
        if(distance<10){
            // Poursuite simple
            const dirBot = new THREE.Vector3().subVectors(camera.position,bot.mesh.position).normalize();
            bot.mesh.position.add(dirBot.multiplyScalar(2*delta));
            // Tir automatique
            if(bot.cooldown<=0){
                if(distance<8){
                    player.hp -= 5;
                    bot.cooldown = 2; // 2 secondes
                }
            } else bot.cooldown -= delta;
        }
    });
}

// ===== ANIMATION =====
let lastTime=performance.now();
function animate(){
    requestAnimationFrame(animate);
    let now=performance.now();
    let delta=(now-lastTime)/1000;
    lastTime=now;

    updatePlayer(delta);
    updateHUD();
    renderer.render(scene,camera);
}
animate();
