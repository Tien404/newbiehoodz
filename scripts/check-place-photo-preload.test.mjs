import assert from "node:assert/strict";
import test from "node:test";
let instance = 0;
async function fixture(run) {
  const previous = Object.fromEntries(
    ["window", "document", "navigator"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const images = [];
  class Image {
    onload = null;
    onerror = null;
    source = "";
    set src(value) {
      this.source = value;
      images.push(this);
    }
    get src() {
      return this.source;
    }
    removeAttribute() {
      this.source = "";
    }
  }
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { Image },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false, addEventListener() {} },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { connection: { saveData: false, effectiveType: "4g" } },
  });
  try {
    const api = await import(
      `../src/lib/placePhotoPreload.ts?test=${instance++}`
    );
    await run(api, images);
  } finally {
    // Complete remaining fake requests so timeout handles cannot keep the test process alive.
    for (const image of images) image.onload?.();
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test("place warmup is idle on import and respects Data Saver, 2g and hidden tabs", () =>
  fixture((api, images) => {
    assert.equal(images.length, 0);
    navigator.connection.saveData = true;
    api.preloadPlacePhotos(["a"]);
    assert.equal(images.length, 0);
    navigator.connection.saveData = false;
    navigator.connection.effectiveType = "2g";
    api.preloadPlacePhotos(["a"]);
    assert.equal(images.length, 0);
    navigator.connection.effectiveType = "4g";
    document.hidden = true;
    api.preloadPlacePhotos(["a"]);
    assert.equal(images.length, 0);
    document.hidden = false;
    api.preloadPlacePhotos(["a"]);
    assert.equal(images.length, 1);
    assert.equal(images[0].fetchPriority, "low");
  }));

test("place warmup deduplicates, limits active loads and releases irrelevant queued work", () =>
  fixture((api, images) => {
    const releaseFirst = api.preloadPlacePhotos(["a", "a", "b", "c"]);
    const releaseSecond = api.preloadPlacePhotos(["a", "d"]);
    assert.deepEqual(
      images.map((image) => image.src),
      ["a", "b"],
    );
    releaseFirst();
    images[0].onload();
    assert.deepEqual(
      images.map((image) => image.src),
      ["a", "b", "d"],
    );
    images[1].onload();
    images[2].onload();
    releaseSecond();
    api.preloadPlacePhotos(["a", "b", "d"]);
    assert.equal(images.length, 3);
  }));

test("displayed covers are reused and failed speculative images have a retry cooldown", (t) =>
  fixture((api, images) => {
    let now = 100000;
    t.mock.method(Date, "now", () => now);
    api.markPlacePhotoLoaded("cover");
    api.preloadPlacePhotos(["cover", "next"]);
    assert.equal(images.length, 1);
    images[0].onerror();
    api.preloadPlacePhotos(["next"]);
    assert.equal(images.length, 1);
    now += 31000;
    api.preloadPlacePhotos(["next"]);
    assert.equal(images.length, 2);
    images[1].onload();
    api.preloadPlacePhotos(["next"]);
    assert.equal(images.length, 2);
  }));
