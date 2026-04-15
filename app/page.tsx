"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// 🔥 Firebase 설정 (민혁님의 프로젝트 정보 유지)
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

// 기본 프로필 이미지 (민혁님의 취향에 맞는 깔끔한 스타일)
const DEFAULT_AVATAR = "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";

export default function DoolyOS_Final_Master() {
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
  
  const isDarkModeRef = useRef(isDarkMode); 

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

  const openPopup = () => {
    window.open(window.location.href, 'DoolyOS_Popup', 'width=450,height=850,menubar=no,toolbar=no');
  };

  // 🎨 WebGL 전역 배경 (모든 레이어 하단에 부드럽게 고정)
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    canvasContainerRef.current.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvasContainerRef.current.appendChild(canvas);
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
    const fsSource = `
      precision mediump float;
      uniform float uTime; uniform vec2 uResolution; uniform float uDarkMode; 

      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(in vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 x) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; ++i) { v += a * noise(x); x = x * 2.0 + vec3(100.0); a *= 0.5; } return v; }
      mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        vec3 colorA = mix(vec3(0.85, 0.92, 1.0), vec3(0.05, 0.01, 0.1), uDarkMode);
        vec3 colorB = mix(vec3(0.98, 0.9, 0.95), vec3(0.02, 0.1, 0.25), uDarkMode);
        float den = 0.0; float t = 0.0;
        for(int i=0; i<10; i++) {
            vec3 p = vec3(uv * (1.0 + t * 0.1), -1.0) * (t + 1.0);
            p.xz *= rot(uTime * 0.1 + t);
            den += fbm(p * 0.8 + uTime * 0.05) * 0.12;
            t += 0.3;
        }
        vec3 final = mix(colorA, colorB, uv.y + 0.5) + den * mix(vec3(1.0), vec3(0.4, 0.6, 1.0), uDarkMode);
        gl_FragColor = vec4(final, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
      const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s;
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
    const posLoc = gl.getAttribLocation(program, 'position');

    let currentDarkVal = isDarkModeRef.current ? 1.0 : 0.0;
    const render = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      const time = performance.now() * 0.001;
      currentDarkVal += ( (isDarkModeRef.current ? 1.0 : 0.0) - currentDarkVal) * 0.04;
      gl.uniform1f(locTime, time);
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locDark, currentDarkVal);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    render();
  }, []);

  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [currentRoom, myName]);

  const activeUsers = useMemo(() => {
    const usersMap = new Map();
    messages.forEach(m => { if(m.userName) usersMap.set(m.userName, m.userPhoto); });
    return Array.from(usersMap, ([name, photo]) => ({ name, photo }));
  }, [messages]);

  const theme = {
    card: `transition-all duration-1000 ${isDarkMode ? 'bg-black/40 border-white/10 shadow-2xl' : 'bg-white/60 border-white/80 shadow-lg'} backdrop-blur-3xl`,
    textMain: `transition-colors duration-1000 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`,
    input: `transition-all duration-1000 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-black/10 text-black'}`,
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]'}`}>
      {/* ✨ 전역 셰이더 배경 */}
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-none opacity-80" />

      {/* 헤더 버튼 그룹 (PC 가독성 고려 배치) */}
      <div className="absolute top-6 right-8 z-50 flex gap-4">
        <button onClick={toggleTheme} className="text-[10px] font-black border border-white/20 px-4 py-2 rounded-full backdrop-blur-xl text-white/80 hover:bg-white/20 transition-all uppercase tracking-widest">{isDarkMode ? "Day Mode" : "Night Mode"}</button>
        <button onClick={openPopup} className="text-[10px] font-black border border-white/20 px-4 py-2 rounded-full backdrop-blur-xl text-white/80 hover:bg-white/20 transition-all uppercase tracking-widest">↗ Pop-out</button>
      </div>

      {!currentRoom ? (
        <div className="h-full flex items-center justify-center p-6 relative z-10">
          <div className={`${theme.card} w-full max-w-[440px] rounded-[48px] border flex flex-col items-center py-16 px-0 animate-in fade-in zoom-in duration-700`}>
            
            {/* ✨ 타이틀 보정: 이탤릭체 기울기 중심값 0.18em 오프셋 적용 */}
            <div className="relative mb-10 select-none">
               <h1 className={`ULTRA_PRISM_TEXT text-[5.2rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
            </div>

            {!myName ? (
              <div className="w-[330px] space-y-6">
                <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER YOUR IDENTITY" className={`w-full ${theme.input} px-6 py-5 rounded-2xl text-center outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold text-sm tracking-widest transition-all`} />
                <button onClick={() => { if(tempName.trim()){localStorage.setItem("aether-name", tempName); setMyName(tempName);}}} className="w-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl active:scale-[0.97] transition-all">Initialize OS</button>
              </div>
            ) : (
              <div className="w-[330px] flex flex-col items-center">
                <div className="relative group mb-4">
                  <img src={myProfileImg || DEFAULT_AVATAR} className="w-24 h-24 rounded-full border-4 border-white/10 object-cover shadow-2xl transition-transform group-hover:scale-105 duration-500" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 to-transparent pointer-events-none" />
                </div>
                <p className={`${theme.textMain} font-black text-2xl mb-8 tracking-tight`}>{myName}</p>
                
                <div className="w-full flex flex-col h-[38vh]">
                  <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="CONNECT TO NODE" className={`w-full ${theme.input} px-6 py-5 rounded-2xl text-center mb-6 font-bold text-xs tracking-[0.2em] outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all`} />
                  <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                    {myRooms.map(room => (
                      <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-6 py-5 rounded-2xl flex items-center justify-between hover:bg-indigo-500/10 transition-all group active:scale-[0.98]`}>
                        <span className="invisible text-[9px] font-bold">Connect</span>
                        <span className={`font-black ${theme.textMain} text-[13px] tracking-tight`}>{room}</span>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase opacity-0 group-hover:opacity-100 transition-all">Connect</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => {localStorage.clear(); window.location.reload();}} className="mt-8 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-red-500 transition-all opacity-50 hover:opacity-100">Reset Session</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ✨ 채팅방 UI: PC 가독성 및 프로필 대체 시스템 적용 */
        <div className="h-full flex flex-col relative z-10 transition-all duration-1000 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className={`px-8 py-5 border-b flex justify-between items-center backdrop-blur-2xl ${isDarkMode ? 'border-white/5 bg-black/30' : 'border-black/5 bg-white/40'}`}>
            <div className="flex items-center gap-6">
              <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[11px] font-black tracking-widest hover:text-indigo-500 transition-colors`}>◀ DISCONNECT</button>
              <h1 className="text-lg font-black italic text-indigo-500 uppercase tracking-tighter ml-2">{currentRoom}</h1>
            </div>
            
            <div className="flex items-center gap-6">
               <button onClick={() => setShowUserList(!showUserList)} className={`${theme.textSub} text-[11px] font-black tracking-widest hover:text-indigo-500 transition-all`}>USERS ({activeUsers.length})</button>
               <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shadow-lg">
                  <img src={myProfileImg || DEFAULT_AVATAR} className="w-full h-full object-cover" />
               </div>
            </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar w-full max-w-5xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-4 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-300`}>
                {/* 프로필 이미지 없는 사람 대체 시스템 */}
                <img src={m.userPhoto || DEFAULT_AVATAR} className="w-10 h-10 rounded-full shrink-0 object-cover border border-white/10 shadow-md self-end mb-1" />
                <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <span className={`${theme.textSub} text-[10px] font-black mb-2 uppercase tracking-widest opacity-60`}>{m.userName}</span>
                  <div className={`p-5 rounded-[24px] text-[14px] leading-relaxed shadow-xl transition-all duration-500 ${m.userName === myName ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-none' : isDarkMode ? 'bg-white/10 text-white border border-white/5 rounded-bl-none' : 'bg-white text-zinc-900 shadow-md border border-black/5 rounded-bl-none'}`}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <footer className="p-8 backdrop-blur-3xl border-t border-white/5">
            <form onSubmit={(e) => { e.preventDefault(); if(input.trim()) addDoc(collection(db, "rooms", currentRoom, "messages"), { text: input, userName: myName, userPhoto: myProfileImg, createdAt: serverTimestamp() }); setInput(""); }} 
                  className={`max-w-4xl mx-auto flex gap-4 ${theme.input} p-2 rounded-[24px] shadow-2xl transition-all focus-within:ring-2 focus-within:ring-indigo-500/30`}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter your data transmission..." className="flex-1 bg-transparent px-6 outline-none text-[14px] font-bold text-inherit placeholder:opacity-30" />
              <button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Send</button>
            </form>
          </footer>
        </div>
      )}

      {/* 우측 유저 목록 사이드바 (PC버전 가독성 강화) */}
      {showUserList && (
        <div className={`absolute top-24 right-8 w-72 p-6 rounded-[32px] ${theme.card} z-50 animate-in slide-in-from-right duration-500`}>
          <h3 className={`${theme.textMain} text-[11px] font-black uppercase tracking-[0.2em] mb-6 opacity-50`}>Participants</h3>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                {/* 프로필 이미지 정중앙 배치 대체 시스템 */}
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                  <img src={user.photo || DEFAULT_AVATAR} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                </div>
                <span className={`${theme.textMain} font-bold text-sm tracking-tight`}>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        
        /* ✨ 스크롤바 완전 제거 */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055 0%, #ff5500 15%, #ffcc00 30%, #00ff66 50%, #00ccff 70%, #7700ff 85%, #ff0055 100%);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; 
          animation: prism 4s linear infinite; 
          padding-right: 0.18em; /* ✨ 이탤릭체 기울기에 의한 쏠림 현상 Optical 보정 */
        }
        .ULTRA_PRISM_TEXT::before {
          content: "DOOLY"; position: absolute; left: 0; top: 0; z-index: -1;
          filter: blur(25px); opacity: 0.4;
        }
        .ULTRA_PRISM_TEXT.night::before { color: white; text-shadow: 0 0 40px rgba(255,255,255,0.4); }
        .ULTRA_PRISM_TEXT.day::before { color: black; text-shadow: 0 0 30px rgba(0,0,0,0.1); }
        @keyframes prism { to { background-position: 200% center; } }
      `}</style>
    </div>
  );
}
