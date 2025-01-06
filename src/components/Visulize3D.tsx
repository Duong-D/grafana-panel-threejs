import React, { useRef, useEffect} from 'react';
import { Object3D } from 'three';
import { SceneManager } from './SceneManager';



const sceneManager = SceneManager.getInstance();


interface Visulize3DProps {
  width: number;
  height: number;
  speed: number;
  model: Object3D;
  objectMap: Map<string,Object3D>;
}

const editMode = ()=>{
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.has("editPanel");
}
let domFlag = false;

const rotateWheelX = (delta: number, speed: number, target: Object3D) => {
  target.rotation.x += delta * speed;
};

// const rotateWheelY = (delta: number, speed: number, target: Object3D) => {
//   target.rotation.y += delta * speed;
// };


export const Visulize3D: React.FC<Visulize3DProps> = React.memo(({width, height, speed, model, objectMap}) => {
  const mountRef = useRef<HTMLDivElement>(null);


  useEffect(()=>{
    if (!mountRef.current) return;
    // Attach renderer to DOM
    mountRef.current.appendChild(sceneManager.renderer.domElement);
    // Catch the HTMLDivElement and SearchParam
    const mountNode = mountRef.current;
    const isEditMode = editMode();
    return () => {
      console.log("unmount the 3d")
      if(isEditMode){
        domFlag = !domFlag;
      }
      if (mountNode.hasChildNodes()){mountNode.removeChild(sceneManager.renderer.domElement)};
    };

  }, [domFlag])

  useEffect(() => {
    if (!mountRef.current || width <= 0 || height <= 0) return;
    sceneManager.camera.aspect = width / height || 1;
    sceneManager.camera.updateProjectionMatrix();
    sceneManager.renderer.setSize(width, height);
    sceneManager.controls.update();
  }, [width, height]);
    

  useEffect(()=>{
    if (!model) return;
    console.log(speed);
    const wheel = objectMap.get("ASM_TBM:ASM_CUTTERHEAD");
    const metadata = {
      propertyValue: speed,
      target: wheel!
    }
    // if (wheel?.userData){
    //   wheel?.userData.data = metadata.propertyValue;
    // }
    console.log(wheel!.userData)
    wheel!.userData.data = metadata.propertyValue;
    console.log(wheel!.userData)

  
    console.log("Animation Mounted");
    sceneManager.addAnimationCallback(rotateWheelX, metadata)
    // sceneManager.addAnimationCallback(rotateWheelY,metadata1)
    // animate();
    // const isEditMode = editMode();

    return () => {
      sceneManager.disposeAnimation()
      // if(isEditMode){
      //   domFlag = !domFlag;
      // }
    }
  },[speed, domFlag, model])


  return <div ref={mountRef} style={{ width: "100%", height: "100%" }}></div>
});
