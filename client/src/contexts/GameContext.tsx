import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface GameContextValue {
  gameId: string | null;
  playerId: string | null;
  gameCode: string | null;
  setGameSession: (gameId: string, playerId: string, code: string) => void;
  clearGameSession: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string | null>(null);

  const setGameSession = useCallback((id: string, pid: string, code: string) => {
    setGameId(id);
    setPlayerId(pid);
    setGameCode(code);
  }, []);

  const clearGameSession = useCallback(() => {
    setGameId(null);
    setPlayerId(null);
    setGameCode(null);
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
