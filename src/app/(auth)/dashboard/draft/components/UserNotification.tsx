"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

interface UserNotificationProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export default function UserNotification({
  notifications,
  onDismiss,
}: UserNotificationProps) {
  // Set up auto-dismiss for each notification
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, 5000);

      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, onDismiss]);

  const getNotificationStyles = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return {
          bgColor: "bg-blue-500",
          icon: <Info className="h-5 w-5" />,
          ringColor: "ring-blue-300",
        };
      case "success":
        return {
          bgColor: "bg-green-500",
          icon: <CheckCircle className="h-5 w-5" />,
          ringColor: "ring-green-300",
        };
      case "warning":
        return {
          bgColor: "bg-yellow-500",
          icon: <AlertTriangle className="h-5 w-5" />,
          ringColor: "ring-yellow-300",
        };
      case "error":
        return {
          bgColor: "bg-red-500",
          icon: <AlertCircle className="h-5 w-5" />,
          ringColor: "ring-red-300",
        };
      default:
        return {
          bgColor: "bg-blue-500",
          icon: <Info className="h-5 w-5" />,
          ringColor: "ring-blue-300",
        };
    }
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex flex-col items-center pt-4">
      <AnimatePresence mode="sync">
        {notifications.map((notification, index) => {
          const { bgColor, icon, ringColor } = getNotificationStyles(
            notification.type,
          );

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                },
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: -20,
                transition: { duration: 0.2 },
              }}
              className={`m-2 flex w-full max-w-md items-center justify-between rounded-lg p-3 text-white shadow-lg ring-1 ${bgColor} ${ringColor}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{icon}</div>
                <span className="text-sm font-medium">
                  {notification.message}
                </span>
              </div>
              <button
                onClick={() => onDismiss(notification.id)}
                className="ml-4 rounded-full p-1 hover:bg-white/20"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
