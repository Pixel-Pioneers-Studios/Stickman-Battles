# Gameplay Notes (from playtesting & developer feedback)

This file documents things that cannot be inferred from code alone — actual feel, design intent, known issues, and future direction. Update this after significant playtesting sessions.

---

## Combat

**Pacing**
- Combat is fast and punishing — skilled players can chain pressure effectively.
- Spam has been a known community complaint ("faster spammer wins").
- Countermeasures already in place: consecutive-miss stun chance, parry system.
- Status of spam fix: **uncertain** — measures exist but effectiveness is unverified. Worth stress-testing with dedicated spam vs. parry matchups.

**Knockback / Ragdolls**
- Generally feels satisfying.
- Slightly stiff — acceptable for now, not a priority fix.
- Do not make knockback floatier without explicit request.

---

## Boss Structure & Design

**Planned scope**
- ~20 bosses total (one per multiverse branch, ~17 branches).
- Only 2 real bosses currently implemented: **Creator** and **Axiom**.
- **God** and **AbsoluteAxiom** are WIP stubs.

**Creator / Axiom branch (the only branch with 2 fights)**
- Axiom *is* the Creator — Creator is a vessel/host for Axiom.
- These two fights share a branch and are the only branch with back-to-back fights.

**Creator fight feel**
- Early phase: too easy, passive — players can land many free hits.
- Later: barrage of attacks fires without much warning — difficulty spike feels unearned.
- Goal: smoother ramp, earlier pressure signals.

**Axiom fight feel**
- More balanced attack distribution than Creator.
- Still has room for improvement — attacks could be sharper and more varied.

---

## Adaptive AI (TrueForm / Sovereign MK2)

**Current state**
- Adaptive behavior is **not noticeably felt** in actual play.
- Players do not perceive it as genuinely reacting to them.
- The system exists and functions, but the adaptation is subtle to the point of being invisible.

**Design goal**
- The intended feel is **Garou from One Punch Man**: an AI that visibly escalates, counters the player's patterns, and feels like it is *learning* mid-fight.
- This is an open problem — the developer has not yet found a solution that achieves this feel.
- When working on adaptive AI, prioritize *perceptible, dramatic* reactions over statistically correct ones. The player must *feel* the AI adapt.

---

## Attacks & Telegraphing

- Most attacks are readable and feel fair.
- Teleport-based attacks are the main exception — these can feel unpredictable.
- No urgent overhaul needed; fine-tune on a per-attack basis.

---

## Cinematics

**Pacing**
- Generally well-paced, nothing drags badly.
- Could use more *impact* — scenes feel safe rather than powerful.
- Not a blocking issue; polish pass is future work.

**Transitions**
- Into and out of cinematics: smooth, no jarring snaps.
- No work needed here currently.

---

## Story Mode

**Session length**
- Hardcore players may finish in one sitting; casual players will take multiple sessions.
- Design goal: make it addictive enough that players *want* to come back.

**Onboarding**
- First-time players are caught up via the story menu intro screen.
- Lore and context unfold progressively through conversations, interactions, and transitional stages.
- Game does not assume prior knowledge — it teaches as it goes.

---

## Online / Multiplayer

- Desync can occur but is not frequent enough to be a blocker.
- Overall online stability is acceptable for current scope.
- No urgent fixes needed; monitor as player count grows.

---

## Art / Weapon Models

- Some weapon visual models are placeholder designs.
- Developer plans to replace these with final models soon.
- Do not build logic or effects tightly coupled to placeholder weapon shapes — they will change.
