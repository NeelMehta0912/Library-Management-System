const router = require("express").Router();
const pool = require("../db");

router.get("/stats", async (req, res, next) => {
  try {
    const [[booksAgg]] = await pool.query(
      "SELECT COALESCE(SUM(total_copies),0) AS totalCopies, COALESCE(SUM(available_copies),0) AS availableCopies FROM books"
    );
    const [[{ totalMembers }]] = await pool.query(
      "SELECT COUNT(*) AS totalMembers FROM members"
    );
    const [[{ currentlyIssued }]] = await pool.query(
      "SELECT COUNT(*) AS currentlyIssued FROM issue_records WHERE return_date IS NULL"
    );
    const [[{ overdueCount }]] = await pool.query(
      "SELECT COUNT(*) AS overdueCount FROM overdue_books_view"
    );

    res.json({
      totalCopies: Number(booksAgg.totalCopies),
      availableCopies: Number(booksAgg.availableCopies),
      totalMembers,
      currentlyIssued,
      overdueCount,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
