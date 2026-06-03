import { db } from "./db";
import { DatabaseStorage } from "./storage";

export const storage = new DatabaseStorage(db);
