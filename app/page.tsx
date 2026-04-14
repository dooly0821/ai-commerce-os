"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// Firebase 설정 (민혁님의 기존 설정 유지)
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

export default function DoolyOS_Final_Premium() {
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

  const canvasRef = useRef(null);
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null);
  const isUserAtBottom = useRef(true);
  const chromeTextRef = useRef(null);

  // ✨ WebGL Shader 이식 및 마우스 인터랙션 (보내주신 HTML 기반)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
    const fsSource = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uDarkMode;

      mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c, -s, s, c); }
      
      float map(vec3 p) {
        p.xz *= rot(uTime * 0.3 + uMouse.x * 0.5);
        p.xy *= rot(uTime * 0.2 + uMouse.y * 0.5);
        // 젤리/조개 형태의 굴절체 구현
        vec3 q = abs(p) - 1.5;
        float d = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        return d + sin(p.x*2.0+uTime)*0.15;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        vec3 ro = vec3(0, 0, 5.0);
        vec3 rd = normalize(vec3(uv, -1.0));
        
        float t = 0.0;
        for(int i=0; i<80; i++) {
          float d = map(ro + rd * t);
          if(d < 0.001 || t > 20.0) break;
          t += d * 0.7;
        }

        // 은하수/별빛 배경색
        vec3 bg = uDarkMode > 0.5 ? vec3(0.01, 0.01, 0.04) : vec3(0.94, 0.95, 0.98);
        vec3 color = bg;

        if(t < 20.0) {
          vec3 p = ro + rd * t;
          vec2 e = vec2(0.001, 0.0);
          vec3 n = normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));
          
          // 무지개 프리즘 굴절 효과
          float r = refract(rd, n, 0.60).x;
          float g = refract(rd, n, 0.65).y;
          float b = refract(rd, n, 0.70).z;
          
          vec3 prism = vec3(r+0.8, g+0.5, b+0.9);
          float fresnel = pow(1.0 - max(0.0, dot(-rd, n)), 5.0);
          color = mix(prism * 0.6, vec3(1.0), fresnel);
        }
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const program = gl.createProgram();
    const addShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      gl.attachShader(program, s);
    };
    addShader(gl.VERTEX_SHADER, vsSource);
    addShader(gl.FRAGMENT_SHADER, fsSource);
    gl.linkProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const uTime = gl.getUniformLocation(program, 'uTime');
    const uRes = gl.getUniformLocation(program, 'uResolution');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uDarkMode = gl.getUniformLocation(program, 'uDarkMode');
    const posLoc = gl.getAttribLocation(program, 'position');

    let mouse = { x: 0, y: 0 };
    const onMove = (e) => { mouse.x = (e.clientX / window.innerWidth) - 0.5; mouse.y = (e.clientY / window.innerHeight) - 0.5; };
    window.addEventListener('mousemove', onMove);

    const render = (time) => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform1f(uTime, time * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uDarkMode, isDarkMode ? 1.0 : 0.0);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
    return () => window.removeEventListener('mousemove', onMove);
  }, [isDarkMode]);

  // 기존 로직 유지 (프로필, 방 참여 등)
  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    const savedTheme = localStorage.getItem("aether-theme");
    const savedRooms = JSON.parse(localStorage.getItem("aether-my-rooms") || "[]");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("aether-theme", newMode.toString());
  };

  const handleProfileSave = (e) => {
    if (e) e.preventDefault();
    if (!tempName.trim()) return alert("아이디를 입력해주세요!");
    const finalImg = tempImg || myProfileImg || "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";
    localStorage.setItem("aether-name", tempName);
    localStorage.setItem("aether-profile", finalImg);
    setMyName(tempName);
    setMyProfileImg(finalImg);
    setIsEditingProfile(false); 
  };

  const joinRoom = async (roomName) => {
    const name = roomName.trim();
    if (!name) return;
    if (!myRooms.includes(name)) {
      const updatedRooms = [name, ...myRooms];
      setMyRooms(updatedRooms);
      localStorage.setItem("aether-my-rooms", JSON.stringify(updatedRooms));
    }
    await setDoc(doc(db, "rooms", name), { name: name, updatedAt: serverTimestamp() }, { merge: true });
    setCurrentRoom(name);
  };

  const leaveRoom = (e, roomName) => {
    e.stopPropagation();
    if (confirm(`'${roomName}' 노드에서 나가시겠습니까?`)) {
      const updatedRooms = myRooms.filter(r => r !== roomName);
      setMyRooms(updatedRooms);
      localStorage.setItem("aether-my-rooms", JSON.stringify(updatedRooms));
    }
  };

  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [currentRoom, myName]);

  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !imgData) || !myName) return;
    const currentInput = input;
    setInput("");
    try {
      await addDoc(collection(db, "rooms", currentRoom, "messages"), {
        text: currentInput, image: imgData, userName: myName, userPhoto: myProfileImg, type: "chat", createdAt: serverTimestamp()
      });
      await setDoc(doc(db, "rooms", currentRoom), { updatedAt: serverTimestamp() }, { merge: true });
      isUserAtBottom.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      alert("🚨 전송 실패!");
      setInput(currentInput);
    }
  };

  const theme = {
    bg: isDarkMode ? "bg-[#020205]" : "bg-[#F3F5F8]",
    card: isDarkMode ? "bg-black/40 border-white/10" : "bg-white/80 border-black/5",
    text: isDarkMode ? "text-white" : "text-black",
    input: isDarkMode ? "bg-white/5 border-white/10 shadow-inner" : "bg-black/5 border-black/5",
  };

  // ✨ 인트로/리스트 공통 팝업 레이아웃
  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex items-center justify-center p-6 relative overflow-hidden transition-all duration-700`}>
      {/* 셰이더 캔버스 */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {/* 팝업 카드 (정렬 이슈 해결) */}
      <div className={`${theme.card} relative z-10 w-full max-w-[440px] p-10 rounded-[50px] border backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-10 animate-in zoom-in duration-700 overflow-visible`}>
        <div className="text-center w-full">
          {/* 무지개 프리즘 DOOLY 로고 */}
          <h1 className="PRISM_LOGO text-7xl font-black italic tracking-tighter uppercase mb-2 select-none">DOOLY</h1>
          <div className="flex justify-center gap-4 mt-2">
            <button onClick={toggleTheme} className="text-[9px] font-bold tracking-[0.2em] text-blue-500 uppercase hover:brightness-125">
              {isDarkMode ? "Night Protocol" : "Day Protocol"}
            </button>
            {!myName ? null : <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Logout</button>}
          </div>
        </div>

        {!myName ? (
          <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center gap-8">
            <div className={`w-28 h-28 rounded-full ${theme.input} border overflow-hidden cursor-pointer flex items-center justify-center hover:border-blue-500 transition-all`} onClick={() => profileInputRef.current.click()}>
              {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-zinc-500">PHOTO +</span>}
            </div>
            <input type="file" ref={profileInputRef} onChange={(e) => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>setTempImg(r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER ID" className={`w-full ${theme.input} border p-5 rounded-2xl ${theme.text} text-center font-bold tracking-widest outline-none`} />
            <button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl text-white font-black tracking-[0.2em] text-[12px] shadow-lg shadow-blue-500/30 active:scale-95 transition-all">START SYSTEM</button>
          </form>
        ) : (
          <div className="w-full flex flex-col items-center gap-8">
            <img src={myProfileImg} className="w-24 h-24 rounded-full border-2 border-blue-500/20 object-cover shadow-2xl" />
            <h2 className={`text-2xl font-black ${theme.text} tracking-tight uppercase`}>{myName}</h2>
            <div className="w-full flex flex-col gap-4">
               <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE" className={`w-full ${theme.input} border p-4 rounded-xl ${theme.text} text-center font-bold outline-none text-xs`} />
               <div className="max-h-[180px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                 {myRooms.map(room => (
                   <button key={room} onClick={() => joinRoom(room)} className={`w-full ${theme.input} border p-4 rounded-xl flex justify-between items-center hover:bg-blue-600/10 transition-all group`}>
                     <span className={`font-black ${theme.text} text-sm`}>{room}</span>
                     <span className="text-[9px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">CONNECT</span>
                   </button>
                 ))}
               </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* 고딕 폰트 적용 (민혁님 요청) */
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', -apple-system, sans-serif !important; letter-spacing: -0.03em; box-sizing: border-box; }
        
        /* 무지개 프리즘 로고 스타일 */
        .PRISM_LOGO {
          background: linear-gradient(180deg, #fff 0%, #bbb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          position: relative;
          filter: drop-shadow(0 0 15px rgba(255,255,255,0.3));
        }
        .PRISM_LOGO::after {
          content: "DOOLY";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #00ff00, #ffff00, #ff00ff);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          mix-blend-mode: ${isDarkMode ? 'color-dodge' : 'overlay'};
          opacity: 0.7;
          animation: prismFlow 4s linear infinite;
          z-index: 1;
        }
        @keyframes prismFlow { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );

  // 채팅방 화면
  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'} transition-colors`}>
      <header className={`px-8 py-5 border-b ${isDarkMode ? 'border-white/5' : 'border-black/5'} flex justify-between items-center backdrop-blur-md z-10`}>
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentRoom("")} className="text-blue-500 text-[10px] font-black uppercase tracking-widest">◀ Exit</button>
          <h1 className="text-sm font-black text-blue-500 italic uppercase tracking-tighter">{currentRoom}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[9px] font-bold border ${isDarkMode ? 'border-white/10' : 'border-black/5'} px-4 py-2 rounded-full ${theme.text}`}>{isDarkMode ? "DAY" : "NIGHT"}</button>
          <img src={myProfileImg} className="w-9 h-9 rounded-full object-cover border border-white/10" />
        </div>
      </header>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
            <img src={m.userPhoto} className="w-9 h-9 rounded-full shrink-0 object-cover border border-white/5 shadow-sm" />
            <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[70%]`}>
              <span className="text-[9px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">{m.userName}</span>
              <div className={`p-5 rounded-[24px] text-[14px] leading-relaxed shadow-sm ${m.userName === myName ? 'bg-blue-600 text-white rounded-tr-none' : `${theme.card} rounded-tl-none border ${theme.text}`}`}>
                {m.image && <img src={m.image} className="w-full rounded-xl mb-4 border border-white/5 shadow-inner" />}
                <p>{m.text}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-6">
        <form onSubmit={sendMessage} className={`max-w-4xl mx-auto flex items-center gap-3 ${theme.input} border p-2 rounded-2xl focus-within:ring-1 focus-within:ring-blue-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-11 h-11 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-blue-600 hover:text-white transition-all">+</button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="TYPE MESSAGE" className={`flex-1 bg-transparent px-2 text-sm ${theme.text} outline-none font-bold placeholder:font-normal`} />
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">Send</button>
        </form>
      </footer>
    </div>
  );
}
