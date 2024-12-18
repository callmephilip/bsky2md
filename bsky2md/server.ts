// 🦕 AUTOGENERATED! DO NOT EDIT! File to edit: server.ipynb

import { Hono } from "hono";
import { downloadPostToMd } from "bsky2md/bsky.ts";
export const app = new Hono();

const Layout = ({ children }: { children: string }) => `
  <html>
  <head>
    <meta charset="UTF-8">
    <title>bsky2md</title>
    <link rel="stylesheet" href="https://unpkg.com/blocks.css/dist/blocks.min.css" />
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <style>
      body { padding: 20px; background-color: #ffffff; }
    </style>
  </head>
  <body>
    ${children}
  </body>
  </html>
`;

app.get("/", (c) => {
  return c.html(
    Layout({
      children: `
      <h1>bsky2md - new stuff</h1>
      <input hx-post="/convert" name="url" hx-target="#result" type="text" class="block" placeholder="Enter URL" />
      <div id="result"></div>
    `,
    }),
  );
});

app.post("/convert", async (c) => {
  // get the URL from the form
  // const url = c.req.body.url;
  const d = (await c.req.formData()).get("url");

  if (!d) {
    return c.html("<h1>URL is required</h1>");
  }
  const md = await downloadPostToMd(d.toString());
  return c.html(`<code>${md.replace(/\n/g, "<br>")}</code>`);
});
