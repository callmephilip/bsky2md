import { assert } from "jsr:@std/assert";
import { app } from "bsky2md/server.ts";

Deno.test("app", () => {
  assert(app);
});
