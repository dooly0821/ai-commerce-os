"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// 🔥 Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc",
  authDomain: "dooly-66736.firebaseapp.com",
  projectId: "dooly-66736",
  storageBucket: "dooly-66736.firebasestorage.app",
  messagingSenderId: "969360298710",
  appId: "1:969360298710:web:1c09f676b9d784a0bdaf77"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function DoolyOS_Final_Perfect() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [myRooms, setMyRooms] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempImg, setTempImg] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  
  const [isNotiEnabled, setIsNotiEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const canvasContainerRef = useRef(null);
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null);
  
  const clickDataRef = useRef({ time: 0, x: 0.5, y: 0.5, targetIntensity: 0, currentIntensity: 0 });
  const isDarkModeRef = useRef(isDarkMode); 
  const isFirstLoad = useRef(true);

  useEffect(() => { isDarkModeRef.current = isDarkMode; }, [isDarkMode]);

  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    const savedTheme = localStorage.getItem("aether-theme");
    const savedRooms = JSON.parse(localStorage.getItem("aether-my-rooms") || "[]");
    const savedNoti = localStorage.getItem("aether-noti");
    
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    if (savedNoti !== null) setIsNotiEnabled(savedNoti === "true");
    setMyRooms(savedRooms);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("aether-theme", (!isDarkMode).toString());
  };

  const toggleNoti = () => {
    const newVal = !isNotiEnabled;
    setIsNotiEnabled(newVal);
    localStorage.setItem("aether-noti", newVal.toString());
    if (newVal && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };

  const openPopup = () => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    window.open(window.location.href, 'DoolyOS_Popup', 'width=450,height=800,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes');
  };

  // 🎨 WebGL 배경
  useEffect(() => {
    if (currentRoom || !canvasContainerRef.current) return;
    
    canvasContainerRef.current.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvasContainerRef.current.appendChild(canvas);
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const handleClick = (e) => {
      clickDataRef.current.time = performance.now() * 0.001;
      clickDataRef.current.x = e.clientX / window.innerWidth;
      clickDataRef.current.y = 1.0 - (e.clientY / window.innerHeight);
      clickDataRef.current.targetIntensity = 1.0; 
    };
    window.addEventListener('click', handleClick);

    const vsSource = `attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
    const fsSource = `
      precision mediump float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uDarkMode; 
      uniform float uClickTime;
      uniform vec2 uClickPos;
      uniform float uClickIntensity;
      uniform float uRotationSpeed; 

      float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1); p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(in vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 x) {
          float v = 0.0; float a = 0.5; vec3 shift = vec3(100);
          for (int i = 0; i < 3; ++i) {
              v += a * noise(x); x = x * 2.0 + shift; a *= 0.5;
          }
          return v;
      }
      mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c, -s, s, c); }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        
        float timeSinceClick = uTime - uClickTime;
        float wave = 0.0;
        vec2 clickUv = (uClickPos - 0.5) * (uResolution / min(uResolution.x, uResolution.y));
        float distToClick = length(uv - clickUv);
        
        if(timeSinceClick > 0.0 && timeSinceClick < 2.0) {
            float waveRadius = timeSinceClick * 2.0;
            wave = exp(-pow(distToClick - waveRadius, 2.0) * 100.0) * uClickIntensity * (1.0 - timeSinceClick/2.0);
            uv += normalize(uv - clickUv) * wave * 0.1;
        }

        vec3 ro = vec3(0.0, 0.0, 3.0);
        vec3 rd = normalize(vec3(uv, -1.0));
        
        vec3 dayColorA = vec3(0.85, 0.92, 1.0);
        vec3 dayColorB = vec3(0.98, 0.85, 0.95);
        vec3 nightColorA = vec3(0.05, 0.0, 0.15);
        vec3 nightColorB = vec3(0.0, 0.15, 0.3);

        vec3 colorA = mix(dayColorA, nightColorA, uDarkMode);
        vec3 colorB = mix(dayColorB, nightColorB, uDarkMode);
        
        if(uClickPos.x < 0.5) colorA += vec3(wave * 0.4, 0.0, wave * 0.2); 
        else colorB += vec3(0.0, wave * 0.3, wave * 0.4); 

        float den = 0.0; float t = 0.0;
        for(int i=0; i<15; i++) {
            vec3 p = ro + rd * t;
            p.xz *= rot(uTime * uRotationSpeed); p.xy *= rot(uTime * (uRotationSpeed * 0.5));
            float d = fbm(p * 1.5 + uTime * 0.2) - 0.5;
            if(d > 0.0) den += d * mix(0.1, 0.2, uDarkMode);
            t += 0.2;
        }

        vec3 finalColor = mix(colorA, colorB, uv.x + 0.5);
        vec3 denColor = mix(vec3(1.0, 0.95, 0.9), vec3(0.5, 0.7, 1.0), uDarkMode);
        finalColor += denColor * den;
        finalColor += vec3(1.0, 0.8, 0.5) * wave * mix(1.0, 1.5, uDarkMode);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source); gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const locTime = gl.getUniformLocation(program, 'uTime');
    const locRes = gl.getUniformLocation(program, 'uResolution');
    const locDark = gl.getUniformLocation(program, 'uDarkMode');
    const locClickTime = gl.getUniformLocation(program, 'uClickTime');
    const locClickPos = gl.getUniformLocation(program, 'uClickPos');
    const locClickInt = gl.getUniformLocation(program, 'uClickIntensity');
    const locRotSpeed = gl.getUniformLocation(program, 'uRotationSpeed'); 
    const posLoc = gl.getAttribLocation(program, 'position');

    let animationId;
    let currentDarkVal = isDarkModeRef.current ? 1.0 : 0.0;
    let currentRotSpeed = isDarkModeRef.current ? 0.1 : 0.15; 

    const render = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      const time = performance.now() * 0.001;
      
      clickDataRef.current.currentIntensity += (clickDataRef.current.targetIntensity - clickDataRef.current.currentIntensity) * 0.1;
      if (clickDataRef.current.targetIntensity > 0) clickDataRef.current.targetIntensity -= 0.02;

      const targetDark = isDarkModeRef.current ? 1.0 : 0.0;
      currentDarkVal += (targetDark - currentDarkVal) * 0.03; 

      const targetRotSpeed = isDarkModeRef.current ? 0.1 : 0.15;
      currentRotSpeed += (targetRotSpeed - currentRotSpeed) * 0.02; 

      gl.uniform1f(locTime, time);
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locDark, currentDarkVal);
      gl.uniform1f(locRotSpeed, currentRotSpeed); 
      gl.uniform1f(locClickTime, clickDataRef.current.time);
      gl.uniform2f(locClickPos, clickDataRef.current.x, clickDataRef.current.y);
      gl.uniform1f(locClickInt, clickDataRef.current.currentIntensity);

      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('click', handleClick);
    };
  }, [currentRoom]);

  // ✨ 테마 스타일 (잔상 및 정렬 오류 해결 최적화)
  const theme = {
    chatBg: `transition-colors duration-1000 ease-in-out ${isDarkMode ? "bg-[#0a0a0f]" : "bg-[#f4f6f9]"}`,
    card: `transition-all duration-1000 ease-in-out isolation-auto ${isDarkMode ? 'bg-black/40 border border-white/10 shadow-2xl' : 'bg-white/70 border border-white/80 shadow-lg'}`,
    textMain: `transition-colors duration-1000 ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`,
    textSub: `transition-colors duration-1000 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-600'}`,
    input: `transition-all duration-1000 ${isDarkMode ? 'bg-white/5 border border-white/10 text-white' : 'bg-white/90 border border-black/10 text-black'}`,
  };

  if (!currentRoom) return (
    <div className={`h-screen flex items-center justify-center p-6 relative overflow-hidden bg-black transition-colors duration-1000`}>
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-auto" />
      
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        <button onClick={toggleNoti} className={`text-[10px] font-black border transition-all duration-700 ${isDarkMode ? 'border-white/10 text-white/70' : 'border-black/10 text-black/70'} px-4 py-2 rounded-full backdrop-blur-md`}>{isNotiEnabled ? "🔔 ON" : "🔕 OFF"}</button>
        <button onClick={openPopup} className={`text-[10px] font-black border transition-all duration-700 ${isDarkMode ? 'border-white/10 text-white/70' : 'border-black/10 text-black/70'} px-4 py-2 rounded-full backdrop-blur-md`}>↗ POP-OUT</button>
      </div>

      {/* 전체 카드 (p-0으로 내부 패딩 제어) */}
      <div className={`${theme.card} w-full max-w-[420px] rounded-[40px] flex flex-col items-center z-10 backdrop-blur-3xl animate-in zoom-in duration-500 pointer-events-auto py-12 px-0 overflow-hidden`}>
          
          {/* ✨ 핵심 레이아웃: 모든 하위 요소의 너비를 330px로 완전히 강제 통일 */}
          <div className="w-[330px] flex flex-col items-center relative mx-auto">
            
            <h1 className={`ULTRA_PRISM_TEXT text-[4.5rem] font-black italic tracking-tighter uppercase select-none mb-4 transition-all duration-1000 ${isDarkMode ? 'night-mode' : 'day-mode'}`}>DOOLY</h1>
            
            {!myName ? (
              <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center space-y-5">
                <div className={`w-24 h-24 rounded-full ${theme.input} overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all`} onClick={() => profileInputRef.current.click()}>
                  {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[10px] font-bold tracking-widest">PHOTO +</span>}
                </div>
                <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
                <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER ID" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold tracking-widest backdrop-blur-md box-border`} />
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[12px] shadow-lg active:scale-95 transition-all box-border">Start System</button>
              </form>
            ) : (
              <div className="w-full flex flex-col items-center">
                <img src={myProfileImg} className={`transition-all duration-1000 w-20 h-20 rounded-full object-cover shadow-xl border-2 ${isDarkMode ? 'border-white/20' : 'border-indigo-500/20'} mb-3`} />
                <p className={`${theme.textMain} font-black text-xl tracking-tight`}>{myName}</p>
                <div className="flex gap-4 mt-3 mb-8">
                  <button onClick={toggleTheme} className={`${theme.textSub} text-[9px] font-bold uppercase tracking-widest hover:text-indigo-500 transition-all`}>{isDarkMode ? "Day Mode" : "Night Mode"}</button>
                  <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
                </div>
                
                <div className="w-full flex flex-col h-[32vh]">
                  <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE (ENTER)" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center mb-6 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold tracking-widest backdrop-blur-md box-border`} />
                  <h2 className={`w-full text-[10px] font-black text-left ${theme.textMain} tracking-widest uppercase mb-3 pl-1 opacity-70`}>My Nodes</h2>
                  
                  {/* ✨ 리스트 정렬 완전 해결: padding 제거 및 스크롤바 공간 예약 강제 해제 */}
                  <div className="w-full flex-1 overflow-y-auto space-y-2.5 scrollbar-hide pb-2" style={{ scrollbarGutter: 'stable' }}>
                    {myRooms.map((roomName) => (
                      <div key={roomName} className="w-full relative group">
                        {/* 그리드 정렬: 1:3:1 비율로 방 이름을 정확히 중앙에, Connect를 정확히 오른쪽 끝에 배치 */}
                        <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.input} px-5 py-4 rounded-xl grid grid-cols-[1fr_2fr_1fr] items-center hover:bg-white/10 transition-all active:scale-[0.98] backdrop-blur-sm box-border`}>
                          <div className="invisible text-[9px] font-bold">Connect</div>
                          <span className={`font-black ${theme.textMain} text-sm tracking-tight text-center truncate`}>{roomName}</span>
                          <div className="text-[9px] text-right text-indigo-500 font-bold uppercase opacity-0 group-hover:opacity-100 transition-all">Connect</div>
                        </button>
                        <button onClick={(e) => leaveRoom(e, roomName)} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500/90 text-white rounded-full text-[9px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg z-20">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
      
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        
        .ULTRA_PRISM_TEXT {
          padding: 0 0.15em; 
          background: linear-gradient(120deg, #ff0055 0%, #ff5500 15%, #ffcc00 30%, #00ff66 50%, #00ccff 70%, #7700ff 85%, #ff0055 100%);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; position: relative; z-index: 1; 
          animation: prismGlow 4s linear infinite;
        }
        
        .ULTRA_PRISM_TEXT.night-mode::before {
          content: "DOOLY"; position: absolute; left: 0.15em; top: 0; z-index: -1;
          color: rgba(255,255,255, 0.3);
          text-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 40px rgba(255,255,255, 0.3);
          backdrop-filter: blur(5px); -webkit-text-stroke: 1px rgba(255,255,255,0.4);
          transition: all 1s ease-in-out;
        }

        .ULTRA_PRISM_TEXT.day-mode::before {
          content: "DOOLY"; position: absolute; left: 0.15em; top: 0; z-index: -1;
          color: rgba(255,255,255, 0.7);
          text-shadow: 0 4px 15px rgba(0,0,0,0.1), 0 0 25px rgba(0,0,0, 0.05);
          backdrop-filter: blur(5px); -webkit-text-stroke: 1.5px rgba(0,0,0,0.15);
          transition: all 1s ease-in-out;
        }

        @keyframes prismGlow { to { background-position: 200% center; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${theme.chatBg} transition-colors duration-1000 relative overflow-hidden`}>
      <div className={`absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0f] to-[#0a0a0f] transition-opacity duration-1000 ease-in-out ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}></div>
      <div className={`absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-[#f4f6f9] to-[#eef2f6] transition-opacity duration-1000 ease-in-out ${isDarkMode ? 'opacity-0' : 'opacity-100'}`}></div>

      <header className={`px-6 py-4 border-b transition-all duration-1000 ${isDarkMode ? 'border-white/5' : 'border-black/10'} flex justify-between items-center backdrop-blur-xl z-20 bg-inherit`}>
        <div className="flex items-center gap-5">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[10px] font-bold uppercase hover:text-indigo-500 transition-colors`}>◀ EXIT</button>
          <div className="flex flex-col text-left gap-0.5">
            <h1 className="text-sm font-black italic text-indigo-500 uppercase tracking-tighter">{currentRoom}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] ${theme.textMain} font-bold opacity-80`}>{myName}</span>
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className={`text-[9px] ${theme.textSub} font-bold uppercase underline hover:text-indigo-500`}>EDIT</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleNoti} className={`text-[9px] font-black border transition-all duration-1000 ${isDarkMode ? 'border-white/10' : 'border-black/10'} ${theme.textSub} px-3 py-1.5 rounded-full`}>{isNotiEnabled ? "🔔 ON" : "🔕 OFF"}</button>
          <button onClick={openPopup} className={`text-[9px] font-black border transition-all duration-1000 ${isDarkMode ? 'border-indigo-500/50 text-indigo-400' : 'border-indigo-500/50 text-indigo-600'} px-3 py-1.5 rounded-full`}>↗ POP-OUT</button>
          <button onClick={() => setShowUserList(!showUserList)} className={`text-[9px] font-black border transition-all duration-1000 ${isDarkMode ? 'border-indigo-500/30 text-indigo-400' : 'border-indigo-500/50 text-indigo-600'} px-3 py-1.5 rounded-full`}>👥 USERS ({activeUsers.length})</button>
          <button onClick={toggleTheme} className={`text-[9px] font-black border transition-all duration-1000 ${isDarkMode ? 'border-white/10' : 'border-black/10'} ${theme.textSub} px-3 py-1.5 rounded-full`}>{isDarkMode ? "DAY" : "NIGHT"}</button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide z-10 relative w-full max-w-5xl mx-auto">
        {messages.map((m) => (
          m.type === "system" ? (
             <div key={m.id} className="flex justify-center my-2"><span className={`${theme.textSub} text-[10px] font-medium tracking-tight px-3 py-1 bg-transparent opacity-60`}>{m.text}</span></div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className={`transition-all duration-1000 w-8 h-8 rounded-full shrink-0 object-cover border ${isDarkMode ? 'border-white/10' : 'border-black/5'} shadow-sm`} />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className={`${theme.textSub} text-[9px] font-bold mb-1.5 px-1 uppercase opacity-80 tracking-widest`}>{m.userName}</span>
                <div className={`group relative p-4 rounded-[20px] text-[13px] leading-relaxed shadow-sm transition-all duration-1000 ${m.userName === myName ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md rounded-tr-[4px]" : isDarkMode ? "bg-[#161720] border border-white/5 text-zinc-200 rounded-tl-[4px]" : "bg-white border border-black/5 text-zinc-800 shadow-sm rounded-tl-[4px]"}`}>
                  {m.image && <img src={m.image} className="transition-all duration-1000 w-full rounded-xl mb-3 border border-white/5" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.userName === myName && (<button onClick={() => deleteMsg(m.id)} className={`absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 text-[10px] font-bold transition-all`}>DEL</button>)}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className={`p-5 border-t transition-all duration-1000 ${isDarkMode ? 'border-white/5' : 'border-black/10'} z-20 backdrop-blur-xl bg-inherit`}>
        <form onSubmit={sendMessage} className={`max-w-5xl mx-auto flex items-center gap-3 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/80 border-black/10 text-black'} p-1.5 rounded-2xl focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`w-10 h-10 flex items-center justify-center rounded-xl ${theme.textSub} transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><span className="text-xl font-light">+</span></button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-2 text-sm ${isDarkMode ? 'text-white' : 'text-black'} outline-none font-medium`} />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}
