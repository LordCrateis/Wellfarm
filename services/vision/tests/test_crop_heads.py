import importlib.util
import sys
import unittest
from pathlib import Path

import torch
from PIL import Image


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
SCRIPT = SCRIPTS / "train_crop_heads.py"
SPEC = importlib.util.spec_from_file_location("train_crop_heads", SCRIPT)
train_crop_heads = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = train_crop_heads
SPEC.loader.exec_module(train_crop_heads)


class FieldAugmentationTests(unittest.TestCase):
    def test_field_transform_returns_finite_expected_tensor(self):
        transform, _evaluation = train_crop_heads.make_field_transforms(96)
        image = Image.new("RGB", (180, 120), (70, 130, 50))
        result = transform(image)
        self.assertEqual(tuple(result.shape), (3, 96, 96))
        self.assertTrue(torch.isfinite(result).all())

    def test_batch_mixing_never_crosses_crop_boundaries(self):
        images = torch.rand(6, 3, 16, 16)
        targets = torch.arange(6)
        crops = ["rice", "rice", "maize", "maize", "tomato", "tomato"]
        target_crop = {index: crop for index, crop in enumerate(crops)}

        for _attempt in range(20):
            _mixed, targets_a, targets_b, mix = train_crop_heads.apply_crop_safe_batch_mix(
                images, targets, crops, 1.0, 0.2, 1.0
            )
            self.assertGreaterEqual(mix, 0.0)
            self.assertLessEqual(mix, 1.0)
            for first, second in zip(targets_a.tolist(), targets_b.tolist()):
                self.assertEqual(target_crop[first], target_crop[second])


if __name__ == "__main__":
    unittest.main()
