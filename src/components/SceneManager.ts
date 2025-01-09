import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Object3D } from 'three';

interface AnimationMetadata {
  propertyValue: number;
  target: Object3D;
}

type AnimationCallback = (delta: number, propertyValue: number, target: Object3D) => void;

type RaycastCallback = (intersects: THREE.Intersection[]) => void;

class SceneManager{
  private static instance: SceneManager;
  
  // Scene Manager
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  public raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private raycastCallbacks: RaycastCallback[] = [];

  private wholeScene: Object3D | null = null;

  // Animation
  private animationFrameId: number | null = null;
  private animationCallbacks: Map<AnimationCallback, AnimationMetadata> = new Map();

  // ModelCache
  private urlMap: Map<string, Object3D> = new Map();
  private modelMap: Map<Object3D, Map<string, Object3D>> = new Map();
  private namingConvention: string[] = [];
  private resetMaps(){
    this.urlMap = new Map();
    this.modelMap = new Map();
  }

  // Interacting with mouse
  private highlightedObject: THREE.Object3D | null = null;
  private originalMaterialMap: Map<THREE.Object3D, Array<THREE.Material | THREE.Material[]>> = new Map();
  private popupHandler: {
    onHover: (name: string, position: {x: number, y: number}) => void, 
    offHover: () => void
  }| null = null;
  setPopupHandlers(onHover: (name: string, position: {x: number, y: number}) => void, offHover: () => void){
    this.popupHandler = {onHover, offHover};
  }

  private constructor(){
    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 0.1, 10000);

    // Light setting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;

    this.scene.add(directionalLight);
    const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 8);
    this.scene.add(hemiLight);
    
    const pointLight = new THREE.PointLight(0xff0000, 1, 20);
    pointLight.position.set(5, 5, 5); 
    this.scene.add(pointLight);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.attachMouseListeners();

  }

  static getInstance(){
    if (!SceneManager.instance){
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }
  // SETTING MODEL
  async loadModel(
    path: string,
    nameRoot:string,
    namingConvention: string[],
    onProgress?: (progress: number) => void
  ): Promise<{model: THREE.Object3D, objectMap: Map<string,Object3D>}> {

    if (this.urlMap.has(path)){
      console.log("Got the url already")
      const model = this.urlMap.get(path);
      if (model){
        if  (namingConvention === this.namingConvention){
          const objectMap = this.modelMap.get(model)!;
          return {model, objectMap}
        } else {
          this.resetMaps()
          return this.loadModel(path, nameRoot, namingConvention);
        } 
      } else {
        throw Error(`Cant find the model with the path: ${path}
          Try reload the page again`)
      }
    }
    console.log("New Model")
    if (this.wholeScene){
      this.scene.remove(this.wholeScene)
    }
    const loader = new GLTFLoader();
    return new Promise((resolve, rejects) => {
      loader.load(
        path,
        (gltf) => {
          const wholeScene = gltf.scene;
          this.wholeScene = wholeScene;
          const model = wholeScene.getObjectByName(nameRoot);
          if (model){
            this.namingConvention = namingConvention;
            this.presettingModel(model, nameRoot);
            try {
              const objectMap = this.mappingThingIdAndObject(model, nameRoot);
              console.log(objectMap)
              this.urlMap.set(path, model);
              this.modelMap.set(model, objectMap);
      
              // Calculate the bounding box of the model AFTER adding it to the scene
              const boundingBox = new THREE.Box3().setFromObject(wholeScene);

              if (!boundingBox.isEmpty()) {
                // Calculate the center of the bounding box
                const boundingCenter = new THREE.Vector3();
                boundingBox.getCenter(boundingCenter);
                this.camera.position.set(
                  boundingCenter.x + 15,
                  boundingCenter.y + 25,
                  boundingCenter.z + 25
                );
      
                this.controls.target.copy(boundingCenter); // Set the OrbitControls target to the bounding box center
                this.controls.update(); // Update the controls to apply the new target
              } else {
                console.warn("Bounding box is empty, skipping camera adjustment.");
              }
              
              this.scene.add(wholeScene);
              resolve({ model, objectMap});
            } catch (error){
              this.namingConvention = [];
              throw error
            }
          } else {
            throw new Error(`Model with name "${nameRoot}" not found in the scene.`);
          }
        },
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 100;
          console.log(progress);
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          rejects(error);
        }
      );
    });
  }

  
  private presettingModel(model:Object3D, rootName: string){
    let regex = this.getHyphenNumberOrBlank(rootName);
    const groupingMap: Map<string, Map<string, Object3D>> = new Map();
    const childrenMap = this.getChildrenMap(model);
    childrenMap.forEach((object, objectKey)=>{
      const modifiedKey = objectKey.replace(/[-_]\d+$/, regex);
      if (!groupingMap.get(modifiedKey)){
        const componentMap = new Map();
        componentMap.set(objectKey, object)
        groupingMap.set(modifiedKey, componentMap);
      } else {
        groupingMap.get(modifiedKey)!.set(objectKey, object)
      }
    });

    groupingMap.forEach((componentMap, groupName)=>{
      if (componentMap.size === 1){
        // If the component is unique -> Name of the component = Name of the group with modified regex
        const [name, object] = componentMap.entries().next().value;
        const newGroupName = groupName;
        object.name = newGroupName;
        componentMap.delete(name);
        componentMap.set(newGroupName, object);
      } else {
        // Sorting the component in the grouping 
        // Convert Map entries to an array, sort them by key
        const sortedRenamedMap = new Map(
          Array.from(componentMap.entries()) // Convert Map to Array
            .sort((a, b) => {
              // Extract numeric suffix and compare
              const matchA = a[0].match(/[-_](\d+)$/);
              const matchB = b[0].match(/[-_](\d+)$/);
              
              // Handle cases where the match might be null
              const suffixA = matchA ? parseInt(matchA[1], 10) : 0; // Default to 0 if no match
              const suffixB = matchB ? parseInt(matchB[1], 10) : 0; // Default to 0 if no match
              return suffixA - suffixB;
            })
            .map(([key, value], index) => {
              // Rename keys to consecutive order
              const newKey = `${groupName}_${index + 1}`;
              value.name = newKey;
              return [newKey, value];
            })
        );
        // Updating the group with sorted Map
        groupingMap.set(groupName, sortedRenamedMap)
      }
    })

    // Recursive the procedure for all the Assembly(ASM) in the glb (gltf scene)
    groupingMap.forEach((componentMap, groupName)=>{
      if (groupName.includes(this.namingConvention[0])){
        componentMap.forEach((object, objectKey) =>{
          this.presettingModel(object, objectKey)
        });
      }
    });
  }

  private mappingThingIdAndObject(gltfScene: Object3D, wholeThingName: string): Map<string, Object3D>{
    const wholeThing = gltfScene.getObjectByName(wholeThingName);
    if (!wholeThing || !gltfScene) throw new Error('Invalid scene or object name');

    let extractedUuids = new Map();
    let idList = [wholeThingName];

    wholeThing.traverse((node) => {
      if (this.followTheConvention(node.name)) {
        let name = node.name.toLowerCase();
        if (name.startsWith("body") || name.startsWith("color")){
          throw Error(`Error with the naming convention at node: ${node.name} -> Child: ${node.parent?.name} `)
        } else{
          const index = idList.findIndex(id => id.includes(`${node.name}`));
          if (index === -1 && node.parent) {
            throw Error(`Check the relation: object[${node.name}]-parent[${node.parent.name}]`);
          }
          const id = idList[index];
          extractedUuids.set(id, node);
          idList.splice(index, 1);
          for (const child of node.children || []) {
            if (this.followTheConvention(child.name)) {
              const newId = `${id}:${child.name}`;
              idList.push(newId);
            }
          }
        }
      }
    });
    return extractedUuids;
  }

  private getHyphenNumberOrBlank(name: string) {
    const match = name.match(/[-_]\d+/);
    return match ? match[0] : '';
  }

  private getChildrenMap(model: Object3D){
    let resultedMap = new Map();
    model.children.forEach((child)=>{
      if (this.followTheConvention(child.name)){
          resultedMap.set(child.name, child)
        }
    });
    return resultedMap;
  }

  // Follow naming convention
  private followTheConvention(name: string): boolean {
    return this.namingConvention.some(prefix => name.startsWith(prefix));
  }
   // Method to reset or update scene
  reset() {
    this.camera.position.set(1, 1, 1);
    this.controls.reset();
  }

  // ANIMATION FUNCTIONS

  private startAnimating() {
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
  
      // Execute each callback with its metadata
      this.animationCallbacks.forEach((metadata, callback) => {
        callback(delta, metadata.propertyValue, metadata.target);
      });
  
      // Update scene controls and render
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
  
      // Continue animation loop
      this.animationFrameId = requestAnimationFrame(animate);
    };
  
    animate();
  }
  

  addAnimationCallback(
    callback: AnimationCallback,
    metadata: AnimationMetadata
  ) {
    console.log(this.animationCallbacks)
    // Check if the callback already exists
    const existingEntry = Array.from(this.animationCallbacks.entries()).find(
      ([existingCallback]) => existingCallback.name === callback.name
    );
  
    if (existingEntry) {
      const [existingCallback] = existingEntry;
  
      // If metadata differs, update the metadata
      console.warn('Updating callback with new metadata.');
      this.animationCallbacks.set(existingCallback, metadata);
      console.log(this.animationCallbacks)
      return;
    }
    
    // Add new callback and metadata
    this.animationCallbacks.set(callback, metadata);
    console.log(this.animationCallbacks)
    // Start animation if this is the first callback
    if (this.animationCallbacks.size === 1) {
      this.startAnimating();
    }
  }
  
  
  removeAnimationCallback(callback: (delta: number, speed: number, target: Object3D) => void) {
    if (this.animationCallbacks.has(callback)) {
      this.animationCallbacks.delete(callback);
    }
  
    // If there are no remaining callbacks, stop animating
    if (this.animationCallbacks.size === 0 && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  disposeAnimation() {
    // Cancel the animation frame if running
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  
    // Clear all callbacks
    this.animationCallbacks.clear();
  };


  // INTERACTING FUNCTIONS
  private attachMouseListeners(){
    this.renderer.domElement.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener("click", this.onMouseClick.bind(this));
  }

  private onMouseMove(event: MouseEvent){
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    // Raycast to find intersected objects
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
      let intersectedObject = intersects[0].object;
      // Traverse up to find the grouping level (e.g., Group or Assembly)
      while (intersectedObject.parent && !intersectedObject.parent.name.startsWith(this.namingConvention[0])) {
        intersectedObject = intersectedObject.parent;
      }
      this.popupHandler?.onHover(intersectedObject.name, {x: event.clientX - rect.left, y: event.clientY - rect.top + 10})
      // If the object is new, highlight it
      if (this.highlightedObject !== intersectedObject) {
        // Restore previous object's color (if any)
        if (this.highlightedObject && this.originalMaterialMap.size !== 0) {
          this.restoreOriginalColor(this.highlightedObject);
        }

        // Highlight the new group (or object)
        this.highlightedObject = intersectedObject;
        this.highlightObjectGroup(this.highlightedObject); // Change color to red (or any color you prefer)
      }
    } else {
      this.renderer.domElement.style.cursor = 'default';
      this.popupHandler?.offHover();
      // Restore color if no object is intersected
      if (this.highlightedObject && this.originalMaterialMap.size !== 0) {
        this.restoreOriginalColor(this.highlightedObject);
        this.highlightedObject = null;
      }
    }

  }

  private onMouseClick(){
    // const objectsToCheck = [this.modelRoot, ...this.modelRoot.children];
    const intersects =  this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0){
      this.raycastCallbacks.forEach((callback)=> callback(intersects))
    }
  }

  addRaycastCallback(callback: RaycastCallback) {
    this.raycastCallbacks.push(callback);
  }

  removeRaycastCallback(callback: RaycastCallback) {
    this.raycastCallbacks = this.raycastCallbacks.filter((cb) => cb !== callback);
  }

  // Function to highlight an entire object group (or group hierarchy)
  // , highlightColor: THREE.ColorRepresentation
  private highlightObjectGroup(object: THREE.Object3D) {
    const materialCache: Array<THREE.Material | THREE.Material[]> = [];

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        const originalMaterial = mesh.material;
        if (!this.originalMaterialMap.has(object)) {
          // Store the original material in the map
          materialCache.push(mesh.material);
        }
        const originalColor = (originalMaterial as THREE.MeshStandardMaterial).color;
        const highlightColor = this.getContrastingColor(originalColor);

        // Create a new highlighted material
        const highlightMaterial = new THREE.MeshStandardMaterial({
          color: highlightColor,
          opacity: 0.8, // Adjust transparency (0 = fully transparent, 1 = fully opaque)
          transparent: true,
        });

        mesh.material = highlightMaterial;
      }
    });

    if (!this.originalMaterialMap.has(object)) {
      this.originalMaterialMap.set(object, materialCache);
    }
  }

  private restoreOriginalColor(object: THREE.Object3D) {
    const originalMaterials = this.originalMaterialMap.get(object);
    if (originalMaterials) {
      let index = 0;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = originalMaterials[index++];
        }
      });

      // Remove the entry from the map after restoring
      this.originalMaterialMap.delete(object);
    } 
  }

  private getContrastingColor(originalColor: THREE.Color): THREE.Color {
    const invertedColor = new THREE.Color(1 - originalColor.r, 1 - originalColor.g, 1 - originalColor.b);
    const blendFactor = 0.9; // Blend with white for better contrast
    invertedColor.lerp(new THREE.Color(0x00bcd4), blendFactor);
    return invertedColor;
  }
}

export { SceneManager }; 


  // Mapping function for extracting UUIDs from the object
// private mappingThingIdAndUuids(gltfScene: Object3D, wholeThingName: string, namingConvention: string[] = ["ASM", "CMP"]): [Map<string, Object3D>, Map<string, Object3D>] {
//   const wholeThing = gltfScene.getObjectByName(wholeThingName);
//   if (!wholeThing || !gltfScene) throw new Error('Invalid scene or object name');

//   let extractedUuids = new Map();
//   let extractedComponents = new Map();
//   let idList = [wholeThingName];

//   wholeThing.traverse((node) => {
//     if (this.followTheConvention(node.name, namingConvention)) {
//       const index = idList.findIndex(id => id.includes(`${node.name}`));
//       if (index === -1 && node.parent) {
//         console.error(`Check the relation: object[${node.name}]-parent[${node.parent.name}]`);
//         return; // Skip if the ID is not found
//       }
//       const id = idList[index];
//       extractedUuids.set(id, node);
//       extractedComponents.set(node.name, node);
//       idList.splice(index, 1);
//       for (const child of node.children || []) {
//         if (this.followTheConvention(child.name, namingConvention)) {
//           const newId = `${id}:${child.name}`;
//           idList.push(newId);
//         }
//       }
//     }
//   });
//   return [extractedUuids,extractedComponents];
// }
