from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import server


class ResolverApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(server.app)

    def test_health_endpoint_returns_ok_status(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    @patch("server._extract_with_fallback")
    def test_info_endpoint_returns_normalized_payload(self, extract_mock) -> None:
        extract_mock.return_value = (
            {
                "title": "Example Video",
                "duration": 123.4,
                "thumbnail": "https://example.com/thumb.jpg",
                "extractor_key": "BiliBili",
                "uploader": "Uploader",
                "view_count": 99,
                "formats": [
                    {
                        "format_id": "f1",
                        "ext": "mp4",
                        "height": 1080,
                        "width": 1920,
                        "fps": 30,
                        "filesize": 10 * 1024 * 1024,
                        "vcodec": "avc1",
                    }
                ],
            },
            "chrome",
        )

        response = self.client.post("/api/info", json={"url": "https://example.com/video"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["title"], "Example Video")
        self.assertEqual(payload["duration"], 123)
        self.assertEqual(payload["platform"], "bilibili")
        self.assertEqual(payload["uploader"], "Uploader")
        self.assertEqual(payload["view_count"], 99)
        self.assertEqual(len(payload["formats"]), 1)
        self.assertEqual(payload["formats"][0]["quality"], "1080p")
        self.assertIn("chrome", payload["note"])

    @patch("server.executor.submit")
    def test_download_endpoint_creates_processing_task(self, submit_mock) -> None:
        response = self.client.post(
            "/api/download",
            json={"url": "https://example.com/video", "format": "best"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "processing")
        task_id = payload["task_id"]
        self.assertIn(task_id, server.TASKS)
        self.assertEqual(server.TASKS[task_id].status, "processing")
        submit_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
