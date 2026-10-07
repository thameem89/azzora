import { createContext, useContext, useState, type ReactNode } from "react";
import type { Database } from "./domain/model";
import { localRepository } from "./domain/repository";
import { seed } from "./domain/seed";
interface Store {
  db: Database;
  mutate: (fn: (db: Database) => void, message?: string) => boolean;
  toast: string;
  error: string;
  clear: () => void;
  reset: () => void;
}
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [error, setError] = useState("");
  const [db, setDb] = useState<Database>(() => {
    try {
      return localRepository.load();
    } catch (e) {
      setError(String(e));
      return seed();
    }
  });
  const [toast, setToast] = useState("");
  function mutate(
    fn: (db: Database) => void,
    message = "Changes saved to this browser",
  ) {
    try {
      const next = structuredClone(db);
      fn(next);
      localRepository.save(next);
      setDb(next);
      setError("");
      setToast(message);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }
  return (
    <Context.Provider
      value={{
        db,
        mutate,
        toast,
        error,
        clear: () => {
          setToast("");
          setError("");
        },
        reset: () => mutate((d) => Object.assign(d, seed()), "Demo data reset"),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw Error("Store unavailable");
  return store;
}
