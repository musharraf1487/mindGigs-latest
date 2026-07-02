import React from 'react';

export function Notifications({ notifs }) {
  return (
    <div className="notif">
      {notifs.map((n) => (
        <div
          key={n.id}
          className={`notif-item ${
            n.type === 'error'
              ? 'notif-item-rd'
              : n.type === 'warn'
              ? 'notif-item-gd'
              : ''
          }`}
        >
          {n.msg}
        </div>
      ))}
    </div>
  );
}
