// Bridge Pi's native blocking UI prompt events to Herdr's Pi state integration.
// Remove this when Herdr's managed Pi integration handles ui_prompt_start/end itself.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function herdrPiPromptBlocked(pi: ExtensionAPI) {
  if (process.env.HERDR_ENV !== "1") return;

  let tuiSession = false;
  let promptActive = false;

  function clearBlockedPrompt() {
    if (!promptActive) return;
    promptActive = false;
    pi.events.emit("herdr:blocked", { active: false });
  }

  pi.on("session_start", (_event, ctx) => {
    clearBlockedPrompt();
    tuiSession = ctx.mode === "tui";
  });

  pi.on("ui_prompt_start", (event, ctx) => {
    if (!tuiSession || ctx.mode !== "tui" || promptActive) return;
    promptActive = true;
    pi.events.emit("herdr:blocked", {
      active: true,
      label: event.title ?? "Waiting for input",
    });
  });

  pi.on("ui_prompt_end", (_event, ctx) => {
    if (tuiSession && ctx.mode === "tui") clearBlockedPrompt();
  });

  pi.on("session_shutdown", () => {
    clearBlockedPrompt();
    tuiSession = false;
  });
}
