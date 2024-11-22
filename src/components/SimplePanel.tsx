import React, {useEffect} from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, /*useTheme2*/ } from '@grafana/ui';
import { PanelDataErrorView } from '@grafana/runtime';
import { SpeedControl } from './SpeedControl';
import { Animation2 } from './Visulize3D';

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

export const SimplePanel: React.FC<Props> = ({options: { speed, ...options }, data, width, height, fieldConfig, id, onOptionsChange }) => {
  console.log("Option speed is now: ", speed);
  const styles = useStyles2(getStyles);

  // useEffect(() => {
  //   // Sync React state back to options
  //   options.speed = currentSpeed;
  // }, [currentSpeed]);

  // useEffect(() => {
  //   // Sync React state back to options
  //   setSpeed(options.speed);
  // }, [options.speed]);

  useEffect(() => {
    console.log("Mounted");
    return () => {
      console.log("Unmounted");
    };
  }, []);

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }
  // return <div ref={mountRef} className={cx(styles.wrapper)} />;
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
      <SpeedControl 
        onOptionsSpeedChange={(newSpeed) => onOptionsChange({ ...options, speed: newSpeed })}
        optionsSpeed={speed ? speed : 0} >
      </SpeedControl>
      <Animation2 width={width} height={height} speed={speed ? speed : 0}></Animation2>
      {/* <input 
        type='number' 
        // value = {currentSpeed} 
        onChange={e => 
          setSpeed(Number(e.target.value))
          } />
      <div className={styles.textBox2}> 
        <div> Speed value (ms): {currentSpeed}</div>
      </div> */}
      <div className={styles.textBox1}>
        {options.showSeriesCount && (
          <div data-testid="simple-panel-series-counter">Number of series: {data.series.length}</div>
        )}
        <div>Text option value: {options.name}</div>
        <div>Current speed is now: {speed} Deg/sec</div>
      </div>
    </div>
  );
};

// import React, { useEffect, useRef } from 'react';
// import { PanelProps } from '@grafana/data';
// import { SimpleOptions } from 'types';
// import { css, cx } from '@emotion/css';
// import * as THREE from 'three';
// import { OrbitControls} from "three/examples/jsm/controls/OrbitControls.js"

// interface Props extends PanelProps<SimpleOptions> {}

// const getStyles = () => {
//   return {
//     wrapper: css`
//       font-family: Open Sans;
//       position: relative;
//       width: 100%;
//       height: 100%;
//     `,
//   };
// };

// export const SimplePanel: React.FC<Props> = ({ width, height }) => {
//   const styles = getStyles();
//   const mountRef = useRef<HTMLDivElement | null>(null);

//   useEffect(() => {
//     if (!mountRef.current) return;

//     // Create the Three.js scene, camera, and renderer
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
//     const renderer = new THREE.WebGLRenderer();
//     renderer.setSize(width, height);

//     // Append the renderer's DOM element to the mount ref
//     mountRef.current.appendChild(renderer.domElement);
//     const orbit = new OrbitControls(camera, renderer.domElement);
      
//     orbit.update();
//     // Create a sphere geometry and a basic material and combine them into a mesh
//     const boxGeo = new THREE.BoxGeometry();
//     const boxMat = new THREE.MeshBasicMaterial({
//               color: 0x00ff00
//             });
//     const randomCube = new THREE.Mesh(boxGeo, boxMat);

//     const geometry = new THREE.SphereGeometry(1, 32, 32); // radius of 1, with 32 segments
//     const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
//     const sphere = new THREE.Mesh(geometry, material);
    

//     // Add the sphere to the scene
//     sphere.add(randomCube);
//     scene.add(sphere);
    
//     randomCube.position.set(2, 0 , 2);
//     // Position the camera
//     camera.position.z = 5;

//     // Render loop
//     const animate = () => {
//       requestAnimationFrame(animate);
//       // sphere.position.x += 0.001;
//       // let positionX = sphere.position.x;
//       // Rotate the sphere for a little animation
//       // console.log("Position x: ", positionX)
//       randomCube.rotation.x += 0.01;
//       randomCube.rotation.y += 0.01;
//       // sphere.rotation.x += 0.01;
//       sphere.rotation.y += 0.01;

//       // Render the scene with the camera
//       renderer.render(scene, camera);
//     };
//     animate();

//     // Clean up on unmount
//     return () => {
//       if (mountRef.current) {
//         mountRef.current.removeChild(renderer.domElement);
//       }
//       renderer.dispose();
//     };
//   }, [width, height]);

//   return <div ref={mountRef} className={cx(styles.wrapper)} />;
// };
