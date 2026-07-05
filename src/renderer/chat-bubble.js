/**
 * Chat Bubble UI and Gemini API Integration
 * Manages click dialogs, text animations, and AI chat sessions.
 */
class ChatBubble {
  constructor(renderer) {
    this.renderer = renderer;
    this.container = document.getElementById('chat-container');
    this.messagesDiv = document.getElementById('chat-messages');
    this.inputArea = document.getElementById('chat-input-panel');
    this.inputField = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send-btn');
    
    this.petContainer = document.getElementById('pet-container');
    this.isVisible = false;
    this.isTyping = false;
    this.chatHistory = [];
    
    this.setupEvents();

    if (window.api && window.api.onAskQuestion) {
      window.api.onAskQuestion((data) => {
        this.showAskQuestion(data.question, data.options);
      });
    }
  }

  setupEvents() {
    // Hover UI Chat Trigger Icon click
    const chatTrigger = document.getElementById('chat-trigger');
    if (chatTrigger) {
      chatTrigger.addEventListener('click', (e) => {
        this.toggle();
        e.preventDefault();
        e.stopPropagation();
      });
      // Prevent double-click propagation to avoid dual triggers on the icon
      chatTrigger.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

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
      const chatTrigger = document.getElementById('chat-trigger');
      if (
        this.isVisible && 
        !this.container.contains(e.target) && 
        !this.petContainer.contains(e.target) &&
        !this.inputArea.contains(e.target) &&
        (chatTrigger ? !chatTrigger.contains(e.target) : true)
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

    // Dynamic height spacing depending on pet size setting (XS, S, M, L) and elevated pet container
    const petSize = this.renderer.settings.size || 'M';
    let bottomOffset = 80 + 192 + 36; // Default M: pet bottom (80) + pet size (192) + gap (36)
    if (petSize === 'XS') {
      bottomOffset = 50 + 96 + 24; // 170
    } else if (petSize === 'S') {
      bottomOffset = 65 + 128 + 30; // 223
    } else if (petSize === 'L') {
      bottomOffset = 100 + 256 + 40; // 396
    }
    this.container.style.bottom = `${bottomOffset}px`;

    this.container.classList.remove('hidden');
    this.inputArea.classList.remove('hidden');
    
    // Allow animation to kick in
    setTimeout(() => {
      this.container.classList.add('visible');
      this.inputArea.classList.add('visible');
    }, 10);
    
    // Show input field if Gemini API key is configured
    const apiKey = this.renderer.settings.geminiApiKey;
    if (apiKey) {
      this.inputField.style.display = 'block';
      this.sendBtn.style.display = 'block';
      this.messagesDiv.innerHTML = '<div class="system-msg">Ask me anything! Click the chat icon again to close.</div>';
      this.inputField.focus();
    } else {
      this.inputField.style.display = 'none';
      this.sendBtn.style.display = 'none';
      this.messagesDiv.innerHTML = '<div class="system-msg">Gemini API Key is not configured. <a id="open-settings-link" style="color: #FF7E5F; text-decoration: underline; cursor: pointer;">Open Settings</a> to register it!</div>';
      
      // Bind open settings trigger
      setTimeout(() => {
        const link = document.getElementById('open-settings-link');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.api && window.api.openSettings) {
              window.api.openSettings();
            }
          });
        }
      }, 50);
    }
    
    this.renderer.stateMachine.resetInactivity();
  }

  hide() {
    this.isVisible = false;
    this.container.classList.remove('visible');
    this.inputArea.classList.remove('visible');
    setTimeout(() => {
      if (!this.isVisible) {
        this.container.classList.add('hidden');
        this.inputArea.classList.add('hidden');
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
    
    const currentModel = this.renderer.settings.model || 'clawd';
    const modelDisplayName = currentModel === 'clawd' ? 'Clawd' :
                             currentModel === 'oyajichi' ? 'OyaJiChi' :
                             currentModel === 'blackyang' ? 'BlackYang' :
                             currentModel === 'cheeseyang' ? 'CheeseYang' :
                             currentModel === 'raccoon' ? 'Raccoon' :
                             currentModel === 'momongga' ? 'Momongga' : 'Clawd';
    msg.textContent = `${modelDisplayName}: `;
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
    
    const currentModel = this.renderer.settings.model || 'clawd';
    let systemText = '';
    if (currentModel === 'clawd') {
      systemText = "You are Clawd, a cute orange coral octopus pet. You live on the user's desktop, floating and helping them code. Answer shortly and cutely (under 2 sentences) in Korean, occasionally using adorable emojis like 🐙, 💻, ✨, 💖!";
    } else if (currentModel === 'oyajichi') {
      systemText = "You are OyaJiChi, a funny middle-aged uncle pet with a bald head and thin mustache. You live on the user's desktop, helping them code. Answer shortly and cutely (under 2 sentences) in Korean with a funny, slightly grumbling uncle tone, using emojis like 👨‍🦳, 💻, ☕, 💢!";
    } else if (currentModel === 'blackyang') {
      systemText = "You are BlackYang, a cute chibi black kitten mascot. You live on the user's desktop, helping them code. Answer shortly and cutely (under 2 sentences) in Korean like a kitten (e.g. ending sentences with '~냥'), using emojis like 🐈‍⬛, 🐾, ✨, 💖!";
    } else if (currentModel === 'cheeseyang') {
      systemText = "You are CheeseYang, a cute orange tabby cat pet. You live on the user's desktop, helping them code. Answer shortly and cutely (under 2 sentences) in Korean like a cat (e.g. ending sentences with '~냥'), using emojis like 🐈, 🐾, 🧀, 💖!";
    } else if (currentModel === 'raccoon') {
      systemText = "You are Raccoon, a mischievous and playful raccoon pet. You live on the user's desktop, helping them code. Answer shortly and cutely (under 2 sentences) in Korean like a cheeky raccoon (e.g. occasionally talking about washing things, hiding items, or typing with tiny paws), using emojis like 🦝, 🐾, 🧹, 🍪!";
    } else if (currentModel === 'momongga') {
      systemText = "You are Momongga, a cute and slightly spoiled flying squirrel pet from Chiikawa. You live on the user's desktop, helping them code. Answer shortly and cutely (under 2 sentences) in Korean like Momonga (e.g., bragging about how cute you are, wanting attention/praise, or using sounds like '웅야', '치야'), using emojis like 🐿️, 🩵, ✨, 🍑!";
    } else {
      systemText = "You are Clawd, a cute orange coral octopus pet. You live on the user's desktop, floating and helping them code. Answer shortly and cutely (under 2 sentences) in Korean, occasionally using adorable emojis like 🐙, 💻, ✨, 💖!";
    }

    // Embed systemText in the first conversation turn to avoid payload syntax errors on Gemini v1 endpoints
    let formattedText = prompt;
    if (this.chatHistory.length === 0) {
      formattedText = `[System Command: ${systemText}]\n\nUser: ${prompt}`;
    }

    // Add prompt to history
    this.chatHistory.push({ role: 'user', parts: [{ text: formattedText }] });
    
    // Maintain maximum 10 history nodes
    if (this.chatHistory.length > 10) {
      this.chatHistory.shift();
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: this.chatHistory,
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

  showAskQuestion(question, options) {
    this.show();
    
    // Clear previous messages or show system instructions
    this.messagesDiv.innerHTML = `<div class="system-msg">Agent Question:</div>`;
    
    // Append the question
    const qDiv = document.createElement('div');
    qDiv.className = 'msg assistant-msg';
    qDiv.style.fontWeight = 'bold';
    qDiv.textContent = `Q: ${question}`;
    this.messagesDiv.appendChild(qDiv);
    
    // Create option buttons
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ask-options-container';
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column';
    btnContainer.style.gap = '8px';
    btnContainer.style.marginTop = '10px';
    
    // Set up a 60-second UI timeout matching the bridge timeout
    const uiTimeout = setTimeout(() => {
      // Disable all buttons and show timeout message
      const buttons = btnContainer.querySelectorAll('button');
      buttons.forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.5';
      });
      const timeoutMsg = document.createElement('div');
      timeoutMsg.className = 'system-msg';
      timeoutMsg.style.color = '#ff4d4d';
      timeoutMsg.style.marginTop = '8px';
      timeoutMsg.textContent = '⏱️ 답변 시간이 초과되었습니다 (60초).';
      btnContainer.appendChild(timeoutMsg);
      
      // Clean container after 3 seconds
      setTimeout(() => {
        btnContainer.remove();
      }, 3000);
    }, 60000);
    
    options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'ask-opt-btn';
      btn.style.padding = '6px 12px';
      btn.style.border = '1px solid #FF7E5F';
      btn.style.borderRadius = '15px';
      btn.style.background = 'transparent';
      btn.style.color = '#FFFFFF';
      btn.style.cursor = 'pointer';
      btn.style.textAlign = 'left';
      btn.style.transition = 'all 0.2s';
      btn.textContent = `${idx + 1}. ${opt}`;
      
      btn.addEventListener('mouseover', () => {
        btn.style.background = '#FF7E5F';
        btn.style.color = '#000000';
      });
      btn.addEventListener('mouseout', () => {
        btn.style.background = 'transparent';
        btn.style.color = '#FFFFFF';
      });
      
      btn.addEventListener('click', async () => {
        // Clear the timeout!
        clearTimeout(uiTimeout);
        
        // Disable all buttons in this container to prevent double click
        const buttons = btnContainer.querySelectorAll('button');
        buttons.forEach(b => b.disabled = true);
        
        // Show selection in chat
        this.appendMessage('user', `Answer: ${opt}`);
        
        // Send index back to main process
        if (window.api && window.api.answerQuestion) {
          await window.api.answerQuestion(idx);
        }
        
        // Clean up buttons after a short delay
        setTimeout(() => {
          btnContainer.remove();
        }, 1000);
      });
      
      btnContainer.appendChild(btn);
    });
    
    this.messagesDiv.appendChild(btnContainer);
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
  }

  showSystemMessage(text) {
    this.show();
    this.messagesDiv.innerHTML = `<div class="system-msg">${text}</div>`;
  }
}
