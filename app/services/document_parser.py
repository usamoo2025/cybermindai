
from pathlib import Path
from io import BytesIO, StringIO

import pandas as pd
from pypdf import PdfReader
from docx import Document


# ==========================================
# CONFIGURATION
# ==========================================

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".csv",
    ".docx"
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_EXTRACTED_CHARS = 100_000
MAX_PDF_PAGES = 100


# ==========================================
# 1. VALIDATE FILE
# ==========================================

def validate_file(filename: str, file_data: bytes):

    if not filename or not file_data:
        raise ValueError("Filename and file content are required.")

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file format.")

    if len(file_data) > MAX_FILE_SIZE:
        raise ValueError("File exceeds the 10 MB size limit.")

    # Check basic file signatures
    if extension == ".pdf":
        if not file_data.startswith(b"%PDF-"):
            raise ValueError("Invalid PDF file.")

    elif extension == ".docx":
        if not file_data.startswith(b"PK"):
            raise ValueError("Invalid DOCX file.")

    elif extension in {".txt", ".csv"}:
        try:
            file_data.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ValueError("Text file must use UTF-8 encoding.")

    return extension


# ==========================================
# 2. EXTRACT PDF TEXT
# ==========================================

def extract_pdf(file_data: bytes):

    reader = PdfReader(BytesIO(file_data))

    if len(reader.pages) > MAX_PDF_PAGES:
        raise ValueError("PDF exceeds the 100-page limit.")

    extracted = []

    for page_number, page in enumerate(reader.pages, start=1):

        page_text = page.extract_text() or ""

        extracted.append(
            f"Page {page_number}:\n{page_text}"
        )

        if sum(len(part) for part in extracted) > MAX_EXTRACTED_CHARS:
            break

    return "\n\n".join(extracted)


# ==========================================
# 3. EXTRACT TXT TEXT
# ==========================================

def extract_txt(file_data: bytes):

    return file_data.decode("utf-8-sig")


# ==========================================
# 4. EXTRACT CSV DATA
# ==========================================

def extract_csv(file_data: bytes):

    content = file_data.decode("utf-8-sig")

    dataframe = pd.read_csv(
        StringIO(content),
        nrows=5000
    )

    # Limit the number of columns
    dataframe = dataframe.iloc[:, :50]

    return dataframe.to_string(index=False)


# ==========================================
# 5. EXTRACT DOCX TEXT
# ==========================================

def extract_docx(file_data: bytes):

    document = Document(BytesIO(file_data))

    extracted = []

    for paragraph in document.paragraphs:

        if paragraph.text.strip():
            extracted.append(paragraph.text)

    # Extract table contents
    for table in document.tables:

        for row in table.rows:

            row_text = " | ".join(
                cell.text for cell in row.cells
            )

            extracted.append(row_text)

    return "\n".join(extracted)


# ==========================================
# 6. MAIN DOCUMENT PARSER
# ==========================================

def extract_document_text(filename: str, file_data: bytes):

    extension = validate_file(filename, file_data)

    if extension == ".pdf":
        text = extract_pdf(file_data)

    elif extension == ".txt":
        text = extract_txt(file_data)

    elif extension == ".csv":
        text = extract_csv(file_data)

    elif extension == ".docx":
        text = extract_docx(file_data)

    else:
        raise ValueError("Unsupported file format.")

    text = text.strip()

    if not text:
        raise ValueError("No readable text found in the document.")

    # Limit extracted content
    return text[:MAX_EXTRACTED_CHARS]
