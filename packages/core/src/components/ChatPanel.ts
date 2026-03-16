import React, { useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  channel: string;
  sender: string;
  text: string;
  color?: string;
  timestamp?: number;
}

export interface ChatChannel {
  id: string;
  name: string;
  color: string;
}

export interface ChatPanelProps {
  channels: ChatChannel[];
  messages: ChatMessage[];
  width?: number;
  height?: number;
  onSend?: (channel: string, text: string) => void;
}

export function ChatPanel(props: ChatPanelProps) {
  const { channels, messages, width = 400, height = 300, onSend } = props;
  const [activeChannel, setActiveChannel] = useState(channels[0]?.id ?? '');
  const [inputText, setInputText] = useState('');

  const filtered = activeChannel === 'all'
    ? messages
    : messages.filter(m => m.channel === activeChannel);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    onSend?.(activeChannel, inputText);
    setInputText('');
  }, [activeChannel, inputText, onSend]);

  const tabH = 32;
  const inputH = 36;
  const msgH = Math.max(0, height - tabH - inputH - 8);

  const channelTabW = channels.length > 0 ? Math.floor((width - 8) / channels.length) : width;

  // Tabs
  const tabs = channels.map(ch =>
    React.createElement('ui-view', {
      key: ch.id,
      width: channelTabW, height: tabH,
      tint: ch.id === activeChannel ? '#334466' : '#00000000',
      alignItems: 'center', justifyContent: 'center',
      onClick: () => setActiveChannel(ch.id),
    },
      React.createElement('ui-text', {
        text: ch.name, fontSize: 12,
        color: ch.id === activeChannel ? ch.color : '#778da9',
        width: channelTabW, height: tabH,
        align: 'center',
      })
    )
  );

  // Messages
  const msgElements = filtered.slice(-20).map(msg => {
    const ch = channels.find(c => c.id === msg.channel);
    return React.createElement('ui-view', {
      key: msg.id,
      width: width - 16, height: 22,
      flexDirection: 'row',
    },
      React.createElement('ui-text', {
        text: `[${msg.sender}]`, fontSize: 12,
        color: ch?.color ?? '#778da9',
        width: 80, height: 22,
      }),
      React.createElement('ui-text', {
        text: msg.text, fontSize: 12,
        color: msg.color ?? '#e0e1dd',
        width: width - 100, height: 22,
      })
    );
  });

  return React.createElement('ui-view', {
    width, height,
    flexDirection: 'column',
    tint: '#0d1b2acc',
  },
    // Tab bar
    React.createElement('ui-view', {
      flexDirection: 'row', width, height: tabH,
    }, ...tabs),
    // Messages
    React.createElement('ui-scroll', {
      width, height: msgH, vertical: true,
    },
      React.createElement('ui-view', {
        width: width - 8,
        height: Math.max(msgH, filtered.length * 22),
        flexDirection: 'column', padding: [4, 8, 4, 8],
      }, ...msgElements)
    ),
    // Input row
    React.createElement('ui-view', {
      flexDirection: 'row', width, height: inputH, gap: 4, padding: [0, 4, 4, 4],
    },
      React.createElement('ui-input', {
        width: width - 70, height: inputH - 4,
        placeholder: 'Type message...',
        value: inputText,
        onChange: (v: string) => setInputText(v),
        onSubmit: () => handleSend(),
      }),
      React.createElement('ui-view', {
        width: 56, height: inputH - 4,
        tint: '#4cc9f0', alignItems: 'center', justifyContent: 'center',
        onClick: handleSend,
      },
        React.createElement('ui-text', {
          text: 'Send', fontSize: 13, color: '#0d1b2a',
          width: 56, height: inputH - 4, align: 'center', bold: true,
        })
      )
    )
  );
}
