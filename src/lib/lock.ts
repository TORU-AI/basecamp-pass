// Smart lock adapter. The demo has no physical lock, so unlocking is shown on the door screen.
// Swap this for a SwitchBot / SESAME API call without touching the access decision.
export async function unlockDoor(): Promise<{ mode: "simulated" }> {
  return { mode: "simulated" };
}
