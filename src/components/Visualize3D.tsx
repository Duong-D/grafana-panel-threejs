import React, { useRef, useEffect, useState} from 'react';
import { Object3D } from 'three';
import { SceneManager, PhysicsTarget} from './SceneManager';
import { DataFrame } from '@grafana/data';

const sceneManager = SceneManager.getInstance();

interface Visualize3DProps {
  width: number;
  height: number;
  series: DataFrame[];
  model: Object3D;
  objectMap: Map<string,Object3D>;
}

const editMode = ()=>{
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.has("editPanel");
}
let domFlag = false;

function averageData(numbers: any[]|undefined){
  if (!numbers || numbers?.length === 0) {return 0};
  const sum = numbers.reduce((acc, cur)=> acc+cur, 0)
  const avg = Math.round(sum/numbers.length);
  
  return avg
};

function refIdExtraction(seri: DataFrame){
  const refId = seri.refId!;
      const lastUnderscore = refId.lastIndexOf("_");
      const queryName = lastUnderscore !== -1 ? refId.substring(0, lastUnderscore) : refId;
      const unit = lastUnderscore !== -1 ? refId.substring(lastUnderscore + 1) : "";
      return {queryName, unit}
}

const rotateWheelX = (delta: number, speed: number, target: Object3D | PhysicsTarget) => {
  const radiansPerSecond = (2 * Math.PI * speed) / 60;
  if(target instanceof Object3D){
    target.rotation.x += radiansPerSecond * delta;
  }
};

const translatePistonX = (delta: number, speed: number, target: Object3D | PhysicsTarget) => {
  if (!(target instanceof Object3D)){
    const {body, model} = target;
    body.position.x += delta * speed;
    model.position.copy(body.position);
  }
};

const Visualize3D: React.FC<Visualize3DProps> = ({width, height, series, model, objectMap}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cutterheadSpeed, setCutterheadSpeed] = useState(0);
  const [unitRotation, setUnitRotation] = useState("#non-unit");
  const [pistonTranslatedSpeeds, setPistonTranslatedSpeeds] = useState(
    Array(12).fill(null).map(() => ({ valueDistance: 0, valueSpeed:0, unit: "#non-unit" }))
  );

  
  useEffect(() => {
    if (!model) {return};

    // Extract cutterhead speed
    const cutterheadSpeedSeri = series.find((seri) => {
      const { queryName, unit } = refIdExtraction(seri);
      setUnitRotation(unit)
      return queryName === "ASM_CUTTERHEAD";
    });
  
    setCutterheadSpeed(averageData(cutterheadSpeedSeri?.fields[1]?.values.toArray()));
  
    // Create lookup map
    const seriesMap = new Map(series.map((seri) =>{
      const {queryName, unit} = refIdExtraction(seri);
      return [queryName, {seri: seri, unit: unit}]
    }));
  
    // Extract piston speeds
    const pistonTranslatedSpeedArray = Array.from({ length: sceneManager.pistonModelArray.length }, (_, i) => {
      const seriesData = seriesMap.get(`CMP_PISTON_${i + 1}`);
      const pistonSpeedSeri = seriesData?.seri; // Avoids destructuring error
      const unit = seriesData?.unit ?? "#non-unit"; // Uses default if missing
      if (!pistonSpeedSeri) {
        console.warn(`No data for Piston ${i + 1}`);
        return { valueDistance: 0, valueSpeed:0, unit: "#non-unit" };
      }
  
      const valuesArray = pistonSpeedSeri.fields[1].values.toArray();
      const timesArray = pistonSpeedSeri.fields[0].values.toArray();
      
      const valueSpeed = (valuesArray.at(-1) - valuesArray.at(-5)) / (timesArray.at(-1) - timesArray.at(-5)) || 0;
      const valueDistance = valuesArray.at(-1)
      return { valueSpeed: valueSpeed, valueDistance: valueDistance, unit: unit };
    });
  
    setPistonTranslatedSpeeds(pistonTranslatedSpeedArray);
  
  }, [model, series]); // No cleanup function
  
  
  useEffect(()=>{
    if (!mountRef.current) {return};
    // Attach renderer to DOM
    mountRef.current.appendChild(sceneManager.renderer.domElement);
    // Catch the HTMLDivElement and SearchParam
    const mountNode = mountRef.current;
    const isEditMode = editMode();
    return () => {
      if(isEditMode){
        domFlag = !domFlag;
      }
      if (mountNode.hasChildNodes()){mountNode.removeChild(sceneManager.renderer.domElement)};
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domFlag])

  useEffect(() => {
    if (!mountRef.current || width <= 0 || height <= 0) {return};
    sceneManager.camera.aspect = width / height || 1;
    sceneManager.camera.updateProjectionMatrix();
    sceneManager.renderer.setSize(width, height);
    sceneManager.controls.update();
  }, [width, height]);
  
  useEffect(() => {
    if (!model) {return};
  
    const cutterhead = objectMap.get("ASM_TBM:ASM_CUTTERHEAD");
    if (!cutterhead) {
      return;
    }
  
    const cutterheadMetadata = {
      name: cutterhead.name,
      propertyValue: cutterheadSpeed ?? 0, // Ensure a default value
      target: cutterhead
    };
    
    if(cutterhead.userData.data){
      cutterhead.userData.data.propertyValue = cutterheadMetadata.propertyValue;
      cutterhead.userData.data.unit = unitRotation;
    }
    sceneManager.addAnimationCallback(rotateWheelX, cutterheadMetadata);
  
    // const pistonMetadataArray = [];
    for (let i = 0; i < sceneManager.pistonModelArray.length; i++) {
      const body = sceneManager.cannonBodyArray[i];
      const model = sceneManager.pistonModelArray[i];
  
      if (!body || !model) {
        console.warn(`Missing piston body or model at index ${i}`);
        continue;
      }
      
      const {valueDistance, valueSpeed, unit} = pistonTranslatedSpeeds[i];

      const physicTarget: PhysicsTarget = { body, model };
      const pistonMetadata = {
        name: model.name,
        propertyValue: valueSpeed ?? 0, // Safe access
        target: physicTarget
      };
      if(model.userData.data){
        model.userData.data.propertyValue = valueDistance;
        model.userData.data.unit = unit;
      }
      sceneManager.addAnimationCallback(translatePistonX, pistonMetadata);
    }
  
    return () => {
      sceneManager.disposeAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutterheadSpeed, pistonTranslatedSpeeds, domFlag, model]);
  
  return <div ref={mountRef} style={{ width: "100%", height: "100%" }}></div>
};

const MemoizedVisualize3D = React.memo(Visualize3D);
MemoizedVisualize3D.displayName = 'Visualize3D';

export default MemoizedVisualize3D;

