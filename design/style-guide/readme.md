# Na(h) design system

Na(h): "Na" is sodium, add "h" and it reads "Nah". Home cooks in Latino and Vietnamese American households managing high blood pressure wear camera glasses while cooking, upload the video afterwards, and Na(h) detects each seasoning addition, estimates sodium per addition and for the dish against the 2,300 mg daily limit. Post-processing only, never live. Estimates, never medical advice. Unknown ingredients are flagged "Not in your pantry", never 0 mg.

Source of truth for the visual spec: **Na(h) Style Guide.dc.html** (1440 artboard). Tokens live in `styles.css` → `tokens/`.

## Content fundamentals
Warm, direct, slightly cheeky. Sentence case, British spelling, short sentences. Talk about the dish, not the person. "Estimate", never "diagnose". No emoji.
Examples: "Say nah to hidden sodium." · "Cook like you always do. We'll count the salt." · Disclaimer Line: "Estimates from your pantry labels. Not medical advice."

## Visual foundations
Kitchen editorial. Cream canvas (#FAF7EE), paper cards (#FFFDF7), flat surfaces separated by 1px stone hairlines; 2px ink borders on anything interactive. One floating shadow only (0 12px 32px -12px rgba(30,28,25,.18)) for nav pill, tooltips, toasts, dialogs.
Type: Instrument Serif 400 for display (italic accent phrase, never bold), Figtree for UI/body (tabular figures for numbers), JetBrains Mono 500 13px for timestamps in pills.
Radii: controls 12, chips/badges/nav pill, cards 28, panels/video 32–40, logo tile 14. 8px spacing base; 1200 max content width.
Colour rules: lavender = primary action; forest = secondary brand/success/chart line; sage = under-limit fill; saffron = flagged/not counted; chilli = over limit ONLY. Colour never the only signal (icon + label).
Motion: 150/300/600/900ms; entrances cubic-bezier(.22,1,.36,1); pops ~6–8% overshoot; reveals fade + 12–16px rise, staggered lists. Reduced motion → opacity fades, loops stopped, final values shown.
Icons: Lucide, rounded line, 1.75px stroke, 20–24px, ink; forest/chilli for status only.
Illustration: original chunky matte-clay 3D character (forest apron, camera glasses with lavender status light), unbranded seasoning props. Renders to be supplied; slots in the style guide accept drops.

## Index
- styles.css, tokens/*.css — custom properties
- Na(h) Style Guide.dc.html — tokens, wordmark, components, detection motif, contrast audit
- image-slot.js — drop slots for illustration renders
