/**
 * Animation and Sprite Manager
 * Handles SVG loading, caching, swapping, and fade transitions.
 */
class Animator {
  constructor(renderer) {
    this.renderer = renderer;
    this.container = document.getElementById('pet-container');
    this.svgCache = {};
    
    // Direction: false = right, true = left (mirrored)
    this.isFlipped = false;
    this.currentAnimation = null;
    
    // Bind mouseenter and mouseleave to container for click-through toggling
    this.setupClickThrough();
  }

  async setAnimation(name, force = false) {
    if (this.currentAnimation === name && !force) return;
    this.currentAnimation = name;

    // Map state machine state names to actual SVG filenames
    let fileName = name;
    if (name === 'walking' || name === 'following') fileName = 'walk';
    else if (name === 'sitting') fileName = 'sit';
    else if (name === 'sleeping') fileName = 'sleep';
    else if (name === 'grabbed') fileName = 'drag';

    const model = this.renderer.settings.model || 'clawd';
    const path = `../../assets/sprites/${model}/${fileName}.svg`;
    
    // 1. Fade out (50ms)
    this.container.style.transition = 'opacity 0.05s ease';
    this.container.style.opacity = '0';

    try {
      // Try to load as SVG first
      const svgText = await this.loadSVG(path);
      
      // Wait for fade out to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Clear existing renders
      const existingSvg = this.container.querySelector('svg');
      const existingImg = this.container.querySelector('img.pet-gif');
      if (existingSvg) existingSvg.remove();
      if (existingImg) existingImg.remove();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const newSvg = doc.querySelector('svg');
      if (newSvg) {
        this.container.appendChild(newSvg);
      }
      
      // Re-apply flip direction
      this.applyFlip();
      
      // 3. Fade in (50ms)
      this.container.style.opacity = '1';
      
      // Notify eye tracker to re-initialize eye nodes
      if (this.renderer.eyeTracker) {
        this.renderer.eyeTracker.onSVGLoaded();
      }
    } catch (err) {
      // SVG load failed - Fallback to transparent GIF
      const gifPath = `../../assets/sprites/${model}/${fileName}.gif`;
      console.log(`[Animator] SVG not found for state '${name}'. Falling back to GIF: ${gifPath}`);
      
      try {
        // Wait for fade out to complete
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Clear existing renders
        const existingSvg = this.container.querySelector('svg');
        const existingImg = this.container.querySelector('img.pet-gif');
        if (existingSvg) existingSvg.remove();
        if (existingImg) existingImg.remove();
        
        // Inject <img> element pointing to transparent GIF
        const imgEl = document.createElement('img');
        imgEl.src = gifPath;
        imgEl.className = 'pet-gif';
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'contain';
        this.container.appendChild(imgEl);
        
        // Re-apply flip direction
        this.applyFlip();
        
        // Fade in
        this.container.style.opacity = '1';
      } catch (gifErr) {
        console.error(`Failed to load GIF fallback for ${name}:`, gifErr);
        
        // Final fallback: Load default 'blackyang' error.svg to prevent blank screen
        if (name !== 'error') {
          console.log('[Animator] Triggering ultimate error fallback state...');
          this.setAnimation('error');
        } else {
          // If even error fallback fails, load blackyang/error.svg
          const ultimateFallbackPath = `../../assets/sprites/blackyang/error.svg`;
          try {
            const ultimateSvgText = await this.loadSVG(ultimateFallbackPath);
            const existingSvg = this.container.querySelector('svg');
            const existingImg = this.container.querySelector('img.pet-gif');
            if (existingSvg) existingSvg.remove();
            if (existingImg) existingImg.remove();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(ultimateSvgText, 'image/svg+xml');
            const newSvg = doc.querySelector('svg');
            if (newSvg) this.container.appendChild(newSvg);
            this.applyFlip();
            this.container.style.opacity = '1';
          } catch (e) {
            console.error('Ultimate fallback failure:', e);
          }
        }
      }
    }
  }

  async loadSVG(path) {
    if (this.svgCache[path]) {
      return this.svgCache[path];
    }
    
    if (window.api && typeof window.api.loadSVG === 'function') {
      const text = await window.api.loadSVG(path);
      if (!text) throw new Error('SVG not found on disk');
      this.svgCache[path] = text;
      return text;
    } else {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      this.svgCache[path] = text;
      return text;
    }
  }

  setDirection(lookLeft) {
    if (this.isFlipped === lookLeft) return;
    this.isFlipped = lookLeft;
    this.applyFlip();
  }

  applyFlip() {
    const svg = this.container.querySelector('svg');
    const img = this.container.querySelector('img.pet-gif');
    const target = svg || img;
    if (target) {
      if (this.isFlipped) {
        target.classList.add('flipped');
        target.style.transform = 'scaleX(-1)';
      } else {
        target.classList.remove('flipped');
        target.style.transform = 'scaleX(1)';
      }
    }
  }

  setupClickThrough() {
    if (!window.api) return;

    const gear = document.getElementById('settings-gear');
    const chatTrigger = document.getElementById('chat-trigger');
    const chatContainer = document.getElementById('chat-container');

    window.api.onCursorMove((point) => {
      // 드래그 진행 중일 때는 마우스 이벤트를 뺏지 않음
      if (this.renderer.dragHandler && this.renderer.dragHandler.isDragging) {
        return;
      }

      const isOverPet = this.isCursorOverElement(point, this.container);
      const isOverGear = gear ? this.isCursorOverElement(point, gear) : false;
      const isOverChatTrigger = chatTrigger ? this.isCursorOverElement(point, chatTrigger) : false;

      // 만약 채팅창이 보이고 마우스가 채팅창 위에 있다면
      const isChatVisible = chatContainer && chatContainer.classList.contains('visible');
      const isOverChatContainer = (isChatVisible && chatContainer) ? this.isCursorOverElement(point, chatContainer) : false;

      if (isOverPet || isOverGear || isOverChatTrigger || isOverChatContainer) {
        this.container.classList.add('hovered');
        window.api.setIgnoreMouseEvents(false);
      } else {
        this.container.classList.remove('hovered');
        window.api.setIgnoreMouseEvents(true, true);
      }
    });
  }

  isCursorOverElement(point, element) {
    const rect = element.getBoundingClientRect();
    const screenX = window.screenX + rect.left;
    const screenY = window.screenY + rect.top;
    return (
      point.x >= screenX &&
      point.x <= screenX + rect.width &&
      point.y >= screenY &&
      point.y <= screenY + rect.height
    );
  }
}
