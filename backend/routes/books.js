const router = require("express").Router();
const pool = require("../db");

// Full catalogue for books.html — author/category names pre-joined
// (mirrors what the old Supabase nested select gave the frontend).
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.book_id, b.title, b.price, b.total_copies, b.available_copies,
             a.author_name, c.category_name
      FROM books b
      JOIN authors a ON b.author_id = a.author_id
      JOIN categories c ON b.category_id = c.category_id
      ORDER BY b.title
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Only books with copies left — used to populate the issue.html dropdown.
router.get("/available", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM available_books_view ORDER BY title");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, author_id, category_id, copies, price } = req.body;
    await pool.query(
      "INSERT INTO books (title, author_id, category_id, total_copies, available_copies, price) VALUES (?, ?, ?, ?, ?, ?)",
      [title, author_id, category_id, copies, copies, price]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
