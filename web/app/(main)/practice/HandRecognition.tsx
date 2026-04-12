'use client';

import { useState, useCallback, useMemo } from 'react';

/* ─────────────────────────────────────────
   Question data
   ───────────────────────────────────────── */

interface HandQuestion {
  tiles: string;
  isValid: boolean;
  explanation: string;
}

const HAND_QUESTIONS: HandQuestion[] = [
  // Valid hands
  {
    tiles: 'Red Dragon x3 | 2-3-4 Bamboo | 5-6-7 Dots | East Wind x3 | 8-Char pair',
    isValid: true,
    explanation: 'Valid: 2 Pungs + 2 Chows + 1 Pair = 4 sets + pair. Standard winning hand.',
  },
  {
    tiles: '1-1-1 Dots | 3-3-3 Bamboo | 7-7-7 Char | North Wind x3 | 5-Dot pair',
    isValid: true,
    explanation: 'Valid: 4 Pungs + 1 Pair. This is an All Pungs hand (3 fan).',
  },
  {
    tiles: '1-2-3 Dots | 4-5-6 Dots | 7-8-9 Dots | 2-3-4 Bamboo | 6-Char pair',
    isValid: true,
    explanation: 'Valid: 4 Chows + 1 Pair. This is a standard All Chows hand.',
  },
  {
    tiles: '1D 9D 1B 9B 1C 9C E S W N Red Grn Wht + Wht pair',
    isValid: true,
    explanation: 'Valid: Thirteen Orphans. One of each terminal and honor, plus one duplicate. A limit hand!',
  },
  {
    tiles: '2-2 Dots | 4-4 Bamboo | 6-6 Char | E-E Wind | Red-Red Dragon | 8-8 Dots | 1-1 Bamboo',
    isValid: true,
    explanation: 'Valid: Seven Pairs (7 distinct pairs). An alternative winning structure worth 4 fan.',
  },
  {
    tiles: 'Red Dragon x3 | Green Dragon x3 | White Dragon x3 | 5-6-7 Char | 2-Dot pair',
    isValid: true,
    explanation: 'Valid: Big Three Dragons limit hand. Pungs of all 3 dragons + 1 set + pair.',
  },
  // Invalid hands
  {
    tiles: '1-2-3 Dots | 4-5-6 Dots | 7-8-9 Dots | Red Dragon x3 | (no pair)',
    isValid: false,
    explanation: 'Invalid: Only 3 sets + 1 Pung = 4 sets but NO PAIR. You must have a pair to win.',
  },
  {
    tiles: '1-2-3 Dots | 4-5-6 Bamboo | 7-8 Char | East Wind x3 | 5-Dot pair',
    isValid: false,
    explanation: 'Invalid: 7-8 Character is only 2 tiles, not a complete set. Need 3 tiles for a chow.',
  },
  {
    tiles: 'East-South-West Winds | 1-2-3 Dots | 5-5-5 Bamboo | 9-Char x3 | 4-Dot pair',
    isValid: false,
    explanation: 'Invalid: East-South-West is NOT a valid chow. Winds cannot form sequences, only pungs.',
  },
  {
    tiles: 'Red-Green-White Dragons | 1-2-3 Dots | 4-5-6 Bamboo | 7-8-9 Char | 5-Dot pair',
    isValid: false,
    explanation: 'Invalid: Red-Green-White is NOT a valid set. Dragons cannot form sequences, only pungs.',
  },
  {
    tiles: '1-1-1 Dots | 3-3-3 Dots | 5-5-5 Dots | 7-7-7 Dots | 9-9-9 Dots',
    isValid: false,
    explanation: 'Invalid: 5 Pungs = 15 tiles but no pair. A winning hand is 4 sets + 1 pair (14 tiles).',
  },
  {
    tiles: '1-3-5 Bamboo | 2-4-6 Dots | East Wind x3 | Red Dragon x3 | 8-Char pair',
    isValid: false,
    explanation: 'Invalid: 1-3-5 and 2-4-6 are not consecutive sequences. Chows must be consecutive (e.g. 1-2-3).',
  },
  {
    tiles: '1-2-3 Dots | 1-2-3 Bamboo + Dot | 5-5-5 Char | North Wind x3 | 7-Dot pair',
    isValid: false,
    explanation: 'Invalid: A chow must be from the SAME suit. You cannot mix Bamboo and Dots in one chow.',
  },
  {
    tiles: 'Flower x3 | 2-3-4 Dots | 6-7-8 Bamboo | East Wind x3 | 5-Char pair',
    isValid: false,
    explanation: 'Invalid: Flower tiles cannot form melds. They are bonus tiles set aside when drawn.',
  },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const QUESTIONS_PER_ROUND = 10;
const LS_KEY = '16bit-mahjong-practice';

export default function HandRecognition({ onBack }: { onBack: () => void }) {
  const questions = useMemo(() => shuffle(HAND_QUESTIONS).slice(0, QUESTIONS_PER_ROUND), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[index];

  const handleSelect = useCallback((answer: boolean) => {
    if (selected !== null) return;
    setSelected(answer);
    if (answer === current.isValid) {
      setScore(s => s + 1);
    }
  }, [selected, current]);

  const handleNext = useCallback(() => {
    if (index + 1 >= QUESTIONS_PER_ROUND) {
      try {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!stored['hand-recognition'] || score > stored['hand-recognition']) {
          stored['hand-recognition'] = score;
          localStorage.setItem(LS_KEY, JSON.stringify(stored));
        }
      } catch { /* ignore */ }
      setFinished(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
    }
  }, [index, score]);

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
            {score >= 9 ? 'Sharp eye!' : score >= 7 ? 'Good hand recognition!' : score >= 5 ? 'Keep practicing.' : 'Review hand structure rules!'}
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
          <p className="font-pixel text-xs text-retro-green">HAND RECOGNITION</p>
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
            className="h-full bg-retro-green rounded-full transition-all"
            style={{ width: `${((index + 1) / QUESTIONS_PER_ROUND) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 p-6">
        <div className="retro-card p-5 mb-6">
          <p className="font-pixel text-[10px] text-retro-green tracking-wider mb-3">IS THIS A VALID WINNING HAND?</p>
          <div className="bg-retro-bgLight rounded-lg p-4">
            <p className="text-base font-retro text-retro-text leading-7">{current.tiles}</p>
          </div>
        </div>

        {/* Yes / No buttons */}
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map(answer => {
            const label = answer ? 'Valid' : 'Invalid';
            const isSelected = selected === answer;
            const isCorrect = answer === current.isValid;
            const showResult = selected !== null;

            return (
              <button
                key={label}
                className={`p-5 rounded-lg border-2 text-center font-retro text-xl font-bold transition-colors
                  ${!showResult ? `bg-retro-bgLight border-retro-border/30 ${answer ? 'text-retro-green hover:border-retro-green/50' : 'text-red-400 hover:border-red-400/50'}` : ''}
                  ${showResult && isCorrect ? 'bg-retro-green/10 border-retro-green text-retro-green' : ''}
                  ${showResult && isSelected && !isCorrect ? 'bg-retro-accent/10 border-retro-accent text-retro-accent' : ''}
                  ${showResult && !isCorrect && !isSelected ? 'bg-retro-bgLight border-retro-border/20 text-retro-textDim' : ''}
                `}
                onClick={() => handleSelect(answer)}
                disabled={selected !== null}
              >
                {label}
                {showResult && isCorrect && <span className="ml-2">&#x2713;</span>}
                {showResult && isSelected && !isCorrect && <span className="ml-2">&#x2717;</span>}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {selected !== null && (
          <div className={`mt-6 retro-card p-4 border-l-4 ${
            selected === current.isValid ? 'border-retro-green' : 'border-retro-accent'
          }`}>
            <p className="font-retro text-sm text-retro-text/80 leading-relaxed">{current.explanation}</p>
          </div>
        )}

        {/* Next */}
        {selected !== null && (
          <button
            className="retro-btn-green w-full mt-4 py-4 text-lg"
            onClick={handleNext}
          >
            {index + 1 >= QUESTIONS_PER_ROUND ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
