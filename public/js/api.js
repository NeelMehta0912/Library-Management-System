// api.js
// This file IS the backend-facing logic layer: every network call in
// the whole site goes through one of these functions. Pages never
// build their own fetch() calls — they call these, which call the
// Express API in backend/. Business rules themselves (availability
// checks, fine calculation, stock updates) live as TRIGGERS in
// mysql/schema.sql, exactly as required by the case study — this file
// just calls the endpoints that route to them.

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`);
    }
    return body;
}

const Api = {
    // ---------- Dashboard ----------
    async getDashboardStats() {
        return request("/dashboard/stats");
    },

    // ---------- Books (reads available_books_view) ----------
    async getAllBooksWithAvailability() {
        return request("/books");
    },

    async getAvailableBooks() {
        return request("/books/available");
    },

    async getCategories() {
        return request("/categories");
    },

    async getAuthors() {
        return request("/authors");
    },

    async addBook({ title, author_id, category_id, copies, price }) {
        return request("/books", {
            method: "POST",
            body: JSON.stringify({ title, author_id, category_id, copies, price }),
        });
    },

    // ---------- Members (reads member_activity_view) ----------
    async getMemberActivity() {
        return request("/members/activity");
    },

    async addMember({ name, email, phone }) {
        return request("/members", {
            method: "POST",
            body: JSON.stringify({ name, email, phone }),
        });
    },

    async getAllMembers() {
        return request("/members");
    },

    // ---------- Issue / Return (goes through stored procedures -> triggers fire) ----------
    async issueBook(book_id, member_id, days = 14) {
        // trg_before_issue's SIGNAL (raised if 0 copies left) surfaces as
        // the error message on request() above.
        return request("/issues", {
            method: "POST",
            body: JSON.stringify({ book_id, member_id, days }),
        });
    },

    async returnBook(issue_id) {
        // fine_amount is auto-filled by trg_before_return by the time this resolves
        return request(`/issues/${issue_id}/return`, { method: "POST" });
    },

    async getActiveIssues() {
        return request("/issues/active");
    },

    // ---------- Reports: nested subqueries + CTEs, all via stored procedures ----------
    async getMembersAboveAverage() {
        return request("/reports/members-above-average");
    },
    async getBooksNeverIssued() {
        return request("/reports/books-never-issued");
    },
    async getMostExpensivePerCategory() {
        return request("/reports/most-expensive-per-category");
    },
    async getBookPopularityRanking() {
        return request("/reports/book-popularity");
    },
    async getPayingMembers() {
        return request("/reports/paying-members");
    },
    async getCategoryTree() {
        return request("/reports/category-tree");
    },
    async getMonthlyIssues() {
        return request("/reports/monthly-issues");
    },
    async getOverdueBooks() {
        return request("/reports/overdue");
    },
};
