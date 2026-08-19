(function(){
  var c = window.ARChatBotConfig || {};
  var url = c.apiUrl || 'http://localhost:3000';
  var lang = c.language || 'ar';
  var title = c.title || 'Chat with us';
  var welcome = c.welcomeMessage || '!مرحبا، إزاي أقدر أساعدك';
  var sid = 'w_' + Math.random().toString(36).slice(2,10);
  var mode = 'chat';

  var css = '*{box-sizing:border-box;margin:0;padding:0}.ar-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:99999;transition:transform .2s}.ar-bubble:hover{transform:scale(1.1)}.ar-win{position:fixed;bottom:90px;right:20px;width:380px;max-height:520px;border-radius:16px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;z-index:99998;font-family:system-ui,-apple-system,sans-serif}.ar-win.open{display:flex}.ar-hdr{background:#2563eb;color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between}.ar-hdr h3{font-size:15px;font-weight:600}.ar-hdr button{background:none;border:none;color:#fff;cursor:pointer;font-size:20px}.ar-tabs{display:flex;background:#1e40af}.ar-tabs button{flex:1;padding:8px;border:none;background:transparent;color:#93c5fd;cursor:pointer;font-size:12px;font-weight:500}.ar-tabs button.active{color:#fff;border-bottom:2px solid #fff}.ar-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;max-height:360px}.ar-msg{max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;word-break:break-word}.ar-msg.user{align-self:flex-end;background:#2563eb;color:#fff;border-bottom-right-radius:4px}.ar-msg.bot{align-self:flex-start;background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px}.ar-typ{align-self:flex-start;padding:10px 14px;background:#f1f5f9;border-radius:14px;display:none}.ar-typ span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#94a3b8;margin:0 2px;animation:t .8s infinite}.ar-typ span:nth-child(2){animation-delay:.15s}.ar-typ span:nth-child(3){animation-delay:.3s}@keyframes t{0%,100%{opacity:.3}50%{opacity:1}}.ar-inp{display:flex;padding:12px;border-top:1px solid #e2e8f0;gap:8px}.ar-inp input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none}.ar-inp input:focus{border-color:#2563eb}.ar-inp button{background:#2563eb;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-weight:500}.ar-inp button:hover{background:#1d4ed8}.ar-cl{display:none;flex:1;flex-direction:column}.ar-cl.show{display:flex}.ar-cl-prompt{display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid #e2e8f0}.ar-cl-prompt input{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;outline:none}.ar-cl-prompt input:focus{border-color:#2563eb}.ar-cl-prompt button{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px}.ar-cl-prompt button:disabled{opacity:.4}.ar-cl-code{flex:1;background:#1e1e2e;color:#d4d4d4;padding:12px;font-family:monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;overflow:auto;min-height:120px;border:none;outline:none;resize:none}.ar-cl-status{padding:4px 12px;background:#111;color:#4ade80;font-size:11px;font-family:monospace}.';

  var s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);

  var wrap = document.createElement('div');
  wrap.innerHTML = '<div class="ar-bubble" id="arBubble"><svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div><div class="ar-win" id="arWin"><div class="ar-hdr"><h3>'+title+'</h3><button id="arClose">&times;</button></div><div class="ar-tabs"><button class="active" id="arTabChat">Chat</button><button id="arTabCode">Code</button></div><div class="ar-msgs" id="arMsgs"></div><div class="ar-typ" id="arTyp"><span></span><span></span><span></span></div><div class="ar-cl" id="arCL"><div class="ar-cl-prompt"><input type="text" id="arClPrompt" placeholder="Describe code..."><button id="arClGen">Generate</button></div><textarea class="ar-cl-code" id="arClCode" placeholder="// Code here..." spellcheck="false"></textarea><div class="ar-cl-status" id="arClStatus">Ready</div></div><div class="ar-inp" id="arInp"><input type="text" id="arInput" placeholder="Type a message..."><button id="arSend">Send</button></div></div>';
  document.body.appendChild(wrap);

  var bubble=document.getElementById('arBubble'),win=document.getElementById('arWin'),msgs=document.getElementById('arMsgs'),input=document.getElementById('arInput'),sendBtn=document.getElementById('arSend'),typing=document.getElementById('arTyp'),closeBtn=document.getElementById('arClose');
  var tabChat=document.getElementById('arTabChat'),tabCode=document.getElementById('arTabCode');
  var arCL=document.getElementById('arCL'),arInp=document.getElementById('arInp');
  var arClPrompt=document.getElementById('arClPrompt'),arClGen=document.getElementById('arClGen'),arClCode=document.getElementById('arClCode'),arClStatus=document.getElementById('arClStatus');

  bubble.onclick=function(){win.classList.toggle('open')};
  closeBtn.onclick=function(){win.classList.remove('open')};

  tabChat.onclick=function(){mode='chat';tabChat.classList.add('active');tabCode.classList.remove('active');msgs.style.display='flex';typing.style.display='none';arCL.classList.remove('show');arInp.style.display='flex'};
  tabCode.onclick=function(){mode='code';tabCode.classList.add('active');tabChat.classList.remove('active');msgs.style.display='none';arCL.classList.add('show');arInp.style.display='none'};

  function addMsg(t,r){var d=document.createElement('div');d.className='ar-msg '+r;d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
  function showTyp(){typing.style.display='block';msgs.scrollTop=msgs.scrollHeight}
  function hideTyp(){typing.style.display='none'}

  async function send(){
    var t=input.value.trim();if(!t)return;input.value='';addMsg(t,'user');showTyp();sendBtn.disabled=true;
    try{var r=await fetch(url+'/api/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,sessionId:sid,language:lang})});var d=await r.json();hideTyp();addMsg(d.reply||'Sorry, try again.','bot')}
    catch(e){hideTyp();addMsg('Connection error.','bot')}
    sendBtn.disabled=false;
  }

  async function genCode(){
    var prompt=arClPrompt.value.trim();if(!prompt)return;
    arClGen.disabled=true;arClGen.textContent='Generating...';arClCode.value='';arClStatus.textContent='Generating...';
    try{
      var r=await fetch(url+'/api/code/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt,language:'auto'})});
      var reader=r.body.getReader();var dec=new TextDecoder();var full='';var buf='';
      while(true){var{done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});var lines=buf.split('\n');buf=lines.pop();for(var i=0;i<lines.length;i++){if(!lines[i].startsWith('data: '))continue;try{var d=JSON.parse(lines[i].slice(6));if(d.token){full+=d.token;arClCode.value=full.replace(/```\\w*\\n?/g,'').replace(/```$/g,'').trim()}}catch(e){}}}
      arClStatus.textContent='Generated! Edit & use as needed.';
    }catch(e){arClStatus.textContent='Error: '+e.message}
    arClGen.disabled=false;arClGen.textContent='Generate';
  }

  arClGen.onclick=genCode;arClPrompt.onkeydown=function(e){if(e.key==='Enter')genCode()};
  sendBtn.onclick=send;input.onkeydown=function(e){if(e.key==='Enter')send()};
  addMsg(welcome,'bot');
})();
