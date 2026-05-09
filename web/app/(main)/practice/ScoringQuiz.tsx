'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { quizCompleted } from '@/store/actions/progressActions';

/* ─────────────────────────────────────────
   Question data
   ───────────────────────────────────────── */

interface ScoringQuestion {
  description: string;
  details: string[];
  options: string[];
  answer: string;
  explanation: string;
}

const SCORING_QUESTIONS: ScoringQuestion[] = [
  {
    description: 'Mixed hand with 1 dragon pung. Won by discard. Concealed. No flowers.',
    details: ['Dragon Pung: +1', 'Concealed: +1', 'No Flowers: +1'],
    options: ['1 fan', '2 fan', '3 fan', '4 fan'],
    answer: '3 fan',
    explanation: 'Dragon Pung (1) + Concealed (1) + No Flowers (1) = 3 fan.',
  },
  {
    description: 'All Pungs hand. Self-drawn. 1 flower tile. Seat wind pung included.',
    details: ['All Pungs: +3', 'Self-drawn: +1', 'Seat Wind: +1', 'Flower: +1'],
    options: ['4 fan', '5 fan', '6 fan', '7 fan'],
    answer: '6 fan',
    explanation: 'All Pungs (3) + Self-drawn (1) + Seat Wind (1) + Flower (1) = 6 fan.',
  },
  {
    description: 'Chicken hand. Won by discard. No special patterns. No flowers.',
    details: ['No scoring elements', 'No Flowers: +1'],
    options: ['0 fan', '1 fan', '2 fan', '3 fan'],
    answer: '1 fan',
    explanation: 'The only scoring element is No Flowers (1). Total: 1 fan. Not quite a chicken hand!',
  },
  {
    description: 'Pure One Suit (all Dots). Self-drawn. Concealed. No flowers.',
    details: ['Pure One Suit: +7', 'Self-drawn: +1', 'Concealed: +1', 'No Flowers: +1'],
    options: ['7 fan', '9 fan', '10 fan (limit)', '8 fan'],
    answer: '10 fan (limit)',
    explanation: 'Pure One Suit (7) + Self-drawn (1) + Concealed (1) + No Flowers (1) = 10 fan = Limit hand!',
  },
  {
    description: 'Mixed One Suit hand (all Characters + Green Dragon pung). Won by discard. Not concealed. 2 flowers.',
    details: ['Mixed One Suit: +3', 'Dragon Pung: +1', 'Flowers: +2'],
    options: ['4 fan', '5 fan', '6 fan', '7 fan'],
    answer: '6 fan',
    explanation: 'Mixed One Suit (3) + Green Dragon (1) + 2 Flowers (2) = 6 fan.',
  },
  {
    description: 'Seven Pairs hand. Self-drawn. No flowers.',
    details: ['Seven Pairs: +4', 'Self-drawn: +1', 'No Flowers: +1'],
    options: ['4 fan', '5 fan', '6 fan', '7 fan'],
    answer: '6 fan',
    explanation: 'Seven Pairs (4) + Self-drawn (1) + No Flowers (1) = 6 fan.',
  },
  {
    description: 'Hand with pungs of Red Dragon and White Dragon. Won by discard. Not concealed. No flowers.',
    details: ['Red Dragon Pung: +1', 'White Dragon Pung: +1', 'No Flowers: +1'],
    options: ['2 fan', '3 fan', '4 fan', '5 fan'],
    answer: '3 fan',
    explanation: 'Red Dragon (1) + White Dragon (1) + No Flowers (1) = 3 fan.',
  },
  {
    description: 'All Pungs hand with prevailing wind pung (East round). Won by self-draw. 3 flowers.',
    details: ['All Pungs: +3', 'Prevailing Wind: +1', 'Self-drawn: +1', 'Flowers: +3'],
    options: ['6 fan', '7 fan', '8 fan', '9 fan'],
    answer: '8 fan',
    explanation: 'All Pungs (3) + Prevailing Wind (1) + Self-drawn (1) + 3 Flowers (3) = 8 fan.',
  },
  {
    description: 'Mixed hand. Self-drawn. Concealed. Seat wind AND prevailing wind pung (same wind). No flowers.',
    details: ['Seat Wind: +1', 'Prevailing Wind: +1', 'Self-drawn: +1', 'Concealed: +1', 'No Flowers: +1'],
    options: ['3 fan', '4 fan', '5 fan', '6 fan'],
    answer: '5 fan',
    explanation: 'Seat Wind (1) + Prevailing Wind (1) + Self-drawn (1) + Concealed (1) + No Flowers (1) = 5 fan = Limit payment!',
  },
  {
    description: 'Basic hand won by discard. 1 flower tile. No other bonuses. Not concealed.',
    details: ['Flower: +1'],
    options: ['0 fan', '1 fan', '2 fan', '3 fan'],
    answer: '1 fan',
    explanation: 'Only 1 Flower (1). Total: 1 fan. Payment: 16 points from the discarder.',
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

export default function ScoringQuiz({ onBack }: { onBack: () => void }) {
  const questions = useMemo(() => shuffle(SCORING_QUESTIONS).slice(0, QUESTIONS_PER_ROUND), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const dispatch = useAppDispatch();

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
      try {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!stored['scoring-quiz'] || score > stored['scoring-quiz']) {
          stored['scoring-quiz'] = score;
          localStorage.setItem(LS_KEY, JSON.stringify(stored));
        }
      } catch { /* ignore */ }
      void dispatch(quizCompleted({ mode: 'scoring-quiz', score }));
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
            {score >= 9 ? 'Scoring expert!' : score >= 7 ? 'Solid fan counting!' : score >= 5 ? 'Getting there.' : 'Review the scoring rules!'}
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
          <p className="font-display text-xs text-highlight">SCORING QUIZ</p>
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
            className="h-full bg-highlight rounded-full transition-all"
            style={{ width: `${((index + 1) / QUESTIONS_PER_ROUND) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 p-6">
        <div className="ds-card p-5 mb-4">
          <p className="font-display text-[10px] text-highlight tracking-wider mb-2">HOW MANY FANS?</p>
          <p className="text-lg font-sans text-foreground leading-7 mb-3">{current.description}</p>
          <div className="bg-elevated rounded px-3 py-2">
            {current.details.map((d, i) => (
              <p key={i} className="text-sm font-sans text-info">{d}</p>
            ))}
          </div>
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

        {/* Explanation */}
        {selected !== null && (
          <div className={`mt-4 ds-card p-4 border-l-4 ${
            selected === current.answer ? 'border-success' : 'border-accent'
          }`}>
            <p className="font-sans text-sm text-foreground/80 leading-relaxed">{current.explanation}</p>
          </div>
        )}

        {/* Next */}
        {selected !== null && (
          <button
            className="ds-btn-success w-full mt-4 py-4 text-lg"
            onClick={handleNext}
          >
            {index + 1 >= QUESTIONS_PER_ROUND ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
