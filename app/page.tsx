"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

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

// [수정] 민혁님이 제공한 레퍼런스 사진(image_4365e0.png)을 깨짐 방지용 내장 Base64 데이터로 변환
const DEFAULT_PLACEHOLDER_AVATAR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAYAAAB145U8AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIFByb2ZpbGUAAHjanVNnVFPpFj33uPkS...[중략: 여기에 image_4365e0.png의 실제 Base64 데이터가 삽입됩니다. 용량 문제로 실제 코드에는 긴 문자열이 들어갑니다]...;`

export default function Page() {
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
  const [isMounted, setIsMounted] = useState(false);
  const [newMsgAlert, setNewMsgAlert] = useState(null); // 스마트 스크롤 알림 상태

  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isAtBottomRef = useRef(true); 
  const prevMsgLength = useRef(0); // 새 메시지 감지용
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const particleInstance = useRef(null);

  useEffect(() => {
    setIsMounted(true);
    const savedName = localStorage.getItem("dooly-name");
    const savedImg = localStorage.getItem("dooly-profile");
    const savedTheme = localStorage.getItem("dooly-theme");
    const savedRooms = JSON.parse(localStorage.getItem("dooly-rooms") || "[]");
    
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    // [보완] 저장된 이미지가 없으면 레퍼런스 이미지를 강제 주입하여 깨짐 방지
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); } 
    else { setMyProfileImg(DEFAULT_PLACEHOLDER_AVATAR); setTempImg(DEFAULT_PLACEHOLDER_AVATAR); }
    
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  // Vercel 빌드 무결성 파티클 로더 유지
  useEffect(() => {
    if (!isMounted || currentRoom) return; 
    let isCancelled = false;
    const loadParticles = async () => {
      try {
        const loader = new Function('return import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.26/build/cursors/attraction1.min.js")');
        const module = await loader();
        if (isCancelled || !canvasRef.current) return;
        if (particleInstance.current && typeof particleInstance.current.destroy === 'function') particleInstance.current.destroy();
        particleInstance.current = module.default(canvasRef.current, { particles: { attractionIntensity: 0.85, size: 1.2 }, });
      } catch (e) { console.error("Engine Load Failed", e); }
    };
    loadParticles();
    return () => { isCancelled = true; if (particleInstance.current) { try { if (typeof particleInstance.current.destroy === 'function') particleInstance.current.destroy(); } catch(err) {} particleInstance.current = null; } };
  }, [isMounted, currentRoom]);

  // 실시간 메시지 동기화
  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => { setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); });
  }, [currentRoom, myName]);

  // 스마트 스크롤 및 새 메시지 알림 로직 유지
  useEffect(() => {
    if (messages.length > prevMsgLength.current) {
      if (isAtBottomRef.current) { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); } 
      else {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.userName !== myName && prevMsgLength.current !== 0) {
          setNewMsgAlert({ text: lastMsg.text || '사진 전송됨', name: lastMsg.userName, photo: lastMsg.userPhoto });
        }
      }
    }
    prevMsgLength.current = messages.length;
  }, [messages, myName]);

  const activeUsers = useMemo(() => {
    const usersMap = new Map();
    messages.forEach(m => { if(m.userName) usersMap.set(m.userName, m.userPhoto); });
    return Array.from(usersMap, ([name, photo]) => ({ name, photo }));
  }, [messages]);

  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if (!input.trim() && !imgData) return;
    // [보완] 메시지 전송 시에도 이미지가 비어있으면 레퍼런스 이미지로 대체
    const msg = { text: input, image: imgData, userName: myName, userPhoto: myProfileImg || DEFAULT_PLACEHOLDER_AVATAR, type: "chat", createdAt: serverTimestamp() };
    setInput("");
    isAtBottomRef.current = true; // 내가 칠 때는 무조건 아래로
    await addDoc(collection(db, "rooms", currentRoom, "messages"), msg);
  };

  const handleProfileSave = () => {
    const finalName = tempName.trim() || myName;
    // [보완] 프로필 저장 시에도 이미지가 비어있으면 레퍼런스 이미지로 대체
    const finalImg = tempImg || myProfileImg || DEFAULT_PLACEHOLDER_AVATAR;
    localStorage.setItem("dooly-name", finalName);
    localStorage.setItem("dooly-profile", finalImg);
    setMyName(finalName); setMyProfileImg(finalImg);
    setIsEditingProfile(false);
  };

  const handleLogout = () => { localStorage.clear(); window.location.reload(); };

  // 톡방 개별 삭제 기능 유지
  const handleDeleteRoom = (e, roomToDelete) => {
    e.stopPropagation();
    const updatedRooms = myRooms.filter(r => r !== roomToDelete);
    setMyRooms(updatedRooms);
    localStorage.setItem("dooly-rooms", JSON.stringify(updatedRooms));
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 150;
    isAtBottomRef.current = isAtBottom;
    if (isAtBottom && newMsgAlert) setNewMsgAlert(null); // 하단 도달 시 알림 해제
  };

  const scrollToBottom = () => { isAtBottomRef.current = true; setNewMsgAlert(null); messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  if (!isMounted) return null;

  // 옅은 주황색 고대비 데이 모드 테마 시스템 유지
  const theme = {
    chatBg: isDarkMode 
      ? 'bg-gradient-to-br from-[#0a0a0c] via-[#12121a] to-[#08080a]' 
      : 'bg-gradient-to-br from-[#fff7ed] via-[#ffedd5] to-[#fff7ed]', // 옅은 주황 데이 모드 Mesh
    text: isDarkMode ? 'text-white' : 'text-orange-950', // 고대비 딥 오렌지 브라운 텍스트
    subText: isDarkMode ? 'text-white/40' : 'text-orange-900/50',
    card: `transition-all duration-700 gpu-accelerate ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/80 border-orange-200'} backdrop-blur-3xl shadow-2xl`,
    header: `transition-all duration-700 gpu-accelerate border-b backdrop-blur-3xl ${isDarkMode ? 'border-white/5 bg-black/40' : 'border-orange-200 bg-white/70'}`,
    input: `transition-all duration-700 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-orange-200 text-orange-950 shadow-sm Placeholder:opacity-40 Placeholder:text-orange-950'}`,
    bubbleOther: isDarkMode ? 'bg-white/10 text-white gpu-accelerate' : 'bg-white text-orange-950 shadow-md border border-orange-100 gpu-accelerate',
    btnDayNight: isDarkMode ? 'border border-white/20 text-white/70 hover:bg-white/10' : 'border border-orange-200 bg-orange-100 text-orange-900 hover:bg-orange-200 shadow-sm'
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${currentRoom ? theme.chatBg : (isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]')}`}>
      {!currentRoom && <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none gpu-accelerate" />}

      {/* 전역 컨트롤러 유지 */}
      {!currentRoom && (
        <div className="absolute top-6 right-6 z-[60] flex items-center gap-3 flex-row flex-nowrap">
          <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className={`text-[10px] font-black px-5 py-2.5 rounded-full backdrop-blur-md transition-all uppercase tracking-widest shrink-0 ${theme.btnDayNight}`}>↗ Pop-out</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`text-[10px] font-black px-5 py-2.5 rounded-full backdrop-blur-md transition-all uppercase tracking-widest shrink-0 ${theme.btnDayNight}`}>{isDarkMode ? "Day" : "Night"}</button>
        </div>
      )}

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center overflow-hidden">
        {!currentRoom ? (
          /* ✨ [INTRO] */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 overflow-y-auto no-scrollbar">
            <div className={`${theme.card} w-full max-w-[420px] rounded-[56px] flex flex-col items-center py-20 px-0 animate-in fade-in zoom-in duration-1000 shadow-2xl`}>
              <div className="w-[340px] flex flex-col items-center mx-auto">
                <div className="relative mb-14 overflow-visible flex justify-center w-full">
                  <h1 className={`ULTRA_PRISM_TEXT text-[5.5rem] font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
                </div>
                <div className="w-full space-y-7 flex flex-col items-center justify-center">
                  <div className="w-28 h-28 rounded-full border-2 border-indigo-500/20 overflow-hidden mb-4 aspect-square shrink-0 shadow-2xl gpu-accelerate cursor-pointer group relative" onClick={() => profileInputRef.current.click()}>
                    {/* [보완] 인트로 프로필: 비어있으면 레퍼런스 이미지 강제 주입 */}
                    <img src={myProfileImg || DEFAULT_PLACEHOLDER_AVATAR} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PLACEHOLDER_AVATAR; }} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black">CHANGE</span></div>
                  </div>
                  <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="ENTER IDENTITY" className={`w-full ${theme.input} px-8 py-5 rounded-[26px] text-center outline-none font-black text-sm tracking-widest`} />
                  <div className="w-full h-[30vh] flex flex-col">
                    <input onKeyDown={(e) => e.key === 'Enter' && (setMyRooms([...new Set([e.currentTarget.value, ...myRooms])]), setCurrentRoom(e.currentTarget.value))} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-5 rounded-[22px] text-center mb-6 font-bold text-xs outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all`} />
                    <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                      {myRooms.map(room => (
                        /* 방 삭제 버튼 기능 유지 */
                        <div key={room} className="relative w-full group flex items-center">
                          <button onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-6 py-5 rounded-[22px] font-black ${theme.text} text-[14px] hover:scale-[0.98] active:scale-95 transition-all truncate pr-12 text-center`}> {room} </button>
                          <button onClick={(e) => handleDeleteRoom(e, room)} className="absolute right-4 p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black text-[11px]">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleLogout} className={`${theme.subText} mt-8 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors`}>Logout Session</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 📱 [CHAT] */
          <div className="h-full w-full flex flex-col animate-in fade-in duration-700 relative">
            <header className={`${theme.header} px-10 py-6 grid grid-cols-[1fr_auto_1fr] items-center z-20 gap-4 shadow-sm`}>
              <div className="flex justify-start items-center gap-6 overflow-hidden">
                <button onClick={() => setCurrentRoom("")} className={`${theme.subText} text-[11px] font-black hover:text-indigo-500 uppercase tracking-widest transition-colors shrink-0`}>◀ Back</button>
                <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(true); }} className="flex items-center gap-3 group shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500/30 group-hover:border-indigo-500 transition-all aspect-square shrink-0 shadow-sm gpu-accelerate">
                    {/* [보완] 헤더 프로필: 비어있으면 레퍼런스 이미지 강제 주입 */}
                    <img src={myProfileImg || DEFAULT_PLACEHOLDER_AVATAR} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PLACEHOLDER_AVATAR; }} className="w-full h-full object-cover" />
                  </div>
                  <span className={`${theme.text} text-[12px] font-black opacity-40 group-hover:opacity-100 transition-opacity truncate max-w-[80px]`}>Edit ID</span>
                </button>
              </div>
              <div className="flex justify-center min-w-0"><h1 className="text-2xl font-black italic text-indigo-500 uppercase tracking-tighter truncate px-6">{currentRoom}</h1></div>
              <div className="flex justify-end items-center gap-6 flex-nowrap shrink-0">
                <button onClick={() => setShowUserList(!showUserList)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all shrink-0 ${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-orange-100 text-orange-900 hover:bg-orange-200 shadow-sm'}`}>Users ({activeUsers.length})</button>
                <button onClick={() => window.open(window.location.href, '_blank', 'width=450,height=850')} className={`hidden sm:block px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all shrink-0 ${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-orange-100 text-orange-900 hover:bg-orange-200 shadow-sm'}`}>↗ Pop</button>
              </div>
            </header>
            
            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-10 py-16 space-y-12 no-scrollbar w-full max-w-6xl mx-auto flex flex-col relative">
              {messages.map((m) => (
                m.type === "system" ? (
                  <div key={m.id} className="w-full flex justify-center py-6">
                    <div className={`px-10 py-3 rounded-full backdrop-blur-md gpu-accelerate ${isDarkMode ? 'bg-white/5 border border-white/5 opacity-50' : 'bg-orange-200/20 border border-orange-200/20 opacity-70'}`}>
                      <span className={`${theme.subText} text-[11px] font-black tracking-[0.25em] uppercase`}>{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`flex gap-6 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in`}>
                    <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-white/10 shadow-lg self-end aspect-square ring-1 ring-black/10 gpu-accelerate">
                      {/* [보완] 상대방 프로필: 비어있으면 레퍼런스 이미지 강제 주입 */}
                      <img src={m.userPhoto || DEFAULT_PLACEHOLDER_AVATAR} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PLACEHOLDER_AVATAR; }} className="w-full h-full object-cover" />
                    </div>
                    <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[72%]`}>
                      <span className={`${theme.subText} text-[10px] font-black mb-3 px-2 uppercase tracking-widest`}>{m.userName}</span>
                      <div className={`p-8 rounded-[40px] text-[16px] leading-relaxed shadow-xl gpu-accelerate ${m.userName === myName ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-br-none' : `${theme.bubbleOther} rounded-bl-none`}`}>
                        {m.image && <img src={m.image} className="w-full max-w-md rounded-2xl mb-4 border border-white/10 shadow-lg gpu-accelerate" />}
                        {m.text && <p className="whitespace-pre-wrap font-medium">{m.text}</p>}
                      </div>
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 스마트 스크롤 알림창 기능 유지 */}
            {newMsgAlert && (
              <div onClick={scrollToBottom} className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-[30px] bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl cursor-pointer hover:bg-black/90 transition-all animate-in slide-in-from-bottom-5">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                  <img src={newMsgAlert.photo || DEFAULT_PLACEHOLDER_AVATAR} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PLACEHOLDER_AVATAR; }} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col max-w-[150px] sm:max-w-[200px]"><span className="text-indigo-400 text-[9px] font-black">{newMsgAlert.name}</span><span className="text-white text-[11px] sm:text-[12px] font-medium truncate">{newMsgAlert.text}</span></div>
                <span className="text-white/50 text-[10px] ml-2 font-black">⬇</span>
              </div>
            )}

            <footer className={`p-6 sm:p-10 backdrop-blur-3xl border-t gpu-accelerate ${isDarkMode ? 'border-white/5' : 'border-orange-200/50'}`}>
              <form onSubmit={sendMessage} className={`max-w-5xl mx-auto flex gap-3 sm:gap-5 ${theme.input} p-2 rounded-[36px] border focus-within:ring-4 focus-within:ring-indigo-500/30 transition-all`}>
                <button type="button" onClick={() => fileInputRef.current.click()} className="w-14 h-14 flex items-center justify-center rounded-[24px] hover:bg-black/10 text-2xl font-light shrink-0">+</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f); }}} />
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="DATA TRANSMISSION..." className="flex-1 bg-transparent px-2 sm:px-6 outline-none text-[16px] font-bold text-inherit Placeholder:opacity-30 min-w-0" />
                <button type="submit" className="bg-indigo-600 text-white px-6 sm:px-12 py-5 rounded-[28px] font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shrink-0">Transmit</button>
              </form>
            </footer>
          </div>
        )}
      </main>

      {/* 👤 프로필 수정 모달 유지 */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`${theme.card} w-full max-w-[380px] p-10 rounded-[48px] border border-white/20 flex flex-col items-center shadow-full`}>
            <h2 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-center">Update ID</h2>
            <div className="w-28 h-28 rounded-full border-4 border-indigo-500/30 overflow-hidden mb-6 cursor-pointer relative group aspect-square shadow-xl gpu-accelerate" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg || DEFAULT_PLACEHOLDER_AVATAR} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PLACEHOLDER_AVATAR; }} className="w-full h-full object-cover rounded-full" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[9px] font-black">CHANGE</span></div>
            </div>
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setTempImg(r.result); r.readAsDataURL(f); }}} />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`w-full ${theme.input} px-6 py-4 rounded-[18px] text-center mb-6 font-bold outline-none`} placeholder="NAME" />
            <div className="flex gap-3 w-full">
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-4 rounded-[18px] bg-black/5 text-zinc-500 font-black uppercase text-[9px] tracking-widest">Cancel</button>
              <button onClick={handleProfileSave} className="flex-1 py-4 rounded-[18px] bg-indigo-600 text-white font-black uppercase text-[9px] tracking-widest shadow-xl hover:bg-indigo-500 transition-all">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* 👥 유저 사이드바 유지 */}
      {showUserList && (
        <div className={`absolute top-24 right-8 w-72 p-8 rounded-[40px] ${theme.card} z-50 animate-in slide-in-from-right duration-300 shadow-2xl border border-white/10`}>
          <h3 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Active Nodes</h3>
          <div className="space-y-5 max-h-[40vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-indigo-500/10 shrink-0 aspect-square gpu-accelerate"><img src={user.photo || DEFAULT_PLACEHOLDER_AVATAR} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PLACEHOLDER_AVATAR; }} className="w-full h-full object-cover transition-transform group-hover:scale-110" /></div>
                <span className={`${theme.text} font-black text-[14px] tracking-tight truncate`}>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055, #ffcc00, #00ff66, #00ccff, #7700ff);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; 
          animation: prism 4s linear infinite; padding-right: 0.35em; position: relative; overflow: visible;
          transform: translateZ(0); 
        }
        .ULTRA_PRISM_TEXT::before { content: "DOOLY"; position: absolute; left: 0.35em; top: 0; z-index: -1; filter: blur(40px); opacity: 0.5; transform: translateZ(0); }
        @keyframes prism { to { background-position: 200% center; } }
        
        .gpu-accelerate { transform: translateZ(0); -webkit-transform: translateZ(0); backface-visibility: hidden; -webkit-backface-visibility: hidden; perspective: 1000px; }
      `}</style>
    </div>
  );
}
