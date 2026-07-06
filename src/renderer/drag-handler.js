/**
 * Drag Handler with Mochi-Stretch Physics
 * Manages dragging the window and applying elastic stretch transformations.
 */
class DragHandler {
  constructor(renderer) {
    this.renderer = renderer;
    this.container = document.getElementById('pet-container');
    
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    
    // Position of window when drag started
    this.winStartX = 0;
    this.winStartY = 0;
    this.activePointerId = null;
    
    // For velocity calculation (stretch physics)
    this.lastX = 0;
    this.lastY = 0;
    this.lastTime = 0;
    this.vx = 0;
    this.vy = 0;
    
    this.setupEvents();
  }

  setupEvents() {
    this.container.addEventListener('pointerdown', (e) => {
      // Do not drag if clicking the settings gear, chat bubble trigger, or chat input panel
      if (
        e.target.closest('#settings-gear') || 
        e.target.closest('#chat-trigger') || 
        e.target.closest('#chat-input-panel')
      ) {
        return;
      }
      
      // Only drag on left click
      if (e.button !== 0) return;
      
      this.isDragging = true;
      this.activePointerId = e.pointerId;
      this.container.setPointerCapture(e.pointerId);
      
      // Record initial mouse screen position (via screen because window moves)
      this.startX = e.screenX;
      this.startY = e.screenY;
      
      // Store current window position
      this.winStartX = window.screenX;
      this.winStartY = window.screenY;
      
      this.lastX = e.screenX;
      this.lastY = e.screenY;
      this.lastTime = Date.now();
      this.vx = 0;
      this.vy = 0;
      
      // Enter grabbed state
      this.renderer.stateMachine.setState('grabbed');
      this.renderer.stateMachine.resetInactivity();
      
      // Apply baseline mochi stretch immediately on click
      this.applyMochiStretch();
      
      e.stopPropagation();
    });

    this.container.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      
      const now = Date.now();
      const dt = Math.max(1, now - this.lastTime);
      
      // Screen delta
      const dx = e.screenX - this.startX;
      const dy = e.screenY - this.startY;
      
      // Calculate instantaneous velocity
      const dMouseX = e.screenX - this.lastX;
      const dMouseY = e.screenY - this.lastY;
      this.vx = dMouseX / dt;
      this.vy = dMouseY / dt;
      
      this.lastX = e.screenX;
      this.lastY = e.screenY;
      this.lastTime = now;
      
      // Move window to match drag
      const targetX = this.winStartX + dx;
      const targetY = this.winStartY + dy;
      
      // Update window bounds in main process
      if (window.api) {
        window.api.savePosition({ x: targetX, y: targetY });
      }
      
      // Apply elastic mochi stretch
      this.applyMochiStretch();
      
      this.renderer.stateMachine.resetInactivity();
    });

    this.container.addEventListener('pointerup', (e) => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      this.activePointerId = null;
      this.container.releasePointerCapture(e.pointerId);
      
      // Check if mouse is still hovering over the container
      const rect = this.container.getBoundingClientRect();
      const isInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInside && window.api) {
        window.api.setIgnoreMouseEvents(true, true);
      }
      
      // Transition back to idle only if not in custom states that handle their own auto-restores
      const current = this.renderer.stateMachine.currentStateName;
      if (current !== 'happy' && current !== 'sad' && current !== 'error') {
        this.renderer.stateMachine.setState('idle');
      }
      this.renderer.stateMachine.resetInactivity();
    });

    // Pointercancel recovery
    this.container.addEventListener('pointercancel', (e) => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      this.activePointerId = null;
      try {
        this.container.releasePointerCapture(e.pointerId);
      } catch (err) {}
      
      const current = this.renderer.stateMachine.currentStateName;
      if (current !== 'happy' && current !== 'sad' && current !== 'error') {
        this.renderer.stateMachine.setState('idle');
      }
      this.renderer.stateMachine.resetInactivity();
    });

    // Window blur (focus loss, e.g. screenshot overlay triggered) recovery
    window.addEventListener('blur', () => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      if (this.activePointerId !== null) {
        try {
          this.container.releasePointerCapture(this.activePointerId);
        } catch (err) {}
        this.activePointerId = null;
      }
      
      const current = this.renderer.stateMachine.currentStateName;
      if (current !== 'happy' && current !== 'sad' && current !== 'error') {
        this.renderer.stateMachine.setState('idle');
      }
      this.renderer.stateMachine.resetInactivity();
    });

    // Right-click pet to trigger crying (sad) state
    this.container.addEventListener('contextmenu', (e) => {
      // Do not block settings gear, chat triggers, or input panels
      if (
        e.target.closest('#settings-gear') || 
        e.target.closest('#chat-trigger') || 
        e.target.closest('#chat-input-panel')
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      
      this.renderer.stateMachine.setState('sad');
      
      // Auto return to idle after 3 seconds
      if (this.sadTimeout) clearTimeout(this.sadTimeout);
      this.sadTimeout = setTimeout(() => {
        if (this.renderer.stateMachine.currentStateName === 'sad') {
          this.renderer.stateMachine.setState('idle');
        }
      }, 3000);
    });
  }

  onGrabbedEnter() {
    this.container.classList.add('grabbed-active');
    const svg = this.container.querySelector('svg');
    if (svg) {
      const model = this.renderer.settings.model;
      if (model === 'oyajichi' || model === 'maenggu') {
        svg.style.transformOrigin = 'center top';
      } else {
        svg.style.transformOrigin = 'center bottom';
      }
    }
  }

  onGrabbedExit() {
    this.container.classList.remove('grabbed-active');
    
    // Bouncy spring back effect
    const svg = this.container.querySelector('svg');
    if (svg) {
      svg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.35)';
      svg.style.transform = 'scale(1)';
      
      // Clear inline style after transition completes
      setTimeout(() => {
        if (this.renderer.stateMachine.currentStateName !== 'grabbed') {
          svg.style.transition = '';
          svg.style.transform = '';
          svg.style.transformOrigin = '';
        }
      }, 300);
    }
  }

  applyMochiStretch() {
    const svg = this.container.querySelector('svg');
    if (!svg) return;
    
    const stretchSpeed = Math.abs(this.vy);
    
    // Baseline stretch: stretched 1.35x even when stationary (stretchSpeed === 0)
    // Max stretch: 1.35 + 1.05 = 2.4x
    const scaleY = 1.35 + Math.min(stretchSpeed * 4.0, 1.05);
    
    // Baseline compression: compressed 0.75x width when stationary
    // Max compression: 0.75 - 0.30 = 0.45x width
    const scaleX = 0.75 - Math.min(stretchSpeed * 2.0, 0.30);
    
    // Skew based on horizontal speed (max skew angle 30 degrees)
    const skewSpeed = this.vx;
    const skewX = Math.max(-30, Math.min(skewSpeed * 80, 30));
    
    // Apply transformations
    svg.style.transform = `scale(${scaleX}, ${scaleY}) skewX(${skewX}deg)`;
  }
}
