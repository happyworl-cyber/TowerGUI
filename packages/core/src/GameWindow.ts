import React, { useCallback } from 'react';
import { useWindowManager } from './WindowManager';

export interface GameWindowProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  modal?: boolean;
  closable?: boolean;
  draggable?: boolean;
  titleBarHeight?: number;
  titleFontSize?: number;
  bgColor?: string;
  titleBarColor?: string;
  children?: React.ReactNode;
  onClose?: () => void;
}

export function GameWindow(props: GameWindowProps) {
  const {
    id, title,
    width = 500, height = 400,
    x: initX = 100, y: initY = 80,
    modal = false, closable = true,
    titleBarHeight = 40, titleFontSize = 18,
    bgColor = '#0d1b2aee', titleBarColor = '#1b2838',
    children, onClose,
  } = props;

  const wm = useWindowManager();

  const handleClose = useCallback(() => {
    onClose?.();
    wm.close(id);
  }, [id, onClose, wm]);

  const handleTitleClick = useCallback(() => {
    wm.bringToTop(id);
  }, [id, wm]);

  // Check visibility AFTER all hooks
  const win = wm.windows.find(w => w.id === id);
  if (!win || !win.visible) return null;

  const contentHeight = height - titleBarHeight;

  const elements: React.ReactNode[] = [];

  if (modal) {
    elements.push(
      React.createElement('ui-view', {
        key: `${id}-overlay`,
        position: 'absolute', top: 0, left: 0,
        width: 1920, height: 1080,
        tint: '#00000088',
        zIndex: win.zIndex - 1,
        onClick: closable ? handleClose : undefined,
      })
    );
  }

  elements.push(
    React.createElement('ui-view', {
      key: `${id}-win`,
      width, height,
      position: 'absolute',
      left: initX, top: initY,
      tint: bgColor,
      flexDirection: 'column',
      zIndex: win.zIndex,
      onClick: handleTitleClick,
    },
      React.createElement('ui-view', {
        width, height: titleBarHeight,
        tint: titleBarColor,
        flexDirection: 'row',
        alignItems: 'center',
        padding: [0, 12, 0, 16],
      },
        React.createElement('ui-text', {
          text: title,
          fontSize: titleFontSize,
          color: '#e0e1dd',
          width: width - 60,
          height: titleBarHeight,
          bold: true,
        }),
        closable ? React.createElement('ui-view', {
          width: 32, height: 32,
          tint: '#ff444488',
          alignItems: 'center',
          justifyContent: 'center',
          onClick: handleClose,
        },
          React.createElement('ui-text', {
            text: 'X',
            fontSize: 16,
            color: '#ffffff',
            width: 32, height: 32,
            align: 'center',
            bold: true,
          })
        ) : null
      ),
      React.createElement('ui-view', {
        width,
        height: contentHeight,
        flexDirection: 'column',
      }, children)
    )
  );

  return React.createElement(React.Fragment, null, ...elements);
}
