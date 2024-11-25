from fastapi import APIRouter, Depends
import cv2
import base64

from utils import resize_image_bytes, predict_class, process_images_logic
from sqlalchemy.orm import Session, joinedload
from models import ImageData, Image, Category, image_category
import os
from http.client import HTTPException
from typing import List
from database import get_db

router = APIRouter()


# returns the images of a specific category by name
@router.get("/categories/{category}", response_model=List)
async def get_category(category: str, db: Session = Depends(get_db)):
    if category == "face":
        category = "person"
    elif category == "sailboat":
        category = "boat"
    # query the database for the category and its associated images
    db_category = db.query(Category).options(joinedload(Category.images)).where(Category.category == category).one()
    return db_category.images


@router.get("/process_images")
def process_images(db: Session = Depends(get_db)):
    process_images_logic(db)
    return {"message": "Images processed and ImageCategory table populated"}


@router.post("/predictDoodle")
async def predictDoodle(image_data: ImageData):
    try:
        # decode base64 image data
        image_bytes = base64.b64decode(image_data.imageData.split(",")[1])
        # resize image
        resized_image = resize_image_bytes(image_bytes)
        # file path for saving the image
        file_path = "image.jpg"
        # save locally the resized image
        with open(file_path, "wb") as f:
            f.write(cv2.imencode(".jpg", resized_image)[1])
        return predict_class("image.jpg")

    except Exception as e:
        raise HTTPException(e)
