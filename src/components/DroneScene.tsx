import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { DronePhysics, updateDronePhysics, checkCollision, checkCoinCollection } from '@/utils/physics';
import { PowerUpType } from '@/hooks/useGameState';

interface DroneSceneProps {
  isPlaying: boolean;
  controls: {
    throttle: number;
    pitch: number;
    yaw: number;
    roll: number;
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

  // Initialize the Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f8ff);
    scene.fog = new THREE.Fog(0xf0f8ff, 50, 160);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(500, 50, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    // City buildings
    createCity(scene);

    // Drone model (simplified for this version)
    const drone = createDrone();
    scene.add(drone);
    droneRef.current = drone;
    
    // Initialize drone physics
    dronePhysicsRef.current = {
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 1,
      drag: 0.1,
      maxSpeed: 20,
      maxAcceleration: 5,
      gravity: 9.8,
    };

    // Generate coins
    generateCoins(scene);

    // Generate obstacles
    generateObstacles(scene);

    // Generate power-ups
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

  // Create a basic drone model
  const createDrone = () => {
    const droneGroup = new THREE.Group();
    
    // Drone body
    const bodyGeometry = new THREE.BoxGeometry(1, 0.2, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x0EA5E9,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    droneGroup.add(body);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
    });
    
    // Front-left arm
    const frontLeftArm = new THREE.Mesh(armGeometry, armMaterial);
    frontLeftArm.position.set(-0.4, 0, -0.4);
    frontLeftArm.castShadow = true;
    droneGroup.add(frontLeftArm);
    
    // Front-right arm
    const frontRightArm = new THREE.Mesh(armGeometry, armMaterial);
    frontRightArm.position.set(0.4, 0, -0.4);
    frontRightArm.castShadow = true;
    droneGroup.add(frontRightArm);
    
    // Back-left arm
    const backLeftArm = new THREE.Mesh(armGeometry, armMaterial);
    backLeftArm.position.set(-0.4, 0, 0.4);
    backLeftArm.castShadow = true;
    droneGroup.add(backLeftArm);
    
    // Back-right arm
    const backRightArm = new THREE.Mesh(armGeometry, armMaterial);
    backRightArm.position.set(0.4, 0, 0.4);
    backRightArm.castShadow = true;
    droneGroup.add(backRightArm);
    
    // Motors and propellers
    const motorGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
    const motorMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
    });
    
    const propellerGeometry = new THREE.BoxGeometry(0.5, 0.02, 0.05);
    const propellerMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
    });
    
    // Front-left motor and propeller
    const frontLeftMotor = new THREE.Mesh(motorGeometry, motorMaterial);
    frontLeftMotor.position.set(-0.4, 0.05, -0.4);
    frontLeftMotor.castShadow = true;
    droneGroup.add(frontLeftMotor);
    
    const frontLeftPropeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    frontLeftPropeller.position.set(-0.4, 0.1, -0.4);
    frontLeftPropeller.castShadow = true;
    droneGroup.add(frontLeftPropeller);
    
    // Front-right motor and propeller
    const frontRightMotor = new THREE.Mesh(motorGeometry, motorMaterial);
    frontRightMotor.position.set(0.4, 0.05, -0.4);
    frontRightMotor.castShadow = true;
    droneGroup.add(frontRightMotor);
    
    const frontRightPropeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    frontRightPropeller.position.set(0.4, 0.1, -0.4);
    frontRightPropeller.rotation.y = Math.PI / 4;
    frontRightPropeller.castShadow = true;
    droneGroup.add(frontRightPropeller);
    
    // Back-left motor and propeller
    const backLeftMotor = new THREE.Mesh(motorGeometry, motorMaterial);
    backLeftMotor.position.set(-0.4, 0.05, 0.4);
    backLeftMotor.castShadow = true;
    droneGroup.add(backLeftMotor);
    
    const backLeftPropeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    backLeftPropeller.position.set(-0.4, 0.1, 0.4);
    backLeftPropeller.rotation.y = Math.PI / 4;
    backLeftPropeller.castShadow = true;
    droneGroup.add(backLeftPropeller);
    
    // Back-right motor and propeller
    const backRightMotor = new THREE.Mesh(motorGeometry, motorMaterial);
    backRightMotor.position.set(0.4, 0.05, 0.4);
    backRightMotor.castShadow = true;
    droneGroup.add(backRightMotor);
    
    const backRightPropeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    backRightPropeller.position.set(0.4, 0.1, 0.4);
    backRightPropeller.castShadow = true;
    droneGroup.add(backRightPropeller);
    
    // Camera (for FPV view)
    const cameraGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const cameraMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
    });
    const droneCamera = new THREE.Mesh(cameraGeometry, cameraMaterial);
    droneCamera.position.set(0, 0, -0.5);
    droneCamera.castShadow = true;
    droneGroup.add(droneCamera);
    
    return droneGroup;
  };

  // Create a simple city environment
  const createCity = (scene: THREE.Scene) => {
    // Building material options
    const buildingMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.4 }), // Silver
      new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.5 }), // Light Gray
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 }), // Medium Gray
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.3 }), // Off-white
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }), // Dark Gray
    ];
    
    // Generate a grid of buildings
    const buildingCount = 200;
    const citySize = 150;
    const maxHeight = 60;
    const minHeight = 10;
    
    for (let i = 0; i < buildingCount; i++) {
      // Random position
      const x = (Math.random() - 0.5) * citySize;
      const z = (Math.random() - 0.5) * citySize;
      
      // Random size
      const width = 5 + Math.random() * 10;
      const depth = 5 + Math.random() * 10;
      const height = minHeight + Math.random() * maxHeight;
      
      // Create building
      const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      const material = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
      const building = new THREE.Mesh(buildingGeometry, material);
      
      building.position.set(x, height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      
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
  };

  // Generate coins throughout the scene
  const generateCoins = (scene: THREE.Scene) => {
    const coinGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xFFD700,
      emissiveIntensity: 0.4
    });
    
    const coinCount = 100;
    const areaSize = 120;
    const minHeight = 5;
    const maxHeight = 40;
    
    for (let i = 0; i < coinCount; i++) {
      const x = (Math.random() - 0.5) * areaSize;
      const y = minHeight + Math.random() * (maxHeight - minHeight);
      const z = (Math.random() - 0.5) * areaSize;
      
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.set(x, y, z);
      coin.rotation.x = Math.PI / 2; // Make it flat
      
      scene.add(coin);
      coinsRef.current.push(coin);
      
      setCoinPositions(prev => [
        ...prev,
        {
          position: { x, y, z },
          radius: 0.75, // Slightly larger collision radius for easier collection
          collected: false
        }
      ]);
    }
  };

  // Generate obstacles (additional to buildings)
  const generateObstacles = (scene: THREE.Scene) => {
    // Nothing to add for this initial version - buildings are the main obstacles
  };

  // Generate power-ups
  const generatePowerUps = (scene: THREE.Scene) => {
    const powerUpTypes: PowerUpType[] = ['shield', 'speed', 'magnet', 'timeFreeze'];
    const powerUpColors = {
      'shield': 0x0088ff,
      'speed': 0xff4400,
      'magnet': 0xaa44ff,
      'timeFreeze': 0x00cc66
    };
    
    const powerUpCount = 20;
    const areaSize = 100;
    const minHeight = 10;
    const maxHeight = 50;
    
    for (let i = 0; i < powerUpCount; i++) {
      const x = (Math.random() - 0.5) * areaSize;
      const y = minHeight + Math.random() * (maxHeight - minHeight);
      const z = (Math.random() - 0.5) * areaSize;
      
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      const powerUpGeometry = new THREE.SphereGeometry(0.75, 16, 16);
      const powerUpMaterial = new THREE.MeshStandardMaterial({
        color: powerUpColors[type],
        metalness: 0.5,
        roughness: 0.2,
        emissive: powerUpColors[type],
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
      });
      
      const powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
      powerUp.position.set(x, y, z);
      
      scene.add(powerUp);
      powerUpsRef.current.push(powerUp);
      
      setPowerUpPositions(prev => [
        ...prev,
        {
          position: { x, y, z },
          radius: 1.0, // Slightly larger collision radius
          type,
          collected: false
        }
      ]);
    }
  };

  // Animation loop
  const animate = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    
    const deltaTime = Math.min((time - previousTimeRef.current) / 1000, 0.1); // Cap to 100ms
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
      
      // Update drone position and rotation in the scene
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
      
      // Update camera to follow drone (FPV mode)
      const cameraOffset = new THREE.Vector3(0, 1, 4); // Position slightly behind and above the drone
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
      
      // Check for collisions with obstacles
      const droneRadius = 0.7; // Approximated drone radius for collision
      
      if (powerUp !== 'shield' && checkCollision(
        dronePhysicsRef.current.position,
        droneRadius,
        obstaclePositions
      )) {
        onCrash();
      }
      
      // Check for coin collection
      const collectedCoinIndices = checkCoinCollection(
        dronePhysicsRef.current.position,
        droneRadius,
        coinPositions
      );
      
      if (collectedCoinIndices.length > 0) {
        // Update collected coins in state
        setCoinPositions(prev => {
          const newPositions = [...prev];
          collectedCoinIndices.forEach(index => {
            newPositions[index].collected = true;
          });
          return newPositions;
        });
        
        // Update coin visibility in scene
        collectedCoinIndices.forEach(index => {
          if (coinsRef.current[index]) {
            coinsRef.current[index].visible = false;
          }
        });
        
        // Add points to score (10 points per coin)
        onCoinCollect(collectedCoinIndices.length * 10);
      }
      
      // Check for power-up collection
      powerUpPositions.forEach((powerUp, index) => {
        if (!powerUp.collected) {
          const distance = Math.sqrt(
            Math.pow(dronePhysicsRef.current!.position.x - powerUp.position.x, 2) +
            Math.pow(dronePhysicsRef.current!.position.y - powerUp.position.y, 2) +
            Math.pow(dronePhysicsRef.current!.position.z - powerUp.position.z, 2)
          );
          
          if (distance < (droneRadius + powerUp.radius)) {
            // Mark power-up as collected
            setPowerUpPositions(prev => {
              const newPositions = [...prev];
              newPositions[index].collected = true;
              return newPositions;
            });
            
            // Hide power-up in scene
            if (powerUpsRef.current[index]) {
              powerUpsRef.current[index].visible = false;
            }
            
            // Activate power-up
            const duration = powerUp.type === 'magnet' ? 10 : 5; // Magnet lasts 10s, others 5s
            onPowerUpCollect(powerUp.type, duration);
          }
        }
      });
      
      // Animate coins to rotate
      coinsRef.current.forEach((coin, index) => {
        if (!coinPositions[index]?.collected) {
          coin.rotation.z += deltaTime * 2;
        }
      });
      
      // Animate power-ups to float up and down
      powerUpsRef.current.forEach((powerUp, index) => {
        if (!powerUpPositions[index]?.collected) {
          powerUp.position.y += Math.sin(time / 500) * 0.01;
          powerUp.rotation.y += deltaTime;
        }
      });
      
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
