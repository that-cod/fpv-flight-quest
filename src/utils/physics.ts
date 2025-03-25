
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
  // Added steering lock variable
  steeringLock: number;
}

export const createDronePhysics = (): DronePhysics => {
  return {
    position: { x: 0, y: 30, z: 0 }, // Start at a higher position for better visibility
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    mass: 1,
    drag: 0.2, // Increased drag for better mobile control
    maxSpeed: 60, // Increased max speed for better gameplay
    maxAcceleration: 15, // Increased acceleration for responsive controls
    gravity: 9.8,
    steeringLock: 0, // 0 = no lock, -1 = locked left, 1 = locked right
  };
};

export const updateDronePhysics = (
  physics: DronePhysics, 
  controls: { throttle: number; pitch: number; yaw: number; roll: number; steeringLock?: number },
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
    gravity,
    steeringLock
  } = physics;

  // Increased speed boost for more exciting gameplay
  const actualMaxSpeed = powerUps.speedBoost ? maxSpeed * 2.0 : maxSpeed;

  // Handle steering lock - apply the locked steering value if it exists
  let effectiveYaw = controls.yaw;
  
  // Update steering lock if provided in controls
  let newSteeringLock = steeringLock;
  if (controls.steeringLock !== undefined) {
    newSteeringLock = controls.steeringLock;
  }
  
  // Apply steering lock effect if active
  if (newSteeringLock !== 0) {
    // Apply a constant steering effect based on the lock direction and sensitivity
    const lockStrength = Math.abs(controls.yaw) > 1.0 ? 2.5 : 1.5;
    effectiveYaw = newSteeringLock * lockStrength;
  }

  // Enhanced rotation calculations with locked steering
  const rotationSpeed = 3.5 * deltaTime;
  const yawMultiplier = Math.abs(effectiveYaw) > 1.0 ? 2.5 : 1.5; // Faster turning for Q/E keys
  
  const newRotation = {
    x: rotation.x + controls.pitch * rotationSpeed * 1.8,
    y: rotation.y + effectiveYaw * rotationSpeed * yawMultiplier, // Use effective yaw with lock applied
    z: rotation.z + controls.roll * rotationSpeed * 1.5
  };

  // Improved damping for smoother steering - but we don't reduce yaw when lock is active
  newRotation.x *= 0.9;
  // Only apply yaw damping if not locked
  newRotation.z *= 0.9;

  // Improved movement physics for more intuitive control
  const throttleForce = Math.max(0, controls.throttle) * maxAcceleration;
  
  // Updated forward force calculation for correct W/S controls
  const forwardForce = -Math.sin(newRotation.x) * maxAcceleration * 1.5;
  
  // Updated direction vectors for better yaw control
  const forwardX = Math.sin(newRotation.y) * forwardForce;
  const forwardZ = Math.cos(newRotation.y) * forwardForce;
  
  // Improved vertical control
  const directVerticalControl = controls.throttle * maxAcceleration * 1.5;
  
  // Better banking physics
  const horizontalForce = Math.sin(newRotation.z) * maxAcceleration * 0.8;
  
  const forces = {
    x: forwardX + horizontalForce,
    y: directVerticalControl - gravity,
    z: forwardZ
  };

  // Calculate acceleration
  const newAcceleration = {
    x: forces.x / mass,
    y: forces.y / mass,
    z: forces.z / mass
  };

  // Improved drag model for better feel
  const dragFactor = 1 - (drag * deltaTime);
  const newVelocity = {
    x: (velocity.x + newAcceleration.x * deltaTime) * dragFactor,
    y: (velocity.y + newAcceleration.y * deltaTime) * dragFactor,
    z: (velocity.z + newAcceleration.z * deltaTime) * dragFactor
  };

  // Apply speed limits
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

  // Higher minimum altitude for easier gameplay
  if (newPosition.y < 2.5) {
    newPosition.y = 2.5;
    newVelocity.y = Math.abs(newVelocity.y) * 0.3;
  }

  // Expanded world boundaries for 360 exploration
  const worldBoundary = 500; // Much larger world boundary for infinite feel
  if (Math.abs(newPosition.x) > worldBoundary) {
    newPosition.x = Math.sign(newPosition.x) * worldBoundary;
    newVelocity.x *= -0.3;
  }
  
  if (Math.abs(newPosition.z) > worldBoundary) {
    newPosition.z = Math.sign(newPosition.z) * worldBoundary;
    newVelocity.z *= -0.3;
  }

  // Higher altitude ceiling
  const maxAltitude = 150;
  if (newPosition.y > maxAltitude) {
    newPosition.y = maxAltitude;
    newVelocity.y = Math.min(0, newVelocity.y);
  }

  return {
    ...physics,
    position: newPosition,
    rotation: newRotation,
    velocity: newVelocity,
    acceleration: newAcceleration,
    steeringLock: newSteeringLock
  };
};

// Improved collision detection with larger detection radius for mobile friendliness
export const checkCollision = (
  dronePosition: { x: number; y: number; z: number },
  droneRadius: number,
  obstacles: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
  }>
): boolean => {
  for (const obstacle of obstacles) {
    const dx = dronePosition.x - obstacle.position.x;
    const dy = dronePosition.y - obstacle.position.y;
    const dz = dronePosition.z - obstacle.position.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    // Slightly larger margin for easier gameplay
    const minDistance = droneRadius + obstacle.radius * 0.9;
    
    if (distance < minDistance) {
      return true;
    }
  }
  
  return false;
};

// Greatly improved coin collection with larger magnetic effect
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
  // Much larger collection radius for mobile-friendliness
  const baseRadius = droneRadius * 1.5; 
  const magnetRadius = hasMagnet ? baseRadius * 12 : baseRadius;
  
  coins.forEach((coin, index) => {
    if (coin.collected) return;
    
    const dx = dronePosition.x - coin.position.x;
    const dy = dronePosition.y - coin.position.y;
    const dz = dronePosition.z - coin.position.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Much stronger magnet pull
    if (hasMagnet && distance < magnetRadius) {
      const pullStrength = 0.5;
      coin.position.x += dx * pullStrength;
      coin.position.y += dy * pullStrength;
      coin.position.z += dz * pullStrength;
    }
    
    // Larger collection radius for easier gameplay
    if (distance < (baseRadius + coin.radius * 1.5)) {
      collectedIndices.push(index);
    }
  });
  
  return collectedIndices;
};
