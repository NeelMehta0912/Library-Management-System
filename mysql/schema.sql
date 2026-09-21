-- =====================================================================
-- LIBRARY MANAGEMENT SYSTEM — DBMS CASE STUDY PROJECT
-- Demonstrates: Nested Subqueries | CTEs (incl. recursive) | Views | Triggers
-- Engine: MySQL 8.0+ (needed for window functions + WITH RECURSIVE)
--
-- Run this ENTIRE file once against your MySQL database, e.g.:
--   mysql -h HOST -P PORT -u USER -p DBNAME < schema.sql
-- or paste it into your provider's SQL console (Aiven, phpMyAdmin, etc.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. CLEAN SLATE (safe to re-run this whole file any time)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS available_books_view;
DROP VIEW IF EXISTS overdue_books_view;
DROP VIEW IF EXISTS member_activity_view;

DROP TRIGGER IF EXISTS trg_before_issue;
DROP TRIGGER IF EXISTS trg_after_issue;
DROP TRIGGER IF EXISTS trg_before_return;
DROP TRIGGER IF EXISTS trg_after_return;

DROP PROCEDURE IF EXISTS issue_book;
DROP PROCEDURE IF EXISTS return_book;
DROP PROCEDURE IF EXISTS members_above_average_borrowers;
DROP PROCEDURE IF EXISTS books_never_issued;
DROP PROCEDURE IF EXISTS most_expensive_per_category;
DROP PROCEDURE IF EXISTS book_popularity_ranking;
DROP PROCEDURE IF EXISTS paying_members;
DROP PROCEDURE IF EXISTS category_tree;
DROP PROCEDURE IF EXISTS monthly_issues;

DROP TABLE IF EXISTS issue_records;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS categories;

-- ---------------------------------------------------------------------
-- 1. BASE TABLES
-- ---------------------------------------------------------------------

-- categories is self-referencing (parent_id) so we can demonstrate a
-- RECURSIVE CTE walking the category tree (e.g. Computer Science ->
-- Algorithms -> Data Structures & Algorithms).
CREATE TABLE categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    parent_id     INT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
) ENGINE=InnoDB;

CREATE TABLE authors (
    author_id   INT AUTO_INCREMENT PRIMARY KEY,
    author_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE books (
    book_id          INT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(150) NOT NULL,
    author_id        INT NOT NULL,
    category_id      INT NOT NULL,
    total_copies     INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    price            DECIMAL(8,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (author_id) REFERENCES authors(author_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE=InnoDB;

CREATE TABLE members (
    member_id       INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    phone           VARCHAR(15),
    membership_date DATE NOT NULL DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB;

CREATE TABLE issue_records (
    issue_id     INT AUTO_INCREMENT PRIMARY KEY,
    book_id      INT NOT NULL,
    member_id    INT NOT NULL,
    issue_date   DATE NOT NULL DEFAULT (CURRENT_DATE),
    due_date     DATE NOT NULL,
    return_date  DATE NULL,
    fine_amount  DECIMAL(8,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    FOREIGN KEY (member_id) REFERENCES members(member_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. SAMPLE DATA  (inserted BEFORE the triggers exist, on purpose —
--    see the manual "catch-up" UPDATE at the end of this section)
-- ---------------------------------------------------------------------

INSERT INTO categories (category_name, parent_id) VALUES
('Computer Science', NULL),   -- 1
('Fiction', NULL),            -- 2
('Mathematics', NULL),        -- 3
('History', NULL),            -- 4
('Self-Help', NULL),          -- 5
('Algorithms', 1),            -- 6  (child of Computer Science)
('Databases', 1),             -- 7  (child of Computer Science)
('Dystopian', 2),             -- 8  (child of Fiction)
('Data Structures & Algorithms', 6); -- 9 (child of Algorithms, grandchild of CS)

INSERT INTO authors (author_name) VALUES
('Thomas H. Cormen'), ('George Orwell'), ('James Stewart'),
('Yuval Noah Harari'), ('James Clear'), ('Robert Sedgewick');

INSERT INTO books (title, author_id, category_id, total_copies, available_copies, price) VALUES
('Introduction to Algorithms', 1, 9, 4, 4, 899.00),
('1984', 2, 8, 3, 3, 299.00),
('Calculus: Early Transcendentals', 3, 3, 2, 2, 799.00),
('Sapiens', 4, 4, 5, 5, 499.00),
('Atomic Habits', 5, 5, 6, 6, 399.00),
('Algorithms in Java', 6, 6, 2, 2, 699.00),
('Animal Farm', 2, 8, 3, 3, 199.00),
('Database System Concepts', 1, 7, 3, 3, 749.00);

INSERT INTO members (name, email, phone, membership_date) VALUES
('Aarav Shah', 'aarav.shah@mail.com', '9876543210', '2025-01-10'),
('Diya Mehta', 'diya.mehta@mail.com', '9876543211', '2025-02-15'),
('Karan Verma', 'karan.verma@mail.com', '9876543212', '2025-03-05'),
('Ishita Rao', 'ishita.rao@mail.com', '9876543213', '2025-03-20'),
('Rohan Gupta', 'rohan.gupta@mail.com', '9876543214', '2025-04-01');

-- Historic issue records (some already returned, some overdue) so the
-- demo queries below have realistic data to work with.
INSERT INTO issue_records (book_id, member_id, issue_date, due_date, return_date, fine_amount) VALUES
(1, 1, '2026-07-01', '2026-07-15', '2026-07-14', 0),
(2, 1, '2026-07-05', '2026-07-19', '2026-07-25', 30),   -- returned 6 days late
(4, 2, '2026-07-10', '2026-07-24', '2026-07-24', 0),
(5, 2, '2026-07-12', '2026-07-26', NULL, 0),             -- still with member
(1, 3, '2026-06-01', '2026-06-15', '2026-06-20', 25),
(3, 3, '2026-08-01', '2026-08-15', NULL, 0),              -- currently overdue
(5, 4, '2026-07-20', '2026-08-03', '2026-08-01', 0),
(6, 5, '2026-08-10', '2026-08-24', NULL, 0);              -- currently overdue

-- The rows above with return_date = NULL simulate "currently issued"
-- books, inserted before the triggers below exist. Do by hand here what
-- trg_after_issue will do automatically for every REAL issue from now on:
UPDATE books SET available_copies = available_copies - 1 WHERE book_id IN (5, 3, 6);

-- ---------------------------------------------------------------------
-- 3. VIEWS
-- ---------------------------------------------------------------------

-- View 1: every book currently available to issue, author/category
-- already joined in — the frontend queries this directly.
CREATE VIEW available_books_view AS
SELECT b.book_id, b.title, a.author_name, c.category_name,
       b.available_copies, b.total_copies, b.price
FROM books b
JOIN authors a ON b.author_id = a.author_id
JOIN categories c ON b.category_id = c.category_id
WHERE b.available_copies > 0;

-- View 2: every book currently issued and past due, with days overdue.
CREATE VIEW overdue_books_view AS
SELECT ir.issue_id, m.name AS member_name, b.title, ir.issue_date, ir.due_date,
       DATEDIFF(CURRENT_DATE, ir.due_date) AS days_overdue
FROM issue_records ir
JOIN members m ON ir.member_id = m.member_id
JOIN books b ON ir.book_id = b.book_id
WHERE ir.return_date IS NULL AND ir.due_date < CURRENT_DATE;

-- View 3: per-member activity summary.
CREATE VIEW member_activity_view AS
SELECT m.member_id, m.name,
       COUNT(ir.issue_id) AS total_books_issued,
       SUM(CASE WHEN ir.return_date IS NULL THEN 1 ELSE 0 END) AS books_currently_held,
       COALESCE(SUM(ir.fine_amount), 0) AS total_fine_paid
FROM members m
LEFT JOIN issue_records ir ON m.member_id = ir.member_id
GROUP BY m.member_id, m.name;

-- ---------------------------------------------------------------------
-- 4. TRIGGERS
--
-- NOTE ON THE POSTGRES -> MYSQL DIFFERENCE:
-- Postgres let trg_after_return do everything (restore stock AND
-- calculate the fine) in one AFTER trigger, using a second UPDATE
-- statement plus a WHEN clause to stop it re-firing itself.
-- MySQL doesn't support a trigger's WHEN clause / column-list syntax,
-- and letting an AFTER trigger UPDATE the very row that fired it is
-- fragile. So the return-handling logic is split into two triggers:
--   - trg_before_return computes the fine by directly setting
--     NEW.fine_amount (only BEFORE triggers can rewrite the row
--     that's being written, so no second UPDATE is needed at all)
--   - trg_after_return restores available_copies on the books table
-- Same business rule, same two side-effects, just expressed the way
-- MySQL's trigger model expects.
-- ---------------------------------------------------------------------

DELIMITER $$

-- Trigger 1 (BEFORE INSERT): stop a book being issued with 0 copies left.
-- Enforced inside the DB, so it holds even if someone bypasses the API
-- and inserts directly.
CREATE TRIGGER trg_before_issue
BEFORE INSERT ON issue_records
FOR EACH ROW
BEGIN
    DECLARE avail INT;
    SELECT available_copies INTO avail FROM books WHERE book_id = NEW.book_id;
    IF avail IS NULL OR avail <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot issue: no copies of this book are available';
    END IF;
END$$

-- Trigger 2 (AFTER INSERT): the moment a book is issued, decrement
-- available_copies. The app never touches this column directly.
CREATE TRIGGER trg_after_issue
AFTER INSERT ON issue_records
FOR EACH ROW
BEGIN
    UPDATE books SET available_copies = available_copies - 1 WHERE book_id = NEW.book_id;
END$$

-- Trigger 3a (BEFORE UPDATE): only on the NULL -> not-NULL return_date
-- transition, auto-calculate a ₹5/day late fine directly on the row
-- being written.
CREATE TRIGGER trg_before_return
BEFORE UPDATE ON issue_records
FOR EACH ROW
BEGIN
    IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL AND NEW.return_date > NEW.due_date THEN
        SET NEW.fine_amount = DATEDIFF(NEW.return_date, NEW.due_date) * 5;
    END IF;
END$$

-- Trigger 3b (AFTER UPDATE): same NULL -> not-NULL guard, restores the
-- copy count on the books table.
CREATE TRIGGER trg_after_return
AFTER UPDATE ON issue_records
FOR EACH ROW
BEGIN
    IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
        UPDATE books SET available_copies = available_copies + 1 WHERE book_id = NEW.book_id;
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 5. STORED PROCEDURES the backend API calls (CALL proc_name(...))
--
-- NOTE ON THE POSTGRES -> MYSQL DIFFERENCE:
-- Postgres has table-returning FUNCTIONs, callable via
-- supabase.rpc('name'). MySQL functions can only return a single scalar
-- value, not a result set, so the equivalent here is a PROCEDURE that
-- runs a SELECT as its last statement — the Node backend reads that
-- result set exactly like a normal query.
-- ---------------------------------------------------------------------

DELIMITER $$

-- issue_book(): validated insert. Triggers 1 & 2 above still fire.
CREATE PROCEDURE issue_book(IN p_book_id INT, IN p_member_id INT, IN p_days INT)
BEGIN
    DECLARE v_due DATE;
    SET v_due = DATE_ADD(CURRENT_DATE, INTERVAL p_days DAY);
    INSERT INTO issue_records (book_id, member_id, due_date)
    VALUES (p_book_id, p_member_id, v_due);
    SELECT * FROM issue_records WHERE issue_id = LAST_INSERT_ID();
END$$

-- return_book(): sets return_date = today. Triggers 3a & 3b then fire.
CREATE PROCEDURE return_book(IN p_issue_id INT)
BEGIN
    UPDATE issue_records SET return_date = CURRENT_DATE WHERE issue_id = p_issue_id;
    SELECT * FROM issue_records WHERE issue_id = p_issue_id;
END$$

-- members_above_average_borrowers(): NESTED SUBQUERY demo.
CREATE PROCEDURE members_above_average_borrowers()
BEGIN
    SELECT m.name, COUNT(ir.issue_id) AS books_issued
    FROM members m
    JOIN issue_records ir ON m.member_id = ir.member_id
    GROUP BY m.member_id, m.name
    HAVING COUNT(ir.issue_id) > (
        SELECT AVG(cnt) FROM (
            SELECT COUNT(*) AS cnt FROM issue_records GROUP BY member_id
        ) AS member_counts
    );
END$$

-- books_never_issued(): NESTED SUBQUERY demo (NOT IN).
CREATE PROCEDURE books_never_issued()
BEGIN
    SELECT title FROM books
    WHERE book_id NOT IN (SELECT DISTINCT book_id FROM issue_records);
END$$

-- most_expensive_per_category(): CORRELATED SUBQUERY demo.
CREATE PROCEDURE most_expensive_per_category()
BEGIN
    SELECT b.title, c.category_name, b.price
    FROM books b
    JOIN categories c ON b.category_id = c.category_id
    WHERE b.price = (
        SELECT MAX(b2.price) FROM books b2 WHERE b2.category_id = b.category_id
    );
END$$

-- book_popularity_ranking(): CTE + window function demo.
CREATE PROCEDURE book_popularity_ranking()
BEGIN
    WITH book_popularity AS (
        SELECT b.title, COUNT(ir.issue_id) AS times_borrowed
        FROM books b
        LEFT JOIN issue_records ir ON b.book_id = ir.book_id
        GROUP BY b.book_id, b.title
    )
    SELECT title, times_borrowed,
           RANK() OVER (ORDER BY times_borrowed DESC) AS popularity_rank
    FROM book_popularity;
END$$

-- paying_members(): two CHAINED CTEs demo.
CREATE PROCEDURE paying_members()
BEGIN
    WITH member_fines AS (
        SELECT member_id, SUM(fine_amount) AS total_fine
        FROM issue_records
        GROUP BY member_id
    ),
    paying AS (
        SELECT * FROM member_fines WHERE total_fine > 0
    )
    SELECT m.name, p.total_fine
    FROM paying p
    JOIN members m ON p.member_id = m.member_id
    ORDER BY p.total_fine DESC;
END$$

-- category_tree(): RECURSIVE CTE demo — walks the categories hierarchy.
CREATE PROCEDURE category_tree()
BEGIN
    WITH RECURSIVE tree AS (
        SELECT category_id, category_name, parent_id, 0 AS level,
               CAST(category_name AS CHAR(300)) AS path
        FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.category_id, c.category_name, c.parent_id, t.level + 1,
               CAST(CONCAT(t.path, ' > ', c.category_name) AS CHAR(300))
        FROM categories c
        JOIN tree t ON c.parent_id = t.category_id
    )
    SELECT level, path FROM tree ORDER BY path;
END$$

-- monthly_issues(): simple CTE demo (month-wise issue counts).
CREATE PROCEDURE monthly_issues()
BEGIN
    WITH monthly AS (
        SELECT DATE_FORMAT(issue_date, '%Y-%m') AS issue_month, COUNT(*) AS total_issued
        FROM issue_records
        GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
    )
    SELECT * FROM monthly ORDER BY issue_month;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 6. PERMISSIONS
--    Unlike Supabase (where the browser talks to Postgres directly
--    through PostgREST, so `anon` needed GRANTs), nothing here talks to
--    MySQL except the Node/Express backend in backend/, using its own
--    database user. Create that user with just the privileges it needs,
--    e.g. from your MySQL console:
--
--    CREATE USER 'library_app'@'%' IDENTIFIED BY 'a-strong-password';
--    GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'library_app'@'%';
--    GRANT EXECUTE ON your_database.* TO 'library_app'@'%';
--    FLUSH PRIVILEGES;
--
--    (Most managed providers such as Aiven create this user for you
--    automatically — see the README for exact steps.)
