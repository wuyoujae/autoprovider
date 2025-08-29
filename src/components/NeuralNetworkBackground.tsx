'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// 节点数据类型
interface NetworkNode {
  id: number;
  x: number;
  y: number;
  connections: number[];
  activity: number;
}

export function NeuralNetworkBackground() {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [mounted, setMounted] = useState(false);

  // 初始化网络节点
  useEffect(() => {
    setMounted(true);
    const newNodes: NetworkNode[] = [];
    const nodeCount = 15;

    // 创建节点
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 200 + Math.random() * 150;
      const x = Math.cos(angle) * radius + (typeof window !== 'undefined' ? window.innerWidth / 2 : 960);
      const y = Math.sin(angle) * radius + (typeof window !== 'undefined' ? window.innerHeight / 2 : 540);

      const connections: number[] = [];
      // 连接到最近的2-3个节点
      const connectionCount = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < connectionCount; j++) {
        const targetId = (i + 1 + j) % nodeCount;
        if (!connections.includes(targetId)) {
          connections.push(targetId);
        }
      }

      newNodes.push({
        id: i,
        x,
        y,
        connections,
        activity: Math.random()
      });
    }

    setNodes(newNodes);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(0.5px)' }}
      >
        {/* 连接线 */}
        {nodes.map((node) =>
          node.connections.map((targetId) => {
            const targetNode = nodes.find(n => n.id === targetId);
            if (!targetNode) return null;

            return (
              <motion.line
                key={`${node.id}-${targetId}`}
                x1={node.x}
                y1={node.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="#00ff88"
                strokeWidth="1"
                opacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: [0, 1, 0],
                  opacity: [0.1, 0.6, 0.1]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            );
          })
        )}

        {/* 节点 */}
        {nodes.map((node) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="3"
              fill="#00ff88"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: node.id * 0.1
              }}
            />
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="8"
              fill="none"
              stroke="#00ff88"
              strokeWidth="1"
              opacity="0.3"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 2, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: node.id * 0.2
              }}
            />
          </g>
        ))}
      </svg>

      {/* 数据包动画 */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              opacity: 0
            }}
            animate={{
              x: [
                Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920)
              ],
              y: [
                Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080)
              ],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 网格背景 */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,136,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,136,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'grid-move 20s linear infinite'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  );
}