import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "prepare_dataset.py"
SPEC = importlib.util.spec_from_file_location("prepare_dataset", SCRIPT)
prepare_dataset = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = prepare_dataset
SPEC.loader.exec_module(prepare_dataset)


class SplitTests(unittest.TestCase):
    def candidate(self, source: str, condition: str = "healthy"):
        return prepare_dataset.Candidate(
            path=Path("unused.jpg"),
            source=source,
            source_class=condition,
            crop="tomato",
            condition=condition,
            category=prepare_dataset.category_for(condition),
        )

    def test_plantdoc_is_held_out_when_development_source_exists(self):
        items = [(self.candidate("plantvillage"), f"dev-{index}") for index in range(10)]
        items += [(self.candidate("plantdoc"), f"field-{index}") for index in range(3)]
        assignments = prepare_dataset.assign_splits(items, "test-seed")
        self.assertTrue(all(assignments[f"field-{index}"] == "test" for index in range(3)))
        self.assertTrue(all(assignments[f"dev-{index}"] != "test" for index in range(10)))

    def test_single_source_class_has_all_three_splits(self):
        items = [(self.candidate("rice_field_bd", "blast"), f"rice-{index}") for index in range(20)]
        assignments = prepare_dataset.assign_splits(items, "test-seed")
        self.assertEqual(set(assignments.values()), {"train", "validation", "test"})

    def test_output_is_deterministic(self):
        items = [(self.candidate("maize_mld"), f"maize-{index}") for index in range(20)]
        first = prepare_dataset.assign_splits(items, "same-seed")
        second = prepare_dataset.assign_splits(list(reversed(items)), "same-seed")
        self.assertEqual(first, second)

    def test_ratio_counts_keep_training_examples(self):
        self.assertEqual(prepare_dataset.ratio_counts(1), (1, 0, 0))
        self.assertEqual(prepare_dataset.ratio_counts(2), (1, 1, 0))
        train, validation, test = prepare_dataset.ratio_counts(10)
        self.assertEqual(train + validation + test, 10)
        self.assertGreater(train, 0)


class ModelScopeTests(unittest.TestCase):
    def records(self, crops: list[str], count: int = 2):
        return [
            prepare_dataset.Record(
                image_id=f"{crop}-{index}",
                sha256=f"{crop}-{index}",
                path=f"{crop}-{index}.jpg",
                source="test",
                source_class="healthy",
                crop=crop,
                condition="healthy",
                label=f"{crop}__healthy",
                category="healthy",
                source_partition="test",
                split="train",
            )
            for crop in crops
            for index in range(count)
        ]

    def test_model_scope_reports_crop_and_label_coverage(self):
        scope = {
            "dataset_version": "test-v1",
            "model_family": "test-model",
            "minimum_images_per_label": 2,
            "supported_crops": ["rice", "wheat"],
            "excluded_crops": {"onion": "unlabeled"},
        }
        coverage = prepare_dataset.validate_model_scope(
            self.records(["rice", "wheat"]), scope
        )
        self.assertEqual(coverage["label_count"], 2)
        self.assertEqual(coverage["image_count"], 4)
        self.assertEqual(coverage["crops"]["rice"]["image_count"], 2)

    def test_model_scope_rejects_unconfigured_crop(self):
        scope = {
            "dataset_version": "test-v1",
            "model_family": "test-model",
            "minimum_images_per_label": 1,
            "supported_crops": ["rice"],
        }
        with self.assertRaisesRegex(ValueError, "unconfigured crops: onion"):
            prepare_dataset.validate_model_scope(self.records(["rice", "onion"]), scope)


if __name__ == "__main__":
    unittest.main()
