(function(){
  var c = window.ARChatBotConfig || {};
  var url = c.apiUrl || 'http://localhost:3000';
  var lang = c.language || 'ar';
  var title = c.title || 'Chat with us';
  var welcome = c.welcomeMessage || '!مرحبا، إزاي أقدر أساعدك';
  var sid = 'w_' + Math.random().toString(36).slice(2,10);

  var css = '*{box-sizing:border-box;margin:0;padding:0}.ar-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:99999;transition:transform .2s}.ar-bubble:hover{transform:scale(1.1)}.ar-win{position:fixed;bottom:90px;right:20px;width:380px;max-height:520px;border-radius:16px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;z-index:99998;font-family:system-ui,-apple-system,sans-serif}.ar-win.open{display:flex}.ar-hdr{background:#2563eb;color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between}.ar-hdr h3{font-size:15px;font-weight:600}.ar-hdr button{background:none;border:none;color:#fff;cursor:pointer;font-size:20px}.ar-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;max-height:360px}.ar-msg{max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;word-break:break-word}.ar-msg.user{align-self:flex-end;background:#2563eb;color:#fff;border-bottom-right-radius:4px}.ar-msg.bot{align-self:flex-start;background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px}.ar-typ{align-self:flex-start;padding:10px 14px;background:#f1f5f9;border-radius:14px;display:none}.ar-typ span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#94a3b8;margin:0 2px;animation:t .8s infinite}.ar-typ span:nth-child(2){animation-delay:.15s}.ar-typ span:nth-child(3){animation-delay:.3s}@keyframes t{0%,100%{opacity:.3}50%{opacity:1}}.ar-inp{display:flex;padding:12px;border-top:1px solid #e2e8f0;gap:8px}.ar-inp input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none}.ar-inp input:focus{border-color:#2563eb}.ar-inp button{background:#2563eb;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px}.ar-inp button:hover{background:#1d4ed8}';

  var s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);

  var wrap = document.createElement('div');
  wrap.innerHTML = '<div class="ar-bubble" id="arBubble"><svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div><div class="ar-win" id="arWin"><div class="ar-hdr"><h3>'+title+'</h3><button id="arClose">&times;</button></div><div class="ar-msgs" id="arMsgs"></div><div class="ar-typ" id="arTyp"><span></span><span></span><span></span></div><div class="ar-inp"><input type="text" id="arInput" placeholder="Type a message..."><button id="arSend">Send</button></div></div>';
  document.body.appendChild(wrap);

  var bubble=document.getElementById('arBubble'),win=document.getElementById('arWin'),msgs=document.getElementById('arMsgs'),input=document.getElementById('arInput'),sendBtn=document.getElementById('arSend'),typing=document.getElementById('arTyp'),closeBtn=document.getElementById('arClose');

  bubble.onclick=function(){win.classList.toggle('open')};
  closeBtn.onclick=function(){win.classList.remove('open')};

  function addMsg(t,r){var d=document.createElement('div');d.className='ar-msg '+r;d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
  function showTyp(){typing.style.display='block';msgs.scrollTop=msgs.scrollHeight}
  function hideTyp(){typing.style.display='none'}

  async function send(){
    var t=input.value.trim();if(!t)return;input.value='';addMsg(t,'user');showTyp();sendBtn.disabled=true;
    try{var r=await fetch(url+'/api/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,sessionId:sid,language:lang})});var d=await r.json();hideTyp();addMsg(d.reply||'Sorry, try again.','bot')}
    catch(e){hideTyp();addMsg('Connection error.','bot')}
    sendBtn.disabled=false;
  }

  sendBtn.onclick=send;input.onkeydown=function(e){if(e.key==='Enter')send()};
  addMsg(welcome,'bot');
})();
