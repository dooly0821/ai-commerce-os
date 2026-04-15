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

export default function DoolyOS_Premium() {
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
  const isNotiEnabledRef = useRef(isNotiEnabled);
  const isFirstLoad = useRef(true);

  useEffect(() => { isDarkModeRef.current = isDarkMode; }, [isDarkMode]);
  useEffect(() => { isNotiEnabledRef.current = isNotiEnabled; }, [isNotiEnabled]);

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

  // 🎨 WebGL 반응형 배경
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
            p.xz *= rot(uTime * 0.1); p.xy *= rot(uTime * 0.05);
            float d = fbm(p * 1.5 + uTime * 0.2) - 0.5;
            if(d > 0.0) den += d * 0.15;
            t += 0.2;
        }

        vec3 finalColor = mix(colorA, colorB, uv.x + 0.5);
        finalColor += vec3(0.5, 0.7, 1.0) * den * mix(0.5, 1.0, uDarkMode);
        finalColor += vec3(1.0, 0.8, 0.5) * wave * 1.5;

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
    const posLoc = gl.getAttribLocation(program, 'position');

    let animationId;
    let currentDarkVal = isDarkModeRef.current ? 1.0 : 0.0;

    const render = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      
      const time = performance.now() * 0.001;
      
      clickDataRef.current.currentIntensity += (clickDataRef.current.targetIntensity - clickDataRef.current.currentIntensity) * 0.1;
      if (clickDataRef.current.targetIntensity > 0) clickDataRef.current.targetIntensity -= 0.02;

      const targetDark = isDarkModeRef.current ? 1.0 : 0.0;
      currentDarkVal += (targetDark - currentDarkVal) * 0.05;

      gl.uniform1f(locTime, time);
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locDark, currentDarkVal);
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

  const handleProfileSave = (e) => {
    if (e) e.preventDefault();
    if (!tempName.trim()) return alert("아이디를 입력해주세요!");
    const finalImg = tempImg || myProfileImg || "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";
    localStorage.setItem("aether-name", tempName);
    localStorage.setItem("aether-profile", finalImg);
    setMyName(tempName);
    setMyProfileImg(finalImg);
    setIsEditingProfile(false); 
    if (isNotiEnabled && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };

  const handleProfileImgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempImg(reader.result);
      reader.readAsDataURL(file);
    }
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

  const deleteMsg = async (id) => {
    if (confirm("메시지를 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "rooms", currentRoom, "messages", id));
    }
  };

  useEffect(() => {
    if (!currentRoom || !myName) return;
    isFirstLoad.current = true;
    
    const hasEnteredKey = `entered_${currentRoom}_${myName}`;
    if (!sessionStorage.getItem(hasEnteredKey)) {
      addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system", text: `${myName}님이 접속했습니다.`, createdAt: serverTimestamp()
      });
      sessionStorage.setItem(hasEnteredKey, 'true');
    }

    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMsgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(allMsgs);

      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.userName !== myName && data.type === 'chat') {
            const previewText = data.text ? data.text : "사진을 보냈습니다.";
            
            if ("Notification" in window && Notification.permission === "granted") {
              if (document.hidden) {
                const noti = new Notification(`DOOLY OS: ${data.userName}`, { body: previewText, icon: data.userPhoto });
                noti.onclick = function() { window.focus(); this.close(); };
              }
            }
            setToastMsg({ name: data.userName, text: previewText, photo: data.userPhoto });
            setTimeout(() => setToastMsg(null), 4000); 
          }
        }
      });
    });

    return () => {
      if (currentRoom && myName) {
        addDoc(collection(db, "rooms", currentRoom, "messages"), {
          type: "system", text: `${myName}님이 연결을 해제했습니다.`, createdAt: serverTimestamp()
        });
        sessionStorage.removeItem(hasEnteredKey);
      }
      unsubscribe();
    };
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
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      alert("🚨 전송 실패!");
      setInput(currentInput);
    }
  };

  const activeUsers = useMemo(() => {
    const usersMap = new Map();
    messages.forEach(m => {
      if (m.type === 'chat') {
        usersMap.set(m.userName, m.userPhoto);
      } else if (m.type === 'system' && m.text.includes('접속했습니다')) {
        const name = m.text.split('님이')[0];
        if (!usersMap.has(name)) usersMap.set(name, "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png");
      }
    });
    return Array.from(usersMap, ([name, photo]) => ({ name, photo }));
  }, [messages]);

  const theme = {
    chatBg: isDarkMode ? "bg-[#0a0a0f]" : "bg-[#f4f6f9]",
    card: `transition-all duration-700 ease-in-out ${isDarkMode ? 'bg-black/40 border border-white/10 shadow-2xl' : 'bg-white/60 border border-black/5 shadow-xl'}`,
    textMain: `transition-all duration-700 ease-in-out ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`,
    textSub: `transition-all duration-700 ease-in-out ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`,
    input: `transition-all duration-700 ease-in-out ${isDarkMode ? 'bg-white/5 border border-white/10 text-white' : 'bg-white border border-black/10 text-black'}`,
    bubbleMe: "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md",
    bubbleOther: isDarkMode ? "bg-[#161720] border border-white/5 text-zinc-200" : "bg-white border border-black/5 text-zinc-800 shadow-sm",
  };

  // 🖥️ UI: 로그인 & 방 목록
  if (!currentRoom) return (
    <div className={`h-screen flex items-center justify-center p-6 relative overflow-hidden bg-black transition-colors duration-700`}>
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-auto" />
      
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        <button onClick={toggleNoti} className={`text-[10px] font-black border transition-all duration-700 ${isDarkMode ? 'border-white/10 text-white/70' : 'border-black/10 text-black/70'} px-4 py-2 rounded-full hover:bg-indigo-500 hover:text-white backdrop-blur-md`}>
          {isNotiEnabled ? "🔔 ON" : "🔕 OFF"}
        </button>
        <button onClick={openPopup} className={`text-[10px] font-black border transition-all duration-700 ${isDarkMode ? 'border-white/10 text-white/70' : 'border-black/10 text-black/70'} px-4 py-2 rounded-full hover:bg-indigo-500 hover:text-white backdrop-blur-md`}>
          ↗ POP-OUT
        </button>
      </div>

      <div className={`${theme.card} p-10 sm:p-12 w-full max-w-[420px] rounded-[40px] flex flex-col items-center gap-8 z-10 backdrop-blur-2xl animate-in zoom-in duration-500 pointer-events-auto`}>
          <div className="flex flex-col items-center w-full relative">
            <h1 className={`ULTRA_PRISM_TEXT px-4 text-[5rem] font-black italic tracking-tighter uppercase select-none mb-1 transition-all duration-700 ${isDarkMode ? 'night-mode' : 'day-mode'}`}>DOOLY</h1>
            
            {!myName ? (
              <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center space-y-6 mt-4">
                <div className={`w-24 h-24 rounded-full ${theme.input} overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all`} onClick={() => profileInputRef.current.click()}>
                  {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[10px] font-bold tracking-widest">PHOTO +</span>}
                </div>
                <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
                <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER ID" className={`w-full max-w-[380px] ${theme.input} px-6 py-4 rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold tracking-widest backdrop-blur-md`} />
                <button type="submit" className="w-full max-w-[380px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[12px] shadow-lg active:scale-95 transition-all">Start System</button>
              </form>
            ) : (
              <>
                <img src={myProfileImg} className={`transition-all duration-700 w-20 h-20 rounded-full object-cover shadow-xl border-2 ${isDarkMode ? 'border-white/20' : 'border-indigo-500/20'} mb-3`} />
                <p className={`${theme.textMain} font-black text-xl tracking-tight`}>{myName}</p>
                <div className="flex gap-4 mt-3">
                  <button onClick={toggleTheme} className={`${theme.textSub} text-[9px] font-bold uppercase tracking-widest hover:text-indigo-400 transition-all`}>{isDarkMode ? "Day Mode" : "Night Mode"}</button>
                  <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
                </div>
                
                {/* ✨ 정렬 어긋남 완전 해결: 컨테이너 여백(px-1, pr-2) 모두 제거하여 100% 동일한 폭 유지 */}
                <div className="w-full max-w-[380px] flex flex-col h-[35vh] mt-6">
                  <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE (ENTER)" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center mb-6 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold tracking-widest backdrop-blur-md`} />
                  <h2 className={`text-[10px] font-black text-left ${theme.textMain} tracking-widest uppercase mb-3 px-1 opacity-70`}>My Nodes</h2>
                  
                  {/* 스크롤바 영역(pr-2)을 없애고 버튼이 온전히 w-full을 차지하도록 수정 */}
                  <div className="flex-1 w-full overflow-y-auto space-y-2 scrollbar-hide pb-4">
                    {myRooms.map((roomName) => (
                      <div key={roomName} className="relative group w-full">
                        <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.input} px-5 py-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.98] backdrop-blur-sm`}>
                          <span className={`font-black ${theme.textMain} text-sm tracking-tight`}>{roomName}</span>
                          <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Connect</span>
                        </button>
                        <button onClick={(e) => leaveRoom(e, roomName)} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500/80 text-white rounded-full text-[9px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
      </div>
      
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        
        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055 0%, #ff5500 15%, #ffcc00 30%, #00ff66 50%, #00ccff 70%, #7700ff 85%, #ff0055 100%);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; position: relative; z-index: 1; 
          animation: prismGlow 4s linear infinite;
        }
        .ULTRA_PRISM_TEXT::before {
          content: "DOOLY"; position: absolute; left: 0; top: 0; z-index: -1;
          color: rgba(255,255,255, ${isDarkMode ? '0.3' : '0.8'});
          text-shadow: 0 4px 20px rgba(0,0,0,0.2), 0 0 40px rgba(255,255,255, ${isDarkMode ? '0.2' : '0.5'});
          backdrop-filter: blur(5px); -webkit-text-stroke: 1px rgba(255,255,255,0.5);
        }
        @keyframes prismGlow { to { background-position: 200% center; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );

  // 🖥️ UI: 채팅방 화면
  return (
    <div className={`flex flex-col h-screen ${theme.chatBg} transition-all duration-700 relative overflow-hidden`}>
      
      {/* 데이/나이트 정적 백그라운드 전환 (스무스) */}
      {isDarkMode ? (
         <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0f] to-[#0a0a0f] transition-opacity duration-700"></div>
      ) : (
         <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-[#f4f6f9] to-[#eef2f6] transition-opacity duration-700"></div>
      )}

      {/* 인앱 토스트 알림 */}
      {toastMsg && (
        <div className="absolute bottom-24 right-6 z-50 animate-in slide-in-from-bottom duration-300 pointer-events-none">
          <div className={`flex items-center gap-4 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border transition-all duration-700 ${isDarkMode ? 'bg-black/80 border-white/20' : 'bg-white/90 border-black/10'}`}>
            <img src={toastMsg.photo} className="w-10 h-10 rounded-full border border-indigo-500/30 object-cover" />
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-widest text-indigo-500`}>{toastMsg.name}</span>
              <span className={`text-xs font-bold ${theme.textMain} truncate max-w-[180px] mt-0.5`}>{toastMsg.text}</span>
            </div>
          </div>
        </div>
      )}

      <header className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/5' : 'border-black/10'} flex justify-between items-center backdrop-blur-xl z-20 bg-inherit transition-all duration-700`}>
        <div className="flex items-center gap-5">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[10px] font-bold uppercase hover:text-indigo-500 transition-colors`}>◀ EXIT</button>
          <div className="flex flex-col text-left gap-0.5">
            <h1 className="text-sm font-black italic text-indigo-500 uppercase tracking-tighter transition-colors duration-700">{currentRoom}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] ${theme.textMain} font-bold opacity-80`}>{myName}</span>
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className={`text-[9px] ${theme.textSub} font-bold uppercase underline hover:text-indigo-400`}>EDIT</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleNoti} className={`text-[9px] font-black border transition-all duration-700 ${isDarkMode ? 'border-white/10' : 'border-black/10'} ${theme.textSub} px-3 py-1.5 rounded-full hover:bg-zinc-500 hover:text-white`}>
            {isNotiEnabled ? "🔔 ON" : "🔕 OFF"}
          </button>
          <button onClick={openPopup} className={`text-[9px] font-black border transition-all duration-700 ${isDarkMode ? 'border-indigo-500/50 text-indigo-400' : 'border-indigo-500/50 text-indigo-600'} px-3 py-1.5 rounded-full hover:bg-indigo-500 hover:text-white`}>
            ↗ POP-OUT
          </button>
          <button onClick={() => setShowUserList(!showUserList)} className={`text-[9px] font-black border transition-all duration-700 ${isDarkMode ? 'border-indigo-500/30 text-indigo-400' : 'border-indigo-500/50 text-indigo-600'} px-3 py-1.5 rounded-full hover:bg-indigo-500 hover:text-white`}>
            👥 USERS ({activeUsers.length})
          </button>
          <button onClick={toggleTheme} className={`text-[9px] font-black border transition-all duration-700 ${isDarkMode ? 'border-white/10' : 'border-black/10'} ${theme.textSub} px-3 py-1.5 rounded-full hover:bg-zinc-500 hover:text-white`}>
            {isDarkMode ? "DAY" : "NIGHT"}
          </button>
        </div>
      </header>

      {showUserList && (
        <div className={`absolute top-[70px] right-0 w-64 p-4 transition-all duration-700 ${isDarkMode ? 'bg-black/80 border-white/10' : 'bg-white/90 border-black/10'} backdrop-blur-2xl border-b border-l shadow-2xl animate-in slide-in-from-right duration-300 z-30 max-h-[50vh] overflow-y-auto rounded-bl-3xl`}>
          <h3 className={`text-[10px] font-black ${theme.textSub} tracking-widest uppercase mb-4 pl-2`}>Participants</h3>
          <div className="flex flex-col gap-3">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-500/10 transition-colors">
                <img src={user.photo} className="transition-all duration-700 w-8 h-8 rounded-full object-cover border border-zinc-500/20" />
                <span className={`text-xs font-bold ${theme.textMain}`}>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className={`absolute top-[70px] left-0 w-full p-6 transition-all duration-700 ${isDarkMode ? 'bg-black/60' : 'bg-white/80'} backdrop-blur-2xl border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'} animate-in slide-in-from-top duration-300 z-30`}>
          <form onSubmit={handleProfileSave} className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden cursor-pointer border border-zinc-500 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="transition-all duration-700 w-full h-full object-cover opacity-60 group-hover:opacity-30" />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-white transition-opacity duration-700">EDIT</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`flex-1 ${theme.input} px-4 py-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500/50`} placeholder="NEW ID" />
            <button type="submit" className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">SAVE</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className={`${theme.textSub} text-[10px] font-bold px-2 hover:text-red-400`}>CANCEL</button>
          </form>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide z-10 relative">
        {messages.map((m) => (
          m.type === "system" ? (
             <div key={m.id} className="flex justify-center my-2">
                <span className={`${theme.textSub} text-[10px] font-medium tracking-tight px-3 py-1 bg-transparent opacity-60`}>{m.text}</span>
             </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className={`transition-all duration-700 w-8 h-8 rounded-full shrink-0 object-cover border ${isDarkMode ? 'border-white/10' : 'border-black/5'} shadow-sm`} />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className={`${theme.textSub} text-[9px] font-bold mb-1.5 px-1 uppercase opacity-80 tracking-widest`}>{m.userName}</span>
                <div className={`group relative p-4 rounded-[20px] text-[13px] leading-relaxed shadow-sm transition-all duration-700 ${m.userName === myName ? theme.bubbleMe + ' rounded-tr-[4px]' : `${theme.bubbleOther} rounded-tl-[4px]`}`}>
                  {m.image && <img src={m.image} className="transition-all duration-700 w-full rounded-xl mb-3 border border-white/5" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.userName === myName && (
                    <button onClick={() => deleteMsg(m.id)} className={`absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 text-[10px] font-bold transition-all`}>DEL</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className={`p-5 border-t ${isDarkMode ? 'border-white/5' : 'border-black/10'} z-20 backdrop-blur-xl bg-inherit transition-all duration-700`}>
        <form onSubmit={sendMessage} className={`max-w-5xl mx-auto flex items-center gap-3 ${theme.input} p-1.5 rounded-2xl focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`w-10 h-10 flex items-center justify-center rounded-xl ${theme.textSub} hover:bg-zinc-500/20 transition-all`}>
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-2 text-sm ${theme.textMain} outline-none font-medium`} />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}
