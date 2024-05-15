import React, { useEffect, useRef, useState } from 'react'
import Menu from './components/Menu'
import * as tf from '@tensorflow/tfjs'
// import "./App.css";
import LABELS from './labels'

function App () {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lines, setLines] = useState([])
  const [currentStroke, setCurrentStroke] = useState([])
  const [imageStrokes, setImageStrokes] = useState([])
  const [top3_indices, setTop3_indices] = useState([])
  const [top3_probabilities, setTop3_probabilities] = useState([])
  const lineWidth = 5
  const lineColor = 'black'
  const lineOpacity = 1
  const WIDTH = 600
  const HEIGHT = 600
  const REPOS_PADDING = 2
  const CROP_PADDING = 2
  let model

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = lineOpacity
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth
    ctxRef.current = ctx
  }, [])

  const startDrawing = e => {
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    setIsDrawing(true)
    setCurrentStroke([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }])
  }

  const endDrawing = () => {
    ctxRef.current.closePath()
    setIsDrawing(false)
    setImageStrokes([...imageStrokes, currentStroke])
    setCurrentStroke([])
  }

  const draw = e => {
    if (!isDrawing) {
      return
    }
    ctxRef.current.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    ctxRef.current.stroke()
    setCurrentStroke([
      ...currentStroke,
      { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    ])
  }

  const undo = () => {
    // Remove the last drawn stroke from imageStrokes
    setImageStrokes(imageStrokes.slice(0, -1))
    // Clear the canvas
    ctxRef.current.clearRect(0, 0, 600, 600)
    // Redraw the remaining strokes from imageStrokes
    imageStrokes.slice(0, -1).forEach(stroke => {
      ctxRef.current.beginPath()
      ctxRef.current.moveTo(stroke[0].x, stroke[0].y)
      stroke.forEach(point => {
        ctxRef.current.lineTo(point.x, point.y)
      })
      ctxRef.current.stroke()
    })
  }

  const clear = () => {
    ctxRef.current.clearRect(0, 0, 600, 600)
    setImageStrokes([])
  }


  // downloads the canvas picture 600 x 600
  const saveLocally = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw the original canvas onto the new canvas with interpolation
    ctx.drawImage(canvasRef.current, 0, 0, 600, 600)

    // Convert the canvas content to a data URL
    const dataURL = canvas.toDataURL()

    const currentDate = new Date()
    const fileName = `resized_image_${currentDate.getFullYear()}${
      currentDate.getMonth() + 1
    }${currentDate.getDate()}_${currentDate.getHours()}${currentDate.getMinutes()}.jpg`

    // Create a temporary link element
    const link = document.createElement('a')
    link.href = dataURL
    link.download = fileName
    document.body.appendChild(link)

    // Trigger a click event on the link to initiate the download
    link.click()

    // Remove the temporary link element from the document
    document.body.removeChild(link)
  }

  // const preprocess = async cb => {
  //   const { min, max } = getBoundingBox() // Assuming getBoundingBox() is defined elsewhere
  //   console.log("preprocess")
  //   const response = await fetch('http://localhost:8000/transform', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json'
  //     },
  //     // mode: 'no-cors',
  //     redirect: 'follow',
  //     referrerPolicy: 'no-referrer',
  //     body: JSON.stringify({
  //       imageStrokes: imageStrokes,
  //       box: [min.x, min.y, max.x, max.y]
  //     })
  //   });
  //   // if (!response.ok) {
  //   //   throw new Error('Network response was not ok');
  //   // }
  //   const jsonResponse = await response.json();
  //   setTop3_indices(jsonResponse.top3_indices)
  //   setTop3_probabilities(jsonResponse.top3_probabilities)
  //   console.log(jsonResponse)// setTop3_indices(top3_indices);
  //   // setTop3_probabilities(top3_probabilities);
 
  // }

  //downloads the skecth in the bounding box redrawn
  const drawAndSaveImage = (boundingBox, imageStrokesCopy) => {
    // Create a new canvas with the size of the bounding box
    const canvas = document.createElement('canvas')
    canvas.width = boundingBox.max.x - boundingBox.min.x
    canvas.height = boundingBox.max.y - boundingBox.min.y
    
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 4;
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  
    // Draw the strokes onto the new canvas
    imageStrokesCopy.forEach(stroke => {
      ctx.beginPath()
      ctx.moveTo(stroke[0].x - boundingBox.min.x, stroke[0].y - boundingBox.min.y)
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x - boundingBox.min.x, stroke[i].y - boundingBox.min.y)
      }
      ctx.stroke()
    })
  
    // Convert the canvas content to a data URL
    const dataURL = canvas.toDataURL('image/jpeg')
  
    return dataURL;

    // // Create a temporary link element
    // const link = document.createElement('a')
    // link.href = dataURL
    // link.download = 'generated_image.jpg'
    // document.body.appendChild(link)
  
    // // Trigger a click event on the link to initiate the download
    // link.click()
  
    // // Remove the temporary link element from the document
    // document.body.removeChild(link)
  }

  const sendImageDataToBackend = async (imageData) => {
    try {
      const response = await fetch('http://localhost:8000/predictDoodle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageData })
      });
  
      if (!response.ok) {
        throw new Error('Failed to send image data to the backend');
      }
  
      const jsonResponse = await response.json();
      setTop3_indices(jsonResponse.top3_indices)
      setTop3_probabilities(jsonResponse.top3_probabilities)
    } catch (error) {
      console.error('Error sending image data to the backend:', error);
    }
  };
  
  const generateImage = () => {
    const boundingBox = getBoundingBox()
    const imageStrokesCopy = repositionImage()
    sendImageDataToBackend(drawAndSaveImage(boundingBox, imageStrokesCopy))
  }
  
  const getBoundingBox = () => {
    const imageStrokesCopy = repositionImage()
    const coords_x = []
    const coords_y = []

    for (const stroke of imageStrokesCopy) {
      for (let i = 0; i < stroke.length; i++) {
        coords_x.push(stroke[i].x)
        coords_y.push(stroke[i].y)
      }
    }
    const x_min = Math.min(...coords_x)
    const x_max = Math.max(...coords_x)
    const y_min = Math.min(...coords_y)
    const y_max = Math.max(...coords_y) // OKK

    // New width & height of cropped image
    const width = x_max - x_min // x_max - x_min
    const height = y_max - y_min // y_max - y_min
    // console.log(width + " " + height);

    const coords_min = {
      x: Math.max(0, x_min - CROP_PADDING), 
      y: Math.max(0, y_min - CROP_PADDING) 
    }
    let coords_max

    if (width > height)
      // Left + right edge as boundary
      coords_max = {
        x: Math.min(WIDTH, x_max + CROP_PADDING), // Right edge
        y: Math.max(0, y_min + CROP_PADDING) + width // Lower edge
      }
    // Upper + lower edge as boundary
    else
      coords_max = {
        x: Math.max(0, x_min + CROP_PADDING) + height, // Right edge
        y: Math.min(HEIGHT, y_max + CROP_PADDING) // Lower edge
      }
    return {
      min: coords_min,
      max: coords_max
    }
  }

  /////////////
  // reposition image to top left corner
  const repositionImage = () => {
    // OK
    const [min_x, min_y] = getMinimumCoordinates() // OK! 
    // console.log(min_x + "    " + min_y)
    const imageStrokesCopy = imageStrokes.map(stroke =>
      stroke.map(point => ({ x: point.x, y: point.y }))
    )
    // console.log("here")
    // console.log(imageStrokesCopy);
    for (const stroke of imageStrokesCopy) {
      for (let i = 0; i < stroke.length; i++) {
        stroke[i].x = stroke[i].x - min_x + REPOS_PADDING
        stroke[i].y = stroke[i].y - min_y + REPOS_PADDING
      }
    }
    return imageStrokesCopy
  }

  const getMinimumCoordinates = () => {
    let min_x = Number.MAX_SAFE_INTEGER
    let min_y = Number.MAX_SAFE_INTEGER

    for (const stroke of imageStrokes) {

      for (let i = 0; i < stroke.length; i++) {
        min_x = Math.min(min_x, stroke[i].x)
        min_y = Math.min(min_y, stroke[i].y)
      }
    }

    return [Math.max(0, min_x), Math.max(0, min_y)]
  }

  const renderTopPredictions = () => {
    return (
      <div>
        <h3>Top 3 Predictions:</h3>
        <ul>
          {top3_indices.map((index, idx) => (
            <li key={idx}>
              {LABELS[index]}: {top3_probabilities[idx]}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className='App'>
      <h2>Doodle App</h2>
      <div className='content-section'>
        <div className='canvas-section'>
          <canvas
            onPointerDown={startDrawing}
            onPointerUp={endDrawing}
            onPointerMove={draw}
            ref={canvasRef}
            width={`600px`}
            height={`600px`}
          />
        </div>
        <div className='button-section'>
          <button onClick={undo}>Undo</button>
          <button onClick={clear}>Clear</button>
          <button onClick={saveLocally}>Save</button>
          <button onClick={generateImage}>Generate</button>
        </div>
        <div>{renderTopPredictions()}</div>
      </div>
      
    </div>
  )
}

export default App
