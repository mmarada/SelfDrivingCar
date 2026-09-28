const carCanvas=document.getElementById("carCanvas");
carCanvas.width=200;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=300;

const carCtx=carCanvas.getContext("2d");
const networkCtx=networkCanvas.getContext("2d");
const road=new Road(carCanvas.width/2,carCanvas.width*0.9);
let cars=generateCars(getPopulationSize());
let bestCar=cars[0];
applyBrain(cars);

function getMutationRate(){
    const el=document.getElementById("mutationRate");
    return el ? parseFloat(el.value) : 0.1;
}

function getPopulationSize(){
    const el=document.getElementById("populationSize");
    return el ? parseInt(el.value) : 100;
}

function getReplayPackSize(){
    const el=document.getElementById("replayPackSize");
    return el ? parseInt(el.value) : 10;
}

function onPopulationChange(){
    restartSim();
}

const EVOLUTION_PRESETS={
    explore:{population:150,mutation:0.4},
    balanced:{population:80,mutation:0.15},
    exploit:{population:40,mutation:0.05},
};

function applyPreset(name){
    const preset=EVOLUTION_PRESETS[name];
    if(!preset) return;
    applyPresetValues(preset);
}

function applyPresetValues(preset){
    const popEl=document.getElementById("populationSize");
    const mutEl=document.getElementById("mutationRate");
    popEl.value=preset.population;
    mutEl.value=preset.mutation;
    document.getElementById("popValue").textContent=preset.population;
    document.getElementById("mutationValue").textContent=preset.mutation.toFixed(2);

    restartSim();
}

function getCustomPresets(){
    const raw=localStorage.getItem("customPresets");
    return raw ? JSON.parse(raw) : {};
}

function setCustomPresets(presets){
    localStorage.setItem("customPresets",JSON.stringify(presets));
}

function saveCustomPreset(){
    const name=prompt("Name this preset:");
    if(!name) return;
    const trimmed=name.trim();
    if(!trimmed) return;

    const presets=getCustomPresets();
    presets[trimmed]={population:getPopulationSize(),mutation:getMutationRate()};
    setCustomPresets(presets);
    renderCustomPresets();
}

function applyCustomPreset(name){
    const preset=getCustomPresets()[name];
    if(!preset) return;
    applyPresetValues(preset);
}

function deleteCustomPreset(name){
    const presets=getCustomPresets();
    delete presets[name];
    setCustomPresets(presets);
    renderCustomPresets();
}

function renameCustomPreset(oldName){
    const presets=getCustomPresets();
    const preset=presets[oldName];
    if(!preset) return;

    const newName=prompt("Rename preset:",oldName);
    if(!newName) return;
    const trimmed=newName.trim();
    if(!trimmed || trimmed===oldName) return;
    if(presets[trimmed] && !confirm('"'+trimmed+'" already exists. Overwrite it?')) return;

    presets[trimmed]=preset;
    delete presets[oldName];
    setCustomPresets(presets);
    renderCustomPresets();
}

function renderCustomPresets(){
    const list=document.getElementById("customPresetList");
    if(!list) return;
    const presets=getCustomPresets();
    list.innerHTML="";

    for(const name in presets){
        const preset=presets[name];
        const row=document.createElement("div");
        row.className="customPresetRow";

        const applyBtn=document.createElement("button");
        applyBtn.textContent=name;
        applyBtn.title="N="+preset.population+", mutation="+preset.mutation.toFixed(2);
        applyBtn.onclick=()=>applyCustomPreset(name);

        const renameBtn=document.createElement("button");
        renameBtn.textContent="✎";
        renameBtn.className="renamePresetBtn";
        renameBtn.title="Rename preset";
        renameBtn.onclick=(e)=>{
            e.stopPropagation();
            renameCustomPreset(name);
        };

        const deleteBtn=document.createElement("button");
        deleteBtn.textContent="×";
        deleteBtn.className="deletePresetBtn";
        deleteBtn.title="Delete preset";
        deleteBtn.onclick=(e)=>{
            e.stopPropagation();
            deleteCustomPreset(name);
        };

        row.appendChild(applyBtn);
        row.appendChild(renameBtn);
        row.appendChild(deleteBtn);
        list.appendChild(row);
    }
}

renderCustomPresets();

function applyBrain(carList){
    if(localStorage.getItem("bestBrain")){
        const rate=getMutationRate();
        for(let i=0;i<carList.length;i++){
            carList[i].brain=JSON.parse(
                localStorage.getItem("bestBrain")
            );
            if(i!=0){
                NeuralNetwork.mutate(carList[i].brain,rate);
            }
        }
    }
}

function restartSim(){
    cars=generateCars(getPopulationSize());
    applyBrain(cars);
    bestCar=cars[0];
    generationEnded=false;
    genStats._recorded=false;
    genStats.sessionBest=0;
    currentRunFrames=[];
    replaying=false;
    replayPaused=false;
    replayIndex=0;
}

const traffic=[
    new Car(road.getLaneCenter(1),-100,30,50,"Dummy",2),
    new Car(road.getLaneCenter(0),-300,30,50,"Dummy",2),
    new Car(road.getLaneCenter(2),-300,30,50,"Dummy",2),
    new Car(road.getLaneCenter(0),-500,30,50,"Dummy",2),
    new Car(road.getLaneCenter(1),-500,30,50,"Dummy",2),
    new Car(road.getLaneCenter(2),-700,30,50,"Dummy",2),
    new Car(road.getLaneCenter(0),-700,30,50,"Dummy",2),
    new Car(road.getLaneCenter(1),-900,30,50,"Dummy",2),
    new Car(road.getLaneCenter(2),-900,30,50,"Dummy",2),
    new Car(road.getLaneCenter(2),-1100,30,50,"Dummy",2),
    new Car(road.getLaneCenter(1),-1100,30,50,"Dummy",2),
    new Car(road.getLaneCenter(2),-1300,30,50,"Dummy",2),
    new Car(road.getLaneCenter(0),-1300,30,50,"Dummy",2),
];

const genStats=new GenerationStats();
let generationEnded=false;

let currentRunFrames=[];
let lastRunFrames=null;
let replaying=false;
let replayPaused=false;
let replayIndex=0;

function polygonAt(x,y,angle,width,height){
    const points=[];
    const rad=Math.hypot(width,height)/2;
    const alpha=Math.atan2(width,height);
    points.push({x:x-Math.sin(angle-alpha)*rad,y:y-Math.cos(angle-alpha)*rad});
    points.push({x:x-Math.sin(angle+alpha)*rad,y:y-Math.cos(angle+alpha)*rad});
    points.push({x:x-Math.sin(Math.PI+angle-alpha)*rad,y:y-Math.cos(Math.PI+angle-alpha)*rad});
    points.push({x:x-Math.sin(Math.PI+angle+alpha)*rad,y:y-Math.cos(Math.PI+angle+alpha)*rad});
    return points;
}

// Top `size` cars by distance at this tick, excluding the leader (already stored
// as the frame's own x/y/angle). Tuples instead of keyed objects roughly halve
// the exported file size, which matters since the pack is recorded every tick.
function capturePack(carList,leader,size){
    if(size<=0) return [];
    return carList
        .filter(c=>c!==leader)
        .sort((a,b)=>a.y-b.y)
        .slice(0,size)
        .map(c=>[
            Math.round(c.x*10)/10,
            Math.round(c.y*10)/10,
            Math.round(c.angle*1000)/1000,
            c.damaged?1:0
        ]);
}

function drawPolygon(ctx,poly){
    ctx.beginPath();
    ctx.moveTo(poly[0].x,poly[0].y);
    for(let i=1;i<poly.length;i++){
        ctx.lineTo(poly[i].x,poly[i].y);
    }
    ctx.fill();
}

function startReplay(){
    if(!lastRunFrames || lastRunFrames.length===0) return;
    replaying=true;
    replayPaused=false;
    replayIndex=0;

    const replayBtn=document.getElementById("replayBtn");
    if(replayBtn) replayBtn.disabled=true;

    const pauseBtn=document.getElementById("replayPauseBtn");
    if(pauseBtn){
        pauseBtn.disabled=false;
        pauseBtn.textContent="Pause";
    }

    const scrub=document.getElementById("replayScrub");
    if(scrub){
        scrub.max=lastRunFrames.length-1;
        scrub.value=0;
        scrub.disabled=false;
    }
}

function toggleReplayPause(){
    if(!replaying) return;
    replayPaused=!replayPaused;
    const pauseBtn=document.getElementById("replayPauseBtn");
    if(pauseBtn) pauseBtn.textContent=replayPaused?"Play":"Pause";
}

function scrubReplay(value){
    if(!lastRunFrames || lastRunFrames.length===0) return;
    replaying=true;
    replayPaused=true;
    replayIndex=Math.min(parseInt(value),lastRunFrames.length-1);

    const replayBtn=document.getElementById("replayBtn");
    if(replayBtn) replayBtn.disabled=true;

    const pauseBtn=document.getElementById("replayPauseBtn");
    if(pauseBtn){
        pauseBtn.disabled=false;
        pauseBtn.textContent="Play";
    }
}

function updateScrubBar(){
    const scrub=document.getElementById("replayScrub");
    if(scrub) scrub.value=replayIndex;
}

function renderReplayFrame(frame){
    carCanvas.height=window.innerHeight;
    networkCanvas.height=window.innerHeight;

    carCtx.save();
    carCtx.translate(0,-frame.y+carCanvas.height*0.7);
    road.draw(carCtx);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carCtx,"red");
    }

    const pack=frame.pack || [];
    let packCrashed=0;
    carCtx.globalAlpha=0.35;
    for(const [x,y,angle,damaged] of pack){
        if(damaged) packCrashed++;
        carCtx.fillStyle=damaged?"gray":"blue";
        drawPolygon(carCtx,polygonAt(x,y,angle,30,50));
    }
    carCtx.globalAlpha=1;

    carCtx.fillStyle="#ffd600";
    drawPolygon(carCtx,polygonAt(frame.x,frame.y,frame.angle,30,50));
    carCtx.restore();

    carCtx.save();
    carCtx.fillStyle="rgba(0,0,0,0.55)";
    carCtx.fillRect(5,5,190,pack.length?58:40);
    carCtx.font="bold 12px monospace";
    carCtx.fillStyle="#ffd600";
    carCtx.fillText(replayPaused?"Replay (paused)":"Replay",12,22);
    carCtx.font="12px monospace";
    carCtx.fillStyle="#fff";
    carCtx.fillText("Frame "+(replayIndex+1)+" / "+lastRunFrames.length,12,40);
    if(pack.length){
        carCtx.fillStyle="#aaa";
        carCtx.fillText("Pack:  "+pack.length+" ("+packCrashed+" crashed)",12,56);
    }
    carCtx.restore();
}

function drawReplayFrame(){
    renderReplayFrame(lastRunFrames[replayIndex]);
    updateScrubBar();

    if(replayPaused) return;

    replayIndex++;
    if(replayIndex>=lastRunFrames.length){
        replaying=false;
        replayPaused=false;
        const replayBtn=document.getElementById("replayBtn");
        if(replayBtn) replayBtn.disabled=false;
        const pauseBtn=document.getElementById("replayPauseBtn");
        if(pauseBtn) pauseBtn.disabled=true;
    }
}

function stepReplay(delta){
    if(!replaying || !replayPaused || !lastRunFrames) return;
    replayIndex=Math.min(Math.max(replayIndex+delta,0),lastRunFrames.length-1);
    renderReplayFrame(lastRunFrames[replayIndex]);
    updateScrubBar();
}

document.addEventListener("keydown",(event)=>{
    if(!replaying || !replayPaused) return;
    if(event.key==="ArrowLeft"){
        event.preventDefault();
        stepReplay(-1);
    }else if(event.key==="ArrowRight"){
        event.preventDefault();
        stepReplay(1);
    }
});

animate();

function save(){
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
}

function clearStats(){
    genStats.clearHistory();
}

function downloadBrain(){
    const data=JSON.stringify(bestCar.brain,null,2);
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="best-brain-gen"+genStats.generation+".json";
    a.click();
    URL.revokeObjectURL(url);
}

function loadBrainFromFile(event){
    const file=event.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=function(e){
        try{
            const brain=JSON.parse(e.target.result);
            localStorage.setItem("bestBrain",JSON.stringify(brain));
            location.reload();
        }catch(err){
            alert("Invalid brain file: "+err.message);
        }
    };
    reader.readAsText(file);
    event.target.value="";
}

function downloadReplay(){
    if(!lastRunFrames || lastRunFrames.length===0) return;
    const data=JSON.stringify(lastRunFrames);
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="replay-gen"+genStats.generation+".json";
    a.click();
    URL.revokeObjectURL(url);
}

function isValidPackEntry(entry){
    return Array.isArray(entry) && entry.length===4 && entry.every(v=>typeof v==="number");
}

// `pack` is optional so replays exported before multi-car recording still load.
function isValidReplayFrames(frames){
    return Array.isArray(frames) && frames.length>0 && frames.every(
        f=>f && typeof f.x==="number" && typeof f.y==="number" && typeof f.angle==="number" &&
            (f.pack===undefined || (Array.isArray(f.pack) && f.pack.every(isValidPackEntry)))
    );
}

function loadReplayFromFile(event){
    const file=event.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=function(e){
        try{
            const frames=JSON.parse(e.target.result);
            if(!isValidReplayFrames(frames)){
                throw new Error("expected a non-empty array of {x,y,angle,pack?} frames");
            }
            lastRunFrames=frames;

            const replayBtn=document.getElementById("replayBtn");
            if(replayBtn) replayBtn.disabled=false;
            const scrub=document.getElementById("replayScrub");
            if(scrub){
                scrub.max=lastRunFrames.length-1;
                scrub.value=0;
                scrub.disabled=false;
            }
        }catch(err){
            alert("Invalid replay file: "+err.message);
        }
    };
    reader.readAsText(file);
    event.target.value="";
}

function generateCars(N){
    const cars=[];
    for(let i=0;i<N;i++){
        cars.push(new Car(road.getLaneCenter(1),100,30,50,"AI"));
    }
    return cars;
}

function drawHUD(time){
    const alive=cars.filter(c=>!c.damaged).length;
    const dist=Math.max(0,Math.round(100-bestCar.y));
    const gen=genStats.generation+(generationEnded?0:1);

    carCtx.save();
    carCtx.fillStyle="rgba(0,0,0,0.55)";
    carCtx.fillRect(5,5,190,80);

    carCtx.font="bold 12px monospace";
    carCtx.fillStyle="#00e676";
    carCtx.fillText("Gen "+gen,12,22);

    carCtx.font="12px monospace";
    carCtx.fillStyle="#fff";
    carCtx.fillText("Alive: "+alive+" / "+getPopulationSize(),12,40);
    carCtx.fillText("Dist:  "+dist+"px",12,58);
    carCtx.fillStyle="#aaa";
    carCtx.fillText("Mut:   "+getMutationRate().toFixed(2),12,74);

    if(generationEnded){
        carCtx.fillStyle="rgba(0,230,118,0.15)";
        carCtx.fillRect(5,5,190,80);
        carCtx.fillStyle="#00e676";
        carCtx.font="bold 11px monospace";
        carCtx.fillText("All crashed — save & restart",12,93);
    }
    carCtx.restore();
}

function animate(time){
    if(replaying){
        drawReplayFrame();
        requestAnimationFrame(animate);
        return;
    }

    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    for(let i=0;i<cars.length;i++){
        cars[i].update(road.borders,traffic);
    }

    bestCar=cars.find(
        c=>c.y==Math.min(
            ...cars.map(c=>c.y)
        ));

    const dist=Math.max(0,100-bestCar.y);
    genStats.trackDistance(dist);

    if(!generationEnded){
        currentRunFrames.push({
            x:bestCar.x,y:bestCar.y,angle:bestCar.angle,
            pack:capturePack(cars,bestCar,getReplayPackSize())
        });
    }

    if(!generationEnded && cars.every(c=>c.damaged)){
        generationEnded=true;
        genStats.recordGeneration();
        lastRunFrames=currentRunFrames;
        const replayBtn=document.getElementById("replayBtn");
        if(replayBtn) replayBtn.disabled=false;
        const scrub=document.getElementById("replayScrub");
        if(scrub){
            scrub.max=lastRunFrames.length-1;
            scrub.value=0;
            scrub.disabled=false;
        }
    }

    carCanvas.height=window.innerHeight;
    networkCanvas.height=window.innerHeight;

    carCtx.save();
    carCtx.translate(0,-bestCar.y+carCanvas.height*0.7);
    road.draw(carCtx);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carCtx,"red");
    }
    carCtx.globalAlpha=0.2;
    for(let i=0;i<cars.length;i++){
        cars[i].draw(carCtx,"blue");
    }
    carCtx.globalAlpha=1;
    bestCar.draw(carCtx,"blue",true);
    carCtx.restore();

    drawHUD(time);

    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    genStats.draw(networkCtx);

    requestAnimationFrame(animate);
}
