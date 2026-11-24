
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // ELEMENT REFERENCES AND STATE
    // =====================================

    const $ = (id) => document.getElementById(id);

    let selectedDocument = null;
    let selectedImage = null;
    let chatAttachment = null;
    let currentConversationId = null;

    const chatMessages = $("chatMessages");
    const initialChatMarkup = chatMessages.innerHTML;


    // =====================================
    // API HELPER
    // =====================================

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {
            ...options,
            credentials: "include"
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error("Authentication required. Please log in again.");
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.detail || "Request failed.");
        }

        return data;
    }


    // =====================================
    // LOGOUT
    // =====================================

    $("logoutBtn").addEventListener("click", async () => {

        try {
            await apiRequest("/auth/logout", {
                method: "POST"
            });

            window.location.href = "/login";

        } catch (error) {
            alert(error.message);
        }

    });


    // =====================================
    // SECURITY LOGS
    // =====================================

    async function loadSecurityLogs() {

        $("statusMessage").textContent = "Loading security logs...";

        try {

            const data = await apiRequest("/logs");
            const logs = data.logs || [];

            $("totalLogs").textContent = data.total_logs ?? logs.length;

            $("phishingCount").textContent =
                logs.filter(log =>
                    (log.predicted_category || "").toLowerCase().includes("phishing")
                ).length;

            $("suspiciousCount").textContent =
                logs.filter(log =>
                    (log.predicted_category || "").toLowerCase().includes("suspicious")
                ).length;

            $("benignCount").textContent =
                logs.filter(log =>
                    (log.predicted_category || "").toLowerCase().includes("benign")
                ).length;

            const table = $("logsTable");
            table.replaceChildren();

            if (logs.length === 0) {
                $("statusMessage").textContent = "No security events recorded.";
                return;
            }

            logs.forEach(log => {

                const row = document.createElement("tr");

                const values = [
                    log.id,
                    log.event_type,
                    log.description,
                    log.severity,
                    log.predicted_category || "Not classified",
                    log.confidence !== null && log.confidence !== undefined
                        ? (log.confidence * 100).toFixed(2) + "%"
                        : "N/A"
                ];

                values.forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                table.appendChild(row);

            });

            $("statusMessage").textContent =
                `Showing ${logs.length} security events.`;

        } catch (error) {
            $("statusMessage").textContent = error.message;
        }

    }


    // =====================================
    // CREATE SECURITY EVENT
    // =====================================

    $("securityLogForm").addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = $("saveLogBtn");

        const payload = {
            event_type: $("eventType").value.trim(),
            severity: $("eventSeverity").value,
            description: $("eventDescription").value.trim()
        };

        button.disabled = true;
        button.textContent = "Saving...";

        try {

            const result = await apiRequest("/logs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            $("logFormStatus").textContent = result.message;

            $("securityLogForm").reset();

            await loadSecurityLogs();

        } catch (error) {
            $("logFormStatus").textContent = error.message;

        } finally {
            button.disabled = false;
            button.textContent = "Save Security Event";
        }

    });


    // =====================================
    // DOCUMENT SELECTION
    // =====================================

    $("documentInput").addEventListener("change", () => {

        const file = $("documentInput").files[0];

        if (!file) return;

        const allowed = [".pdf", ".txt", ".csv", ".docx"];
        const extension = "." + file.name.split(".").pop().toLowerCase();

        if (!allowed.includes(extension)) {
            $("documentStatus").textContent = "Unsupported file format.";
            $("documentInput").value = "";
            return;
        }

        if (file.size === 0 || file.size > 10 * 1024 * 1024) {
            $("documentStatus").textContent =
                "File must be non-empty and no larger than 10 MB.";
            $("documentInput").value = "";
            return;
        }

        selectedDocument = file;

        $("documentFileName").textContent = file.name;
        $("documentFileInfo").hidden = false;
        $("analyzeDocumentBtn").disabled = false;
        $("documentStatus").textContent = "";

    });


    // =====================================
    // REMOVE DOCUMENT
    // =====================================

    $("removeDocument").addEventListener("click", () => {

        selectedDocument = null;

        $("documentInput").value = "";
        $("documentFileInfo").hidden = true;
        $("analyzeDocumentBtn").disabled = true;

        $("documentStatus").textContent = "";

    });


    // =====================================
    // ANALYZE DOCUMENT
    // =====================================

    $("analyzeDocumentBtn").addEventListener("click", async () => {

        if (!selectedDocument) return;

        const button = $("analyzeDocumentBtn");
        const formData = new FormData();

        formData.append("file", selectedDocument);

        button.disabled = true;
        button.textContent = "Analyzing...";

        $("documentStatus").textContent =
            "Sending document to local AI...";

        try {

            const result = await apiRequest("/files/analyze", {
                method: "POST",
                body: formData
            });

            $("uploadAnalysisTitle").textContent = result.filename;
            $("uploadAnalysisContent").textContent = result.analysis;
            $("uploadAnalysisOutput").hidden = false;

            $("documentStatus").textContent =
                "Document analyzed successfully.";

            $("uploadAnalysisOutput").scrollIntoView({
                behavior: "smooth"
            });

        } catch (error) {
            $("documentStatus").textContent = error.message;

        } finally {
            button.disabled = !selectedDocument;
            button.textContent = "Analyze Document";
        }

    });


    // =====================================
    // IMAGE SELECTION AND PREVIEW
    // =====================================

    $("imageInput").addEventListener("change", () => {

        const file = $("imageInput").files[0];

        if (!file) return;

        const allowed = [
            "image/png",
            "image/jpeg",
            "image/webp"
        ];

        if (!allowed.includes(file.type)) {
            $("imageStatus").textContent = "Unsupported image format.";
            $("imageInput").value = "";
            return;
        }

        if (file.size === 0 || file.size > 10 * 1024 * 1024) {
            $("imageStatus").textContent =
                "Image must be non-empty and no larger than 10 MB.";
            $("imageInput").value = "";
            return;
        }

        selectedImage = file;

        $("imagePreview").src = URL.createObjectURL(file);
        $("imagePreviewContainer").hidden = false;
        $("analyzeImageBtn").disabled = false;

        $("imageStatus").textContent =
            "Image selected. Vision AI backend is not connected yet.";

    });


    $("removeImage").addEventListener("click", () => {

        if ($("imagePreview").src.startsWith("blob:")) {
            URL.revokeObjectURL($("imagePreview").src);
        }

        selectedImage = null;

        $("imageInput").value = "";
        $("imagePreview").removeAttribute("src");

        $("imagePreviewContainer").hidden = true;
        $("analyzeImageBtn").disabled = true;

        $("imageStatus").textContent =
            "Select an image to preview.";

    });


    $("analyzeImageBtn").addEventListener("click", () => {

        $("imageStatus").textContent =
            "Image preview works. Local vision model integration is our next development stage.";

    });


    // =====================================
    // CHAT ATTACHMENT SELECTION
    // =====================================

    $("attachFileBtn").addEventListener("click", () => {
        $("chatFileInput").click();
    });


    $("chatFileInput").addEventListener("change", () => {

        chatAttachment = $("chatFileInput").files[0];

        if (!chatAttachment) return;

        $("chatAttachmentName").textContent = chatAttachment.name;
        $("chatAttachmentPreview").hidden = false;

        $("chatStatus").textContent =
            "Attachments are not connected to chat yet. Remove the attachment to send a message.";

    });


    $("removeChatAttachment").addEventListener("click", () => {

        chatAttachment = null;

        $("chatFileInput").value = "";
        $("chatAttachmentPreview").hidden = true;

        $("chatStatus").textContent = "";

    });


    // =====================================
    // CHAT MESSAGE RENDERING
    // =====================================

    function renderMessage(role, content) {

        const message = document.createElement("div");

        message.className = `chat-message ${role}`;

        const messageContent = document.createElement("div");

        messageContent.className = "message-content";
        messageContent.textContent = content;

        message.appendChild(messageContent);
        chatMessages.appendChild(message);

        chatMessages.scrollTop = chatMessages.scrollHeight;

    }


    function resetChatInterface() {

        chatMessages.innerHTML = initialChatMarkup;

        currentConversationId = null;

        updateActiveConversation();

        $("chatInput").value = "";
        $("chatStatus").textContent = "";

    }


    // =====================================
    // LOAD CONVERSATION HISTORY
    // =====================================

    async function loadConversations() {

        const list = $("conversationList");

        list.textContent = "Loading conversations...";

        try {

            const data = await apiRequest("/chat/conversations");
            const conversations = data.conversations || [];

            list.replaceChildren();

            if (conversations.length === 0) {

                const empty = document.createElement("p");

                empty.className = "conversation-empty";
                empty.textContent = "No conversations yet.";

                list.appendChild(empty);

                return;
            }

            conversations.forEach(conversation => {

                const item = document.createElement("div");

                item.className = "conversation-item";
                item.dataset.id = conversation.id;

                const openButton = document.createElement("button");

                openButton.type = "button";
                openButton.className = "conversation-open";
                openButton.textContent = conversation.title || "New Conversation";

                openButton.addEventListener("click", () => {
                    openConversation(conversation.id);
                });

                const deleteButton = document.createElement("button");

                deleteButton.type = "button";
                deleteButton.className = "conversation-delete";
                deleteButton.textContent = "Delete";
                deleteButton.title = "Delete conversation";

                deleteButton.addEventListener("click", () => {
                    deleteConversation(conversation.id);
                });

                item.appendChild(openButton);
                item.appendChild(deleteButton);

                list.appendChild(item);

            });

            updateActiveConversation();

        } catch (error) {

            list.textContent = error.message;

        }

    }


    // =====================================
    // ACTIVE CONVERSATION HIGHLIGHT
    // =====================================

    function updateActiveConversation() {

        document.querySelectorAll(".conversation-item").forEach(item => {

            item.classList.toggle(
                "active",
                Number(item.dataset.id) === Number(currentConversationId)
                    && currentConversationId !== null
            );

        });

    }


    // =====================================
    // OPEN PREVIOUS CONVERSATION
    // =====================================

    async function openConversation(conversationId) {

        $("chatStatus").textContent = "Loading conversation...";

        try {

            const data = await apiRequest(
                `/chat/conversations/${conversationId}`
            );

            chatMessages.replaceChildren();

            currentConversationId = conversationId;

            const messages = data.messages || [];

            messages.forEach(message => {

                renderMessage(
                    message.role,
                    message.content
                );

            });

            updateActiveConversation();

            $("chatStatus").textContent = "";

        } catch (error) {

            $("chatStatus").textContent = error.message;

        }

    }


    // =====================================
    // CREATE NEW CHAT
    // =====================================

    $("newChatBtn").addEventListener("click", () => {

        resetChatInterface();

        $("chatInput").focus();

    });


    // =====================================
    // DELETE CONVERSATION
    // =====================================

    async function deleteConversation(conversationId) {

        const confirmed = window.confirm(
            "Are you sure you want to delete this conversation?"
        );

        if (!confirmed) return;

        try {

            await apiRequest(
                `/chat/conversations/${conversationId}`,
                {
                    method: "DELETE"
                }
            );

            if (Number(currentConversationId) === Number(conversationId)) {
                resetChatInterface();
            }

            await loadConversations();

            $("chatStatus").textContent =
                "Conversation deleted successfully.";

        } catch (error) {

            $("chatStatus").textContent = error.message;

        }

    }


    // =====================================
    // CHAT SUGGESTIONS
    // =====================================

    document.addEventListener("click", (event) => {

        const button = event.target.closest(".suggestion-btn");

        if (!button) return;

        $("chatInput").value = button.dataset.question || "";
        $("chatInput").focus();

    });


    // =====================================
    // SEND CHAT MESSAGE
    // =====================================

    $("chatForm").addEventListener("submit", async (event) => {

        event.preventDefault();

        const question = $("chatInput").value.trim();

        if (!question) return;

        if (chatAttachment) {

            $("chatStatus").textContent =
                "Please remove the attachment. Chat attachment processing is not connected yet.";

            return;
        }

        const button = $("sendChatBtn");

        button.disabled = true;

        $("chatStatus").textContent = "CyberMind AI is thinking...";

        renderMessage("user", question);

        $("chatInput").value = "";

        try {

            const payload = {
                message: question,
                conversation_id: currentConversationId
            };

            const result = await apiRequest("/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            currentConversationId = result.conversation_id;

            renderMessage("assistant", result.answer);

            $("chatStatus").textContent = "";

            await loadConversations();

        } catch (error) {

            renderMessage(
                "assistant",
                "Unable to complete your request: " + error.message
            );

            $("chatStatus").textContent = error.message;

        } finally {

            button.disabled = false;
            $("chatInput").focus();

        }

    });


    // =====================================
    // CURRENT DATE
    // =====================================

    const dateElement = $("currentDate");

    if (dateElement) {

        dateElement.textContent =
            new Date().toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric"
            });

    }


    // =====================================
    // INITIALIZE DASHBOARD
    // =====================================

    loadSecurityLogs();
    loadConversations();

});
