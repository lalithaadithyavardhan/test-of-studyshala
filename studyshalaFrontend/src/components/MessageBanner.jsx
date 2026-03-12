/**
 * MessageBanner
 * =============
 * Displays a faculty announcement/message to students.
 * Only renders if message is non-empty.
 */
import { useState } from 'react';
import { MdCampaign, MdExpandMore, MdExpandLess } from 'react-icons/md';
import './MessageBanner.css';

const MessageBanner = ({ message, facultyName }) => {
  const [expanded, setExpanded] = useState(true);
  if (!message?.trim()) return null;

  return (
    <div className="msg-banner">
      <div className="msg-banner-header" onClick={() => setExpanded(e => !e)}>
        <div className="msg-banner-title">
          <MdCampaign className="msg-banner-icon" />
          <span>Message from {facultyName || 'Faculty'}</span>
        </div>
        <button className="msg-banner-toggle" title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <MdExpandLess /> : <MdExpandMore />}
        </button>
      </div>
      {expanded && (
        <div className="msg-banner-body">
          <p>{message}</p>
        </div>
      )}
    </div>
  );
};

export default MessageBanner;
