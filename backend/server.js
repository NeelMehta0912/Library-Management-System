// server.js
// Entry point for the Library Management System API.
// This is the layer that replaces "call Supabase directly from the
// browser" — the browser now calls this API, and this API is the only
// thing that ever talks to MySQL.

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const dashboardRouter = require("./routes/dashboard");
const lookupsRouter = require("./routes/lookups");
const booksRouter = require("./routes/books");
const membersRouter = require("./routes/members");
const issuesRouter = require("./routes/issues");
const reportsRouter = require("./routes/reports");

const app = express();

// ALLOWED_ORIGIN should be your frontend's Railway public domain, e.g.
// https://library-frontend-production.up.railway.app — set it in this
// service's Variables tab. Falls back to "*" (open) so local dev just works.
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, service: "library-api" });
});

app.use("/api/dashboard", dashboardRouter);
app.use("/api", lookupsRouter);       // /api/authors, /api/categories
app.use("/api/books", booksRouter);   // /api/books, /api/books/available
app.use("/api", membersRouter);       // /api/members, /api/members/activity
app.use("/api/issues", issuesRouter); // /api/issues/active, /api/issues, /api/issues/:id/return
app.use("/api/reports", reportsRouter);

// Central error handler. MySQL errors from SIGNAL (our trigger) land in
// err.sqlMessage — that's what surfaces in the frontend's flash message.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.sqlMessage || err.message || "Something went wrong on the server.",
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Library API listening on port ${PORT}`);
});
