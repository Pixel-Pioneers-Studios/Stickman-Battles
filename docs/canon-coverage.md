# Canon Coverage Audit

Cross-references every canon element (`docs/canon.md`) against the shipped story
(`js/story/acts/`) to verify each is **present** and **stated**. Working document —
filled in element by element. Gaps are reported for approval before any story text
is edited.

**Method:** distinctive-phrase search across `js/story/acts/` to locate each beat,
then closer read to confirm it's actually delivered (not just a name mentioned).
Started July 10 2026 (session continuing the story-audit work). This is a
**presence** first pass; per-beat *correctness* verification is noted where still pending.

**Legend:** ✅ present + stated · 🟡 partial / thin · ❌ gap (missing or not stated) · 🔀 structural drift · ⏳ not yet deep-verified

---

## Coverage matrix

| # | Canon element | canon.md | Verdict | Located in (act files) | Note |
|---|---|---|---|---|---|
| 1 | Kael — name/origin, merged-not-hollowed | §THE PLAYER | ✅ | act0, throughout (25+) | Name used; "the player" only in code comments, not facing text |
| 2 | Classes = dead bearers (echoes) | §CLASSES | ✅ | actvoidmind ("Every class is a resurrection… echoes of the dead") | Stated outright |
| 3 | Herald of Nothing ("you still have yours") | §HERALD | ✅ | act2-arc3, actvoidmind | Key line present |
| 4 | Calix — two fragments, stasis/isolation column | §CALIX | ✅ | side/calix-discovery, act7-arc2/3 | Present |
| 5 | Axiom = a bearer (the Kael mirror) | §AXIOM | ✅ | act7-arc1/2 | Stated: "His [fragment] is too", "two bearers", "the ninety-four fought alone" |
| 6 | **Axiom / Creator / True Form = ONE entity** | §CORE IDENTITY, §CRITICAL NOTE | ❌ | not stated | **Canon's flagged #1 error.** Story never states the three are one being. HIGH PRIORITY |
| 7 | The Kernel (persists, extracted by Sovereign) | §CORE IDENTITY | ✅ | act7 (12+) | Present |
| 8 | Void Mind — origin/nature | §VOID MIND | ✅ | actvoidmind (117+) | Heavily covered |
| 9 | Fracture system — dual purpose (war + anti-Void) | §FRACTURE SYSTEM | ✅ | act3-arc2, act4-arc2, actvoidmind | Anti-Void stated ("built as a weapon against it"); "both accounts use the same facts" nuance present |
| 10 | Companions — Anders/Null, Seraph, VAEL | §COMPANIONS | ✅ | act4mv worlds (null/seraph/vael), actvoidmind | Present as multiverse bosses |
| 11 | Veran — 15yr guilt, death (betrayal), hooded=Axiom | §VERAN | ✅ | act3, act4, act7, act4mv | Guilt + betrayal + "figure on the ridge" all present |
| 12 | Paradox — **origin (three failures)** | §PARADOX | ❌ | not stated | Paradox present (29×) but its origin — Void Mind interception + Sovereign's failed stabilization — is not told |
| 13 | Paradox — phantom blades, final manifestation | §PARADOX | ✅ | actvoidmind, act7-arc3 | Present |
| 14 | God — defeated by Kael + Axiom together | §GOD | ✅ | act7-arc1/2, act5-bridge | Present (now also the real God entity — see session work) |
| 15 | The saving moment — True Form fight, Axiom freed | §SAVING MOMENT | ✅ | act5-bridge, act7, actvoidmind | Present |
| 16 | Companion arc — soul-bond, confession | §COMPANION ARC | ✅ | act5-bridge, act7 ("the bond") | Present as "the bond"; confession present |
| 17 | Awakened Sovereign = the SovereignMK2 game mode | §AWAKENED SOVEREIGN | ✅ | act7-arc2 | Stated: "Unconstrained. Fully adaptive. Every encounter you had ever given it, refined into readiness" |
| 18 | The double taking (God's form + kernel, one descent) | §AWAKENED SOVEREIGN, §GOD | ✅ | act7-arc2 | Present |
| 19 | Lab fusion → Absolute Axiom (Sovereign fuses kernel+God) | §ABSOLUTE AXIOM | 🟡 | act7 (seam/engineered bond present) | The *seam* is stated; the fusion-creation moment itself is thin |
| 20 | Absolute Axiom — seam weakness, allies-as-window | §ABSOLUTE AXIOM | ✅ | act7-arc2/3 | Seam + interference stated |
| 21 | The Preserved — "Tell them we exist" | §PRESERVED | ✅ | act3-arc1, actvoidmind | Present |
| 22 | Fragment — **one-bearer rule**, death-transfer | §FRAGMENT | ❌ | not stated | The one-bearer rule (makes Calix/Kael meaningful) is not stated in story text |
| 23 | Void Mind fight (memory-as-weapon) | §VOID MIND FIGHT | ✅ | actvoidmind | Fully built |
| 24 | Architect fates (Veran/2nd/3rd/4th) | §ARCHITECT FATES | 🟡 | act3-arc1/2 (all four present) | Veran + Third fates stated; Second (Forest Dimension) + Fourth (keeper of record) *final fates* not stated — low priority (epilogue-level) |
| 25 | Story structure / act order | §STORY STRUCTURE | 🔀 | — | **Canon's chapter-number map is stale vs the 184-chapter story** (see below) |

---

## Confirmed issues (report-first — awaiting approval to fix)

### A. Structural drift — canon's chapter map is stale 🔀
Canon §STORY STRUCTURE lists chapter numbers that no longer match the shipped story:

| Canon says | Actually at |
|---|---|
| True Form fight — ch 116 | ch 148 |
| God fight — ch 140–147 | ch 160–161 |
| Absolute Axiom — ch 152 | ch 165–167 |
| Epilogue — "move to after 154" | still flagged unresolved |

Canon itself marks several as "open code task." Fix = reconcile the canon table (and the
"open task" notes) to the real numbering. Doc-only change, low risk.

### B. Content gaps (canon beats not stated in story) ❌
1. **Axiom / Creator / True Form are one entity (#6)** — canon calls this its single most
   common lore error and says it *must* be stated. The story never says the three are one
   being. Risk: players may read them as separate. **Highest priority.**
2. **The one-bearer rule (#22)** — "a new bearer cannot exist while one already lives." This
   is what makes Calix's stasis and Kael's arrival meaningful; not stated anywhere.
3. **Paradox's origin (#12)** — the "three failures" (Axiom's interrupted creation + Void
   Mind interception + Sovereign's failed stabilization). Paradox is used heavily but never
   explained.
4. **Lab fusion creation moment (#19)** — the seam/weakness is stated, but the actual moment
   of Sovereign fusing the kernel into God's form to *create* Absolute Axiom is thin. (🟡)

### Low priority
- **Second + Fourth Architect final fates (#24)** — both are present as characters in Act 3;
  their epilogue fates (Second → Forest Dimension; Fourth → keeper of the record) aren't stated.

## Presence pass — COMPLETE (July 10 2026)
All 25 elements audited. Tally: **19 ✅ present+stated · 2 🟡 partial (#19, #24) · 3 ❌ content
gaps (#6 one-entity [HIGH], #12 Paradox origin, #22 one-bearer rule) · 1 🔀 structural drift (#25)**.
The lore is substantially faithful; the gaps are specific and closeable. Next: fix in priority
order (on approval) — start with #6 (the one-entity statement canon flags as its critical error).
