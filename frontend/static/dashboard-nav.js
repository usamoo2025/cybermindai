// Dashboard behaviour: sections, mobile menu, overview bar, chat suggestions, conversation list size
document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    const sections = [...document.querySelectorAll(".main-content .dashboard-section")];
    const links = [...document.querySelectorAll('.sidebar nav a[href^="#"]')];
    const ids = sections.map(s => s.id);

    // ---- Mobile menu (hamburger button + slide-in sidebar) ----
    const sidebar = $("sidebar");
    const scrim = $("scrim");
    const menuToggle = $("menuToggle");

    function setMenu(open) {
        sidebar.classList.toggle("open", open);
        scrim.hidden = !open;
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    menuToggle.addEventListener("click", () => setMenu(!sidebar.classList.contains("open")));
    scrim.addEventListener("click", () => setMenu(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

    // ---- Sections (one visible at a time) ----
    function show(id) {
        if (!ids.includes(id)) id = ids[0];
        sections.forEach(s => s.classList.toggle("is-active", s.id === id));
        links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
        window.scrollTo({ top: 0 });
        setMenu(false);
    }

    links.forEach(a => a.addEventListener("click", e => {
        e.preventDefault();
        const id = a.getAttribute("href").slice(1);
        history.replaceState(null, "", "#" + id);
        show(id);
    }));
    window.addEventListener("hashchange", () => show(location.hash.slice(1)));

    // ---- Overview: classification split bar and percentages ----
    const kinds = [
        ["phishingCount", "splitPhishing", "pctPhishing"],
        ["suspiciousCount", "splitSuspicious", "pctSuspicious"],
        ["benignCount", "splitBenign", "pctBenign"]
    ];

    function updateSplit() {
        const total = Number($("totalLogs").textContent) || 0;
        const counts = kinds.map(k => Number($(k[0]).textContent) || 0);
        const sum = counts.reduce((a, b) => a + b, 0);
        kinds.forEach((k, i) => {
            $(k[1]).style.width = sum ? (counts[i] / sum * 100) + "%" : "0";
            $(k[2]).textContent = (total ? Math.round(counts[i] / total * 100) : 0) + "% of logs";
        });
    }

    const watcher = new MutationObserver(updateSplit);
    ["totalLogs", ...kinds.map(k => k[0])].forEach(id =>
        watcher.observe($(id), { childList: true, characterData: true, subtree: true })
    );
    updateSplit();

    // ---- AI Assistant: hide suggestions once a question is started ----
    const chatBox = $("chatMessages");
    const chatInput = $("chatInput");

    function syncSuggestions() {
        const welcome = chatBox.querySelector(".welcome-message");
        if (!welcome) return;
        const hasMessages = !!chatBox.querySelector(".chat-message");
        const typing = chatInput.value.trim() !== "";
        welcome.hidden = hasMessages;
        const grid = welcome.querySelector(".suggestion-grid");
        if (grid) grid.hidden = hasMessages || typing;
    }

    chatInput.addEventListener("input", syncSuggestions);
    chatBox.addEventListener("click", () => setTimeout(syncSuggestions, 0));
    new MutationObserver(syncSuggestions).observe(chatBox, { childList: true });
    syncSuggestions();

    // ---- Conversations: drag the handle to show more of the list ----
    const list = $("conversationList");
    const grip = $("conversationResize");
    let startY = 0;
    let startHeight = 0;

    grip.addEventListener("pointerdown", e => {
        startY = e.clientY;
        startHeight = list.offsetHeight;
        grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener("pointermove", e => {
        if (!grip.hasPointerCapture(e.pointerId)) return;
        list.style.height = Math.max(72, startHeight + e.clientY - startY) + "px";
    });

    // ---- Always open on Overview ----
    history.replaceState(null, "", "#overview");
    show("overview");
});
