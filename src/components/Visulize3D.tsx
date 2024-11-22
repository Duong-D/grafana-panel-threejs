import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

console.log("Logged into the Visualize.tsx");
function resetCamera(camera: THREE.PerspectiveCamera, object: THREE.Mesh) {
  camera.position.set(20, 20, 20);  // Reset camera position
  camera.lookAt(object.position);  // Make camera look at the Object
} 

const handleKeyDown = (e: React.KeyboardEvent) =>{
  if (e.key === 'r'|| e.key === 'R'){
    resetCamera(camera, Sphere);
  }
}
const clock = new THREE.Clock();


const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1,1000);
camera.position.set(0, 50, 30);

const orbit = new OrbitControls(camera, renderer.domElement);
const scene = new THREE.Scene();

const boxGeo = new THREE.BoxGeometry(10,10,10);
const boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true})
const Box = new THREE.Mesh(boxGeo, boxMaterial);
const sphereGeo = new THREE.SphereGeometry(10);
const sphereMaterial = new THREE.MeshBasicMaterial({
  color: 0x0000ff, wireframe: true
})
const Sphere = new THREE.Mesh(sphereGeo, sphereMaterial);
Box.position.set(10, 20, 5);
Sphere.position.set(0, 0, 0);
Sphere.add(Box);
scene.add(Sphere);




export const Animation2 = ({width, height, speed}: {width: number, height: number, speed: number})=>{
  const animationFrameId = useRef<number | null>(null);
  // console.log("Running the Animation2")
  const mountRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(speed);
  let initializedFlagRef = useRef(false);
  console.log("The speed is now, ", speed)

  function animate(speedRef: React.MutableRefObject<number>) {
    // console.log("Speed inside the function is now: ", speedRef)
    // Perform the animation frame
    function renderFrame() {
      // console.log("Speed: ",speedRef)
      let speedRadPerSec = speedRef.current* (Math.PI / 180)
      const deltaTime = clock.getDelta();
      // Rotate Sphere and Box based on current speed
      Sphere.rotation.y += speedRadPerSec*deltaTime;
      Box.rotation.y += speedRadPerSec*deltaTime;
  
      // Render the scene
      renderer.render(scene, camera);
  
      // Request the next frame
      animationFrameId.current = requestAnimationFrame(renderFrame);
    }
  
    // Start the render loop
    renderFrame();
  }

  useEffect(() => {
    if (!mountRef.current) {
      console.log("There is no mountref"); 
      return
    };
    const mountedNode = mountRef.current;
    // Set up renderer, camera aspect ratio, and OrbitControls
    if (!initializedFlagRef.current) {
      console.log("Start the set up ");
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      orbit.update();
      // Append renderer DOM element to mountRef div
      mountedNode.appendChild(renderer.domElement);
      animate(speedRef);
      // console.log('Animated with speed of: ',speedRef);
      
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'r' || event.key === 'R') {
          resetCamera(camera, Sphere); // Reset camera when 'r' or 'R' is pressed
        }
      };
      // Register the keydown event listener
      window.addEventListener('keydown', handleKeyDown);
      initializedFlagRef.current = true;
    }
    return () => {
      if (renderer&&animationFrameId.current) {
         /*React's useEffect cleanup function is accessing mountRef.current directly. This is risky because the value of mountRef.current might change during re-renders, leading to potential bugs.*/ 
        // mountedNode.removeChild(renderer.domElement);
        // renderer.dispose();
        
        cancelAnimationFrame(animationFrameId.current)
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountRef]);

  useEffect(() => {
      if (!mountRef.current) {console.log("There is no mountref"); return};
      // const mountedNode = mountRef.current;
      // // Update renderer and camera aspect on resize
      // mountedNode.appendChild(renderer.domElement);
      console.log(`Width: ${width}, Height: ${height}, ratio: `, width/height)
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      orbit.update();
    }, [width, height]); // Re-run when width, height, or speed change

  useEffect(() => {
    if (!speed){
      speedRef.current = 0
      console.warn("There is no input for speed of Animation")
    }
    else{
      speedRef.current = speed;
      console.log(speedRef.current);
    }
  }, [speed]);

  return (
    <div ref={mountRef} onKeyDown={handleKeyDown}>
    </div>
  );
}
