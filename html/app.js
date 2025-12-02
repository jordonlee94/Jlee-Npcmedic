// qb-crafting app.js - fixed and robust
(function(){
    'use strict';

    // Config fallback for client-side thresholds
    const Config = { LevelThresholds: {2:100,3:250,4:500,5:900} };

    // Helpers
    function GetParentResourceName(){ try{ return window.location.origin.split('/').pop(); }catch(e){ return 'qb-crafting'; } }
    function getNextLevelXP(level){ if(!level||level<1) return 100; try{ if(window.Config && Config.LevelThresholds && Config.LevelThresholds[level+1]) return Config.LevelThresholds[level+1]; }catch(e){} return level * 100; }

    // State
    let currentBenchId = null;
    let currentRecipes = [];
    let selectedRecipe = null;

    // Message listener from Lua
    window.addEventListener('message', (e) => {
        const d = e.data;
        if(!d || !d.action) return;
        if (d.action === 'open' || d.action === 'openUI') openUI(d.bench || d);
        else if (d.action === 'updateBench') updateBenchUI(d.benchId, d.benchData);
        else if (d.action === 'craftResult') onCraftResult(d.payload);
    });

    // Open UI
    function openUI(payload){
        if(!payload) return;
        if(payload.bench) payload = payload.bench;
        currentBenchId = payload.benchId || payload.benchId;
        currentRecipes = payload.recipes || [];
        const appEl = document.getElementById('app');
        appEl.style.display = 'block';
        appEl.style.opacity = '1';
        renderHeader(payload.benchData || payload.benchData);
        renderRecipes(currentRecipes);
        selectRecipe(null);
        try{ if(typeof SetNuiFocus === 'function') SetNuiFocus(true,true); }catch(e){}
        try{ pcall && pcall(function(){ SetNuiFocusKeepInput(true); }); }catch(e){}
    }

    function renderHeader(data){
        if(!data) return;
        document.getElementById('bench-level').innerText = data.level || 1;
        document.getElementById('bench-xp').innerText = data.xp || 0;
        const max = getNextLevelXP(data.level || 1);
        const pct = Math.min(100, Math.floor(((data.xp || 0) / max) * 100));
        const el = document.getElementById('bench-xp-fill');
        el.style.width = pct + '%';
    }

    function updateBenchUI(bid, data){
        if(bid !== currentBenchId) return;
        renderHeader(data);
    }

    function renderRecipes(recipes){
        const container = document.getElementById('items-list');
        container.innerHTML = '';
        if(!recipes || recipes.length === 0){
            container.innerHTML = '<p style="color:rgba(255,255,255,0.6)">No recipes available</p>';
            return;
        }
        recipes.forEach((r) => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.dataset.id = r.id;
            const img = document.createElement('img');
            // try resource-local image first, then qb-inventory path, then fallback icon
            img.src = `img/${r.id}.png`;
            img.onerror = function(){
                this.onerror = null;
                this.src = `../qb-inventory/html/images/${r.id}.png`;
                this.onerror = function(){ this.src = 'img/icon.png'; };
            };
            const label = document.createElement('div'); label.className = 'label'; label.innerText = r.label;
            const meta = document.createElement('div'); meta.className = 'meta'; meta.innerText = (r.xp||0) + ' XP';
            row.appendChild(img); row.appendChild(label); row.appendChild(meta);
            row.addEventListener('click', ()=> selectRecipe(r) );
            container.appendChild(row);
        });
    }

    function selectRecipe(r){
        selectedRecipe = r;
        const req = document.getElementById('required-items');
        req.innerHTML = '';
        const craftBtn = document.getElementById('craft-btn');
        if(!r){
            req.innerHTML = '<p style="color:rgba(255,255,255,0.2)">Select an item to see requirements</p>';
            craftBtn.disabled = true;
            return;
        }
        const title = document.createElement('div'); title.style.fontWeight='800'; title.innerText = r.label; req.appendChild(title);
        const ul = document.createElement('ul');
        (r.requires || []).forEach(it=>{
            const li = document.createElement('li'); li.innerText = it.item + ' x' + it.amount; ul.appendChild(li);
        });
        req.appendChild(ul);
        craftBtn.disabled = false;
        craftBtn.onclick = ()=> {
            fetch(`https://${GetParentResourceName()}/tryCraft`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ benchId: currentBenchId, recipeId: r.id }) });
        };
    }

    function onCraftResult(payload){
        if(!payload) return;
        // play sound
        const s = document.getElementById('success-snd');
        try{ s.currentTime = 0; s.play(); }catch(e){}
        // hide UI + clear focus
        const appEl = document.getElementById('app');
        appEl.style.opacity = '0';
        setTimeout(()=>{ appEl.style.display='none'; appEl.style.opacity='1'; }, 380);
        try{ if(typeof SetNuiFocus === 'function') SetNuiFocus(false,false); }catch(e){}
        try{ pcall && pcall(function(){ SetNuiFocusKeepInput(false); }); }catch(e){}
        // show popup
        const popup = document.getElementById('xp-popup');
        document.getElementById('xp-amount').innerText = payload.xp || 0;
        document.getElementById('xp-bench').innerText = payload.benchLabel || payload.benchId || '';
        popup.style.display = 'block'; popup.style.opacity='0'; popup.style.transform='translate(-50%,-50%) scale(0.9)';
        setTimeout(()=>{ popup.style.opacity='1'; popup.style.transform='translate(-50%,-50%) scale(1.06)'; },10);
        setTimeout(()=>{ popup.style.opacity='0'; popup.style.transform='translate(-50%,-50%) scale(0.94)'; setTimeout(()=>{ popup.style.display='none'; },400); }, 1600);
    }

    // Close handlers
    document.addEventListener('DOMContentLoaded', ()=>{
        const closeBtn = document.getElementById('close-btn');
        if(closeBtn) closeBtn.addEventListener('click', ()=>{ fetch(`https://${GetParentResourceName()}/close`, { method:'POST' }); document.getElementById('app').style.display='none'; try{ if(typeof SetNuiFocus === 'function') SetNuiFocus(false,false); }catch(e){} });
        const craftBtn = document.getElementById('craft-btn');
        if(craftBtn) craftBtn.disabled = true;
    });

    window.addEventListener('keydown', (e)=>{
        if(e.key === 'Escape'){
            fetch(`https://${GetParentResourceName()}/close`, { method:'POST' });
            document.getElementById('app').style.display='none';
            try{ if(typeof SetNuiFocus === 'function') SetNuiFocus(false,false); }catch(e){}
        }
    });

})();