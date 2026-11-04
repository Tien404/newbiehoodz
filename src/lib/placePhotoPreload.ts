/** Shared, bounded image-cache warmup. Importing this module performs no requests. */
type Connection = { saveData?: boolean; effectiveType?: string };
type Job = { source: string; users: Set<symbol>; image?: HTMLImageElement };
const jobs = new Map<string, Job>();
const cached = new Map<string, true>();
const failed = new Map<string, number>();
let active = 0;
let listening = false;

export function canPreloadPlacePhotos() {
  if (typeof window === "undefined" || document.hidden) return false;
  const connection = (navigator as Navigator & { connection?: Connection })
    .connection;
  return (
    !connection?.saveData &&
    !["slow-2g", "2g"].includes(connection?.effectiveType ?? "")
  );
}

export function markPlacePhotoLoaded(source: string) {
  cached.delete(source);
  cached.set(source, true);
  if (cached.size > 256) cached.delete(cached.keys().next().value!);
  failed.delete(source);
}

function drain() {
  if (!canPreloadPlacePhotos()) return;
  for (const [source, job] of jobs) {
    if (active >= 2) break;
    if (job.image) continue;
    if (!job.users.size || cached.has(source)) {
      jobs.delete(source);
      continue;
    }
    const image = new window.Image();
    job.image = image;
    active++;
    image.decoding = "async";
    image.fetchPriority = "low";
    let finished = false;
    const finish = (success: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      active--;
      jobs.delete(source);
      if (success) markPlacePhotoLoaded(source);
      else {
        image.removeAttribute("src");
        failed.set(source, Date.now());
        if (failed.size > 128) failed.delete(failed.keys().next().value!);
      }
      drain();
    };
    const timeout = setTimeout(() => finish(false), 10000);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = source;
  }
}

/** Returns a release function: abandon queued work, let at most two active loads finish. */
export function preloadPlacePhotos(sources: readonly string[]) {
  if (!canPreloadPlacePhotos()) return () => {};
  if (!listening) {
    document.addEventListener("visibilitychange", drain);
    listening = true;
  }
  const user = Symbol();
  const subscribed: Job[] = [];
  for (const source of new Set(sources)) {
    if (cached.has(source) || Date.now() - (failed.get(source) ?? 0) < 30000)
      continue;
    let job = jobs.get(source);
    if (!job) {
      job = { source, users: new Set() };
      jobs.set(source, job);
    }
    job.users.add(user);
    subscribed.push(job);
  }
  drain();
  return () => {
    for (const job of subscribed) {
      job.users.delete(user);
      if (!job.users.size && !job.image && jobs.get(job.source) === job)
        jobs.delete(job.source);
    }
  };
}
