'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { quizCompleted } from '@/store/actions/progressActions';
import RetroTile from '@/components/game/RetroTile';
import { getTileById } from '@/models/Tile';

/* ─────────────────────────────────────────
   Question data
   ───────────────────────────────────────── */

type PromptType = 'description-to-name' | 'image-to-name' | 'name-to-image';

interface TileQuestionBase {
  promptType: PromptType;
  /**
   * For description-to-name: the description text.
   * For image-to-name: a simple tile id (e.g. 'dot-5') — rendered as RetroTile.
   * For name-to-image: the tile's English name (e.g. '5 Dot').
   */
  prompt: string;
  /**
   * For description-to-name and image-to-name: the four English-name choices.
   * For name-to-image: four simple tile ids — rendered as RetroTile buttons.
   */
  options: string[];
  /** The correct option (English name or tile id, matching the `options` shape). */
  answer: string;
  explanation: string;
}

type TileQuestion = TileQuestionBase;

const PROMPT_HEADERS: Record<PromptType, string> = {
  'description-to-name': 'IDENTIFY THIS TILE',
  'image-to-name': 'WHAT IS THIS TILE?',
  'name-to-image': 'PICK THE MATCHING TILE',
};

const TILE_QUESTIONS: TileQuestion[] = [
  // Description-to-name — original 20 questions, now tagged.
  { promptType: 'description-to-name', prompt: 'A tile showing 5 circles arranged in an X pattern.', options: ['5 Bamboo', '5 Dot', '5 Character', 'White Dragon'], answer: '5 Dot', explanation: 'Dots, also called circles, are identified by circular pips. Five Dot is usually arranged like the five side of a die.' },
  { promptType: 'description-to-name', prompt: 'A tile with a bird on it (not a number).', options: ['1 Bamboo', '1 Dot', 'Green Dragon', 'Flower'], answer: '1 Bamboo', explanation: 'The 1 Bamboo tile is commonly drawn as a bird instead of a single bamboo stick.' },
  { promptType: 'description-to-name', prompt: 'A tile showing the character 中 in red.', options: ['Red Dragon', 'Green Dragon', 'East Wind', 'South Wind'], answer: 'Red Dragon', explanation: 'Red Dragon uses the red Chinese character 中. Dragon pungs are valuable scoring elements.' },
  { promptType: 'description-to-name', prompt: 'A blank or plain-framed tile.', options: ['White Dragon', 'Flower', 'Season', 'Joker'], answer: 'White Dragon', explanation: 'White Dragon is often blank or shown with a simple border, depending on the tile set.' },
  { promptType: 'description-to-name', prompt: 'A tile with three horizontal lines above 萬.', options: ['3 Character', '3 Dot', '3 Bamboo', 'West Wind'], answer: '3 Character', explanation: 'Character tiles show Chinese numerals above 萬. 三 means three.' },
  { promptType: 'description-to-name', prompt: 'A tile showing the character 東.', options: ['East Wind', 'South Wind', 'West Wind', 'North Wind'], answer: 'East Wind', explanation: '東 is East. Wind tiles are honor tiles and can form pungs or your winning pair.' },
  { promptType: 'description-to-name', prompt: 'A tile showing the character 發 in green.', options: ['Green Dragon', 'Red Dragon', 'White Dragon', 'Spring Season'], answer: 'Green Dragon', explanation: 'Green Dragon is marked with 發 and is one of the three dragon tiles.' },
  { promptType: 'description-to-name', prompt: 'A tile with 9 circles in a 3x3 grid.', options: ['9 Dot', '9 Bamboo', '9 Character', 'North Wind'], answer: '9 Dot', explanation: 'Dots are circular pips. Nine Dot is usually shown as a full 3x3 block.' },
  { promptType: 'description-to-name', prompt: 'A tile with two bamboo sticks.', options: ['2 Bamboo', '2 Dot', '2 Character', 'Pair tile'], answer: '2 Bamboo', explanation: 'Bamboo tiles are counted by sticks, except 1 Bamboo, which is usually a bird.' },
  { promptType: 'description-to-name', prompt: 'A tile showing the character 北.', options: ['North Wind', 'South Wind', 'East Wind', 'West Wind'], answer: 'North Wind', explanation: '北 is North. Winds are honor tiles, not suited number tiles.' },
  { promptType: 'description-to-name', prompt: 'A tile showing the character 南.', options: ['South Wind', 'North Wind', 'East Wind', 'West Wind'], answer: 'South Wind', explanation: '南 is South. A pung of your seat wind can score fan.' },
  { promptType: 'description-to-name', prompt: 'A tile showing the character 西.', options: ['West Wind', 'East Wind', 'South Wind', 'North Wind'], answer: 'West Wind', explanation: '西 is West. It belongs to the four wind honor tiles.' },
  { promptType: 'description-to-name', prompt: 'A tile showing one horizontal line above 萬.', options: ['1 Character', '1 Dot', '1 Bamboo', 'East Wind'], answer: '1 Character', explanation: '一 means one, and 萬 identifies the character suit.' },
  { promptType: 'description-to-name', prompt: 'A tile depicting a plum blossom.', options: ['Plum Flower', 'Orchid Flower', 'Spring Season', 'Red Dragon'], answer: 'Plum Flower', explanation: 'Plum is one of the four flower bonus tiles. Bonus tiles are set aside when drawn.' },
  { promptType: 'description-to-name', prompt: 'A tile showing 7 bamboo sticks.', options: ['7 Bamboo', '7 Dot', '7 Character', 'White Dragon'], answer: '7 Bamboo', explanation: 'Bamboo tiles use stick counts. Seven Bamboo shows seven sticks.' },
  { promptType: 'description-to-name', prompt: 'A tile that is one of only 8 unique tiles in the entire set.', options: ['Bonus tile (Flower/Season)', 'Dragon tile', 'Wind tile', 'Suit tile'], answer: 'Bonus tile (Flower/Season)', explanation: 'Flowers and seasons are bonus tiles with only one copy each. Normal suit and honor tiles have four copies.' },
  { promptType: 'description-to-name', prompt: 'A tile showing 4 circles in a square pattern.', options: ['4 Dot', '4 Bamboo', '4 Character', 'West Wind'], answer: '4 Dot', explanation: 'Circle pips identify the dot suit. Four Dot usually appears as a square of four pips.' },
  { promptType: 'description-to-name', prompt: 'A tile with one large ornate circle.', options: ['1 Dot', '1 Bamboo', '1 Character', 'White Dragon'], answer: '1 Dot', explanation: 'One Dot is typically one large decorated circle.' },
  { promptType: 'description-to-name', prompt: 'A tile showing the character 八 above 萬.', options: ['8 Character', '8 Dot', '8 Bamboo', 'North Wind'], answer: '8 Character', explanation: '八 means eight, and 萬 marks the character suit.' },
  { promptType: 'description-to-name', prompt: 'A tile depicting the Summer season.', options: ['Summer Season', 'Spring Season', 'Autumn Season', 'Orchid Flower'], answer: 'Summer Season', explanation: 'Summer is one of the four season bonus tiles, separate from suited and honor tiles.' },

  // Name-to-image — player picks the matching tile from four tile previews.
  { promptType: 'name-to-image', prompt: '5 Dot', options: ['dot-5', 'dot-6', 'bamboo-5', 'character-5'], answer: 'dot-5', explanation: 'Five Dot shows five circular pips, usually arranged like the five face of a die.' },
  { promptType: 'name-to-image', prompt: '3 Bamboo', options: ['bamboo-3', 'bamboo-4', 'bamboo-2', 'dot-3'], answer: 'bamboo-3', explanation: 'Bamboo tiles count by sticks, so 3 Bamboo shows three stick shapes on the tile.' },
  { promptType: 'name-to-image', prompt: 'East Wind', options: ['wind-east', 'wind-south', 'wind-west', 'wind-north'], answer: 'wind-east', explanation: 'East (東) is always the dealer and first player, making it the most important wind tile.' },
  { promptType: 'name-to-image', prompt: 'Green Dragon', options: ['dragon-green', 'dragon-red', 'dragon-white', 'wind-south'], answer: 'dragon-green', explanation: 'Green Dragon shows the character 發 (prosperity) and is one of the three dragon honor tiles.' },
  { promptType: 'name-to-image', prompt: 'Spring Season', options: ['season-1', 'season-2', 'season-3', 'flower-1'], answer: 'season-1', explanation: 'Spring is the first of the four season bonus tiles, set aside for free points when drawn.' },

  // Image-to-name — player sees the tile and picks its English name.
  { promptType: 'image-to-name', prompt: 'character-7', options: ['7 Character', '7 Bamboo', '7 Dot', 'West Wind'], answer: '7 Character', explanation: 'Character tiles show a Chinese numeral above 萬, and 七 means seven.' },
  { promptType: 'image-to-name', prompt: 'bamboo-1', options: ['1 Bamboo', '1 Dot', '1 Character', 'Green Dragon'], answer: '1 Bamboo', explanation: '1 Bamboo is drawn as a bird — the only suit tile that does not show its number directly.' },
  { promptType: 'image-to-name', prompt: 'wind-west', options: ['West Wind', 'East Wind', 'South Wind', 'North Wind'], answer: 'West Wind', explanation: 'The character 西 means West, one of the four wind tiles used as honor pieces.' },
  { promptType: 'image-to-name', prompt: 'dragon-white', options: ['White Dragon', 'Red Dragon', 'Green Dragon', 'Bonus tile'], answer: 'White Dragon', explanation: 'White Dragon is often blank or shows just a frame — it is a real tile, not a missing one.' },
  { promptType: 'image-to-name', prompt: 'flower-1', options: ['Plum Flower', 'Orchid Flower', 'Chrysanthemum Flower', 'Spring Season'], answer: 'Plum Flower', explanation: 'Plum is the first of the four flower bonus tiles, each appearing only once in the set.' },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build a 10-question round that always includes at least one question of
 * each prompt type, then fills the rest randomly. Keeps every round
 * bidirectional rather than risking 10-of-one-type by chance.
 */
function buildRound(all: TileQuestion[], size: number): TileQuestion[] {
  const byType: Record<PromptType, TileQuestion[]> = {
    'description-to-name': [],
    'image-to-name': [],
    'name-to-image': [],
  };
  for (const q of all) byType[q.promptType].push(q);
  for (const k of Object.keys(byType) as PromptType[]) byType[k] = shuffle(byType[k]);

  const seeds: TileQuestion[] = [];
  for (const k of ['description-to-name', 'image-to-name', 'name-to-image'] as PromptType[]) {
    if (byType[k].length > 0) seeds.push(byType[k].shift()!);
  }
  const remaining = shuffle(Object.values(byType).flat()).slice(0, Math.max(0, size - seeds.length));
  return shuffle([...seeds, ...remaining]);
}

/* ─────────────────────────────────────────
   Component
   ───────────────────────────────────────── */

const QUESTIONS_PER_ROUND = 10;
const LS_KEY = '16bit-mahjong-practice';

export default function TileQuiz({ onBack }: { onBack: () => void }) {
  const questions = useMemo(() => buildRound(TILE_QUESTIONS, QUESTIONS_PER_ROUND), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const whyRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();

  const current = questions[index];

  useEffect(() => {
    if (selected !== null) {
      whyRef.current?.focus();
    }
  }, [selected]);

  const handleSelect = useCallback((answer: string) => {
    if (selected) return;
    setSelected(answer);
    if (answer === current.answer) {
      setScore(s => s + 1);
    }
  }, [selected, current]);

  const handleNext = useCallback(() => {
    if (index + 1 >= QUESTIONS_PER_ROUND) {
      try {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!stored['tile-quiz'] || score > stored['tile-quiz']) {
          stored['tile-quiz'] = score;
          localStorage.setItem(LS_KEY, JSON.stringify(stored));
        }
      } catch { /* ignore */ }
      void dispatch(quizCompleted({ mode: 'tile-quiz', score }));
      setFinished(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
    }
  }, [index, score, dispatch]);

  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ds-card p-8 max-w-sm w-full text-center border-2 border-highlight rounded-xl">
          <p className="text-4xl mb-3">{score >= 8 ? '!!!' : score >= 5 ? '!' : '...'}</p>
          <p className="font-display text-sm text-highlight ds-text-glow mb-2">Quiz Complete</p>
          <p className="text-3xl font-sans text-foreground font-bold mb-1">
            {score}/{QUESTIONS_PER_ROUND}
          </p>
          <p className="text-sm font-sans text-muted-foreground mb-6">
            {score >= 9 ? 'Tile master!' : score >= 7 ? 'Great job!' : score >= 5 ? 'Not bad, keep practicing.' : 'Keep studying the tiles!'}
          </p>
          <div className="space-y-2">
            <button
              className="ds-btn-success w-full py-3 text-lg"
              onClick={() => { setIndex(0); setSelected(null); setScore(0); setFinished(false); }}
            >
              Try Again
            </button>
            <button
              className="ds-btn w-full py-3 text-lg bg-elevated"
              onClick={onBack}
            >
              Back to Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border/20 bg-elevated">
        <button onClick={onBack} className="mr-4 text-lg text-info font-sans">
          &#x2039; Back
        </button>
        <div className="flex-1">
          <p className="font-display text-xs text-highlight">TILE QUIZ</p>
        </div>
        <div className="bg-success px-3 py-1.5 rounded-full">
          <span className="text-black font-bold text-sm font-sans">{score}/{index + 1}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground font-sans">
            Question {index + 1} of {QUESTIONS_PER_ROUND}
          </span>
        </div>
        <div className="h-1.5 bg-elevated rounded-full">
          <div
            className="h-full bg-info rounded-full transition-all"
            style={{ width: `${((index + 1) / QUESTIONS_PER_ROUND) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 p-6">
        <div className="ds-card p-5 mb-6">
          <p
            className="font-display text-[10px] text-info tracking-wider mb-2"
            data-testid="prompt-header"
          >
            {PROMPT_HEADERS[current.promptType]}
          </p>
          {current.promptType === 'description-to-name' && (
            <p className="text-lg font-sans text-foreground leading-7">{current.prompt}</p>
          )}
          {current.promptType === 'name-to-image' && (
            <p className="text-2xl font-sans text-foreground font-bold leading-7">
              {current.prompt}
            </p>
          )}
          {current.promptType === 'image-to-name' && (
            <div className="flex justify-center py-2" data-testid="prompt-tile">
              <PromptTile id={current.prompt} />
            </div>
          )}
        </div>

        {/* Options */}
        {current.promptType === 'name-to-image' ? (
          <div className="grid grid-cols-2 gap-3">
            {current.options.map(option => {
              const isSelected = selected === option;
              const isCorrect = option === current.answer;
              const showResult = selected !== null;
              return (
                <button
                  key={option}
                  data-testid={`tile-option-${option}`}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors min-h-[120px]
                    ${!showResult ? 'bg-elevated border-border/30 hover:border-info/50' : ''}
                    ${showResult && isCorrect ? 'bg-success/10 border-success' : ''}
                    ${showResult && isSelected && !isCorrect ? 'bg-accent/10 border-accent' : ''}
                    ${showResult && !isCorrect && !isSelected ? 'bg-elevated border-border/20 opacity-60' : ''}
                  `}
                  onClick={() => handleSelect(option)}
                  disabled={selected !== null}
                  aria-label={`Tile option: ${option}`}
                >
                  <PromptTile id={option} size="lg" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {current.options.map(option => {
              const isSelected = selected === option;
              const isCorrect = option === current.answer;
              const showResult = selected !== null;

              return (
                <button
                  key={option}
                  data-testid={`tile-option-${option}`}
                  className={`w-full p-4 rounded-lg border-2 text-left font-sans text-lg transition-colors
                    ${!showResult ? 'bg-elevated border-border/30 text-foreground hover:border-info/50' : ''}
                    ${showResult && isCorrect ? 'bg-success/10 border-success text-foreground' : ''}
                    ${showResult && isSelected && !isCorrect ? 'bg-accent/10 border-accent text-foreground' : ''}
                    ${showResult && !isCorrect && !isSelected ? 'bg-elevated border-border/20 text-muted-foreground' : ''}
                  `}
                  onClick={() => handleSelect(option)}
                  disabled={selected !== null}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showResult && isCorrect && <span className="text-xl text-success font-bold">&#x2713;</span>}
                    {showResult && isSelected && !isCorrect && <span className="text-xl text-accent font-bold">&#x2717;</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selected !== null && (
          <div
            ref={whyRef}
            className="ds-card mt-4 p-4 border-info/40 bg-info/5"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={-1}
          >
            <p className="font-display text-[10px] text-info tracking-wider mb-2">WHY:</p>
            <p className="text-sm font-sans text-foreground leading-relaxed">
              <span className="text-highlight">
                Correct answer:{' '}
                {current.promptType === 'name-to-image'
                  ? getTileById(current.answer)?.nameEnglish ?? current.answer
                  : current.answer}
                .
              </span>{' '}
              {current.explanation}
            </p>
          </div>
        )}

        {/* Next */}
        {selected !== null && (
          <button
            className="ds-btn-success w-full mt-6 py-4 text-lg"
            onClick={handleNext}
          >
            {index + 1 >= QUESTIONS_PER_ROUND ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Render a tile by simple-id ("dot-5", "wind-east", ...). */
function PromptTile({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const tile = getTileById(id);
  if (!tile) {
    return <span className="font-sans text-xs text-muted-foreground">[unknown tile: {id}]</span>;
  }
  return <RetroTile tile={tile} size={size} />;
}
