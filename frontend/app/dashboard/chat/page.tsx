"use client";

import ChatWindow from "@/components/chat-window";
import isAuth from "@/utils/isAuth";
import React from "react";

const Chat = () => {
  return (
    <div>
      <ChatWindow />
    </div>
  );
};

export default isAuth(Chat);
