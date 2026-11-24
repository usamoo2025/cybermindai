# 🧠 CyberMind AI

### Local AI-Powered Cybersecurity Intelligence Assistant

**CyberMind AI** is an open-source, locally hosted AI cybersecurity assistant built with Python, FastAPI, PostgreSQL, and Ollama.

It combines local Large Language Model (LLM) capabilities with cybersecurity event classification, document processing, user authentication, and persistent AI conversations.


<p align="center">

![PLATFORM](https://img.shields.io/badge/PLATFORM-WINDOWS%20%7C%20LINUX-blue?style=for-the-badge&logo=windows)

![PYTHON](https://img.shields.io/badge/LANGUAGE-PYTHON-3776AB?style=for-the-badge&logo=python&logoColor=white)

![AI](https://img.shields.io/badge/AI-OLLAMA-black?style=for-the-badge)

![MODEL](https://img.shields.io/badge/MODEL-LLAMA%203.2-0467DF?style=for-the-badge)

![BACKEND](https://img.shields.io/badge/BACKEND-FASTAPI-009688?style=for-the-badge&logo=fastapi)

![DATABASE](https://img.shields.io/badge/DATABASE-POSTGRESQL-4169E1?style=for-the-badge&logo=postgresql)

![GUI](https://img.shields.io/badge/INTERFACE-WEB%20DASHBOARD-8A2BE2?style=for-the-badge)

![STATUS](https://img.shields.io/badge/STATUS-ACTIVE%20DEVELOPMENT-2EA44F?style=for-the-badge)

</p>


<p align="center">

**Python · FastAPI · PostgreSQL · Ollama · Llama 3.2 · Machine Learning**

</p>

<p align="center">

[GitHub Repository](https://github.com/usamoo2025/cybermindai) · [Report an Issue](https://github.com/usamoo2025/cybermindai/issues) · [GitHub Profile](https://github.com/usamoo2025)

</p>

---

## 📌 About

CyberMind AI aims to provide a centralized platform for AI-assisted cybersecurity analysis.

The application uses a locally hosted language model through Ollama, allowing users to interact with an AI assistant without depending on a cloud-based LLM API for the current chat functionality.

The platform brings together AI conversations, security log management, document text extraction, and machine-learning-based security event classification.

The project is actively being developed, with plans to introduce Retrieval-Augmented Generation (RAG), vector search, and more advanced security intelligence features.

## ✨ Features

### 🤖 AI Assistant
- Local AI integration using Ollama.
- Llama 3.2 1B model support.
- Interactive AI-powered chat interface.
- Persistent conversation history.
- Create new conversations.
- Retrieve previous conversations.
- Delete individual conversations.
- Context-aware responses using recent conversation messages.
- Cybersecurity-focused system instructions.

### 🔐 User Authentication
- User registration.
- User login and logout.
- Session-based authentication.
- Protected backend endpoints.
- User-specific application data.
- Session cookie configuration for local development.

### 🛡️ Security Log Management
- Create and store security events.
- Retrieve saved security logs.
- Automatic security event classification.
- Classification confidence scores.
- PostgreSQL-backed persistence.

### 📄 Document Intelligence
- Document text extraction.
- Support for:
  - PDF
  - TXT
  - CSV
  - DOCX
- Extracted text prepared for further security analysis.
- Document-grounded AI question answering planned for the RAG development phase.

### 📊 Dashboard
- Centralized application dashboard.
- AI assistant interface.
- Security log management.
- Document upload interface.
- Conversation history.
- Application navigation.
- Responsive frontend development.

### 💻 Local AI Infrastructure
- Ollama-based local model execution.
- Configurable language model.
- Local API communication.
- No cloud LLM API required for the current chat workflow.

---

## 🧰 Technology Stack

| Component | Technology |
|---|---|
| Programming Language | Python |
| Backend Framework | FastAPI |
| Frontend | HTML, CSS, JavaScript |
| Database | PostgreSQL |
| Database Driver | Psycopg |
| Local LLM Runtime | Ollama |
| Language Model | Llama 3.2 1B |
| AI Communication | HTTPX |
| Data Validation | Pydantic |
| Authentication | Session-based authentication |
| Machine Learning | Scikit-learn |
| Model Persistence | Joblib |

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the application:

- Python 3.11 or later
- PostgreSQL
- Git
- Ollama

### 1. Clone the Repository

```bash
git clone https://github.com/usamoo2025/cybermindai.git
cd cybermindai
```

### 2. Create a Virtual Environment

**Windows PowerShell:**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Example configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:1b
```

Replace the database values with your PostgreSQL configuration.

**Important:** Never commit your `.env` file or expose database credentials and other sensitive information.

### 5. Install and Configure Ollama

Download and install Ollama:

https://ollama.com/

Pull the supported language model:

```powershell
ollama pull llama3.2:1b
```

Check the installed model:

```powershell
ollama list
```

Make sure Ollama is running before using the AI assistant.

### 6. Configure PostgreSQL

Create a PostgreSQL database for CyberMind AI.

The application requires database tables for its user authentication, security logs, chat conversations, and chat messages.

Configure your database credentials in the `.env` file and ensure the required database schema has been created.

### 7. Run the Application

From the project root, execute:

```powershell
uvicorn app.main:app --reload
```

Open the application in your browser:

| Service | Address |
|---|---|
| Web Application | http://127.0.0.1:8000 |
| API Documentation | http://127.0.0.1:8000/docs |
| Health Check | http://127.0.0.1:8000/health |
| Ollama API | http://127.0.0.1:11434 |

---

## 🧩 Application Modules

### Authentication Module

Handles user registration, login, logout, session management, and protected API access.

### AI Assistant Module

Connects the application to Ollama and provides local AI chat functionality with persistent conversation storage.

### Security Analysis Module

Processes security event descriptions and uses the classification component to predict security event categories and confidence scores.

### Document Processing Module

Extracts text from supported document formats and prepares it for subsequent security analysis.

### Database Module

Manages PostgreSQL connectivity and persistent application data.

---

## 🚀 Development Roadmap

CyberMind AI is actively evolving. The following features are planned or under development.

### AI Engineering
- [ ] Structured AI responses using Pydantic.
- [ ] Improved prompt engineering.
- [ ] Controlled AI tool calling.
- [ ] Local embedding generation.
- [ ] Embedding storage using PostgreSQL pgvector.
- [ ] Vector similarity search.
- [ ] Retrieval-Augmented Generation (RAG).
- [ ] Document-grounded question answering.
- [ ] Source citations in AI responses.

### Security Intelligence
- [ ] Advanced security log analysis.
- [ ] Threat intelligence integration.
- [ ] Improved security event classification.
- [ ] Automated security report generation.
- [ ] Context-aware security investigations.

### Document and Image Intelligence
- [ ] Complete document question-answering workflow.
- [ ] Document chunking and embedding.
- [ ] Local vision model integration.
- [ ] Image-based security analysis.

### Engineering and Deployment
- [ ] Automated testing with pytest.
- [ ] Database performance improvements.
- [ ] Docker containerization.
- [ ] Deployment documentation.
- [ ] Improved error handling and logging.
- [ ] Technical documentation.

---

## 🔒 Security Considerations

CyberMind AI is intended for educational, defensive cybersecurity analysis and authorized security monitoring.

Security recommendations:

- Protect database credentials and application secrets.
- Keep environment configuration outside version control.
- Require authentication for private application data.
- Validate user input.
- Use parameterized SQL queries.
- Restrict access to uploaded documents.
- Avoid exposing private logs or sensitive information.
- Review AI-generated security findings before relying on them.

Local LLM execution does not automatically guarantee complete application privacy or security. Database, operating system, and network access must also be protected.

---

## 📈 Current Project Status

<badge color="success">Active Development</badge>

Currently implemented:

- [x] FastAPI backend.
- [x] PostgreSQL database integration.
- [x] User authentication.
- [x] Local Ollama integration.
- [x] Llama 3.2 1B support.
- [x] AI chatbot.
- [x] Persistent chat conversations.
- [x] Security log management.
- [x] Security event classification.
- [x] Document text extraction.
- [x] Dashboard interface.

Planned development:

- [ ] Embeddings and vector search.
- [ ] Complete RAG functionality.
- [ ] Document-grounded AI responses.
- [ ] Advanced threat intelligence.
- [ ] Automated testing.
- [ ] Docker deployment.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

To contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Implement your changes.
4. Test your changes.
5. Submit a pull request.

For bugs and feature requests, visit:

[Report an Issue](https://github.com/usamoo2025/cybermindai/issues)

---

## 📜 License

This project is currently under active development.

A license should be added to the repository before distributing it as open-source software.

---

## 👨‍💻 Author

**Usama Iqbal**

- GitHub: [@usamoo2025](https://github.com/usamoo2025)
- Project: [CyberMind AI](https://github.com/usamoo2025/cybermindai)
- Issues and Suggestions: [Report an Issue](https://github.com/usamoo2025/cybermindai/issues)

---

<p align="center">

**CyberMind AI**

*Bringing Local AI and Cybersecurity Intelligence Together.*

</p>