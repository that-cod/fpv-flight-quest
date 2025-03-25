import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { DronePhysics, updateDronePhysics, checkCollision, checkCoinCollection, createDronePhysics } from '@/utils/physics';
import { PowerUpType } from '@/hooks/useGameState';

interface DroneSceneProps {
  isPlaying: boolean;
  controls: {
    throttle: number;
    pitch: number;
    yaw: number;
    roll: number;
    steeringLock?: number;
  };
  powerUp: PowerUpType;
  onCrash: () => void;
  onCoinCollect: (value: number) => void;
  onPowerUpCollect: (type: PowerUpType, duration: number) => void;
}

const DroneScene: React.FC<DroneSceneProps> = ({
  isPlaying,
  controls,
  powerUp,
  onCrash,
  onCoinCollect,
  onPowerUpCollect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const droneRef = useRef<THREE.Group | null>(null);
  const dronePhysicsRef = useRef<DronePhysics | null>(null);
  const coinsRef = useRef<THREE.Mesh[]>([]);
  const obstaclesRef = useRef<THREE.Mesh[]>([]);
  const powerUpsRef = useRef<THREE.Mesh[]>([]);
  const gameStartedRef = useRef<boolean>(false);
  const safeStartTimerRef = useRef<number | null>(null);

  const [coinPositions, setCoinPositions] = useState<Array<{
    position: { x: number; y: number; z: number };
    radius: number;
    collected: boolean;
  }>>([]);

  const [obstaclePositions, setObstaclePositions] = useState<Array<{
    position: { x: number; y: number; z: number };
    radius: number;
  }>>([]);

  const [powerUpPositions, setPowerUpPositions] = useState<Array<{
    position: { x: number; y: number; z: number };
    radius: number;
    type: PowerUpType;
    collected: boolean;
  }>>([]);

  // Reset game started ref when game status changes
  useEffect(() => {
    if (!isPlaying) {
      gameStartedRef.current = false;
      if (safeStartTimerRef.current) {
        clearTimeout(safeStartTimerRef.current);
        safeStartTimerRef.current = null;
      }
    } else if (isPlaying && !gameStartedRef.current) {
      // Give a 3 second grace period before enabling collisions (increased from 2)
      safeStartTimerRef.current = window.setTimeout(() => {
        gameStartedRef.current = true;
      }, 3000);
    }
    
    return () => {
      if (safeStartTimerRef.current) {
        clearTimeout(safeStartTimerRef.current);
      }
    };
  }, [isPlaying]);

  // Initialize the Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    scene.fog = new THREE.Fog(0x87CEEB, 100, 300); // Increased fog distance for better visibility
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      80, // Wider FOV for mobile 
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    cameraRef.current = camera;

    // Renderer - REMOVE shadow maps for performance
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false; // Disable shadows for performance
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting - Simplified lighting for performance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // Increased ambient light to compensate for no shadows
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 100, 50);
    // Removed shadow casting setup
    scene.add(directionalLight);

    // Ground - removed shadow receiving
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000); // Larger ground
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a5e1a,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    // Removed receiveShadow
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(1000, 100, 0x888888, 0xcccccc); // Larger grid
    scene.add(gridHelper);

    // City with fewer, smaller buildings
    createCity(scene);

    // Drone model - removed shadow casting
    const drone = createImprovedDrone();
    scene.add(drone);
    droneRef.current = drone;
    
    // Initialize drone physics
    dronePhysicsRef.current = createDronePhysics();
    
    // Set drone position to a safer starting location with more clearance
    if (dronePhysicsRef.current) {
      dronePhysicsRef.current.position = { x: 0, y: 30, z: 0 }; // Start higher
      drone.position.set(0, 30, 0);
    }

    // Generate more coins for easier collection
    generateCoins(scene, 300); // Increased coin count

    // Generate fewer obstacles
    generateObstacles(scene);

    // Generate more power-ups
    generatePowerUps(scene);

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      window.removeEventListener('resize', handleResize);
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Create an improved drone model - removed shadow casting
  const createImprovedDrone = () => {
    const droneGroup = new THREE.Group();
    
    // Drone body - main frame - removed shadow casting
    const bodyGeometry = new THREE.BoxGeometry(1, 0.15, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x0EA5E9,
      metalness: 0.5,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    // Removed castShadow
    droneGroup.add(body);
    
    // Central hub - more cylindrical for realism
    const hubGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
    const hubMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.7,
      roughness: 0.2,
    });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.position.y = 0.05;
    droneGroup.add(hub);
    
    // Arms - using cylindrical shapes for more realistic drone arms
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xE5E5E5,
      metalness: 0.5,
      roughness: 0.5,
    });
    
    // Four arms extending diagonally from the center
    const armPositions = [
      { x: -0.5, z: -0.5, rotation: Math.PI / 4 },
      { x: 0.5, z: -0.5, rotation: -Math.PI / 4 },
      { x: -0.5, z: 0.5, rotation: -Math.PI / 4 },
      { x: 0.5, z: 0.5, rotation: Math.PI / 4 }
    ];
    
    armPositions.forEach((pos) => {
      const arm = new THREE.Mesh(armGeometry, armMaterial);
      arm.position.set(pos.x, 0, pos.z);
      arm.rotation.y = pos.rotation;
      arm.rotation.z = Math.PI / 2;
      droneGroup.add(arm);
    });
    
    // Motors
    const motorGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
    const motorMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    });
    
    // Propellers - larger and more visible
    const propellerGeometry = new THREE.BoxGeometry(0.6, 0.03, 0.08);
    const propellerMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.3,
      roughness: 0.7,
    });
    
    // Add motors and propellers at each arm end
    armPositions.forEach((pos, index) => {
      const motor = new THREE.Mesh(motorGeometry, motorMaterial);
      motor.position.set(pos.x * 1.2, 0.1, pos.z * 1.2);
      droneGroup.add(motor);
      
      // Create two perpendicular propeller blades for each motor
      for (let i = 0; i < 2; i++) {
        const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        propeller.position.set(pos.x * 1.2, 0.15, pos.z * 1.2);
        propeller.rotation.y = (i * Math.PI / 2) + (index % 2 ? 0 : Math.PI / 4);
        droneGroup.add(propeller);
      }
    });
    
    // Add dome for FPV camera
    const cameraGeometry = new THREE.SphereGeometry(0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cameraMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    });
    const droneCamera = new THREE.Mesh(cameraGeometry, cameraMaterial);
    droneCamera.position.set(0, 0.05, -0.5);
    droneCamera.rotation.x = -Math.PI / 2;
    droneGroup.add(droneCamera);
    
    // Add LED lights (small glowing spheres)
    const ledGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const ledMaterials = [
      new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        emissive: 0xff0000,
        emissiveIntensity: 0.5
      }), // Red
      new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, 
        emissive: 0x00ff00,
        emissiveIntensity: 0.5
      })  // Green
    ];
    
    // Add LEDs to front and back arms
    armPositions.forEach((pos, index) => {
      const led = new THREE.Mesh(ledGeometry, ledMaterials[index % 2]);
      led.position.set(pos.x * 1.3, 0.05, pos.z * 1.3);
      droneGroup.add(led);
    });
    
    return droneGroup;
  };

  // Create a simplified city environment with fewer buildings - remove shadows
  const createCity = (scene: THREE.Scene) => {
    // Building material options
    const buildingMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }),
    ];
    
    // Generate fewer buildings
    const buildingCount = 80; // Reduced from 200
    const citySize = 400; // Wider spread for a more sparse, open environment
    const maxHeight = 40; // Lower height
    const minHeight = 10;
    
    for (let i = 0; i < buildingCount; i++) {
      // Random position with wider spread
      const x = (Math.random() - 0.5) * citySize;
      const z = (Math.random() - 0.5) * citySize;
      
      // Smaller buildings for easier navigation
      const width = 4 + Math.random() * 8;
      const depth = 4 + Math.random() * 8;
      const height = minHeight + Math.random() * maxHeight;
      
      // Create building - removed shadow casting
      const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      const material = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
      const building = new THREE.Mesh(buildingGeometry, material);
      
      building.position.set(x, height / 2, z);
      // Removed castShadow and receiveShadow
      
      scene.add(building);
      
      // Add to obstacles
      obstaclesRef.current.push(building);
      setObstaclePositions(prev => [
        ...prev,
        {
          position: { x, y: height / 2, z },
          radius: Math.max(width, depth) / 2
        }
      ]);
    }
    
    // Add fewer bridges
    createBridges(scene);
  };

  // Add bridges to the scene - remove shadows
  const createBridges = (scene: THREE.Scene) => {
    // Bridge material
    const bridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.6
    });
    
    // Create fewer bridges
    for (let i = 0; i < 3; i++) { // Reduced from 5
      const x = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      const rotation = Math.random() * Math.PI;
      
      // Bridge base - removed shadow casting
      const baseGeometry = new THREE.BoxGeometry(40, 1, 10);
      const base = new THREE.Mesh(baseGeometry, bridgeMaterial);
      base.position.set(x, 20 + Math.random() * 10, z); // Higher bridges
      base.rotation.y = rotation;
      // Removed castShadow and receiveShadow
      scene.add(base);
      
      // Bridge supports - removed shadow casting
      for (let j = -1; j <= 1; j += 2) {
        const supportGeometry = new THREE.BoxGeometry(1, 30, 10);
        const support = new THREE.Mesh(supportGeometry, bridgeMaterial);
        support.position.set(x + (j * 18), base.position.y - 15, z);
        support.rotation.y = rotation;
        // Removed castShadow
        scene.add(support);
        
        // Add to obstacles
        obstaclesRef.current.push(support);
        setObstaclePositions(prev => [
          ...prev,
          {
            position: { 
              x: support.position.x, 
              y: support.position.y, 
              z: support.position.z 
            },
            radius: 5
          }
        ]);
      }
      
      // Add bridge to obstacles
      obstaclesRef.current.push(base);
      setObstaclePositions(prev => [
        ...prev,
        {
          position: { 
            x: base.position.x, 
            y: base.position.y, 
            z: base.position.z 
          },
          radius: 20
        }
      ]);
    }
  };

  // Generate more coins with better visibility
  const generateCoins = (scene: THREE.Scene, count = 300) => {
    const coinGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16); // Larger coins
    const coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xFFD700,
      emissiveIntensity: 0.6 // Brighter glow
    });
    
    const coinCount = count;
    const areaSize = 350; // Larger area
    const minHeight = 5;
    const maxHeight = 80; // Higher max height
    
    for (let i = 0; i < coinCount; i++) {
      const x = (Math.random() - 0.5) * areaSize;
      const y = minHeight + Math.random() * (maxHeight - minHeight);
      const z = (Math.random() - 0.5) * areaSize;
      
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.set(x, y, z);
      coin.rotation.x = Math.PI / 2;
      
      // Add a larger glow effect
      const glowMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.4,
        emissive: 0xFFD700,
        emissiveIntensity: 0.4
      });
      const glowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16), // Larger glow sphere
        glowMaterial
      );
      glowSphere.position.copy(coin.position);
      scene.add(glowSphere);
      
      scene.add(coin);
      coinsRef.current.push(coin);
      
      setCoinPositions(prev => [
        ...prev,
        {
          position: { x, y, z },
          radius: 1.2, // Larger collision radius
          collected: false
        }
      ]);
    }
  };

  // Generate fewer obstacles
  const generateObstacles = (scene: THREE.Scene) => {
    // Add fewer floating obstacles
    const obstacleCount = 15; // Reduced from 30
    const obstacleGeometries = [
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.SphereGeometry(2, 16, 16),
      new THREE.TetrahedronGeometry(2),
      new THREE.CylinderGeometry(0, 2, 4, 8)
    ];
    
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4040,
      roughness: 0.7,
      metalness: 0.2
    });
    
    for (let i = 0; i < obstacleCount; i++) {
      const geometry = obstacleGeometries[Math.floor(Math.random() * obstacleGeometries.length)];
      const obstacle = new THREE.Mesh(geometry, obstacleMaterial);
      
      // More spread out
      const x = (Math.random() - 0.5) * 300;
      const y = 15 + Math.random() * 40;
      const z = (Math.random() - 0.5) * 300;
      
      obstacle.position.set(x, y, z);
      obstacle.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      scene.add(obstacle);
      
      obstaclesRef.current.push(obstacle);
      setObstaclePositions(prev => [
        ...prev,
        {
          position: { x, y, z },
          radius: 2
        }
      ]);
    }
  };

  // Generate more power-ups with better visibility
  const generatePowerUps = (scene: THREE.Scene) => {
    const powerUpTypes: PowerUpType[] = ['shield', 'speed', 'magnet', 'timeFreeze'];
    const powerUpColors = {
      'shield': 0x0088ff,
      'speed': 0xff4400,
      'magnet': 0xaa44ff,
      'timeFreeze': 0x00cc66
    };
    
    const powerUpCount = 40; // More power-ups (up from 30)
    const areaSize = 300;
    const minHeight = 10;
    const maxHeight = 70;
    
    for (let i = 0; i < powerUpCount; i++) {
      const x = (Math.random() - 0.5) * areaSize;
      const y = minHeight + Math.random() * (maxHeight - minHeight);
      const z = (Math.random() - 0.5) * areaSize;
      
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      const powerUpGeometry = new THREE.SphereGeometry(1.0, 16, 16); // Larger power-ups
      const powerUpMaterial = new THREE.MeshStandardMaterial({
        color: powerUpColors[type],
        metalness: 0.7,
        roughness: 0.2,
        emissive: powerUpColors[type],
        emissiveIntensity: 0.7, // Brighter
        transparent: true,
        opacity: 0.9 // More visible
      });
      
      const powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
      powerUp.position.set(x, y, z);
      
      // Add larger glow effect
      const glowMaterial = new THREE.MeshStandardMaterial({
        color: powerUpColors[type],
        transparent: true,
        opacity: 0.4,
        emissive: powerUpColors[type],
        emissiveIntensity: 0.4
      });
      const glowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 16, 16), // Larger glow
        glowMaterial
      );
      glowSphere.position.copy(powerUp.position);
      scene.add(glowSphere);
      
      scene.add(powerUp);
      powerUpsRef.current.push(powerUp);
      
      setPowerUpPositions(prev => [
        ...prev,
        {
          position: { x, y, z },
          radius: 1.8, // Larger collision radius
          type,
          collected: false
        }
      ]);
    }
  };

  // Animation loop with improved game logic
  const animate = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    
    const deltaTime = Math.min((time - previousTimeRef.current) / 1000, 0.1);
    previousTimeRef.current = time;
    
    if (isPlaying && droneRef.current && dronePhysicsRef.current && cameraRef.current && rendererRef.current && sceneRef.current) {
      // Update drone physics
      const newPhysics = updateDronePhysics(
        dronePhysicsRef.current,
        controls,
        { speedBoost: powerUp === 'speed' },
        deltaTime
      );
      
      dronePhysicsRef.current = newPhysics;
      
      // Update drone position and rotation
      droneRef.current.position.set(
        newPhysics.position.x,
        newPhysics.position.y,
        newPhysics.position.z
      );
      
      droneRef.current.rotation.set(
        newPhysics.rotation.x,
        newPhysics.rotation.y,
        newPhysics.rotation.z
      );
      
      // Improved camera following (better for mobile)
      const cameraOffset = new THREE.Vector3(0, 1.5, 5); // Closer camera for mobile
      cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), newPhysics.rotation.y);
      
      cameraRef.current.position.set(
        newPhysics.position.x + cameraOffset.x,
        newPhysics.position.y + cameraOffset.y,
        newPhysics.position.z + cameraOffset.z
      );
      
      cameraRef.current.lookAt(
        newPhysics.position.x,
        newPhysics.position.y,
        newPhysics.position.z
      );
      
      // Collision detection with larger margin
      const droneRadius = 0.8; // Larger drone collision radius for easier gameplay
      
      if (gameStartedRef.current && powerUp !== 'shield' && checkCollision(
        dronePhysicsRef.current.position,
        droneRadius,
        obstaclePositions
      )) {
        onCrash();
      }
      
      // Easier coin collection
      const collectedCoinIndices = checkCoinCollection(
        dronePhysicsRef.current.position,
        droneRadius,
        coinPositions,
        powerUp === 'magnet'
      );
      
      if (collectedCoinIndices.length > 0) {
        // Update collected coins
        setCoinPositions(prev => {
          const newPositions = [...prev];
          collectedCoinIndices.forEach(index => {
            newPositions[index].collected = true;
          });
          return newPositions;
        });
        
        // Update coin visibility
        collectedCoinIndices.forEach(index => {
          if (coinsRef.current[index]) {
            coinsRef.current[index].visible = false;
          }
        });
        
        // Add more points per coin (15 instead of 10)
        onCoinCollect(collectedCoinIndices.length * 15);
      }
      
      // Power-up collection with larger radius
      powerUpPositions.forEach((powerUp, index) => {
        if (!powerUp.collected) {
          const distance = Math.sqrt(
            Math.pow(dronePhysicsRef.current!.position.x - powerUp.position.x, 2) +
            Math.pow(dronePhysicsRef.current!.position.y - powerUp.position.y, 2) +
            Math.pow(dronePhysicsRef.current!.position.z - powerUp.position.z, 2)
          );
          
          // Larger detection radius
          if (distance < (droneRadius * 1.5 + powerUp.radius)) {
            // Mark power-up as collected
            setPowerUpPositions(prev => {
              const newPositions = [...prev];
              newPositions[index].collected = true;
              return newPositions;
            });
            
            // Hide power-up
            if (powerUpsRef.current[index]) {
              powerUpsRef.current[index].visible = false;
            }
            
            // Longer duration power-ups
            const duration = powerUp.type === 'magnet' ? 15 : 8; // Longer durations
            onPowerUpCollect(powerUp.type, duration);
          }
        }
      });
      
      // Animate coins with more pronounced movement
      coinsRef.current.forEach((coin, index) => {
        if (!coinPositions[index]?.collected) {
          coin.rotation.z += deltaTime * 3; // Faster rotation
          coin.position.y += Math.sin(time / 400) * 0.02; // More noticeable bobbing
        }
      });
      
      // Animate power-ups with more pronounced effects
      powerUpsRef.current.forEach((powerUp, index) => {
        if (!powerUpPositions[index]?.collected) {
          powerUp.position.y += Math.sin(time / 400) * 0.025;
          powerUp.rotation.y += deltaTime * 1.5;
          const scale = 1 + 0.15 * Math.sin(time / 250); // More pulsing
          powerUp.scale.set(scale, scale, scale);
        }
      });
      
      // Animate propellers
      if (droneRef.current.children) {
        droneRef.current.children.forEach(child => {
          if (child instanceof THREE.Mesh && 
              child.geometry instanceof THREE.BoxGeometry && 
              child.geometry.parameters.height < 0.1) {
            child.rotation.y += controls.throttle * deltaTime * 25; // Faster rotation
          }
        });
      }
      
      // Render scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    requestRef.current = requestAnimationFrame(animate);
  };

  // Start animation loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, controls, powerUp]);

  return <div ref={containerRef} className="fixed inset-0 z-0" />;
};

export default DroneScene;
