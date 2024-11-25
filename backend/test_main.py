import pytest
import numpy as np
import tensorflow as tf
from utils import predict_class, preprocess, resize_image_bytes

test_image = np.random.rand(28, 28)


def test_predict_image():
    result = predict_class("test_image.png")
    assert "topPrediction" in result
    assert "topProbability" in result
    assert len(result["topPrediction"]) == 1
    assert len(result["topProbability"]) == 1


def test_resize_image_bytes():
    with open('test_image.png', 'rb') as f:
        image_bytes = f.read()
    resized_image = resize_image_bytes(image_bytes)
    assert resized_image.shape == (28, 28)
    assert resized_image.dtype == np.uint8


def test_preprocess():
    test_image = tf.keras.preprocessing.image.load_img("test_image.png", target_size=(28, 28), color_mode='grayscale')
    processed_image = preprocess(test_image)
    assert processed_image.shape == (1, 28, 28, 1)  # Assuming channel last format (1, height, width, channels)


# Run the tests
if __name__ == "__main__":
    pytest.main([__file__])
