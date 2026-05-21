const KEY_STREAK = "pl_streak";
const KEY_LAST_ACTIVE = "pl_last_active";
const KEY_TOTAL_XP = "pl_total_xp";
const KEY_RESTORATION_USED = "pl_restoration_used";
const KEY_RESTORATION_DATE = "pl_restoration_date";

export interface StreakData {
  streak: number;
  lastActive: string;
  totalXP: number;
  dailyXP: number;
  canRestore: boolean;
  restorationUsedToday: boolean;
}

export const getTodayKey = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const calculateStreakXP = (streak: number): number => {
  const baseXP = 50;
  const xpPerLevel = 10;
  const maxXP = 200;
  return Math.min(baseXP + streak * xpPerLevel, maxXP);
};

export const getStreakData = (): StreakData => {
  try {
    const today = getTodayKey();
    const streak = parseInt(localStorage.getItem(KEY_STREAK) || "0", 10) || 0;
    const lastActive = localStorage.getItem(KEY_LAST_ACTIVE) || "";
    const totalXP = parseInt(localStorage.getItem(KEY_TOTAL_XP) || "0", 10) || 0;
    const restorationUsed = localStorage.getItem(KEY_RESTORATION_USED) === "true";
    const restorationDate = localStorage.getItem(KEY_RESTORATION_DATE) || "";

    // Check if restoration can be used (reset daily)
    const canRestore =
      !restorationUsed ||
      restorationDate !== today;

    const restorationUsedToday =
      restorationUsed && restorationDate === today;

    return {
      streak,
      lastActive,
      totalXP,
      dailyXP: calculateStreakXP(streak),
      canRestore,
      restorationUsedToday,
    };
  } catch (e) {
    return {
      streak: 0,
      lastActive: "",
      totalXP: 0,
      dailyXP: 50,
      canRestore: true,
      restorationUsedToday: false,
    };
  }
};

export const updateDailyStreak = (): { streak: number; xpEarned: number } => {
  try {
    const today = getTodayKey();
    const prevStreak = parseInt(localStorage.getItem(KEY_STREAK) || "0", 10) || 0;
    const lastActive = localStorage.getItem(KEY_LAST_ACTIVE) || "";
    const totalXP = parseInt(localStorage.getItem(KEY_TOTAL_XP) || "0", 10) || 0;

    let newStreak = prevStreak;
    let xpEarned = 0;

    if (lastActive === today) {
      // Same day, no change
      newStreak = prevStreak > 0 ? prevStreak : 1;
      xpEarned = 0;
    } else if (lastActive) {
      const lastDate = new Date(lastActive);
      const todayDate = new Date(today);
      const diffMs =
        todayDate.getTime() -
        lastDate.getTime();
      const diffDays = Math.round(
        diffMs / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        // Consecutive day
        newStreak = prevStreak + 1;
        xpEarned = calculateStreakXP(newStreak);
      } else {
        // Gap > 1 day, reset
        newStreak = 1;
        xpEarned = calculateStreakXP(newStreak);
      }
    } else {
      // First time
      newStreak = 1;
      xpEarned = calculateStreakXP(newStreak);
    }

    // Save to localStorage
    localStorage.setItem(KEY_STREAK, String(newStreak));
    localStorage.setItem(KEY_LAST_ACTIVE, today);
    localStorage.setItem(KEY_TOTAL_XP, String(totalXP + xpEarned));

    return { streak: newStreak, xpEarned };
  } catch (e) {
    return { streak: 0, xpEarned: 0 };
  }
};

export const restoreStreak = (): {
  success: boolean;
  message: string;
  newStreak?: number;
} => {
  try {
    const data = getStreakData();
    const today = getTodayKey();

    if (!data.canRestore) {
      return {
        success: false,
        message: "You already used restoration today. Try again tomorrow!",
      };
    }

    if (data.totalXP < 100) {
      return {
        success: false,
        message: `You need 100 XP to restore. You have ${data.totalXP} XP.`,
      };
    }

    // Deduct XP
    const newXP = data.totalXP - 100;
    localStorage.setItem(KEY_TOTAL_XP, String(newXP));

    // Restore streak (add 1 day back)
    const newStreak = data.streak + 1;
    localStorage.setItem(KEY_STREAK, String(newStreak));

    // Mark restoration as used
    localStorage.setItem(KEY_RESTORATION_USED, "true");
    localStorage.setItem(KEY_RESTORATION_DATE, today);

    return {
      success: true,
      message: `Streak restored! 🔥 New streak: ${newStreak} days`,
      newStreak,
    };
  } catch (e) {
    return {
      success: false,
      message: "Failed to restore streak",
    };
  }
};

export const getStreakMilestone = (
  streak: number
): {
  level: string;
  emoji: string;
  nextMilestone: number;
  progress: number;
  reward?: string;
} => {
  if (streak >= 365) {
    return {
      level: "Legendary",
      emoji: "🏆",
      nextMilestone: 730,
      progress: 100,
      reward: "Unlocked: Yearly Badge",
    };
  }
  if (streak >= 100) {
    return {
      level: "Master",
      emoji: "👑",
      nextMilestone: 365,
      progress: Math.floor((streak / 365) * 100),
      reward: "100 Bonus XP every 7 days",
    };
  }
  if (streak >= 30) {
    return {
      level: "Elite",
      emoji: "⭐",
      nextMilestone: 100,
      progress: Math.floor((streak / 100) * 100),
      reward: "50 Bonus XP on day 30",
    };
  }
  if (streak >= 7) {
    return {
      level: "Rising Star",
      emoji: "🌟",
      nextMilestone: 30,
      progress: Math.floor((streak / 30) * 100),
      reward: "Weekly achievement badge",
    };
  }
  return {
    level: "Beginner",
    emoji: "🌱",
    nextMilestone: 7,
    progress: Math.floor((streak / 7) * 100),
    reward: "First week milestone",
  };
};

export const getStreakAchievements = (streak: number): string[] => {
  const achievements = [];

  if (streak >= 1) achievements.push("First Step 🌱");
  if (streak >= 3) achievements.push("3-Day Learner 📚");
  if (streak >= 7) achievements.push("Weekly Champion 🌟");
  if (streak >= 14) achievements.push("Fortnite Hero 💪");
  if (streak >= 30) achievements.push("Monthly Master ⭐");
  if (streak >= 100) achievements.push("Century Scholar 👑");
  if (streak >= 365) achievements.push("Legendary Guardian 🏆");

  return achievements;
};

export const resetStreak = (): void => {
  localStorage.removeItem(KEY_STREAK);
  localStorage.removeItem(KEY_LAST_ACTIVE);
  localStorage.removeItem(KEY_TOTAL_XP);
  localStorage.removeItem(KEY_RESTORATION_USED);
  localStorage.removeItem(KEY_RESTORATION_DATE);
};
