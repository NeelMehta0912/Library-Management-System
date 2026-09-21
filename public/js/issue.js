// issue.js
function flash(msg, type = "success") {
    const el = document.getElementById("flash");
    el.textContent = msg;
    el.className = `flash flash-${type} show`;
    setTimeout(() => el.classList.remove("show"), 5000);
}

async function populateForm() {
    const [books, members] = await Promise.all([Api.getAvailableBooks(), Api.getAllMembers()]);
    document.getElementById("book_id").innerHTML =
        books.map(b => `<option value="${b.book_id}">${b.title} (${b.available_copies} left)</option>`).join("")
        || `<option disabled>No books available</option>`;
    document.getElementById("member_id").innerHTML =
        members.map(m => `<option value="${m.member_id}">${m.name}</option>`).join("");
}

async function renderActiveIssues() {
    const el = document.getElementById("active-issues");
    try {
        const issues = await Api.getActiveIssues();
        const rows = issues.map(i => `
            <tr>
                <td>${i.book_title}</td>
                <td>${i.member_name}</td>
                <td>${i.issue_date}</td>
                <td>${i.due_date}</td>
                <td><button data-issue-id="${i.issue_id}" class="return-btn">Mark Returned</button></td>
            </tr>`).join("");
        el.innerHTML = `
            <table>
                <tr><th>Book</th><th>Member</th><th>Issue Date</th><th>Due Date</th><th></th></tr>
                ${rows || `<tr><td colspan="5">No books currently issued.</td></tr>`}
            </table>`;
        document.querySelectorAll(".return-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                try {
                    const result = await Api.returnBook(btn.dataset.issueId);
                    if (result.fine_amount > 0) {
                        flash(`Book returned. Trigger auto-calculated a fine of ₹${result.fine_amount} (late return).`, "warning");
                    } else {
                        flash("Book returned on time. No fine.", "success");
                    }
                    renderActiveIssues();
                    populateForm();
                } catch (err) {
                    flash(`Could not return book: ${err.message}`, "error");
                    btn.disabled = false;
                }
            });
        });
    } catch (err) {
        el.innerHTML = `<p class="flash flash-error show">Could not load active issues: ${err.message}</p>`;
    }
}

document.getElementById("issue-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const book_id = document.getElementById("book_id").value;
    const member_id = document.getElementById("member_id").value;
    try {
        await Api.issueBook(book_id, member_id);
        flash("Book issued successfully. (Trigger auto-updated available_copies.)", "success");
        populateForm();
        renderActiveIssues();
    } catch (err) {
        // trg_before_issue's RAISE EXCEPTION message surfaces right here
        flash(`Could not issue book: ${err.message}`, "error");
    }
});

populateForm();
renderActiveIssues();
