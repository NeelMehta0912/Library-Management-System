// reports.js
function table(headers, rows, rowMapper) {
    const head = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    const body = rows.length
        ? rows.map(rowMapper).join("")
        : `<tr><td colspan="${headers.length}">No results.</td></tr>`;
    return `<table>${head}${body}</table>`;
}

async function run(elementId, fetchFn, renderFn) {
    const el = document.getElementById(elementId);
    try {
        const data = await fetchFn();
        el.innerHTML = renderFn(data);
    } catch (err) {
        el.innerHTML = `<p class="flash flash-error show">Query failed: ${err.message}</p>`;
    }
}

run("members-above-avg", Api.getMembersAboveAverage, data =>
    table(["Member", "Books Borrowed"], data, r => `<tr><td>${r.name}</td><td>${r.books_issued}</td></tr>`));

run("never-issued", Api.getBooksNeverIssued, data =>
    table(["Title"], data, r => `<tr><td>${r.title}</td></tr>`));

run("most-expensive", Api.getMostExpensivePerCategory, data =>
    table(["Title", "Category", "Price"], data, r =>
        `<tr><td>${r.title}</td><td>${r.category_name}</td><td>₹${Number(r.price).toFixed(2)}</td></tr>`));

run("popularity", Api.getBookPopularityRanking, data =>
    table(["Title", "Times Borrowed", "Rank"], data, r =>
        `<tr><td>${r.title}</td><td>${r.times_borrowed}</td><td>${r.popularity_rank}</td></tr>`));

run("paying-members", Api.getPayingMembers, data =>
    table(["Member", "Total Fine"], data, r =>
        `<tr><td>${r.name}</td><td>₹${Number(r.total_fine).toFixed(2)}</td></tr>`));

run("category-tree", Api.getCategoryTree, data =>
    table(["Level", "Path"], data, r =>
        `<tr><td>${r.level}</td><td>${"&nbsp;&nbsp;".repeat(r.level)}${r.path}</td></tr>`));

run("monthly-issues", Api.getMonthlyIssues, data =>
    table(["Month", "Books Issued"], data, r => `<tr><td>${r.issue_month}</td><td>${r.total_issued}</td></tr>`));

run("overdue", Api.getOverdueBooks, data =>
    table(["Book", "Member", "Due Date", "Days Overdue"], data, r =>
        `<tr><td>${r.title}</td><td>${r.member_name}</td><td>${r.due_date}</td><td>${r.days_overdue}</td></tr>`));
