## DoodleApp

DoodleApp is a search engine for paintings that uses user-drawn doodles as input queries. Using a convolutional neural network (CNN) trained on the Quick, Draw! dataset, the app classifies doodles into categories and matches them with paintings that have been pre-classified using a YOLOv8 model.

https://github.com/user-attachments/assets/021d7791-3a04-4444-9b15-32c8d746ed70

## Features
- **Doodle Recognition**: Classifies user doodles into specific categories.
- **Painting Matching**: Matches classified doodles with paintings stored in the database.
- **Painting classification**: Detects the objects from the paintings and classifies them using YOLO.

## Technologies Used
- **Backend**: FastAPI
- **Database**: PostgreSQL
- **Frontend**: React
- **Machine Learning Models**: 
  - CNN trained on the Quick, Draw! dataset
  - YOLOv8 for painting classification

## Installation and Setup

### Steps to Install

#### 1. Setup the Backend
- Navigate to the backend directory:
  ```bash
  cd backend
  ```
- Install the required Python dependencies:
  ```bash
  pip install -r requirements.txt
  ```
- Start the FastAPI server:
  ```bash
  uvicorn main:app --reload
  ```
#### 3. Add categories
- Insert the categories from the Quick, Draw! dataset into the `category` table:
  ```sql
  INSERT INTO category (category) VALUES ('airplane'),('apple'),('backpack'), ...;
  ```

#### 4. Add Paintings
- Place the paintings in the doodle-app/src/paintings directory.
- Add the paintings to the database using SQLAlchemy, a script, or a database client: 
Example SQL script:
  ```sql
  INSERT INTO image(path, title, author, year) VALUES 
  ('00001.jpg', 'Targa Florio, Porsche 911 RSR', 'Paul Smith', '1973'),
  ```

- Access the `/process_images` route to classify the paintings using the YOLOv8 model:
  ```bash
  curl http://localhost:8000/process_images
  ```

#### 5. Setup the Frontend
- Navigate to the frontend directory:
  ```bash
  cd ../doodle-app
  ```
- Install dependencies:
  ```bash
  npm install
  ```
- Start the React development server:
  ```bash
  npm start
  ```

#### 6. Run the Application
- Access the app in your browser at `http://localhost:3000`.

