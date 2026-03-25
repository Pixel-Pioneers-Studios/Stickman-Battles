'use strict';

// ============================================================
// MAP ANALYZER
// ============================================================
// Stateless utility — analyzeMap(arena) returns a report
// object describing the arena's structure and quality.
// arena: one entry from ARENAS (smb-data.js).
// ============================================================

function analyzeMap(arena) {
  const result = {
    name:          arena.name || 'Unknown',
    platformCount: arena.platforms ? arena.platforms.length : 0,
    hasLava:       !!arena.hasLava,
    size:          arena.worldWidth ? 'Large' : 'Standard',
    issues:        [],
    strengths:     [],
  };

  // Platform density
  if (result.platformCount < 3) {
    result.issues.push('Too few platforms');
  } else if (result.platformCount > 12) {
    result.issues.push('Too many platforms (cluttered)');
  } else {
    result.strengths.push('Balanced platform count');
  }

  // Hazard evaluation
  if (arena.hasLava) {
    result.strengths.push('Hazard adds pressure');
  }

  // Size check
  if (arena.worldWidth && arena.worldWidth > 2000) {
    result.issues.push('May cause camera issues');
  }

  // Dominant high-ground platform
  if (arena.platforms && arena.platforms.length > 0) {
    const highest = arena.platforms.reduce((a, b) => (a.y < b.y ? a : b));
    if (highest && highest.y < 150) {
      result.issues.push('Dominant high-ground platform');
    }
  }

  // Spawn fairness
  if (arena.platforms && arena.platforms.length >= 2) {
    const p1 = arena.platforms[0];
    const p2 = arena.platforms[arena.platforms.length - 1];
    if (Math.abs(p1.x - p2.x) < 200) {
      result.issues.push('Spawn areas may be too close');
    }
  }

  // Mobility evaluation
  if (arena.platforms && arena.platforms.length > 8) {
    result.strengths.push('High mobility options');
  }

  // Verticality
  const yValues = arena.platforms ? arena.platforms.map(p => p.y) : [];
  if (yValues.length) {
    const spread = Math.max(...yValues) - Math.min(...yValues);
    if (spread > 300) {
      result.strengths.push('Strong vertical gameplay');
    }
  }

  return result;
}

function scoreMap(result) {
  let score = 100;

  // Issues hurt more; strengths matter less
  score -= result.issues.length * 15;
  score += result.strengths.length * 3;

  // Hard penalties for critical issues
  if (result.issues.includes('Too many platforms (cluttered)'))   score -= 15;
  if (result.issues.includes('May cause camera issues'))          score -= 15;
  if (result.issues.includes('Spawn areas may be too close'))     score -= 10;
  if (result.issues.includes('Dominant high-ground platform'))    score -= 10;

  score = Math.max(0, Math.min(100, score));

  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'F';
}

function formatMapAnalysis(result) {
  return `
=== MAP: ${result.name} (${result.key || 'unknown'}) ===
Size: ${result.size}
Platforms: ${result.platformCount}
Grade: ${scoreMap(result)}

Strengths:
${result.strengths.length ? result.strengths.map(s => '- ' + s).join('\n') : '- None'}

Issues:
${result.issues.length ? result.issues.map(i => '- ' + i).join('\n') : '- None'}
`;
}

function analyzeAllMaps() {
  return Object.entries(ARENAS).map(([key, arena]) => {
    return { key, ...analyzeMap(arena) };
  });
}
