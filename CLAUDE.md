# CLAUDE.md

## Code Architecture
- One script file per system (e.g. upgrades.js, sequences.js, prestige.js, render.js)
- No single file exceeds 500 lines — split if approaching limit
- One gameState object as single source of truth — never store state in DOM
- All game logic in update(delta) — render() only reads, never mutates
- All unlock/milestone checks happen in update(), not render()
- New features must integrate with existing save/load before being considered done

## Code Style
- No comments unless explaining non-obvious math formula
- Descriptive variable names — no single letters except loop indices and math formulas
- No magic numbers — define constants at top of each file
- Functions do one thing — if a function needs a comment to explain what it does, split it

## Modularity
- Each system owns its own: state slice, update logic, render logic, save/load keys
- Systems communicate only through gameState — no direct function calls between systems
- Adding a new feature must not require editing more than 2 existing files

## Visual Design — Core Philosophy
- Inspiration: Mass Incremental Rewritten
- Dark background, monospace font, information-dense layout
- The UI should feel alive — numbers updating, subtle transitions, color reacting to game state
- Every visual element either conveys information or reinforces the game's mathematical identity
- Clean and structured, but not sterile — color, animation, and effects are tools, use them

## Color Usage
- Color encodes meaning, never decoration
- Use color to show: buff vs debuff, active vs locked, 
  milestone reached, softcap warning, prestige layer identity
- Each prestige layer gets its own accent color 
  (e.g. Axiom: white, Theorem: cyan, Conjecture: purple, Paradox: red)
- Softcap / overflow warnings: escalating colors red → orange → yellow → green
- Buff values: green. Penalty/cost values: dimmer or red-tinted
- Background always stays near-black — colors appear as accents only, never backgrounds

## Animation & Effects
- Subtle transitions on unlock — new content fading or sliding in feels intentional
- Number updates should feel smooth, not jarring
- Prestige/reset moments are significant — a brief visual flash or screen effect is appropriate
- Milestone completions: small highlight or color pulse on the row
- Nothing loops or plays constantly — animations trigger on events, then stop
- Performance first: no animation that runs every frame unless absolutely necessary

## Icons & Images
- Each upgrade and currency has its own unique SVG icon
- Icons are geometric and mathematical — built from lines, curves, and shapes
- No emoji, no unicode symbols, no external image files
- Icon design should reflect the mathematical concept it represents
- Locked content icons appear at low opacity, same design

## Tooltips
- Every upgrade, milestone, and resource shows a tooltip on hover
- Tooltip contains: name, current effect, next level effect, flavor description
- Tooltip style matches overall dark theme — no rounded corners, monospace font

## Layout Principles
- Single column main content, max-width constrained and centered
- Tabs for major system separation
- New content unlocks by extending existing structure — never feels bolted on
- Information hierarchy: current value largest, rate smaller, cost smallest
- Locked content visible but clearly inactive (low opacity)