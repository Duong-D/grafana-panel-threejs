import React, {useEffect, useCallback, useState} from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, /*useTheme2*/ } from '@grafana/ui';
import { PanelDataErrorView } from '@grafana/runtime';
import { SpeedControl } from './SpeedControl';
import { Visulize3D } from './Visulize3D';
import {SceneManager} from './SceneManager';
import { Object3D } from 'three';
import { LoadingScreen } from './LoadingScreen';
import { Popup } from './Popup';
import './ErrorScreen.css'; 


interface Props extends PanelProps<SimpleOptions> {}
console.log("Start Simple Panel");
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
      bottom: 100px;
      left: 0;
      padding: 10px;
    `,
  };
};

const sceneManager = SceneManager.getInstance();
sceneManager.addRaycastCallback((intersects) => {
  console.log("Here")
  let clickedObject = intersects[0]?.object;
  
    // // Traverse up to find the grouping level (e.g., Group or Assembly)
    // while (clickedObject.parent && clickedObject.parent.name !== nameRoot) {
    //   clickedObject = clickedObject.parent;
    // }
  console.log("Clicked Grouping: ", clickedObject);
  console.log("Group Name: ", clickedObject.name);

});

export const SimplePanel: React.FC<Props> = ({options, data, width, height, fieldConfig, id, onOptionsChange }) => {
  const styles = useStyles2(getStyles);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<Object3D | null>(null);
  const [objectMap, setObjectMap] = useState<Map<string, Object3D> | null>(null);
  const [componentMap, setComponentMap] = useState<Map<string, Object3D> | null>(null);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [popupInfo, setPopupInfo] = useState<{name: string; position: {x: number, y: number}; visible: boolean }>({
    name: '',
    position: {x: 0, y: 0},
    visible: false,
  });
  
  const handleMouseHover = (name: string, position: {x: number, y: number})=>{
    setPopupInfo({name, position, visible: true});
  }

  const handleMouseLeave = ()=>{
    setPopupInfo((prev)=>({...prev, visible: false}))
  }

  sceneManager.setPopupHandlers(handleMouseHover, handleMouseLeave)

  const handleOptionsSpeedChange = useCallback(
    (newSpeed: number) => onOptionsChange({ ...options, speed: newSpeed }),
    [onOptionsChange, options]
  );



  // const { series } = data; // series is the top-level array

  // if (!series.length) {
  //   console.warn("No data found!");
  //   return <div>No data available</div>;
  // }

  // // Extract the first series
  // const firstSeries = series[0];


  // // Extract fields
  // const timeField = firstSeries.fields.find((field) => field.name === "time");
  // const valueField = firstSeries.fields.find((field) => field.name === "hello");

  // // Get arrays of data
  // const times = timeField?.values.toArray() || [];
  // const values = valueField?.values.toArray() || [];

  // const average =
  // values.length > 0
  //   ? values.reduce((sum, value) => sum + value, 0) / values.length
  //   : 0;

  // // console.log("Timestamps:", times);
  // // console.log("Random Walk Values:", values);
  // console.log("Average Values:", average);
  // useEffect(()=>{
  //   const namingConvention = options.namingConvention.split(',').map(item => item.trim());
  //   setNamingConvention(namingConvention);
  // })

  useEffect(()=>{
    
    console.log("Importing 3D");
    console.log(data)
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
        setComponentMap(componentMap)
        console.log(objectMap);
        console.log(componentMap);
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
  
  useEffect(() => {
    console.log("Mounted");
    return () => {
      console.log("Unmounted");
    }; 
  }, []);

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
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
        <SpeedControl
          onOptionsSpeedChange={handleOptionsSpeedChange}
          optionsSpeed={options.speed || 0}
        />
        <Visulize3D
          width={width}
          height={height}
          speed={options.speed || 0}
          model={model!}
          objectMap={objectMap!}
        />
        <div className={styles.textBox1}>
          {options.showSeriesCount && (
            <div data-testid="simple-panel-series-counter">
              Number of series: {data.series.length}
            </div>
          )}
          <div>Current speed is now: {options.speed} Deg/sec</div>
        </div>
      </>
    )}
      <Popup
      name={popupInfo.name}
      position={popupInfo.position}
      visible={popupInfo.visible}
    />
  </div>
);
};
