import json
import sys
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from curate_plantdoc import CONFIG_PATH, validate_rules  # noqa: E402


class CurationRuleTests(unittest.TestCase):
    def setUp(self):
        self.rules = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))["rules"]
        self.labels = {rule["label"] for rule in self.rules.values()}

    def test_all_configured_rules_are_valid(self):
        validate_rules(self.rules, set(self.rules), self.labels)

    def test_missing_source_class_is_rejected(self):
        source_classes = set(self.rules) | {"Unknown class"}
        with self.assertRaises(SystemExit):
            validate_rules(self.rules, source_classes, self.labels)

    def test_corn_leaf_blight_is_corrected_to_northern_leaf_blight(self):
        rule = self.rules["Corn leaf blight"]
        self.assertEqual(rule["action"], "relabel")
        self.assertEqual(rule["label"], "maize__northern_leaf_blight")

    def test_spider_mite_collages_are_excluded(self):
        rule = self.rules["Tomato two spotted spider mites leaf"]
        self.assertEqual(rule["action"], "exclude")


if __name__ == "__main__":
    unittest.main()
