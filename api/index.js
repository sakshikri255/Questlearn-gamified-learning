// Vercel serverless entrypoint for the QuestLearn Express backend.
// Vercel treats files in the root /api/ directory as serverless function handlers.
// This file imports the Express app and exports it — Vercel calls it on each request.
// app.listen() is NOT called here; Vercel manages the HTTP lifecycle.
module.exports = require("../backend/server.js");
