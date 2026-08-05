import { h, render } from "preact";
import { App } from "./App";

// Entry point: mount the Preact app into #app. try/catch keeps the error
// visible in the main-process console instead of a silent blank screen.
console.log("[photobooth] index.tsx executing, #app =", document.getElementById("app"));

try {
  render(<App />, document.getElementById("app")!);
  console.log("[photobooth] render() completed");
} catch (err) {
  console.error("[photobooth] render() failed:", err);
}
