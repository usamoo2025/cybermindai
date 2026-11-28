
import hashlib
import io
import math

from PIL import Image, ExifTags


MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000

ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


class ImageAnalyzer:

    def analyze(self, image_bytes: bytes):

        if not image_bytes:
            raise ValueError("Image cannot be empty.")

        if len(image_bytes) > MAX_IMAGE_SIZE:
            raise ValueError("Image exceeds the 10 MB limit.")

        sha256_hash = hashlib.sha256(
            image_bytes
        ).hexdigest()

        try:

            with Image.open(
                io.BytesIO(image_bytes)
            ) as image:

                image_format = image.format
                width, height = image.size

                if image_format not in ALLOWED_FORMATS:
                    raise ValueError(
                        "Unsupported image format."
                    )

                if width * height > MAX_IMAGE_PIXELS:
                    raise ValueError(
                        "Image dimensions exceed the safety limit."
                    )

                image.verify()

            # Reopen the image after verification.

            with Image.open(
                io.BytesIO(image_bytes)
            ) as image:

                image.load()

                metadata = self._extract_metadata(image)

                entropy = self._calculate_entropy(
                    image_bytes
                )

                findings = []

                findings.append(
                    f"Format: {image_format}"
                )

                findings.append(
                    f"Dimensions: {width} x {height}"
                )

                findings.append(
                    f"File size: {len(image_bytes)} bytes"
                )

                findings.append(
                    f"SHA-256: {sha256_hash}"
                )

                findings.append(
                    f"Byte entropy: {entropy:.4f} bits/byte"
                )

                if metadata:

                    findings.append(
                        "Metadata is present."
                    )

                else:

                    findings.append(
                        "No readable EXIF metadata detected."
                    )

                # High entropy alone does not indicate malware.

                if entropy > 7.5:

                    findings.append(
                        "High byte entropy detected. "
                        "This is common in compressed images "
                        "and is not proof of hidden data."
                    )

                findings.append(
                    "No hidden payload was extracted or "
                    "confirmed by this scanner."
                )

                return {
                    "success": True,
                    "filename": None,
                    "format": image_format,
                    "width": width,
                    "height": height,
                    "file_size": len(image_bytes),
                    "sha256": sha256_hash,
                    "entropy": round(entropy, 4),
                    "metadata": metadata,
                    "findings": findings,
                    "verdict": "Needs further inspection"
                }

        except (OSError, ValueError) as exc:

            raise ValueError(
                f"Image inspection failed: {exc}"
            ) from exc

    @staticmethod
    def _extract_metadata(image):

        metadata = {}

        try:

            exif = image.getexif()

            if exif:

                for key, value in exif.items():

                    tag_name = ExifTags.TAGS.get(
                        key, str(key)
                    )

                    if isinstance(value, bytes):

                        value = value[:100].hex()

                    metadata[tag_name] = str(value)[:300]

        except Exception:

            metadata = {}

        return metadata

    @staticmethod
    def _calculate_entropy(data):

        if not data:
            return 0.0

        counts = [0] * 256

        for byte in data:
            counts[byte] += 1

        entropy = 0.0
        total = len(data)

        for count in counts:

            if count:

                probability = count / total

                entropy -= (
                    probability *
                    math.log2(probability)
                )

        return entropy
