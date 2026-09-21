const router = require("express").Router();
const pool = require("../db");

router.get("/members", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM members ORDER BY name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/members/activity", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM member_activity_view ORDER BY name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/members", async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    await pool.query("INSERT INTO members (name, email, phone) VALUES (?, ?, ?)", [
      name,
      email,
      phone,
    ]);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
