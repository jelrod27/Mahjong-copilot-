'use client';

import { useState, useCallback, useMemo } from 'react';

/* ─────────────────────────────────────────
   Question data
   ───────────────────────────────────────── */

interface TileQuestion {
  question: string;
  options: string[];
  answer: string;
}

const TILE_QUESTIONS: TileQuestion[] = [
  { question: 'A tile showing 5 circles arranged in an X pattern.', options: ['5 Bamboo', '5 Dot', '5 Character', 'White Dragon'], answer: '5 Dot' },
  { question: 'A tile with a bird on it (not a number).', options: ['1 Bamboo', '1 Dot', 'Green Dragon', 'Flower'], answer: '1 Bamboo' },
  { question: 'A tile showing the character 中 in red.', options: ['Red Dragon', 'Green Dragon', 'East Wind', 'South Wind'], answer: 'Red Dragon' },
  { question: 'A blank or plain-framed tile.', options: ['White Dragon', 'Flower', 'Season', 'Joker'], answer: 'White Dragon' },
  { question: 'A tile with three horizontal lines above 萬.', options: ['3 Character', '3 Dot', '3 Bamboo', 'West Wind'], answer: '3 Character' },
  { question: 'A tile showing the character 東.', options: ['East Wind', 'South Wind', 'West Wind', 'North Wind'], answer: 'East Wind' },
  { question: 'A tile showing the character 發 in green.', options: ['Green Dragon', 'Red Dragon', 'White Dragon', 'Spring Season'], answer: 'Green Dragon' },
  { question: 'A tile with 9 circles in a 3x3 grid.', options: ['9 Dot', '9 Bamboo', '9 Character', 'North Wind'], answer: '9 Dot' },
  { question: 'A tile with two bamboo sticks.', options: ['2 Bamboo', '2 Dot', '2 Character', 'Pair tile'], answer: '2 Bamboo' },
  { question: 'A tile showing the character 北.', options: ['North Wind', 'South Wind', 'East Wind', 'West Wind'], answer: 'North Wind' },
  { question: 'A tile showing the character 南.', options: ['South Wind', 'North Wind', 'East Wind', 'West Wind'], answer: 'South Wind' },
  { question: 'A tile showing the character 西.', options: ['West Wind', 'East Wind', 'South Wind', 'North Wind'], answer: 'West Wind' },
  { question: 'A tile showing one horizontal line above 萬.', options: ['1 Character', '1 Dot', '1 Bamboo', 'East Wind'], answer: '1 Character' },
  { question: 'A tile depicting a plum blossom.', options: ['Plum Flower', 'Orchid Flower', 'Spring Season', 'Red Dragon'], answer: 'Plum Flower' },
  { question: 'A tile showing 7 bamboo sticks.', options: ['7 Bamboo', '7 Dot', '7 Character', 'White Dragon'], answer: '7 Bamboo' },
  { question: 'A tile that is one of only 8 unique tiles in the entire set.', options: ['Bonus tile (Flower/Season)', 'Dragon tile', 'Wind tile', 'Suit tile'], answer: 'Bonus tile (Flower/Season)' },
  { question: 'A tile showing 4 circles in a square pattern.', options: ['4 Dot', '4 Bamboo', '4 Character', 'West Wind'], answer: '4 Dot' },
  { question: 'A tile with one large ornate circle.', options: ['1 Dot', '1 Bamboo', '1 Character', 'White Dragon'], answer: '1 Dot' },
  { question: 'A tile showing the character 八 above 萬.', options: ['8 Character', '8 Dot', '8 Bamboo', 'North Wind'], answer: '8 Character' },
  { question: 'A tile depicting the Summer season.', options: ['Summer Season', 'Spring Season', 'Autumn Season', 'Orchid Flower'], answer: 'Summer Season' },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ─────────────────────────────────────────
   Component
   ───────────────────────────────────────── */

const QUESTIONS_PER_ROUND = 10;
const LS_KEY = '16bit-mahjong-practice';

export default function TileQuiz({ onBack }: { onBack: () => void }) {
  const questions = useMemo(() => shuffle(TILE_QUESTIONS).slice(0, QUESTIONS_PER_ROUND), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[index];

  const handleSelect = useCallback((answer: string) => {
    if (selected) return;
    setSelected(answer);
    if (answer === current.answer) {
      setScore(s => s + 1);
    }
  }, [selected, current]);

  const handleNext = useCallback(() => {
    if (index + 1 >= QUESTIONS_PER_ROUND) {
      const finalScore = score + (selected === current.answer ? 0 : 0); // already counted
      // Save best
      try {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!stored['tile-quiz'] || score > stored['tile-quiz']) {
          stored['tile-quiz'] = score;
          localStorage.setItem(LS_KEY, JSON.stringify(stored));
        }
      } catch { /* ignore */ }
      setFinished(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
    }
  }, [index, score, selected, current]);

  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="retro-card p-8 max-w-sm w-full text-center border-2 border-retro-gold rounded-xl">
          <p className="text-4xl mb-3">{score >= 8 ? '!!!' : score >= 5 ? '!' : '...'}</p>
          <p className="font-pixel text-sm text-retro-gold retro-glow mb-2">Quiz Complete</p>
          <p className="text-3xl font-retro text-retro-text font-bold mb-1">
            {score}/{QUESTIONS_PER_ROUND}
          </p>
          <p className="text-sm font-retro text-retro-textDim mb-6">
            {score >= 9 ? 'Tile master!' : score >= 7 ? 'Great job!' : score >= 5 ? 'Not bad, keep practicing.' : 'Keep studying the tiles!'}
          </p>
          <div className="space-y-2">
            <button
              className="retro-btn-green w-full py-3 text-lg"
              onClick={() => { setIndex(0); setSelected(null); setScore(0); setFinished(false); }}
            >
              Try Again
            </button>
            <button
              className="retro-btn w-full py-3 text-lg bg-retro-bgLight"
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
      <div className="flex items-center p-4 border-b border-retro-border/20 bg-retro-bgLight">
        <button onClick={onBack} className="mr-4 text-lg text-retro-cyan font-retro">
          &#x2039; Back
        </button>
        <div className="flex-1">
          <p className="font-pixel text-xs text-retro-gold">TILE QUIZ</p>
        </div>
        <div className="bg-retro-green px-3 py-1.5 rounded-full">
          <span className="text-black font-bold text-sm font-retro">{score}/{index + 1}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-retro-textDim font-retro">
            Question {index + 1} of {QUESTIONS_PER_ROUND}
          </span>
        </div>
        <div className="h-1.5 bg-retro-bgLight rounded-full">
          <div
            className="h-full bg-retro-cyan rounded-full transition-all"
            style={{ width: `${((index + 1) / QUESTIONS_PER_ROUND) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 p-6">
        <div className="retro-card p-5 mb-6">
          <p className="font-pixel text-[10px] text-retro-cyan tracking-wider mb-2">IDENTIFY THIS TILE</p>
          <p className="text-lg font-retro text-retro-text leading-7">{current.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {current.options.map(option => {
            const isSelected = selected === option;
            const isCorrect = option === current.answer;
            const showResult = selected !== null;

            return (
              <button
                key={option}
                className={`w-full p-4 rounded-lg border-2 text-left font-retro text-lg transition-colors
                  ${!showResult ? 'bg-retro-bgLight border-retro-border/30 text-retro-text hover:border-retro-cyan/50' : ''}
                  ${showResult && isCorrect ? 'bg-retro-green/10 border-retro-green text-retro-text' : ''}
                  ${showResult && isSelected && !isCorrect ? 'bg-retro-accent/10 border-retro-accent text-retro-text' : ''}
                  ${showResult && !isCorrect && !isSelected ? 'bg-retro-bgLight border-retro-border/20 text-retro-textDim' : ''}
                `}
                onClick={() => handleSelect(option)}
                disabled={selected !== null}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && isCorrect && <span className="text-xl text-retro-green font-bold">&#x2713;</span>}
                  {showResult && isSelected && !isCorrect && <span className="text-xl text-retro-accent font-bold">&#x2717;</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Next */}
        {selected !== null && (
          <button
            className="retro-btn-green w-full mt-6 py-4 text-lg"
            onClick={handleNext}
          >
            {index + 1 >= QUESTIONS_PER_ROUND ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
