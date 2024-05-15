from http.client import HTTPException
from uuid import uuid4
from PIL import Image, ImageDraw
from pydantic import BaseModel
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from starlette.background import BackgroundTask
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import tensorflow as tf
from keras.models import load_model
import classes
import base64

CLASSES = classes.classes

class ImageData(BaseModel):
    imageData: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.mount("/model_files", StaticFiles(directory="../doodle-app/src/model_json"), name="model_files")

@app.post("/predictDoodle")
async def v1 (image_data: ImageData):
    try:
        # Decode base64 image data
        image_bytes = base64.b64decode(image_data.imageData.split(",")[1])

        resized_image = resize_image_bytes(image_bytes)
        # Specify the file path where you want to save the image
        file_path = "image.jpg"

        # Write the image data to the file
        with open(file_path, "wb") as f:
            f.write(image_bytes)

        with open(file_path, "wb") as f:
            f.write(cv2.imencode(".jpg", resized_image)[1])
        return predict_class("image.jpg")

    except Exception as e:
        raise HTTPException(e)

model = load_model('model.h5')

def predict_image(resized_image):
    # Perform prediction using the loaded model
    # Assuming model is a global variable or loaded within this function
    # Convert the resized image to a format suitable for model input
    input_data = np.expand_dims(resized_image, axis=0)  # Add batch dimension
    # input_data = input_data / 255.0  # Normalize the pixel values (assuming model expects inputs in the range [0, 1])

    # Perform prediction
    predictions = model.predict(input_data)

    # Get the top 3 predicted classes and their probabilities
    top3_indices = np.argsort(predictions[0])[::-1][:3]  # Indices of top 3 classes
    # top3_classes = [LABELS[i] for i in top3_indices]  # Convert indices to class labels
    top3_probabilities = predictions[0][top3_indices]  # Probabilities corresponding to top 3 classes

    result = {
        "top3_indices": top3_indices.tolist(),  # Convert NumPy array to Python list
        "top3_probabilities": top3_probabilities.tolist()  # Convert NumPy array to Python list
    }
    print(result)
    return result

def predict_class(image_path):
    img = tf.keras.preprocessing.image.load_img(image_path, target_size=(28, 28), color_mode='grayscale')
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    # img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    img_array = np.array(img_array)  # Convert to NumPy array

    # Make prediction
    prediction = model.predict(img_array)
    # predicted_class_index = np.argmax(prediction)
    top3_indices = np.argsort(prediction[0])[::-1][:3]  # Indices of top 3 classes
    # top3_classes = [LABELS[i] for i in top3_indices]  # Convert indices to class labels
    top3_probabilities = prediction[0][top3_indices]  # Probabilities corresponding to top 3 classes

    result = {
        "top3_indices": top3_indices.tolist(),  # Convert NumPy array to Python list
        "top3_probabilities": top3_probabilities.tolist()  # Convert NumPy array to Python list
    }
    print(CLASSES[top3_indices[0]], CLASSES[top3_indices[1]], CLASSES[top3_indices[2]])
    return result

def resize_image_bytes(image_bytes):
    try:
        # Decode the image bytes
        img_np = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Resize the image to 28x28
        resized_image = cv2.resize(gray, (28, 28), interpolation=cv2.INTER_AREA)

        return resized_image
    except Exception as e:
        raise HTTPException(e)

