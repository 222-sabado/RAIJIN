import React from 'react';

// ponytail: plain text until react-markdown
export const MessageBody: React.FC<{ text: string }> = ({ text }) => (
  <div className="whitespace-pre-wrap">{text}</div>
);
