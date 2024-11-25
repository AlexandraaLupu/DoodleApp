import cv2
import numpy as np
import tensorflow as tf
from keras.models import load_model
from fastapi import HTTPException
from ultralytics import YOLO
from models import ImageData, Image, Category, image_category
import os

import classes

CLASSES = classes.classes

model = load_model('my_model.h5')


def predict_class(image_path):
    img = tf.keras.preprocessing.image.load_img(image_path, target_size=(28, 28), color_mode='grayscale')
    img_array = preprocess(img)
    # make prediction
    prediction = model.predict(img_array)
    top1_indices = np.argsort(prediction[0])[::-1][:1]
    top1_probabilities = prediction[0][top1_indices]

    result = {
        "topPrediction": top1_indices.tolist(),  # convert NumPy array to Python list
        "topProbability": top1_probabilities.tolist()  # convert NumPy array to Python list
    }
    print(CLASSES[top1_indices[0]])
    return result


def preprocess(img):
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)  # add batch dimension
    img_array = np.array(img_array)  # convert to NumPy array
    return img_array


def resize_image_bytes(image_bytes):
    try:
        # decode the image bytes
        img_np = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        # convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # resize the image to 28x28
        resized_image = cv2.resize(gray, (28, 28), interpolation=cv2.INTER_AREA)
        return resized_image
    except Exception as e:
        raise HTTPException(e)


def process_images_logic(db):
    yolo = YOLO('yolov8x-seg.pt')
    path = "../doodle-app/src/paintings/"
    names = yolo.names  # get the names of the classes from the YOLO model
    for image in db.query(Image).all():
        results = yolo(path + image.path)
        predictions = []
        for result in results:
            for box in result.boxes:
                if box.conf > 0.4:  # filter by confidence level
                    cls = box.cls
                    pred = names[int(cls)]
                    if pred not in predictions:
                        predictions.append(pred)
        print(predictions)
        for prediction in predictions:
            # get category
            category = db.query(Category).filter(Category.category == prediction).first()
            # check if the association already exists
            if not db.query(image_category).filter_by(idImage=image.id, idCategory=category.id).first():
                # add the association to the ImageCategory table
                stmt = image_category.insert().values(idImage=image.id, idCategory=category.id)
                db.execute(stmt)
                db.commit()
