class ThreatReportFormatter:

    @staticmethod
    def format_report(data):

        if not data.get("success"):
            return data.get("message", "Analysis failed.")

        reputation = data.get("reputation", {})

        score = reputation.get("abuse_confidence_score")
        reports = reputation.get("total_reports")
        usage_type = reputation.get("usage_type")

        report = [
            "THREAT INTELLIGENCE REPORT",
            "=" * 30,
            "",
            f"Indicator: {data.get('indicator')}",
            f"Source: {data.get('source')}",
            "",
            "REPUTATION INFORMATION",
            "-" * 30,
            f"Abuse confidence score: {score}",
            f"Total reports: {reports}",
            f"Usage type: {usage_type}",
            "",
            "ASSESSMENT LIMITATIONS",
            "-" * 30,
            (
                "Reputation data is a third-party assessment. "
                "It does not independently confirm malicious activity."
            ),
            (
                "A low score or lack of reports does not establish "
                "that an indicator is safe."
            ),
        ]

        return "\n".join(report)