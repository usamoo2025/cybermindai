import os
import ipaddress

import httpx
from dotenv import load_dotenv

load_dotenv()


class ThreatIntelligenceAnalyzer:

    def __init__(self):

        self.api_key = os.getenv("ABUSEIPDB_API_KEY")

        self.api_url = "https://api.abuseipdb.com/api/v2/check"

        self.timeout = 10

    def check_internet(self):

        try:
            with httpx.Client(timeout=5) as client:
                response = client.get(
                    "https://www.cloudflare.com/cdn-cgi/trace"
                )

                response.raise_for_status()
                return True

        except httpx.HTTPError:
            return False

    def analyze(self, indicator):

        indicator = indicator.strip()

        # This version supports individual IP addresses only.
        try:
            ip = ipaddress.ip_address(indicator)
        except ValueError:
            return {
                "success": False,
                "message": "Please enter a valid IP address."
            }

        if not ip.is_global:
            return {
                "success": False,
                "message": "Only public IP addresses are supported."
            }

        if not self.api_key:
            return {
                "success": False,
                "message": "AbuseIPDB API key is not configured."
            }

        if not self.check_internet():
            return {
                "success": False,
                "message": (
                    "Internet connection is required "
                    "for Threat Intelligence Analysis."
                )
            }

        headers = {
            "Key": self.api_key,
            "Accept": "application/json"
        }

        params = {
            "ipAddress": str(ip),
            "maxAgeInDays": 90
        }

        try:

            with httpx.Client(timeout=self.timeout) as client:

                response = client.get(
                    self.api_url,
                    headers=headers,
                    params=params
                )

                response.raise_for_status()

                data = response.json().get("data", {})

                return {
                    "success": True,
                    "indicator": data.get("ipAddress"),
                    "indicator_type": "IPv4" if ip.version == 4 else "IPv6",
                    "source": "AbuseIPDB",
                    "retrieved_at": data.get("lastReportedAt"),
                    "reputation": {
                        "abuse_confidence_score": data.get(
                            "abuseConfidenceScore"
                        ),
                        "total_reports": data.get("totalReports"),
                        "distinct_reporters": data.get(
                            "numDistinctUsers"
                        ),
                        "country_code": data.get("countryCode"),
                        "usage_type": data.get("usageType"),
                        "isp": data.get("isp"),
                        "domain": data.get("domain"),
                        "is_whitelisted": data.get("isWhitelisted"),
                    },
                    "message": "Reputation data retrieved successfully."
                }

        except httpx.TimeoutException:

            return {
                "success": False,
                "message": "Threat intelligence service timed out."
            }

        except httpx.HTTPStatusError as exc:

            if exc.response.status_code == 401:
                message = "The API key is invalid or unauthorized."

            elif exc.response.status_code == 429:
                message = "API rate limit reached."

            else:
                message = (
                    "Threat intelligence provider returned an error."
                )

            return {
                "success": False,
                "message": message
            }

        except httpx.RequestError:

            return {
                "success": False,
                "message": "Unable to connect to the provider."
            }

        except ValueError:

            return {
                "success": False,
                "message": "Invalid response received from provider."
            }