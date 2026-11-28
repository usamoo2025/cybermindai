
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. ELEMENTS AND STATE
    // =====================================

    const $ = (id) => document.getElementById(id);

    let selectedDocument = null;
    let selectedImage = null;
    let chatAttachment = null;
    let currentConversationId = null;

    let sessionHistory = [];

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
                data.detail || data.message || "Request failed."
            );
        }

        return data;
    }


    // =====================================
    // 3. GENERAL HELPERS
    // =====================================

    function setText(id, value) {

        const element = $(id);

        if (element) {
            element.textContent = value ?? "";
        }

    }


    // First 4 words of a conversation title (full title stays in the tooltip)
    function shortTitle(title) {

        const words = (title || "New Conversation").trim().split(/\s+/);

        return words.length > 4
            ? words.slice(0, 4).join(" ") + "…"
            : words.join(" ");

    }


    function createReportBlock(text) {

        const block = document.createElement("pre");

        block.textContent = text || "No report returned.";

        block.style.whiteSpace = "pre-wrap";
        block.style.overflowWrap = "anywhere";

        return block;

    }


    function addHistoryEntry(title, details) {

        const entry = {
            title,
            details,
            date: new Date().toLocaleString()
        };

        sessionHistory.unshift(entry);

        renderHistory();

    }


    function renderHistory() {

        const container = $("analysisHistory");

        if (!container) return;

        container.replaceChildren();

        if (sessionHistory.length === 0) {

            const empty = document.createElement("p");

            empty.textContent =
                "No analysis activity recorded in this session.";

            container.appendChild(empty);

            setText(
                "historyStatus",
                "No activity recorded."
            );

            return;
        }

        setText(
            "historyStatus",
            `${sessionHistory.length} session activity item(s).`
        );

        sessionHistory.forEach(entry => {

            const card = document.createElement("article");

            card.className = "knowledge-base-item";

            const content = document.createElement("div");

            const heading = document.createElement("h3");

            heading.textContent = entry.title;

            const detail = document.createElement("p");

            detail.textContent = entry.details;

            const date = document.createElement("small");

            date.textContent = entry.date;

            content.appendChild(heading);
            content.appendChild(detail);
            content.appendChild(date);

            card.appendChild(content);

            container.appendChild(card);

        });

    }


    // =====================================
    // 5. LOGOUT
    // =====================================

    $("logoutBtn").addEventListener(
        "click",
        async () => {

            try {

                await apiRequest("/auth/logout", {
                    method: "POST"
                });

                window.location.href = "/login";

            } catch (error) {

                alert(error.message);

            }

        }
    );


    // =====================================
    // 6. SECURITY LOGS
    // =====================================

    async function loadSecurityLogs() {

        setText(
            "statusMessage",
            "Loading security logs..."
        );

        try {

            const data = await apiRequest("/logs");

            const logs = data.logs || [];

            setText(
                "totalLogs",
                data.total_logs ?? logs.length
            );

            setText(
                "phishingCount",
                logs.filter(log =>
                    (log.predicted_category || "")
                        .toLowerCase()
                        .includes("phishing")
                ).length
            );

            setText(
                "suspiciousCount",
                logs.filter(log =>
                    (log.predicted_category || "")
                        .toLowerCase()
                        .includes("suspicious")
                ).length
            );

            setText(
                "benignCount",
                logs.filter(log =>
                    (log.predicted_category || "")
                        .toLowerCase()
                        .includes("benign")
                ).length
            );

            const table = $("logsTable");

            table.replaceChildren();

            if (logs.length === 0) {

                setText(
                    "statusMessage",
                    "No security events recorded."
                );

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

                    cell.textContent = value ?? "";

                    row.appendChild(cell);

                });

                table.appendChild(row);

            });

            setText(
                "statusMessage",
                `Showing ${logs.length} security events.`
            );

        } catch (error) {

            setText(
                "statusMessage",
                error.message
            );

        }

    }


    // =====================================
    // 7. CREATE SECURITY EVENT
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

                const result = await apiRequest(
                    "/logs",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );

                setText(
                    "logFormStatus",
                    result.message || "Event saved."
                );

                $("securityLogForm").reset();

                addHistoryEntry(
                    "Security Event",
                    payload.event_type
                );

                await loadSecurityLogs();

            } catch (error) {

                setText(
                    "logFormStatus",
                    error.message
                );

            } finally {

                button.disabled = false;

                button.textContent =
                    "Save Security Event";

            }

        }
    );


    // =====================================
    // 8. DOCUMENT ANALYSIS
    // =====================================

    $("documentInput").addEventListener(
        "change",
        () => {

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

                setText(
                    "documentStatus",
                    "Unsupported format. Use PDF, TXT, CSV or DOCX."
                );

                $("documentInput").value = "";

                selectedDocument = null;

                return;

            }

            if (
                file.size === 0 ||
                file.size > 10 * 1024 * 1024
            ) {

                setText(
                    "documentStatus",
                    "File must be non-empty and no larger than 10 MB."
                );

                $("documentInput").value = "";

                selectedDocument = null;

                return;

            }

            selectedDocument = file;

            setText(
                "documentFileName",
                file.name
            );

            $("documentFileInfo").hidden = false;

            $("analyzeDocumentBtn").disabled = false;

            setText(
                "documentStatus",
                "Document selected. Ready for analysis."
            );

        }
    );


    $("removeDocument").addEventListener(
        "click",
        () => {

            selectedDocument = null;

            $("documentInput").value = "";

            $("documentFileInfo").hidden = true;

            $("analyzeDocumentBtn").disabled = false;

            setText(
                "documentStatus",
                "No file attached."
            );

        }
    );


    $("analyzeDocumentBtn").addEventListener(
        "click",
        async () => {

            if (!selectedDocument) {

                setText(
                    "documentStatus",
                    "Please select a document first."
                );

                return;

            }

            const button = $("analyzeDocumentBtn");

            const fileBeingAnalyzed =
                selectedDocument;

            const formData = new FormData();

            formData.append(
                "file",
                fileBeingAnalyzed
            );

            button.disabled = true;

            button.textContent = "Analyzing...";

            setText(
                "documentStatus",
                "Processing document..."
            );

            try {

                const result = await apiRequest(
                    "/files/analyze",
                    {
                        method: "POST",
                        body: formData
                    }
                );

                setText(
                    "uploadAnalysisTitle",
                    result.filename ||
                    fileBeingAnalyzed.name
                );

                const content =
                    $("uploadAnalysisContent");

                content.replaceChildren();

                content.appendChild(
                    createReportBlock(
                        result.analysis ||
                        result.report ||
                        "No analysis returned."
                    )
                );

                $("uploadAnalysisOutput").hidden = false;

                setText(
                    "documentStatus",
                    "Document analysis completed."
                );

                addHistoryEntry(
                    "Document Analysis",
                    fileBeingAnalyzed.name
                );

                await loadKnowledgeBase();

                $("uploadAnalysisOutput").scrollIntoView({
                    behavior: "smooth"
                });

            } catch (error) {

                setText(
                    "documentStatus",
                    error.message
                );

            } finally {

                button.disabled = false;

                button.textContent =
                    "Analyze Document";

            }

        }
    );


    // =====================================
    // 9. IMAGE PREVIEW AND ANALYSIS UI
    // =====================================

    $("imageInput").addEventListener(
        "change",
        () => {

            const file = $("imageInput").files[0];

            if (!file) return;

            const allowed = [
                "image/png",
                "image/jpeg",
                "image/webp"
            ];

            if (!allowed.includes(file.type)) {

                setText(
                    "imageStatus",
                    "Unsupported format. Use PNG, JPEG or WEBP."
                );

                $("imageInput").value = "";

                selectedImage = null;

                return;

            }

            if (
                file.size === 0 ||
                file.size > 10 * 1024 * 1024
            ) {

                setText(
                    "imageStatus",
                    "Image must be non-empty and no larger than 10 MB."
                );

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

            setText(
                "imageStatus",
                "Image selected."
            );

        }
    );


    $("removeImage").addEventListener(
        "click",
        () => {

            if ($("imagePreview").src.startsWith("blob:")) {

                URL.revokeObjectURL(
                    $("imagePreview").src
                );

            }

            selectedImage = null;

            $("imageInput").value = "";

            $("imagePreview").removeAttribute("src");

            $("imagePreviewContainer").hidden = true;

            $("imageAnalysisOutput").hidden = true;

            setText(
                "imageStatus",
                "No image selected."
            );

        }
    );


    $("analyzeImageBtn").addEventListener(
        "click",
        async () => {

            if (!selectedImage) {
                setText(
                    "imageStatus",
                    "Select an image first."
                );
                return;
            }

            const button = $("analyzeImageBtn");
            const output = $("imageAnalysisContent");

            button.disabled = true;

            setText(
                "imageStatus",
                "Analyzing image..."
            );

            output.replaceChildren();

            try {

                // Prepare the image for upload.
                const formData = new FormData();

                formData.append("file", selectedImage);

                // Send image to FastAPI.
                const response = await fetch(
                    "/image/analyze",
                    {
                        method: "POST",
                        credentials: "same-origin",
                        body: formData
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail || "Image analysis failed."
                    );
                }

                const result = data.analysis;

                // Build the actual analysis report.
                const report = [
                    "IMAGE SECURITY ANALYSIS",
                    "",
                    "Filename: " + result.filename,
                    "Verdict: " + result.verdict,
                    "Format: " + result.format,
                    "Dimensions: " +
                        result.width + " x " + result.height,
                    "File Size: " +
                        (result.file_size / 1024).toFixed(2) + " KB",
                    "SHA-256: " + result.sha256,
                    "Byte Entropy: " + result.entropy,
                    "",
                    "FINDINGS",
                    ...(result.findings || []).map(
                        (finding, index) =>
                            (index + 1) + ". " + finding
                    ),
                    "",
                    "IMAGE METADATA",
                    JSON.stringify(
                        result.metadata || {},
                        null,
                        2
                    ),
                    "",
                    "Note: This is technical image inspection. " +
                    "It does not establish whether an image is malicious."
                ].join("\n");

                // Display results in the dashboard.
                output.replaceChildren();

                output.appendChild(
                    createReportBlock(report)
                );

                $("imageAnalysisTitle").textContent =
                    result.filename || selectedImage.name;

                $("imageAnalysisOutput").hidden = false;

                setText(
                    "imageStatus",
                    "Image analysis completed successfully."
                );

                addHistoryEntry(
                    "Image Analysis",
                    selectedImage.name
                );

            } catch (error) {

                setText(
                    "imageStatus",
                    error.message || "Could not analyze image."
                );

                output.replaceChildren();

                output.appendChild(
                    createReportBlock(
                        "Image analysis failed.\n\n" +
                        (error.message || "Unknown error.")
                    )
                );

                $("imageAnalysisOutput").hidden = false;

            } finally {

                button.disabled = !selectedImage;

            }
        }
    );

    // =====================================
    // 10. KNOWLEDGE BASE
    // =====================================

    async function loadKnowledgeBase() {

        const list = $("knowledgeBaseList");

        const status = $("knowledgeBaseStatus");

        const refreshButton =
            $("refreshKnowledgeBaseBtn");

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

            const documents =
                data.documents || [];

            if (documents.length === 0) {

                status.textContent =
                    "Knowledge Base is empty.";

                const empty =
                    document.createElement("p");

                empty.textContent =
                    "Upload a document to get started.";

                list.appendChild(empty);

                return;

            }

            status.textContent =
                `${documents.length} document(s) stored.`;

            documents.forEach(documentData => {

                const card =
                    document.createElement("div");

                card.className =
                    "knowledge-base-item";

                const details =
                    document.createElement("div");

                const name =
                    document.createElement("h3");

                name.textContent =
                    documentData.filename;

                const metadata =
                    document.createElement("p");

                const sizeMB = (
                    documentData.file_size /
                    (1024 * 1024)
                ).toFixed(2);

                metadata.textContent =
                    `${sizeMB} MB | ` +
                    `${documentData.chunks} chunks | ` +
                    `${documentData.status}`;

                details.appendChild(name);
                details.appendChild(metadata);

                const deleteButton =
                    document.createElement("button");

                deleteButton.type = "button";

                deleteButton.textContent = "Delete";

                deleteButton.className =
                    "ghost-btn";

                deleteButton.addEventListener(
                    "click",
                    async () => {

                        const confirmed =
                            window.confirm(
                                `Delete "${documentData.filename}" from your Knowledge Base?`
                            );

                        if (!confirmed) return;

                        deleteButton.disabled = true;

                        deleteButton.textContent =
                            "Deleting...";

                        try {

                            await apiRequest(
                                `/files/knowledge-base/${documentData.id}`,
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


    $("refreshKnowledgeBaseBtn").addEventListener(
        "click",
        loadKnowledgeBase
    );


    // =====================================
    // 11. CHAT ATTACHMENTS
    // =====================================

    $("attachFileBtn").addEventListener(
        "click",
        () => {
            $("chatFileInput").click();
        }
    );


    $("chatFileInput").addEventListener(
        "change",
        () => {

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
                "." +
                chatAttachment.name
                    .split(".")
                    .pop()
                    .toLowerCase();

            if (!allowed.includes(extension)) {

                setText(
                    "chatStatus",
                    "Only PDF, TXT, CSV and DOCX files are supported."
                );

                clearChatAttachment();

                return;

            }

            if (
                chatAttachment.size === 0 ||
                chatAttachment.size > 10 * 1024 * 1024
            ) {

                setText(
                    "chatStatus",
                    "File must be non-empty and no larger than 10 MB."
                );

                clearChatAttachment();

                return;

            }

            setText(
                "chatAttachmentName",
                chatAttachment.name
            );

            $("chatAttachmentPreview").hidden = false;

            setText(
                "chatStatus",
                "Attachment ready."
            );

        }
    );


    function clearChatAttachment() {

        chatAttachment = null;

        $("chatFileInput").value = "";

        $("chatAttachmentPreview").hidden = true;

        $("chatAttachmentName").textContent = "";

    }


    $("removeChatAttachment").addEventListener(
        "click",
        () => {

            clearChatAttachment();

            setText(
                "chatStatus",
                ""
            );

        }
    );


    // =====================================
    // 12. CHAT MESSAGE RENDERING
    // =====================================

    function renderMessage(
        role,
        content,
        sources = []
    ) {

        const message =
            document.createElement("div");

        message.className =
            `chat-message ${role}`;

        const messageContent =
            document.createElement("div");

        messageContent.className =
            "message-content";

        messageContent.textContent =
            content || "";

        message.appendChild(messageContent);


        // RAG SOURCE ATTRIBUTION

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
                    source.filename ||
                    "Unknown document";

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
    // 13. RESET CHAT
    // =====================================

    function resetChatInterface() {

        chatMessages.innerHTML =
            initialChatMarkup;

        currentConversationId = null;

        clearChatAttachment();

        updateActiveConversation();

        $("chatInput").value = "";

        setText(
            "chatStatus",
            ""
        );

    }


    // =====================================
    // 14. LOAD CONVERSATIONS
    // =====================================

    async function loadConversations() {

        const list =
            $("conversationList");

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
                    shortTitle(conversation.title);

                openButton.title =
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
    // 15. ACTIVE CONVERSATION
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
    // 16. OPEN CONVERSATION
    // =====================================

    async function openConversation(
        conversationId
    ) {

        setText(
            "chatStatus",
            "Loading conversation..."
        );

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

            setText(
                "chatStatus",
                ""
            );

        } catch (error) {

            setText(
                "chatStatus",
                error.message
            );

        }

    }


    // =====================================
    // 17. NEW CHAT
    // =====================================

    $("newChatBtn").addEventListener(
        "click",
        () => {

            resetChatInterface();

            $("chatInput").focus();

        }
    );


    // =====================================
    // 18. DELETE CONVERSATION
    // =====================================

    async function deleteConversation(
        conversationId
    ) {

        const confirmed =
            window.confirm(
                "Delete this conversation?"
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

            setText(
                "chatStatus",
                "Conversation deleted."
            );

        } catch (error) {

            setText(
                "chatStatus",
                error.message
            );

        }

    }


    // =====================================
    // 19. CHAT SUGGESTIONS
    // =====================================

    document.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    ".suggestion-btn"
                );

            if (!button) return;

            $("chatInput").value =
                button.dataset.question || "";

            $("chatInput").focus();

        }
    );


    // =====================================
    // 20. ENTER TO SEND
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
    // 21. CHAT SUBMISSION
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

            setText(
                "chatStatus",
                chatAttachment
                    ? "Processing attachment..."
                    : "CyberMind AI is thinking..."
            );

            const attachmentName =
                chatAttachment
                    ? chatAttachment.name
                    : null;

            renderMessage(
                "user",
                attachmentName
                    ? `[Attachment: ${attachmentName}]\n${question}`
                    : question
            );

            $("chatInput").value = "";

            try {

                let result;

                const wasAttachmentChat =
                    Boolean(chatAttachment);


                // ATTACHMENT CHAT

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

                    if (
                        currentConversationId !== null
                    ) {

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


                // NORMAL RAG CHAT

                else {

                    const payload = {
                        message: question,
                        conversation_id:
                            currentConversationId
                    };

                    result = await apiRequest(
                        "/chat",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify(payload)
                        }
                    );

                }


                // CONVERSATION ID

                currentConversationId =
                    result.conversation_id;


                // RESPONSE

                renderMessage(
                    "assistant",
                    result.answer ||
                    "No answer returned.",
                    wasAttachmentChat
                        ? []
                        : (result.sources || [])
                );


                addHistoryEntry(
                    "AI Chat",
                    question
                );

                setText(
                    "chatStatus",
                    ""
                );

                await loadConversations();

            } catch (error) {

                renderMessage(
                    "assistant",
                    "Unable to complete your request: " +
                    error.message
                );

                setText(
                    "chatStatus",
                    error.message
                );

            } finally {

                button.disabled = false;

                $("chatInput").focus();

            }

        }
    );


    // =====================================
    // 22. PHISHING URL UI
    // =====================================

    $("phishingUrlForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const url =
                $("phishingUrlInput").value.trim();

            if (!url) return;

            const button =
                $("analyzeUrlBtn");

            button.disabled = true;

            button.textContent =
                "Analyzing...";

            setText(
                "phishingUrlStatus",
                "Processing URL..."
            );

            $("phishingAnalysisOutput").hidden =
                true;

            try {

                // Assumes the backend accepts
                // { "url": "..." } at /url/analyze.
                // Confirm this against your route.

                const result = await apiRequest(
                    "/url/analyze",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            url: url
                        })
                    }
                );

                const content =
                    $("phishingAnalysisContent");

                content.replaceChildren();

                content.appendChild(
                    createReportBlock(
                        result.report ||
                        result.analysis ||
                        result.message ||
                        JSON.stringify(
                            result,
                            null,
                            2
                        )
                    )
                );

                $("phishingAnalysisOutput").hidden =
                    false;

                setText(
                    "phishingUrlStatus",
                    "URL assessment completed."
                );

                addHistoryEntry(
                    "URL Assessment",
                    url
                );

                $("phishingAnalysisOutput").scrollIntoView({
                    behavior: "smooth"
                });

            } catch (error) {

                setText(
                    "phishingUrlStatus",
                    error.message
                );

            } finally {

                button.disabled = false;

                button.textContent =
                    "Analyze URL";

            }

        }
    );


    // =====================================
    // 23. THREAT INTELLIGENCE
    // =====================================

    $("threatIntelligenceForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const indicator =
                $("threatIndicatorInput").value.trim();

            if (!indicator) {

                setText(
                    "threatIntelligenceStatus",
                    "Enter an indicator first."
                );

                return;

            }

            const button =
                $("analyzeThreatIndicatorBtn");

            button.disabled = true;

            button.textContent =
                "Assessing...";

            setText(
                "threatIntelligenceStatus",
                "Processing indicator..."
            );

            $("threatIntelligenceOutput").hidden =
                true;

            try {

                const result = await apiRequest(
                    "/threat-intelligence/analyze",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            indicator: indicator
                        })
                    }
                );

                const analysis =
                    result.analysis || result;

                setText(
                    "threatIndicatorType",
                    "Indicator Type: " +
                    (
                        analysis.indicator_type ||
                        "Unknown"
                    )
                );

                const content =
                    $("threatIntelligenceContent");

                content.replaceChildren();

                content.appendChild(
                    createReportBlock(
                        analysis.report ||
                        analysis.message ||
                        result.report ||
                        result.message ||
                        JSON.stringify(
                            analysis,
                            null,
                            2
                        )
                    )
                );

                $("threatIntelligenceOutput").hidden =
                    false;

                setText(
                    "threatIntelligenceStatus",
                    "Assessment completed."
                );

                addHistoryEntry(
                    "Threat Intelligence",
                    indicator
                );

                $("threatIntelligenceOutput").scrollIntoView({
                    behavior: "smooth"
                });

            } catch (error) {

                setText(
                    "threatIntelligenceStatus",
                    error.message
                );

            } finally {

                button.disabled = false;

                button.textContent =
                    "Assess Indicator";

            }

        }
    );


    // =====================================
    // 24. DATE
    // =====================================

    setText(
        "currentDate",
        new Date().toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        )
    );


    // =====================================
    // 25. HISTORY REFRESH
    // =====================================

    $("refreshHistoryBtn").addEventListener(
        "click",
        renderHistory
    );


    // =====================================
    // 26. INITIALIZE
    // =====================================

    renderHistory();

    loadSecurityLogs();

    loadConversations();

    loadKnowledgeBase();

});
