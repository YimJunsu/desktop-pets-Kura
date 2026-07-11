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

    // Clear any active sprite sheet animation intervals
    if (this.spriteInterval) {
      clearInterval(this.spriteInterval);
      this.spriteInterval = null;
    }

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
      const existingDiv = this.container.querySelector('div.pet-gif');
      if (existingSvg) existingSvg.remove();
      if (existingImg) existingImg.remove();
      if (existingDiv) existingDiv.remove();
      
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
      // SVG load failed - Fallback to transparent PNG or GIF
      let framesCount = 1;
      if (fileName === 'walk' || fileName === 'run') {
        framesCount = 4;
      } else if (fileName === 'typing') {
        framesCount = 3;
      }

      const seqPath0 = `../../assets/sprites/${model}/${fileName}_0.png`;
      const pngPath = `../../assets/sprites/${model}/${fileName}.png`;
      const gifPath = `../../assets/sprites/${model}/${fileName}.gif`;
      console.log(`[Animator] SVG not found for state '${name}'. Checking for sequence or PNG...`);
      
      const checkSeqImg = new Image();
      checkSeqImg.onload = () => {
        // Frame sequence exists! Play frame sequence animation (prevents bleeding)
        this.loadSequenceAnimation(name, fileName, framesCount, model);
      };
      
      checkSeqImg.onerror = () => {
        // No sequence, try single sprite sheet or static PNG
        const tempImg = new Image();
        tempImg.onload = () => {
          this.loadSinglePngOrSpriteSheet(name, fileName, framesCount, pngPath);
        };
        tempImg.onerror = () => {
          console.log(`[Animator] PNG not found for state '${name}'. Falling back to GIF: ${gifPath}`);
          this.loadGifFallback(name, fileName, gifPath);
        };
        tempImg.src = pngPath;
      };
      
      if (framesCount > 1) {
        checkSeqImg.src = seqPath0;
      } else {
        checkSeqImg.onerror();
      }
    }
  }

  async loadSequenceAnimation(name, fileName, framesCount, model) {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const existingSvg = this.container.querySelector('svg');
      const existingImg = this.container.querySelector('img.pet-gif');
      const existingDiv = this.container.querySelector('div.pet-gif');
      if (existingSvg) existingSvg.remove();
      if (existingImg) existingImg.remove();
      if (existingDiv) existingDiv.remove();
      
      const imgEl = document.createElement('img');
      imgEl.className = 'pet-gif';
      imgEl.draggable = false;
      imgEl.style.width = '100%';
      imgEl.style.height = '100%';
      imgEl.style.objectFit = 'contain';
      imgEl.style.webkitUserDrag = 'none';
      
      let currentFrame = 0;
      imgEl.src = `../../assets/sprites/${model}/${fileName}_${currentFrame}.png`;
      this.container.appendChild(imgEl);
      
      this.spriteInterval = setInterval(() => {
        currentFrame = (currentFrame + 1) % framesCount;
        imgEl.src = `../../assets/sprites/${model}/${fileName}_${currentFrame}.png`;
      }, 150);
      
      this.applyFlip();
      this.container.style.opacity = '1';
    } catch (err) {
      console.error(`Failed to load sequence animation for ${name}:`, err);
      if (name !== 'error') this.setAnimation('error');
    }
  }

  async loadSinglePngOrSpriteSheet(name, fileName, framesCount, pngPath) {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const existingSvg = this.container.querySelector('svg');
      const existingImg = this.container.querySelector('img.pet-gif');
      const existingDiv = this.container.querySelector('div.pet-gif');
      if (existingSvg) existingSvg.remove();
      if (existingImg) existingImg.remove();
      if (existingDiv) existingDiv.remove();
      
      if (framesCount > 1) {
        // Render as a div with background-image step animation
        const divEl = document.createElement('div');
        divEl.className = 'pet-gif sprite-animated';
        divEl.style.width = '100%';
        divEl.style.height = '100%';
        divEl.style.backgroundImage = `url('${pngPath}')`;
        divEl.style.backgroundRepeat = 'no-repeat';
        divEl.style.backgroundSize = `${framesCount * 100}% 100%`;
        divEl.style.backgroundPosition = '0% 0%';
        
        let currentFrame = 0;
        this.spriteInterval = setInterval(() => {
          currentFrame = (currentFrame + 1) % framesCount;
          const percentage = framesCount > 1 ? (currentFrame / (framesCount - 1)) * 100 : 0;
          divEl.style.backgroundPosition = `${percentage}% 0%`;
        }, 150);
        
        this.container.appendChild(divEl);
      } else {
        const imgEl = document.createElement('img');
        imgEl.className = 'pet-gif';
        imgEl.draggable = false;
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'contain';
        imgEl.style.webkitUserDrag = 'none';
        imgEl.src = pngPath;
        this.container.appendChild(imgEl);
      }
      
      this.applyFlip();
      this.container.style.opacity = '1';
    } catch (loadErr) {
      console.error(`Failed to build PNG element for ${name}:`, loadErr);
      if (name !== 'error') this.setAnimation('error');
    }
  }

  async loadGifFallback(name, fileName, gifPath) {
    try {
      // Clear existing renders
      const existingSvg = this.container.querySelector('svg');
      const existingImg = this.container.querySelector('img.pet-gif');
      const existingDiv = this.container.querySelector('div.pet-gif');
      if (existingSvg) existingSvg.remove();
      if (existingImg) existingImg.remove();
      if (existingDiv) existingDiv.remove();
      
      const imgEl = document.createElement('img');
      imgEl.src = gifPath;
      imgEl.className = 'pet-gif';
      imgEl.draggable = false;
      imgEl.style.width = '100%';
      imgEl.style.height = '100%';
      imgEl.style.objectFit = 'contain';
      imgEl.style.webkitUserDrag = 'none';
      this.container.appendChild(imgEl);
      
      this.applyFlip();
      this.container.style.opacity = '1';
    } catch (gifErr) {
      console.error(`Failed to load GIF fallback for ${name}:`, gifErr);
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
    const div = this.container.querySelector('div.pet-gif');
    const target = svg || img || div;
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
