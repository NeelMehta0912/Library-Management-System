// dashboard.js
async function loadDashboard() {
    const cardsEl = document.getElementById("cards");
    try {
        const s = await Api.getDashboardStats();
        cardsEl.innerHTML = `
            <div class="card"><span class="num">${s.totalCopies}</span><span>Total Book Copies</span></div>
            <div class="card"><span class="num">${s.availableCopies}</span><span>Available Right Now</span></div>
            <div class="card"><span class="num">${s.totalMembers}</span><span>Registered Members</span></div>
            <div class="card"><span class="num">${s.currentlyIssued}</span><span>Books Currently Issued</span></div>
            <div class="card warn"><span class="num">${s.overdueCount}</span><span>Overdue Books</span></div>
        `;
    } catch (err) {
        cardsEl.innerHTML = `<p class="flash flash-error show">Could not load stats: ${err.message}</p>`;
    }
}
loadDashboard();
