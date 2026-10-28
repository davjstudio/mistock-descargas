import {AppError} from './api.js';

export const PHOTO_MAX_SIDE=480;
export const PHOTO_MAX_BASE64=600000;
export function photoDimensions(width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw new AppError('La imagen no tiene un tamaño válido.');
 const scale=Math.min(1,PHOTO_MAX_SIDE/Math.max(width,height));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
export function photoSource(value){
 if(typeof value!=='string'||!value||value.length>PHOTO_MAX_BASE64)return '';
 const raw=value.replace(/\s/g,'');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)||raw.length%4!==0)return '';
 const mime=raw.startsWith('/9j/')?'image/jpeg':raw.startsWith('iVBORw0KGgo')?'image/png':raw.startsWith('UklGR')?'image/webp':'';
 return mime?`data:${mime};base64,${raw}`:'';
}
async function loadPhoto(file){
 if(typeof createImageBitmap==='function'){
  try{return await createImageBitmap(file);}catch{}
 }
 const url=URL.createObjectURL(file);
 try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new AppError('No se pudo leer la foto. Prueba con una imagen JPG o PNG.'));img.src=url;});}
 finally{URL.revokeObjectURL(url);}
}
export async function fileToPhoto(file){
 if(!file||file.size===0)throw new AppError('Selecciona una imagen.');
 if(file.size>20*1024*1024)throw new AppError('La foto es demasiado grande. Elige un archivo de hasta 20 MB.');
 if(file.type&&!file.type.startsWith('image/'))throw new AppError('Selecciona un archivo de imagen.');
 let bitmap;
 try{
  bitmap=await loadPhoto(file);
  const originalWidth=bitmap.naturalWidth||bitmap.width,originalHeight=bitmap.naturalHeight||bitmap.height;
  if(originalWidth*originalHeight>100000000)throw new AppError('La foto tiene demasiada resolución. Prueba con una versión más pequeña.');
  const {width,height}=photoDimensions(originalWidth,originalHeight),canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');if(!context)throw new AppError('Este navegador no pudo preparar la imagen.');
  context.fillStyle='#ffffff';context.fillRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);
  const result=canvas.toDataURL('image/jpeg',.75).split(',')[1];
  if(!photoSource(result))throw new AppError('No se pudo preparar la foto. Prueba con otra imagen.');
  return result;
 }catch(error){if(error instanceof AppError)throw error;throw new AppError('No se pudo leer la foto. Prueba con una imagen JPG o PNG.');}
 finally{bitmap?.close?.();}
}
