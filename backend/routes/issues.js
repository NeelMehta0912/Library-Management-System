const router = require("express").Router();
const pool = require("../db");

// Currently-issued books (return_date IS NULL) with book/member names
// joined in, for issue.html's "active issues" table.
router.get("/active", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT ir.issue_id, ir.issue_date, ir.due_date,
             b.title AS book_title, m.name AS member_name
      FROM issue_records ir
      JOIN books b ON ir.book_id = b.book_id
      JOIN members m ON ir.member_id = m.member_id
      WHERE ir.return_date IS NULL
      ORDER BY ir.due_date
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Issue a book. Calls the issue_book() stored procedure, which is what
// trg_before_issue / trg_after_issue actually fire on.
router.post("/", async (req, res, next) => {
  try {
    const { book_id, member_id, days = 14 } = req.body;
    const [result] = await pool.query("CALL issue_book(?, ?, ?)", [book_id, member_id, days]);
    // result[0] is the SELECT's result set, result[0][0] is the one row.
    res.status(201).json(result[0][0]);
  } catch (err) {
    next(err);
  }
});

// Return a book. Calls return_book(), which is what trg_before_return /
// trg_after_return fire on (fine calculation + copy restock).
router.post("/:id/return", async (req, res, next) => {
  try {
    const [result] = await pool.query("CALL return_book(?)", [req.params.id]);
    res.json(result[0][0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
