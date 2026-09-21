// books.js
function flash(msg, type = "success") {
    const el = document.getElementById("flash");
    el.textContent = msg;
    el.className = `flash flash-${type} show`;
    setTimeout(() => el.classList.remove("show"), 4000);
}

async function renderCatalogue() {
    const el = document.getElementById("catalogue");
    try {
        const books = await Api.getAllBooksWithAvailability();
        const rows = books.map(b => `
            <tr>
                <td>${b.title}</td>
                <td>${b.author_name || "—"}</td>
                <td>${b.category_name || "—"}</td>
                <td>₹${Number(b.price).toFixed(2)}</td>
                <td>${b.total_copies}</td>
                <td>${b.available_copies}</td>
                <td class="${b.available_copies > 0 ? "ok" : "bad"}">
                    ${b.available_copies > 0 ? "Available" : "Not Available"}
                </td>
            </tr>`).join("");
        el.innerHTML = `
            <table>
                <tr><th>Title</th><th>Author</th><th>Category</th><th>Price</th><th>Total</th><th>Available</th><th>Status</th></tr>
                ${rows || `<tr><td colspan="7">No books yet.</td></tr>`}
            </table>`;
    } catch (err) {
        el.innerHTML = `<p class="flash flash-error show">Could not load catalogue: ${err.message}</p>`;
    }
}

async function populateDropdowns() {
    const [authors, categories] = await Promise.all([Api.getAuthors(), Api.getCategories()]);
    document.getElementById("author_id").innerHTML =
        authors.map(a => `<option value="${a.author_id}">${a.author_name}</option>`).join("");
    document.getElementById("category_id").innerHTML =
        categories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join("");
}

document.getElementById("add-book-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await Api.addBook({
            title: document.getElementById("title").value.trim(),
            author_id: document.getElementById("author_id").value,
            category_id: document.getElementById("category_id").value,
            copies: parseInt(document.getElementById("copies").value, 10),
            price: parseFloat(document.getElementById("price").value),
        });
        flash("Book added.", "success");
        e.target.reset();
        renderCatalogue();
    } catch (err) {
        flash(`Could not add book: ${err.message}`, "error");
    }
});

renderCatalogue();
populateDropdowns();
