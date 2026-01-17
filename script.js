const WEBHOOK_URL = "https://n8n.incluc0de.com.br/webhook/webhook";
const AUTHORIZATION = "";

const messagesContainer = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sessionIdDisplay = document.getElementById("session-id");
const statusIndicator = document.getElementById("status-indicator");
const statusText = document.getElementById("status-text");
const restartBtn = document.getElementById("restart-session");
const sendBtn = document.getElementById("send-btn");
const chatContainer = document.getElementById("chat-container");





localStorage.setItem("sessionId", null);
localStorage.setItem("messageId", null);
let sessionId = null;
let messageId = null;
let autoScrollEnabled = true;
restartBtn.disabled = true;
restartBtn.classList.add("disabled");
const failMessage = "Sem ID de sessão. Serviço indisponível.";
const errorMessage = "❌ Erro! O serviço de assistência estudantil inteligente está fora do ar!";
const welcomeMessage = "👋 Olá! Eu sou o assistente acadêmico <strong>Tira-Dúvidas IFB!</strong>\n" +
  "Envie todas as suas dúvidas e eu terei muito prazer em respondê-las!";
const waitMessage = "Carregando...";
const dots = `<div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;

const sessionIdMessage = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(AUTHORIZATION && { Authorization: AUTHORIZATION }),
  },
  body: JSON.stringify(
  {
    sessionId: -1,
    messageId: -1
  })
}

const checkConnectionMessage = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(AUTHORIZATION && { Authorization: AUTHORIZATION }),
  },
  body: JSON.stringify({ isCheckConnection: true })
}

const serviceStatus = {
  isInitSession: true,
  isOffline: true,
  isNotGeneratedSessionId: true,
  isNotTyping: true
};





function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = text.replace(/\n/g, "<br>");
  messagesContainer.appendChild(msg);
  if (autoScrollEnabled) messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTyping() {
  const typing = document.createElement("div");
  typing.classList.add("message", "bot", "typing-wrapper");
  typing.id = "typing";
  typing.innerHTML = dots;
  messagesContainer.appendChild(typing);
  if (autoScrollEnabled) messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById("typing");
  if (typing) typing.remove();
}

async function typeMessage(text, sender = "bot", delay = 20) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  messagesContainer.appendChild(msg);
  for (let i = 0; i < text.length; i++) {
    msg.innerHTML = text.slice(0, i + 1).replace(/\n/g, "<br>");
    if (autoScrollEnabled) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    await new Promise((r) => setTimeout(r, delay));
  }
}





function fadeOutIn(callback) {
  chatContainer.classList.add("fade-out");
  setTimeout(() => {
    callback();
    chatContainer.classList.remove("fade-out");
    chatContainer.classList.add("fade-in");
    setTimeout(() => chatContainer.classList.remove("fade-in"), 600);
  }, 400);
}

function setStatus(online) {
  statusText.classList.add("fade-out");
  setTimeout(() => {
    if (online) {
      statusIndicator.classList.add("online");
      statusText.style.color = "#ffffff";
      statusText.textContent = "Online";
    } else {
      statusIndicator.classList.remove("online");
      statusText.style.color = "#ffffff";
      statusText.textContent = "Offline";
    }
    statusText.classList.remove("fade-out");
    statusText.classList.add("fade-in");
  }, 300);
}

function getServiceStatus() {
  return Object.values(serviceStatus).some((value) => value === true);
}





async function initSession() {
  try {
    serviceStatus['isInitSession'] = true;
    serviceStatus['isNotTyping'] = true;
    sessionIdDisplay.textContent = waitMessage;
    messagesContainer.innerHTML = ``;
    userInput.value = ``;
    showTyping();
    await new Promise((r) => setTimeout(r, 700));
    removeTyping();
    await typeMessage(welcomeMessage, "bot", 20);
  } finally {
    restartBtn.disabled = false;
    restartBtn.classList.remove("disabled");
    serviceStatus['isInitSession'] = false;
    serviceStatus['isNotTyping'] = false;
  }
}

async function checkSendAvailable() {
  if (getServiceStatus()) {
    sendBtn.disabled = true;
    sendBtn.classList.add("disabled");
  } else if (!getServiceStatus()) {
    sendBtn.disabled = false;
    sendBtn.classList.remove("disabled");
  }
}

async function generateSessionId() {
  sessionIdDisplay.textContent = waitMessage;
  try {
    const res = await fetch(WEBHOOK_URL, sessionIdMessage);
    const data = await res.json();
    if (data) {
      sessionId = data.sessionId;
      messageId = data.messageId;
      localStorage.setItem("sessionId", sessionId);
      localStorage.setItem("messageId", messageId);
      sessionIdDisplay.textContent = localStorage.getItem("sessionId");
      serviceStatus['isNotGeneratedSessionId'] = false;
    }
  } 
  catch (err) { 
    sessionIdDisplay.textContent = failMessage;
    serviceStatus['isNotGeneratedSessionId'] = true;
  }
}

async function checkConnection() {
  try {
    const res = await fetch(WEBHOOK_URL, checkConnectionMessage);
    if (!sessionId) await generateSessionId();
    sessionIdDisplay.textContent = localStorage.getItem("sessionId");
    setStatus(res.ok);
    serviceStatus['isOffline'] = false;
  } catch (err) {
    sessionIdDisplay.textContent = failMessage;
    setStatus(false);
    serviceStatus['isOffline'] = true;
  }
}





messagesContainer.addEventListener("scroll", () => {
  const nearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <=
    messagesContainer.clientHeight + 100;
  autoScrollEnabled = nearBottom;
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  userInput.value = "";
  showTyping();
  serviceStatus['isNotTyping'] = true;
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(AUTHORIZATION && { Authorization: AUTHORIZATION }),
      },
      body: JSON.stringify({
        isCheckConnection: false,
        sessionId: sessionId,
        messageId: messageId,
        message: text
      })
    });
    await new Promise((r) => setTimeout(r, 700));
    removeTyping();
    const data = await response.json();
    sessionId = data.sessionId;
    messageId = data.messageId;
    localStorage.setItem("sessionId", sessionId);
    localStorage.setItem("messageId", messageId);
    sessionIdDisplay.textContent = localStorage.getItem("sessionId");
    if (response.ok) {
      let replyText = String(data.message);
      await typeMessage("✅ " + replyText, "bot", 20);
    }
    else {
      removeTyping();
      await typeMessage(errorMessage, "bot", 20);  
    }
  }
  catch (err) {
    removeTyping();
    await typeMessage(errorMessage, "bot", 20);
  } 
  finally {
    serviceStatus['isNotTyping'] = false;
  }
});

restartBtn.addEventListener("click", async () => {
  restartBtn.disabled = true;
  restartBtn.classList.add("disabled");
  fadeOutIn(async () => {
    localStorage.setItem("sessionId", null);
    localStorage.setItem("messageId", null);
    sessionId = null;
    messageId = null;
    autoScrollEnabled = true;
    sendBtn.disabled = true;
    sendBtn.classList.add("disabled");
    initSession();
  });
});





initSession();
checkSendAvailable();
checkConnection();
setInterval(checkSendAvailable, 500);
setInterval(checkConnection, 5000);
