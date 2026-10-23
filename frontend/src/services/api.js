const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export function getToken(){return localStorage.getItem('ww_token')}
export function setSession(data){localStorage.setItem('ww_token',data.token);localStorage.setItem('ww_user',JSON.stringify(data.user))}
export function clearSession(){localStorage.removeItem('ww_token');localStorage.removeItem('ww_user')}
export async function api(path, options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};const token=getToken();if(token)headers.Authorization=`Bearer ${token}`;const response=await fetch(`${BASE}${path}`,{...options,headers});const data=await response.json().catch(()=>({message:'Unexpected server response.'}));if(!response.ok)throw new Error(data.message||'Request failed.');return data}
