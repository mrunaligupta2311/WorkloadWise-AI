import { useEffect, useState } from 'react';
import { api, clearSession, getToken, setSession } from './services/api.js';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import './App.css';
export default function App(){
 const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('ww_user'))}catch{return null}});
 const [page,setPage]=useState('Overview'); const [sidebarOpen,setSidebarOpen]=useState(false); const [notice,setNotice]=useState('');
 useEffect(()=>{if(getToken()&&!user)api('/auth/me').then(d=>{setUser(d.user);localStorage.setItem('ww_user',JSON.stringify(d.user))}).catch(()=>{clearSession();setUser(null)})},[]);
 const login=async (email,password)=>{const data=await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});setSession(data);setUser(data.user);setPage('Overview')};
 const logout=()=>{clearSession();setUser(null);setPage('Overview')};
 if(!user)return <LoginPage onLogin={login}/>;
 const props={user,onNotice:setNotice};
 return <div className="app-shell"><Sidebar page={page} setPage={setPage} user={user} open={sidebarOpen} close={()=>setSidebarOpen(false)} onLogout={logout}/><main className="main-area"><Topbar page={page} user={user} onMenu={()=>setSidebarOpen(!sidebarOpen)} setPage={setPage}/>{notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} <span>×</span></div>}<div className="page-wrap">{page==='Overview'?<DashboardPage {...props} setPage={setPage}/>:page==='Tasks'?<TasksPage {...props}/>:page==='Team'?<TeamPage {...props}/>:page==='Analytics'?<AnalyticsPage {...props}/>:<SettingsPage {...props}/>}</div></main></div>
}
