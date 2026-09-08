// useExitMount — 条件渲染弹窗/浮层的退出动画门（2.0 UI 走查「从哪来回到哪去」）。
//
// 问题：`{open && <Modal/>}` 在 open 变 false 的瞬间直接卸载，入场动画没有对应的
// 退场可播。本钩子把「渲染中」与「打开」解耦：open 变 false 时保持挂载并返回
// closing=true，让组件反向播放入场动画，exitMs 后才真正卸载。
//
// 用法：
//   const gate = useExitMount(open);
//   {gate.mounted && <Overlay closing={gate.closing} ... />}

import { useEffect, useState } from 'react';

export function useExitMount(open: boolean, exitMs = 200) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, exitMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);
  return { mounted, closing };
}
