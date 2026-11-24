
import asyncio

from app.services.file_analyzer import FileAnalyzer


async def main():
    analyzer = FileAnalyzer()

    sample_text = """
    Security Event Report

    Multiple failed login attempts detected.
    Authentication logs require investigation.
    """

    result = await analyzer.analyze_document(
        "security_report.txt",
        sample_text
    )

    print("\n========== DOCUMENT AI ANALYSIS ==========")
    print(result["analysis"])
    print("\nCharacters analyzed:", result["characters_analyzed"])
    print("===========================================")


if __name__ == "__main__":
    asyncio.run(main())
