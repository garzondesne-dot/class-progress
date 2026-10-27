(function(){
  const KEY='class-progress-apk-theme';
  const css=document.createElement('style');
  css.textContent=`
    html.apk-dark,html.apk-dark body{background:#0f172a!important;color:#e2e8f0!important;color-scheme:dark}
    html.apk-dark .bg-white,html.apk-dark .bg-slate-50,html.apk-dark .bg-gray-50,html.apk-dark .bg-slate-100{background-color:#1e293b!important}
    html.apk-dark .text-slate-900,html.apk-dark .text-slate-800,html.apk-dark .text-slate-700,html.apk-dark .text-gray-900,html.apk-dark .text-gray-800{color:#f1f5f9!important}
    html.apk-dark .text-slate-600,html.apk-dark .text-slate-500,html.apk-dark .text-slate-400,html.apk-dark .text-gray-500{color:#cbd5e1!important}
    html.apk-dark .border-slate-100,html.apk-dark .border-slate-200,html.apk-dark .border-gray-200{border-color:#475569!important}
    html.apk-dark input,html.apk-dark textarea,html.apk-dark select{background-color:#334155!important;color:#f8fafc!important;border-color:#64748b!important}
    html.apk-dark input::placeholder,html.apk-dark textarea::placeholder{color:#cbd5e1!important}
    html.apk-dark .compact-lesson,html.apk-dark .compact-side-slot,html.apk-dark .compact-day,html.apk-dark .compact-empty,html.apk-dark .lesson-detail{color:#f8fafc}
    html.apk-dark .step-none{background:#334155!important}
    html.apk-dark .step-dist{background:#115e59!important;color:#f0fdfa!important}
    html.apk-dark .step-solve{background:#854d0e!important;color:#fffbeb!important}
    html.apk-dark .step-check{background:#1e40af!important;color:#eff6ff!important}
    html.apk-dark .compact-topic,html.apk-dark .compact-session,html.apk-dark .compact-status{color:inherit!important}
    html.apk-dark .bg-cyan-50\\/60,html.apk-dark .bg-indigo-50,html.apk-dark .bg-emerald-50,html.apk-dark .bg-amber-50{background-color:#1e293b!important}
    #apk-theme-toggle{position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:1000;border:1px solid #64748b;border-radius:999px;background:#1e293b;color:#fff;padding:10px 15px;font-weight:700;box-shadow:0 4px 12px #0004}
  `;
  document.head.appendChild(css);
  function apply(dark){document.documentElement.classList.toggle('apk-dark',dark);const b=document.getElementById('apk-theme-toggle');if(b)b.textContent=dark?'☀️ 라이트 모드':'🌙 다크 모드';}
  async function statusBar(){const bar=window.Capacitor?.Plugins?.StatusBar;if(!bar)return;try{await bar.setOverlaysWebView({overlay:false});await bar.setBackgroundColor({color:'#111827'});await bar.setStyle({style:'DARK'});}catch(e){console.warn('Status bar setup:',e);}}
  function init(){apply(localStorage.getItem(KEY)==='dark');const b=document.createElement('button');b.id='apk-theme-toggle';b.type='button';b.setAttribute('aria-label','화면 테마 전환');document.body.appendChild(b);apply(localStorage.getItem(KEY)==='dark');b.addEventListener('click',()=>{const dark=!document.documentElement.classList.contains('apk-dark');localStorage.setItem(KEY,dark?'dark':'light');apply(dark);});statusBar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();