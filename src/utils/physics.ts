
export interface DronePhysics {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  velocity: {
    x: number;
    y: number;
    z: number;
  };
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  mass: number;
  drag: number;
  maxSpeed: number;
  maxAcceleration: number;
  gravity: number;
}

export const createDronePhysics = (): DronePhysics => {
  return {
    position: { x: 0, y: 5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    mass: 1,
    drag: 0.15, // Increased drag for more realistic deceleration
    maxSpeed: 30, // Increased max speed
    maxAcceleration: 8, // Increased acceleration
    gravity: 9.8,
  };
};

export const updateDronePhysics = (
  physics: DronePhysics, 
  controls: { throttle: number; pitch: number; yaw: number; roll: number },
  powerUps: { speedBoost: boolean },
  deltaTime: number
): DronePhysics => {
  const {
    position,
    rotation,
    velocity,
    acceleration,
    mass,
    drag,
    maxSpeed,
    maxAcceleration,
    gravity
  } = physics;

  const actualMaxSpeed = powerUps.speedBoost ? maxSpeed * 1.7 : maxSpeed;

  // Update rotation based on controls with improved responsiveness
  const rotationSpeed = 2.5 * deltaTime;
  const newRotation = {
    // Pitch (forward/backward tilt) - now more responsive
    x: rotation.x + controls.pitch * rotationSpeed * 1.2,
    // Yaw (turning left/right)
    y: rotation.y + controls.yaw * rotationSpeed,
    // Roll (banking left/right)
    z: rotation.z + controls.roll * rotationSpeed * 0.8
  };

  // Apply damping to rotation for smoother control
  newRotation.x *= 0.95;
  newRotation.y *= 0.98;
  newRotation.z *= 0.95;

  // Calculate forces based on controls and current rotation
  // This creates a more realistic flight model where the drone moves in the direction it's facing
  const throttleForce = controls.throttle * maxAcceleration;
  
  // Forward force based on pitch and current facing direction
  const forwardForce = Math.cos(newRotation.x) * throttleForce;
  
  // Calculate forward direction vector based on yaw
  const forwardX = Math.sin(newRotation.y) * forwardForce;
  const forwardZ = Math.cos(newRotation.y) * forwardForce;
  
  // Vertical force (lift vs gravity)
  const verticalForce = Math.sin(newRotation.x) * throttleForce;
  
  // Horizontal force based on roll (banking)
  const horizontalForce = Math.sin(newRotation.z) * throttleForce * 0.4;
  
  // Calculate forces
  const forces = {
    x: forwardX + horizontalForce,
    y: throttleForce * 0.8 - gravity + verticalForce, // Lift force counteracts gravity
    z: forwardZ
  };

  // Calculate new acceleration
  const newAcceleration = {
    x: forces.x / mass,
    y: forces.y / mass,
    z: forces.z / mass
  };

  // Calculate new velocity with drag and momentum
  const dragFactor = 1 - (drag * deltaTime);
  const newVelocity = {
    x: (velocity.x + newAcceleration.x * deltaTime) * dragFactor,
    y: (velocity.y + newAcceleration.y * deltaTime) * dragFactor,
    z: (velocity.z + newAcceleration.z * deltaTime) * dragFactor
  };

  // Limit velocity to max speed
  const speed = Math.sqrt(
    newVelocity.x * newVelocity.x +
    newVelocity.y * newVelocity.y +
    newVelocity.z * newVelocity.z
  );

  if (speed > actualMaxSpeed) {
    const scale = actualMaxSpeed / speed;
    newVelocity.x *= scale;
    newVelocity.y *= scale;
    newVelocity.z *= scale;
  }

  // Calculate new position
  const newPosition = {
    x: position.x + newVelocity.x * deltaTime,
    y: position.y + newVelocity.y * deltaTime,
    z: position.z + newVelocity.z * deltaTime
  };

  // Ensure drone doesn't go below ground
  if (newPosition.y < 0.5) {
    newPosition.y = 0.5;
    newVelocity.y = Math.abs(newVelocity.y) * 0.3; // Bounce effect
  }

  // Add world boundaries to prevent flying too far
  const worldBoundary = 200;
  if (Math.abs(newPosition.x) > worldBoundary) {
    newPosition.x = Math.sign(newPosition.x) * worldBoundary;
    newVelocity.x *= -0.3; // Bounce off boundary
  }
  
  if (Math.abs(newPosition.z) > worldBoundary) {
    newPosition.z = Math.sign(newPosition.z) * worldBoundary;
    newVelocity.z *= -0.3; // Bounce off boundary
  }

  return {
    ...physics,
    position: newPosition,
    rotation: newRotation,
    velocity: newVelocity,
    acceleration: newAcceleration
  };
};

// Improved collision detection with better accuracy
export const checkCollision = (
  dronePosition: { x: number; y: number; z: number },
  droneRadius: number,
  obstacles: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
  }>
): boolean => {
  // Better collision detection with more precise radius checks
  for (const obstacle of obstacles) {
    const dx = dronePosition.x - obstacle.position.x;
    const dy = dronePosition.y - obstacle.position.y;
    const dz = dronePosition.z - obstacle.position.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minDistance = droneRadius + obstacle.radius;
    
    if (distance < minDistance) {
      return true; // Collision detected
    }
  }
  
  return false; // No collision
};

// Improved coin collection with magnetic effect support
export const checkCoinCollection = (
  dronePosition: { x: number; y: number; z: number },
  droneRadius: number,
  coins: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
    collected: boolean;
  }>,
  hasMagnet: boolean = false
): number[] => {
  const collectedIndices: number[] = [];
  const magnetRadius = hasMagnet ? droneRadius * 5 : droneRadius;
  
  coins.forEach((coin, index) => {
    if (coin.collected) return;
    
    const dx = dronePosition.x - coin.position.x;
    const dy = dronePosition.y - coin.position.y;
    const dz = dronePosition.z - coin.position.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // If magnet power-up is active, pull coins towards the drone
    if (hasMagnet && distance < magnetRadius) {
      const pullStrength = 0.2;
      coin.position.x += dx * pullStrength;
      coin.position.y += dy * pullStrength;
      coin.position.z += dz * pullStrength;
    }
    
    if (distance < (droneRadius + coin.radius)) {
      collectedIndices.push(index);
    }
  });
  
  return collectedIndices;
};
