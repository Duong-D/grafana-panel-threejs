import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

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
const camera = new THREE.PerspectiveCamera(75, 1, 0.1,1000);
camera.position.set(20, 20, 20);

const orbit = new OrbitControls(camera, renderer.domElement);
const scene = new THREE.Scene();

const boxGeo = new THREE.BoxGeometry();
const boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000})
const Box = new THREE.Mesh(boxGeo, boxMaterial);
const sphereGeo = new THREE.SphereGeometry();
const sphereMaterial = new THREE.MeshBasicMaterial({
  color: 0x0000ff,
})
const Sphere = new THREE.Mesh(sphereGeo, sphereMaterial);
Box.position.set(10, 10, 10);
Sphere.position.set(0, 0, 0);
Sphere.add(Box);
scene.add(Sphere);


function animate(speedRef: React.MutableRefObject<number>) {
  // Perform the animation frame
  function renderFrame() {
    let speedRadPerSec = speedRef.current* (Math.PI / 180)
    const deltaTime = clock.getDelta();
    // Rotate Sphere and Box based on current speed
    Sphere.rotation.y += speedRadPerSec*deltaTime;
    Box.rotation.y += speedRadPerSec*deltaTime;

    // Render the scene
    renderer.render(scene, camera);

    // Request the next frame
    requestAnimationFrame(renderFrame);
  }

  // Start the render loop
  renderFrame();
}

export const Animation2 = ({width, height, speed}: {width: number, height: number, speed: number})=>{
  const mountRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(speed);
  let initializedFlagRef = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Set up renderer, camera aspect ratio, and OrbitControls
    if (!initializedFlagRef.current) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      orbit.update();
      // Append renderer DOM element to mountRef div
      mountRef.current.appendChild(renderer.domElement);
      animate(speedRef);
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
      if (renderer) {
        mountRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
      };
    }
  }, []);

  useEffect(() => {
      // Update renderer and camera aspect on resize
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      orbit.update();
    }, [width, height]); // Re-run when width, height, or speed change

    useEffect(() => {
      speedRef.current = speed;
      console.log(speedRef.current);
    }, [speed]);

  return (
    <div ref={mountRef} onKeyDown={handleKeyDown}>
    </div>
  );
}






