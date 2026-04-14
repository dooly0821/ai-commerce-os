"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
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
const genAI = new GoogleGenerativeAI("AIzaSyCSFPBsziw2QX5eAZoUYtMKGeF1XaVfccI");

export default function AetherProApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [myDisplayName, setMyDisplayName] = useState("");
  const [isPopup, setIsPopup] = useState(false); // 팝업 모드 상태
  
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedName = localStorage.getItem("aether-username");
    if (savedName) {
      setMyDisplayName(savedName);
    } else {
      const name = prompt("사용하실 이름을 입력해주세요!");
      const finalName = name || "익명";
      setMyDisplayName(finalName);
      localStorage.setItem("aether-username", finalName);
    }

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const container = scrollRef.current;
      if (container) {
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
        const lastMessage = newMessages[newMessages.length - 1];
        setMessages(newMessages);
        if (lastMessage?.user === myDisplayName || isAtBottom) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      } else {
        setMessages(newMessages);
      }
    });
    return () => unsubscribe();
  }, [myDisplayName]);

  // 메시지 전송 로직 (텍스트 + 이미지)
  const sendMessage = async (e, imageUrl = null) => {
    if (e) e.preventDefault();
    if (!input.trim() && !imageUrl) return;

    try {
      await addDoc(collection(db, "messages"), {
        text: input,
        image: imageUrl,
        user: myDisplayName,
        createdAt: serverTimestamp()
      });
      setInput("");
    } catch (err) { console.error(err); }
  };

  // 이미지 파일 선택 핸들러
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => sendMessage(null, reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAiSummary = async () => {
    if (messages.length === 0) return alert("데이터가 없습니다.");
    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const conversation = messages.slice(-20).map(m => `${m.user}: ${m.text}`).join("\n");
      const prompt = `너는 수석 디자이너의 AI 비서야. 다음 대화를 분석해서 핵심 의사결정 사항과 디자인 피드백을 3줄로 요약해줘: \n\n ${conversation}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      alert("🤖 AI DESIGN BRIEFING:\n\n" + response.text());
    } catch (err) { alert("AI 연결 중..."); }
    setIsAiLoading(false);
  };

  return (
    <div className={`flex flex-col bg-[#050505] text-white font-sans transition-all duration-500 shadow-2xl ${
      isPopup 
      ? 'fixed bottom-5 right-5 w-[350px] h-[500px] rounded-3xl border border-blue-500/30 z-[9999]' 
      : 'h-screen w-full'
    }`}>
      {/* HEADER */}
      <header className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
        <div>
          <h1 className={`font-black italic tracking-tighter text-blue-500 ${isPopup ? 'text-sm' : 'text-xl'}`}>AETHER PRO.</h1>
          <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{myDisplayName}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={handleAiSummary} className="bg-blue-600/10 text-blue-400 p-2 rounded-lg border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">
            <span className="text-[10px] font-bold">AI</span>
          </button>
          <button onClick={() => setIsPopup(!isPopup)} className="bg-zinc-900 text-zinc-400 p-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-all">
            <span className="text-[10px] font-bold">{isPopup ? "FULL" : "POPUP"}</span>
          </button>
        </div>
      </header>

      {/* CHAT AREA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.user === myDisplayName ? 'items-end' : 'items-start'}`}>
            <span className="text-[8px] text-zinc-600 mb-1 font-bold px-1 uppercase tracking-tighter">{m.user}</span>
            <div className={`group relative transition-all duration-300 ${
              m.user === myDisplayName 
              ? 'bg-blue-600 rounded-2xl rounded-tr-none shadow-lg shadow-blue-500/10' 
              : 'bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none'
            }`}>
              {m.image && (
                <img src={m.image} alt="shared" className="max-w-[200px] rounded-xl mb-2 border border-black/20" />
              )}
              {m.text && <p className="px-4 py-2 text-sm leading-relaxed">{m.text}</p>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-4 bg-black/40 border-t border-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2 max-w-4xl mx-auto bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50">
          <button 
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-all"
          >
            <span className="text-xl">+</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder={isPopup ? "Msg..." : "아이디어를 공유하세요..."} 
            className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none" 
          />
          <button type="submit" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-500/20">
            SEND
          </button>
        </div>
      </form>
    </div>
  );
}
