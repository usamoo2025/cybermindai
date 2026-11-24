// Dashboard tabs (one section visible at a time) + AI chat report
document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    const sections = [...document.querySelectorAll(".main-content .dashboard-section")];
    const links = [...document.querySelectorAll('.sidebar nav a[href^="#"]')];
    const ids = sections.map(s => s.id);

    function show(id) {
        if (!ids.includes(id)) id = ids[0];
        sections.forEach(s => s.classList.toggle("is-active", s.id === id));
        links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
        window.scrollTo({ top: 0 });
        if (id === "report") refreshReport();
    }

    links.forEach(a => a.addEventListener("click", e => {
        e.preventDefault();
        const id = a.getAttribute("href").slice(1);
        history.replaceState(null, "", "#" + id);
        show(id);
    }));
    window.addEventListener("hashchange", () => show(location.hash.slice(1)));

    // ---- AI chat report ----
    const activity = [];
    const clip = t => t.length > 160 ? t.slice(0, 157) + "…" : t;

    function refreshReport() {
        $("reportQuestions").textContent = activity.length;
        $("reportFiles").textContent = activity.filter(a => a.file).length;
        $("reportEvents").textContent = $("totalLogs").textContent;
        $("reportPhishing").textContent = $("phishingCount").textContent;
        const list = $("reportList");
        list.replaceChildren();
        if (!activity.length) {
            const li = document.createElement("li");
            li.className = "report-empty";
            li.textContent = "No chat activity yet. Ask a question in the AI Assistant tab.";
            list.appendChild(li);
            return;
        }
        activity.forEach(a => {
            const li = document.createElement("li");
            const q = document.createElement("strong");
            q.textContent = clip(a.question);
            const meta = document.createElement("small");
            meta.textContent = a.time + (a.file ? " · Attachment: " + a.file : "");
            li.append(q, meta);
            list.appendChild(li);
        });
    }

    $("chatForm").addEventListener("submit", () => {
        const question = $("chatInput").value.trim();
        if (!question) return;
        const file = $("chatFileInput").files[0];
        activity.push({ question, file: file ? file.name : "", time: new Date().toLocaleString() });
        refreshReport();
    });

    $("clearReportBtn").addEventListener("click", () => { activity.length = 0; refreshReport(); });

    $("downloadReportBtn").addEventListener("click", () => {
        refreshReport();
        const lines = [
            "CyberMind AI - Chat Report",
            "Generated: " + new Date().toLocaleString(),
            "",
            "Questions asked: " + activity.length,
            "Files attached: " + activity.filter(a => a.file).length,
            "Security events: " + $("totalLogs").textContent,
            "Phishing events: " + $("phishingCount").textContent,
            "",
            "Chat activity:",
            ...(activity.length ? activity.map((a, i) => `${i + 1}. [${a.time}] ${a.question}${a.file ? " (file: " + a.file + ")" : ""}`) : ["(none)"])
        ];
        const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
        const a = document.createElement("a");
        a.href = url; a.download = "cybermind-chat-report.txt"; a.click();
        URL.revokeObjectURL(url);
    });

    show(location.hash.slice(1));
});
