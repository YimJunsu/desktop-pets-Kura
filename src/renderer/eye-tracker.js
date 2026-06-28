/**
 * Eye Tracker
 * Calculates cursor direction and moves the pet's eyes dynamically.
 */
class EyeTracker {
  constructor(renderer) {
    this.renderer = renderer;
    this.container = document.getElementById('pet-container');
    this.leftEye = null;
    this.rightEye = null;
    this.isActive = false;
    this.unsubscribe = null;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    
    // Query eye elements
    this.onSVGLoaded();
    
    // Subscribe to IPC cursor movements from main process
    if (window.api) {
      this.unsubscribe = window.api.onCursorMove((point) => {
        this.trackCursor(point);
      });
    }
  }

  stop() {
    this.isActive = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.resetEyes();
  }

  onSVGLoaded() {
    if (!this.isActive) return;
    this.leftEye = document.getElementById('left-eye');
    this.rightEye = document.getElementById('right-eye');
  }

  trackCursor(point) {
    if (!this.leftEye || !this.rightEye) return;

    // Convert screen coordinates to window-local coordinates
    const localX = point.x - window.screenX;
    const localY = point.y - window.screenY;

    // Get center of pet container
    const rect = this.container.getBoundingClientRect();
    const petCenterX = rect.left + rect.width / 2;
    const petCenterY = rect.top + rect.height / 2;

    // Vector to cursor
    const dx = localX - petCenterX;
    const dy = localY - petCenterY;
    const distance = Math.hypot(dx, dy);

    if (distance > 10) {
      const angle = Math.atan2(dy, dx);
      
      // Determine max displacement in SVG user units (socket boundaries)
      // Max horizontal shift: ~0.5 units
      // Max vertical shift: ~0.4 units
      const maxOffset = 0.5;
      
      // Scale displacement based on distance (clamp at maxOffset)
      const scale = Math.min(distance / 120, maxOffset);
      
      let targetX = Math.cos(angle) * scale;
      let targetY = Math.sin(angle) * scale * 0.8; // slightly less vertical range

      // If the pet is horizontally flipped (looking left), invert X translation
      if (this.container.querySelector('svg')?.classList.contains('flipped')) {
        targetX = -targetX;
      }

      // Apply transformations as SVG attributes for crisp rendering
      this.leftEye.setAttribute('transform', `translate(${targetX.toFixed(2)}, ${targetY.toFixed(2)})`);
      this.rightEye.setAttribute('transform', `translate(${targetX.toFixed(2)}, ${targetY.toFixed(2)})`);

      // Tilt head/body minutely based on direction (bonus feedback)
      const svg = this.container.querySelector('svg');
      if (svg) {
        // Subtle tilt: max 2 degrees
        const tilt = Math.cos(angle) * 2;
        svg.style.transform = `rotate(${tilt.toFixed(1)}deg)`;
      }
    } else {
      this.resetEyes();
    }
  }

  resetEyes() {
    if (this.leftEye) this.leftEye.removeAttribute('transform');
    if (this.rightEye) this.rightEye.removeAttribute('transform');
    const svg = this.container.querySelector('svg');
    if (svg) svg.style.transform = 'none';
  }
}
