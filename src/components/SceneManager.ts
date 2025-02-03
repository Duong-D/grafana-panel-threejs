import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Object3D } from 'three';

interface AnimationMetadata {
  name: string;
  propertyValue: number;
  target: Object3D | PhysicsTarget;
}

export type PhysicsTarget = { body: CANNON.Body; model: Object3D };
type AnimationCallback = (delta: number, propertyValue: number, target: Object3D | PhysicsTarget) => void;

type RaycastCallback = (intersects: THREE.Intersection[]) => void;

class SceneManager{
  private static instance: SceneManager;
  
  // Scene Manager
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public world: CANNON.World;
  public cannonBodyArray: CANNON.Body[]= [];
  public pistonModelArray: THREE.Object3D[] = [];
  private hubModel: THREE.Object3D = new THREE.Object3D();
  private hubBody: CANNON.Body = new CANNON.Body();
  private correctionQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));

  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  public raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private raycastCallbacks: RaycastCallback[] = [];

  private wholeScene: Object3D | null = null;

  // Animation
  private animationFrameId: number | null = null;
  private animationCallbacks: Map<string,{callback: AnimationCallback, metadata: AnimationMetadata}> = new Map();

  // ModelCache
  private urlMap: Map<string, Object3D> = new Map();
  private objectMap: Map<string, Object3D> = new Map();
  private modelMap: Map<Object3D, Map<string, Object3D>> = new Map();
  private namingConvention: string[] = [];
  private resetMaps(){
    this.urlMap = new Map();
    this.modelMap = new Map();
  }

  // Interacting with mouse
  

  // Constructor
  private constructor(){
    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.world = new CANNON.World();
    this.world.gravity.set(0,0,0);

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

  // 
  static getInstance(){
    if (!SceneManager.instance){
      SceneManager.instance = new SceneManager();
    } else{
    }
    return SceneManager.instance;
  }

  // SETTING MODEL =====================START============================= 
  async loadModel(
    path: string,
    nameRoot: string,
    namingConvention: string[],
    onProgress?: (progress: number) => void
    ): Promise<{model: THREE.Object3D, objectMap: Map<string,Object3D>}> {
      if (this.urlMap.has(path)){
        const model = this.urlMap.get(path);
        if (model){
          if  (JSON.stringify(namingConvention) === JSON.stringify(this.namingConvention)){
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
                this.urlMap.set(path, model);
                this.objectMap = objectMap;
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
                const layer1 = this.getChildrenMap(model);
                this.hubModel = layer1.get("CMP_HUBCOVER");
                this.objectGrouping(this.hubModel, layer1, "THRUST")

                this.hubBody = this.addPhysicsObject(this.hubModel, this.world, 1, "cylinder").body;
                for (let i=1; i<=12; i++){
                  const pistonModel = model.getObjectByName(`CMP_PISTON_${i}`); 
                  this.pistonModelArray.push(pistonModel!);
                  const pistonData =  this.addPhysicsObject(pistonModel!, this.world, 0, "box");
                  const pistonBody = pistonData.body;
                  this.cannonBodyArray.push(pistonBody);
                  const max = pistonData.max;
                  const min = pistonData.min;

                  const endPointWorld = new THREE.Vector3(
                    max.x, // end at x
                    (min.y + max.y) / 2,  // Center y
                    (min.z + max.z) / 2  // Center z
                  );
                  const endPointLocalPiston = this.worldToLocal(endPointWorld, pistonBody);
                  const endPointLocalHub = this.worldToLocal(endPointWorld, this.hubBody);
                  const PistonHubPointConstraint = new CANNON.PointToPointConstraint(
                    pistonBody, // Replace with your Cannon.js body for the piston
                    endPointLocalPiston,
                    this.hubBody, // Replace with your other Cannon.js body
                    endPointLocalHub
                  );
                  this.world.addConstraint(PistonHubPointConstraint)
                }
                
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
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            rejects(error);
          }
        );
      }
    );
  }
// Following functions for loading and setting
  private addPhysicsObject(object: THREE.Object3D, world: CANNON.World, mass = 1, shapeType: "cylinder" | "box" = "box") {
    // Compute the bounding box of the object
    const boundingBox = new THREE.Box3().setFromObject(object, true);
    const boundingSize = boundingBox.getSize(new THREE.Vector3());
    const boundingCenter = object.position.clone(); // Clone to avoid modifying the original

    // Create Cannon.js body
    const body = new CANNON.Body({
      mass: mass, // Dynamic if mass > 0, static if mass = 0
      position: new CANNON.Vec3(boundingCenter.x, boundingCenter.y, boundingCenter.z),
    });

    let shape;

    if (shapeType === "cylinder") {
      const height = boundingSize.x/2;
      const radius = Math.max(boundingSize.y, boundingSize.z) / 2;
      shape = new CANNON.Cylinder(radius, radius, height, 32);

      // Convert Three.js rotation (Euler angles) to Cannon.js Quaternion
      const objectQuaternion = new CANNON.Quaternion();
      objectQuaternion.setFromEuler(
        object.rotation.x, 
        object.rotation.y, 
        object.rotation.z + Math.PI / 2);
      body.quaternion.copy(objectQuaternion);
      // Cylinder: Determine the best orientation based on object dimensions
    } else {
      // Default to Box Shape
      shape = new CANNON.Box(new CANNON.Vec3(boundingSize.x / 2, boundingSize.y / 2, boundingSize.z / 2));
    }

    // Add shape to body
    body.addShape(shape);
    world.addBody(body);

    const min = boundingBox.min; // Minimum point in local space
    const max = boundingBox.max; // Maximum point in local space
    
    return {body, min, max}; // Return the created body if needed
  }

  private worldToLocal(worldPoint: THREE.Vector3 , body: CANNON.Body) {
    // Convert worldPoint to a CANNON.Vec3 if needed
    const worldVec = new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z);
  
    // Step 1: Translate the point to the body's local origin
    const localVec = worldVec.vsub(body.position);
  
    // Step 2: Apply the inverse rotation of the body's quaternion
    const localPoint = new CANNON.Vec3();
    body.quaternion.inverse().vmult(localVec, localPoint);
  
    return localPoint;
  }

  private objectGrouping(object: THREE.Object3D, firstLayerMap: Map<string, THREE.Object3D>, filterString: string){
    const newMap = firstLayerMap;
    newMap.delete(object.name);
    newMap.forEach((objectSub, id)=>{
      if (!id.includes(filterString)){
        object.attach(objectSub);
      }
    })
  }


  // Preparing the models in approriate names
  private presettingModel(model: Object3D, rootName: string){
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
    if (!wholeThing || !gltfScene) {throw new Error('Invalid scene or object name')};

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

          node.userData.data = {propertyValue: 0, unit: ""};
          node.userData.thingId = id;
          node.userData.parent = node.parent?.userData.thingId;
          node.userData.children = []
          extractedUuids.set(id, node);
          idList.splice(index, 1);
          for (const child of node.children || []) {
            if (this.followTheConvention(child.name)) {
              const newId = `${id}:${child.name}`;
              node.userData.children.push(newId)
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
  // SETTING MODEL =====================END=============================
   // Method to reset or update scene
  reset() {
    this.camera.position.set(1, 1, 1);
    this.controls.reset();
  }

  // ANIMATION FUNCTIONS

  private startAnimating() {
    const clock = new THREE.Clock();
    const hubModelQuaternion = new THREE.Quaternion(); // Reuse this object
    const animate = () => {
      const delta = clock.getDelta();
      this.world.step(1 / 60, delta, 3);
  
      // Execute each callback with its metadata
      this.animationCallbacks.forEach(({callback,metadata}, name) => {
        callback(delta, metadata.propertyValue, metadata.target);
      });
      
      this.hubModel.position.copy(this.hubBody.position);
      // Update the existing quaternion instead of creating a new one
      hubModelQuaternion.set(
        this.hubBody.quaternion.x,
        this.hubBody.quaternion.y,
        this.hubBody.quaternion.z,
        this.hubBody.quaternion.w
    );
    
    this.hubModel.setRotationFromQuaternion(hubModelQuaternion);
    this.hubModel.quaternion.multiply(this.correctionQuaternion);
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
        this.animationCallbacks.set(metadata.name, {callback, metadata});
        // Start animation if this is the first callback
        if (this.animationCallbacks.size === 1) {
          this.startAnimating();
        }
      // }
  }
  
  removeAnimationCallback(name: string) {
    if (this.animationCallbacks.has(name)) {
      this.animationCallbacks.delete(name);
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

  // INTERACTING FUNCTIONS =====================START============================= 
  private highlightedObject: THREE.Object3D | null = null;
  private lockedHighlightedObjectArray: THREE.Object3D[] = [];
  private originalMaterialMap: Map<THREE.Object3D, Array<THREE.Material | THREE.Material[]>> = new Map();
  private popupHandler: {
    onHover: (name: string, position: {x: number, y: number}) => void, 
    offHover: () => void
  } | null = null;

  private infoHandler: {onClick: (object: Object3D) => void} | null = null;

  // PUBLIC METHODS (Event Handlers)
  setInfoHandlers(onClick: (object: Object3D) => void){
    this.infoHandler = {onClick};
  }

  setPopupHandlers(onHover: (name: string, position: {x: number, y: number}) => void, offHover: () => void){
    this.popupHandler = {onHover, offHover};
  }

  private attachMouseListeners() {
    this.renderer.domElement.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener("click", this.onMouseClick.bind(this));
    this.renderer.domElement.addEventListener("dblclick", this.onMouseDoubleClick.bind(this));
  }

  // HELPER METHODS (Logic for Highlighting and Interactions)
  private restoreColorIfNeeded() {
    if (this.highlightedObject && this.originalMaterialMap.size !== 0) {
      // Check if the object should be restored (not locked and not in the locked list)
      if (this.lockedHighlightedObjectArray.indexOf(this.highlightedObject) === -1) {
        this.restoreOriginalColor(this.highlightedObject);
      }
    }
  }

  private getIntersectedObject(): THREE.Object3D | null {
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
      let intersectedObject = intersects[0].object;

      while (intersectedObject.parent && !intersectedObject.userData.parent) {
        intersectedObject = intersectedObject.parent;
      }
      return intersectedObject;
    }

    return null;
  }

  private onMouseMove(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectedObject = this.getIntersectedObject();

    if (intersectedObject) {
      this.popupHandler?.onHover(intersectedObject.name, { x: event.clientX - rect.left, y: event.clientY - rect.top + 10 });
      
      if (this.highlightedObject !== intersectedObject) {
        this.restoreColorIfNeeded();
      }
      this.highlightedObject = intersectedObject;
      this.highlightObjectGroup(this.highlightedObject);
    } else {
      this.renderer.domElement.style.cursor = 'default';
      this.popupHandler?.offHover();
      this.restoreColorIfNeeded();
      this.highlightedObject = null;
    }
  }

  private highlightObjectGroup(object: THREE.Object3D) {
    const materialCache: Array<THREE.Material | THREE.Material[]> = [];
    if (object === this.hubModel){
      const index = object.children.findIndex((child)=>{
        return !this.followTheConvention(child.name)
      });
      this.highlightObjectGroup(object.children[index])
      return
    } 
    else {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mesh = child as THREE.Mesh;
          const originalMaterial = mesh.material;
          if (!this.originalMaterialMap.has(object)) {
            materialCache.push(mesh.material);
          }
          const originalColor = (originalMaterial as THREE.MeshStandardMaterial).color;
          const highlightColor = this.getContrastingColor(originalColor);

          const highlightMaterial = new THREE.MeshStandardMaterial({
            color: highlightColor,
            opacity: 0.8,
            transparent: true,
          });

          mesh.material = highlightMaterial;
        }
      });
      if (!this.originalMaterialMap.has(object)) {
          this.originalMaterialMap.set(object, materialCache);
      }
      return
    }
  }

  private restoreOriginalColor(object: THREE.Object3D) {
    if (object === this.hubModel){
      const index = object.children.findIndex((child)=>{
        return !this.followTheConvention(child.name)
      });
      this.restoreOriginalColor(object.children[index])
      return
    } else {
      const originalMaterials = this.originalMaterialMap.get(object);
      if (originalMaterials) {
        let index = 0;
        object.traverse((child) => {
          if (child.name.startsWith(this.namingConvention[0])||child.name.startsWith(this.namingConvention[1])){
            return false
          }
          if (child instanceof THREE.Mesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = originalMaterials[index++];
          }
          return
        });
        this.originalMaterialMap.delete(object);
      }
      return
    }
  }

  // PRIVATE UTILITY FUNCTIONS (Helper logic)
  private getContrastingColor(originalColor: THREE.Color): THREE.Color {
    const invertedColor = new THREE.Color(1 - originalColor.r, 1 - originalColor.g, 1 - originalColor.b);
    const blendFactor = 0.9;
    invertedColor.lerp(new THREE.Color(0x00bcd4), blendFactor);
    return invertedColor;
  }

  
  // Helper function to restore all colors
  private restoreAllColors() {
    this.lockedHighlightedObjectArray.forEach(item => this.restoreOriginalColor(item));
  }

  private clearTheLockedHighlight(){
    this.lockedHighlightedObjectArray.splice(0, this.lockedHighlightedObjectArray.length);
  }

  private highLightAssembly(object: Object3D) {
    object.userData.children.forEach((childName: string) => {
      const child = this.objectMap.get(childName)!;
      const thisIsAssembly = child.name.startsWith(this.namingConvention[0]);
      if (thisIsAssembly) {
        this.highLightAssembly(child);
      } else if (!this.lockedHighlightedObjectArray.includes(child)) {
        this.highlightObjectGroup(child);
        this.lockedHighlightedObjectArray.push(child);
      }
    });
  }

  // CLICK HANDLERS
  private onMouseClick() {
    const intersectedObject = this.highlightedObject;
    if (intersectedObject) {
      this.infoHandler?.onClick(intersectedObject);
      if (this.lockedHighlightedObjectArray.length !== 0) { 
        const indexIntersectedObject = this.lockedHighlightedObjectArray.indexOf(intersectedObject);
        if (indexIntersectedObject === -1){
          this.restoreAllColors();
        } else {
          this.lockedHighlightedObjectArray.splice(indexIntersectedObject,1);
          this.restoreAllColors();
        }
        this.clearTheLockedHighlight()
      }
      this.lockedHighlightedObjectArray.push(intersectedObject);
    } else {
      if (this.lockedHighlightedObjectArray.length !== 0) {
        this.restoreAllColors();
        this.clearTheLockedHighlight()
      }
    }
  }

  private onMouseDoubleClick() {
    const intersectedObject = this.getIntersectedObject();

    if (intersectedObject) {
      const objectToHandle = intersectedObject.userData.parent ? this.objectMap.get(intersectedObject.userData.parent)! : intersectedObject;
      this.infoHandler?.onClick(objectToHandle);
      this.highLightAssembly(objectToHandle);
    }
  }


  addRaycastCallback(callback: RaycastCallback) {
    this.raycastCallbacks.push(callback);
  }

  removeRaycastCallback(callback: RaycastCallback) {
    this.raycastCallbacks = this.raycastCallbacks.filter((cb) => cb !== callback);
  }

}

export { SceneManager }; 
