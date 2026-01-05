import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Idea } from '../types';

interface SparkGardenDB extends DBSchema {
  ideas: {
    key: string;
    value: Idea;
  };
}

const DB_NAME = 'SparkGardenDB';
const STORE_NAME = 'ideas';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SparkGardenDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<SparkGardenDB>(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const getAllIdeas = async (): Promise<Idea[]> => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const saveIdea = async (idea: Idea): Promise<void> => {
  const db = await initDB();
  await db.put(STORE_NAME, idea);
};

export const saveAllIdeas = async (ideas: Idea[]): Promise<void> => {
  if (ideas.length === 0) return;
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    ...ideas.map(idea => tx.store.put(idea)),
    tx.done
  ]);
};

// Migration helper: Moves data from localStorage to IDB if IDB is empty
export const migrateFromLocalStorage = async (): Promise<boolean> => {
  try {
    const db = await initDB();
    const count = await db.count(STORE_NAME);
    
    // Only migrate if DB is empty to avoid overwriting new data
    if (count === 0) {
      const lsData = localStorage.getItem('sparkgarden_ideas_v2');
      if (lsData) {
        const ideas = JSON.parse(lsData);
        if (Array.isArray(ideas) && ideas.length > 0) {
          console.log("Migrating data from localStorage to IndexedDB...");
          await saveAllIdeas(ideas);
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    console.error("Migration failed:", e);
    return false;
  }
};
