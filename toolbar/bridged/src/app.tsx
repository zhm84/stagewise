import './app.css';

import { ContextProviders } from './components/context-providers.js';
import { HotkeyListener } from './components/hotkey-listener.js';
import { DefaultLayout } from './layouts/default.js';
import { AppStateProvider } from './hooks/use-app-state.js';
import type { InternalToolbarConfig } from './config.js';
import { MainAppBlocker } from './components/main-app-blocker.js';
import { UrlSynchronizer } from './components/url-synchronizer.js';
import { MetaSynchronizer } from './components/meta-synchronizer';

//zhm: 工具栏 App 组件会创建一个 iframe 来加载用户的实际应用,
// 这个 iframe 的 src 指向用户应用的 URL，实际内容由代理中间件从 appPort 获取。
export function App(config?: InternalToolbarConfig) {
  // Get the initial URL from the parent window
  // Ensure we have a valid path (default to '/' if empty)
  const pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const initialUrl = pathname + search + hash;

  return (
    <>
      <iframe
        src={initialUrl}
        title="Main user app"
        className="fixed inset-0 m-0 size-full p-0"
        id="user-app-iframe"
      />
      <UrlSynchronizer
        appPort={config?.appPort}
        urlSyncConfig={config?.urlSync}
      />
      <MetaSynchronizer />
      <AppStateProvider>
        <MainAppBlocker />
        <ContextProviders config={config}>
          <HotkeyListener />
          {/* Depending on the screen size, load either the mobile or the desktop companion layout */}
          {/* Until the mobile layout is ready, we will always load the desktop layout */}
          <DefaultLayout />
        </ContextProviders>
      </AppStateProvider>
    </>
  );
}
