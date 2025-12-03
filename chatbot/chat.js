// chat.js — updated: short Gemini replies + Enter sends message

const chatArea = document.getElementById("chatArea");
const input = document.getElementById("inputText");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

// safe escape (still useful for user input, but marked handles bot output)
function escapeHtml(s){ if(s==null) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function scrollChat(){ 
  setTimeout(()=> { 
    if(chatArea) chatArea.scrollTop = chatArea.scrollHeight; 
  }, 10); 
}

function addUserMessage(msg){ 
  if(!chatArea) return; 
  chatArea.innerHTML += `<div class="user-msg">${escapeHtml(msg)}</div>`; 
  scrollChat(); 
}

function addBotMessage(msg, isMarkdown = false){ 
  if(!chatArea) return; 
  let content = isMarkdown && window.marked ? marked.parse(msg) : escapeHtml(msg);
  chatArea.innerHTML += `<div class="bot-msg">${content}</div>`; 
  scrollChat(); 
}

function addErrorMessage(msg){ 
  if(!chatArea) return; 
  chatArea.innerHTML += `<div class="bot-error">⚠ ${escapeHtml(msg)}</div>`; 
  scrollChat(); 
}

function addTyping(){ 
  if(!chatArea) return; 
  if(document.getElementById("typing-ind")) return;
  const html = `
    <div id="typing-ind" class="bot-msg" style="width: fit-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  chatArea.insertAdjacentHTML('beforeend', html);
  scrollChat(); 
}

function removeTyping(){ 
  const el = document.getElementById("typing-ind"); 
  if(el) el.remove(); 
}

/* manual quick replies */
function manualSmartReply(text){
  const t = (text||"").toLowerCase();
  if(t.includes("password") || t.includes("pin")) return "Use the 'Forgot Password' option to reset your password.";
  if(t.includes("otp")) return "Check your network connection and try 'Resend OTP'.";
  if(t.includes("upload") || t.includes("file")) return "Check the file format and size. Use PDF/JPG under 2MB.";
  return null;
}

/* askGemini: instruct to be short (1-2 sentences) */
async function askGemini(prompt){
  // prepend instruction so Gemini replies short & to-the-point
  const systemPrompt = "Be concise. Reply in 1–2 short sentences, directly answering the user's question. Do not add long explanations. Use Markdown if needed.";
  const finalPrompt = systemPrompt + "\n\nUser: " + prompt;

  try{
    const res = await fetch("http://localhost:5000/api/gemini", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ prompt: finalPrompt })
    });

    if(!res.ok){
      const txt = await res.text().catch(()=> "");
      console.error("Proxy non-OK", res.status, txt);
      // Try to parse error JSON if possible
      try {
          const errJson = JSON.parse(txt);
          if(errJson.error) return { ok: false, error: errJson.error };
      } catch(e) {}
      return { ok: false, error: `Server returned ${res.status}` };
    }

    const j = await res.json().catch(()=> null);
    if(!j) return { ok: false, error: "Invalid JSON from server" };

    if(j.success === true && typeof j.text === "string") return { ok: true, text: j.text };
    // server may return different shape — try j.text or j.raw
    if(j.text && typeof j.text === "string") return { ok: true, text: j.text };
    return { ok: false, error: j.error || "No text returned", raw: j };
  } catch(err){
    console.error("askGemini error", err);
    return { ok: false, error: "Network or proxy error" };
  }
}

/* sendMessage with rule: manual for password/otp/upload/file, else Gemini */
async function sendMessage(){
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;

  addUserMessage(text);
  input.value = "";
  input.focus();

  // manual rules
  const manual = manualSmartReply(text);
  if(manual){
    // Simulate small delay for natural feel
    addTyping();
    setTimeout(() => {
        removeTyping();
        addBotMessage(manual);
    }, 600);
    return;
  }

  // call Gemini
  addTyping();
  const result = await askGemini(text);
  removeTyping();

  if(!result.ok){
    // show server-side or network error
    addErrorMessage(result.error || "No response from Gemini");
    if(result.raw) console.warn("Raw server response:", result.raw);
    return;
  }

  // Render markdown response
  addBotMessage(result.text, true);
}

/* ----- Event wiring ----- */
document.addEventListener("DOMContentLoaded", () => {
  if(!input) return;
  // Enter sends message
  input.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault(); // prevent newline / form submit
      sendMessage();
    }
  });

  /* ----- Info Panel Logic ----- */
  const showBtn = document.getElementById("showBtn");
  const clearBtn = document.getElementById("clearBtn");
  const outputDiv = document.getElementById("output");
  const langSelect = document.getElementById("language");
  const appSelect = document.getElementById("app");
  const problemSelect = document.getElementById("problem");

  if(showBtn){
    showBtn.addEventListener("click", async () => {
      if(!outputDiv) return;
      
      const lang = langSelect.value || "english";
      const app = appSelect.value || "umang";
      const problem = problemSelect.value; // might be empty

      // Construct prompt
      let prompt = "";
      if(problem){
        prompt = `I am facing a problem with the ${app} app. The problem is: ${problem}. Please explain how to fix this in ${lang}.`;
      } else {
        prompt = `Tell me about the ${app} app and its key features in ${lang}.`;
      }

      // Show loading state
      outputDiv.classList.remove("hidden");
      outputDiv.innerHTML = `<div class="typing-indicator" style="justify-content:center; padding: 20px;"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;

      // Call Gemini
      const result = await askGemini(prompt);

      if(result.ok){
        const content = window.marked ? marked.parse(result.text) : escapeHtml(result.text);
        outputDiv.innerHTML = content;
      } else {
        outputDiv.innerHTML = `<div class="bot-error">⚠ ${escapeHtml(result.error || "Error fetching info")}</div>`;
      }
    });
  }

  if(clearBtn){
    clearBtn.addEventListener("click", () => {
      if(outputDiv) {
        outputDiv.innerHTML = "";
        outputDiv.classList.add("hidden");
      }
      // Optional: reset dropdowns
      // if(problemSelect) problemSelect.value = "";
    });
  }

  if(sendBtn) sendBtn.addEventListener("click", sendMessage);
  if(voiceBtn){
    voiceBtn.addEventListener("click", ()=>{
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SpeechRecognition){ alert("Voice not supported"); return; }
      const sr = new SpeechRecognition();
      sr.lang = "en-IN";
      sr.interimResults = false;
      sr.onresult = (ev) => { input.value = ev.results[0][0].transcript; };
      sr.start();
    });
  }
  const backBtn = document.getElementById("backBtnHeader");
  if(backBtn){
    backBtn.addEventListener("click", () => {
      window.location.href = "/";
    });
  }
});
