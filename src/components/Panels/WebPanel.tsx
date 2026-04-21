import { motion } from 'framer-motion';
import { panelBase, panelHeader, CYAN, CYAN_FAINT } from './styles';
import { Corners } from './primitives';

/**
 * Embeds a real webpage at panel size using Electron's <webview>.
 * Looks native — same glass border as other JARVIS panels.
 *
 * Usage:
 *   <WebPanel url="https://www.tradingview.com/chart/" title="MARKETS" width={460} height={400} />
 */
export function WebPanel({
  url,
  title = 'WEB',
  width = 460,
  height = 400,
  delay = 0,
}: {
  url: string;
  title?: string;
  width?: number;
  height?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ ...panelBase, width, overflow: 'hidden' }}
    >
      <Corners />
      <div style={panelHeader}>
        <span>◉ {title}</span>
        <span style={{ color: CYAN }}>● LIVE</span>
      </div>
      <div style={{
        width,
        height,
        borderTop: `1px solid ${CYAN_FAINT}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* @ts-ignore — webview is Electron-specific, not standard HTML */}
        <webview
          src={url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          // @ts-ignore
          allowpopups="false"
          // Use Chrome's existing session so sites see you as logged in
          // @ts-ignore
          partition="persist:jarvis-shared"
          // @ts-ignore
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        />
        {/* Subtle dark overlay at edges to blend with JARVIS aesthetic */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4)',
        }} />
      </div>
    </motion.div>
  );
}
