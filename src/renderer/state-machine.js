/**
 * Finite State Machine for the Desktop Pet
 * Manages behavior transitions, enter/exit events, and activity tracking.
 */
class StateMachine {
  constructor(renderer) {
    this.renderer = renderer;
    this.states = {
      idle: new IdleState(this),
      walking: new WalkingState(this),
      sitting: new SittingState(this),
      sleeping: new SleepingState(this),
      typing: new TypingState(this),
      thinking: new ThinkingState(this),
      happy: new HappyState(this),
      sad: new SadState(this),
      error: new ErrorState(this),
      grabbed: new GrabbedState(this),
      following: new FollowingState(this)
    };
    
    this.currentStateName = null;
    this.currentState = null;
    
    // Inactivity timers for auto-sleep
    this.lastActivityTime = Date.now();
    this.inactivityTimeout = 60000; // 60 seconds
    this.checkInactivityInterval = null;
  }

  init() {
    this.setState('idle');
    this.startInactivityTracker();
    
    // Bind global input event listener to capture global keyboard events
    if (window.api && window.api.onGlobalInput) {
      window.api.onGlobalInput((data) => {
        if (data.type === 'typing') {
          if (
            this.currentStateName === 'grabbed' ||
            this.currentStateName === 'sleeping' ||
            this.renderer.isAgentSessionActive
          ) {
            return;
          }
          
          this.resetInactivity();
          
          if (this.currentStateName !== 'typing') {
            this.setState('typing');
          } else {
            // Reset typing timeout if already typing to continue the animation loop
            const typingStateInstance = this.states.typing;
            if (typingStateInstance && typingStateInstance.timeout) {
              clearTimeout(typingStateInstance.timeout);
              typingStateInstance.enter();
            }
          }
        } else if (data.type === 'mousemove') {
          this.resetInactivity();
        }
      });
    }
  }

  setState(stateName) {
    if (!this.states[stateName]) {
      console.error(`Invalid state transition to: ${stateName}`);
      return;
    }
    
    // Prevent transition if already in that state
    if (this.currentStateName === stateName) return;



    if (this.currentState) {
      this.currentState.exit();
    }

    this.currentStateName = stateName;
    this.currentState = this.states[stateName];
    
    // Set sprite animation in renderer
    this.renderer.animator.setAnimation(stateName);
    
    this.currentState.enter();

    // Dynamically throttle cursor polling interval on the main process to save memory/CPU
    if (window.api && window.api.updatePollingRate) {
      if (stateName === 'sleeping') {
        window.api.updatePollingRate('low');
      } else if (stateName === 'idle') {
        window.api.updatePollingRate('idle');
      } else {
        window.api.updatePollingRate('high');
      }
    }
  }

  resetInactivity() {
    this.lastActivityTime = Date.now();
    // Wake up if sleeping and user interacts
    if (this.currentStateName === 'sleeping') {
      this.setState('idle');
    }
  }

  startInactivityTracker() {
    this.checkInactivityInterval = setInterval(() => {
      // Do not auto-sleep if grabbed, following, typing, thinking, or in active agent session
      if (
        this.currentStateName === 'sleeping' ||
        this.currentStateName === 'grabbed' ||
        this.currentStateName === 'following' ||
        this.currentStateName === 'typing' ||
        this.currentStateName === 'thinking' ||
        this.renderer.isAgentSessionActive
      ) {
        return;
      }

      const elapsed = Date.now() - this.lastActivityTime;
      if (elapsed >= this.inactivityTimeout) {
        this.setState('sleeping');
      }
    }, 5000);
  }

  destroy() {
    if (this.checkInactivityInterval) {
      clearInterval(this.checkInactivityInterval);
    }
  }
}

/**
 * Base class for all states
 */
class BaseState {
  constructor(machine) {
    this.machine = machine;
  }
  enter() {}
  exit() {}
  update() {}
}

class IdleState extends BaseState {
  enter() {
    // Start eye tracker if in idle state
    if (this.machine.renderer.eyeTracker) {
      this.machine.renderer.eyeTracker.start();
    }
    
    // Randomly wander around or sit down after some time
    this.wanderTimer = setTimeout(() => {
      if (this.machine.currentStateName !== 'idle') return;
      
      // 30% chance to sit, 30% to wander, 40% stay idle
      const rand = Math.random();
      if (rand < 0.3) {
        this.machine.setState('sitting');
      } else if (rand < 0.6 && !this.machine.renderer.settings.followMode) {
        this.machine.setState('walking');
      }
    }, 15000 + Math.random() * 15000);
  }
  
  exit() {
    if (this.wanderTimer) clearTimeout(this.wanderTimer);
    if (this.machine.renderer.eyeTracker) {
      this.machine.renderer.eyeTracker.stop();
    }
  }
}

class WalkingState extends BaseState {
  enter() {
    // Wander to a random screen position nearby
    if (this.machine.renderer.followMode) {
      this.machine.renderer.followMode.startWandering();
    }
  }
  exit() {
    if (this.machine.renderer.followMode) {
      this.machine.renderer.followMode.stop();
    }
  }
}

class SittingState extends BaseState {
  enter() {
    // Stand up after a random delay
    this.standTimer = setTimeout(() => {
      if (this.machine.currentStateName === 'sitting') {
        this.machine.setState('idle');
      }
    }, 8000 + Math.random() * 12000);
  }
  exit() {
    if (this.standTimer) clearTimeout(this.standTimer);
  }
}

class SleepingState extends BaseState {
  enter() {
    // Set window update interval to 1s to save battery/resources
  }
  exit() {
  }
}

class TypingState extends BaseState {
  enter() {
    // Automatically transition back to idle after typing stops
    this.timeout = setTimeout(() => {
      if (this.machine.currentStateName === 'typing') {
        this.machine.setState('idle');
      }
    }, 3000);
  }
  exit() {
    if (this.timeout) clearTimeout(this.timeout);
  }
}

class ThinkingState extends BaseState {}

class HappyState extends BaseState {
  enter() {
    // Auto return to idle after 3 seconds
    this.timeout = setTimeout(() => {
      if (this.machine.currentStateName === 'happy') {
        this.machine.setState('idle');
      }
    }, 3000);
  }
  exit() {
    if (this.timeout) clearTimeout(this.timeout);
  }
}

class ErrorState extends BaseState {
  enter() {
    // Auto return to idle after 5 seconds
    this.timeout = setTimeout(() => {
      if (this.machine.currentStateName === 'error') {
        this.machine.setState('idle');
      }
    }, 5000);
  }
  exit() {
    if (this.timeout) clearTimeout(this.timeout);
  }
}

class GrabbedState extends BaseState {
  enter() {
    if (this.machine.renderer.dragHandler) {
      this.machine.renderer.dragHandler.onGrabbedEnter();
    }
  }
  exit() {
    if (this.machine.renderer.dragHandler) {
      this.machine.renderer.dragHandler.onGrabbedExit();
    }
  }
}

class FollowingState extends BaseState {
  enter() {
    if (this.machine.renderer.followMode) {
      this.machine.renderer.followMode.startFollowing();
    }
  }
  exit() {
    if (this.machine.renderer.followMode) {
      this.machine.renderer.followMode.stop();
    }
  }
}

class SadState extends BaseState {
  enter() {
    // Auto return to idle after 3 seconds
    this.timeout = setTimeout(() => {
      if (this.machine.currentStateName === 'sad') {
        this.machine.setState('idle');
      }
    }, 3000);
  }
  exit() {
    if (this.timeout) clearTimeout(this.timeout);
  }
}
