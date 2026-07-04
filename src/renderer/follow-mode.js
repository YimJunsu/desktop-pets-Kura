/**
 * Follow Mode and Wandering Behavior
 * Handles moving the window towards the mouse cursor or wandering around the screen.
 */
class FollowMode {
  constructor(renderer) {
    this.renderer = renderer;
    this.container = document.getElementById('pet-container');
    
    this.cursorX = 0;
    this.cursorY = 0;
    
    this.isMoving = false;
    this.mode = null; // 'follow' or 'wander'
    this.targetX = 0;
    this.targetY = 0;
    
    this.animationFrameId = null;
    this.unsubscribe = null;
    
    // Movement constraints
    this.minFollowDistance = 150; // px
    this.baseSpeed = 2; // px/frame
    this.maxSpeed = 5; // px/frame
  }

  init() {
    // Listen to cursor updates
    if (window.api) {
      this.unsubscribe = window.api.onCursorMove((point) => {
        this.cursorX = point.x;
        this.cursorY = point.y;
        
        // If follow mode is enabled and pet is not grabbed, trigger follow behavior
        const isFollow = this.renderer.settings.followMode === true || this.renderer.settings.followMode === 'true';
        if (
          isFollow && 
          this.renderer.stateMachine.currentStateName !== 'grabbed' &&
          this.renderer.stateMachine.currentStateName !== 'sleeping'
        ) {
          this.checkFollowRequirement();
        }
      });
    }
  }

  checkFollowRequirement() {
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const petCenterX = window.screenX + winWidth / 2;
    const petCenterY = window.screenY + winHeight / 2;
    
    const dx = this.cursorX - petCenterX;
    const dy = this.cursorY - petCenterY;
    const distance = Math.hypot(dx, dy);
    
    if (distance > this.minFollowDistance && this.renderer.stateMachine.currentStateName !== 'following') {
      this.renderer.stateMachine.setState('following');
    }
  }

  startFollowing() {
    if (this.isMoving) this.stopMovementLoop();
    
    this.isMoving = true;
    this.mode = 'follow';
    this.movementLoop();
  }

  startWandering() {
    if (this.isMoving) this.stopMovementLoop();
    
    // Choose a random horizontal coordinate nearby within screen bounds
    const availLeft = window.screen.availLeft || 0;
    const availWidth = window.screen.availWidth;
    const currentX = window.screenX;
    
    // Move left or right by 100 to 200 pixels
    const dir = Math.random() < 0.5 ? -1 : 1;
    const dist = 100 + Math.random() * 150;
    let targetX = currentX + dir * dist;
    
    // Clamp to screen boundaries (with padding) of the current display
    const padding = 100;
    const minX = availLeft + padding;
    const maxX = availLeft + availWidth - padding - window.innerWidth;
    targetX = Math.max(minX, Math.min(targetX, maxX));
    
    this.targetX = targetX;
    this.targetY = window.screenY; // Keep same vertical position (floor walk)
    
    this.isMoving = true;
    this.mode = 'wander';
    this.movementLoop();
  }

  stop() {
    this.stopMovementLoop();
  }

  stopMovementLoop() {
    this.isMoving = false;
    this.mode = null;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  movementLoop() {
    if (!this.isMoving) return;
    
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const petCenterX = window.screenX + winWidth / 2;
    const petCenterY = window.screenY + winHeight / 2;
    
    let tx = this.targetX;
    let ty = this.targetY;
    
    if (this.mode === 'follow') {
      // In follow mode, walk towards the cursor (offset to place the pet near the cursor)
      // Standard target is the cursor, but keep it a bit offset so the pet doesn't overlap cursor completely
      tx = this.cursorX - (this.cursorX > petCenterX ? 60 : -60);
      ty = this.cursorY - 40; // slightly above
    }
    
    const dx = tx - petCenterX;
    const dy = ty - petCenterY;
    const distance = Math.hypot(dx, dy);
    
    // Face the direction of travel
    if (dx < -5) {
      this.renderer.animator.setDirection(true); // look left
    } else if (dx > 5) {
      this.renderer.animator.setDirection(false); // look right
    }
    
    // Check if arrived
    const arrivalThreshold = this.mode === 'follow' ? 80 : 5;
    if (distance <= arrivalThreshold) {
      this.stopMovementLoop();
      this.renderer.stateMachine.setState('idle');
      return;
    }
    
    // Calculate speed based on distance (accelerate if cursor is far)
    let speed = this.baseSpeed;
    if (distance > 300) {
      speed = Math.min(this.baseSpeed + (distance - 300) / 100, this.maxSpeed);
    }
    
    // Calculate step
    const angle = Math.atan2(dy, dx);
    const stepX = Math.cos(angle) * speed;
    const stepY = Math.sin(angle) * speed;
    
    const newX = window.screenX + stepX;
    const newY = window.screenY + stepY;
    
    // Apply new position via IPC
    if (window.api) {
      window.api.savePosition({ x: Math.round(newX), y: Math.round(newY) });
    }
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame(() => this.movementLoop());
  }

  destroy() {
    this.stop();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
