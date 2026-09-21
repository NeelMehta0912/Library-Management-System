const router = require("express").Router();
const pool = require("../db");

// Every report procedure's last statement is a SELECT, so CALLing it
// returns that result set as result[0].
async function callProc(procName) {
  const [result] = await pool.query(`CALL ${procName}()`);
  return result[0];
}

router.get("/members-above-average", async (req, res, next) => {
  try {
    res.json(await callProc("members_above_average_borrowers"));
  } catch (err) {
    next(err);
  }
});

router.get("/books-never-issued", async (req, res, next) => {
  try {
    res.json(await callProc("books_never_issued"));
  } catch (err) {
    next(err);
  }
});

router.get("/most-expensive-per-category", async (req, res, next) => {
  try {
    res.json(await callProc("most_expensive_per_category"));
  } catch (err) {
    next(err);
  }
});

router.get("/book-popularity", async (req, res, next) => {
  try {
    res.json(await callProc("book_popularity_ranking"));
  } catch (err) {
    next(err);
  }
});

router.get("/paying-members", async (req, res, next) => {
  try {
    res.json(await callProc("paying_members"));
  } catch (err) {
    next(err);
  }
});

router.get("/category-tree", async (req, res, next) => {
  try {
    res.json(await callProc("category_tree"));
  } catch (err) {
    next(err);
  }
});

router.get("/monthly-issues", async (req, res, next) => {
  try {
    res.json(await callProc("monthly_issues"));
  } catch (err) {
    next(err);
  }
});

router.get("/overdue", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM overdue_books_view ORDER BY days_overdue DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
