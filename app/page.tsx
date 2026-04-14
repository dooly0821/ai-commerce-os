"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const firebaseConfig = {
  apiKey: "AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc",
  authDomain: "dooly-66736.firebaseapp.com",
  projectId: "dooly-66736",
  storageBucket: "dooly-66736.firebasestorage.app",
  messagingSenderId: "969360298710",
  appId: "1:969360298710:web:1c09f676b9d784a0bdaf77"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// 민혁님 키 그대로 유지
const genAI = new GoogleGenerativeAI("AIzaSyCSFPBsziw2QX5eAZoUYtMKGeF1XaVfccI");

export default function AetherOS_Pro_Final() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // ✨ 스마트 스크롤 제어용
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const isAtBottom = useRef(true); 

  // ✨ 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // ✨ 채팅방 입장 및 메시지 로드 (입장 문구 도배 해결)
  useEffect(() => {
    if (!currentRoom || !user) return;

    // sessionStorage를 써서 브라우저 세션당 한 번만 입장 문구 전송
    const hasEnteredKey = `entered_${currentRoom}_${user.uid}`;
    const hasEntered = sessionStorage.getItem(hasEnteredKey);

    if (!hasEntered) {
      addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system",
        text: `${user.displayName}님이 입장하셨습니다.`,
        createdAt: serverTimestamp()
      });
      sessionStorage.setItem(hasEnteredKey, 'true');
    }

    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const container = scrollRef.current;
      if (container) {
        const isCurrentlyAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
        setMessages(newMsgs);
        if (isCurrentlyAtBottom) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      } else {
        setMessages(newMsgs);
      }
    });
    return () => unsubscribe();
  }, [currentRoom, user]);

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => { signOut(auth); setCurrentRoom(""); sessionStorage.clear(); };

  const sendMessage = async (e, img = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !img) || !user) return;
    
    await addDoc(collection(db, "rooms", currentRoom, "messages"), {
      text: input,
      image: img,
      uid: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      type: "chat",
      createdAt: serverTimestamp()
    });
    setInput("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const deleteMsg = async (id) => {
    if (confirm("삭제할까요?")) await deleteDoc(doc(db, "rooms", currentRoom, "messages", id));
  };

  const handleAiSummary = async () => {
    if (messages.length === 0) return alert("대화 내용이 없습니다.");
    
    // 안전장치: 실제 채팅 메시지가 있는지 확인
    const chatMessages = messages.filter(m => m.type === "chat");
    if (chatMessages.length === 0) return alert("AI가 요약할 실제 대화 내용이 아직 없습니다. 대화를 좀 더 나눠보세요!");

    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const context = chatMessages.slice(-20).map(m => `${m.userName}: ${m.text}`).join("\n");
      const result = await model.generateContent(`수석 디자이너의 관점에서 이 프로젝트 대화를 분석하고 3줄로 요약해줘: \n${context}`);
      alert("🤖 AI BRIEFING:\n\n" + (await result.response).text());
    } catch (e) { alert("AI 연결에 실패했습니다. CORS 문제이거나 API 키 한도일 수 있습니다."); }
    setIsAiLoading(false);
  };

  // ✨ 대안: 전용 팝업창 모드 새로 열기
  const handlePopupMode = () => {
    const width = 360;
    const height = 600;
    const left = window.screen.width - width - 20; 
    const top = window.screen.height - height - 100;
    window.open(window.location.href, '_blank', `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,scrollbars=yes`);
  };

  if (!user) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <h1 className="text-4xl font-black italic text-blue-500 mb-8tracking-tighter">AETHER OS.</h1>
      <button onClick={handleLogin} className="bg-white text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 active:scale-95 shadow-2xl shadow-blue-500/10 hover:scale-105 transition-all">
        Google 계정으로 시작하기
      </button>
    </div>
  );

  if (!currentRoom) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <div className="w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-center text-zinc-400 mb-6">PROJECT ROOM</h2>
        <input 
          onKeyDown={(e) => e.key === 'Enter' && setCurrentRoom(e.currentTarget.value)}
          placeholder="방 이름을 입력하세요 (예: 디자인-A)" 
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
        />
        <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">Enter를 누르면 방이 생성되거나 입장합니다</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-white overflow-hidden">
      <header className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className="text-zinc-500 hover:text-white text-xs">◀ 나가기</button>
          <div>
            <h1 className="text-xs font-black italic text-blue-500 uppercase">{currentRoom} OS.</h1>
            <p className="text-[9px] text-zinc-600">{user.displayName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAiSummary} className="bg-blue-600/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 text-[10px] font-bold">AI 요약</button>
          <button onClick={handlePopupMode} className="bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold">POPUP</button>
          <button onClick={handleLogout} className="bg-zinc-900 text-zinc-600 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px]">로그아웃</button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className="bg-zinc-900/50 text-zinc-600 text-[10px] px-3 py-1 rounded-full border border-zinc-800/50">{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.uid === user.uid ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className="w-7 h-7 rounded-full mt-1 opacity-80 shrink-0" alt="profile" />
              <div className={`flex flex-col ${m.uid === user.uid ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-zinc-600 font-bold mb-1 uppercase tracking-wider px-1">{m.userName}</span>
                <div className={`group relative p-3.5 rounded-2xl text-[13px] ${
                  m.uid === user.uid ? 'bg-blue-600 rounded-tr-none' : 'bg-zinc-900 border border-zinc-800 rounded-tl-none'
                }`}>
                  {m.image && <img src={m.image} className="max-w-[220px] rounded-xl mb-2" alt="upload" />}
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  {m.uid === user.uid && (
                    <button onClick={() => deleteMsg(m.id)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 text-[10px]">삭제</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/60 border-t border-zinc-900/30 shrink-0">
        <div className="flex items-center gap-2 max-w-5xl mx-auto bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl">+</button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files[0];
            if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); }
          }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="메시지 입력..." className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none" />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs">SEND</button>
        </div>
      </form>
    </div>
  );
}
