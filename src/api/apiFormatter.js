export const getDifficultyNumber = (difficulty) => {
  if (difficulty === 'beginner') return 0;
  else if (difficulty === 'intermediate') return 1;
  else if (difficulty === 'advanced') return 2;

  return null;
};

export const getDifficultyName = (difficulty) => {
  if (difficulty === 0) return 'beginner';
  else if (difficulty === 1) return 'intermediate';
  else if (difficulty === 2) return 'advanced';

  return null;
};
