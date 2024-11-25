import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import "./ImageGalleryPage.css";

const ImageGalleryPage = () => {
  const { predictedCategory } = useParams();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`http://localhost:8000/categories/${predictedCategory}`);
        if (!response.ok) {
            throw new Error('Failed to fetch the paintings');
        }
        const data = await response.json();
        setImages(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [predictedCategory]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="app">
        <div className='title-section'> 
            <h2>The Doodle App</h2>
        </div>
        <div className="category">Paintings in category: {predictedCategory}</div>
        <div className="paintings-section">
        {error || images.length === 0 ? (
          <div className="no-images">No images in the database</div>
        ) : (
          images.map((image) => (
            <div key={image.id} className="image-card">
                <div className="image-section">
                    <img src={require("../paintings/" + image.path)} alt={image.title} style={{  height: '400px', width: 'auto'}}/>
                </div>
                <div className="details-section">
                    <p className="title">{image.title}</p>
                    <p className="author">{image.author}</p>
                    <p className="year">{image.year}</p>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ImageGalleryPage;
