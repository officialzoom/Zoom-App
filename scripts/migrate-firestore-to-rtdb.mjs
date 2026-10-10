import { isDeepStrictEqual } from "node:util";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

const applyChanges = process.argv.includes("--apply");
const ROOT_COLLECTIONS = ["donationCampaigns", "donations", "notifications", "banned"];

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getApp() {
  const existing = getApps().find((app) => app.name === "firestore-rtdb-migration");
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: requiredEnvironment("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnvironment("FIREBASE_CLIENT_EMAIL"),
      privateKey: requiredEnvironment("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    databaseURL: requiredEnvironment("FIREBASE_DATABASE_URL"),
  }, "firestore-rtdb-migration");
}

function convertValue(value) {
  if (value == null || typeof value !== "object") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(convertValue);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, convertValue(child)]));
}

function validateKey(key, location) {
  if (!key || /[.#$\[\]/]/.test(key)) {
    throw new Error(`Firestore key cannot be used as a Realtime Database key at ${location}.`);
  }
}

function validateValueKeys(value, location) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => validateValueKeys(child, `${location}/${index}`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    validateKey(key, location);
    validateValueKeys(child, `${location}/${key}`);
  }
}

async function readDocumentTree(documentReference) {
  const snapshot = await documentReference.get();
  if (!snapshot.exists) return undefined;
  const value = convertValue(snapshot.data() ?? {});
  validateValueKeys(value, documentReference.path);
  for (const childCollection of await documentReference.listCollections()) {
    const childSnapshot = await childCollection.get();
    const children = {};
    for (const childDocument of childSnapshot.docs) {
      validateKey(childDocument.id, `${childCollection.path}/${childDocument.id}`);
      const childValue = await readDocumentTree(childDocument.ref);
      if (childValue !== undefined) children[childDocument.id] = childValue;
    }
    if (Object.hasOwn(value, childCollection.id) && Object.keys(children).length > 0) {
      throw new Error(`Document field conflicts with subcollection at ${documentReference.path}/${childCollection.id}.`);
    }
    if (Object.keys(children).length > 0) value[childCollection.id] = children;
  }
  return value;
}

async function readCollection(collectionReference, targetPath) {
  const snapshot = await collectionReference.get();
  const result = [];
  for (const document of snapshot.docs) {
    validateKey(document.id, `${collectionReference.path}/${document.id}`);
    const value = await readDocumentTree(document.ref);
    if (value !== undefined) result.push({ path: `${targetPath}/${document.id}`, value });
  }
  return result;
}

function mergeWithoutOverwriting(existing, source, path, conflicts) {
  if (existing === undefined) return source;
  if (isDeepStrictEqual(existing, source)) return existing;
  const existingIsObject = existing !== null && typeof existing === "object" && !Array.isArray(existing);
  const sourceIsObject = source !== null && typeof source === "object" && !Array.isArray(source);
  if (!existingIsObject || !sourceIsObject) {
    conflicts.push(path);
    return existing;
  }
  const merged = { ...existing };
  for (const [key, value] of Object.entries(source)) {
    merged[key] = Object.hasOwn(existing, key)
      ? mergeWithoutOverwriting(existing[key], value, `${path}/${key}`, conflicts)
      : value;
  }
  return merged;
}

async function main() {
  const app = getApp();
  const firestore = getFirestore(app);
  const database = getDatabase(app);
  const sources = await readCollection(firestore.collection("users"), "users");

  for (const collectionName of ROOT_COLLECTIONS) {
    sources.push(...await readCollection(firestore.collection(collectionName), collectionName));
  }

  const writes = [];
  const conflicts = [];
  for (const source of sources) {
    const current = (await database.ref(source.path).get()).val();
    const merged = mergeWithoutOverwriting(current ?? undefined, source.value, source.path, conflicts);
    if (!isDeepStrictEqual(current, merged)) writes.push({ ...source, value: merged });
  }

  console.log(`Firestore documents inspected: ${sources.length}.`);
  console.log(`Realtime Database documents that need changes: ${writes.length}.`);
  if (conflicts.length) {
    console.error(`Found ${conflicts.length} conflicting path(s); no data was written.`);
    for (const path of conflicts.slice(0, 50)) console.error(`- ${path}`);
    if (conflicts.length > 50) console.error(`- and ${conflicts.length - 50} more`);
    process.exitCode = 2;
    return;
  }
  if (!applyChanges) {
    console.log("Dry run only. Review the results, then rerun with --apply to copy data.");
    return;
  }

  for (const write of writes) {
    let finalConflicts = [];
    const result = await database.ref(write.path).transaction((current) => {
      finalConflicts = [];
      return mergeWithoutOverwriting(current ?? undefined, write.value, write.path, finalConflicts);
    }, undefined, false);
    if (finalConflicts.length || !result.committed) {
      console.error(`Stopped at ${write.path}; concurrent data now conflicts. Earlier documents, if any, were copied without overwriting.`);
      process.exitCode = 2;
      return;
    }
    console.log(`Copied ${write.path}.`);
  }
  await database.ref("system/migrations/firestore-to-rtdb").push().set({
    completedAt: Date.now(),
    source: "cloud-firestore",
    target: "firebase-realtime-database",
  });
  console.log("Migration copy completed. Firestore was not modified or deleted.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
});
