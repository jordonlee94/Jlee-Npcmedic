// Prevent grey overlay when UI closed

// Cinematic open/close helpers (injected)
function showCraftingUI() {
    const cont = document.getElementById('crafting-container') || document.querySelector('.inventory-container');
    if(!cont) return;
    cont.style.display = 'flex';
    // small timeout to allow display to take effect before adding active to trigger transitions
    setTimeout(()=>{
        cont.classList.add('active');
    }, 20);
    try { if(window.SetNuiFocus) SetNuiFocus(true, true); } catch(e){}
    try { if(typeof onCraftingOpen === 'function') onCraftingOpen(); } catch(e){}
}

function hideCraftingUI() {
    const cont = document.getElementById('crafting-container') || document.querySelector('.inventory-container');
    if(!cont) return;
    cont.classList.remove('active');
    setTimeout(()=>{
        cont.style.display = 'none';
        try { if(window.SetNuiFocus) SetNuiFocus(false, false); } catch(e){}
        try { if(typeof onCraftingClose === 'function') onCraftingClose(); } catch(e){}
    }, 500);
}

// Ensure default hidden on load
document.addEventListener('DOMContentLoaded', ()=>{
    const cont = document.getElementById('crafting-container') || document.querySelector('.inventory-container');
    if(cont){ cont.classList.remove('active'); cont.style.display = 'none'; cont.style.opacity = 0; }
});


// html/js/app.js
window.addEventListener('message', function(event) {
    const data = event.data;
    const container = document.getElementById('crafting-container');
    const recipesList = document.getElementById('recipes-list');
    const xpFill = document.getElementById('xp-fill');
    const xpValue = document.getElementById('xp-value');
    const playerLevelEl = document.getElementById('player-level');

    if (!container) return;

    if (data.action === 'openUI') { try{ const cont = document.getElementById('crafting-container') || document.querySelector('.inventory-container') || document.getElementById('crafting-overlay') || document.querySelector('.overlay'); if(cont) cont.style.display='flex'; }catch(e){} showCraftingUI(); try{ const cont = document.getElementById('crafting-container') || document.querySelector('.inventory-container'); if(cont) cont.style.display='flex'; } catch(e){}
        showCraftingUI();
        try {
            // set title
            if (data.title) { const t = document.querySelector('#crafting-ui .header h2'); if(t) t.innerText = data.title; }
            // store recipes
            window.__nuiRecipes = data.recipes || []; window.__currentBench = data.bench || data.title || 'general';
            const recipesList = document.getElementById('recipes-list'); if(recipesList){ recipesList.innerHTML = ''; window.__nuiRecipes.forEach(r => {
                const div = document.createElement('div'); div.className='recipe-item'; div.dataset.id = r.id || r.name; div.dataset.category = r.category || data.bench || 'general';
                div.innerHTML = '<div style="font-weight:700">' + (r.name || r.id) + '</div><div class="small-muted">' + (r.xp || 0) + ' XP</div>';
                div.addEventListener('click', function(){ selectRecipe(div.dataset.id); });
                recipesList.appendChild(div);
            }); }
            // show container
            const cont = document.getElementById('crafting-container') || document.querySelector('.inventory-container'); if(cont){ cont.classList.add('active'); cont.style.display='flex'; }
        } catch(e){ console.error('openUI error', e); }

        // Set title and recipes from Lua-config data
        try {
            if (data.title) {
                const t = document.querySelector('#crafting-ui .header h2'); if(t) t.innerText = data.title;
            }
            if (data.recipes && Array.isArray(data.recipes)) {
                const recipesList = document.getElementById('recipes-list'); if(recipesList) { recipesList.innerHTML = ''; window.__nuiRecipes = data.recipes || []; window.__currentBench = data.bench || data.title || 'general'; data.recipes.forEach(r => {
                    const div = document.createElement('div'); div.className = "recipe-item"; div.dataset.id = r.id || r.name; div.dataset.category = r.category || data.bench || 'general';
                    div.innerHTML = '<div style="font-weight:700">' + (r.name || r.id) + '</div><div class="small-muted">' + (r.xp || 0) + ' XP</div>';
                    div.addEventListener('click', function(){ selectRecipe(div.dataset.id); });
                    recipesList.appendChild(div);
                }); }
            }
        } catch (e) { console.error('openUI handler error', e); }

        document.getElementById('crafting-container').classList.add('active');
        document.getElementById('crafting-container').style.display = 'flex';
        const category = data.category;
        const recipes = data.recipes || [];
        const playerXP = data.playerXP || 0;
        const playerLevel = data.playerLevel || 1;

        // show container
        container.style.display = 'flex';

        // update xp/level first
        playerLevelEl.innerText = playerLevel;
        xpValue.innerText = playerXP + " XP";
        // compute fill percent relative to next level (we don't know server thresholds here),
        // so we just cap at 100%.
        xpFill.style.width = '50%';

        recipesList.innerHTML = '';
        recipes.forEach(r => {
            const div = document.createElement('div');
            div.className = 'recipe';
            const label = document.createElement('div');
            label.innerText = r.label + (r.levelRequired ? (' (lvl ' + r.levelRequired + ')') : '');
            const btn = document.createElement('button');
            btn.className = 'craft-btn';
            btn.dataset.name = r.name;
            btn.dataset.category = category;
            btn.innerText = 'Craft';
            // lock if player level too low
            if (r.levelRequired && playerLevel < r.levelRequired) {
                btn.disabled = true;
                btn.title = 'Requires level ' + r.levelRequired;
            }
            div.appendChild(label);
            div.appendChild(btn);
            recipesList.appendChild(div);
        });
    }

    if (data.action === 'closeUI') {
        container.style.display = 'none';
    }

    if (data.action === 'updateXP') {
        const xp = data.playerXP || 0;
        const lvl = data.playerLevel || 1;
        playerLevelEl.innerText = lvl;
        xpValue.innerText = xp + " XP";
        // small visual fill update
        xpFill.style.width = Math.min(100, 20 + (xp % 100)) + '%';
    }
});

// click handler for craft and close

document.addEventListener('click', function(e){
    try {
        // Craft button (by id or by class .craft-btn)
        const craftEl = e.target.closest ? e.target.closest('.craft-btn, #craftBtn') : (e.target.classList && e.target.classList.contains('craft-btn') ? e.target : null);
        if(craftEl){
            const selected = window.__selectedRecipe || null;
            if(!selected){ console.log('No recipe selected to craft'); return; }
            const bench = selected.category || (window.__currentBench || 'general');
            console.log('Crafting:', selected.id || selected.name, 'from bench:', bench);
            try {
                fetch(`https://${GetParentResourceName()}/craftItem`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemname: selected.id || selected.name, category: bench })
                }).catch(err => console.error('craft fetch error', err));
            } catch(err){ console.error(err); }
            try { if(typeof onCraftingAction === 'function') onCraftingAction(selected); } catch(e) {}
            return;
        }

        // Close button
        const closeEl = e.target.closest ? e.target.closest('#close-button') : (e.target.id === 'close-button' ? e.target : null);
        if(closeEl){
            try { fetch(`https://${GetParentResourceName()}/close`, { method: 'POST' }).catch(err => console.error(err)); hideCraftingUI(); } catch(e){}
            try { hideCraftingUI(); } catch(e){}
            return;
        }
    } catch(err){ console.error(err); }
});



// Helper to select a recipe and populate requirements
function selectRecipe(id){
    try {
        const recipes = window.__nuiRecipes || [];
        const found = recipes.find(r => r.id == id || r.name == id);
        // fallback: try to find in DOM dataset id -> might be simpler: read dataset.category and send craft fetch to server to get requirements
        const reqEl = document.getElementById('requirements');
        if(!reqEl){ return; }
        reqEl.innerHTML = '';
        if(found && found.items){
            found.items.forEach(it => {
                const li = document.createElement('li');
                li.textContent = it.name + ' x' + (it.qty || it.amount || 1);
                reqEl.appendChild(li);
            });
            // mark selected class on items
            document.querySelectorAll('.recipe-item').forEach(el => el.classList.toggle('selected', el.dataset.id == id));
            // store selected id for craft button
            window.__selectedRecipe = found;
        } else {
            reqEl.innerHTML = '<li>No requirements found</li>';
        }
    } catch(e){ console.error(e); }
}


// Attach craft button handler
document.addEventListener('click', function(e){
    // If craft button clicked
    if(e.target && (e.target.id === 'craftBtn' || e.target.closest && e.target.closest('.craft-btn'))){
        const selected = window.__selectedRecipe || null;
        if(!selected){
            console.log('No recipe selected to craft');
            return;
        }
        const bench = selected.category || (window.__currentBench || 'general');
        console.log('Crafting:', selected.id || selected.name, 'from bench:', bench);
        fetch(`https://${GetParentResourceName()}/craftItem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemname: selected.id || selected.name, category: bench })
        }).catch(err => console.error('craft fetch error', err));
    }

    // Close button
    if(e.target && (e.target.id === 'close-button' || (e.target.closest && e.target.closest('#close-button')))){
        const cont = document.getElementById('crafting-container') || document.querySelector('.inventory-container');
        if(cont){ cont.classList.remove('active'); cont.style.display='none'; }
        fetch(`https://${GetParentResourceName()}/close`, { method: 'POST' }).catch(err => console.error(err)); hideCraftingUI(); hideCraftingUI();
    }
});
