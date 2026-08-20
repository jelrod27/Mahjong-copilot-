/**
 * Beginner assist: whether tiles print their rank as a numeral.
 *
 * The artwork carries no Arabic numerals, and the prototype that introduced it
 * called those a pedagogical feature rather than decoration: a learner reading
 * a bamboo tile counts sticks without them. So the numeral comes back as an
 * option, on by default for the difficulty most likely to need it.
 *
 * Tri-state rather than boolean, matching npcRosterMode. A boolean cannot
 * express "the player has not chosen", which is exactly what a difficulty
 * derived default plus a persistent override requires: 'auto' follows the
 * table, 'on' and 'off' are the player overruling it and stay overruled.
 */
export type BeginnerAssistSetting = 'auto' | 'on' | 'off';

export const BEGINNER_ASSIST_SETTINGS: readonly BeginnerAssistSetting[] = ['auto', 'on', 'off'];

export function isBeginnerAssistSetting(value: unknown): value is BeginnerAssistSetting {
  return value === 'auto' || value === 'on' || value === 'off';
}

/**
 * Does this table print numerals?
 *
 * Difficulty is a property of the match, not of settings, so this cannot live
 * in the reducer: the settings slice never sees which table is being played.
 * Keeping it a pure function means the rule is testable without a store or a
 * rendered board.
 */
export function resolveBeginnerAssist(
  setting: BeginnerAssistSetting,
  difficulty: 'easy' | 'medium' | 'hard',
): boolean {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return difficulty === 'easy';
}
