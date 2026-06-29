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
    
    try {
      // 1. Fade out (50ms)
      this.container.style.transition = 'opacity 0.05s ease';
      this.container.style.opacity = '0';
      
      // Load/Fetch SVG
      const svgText = await this.loadSVG(path);
      
      // Wait for fade out to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 2. Inject SVG content, preserving other elements like settings gear
      const existingSvg = this.container.querySelector('svg');
      if (existingSvg) {
        existingSvg.remove();
      }
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
      console.error(`Failed to load animation: ${name}`, err);
      // Fallback to error state if not already there
      if (name !== 'error') {
        this.setAnimation('error');
      }
    }
  }

  async loadSVG(path) {
    if (this.svgCache[path]) {
      return this.svgCache[path];
    }
    
    if (window.api && typeof window.api.loadSVG === 'function') {
      const text = await window.api.loadSVG(path);
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
    if (svg) {
      if (this.isFlipped) {
        svg.classList.add('flipped');
      } else {
        svg.classList.remove('flipped');
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
