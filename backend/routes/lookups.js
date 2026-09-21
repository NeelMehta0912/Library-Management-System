const router = require("express").Router();
const pool = require("../db");

router.get("/categories", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories ORDER BY category_name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/authors", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM authors ORDER BY author_name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
