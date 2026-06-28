/**
 * Chat Bubble UI and Gemini API Integration
 * Manages double-click dialogs, text animations, and AI chat sessions.
 */
class ChatBubble {
  constructor(renderer) {
    this.renderer = renderer;
    this.container = document.getElementById('chat-container');
    this.messagesDiv = document.getElementById('chat-messages');
    this.inputArea = document.getElementById('chat-input-area');
    this.inputField = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send-btn');
    
    this.petContainer = document.getElementById('pet-container');
    this.isVisible = false;
    this.isTyping = false;
    this.chatHistory = [];
    
    this.setupEvents();
  }

  setupEvents() {
    // Double click pet to open chat
    this.petContainer.addEventListener('dblclick', (e) => {
      this.toggle();
      e.stopPropagation();
    });

    // Send button click
    this.sendBtn.addEventListener('click', () => this.sendMessage());

    // Enter to send, ESC to close
    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
        e.stopPropagation();
      } else if (e.key === 'Escape') {
        this.hide();
        e.stopPropagation();
      }
    });

    // Close when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
      if (
        this.isVisible && 
        !this.container.contains(e.target) && 
        !this.petContainer.contains(e.target)
      ) {
        this.hide();
      }
    });
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.isVisible = true;
    this.container.classList.remove('hidden');
    // Allow animation to kick in
    setTimeout(() => {
      this.container.classList.add('visible');
    }, 10);
    
    // Show input field if Gemini API key is configured
    const apiKey = this.renderer.settings.geminiApiKey;
    if (apiKey) {
      this.inputArea.classList.remove('hidden');
      this.messagesDiv.innerHTML = '<div class="system-msg">Ask me anything! double click pet to close.</div>';
      this.inputField.focus();
    } else {
      this.inputArea.classList.add('hidden');
      this.messagesDiv.innerHTML = '<div class="system-msg">Gemini API Key is not configured. Add it in the tray settings menu!</div>';
    }
    
    this.renderer.stateMachine.resetInactivity();
  }

  hide() {
    this.isVisible = false;
    this.container.classList.remove('visible');
    setTimeout(() => {
      if (!this.isVisible) {
        this.container.classList.add('hidden');
      }
    }, 300);
    this.renderer.stateMachine.resetInactivity();
  }

  async sendMessage() {
    const text = this.inputField.value.trim();
    if (!text || this.isTyping) return;
    
    this.inputField.value = '';
    this.appendMessage('user', text);
    this.renderer.stateMachine.resetInactivity();
    
    const apiKey = this.renderer.settings.geminiApiKey;
    if (!apiKey) {
      this.appendMessage('system', 'Error: Gemini API Key is missing.');
      return;
    }

    // Set state to THINKING
    this.renderer.isAgentSessionActive = true;
    this.renderer.stateMachine.setState('thinking');
    
    try {
      this.isTyping = true;
      this.sendBtn.disabled = true;
      
      const responseText = await this.callGeminiAPI(text, apiKey);
      
      // Typewriter print of AI response
      await this.typewriteMessage(responseText);
      
      // Set state to HAPPY then back to IDLE
      this.renderer.stateMachine.setState('happy');
    } catch (err) {
      console.error('Gemini API Error:', err);
      this.appendMessage('system', 'Failed to fetch response: ' + err.message);
      this.renderer.stateMachine.setState('error');
    } finally {
      this.isTyping = false;
      this.sendBtn.disabled = false;
      this.renderer.isAgentSessionActive = false;
      this.renderer.stateMachine.resetInactivity();
    }
  }

  appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `msg ${sender}-msg`;
    msg.textContent = (sender === 'user' ? 'You: ' : '') + text;
    this.messagesDiv.appendChild(msg);
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
  }

  async typewriteMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'msg assistant-msg';
    msg.textContent = 'Octopus: ';
    this.messagesDiv.appendChild(msg);
    
    const textContentNode = document.createTextNode('');
    msg.appendChild(textContentNode);
    
    const characters = Array.from(text);
    for (let i = 0; i < characters.length; i++) {
      textContentNode.appendData(characters[i]);
      this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
      // 15ms speed for smooth reading
      await new Promise(r => setTimeout(r, 15));
    }
  }

  async callGeminiAPI(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // Add prompt to history
    this.chatHistory.push({ role: 'user', parts: [{ text: prompt }] });
    
    // Maintain maximum 10 history nodes
    if (this.chatHistory.length > 10) {
      this.chatHistory.shift();
    }

    const systemInstruction = {
      parts: [{
        text: "You are the Claude Code Desktop Octopus, a cute orange coral octopus pet. You live on the user's desktop, floating and helping them code. Answer shortly and cutely (under 2 sentences) in Korean, occasionally using adorable emojis like 🐙, 💻, ✨, 💖!"
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: this.chatHistory,
        systemInstruction: systemInstruction,
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "🐙 *blinks*";
    
    // Add reply to history
    this.chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    
    return reply.trim();
  }
}
