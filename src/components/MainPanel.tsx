import React, {useEffect, useState} from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2} from '@grafana/ui';
import { PanelDataErrorView } from '@grafana/runtime';
import MemoizedVisualize3D from './Visualize3D';
import {SceneManager} from './SceneManager';
import * as THREE from 'three';
import { Object3D } from 'three';
import { LoadingScreen } from './LoadingScreen';
import { Popup } from './Popup';
import MemoizedInfoPanel from './InforPanel';
import './css/ErrorScreen.css'; 
import { GraphPanel } from './GraphPanel';


interface Props extends PanelProps<SimpleOptions> {}
export const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox1: css`
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 10px;
    `,
    textBox2: css`
      position: absolute;
      bottom: 30px;
      left: 0;
      padding: 10px;
    `,
  };
};

const sceneManager = SceneManager.getInstance();

export const MainPanel: React.FC<Props> = ({options, data, width, height, id, timeRange, timeZone }) => {
  const styles = useStyles2(getStyles);
  const [loading, setLoading] = useState(true);

  const [model, setModel] = useState<Object3D | null>(null);
  const [objectMap, setObjectMap] = useState<Map<string, Object3D> | null>(null);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [visible, setVisible] = useState(false)
  const [popupName, setPopupName] = useState<{name: string; position: {x: number, y: number}; visible: boolean }>({
    name: '',
    position: {x: 0, y: 0},
    visible: false,
  });

  const [info, setInfo] = useState<{object: Object3D; visible: boolean}>({
    object: new THREE.Object3D(),
    visible: false,
  })
  
  const handleMouseHover = (name: string, position: {x: number, y: number})=>{
    setPopupName({name, position, visible: true});
  }

  const handleMouseLeave = ()=>{
    setPopupName((prev)=>({...prev, visible: false}))
  }

  sceneManager.setPopupHandlers(handleMouseHover, handleMouseLeave)

  const handleMouseClickObject = (object: Object3D)=>{
    setVisible(true)
    setInfo({object, visible: visible});
  }

  const handleMouseCloseInfo = ()=>{
    setVisible(false)
  }

  sceneManager.setInfoHandlers(handleMouseClickObject)
  const { series } = data; 

  useEffect(()=>{
    console.log("Importing 3D");
    if (!options.modelPath || !options.modelRootName || !options.namingConvention ){
      setError("Configuration is invalid, check again modelPath, modelRootName, namingConvention");
      return
    }
    const namingConvention = options.namingConvention.split(',').map(item => item.trim());
    const importModel = async ()=>{
      try{
        const {model, objectMap} = await sceneManager.loadModel(
          options.modelPath, 
          options.modelRootName, 
          namingConvention,
          (progress) =>  {
            setProgress(Math.round(progress))
          }
        );
        setModel(model);
        setObjectMap(objectMap);
        console.log(objectMap);
        setLoading(false);
      }
      catch (error) {
        let errorMessage = 'An error occurred while loading the model.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        console.error('Error loading model:', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    }
    importModel();

    return ()=>{
      setLoading(true)
      setError(null)
    }
  }, [options.modelPath, options.modelRootName, options.namingConvention]);

  if (data.series.length === 0) {
    return <PanelDataErrorView panelId={id} data={data} needsStringField />;
  }

  if (error) {
    return (
      <div className="error-screen"
      style={{
        width: `${width}px`, // Set to the panel's width
        height: `${height}px`, // Set to the panel's height
      }}>
        <h1>Error!</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      {loading ? (
        <LoadingScreen progress={progress} />
      ) : (
        <>
          <MemoizedVisualize3D
            width={width}
            height={height}
            series={series}
            model={model!}
            objectMap={objectMap!}
          />
        </>
      )}
      <Popup
        name={popupName.name}
        position={popupName.position}
        visible={popupName.visible}
      />
      <MemoizedInfoPanel
        object={info.object}
        size= {{width, height}}
        visible={visible}
        onClose={handleMouseCloseInfo}
      />
      <div
          id="time-series-container"
          style={{
            position: 'absolute', 
            bottom: '50px',          
            left: '10px',         
            zIndex: 1, 
          }}>
          <GraphPanel
            object={info.object}
            visible={visible}
            timeRange ={timeRange}
            timeZone = {timeZone}
            data={data}
            options={options}
            width={width}
            height={height}
          />
      </div>
    </div>
  );
};
