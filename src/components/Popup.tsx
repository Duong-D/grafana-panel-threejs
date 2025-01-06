import React from 'react';
import './Popup.css'; // Import the CSS file

interface PopupProps {
  name: string; // Name of the object
  position: { x: number; y: number }; // Screen position (from mouse events)
  visible: boolean; // Whether the popup should be visible
}

export const Popup: React.FC<PopupProps> = ({ name, position, visible }) => {
  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  return (
    <div className={`popup-container ${visible ? 'visible' : ''}`} style={style}>
      <strong>{name}</strong>
    </div>
  );
};
