import { app } from "bsky2md/server.ts";

Deno.serve(app.fetch);
