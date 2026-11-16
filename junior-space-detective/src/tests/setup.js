import "@testing-library/jest-dom/vitest";

// jsdom defines window.scrollTo but throws "Not implemented"; components call it
// on navigation, so replace it with a no-op for tests.
if (typeof window !== "undefined") {
  window.scrollTo = () => {};
}
