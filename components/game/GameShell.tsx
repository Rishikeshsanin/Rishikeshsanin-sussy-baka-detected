"use client";

import { BookOpen, SlidersHorizontal } from "lucide-react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { brand } from "@/lib/brand";
import {
  clearSavedGame,
  createIdleState,
  gameReducer,
  loadGameState,
  saveGameState,
  type AIMemory,
  type AnswerType,
  type GameAnswer,
  type TurnReason,
  type TurnToken,
} from "@/lib/game";
import type { APIErrorBody, GameAIResponse, TurnRequest } from "@/lib/ai/types";

import { BrandMark } from "../ui/BrandMark";
import { ErrorScreen } from "./ErrorScreen";
import { GiveUpScreen } from "./GiveUpScreen";
import { GuessReveal } from "./GuessReveal";
import { HistoryDrawer } from "./HistoryDrawer";
import { HomeScreen } from "./HomeScreen";
import { HowToPlayModal, RestartModal, SettingsModal } from "./InfoModals";
import { QuestionScreen } from "./QuestionScreen";
import { WinScreen } from "./WinScreen";

type OpenDialog = "how" | "settings" | "history" | "restart" | null;

type PendingTurn = {
  turn: TurnToken;
  request: TurnRequest;
};

function freshGameId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `game-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function memoryFromResponse(response: GameAIResponse): AIMemory {
  return {
    summary: response.memorySummary,
    candidateHypotheses:
      response.type === "give_up" ? [] : response.candidateHypotheses,
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

export function GameShell() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createIdleState());
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const pendingTurnRef = useRef<PendingTurn | null>(null);
  const restoredGameIdRef = useRef<string | null | undefined>(undefined);

  const closeDialog = useCallback(() => setOpenDialog(null), []);

  useEffect(() => {
    if (!hydrated || restoredGameIdRef.current !== undefined) return;
    const savedState = loadGameState();
    restoredGameIdRef.current = savedState?.gameId ?? null;
    if (savedState) dispatch({ type: "HYDRATE", state: savedState });
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || restoredGameIdRef.current === undefined) return;
    if (
      restoredGameIdRef.current !== null &&
      state.gameId !== restoredGameIdRef.current
    ) {
      return;
    }
    restoredGameIdRef.current = null;
    saveGameState(state);
  }, [hydrated, state]);

  const cancelActiveTurn = useCallback(() => {
    requestSequenceRef.current += 1;
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    requestInFlightRef.current = false;
  }, []);

  useEffect(() => cancelActiveTurn, [cancelActiveTurn]);

  const runTurn = useCallback(async (pending: PendingTurn) => {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    pendingTurnRef.current = pending;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    const controller = new AbortController();
    activeControllerRef.current = controller;
    let didTimeOut = false;

    const timeout = window.setTimeout(() => {
      didTimeOut = true;
      controller.abort();
    }, 30_000);

    try {
      const response = await fetch("/api/game/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.request),
        signal: controller.signal,
      });

      let body: GameAIResponse | APIErrorBody | null = null;
      try {
        body = (await response.json()) as GameAIResponse | APIErrorBody;
      } catch {
        body = null;
      }

      if (requestSequence !== requestSequenceRef.current) return;

      if (!response.ok || !body || "error" in body) {
        const errorBody = body && "error" in body ? body.error : null;
        dispatch({
          type: "AI_ERROR",
          turn: pending.turn,
          error: {
            code: errorBody?.code ?? "NETWORK_ERROR",
            message:
              errorBody?.message ??
              "The oracle could not reach its deduction engine. Your answers are still safe.",
            retryable: true,
          },
        });
        return;
      }

      const aiMemory = memoryFromResponse(body);
      if (body.type === "question") {
        dispatch({
          type: "AI_QUESTION",
          turn: pending.turn,
          question: { questionId: body.questionId, question: body.question },
          confidence: body.confidence,
          aiMemory,
        });
      } else if (body.type === "guess") {
        dispatch({
          type: "AI_GUESS",
          turn: pending.turn,
          guess: { name: body.name, confidence: body.confidence },
          aiMemory,
        });
      } else {
        dispatch({
          type: "AI_GIVE_UP",
          turn: pending.turn,
          message: body.message,
          confidence: body.confidence,
          aiMemory,
        });
      }
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return;
      const wasCancelled = controller.signal.aborted && !didTimeOut;
      if (wasCancelled) return;

      dispatch({
        type: "AI_ERROR",
        turn: pending.turn,
        error: {
          code: didTimeOut ? "NETWORK_ERROR" : "AI_UNAVAILABLE",
          message: didTimeOut
            ? "The deduction engine took too long to answer. Try the same turn again."
            : error instanceof TypeError
              ? "The oracle could not reach the server. Check your connection and try again."
              : "The deduction engine could not complete this turn.",
          retryable: true,
        },
      });
    } finally {
      window.clearTimeout(timeout);
      if (requestSequence === requestSequenceRef.current) {
        requestInFlightRef.current = false;
        activeControllerRef.current = null;
      }
    }
  }, []);

  const makePendingTurn = useCallback(
    (
      history: GameAnswer[],
      rejectedGuesses: string[],
      aiMemory: AIMemory,
      turnReason: TurnReason,
      turnId: number,
      gameId = state.gameId,
    ): PendingTurn => ({
      turn: { gameId, turnId },
      request: {
        gameId,
        questionNumber: history.length,
        history,
        rejectedGuesses,
        aiMemory,
        turnReason,
      },
    }),
    [state.gameId],
  );

  const handleAnswer = useCallback(
    (answer: AnswerType) => {
      if (
        requestInFlightRef.current ||
        state.status !== "question" ||
        !state.currentQuestion
      ) {
        return;
      }

      const timestamp = Date.now();
      const completedAnswer: GameAnswer = {
        ...state.currentQuestion,
        answer,
        timestamp,
      };
      const history = [...state.history, completedAnswer];
      const pending = makePendingTurn(
        history,
        state.rejectedGuesses,
        state.aiMemory,
        "answer",
        state.turnId + 1,
      );

      dispatch({ type: "ANSWER", answer, timestamp });
      void runTurn(pending);
    }, [makePendingTurn, runTurn, state],
  );

  const handleRejectGuess = useCallback(() => {
    if (requestInFlightRef.current || state.status !== "guessing" || !state.currentGuess) {
      return;
    }

    const rejectedGuesses = [...state.rejectedGuesses, state.currentGuess.name];
    const pending = makePendingTurn(
      state.history,
      rejectedGuesses,
      state.aiMemory,
      "rejected_guess",
      state.turnId + 1,
    );

    dispatch({ type: "REJECT_GUESS" });
    void runTurn(pending);
  }, [makePendingTurn, runTurn, state]);

  const handleRetry = useCallback(() => {
    if (requestInFlightRef.current || state.status !== "error" || state.history.length === 0) {
      return;
    }

    const reason = state.turnReason ?? pendingTurnRef.current?.request.turnReason ?? "answer";
    const pending = makePendingTurn(
      state.history,
      state.rejectedGuesses,
      state.aiMemory,
      reason,
      state.turnId + 1,
    );
    dispatch({ type: "RETRY" });
    void runTurn(pending);
  }, [makePendingTurn, runTurn, state]);

  const handleUndo = useCallback(() => {
    if (state.checkpoints.length === 0) return;
    cancelActiveTurn();
    dispatch({ type: "UNDO" });
  }, [cancelActiveTurn, state.checkpoints.length]);

  const returnHome = useCallback(() => {
    cancelActiveTurn();
    clearSavedGame();
    dispatch({ type: "RESTART_GAME", gameId: freshGameId(), createdAt: Date.now() });
    closeDialog();
  }, [cancelActiveTurn, closeDialog]);

  const startFreshGame = useCallback(() => {
    cancelActiveTurn();
    clearSavedGame();
    const identity = { gameId: freshGameId(), createdAt: Date.now() };
    dispatch({ type: "RESTART_GAME", ...identity });
    dispatch({ type: "START_GAME" });
    closeDialog();
  }, [cancelActiveTurn, closeDialog]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialog || isTypingTarget(event.target)) return;

      if (event.key === "Backspace" && state.status === "question" && state.checkpoints.length > 0) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (state.status !== "question") return;
      const shortcuts: Record<string, AnswerType> = {
        y: "yes",
        n: "no",
        p: "probably",
        o: "probably_not",
        d: "unknown",
        u: "unknown",
      };
      const answer = shortcuts[event.key.toLocaleLowerCase("en-US")];
      if (answer) {
        event.preventDefault();
        handleAnswer(answer);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAnswer, handleUndo, openDialog, state.checkpoints.length, state.status]);

  const renderGame = () => {
    switch (state.status) {
      case "idle":
        return <HomeScreen onStart={() => dispatch({ type: "START_GAME" })} onHowToPlay={() => setOpenDialog("how")} />;
      case "question":
      case "thinking":
        return (
          <QuestionScreen
            questionNumber={state.questionNumber}
            question={state.currentQuestion?.question ?? null}
            confidence={state.confidence}
            thinking={state.status === "thinking"}
            canUndo={state.checkpoints.length > 0}
            onAnswer={handleAnswer}
            onUndo={handleUndo}
            onHistory={() => setOpenDialog("history")}
            onRestart={() => setOpenDialog("restart")}
          />
        );
      case "guessing":
        return state.currentGuess ? (
          <GuessReveal
            name={state.currentGuess.name}
            confidence={state.currentGuess.confidence}
            onAccept={() => dispatch({ type: "ACCEPT_GUESS" })}
            onReject={handleRejectGuess}
          />
        ) : null;
      case "won":
        return state.currentGuess ? (
          <WinScreen
            name={state.currentGuess.name}
            questionsAsked={state.history.length}
            guessesAttempted={state.rejectedGuesses.length + 1}
            onPlayAgain={startFreshGame}
            onHistory={() => setOpenDialog("history")}
          />
        ) : null;
      case "gave_up":
        return (
          <GiveUpScreen
            message={state.giveUpMessage ?? undefined}
            submittedName={state.localReveal?.name ?? null}
            onSubmitName={(name) => dispatch({ type: "SUBMIT_REVEAL", name, timestamp: Date.now() })}
            onPlayAgain={startFreshGame}
          />
        );
      case "error":
        return (
          <ErrorScreen
            message={state.error?.message}
            onRetry={handleRetry}
            onHome={returnHome}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="game-root">
      <header className="site-header">
        <button type="button" className="text-left" onClick={state.status === "idle" ? undefined : returnHome} aria-label={state.status === "idle" ? brand.name : "Return to Veyra home"}>
          <BrandMark compact={state.status !== "idle"} />
        </button>
        <nav className="flex items-center gap-0.5" aria-label="Help and settings">
          <button type="button" className="header-link" onClick={() => setOpenDialog("how")}>
            <BookOpen size={15} />
            <span className="hidden sm:inline">How to play</span>
          </button>
          <button type="button" className="header-link" onClick={() => setOpenDialog("settings")}>
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </nav>
      </header>

      <div className="page-stage">{hydrated ? renderGame() : <div className="text-xs uppercase tracking-[0.2em] text-white/26">Waking the oracle…</div>}</div>

      <HowToPlayModal open={openDialog === "how"} onClose={closeDialog} />
      <SettingsModal open={openDialog === "settings"} onClose={closeDialog} />
      <HistoryDrawer answers={state.history} open={openDialog === "history"} onClose={closeDialog} />
      <RestartModal open={openDialog === "restart"} onClose={closeDialog} onConfirm={startFreshGame} />
    </main>
  );
}
