import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface GameContextValue {
  gameId: string | null;
  playerId: string | null;
  gameCode: string | null;
  setGameSession: (gameId: string, playerId: string, code: string) => void;
  clearGameSession: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const SESSION_KEY = "climate-capital-session";

interface StoredSession {
  gameId: string;
  playerId: string;
  gameCode: string;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.gameId || !parsed.playerId || !parsed.gameCode) return null;
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(readStoredSession);
  const [gameId, setGameId] = useState<string | null>(initialSession?.gameId ?? null);
  const [playerId, setPlayerId] = useState<string | null>(initialSession?.playerId ?? null);
  const [gameCode, setGameCode] = useState<string | null>(initialSession?.gameCode ?? null);

  const setGameSession = useCallback((id: string, pid: string, code: string) => {
    setGameId(id);
    setPlayerId(pid);
    setGameCode(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ gameId: id, playerId: pid, gameCode: code }),
      );
    }
  }, []);

  const clearGameSession = useCallback(() => {
    setGameId(null);
    setPlayerId(null);
    setGameCode(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  return (
    <GameContext.Provider value={{ gameId, playerId, gameCode, setGameSession, clearGameSession }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
