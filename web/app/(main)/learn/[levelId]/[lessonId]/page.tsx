'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLevelById, Lesson, QuizQuestion } from '@/content';
import { MahjongTile } from '@/components/MahjongTile';
import { SetBuilder } from '@/components/SetBuilder';
import { getTileById, Tile } from '@/models/Tile';

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = Number(params.levelId);
  const lessonId = params.lessonId as string;

  const level = getLevelById(levelId);
  const lesson = level?.lessons.find(l => l.id === lessonId);

  const [currentSection, setCurrentSection] = useState<'content' | 'quiz' | 'interactive'>('content');
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [setBuilderCompleted, setSetBuilderCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-retro-textDim font-retro">Lesson not found</p>
      </div>
    );
  }

  const hasQuiz = lesson.quiz && lesson.quiz.length > 0;
  const currentQuiz = lesson.quiz?.[quizIndex];
  const isLastQuiz = quizIndex === (lesson.quiz?.length || 0) - 1;

  const markLessonComplete = () => {
    const stored = localStorage.getItem(COMPLETED_LESSONS_KEY);
    const completed: string[] = stored ? JSON.parse(stored) : [];
    if (!completed.includes(lesson.id)) {
      completed.push(lesson.id);
      localStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify(completed));
    }
  };

  const handleComplete = () => {
    markLessonComplete();
    if (hasQuiz) {
      const score = Math.round((correctAnswers / (lesson.quiz?.length || 1)) * 100);
      setCompletionMessage(`You scored ${score}% (${correctAnswers}/${lesson.quiz?.length} correct)`);
    } else {
      setCompletionMessage('Great job! On to the next lesson.');
    }
    setShowCompletionModal(true);
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    setShowExplanation(true);
    if (answer === currentQuiz?.correctAnswer) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const handleNextQuiz = () => {
    if (isLastQuiz) {
      handleComplete();
    } else {
      setQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleStartQuiz = () => {
    setCurrentSection('quiz');
    setQuizIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCorrectAnswers(0);
  };

  const backToLevel = `/learn/${levelId}`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="retro-card p-8 text-center max-w-sm w-full border-2 border-retro-gold rounded-xl animate-slide-up">
            <p className="text-4xl mb-3">{hasQuiz ? '🎉' : '✓'}</p>
            <h2 className="font-pixel text-sm text-retro-gold retro-glow mb-2">Lesson Complete!</h2>
            <p className="text-retro-textDim font-retro mb-6">{completionMessage}</p>
            <button
              className="retro-btn-green w-full py-3 text-lg"
              onClick={() => router.push(backToLevel)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center p-4 border-b border-retro-border/20 bg-retro-bgLight">
        <button
          onClick={() => currentSection !== 'content' ? setCurrentSection('content') : router.push(backToLevel)}
          className="mr-4 text-lg text-retro-cyan font-retro hover:retro-glow transition-all"
        >
          ‹ Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-retro text-retro-text truncate">{lesson.title}</p>
          <p className="text-sm text-retro-textDim font-retro truncate">{lesson.subtitle}</p>
        </div>
        {currentSection === 'quiz' && (
          <div className="bg-retro-green px-3 py-1.5 rounded-full">
            <span className="text-black font-bold text-sm font-retro">{correctAnswers}/{quizIndex + 1}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      {currentSection === 'content' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {lesson.content.map((paragraph, index) => (
              <p
                key={index}
                className={`text-lg leading-8 text-retro-text font-retro mb-4
                  ${paragraph === '' ? 'mb-1' : ''}
                  ${paragraph.startsWith('•') ? 'pl-4' : ''}
                  ${paragraph.startsWith('⚠️') ? 'bg-retro-panel/50 border-l-2 border-retro-gold p-3 rounded-lg' : ''}
                  ${paragraph.startsWith('🎉') ? 'text-xl text-retro-gold' : ''}
                `}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tiles display */}
          {lesson.tiles && lesson.tiles.length > 0 && (
            <div className="px-6 py-4 bg-retro-bgLight/50">
              <h3 className="font-pixel text-xs text-retro-cyan mb-4">TILES IN THIS LESSON</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {lesson.tiles.map((tileId) => {
                  const tile = getTileById(tileId);
                  if (!tile) return null;
                  return (
                    <div key={tileId} className="text-center">
                      <MahjongTile tile={tile} width={55} height={80} />
                      <p className="mt-1 text-[11px] text-retro-textDim font-retro max-w-[60px]">{tile.nameEnglish}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive button */}
          {lesson.interactiveType === 'set-builder' && (
            <div className="p-6">
              <button
                className="retro-btn-gold w-full py-4 text-lg"
                onClick={() => setCurrentSection('interactive')}
              >
                Try Set Builder 🧩
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="p-6">
            {hasQuiz ? (
              <button
                className="retro-btn-green w-full py-4 text-lg"
                onClick={handleStartQuiz}
              >
                Take Quiz ({lesson.quiz?.length} questions)
              </button>
            ) : (
              <button
                className="retro-btn-green w-full py-4 text-lg"
                onClick={handleComplete}
              >
                Complete Lesson ✓
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Section */}
      {currentSection === 'quiz' && currentQuiz && (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Progress */}
          <div className="mb-6">
            <p className="text-sm text-retro-textDim font-retro mb-2">
              Question {quizIndex + 1} of {lesson.quiz?.length}
            </p>
            <div className="h-1.5 bg-retro-bgLight rounded-full">
              <div
                className="h-full bg-retro-cyan rounded-full transition-all"
                style={{ width: `${((quizIndex + 1) / (lesson.quiz?.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-6">
            <h2 className="text-xl font-retro text-retro-text leading-7">{currentQuiz.question}</h2>
            {currentQuiz.tileId && (() => {
              const tile = getTileById(currentQuiz.tileId);
              return tile ? (
                <div className="flex justify-center mt-6">
                  <MahjongTile tile={tile} width={80} height={120} />
                </div>
              ) : null;
            })()}
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuiz.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuiz.correctAnswer;
              const showResult = showExplanation;

              return (
                <button
                  key={index}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 text-left font-retro text-lg transition-colors
                    ${!showResult && !isSelected ? 'bg-retro-bgLight border-retro-border/30 text-retro-text' : ''}
                    ${!showResult && isSelected ? 'bg-retro-cyan/10 border-retro-cyan text-retro-text' : ''}
                    ${showResult && isCorrect ? 'bg-retro-green/10 border-retro-green text-retro-text' : ''}
                    ${showResult && isSelected && !isCorrect ? 'bg-retro-accent/10 border-retro-accent text-retro-text' : ''}
                    ${showResult && !isCorrect && !isSelected ? 'bg-retro-bgLight border-retro-border/20 text-retro-textDim' : ''}
                  `}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showExplanation}
                >
                  <span className={showResult && isCorrect ? 'text-retro-green' : ''}>
                    {option}
                  </span>
                  {showResult && isCorrect && <span className="text-xl text-retro-green font-bold">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="text-xl text-retro-accent font-bold">✗</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className={`mt-6 retro-card p-4 border-l-4 ${
              selectedAnswer === currentQuiz.correctAnswer
                ? 'border-retro-green'
                : 'border-retro-accent'
            }`}>
              <p className="font-retro text-lg font-bold mb-1 text-retro-text">
                {selectedAnswer === currentQuiz.correctAnswer ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="font-retro text-base text-retro-text/80 leading-relaxed">{currentQuiz.explanation}</p>
            </div>
          )}

          {/* Next button */}
          {showExplanation && (
            <button
              className="retro-btn-green w-full mt-6 py-4 text-lg"
              onClick={handleNextQuiz}
            >
              {isLastQuiz ? 'Complete Lesson' : 'Next Question →'}
            </button>
          )}
        </div>
      )}

      {/* Interactive Section */}
      {currentSection === 'interactive' && lesson.interactiveType === 'set-builder' && lesson.interactiveData?.availableTileIds && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center p-4 border-b border-retro-border/20 bg-retro-bgLight">
            <button
              onClick={() => setCurrentSection('content')}
              className="mr-4 text-lg text-retro-cyan font-retro"
            >
              ‹ Back to Lesson
            </button>
            <h2 className="flex-1 font-pixel text-xs text-retro-gold text-center mr-16">
              SET BUILDER PRACTICE
            </h2>
          </div>

          <SetBuilder
            availableTiles={
              lesson.interactiveData.availableTileIds
                .map(id => getTileById(id))
                .filter((tile): tile is Tile => tile !== undefined)
            }
            onValidSet={() => setSetBuilderCompleted(true)}
          />

          {setBuilderCompleted && (
            <div className="retro-card p-4 text-center border-t-2 border-retro-green mx-4 mb-4">
              <p className="text-lg font-retro text-retro-green mb-2">🎉 You&apos;ve built valid sets!</p>
              <button
                className="retro-btn-green px-6 py-3"
                onClick={() => {
                  setCurrentSection('content');
                  handleComplete();
                }}
              >
                Complete Lesson
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
