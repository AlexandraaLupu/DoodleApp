from typing import List
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import sessionmaker, relationship, joinedload
from database import Base
from pydantic import BaseModel


# model for incoming image data
class ImageData(BaseModel):
    imageData: str


image_category = Table('ImageCategory', Base.metadata,
                       Column('idImage', ForeignKey('Image.id', ondelete='CASCADE'), primary_key=True),
                       Column('idCategory', ForeignKey('Category.id', ondelete='CASCADE'), primary_key=True)
                       )


class Image(Base):
    __tablename__ = 'Image'
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, index=True)
    title = Column(String)
    author = Column(String)
    year = Column(String)
    categories = relationship("Category", secondary="ImageCategory", back_populates="images", cascade="all,delete")


class Category(Base):
    __tablename__ = 'Category'
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)
    images = relationship("Image", secondary="ImageCategory", back_populates="categories", cascade="all,delete")
