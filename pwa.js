(() => {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  let deferredPrompt = null;
  let installButton = null;

  function removeButton(){
    if(installButton){installButton.remove();installButton=null;}
  }

  function showInstallButton(){
    if(installButton || !deferredPrompt) return;
    installButton=document.createElement('button');
    installButton.type='button';
    installButton.className='btn btn-primary pwa-install-button';
    installButton.textContent='📲 Instalar Gestão Condominial';
    Object.assign(installButton.style,{
      position:'fixed',right:'18px',bottom:'18px',zIndex:'180',boxShadow:'0 12px 32px rgba(20,27,40,.18)'
    });
    installButton.addEventListener('click',async()=>{
      if(!deferredPrompt)return;
      installButton.disabled=true;
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch(_){}
      deferredPrompt=null;
      removeButton();
    });
    document.body.appendChild(installButton);
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    showInstallButton();
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    removeButton();
  });

  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('PWA service worker',err));
  });
})();
