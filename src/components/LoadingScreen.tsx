import React from 'react';
import './LoadingScreen.css'; // CSS file for the futuristic style

interface LoadingScreenProps {
  progress: number; // Progress value (0-100)
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-bar-background">
          <div className="loading-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="loading-text">Loading... {progress}%</p>
      </div>
    </div>
  );
};

export {LoadingScreen};
