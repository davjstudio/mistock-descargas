export const categories=['Abarrotes','Bebidas','Lácteos','Limpieza','Snacks','Otros'];
export class AppError extends Error{constructor(message,status=0){super(message);this.name='AppError';this.status=status;}}
export function friendlyError(code='',status=0){
 if(/INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD/.test(code))return 'Correo o contraseña incorrectos.';
 if(code.includes('EMAIL_EXISTS'))return 'Ya existe una cuenta con ese correo. Inicia sesión.';
 if(code.includes('INVALID_EMAIL'))return 'El correo no es válido.';
 if(code.includes('WEAK_PASSWORD'))return 'Usa una contraseña de al menos 6 caracteres.';
 if(code.includes('USER_DISABLED'))return 'Esta cuenta está deshabilitada.';
 if(/TOO_MANY_ATTEMPTS|TOO_MANY_REQUESTS/.test(code)||status===429)return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
 if(status===409||status===412||code.includes('FAILED_PRECONDITION'))return 'El producto cambió en otro dispositivo. Actualiza los datos y vuelve a intentarlo.';
 if(status===401)return 'La sesión expiró. Cierra sesión y vuelve a entrar.';
 if(status===403)return 'No se pudo acceder a estos datos. Revisa los permisos de tu cuenta en MiStock.';
 if(status===404)return 'El registro ya no existe. Actualiza los datos.';
 if(/API_KEY|API key|blocked/.test(code))return 'La configuración de MiStock no permite esta conexión. Revisa la configuración de la app web.';
 return 'No se pudo completar la operación. Vuelve a intentarlo.';
}
export function parseInteger(value,fallback=0){
 if(value===undefined||value===null)return fallback;
 const n=Number(value);if(!Number.isSafeInteger(n))throw new AppError('Una cantidad excede el rango compatible con la versión web.');return n;
}
export function parsePrice(value){
 const text=String(value).trim().replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(text))throw new AppError('Ingresa un precio válido con hasta 2 decimales, sin separadores de miles.');
 const price=Number(text);if(!Number.isFinite(price)||price>9999999999.99)throw new AppError('El precio excede el límite permitido.');return price;
}
export function positiveQuantity(value,allowZero=false){
 const text=String(value).trim();if(!/^\d+$/.test(text))throw new AppError('Ingresa una cantidad entera válida.');
 const quantity=parseInteger(text);if(quantity<(allowZero?0:1))throw new AppError(allowZero?'La cantidad no puede ser negativa.':'La cantidad debe ser mayor a cero.');return quantity;
}
export function nextStock(current,quantity,type){
 if(!Number.isSafeInteger(quantity)||quantity<=0||!['in','out'].includes(type))throw new AppError('El movimiento no es válido.');
 if(type==='out'&&quantity>current)throw new AppError(`Solo hay ${current} unidades en stock.`);
 const next=current+(type==='out'?-quantity:quantity);
 if(!Number.isSafeInteger(next)||next<0)throw new AppError('El stock resultante está fuera del rango permitido.');return next;
}
export function statusOf(product){return product.stock<=0?'Sin stock':product.stock<=product.minStock?'Poco stock':'En stock';}
const text=v=>({stringValue:String(v)}),integer=v=>({integerValue:String(v)});
export function parseProduct(doc){
 const f=doc.fields||{};const price=Number(f.price?.doubleValue??f.price?.integerValue??0);
 if(!Number.isFinite(price))throw new AppError('Un producto tiene un precio no válido.');
 return {id:doc.name.split('/').at(-1),code:f.code?.stringValue||'',name:f.name?.stringValue||'',price,stock:parseInteger(f.stock?.integerValue),minStock:parseInteger(f.minStock?.integerValue,3),category:f.category?.stringValue||'',description:f.description?.stringValue||'',imageBase64:f.imageBase64?.stringValue||'',updateTime:doc.updateTime||''};
}
export function parseMovement(doc){
 const f=doc.fields||{};const raw=f.date?.timestampValue;const date=raw&&Number.isFinite(Date.parse(raw))?new Date(raw).toISOString():null;
 return {id:doc.name.split('/').at(-1),type:f.type?.stringValue==='out'?'out':'in',productId:f.productId?.stringValue||'',productName:f.productName?.stringValue||'',quantity:parseInteger(f.quantity?.integerValue),note:f.note?.stringValue||'',date,updateTime:doc.updateTime||''};
}
export class FirebaseClient{
 constructor(config,fetcher=globalThis.fetch.bind(globalThis)){this.config=config;this.fetcher=fetcher;this.logout();}
 logout(){this.uid='';this.email='';this.displayName='';this.idToken='';this.refreshToken='';this.expires=0;this.refreshing=null;this.profileWarning='';}
 get root(){return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.config.projectId)}/databases/(default)/documents`;}
 get userPath(){if(!this.uid)throw new AppError('Inicia sesión para continuar.');return `users/${encodeURIComponent(this.uid)}`;}
 async request(url,options={}){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await this.fetcher(url,{...options,signal:controller.signal,cache:'no-store'});
   let data;try{data=await response.json();}catch{data={};}
   if(!response.ok)throw new AppError(friendlyError(data.error?.message,response.status),response.status);return data;
  }catch(error){if(error instanceof AppError)throw error;throw new AppError(error.name==='AbortError'?'La conexión tardó demasiado. No se recibió la confirmación.':'No se pudo conectar. Comprueba tu conexión a internet.');}
  finally{clearTimeout(timeout);}
 }
 async auth(action,body){return this.request(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(this.config.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
 setSession(data){this.uid=data.localId;this.email=data.email||'';this.displayName=data.displayName||'';this.idToken=data.idToken;this.refreshToken=data.refreshToken;this.expires=Date.now()+Number(data.expiresIn||3600)*1000;}
 async login(email,password){this.logout();this.setSession(await this.auth('signInWithPassword',{email,password,returnSecureToken:true}));}
 async register(name,email,phone,password){
  this.logout();this.setSession(await this.auth('signUp',{email,password,returnSecureToken:true}));this.displayName=name;
  try{const data=await this.auth('update',{idToken:this.idToken,displayName:name,returnSecureToken:true});if(data.idToken)this.idToken=data.idToken;if(data.refreshToken)this.refreshToken=data.refreshToken;
   await this.send('PATCH',`${this.userPath}?updateMask.fieldPaths=name&updateMask.fieldPaths=email&updateMask.fieldPaths=phone`,{fields:{name:text(name),email:text(email),phone:text(phone)}});
  }catch{this.profileWarning='La cuenta se creó, pero no se pudo completar el perfil. Puedes entrar con tu correo y contraseña.';}
 }
 async resetPassword(email){await this.auth('sendOobCode',{requestType:'PASSWORD_RESET',email});}
 async ensureToken(){
  if(Date.now()<this.expires-120000)return;if(this.refreshing)return this.refreshing;
  if(!this.refreshToken)throw new AppError('Inicia sesión para continuar.');
  this.refreshing=(async()=>{const data=await this.request(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(this.config.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:this.refreshToken}).toString()});
   this.idToken=data.id_token;this.refreshToken=data.refresh_token;this.expires=Date.now()+Number(data.expires_in||3600)*1000;
  })();try{await this.refreshing;}finally{this.refreshing=null;}
 }
 async send(method,path,body){await this.ensureToken();return this.request(this.root+(path.startsWith(':')?'':'/')+path,{method,headers:{Authorization:`Bearer ${this.idToken}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
 async optional(path){try{return await this.send('GET',path);}catch(error){if(error.status===404)return null;throw error;}}
 async list(collection,parse){let token='';const seen=new Set(),items=[];do{const data=await this.send('GET',`${this.userPath}/${collection}?pageSize=300${token?`&pageToken=${encodeURIComponent(token)}`:''}`);for(const doc of data.documents||[])items.push(parse(doc));token=data.nextPageToken||'';if(token&&seen.has(token))throw new AppError('No se pudo completar la lista. Vuelve a actualizar.');seen.add(token);}while(token);return items;}
 async products(){return (await this.list('products',parseProduct)).sort((a,b)=>a.name.localeCompare(b.name,'es'));}
 async movements(){return (await this.list('movements',parseMovement)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
 async profile(){const doc=await this.optional(this.userPath),f=doc?.fields||{};return {name:f.name?.stringValue||this.displayName,email:this.email,phone:f.phone?.stringValue||'',notificationsEnabled:f.notificationsEnabled?.booleanValue??true};}
 async setNotifications(enabled){await this.send('PATCH',`${this.userPath}?updateMask.fieldPaths=notificationsEnabled`,{fields:{notificationsEnabled:{booleanValue:enabled}}});}
 async saveProduct(product,isNew){
  const fields={name:text(product.name),price:{doubleValue:product.price},stock:integer(product.stock),minStock:integer(product.minStock),category:text(product.category),description:text(product.description),imageBase64:text(product.imageBase64||'')};
  if(isNew)fields.code=text(product.code);
  const write={update:{name:`projects/${this.config.projectId}/databases/(default)/documents/${this.userPath}/products/${encodeURIComponent(product.id)}`,fields},updateMask:{fieldPaths:Object.keys(fields)},currentDocument:isNew?{exists:false}:{updateTime:product.updateTime}};
  if(isNew)write.updateTransforms=[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}];
  const data=await this.send('POST',':commit',{writes:[write]});return {...product,updateTime:data.writeResults[0].updateTime};
 }
 async deleteProduct(product){await this.send('DELETE',`${this.userPath}/products/${encodeURIComponent(product.id)}?currentDocument.updateTime=${encodeURIComponent(product.updateTime)}`);}
 async registerMovement(draft){
  if(!draft.id||!draft.productId||!draft.date||!Number.isFinite(Date.parse(draft.date)))throw new AppError('Completa el producto y la fecha.');
  if(!['in','out'].includes(draft.type))throw new AppError('Selecciona entrada o salida.');nextStock(0,draft.quantity,'in');
  const path=`${this.userPath}/movements/${encodeURIComponent(draft.id)}`,productPath=`${this.userPath}/products/${encodeURIComponent(draft.productId)}`;
  const prior=await this.optional(path);
  if(prior){const existing=parseMovement(prior);
   if(existing.type!==draft.type||existing.productId!==draft.productId||existing.quantity!==draft.quantity||existing.note!==draft.note||Date.parse(existing.date)!==Date.parse(draft.date))throw new AppError('Este movimiento ya se guardó con otros datos. Cierra el formulario y actualiza el historial.');
   const doc=await this.optional(productPath);return {movement:existing,product:doc?parseProduct(doc):null,alreadySaved:true};
  }
  const doc=await this.optional(productPath);if(!doc)throw new AppError('Este producto ya no existe. Actualiza el inventario.');
  const product=parseProduct(doc),stock=nextStock(product.stock,draft.quantity,draft.type);
  const name=p=>`projects/${this.config.projectId}/databases/(default)/documents/${p}`;
  const writes=[{update:{name:name(productPath),fields:{stock:integer(stock)}},updateMask:{fieldPaths:['stock']},currentDocument:{updateTime:product.updateTime}},
   {update:{name:name(path),fields:{type:text(draft.type),productId:text(product.id),productName:text(product.name),quantity:integer(draft.quantity),note:text(draft.note),date:{timestampValue:new Date(draft.date).toISOString()}}},currentDocument:{exists:false},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]}];
  const data=await this.send('POST',':commit',{writes});return {product:{...product,stock,updateTime:data.writeResults[0].updateTime},movement:{...draft,productName:product.name,updateTime:data.writeResults[1].updateTime},alreadySaved:false};
 }
}
export const csvCell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]|^[\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
export function exportCsv(products){return '\ufeff'+['Código;Producto;Categoría;Precio (S/);Stock;Stock mínimo;Estado;Descripción',...products.map(p=>[p.code,p.name,p.category,p.price.toFixed(2),p.stock,p.minStock,statusOf(p),p.description].map(csvCell).join(';'))].join('\r\n')+'\r\n';}
