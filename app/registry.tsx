'use client';

// styled-jsx SSR style registry — required by the App Router so that
// <style jsx> CSS (components/IntegrationsSection.tsx) is emitted into the
// server-rendered HTML. Without it, styled sections render unstyled until
// hydration (flash of unstyled content) and fail entirely without JS.
// Recipe: node_modules/next/dist/docs/01-app/02-guides/css-in-js.md

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { StyleRegistry, createStyleRegistry } from 'styled-jsx';

export default function StyledJsxRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only create stylesheet once with lazy initial state
  const [jsxStyleRegistry] = useState(() => createStyleRegistry());

  useServerInsertedHTML(() => {
    const styles = jsxStyleRegistry.styles();
    jsxStyleRegistry.flush();
    return <>{styles}</>;
  });

  return <StyleRegistry registry={jsxStyleRegistry}>{children}</StyleRegistry>;
}
