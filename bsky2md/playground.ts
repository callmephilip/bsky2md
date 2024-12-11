// 🦕 AUTOGENERATED! DO NOT EDIT! File to edit: playground.ipynb

import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.html(`
    <html>
      <head>
        <title>Hello Hono</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #ffffff;
          }
        </style>
      </head>
      <body><strong>Hello Hono!</strong></body>
    </html>  
  `);
});

Deno.serve(app.fetch);
