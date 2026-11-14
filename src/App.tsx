import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Maximize2,
  Minimize2,
  Moon,
  RotateCcw,
  Sun,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MathExpr } from './components/MathExpr';
import { generateQuestion } from './data/sequenceGenerator';
import {
  OptionId,
  SessionEntry,
  TopicFilter,
} from './types/sequence';

const TOPIC_OPTIONS: { id: TopicFilter; label: string }[] = [
  { id: 'all', label: 'Totes' },
  { id: 'arithmetic', label: 'Aritmètiques' },
  { id: 'geometric_quadratic', label: 'Geomètriques' },
  { id: 'context', label: 'Problemes' },
];

function renderContextText(text: string): React.ReactNode {
  // Format standalone variable "n" in italicized math serif for classroom clarity
  const parts = text.split(/(\bn\b)/g);
  return parts.map((part, idx) =>
    part === 'n' ? (
      <span key={idx} className="italic font-serif font-semibold">
        n
      </span>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

export default function App() {
  const usedKeysRef = useRef<Set<string>>(new Set());

  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
  const [includeContext, setIncludeContext] = useState(true);
  const [history, setHistory] = useState<SessionEntry[]>(() => {
    const first = generateQuestion(0, 'all', usedKeysRef.current, true);
    return [
      {
        question: first,
        selectedOptionId: null,
        revealed: false,
        wasCorrect: null,
      },
    ];
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showPositions, setShowPositions] = useState(true);
  const [darkBoard, setDarkBoard] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentEntry = history[currentIdx];
  const currentQuestion = currentEntry.question;

  // Sync `.dark` class on <html> for Tailwind v4 `@custom-variant dark`
  useEffect(() => {
    const root = document.documentElement;
    if (darkBoard) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkBoard]);

  // Listen to fullscreen state changes (e.g., Esc pressed by user)
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if iframe/browser restricts fullscreen API
    }
  }, []);

  const stats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    for (const item of history) {
      if (item.revealed && item.selectedOptionId !== null) {
        answered++;
        if (item.wasCorrect) correct++;
      }
    }
    return { answered, correct };
  }, [history]);

  const startFreshSession = useCallback(
    (nextFilter: TopicFilter, nextIncludeContext = includeContext) => {
      usedKeysRef.current = new Set();
      const first = generateQuestion(0, nextFilter, usedKeysRef.current, nextIncludeContext);
      setTopicFilter(nextFilter);
      setHistory([
        {
          question: first,
          selectedOptionId: null,
          revealed: false,
          wasCorrect: null,
        },
      ]);
      setCurrentIdx(0);
    },
    [includeContext]
  );

  const handleCheckAnswer = useCallback(
    (overrideOptionId?: OptionId) => {
      setHistory((prev) =>
        prev.map((entry, idx) => {
          if (idx !== currentIdx || entry.revealed) return entry;
          const chosen = overrideOptionId ?? entry.selectedOptionId;
          const isCorrect =
            chosen !== null ? chosen === entry.question.correctId : null;
          return {
            ...entry,
            selectedOptionId: chosen,
            revealed: true,
            wasCorrect: isCorrect,
          };
        })
      );
    },
    [currentIdx]
  );

  const handleSelectOption = useCallback(
    (optionId: OptionId) => {
      if (currentEntry.revealed) return;
      // Clicking an already-selected option checks immediately; clicking a new option selects it
      if (currentEntry.selectedOptionId === optionId) {
        handleCheckAnswer(optionId);
        return;
      }
      setHistory((prev) =>
        prev.map((entry, idx) =>
          idx === currentIdx ? { ...entry, selectedOptionId: optionId } : entry
        )
      );
    },
    [currentEntry.revealed, currentEntry.selectedOptionId, currentIdx, handleCheckAnswer]
  );

  const handleNextScreen = useCallback(() => {
    if (currentIdx < history.length - 1) {
      setCurrentIdx((idx) => idx + 1);
      return;
    }
    const nextStep = history.length;
    const nextQuestion = generateQuestion(
      nextStep,
      topicFilter,
      usedKeysRef.current,
      includeContext
    );
    setHistory((prev) => [
      ...prev,
      {
        question: nextQuestion,
        selectedOptionId: null,
        revealed: false,
        wasCorrect: null,
      },
    ]);
    setCurrentIdx(nextStep);
  }, [currentIdx, history.length, includeContext, topicFilter]);

  const handlePrevScreen = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((idx) => idx - 1);
    }
  }, [currentIdx]);

  // Keyboard shortcuts for effortless classroom projection control
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === 'a' || key === '1') {
        e.preventDefault();
        handleSelectOption('A');
      } else if (key === 'b' || key === '2') {
        e.preventDefault();
        handleSelectOption('B');
      } else if (key === 'c' || key === '3') {
        e.preventDefault();
        handleSelectOption('C');
      } else if (key === 'd' || key === '4') {
        e.preventDefault();
        handleSelectOption('D');
      } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        if (!currentEntry.revealed && currentEntry.selectedOptionId) {
          handleCheckAnswer();
        } else if (currentEntry.revealed) {
          handleNextScreen();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentEntry.revealed) {
          e.preventDefault();
          handleNextScreen();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIdx > 0) {
          e.preventDefault();
          handlePrevScreen();
        }
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentEntry.revealed,
    currentEntry.selectedOptionId,
    currentIdx,
    handleCheckAnswer,
    handleNextScreen,
    handlePrevScreen,
    handleSelectOption,
    toggleFullscreen,
  ]);

  const promptModeLabel =
    currentQuestion.promptType === 'algebraic'
      ? 'Expressió algebraica → 5 primers termes'
      : currentQuestion.promptType === 'numeric'
        ? '5 primers nombres → Terme general'
        : `Problema de context${currentQuestion.contextLabel ? ` (${currentQuestion.contextLabel})` : ''} → Terme general`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Top Bar: strict 3-zone contract */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <span className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            Successions 3r ESO
          </span>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Tipus de successions"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {TOPIC_OPTIONS.map((item) => {
              const active = topicFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id !== topicFilter) startFreshSession(item.id);
                  }}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xs ${
                    active
                      ? 'border-blue-600 text-slate-900 dark:border-blue-400 dark:text-white font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => startFreshSession(topicFilter)}
              className="py-1 border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Nova sessió</span>
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Surt de pantalla completa</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Pantalla completa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Classroom Projector Stage */}
      <main className="flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 sm:py-6 gap-4 sm:gap-5">
        {/* Workspace Utility Strip (unboxed metadata + classroom display toggles) */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2 font-medium tabular-nums">
            <span className="text-slate-900 dark:text-slate-100 font-semibold">
              Pantalla {currentQuestion.stepNumber}
            </span>
            <span aria-hidden="true">·</span>
            <span>{promptModeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>
              Encerts de l’aula: {stats.correct} / {stats.answered}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Compact topic selector on small screens */}
            <div className="flex md:hidden items-center gap-3">
              <select
                aria-label="Filtre de successions"
                value={topicFilter}
                onChange={(e) => startFreshSession(e.target.value as TopicFilter)}
                className="bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                {TOPIC_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {topicFilter !== 'context' && (
              <button
                type="button"
                onClick={() => setIncludeContext((v) => !v)}
                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xs"
              >
                {includeContext ? 'Problemes: Activats' : 'Problemes: Desactivats'}
              </button>
            )}

            {currentQuestion.promptType === 'numeric' && (
              <button
                type="button"
                onClick={() => setShowPositions((v) => !v)}
                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xs"
              >
                {showPositions ? 'Oculta posicions n' : 'Mostra posicions n'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkBoard((d) => !d)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xs"
            >
              {darkBoard ? (
                <>
                  <Sun className="w-4 h-4" aria-hidden="true" />
                  <span>Fons clar</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" aria-hidden="true" />
                  <span>Pissarra fosca</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Question Stage + 4 Options */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-center gap-4 sm:gap-5"
          >
            {/* Focal Anchor Card */}
            <section
              aria-label="Enunciat projectat"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-7 sm:px-10 sm:py-10 shadow-xs flex flex-col items-center justify-center text-center"
            >
              <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 mb-4 sm:mb-5 text-balance">
                {currentQuestion.promptType === 'algebraic'
                  ? 'Quins són els cinc primers nombres d’aquesta successió?'
                  : currentQuestion.promptType === 'numeric'
                    ? 'Quin terme general correspon a aquesta successió?'
                    : `${currentQuestion.contextLabel ? `${currentQuestion.contextLabel} · ` : ''}Quin terme general descriu aquesta situació?`}
              </p>

              {currentQuestion.promptType === 'algebraic' && currentQuestion.promptFormula ? (
                <div className="py-2 sm:py-3 text-slate-950 dark:text-white">
                  <MathExpr expr={currentQuestion.promptFormula} size="xl" />
                </div>
              ) : currentQuestion.promptType === 'context' && currentQuestion.promptContext ? (
                <p className="py-2 sm:py-3 max-w-3xl text-xl sm:text-2xl lg:text-[1.75rem] font-display font-medium leading-snug text-slate-950 dark:text-white text-balance">
                  {renderContextText(currentQuestion.promptContext)}
                </p>
              ) : (
                <div className="py-2 sm:py-3 flex flex-wrap items-start justify-center gap-x-5 sm:gap-x-8 lg:gap-x-10 gap-y-4">
                  {(currentQuestion.promptTerms ?? []).map((term, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="flex items-baseline text-slate-950 dark:text-white">
                        <MathExpr expr={term} size="xl" />
                        <span
                          className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl text-slate-300 dark:text-slate-600 ml-1"
                          aria-hidden="true"
                        >
                          ,
                        </span>
                      </div>
                      {showPositions && (
                        <span className="mt-2 text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                          <MathExpr expr={`a_${idx + 1}`} size="sm" />
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center self-center text-3xl sm:text-4xl lg:text-5xl font-display text-slate-400 dark:text-slate-500 pb-4">
                    …
                  </div>
                </div>
              )}
            </section>

            {/* 4 Response Options Grid (A, B, C, D) */}
            <section
              aria-label="Opcions de resposta"
              className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4"
            >
              {currentQuestion.options.map((opt) => {
                const isSelected = currentEntry.selectedOptionId === opt.id;
                const isRevealed = currentEntry.revealed;
                const isRightOption = opt.isCorrect;

                let containerStyle =
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 text-slate-900 dark:text-slate-100';
                let letterStyle =
                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';

                if (!isRevealed && isSelected) {
                  containerStyle =
                    'bg-blue-50/80 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/20 text-slate-950 dark:text-white';
                  letterStyle =
                    'bg-blue-600 text-white dark:bg-blue-500 dark:text-white';
                } else if (isRevealed && isRightOption) {
                  containerStyle =
                    'bg-emerald-50/85 dark:bg-emerald-950/45 border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-600/20 text-slate-950 dark:text-white';
                  letterStyle =
                    'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white';
                } else if (isRevealed && isSelected && !isRightOption) {
                  containerStyle =
                    'bg-red-50/85 dark:bg-red-950/45 border-red-600 dark:border-red-500 ring-2 ring-red-600/20 text-slate-950 dark:text-white';
                  letterStyle =
                    'bg-red-600 text-white dark:bg-red-500 dark:text-white';
                } else if (isRevealed) {
                  containerStyle =
                    'bg-white/60 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 opacity-55 text-slate-600 dark:text-slate-400';
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isRevealed}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`group relative w-full min-h-[88px] sm:min-h-[106px] px-5 py-4 sm:px-6 sm:py-5 rounded-2xl border-2 text-left flex items-center justify-between gap-4 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                      isRevealed ? 'cursor-default' : 'cursor-pointer'
                    } ${containerStyle}`}
                  >
                    <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                      <span
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-display font-bold text-xl sm:text-2xl flex items-center justify-center shrink-0 transition-colors ${letterStyle}`}
                      >
                        {opt.id}
                      </span>

                      <div className="min-w-0 flex-1 flex items-center">
                        {opt.formula ? (
                          <MathExpr expr={opt.formula} size="lg" className="justify-start" />
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3.5 gap-y-1">
                            {(opt.terms ?? []).map((t, i) => (
                              <span key={i} className="inline-flex items-baseline">
                                <MathExpr expr={t} size="lg" />
                                <span
                                  className="text-slate-400 dark:text-slate-500 text-xl sm:text-2xl ml-0.5"
                                  aria-hidden="true"
                                >
                                  ,
                                </span>
                              </span>
                            ))}
                            <span className="text-slate-400 dark:text-slate-500 text-xl sm:text-2xl">
                              …
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Explicit Status Indicator (Text + Icon, never hue-only) */}
                    <div className="shrink-0 flex items-center">
                      {!isRevealed && isSelected && (
                        <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                          Triada
                        </span>
                      )}
                      {isRevealed && isRightOption && (
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                          <span>{isSelected ? 'Correcte' : 'Solució'}</span>
                        </span>
                      )}
                      {isRevealed && isSelected && !isRightOption && (
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 whitespace-nowrap">
                          <XCircle className="w-5 h-5" aria-hidden="true" />
                          <span>Incorrecte</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </section>
          </motion.div>
        </AnimatePresence>

        {/* Teacher Action & Verification Bar */}
        <footer className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Classroom prompt or post-check mathematical explanation */}
          <div className="min-w-0 flex-1">
            {currentEntry.revealed ? (
              <div className="flex items-start gap-2.5 text-sm sm:text-base">
                {currentEntry.wasCorrect === true ? (
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : currentEntry.wasCorrect === false ? (
                  <XCircle
                    className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <Eye
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <p className="text-slate-700 dark:text-slate-300 leading-snug">
                  <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                    {currentEntry.wasCorrect === true
                      ? `Correcte (${currentQuestion.correctId}).`
                      : currentEntry.wasCorrect === false
                        ? `Opció incorrecta — la resposta correcta és la ${currentQuestion.correctId}.`
                        : `Resposta correcta: opció ${currentQuestion.correctId}.`}
                  </span>
                  <span>{currentQuestion.explanation}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {currentEntry.selectedOptionId
                  ? `L’alumnat ha indicat l’opció ${currentEntry.selectedOptionId}. Prem «Comprovar resultat» o Enter.`
                  : 'Feu clic a l’opció A, B, C o D que indiqui l’alumnat des del seu lloc (tecles A–D).'}
              </p>
            )}
          </div>

          {/* Right: Teacher flow controls */}
          <div className="flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={handlePrevScreen}
              className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Anterior</span>
            </button>

            {!currentEntry.revealed ? (
              <>
                {!currentEntry.selectedOptionId && (
                  <button
                    type="button"
                    onClick={() => handleCheckAnswer()}
                    className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span>Mostra la solució</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={!currentEntry.selectedOptionId}
                  onClick={() => handleCheckAnswer()}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <span>Comprovar resultat</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNextScreen}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span>Següent pantalla</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
