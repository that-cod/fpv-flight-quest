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
  inertia: number; // New property for smoother movements
  stabilization: number; // New property for auto-stabilization
  tilt: number; // New property to track tilt amount for visual feedback
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
    inertia: 0.85, // Inertia factor (0-1) where higher means more momentum is preserved
    stabilization: 0.03, // Auto-stabilization strength (0-1)
    tilt: 0, // Current tilt amount for visual feedback
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
    steeringLock,
    inertia,
    stabilization
  } = physics;

  // Increased speed boost for more exciting gameplay
  const actualMaxSpeed = powerUps.speedBoost ? maxSpeed * 2.2 : maxSpeed;
  const thrustMultiplier = powerUps.speedBoost ? 1.5 : 1.0;

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
    const baseStrength = isQESteer ? 2.4 : 1.4;
    
    // Apply steering with smoother response
    effectiveYaw = newSteeringLock * baseStrength;
    
    // Add slight banking effect to make turns more realistic
    rotation.z = newSteeringLock * 0.18;
  }

  // Enhanced rotation calculations for more realistic flight
  const rotationSpeed = 3.8 * deltaTime;
  const yawMultiplier = Math.abs(effectiveYaw) > 2.0 ? 2.4 : 1.4; // Enhanced turning feel
  
  // Calculate new rotation with inertia for smoother response
  const pitchChange = controls.pitch * rotationSpeed * 1.9;
  const yawChange = effectiveYaw * rotationSpeed * yawMultiplier;
  const rollChange = controls.roll * rotationSpeed * 1.6;
  
  const newRotation = {
    x: rotation.x + pitchChange,
    y: rotation.y + yawChange,
    z: rotation.z + rollChange
  };

  // Auto-stabilization - gradually return to level flight when not providing input
  // This creates a more realistic feel where the drone wants to self-stabilize
  if (Math.abs(controls.pitch) < 0.1) {
    newRotation.x = rotation.x * (1 - stabilization);
  }
  
  // Only apply yaw damping if not locked
  if (newSteeringLock === 0 && Math.abs(controls.yaw) < 0.1) {
    newRotation.y = rotation.y * (1 - stabilization * 0.5); // Reduced stabilization for yaw
  }
  
  // Only apply roll damping if not in a turn
  if (Math.abs(newSteeringLock) < 0.1 && Math.abs(controls.roll) < 0.1) {
    newRotation.z = rotation.z * (1 - stabilization);
  }

  // Improved movement physics for more realistic flight
  // Calculate thrust force with improved physics
  const throttleResponse = Math.pow(Math.max(0, controls.throttle), 1.2); // Non-linear throttle response
  const throttleForce = throttleResponse * maxAcceleration * 1.3 * thrustMultiplier;
  
  // Forward force calculation with improved pitch response
  // Exponential pitch effect gives more precise control at low angles
  const pitchEffect = -Math.sin(newRotation.x) * (1 + Math.abs(Math.sin(newRotation.x)) * 0.3);
  const forwardForce = pitchEffect * maxAcceleration * 1.8;
  
  // Updated direction vectors with improved steering response
  const forwardX = Math.sin(newRotation.y) * forwardForce;
  const forwardZ = Math.cos(newRotation.y) * forwardForce;
  
  // Enhanced vertical control with non-linear response for better precision
  const directVerticalControl = Math.pow(controls.throttle, 1.15) * maxAcceleration * 2.0;
  
  // Improved banking physics with better turning
  // Add roll-induced movement for more realistic turning
  let horizontalForce = Math.sin(newRotation.z) * maxAcceleration * 1.1;
  
  // Add a progressive horizontal force in the direction of the turn
  if (newSteeringLock !== 0) {
    // More responsive turning that increases with forward speed
    const speedFactor = Math.min(1.0, Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) / 20);
    const turnAssist = newSteeringLock * 2.8 * Math.abs(forwardForce) * 0.13 * (1 + speedFactor);
    horizontalForce += turnAssist;
  }
  
  // Apply air resistance that increases with speed (quadratic drag)
  const speedSquared = 
    velocity.x * velocity.x + 
    velocity.y * velocity.y + 
    velocity.z * velocity.z;
  const quadraticDrag = drag * 0.02 * speedSquared;
  const dragFactor = Math.max(0, 1 - (drag * deltaTime) - (quadraticDrag * deltaTime));
  
  // Calculate forces with inertia for smoother transitions
  const forces = {
    x: forwardX + horizontalForce,
    y: directVerticalControl - gravity,
    z: forwardZ
  };

  // Calculate acceleration with improved physics
  const newAcceleration = {
    x: forces.x / mass,
    y: forces.y / mass,
    z: forces.z / mass
  };

  // Apply inertia - blend current and new accelerations for smoother feel
  const blendedAcceleration = {
    x: acceleration.x * inertia + newAcceleration.x * (1 - inertia),
    y: acceleration.y * inertia + newAcceleration.y * (1 - inertia),
    z: acceleration.z * inertia + newAcceleration.z * (1 - inertia)
  };

  // Calculate new velocity with improved physics
  const newVelocity = {
    x: (velocity.x + blendedAcceleration.x * deltaTime) * dragFactor,
    y: (velocity.y + blendedAcceleration.y * deltaTime) * dragFactor,
    z: (velocity.z + blendedAcceleration.z * deltaTime) * dragFactor
  };

  // Apply speed limits with improved physics
  const speed = Math.sqrt(
    newVelocity.x * newVelocity.x +
    newVelocity.y * newVelocity.y +
    newVelocity.z * newVelocity.z
  );

  // Progressive speed limiting - more natural than hard cap
  if (speed > actualMaxSpeed * 0.8) {
    const overSpeedFactor = Math.min(1.0, (actualMaxSpeed / speed));
    const limitFactor = 0.95 + 0.05 * overSpeedFactor;
    
    newVelocity.x *= limitFactor;
    newVelocity.y *= limitFactor;
    newVelocity.z *= limitFactor;
  }

  // Calculate new position
  const newPosition = {
    x: position.x + newVelocity.x * deltaTime,
    y: position.y + newVelocity.y * deltaTime,
    z: position.z + newVelocity.z * deltaTime
  };

  // Enhanced ground collision with bounce effect
  const minHeight = 2.5; // Minimum height
  if (newPosition.y < minHeight) {
    newPosition.y = minHeight;
    
    // Bounce effect proportional to impact velocity
    const impactForce = Math.abs(newVelocity.y);
    const bounceCoefficient = 0.4; // 0.4 = 40% energy preserved in bounce
    
    // Only bounce if coming down with enough force
    if (newVelocity.y < -2) {
      newVelocity.y = impactForce * bounceCoefficient;
    } else {
      newVelocity.y = 0;
    }
    
    // Ground friction - slow down horizontal movement on impact
    newVelocity.x *= 0.9;
    newVelocity.z *= 0.9;
  }

  // Expanded world boundaries with smoother boundary handling
  const worldBoundary = 500;
  const boundaryForce = 0.05; // Strength of push-back force
  
  // X-axis boundary
  if (Math.abs(newPosition.x) > worldBoundary * 0.95) {
    const overFactor = (Math.abs(newPosition.x) - worldBoundary * 0.95) / (worldBoundary * 0.05);
    const boundaryResponse = overFactor * boundaryForce * -Math.sign(newPosition.x);
    newVelocity.x += boundaryResponse * 100 * deltaTime;
    
    // Hard limit at the absolute boundary
    if (Math.abs(newPosition.x) > worldBoundary) {
      newPosition.x = Math.sign(newPosition.x) * worldBoundary;
      newVelocity.x *= -0.3;
    }
  }
  
  // Z-axis boundary
  if (Math.abs(newPosition.z) > worldBoundary * 0.95) {
    const overFactor = (Math.abs(newPosition.z) - worldBoundary * 0.95) / (worldBoundary * 0.05);
    const boundaryResponse = overFactor * boundaryForce * -Math.sign(newPosition.z);
    newVelocity.z += boundaryResponse * 100 * deltaTime;
    
    // Hard limit at the absolute boundary
    if (Math.abs(newPosition.z) > worldBoundary) {
      newPosition.z = Math.sign(newPosition.z) * worldBoundary;
      newVelocity.z *= -0.3;
    }
  }

  // Altitude ceiling with progressive resistance
  const maxAltitude = 150;
  const ceilingApproach = Math.max(0, (newPosition.y - maxAltitude * 0.85) / (maxAltitude * 0.15));
  
  if (ceilingApproach > 0) {
    // Apply increasing downward force as you approach the ceiling
    newVelocity.y -= ceilingApproach * 9.8 * deltaTime * 2;
    
    // Hard limit at the absolute ceiling
    if (newPosition.y > maxAltitude) {
      newPosition.y = maxAltitude;
      newVelocity.y = Math.min(0, newVelocity.y);
    }
  }

  // Calculate current tilt for visual feedback
  const tiltAmount = Math.sqrt(
    newRotation.x * newRotation.x + 
    newRotation.z * newRotation.z
  ) * Math.sign(newRotation.z || 0.01);

  return {
    ...physics,
    position: newPosition,
    rotation: newRotation,
    velocity: newVelocity,
    acceleration: blendedAcceleration,
    steeringLock: newSteeringLock,
    inertia,
    stabilization,
    tilt: tiltAmount
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
