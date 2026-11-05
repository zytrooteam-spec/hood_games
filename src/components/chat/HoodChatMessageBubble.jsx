'use client';

import React, { useState } from 'react';

export default function HoodChatMessageBubble({ message, isMine, onPreviewImage }) {
  const [expanded, setExpanded] = useState(false);
  const hasImage = Boolean(message?.imageUrl);

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
      <span className="text-[9.5px] text-gray-500 mb-0.5 px-1">
        {isMine ? 'You' : message.username || 'Staff'} •{' '}
        {message.createdAt
          ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Now'}
      </span>
      <div
        className={`max-w-[min(100%,320px)] px-3 py-2 rounded-2xl text-xs font-medium space-y-2 ${
          isMine
            ? 'btn-hood-green text-white rounded-br-none'
            : 'bg-[#12244c] text-gray-100 border border-[#1a3363] rounded-bl-none'
        }`}
      >
        {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
        {hasImage ? (
          <button
            type="button"
            onClick={() => (onPreviewImage ? onPreviewImage(message.imageUrl) : setExpanded(!expanded))}
            className="block w-full text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="Chat attachment"
              className={`rounded-xl border border-white/20 object-cover ${expanded ? 'max-w-full' : 'max-h-40 w-full'}`}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
