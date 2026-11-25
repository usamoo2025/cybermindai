
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. ELEMENT REFERENCES AND STATE
    // =====================================

    const $ = (id) => document.getElementById(id);

    let selectedDocument = null;
    let selectedImage = null;
    let chatAttachment = null;
    let currentConversationId = null;

    const chatMessages = $("chatMessages");
    const initialChatMarkup = chatMessages.innerHTML;


    // =====================================
    // 2. API HELPER
    // =====================================

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {
            ...options,
            credentials: "include"
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "Authentication required. Please log in again."
            );
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail || "Request failed."
            );
        }

        return data;
    }


    // =====================================
    // 3. LOGOUT
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
    // 4. SECURITY LOGS
    // =====================================

    async function loadSecurityLogs() {

        $("statusMessage").textContent =
            "Loading security logs...";

        try {

            const data = await apiRequest("/logs");
            const logs = data.logs || [];

            $("totalLogs").textContent =
                data.total_logs ?? logs.length;

            $("phishingCount").textContent =
                logs.filter(log =>
                    (log.predicted_category || "")
                        .toLowerCase()
                        .includes("phishing")
                ).length;

            $("suspiciousCount").textContent =
                logs.filter(log =>
                    (log.predicted_category || "")
                        .toLowerCase()
                        .includes("suspicious")
                ).length;

            $("benignCount").textContent =
                logs.filter(log =>
                    (log.predicted_category || "")
                        .toLowerCase()
                        .includes("benign")
                ).length;

            const table = $("logsTable");
            table.replaceChildren();

            if (logs.length === 0) {

                $("statusMessage").textContent =
                    "No security events recorded.";

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
                    log.confidence !== null &&
                    log.confidence !== undefined
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

            $("statusMessage").textContent =
                error.message;

        }

    }


    // =====================================
    // 5. CREATE SECURITY EVENT
    // =====================================

    $("securityLogForm").addEventListener(
        "submit",
        async (event) => {

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

                $("logFormStatus").textContent =
                    result.message;

                $("securityLogForm").reset();

                await loadSecurityLogs();

            } catch (error) {

                $("logFormStatus").textContent =
                    error.message;

            } finally {

                button.disabled = false;
                button.textContent = "Save Security Event";

            }

        }
    );


    // =====================================
    // 6. DOCUMENT PROCESSING
    // =====================================

    // Allow clicking Analyze even without a file.
    $("analyzeDocumentBtn").disabled = false;


    // -------------------------------------
    // DOCUMENT SELECTION
    // -------------------------------------

    $("documentInput").addEventListener("change", () => {

        const file = $("documentInput").files[0];

        if (!file) return;

        const allowed = [
            ".pdf",
            ".txt",
            ".csv",
            ".docx"
        ];

        const extension =
            "." + file.name.split(".").pop().toLowerCase();

        if (!allowed.includes(extension)) {

            $("documentStatus").textContent =
                "Unsupported file format. Use PDF, TXT, CSV or DOCX.";

            $("documentInput").value = "";
            selectedDocument = null;

            return;
        }

        if (
            file.size === 0 ||
            file.size > 10 * 1024 * 1024
        ) {

            $("documentStatus").textContent =
                "File must be non-empty and no larger than 10 MB.";

            $("documentInput").value = "";
            selectedDocument = null;

            return;
        }

        selectedDocument = file;

        $("documentFileName").textContent =
            file.name;

        $("documentFileInfo").hidden = false;

        $("analyzeDocumentBtn").disabled = false;

        $("documentStatus").textContent =
            "Document selected. Ready for analysis.";

    });


    // -------------------------------------
    // REMOVE DOCUMENT
    // -------------------------------------

    $("removeDocument").addEventListener("click", () => {

        selectedDocument = null;

        $("documentInput").value = "";

        $("documentFileInfo").hidden = true;

        $("analyzeDocumentBtn").disabled = false;

        $("documentStatus").textContent =
            "No file attached. Select a document to begin.";

    });


    // -------------------------------------
    // ANALYZE DOCUMENT
    // -------------------------------------

    $("analyzeDocumentBtn").addEventListener(
        "click",
        async () => {

            if (!selectedDocument) {

                $("documentStatus").textContent =
                    "No file attached. Please select a document first.";

                return;
            }

            const button = $("analyzeDocumentBtn");

            const formData = new FormData();

            formData.append("file", selectedDocument);

            button.disabled = true;
            button.textContent = "Analyzing...";

            $("documentStatus").textContent =
                "Sending document to local AI...";

            try {

                const result = await apiRequest(
                    "/files/analyze",
                    {
                        method: "POST",
                        body: formData
                    }
                );

                $("uploadAnalysisTitle").textContent =
                    result.filename || selectedDocument.name;

                $("uploadAnalysisContent").textContent =
                    result.analysis || "No analysis returned.";

                $("uploadAnalysisOutput").hidden = false;

                $("documentStatus").textContent =
                    "Document analyzed and indexed successfully.";

                await loadKnowledgeBase();

                $("uploadAnalysisOutput").scrollIntoView({
                    behavior: "smooth"
                });

            } catch (error) {

                $("documentStatus").textContent =
                    error.message;

            } finally {

                button.disabled = false;
                button.textContent = "Analyze Document";

            }

        }
    );


    // =====================================
    // 7. IMAGE PROCESSING
    // =====================================

    // Allow clicking Analyze even without an image.
    $("analyzeImageBtn").disabled = false;


    // -------------------------------------
    // IMAGE SELECTION AND PREVIEW
    // -------------------------------------

    $("imageInput").addEventListener("change", () => {

        const file = $("imageInput").files[0];

        if (!file) return;

        const allowed = [
            "image/png",
            "image/jpeg",
            "image/webp"
        ];

        if (!allowed.includes(file.type)) {

            $("imageStatus").textContent =
                "Unsupported image format. Use PNG, JPEG or WEBP.";

            $("imageInput").value = "";
            selectedImage = null;

            return;
        }

        if (
            file.size === 0 ||
            file.size > 10 * 1024 * 1024
        ) {

            $("imageStatus").textContent =
                "Image must be non-empty and no larger than 10 MB.";

            $("imageInput").value = "";
            selectedImage = null;

            return;
        }

        if ($("imagePreview").src.startsWith("blob:")) {

            URL.revokeObjectURL(
                $("imagePreview").src
            );

        }

        selectedImage = file;

        $("imagePreview").src =
            URL.createObjectURL(file);

        $("imagePreviewContainer").hidden = false;

        $("analyzeImageBtn").disabled = false;

        $("imageStatus").textContent =
            "Image selected. Ready for analysis.";

    });


    // -------------------------------------
    // REMOVE IMAGE
    // -------------------------------------

    $("removeImage").addEventListener("click", () => {

        if ($("imagePreview").src.startsWith("blob:")) {

            URL.revokeObjectURL(
                $("imagePreview").src
            );

        }

        selectedImage = null;

        $("imageInput").value = "";

        $("imagePreview").removeAttribute("src");

        $("imagePreviewContainer").hidden = true;

        $("analyzeImageBtn").disabled = false;

        $("imageStatus").textContent =
            "No image attached. Select an image to begin.";

    });


    // -------------------------------------
    // IMAGE ANALYSIS
    // -------------------------------------

    $("analyzeImageBtn").addEventListener(
        "click",
        async () => {

            if (!selectedImage) {

                $("imageStatus").textContent =
                    "No image attached. Please select an image first.";

                return;
            }

            // Image preview is implemented.
            // A vision model and backend endpoint are
            // not connected yet.

            $("imageStatus").textContent =
                "Image selected successfully. AI image analysis is not available yet because a vision model has not been configured.";

        }
    );


    // =====================================
    // 8. KNOWLEDGE BASE MANAGEMENT
    // =====================================

    async function loadKnowledgeBase() {

        const list = $("knowledgeBaseList");

        const status = $("knowledgeBaseStatus");

        const refreshButton =
            $("refreshKnowledgeBaseBtn");

        if (!list || !status) return;

        status.textContent =
            "Loading documents...";

        list.replaceChildren();

        if (refreshButton) {
            refreshButton.disabled = true;
        }

        try {

            const data = await apiRequest(
                "/files/knowledge-base"
            );

            const documents = data.documents || [];

            if (documents.length === 0) {

                status.textContent =
                    "Your Knowledge Base is empty.";

                const empty = document.createElement("p");

                empty.textContent =
                    "Upload a document to get started.";

                list.appendChild(empty);

                return;
            }

            status.textContent =
                `${documents.length} document(s) stored.`;

            documents.forEach(document => {

                const card = document.createElement("div");

                card.className =
                    "knowledge-base-item";

                const details =
                    document.createElement("div");

                const name =
                    document.createElement("h3");

                name.textContent =
                    document.filename;

                const metadata =
                    document.createElement("p");

                const sizeMB =
                    (
                        document.file_size /
                        (1024 * 1024)
                    ).toFixed(2);

                metadata.textContent =
                    `${sizeMB} MB | ${document.chunks} chunks | ${document.status}`;

                details.appendChild(name);

                details.appendChild(metadata);

                const deleteButton =
                    document.createElement("button");

                deleteButton.type = "button";

                deleteButton.textContent = "Delete";

                deleteButton.className = "ghost-btn";

                deleteButton.addEventListener(
                    "click",
                    async () => {

                        const confirmed = window.confirm(
                            `Delete "${document.filename}" from your Knowledge Base?`
                        );

                        if (!confirmed) return;

                        deleteButton.disabled = true;

                        deleteButton.textContent =
                            "Deleting...";

                        try {

                            await apiRequest(
                                `/files/knowledge-base/${document.id}`,
                                {
                                    method: "DELETE"
                                }
                            );

                            await loadKnowledgeBase();

                        } catch (error) {

                            status.textContent =
                                error.message;

                            deleteButton.disabled = false;

                            deleteButton.textContent =
                                "Delete";

                        }

                    }
                );

                card.appendChild(details);

                card.appendChild(deleteButton);

                list.appendChild(card);

            });

        } catch (error) {

            status.textContent =
                error.message;

        } finally {

            if (refreshButton) {
                refreshButton.disabled = false;
            }

        }

    }


    // -------------------------------------
    // REFRESH KNOWLEDGE BASE
    // -------------------------------------

    $("refreshKnowledgeBaseBtn").addEventListener(
        "click",
        loadKnowledgeBase
    );


    // =====================================
    // 9. CHAT ATTACHMENT MANAGEMENT
    // =====================================

    // -------------------------------------
    // OPEN FILE SELECTOR
    // -------------------------------------

    $("attachFileBtn").addEventListener("click", () => {

        $("chatFileInput").click();

    });


    // -------------------------------------
    // CHAT ATTACHMENT SELECTION
    // -------------------------------------

    $("chatFileInput").addEventListener("change", () => {

        chatAttachment =
            $("chatFileInput").files[0];

        if (!chatAttachment) return;

        const allowed = [
            ".pdf",
            ".txt",
            ".csv",
            ".docx"
        ];

        const extension =
            "." + chatAttachment.name.split(".").pop().toLowerCase();

        if (!allowed.includes(extension)) {

            $("chatStatus").textContent =
                "Only PDF, TXT, CSV and DOCX files are supported.";

            clearChatAttachment();

            return;
        }

        if (
            chatAttachment.size === 0 ||
            chatAttachment.size > 10 * 1024 * 1024
        ) {

            $("chatStatus").textContent =
                "File must be non-empty and no larger than 10 MB.";

            clearChatAttachment();

            return;
        }

        $("chatAttachmentName").textContent =
            chatAttachment.name;

        $("chatAttachmentPreview").hidden = false;

        $("chatStatus").textContent =
            "File attached. Enter your question and send.";

    });


    // -------------------------------------
    // CLEAR CHAT ATTACHMENT
    // -------------------------------------

    function clearChatAttachment() {

        chatAttachment = null;

        $("chatFileInput").value = "";

        $("chatAttachmentPreview").hidden = true;

        $("chatAttachmentName").textContent = "";

    }


    // -------------------------------------
    // REMOVE CHAT ATTACHMENT
    // -------------------------------------

    $("removeChatAttachment").addEventListener(
        "click",
        () => {

            clearChatAttachment();

            $("chatStatus").textContent = "";

        }
    );


    // =====================================
    // 10. CHAT MESSAGE RENDERING
    // =====================================

    function renderMessage(role, content, sources = []) {

        const message =
            document.createElement("div");

        message.className =
            `chat-message ${role}`;

        const messageContent =
            document.createElement("div");

        messageContent.className =
            "message-content";

        // textContent prevents uploaded or AI-generated
        // content from being interpreted as HTML.
        messageContent.textContent =
            content;

        message.appendChild(messageContent);


        // ---------------------------------
        // RAG SOURCE ATTRIBUTION
        // ---------------------------------

        if (
            role === "assistant" &&
            Array.isArray(sources) &&
            sources.length > 0
        ) {

            const sourceContainer =
                document.createElement("div");

            sourceContainer.className =
                "message-sources";

            const sourceHeading =
                document.createElement("h4");

            sourceHeading.textContent =
                `Sources (${sources.length})`;

            sourceContainer.appendChild(
                sourceHeading
            );

            sources.forEach(source => {

                const sourceCard =
                    document.createElement("div");

                sourceCard.className =
                    "message-source-card";

                const filename =
                    document.createElement("p");

                filename.className =
                    "message-source-filename";

                filename.textContent =
                    source.filename || "Unknown document";

                const chunkInfo =
                    document.createElement("p");

                chunkInfo.className =
                    "message-source-chunk";

                const chunkNumber =
                    Number.isInteger(source.chunk_index)
                        ? source.chunk_index + 1
                        : null;

                chunkInfo.textContent =
                    chunkNumber !== null
                        ? `Chunk ${chunkNumber}`
                        : "Chunk information unavailable";

                sourceCard.appendChild(filename);

                sourceCard.appendChild(chunkInfo);

                sourceContainer.appendChild(sourceCard);

            });

            message.appendChild(sourceContainer);

        }

        chatMessages.appendChild(message);

        chatMessages.scrollTop =
            chatMessages.scrollHeight;

    }


    // =====================================
    // 11. RESET CHAT INTERFACE
    // =====================================

    function resetChatInterface() {

        chatMessages.innerHTML =
            initialChatMarkup;

        currentConversationId = null;

        clearChatAttachment();

        updateActiveConversation();

        $("chatInput").value = "";

        $("chatStatus").textContent = "";

    }


    // =====================================
    // 12. LOAD CONVERSATION HISTORY
    // =====================================

    async function loadConversations() {

        const list = $("conversationList");

        list.textContent =
            "Loading conversations...";

        try {

            const data = await apiRequest(
                "/chat/conversations"
            );

            const conversations =
                data.conversations || [];

            list.replaceChildren();

            if (conversations.length === 0) {

                const empty =
                    document.createElement("p");

                empty.className =
                    "conversation-empty";

                empty.textContent =
                    "No conversations yet.";

                list.appendChild(empty);

                return;
            }

            conversations.forEach(conversation => {

                const item =
                    document.createElement("div");

                item.className =
                    "conversation-item";

                item.dataset.id =
                    conversation.id;

                const openButton =
                    document.createElement("button");

                openButton.type = "button";

                openButton.className =
                    "conversation-open";

                openButton.textContent =
                    conversation.title || "New Conversation";

                openButton.addEventListener(
                    "click",
                    () => {

                        openConversation(
                            conversation.id
                        );

                    }
                );

                const deleteButton =
                    document.createElement("button");

                deleteButton.type = "button";

                deleteButton.className =
                    "conversation-delete";

                deleteButton.textContent =
                    "Delete";

                deleteButton.title =
                    "Delete conversation";

                deleteButton.addEventListener(
                    "click",
                    () => {

                        deleteConversation(
                            conversation.id
                        );

                    }
                );

                item.appendChild(openButton);

                item.appendChild(deleteButton);

                list.appendChild(item);

            });

            updateActiveConversation();

        } catch (error) {

            list.textContent =
                error.message;

        }

    }


    // =====================================
    // 13. ACTIVE CONVERSATION HIGHLIGHT
    // =====================================

    function updateActiveConversation() {

        document.querySelectorAll(
            ".conversation-item"
        ).forEach(item => {

            item.classList.toggle(
                "active",
                Number(item.dataset.id) ===
                    Number(currentConversationId) &&
                    currentConversationId !== null
            );

        });

    }


    // =====================================
    // 14. OPEN PREVIOUS CONVERSATION
    // =====================================

    async function openConversation(conversationId) {

        $("chatStatus").textContent =
            "Loading conversation...";

        try {

            const data = await apiRequest(
                `/chat/conversations/${conversationId}`
            );

            chatMessages.replaceChildren();

            clearChatAttachment();

            currentConversationId =
                conversationId;

            const messages =
                data.messages || [];

            messages.forEach(message => {

                renderMessage(
                    message.role,
                    message.content,
                    message.sources || []
                );

            });

            updateActiveConversation();

            $("chatStatus").textContent = "";

        } catch (error) {

            $("chatStatus").textContent =
                error.message;

        }

    }


    // =====================================
    // 15. CREATE NEW CHAT
    // =====================================

    $("newChatBtn").addEventListener("click", () => {

        resetChatInterface();

        $("chatInput").focus();

    });


    // =====================================
    // 16. DELETE CONVERSATION
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

            if (
                Number(currentConversationId) ===
                Number(conversationId)
            ) {

                resetChatInterface();

            }

            await loadConversations();

            $("chatStatus").textContent =
                "Conversation deleted successfully.";

        } catch (error) {

            $("chatStatus").textContent =
                error.message;

        }

    }


    // =====================================
    // 17. CHAT SUGGESTIONS
    // =====================================

    document.addEventListener("click", (event) => {

        const button =
            event.target.closest(".suggestion-btn");

        if (!button) return;

        $("chatInput").value =
            button.dataset.question || "";

        $("chatInput").focus();

    });


    // =====================================
    // 18. ENTER TO SEND
    // SHIFT + ENTER FOR NEW LINE
    // =====================================

    $("chatInput").addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.isComposing
            ) {

                event.preventDefault();

                $("chatForm").requestSubmit();

            }

        }
    );


    // =====================================
    // 19. SEND CHAT MESSAGE
    // =====================================

    $("chatForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const question =
                $("chatInput").value.trim();

            if (!question) return;

            const button =
                $("sendChatBtn");

            button.disabled = true;

            $("chatStatus").textContent =
                chatAttachment
                    ? "Processing attachment and generating answer..."
                    : "CyberMind AI is thinking...";

            renderMessage(
                "user",
                chatAttachment
                    ? `[Attachment: ${chatAttachment.name}]\n${question}`
                    : question
            );

            $("chatInput").value = "";

            try {

                let result;

                const wasAttachmentChat =
                    Boolean(chatAttachment);


                // ---------------------------------
                // CHAT WITH ATTACHMENT
                // ---------------------------------

                if (wasAttachmentChat) {

                    const formData =
                        new FormData();

                    formData.append(
                        "message",
                        question
                    );

                    formData.append(
                        "file",
                        chatAttachment
                    );

                    if (currentConversationId !== null) {

                        formData.append(
                            "conversation_id",
                            currentConversationId
                        );

                    }

                    result = await apiRequest(
                        "/chat/attachment",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                    clearChatAttachment();

                }


                // ---------------------------------
                // NORMAL CHAT WITH RAG
                // ---------------------------------

                else {

                    const payload = {
                        message: question,
                        conversation_id: currentConversationId
                    };

                    result = await apiRequest(
                        "/chat",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(payload)
                        }
                    );

                }


                // ---------------------------------
                // UPDATE CONVERSATION
                // ---------------------------------

                currentConversationId =
                    result.conversation_id;


                // ---------------------------------
                // DISPLAY ANSWER AND SOURCES
                // ---------------------------------

                renderMessage(
                    "assistant",
                    result.answer,
                    wasAttachmentChat
                        ? []
                        : (result.sources || [])
                );

                $("chatStatus").textContent = "";

                await loadConversations();

            } catch (error) {

                renderMessage(
                    "assistant",
                    "Unable to complete your request: " +
                    error.message
                );

                $("chatStatus").textContent =
                    error.message;

            } finally {

                button.disabled = false;

                $("chatInput").focus();

            }

        }
    );


    // =====================================
    // 20. CURRENT DATE
    // =====================================

    const dateElement =
        $("currentDate");

    if (dateElement) {

        dateElement.textContent =
            new Date().toLocaleDateString(
                undefined,
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );

    }


    // =====================================
    // 21. INITIALIZE DASHBOARD
    // =====================================

    // Enable both standalone analysis buttons.
    // Missing attachments are handled by their click handlers.

    $("analyzeDocumentBtn").disabled = false;

    $("analyzeImageBtn").disabled = false;

    loadSecurityLogs();

    loadConversations();

    loadKnowledgeBase();

});
