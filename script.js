// Configuration object
let config = {
  hora: '19:18',
  bateria: '85%',
  icone: '',
  nome: 'Nome do Contato'
};

// Utility function to get file type icon
function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const types = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    txt: '📄',
    zip: '📦',
    rar: '📦',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    mp3: '🎵',
    mp4: '🎥'
  };
  return types[ext] || '📎';
}

// Parse configuration from input text
function parseConfig(text) {
  const lines = text.split('\n');
  const configLines = [];
  const messageLines = [];
  let configEnded = false;

  for (let line of lines) {
    line = line.trim();
    if (!configEnded && (line.startsWith('Hora:') || line.startsWith('Bateria:') || line.startsWith('Icone:') || line.startsWith('Nome:'))) {
      configLines.push(line);
    } else if (line.length > 0) {
      configEnded = true;
      messageLines.push(line);
    }
  }

  configLines.forEach(line => {
    if (line.startsWith('Hora:')) {
      config.hora = line.substring(5).trim();
    } else if (line.startsWith('Bateria:')) {
      config.bateria = line.substring(8).trim();
    } else if (line.startsWith('Icone:')) {
      config.icone = line.substring(6).trim();
    } else if (line.startsWith('Nome:')) {
      config.nome = line.substring(5).trim();
    }
  });

  return messageLines.join('\n');
}

// Parse conversation text into message objects
function parseConversation(text) {
  try {
    const messageText = parseConfig(text);
    const lines = messageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const messages = [];
    let currentMessage = null;

    const timeRegex = /^([0-2]\d:[0-5]\d)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (timeRegex.test(line)) {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = { 
          time: line, 
          sender: '', 
          text: '', 
          type: 'text', 
          buttons: [], 
          poll: null, 
          image: null, 
          location: null, 
          contact: null,
          audio: null,
          video: null,
          file: null
        };
      } else if (currentMessage && currentMessage.sender === '') {
        const sepIndex = line.indexOf(':');
        if (sepIndex !== -1) {
          currentMessage.sender = line.substring(0, sepIndex).trim();
          currentMessage.text = line.substring(sepIndex + 1).trim();
        } else {
          currentMessage.text = line;
        }
      } else if (currentMessage) {
        if (line.startsWith('✅') || line.startsWith('❌')) {
          const buttons = line.split(/(?=✅)|(?=❌)/).filter(b => b.trim());
          currentMessage.buttons = buttons.map(b => ({
            text: b.replace(/✅|❌/, '').trim(),
            emoji: b.includes('✅') ? '✅' : '❌',
            selected: false
          }));
        } else if (line.startsWith('Áudio:')) {
          currentMessage.audio = {
            duration: line.substring(6).trim() || '0:30'
          };
          currentMessage.type = 'audio';
        } else if (line.startsWith('Vídeo:')) {
          currentMessage.video = {
            thumbnail: line.substring(6).trim() || 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg'
          };
          currentMessage.type = 'video';
        } else if (line.startsWith('Arquivo:')) {
          const fileInfo = line.substring(8).trim();
          currentMessage.file = {
            name: fileInfo,
            type: getFileType(fileInfo)
          };
          currentMessage.type = 'file';
        } else if (line.startsWith('Localização:')) {
          currentMessage.location = line.substring(12).trim();
        } else if (line.startsWith('Contato:')) {
          const contactInfo = line.substring(8).trim();
          const parts = contactInfo.split(' - ');
          currentMessage.contact = {
            name: parts[0] || contactInfo,
            label: parts[1] || 'Contato'
          };
        } else if (line.startsWith('Enquete:')) {
          currentMessage.poll = {
            title: line.substring(8).trim(),
            options: []
          };
        } else if (currentMessage.poll && /^\d+\s*-/.test(line)) {
          currentMessage.poll.options.push({
            text: line,
            selected: false
          });
        } else if (line.startsWith('Botoes:')) {
          currentMessage.type = 'buttons';
        } else if (line.startsWith('http') && (line.includes('.jpg') || line.includes('.png') || line.includes('.jpeg') || line.includes('.gif'))) {
          currentMessage.image = line;
        } else {
          currentMessage.text += '\n' + line;
        }
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    return messages;
  } catch (error) {
    console.error('Error parsing conversation:', error);
    return [];
  }
}

// Create audio message element
function createAudioMessage(audio) {
  const audioDiv = document.createElement('div');
  audioDiv.className = 'audio-message';
  
  audioDiv.innerHTML = `
    <div class="audio-controls">
      <div class="audio-play">▶️</div>
      <div class="audio-progress">
        <div class="audio-progress-bar" style="width: 0%"></div>
      </div>
    </div>
    <span class="text-xs text-gray-500">${audio.duration}</span>
  `;
  
  const playButton = audioDiv.querySelector('.audio-play');
  const progressBar = audioDiv.querySelector('.audio-progress-bar');
  let isPlaying = false;
  let progressInterval;
  
  playButton.onclick = () => {
    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? '⏸️' : '▶️';
    
    if (isPlaying) {
      let progress = 0;
      progressInterval = setInterval(() => {
        progress += 1;
        progressBar.style.width = `${progress}%`;
        if (progress >= 100) {
          clearInterval(progressInterval);
          isPlaying = false;
          playButton.textContent = '▶️';
          progressBar.style.width = '0%';
        }
      }, 30);
    } else {
      clearInterval(progressInterval);
    }
  };
  
  return audioDiv;
}

// Create video message element
function createVideoMessage(video) {
  const videoDiv = document.createElement('div');
  videoDiv.className = 'video-message';
  
  videoDiv.innerHTML = `
    <img src="${video.thumbnail}" class="video-thumbnail" alt="Video thumbnail">
    <div class="video-play-button">▶️</div>
  `;
  
  return videoDiv;
}

// Create file message element
function createFileMessage(file) {
  const fileDiv = document.createElement('div');
  fileDiv.className = 'flex items-center gap-3 p-3 bg-white rounded-lg';
  
  fileDiv.innerHTML = `
    <span class="text-2xl">${file.type}</span>
    <div class="flex flex-col">
      <span class="text-sm font-medium">${file.name}</span>
      <span class="text-xs text-gray-500">Toque para baixar</span>
    </div>
  `;
  
  return fileDiv;
}

// Render chat messages
function renderChat(messages) {
  const container = document.getElementById('chatContainer');
  
  // Update UI with config
  document.querySelector('.time').textContent = config.hora;
  document.querySelector('.battery').textContent = config.bateria;
  document.getElementById('contactName').textContent = config.nome;
  
  if (config.icone) {
    document.getElementById('contactAvatar').style.backgroundImage = `url(${config.icone})`;
  }
  
  container.innerHTML = '<div class="text-gray-500 text-center py-8">Processando mensagens...</div>';
  
  setTimeout(() => {
    try {
      container.innerHTML = '';

      if (messages.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center py-8">Nenhuma mensagem encontrada. Verifique o formato do texto.</div>';
        return;
      }

      const senders = [...new Set(messages.map(m => m.sender))];
      const senderAlignment = {};
      senders.forEach((sender, index) => {
        senderAlignment[sender] = index === 0 ? 'received' : 'sent';
      });

      messages.forEach((msg, idx) => {
        const type = senderAlignment[msg.sender];
        const delay = idx * 100;

        const msgDiv = document.createElement('div');
        msgDiv.className = `message mb-4 flex flex-col ${type === 'sent' ? 'items-end' : 'items-start'}`;
        
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type} relative`;

        // Handle different message types
        switch (msg.type) {
          case 'audio':
            bubble.appendChild(createAudioMessage(msg.audio));
            break;
          case 'video':
            bubble.appendChild(createVideoMessage(msg.video));
            break;
          case 'file':
            bubble.appendChild(createFileMessage(msg.file));
            break;
          default:
            // Handle existing message types (image, location, contact, etc.)
            if (msg.image) {
              const img = document.createElement('img');
              img.src = msg.image;
              img.className = 'message-image';
              img.onerror = () => {
                img.style.display = 'none';
              };
              bubble.appendChild(img);
            }

            if (msg.location) {
              const mapDiv = document.createElement('div');
              mapDiv.className = 'location-map';
              mapDiv.innerHTML = `
                <div style="background: linear-gradient(45deg, #e8f5e8, #d4edda); width: 100%; height: 100%; position: relative;">
                  <div class="location-pin">📍</div>
                  <div style="position: absolute; bottom: 5px; left: 5px; font-size: 10px; color: #666;">
                    ${msg.location}
                  </div>
                </div>
              `;
              bubble.appendChild(mapDiv);
            }

            if (msg.contact) {
              const contactDiv = document.createElement('div');
              contactDiv.className = 'contact-card';
              contactDiv.innerHTML = `
                <div class="contact-avatar">${msg.contact.name.charAt(0).toUpperCase()}</div>
                <div class="contact-info">
                  <div class="contact-name">${msg.contact.name}</div>
                  <div class="contact-label">${msg.contact.label}</div>
                </div>
              `;
              bubble.appendChild(contactDiv);
            }

            if (msg.text) {
              const textSpan = document.createElement('span');
              textSpan.className = 'block whitespace-pre-wrap';
              textSpan.textContent = msg.text;
              bubble.appendChild(textSpan);
            }

            if (msg.poll) {
              const pollDiv = document.createElement('div');
              pollDiv.className = 'mt-2';
              pollDiv.innerHTML = `
                <div class="font-semibold mb-2">${msg.poll.title}</div>
                ${msg.poll.options.map(option => `
                  <div class="poll-option cursor-pointer">${option.text}</div>
                `).join('')}
              `;
              bubble.appendChild(pollDiv);

              // Add click handlers for poll options
              const options = pollDiv.querySelectorAll('.poll-option');
              options.forEach((option, optIdx) => {
                option.onclick = () => {
                  msg.poll.options.forEach(opt => opt.selected = false);
                  msg.poll.options[optIdx].selected = true;
                  options.forEach(el => el.classList.remove('selected'));
                  option.classList.add('selected');
                };
              });
            }

            if (msg.buttons.length > 0) {
              const buttonsDiv = document.createElement('div');
              buttonsDiv.className = 'message-buttons';
              msg.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = 'message-button';
                btn.textContent = `${button.emoji} ${button.text}`;
                btn.onclick = () => {
                  msg.buttons.forEach(b => b.selected = false);
                  button.selected = true;
                  buttonsDiv.querySelectorAll('.message-button').forEach(el => el.classList.remove('selected'));
                  btn.classList.add('selected');
                };
                buttonsDiv.appendChild(btn);
              });
              bubble.appendChild(buttonsDiv);
            }
        }

        // Add time and read receipt
        const timeSpan = document.createElement('span');
        timeSpan.className = 'text-[11px] ml-2 text-gray-500 inline-block mt-1';
        timeSpan.textContent = msg.time;
        
        if (type === 'sent') {
          const receipt = document.createElement('span');
          receipt.className = 'read-receipt';
          timeSpan.appendChild(receipt);
        }
        
        bubble.appendChild(timeSpan);
        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);

        setTimeout(() => msgDiv.classList.add('fade-in'), delay);
      });

      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
        document.getElementById('exportButton').disabled = false;
      }, messages.length * 100);
    } catch (error) {
      console.error('Error rendering chat:', error);
      container.innerHTML = '<div class="text-red-500 text-center py-8">Erro ao renderizar as mensagens. Por favor, tente novamente.</div>';
    }
  }, 100);
}

// Generate chat from input text
function generateChat() {
  const inputText = document.getElementById('inputText').value;
  
  if (!inputText.trim()) {
    alert('Por favor, cole o texto da conversa antes de gerar.');
    return;
  }

  const button = document.getElementById('generateButton');
  button.disabled = true;
  button.classList.add('opacity-50', 'cursor-not-allowed');
  button.textContent = 'Processando...';

  try {
    const messages = parseConversation(inputText);
    renderChat(messages);
  } catch (error) {
    console.error('Error:', error);
    alert('Ocorreu um erro ao processar a conversa. Por favor, verifique o formato do texto.');
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.classList.remove('opacity-50', 'cursor-not-allowed');
      button.textContent = 'Gerar Conversa';
    }, 1000);
  }
}

// Export chat as image
function exportImage() {
  const phoneFrame = document.querySelector('.phone-frame');
  const exportButton = document.getElementById('exportButton');
  
  exportButton.disabled = true;
  exportButton.textContent = '📸 Capturando...';
  
  setTimeout(() => {
    const options = {
      backgroundColor: '#111111',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      logging: false,
      width: phoneFrame.offsetWidth,
      height: phoneFrame.offsetHeight
    };
    
    html2canvas(phoneFrame, options).then(canvas => {
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
      link.download = `whatsapp-conversa-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      exportButton.disabled = false;
      exportButton.textContent = '📱 Exportar Imagem';
    }).catch(error => {
      console.error('Erro ao exportar imagem:', error);
      alert('Erro ao exportar imagem. Tente novamente.');
      
      exportButton.disabled = false;
      exportButton.textContent = '📱 Exportar Imagem';
    });
  }, 500);
}

// Clear chat and reset configuration
function clearChat() {
  config = {
    hora: '19:18',
    bateria: '85%',
    icone: '',
    nome: 'Nome do Contato'
  };
  
  document.getElementById('inputText').value = '';
  document.querySelector('.time').textContent = config.hora;
  document.querySelector('.battery').textContent = config.bateria;
  document.getElementById('contactName').textContent = config.nome;
  document.getElementById('contactAvatar').style.backgroundImage = '';
  
  const container = document.getElementById('chatContainer');
  container.innerHTML = '<div class="text-center text-gray-500 py-8">As mensagens aparecerão aqui após colar o texto e clicar em "Gerar Conversa"</div>';
  
  document.getElementById('exportButton').disabled = true;
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('generateButton').addEventListener('click', generateChat);
  document.getElementById('exportButton').addEventListener('click', exportImage);
  document.getElementById('clearButton').addEventListener('click', clearChat);
});
