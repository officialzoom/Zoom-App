import {
  ref,
  get,
  set,
  update,
  remove,
  push,
  type Database,
  type DatabaseReference,
} from "firebase/database";

export interface DataReference {
  readonly kind: "document" | "collection";
  readonly nativeRef: DatabaseReference;
  readonly orderByField?: string;
  readonly id: string;
}

export interface DataDocumentSnapshot {
  readonly id: string;
  exists(): boolean;
  data(): Record<string, any> | undefined;
}

export interface DataQuerySnapshot {
  readonly docs: DataDocumentSnapshot[];
  readonly size: number;
  readonly empty: boolean;
  forEach(callback: (document: DataDocumentSnapshot) => void): void;
}

export function doc(database: Database, ...segments: string[]): DataReference {
  const nativeRef = ref(database, segments.join("/"));
  return { kind: "document", nativeRef, id: nativeRef.key ?? "" };
}

export function collection(database: Database, ...segments: string[]): DataReference {
  const nativeRef = ref(database, segments.join("/"));
  return { kind: "collection", nativeRef, id: nativeRef.key ?? "" };
}

export function orderBy(field: string) {
  return { kind: "orderBy" as const, field };
}

export function query(reference: DataReference, ...constraints: Array<{ kind: "orderBy"; field: string }>): DataReference {
  const ordering = constraints.find((constraint) => constraint.kind === "orderBy");
  return { ...reference, orderByField: ordering?.field };
}

export async function getDoc(reference: DataReference): Promise<DataDocumentSnapshot> {
  const snapshot = await get(reference.nativeRef);
  const value = snapshot.val();
  return {
    id: reference.id,
    exists: () => snapshot.exists(),
    data: () => snapshot.exists() && value && typeof value === "object" ? value : undefined,
  };
}

export async function getDocs(reference: DataReference): Promise<DataQuerySnapshot> {
  const snapshot = await get(reference.nativeRef);
  const value = snapshot.val();
  const entries: Array<[string, any]> = value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value)
    : [];
  const field = reference.orderByField;

  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (!field || field === "__name__") return leftKey.localeCompare(rightKey);
    const left = leftValue?.[field];
    const right = rightValue?.[field];
    if (left === right) return leftKey.localeCompare(rightKey);
    if (left == null) return -1;
    if (right == null) return 1;
    return left < right ? -1 : 1;
  });

  const docs = entries.map(([id, data]) => ({
    id,
    exists: () => true,
    data: () => data && typeof data === "object" ? data : {},
  }));

  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (callback) => docs.forEach(callback),
  };
}

export async function setDoc(
  reference: DataReference,
  value: Record<string, unknown>,
  options?: { merge?: boolean },
): Promise<void> {
  if (options?.merge) {
    await update(reference.nativeRef, removeUndefined(value));
    return;
  }
  await set(reference.nativeRef, removeUndefined(value));
}

export async function updateDoc(reference: DataReference, value: Record<string, unknown>): Promise<void> {
  await update(reference.nativeRef, removeUndefined(value));
}

export async function deleteDoc(reference: DataReference): Promise<void> {
  await remove(reference.nativeRef);
}

export async function addDoc(
  reference: DataReference,
  value: Record<string, unknown>,
): Promise<{ id: string }> {
  const newRef = push(reference.nativeRef);
  if (!newRef.key) throw new Error("Realtime Database could not allocate a record ID.");
  await set(newRef, removeUndefined(value));
  return { id: newRef.key };
}

function removeUndefined(value: any): any {
  if (Array.isArray(value)) {
    return value.map(removeUndefined).filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) result[key] = removeUndefined(child);
  }
  return result;
}
