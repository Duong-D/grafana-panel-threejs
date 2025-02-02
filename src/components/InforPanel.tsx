import React, { useEffect, useState } from 'react';
import './css/InforPanel.css'; // Import the CSS file
import { Object3D } from 'three';
// import { SceneManager } from './SceneManager';


interface InforPanelProps {
  object: Object3D; // Name of the object
  size: { width: number; height: number };
  visible: boolean; // Whether the popup should be visible
  onClose: () => void;
}

const InforPanel: React.FC<InforPanelProps> = ({ object, size, visible, onClose}) => {
  const [style, setStyle] = useState({
    width: `${size.width * (10/100)}px`,
    // height: `${size.height * (40/100)}px`,
  })
  const [dataValue, setDataValue] = useState<number | string>(0);
  const [unit, setUnit] = useState("#non-unit")

  useEffect(()=>{
    if (!object.userData.data) {return}
    const {propertyValue, unit } = object.userData.data;
    setDataValue(propertyValue)
    setUnit(unit)
  }, [object, object.userData.data])

  useEffect(()=>{
    setStyle({
      width: `${size.width * (20/100)}px`,
    })
  },[size]);

  return (
    <div className={`info-container ${visible ? 'visible' : ''}`} style={style}>
      <div className="info-title">DETAILS</div>
      <button className="close-button" onClick={onClose}>x</button>
      <div className="info-name">
        {object.name}
      </div>
      <div className="info-parent">
        <span className="id-label">From:</span> <strong>{object.parent?.name}</strong>
      </div>
      <div className="info-id">
        <span className="id-label">ThingID: </span> 
        <strong>{object.userData.thingId}</strong>
      </div>
      <div className="info-property-value">
        <div className="id-label">Property Value:</div>
        <div><strong>{dataValue} {unit}</strong></div>
      </div>
  </div>
  );
};

const MemoizedInfoPanel = React.memo(InforPanel);
MemoizedInfoPanel.displayName = 'InforPanel';

export default MemoizedInfoPanel;
