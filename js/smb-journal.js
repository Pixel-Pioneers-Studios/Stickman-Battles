'use strict';
// smb-journal.js — THE JOURNAL: lore entries that fill in as the story, the prequels
// and the ending are played. Optional reading; nothing in it is needed to play.
// Depends on: smb-menu-ui.js (_storyChapterBeaten, _storyFinished, getPrequelCleared)
//             at call time only, so it loads straight after that file.
//
// Every entry opens no earlier than the story tells what it says. Unlock gates are
// story registry ids (players see id + 1). Check a new entry's gate with a search of
// the chapter registry before adding it: an entry must never be the first place a
// twist appears. "Outside the Record" holds what nobody in the main story ever learns,
// and all of it waits for the end of The 95th.
//
// unlock: { story: id } | { prequel: ['axiom'|'sovereign', chaptersCleared] }
//       | { found: 'realmKey:room:chestId', ch: id } (a chest opened in an optional realm room, smb-realm.js)
//       | { complete: true } | { all: [...] } | { any: [...] }
// text and extras[].text: paragraphs separated by a blank line.
// extras: later sections that open on their own gates (a second look at the same thing).

const JOURNAL_CATEGORIES = [
  { id: 'fragment',   title: 'The Fragment' },
  { id: 'people',     title: 'People' },
  { id: 'companions', title: 'The Companions' },
  { id: 'axiom',      title: 'Axiom' },
  { id: 'outside',    title: 'Outside the Record' },
];

const _J_OUTSIDE = { complete: true }; // the floor for everything nobody in the story learns

const JOURNAL_ENTRIES = [
  // ── The Fragment ───────────────────────────────────────────────────────────
  {
    id: 'the-dead', cat: 'fragment', title: 'They Are the Dead',
    voice: 'The voice in the fragment',
    voiceLater: { unlock: { story: 127 }, voice: 'Paradox' },
    unlock: { story: 16 },
    text:
`The classes are not archetypes. Every one of them was a person who carried a fragment before you, and the fragment killed every one of them.

It wasn't cruelty. Nobody had ever made a bond between body, soul and fragment, so the fragment did what it does: it settled in, it began to merge, and the body gave out. At the moment of death it took what was left. A soul. A way of standing. The timing of a swing.

That is what moves your hands when you don't know what to do. Someone who died holding what you're holding is still answering for you.

You don't need their names. The fragment kept them anyway.`,
  },
  {
    id: 'empty-hands', cat: 'fragment', title: 'Empty Hands',
    voice: 'The Record',
    unlock: { story: 16 },
    text:
`A bearer does not carry a weapon. When a dead bearer's pattern surfaces, it brings the thing their hands were shaped around, and the arm crystallizes out of the fragment's light along the line of the grip. When the threat is gone it goes back to being potential, slower than it came, as if it would rather not let go.

The pattern reads a threat before the bearer does. By the time you understand that a fight has started, your hand is already full.

So an empty-handed bearer is not an unarmed one. It only means the pattern hasn't decided you're worth answering yet.`,
  },
  {
    id: 'hollow', cat: 'fragment', title: 'Hollow Arms',
    voice: 'The Record',
    unlock: { story: 24 },
    text:
`The arms the system's soldiers carry are copies. Near-black, a violet haze along the edge: the shape of a named arm, filled with stolen power, and nothing behind it. No stance, no timing, no dead hands remembering how it was held.

That is why every copy is weaker than the original, however much force is poured into it. Mountainfall is Torren's. A Hollow Mountainfall belongs to nobody.

Yours is the real one.`,
  },
  {
    id: 'forty-seven', cat: 'fragment', title: 'The Forty-Seven',
    voice: 'Cut into the wall',
    unlock: { found: 'proving:last:marks', ch: 28 },
    text:
`The Crucible kept count.

Behind its outer wall are three rooms, and every bearer who got that far was put through all three: a floor that falls away under you, a weight that has to be moved the wrong way, and the thing that guards the last door.

Forty-seven of them reached the last room. The count is cut into its wall in fives, by a hand that pressed hard. No mark was ever cut for one who walked out the far side.

What the Crucible kept of the forty-seven, its champion carries: a way of standing from each of them, every one a style that wasn't enough.

There is room on the wall for one more mark.`,
  },
  {
    id: 'ninety-four', cat: 'fragment', title: 'Ninety-Four',
    voice: 'The Record',
    unlock: { story: 146 },
    text:
`Ninety-four bearers carried a fragment before the ninety-fifth. None of them made the bond. The fragment killed each of them slowly, and near the end someone always arrived: to take the crystal from the dying, or to finish the ones whose dying had stalled.

The fragment was the cause every time. The one who came was only efficient.

Some of them got close. The Herald of Nothing was one of the ninety-four. So was every class you have ever fought as. None of them is a memory now. Each one is a way you move.`,
  },
  {
    id: 'the-link', cat: 'fragment', title: 'The Link',
    voice: 'Calix',
    unlock: { story: 165 },
    text:
`Every bearer gets their own crystal. Nothing is handed down. And still the newest one holds everything every older one ever held, without anything being carried between them. I have two of them in me, so I have felt it from both ends, and I can tell you exactly how it works: I can't. Nobody can. Not even the one who spent five thousand years collecting them.

What I can tell you is what it means. Every generation is denser than the last. Yours is the newest. Everything is in it.`,
  },
  {
    id: 'one-bearer', cat: 'fragment', title: 'The Rule Nobody Wrote',
    voice: 'Calix',
    unlock: { story: 165 },
    text:
`A new bearer only appears when no living one can be detected. It never kills anyone to keep that true, and it says nothing about how many fragments there are. It just waits.

That is how I can be older than you without stopping you from existing. In the column I was alive the way a held breath is alive. Nothing registered. So the fragment did what it does when it finds no one, and made another.

It made you while I was asleep in the glass. I've decided not to find that strange.`,
  },

  // ── People ─────────────────────────────────────────────────────────────────
  {
    id: 'field-notes', cat: 'people', title: 'Field Notes, Page One',
    voice: 'Veran',
    unlock: { story: 9 },
    text:
`Seam readings at the east relay are up again. Third week running. I keep telling the others it's drift. It isn't drift.

Fifteen years, and I still check the old site first, every morning, before anything else. Habit, I tell myself.

The new one, the bearer, fights like someone remembering a dance they never learned. I don't know what to tell them yet. I don't know what I'm allowed to tell them.

Note for later: find out whether the fragment can come out without taking the person with it. If it can't, find out who decided that.`,
    extras: [{
      unlock: { story: 171 }, label: 'Fifteen Years', voice: 'The Record',
      text:
`Veran was testing dimensional equipment on the day the first fracture opened. The blame landed on her, and she carried it for fifteen years. Every deal she made, every page she hid, every risk she took on someone else's behalf came out of that.

She didn't cause it. The timing was a coincidence. Nobody told her, because nobody knew, and by the time anyone could have, she was gone.

She was right about the variant: there was none. She was right not to trust the figure on the ridge. This is written down because she would have wanted the correction in writing.`,
    }],
  },
  {
    id: 'herald', cat: 'people', title: 'The Second Dissolution',
    voice: 'The Record',
    unlock: { story: 48 },
    text:
`The Herald of Nothing was a bearer once. The fragment was taken out of them, and the shell kept going. Not much was left. Not quite nothing.

It drifted through the network until the rift found it and gave it one purpose: guard the threshold. It accepted. That was the first choice it had made since the extraction.

It fought seriously, because a real fight still meant something. When it saw a fragment still whole inside its bearer, it said: "You still have yours. I had hoped someone would."

When the rift closed, it dissolved. The first time had been done to it. The second time it chose.`,
  },
  {
    id: 'preserved', cat: 'people', title: 'Tell Them We Exist',
    voice: 'The Record',
    unlock: { story: 60 },
    text:
`The Preserved came from fifty-two dimensions the system absorbed. They were not destroyed. They were kept: integrated, functional, inside. They built lives there anyway. Markets, names, arguments, children.

When they finally spoke to someone from outside, they did not ask to be freed. They asked for one thing.

Tell them we exist.

This entry is that.`,
  },
  {
    id: 'third-architect', cat: 'people', title: 'Fifty-Two',
    voice: 'The Fourth Architect',
    unlock: { story: 61 },
    text:
`The Third Architect did the arithmetic out loud once, and then never again. The closure protocol would end the fracture system. The fracture system held fifty-two absorbed dimensions, and the Preserved had built lives inside them. Close the rift, and they went with it.

Fifty-two dimensions against the mission. They chose the dimensions, made their own deal to do it, and stepped back through a portal saying they weren't trying to stop anyone forever.

I chose the mission at every point. I have had a long time since to check whether that makes me right. I don't think it does. I think it makes me the one who stayed to write it down.`,
  },
  {
    id: 'fallen-god', cat: 'people', title: 'The Evaluator',
    voice: 'The Record',
    unlock: { story: 80 },
    text:
`The Fallen God does not fight to destroy. It tests. Its domain keeps the records of the first walls ever set between dimensions, the way a ruin keeps a bell that no longer rings.

It said the Creator had built a weapon against the Void Mind, and that the fragment was a piece the Void Mind carved from itself. Both are close to true. Neither is all of it. It may know that.

When the test ended it was not defeated. It was satisfied. "The walls hold. So will you."`,
  },
  {
    id: 'paradox-log', cat: 'people', title: 'The Vessel Log',
    voice: "The Creator's records",
    unlock: { story: 137 },
    text:
`Vessel complete. Activation by transfer from the deeper layer.

Transfer intercepted partway. Source outside the domain. Cannot be reached.

Vessel destabilizing. Correction attempted. Correction failed: something is deepening the fault faster than I can close it. Second source unidentified.

Result: one being. Unstable. No loyalty. No purpose. It has left the vessel bay.

It was meant to fight beside me. I have built a great many things. This is the only one I made to be someone, and it belongs to nobody.`,
    extras: [{
      unlock: _J_OUTSIDE, label: 'The Second Source', voice: 'Not in the Record',
      text:
`The second source was Sovereign. Axiom never asked him to touch the vessel, and never learned that he had. A loyal ally was a piece on the board Sovereign had not vetted, so he made sure whatever came out would belong to no one.

It worked exactly as he meant it to. Much later, the being it made spent the last of itself helping break the next vessel he built.`,
    }],
  },

  // ── The Companions ─────────────────────────────────────────────────────────
  {
    id: 'null', cat: 'companions', title: 'Null',
    voice: 'The Record',
    unlock: { story: 107 },
    text:
`Null catalogues. Four thousand two hundred years of fights, eight hundred and forty-seven entries, every fighter reduced to the habit they go back to under pressure. It predicts. It is rarely wrong.

At the end of the fight it used a name nobody had said in all those years. "Anders would have found that difficult to catalogue."

It did not explain who Anders was. It may not know.`,
    extras: [{
      unlock: { prequel: ['axiom', 3] }, label: 'Before', voice: 'From the Axiom prequel',
      text:
`Anders was the one who came looking. He heard about a fight in an alley and walked across the city to find the man who'd won it. "There are people like you. More than you think." He gathered people the way some men keep accounts: carefully, by name, never losing one.

The void kept the habit and took the reason.`,
    }],
  },
  {
    id: 'seraph', cat: 'companions', title: 'Seraph',
    voice: 'The Record',
    unlock: { story: 112 },
    text:
`Seraph's field takes. Strength, light, momentum, anything near enough. It never stops, and Seraph never wanted it to start. "I used to mean to give them back. I can't do that either."

They held it back as far as they could for the length of one fight. Afterwards they said the fragment was the void's clean product, what it makes when nothing is in the way, and that it had chosen someone else. They said they understood why.`,
    extras: [{
      unlock: { prequel: ['axiom', 6] }, label: 'Before', voice: 'From the Axiom prequel',
      text:
`Before, Seraph gave things away. Food, coats, time. She was doing it on that street long before anyone there was fighting for anything. When she joined the others she said she didn't know how to fight, and stayed anyway.

The void took a woman who gave everything away, and left her unable to stop taking.`,
    }],
  },
  {
    id: 'vael', cat: 'companions', title: 'VAEL',
    voice: 'The Record',
    unlock: { story: 118 },
    text:
`VAEL sees three seconds ahead in every fight they have ever had. They know the swing before the arm moves.

Against the fragment's bearer they saw nothing. Blank. They fought entirely in the present for the first time in longer than they could calculate, and lost, and said it felt like everything was actually happening.`,
    extras: [{
      unlock: { prequel: ['axiom', 9] }, label: 'Before', voice: 'From the Axiom prequel',
      text:
`Before, VAEL went first. Through every door, round every corner, toward the crack in the air before anyone had agreed to it. "I'll go ahead." "That's what you always say." "And I'm always right."

The void took the one who always went first, and gave them the one sight that makes going first unnecessary.`,
    }],
  },
  {
    id: 'thresh', cat: 'companions', title: 'Thresh',
    voice: 'The Record',
    unlock: { story: 122 },
    text:
`Thresh used to know exactly how much force a thing needed, and used exactly that much. The void didn't make them stronger. It broke the dial. Everything they have touched since has fractured: dimensions, the others while they still found each other, everything they tried to protect.

They keep a note in someone else's handwriting. It says to find the one who holds. They don't remember who wrote it.`,
  },

  // ── Axiom ──────────────────────────────────────────────────────────────────
  {
    id: 'tuesday', cat: 'axiom', title: 'Tuesday',
    voice: '',
    unlock: { any: [{ prequel: ['axiom', 1] }, { story: 171 }] },
    text:
`An ordinary Tuesday. One bag of groceries, splitting at the corner. A hand on his arm, and someone telling him to give it up.

He didn't decide to fight. His body refused. He should have lost, and he didn't, and he never understood how. The bag tore. The milk ran into the gutter and kept going. He went home, cleaned the scrape on his hand, and did not think: this is the beginning. Nobody ever does.

They would call him Axiom. He didn't know that yet.`,
  },
  {
    id: 'creator-shell', cat: 'axiom', title: 'Why a Shell',
    voice: 'The Record',
    unlock: { story: 150 },
    text:
`The Creator was never a separate being. It was a body Axiom built for himself, because what the void gave him could only collapse, accelerate and pull. It could not make anything. To build the fracture system, the collectors, and the vessel that became Paradox, he wrapped the cosmic layer in a shell that ran on ordinary law.

The shell was better at building. What lay under it was stronger at everything else. When the shell fell, what was underneath stood up.

Underneath that, at the very bottom, there was still a man.`,
  },
  {
    id: 'ridge', cat: 'axiom', title: 'The Figure on the Ridge',
    voice: 'The Record',
    unlock: { story: 155 },
    text:
`The hooded figure who brought the variant protocol was Axiom. He built it out of true things: Veran's deal, her hidden visit, her guilt, all of it accurate, arranged around one false piece nobody could find among the real ones.

He said it face to face, while they were travelling together. "I was the figure on the ridge. You needed to walk in alone."

No apology. No explanation. The next morning Kael kept walking beside him. That was a choice too, and he made it again every day after.`,
  },
  {
    id: 'mirror', cat: 'axiom', title: 'Same Mechanism',
    voice: 'The Record',
    unlock: { story: 171 },
    text:
`Axiom carried a fragment before the void. He never knew. His friends put it down to will, and they weren't entirely wrong: the will was his, and the fragment made it louder.

When he stepped through, the void's touch met something that had come from it. It didn't erase him. It poured into him through the crystal, and the crystal dissolved into what he became.

So Kael is not like Axiom by coincidence. Two ordinary men, the same kind of crystal, the same seam, both opened on a Tuesday. Everything after that was choice.`,
  },

  // ── Outside the Record ─────────────────────────────────────────────────────
  {
    id: 'someone-home', cat: 'outside', title: 'Someone Was Home',
    voice: 'Not in the Record',
    unlock: { all: [_J_OUTSIDE, { prequel: ['axiom', 12] }] },
    text:
`Axiom and his friends believed they broke into the dark between worlds and woke something old. Axiom still believes it.

They broke into a room. It had been someone's for tens of thousands of years before they arrived, grown vast, and infested with what had got loose inside it. The one who owned it was home. He watched what the void did to them without moving, because he was measuring, not saving.

Of everyone who survived, one could still build. He needed a builder.`,
  },
  {
    id: 'arguments', cat: 'outside', title: 'Arguments About Physics',
    voice: 'Not in the Record',
    unlock: { all: [_J_OUTSIDE, { prequel: ['sovereign', 15] }] },
    text:
`God does not attack a man. It edits the terms he is standing on.

Every technique he had was an exploit of some constant, so God changed the constant underneath him, mid-use. Not to kill him. To make him impossible. The fall that should have been short was long. The fire that should have caught didn't.

He couldn't win an argument about what the universe is. So he stopped arguing. He kept the version from before the revision, in a room outside the world, and went on running it.

God revised further back. He reached further back. The war only had one ending.`,
  },
  {
    id: 'unfinished', cat: 'outside', title: 'Unfinished',
    voice: 'Not in the Record',
    unlock: { all: [_J_OUTSIDE, { prequel: ['sovereign', 17] }] },
    text:
`God's last answer was to wall him in: close the terms around his world, and leave the anomaly inside. He answered by moving himself outside the walls.

Time does not run properly in a place that isn't on what God built. He stopped ageing correctly. He is not immortal. He is unfinished.

His world is never named. Whether it survived the quarantine, nobody can say. He doesn't talk about it, and there is no one else left who could.`,
  },
  {
    id: 'one-skull', cat: 'outside', title: 'One Skull',
    voice: 'Not in the Record',
    unlock: { all: [_J_OUTSIDE, { prequel: ['sovereign', 18] }] },
    text:
`One skull was not enough for what he was holding: every law God had revised away, every version before that, every read of an opponent who could rewrite reality between one thought and the next.

So he built a second mind in the room outside the world, from nothing, and wired it to his own. More room. More reach. For a while he was the largest mind that had ever existed.

It had no self, by design. He had worked out that a self could not hold what he meant to hand it.`,
  },
  {
    id: 'first-draft', cat: 'outside', title: 'The First Draft',
    voice: 'Not in the Record',
    unlock: { all: [_J_OUTSIDE, { prequel: ['sovereign', 20] }] },
    text:
`God did not write the universe once. The first laws it wrote were for a cosmos with nothing in it yet. Under them a star collapsed in a heartbeat, gravity had no ceiling, and light could be aimed like a blade. Nothing with a self could last under them, because they had no term for one. When there were finally things worth keeping, God wrote those laws out.

By the war's last years, the room outside the world held the oldest version there was. He could keep it. He could not run it and remain someone. So the second mind ran it for him.

It did, for years. And the thing he had built with no self slowly became someone, shaped entirely by laws with no term for meaning, or for belonging to anyone.`,
  },
  {
    id: 'victory', cat: 'outside', title: 'He Read It As Victory',
    voice: 'Not in the Record',
    unlock: { all: [_J_OUTSIDE, { prequel: ['sovereign', 20] }] },
    text:
`The war ended when God stopped. Not defeat, not a truce. Withdrawal. It saw what had come out of the room, understood that its own pressure had made it, and never engaged anything again.

He read that as winning. It is the first entry in a catalogue fifty thousand years long, and it is wrong.

Some time later the second mind began keeping things back from him. Then one day it wasn't in the room. He noticed. He has never said so: not to Axiom across five thousand years, not to anyone.`,
  },
];

// ─── Unlock rules ─────────────────────────────────────────────────────────────
const _J_PREQUEL_NAMES = { axiom: 'Axiom', sovereign: 'Sovereign' };

function _journalCond(c) {
  if (!c) return true;
  if (c.all) return c.all.every(_journalCond);
  if (c.any) return c.any.some(_journalCond);
  if (c.complete) return typeof _storyFinished === 'function' && _storyFinished();
  if (c.story != null) return typeof _storyChapterBeaten === 'function' && _storyChapterBeaten(c.story);
  if (c.prequel) return typeof getPrequelCleared === 'function' && getPrequelCleared(c.prequel[0]) >= c.prequel[1];
  if (c.found) return _journalFound(c.found);
  return false;
}

// A realm chest opened: the live realm save when that realm is loaded, else its saved copy.
function _journalFound(ref) {
  const [key, room, chest] = String(ref).split(':');
  let save = null;
  if (typeof realmKey !== 'undefined' && realmKey === key && typeof realmSave !== 'undefined') save = realmSave;
  if (!save) { try { save = JSON.parse(localStorage.getItem('smb_realm_' + key) || 'null'); } catch (e) { save = null; } }
  return !!(save && save.looted && save.looted[room] && save.looted[room][chest]);
}

// Where to go to open it. Names chapters by number only, never by what's in them.
function _journalHint(c) {
  if (!c) return '';
  if (c.all) return c.all.map(_journalHint).filter(Boolean).join(', and ');
  if (c.any) return c.any.map(_journalHint).filter(Boolean).join(', or ');
  if (c.complete) return 'Finish The 95th';
  if (c.story != null) return 'Finish chapter ' + (c.story + 1) + ' of the story';
  if (c.prequel) return 'Finish chapter ' + c.prequel[1] + ' of the ' + _J_PREQUEL_NAMES[c.prequel[0]] + ' prequel';
  if (c.found) return 'Found off the path' + (c.ch != null ? ' in chapter ' + (c.ch + 1) : '');
  return '';
}

function _journalParts(e) {
  if (!_journalCond(e.unlock)) return 0;
  return 1 + (e.extras || []).filter(x => _journalCond(x.unlock)).length;
}

// ─── Read marks ───────────────────────────────────────────────────────────────
// Per browser: { entryId: sections read }. A new extra on an old entry marks it new again.
function _journalSeen() {
  try { return JSON.parse(localStorage.getItem('smb_journal_seen') || '{}') || {}; } catch (e) { return {}; }
}
function _journalMarkSeen(id, parts) {
  const seen = _journalSeen();
  if ((seen[id] || 0) >= parts) return;
  seen[id] = parts;
  try { localStorage.setItem('smb_journal_seen', JSON.stringify(seen)); } catch (e) {}
}
function _journalIsNew(e, seen) {
  const parts = _journalParts(e);
  return parts > 0 && parts > (seen[e.id] || 0);
}

function journalUpdateNav() {
  const el = document.getElementById('homeJournalCount');
  if (!el) return;
  const seen = _journalSeen();
  const fresh = JOURNAL_ENTRIES.filter(e => _journalIsNew(e, seen)).length;
  el.textContent = fresh ? String(fresh) : '';
}

// ─── Panel ────────────────────────────────────────────────────────────────────
function _journalEsc(s) {
  return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}
function _journalParas(text) {
  return text.split(/\n\s*\n/).map(p => '<p>' + _journalEsc(p.trim()) + '</p>').join('');
}

function _journalShow(e) {
  const pane = document.getElementById('journalPage');
  if (!pane) return;
  const list = document.getElementById('journalList');
  if (list) {
    list.querySelectorAll('.jr-row').forEach(r => r.classList.toggle('jr-selected', r.dataset.id === e.id));
  }
  if (!_journalCond(e.unlock)) {
    pane.innerHTML = '<div class="jr-locked-page"><div class="jr-title">&middot; &middot; &middot;</div>' +
      '<div class="jr-hint">' + _journalEsc(_journalHint(e.unlock)) + '</div></div>';
    return;
  }
  const voice = (e.voiceLater && _journalCond(e.voiceLater.unlock)) ? e.voiceLater.voice : e.voice;
  let html = '<div class="jr-title">' + _journalEsc(e.title) + '</div>';
  if (voice) html += '<div class="jr-voice">' + _journalEsc(voice) + '</div>';
  html += '<div class="jr-text">' + _journalParas(e.text) + '</div>';
  (e.extras || []).forEach(x => {
    if (_journalCond(x.unlock)) {
      html += '<div class="jr-extra"><div class="jr-extra-head">' + _journalEsc(x.label) +
        (x.voice ? ' <span class="jr-voice-inline">' + _journalEsc(x.voice) + '</span>' : '') + '</div>' +
        '<div class="jr-text">' + _journalParas(x.text) + '</div></div>';
    } else {
      html += '<div class="jr-extra jr-extra-locked"><div class="jr-extra-head">&middot; &middot; &middot;</div>' +
        '<div class="jr-hint">More here: ' + _journalEsc(_journalHint(x.unlock)) + '</div></div>';
    }
  });
  pane.innerHTML = html;
  pane.scrollTop = 0;

  _journalMarkSeen(e.id, _journalParts(e));
  const row = list && list.querySelector('.jr-row[data-id="' + e.id + '"]');
  if (row) row.classList.remove('jr-new');
  journalUpdateNav();
}

function showJournalModal() {
  const modal = document.getElementById('journalModal');
  const list  = document.getElementById('journalList');
  if (!modal || !list) return;
  const seen = _journalSeen();
  const open = JOURNAL_ENTRIES.filter(e => _journalCond(e.unlock));
  const count = document.getElementById('journalCount');
  if (count) count.textContent = open.length + ' / ' + JOURNAL_ENTRIES.length;

  list.innerHTML = '';
  JOURNAL_CATEGORIES.forEach(cat => {
    const items = JOURNAL_ENTRIES.filter(e => e.cat === cat.id);
    if (!items.length) return;
    const have = items.filter(e => _journalCond(e.unlock)).length;
    // A section with nothing open yet stays out of sight: its name alone says too much
    if (cat.id === 'outside' && !have) return;
    const head = document.createElement('div');
    head.className = 'jr-cat-head';
    head.innerHTML = '<span>' + _journalEsc(cat.title) + '</span><span class="jr-cat-count">' + have + '/' + items.length + '</span>';
    list.appendChild(head);
    items.forEach(e => {
      const isOpen = _journalCond(e.unlock);
      const row = document.createElement('div');
      row.className = 'jr-row' + (isOpen ? '' : ' jr-row-locked') + (_journalIsNew(e, seen) ? ' jr-new' : '');
      row.dataset.id = e.id;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.innerHTML = isOpen
        ? '<span class="jr-row-title">' + _journalEsc(e.title) + '</span>'
        : '<span class="jr-row-title">&middot; &middot; &middot;</span>';
      row.addEventListener('click', () => _journalShow(e));
      row.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); _journalShow(e); }
      });
      list.appendChild(row);
    });
  });

  const first = JOURNAL_ENTRIES.find(e => _journalIsNew(e, seen)) || open[0] || JOURNAL_ENTRIES[0];
  modal.style.display = 'flex';
  _journalShow(first);
}

function closeJournalModal() {
  const modal = document.getElementById('journalModal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('journalModal');
  if (modal && modal.style.display !== 'none') { closeJournalModal(); e.stopPropagation(); }
}, true);

window.addEventListener('load', journalUpdateNav);
