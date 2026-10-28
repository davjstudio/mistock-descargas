const help=document.querySelector('#install-help');
document.querySelectorAll('[data-install-help]').forEach(button=>button.addEventListener('click',()=>help.showModal()));
help.addEventListener('click',event=>{if(event.target===help)help.close();});
fetch('./releases.json').then(r=>r.ok?r.json():null).then(data=>{if(!data)return;for(const element of document.querySelectorAll('[data-file]')){const file=data[element.dataset.file];if(file)element.textContent=`${file.label} · ${(file.bytes/1048576).toFixed(1)} MB`;}}).catch(()=>{});
