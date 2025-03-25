
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
    drag: 0.1,
    maxSpeed: 20,
    maxAcceleration: 5,
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

  const actualMaxSpeed = powerUps.speedBoost ? maxSpeed * 1.5 : maxSpeed;

  // Calculate forces based on controls
  const forces = {
    // Forward/backward force (pitch)
    x: Math.sin(rotation.y) * controls.throttle * maxAcceleration,
    // Up/down force (throttle minus gravity)
    y: controls.throttle * maxAcceleration - gravity,
    // Left/right force (roll)
    z: Math.cos(rotation.y) * controls.throttle * maxAcceleration
  };

  // Update rotation based on controls
  const newRotation = {
    // Pitch (forward/backward tilt)
    x: rotation.x + controls.pitch * deltaTime,
    // Yaw (turning left/right)
    y: rotation.y + controls.yaw * deltaTime,
    // Roll (banking left/right)
    z: rotation.z + controls.roll * deltaTime
  };

  // Calculate new acceleration
  const newAcceleration = {
    x: forces.x / mass,
    y: forces.y / mass,
    z: forces.z / mass
  };

  // Calculate new velocity with drag
  const newVelocity = {
    x: velocity.x + newAcceleration.x * deltaTime,
    y: velocity.y + newAcceleration.y * deltaTime,
    z: velocity.z + newAcceleration.z * deltaTime
  };

  // Apply drag
  newVelocity.x *= (1 - drag * deltaTime);
  newVelocity.y *= (1 - drag * deltaTime);
  newVelocity.z *= (1 - drag * deltaTime);

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
    newVelocity.y = 0;
  }

  return {
    ...physics,
    position: newPosition,
    rotation: newRotation,
    velocity: newVelocity,
    acceleration: newAcceleration
  };
};

// Collision detection (simplified for this version)
export const checkCollision = (
  dronePosition: { x: number; y: number; z: number },
  droneRadius: number,
  obstacles: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
  }>
): boolean => {
  for (const obstacle of obstacles) {
    const distance = Math.sqrt(
      Math.pow(dronePosition.x - obstacle.position.x, 2) +
      Math.pow(dronePosition.y - obstacle.position.y, 2) +
      Math.pow(dronePosition.z - obstacle.position.z, 2)
    );
    
    if (distance < (droneRadius + obstacle.radius)) {
      return true; // Collision detected
    }
  }
  
  return false; // No collision
};

// Check if drone collects coin
export const checkCoinCollection = (
  dronePosition: { x: number; y: number; z: number },
  droneRadius: number,
  coins: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
    collected: boolean;
  }>
): number[] => {
  const collectedIndices: number[] = [];
  
  coins.forEach((coin, index) => {
    if (coin.collected) return;
    
    const distance = Math.sqrt(
      Math.pow(dronePosition.x - coin.position.x, 2) +
      Math.pow(dronePosition.y - coin.position.y, 2) +
      Math.pow(dronePosition.z - coin.position.z, 2)
    );
    
    if (distance < (droneRadius + coin.radius)) {
      collectedIndices.push(index);
    }
  });
  
  return collectedIndices;
};
