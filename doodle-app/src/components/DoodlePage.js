import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import "./DoodlePage.css";
import LABELS from "../labels";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";

function DoodlePage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [imageStrokes, setImageStrokes] = useState([]);
  const [topPrediction, setTopPrediction] = useState([]);
  const [topProbability, setTopProbability] = useState([]);
  const lineWidth = 5;
  const lineColor = "black";
  const lineOpacity = 1;
  const WIDTH = 600;
  const HEIGHT = 600;
  const REPOS_PADDING = 2;
  const CROP_PADDING = 2;
  let model;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = lineOpacity;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctxRef.current = ctx;
  }, []);

  const startDrawing = (e) => {
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
    setCurrentStroke([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
  };

  const endDrawing = () => {
    ctxRef.current.closePath();
    setIsDrawing(false);
    setImageStrokes([...imageStrokes, currentStroke]);
    setCurrentStroke([]);
  };

  const draw = (e) => {
    if (!isDrawing) {
      return;
    }
    ctxRef.current.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctxRef.current.stroke();
    setCurrentStroke([
      ...currentStroke,
      { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
    ]);
  };

  const undo = () => {
    // remove the last drawn stroke from imageStrokes
    setImageStrokes(imageStrokes.slice(0, -1));
    // clear the canvas
    ctxRef.current.clearRect(0, 0, 600, 600);
    // redraw the remaining strokes from imageStrokes
    imageStrokes.slice(0, -1).forEach((stroke) => {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(stroke[0].x, stroke[0].y);
      stroke.forEach((point) => {
        ctxRef.current.lineTo(point.x, point.y);
      });
      ctxRef.current.stroke();
    });
    if (imageStrokes.length == 1) {
      setTopPrediction([]);
      setTopProbability([]);
    }
  };

  const clear = () => {
    // clear the canvas
    ctxRef.current.clearRect(0, 0, 600, 600);
    setImageStrokes([]);
    setTopPrediction([]);
    setTopProbability([]);
  };

  // downloads the canvas picture 600 x 600
  const saveLocally = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(canvasRef.current, 0, 0, 600, 600);

    // convert the canvas content to a data URL
    const dataURL = canvas.toDataURL();

    const currentDate = new Date();
    const fileName = `doodle_image_${currentDate.getFullYear()}${
      currentDate.getMonth() + 1
    }${currentDate.getDate()}_${currentDate.getHours()}${currentDate.getMinutes()}.jpg`;

    // create a temporary link element
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = fileName;
    document.body.appendChild(link);

    // trigger a click event on the link to initiate the download
    link.click();

    // remove the temporary link element from the document
    document.body.removeChild(link);
  };

  const drawDoodleInBoundingBox = (boundingBox, repositionedImage) => {
    // create a new canvas with the size of the bounding box
    const canvas = document.createElement("canvas");
    canvas.width = boundingBox.max.x - boundingBox.min.x;
    canvas.height = boundingBox.max.y - boundingBox.min.y;

    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 4;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw the strokes onto the new canvas
    repositionedImage.forEach((stroke) => {
      ctx.beginPath();
      ctx.moveTo(
        stroke[0].x - boundingBox.min.x,
        stroke[0].y - boundingBox.min.y
      );
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(
          stroke[i].x - boundingBox.min.x,
          stroke[i].y - boundingBox.min.y
        );
      }
      ctx.stroke();
    });

    // convert the canvas content to a data URL
    const dataURL = canvas.toDataURL("image/jpeg");

    return dataURL;
  };

  const sendImageDataToBackend = async (imageData) => {
    try {
      const response = await fetch("http://localhost:8000/predictDoodle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        throw new Error("Failed to send image data to the backend");
      }

      const jsonResponse = await response.json();
      setTopPrediction(LABELS[jsonResponse.topPrediction[0]]);
      setTopProbability(jsonResponse.topProbability[0].toFixed(3));
    } catch (error) {
      console.error("Error sending image data to the backend:", error);
    }
  };

  const generateImage = () => {
    if (imageStrokes.length === 0) {
      alert("Please draw something on the canvas before generating an image.");
      return;
    }
    const boundingBox = getBoundingBox();
    const repositionedImage = repositionImage();
    sendImageDataToBackend(
      drawDoodleInBoundingBox(boundingBox, repositionedImage)
    );
  };

  const getBoundingBox = () => {
    const imageStrokesCopy = repositionImage();
    const coords_x = [];
    const coords_y = [];

    for (const stroke of imageStrokesCopy) {
      for (let i = 0; i < stroke.length; i++) {
        coords_x.push(stroke[i].x);
        coords_y.push(stroke[i].y);
      }
    }

    // calculate the minimum and maximum x and y values
    const x_min = Math.min(...coords_x);
    const x_max = Math.max(...coords_x);
    const y_min = Math.min(...coords_y);
    const y_max = Math.max(...coords_y); // OKK

    // calculate the width and height of the bounding box
    const width = x_max - x_min;
    const height = y_max - y_min;

    // define the minimum coordinates of the bounding box with padding
    const coords_min = {
      x: Math.max(0, x_min - CROP_PADDING),
      y: Math.max(0, y_min - CROP_PADDING),
    };
    let coords_max;

    // determine the maximum coordinates of the bounding box based on aspect ratio
    if (width > height)
      coords_max = {
        x: Math.min(WIDTH, x_max + CROP_PADDING), // right edge
        y: Math.max(0, y_min + CROP_PADDING) + width, // lower edge
      };
    else
      coords_max = {
        x: Math.max(0, x_min + CROP_PADDING) + height, // right edge
        y: Math.min(HEIGHT, y_max + CROP_PADDING), // lower edge
      };
    return {
      min: coords_min,
      max: coords_max,
    };
  };

  // reposition image to top left corner
  const repositionImage = () => {
    const [min_x, min_y] = getMinimumCoordinates();
    const imageStrokesCopy = imageStrokes.map((stroke) =>
      stroke.map((point) => ({ x: point.x, y: point.y }))
    );
    for (const stroke of imageStrokesCopy) {
      for (let i = 0; i < stroke.length; i++) {
        stroke[i].x = stroke[i].x - min_x + REPOS_PADDING;
        stroke[i].y = stroke[i].y - min_y + REPOS_PADDING;
      }
    }
    return imageStrokesCopy;
  };

  const getMinimumCoordinates = () => {
    let min_x = Number.MAX_SAFE_INTEGER;
    let min_y = Number.MAX_SAFE_INTEGER;

    // iterate through all strokes to find the minimum x and y coordinates
    for (const stroke of imageStrokes) {
      for (let i = 0; i < stroke.length; i++) {
        min_x = Math.min(min_x, stroke[i].x);
        min_y = Math.min(min_y, stroke[i].y);
      }
    }

    return [Math.max(0, min_x), Math.max(0, min_y)];
  };

  const renderTopPrediction = () => {
    return (
      <div className="predictions">
        <h3>Top prediction:</h3>
        {topPrediction.length > 0 && (
          <p>
            {topPrediction}: {topProbability}
          </p>
        )}
      </div>
    );
    return null;
  };

  const goToGallery = () => {
    if (topPrediction.length > 0) {
      const firstPrediction = topPrediction;
      navigate(`/gallery/${firstPrediction}`);
    }
  };

  return (
    <div className="app">
      <div className="title-section">
        <h2>The Doodle App</h2>
      </div>

      <div className="content-section">
        <div className="canvas-section">
          <canvas
            onPointerDown={startDrawing}
            onPointerUp={endDrawing}
            onPointerMove={draw}
            ref={canvasRef}
            width={`600px`}
            height={`600px`}
          />
        </div>
        <div className="button-section">
          <Button
            variant="contained"
            style={{ backgroundColor: "#658B6F", fontFamily: "Montserrat" }}
            onClick={undo}
          >
            Undo
          </Button>
          <Button
            variant="contained"
            style={{ backgroundColor: "#658B6F", fontFamily: "Montserrat" }}
            onClick={clear}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            style={{ backgroundColor: "#658B6F", fontFamily: "Montserrat" }}
            onClick={saveLocally}
          >
            Save
          </Button>
          <Button
            variant="contained"
            style={{ backgroundColor: "#2F575D", fontFamily: "Montserrat" }}
            onClick={generateImage}
          >
            Generate
          </Button>
        </div>
        <div className="prediction-section">
          {renderTopPrediction()}
          <Button
            variant="contained"
            style={{ backgroundColor: "#b08a4d", fontFamily: "Montserrat" }}
            onClick={goToGallery}
          >
            Go to Gallery
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DoodlePage;
