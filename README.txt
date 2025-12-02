Jlee-Crafting-XPSystem-Fixed

Features:
- Per-item XP system (custom xp per recipe)
- UI hidden until data is fully ready and only loads after bench is targeted
- 300ms fade-in animation when UI opens
- UI closes when exiting or when crafting starts (focus released)
- Bench respawn fixes on resource/server restart
- 3 sample recipes per category (general, robbery, weapon) with xp 10/25/50

Metadata key used: craftingxp (stored in player metadata)

To customize:
- Edit config.lua and add 'xp = <number>' to any recipe table
- Restart resource: restart Jlee-Crafting

Debug logs:
- [Crafting Debug] NUI opened successfully ...
- [Crafting Debug] Gave X XP for crafting ...
- [Crafting Debug] Closed UI (exit/crafting started)
