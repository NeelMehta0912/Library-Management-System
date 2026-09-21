// members.js
function flash(msg, type = "success") {
    const el = document.getElementById("flash");
    el.textContent = msg;
    el.className = `flash flash-${type} show`;
    setTimeout(() => el.classList.remove("show"), 4000);
}

async function renderActivity() {
    const el = document.getElementById("activity");
    try {
        const activity = await Api.getMemberActivity();
        const rows = activity.map(a => `
            <tr>
                <td>${a.name}</td>
                <td>${a.total_books_issued}</td>
                <td>${a.books_currently_held}</td>
                <td>₹${Number(a.total_fine_paid).toFixed(2)}</td>
            </tr>`).join("");
        el.innerHTML = `
            <table>
                <tr><th>Name</th><th>Total Books Issued</th><th>Currently Holding</th><th>Total Fine</th></tr>
                ${rows || `<tr><td colspan="4">No members yet.</td></tr>`}
            </table>`;
    } catch (err) {
        el.innerHTML = `<p class="flash flash-error show">Could not load members: ${err.message}</p>`;
    }
}

document.getElementById("add-member-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await Api.addMember({
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
        });
        flash("Member added.", "success");
        e.target.reset();
        renderActivity();
    } catch (err) {
        flash(`Could not add member: ${err.message}`, "error");
    }
});

renderActivity();
