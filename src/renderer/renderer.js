/**
 * Main Renderer Process Orchestrator
 * Integrates state machine, animator, eye tracker, drag physics, and settings.
 */
class PetRenderer {
  constructor() {
    this.settings = {
      size: 'M',
      followMode: false,
      sleepMode: false,
      geminiApiKey: ''
    };
    
    this.isAgentSessionActive = false; // Prevents sleep during AI work
    
    this.animator = null;
    this.eyeTracker = null;
    this.stateMachine = null;
    this.dragHandler = null;
    this.followMode = null;
    this.chatBubble = null;
  }

  async init() {
    // 1. Fetch settings from Electron Store
    if (window.api) {
      try {
        const savedSettings = await window.api.getSettings();
        this.settings = { ...this.settings, ...savedSettings };
        
        // Failsafe fallback for deleted or invalid models
        const validModels = ['clawd', 'oyajichi', 'blackyang', 'cheeseyang', 'raccoon', 'momongga'];
        if (!this.settings.model || !validModels.includes(this.settings.model)) {
          this.settings.model = 'blackyang';
        }
      } catch (err) {
        console.error('Failed to load settings from main process:', err);
      }
    }

    // 2. Set pet size layout
    this.updatePetSize(this.settings.size);

    // 3. Instantiate modules
    this.animator = new Animator(this);
    this.eyeTracker = new EyeTracker(this);
    this.stateMachine = new StateMachine(this);
    this.dragHandler = new DragHandler(this);
    this.followMode = new FollowMode(this);
    this.chatBubble = new ChatBubble(this);

    // 4. Initialize behavior loops
    this.stateMachine.init();
    this.followMode.init();
    
    // Set initial sleep state if configured
    if (this.settings.sleepMode) {
      this.stateMachine.setState('sleeping');
    }

      // 5. Setup global listeners for local window interactions
    this.setupLocalListeners();

    // 5b. Setup Settings Modal & Card Selection
    this.setupSettingsModal();

    // 6. Listen to main process updates (IPC)
    this.setupIPCListeners();
  }

  setupSettingsModal() {
    const gear = document.getElementById('settings-gear');
    if (!gear) return;

    // Open centered settings window
    gear.addEventListener('click', (e) => {
      if (window.api) {
        window.api.openSettings();
      }
      e.stopPropagation();
    });
  }

  updatePetSize(sizeStr) {
    const container = document.getElementById('pet-container');
    let pixels = 192;
    let bottomOffset = 80;
    if (sizeStr === 'XS') {
      pixels = 96;
      bottomOffset = 50;
    } else if (sizeStr === 'S') {
      pixels = 128;
      bottomOffset = 65;
    } else if (sizeStr === 'L') {
      pixels = 256;
      bottomOffset = 100;
    }
    
    container.style.width = `${pixels}px`;
    container.style.height = `${pixels}px`;
    container.style.bottom = `${bottomOffset}px`;
  }

  setupLocalListeners() {
    // Reset inactivity tracker when user interacts with pet window
    window.addEventListener('mousemove', () => {
      this.stateMachine.resetInactivity();
    });
    
    let clickCount = 0;
    let lastClickTime = 0;
    const petContainer = document.getElementById('pet-container');

    window.addEventListener('mousedown', (e) => {
      this.stateMachine.resetInactivity();

      // Check if click targets the pet body (excluding hover gear/chat UI buttons)
      const gear = document.getElementById('settings-gear');
      const chatTrigger = document.getElementById('chat-trigger');
      const chatInputPanel = document.getElementById('chat-input-panel');
      const isOverUI = (gear && gear.contains(e.target)) || 
                       (chatTrigger && chatTrigger.contains(e.target)) ||
                       (chatInputPanel && chatInputPanel.contains(e.target));
                       
      if (petContainer && petContainer.contains(e.target) && !isOverUI) {
        const now = Date.now();
        if (now - lastClickTime < 350) {
          clickCount++;
        } else {
          clickCount = 1;
        }
        lastClickTime = now;

        if (clickCount === 3) {
          clickCount = 0; // reset
          if (this.stateMachine) {
            this.stateMachine.setState('happy');
          }
        }
      }
    });

    window.addEventListener('keydown', () => {
      this.stateMachine.resetInactivity();
    });
  }

  setupIPCListeners() {
    if (!window.api) return;

    // Listen to global input events (Phase 4 uiohook hooks)
    window.api.onGlobalInput((data) => {
      this.stateMachine.resetInactivity();
      
      if (this.stateMachine.currentStateName === 'sleeping') {
        // Wake up on keyboard or mouse activity
        this.stateMachine.setState('idle');
      }

      if (data.type === 'typing') {
        // Only trigger typing motion if we are idle or sitting
        if (
          this.stateMachine.currentStateName === 'idle' ||
          this.stateMachine.currentStateName === 'sitting'
        ) {
          this.stateMachine.setState('typing');
        }
      }
    });

    // Listen to AI Coding Agent events (Phase 5)
    window.api.onAgentEvent((data) => {
      this.stateMachine.resetInactivity();
      
      if (data.type === 'thinking') {
        this.isAgentSessionActive = true;
        this.stateMachine.setState('thinking');
      } else if (data.type === 'writing') {
        this.isAgentSessionActive = true;
        this.stateMachine.setState('typing');
      } else if (data.type === 'success') {
        this.isAgentSessionActive = false;
        this.stateMachine.setState('happy');
      } else if (data.type === 'error') {
        this.isAgentSessionActive = false;
        this.stateMachine.setState('error');
      } else if (data.type === 'idle') {
        this.isAgentSessionActive = false;
        this.stateMachine.setState('idle');
      }
    });

    // Listen to direct commands from tray context menu (Phase 2)
    window.api.onStateCommand((cmd) => {
      if (cmd.action === 'change-size') {
        this.settings.size = cmd.value;
        this.updatePetSize(cmd.value);
        this.stateMachine.resetInactivity();
      } 
      else if (cmd.action === 'toggle-sleep') {
        this.settings.sleepMode = cmd.value;
        if (cmd.value) {
          this.stateMachine.setState('sleeping');
        } else {
          this.stateMachine.setState('idle');
        }
      } 
      else if (cmd.action === 'toggle-follow') {
        this.settings.followMode = cmd.value;
        if (!cmd.value && this.stateMachine.currentStateName === 'following') {
          this.stateMachine.setState('idle');
        }
      }
      else if (cmd.action === 'update-api-key') {
        this.settings.geminiApiKey = cmd.value;
      }
    });

    // Listen to settings updates (e.g. from settings-modal window)
    window.api.onSettingsUpdated((data) => {
      if (data.key === 'model') {
        this.settings.model = data.value;
        this.animator.setAnimation(this.stateMachine.currentStateName, true);
      } else if (data.key === 'size') {
        this.settings.size = data.value;
        this.updatePetSize(data.value);
        this.stateMachine.resetInactivity();
      } else if (data.key === 'sleepMode') {
        this.settings.sleepMode = data.value;
        if (data.value) {
          this.stateMachine.setState('sleeping');
        } else {
          this.stateMachine.setState('idle');
        }
      } else if (data.key === 'followMode') {
        this.settings.followMode = data.value;
        if (!data.value && this.stateMachine.currentStateName === 'following') {
          this.stateMachine.setState('idle');
        }
      } else if (data.key === 'geminiApiKey') {
        this.settings.geminiApiKey = data.value;
      }
    });

    // Listen to update availability from main process
    if (window.api.onUpdateAvailable) {
      window.api.onUpdateAvailable((info) => {
        // Add red dot next to settings gear
        const gear = document.getElementById('settings-gear');
        if (gear && !gear.querySelector('.red-dot')) {
          const dot = document.createElement('span');
          dot.className = 'red-dot';
          dot.style.position = 'absolute';
          dot.style.top = '-2px';
          dot.style.right = '-2px';
          dot.style.width = '6px';
          dot.style.height = '6px';
          dot.style.backgroundColor = '#ef4444';
          dot.style.borderRadius = '50%';
          gear.appendChild(dot);
        }
        
        // Alert user via chat bubble speech
        if (this.chatBubble) {
          this.chatBubble.showSystemMessage(`새로운 업데이트 버전 v${info.version}이 있습니다! 설정(⚙️)의 Updater 탭을 확인해 주세요. 🐾✨`);
        }
      });
    }
  }
}

// Start the renderer when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const renderer = new PetRenderer();
  renderer.init().then(() => {
    console.log('Pet renderer initialized successfully.');
  });

  // Proactive Garbage Collection in the renderer process to keep RAM usage minimal
  setInterval(() => {
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {}
    }
  }, 30000); // every 30 seconds
});
