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
const genAI = new GoogleGenerativeAI("AIzaSyCSFPBsziw2QX5eAZoUYtMKGeF1XaVfccI");

export default function AetherFinalOS() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. 메시지 실시간 로드
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(newMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => signOut(auth);

  const sendMessage = async (e, img = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !img) || !user) return;
    await addDoc(collection(db, "messages"), {
      text: input,
      image: img,
      uid: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      createdAt: serverTimestamp()
    });
    setInput("");
  };

  const deleteMsg = async (id) => {
    if (confirm("이 메시지를 삭제할까요?")) {
      await deleteDoc(doc(db, "messages", id));
    }
  };

  const handleAiSummary = async () => {
    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const context = messages.slice(-15).map(m => `${m.userName}: ${m.text}`).join("\n");
      const result = await model.generateContent(`수석 디자이너를 위한 대화 요약: \n${context}`);
      alert("🤖 AI 요약:\n" + (await result.response).text());
    } catch (e) { alert("AI 요약 중..."); }
    setIsAiLoading(false);
  };

  if (!user) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-4xl font-black italic text-blue-500 mb-2">AETHER LAB.</h1>
        <p className="text-zinc-500 text-sm mb-8 uppercase tracking-[0.3em]">Design Intelligence Network</p>
        <button onClick={handleLogin} className="bg-white text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-blue-500/10">
          <img src="https://www.gstatic.com/firebase/anonymous/google.png" className="w-5" />
          Google 계정으로 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white overflow-hidden">
      <header className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <img src={user.photoURL} className="w-8 h-8 rounded-full border border-blue-500/30" />
          <div>
            <h1 className="text-sm font-black italic text-blue-500">AETHER OS.</h1>
            <p className="text-[9px] text-zinc-500 font-bold">{user.displayName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAiSummary} className="bg-blue-600/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 text-[10px] font-bold">AI</button>
          <button onClick={handleLogout} className="bg-zinc-900 text-zinc-500 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold">LOGOUT</button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.uid === user.uid ? 'flex-row-reverse' : ''}`}>
            <img src={m.userPhoto} className="w-8 h-8 rounded-full mt-1 shrink-0" />
            <div className={`flex flex-col ${m.uid === user.uid ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-zinc-600 font-bold mb-1">{m.userName}</span>
              <div className={`group relative p-3 rounded-2xl text-sm ${m.uid === user.uid ? 'bg-blue-600 rounded-tr-none' : 'bg-zinc-900 border border-zinc-800 rounded-tl-none'}`}>
                {m.image && <img src={m.image} className="max-w-[200px] rounded-lg mb-2" />}
                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                
                {/* 삭제 버튼 (내가 쓴 글에만 마우스 올리면 등장) */}
                {m.uid === user.uid && (
                  <button onClick={() => deleteMsg(m.id)} className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all text-xs">삭제</button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/60 border-t border-zinc-900/50 backdrop-blur-xl">
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
