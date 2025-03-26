
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
  steeringLock: number;
}

export const createDronePhysics = (): DronePhysics => {
  return {
    position: { x: 0, y: 30, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    mass: 1,
    drag: 0.2,
    maxSpeed: 60,
    maxAcceleration: 15,
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

  // Handle steering lock with improved locking mechanism
  let effectiveYaw = controls.yaw;
  
  // Update steering lock if provided in controls
  let newSteeringLock = steeringLock;
  if (controls.steeringLock !== undefined) {
    newSteeringLock = controls.steeringLock;
  }
  
  // Apply improved steering lock effect with smoother response
  if (newSteeringLock !== 0) {
    // Base strength on the absolute yaw to detect if it's from Q/E or arrow keys
    const isQESteer = Math.abs(controls.yaw) > 2.0;
    
    // Apply a constant steering effect with smooth transition
    // Adjust strength based on the input source (Q/E vs arrows)
    const baseStrength = isQESteer ? 2.2 : 1.2;
    
    // Apply steering with smoother response
    effectiveYaw = newSteeringLock * baseStrength;
    
    // Add slight banking effect to make turns more realistic
    rotation.z = newSteeringLock * 0.15;
  }

  // Enhanced rotation calculations for more realistic flight
  const rotationSpeed = 3.5 * deltaTime;
  const yawMultiplier = Math.abs(effectiveYaw) > 2.0 ? 2.2 : 1.2; // Smoother turning for Q/E
  
  const newRotation = {
    x: rotation.x + controls.pitch * rotationSpeed * 1.8,
    y: rotation.y + effectiveYaw * rotationSpeed * yawMultiplier,
    z: rotation.z + controls.roll * rotationSpeed * 1.5
  };

  // Improved damping for smoother steering - but we don't reduce yaw when lock is active
  newRotation.x *= 0.92; // Slightly improved damping
  if (newSteeringLock === 0) {
    // Only apply yaw damping if not locked
    newRotation.y *= 0.95; // Smoother damping for yaw
  }
  // Only apply roll damping if not in a turn
  if (Math.abs(newSteeringLock) < 0.1) {
    newRotation.z *= 0.92;
  }

  // Improved movement physics for more realistic flight
  // Enhanced vertical control for mobile - more responsive 
  const throttleForce = Math.max(0, controls.throttle) * maxAcceleration * 1.2;
  
  // Forward force calculation for improved control
  const forwardForce = -Math.sin(newRotation.x) * maxAcceleration * 1.6;
  
  // Updated direction vectors with improved steering response
  const forwardX = Math.sin(newRotation.y) * forwardForce;
  const forwardZ = Math.cos(newRotation.y) * forwardForce;
  
  // Enhanced vertical control with smoother response
  // Make vertical movement more responsive
  const directVerticalControl = controls.throttle * maxAcceleration * 1.8;
  
  // Improved banking physics with better turning
  let horizontalForce = Math.sin(newRotation.z) * maxAcceleration * 0.9;
  
  // Add a slight horizontal force in the direction of the turn for more responsive steering
  if (newSteeringLock !== 0) {
    const turnAssist = newSteeringLock * 2.0 * Math.abs(forwardForce) * 0.1;
    horizontalForce += turnAssist;
  }
  
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

  // Apply speed limits with improved physics
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
    const minDistance = droneRadius + obstacle.radius * 0.85; // Reduced from 0.9 for more forgiving collisions
    
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
  const baseRadius = droneRadius * 2.0; // Increased from 1.5 for better mobile experience
  const magnetRadius = hasMagnet ? baseRadius * 12 : baseRadius;
  
  coins.forEach((coin, index) => {
    if (coin.collected) return;
    
    const dx = dronePosition.x - coin.position.x;
    const dy = dronePosition.y - coin.position.y;
    const dz = dronePosition.z - coin.position.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Much stronger magnet pull
    if (hasMagnet && distance < magnetRadius) {
      const pullStrength = 0.6; // Increased from 0.5 for better mobile experience
      coin.position.x += dx * pullStrength;
      coin.position.y += dy * pullStrength;
      coin.position.z += dz * pullStrength;
    }
    
    // Larger collection radius for easier gameplay
    if (distance < (baseRadius + coin.radius * 1.7)) { // Increased from 1.5 for better mobile experience
      collectedIndices.push(index);
    }
  });
  
  return collectedIndices;
};
