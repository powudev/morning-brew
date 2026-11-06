import { cleanup, seedFixtures } from "./db";

export default function globalSetup() {
  cleanup();
  seedFixtures();
  return () => cleanup();
}
