export const RANKS = [
  { name: "Hierro", minXP: 0, color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-300" },
  { name: "Bronce", minXP: 100, color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-500" },
  { name: "Plata", minXP: 300, color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-400" },
  { name: "Oro", minXP: 600, color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-400" },
  { name: "Platino", minXP: 1000, color: "text-teal-500", bg: "bg-teal-50", border: "border-teal-400" },
  { name: "Diamante", minXP: 1500, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-400" },
  { name: "Maestro", minXP: 2500, color: "text-fuchsia-600", bg: "bg-fuchsia-50", border: "border-fuchsia-500" }
];

export const BADGE_DEFS = {
  first_blood: { label: "Primer Paso", icon: "Flag", color: "text-blue-500", bg: "bg-blue-50", req: "Asistir a tu primera clase" },
  streak_3: { label: "Racha x3", icon: "Flame", color: "text-orange-500", bg: "bg-orange-50", req: "3 clases seguidas" },
  streak_5: { label: "Imparable x5", icon: "Flame", color: "text-red-500", bg: "bg-red-50", req: "5 clases seguidas" },
  perfect_score: { label: "Día Perfecto", icon: "Star", color: "text-yellow-500", bg: "bg-yellow-50", req: "Puntaje máximo en una clase" },
  perfectionist: { label: "Perfeccionista", icon: "Crown", color: "text-purple-500", bg: "bg-purple-50", req: "Puntaje máximo en 3 clases" },
  resilience: { label: "Mejora Continua", icon: "TrendingUp", color: "text-emerald-500", bg: "bg-emerald-50", req: "Mejorar un 20% respecto a la clase anterior" },
  phoenix: { label: "Ave Fénix", icon: "Heart", color: "text-rose-500", bg: "bg-rose-50", req: "Sobrevivir con menos de 20 HP" },
  resurrection: { label: "Resurrección", icon: "Sparkles", color: "text-cyan-500", bg: "bg-cyan-50", req: "De reprobar a sacar nota perfecta" },
};

/**
 * Calculates all gamification stats for a student based on their history.
 * @param {Array} sessions - Array of session objects (must contain criteria with max_score).
 * @param {Object|null} studentGradesDict - Dictionary mapping criteria_id to score. If null, expects `criteria.score` directly inside session.
 * @param {Object|null} studentAttendanceDict - Dictionary mapping session_id to boolean. If null, expects `session.attendance` directly.
 */
export function calculateGamification(sessions = [], studentGradesDict = null, studentAttendanceDict = null, spentCoins = 0) {
  let currentXP = 0;
  let streak = 0;
  let maxStreak = 0;
  let perfectSessions = 0;
  let attendedClasses = 0;
  
  let hp = 100;
  const MAX_HP = 100;

  let sessionScores = [];
  let totalEarnedCoins = 0;

  // Ensure sessions are sorted chronologically
  const sortedSessions = [...sessions].sort((a,b) => new Date(a.date) - new Date(b.date));

  sortedSessions.forEach(session => {
    let attended = false;
    let hpChange = 0;

    if (studentAttendanceDict) {
       attended = studentAttendanceDict[session.id] !== false; // assume true if undefined but recorded
    } else {
       attended = session.attendance !== false; 
    }

    if (attended) {
      currentXP += 20; // XP per attendance
      streak += 1;
      if (streak > maxStreak) maxStreak = streak;
      attendedClasses++;
    } else {
      streak = 0;
      hpChange -= 30; // Castigo por falta
    }

    let sessionTotal = 0;
    let sessionMax = 0;

    (session.criteria || []).forEach(crit => {
      let score = 0;
      if (studentGradesDict) {
        score = studentGradesDict[crit.id] != null ? Number(studentGradesDict[crit.id]) : 0;
      } else {
        score = crit.score != null ? Number(crit.score) : 0;
      }
      
      sessionTotal += score;
      sessionMax += (crit.max_score || 0);

      currentXP += Math.floor(score * 15); // Add XP per grade point
    });

    if (sessionMax > 0 && sessionTotal === sessionMax) {
      perfectSessions++;
      currentXP += 50; // Bonus for perfect session
    }
    
    const pct = sessionMax > 0 ? sessionTotal/sessionMax : 0;
    
    // Calcular curación y castigos por notas solo si asistió
    if (attended && sessionMax > 0) {
       if (pct < 0.4) {
          hpChange -= 10;
       } else if (pct >= 0.7) {
          hpChange += 15;
       }
    }

    // Aplicar HP
    hp += hpChange;
    if (hp > MAX_HP) hp = MAX_HP;
    
    let died = false;
    if (hp <= 0) {
       hp = 100; // Reset
       currentXP -= 150; // Penalización severa
       if (currentXP < 0) currentXP = 0;
       died = true;
    }

    sessionScores.push({ id: session.id, total: sessionTotal, max: sessionMax, pct, hpChange, died });
  });

  const XP_PER_LEVEL = 150;
  const currentLevel = Math.floor(currentXP / XP_PER_LEVEL) + 1;
  const currentLevelXP = currentXP % XP_PER_LEVEL;
  const nextLevelXP = XP_PER_LEVEL;
  
  // RANK LOGIC (Relative if targetXP provided, otherwise absolute)
  let rank;
  if (arguments[4] && arguments[4] > 0) {
     const target = Math.max(arguments[4], 2500); // Benchmark: at least 2500 XP
     const pct = currentXP / target;
     
     // 0-15: Hierro, 15-30: Bronce, 30-45: Plata, 45-60: Oro, 60-75: Platino, 75-90: Diamante, 90-100: Maestro
     if (pct >= 0.90) rank = RANKS[6]; // Maestro
     else if (pct >= 0.75) rank = RANKS[5]; // Diamante
     else if (pct >= 0.60) rank = RANKS[4]; // Platino
     else if (pct >= 0.45) rank = RANKS[3]; // Oro
     else if (pct >= 0.30) rank = RANKS[2]; // Plata
     else if (pct >= 0.15) rank = RANKS[1]; // Bronce
     else rank = RANKS[0]; // Hierro
  } else {
     rank = RANKS.slice().reverse().find(r => currentXP >= r.minXP) || RANKS[0];
  }

  const badges = {
    first_blood: attendedClasses >= 1,
    perfect_score: perfectSessions >= 1,
    streak_3: maxStreak >= 3,
    streak_5: maxStreak >= 5,
    perfectionist: perfectSessions >= 3,
    resilience: false,
    phoenix: false,
    resurrection: false
  };

  // Check resilience and hidden badges
  if (sessionScores.length >= 1) {
     const lowestHp = sessionScores.reduce((min, s) => {
          return Math.min(min, hp);
     }, hp);
     
     if (lowestHp > 0 && lowestHp <= 20) {
         badges.phoenix = true;
     }
  }

  if (sessionScores.length >= 2) {
     for (let i = 1; i < sessionScores.length; i++) {
        const prev = sessionScores[i-1].pct;
        const curr = sessionScores[i].pct;
        if (curr >= prev + 0.20 && curr >= 0.5) {
            badges.resilience = true;
        }
        if (prev < 0.4 && curr === 1) {
            badges.resurrection = true;
        }
     }
  }

  // Notyx Coins logic
  totalEarnedCoins = Math.floor(currentXP * 1.5); 
  const notyxCoins = Math.max(0, totalEarnedCoins - spentCoins);

  const unlockedBadges = Object.keys(BADGE_DEFS).map(key => ({
     id: key,
     ...BADGE_DEFS[key],
     unlocked: badges[key]
  }));

  return { 
      currentXP, 
      currentLevel, 
      currentLevelXP, 
      nextLevelXP, 
      rank, 
      streak, 
      maxStreak, 
      unlockedBadges,
      hp,
      MAX_HP,
      sessionScores,
      notyxCoins,
      totalEarnedCoins
  };
}

