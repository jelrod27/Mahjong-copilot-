// Format score display
export const formatScore = (score: number): string => {
  if (score >= 10000) {
    return `${(score / 10000).toFixed(1)}萬`;
  }
  return score.toString();
};

// Format time duration
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Calculate learning progress percentage
export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0.0;
  return Math.max(0.0, Math.min(1.0, completed / total));
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailRegex.test(email);
};

// Get tile category display name
export const getTileCategoryName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    bamboo: 'Bamboo (索子)',
    character: 'Characters (萬子)',
    dot: 'Dots (筒子)',
    wind: 'Winds (東南西北)',
    dragon: 'Dragons (中發白)',
    flower: 'Flowers',
    season: 'Seasons',
  };
  return categoryMap[category] || category;
};

