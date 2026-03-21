'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Level1, Lesson, QuizQuestion } from '@/content/level1';
import { MahjongTile } from '@/components/MahjongTile';
import { SetBuilder } from '@/components/SetBuilder';
import { getTileById, Tile } from '@/models/Tile';

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const lesson = Level1.lessons.find(l => l.id === lessonId);

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
        <p className="text-gray-500">Lesson not found</p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <p className="text-4xl mb-3">{hasQuiz ? '🎉' : '✓'}</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Lesson Complete!</h2>
            <p className="text-gray-500 mb-6">{completionMessage}</p>
            <button
              className="w-full py-3 bg-mahjong-green text-white rounded-xl font-semibold"
              onClick={() => router.push('/learn')}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-white">
        <button
          onClick={() => currentSection !== 'content' ? setCurrentSection('content') : router.push('/learn')}
          className="mr-4 text-lg text-mahjong-green font-semibold"
        >
          ‹ Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900 truncate">{lesson.title}</p>
          <p className="text-sm text-gray-500 truncate">{lesson.subtitle}</p>
        </div>
        {currentSection === 'quiz' && (
          <div className="bg-mahjong-green px-3 py-1.5 rounded-full">
            <span className="text-white font-bold text-sm">{correctAnswers}/{quizIndex + 1}</span>
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
                className={`text-[17px] leading-7 text-gray-900 mb-4
                  ${paragraph === '' ? 'mb-1' : ''}
                  ${paragraph.startsWith('•') ? 'pl-4' : ''}
                  ${paragraph.startsWith('⚠️') ? 'bg-amber-50 p-2 rounded' : ''}
                  ${paragraph.startsWith('🎉') ? 'text-xl font-semibold' : ''}
                `}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tiles display */}
          {lesson.tiles && lesson.tiles.length > 0 && (
            <div className="px-6 py-4 bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Tiles in this lesson:</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {lesson.tiles.map((tileId) => {
                  const tile = getTileById(tileId);
                  if (!tile) return null;
                  return (
                    <div key={tileId} className="text-center">
                      <MahjongTile tile={tile} width={55} height={80} />
                      <p className="mt-1 text-[11px] text-gray-500 max-w-[60px]">{tile.nameEnglish}</p>
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
                className="w-full py-4 bg-mahjong-green text-white rounded-xl text-[17px] font-semibold"
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
                className="w-full py-4 bg-mahjong-green text-white rounded-xl text-[17px] font-semibold"
                onClick={handleStartQuiz}
              >
                Take Quiz ({lesson.quiz?.length} questions)
              </button>
            ) : (
              <button
                className="w-full py-4 bg-mahjong-green text-white rounded-xl text-[17px] font-semibold"
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
            <p className="text-sm text-gray-500 mb-2">
              Question {quizIndex + 1} of {lesson.quiz?.length}
            </p>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div
                className="h-full bg-mahjong-green rounded-full transition-all"
                style={{ width: `${((quizIndex + 1) / (lesson.quiz?.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 leading-7">{currentQuiz.question}</h2>
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
                  className={`w-full flex items-center justify-between p-4 rounded-md border-2 text-left
                    ${!showResult && !isSelected ? 'bg-white border-gray-200' : ''}
                    ${!showResult && isSelected ? 'bg-green-50 border-mahjong-green' : ''}
                    ${showResult && isCorrect ? 'bg-green-50 border-green-500' : ''}
                    ${showResult && isSelected && !isCorrect ? 'bg-red-50 border-red-500' : ''}
                    ${showResult && !isCorrect && !isSelected ? 'bg-white border-gray-200' : ''}
                  `}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showExplanation}
                >
                  <span className={`text-base ${
                    showResult && isCorrect ? 'text-green-500 font-semibold' : 'text-gray-900'
                  } ${isSelected && !showResult ? 'font-semibold' : ''}`}>
                    {option}
                  </span>
                  {showResult && isCorrect && <span className="text-xl text-green-500 font-bold">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="text-xl text-red-500 font-bold">✗</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className={`mt-6 p-4 rounded-md border-l-4 ${
              selectedAnswer === currentQuiz.correctAnswer
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
            }`}>
              <p className="text-base font-bold mb-1">
                {selectedAnswer === currentQuiz.correctAnswer ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="text-[15px] text-gray-900 leading-relaxed">{currentQuiz.explanation}</p>
            </div>
          )}

          {/* Next button */}
          {showExplanation && (
            <button
              className="w-full mt-6 py-4 bg-mahjong-green text-white rounded-xl text-[17px] font-semibold"
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
          <div className="flex items-center p-4 border-b border-gray-200 bg-white">
            <button
              onClick={() => setCurrentSection('content')}
              className="mr-4 text-lg text-mahjong-green font-semibold"
            >
              ‹ Back to Lesson
            </button>
            <h2 className="flex-1 text-lg font-bold text-gray-900 text-center mr-16">
              Set Builder Practice
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
            <div className="bg-green-50 p-4 text-center border-t border-green-500">
              <p className="text-lg font-semibold text-green-500 mb-2">🎉 You&apos;ve built valid sets!</p>
              <button
                className="bg-green-500 text-white px-6 py-3 rounded-md font-semibold"
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
