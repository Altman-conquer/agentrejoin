import { ScrollViewStyleReset } from 'expo-router/html';
import '../unistyles';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>AgentRejoin</title>
        <meta
          name="description"
          content="Resume Claude Code and Codex conversations on your servers, and control Gemini, OpenClaw, Antigravity, and ACP-compatible agents from web or mobile."
        />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="theme-color" content="#111318" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AgentRejoin" />
        <meta property="og:title" content="AgentRejoin - Resume coding-agent sessions from anywhere" />
        <meta
          property="og:description"
          content="Resume Claude Code and Codex conversations on your servers, and control Gemini, OpenClaw, Antigravity, and ACP-compatible agents from web or mobile."
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="AgentRejoin - Resume coding-agent sessions from anywhere" />
        <meta
          name="twitter:description"
          content="Resume Claude Code and Codex conversations on your servers, and control Gemini, OpenClaw, Antigravity, and ACP-compatible agents from web or mobile."
        />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
