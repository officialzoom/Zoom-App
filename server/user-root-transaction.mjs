import { HttpError } from "./http.mjs";

const NULL_RETRY_DELAYS_MS = [50, 100, 200];

export async function transactUserRootWithNullRetry(
  userRef,
  update,
  {
    retryDelaysMs = NULL_RETRY_DELAYS_MS,
    delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  let retryCount = 0;
  while (true) {
    let callbackSawMissing = false;
    const result = await userRef.transaction((current) => {
      callbackSawMissing = current == null;
      if (callbackSawMissing) return;
      return update(current);
    }, undefined, false);

    if (result.committed || !callbackSawMissing) return result;

    const current = await userRef.get();
    if (!current.exists()) return result;
    if (retryCount >= retryDelaysMs.length) {
      console.warn("Firebase user-root transaction retry limit reached.", {
        attempts: retryCount + 1,
      });
      throw new HttpError(
        409,
        "The account profile exists, but its wallet transaction could not be initialized. Refresh and try again.",
      );
    }

    if (retryCount === 0) {
      console.warn("Firebase user-root transaction received null while the profile exists; retrying.");
    }
    await delay(retryDelaysMs[retryCount]);
    retryCount += 1;
  }
}
